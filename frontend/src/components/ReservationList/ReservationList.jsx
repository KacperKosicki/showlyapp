// ReservationList.jsx
import { useEffect, useState, useCallback, useMemo } from "react";
import styles from "./ReservationList.module.scss";
import AlertBox from "../AlertBox/AlertBox";
import { useLocation } from "react-router-dom";
import { FiInbox, FiSend, FiPlus, FiEdit3, FiX } from "react-icons/fi";
import {
  FiCalendar,
  FiClock,
  FiTag,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiFileText,
  FiUser,
  FiList,
  FiGrid,
  FiInfo,
} from "react-icons/fi";

import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

import { api } from "../../api/api";

// ✅ siatka slotów zawsze co 5 minut
const GRID_STEP_MIN = 5;

// ✅ stała przerwa "systemowa" po usłudze (bazowa)
const BASE_BREAK_MIN = 5;

// ✅ (legacy) nie pokazujemy wolnych slotów krótszych niż to (np. 15-min wolne z bufora znikają)
const MIN_VISIBLE_FREE_MIN = 30;

function Countdown({ until, onExpire }) {
  const [txt, setTxt] = useState("");

  useEffect(() => {
    let fired = false;

    const toLabel = (ms) => {
      if (ms <= 0) return "00:00";
      const s = Math.floor(ms / 1000);
      const mm = String(Math.floor(s / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      return `${mm}:${ss}`;
    };

    const tick = () => {
      const ms = new Date(until).getTime() - Date.now();
      setTxt(toLabel(ms));
      if (ms <= 0 && !fired) {
        fired = true;
        onExpire?.();
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until, onExpire]);

  return (
    <div className={styles.countdown}>
      Wygasa za: <strong>{txt}</strong>
    </div>
  );
}

/** YYYY-MM-DD z Date */
const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** HH:MM -> minuty od 00:00 */
const timeToMin = (hhmm) => {
  if (!hhmm || typeof hhmm !== "string" || !hhmm.includes(":")) return 0;
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  const hh = Number.isFinite(h) ? h : 0;
  const mm = Number.isFinite(m) ? m : 0;
  return Math.max(0, Math.min(23, hh)) * 60 + Math.max(0, Math.min(59, mm));
};

/** minuty -> HH:MM */
const minToTime = (mins) => {
  const m = ((mins % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

/** czy cało-dniowa rezerwacja */
const isWholeDay = (r) => r?.dateOnly || (r?.fromTime === "00:00" && r?.toTime === "23:59");

const ReservationList = ({ user, resetPendingReservationsCount }) => {
  const location = useLocation();
  const isLogged = !!user?.uid;

  const [clientReservations, setClientReservations] = useState([]);
  const [serviceReservations, setServiceReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ widok: lista vs kalendarz
  const [viewMode, setViewMode] = useState("list"); // "list" | "calendar"
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  // ✅ meta profilu (workingHours + providerProfileId + usługi + staff + bookingMode + team)
  const [metaLoading, setMetaLoading] = useState(false);
  const [providerMeta, setProviderMeta] = useState(null);

  // ✅ OFFLINE modal
  const [offlineOpen, setOfflineOpen] = useState(false);

  // formularz offline
  const [offlineForm, setOfflineForm] = useState({
    dateOnly: false,
    date: toISODate(new Date()),
    fromTime: "10:00",
    toTime: "11:00",
    slotStart: "",

    offlineClientName: "",
    description: "",
    serviceId: "",
    staffId: "",
  });

  const [alert, setAlert] = useState({
    show: false,
    type: "info",
    message: "",
    onClose: null,
  });

  const [disabledIds, setDisabledIds] = useState(new Set());

  // uid -> undefined(pending) | null(brak) | string(nazwa)
  const [accountNameMap, setAccountNameMap] = useState({});

  const safeParse = (str) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  // =========================
  //  META: czy user ma profil usługodawcy
  // =========================
  const hasProviderProfile = !!providerMeta?.providerProfileId;

  // ✅ tryb rezerwacji profilu
  const bookingMode = providerMeta?.bookingMode; // "calendar" | "request-blocking" | "request-open"

  // ✅ Kalendarz dostępny dla: calendar + request-blocking
  const canUseCalendar =
    hasProviderProfile && (bookingMode === "calendar" || bookingMode === "request-blocking");

  const isSlotMode = bookingMode === "calendar";
  const isDayBlockingMode = bookingMode === "request-blocking";

  // ✅ buffer z profilu (0/5/10/15) + bazowe 5 min
  const bookingBufferMin = useMemo(() => {
    const b = Number(providerMeta?.bookingBufferMin);
    return [0, 5, 10, 15].includes(b) ? b : 0;
  }, [providerMeta?.bookingBufferMin]);

  // ✅ to jest ten bufor, który ma blokować kolejne sloty po usłudze
  const effectiveBufferMin = useMemo(() => {
    return BASE_BREAK_MIN + bookingBufferMin; // 5 / 10 / 15 / 20
  }, [bookingBufferMin]);

  // jeśli ktoś nie ma profilu albo nie ma trybu kalendarzowego, to nie pokazujemy widoku calendar
  useEffect(() => {
    if ((!hasProviderProfile || !canUseCalendar) && viewMode === "calendar") setViewMode("list");
  }, [hasProviderProfile, canUseCalendar, viewMode]);

  const fetchProviderMeta = useCallback(async () => {
    if (!isLogged) return;

    try {
      setMetaLoading(true);
      const r = await api.get(`/api/reservations/meta/${user.uid}`);
      setProviderMeta(r?.data || null);
    } catch {
      setProviderMeta(null);
    } finally {
      setMetaLoading(false);
    }
  }, [isLogged, user?.uid]);

  const refetch = useCallback(async () => {
    if (!isLogged) return;

    const [resClient, resService] = await Promise.all([
      api.get(`/api/reservations/by-user/${user.uid}`),
      api.get(`/api/reservations/by-provider/${user.uid}`),
    ]);

    setClientReservations(resClient.data || []);
    setServiceReservations(resService.data || []);
  }, [isLogged, user?.uid]);

  useEffect(() => {
    if (!isLogged) {
      setClientReservations([]);
      setServiceReservations([]);
      setProviderMeta(null);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        await Promise.all([fetchProviderMeta(), refetch()]);
      } catch (e) {
        console.error("❌ Błąd pobierania:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [isLogged, fetchProviderMeta, refetch]);

  // ESC zamyka modal
  useEffect(() => {
    if (!offlineOpen) return;

    const onKey = (e) => {
      if (e.key === "Escape") setOfflineOpen(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [offlineOpen]);

  // blokada scrolla strony pod modalem
  useEffect(() => {
    if (!offlineOpen) return;

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;

    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarW > 0) document.body.style.paddingRight = `${scrollbarW}px`;

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [offlineOpen]);

  useEffect(() => {
    if (!loading && resetPendingReservationsCount) resetPendingReservationsCount();
  }, [loading, resetPendingReservationsCount]);

  // 〰️ scroll po wejściu / powrocie
  useEffect(() => {
    const scrollTo = location.state?.scrollToId;
    if (!scrollTo || loading) return;

    const tryScroll = () => {
      const el = document.getElementById(scrollTo);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState({}, document.title, location.pathname);
      } else {
        requestAnimationFrame(tryScroll);
      }
    };
    requestAnimationFrame(tryScroll);
  }, [location.state, loading, location.pathname]);

  // =========================
  //  TEAM / assignment mode
  // =========================
  const teamEnabled = providerMeta?.team?.enabled === true;
  const assignmentMode = providerMeta?.team?.assignmentMode; // 'user-pick' | 'auto-assign'
  const isUserPickTeam = teamEnabled && assignmentMode === "user-pick";
  const isAutoAssignTeam = teamEnabled && assignmentMode === "auto-assign";

  // =========================
  //  DURATION: odczyt trwania usługi
  // =========================
  const services = useMemo(() => providerMeta?.services || [], [providerMeta]);

  const selectedService = useMemo(() => {
    if (!offlineForm.serviceId) return null;
    return services.find((s) => String(s._id) === String(offlineForm.serviceId)) || null;
  }, [services, offlineForm.serviceId]);

  const getServiceDurationMinutes = useCallback((s) => {
    if (!s) return null;

    if (Number.isFinite(s.durationMinutes)) return Math.max(1, Math.round(s.durationMinutes));

    const durationObj = s.duration || s.time || null;
    const value =
      (Number.isFinite(durationObj?.value) && durationObj.value) ||
      (Number.isFinite(s.duration) && s.duration) ||
      (Number.isFinite(s.timeValue) && s.timeValue) ||
      (Number.isFinite(s.value) && s.value) ||
      null;

    const unit = (durationObj?.unit || s.unit || s.timeUnit || s.durationUnit || "")
      .toString()
      .toLowerCase();

    if (!value) return null;

    if (unit.includes("min")) return Math.max(1, Math.round(value));
    if (unit.includes("godz") || unit.includes("hour") || unit === "h")
      return Math.max(1, Math.round(value * 60));
    if (unit.includes("dzie") || unit.includes("day"))
      return Math.max(1, Math.round(value * 1440));

    return Math.max(1, Math.round(value));
  }, []);

  const selectedDurationMin = useMemo(
    () => getServiceDurationMinutes(selectedService),
    [selectedService, getServiceDurationMinutes]
  );

  const durationLabel = useMemo(() => {
    if (!selectedDurationMin) return null;
    if (selectedDurationMin % 1440 === 0 && selectedDurationMin >= 1440) {
      const days = selectedDurationMin / 1440;
      return `${days} ${days === 1 ? "dzień" : "dni"}`;
    }
    if (selectedDurationMin % 60 === 0 && selectedDurationMin >= 60) {
      const h = selectedDurationMin / 60;
      return `${h} godz.`;
    }
    return `${selectedDurationMin} min`;
  }, [selectedDurationMin]);

  // =========================
  //  WORK HOURS z profilu (meta)
  // =========================
  const getWorkHours = useCallback(() => {
    const m = providerMeta || {};

    const from =
      m?.workingHours?.from ||
      m?.workingHours?.start ||
      m?.workHours?.from ||
      m?.workHours?.start ||
      m?.profile?.workingHours?.from ||
      m?.profile?.workingHours?.start ||
      m?.profile?.workFrom ||
      m?.profile?.fromTime ||
      "08:00";

    const to =
      m?.workingHours?.to ||
      m?.workingHours?.end ||
      m?.workHours?.to ||
      m?.workHours?.end ||
      m?.profile?.workingHours?.to ||
      m?.profile?.workingHours?.end ||
      m?.profile?.workTo ||
      m?.profile?.toTime ||
      "20:00";

    let startMin = timeToMin(from);
    let endMin = timeToMin(to);

    if (!Number.isFinite(startMin)) startMin = 8 * 60;
    if (!Number.isFinite(endMin)) endMin = 20 * 60;

    if (endMin <= startMin) {
      startMin = 8 * 60;
      endMin = 20 * 60;
    }

    return { startMin, endMin, from: minToTime(startMin), to: minToTime(endMin) };
  }, [providerMeta]);

  const { startMin: DAY_START_MIN, endMin: DAY_END_MIN } = useMemo(() => getWorkHours(), [getWorkHours]);

  // =========================
  //  OFFLINE SLOTY (jak BookingModeCalendar)
  //  ✅ tylko w trybie slotowym (calendar)
  // =========================
  const OFFLINE_STEP_MIN = GRID_STEP_MIN; // ✅ 5
  const OFFLINE_BUFFER_MIN = effectiveBufferMin; // ✅ 5 + bookingBufferMin

  const offlineSlots = useMemo(() => {
    if (!offlineOpen) return [];
    if (isDayBlockingMode) return [];
    if (offlineForm.dateOnly) return [];
    if (!offlineForm.serviceId || !selectedDurationMin) return [];
    if (!isSlotMode) return [];

    if (isUserPickTeam && !offlineForm.staffId) return [];

    const { startMin: dayStart, endMin: dayEnd } = getWorkHours();
    const dateStr = offlineForm.date;

    const active = (serviceReservations || [])
      .filter((r) => r.date === dateStr)
      .filter((r) => !r.dateOnly)
      .filter((r) => ["zaakceptowana", "oczekująca", "tymczasowa"].includes(r.status));

    const filtered =
      isUserPickTeam && offlineForm.staffId
        ? active.filter((r) => String(r.staffId || "") === String(offlineForm.staffId))
        : active;

    const eligibleStaff = isAutoAssignTeam
      ? (providerMeta?.staff || []).filter(
          (s) =>
            s.active !== false &&
            (s.serviceIds || []).some((id) => String(id) === String(offlineForm.serviceId))
        )
      : [];

    const totalCapacity = isAutoAssignTeam
      ? eligibleStaff.reduce((sum, s) => sum + Math.max(1, Number(s.capacity) || 1), 0)
      : 0;

    const capacityMap = new Map(
      eligibleStaff.map((s) => [String(s._id), Math.max(1, Number(s.capacity) || 1)])
    );

    const busy = (isAutoAssignTeam ? active : filtered)
      .map((r) => {
        const from = new Date(`${r.date}T${r.fromTime}`);
        const toNoBuf = new Date(`${r.date}T${r.toTime}`);
        const toWithBuf = new Date(+toNoBuf + OFFLINE_BUFFER_MIN * 60 * 1000);
        return {
          fromMs: +from,
          toMs: +toNoBuf,
          toBufMs: +toWithBuf,
          status: r.status === "zaakceptowana" ? "reserved" : "pending",
          staffId: String(r.staffId || ""),
        };
      })
      .sort((a, b) => a.fromMs - b.fromMs);

    const slots = [];
    let cursor = dayStart;

    while (cursor < dayEnd) {
      const start = cursor;
      const end = start + selectedDurationMin;
      const endWithBuf = end + OFFLINE_BUFFER_MIN;

      let status = "free";
      if (endWithBuf > dayEnd) status = "disabled";

      const startDT = new Date(`${dateStr}T${minToTime(start)}`);
      const endBufDT = new Date(`${dateStr}T${minToTime(endWithBuf)}`);

      const slotStartMs = +startDT;
      const slotEndMs = +endBufDT;

      const overlaps = busy.filter((b) => slotStartMs < b.toBufMs && slotEndMs > b.fromMs);

      if (isAutoAssignTeam) {
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

          if (usedCapacity >= totalCapacity && status !== "disabled") {
            const accepted = overlaps.filter((o) => o.status === "reserved");
            const pendingOnly = overlaps.filter((o) => o.status === "pending");

            const startsInsideAccepted = accepted.some(
              (o) => slotStartMs >= o.fromMs && slotStartMs <= o.toMs
            );
            const startsInsidePending = pendingOnly.some(
              (o) => slotStartMs >= o.fromMs && slotStartMs <= o.toMs
            );

            status = startsInsideAccepted ? "reserved" : startsInsidePending ? "pending" : "disabled";
          }
        }
      } else {
        if (overlaps.length > 0 && status !== "disabled") {
          const accepted = overlaps.filter((o) => o.status === "reserved");
          const pendingOnly = overlaps.filter((o) => o.status === "pending");

          const startsInsideAccepted = accepted.some(
            (o) => slotStartMs >= o.fromMs && slotStartMs <= o.toMs
          );
          const startsInsidePending = pendingOnly.some(
            (o) => slotStartMs >= o.fromMs && slotStartMs <= o.toMs
          );

          status = startsInsideAccepted ? "reserved" : startsInsidePending ? "pending" : "disabled";
        }
      }

      slots.push({ label: minToTime(start), status });
      cursor += OFFLINE_STEP_MIN;
    }

    return slots;
  }, [
    offlineOpen,
    isDayBlockingMode,
    isSlotMode,
    offlineForm.date,
    offlineForm.dateOnly,
    offlineForm.serviceId,
    offlineForm.staffId,
    selectedDurationMin,
    providerMeta,
    serviceReservations,
    getWorkHours,
    isUserPickTeam,
    isAutoAssignTeam,
    OFFLINE_BUFFER_MIN,
    OFFLINE_STEP_MIN,
  ]);

  useEffect(() => {
    if (!offlineOpen) return;
    if (!isSlotMode) return;
    if (offlineForm.dateOnly) return;
    if (!offlineForm.slotStart) return;
    if (!selectedDurationMin) return;

    const from = timeToMin(offlineForm.slotStart);
    const to = from + selectedDurationMin;

    setOfflineForm((p) => ({
      ...p,
      fromTime: minToTime(from),
      toTime: minToTime(to),
    }));
  }, [offlineOpen, isSlotMode, offlineForm.dateOnly, offlineForm.slotStart, selectedDurationMin]);

  // =========================
  //  Prewalidacja OFFLINE z dynamicznym buforem
  // =========================
  const validateOfflineWithBreak = useCallback(() => {
    if (offlineForm.dateOnly || isDayBlockingMode) return { ok: true, reason: null };

    const iso = offlineForm.date;
    const active = serviceReservations
      .filter((r) => r.date === iso)
      .filter((r) => !["anulowana", "odrzucona"].includes(r.status));

    if (active.length === 0) return { ok: true, reason: null };

    const aFrom = timeToMin(offlineForm.fromTime);
    const aTo = timeToMin(offlineForm.toTime);
    const start = Math.min(aFrom, aTo);
    const end = Math.max(aFrom, aTo);

    const overlaps = (s1, e1, s2, e2) => Math.max(s1, s2) < Math.min(e1, e2);

    const conflictsLocal = active.filter((r) => {
      if (isWholeDay(r)) return true;
      const bFrom = timeToMin(r.fromTime);
      const bTo = timeToMin(r.toTime);
      const bs = Math.min(bFrom, bTo);
      const be = Math.max(bFrom, bTo) + OFFLINE_BUFFER_MIN;
      return overlaps(start, end, bs, be);
    });

    if (conflictsLocal.length === 0) return { ok: true, reason: null };

    return {
      ok: false,
      reason: `Termin nachodzi na inną rezerwację (system dolicza ${OFFLINE_BUFFER_MIN} min przerwy po rezerwacji).`,
    };
  }, [offlineForm, serviceReservations, OFFLINE_BUFFER_MIN, isDayBlockingMode]);

  // =========================
  //  OFFLINE: otwieranie modala
  // =========================
  const openOfflineForDay = async (isoDate) => {
    if (!isLogged) return;
    if (!hasProviderProfile) {
      setAlert({
        show: true,
        type: "warning",
        message: "Aby dodawać rezerwacje offline, musisz mieć utworzony profil usługodawcy.",
        onClose: null,
      });
      return;
    }

    setOfflineForm((p) => ({
      ...p,
      date: isoDate,
      slotStart: "",
      dateOnly: isDayBlockingMode ? true : p.dateOnly,
      fromTime: isDayBlockingMode ? "00:00" : p.fromTime,
      toTime: isDayBlockingMode ? "23:59" : p.toTime,
    }));
    setOfflineOpen(true);

    if (!providerMeta) await fetchProviderMeta();
  };

  const submitOffline = useCallback(async () => {
    if (!isLogged) return;
    if (!hasProviderProfile || !providerMeta?.providerProfileId) {
      setAlert({
        show: true,
        type: "warning",
        message: "Brak profilu usługodawcy — nie możesz dodać rezerwacji offline.",
        onClose: null,
      });
      return;
    }

    const name = (offlineForm.offlineClientName || "").trim();
    if (!name) {
      setAlert({ show: true, type: "warning", message: "Podaj nazwę klienta (offline).", onClose: null });
      return;
    }

    if (!offlineForm.serviceId) {
      setAlert({ show: true, type: "warning", message: "Najpierw wybierz usługę.", onClose: null });
      return;
    }

    const effectiveDateOnly = isDayBlockingMode ? true : offlineForm.dateOnly;

    if (!effectiveDateOnly) {
      if (isUserPickTeam && !offlineForm.staffId) {
        setAlert({
          show: true,
          type: "warning",
          message: "Wybierz pracownika (tryb zespołu: wybór przez użytkownika).",
          onClose: null,
        });
        return;
      }

      if (isSlotMode && !offlineForm.slotStart) {
        setAlert({ show: true, type: "warning", message: "Wybierz godzinę startu (slot).", onClose: null });
        return;
      }
    }

    const v = validateOfflineWithBreak();
    if (!v.ok) {
      setAlert({ show: true, type: "warning", message: v.reason, onClose: null });
      return;
    }

    try {
      setDisabledIds((p) => new Set(p).add("offline-submit"));

      const payloadBase = {
        providerUserId: user.uid,
        providerProfileId: providerMeta.providerProfileId,
        date: offlineForm.date,
        description: (offlineForm.description || "").trim(),
        serviceId: offlineForm.serviceId || null,
        serviceName: null,
        staffId: offlineForm.staffId || null,
        offlineClientName: name,
      };

      if (effectiveDateOnly) {
        await api.post(`/api/reservations/offline/day`, payloadBase);
      } else {
        const from = offlineForm.fromTime;
        const to = offlineForm.toTime;

        if (!from || !to) {
          setAlert({ show: true, type: "warning", message: "Uzupełnij godziny od/do.", onClose: null });
          return;
        }

        await api.post(`/api/reservations/offline`, {
          ...payloadBase,
          fromTime: from,
          toTime: to,
        });
      }

      setOfflineOpen(false);
      setOfflineForm((p) => ({
        ...p,
        slotStart: "",
        offlineClientName: "",
        description: "",
        staffId: "",
        serviceId: "",
        dateOnly: false,
      }));

      setAlert({ show: true, type: "success", message: "Dodano offline rezerwację.", onClose: null });

      await refetch();
    } catch (e) {
      console.error("❌ submitOffline error:", e);

      const msg =
        e?.response?.data?.message || e?.response?.data?.error || "Nie udało się dodać offline rezerwacji.";

      const looksLikeBreakIssue =
        String(msg).toLowerCase().includes("przerw") ||
        String(msg).toLowerCase().includes("break") ||
        e?.response?.status === 409;

      setAlert({
        show: true,
        type: "error",
        message: looksLikeBreakIssue
          ? `Nie da się dodać — termin koliduje przez bufor ${OFFLINE_BUFFER_MIN} min po rezerwacji. Wybierz inny slot.`
          : msg,
        onClose: null,
      });
    } finally {
      setDisabledIds((p) => {
        const n = new Set(p);
        n.delete("offline-submit");
        return n;
      });
    }
  }, [
    isLogged,
    hasProviderProfile,
    providerMeta,
    user?.uid,
    offlineForm,
    isDayBlockingMode,
    isUserPickTeam,
    isSlotMode,
    validateOfflineWithBreak,
    refetch,
    OFFLINE_BUFFER_MIN,
  ]);

  const filteredStaff = useMemo(() => {
    const staff = providerMeta?.staff || [];
    if (!offlineForm.serviceId) return staff;
    return staff.filter((s) => (s.serviceIds || []).some((id) => String(id) === String(offlineForm.serviceId)));
  }, [providerMeta, offlineForm.serviceId]);

  // =========================
  //  Konto (displayName) dla received
  // =========================
  const senderUids = useMemo(() => {
    const arr = serviceReservations.map((r) => r.userId).filter(Boolean);
    return Array.from(new Set(arr));
  }, [serviceReservations]);

  const getAccountName = useCallback(
    (uid, fallbackName) => {
      if (!uid) return fallbackName?.trim() || "Użytkownik";
      const name = accountNameMap[uid];
      if (name === undefined) return "";
      if (typeof name === "string" && name.trim()) return name.trim();
      return fallbackName?.trim() || "Użytkownik";
    },
    [accountNameMap]
  );

  useEffect(() => {
    if (!isLogged) return;
    if (senderUids.length === 0) return;

    setAccountNameMap((prev) => {
      const next = { ...prev };
      senderUids.forEach((uid) => {
        if (!Object.prototype.hasOwnProperty.call(next, uid)) next[uid] = undefined;
      });
      return next;
    });

    const fetchOne = async (uid) => {
      try {
        const r = await api.get(`/api/users/public/${uid}`);
        const data = r?.data;

        const dn =
          (data?.displayName && String(data.displayName).trim()) ||
          (data?.name && String(data.name).trim()) ||
          null;

        return dn;
      } catch {
        return null;
      }
    };

    (async () => {
      const entries = await Promise.all(senderUids.map(async (uid) => [uid, await fetchOne(uid)]));
      setAccountNameMap((prev) => {
        const next = { ...prev };
        entries.forEach(([uid, name]) => {
          next[uid] = name;
        });
        return next;
      });
    })();
  }, [isLogged, senderUids]);

  // =========================
  //  Konflikty (ostrzeżenia w modalu) — również z dynamicznym buforem
  // =========================
  const conflicts = useMemo(() => {
    if (!offlineOpen) return [];
    const iso = offlineForm.date;

    const sameDay = serviceReservations.filter((r) => r.date === iso);
    const active = sameDay.filter((r) => !["anulowana", "odrzucona"].includes(r.status));

    if (active.length === 0) return [];

    if (offlineForm.dateOnly || isDayBlockingMode) {
      return active.map((r) => ({
        id: r._id,
        label: `${isWholeDay(r) ? "CAŁY DZIEŃ" : `${r.fromTime}–${r.toTime}`} • ${
          r.offline ? r.offlineClientName || "OFFLINE" : r.userName || "Klient"
        } • ${r.status}`,
      }));
    }

    const hasWhole = active.some((r) => isWholeDay(r));
    if (hasWhole) {
      return active
        .filter((r) => isWholeDay(r))
        .map((r) => ({
          id: r._id,
          label: `CAŁY DZIEŃ • ${
            r.offline ? r.offlineClientName || "OFFLINE" : r.userName || "Klient"
          } • ${r.status}`,
        }));
    }

    const aFrom = timeToMin(offlineForm.fromTime);
    const aTo = timeToMin(offlineForm.toTime);
    const start = Math.min(aFrom, aTo);
    const end = Math.max(aFrom, aTo);

    const overlaps = (s1, e1, s2, e2) => Math.max(s1, s2) < Math.min(e1, e2);

    return active
      .filter((r) => {
        const bFrom = timeToMin(r.fromTime);
        const bTo = timeToMin(r.toTime);
        const bs = Math.min(bFrom, bTo);
        const be = Math.max(bFrom, bTo) + OFFLINE_BUFFER_MIN;
        return overlaps(start, end, bs, be);
      })
      .map((r) => ({
        id: r._id,
        label: `${r.fromTime}–${r.toTime} (+${OFFLINE_BUFFER_MIN}m) • ${
          r.offline ? r.offlineClientName || "OFFLINE" : r.userName || "Klient"
        } • ${r.status}`,
      }));
  }, [
    offlineOpen,
    offlineForm.date,
    offlineForm.dateOnly,
    offlineForm.fromTime,
    offlineForm.toTime,
    serviceReservations,
    isDayBlockingMode,
    OFFLINE_BUFFER_MIN,
  ]);

  const offlineModalEl = useMemo(() => {
    if (!offlineOpen) return null;

    const servicesLocal = providerMeta?.services || [];

    return (
      <div className={styles.modalOverlay} onClick={() => setOfflineOpen(false)}>
        <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHead}>
            <div className={styles.modalTitle}>
              <FiPlus /> Dodaj rezerwację offline
            </div>

            <button className={styles.modalClose} onClick={() => setOfflineOpen(false)} type="button">
              <FiX />
            </button>
          </div>

          <div className={styles.modalBody}>
            {metaLoading && <div className={styles.modalHint}>Ładowanie danych profilu…</div>}

            <div className={styles.modalInfo}>
              <FiInfo />
              <div>
                <b>System dolicza przerwę {OFFLINE_BUFFER_MIN} min</b> po każdej rezerwacji (także offline).
                <div style={{ opacity: 0.85, fontSize: 12, marginTop: 4 }}>
                  (bazowe {BASE_BREAK_MIN} min + bufor z profilu {bookingBufferMin} min)
                </div>
              </div>
            </div>

            {conflicts.length > 0 && (
              <div className={styles.modalWarn}>
                <div className={styles.modalWarnTitle}>
                  <FiAlertCircle /> Uwaga: możliwy konflikt terminów (z buforem {OFFLINE_BUFFER_MIN} min)
                </div>
                <div className={styles.modalWarnText}>
                  W tym dniu/godzinach są już rezerwacje. Terminy mogą się nałożyć:
                </div>
                <ul className={styles.conflictList}>
                  {conflicts.slice(0, 6).map((c) => (
                    <li key={c.id}>{c.label}</li>
                  ))}
                </ul>
                {conflicts.length > 6 && <div className={styles.conflictMore}>+ {conflicts.length - 6} więcej</div>}
              </div>
            )}

            <div className={styles.modalGrid}>
              <label className={styles.field}>
                <span>Data</span>
                <input
                  className={styles.formInput}
                  type="date"
                  value={offlineForm.date}
                  onChange={(e) => setOfflineForm((p) => ({ ...p, date: e.target.value, slotStart: "" }))}
                />
              </label>

              {!isDayBlockingMode && (
                <label className={styles.fieldToggle}>
                  <input
                    type="checkbox"
                    checked={offlineForm.dateOnly}
                    onChange={(e) => setOfflineForm((p) => ({ ...p, dateOnly: e.target.checked, slotStart: "" }))}
                  />
                  <span>Cały dzień</span>
                </label>
              )}

              <label className={styles.fieldWide}>
                <span>Klient (offline)</span>
                <input
                  className={styles.formInput}
                  value={offlineForm.offlineClientName}
                  onChange={(e) => setOfflineForm((p) => ({ ...p, offlineClientName: e.target.value }))}
                  placeholder="Np. Kasia / Firma X"
                />
              </label>

              <label className={styles.fieldWide}>
                <span>Opis (wyświetlany w rezerwacji)</span>
                <textarea
                  className={styles.formTextarea}
                  rows={3}
                  value={offlineForm.description}
                  onChange={(e) => setOfflineForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Opcjonalnie"
                />
              </label>

              <label className={styles.fieldWide}>
                <span>Usługa (wymagane)</span>
                <select
                  className={styles.formInput}
                  value={offlineForm.serviceId}
                  onChange={(e) =>
                    setOfflineForm((p) => ({
                      ...p,
                      serviceId: e.target.value,
                      staffId: "",
                      slotStart: "",
                    }))
                  }
                >
                  <option value="">— wybierz usługę —</option>
                  {servicesLocal.map((s) => {
                    const mins = getServiceDurationMinutes(s);
                    const label = mins
                      ? `${s.name} (${mins % 60 === 0 && mins >= 60 ? `${mins / 60} godz.` : `${mins} min`})`
                      : s.name;

                    return (
                      <option key={String(s._id)} value={String(s._id)}>
                        {label}
                      </option>
                    );
                  })}
                </select>

                {!!durationLabel && (
                  <div className={styles.durationPill}>
                    ⏱ Czas usługi: <b>{durationLabel}</b>
                    <span className={styles.durationMini}>+ {OFFLINE_BUFFER_MIN} min przerwy</span>
                  </div>
                )}
              </label>

              <label className={styles.fieldWide}>
                <span>Pracownik</span>
                <select
                  className={styles.formInput}
                  value={offlineForm.staffId}
                  onChange={(e) =>
                    setOfflineForm((p) => ({
                      ...p,
                      staffId: e.target.value,
                      slotStart: "",
                    }))
                  }
                  disabled={!teamEnabled || isAutoAssignTeam}
                  title={
                    !teamEnabled
                      ? "Zespół wyłączony w profilu"
                      : isAutoAssignTeam
                      ? "Auto-assign: pracownik dobierany automatycznie"
                      : ""
                  }
                >
                  <option value="">{isUserPickTeam ? "— wybierz pracownika (wymagane) —" : "— opcjonalnie —"}</option>
                  {filteredStaff.map((s) => (
                    <option key={String(s._id)} value={String(s._id)}>
                      {s.name} (cap: {s.capacity || 1})
                    </option>
                  ))}
                </select>
              </label>

              {!isDayBlockingMode && isSlotMode && !offlineForm.dateOnly && (
                <div className={styles.slotBox}>
                  <div className={styles.slotHead}>
                    Wybierz godzinę startu (slot)
                    <span className={styles.slotHint}>+ {OFFLINE_BUFFER_MIN} min przerwy</span>
                  </div>

                  {!offlineForm.serviceId ? (
                    <div className={styles.slotInfo}>
                      Najpierw wybierz <b>usługę</b> — wtedy pokażę dopasowane sloty.
                    </div>
                  ) : isUserPickTeam && !offlineForm.staffId ? (
                    <div className={styles.slotInfo}>
                      Wybierz <b>pracownika</b>, żeby pokazać sloty (tryb user-pick).
                    </div>
                  ) : (
                    <>
                      <div className={styles.slotGrid}>
                        {offlineSlots.map((s, i) => (
                          <button
                            key={`${s.label}-${i}`}
                            type="button"
                            className={`
                              ${styles.slotBtn}
                              ${s.status === "disabled" ? styles.slotDisabled : ""}
                              ${s.status === "reserved" ? styles.slotReserved : ""}
                              ${s.status === "pending" ? styles.slotPending : ""}
                              ${offlineForm.slotStart === s.label ? styles.slotSelected : ""}
                            `}
                            disabled={s.status !== "free"}
                            onClick={() => setOfflineForm((p) => ({ ...p, slotStart: s.label }))}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>

                      <div className={styles.slotLegend}>
                        <span>
                          <span className={`${styles.legBox} ${styles.legReserved}`} />
                          zajęte
                        </span>
                        <span>
                          <span className={`${styles.legBox} ${styles.legPending}`} />
                          oczekujące
                        </span>
                        <span>
                          <span className={`${styles.legBox} ${styles.legDisabled}`} />
                          niedostępne
                        </span>
                        <span>
                          <span className={`${styles.legBox} ${styles.legFree}`} />
                          wolne
                        </span>
                      </div>

                      {!!offlineForm.slotStart && (
                        <div className={styles.slotSummary}>
                          Start: <b>{offlineForm.fromTime}</b> • Koniec: <b>{offlineForm.toTime}</b>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className={styles.modalActions}>
              <button className={styles.modalSecondary} onClick={() => setOfflineOpen(false)} type="button">
                Anuluj
              </button>

              <button
                className={styles.modalPrimary}
                onClick={submitOffline}
                type="button"
                disabled={disabledIds.has("offline-submit")}
              >
                <FiEdit3 /> Dodaj
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }, [
    offlineOpen,
    providerMeta,
    metaLoading,
    offlineForm,
    conflicts,
    durationLabel,
    filteredStaff,
    disabledIds,
    submitOffline,
    getServiceDurationMinutes,
    teamEnabled,
    isUserPickTeam,
    isAutoAssignTeam,
    offlineSlots,
    isDayBlockingMode,
    isSlotMode,
    OFFLINE_BUFFER_MIN,
    bookingBufferMin,
  ]);

  // flash (sessionStorage)
  useEffect(() => {
    if (loading) return;
    const raw = sessionStorage.getItem("flash");
    const flash = safeParse(raw);
    if (!flash) return;

    const age = Date.now() - (flash.ts || 0);
    const ttl = flash.ttl ?? 6000;

    if (age < ttl) {
      const remaining = ttl - age;
      setAlert({
        show: true,
        type: flash.type || "info",
        message: flash.message || "",
        onClose: () => {
          setAlert((a) => ({ ...a, show: false }));
          sessionStorage.removeItem("flash");
        },
      });

      const tid = setTimeout(() => {
        setAlert((a) => ({ ...a, show: false }));
        sessionStorage.removeItem("flash");
      }, remaining);

      return () => clearTimeout(tid);
    } else {
      sessionStorage.removeItem("flash");
    }
  }, [loading]);

  // auto-refetch co 30s jeśli są pendingi
  useEffect(() => {
    if (!isLogged) return;

    const hasPendings =
      clientReservations.some((r) => r.status === "oczekująca") ||
      serviceReservations.some((r) => r.status === "oczekująca");

    if (!hasPendings) return;
    const id = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(id);
  }, [isLogged, clientReservations, serviceReservations, refetch]);

  const withToastAndRefresh = (type, message, unlockId) => {
    const onClose = async () => {
      setAlert((a) => ({ ...a, show: false }));
      await refetch();
      if (unlockId) {
        setDisabledIds((prev) => {
          const next = new Set(prev);
          next.delete(unlockId);
          return next;
        });
      }
    };
    setAlert({ show: true, type, message, onClose });
  };

  const handleStatusChange = async (reservationId, newStatus) => {
    try {
      setDisabledIds((prev) => new Set(prev).add(reservationId));

      await api.patch(`/api/reservations/${reservationId}/status`, {
        status: newStatus,
      });

      if (newStatus === "anulowana")
        return withToastAndRefresh("warning", "Rezerwacja anulowana – slot zwolniony.", reservationId);

      if (newStatus === "odrzucona")
        return withToastAndRefresh("warning", "Rezerwacja odrzucona – slot zwolniony.", reservationId);

      if (newStatus === "zaakceptowana") {
        setAlert({
          show: true,
          type: "success",
          message: "Pomyślnie potwierdzono rezerwację.",
          onClose: null,
        });
        await refetch();
        setDisabledIds((prev) => {
          const n = new Set(prev);
          n.delete(reservationId);
          return n;
        });
        return;
      }

      withToastAndRefresh("info", "Status zaktualizowany.", reservationId);
    } catch (err) {
      console.error("❌ Błąd zmiany statusu rezerwacji:", err);
      setAlert({ show: true, type: "error", message: "Nie udało się zmienić statusu.", onClose: null });
      setDisabledIds((prev) => {
        const n = new Set(prev);
        n.delete(reservationId);
        return n;
      });
    }
  };

  const markSeen = async (id, who) => {
    try {
      await api.patch(`/api/reservations/${id}/seen`, { who });
      if (who === "client") setClientReservations((prev) => prev.filter((r) => r._id !== id));
      else setServiceReservations((prev) => prev.filter((r) => r._id !== id));
    } catch (e) {
      console.error("❌ markSeen error", e);
    }
  };

  const timeLabel = (res) => {
    const whole = isWholeDay(res);
    return whole ? "cały dzień" : `${res.fromTime} – ${res.toTime}`;
  };

  const formatDatePL = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" });
  };

  const statusIcon = (status) => {
    if (status === "zaakceptowana") return <FiCheckCircle className={styles.chipIcon} aria-hidden="true" />;
    if (status === "odrzucona" || status === "anulowana")
      return <FiXCircle className={styles.chipIcon} aria-hidden="true" />;
    return <FiAlertCircle className={styles.chipIcon} aria-hidden="true" />;
  };

  const renderInfo = (res) => (
    <div className={styles.info}>
      <span className={styles.chip}>
        <FiCalendar className={styles.chipIcon} aria-hidden="true" />
        {formatDatePL(res.date)}
      </span>

      <span className={styles.chip}>
        <FiClock className={styles.chipIcon} aria-hidden="true" />
        {timeLabel(res)}
      </span>

      {res.offline && (
        <span className={`${styles.chip} ${styles.chipOffline}`}>
          <FiUser className={styles.chipIcon} aria-hidden="true" />
          OFFLINE
        </span>
      )}

      {res.serviceName && (
        <span className={styles.chip}>
          <FiTag className={styles.chipIcon} aria-hidden="true" />
          {res.serviceName}
        </span>
      )}

      {(res.staffName || res.staffId) && (
        <span
          className={styles.chip}
          title={res.staffAutoAssigned ? "Przypisano automatycznie" : "Wybrany przez klienta"}
        >
          <FiUser className={styles.chipIcon} aria-hidden="true" />
          {res.staffName || `#${String(res.staffId).slice(-5)}`}
          {res.staffAutoAssigned ? " (auto)" : ""}
        </span>
      )}

      <span
        className={`${styles.chip} ${
          res.status === "zaakceptowana"
            ? styles.chipAccepted
            : res.status === "odrzucona" || res.status === "anulowana"
            ? styles.chipRejected
            : styles.chipPending
        }`}
      >
        {statusIcon(res.status)}
        {res.status}
      </span>
    </div>
  );

  const pendingSent = clientReservations.filter((r) => r.status === "oczekująca").length;
  const pendingReceived = serviceReservations.filter((r) => r.status === "oczekująca").length;

  const renderNameNode = (rawName) =>
    rawName ? (
      <span className={styles.name}>{rawName}</span>
    ) : (
      <span className={`${styles.name} ${styles.nameSkeleton} ${styles.shimmer}`} />
    );

  const getAvatarVariant = (variant) => {
    if (variant === "sent") return "sent";
    return "recv";
  };

  const AvatarNode = ({ variant, isOffline }) => {
    const v = getAvatarVariant(variant);
    const cls = `${styles.avatar} ${v === "sent" ? styles.avatarSent : styles.avatarRecv} ${
      isOffline ? styles.avatarOffline : ""
    }`;
    return (
      <div className={cls} aria-hidden="true">
        {v === "sent" ? <FiSend /> : <FiInbox />}
      </div>
    );
  };

  const renderHeader = (res, variant) => {
    if (variant === "sent") {
      return (
        <>
          <FiSend className={styles.icon} />
          <span className={styles.metaText}>
            Rezerwacja z <b>Twojego konta</b> do profilu{" "}
            <span className={styles.name}>{res.providerProfileName || "Profil"}</span>
          </span>
        </>
      );
    }

    const rawAccountName = getAccountName(res.userId, res.userName);
    return (
      <>
        <FiInbox className={styles.icon} />
        <span className={styles.metaText}>
          Otrzymana rezerwacja do <b>Twojego profilu</b> od {renderNameNode(rawAccountName)}
        </span>
      </>
    );
  };

  const renderClosedInfo = (res, viewer) => {
    if (!["anulowana", "odrzucona"].includes(res.status)) return null;

    const who = viewer === "sent" ? "client" : "provider";
    const unseen = viewer === "sent" ? !res.clientSeen : !res.providerSeen;
    if (!unseen) return null;

    const label =
      res.closedReason === "expired"
        ? "Rezerwacja wygasła (brak potwierdzenia w czasie)."
        : res.status === "anulowana"
        ? "Klient anulował rezerwację."
        : "Usługodawca odrzucił rezerwację.";

    return (
      <div className={styles.closedInfo}>
        <span>{label}</span>
        <button className={styles.seenBtn} onClick={() => markSeen(res._id, who)}>
          OK, widzę
        </button>
      </div>
    );
  };

  const renderDescription = (res, viewer) => {
    const text = (res.description || "").trim();
    if (!text) return null;

    const title = viewer === "received" ? "Opis od klienta" : "Twój opis do rezerwacji";

    return (
      <div className={styles.note}>
        <div className={styles.noteHeader}>
          <FiFileText className={styles.noteIcon} aria-hidden="true" />
          <span>{title}</span>
        </div>
        <div className={styles.noteBody}>{text}</div>
      </div>
    );
  };

  const renderItem = (res, variant) => {
    const isPending = res.status === "oczekująca";
    const created = res.createdAt || res.updatedAt || Date.now();
    const isOffline = !!res.offline;

    return (
      <li key={res._id} className={`${styles.item} ${isPending ? styles.unread : styles.read}`}>
        <div className={styles.link}>
          <div className={styles.row}>
            <div className={styles.avatarWrap}>
              <AvatarNode variant={variant} isOffline={isOffline} />
              {isPending && <span className={styles.badgeDot} aria-hidden="true" />}
            </div>

            <div className={styles.head}>
              <div className={styles.meta}>{renderHeader(res, variant)}</div>
              <div className={styles.date}>{new Date(created).toLocaleString()}</div>
            </div>

            <div className={styles.content}>
              {renderInfo(res)}
              {renderDescription(res, variant)}
              {res.status === "oczekująca" && res.pendingExpiresAt && (
                <Countdown until={res.pendingExpiresAt} onExpire={() => refetch()} />
              )}
              {renderClosedInfo(res, variant)}
            </div>

            <div className={styles.bottomRow}>
              {variant === "sent" && res.status === "oczekująca" ? (
                <button
                  onClick={() => handleStatusChange(res._id, "anulowana")}
                  className={`${styles.actionBtn} ${styles.cancelBtn}`}
                  disabled={disabledIds.has(res._id)}
                >
                  ❌ Anuluj
                </button>
              ) : null}

              {variant === "received" && res.status === "oczekująca" ? (
                <>
                  <button
                    onClick={() => handleStatusChange(res._id, "zaakceptowana")}
                    className={`${styles.actionBtn} ${styles.acceptBtn}`}
                    disabled={disabledIds.has(res._id)}
                  >
                    ✅ Potwierdź
                  </button>
                  <button
                    onClick={() => handleStatusChange(res._id, "odrzucona")}
                    className={`${styles.actionBtn} ${styles.rejectBtn}`}
                    disabled={disabledIds.has(res._id)}
                  >
                    ❌ Odrzuć
                  </button>
                </>
              ) : (
                <span className={styles.statePill}>
                  Status: <strong>{res.status}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      </li>
    );
  };

  // =========================
  //  KALENDARZ
  // =========================
  const dayMap = useMemo(() => {
    const map = new Map();
    const push = (date, type, status) => {
      if (!date) return;
      const cur =
        map.get(date) || {
          total: 0,
          pending: 0,
          accepted: 0,
          rejected: 0,
          sentTotal: 0,
          recvTotal: 0,
        };
      cur.total += 1;
      if (type === "sent") cur.sentTotal += 1;
      if (type === "recv") cur.recvTotal += 1;

      if (status === "oczekująca") cur.pending += 1;
      else if (status === "zaakceptowana") cur.accepted += 1;
      else if (status === "odrzucona" || status === "anulowana") cur.rejected += 1;

      map.set(date, cur);
    };

    clientReservations.forEach((r) => push(r.date, "sent", r.status));
    if (hasProviderProfile) serviceReservations.forEach((r) => push(r.date, "recv", r.status));

    return map;
  }, [clientReservations, serviceReservations, hasProviderProfile]);

  const selectedIso = useMemo(() => toISODate(selectedDay), [selectedDay]);

  const selectedReservations = useMemo(() => {
    const sent = clientReservations.filter((r) => r.date === selectedIso);
    const recv = hasProviderProfile ? serviceReservations.filter((r) => r.date === selectedIso) : [];

    const sortFn = (a, b) => {
      const ap = a.status === "oczekująca" ? 0 : 1;
      const bp = b.status === "oczekująca" ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return String(a.fromTime || "").localeCompare(String(b.fromTime || ""));
    };

    return {
      sent: sent.slice().sort(sortFn),
      recv: recv.slice().sort(sortFn),
    };
  }, [clientReservations, serviceReservations, selectedIso, hasProviderProfile]);

  const statusToTlClass = (status) => {
    if (status === "zaakceptowana") return styles.tlAccepted;
    if (status === "odrzucona" || status === "anulowana") return styles.tlRejected;
    if (status === "oczekująca") return styles.tlPending;
    return "";
  };

  const dotToTlClass = (status) => {
    if (status === "zaakceptowana") return styles.tlDotAccepted;
    if (status === "odrzucona" || status === "anulowana") return styles.tlDotRejected;
    if (status === "oczekująca") return styles.tlDotPending;
    if (status === "wolne") return styles.tlDotFree;
    return "";
  };

  const openOfflineForSlot = async (isoDate, startMin, endMin) => {
    await openOfflineForDay(isoDate);
    setOfflineForm((p) => ({
      ...p,
      dateOnly: false,
      date: isoDate,
      slotStart: "",
      fromTime: minToTime(startMin),
      toTime: minToTime(endMin),
    }));
  };

  const dayTimeline = useMemo(() => {
    if (!canUseCalendar) return { wholeDay: [], blocks: [] };

    const iso = selectedIso;

    const all = [
      ...selectedReservations.recv.map((r) => ({ ...r, __kind: "recv" })),
      ...selectedReservations.sent.map((r) => ({ ...r, __kind: "sent" })),
    ];

    const wholeDay = all.filter((r) => isWholeDay(r));

    if (isDayBlockingMode) {
      return { wholeDay, blocks: [] };
    }

    if (all.length === 0) {
      return {
        wholeDay: [],
        blocks: [
          {
            id: "free-day",
            isFree: true,
            status: "wolne",
            title: "Brak rezerwacji — dzień wolny",
            startMin: DAY_START_MIN,
            endMin: DAY_END_MIN,
          },
        ],
      };
    }

    const timed = all
      .filter((r) => !isWholeDay(r))
      .map((r) => {
        const a = timeToMin(r.fromTime);
        const b = timeToMin(r.toTime);
        const startMin = Math.min(a, b);
        const endMin = Math.max(a, b);

        const isOffline = !!r.offline;

        const title =
          r.__kind === "recv"
            ? `${isOffline ? r.offlineClientName || "OFFLINE" : getAccountName(r.userId, r.userName) || "Klient"}`
            : `${r.providerProfileName || "Profil"}`;

        return {
          id: r._id,
          isFree: false,
          iso,
          kind: r.__kind,
          offline: isOffline,
          status: r.status,
          startMin,
          endMin,
          serviceName: r.serviceName || "",
          staffName: r.staffName || "",
          desc: (r.description || "").trim(),
          raw: r,
          title,
        };
      })
      .filter((b) => b.endMin > b.startMin)
      .sort((a, b) => a.startMin - b.startMin);

    const blocks = [];
    let cursor = DAY_START_MIN;

    for (const b of timed) {
      const s = Math.max(DAY_START_MIN, b.startMin);
      const e = Math.min(DAY_END_MIN, b.endMin);
      if (e <= DAY_START_MIN || s >= DAY_END_MIN) continue;

      if (s > cursor) {
        blocks.push({
          id: `free-${cursor}-${s}`,
          isFree: true,
          status: "wolne",
          title: "WOLNE",
          startMin: cursor,
          endMin: s,
        });
      }

      blocks.push({ ...b, startMin: s, endMin: e });
      cursor = Math.max(cursor, e);
    }

    if (cursor < DAY_END_MIN) {
      blocks.push({
        id: `free-${cursor}-${DAY_END_MIN}`,
        isFree: true,
        status: "wolne",
        title: "WOLNE",
        startMin: cursor,
        endMin: DAY_END_MIN,
      });
    }

    return { wholeDay, blocks };
  }, [
    canUseCalendar,
    selectedIso,
    selectedReservations,
    DAY_START_MIN,
    DAY_END_MIN,
    getAccountName,
    isDayBlockingMode,
  ]);

  const visibleTimelineBlocks = useMemo(() => {
    if (!dayTimeline?.blocks?.length) return [];
    return dayTimeline.blocks.filter((b) => {
      if (!b.isFree) return true;
      const len = (b.endMin ?? 0) - (b.startMin ?? 0);
      return len >= MIN_VISIBLE_FREE_MIN;
    });
  }, [dayTimeline]);

  const CalendarPanel = () => {
    const meta = dayMap.get(selectedIso);

    return (
      <div className={styles.calendarWrap}>
        <div className={styles.calendarCard}>
          <div className={styles.calendarHeader}>
            <div>
              <div className={styles.calendarTitle}>Kalendarz rezerwacji</div>
              <div className={styles.calendarSub}>Kliknij dzień, aby podejrzeć rezerwacje z tego terminu.</div>
            </div>

            <div className={styles.calendarPills}>
              <span className={styles.calendarPill}>
                Dzień: <strong>{formatDatePL(selectedIso)}</strong>
              </span>
              <span className={styles.calendarPill}>
                Razem: <strong>{meta?.total ?? 0}</strong>
              </span>
              <span className={styles.calendarPill}>
                Otrzymane: <strong>{meta?.recvTotal ?? 0}</strong>
              </span>
              <span className={styles.calendarPill}>
                Wysłane: <strong>{meta?.sentTotal ?? 0}</strong>
              </span>
            </div>
          </div>

          <div className={styles.calendarGrid}>
            <div className={styles.calendarLeft}>
              <div className={styles.calSkin}>
                <Calendar
                  value={selectedDay}
                  onChange={(d) => setSelectedDay(d)}
                  locale="pl-PL"
                  tileContent={({ date, view }) => {
                    if (view !== "month") return null;
                    const iso = toISODate(date);
                    const v = dayMap.get(iso);
                    if (!v || v.total === 0) return null;

                    return (
                      <div className={styles.tileBadges} aria-hidden="true">
                        {v.pending > 0 && <span className={`${styles.dotMini} ${styles.dotPending}`} />}
                        {v.accepted > 0 && <span className={`${styles.dotMini} ${styles.dotAccepted}`} />}
                        {v.rejected > 0 && <span className={`${styles.dotMini} ${styles.dotRejected}`} />}
                        <span className={styles.tileCount}>{v.total}</span>
                      </div>
                    );
                  }}
                />
              </div>
            </div>

            <div className={styles.calendarRight}>
              <div className={styles.dayBox}>
                <div className={styles.dayBoxHead}>
                  <FiCalendar />
                  <span>
                    Rezerwacje z dnia <strong>{formatDatePL(selectedIso)}</strong>
                  </span>
                </div>

                {isSlotMode && (
                  <div className={styles.daySection}>
                    <div className={styles.daySectionTitle}>
                      Plan dnia <span className={styles.dayCount}>{visibleTimelineBlocks.length}</span>
                    </div>

                    {visibleTimelineBlocks.length === 0 ? (
                      <div className={styles.timelineEmpty}>Brak danych.</div>
                    ) : (
                      <div className={styles.timeline}>
                        {visibleTimelineBlocks.map((b) => (
                          <div key={b.id} className={styles.tlRow}>
                            <div className={styles.tlTime}>
                              <span className={styles.tlTimeTxt}>
                                {minToTime(b.startMin)}–{minToTime(b.endMin)}
                              </span>
                              <span className={`${styles.tlDot} ${dotToTlClass(b.isFree ? "wolne" : b.status)}`} />
                            </div>

                            <div className={`${styles.tlCard} ${b.isFree ? styles.tlCardFree : ""}`}>
                              <div className={styles.tlTop}>
                                {b.isFree ? (
                                  <span className={`${styles.tlKind} ${styles.tlKindRecv}`}>
                                    <FiGrid /> WOLNE
                                  </span>
                                ) : (
                                  <span
                                    className={`${styles.tlKind} ${
                                      b.kind === "recv" ? styles.tlKindRecv : styles.tlKindSent
                                    }`}
                                  >
                                    {b.kind === "recv" ? (
                                      <>
                                        <FiInbox /> Otrzymana
                                      </>
                                    ) : (
                                      <>
                                        <FiSend /> Wysłana
                                      </>
                                    )}
                                  </span>
                                )}

                                {!b.isFree && b.offline && <span className={styles.tlOffline}>OFFLINE</span>}

                                <span className={`${styles.tlStatus} ${statusToTlClass(b.isFree ? "wolne" : b.status)}`}>
                                  {b.isFree ? (
                                    "wolne"
                                  ) : (
                                    <>
                                      {statusIcon(b.status)} {b.status}
                                    </>
                                  )}
                                </span>
                              </div>

                              <div className={styles.tlTitle}>{b.title}</div>

                              {!b.isFree && (
                                <div className={styles.tlMeta}>
                                  {b.serviceName && (
                                    <span className={styles.tlChip}>
                                      <FiTag /> {b.serviceName}
                                    </span>
                                  )}
                                  {b.staffName && (
                                    <span className={styles.tlChip}>
                                      <FiUser /> {b.staffName}
                                    </span>
                                  )}
                                </div>
                              )}

                              {!b.isFree && b.desc && (
                                <div className={styles.tlDesc}>
                                  <FiFileText /> <span>{b.desc}</span>
                                </div>
                              )}

                              {b.isFree && (
                                <div className={styles.tlActions}>
                                  <button
                                    type="button"
                                    className={styles.tlAddBtn}
                                    onClick={() => openOfflineForSlot(selectedIso, b.startMin, b.endMin)}
                                  >
                                    <FiPlus /> Dodaj offline w tym slocie
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {isDayBlockingMode && (
                  <div className={styles.daySection}>
                    <div className={styles.daySectionTitle}>Blokowanie dnia</div>
                    <div className={styles.timelineEmpty}>
                      W tym trybie możesz dodać offline rezerwację na cały dzień dla wybranej daty.
                    </div>
                  </div>
                )}

                {hasProviderProfile && (
                  <div className={styles.daySection}>
                    <div className={styles.daySectionTitle}>
                      Otrzymane <span className={styles.dayCount}>{selectedReservations.recv.length}</span>
                    </div>

                    {selectedReservations.recv.length === 0 ? (
                      <div className={styles.dayEmpty}>Brak otrzymanych rezerwacji w tym dniu.</div>
                    ) : (
                      <ul className={styles.list}>{selectedReservations.recv.map((r) => renderItem(r, "received"))}</ul>
                    )}
                  </div>
                )}

                <div className={styles.daySection}>
                  <div className={styles.daySectionTitle}>
                    Wysłane <span className={styles.dayCount}>{selectedReservations.sent.length}</span>
                  </div>

                  {selectedReservations.sent.length === 0 ? (
                    <div className={styles.dayEmpty}>Brak wysłanych rezerwacji w tym dniu.</div>
                  ) : (
                    <ul className={styles.list}>{selectedReservations.sent.map((r) => renderItem(r, "sent"))}</ul>
                  )}
                </div>
              </div>

              {hasProviderProfile && (isSlotMode || isDayBlockingMode) && (
                <div className={styles.dayActions}>
                  <button className={styles.addOfflineBtn} type="button" onClick={() => openOfflineForDay(selectedIso)}>
                    <FiPlus />
                    {isDayBlockingMode ? " Zablokuj dzień offline" : " Dodaj offline"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {offlineModalEl}
      </div>
    );
  };

  // =========================
  //  LOADING
  // =========================
  if (loading) {
    return (
      <section className={styles.page}>
        <div className={styles.bgGlow} aria-hidden="true" />
        <div className={styles.shell}>
          <div className={styles.headerRow}>
            <div>
              <h2 className={styles.sectionTitle}>Twoje rezerwacje</h2>
              <p className={styles.subTitle}>Ładowanie danych… proszę chwilkę poczekać.</p>
            </div>
          </div>

          <ul className={styles.list}>
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className={`${styles.item} ${styles.skeletonItem}`}>
                <div className={styles.link}>
                  <div className={styles.row}>
                    <div className={styles.avatarWrap}>
                      <div className={`${styles.avatar} ${styles.avatarSkeleton} ${styles.shimmer}`} />
                    </div>

                    <div className={styles.head}>
                      <span className={`${styles.metaSkel} ${styles.shimmer}`} />
                      <span className={`${styles.dateSkel} ${styles.shimmer}`} />
                    </div>

                    <div className={styles.content}>
                      <span className={`${styles.blockSkel} ${styles.shimmer}`} />
                      <span className={`${styles.blockSkel} ${styles.shimmer}`} />
                    </div>

                    <div className={styles.bottomRow}>
                      <span className={`${styles.pillSkel} ${styles.shimmer}`} />
                      <span className={`${styles.pillSkel} ${styles.shimmer}`} />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  // =========================
  //  NIEZALOGOWANY
  // =========================
  if (!isLogged) {
    return (
      <section className={styles.page}>
        <div className={styles.bgGlow} aria-hidden="true" />
        <div className={styles.shell}>
          <div className={styles.headerRow}>
            <div>
              <h2 className={styles.sectionTitle}>Twoje rezerwacje</h2>
              <p className={styles.subTitle}>
                Musisz być <strong className={styles.subStrong}>zalogowany</strong>, żeby zobaczyć rezerwacje i kalendarz.
              </p>
            </div>
          </div>

          <p className={styles.emptyGroup}>Zaloguj się, aby korzystać z rezerwacji.</p>
        </div>
      </section>
    );
  }

  // =========================
  //  RENDER
  // =========================
  return (
    <section id="scrollToId" className={styles.page}>
      <div className={styles.bgGlow} aria-hidden="true" />

      {alert.show && (
        <div className={styles.alertWrap}>
          <AlertBox
            type={alert.type}
            message={alert.message}
            onClose={alert.onClose || (() => setAlert((a) => ({ ...a, show: false })))}
          />
        </div>
      )}

      <div className={styles.shell}>
        <div className={styles.headerRow}>
          <div>
            <h2 className={styles.sectionTitle}>Twoje rezerwacje</h2>
            <p className={styles.subTitle}>
              Tutaj znajdziesz <strong className={styles.subStrong}>wysłane</strong>
              {hasProviderProfile ? (
                <>
                  {" "}
                  i <strong className={styles.subStrong}>otrzymane</strong> rezerwacje — w jednolitym, czytelnym układzie.
                </>
              ) : (
                <>
                  . <strong className={styles.subStrong}>Otrzymane</strong> będą dostępne po utworzeniu profilu.
                </>
              )}
              {hasProviderProfile && !canUseCalendar ? (
                <>
                  {" "}
                  <span className={styles.hintPill}>Tryb profilu: {providerMeta?.bookingMode || "—"}</span>
                </>
              ) : null}
            </p>
          </div>

          {canUseCalendar && (
            <div className={styles.viewToggle}>
              <button
                className={`${styles.toggleBtn} ${viewMode === "list" ? styles.toggleActive : ""}`}
                onClick={() => setViewMode("list")}
                type="button"
              >
                <FiList /> Lista
              </button>
              <button
                className={`${styles.toggleBtn} ${viewMode === "calendar" ? styles.toggleActive : ""}`}
                onClick={() => setViewMode("calendar")}
                type="button"
              >
                <FiGrid /> Kalendarz
              </button>
            </div>
          )}
        </div>

        {canUseCalendar && viewMode === "calendar" ? (
          <CalendarPanel />
        ) : (
          <>
            {hasProviderProfile && (
              <div className={styles.sectionGroup}>
                <div className={styles.groupHeader}>
                  <h3 className={styles.groupTitle}>Otrzymane rezerwacje (do Twojego profilu)</h3>
                  <span className={styles.badge}>
                    {pendingReceived > 0 ? `${pendingReceived} oczek.` : `${serviceReservations.length}`}
                  </span>
                </div>

                {serviceReservations.length === 0 ? (
                  <p className={styles.emptyGroup}>Brak otrzymanych rezerwacji.</p>
                ) : (
                  <ul className={styles.list}>{serviceReservations.map((r) => renderItem(r, "received"))}</ul>
                )}
              </div>
            )}

            <div className={styles.sectionGroup}>
              <div className={styles.groupHeader}>
                <h3 className={styles.groupTitle}>Wysłane rezerwacje (Twoje konto → inne profile)</h3>
                <span className={styles.badge}>
                  {pendingSent > 0 ? `${pendingSent} oczek.` : `${clientReservations.length}`}
                </span>
              </div>

              {clientReservations.length === 0 ? (
                <p className={styles.emptyGroup}>Brak wysłanych rezerwacji.</p>
              ) : (
                <ul className={styles.list}>{clientReservations.map((r) => renderItem(r, "sent"))}</ul>
              )}
            </div>
          </>
        )}
      </div>

      {offlineModalEl}
    </section>
  );
};

export default ReservationList;