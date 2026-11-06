import DataLoader from '../ui/DataLoader/DataLoader';
// BookingModeCalendar.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  format,
  getDay,
  isSameDay,
  addMinutes,
  startOfMinute,
  startOfDay,
  isBefore,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from "date-fns";
import { pl } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import styles from "./BookingControls.module.scss";
import BookingServicePicker, { ServiceImage } from "./BookingServicePicker";
import BookingDatePicker from "./BookingDatePicker";

import BookingSummary from "./BookingSummary";
import { FiCalendar, FiArrowRight, FiClock, FiCheckCircle } from "react-icons/fi";
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

  const [period, setPeriod] = useState("all");
  const [availabilityError, setAvailabilityError] = useState(false);
  const [showUnavailableSlots, setShowUnavailableSlots] = useState(false);
  const [selectedSlot, setSlot] = useState(""); // "HH:mm"

  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✨ Zespół
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");

  const navigate = useNavigate();

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

    setAvailabilityError(false);
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
    } catch (error) {
      setAvailabilityError(true);
      throw error;
    } finally { setReservationsPending(count => Math.max(0, count - 1)); }
  }, [provider?.userId, isUserPick, selectedStaffId]);

  // ✅ Ładuj rezerwacje po wejściu (i przy zmianie provider)
  useEffect(() => {
    fetchReservations().catch(() => { });
  }, [fetchReservations]);

  const getTimeSlots = useCallback((date) => {
    if (!date || !selectedService) return [];
    const whFrom = provider?.workingHours?.from || "08:00";
    const whTo = provider?.workingHours?.to || "20:00";

    const [h0, m0] = whFrom.split(":").map(Number);
    const [h1, m1] = whTo.split(":").map(Number);

    const step = GRID_STEP_MIN; // ✅ zawsze 5
    const buffer = effectiveBufferMin; // ✅ 5 + bookingBufferMin
    const durMin = durationToMinutes(selectedService);
    const dateStr = format(date, "yyyy-MM-dd");

    // godziny dnia
    let cursor = startOfMinute(new Date(date));
    cursor.setHours(h0, m0, 0, 0);
    cursor = ceilToStep(cursor, step);

    const dayEnd = new Date(date);
    dayEnd.setHours(h1, m1, 0, 0);

    const isToday = isSameDay(date, new Date());
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

      const globallyBusy = reservationsAll.some(item => item.status === 'zaakceptowana' && (item.dateOnly || (item.bookingKind && item.bookingKind !== 'order')) && item.date === dateStr && fromTime < item.toTime && toTime > item.fromTime);
      if (globallyBusy || blockedByOverride) status = "disabled";
      if (isToday && nowRoundedUp && start < nowRoundedUp) status = "disabled";

      slots.push({
        label: format(start, "HH:mm"),
        status,
        blockedByOverride,
        isCandidate: endWithBuffer <= dayEnd && !(isToday && nowRoundedUp && start < nowRoundedUp),
      });
      cursor = addMinutes(cursor, step);
    }

    return slots;
  }, [selectedService, provider, reservedSlots, pendingSlots, isAutoAssign, isTeamEnabled, staffList, reservationsAll, effectiveBufferMin]);

  const timeSlots = useMemo(() => getTimeSlots(selectedDate), [getTimeSlots, selectedDate]);
  const canChooseTime = Boolean(selectedService && (!isUserPick || selectedStaffId));
  const dayAvailability = useMemo(() => {
    if (!canChooseTime || reservationsLoading || availabilityError) return null;
    const result = {};
    for (const day of eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })) {
      const key = format(day, "yyyy-MM-dd");
      if (isBefore(startOfDay(day), startOfDay(new Date())) || !provider?.workingDays?.includes(getDay(day)) || isDateBlockedByOverride(provider, key)) continue;
      const slots = getTimeSlots(day).filter(slot => slot.isCandidate);
      const free = slots.filter(slot => slot.status === "free").length;
      const ratio = slots.length ? free / slots.length : 0;
      result[key] = { free, ratio, level: ratio > .5 ? "high" : ratio >= .2 ? "medium" : "low" };
    }
    return result;
  }, [canChooseTime, reservationsLoading, availabilityError, currentMonth, provider, getTimeSlots]);
  const nearest = useMemo(() => {
    if (!selectedService || reservationsLoading || availabilityError || (isUserPick && !selectedStaffId)) return null;
    for (let offset = 0; offset < 60; offset += 1) {
      const day = addDays(startOfDay(new Date()), offset);
      if (!provider?.workingDays?.includes(getDay(day)) || isDateBlockedByOverride(provider, format(day, "yyyy-MM-dd"))) continue;
      const slot = getTimeSlots(day).find(item => item.status === "free");
      if (slot) return { day, time: slot.label };
    }
    return null;
  }, [selectedService, reservationsLoading, availabilityError, isUserPick, selectedStaffId, provider, getTimeSlots]);
  const visibleSlots = timeSlots.filter(slot => (showUnavailableSlots || slot.status === "free") && (period === "all" || (period === "morning" ? slot.label < "12:00" : slot.label >= (period === "evening" ? "17:00" : "12:00"))));

  const handleSubmit = async (e) => {
    e.preventDefault?.();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (!user?.uid) {
        pushAlert?.({ show: true, type: "error", message: "Musisz być zalogowany." });
        return;
      }

      if (reservationsLoading || availabilityError || !timeSlots.some(slot => slot.label === selectedSlot && slot.status === "free")) {
        pushAlert?.({ show: true, type: "error", message: "Sprawdź dostępność i wybierz wolną godzinę." });
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

      const { data: savedReservation } = await api.post(`/api/reservations`, payload);
      await fetchReservations();

      sessionStorage.setItem(
        "flash",
        JSON.stringify({
          type: "success",
          message: savedReservation?.reservation?.status === "zaakceptowana" ? "Termin potwierdzony. Szczegóły znajdziesz poniżej." : "Rezerwacja wysłana – oczekuje na potwierdzenie.",
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

  return <div className={styles.form}>
    <div className={styles.serviceSection}>
      <BookingServicePicker services={activeServices} value={selectedService} disabled={isSubmitting} onChange={service => {
        setService(service); setDate(null); setSlot(""); setSelectedStaffId(""); setPeriod("all");
      }} />
      {isUserPick && selectedService && <label className={styles.field}>Pracownik
        <select value={selectedStaffId} disabled={isSubmitting} onChange={event => { setSelectedStaffId(event.target.value); setDate(null); setSlot(""); }}>
          <option value="">Wybierz pracownika</option>
          {staffList.filter(staff => staff.active && (staff.serviceIds || []).some(id => String(id) === String(selectedService._id))).map(staff => <option key={staff._id} value={staff._id}>{staff.name}</option>)}
        </select>
      </label>}
    </div>
    {isAutoAssign && selectedService && <p className={styles.hint}>Pracownika dobierzemy do wybranego terminu.</p>}
    {reservationsLoading && <DataLoader label="Sprawdzamy dostępne terminy…" compact />}
    {availabilityError && <p role="alert" className={styles.notice}>Nie udało się sprawdzić dostępności. <button type="button" onClick={() => fetchReservations().catch(() => {})}>Spróbuj ponownie</button></p>}
    {canChooseTime ? <>
      {!reservationsLoading && !availabilityError && (nearest ? <button type="button" className={styles.nearest} disabled={isSubmitting} onClick={() => { setDate(nearest.day); setCurrentMonth(nearest.day); setSlot(nearest.time); setPeriod("all"); }}>
        <span className={styles.nearestIcon} aria-hidden="true"><FiCalendar /></span><span className={styles.nearestText}>Najbliższy wolny termin<strong>{format(nearest.day, "d MMMM", { locale: pl })}<span>godz. {nearest.time}</span></strong></span><span className={styles.nearestAction} aria-hidden="true">Wybierz <FiArrowRight /></span>
      </button> : <p className={styles.notice}>Brak wolnych terminów w najbliższych 60 dniach. Sprawdź dalsze daty w kalendarzu.</p>)}
      <div className={styles.mainGrid}>
        <BookingDatePicker availability={dayAvailability} month={currentMonth} onMonthChange={setCurrentMonth} value={selectedDate} onChange={day => { setDate(day); setSlot(""); }} disabled={isSubmitting} isDisabled={day => !isDayActive(day) || isBefore(startOfDay(day), startOfDay(new Date())) || isDateBlockedByOverride(provider, format(day, "yyyy-MM-dd"))} />
        <section className={`${styles.times} ${!selectedDate ? styles.awaitingDate : ""}`}>
          {selectedDate && <span className={styles.sectionPin}>Wybierz godzinę</span>}
          {selectedDate ? <h3>{format(selectedDate, "EEEE, d MMMM", { locale: pl })}</h3> : <div className={styles.dateInvitation}>
            <span className={styles.invitationIcon} aria-hidden="true"><FiCalendar /></span>
            <h3>Jaki dzień Ci odpowiada?</h3>
            <p>Wybierz dzień w kalendarzu, a pokażemy wolne godziny. Kolorowe kropki pomogą znaleźć dogodny termin.</p>
            <div className={styles.invitationService}><ServiceImage service={selectedService} /><div><span>Wybrana usługa</span><strong>{selectedService.name}</strong><small><FiClock aria-hidden="true" />{durationToMinutes(selectedService)} min</small></div></div>
            <span className={styles.invitationHint}><FiArrowRight aria-hidden="true" />Zacznij od wyboru dnia</span>
          </div>}
          {selectedDate && <>
            <div className={styles.periods} role="group" aria-label="Pora dnia">
              {[["all", "Wszystkie"], ["morning", "Przed 12:00"], ["afternoon", "Od 12:00"], ["evening", "Od 17:00"]].map(([value, label]) => <button type="button" key={value} aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</button>)}
            </div>
            <div className={styles.slotsGrid} role="group" aria-label="Dostępne godziny">
              {visibleSlots.map(slot => <button type="button" key={slot.label} aria-pressed={selectedSlot === slot.label} aria-label={`Godzina ${slot.label}, ${slot.status === "free" ? "wolna" : slot.status === "reserved" ? "zajęta" : slot.status === "pending" ? "oczekująca" : "niedostępna"}`} disabled={slot.status !== "free" || isSubmitting || reservationsLoading || availabilityError} onClick={() => setSlot(slot.label)}>{slot.label}</button>)}
            </div>
            {!reservationsLoading && !availabilityError && !visibleSlots.length && <p className={styles.notice}>{timeSlots.some(slot => slot.status === "free") ? "Brak godzin w tej porze dnia. Wybierz inną porę." : "Brak wolnych godzin. Wybierz inny dzień."}</p>}
            <label className={styles.toggle}><input type="checkbox" checked={showUnavailableSlots} onChange={event => setShowUnavailableSlots(event.target.checked)} />Pokaż także zajęte godziny</label>
          </>}
        </section>
      </div>
      {selectedDate && <form onSubmit={handleSubmit} className={styles.review}>
        <label className={styles.field}>Uwagi (opcjonalnie)<textarea rows="2" value={description} onChange={event => setDescription(event.target.value)} disabled={isSubmitting} placeholder="Co powinniśmy wiedzieć przed wizytą?" /></label>
        {selectedSlot && <BookingSummary service={selectedService} date={selectedDate} time={selectedSlot} duration={durationToMinutes(selectedService)} staff={staffList.find(staff => String(staff._id) === String(selectedStaffId))?.name} />}
        <LoadingButton type="submit" isLoading={isSubmitting} disabled={!selectedSlot || isSubmitting || reservationsLoading || availabilityError || !timeSlots.some(slot => slot.label === selectedSlot && slot.status === "free")} className={styles.submit}><FiCheckCircle aria-hidden="true" />Rezerwuj termin</LoadingButton>
        <p className={styles.hint}>{provider.autoAcceptReservations ? "Ten profil automatycznie potwierdza rezerwacje. Status zobaczysz w swoich rezerwacjach." : "Usługodawca potwierdzi termin. Status zobaczysz w swoich rezerwacjach."}</p>
      </form>}
    </> : <div className={styles.selectionPrompt}><span className={styles.promptIcon} aria-hidden="true"><FiCalendar /></span><p>{!activeServices.length ? "Brak usług do rezerwacji. Skontaktuj się z usługodawcą." : !selectedService ? "Wybierz usługę, aby sprawdzić wolne terminy." : "Wybierz pracownika, aby sprawdzić wolne terminy."}</p><FiArrowRight className={styles.promptArrow} aria-hidden="true" /></div>}
  </div>;
}
