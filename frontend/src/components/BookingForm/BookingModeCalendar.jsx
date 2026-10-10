import DataLoader from '../ui/DataLoader/DataLoader';
// BookingModeCalendar.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  addMinutes,
  startOfMinute,
  startOfDay,
  isBefore,
} from "date-fns";
import { pl } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import styles from "./BookingModeCalendar.module.scss";
import { FiChevronLeft, FiChevronRight, FiChevronDown } from "react-icons/fi";
import BookingSteps from "./BookingSteps";
import LoadingButton from "../ui/LoadingButton/LoadingButton";
import { api } from "../../api/api";

// ✅ stała przerwa po usłudze (jak na backendzie)
const SLOT_BREAK_MIN = 5;

// ✅ siatka startów ZAWSZE co 5 minut (niezależnie od bufora)
const GRID_STEP_MIN = 5;

const durationToMinutes = (svc) => {
  const { value, unit } = svc?.duration || {};
  if (!value || !unit) return 0;
  if (unit === "minutes") return value;
  if (unit === "hours") return value * 60;
  if (unit === "days") return value * 60 * 24;
  return value;
};

// zaokrąglenie "w górę" do kroku (np. 10:02 -> 10:05)
const ceilToStep = (dt, stepMin) => {
  const d = startOfMinute(dt);
  const rem = d.getMinutes() % stepMin;
  return rem ? addMinutes(d, stepMin - rem) : d;
};

const timeToMinutes = (value = "") => {
  const [h, m] = String(value).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const rangesOverlap = (aStart, aEnd, bStart, bEnd) => {
  return aStart < bEnd && aEnd > bStart;
};

const getAvailabilityOverrides = (provider) => {
  return Array.isArray(provider?.availabilityOverrides)
    ? provider.availabilityOverrides
    : [];
};

const isDateBlockedByOverride = (provider, dateStr) => {
  return getAvailabilityOverrides(provider).some(
    (item) => item?.type === "day" && item?.date === dateStr
  );
};

const isSlotBlockedByOverride = (provider, dateStr, fromTime, toTime) => {
  const reqStart = timeToMinutes(fromTime);
  const reqEnd = timeToMinutes(toTime);

  return getAvailabilityOverrides(provider).some((item) => {
    if (!item || item.date !== dateStr) return false;

    if (item.type === "day") return true;

    if (item.type !== "slot") return false;
    if (!item.fromTime || !item.toTime) return false;

    const blockStart = timeToMinutes(item.fromTime);
    const blockEnd = timeToMinutes(item.toTime);

    return rangesOverlap(reqStart, reqEnd, blockStart, blockEnd);
  });
};

export default function BookingModeCalendar({
  user,
  provider,
  pushAlert,
  preselectedServiceId,
}) {
  const [reservedSlots, setReserved] = useState([]); // { date, fromTime, toTime }
  const [reservationsPending, setReservationsPending] = useState(0);
  const reservationsLoading = reservationsPending > 0;
  const [pendingSlots, setPending] = useState([]); // { date, fromTime, toTime }
  const [reservationsAll, setReservationsAll] = useState([]); // RAW rezerwacje całego zespołu

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setDate] = useState(null);
  const [selectedService, setService] = useState(null);

  const [timeSlots, setTimeSlots] = useState([]);
  const [showUnavailableSlots, setShowUnavailableSlots] = useState(false);
  const [selectedSlot, setSlot] = useState(""); // "HH:mm"

  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✨ Zespół
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");

  const navigate = useNavigate();

  const daysInMonth = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
      }),
    [currentMonth]
  );

  const startDayIndex = useMemo(() => (getDay(startOfMonth(currentMonth)) + 6) % 7, [currentMonth]);
  const isDayActive = (day) =>
    Array.isArray(provider?.workingDays) && provider.workingDays.includes(getDay(day));

  const isTeamEnabled = provider?.bookingMode === "calendar" && provider?.team?.enabled === true;
  const isUserPick = isTeamEnabled && provider?.team?.assignmentMode === "user-pick";
  const isAutoAssign = isTeamEnabled && provider?.team?.assignmentMode === "auto-assign";

  // ✅ TYLKO aktywne usługi
  const activeServices = useMemo(() => {
    return (provider?.services || []).filter((s) => s?.isActive !== false);
  }, [provider?.services]);

  useEffect(() => {
    if (!preselectedServiceId) return;
    if (!activeServices.length) return;
    if (selectedService?._id) return;

    const svc = activeServices.find(
      (s) => String(s._id) === String(preselectedServiceId)
    );

    if (svc) {
      setService(svc);
      setSlot("");
      setDate(null);
      setSelectedStaffId("");
    }
  }, [preselectedServiceId, activeServices, selectedService?._id]);

  // ✅ BUFFER z profilu (0/5/10/15), fallback 0
  const bookingBufferMin = useMemo(() => {
    const b = Number(provider?.bookingBufferMin);
    return [0, 5, 10, 15].includes(b) ? b : 0;
  }, [provider?.bookingBufferMin]);

  // ✅ EFFECTIVE = 5 + bookingBufferMin (czyli 5/10/15/20)
  const effectiveBufferMin = useMemo(() => SLOT_BREAK_MIN + bookingBufferMin, [bookingBufferMin]);

  // ✅ jeśli wybrana usługa została wyłączona/usunięta → reset
  useEffect(() => {
    if (!selectedService?._id) return;

    const stillExists = activeServices.some(
      (s) => String(s._id) === String(selectedService._id)
    );

    if (!stillExists) {
      setService(null);
      setSlot("");
      setDate(null);
      setSelectedStaffId("");
    }
  }, [activeServices, selectedService]);

  // ✅ Załaduj personel (gdy team.enabled)
  useEffect(() => {
    if (!isTeamEnabled) return;
    if (!provider?._id) return;

    let alive = true;

    (async () => {
      try {
        const { data } = await api.get(`/api/staff`, { params: { profileId: provider._id } });
        if (!alive) return;
        setStaffList(Array.isArray(data) ? data : []);
      } catch {
        if (!alive) return;
        setStaffList([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isTeamEnabled, provider?._id]);

  // ✅ Pobierz rezerwacje (z opcjonalnym filtrem po staffId dla user-pick)
  const fetchReservations = useCallback(async () => {
    if (!provider?.userId) return;

    setReservationsPending(count => count + 1);
    try {
    const { data } = await api.get(`/api/reservations/busy/${provider.userId}`);

    const filtered =
      isUserPick && selectedStaffId
        ? (Array.isArray(data) ? data : []).filter(
          (r) => r.staffId && String(r.staffId) === String(selectedStaffId)
        )
        : (Array.isArray(data) ? data : []);

    // RAW całego zespołu – potrzebne dla auto-assign
    setReservationsAll(Array.isArray(data) ? data : []);

    const booked = filtered
      .filter((r) => r.status === "zaakceptowana")
      .map((r) => ({ date: r.date, fromTime: r.fromTime, toTime: r.toTime }));

    const pending = filtered
      .filter((r) => r.status === "oczekująca" || r.status === "tymczasowa")
      .map((r) => ({ date: r.date, fromTime: r.fromTime, toTime: r.toTime }));

    setReserved(booked);
    setPending(pending);
    } finally { setReservationsPending(count => Math.max(0, count - 1)); }
  }, [provider?.userId, isUserPick, selectedStaffId]);

  // ✅ Ładuj rezerwacje po wejściu (i przy zmianie provider)
  useEffect(() => {
    fetchReservations().catch(() => { });
  }, [fetchReservations]);

  // ✅ Przeładuj przy zmianie pracownika w trybie user-pick
  useEffect(() => {
    if (!isUserPick) return;
    fetchReservations().catch(() => { });
  }, [isUserPick, selectedStaffId, fetchReservations]);

  // Generowanie slotów (capacity-aware dla auto-assign)
  useEffect(() => {
    if (!selectedDate || !selectedService) {
      setTimeSlots([]);
      return;
    }

    const whFrom = provider?.workingHours?.from || "08:00";
    const whTo = provider?.workingHours?.to || "20:00";

    const [h0, m0] = whFrom.split(":").map(Number);
    const [h1, m1] = whTo.split(":").map(Number);

    const step = GRID_STEP_MIN; // ✅ zawsze 5
    const buffer = effectiveBufferMin; // ✅ 5 + bookingBufferMin
    const durMin = durationToMinutes(selectedService);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    // godziny dnia
    let cursor = startOfMinute(new Date(selectedDate));
    cursor.setHours(h0, m0, 0, 0);
    cursor = ceilToStep(cursor, step);

    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(h1, m1, 0, 0);

    const isToday = isSameDay(selectedDate, new Date());
    let nowRoundedUp = null;
    if (isToday) nowRoundedUp = ceilToStep(new Date(), step);

    // ===== eligible & capacity dla auto-assign =====
    const eligibleStaff =
      isTeamEnabled && provider?.team?.enabled
        ? staffList.filter(
          (s) =>
            s.active &&
            (s.serviceIds || []).some((id) => String(id) === String(selectedService?._id))
        )
        : [];

    const eligibleIds = new Set(eligibleStaff.map((s) => String(s._id)));

    const totalCapacity = isAutoAssign
      ? Math.max(
        0,
        eligibleStaff.reduce((sum, s) => sum + Math.max(1, Number(s.capacity) || 1), 0)
      )
      : 0;

    const capacityMap = new Map(
      eligibleStaff.map((s) => [String(s._id), Math.max(1, Number(s.capacity) || 1)])
    );

    // ===== dayBusy (✅ rozdzielamy koniec usługi vs koniec+bufor) =====
    const dayBusy = (
      isAutoAssign
        ? reservationsAll
          .filter((r) => r.date === dateStr)
          .filter(
            (r) => !r.dateOnly && ["zaakceptowana", "oczekująca", "tymczasowa"].includes(r.status)
          )
          .filter((r) => eligibleIds.has(String(r.staffId)))
          .map((r) => {
            const from = new Date(`${r.date}T${r.fromTime}`);
            const toNoBuf = new Date(`${r.date}T${r.toTime}`);
            const toWithBuf = addMinutes(toNoBuf, buffer);

            return {
              fromMs: +from,
              toMs: +toNoBuf,
              toBufMs: +toWithBuf,
              status: r.status === "zaakceptowana" ? "reserved" : "pending",
              staffId: String(r.staffId || ""),
            };
          })
        : [...reservedSlots, ...pendingSlots]
          .filter((s) => s.date === dateStr)
          .map((s) => {
            const from = new Date(`${s.date}T${s.fromTime}`);
            const toNoBuf = new Date(`${s.date}T${s.toTime}`);
            const toWithBuf = addMinutes(toNoBuf, buffer);

            const isRes = reservedSlots.some(
              (r) => r.date === s.date && r.fromTime === s.fromTime && r.toTime === s.toTime
            );

            return {
              fromMs: +from,
              toMs: +toNoBuf,
              toBufMs: +toWithBuf,
              status: isRes ? "reserved" : "pending",
              staffId: "",
            };
          })
    ).sort((a, b) => a.fromMs - b.fromMs);

    const slots = [];

    while (cursor < dayEnd) {
      const start = new Date(cursor);
      const end = addMinutes(start, durMin);
      const endWithBuffer = addMinutes(end, buffer);

      const fromTime = format(start, "HH:mm");
      const toTime = format(end, "HH:mm");

      const blockedByOverride = isSlotBlockedByOverride(
        provider,
        dateStr,
        fromTime,
        toTime
      );

      const slotStartMs = +start;
      const slotEndMs = +endWithBuffer;

      let status = "free";
      if (endWithBuffer > dayEnd) status = "disabled";

      const overlaps = dayBusy.filter((b) => slotStartMs < b.toBufMs && slotEndMs > b.fromMs);

      const startsInService = overlaps.some((o) => slotStartMs >= o.fromMs && slotStartMs <= o.toMs);
      const startsInBuffer =
        !startsInService && overlaps.some((o) => slotStartMs > o.toMs && slotStartMs < o.toBufMs);

      const anyReservedHere = overlaps.some(
        (o) => o.status === "reserved" && slotStartMs >= o.fromMs && slotStartMs <= o.toMs
      );

      if (isAutoAssign) {
        if (totalCapacity <= 0) {
          status = "disabled";
        } else {
          const perStaffCounts = new Map();
          for (const o of overlaps) {
            if (!o.staffId) continue;
            perStaffCounts.set(o.staffId, (perStaffCounts.get(o.staffId) || 0) + 1);
          }

          let usedCapacity = 0;
          for (const [sid, count] of perStaffCounts.entries()) {
            const cap = capacityMap.get(sid) || 1;
            usedCapacity += Math.min(count, cap);
          }

          if (usedCapacity >= totalCapacity) {
            const accepted = overlaps.filter((o) => o.status === "reserved");
            const pendingOnly = overlaps.filter((o) => o.status === "pending");

            const startsInsideAccepted = accepted.some(
              (o) => slotStartMs >= o.fromMs && slotStartMs <= o.toMs
            );
            const startsInsidePending = pendingOnly.some(
              (o) => slotStartMs >= o.fromMs && slotStartMs <= o.toMs
            );

            const startsInsideBuffer2 =
              !startsInsideAccepted &&
              !startsInsidePending &&
              overlaps.some((o) => slotStartMs > o.toMs && slotStartMs < o.toBufMs);

            if (startsInsideAccepted) status = "reserved";
            else if (startsInsidePending) status = "pending";
            else if (startsInsideBuffer2) status = "disabled";
            else status = "disabled";
          }
        }
      } else {
        if (startsInService && status !== "disabled") {
          status = anyReservedHere ? "reserved" : "pending";
        } else if (startsInBuffer && status !== "disabled") {
          status = "disabled";
        } else {
          const directConflict = overlaps.length > 0;
          if (directConflict && status !== "disabled") {
            status = "disabled";
          } else if (status === "free") {
            const nextBusy = dayBusy.find((b) => b.fromMs >= slotStartMs);
            if (nextBusy && slotEndMs > nextBusy.fromMs) status = "disabled";
          }
        }
      }

      if (blockedByOverride) status = "disabled";
      if (isToday && nowRoundedUp && start < nowRoundedUp) status = "disabled";

      slots.push({
        label: format(start, "HH:mm"),
        status,
        blockedByOverride,
      });
      cursor = addMinutes(cursor, step);
    }

    setTimeSlots(slots);
  }, [
    selectedDate,
    selectedService,
    provider,
    provider?.workingHours,
    provider?.bookingBufferMin,
    reservedSlots,
    pendingSlots,
    isAutoAssign,
    isTeamEnabled,
    isUserPick,
    staffList,
    reservationsAll,
    bookingBufferMin,
    effectiveBufferMin,
    selectedStaffId,
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault?.();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (!user?.uid) {
        pushAlert?.({ show: true, type: "error", message: "Musisz być zalogowany." });
        return;
      }

      if (!selectedDate || !selectedService || !selectedSlot) {
        pushAlert?.({ show: true, type: "error", message: "Wybierz dzień, usługę i godzinę." });
        return;
      }

      if (isUserPick && !selectedStaffId) {
        pushAlert?.({ show: true, type: "error", message: "Wybierz pracownika." });
        return;
      }

      const isServiceStillActive = activeServices.some(
        (s) => String(s._id) === String(selectedService?._id)
      );

      if (!isServiceStillActive) {
        pushAlert?.({
          show: true,
          type: "error",
          message: "Ta usługa jest obecnie wyłączona.",
        });
        return;
      }

      const step = GRID_STEP_MIN;
      const [h, m] = selectedSlot.split(":").map(Number);
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(h, m, 0, 0);

      const nowRoundedUp = ceilToStep(new Date(), step);
      if (isSameDay(selectedDate, new Date()) && startDateTime < nowRoundedUp) {
        pushAlert?.({
          show: true,
          type: "error",
          message: "Wybrany slot już minął. Wybierz nowszą godzinę.",
        });
        return;
      }

      const fromTime = format(startDateTime, "HH:mm");
      const toTime = format(addMinutes(startDateTime, durationToMinutes(selectedService)), "HH:mm");

      const dateStr = format(selectedDate, "yyyy-MM-dd");

      if (isSlotBlockedByOverride(provider, dateStr, fromTime, toTime)) {
        pushAlert?.({
          show: true,
          type: "error",
          message: "Ten termin został oznaczony przez usługodawcę jako niedostępny.",
        });
        return;
      }

      const payload = {
        userId: user.uid,
        providerUserId: provider.userId,
        providerProfileId: provider._id,
        date: dateStr,
        fromTime,
        toTime,
        description,
        serviceId: selectedService._id,
        ...(isUserPick && selectedStaffId ? { staffId: selectedStaffId } : {}),
      };

      await api.post(`/api/reservations`, payload);
      await fetchReservations();

      sessionStorage.setItem(
        "flash",
        JSON.stringify({
          type: "success",
          message: "Rezerwacja wysłana – oczekuje na potwierdzenie.",
          ttl: 6000,
          ts: Date.now(),
        })
      );

      sessionStorage.setItem(
        "reservationHighlight",
        JSON.stringify({
          date: payload.date,
          fromTime,
          toTime,
          serviceId: selectedService._id,
        })
      );

      navigate("/rezerwacje", { state: { scrollToId: "reservationsTop" } });

      setSlot("");
      setDescription("");
      setTimeout(() => {
        setDate(null);
        setService(null);
        setSelectedStaffId("");
      }, 100);
    } catch (err) {
      console.error("❌ BookingModeCalendar submit error:", err);
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 401 ? "Brak autoryzacji (401). Zaloguj się ponownie." : null) ||
        "Błąd przy wysyłaniu.";
      pushAlert?.({ show: true, type: "error", message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <BookingSteps className={styles.progress} steps={[{ label: "Usługa", done: Boolean(selectedService) && (!isUserPick || Boolean(selectedStaffId)) }, { label: "Dzień i godzina", done: Boolean(selectedDate && selectedSlot) }, { label: "Sprawdź i wyślij", done: false }]} />
      <div className={styles.topGrid}>


        <label className={styles.field}>
          <div className={styles.fieldHeader}>
            <div>
              <span className={styles.fieldEyebrow}>01 / Usługa</span>
              <h3 className={styles.fieldTitle}>Wybierz usługę</h3>
            </div>

            <span className={styles.fieldHint}>wymagane</span>
          </div>

          <div className={styles.selectWrap}>
            <select
              className={styles.select}
              value={selectedService?._id || ""}
              onChange={(e) => {
                const svc = activeServices.find(
                  (s) => String(s._id) === String(e.target.value)
                );

                setService(svc || null);
                setSlot("");
                setDate(null);
                setSelectedStaffId("");
              }}
            >
              <option value="">– wybierz –</option>

              {activeServices.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} {s.duration?.value}{" "}
                  {s.duration?.unit === "minutes"
                    ? "min"
                    : s.duration?.unit === "hours"
                      ? "godzin"
                      : s.duration?.unit === "days"
                        ? "dni"
                        : s.duration?.unit}
                </option>
              ))}
            </select>

            <span className={styles.selectChevron} aria-hidden="true">
              <FiChevronDown />
            </span>
          </div>
        </label>

        {isUserPick && selectedService && (
          <label className={styles.field}>
            <div className={styles.fieldHeader}>
              <div>
                <span className={styles.fieldEyebrow}>01 / Zespół</span>
                <h3 className={styles.fieldTitle}>Wybierz pracownika</h3>
              </div>

              <span className={styles.fieldHint}>wymagane</span>
            </div>

            <div className={styles.selectWrap}>
              <select
                className={styles.select}
                value={selectedStaffId}
                onChange={(e) => {
                  setSelectedStaffId(e.target.value);
                  setSlot("");
                  setDate(null);
                }}
              >
                <option value="">– wybierz –</option>

                {staffList
                  .filter(
                    (s) =>
                      s.active &&
                      (s.serviceIds || []).some(
                        (id) => String(id) === String(selectedService?._id)
                      )
                  )
                  .map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                      {s.role ? ` — ${s.role}` : ""}
                    </option>
                  ))}
              </select>

              <span className={styles.selectChevron} aria-hidden="true">
                <FiChevronDown />
              </span>
            </div>
          </label>
        )}
      </div>

      {isAutoAssign && selectedService && (
        <div className={styles.infoBox}>
          <strong>Auto-przydział</strong>
          <p>
            Pracownik zostanie dobrany automatycznie do wybranego terminu.
          </p>
        </div>
      )}

      {selectedService ? (
        <div className={styles.mainGrid}>
          <section className={styles.calendarCard}>
            {reservationsLoading && <DataLoader label="Sprawdzamy dostępne terminy…" compact />}
            <div className={styles.cardHead}>
              <div>
                <span className={styles.cardLabel}>Kalendarz</span>
                <h3>Wybierz dzień</h3>
              </div>
            </div>

            <div className={styles.monthNav}>
              <button
                type="button"
                disabled={isBefore(startOfMonth(currentMonth), addMonths(startOfMonth(new Date()), 1))}
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                aria-label="Poprzedni miesiąc"
              >
                <FiChevronLeft aria-hidden="true" />
              </button>

              <span className={styles.monthLabel}>
                {format(currentMonth, "LLLL yyyy", { locale: pl })}
              </span>

              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                aria-label="Następny miesiąc"
              >
                <FiChevronRight aria-hidden="true" />
              </button>
            </div>

            <div className={styles.calendarGrid}>
              {["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"].map((d) => (
                <div key={d} className={styles.weekday}>
                  {d}
                </div>
              ))}

              {Array(startDayIndex)
                .fill(null)
                .map((_, i) => (
                  <div key={i} className={styles.blankDay} />
                ))}

              {daysInMonth.map((day) => {
                const active = isDayActive(day);
                const sel = selectedDate && isSameDay(day, selectedDate);
                const isPast = isBefore(
                  startOfDay(day),
                  startOfDay(new Date())
                );

                const dateStr = format(day, "yyyy-MM-dd");
                const blockedByOverride = isDateBlockedByOverride(
                  provider,
                  dateStr
                );

                const disabled = !active || isPast || blockedByOverride;

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    className={`
                      ${styles.day}
                      ${disabled ? styles.disabledDay : ""}
                      ${blockedByOverride ? styles.overrideBlockedDay : ""}
                      ${sel ? styles.selectedDay : ""}
                    `}
                    aria-label={format(day, "d MMMM yyyy", { locale: pl })}
                    aria-pressed={Boolean(sel)}
                    disabled={disabled}
                    title={
                      blockedByOverride
                        ? "Ten dzień został oznaczony jako niedostępny przez usługodawcę."
                        : undefined
                    }
                    onClick={() => {
                      if (disabled) return;
                      setDate(day);
                      setSlot("");
                    }}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
          </section>

          <section className={styles.slotsInfoCard}>
            {!selectedDate ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyNumber}>03</span>
                <strong>Wybierz dzień w kalendarzu</strong>
                <p>
                  Po kliknięciu daty pokażemy dostępne godziny dla wybranej
                  usługi.
                </p>
              </div>
            ) : (
              <>
                <div className={styles.slotsHeader}>
                  <div>
                    <span className={styles.cardLabel}>Wolne terminy</span>

                    <h3 className={styles.slotsTitle}>
                      {format(selectedDate, "dd.MM.yyyy")}
                    </h3>
                  </div>

                  <div className={styles.pickedPill} title="Wybrany slot">
                    {selectedSlot ? (
                      <>
                        <span className={styles.pickedDot} />
                        <span>
                          Wybrano: <b>{selectedSlot}</b>
                        </span>
                      </>
                    ) : (
                      <span className={styles.pickedMuted}>
                        Nie wybrano godziny
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.fullLegendBar}>
                  <div className={styles.legendBadges}>
                    <span className={styles.legendItem}>
                      <span
                        className={`${styles.legendBox} ${styles.legendReserved}`}
                      />
                      zajęte
                    </span>

                    <span className={styles.legendItem}>
                      <span
                        className={`${styles.legendBox} ${styles.legendPending}`}
                      />
                      oczekujące
                    </span>

                    <span className={styles.legendItem}>
                      <span
                        className={`${styles.legendBox} ${styles.legendDisabled}`}
                      />
                      niedostępne
                    </span>

                    <span className={styles.legendItem}>
                      <span
                        className={`${styles.legendBox} ${styles.legendFree}`}
                      />
                      wolne
                    </span>
                  </div>

                  <div className={styles.legendMetaFull}>
                    Czas usługi: <b>{durationToMinutes(selectedService)} min</b> · Przerwa między wizytami: <b>{effectiveBufferMin} min</b>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      ) : (
        <div className={styles.preSelect}>
          <span className={styles.emptyNumber}>02</span>
          <strong>{activeServices.length ? "Najpierw wybierz usługę" : "Brak usług do rezerwacji"}</strong>
          <p>
            {activeServices.length ? "Wybierz usługę, a pokażemy dni i godziny, w których możesz umówić wizytę." : "Ten profil nie ma obecnie aktywnych usług. Wróć do profilu i skontaktuj się bezpośrednio z usługodawcą."}
          </p>
        </div>
      )}

      {selectedService && selectedDate && (
        <section className={styles.slotsOnlyCard}>
          <div className={styles.cardHead}>
            <div>
              <span className={styles.cardLabel}>Godziny</span>
              <h3>Wybierz godzinę</h3>
            </div>

            <span className={styles.cardNumber}>04</span>
          </div>

          <form onSubmit={handleSubmit} className={styles.slotsForm}>
            <label className={styles.slotFilter}><input type="checkbox" checked={showUnavailableSlots} onChange={(event) => setShowUnavailableSlots(event.target.checked)} />Pokaż także zajęte i niedostępne godziny</label>
            {!timeSlots.some((slot) => slot.status === "free") && <div className={styles.infoBox}><strong>Brak wolnych godzin w tym dniu</strong><p>Wybierz inny dzień w kalendarzu lub inną usługę.</p></div>}
            <div className={styles.slotsGrid}>
              {timeSlots.filter((slot) => showUnavailableSlots || slot.status === "free").map((s) => (
                <button
                  key={s.label}
                  type="button"
                  className={`
                    ${styles.slot}
                    ${s.status === "disabled" ? styles.slotDisabled : ""}
                    ${s.status === "reserved" ? styles.slotReserved : ""}
                    ${s.status === "pending" ? styles.slotPending : ""}
                    ${selectedSlot === s.label ? styles.slotSelected : ""}
                  `}
                  aria-pressed={selectedSlot === s.label}
                  aria-label={`Godzina ${s.label}, ${s.status === "free" ? "wolna" : s.status === "reserved" ? "zajęta" : s.status === "pending" ? "oczekująca" : "niedostępna"}`}
                  disabled={s.status !== "free" || isSubmitting || reservationsLoading}
                  onClick={() =>
                    !isSubmitting && s.status === "free" && setSlot(s.label)
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>

            <label className={`${styles.field} ${styles.fieldWide}`}>
              <div className={styles.fieldHeader}>
                <div>
                  <span className={styles.fieldEyebrow}>03 / Dodatkowe informacje</span>
                  <h3 className={styles.fieldTitle}>Opis lub uwagi do rezerwacji</h3>
                </div>

                <span className={styles.fieldHint}>opcjonalnie</span>
              </div>

              <textarea
                className={styles.textarea}
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Np. strzyżenie + mycie, wrażliwa skóra, preferowana godzina…"
              />
            </label>

            {selectedSlot && <div className={styles.bookingSummary} aria-live="polite"><strong>Twoja rezerwacja</strong>{selectedService.name}<br />{format(selectedDate, "d MMMM yyyy", { locale: pl })} · godz. {selectedSlot}<br />Czas usługi: {durationToMinutes(selectedService)} min{selectedStaffId && <><br />{staffList.find((staff) => String(staff._id) === String(selectedStaffId))?.name}</>}</div>}
            <div className={styles.submitBar}>
              <LoadingButton
                type="submit"
                isLoading={isSubmitting}
                disabled={!selectedSlot || isSubmitting || reservationsLoading}
                className={styles.submit}
              >
                Rezerwuj termin
              </LoadingButton>

              <div className={styles.submitHint}>
                Po wysłaniu rezerwacja będzie oczekiwać na potwierdzenie.
              </div>
            </div>
          </form>
        </section>
      )}
    </>
  );
}