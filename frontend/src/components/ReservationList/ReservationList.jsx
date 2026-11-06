import WorkspaceEmptyState from "../ui/WorkspaceEmptyState/WorkspaceEmptyState";
import { dayBookingCopy, reservationDates, occursOn, reservationTimeLabel } from "../../utils/dayBooking";
import DataLoader from '../ui/DataLoader/DataLoader';
import PanelBackdrop from '../PanelBackdrop/PanelBackdrop';
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import styles from "./ReservationList.module.scss";
import AlertBox from "../AlertBox/AlertBox";
import { useLocation } from "react-router-dom";
import { FiInbox, FiSend } from "react-icons/fi";
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
  FiMessageSquare,
  FiTrash2,
  FiSearch,
} from "react-icons/fi";

import { isReservationUnread, reservationUpdateLabel } from './reservationUpdates';
import ReservationCalendar from "./ReservationCalendar";
import EditorGroup from "../YourProfile/sections/EditorGroup";
import ReservationActionDialog from "./ReservationActionDialog";

import { api } from "../../api/api";

// ✅ siatka slotów zawsze co 5 minut
const GRID_STEP_MIN = 5;

// ✅ stała przerwa "systemowa" po usłudze (bazowa)
const BASE_BREAK_MIN = 5;

// ✅ (legacy) nie pokazujemy wolnych slotów krótszych niż to
const MIN_VISIBLE_FREE_MIN = 30;

function Countdown({ until, onExpire }) {
  const [state, setState] = useState({
    label: "Sprawdzanie czasu…",
    detail: "",
    urgent: false,
    expired: false,
  });

  useEffect(() => {
    if (!until) {
      setState({
        label: "Brak terminu wygaśnięcia",
        detail: "",
        urgent: false,
        expired: false,
      });
      return undefined;
    }

    let fired = false;

    const formatTimeLeft = () => {
      const end = new Date(until).getTime();
      const now = Date.now();
      const diffMs = end - now;

      if (!Number.isFinite(end) || diffMs <= 0) {
        return {
          label: "Rezerwacja wygasła",
          detail: "Czas na potwierdzenie minął.",
          urgent: true,
          expired: true,
        };
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const totalMinutes = Math.floor(totalSeconds / 60);

      if (totalSeconds >= 3600) {
        const hoursLeft = Math.ceil(totalSeconds / 3600);

        return {
          label: `Wygasa za ${hoursLeft}h`,
          detail:
            hoursLeft <= 3
              ? "Zostało niewiele czasu na reakcję."
              : "Usługodawca ma jeszcze czas na potwierdzenie.",
          urgent: hoursLeft <= 3,
          expired: false,
        };
      }

      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      return {
        label: `Wygasa za ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
        detail:
          totalMinutes <= 10
            ? "Ostatnie minuty na potwierdzenie."
            : "Pozostało mniej niż godzina.",
        urgent: true,
        expired: false,
      };
    };

    const tick = () => {
      const nextState = formatTimeLeft();

      setState(nextState);

      if (nextState.expired && !fired) {
        fired = true;
        onExpire?.();
      }
    };

    tick();

    const id = setInterval(tick, 1000);

    return () => clearInterval(id);
  }, [until, onExpire]);

  return (
    <div
      className={`
        ${styles.countdown}
        ${state.urgent ? styles.countdownUrgent : ""}
        ${state.expired ? styles.countdownExpired : ""}
      `}
    >
      <div className={styles.countdownTop}>
        <FiClock className={styles.countdownIcon} aria-hidden="true" />
        <strong>{state.label}</strong>
      </div>

      {state.detail && <span>{state.detail}</span>}
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
const isWholeDay = (r) => r?.bookingKind ? r.bookingKind !== "hours" : r?.dateOnly || (r?.fromTime === "00:00" && r?.toTime === "23:59");

const getAvailabilityOverrides = (meta) => {
  return Array.isArray(meta?.availabilityOverrides)
    ? meta.availabilityOverrides
    : [];
};

const getDayOverride = (meta, dateStr) => {
  return getAvailabilityOverrides(meta).find(
    (item) => item?.type === "day" && item?.date === dateStr
  );
};

const getSlotOverride = (meta, dateStr, fromTime, toTime) => {
  const reqStart = timeToMin(fromTime);
  const reqEnd = timeToMin(toTime);

  return getAvailabilityOverrides(meta).find((item) => {
    if (!item || item.date !== dateStr) return false;

    if (item.type === "day") return true;

    if (item.type !== "slot") return false;
    if (!item.fromTime || !item.toTime) return false;

    const blockStart = timeToMin(item.fromTime);
    const blockEnd = timeToMin(item.toTime);

    return reqStart < blockEnd && reqEnd > blockStart;
  });
};

const isSlotBlockedByOverride = (meta, dateStr, fromTime, toTime) => {
  return !!getSlotOverride(meta, dateStr, fromTime, toTime);
};

const DAY_NAMES = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];

const getTodayIso = () => toISODate(new Date());

const getDateDayNumber = (dateStr = "") => {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.getDay(); // 0 niedziela, 1 poniedziałek...
};

const getWorkingDays = (meta) => {
  return Array.isArray(meta?.workingDays)
    ? meta.workingDays.map(Number)
    : [1, 2, 3, 4, 5];
};

const isPastDate = (dateStr = "") => {
  if (!dateStr) return false;
  return dateStr < getTodayIso();
};

const isWorkingDay = (meta, dateStr = "") => {
  if (meta?.bookingMode === "request-blocking" && meta?.dayBookingMode === "stay") return true;
  const dayNumber = getDateDayNumber(dateStr);
  if (dayNumber === null) return true;

  return getWorkingDays(meta).includes(dayNumber);
};

const getDayAvailabilityInfo = (meta, dateStr = "") => {
  if (!dateStr) return null;

  if (isPastDate(dateStr)) {
    return {
      type: "past",
      title: "Ten dzień już minął.",
      reason: "Nie można dodawać rezerwacji offline wstecz.",
    };
  }

  const override = getDayOverride(meta, dateStr);

  if (override) {
    return {
      type: "override",
      title: "Ten dzień jest oznaczony jako niedostępny.",
      reason: override.reason || "Blokada ustawiona w profilu.",
    };
  }

  if (!isWorkingDay(meta, dateStr)) {
    const dayNumber = getDateDayNumber(dateStr);

    return {
      type: "nonWorkingDay",
      title: "Ten dzień nie jest dniem pracy.",
      reason: dayNumber !== null
        ? `W grafiku pracy nie zaznaczono dnia: ${DAY_NAMES[dayNumber]}.`
        : "Ten dzień nie jest dostępny w grafiku pracy.",
    };
  }

  return null;
};

const reservationAvatarUrl = (value) => {
  const rawUrl = typeof value === 'string' ? value : value?.url;
  const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!url) return '';
  if (/^\/?uploads\//.test(url)) {
    const apiBase = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
    return apiBase + '/' + url.replace(/^\//, '');
  }
  return url;
};

function ReservationAvatar({ variant, isOffline, src }) {
  const [failedSource, setFailedSource] = useState('');
  const showImage = !isOffline && src && src !== failedSource;
  const className = [styles.avatar, variant === 'sent' ? styles.avatarSent : styles.avatarRecv, isOffline ? styles.avatarOffline : ''].filter(Boolean).join(' ');

  return (
    <div className={className} aria-hidden="true">
      {showImage ? (
        <img src={src} alt="" className={styles.accountAvatar} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedSource(src)} />
      ) : variant === 'sent' && !isOffline ? <FiSend /> : <FiUser />}
    </div>
  );
}

const ReservationList = ({ user }) => {
  const location = useLocation();
  const isLogged = !!user?.uid;

  const [clientReservations, setClientReservations] = useState([]);
  const [serviceReservations, setServiceReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState("list");
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  const [metaLoading, setMetaLoading] = useState(false);
  const [providerMeta, setProviderMeta] = useState(null);

  const [offlineOpen, setOfflineOpen] = useState(false);

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
  const [readingGroup, setReadingGroup] = useState(null);
  const bulkReadInFlight = useRef(false);
  const [accountMap, setAccountMap] = useState({});
  const [profileMap, setProfileMap] = useState({});
  const [actionDialog, setActionDialog] = useState(null);
  const actionResolver = useRef(null);
  const completeActionDialog = useCallback((value) => {
    const resolve = actionResolver.current;
    actionResolver.current = null;
    setActionDialog(null);
    resolve?.(value);
  }, []);
  const askReservationAction = (options) => new Promise((resolve) => {
    actionResolver.current?.(null);
    actionResolver.current = resolve;
    setActionDialog(options);
  });
  useEffect(() => () => { actionResolver.current?.(null); actionResolver.current = null; }, []);

  const safeParse = (str) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  const hasProviderProfile = !!providerMeta?.providerProfileId;

  const billingFeatures =
    providerMeta?.billingPublic?.features ||
    providerMeta?.billing?.features ||
    {};

  const hasBillingFeatures = Object.keys(billingFeatures).length > 0;

  const canUseBookingFeature = hasBillingFeatures
    ? !!billingFeatures.booking
    : true;

  const canUseRequestBlockingFeature = hasBillingFeatures
    ? !!billingFeatures.requestBlocking
    : true;

  const canUseTeamFeature = hasBillingFeatures
    ? !!billingFeatures.team
    : true;

  const rawBookingMode = String(providerMeta?.bookingMode || "request-open").toLowerCase();

  const bookingMode =
    rawBookingMode === "calendar" && canUseBookingFeature
      ? "calendar"
      : rawBookingMode === "request-blocking" && canUseRequestBlockingFeature
        ? "request-blocking"
        : rawBookingMode === "request-open"
          ? "request-open"
          : "request-open";

  const canUseCalendar =
    hasProviderProfile &&
    (bookingMode === "calendar" || bookingMode === "request-blocking");

  const isSlotMode = bookingMode === "calendar";
  const isDayBlockingMode = bookingMode === "request-blocking";

  const bookingBufferMin = useMemo(() => {
    const b = Number(providerMeta?.bookingBufferMin);
    return [0, 5, 10, 15].includes(b) ? b : 0;
  }, [providerMeta?.bookingBufferMin]);

  const effectiveBufferMin = useMemo(() => {
    return BASE_BREAK_MIN + bookingBufferMin;
  }, [bookingBufferMin]);

  useEffect(() => {
    if ((!hasProviderProfile || !canUseCalendar) && viewMode === "calendar") {
      setViewMode("list");
    }
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
    window.dispatchEvent(new Event("showly:reservations-changed"));
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
        setLoading(true);

        const [, resClient, resService] = await Promise.all([
          fetchProviderMeta(),
          api.get(`/api/reservations/by-user/${user.uid}`),
          api.get(`/api/reservations/by-provider/${user.uid}`),
        ]);

        const clientData = resClient.data || [];
        const serviceData = resService.data || [];

        setClientReservations(clientData);
        setServiceReservations(serviceData);


      } catch (e) {
        console.error("❌ Błąd pobierania:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [isLogged, user?.uid, fetchProviderMeta ]);

  useEffect(() => {
    if (!offlineOpen) return;

    const onKey = (e) => {
      if (e.key === "Escape") setOfflineOpen(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [offlineOpen]);

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

  const teamEnabled = canUseTeamFeature && providerMeta?.team?.enabled === true;
  const assignmentMode = providerMeta?.team?.assignmentMode;
  const isUserPickTeam = teamEnabled && assignmentMode === "user-pick";
  const isAutoAssignTeam = teamEnabled && assignmentMode === "auto-assign";

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

  const { startMin: DAY_START_MIN, endMin: DAY_END_MIN } = useMemo(
    () => getWorkHours(),
    [getWorkHours]
  );

  const OFFLINE_STEP_MIN = GRID_STEP_MIN;
  const OFFLINE_BUFFER_MIN = effectiveBufferMin;

  const offlineSlots = useMemo(() => {
    if (!offlineOpen) return [];
    if (isDayBlockingMode) return [];
    if (offlineForm.dateOnly) return [];
    if (!offlineForm.serviceId || !selectedDurationMin) return [];
    if (!isSlotMode) return [];
    if (isUserPickTeam && !offlineForm.staffId) return [];

    const { startMin: dayStart, endMin: dayEnd } = getWorkHours();
    const dateStr = offlineForm.date;
    const todayIso = toISODate(new Date());
    const nowMs = Date.now();
    const isToday = dateStr === todayIso;

    const active = (serviceReservations || [])
      .filter((r) => r.date === dateStr && r.bookingKind !== "order")
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

      const fromTime = minToTime(start);
      const toTime = minToTime(end);

      const blockedByOverride = isSlotBlockedByOverride(
        providerMeta,
        dateStr,
        fromTime,
        toTime
      );

      const startDT = new Date(`${dateStr}T${minToTime(start)}`);
      const endBufDT = new Date(`${dateStr}T${minToTime(endWithBuf)}`);

      const slotStartMs = +startDT;
      const slotEndMs = +endBufDT;

      // 1. slot nie mieści się w godzinach pracy + buforze
      if (endWithBuf > dayEnd) {
        status = "disabled";
      }

      // 2. slot jest już w przeszłości dla dzisiejszego dnia
      if (isToday && slotStartMs <= nowMs) {
        status = "disabled";
      }

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

            status = startsInsideAccepted
              ? "reserved"
              : startsInsidePending
                ? "pending"
                : "disabled";
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

          status = startsInsideAccepted
            ? "reserved"
            : startsInsidePending
              ? "pending"
              : "disabled";
        }
      }

      if (blockedByOverride) {
        status = "disabled";
      }

      slots.push({
        label: minToTime(start),
        status,
        blockedByOverride,
      });
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

  const validateOfflineWithBreak = useCallback(() => {
    if (offlineForm.dateOnly || isDayBlockingMode) return { ok: true, reason: null };

    const iso = offlineForm.date;
    const active = serviceReservations
      .filter((r) => occursOn(r, iso) && r.bookingKind !== "order")
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

  const openOfflineForDay = async (isoDate) => {
    if (!isLogged) return false;

    const dayInfo = getDayAvailabilityInfo(providerMeta, isoDate);

    if (dayInfo) {
      setAlert({
        show: true,
        type: "warning",
        message: dayInfo.reason
          ? `${dayInfo.title} ${dayInfo.reason}`
          : dayInfo.title,
        onClose: null,
      });

      return false;
    }

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
      endDate: "",
      fromTime: isDayBlockingMode ? providerMeta?.workingHours?.from || "08:00" : p.fromTime,
      toTime: isDayBlockingMode ? providerMeta?.workingHours?.to || "20:00" : p.toTime,
    }));
    setOfflineOpen(true);

    if (!providerMeta) await fetchProviderMeta();

    return true;
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
      setAlert({
        show: true,
        type: "warning",
        message: "Podaj nazwę klienta (offline).",
        onClose: null,
      });
      return;
    }

    if (!offlineForm.serviceId) {
      setAlert({
        show: true,
        type: "warning",
        message: "Najpierw wybierz usługę.",
        onClose: null,
      });
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
        setAlert({
          show: true,
          type: "warning",
          message: "Wybierz godzinę startu (slot).",
          onClose: null,
        });
        return;
      }
    }

    const todayIso = toISODate(new Date());
    if (!effectiveDateOnly && offlineForm.date === todayIso) {
      const startMs = new Date(`${offlineForm.date}T${offlineForm.fromTime}`).getTime();
      if (startMs <= Date.now()) {
        setAlert({
          show: true,
          type: "warning",
          message: "Nie możesz dodać rezerwacji offline w przeszłości.",
          onClose: null,
        });
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
        await api.post(`/api/reservations/offline/day`, { ...payloadBase, fromTime: offlineForm.fromTime, toTime: offlineForm.toTime, endDate: offlineForm.endDate });
      } else {
        const from = offlineForm.fromTime;
        const to = offlineForm.toTime;

        if (!from || !to) {
          setAlert({
            show: true,
            type: "warning",
            message: "Uzupełnij godziny od/do.",
            onClose: null,
          });
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

      setAlert({
        show: true,
        type: "success",
        message: "Dodano offline rezerwację.",
        onClose: null,
      });

      await refetch();
    } catch (e) {
      console.error("❌ submitOffline error:", e);

      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        "Nie udało się dodać offline rezerwacji.";

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
    return staff.filter((s) =>
      (s.serviceIds || []).some((id) => String(id) === String(offlineForm.serviceId))
    );
  }, [providerMeta, offlineForm.serviceId]);

  const providerUids = useMemo(() => {
    return Array.from(new Set(clientReservations.filter(reservation => !reservation.offline).map(reservation => reservation.providerUserId).filter(Boolean)));
  }, [clientReservations]);

  useEffect(() => {
    if (!isLogged || providerUids.length === 0) return;
    let active = true;

    const loadProfile = async uid => {
      try {
        const { data } = await api.get(`/api/profiles/by-user/${uid}`);
        return data?._id ? { id: data._id, avatar: reservationAvatarUrl(data.avatar) } : null;
      } catch {
        return null;
      }
    };

    (async () => {
      const entries = await Promise.all(providerUids.map(async uid => [uid, await loadProfile(uid)]));
      if (active) setProfileMap(Object.fromEntries(entries));
    })();

    return () => { active = false; };
  }, [isLogged, providerUids]);

  const senderUids = useMemo(() => {
    const arr = serviceReservations.filter((r) => !r.offline).map((r) => r.userId).filter(Boolean);
    return Array.from(new Set(arr));
  }, [serviceReservations]);

  const getAccountName = useCallback(
    (uid, fallbackName) => {
      if (!uid) return fallbackName?.trim() || "Użytkownik";
      const account = accountMap[uid];
      if (account === undefined) return "";
      const name = account?.name;
      if (typeof name === "string" && name.trim()) return name.trim();
      return fallbackName?.trim() || "Użytkownik";
    },
    [accountMap]
  );

  useEffect(() => {
    if (!isLogged) return;
    if (senderUids.length === 0) return;
    let active = true;

    setAccountMap((prev) => {
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

        return { name: dn, avatar: reservationAvatarUrl(data?.avatar) };
      } catch {
        return null;
      }
    };

    (async () => {
      const entries = await Promise.all(
        senderUids.map(async (uid) => [uid, await fetchOne(uid)])
      );

      if (!active) return;
      setAccountMap((prev) => {
        const next = { ...prev };
        entries.forEach(([uid, account]) => {
          next[uid] = account;
        });
        return next;
      });
    })();
    return () => { active = false; };
  }, [isLogged, senderUids]);

  const conflicts = useMemo(() => {
    if (!offlineOpen || isDayBlockingMode) return [];
    const iso = offlineForm.date;

    const sameDay = serviceReservations.filter((r) => occursOn(r, iso) && r.bookingKind !== "order");
    const active = sameDay.filter((r) => !["anulowana", "odrzucona"].includes(r.status));

    if (active.length === 0) return [];

    if (offlineForm.dateOnly || isDayBlockingMode) {
      return active.map((r) => ({
        id: r._id,
        label: `${isWholeDay(r) ? "CAŁY DZIEŃ" : `${r.fromTime}–${r.toTime}`} • ${r.offline ? r.offlineClientName || "OFFLINE" : r.userName || "Klient"
          } • ${r.status}`,
      }));
    }

    const hasWhole = active.some((r) => isWholeDay(r));
    if (hasWhole) {
      return active
        .filter((r) => isWholeDay(r))
        .map((r) => ({
          id: r._id,
          label: `CAŁY DZIEŃ • ${r.offline ? r.offlineClientName || "OFFLINE" : r.userName || "Klient"
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
        label: `${r.fromTime}–${r.toTime} (+${OFFLINE_BUFFER_MIN}m) • ${r.offline ? r.offlineClientName || "OFFLINE" : r.userName || "Klient"
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

  const pendingSent = clientReservations.filter((r) => r.status === "oczekująca").length;
  const pendingReceived = serviceReservations.filter((r) => r.status === "oczekująca").length;

  const renderNameNode = (rawName) =>
    rawName ? (
      <span className={styles.name}>{rawName}</span>
    ) : (
      <span className={`${styles.name} ${styles.nameSkeleton} ${styles.shimmer}`} />
    );

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

    const rawAccountName = res.offline ? res.offlineClientName || "Klient offline" : getAccountName(res.userId, res.userName);

    return (
      <>
        <FiInbox className={styles.icon} />
        <span className={styles.metaText}>
          Otrzymana rezerwacja do <b>Twojego profilu</b> od {renderNameNode(rawAccountName)}
        </span>
      </>
    );
  };

  const markSeen = async (reservation, who) => {
    try {
      await api.patch(`/api/reservations/${reservation._id}/seen`, { who, viewedUpdatedAt: reservation.updatedAt });
      const update = previous => previous.flatMap(item => item._id !== reservation._id ? [item] : ['anulowana', 'odrzucona'].includes(item.status) ? [] : [{ ...item, [who + 'Seen']: true }]);
      if (who === 'client') setClientReservations(update); else setServiceReservations(update);
      window.dispatchEvent(new Event('showly:reservations-changed'));
    } catch {
      setAlert({ show: true, type: 'warning', message: 'Nie udało się oznaczyć zmiany jako przeczytanej. Sprawdź aktualną rezerwację i spróbuj ponownie.' });
      await refetch().catch(() => {});
    }
  };

  const markAllSeen = async variant => {
    if (bulkReadInFlight.current) return;
    const who = variant === 'sent' ? 'client' : 'provider';
    const snapshot = (variant === 'sent' ? clientReservations : serviceReservations).filter(item => isReservationUnread(item, variant));
    if (!snapshot.length) return;
    bulkReadInFlight.current = true;
    setReadingGroup(variant);
    const acknowledged = new Map();
    try {
      // Use the existing owner-checked endpoint and the exact version shown in this category.
      for (let offset = 0; offset < snapshot.length; offset += 6) {
        const batch = snapshot.slice(offset, offset + 6);
        const results = await Promise.allSettled(batch.map(item => api.patch('/api/reservations/' + item._id + '/seen', { who, viewedUpdatedAt: item.updatedAt })));
        results.forEach((result, index) => { if (result.status === 'fulfilled') acknowledged.set(batch[index]._id, batch[index].updatedAt); });
      }
      const apply = previous => previous.flatMap(item => {
        if (!acknowledged.has(item._id) || acknowledged.get(item._id) !== item.updatedAt) return [item];
        return ['anulowana', 'odrzucona'].includes(item.status) ? [] : [{ ...item, [who + 'Seen']: true }];
      });
      if (who === 'client') setClientReservations(apply); else setServiceReservations(apply);
      if (acknowledged.size) window.dispatchEvent(new Event('showly:reservations-changed'));
      if (acknowledged.size !== snapshot.length) {
        setAlert({ show: true, type: 'warning', message: 'Część zmian pozostała nieprzeczytana. Mogła pojawić się nowsza aktualizacja. Spróbuj ponownie.' });
        await refetch().catch(() => {});
      }
    } finally { bulkReadInFlight.current = false; setReadingGroup(null); }
  };

  const renderReadAll = variant => {
    const count = (variant === 'sent' ? clientReservations : serviceReservations).filter(item => isReservationUnread(item, variant)).length;
    if (!count) return null;
    return <button type="button" className={styles.readAll} disabled={Boolean(readingGroup)} onClick={() => markAllSeen(variant)}>
      <FiCheckCircle aria-hidden="true" />{readingGroup === variant ? 'Odczytuję…' : 'Odczytaj wszystkie'}<span>{count}</span>
    </button>;
  };

  const renderClosedInfo = (reservation, variant) => {
    if (!isReservationUnread(reservation, variant)) return null;
    return <div className={styles.closedInfo}><span><strong>Nowa aktualizacja</strong><br />{reservationUpdateLabel(reservation, variant)}</span><button type="button" className={styles.seenBtn} onClick={() => markSeen(reservation, variant === 'sent' ? 'client' : 'provider')}>Oznacz jako przeczytane</button></div>;
  };

  const formatDatePL = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const timeLabel = (res) => {
    return reservationTimeLabel(res);
  };

  const getReservationLinkClass = (status) => {
    const normalizedStatus = String(status || "").toLowerCase();

    if (normalizedStatus === "zaakceptowana") {
      return styles.linkAccepted;
    }

    if (["odrzucona", "anulowana"].includes(normalizedStatus)) {
      return styles.linkRejected;
    }

    return styles.linkPending;
  };

  const statusIcon = (status) => {
    if (status === "zaakceptowana") {
      return <FiCheckCircle className={styles.chipIcon} aria-hidden="true" />;
    }
    if (status === "odrzucona" || status === "anulowana") {
      return <FiXCircle className={styles.chipIcon} aria-hidden="true" />;
    }
    return <FiAlertCircle className={styles.chipIcon} aria-hidden="true" />;
  };

  const renderInfo = (res) => (
    <div className={styles.info}>
      <span className={styles.chip}>
        <FiCalendar className={styles.chipIcon} aria-hidden="true" />
        {formatDatePL(res.date)}{res.bookingKind === "stay" && <> – {formatDatePL(res.endDate)} (wyjazd)</>}
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
        className={`${styles.chip} ${res.status === "zaakceptowana"
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

  const renderClientNote = (res, who = "client") => {
    const message = String(res[who + "Note"]?.message || "").trim();

    if (!message) return null;

    return (
      <div className={`${styles.note} ${styles.clientNote}`}>
        <div className={styles.noteHeader}>
          <FiFileText className={styles.noteIcon} aria-hidden="true" />
          <span>{who === "client" ? "Informacja od klienta" : "Informacja od usługodawcy"}</span>
        </div>

        <div className={styles.noteBody}>
          <span className={styles.noteDate}>
            {res[who + "Note"]?.createdAt
              ? new Date(res[who + "Note"].createdAt).toLocaleString("pl-PL")
              : "Wiadomość"}
          </span>
          <p className={styles.noteMessage}>{message}</p>
        </div>
      </div>
    );
  };

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

  const handleCancelOfflineByProvider = async (reservation) => {
    if (!reservation?.offline) {
      setAlert({
        show: true,
        type: "warning",
        message: "Na ten moment możesz usuwać tylko rezerwacje offline.",
        onClose: null,
      });
      return;
    }

    const reason = await askReservationAction({
      title: "Usunąć rezerwację offline?",
      description: "Rezerwacja zostanie usunięta z kalendarza, a jej termin ponownie będzie dostępny. Możesz dodać powód usunięcia.",
      label: "Powód usunięcia (opcjonalnie)",
      confirmText: "Usuń rezerwację", danger: true,
    });
    if (reason === null) return;

    try {
      setDisabledIds((prev) => new Set(prev).add(`offline-cancel-${reservation._id}`));

      await api.patch(`/api/reservations/${reservation._id}/cancel-offline-by-provider`, {
        reason: String(reason || "").trim(),
      });

      setAlert({
        show: true,
        type: "success",
        message: "Rezerwacja offline została usunięta z kalendarza.",
        onClose: null,
      });

      await refetch();
    } catch (err) {
      console.error("❌ Błąd usuwania rezerwacji offline:", err);

      setAlert({
        show: true,
        type: "error",
        message:
          err?.response?.data?.message ||
          "Nie udało się usunąć rezerwacji offline.",
        onClose: null,
      });
    } finally {
      setDisabledIds((prev) => {
        const next = new Set(prev);
        next.delete(`offline-cancel-${reservation._id}`);
        return next;
      });
    }
  };

  const handleStatusChange = async (reservationId, newStatus) => {
    try {
      setDisabledIds((prev) => new Set(prev).add(reservationId));

      await api.patch(`/api/reservations/${reservationId}/status`, {
        status: newStatus,
      });

      if (newStatus === "anulowana") {
        return withToastAndRefresh(
          "warning",
          "Rezerwacja anulowana – slot zwolniony.",
          reservationId
        );
      }

      if (newStatus === "odrzucona") {
        return withToastAndRefresh(
          "warning",
          "Rezerwacja odrzucona – slot zwolniony.",
          reservationId
        );
      }

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
      setAlert({
        show: true,
        type: "error",
        message: "Nie udało się zmienić statusu.",
        onClose: null,
      });

      setDisabledIds((prev) => {
        const n = new Set(prev);
        n.delete(reservationId);
        return n;
      });
    }
  };

  const handleClientNote = async (reservation, who = "client") => {
    if (reservation[who + "Note"]?.message) {
      setAlert({
        show: true,
        type: "info",
        message: "Do tej rezerwacji dodano już wiadomość. Możesz dodać tylko jedną informację.",
        onClose: null,
      });
      return;
    }

    const text = await askReservationAction({
      title: "Dodaj informację do rezerwacji",
      description: "Przekaż drugiej stronie ważną wiadomość, np. o spóźnieniu. Możesz dodać jedną informację — po wysłaniu nie będzie można jej edytować.",
      label: "Twoja wiadomość", confirmText: "Dodaj informację", required: true, minLength: 5,
    });

    const message = String(text || "").trim();

    if (!message) return;

    if (message.length < 5) {
      setAlert({
        show: true,
        type: "warning",
        message: "Wiadomość musi mieć minimum 5 znaków.",
        onClose: null,
      });
      return;
    }

    if (message.length > 500) {
      setAlert({
        show: true,
        type: "warning",
        message: "Wiadomość może mieć maksymalnie 500 znaków.",
        onClose: null,
      });
      return;
    }

    try {
      setDisabledIds((prev) => new Set(prev).add(`note-${reservation._id}`));

      await api.patch(`/api/reservations/${reservation._id}/${who}-note`, {
        message,
      });

      setAlert({
        show: true,
        type: "success",
        message: "Dodano informację do rezerwacji.",
        onClose: null,
      });

      await refetch();
    } catch (err) {
      console.error("❌ Błąd dodawania informacji do rezerwacji:", err);

      setAlert({
        show: true,
        type: "error",
        message:
          err?.response?.data?.message ||
          "Nie udało się dodać informacji do rezerwacji.",
        onClose: null,
      });
    } finally {
      setDisabledIds((prev) => {
        const next = new Set(prev);
        next.delete(`note-${reservation._id}`);
        return next;
      });
    }
  };

  const handleClientCancelWithReason = async (reservation, who = "client") => {
    const text = await askReservationAction({
      title: "Anulować rezerwację?",
      description: "Podaj powód anulowania. Druga strona otrzyma tę informację, a termin zostanie zwolniony.",
      label: "Powód anulowania", confirmText: "Anuluj rezerwację", required: true, danger: true,
    });

    const reason = String(text || "").trim();

    if (!reason) return;

    if (reason.length > 500) {
      setAlert({
        show: true,
        type: "warning",
        message: "Powód anulowania może mieć maksymalnie 500 znaków.",
        onClose: null,
      });
      return;
    }

    try {
      setDisabledIds((prev) => new Set(prev).add(`cancel-${reservation._id}`));

      await api.patch(`/api/reservations/${reservation._id}/cancel-by-${who}`, {
        reason,
      });

      setAlert({
        show: true,
        type: "success",
        message: "Rezerwacja została anulowana.",
        onClose: null,
      });

      await refetch();
    } catch (err) {
      console.error("❌ Błąd anulowania rezerwacji:", err);

      setAlert({
        show: true,
        type: "error",
        message:
          err?.response?.data?.message ||
          "Nie udało się anulować rezerwacji.",
        onClose: null,
      });
    } finally {
      setDisabledIds((prev) => {
        const next = new Set(prev);
        next.delete(`cancel-${reservation._id}`);
        return next;
      });
    }
  };

  const renderCancellationReason = (res) => {
    if (!res.cancellationReason) return null;

    return (
      <div className={styles.closedInfo}>
        <span>
          Powód anulowania: <strong>{res.cancellationReason}</strong>
        </span>
      </div>
    );
  };

  const renderItem = (res, variant) => {
    const isPending = res.status === "oczekująca";
    const isUnread = isReservationUnread(res, variant);
    const created = res.createdAt || res.updatedAt || Date.now();
    const isOffline = !!res.offline;
    const providerProfile = profileMap[res.providerUserId];
    const profileAvatar = providerProfile && (!res.providerProfileId || String(res.providerProfileId) === String(providerProfile.id)) ? providerProfile.avatar : '';
    const isClosed = ["anulowana", "odrzucona"].includes(res.status);

    const canClientManage = variant === "sent" && !isClosed;
    const canProviderRespond = variant === "received" && isPending;
    const canProviderManage = variant === "received" && !isOffline && !isClosed;
    const canRemoveOffline = variant === "received" && isOffline && !isClosed;
    const showBottomRow = canClientManage || canProviderRespond || canRemoveOffline || canProviderManage;

    return (
      <li key={res._id} className={`${styles.item} ${isUnread ? styles.unread : styles.read}`}>
        <div className={`${styles.link} ${getReservationLinkClass(res.status)}`}>
          <div className={styles.row}>
            <div className={styles.avatarWrap}>
              <ReservationAvatar variant={variant} isOffline={isOffline} src={variant === "sent" ? profileAvatar : accountMap[res.userId]?.avatar} />
              {isUnread && <span className={styles.badgeDot} aria-hidden="true" />}
            </div>

            <div className={styles.head}>
              <div className={styles.meta}>{renderHeader(res, variant)}</div>
              <div className={styles.date}>{new Date(created).toLocaleString("pl-PL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
            </div>

            <div className={styles.content}>
              {renderInfo(res)}
              {isPending && !isOffline && <div className={styles.nextStep}><FiClock aria-hidden="true" /><p>{variant === "received" ? "Czeka na Twoją decyzję. Sprawdź termin i potwierdź lub odrzuć rezerwację poniżej." : "Czekasz na potwierdzenie usługodawcy. O zmianie statusu poinformujemy Cię w Showly."}</p></div>}
              {renderDescription(res, variant)}
              {renderClientNote(res)}
              {renderClientNote(res, "provider")}
              {res.status === "oczekująca" && res.pendingExpiresAt && (
                <Countdown until={res.pendingExpiresAt} onExpire={() => refetch()} />
              )}
              {renderClosedInfo(res, variant)}
              {renderCancellationReason(res)}
            </div>

            {showBottomRow && (
              <div className={styles.bottomRow}>
                {canClientManage && (
                  <>
                    <button
                      onClick={() => handleClientCancelWithReason(res)}
                      className={`${styles.actionBtn} ${styles.cancelBtn}`}
                      disabled={disabledIds.has(`cancel-${res._id}`)}
                    >
                      <FiXCircle aria-hidden="true" /> Anuluj z powodem
                    </button>

                    {!res.clientNote?.message && (
                      <button
                        onClick={() => handleClientNote(res)}
                        className={styles.actionBtn}
                        disabled={disabledIds.has(`note-${res._id}`)}
                      >
                        <FiMessageSquare aria-hidden="true" /> Dodaj informację
                      </button>
                    )}
                  </>
                )}

                {canProviderRespond && (
                  <>
                    <button
                      onClick={() => handleStatusChange(res._id, "zaakceptowana")}
                      className={`${styles.actionBtn} ${styles.acceptBtn}`}
                      disabled={disabledIds.has(res._id)}
                    >
                      <FiCheckCircle aria-hidden="true" /> Potwierdź
                    </button>

                    <button
                      onClick={() => handleStatusChange(res._id, "odrzucona")}
                      className={`${styles.actionBtn} ${styles.rejectBtn}`}
                      disabled={disabledIds.has(res._id)}
                    >
                      <FiXCircle aria-hidden="true" /> Odrzuć
                    </button>
                  </>
                )}

                {canProviderManage && <>
                  {!res.providerNote?.message && <button type="button" className={styles.actionBtn} disabled={disabledIds.has(`note-${res._id}`)} onClick={() => handleClientNote(res, 'provider')}><FiMessageSquare aria-hidden="true" />Dodaj informację dla klienta</button>}
                  {res.status === 'zaakceptowana' && <button type="button" className={`${styles.actionBtn} ${styles.cancelBtn}`} disabled={disabledIds.has(`cancel-${res._id}`)} onClick={() => handleClientCancelWithReason(res, 'provider')}><FiXCircle aria-hidden="true" />Anuluj z powodem</button>}
                </>}
                {canRemoveOffline && (
                  <button
                    onClick={() => handleCancelOfflineByProvider(res)}
                    className={`${styles.actionBtn} ${styles.cancelBtn}`}
                    disabled={disabledIds.has(`offline-cancel-${res._id}`)}
                  >
                    <FiTrash2 aria-hidden="true" /> Usuń offline
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </li>
    );
  };

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

    clientReservations.forEach((r) => reservationDates(r).forEach(date => push(date, "sent", r.status)));
    if (hasProviderProfile) {
      serviceReservations.forEach((r) => reservationDates(r).forEach(date => push(date, "recv", r.status)));
    }

    if (hasProviderProfile) {
      getAvailabilityOverrides(providerMeta)
        .filter((item) => item?.type === "day" && item?.date)
        .forEach((item) => {
          const cur =
            map.get(item.date) || {
              sentTotal: 0,
              recvTotal: 0,
              pending: 0,
              accepted: 0,
              rejected: 0,
              unavailable: 0,
              unavailableReason: "",
            };

          cur.unavailable = (cur.unavailable || 0) + 1;
          cur.unavailableReason = item.reason || "Dzień niedostępny";

          map.set(item.date, cur);
        });
    }

    return map;
  }, [clientReservations, serviceReservations, hasProviderProfile, providerMeta]);

  const selectedIso = useMemo(() => toISODate(selectedDay), [selectedDay]);

  const selectedDayAvailabilityInfo = useMemo(() => {
    return getDayAvailabilityInfo(providerMeta, selectedIso);
  }, [providerMeta, selectedIso]);

  const selectedReservations = useMemo(() => {
    const sent = clientReservations.filter((r) => occursOn(r, selectedIso));
    const recv = hasProviderProfile
      ? serviceReservations.filter((r) => occursOn(r, selectedIso))
      : [];

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

  const openOfflineForSlot = async (isoDate, startMin, endMin) => {
    const opened = await openOfflineForDay(isoDate);

    if (!opened) return;

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
            ? `${isOffline
              ? r.offlineClientName || "OFFLINE"
              : getAccountName(r.userId, r.userName) || "Klient"
            }`
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

  useEffect(() => {
    if (!isLogged) return undefined;
    const refresh = () => { if (document.visibilityState !== 'hidden') refetch().catch(() => {}); };
    const interval = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('showly:push-received', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(interval); window.removeEventListener('focus', refresh); window.removeEventListener('showly:push-received', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [isLogged, refetch]);

  const SkeletonItem = () => (
    <li className={`${styles.item} ${styles.skeletonItem}`}>
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
  );

  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const matchesFilter = (reservation, variant, filter = statusFilter) => {
    if (filter === 'unread') return isReservationUnread(reservation, variant);
    if (filter === 'pending') return reservation.status === 'oczekująca';
    if (filter === 'accepted') return reservation.status === 'zaakceptowana';
    if (filter === 'closed') return ['anulowana', 'odrzucona'].includes(reservation.status);
    return true;
  };
  const filters = [['all', 'Wszystkie', FiCalendar], ['unread', 'Nowe zmiany', FiAlertCircle], ['pending', 'Oczekujące', FiClock], ['accepted', 'Potwierdzone', FiCheckCircle], ['closed', 'Zamknięte', FiXCircle]];
  const filterCount = filter => clientReservations.filter(reservation => matchesFilter(reservation, 'sent', filter)).length + serviceReservations.filter(reservation => matchesFilter(reservation, 'received', filter)).length;
  const matchesSearch = reservation => [reservation.userName, accountMap[reservation.userId]?.name, reservation.providerProfileName, reservation.providerName, reservation.serviceName, reservation.staffName, reservation.date, formatDatePL(reservation.date), reservation.fromTime, reservation.description].filter(Boolean).join(' ').toLocaleLowerCase('pl').includes(search.trim().toLocaleLowerCase('pl'));
  const visibleSent = clientReservations.filter(reservation => matchesFilter(reservation, 'sent') && matchesSearch(reservation));
  const visibleReceived = serviceReservations.filter(reservation => matchesFilter(reservation, 'received') && matchesSearch(reservation));
  const totalReservations = clientReservations.length + serviceReservations.length;
  const totalPending = pendingSent + (hasProviderProfile ? pendingReceived : 0);

  const bookingModeLabel =
    bookingMode === "calendar"
      ? "Kalendarz"
      : bookingMode === "request-blocking"
        ? dayBookingCopy(providerMeta).title
        : "Zapytania";

  const receivedBadge = hasProviderProfile
    ? pendingReceived > 0
      ? `${pendingReceived} oczek.`
      : `${serviceReservations.length}`
    : "—";

  const sentBadge =
    pendingSent > 0 ? `${pendingSent} oczek.` : `${clientReservations.length}`;

  const renderReservationGroup = ({
    variant,
    label,
    title,
    badge,
    count = 0,
    icon,
    emptyTitle,
    emptyText,
    children,
  }) => (
    <EditorGroup title={title} className={styles.reservationGroup}>
      <div className={styles.groupHeader}>
        <span className={styles.groupIcon} aria-hidden="true">{icon}</span>
        <div className={styles.groupHeading}>
          <span className={styles.groupLabel}>{label}</span>
          <p>Liczba rezerwacji: {count}</p>
        </div>

        <div className={styles.groupActions}>
          {variant && renderReadAll(variant)}
          <span className={styles.groupBadge}>{badge}</span>
        </div>
      </div>

      {children || <WorkspaceEmptyState icon={icon} title={emptyTitle} text={emptyText}
        action={!isLogged ? { label: 'Zaloguj się', to: '/login' } : !variant && !hasProviderProfile ? { label: 'Utwórz wizytówkę', to: '/stworz-profil' } : (statusFilter !== 'all' || search.trim()) ? { label: 'Pokaż wszystkie rezerwacje', onClick: () => { setStatusFilter('all'); setSearch(''); } } : undefined}
      />}
    </EditorGroup>
  );

  return (
    <section id="scrollToId" className={styles.page}>
      <PanelBackdrop word="REZERWACJE" />
      <div className={styles.bgGlow} aria-hidden="true" />

      {alert.show && (
        <div className={styles.alertWrap}>
          <AlertBox
            type={alert.type}
            message={alert.message}
            onClose={
              alert.onClose ||
              (() => setAlert((current) => ({ ...current, show: false })))
            }
          />
        </div>
      )}

      <div className={styles.shell}>
        <div className={styles.layout}>
          <header className={styles.panelHeader}>
            <div className={styles.titleBlock}>
              <h1 className={styles.heading}>Twoje wizyty.<span className={styles.headingHighlight}>Wszystko na miejscu.</span></h1>
            <p className={styles.description}>
              {!isLogged ? (
                <>
                  Musisz być <strong>zalogowany</strong>, żeby zobaczyć
                  rezerwacje, kalendarz i obsługę terminów offline.
                </>
              ) : loading ? (
                <>Ładujemy Twoje rezerwacje i sprawdzamy aktualne terminy.</>
              ) : hasProviderProfile ? (
                <>
                  Tutaj znajdziesz rezerwacje <strong>wysłane</strong>,
                  <strong> otrzymane</strong> oraz podgląd terminów w
                  kalendarzu Twojego profilu.
                </>
              ) : (
                <>
                  Tutaj znajdziesz rezerwacje <strong>wysłane</strong>. Sekcja
                  otrzymanych rezerwacji i kalendarz pojawią się po utworzeniu
                  profilu usługodawcy.
                </>
              )}
            </p>
              {hasProviderProfile && <p>Profil: <strong>{providerMeta?.providerProfileName || 'Twoja wizytówka'}</strong> · {bookingModeLabel}</p>}
            </div>
            <FiCalendar className={styles.headerIcon} aria-hidden="true" />
          </header>
          <EditorGroup title="Twoje rezerwacje w liczbach" className={styles.summaryGroup}>
            <div className={styles.metaRow} aria-live="polite">
              <div className={styles.metaCard}><span>Oczekujące</span><strong>{loading ? '-' : totalPending}</strong></div>
              <div className={styles.metaCard}><span>Wszystkie rezerwacje</span><strong>{loading ? '-' : totalReservations}</strong></div>
            </div>
          </EditorGroup>
          <div className={styles.toolbar}>
            {isLogged && !loading && (viewMode === "list" || !canUseCalendar) && <nav className={styles.filters} aria-label="Filtruj rezerwacje">{filters.map(([key, label, Icon]) => <button key={key} type="button" aria-pressed={statusFilter === key} onClick={() => setStatusFilter(key)}><Icon aria-hidden="true" />{label}<span>{filterCount(key)}</span></button>)}</nav>}
            <div className={styles.filterRow}>
              {isLogged && !loading && (viewMode === 'list' || !canUseCalendar) && <label className={styles.searchField}><FiSearch aria-hidden="true" /><span className={styles.srOnly}>Szukaj rezerwacji</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Szukaj osoby, usługi lub terminu" /></label>}
            {canUseCalendar && (
              <div className={styles.viewToggle}>
                <button
                  className={`${styles.toggleBtn} ${viewMode === "list" ? styles.toggleActive : ""
                    }`}
                  onClick={() => setViewMode("list")}
                  type="button"
                  aria-pressed={viewMode === "list"}
                >
                  <FiList /> Lista
                </button>

                <button
                  className={`${styles.toggleBtn} ${viewMode === "calendar" ? styles.toggleActive : ""
                    }`}
                  onClick={() => setViewMode("calendar")}
                  type="button"
                  aria-pressed={viewMode === "calendar"}
                >
                  <FiGrid /> Kalendarz
                </button>
              </div>
            )}
            </div>
            {isLogged && !loading && (viewMode === 'list' || !canUseCalendar) && <p className={styles.resultHint} role="status">{statusFilter === 'all' && !search.trim() ? 'Sprawdź szczegóły na karcie. Nowe zmiany możesz oznaczyć jako przeczytane.' : 'Widoczne rezerwacje: ' + (visibleSent.length + visibleReceived.length) + '. Zmień filtry, aby zobaczyć pozostałe terminy.'}</p>}
          </div>

          <div className={styles.contentPanel}>
            {!isLogged ? (
              <div className={styles.reservationsStack}>
                {renderReservationGroup({
                  label: "Brak dostępu",
                  title: "Rezerwacje są dostępne po zalogowaniu.",
                  badge: "—",
                  icon: <FiCalendar className={styles.emptyIcon} />,
                  emptyTitle: "Brak dostępu do rezerwacji",
                  emptyText:
                    "Zaloguj się, aby korzystać z listy rezerwacji, kalendarza i dodawania blokad offline.",
                })}
              </div>
            ) : loading ? (
              <div className={styles.reservationsStack}>
                <EditorGroup title="Ładowanie rezerwacji" className={styles.reservationGroup}>
                  <DataLoader label="Ładujemy Twoje rezerwacje…" layout="none" />

                  <ul className={styles.list}>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <SkeletonItem key={index} />
                    ))}
                  </ul>
                </EditorGroup>
              </div>
            ) : canUseCalendar && viewMode === "calendar" ? (
              <div className={styles.calendarPanelWrap}>
                <ReservationCalendar
                  readAllReceived={renderReadAll("received")}
                  readAllSent={renderReadAll("sent")}
                  selectedDay={selectedDay}
                  onSelectedDayChange={setSelectedDay}
                  selectedIso={selectedIso}
                  formatDatePL={formatDatePL}
                  dayMap={dayMap}
                  getDayAvailabilityInfo={getDayAvailabilityInfo}
                  providerMeta={providerMeta}
                  selectedDayAvailabilityInfo={selectedDayAvailabilityInfo}
                  visibleTimelineBlocks={visibleTimelineBlocks}
                  selectedReservations={selectedReservations}
                  hasProviderProfile={hasProviderProfile}
                  isSlotMode={isSlotMode}
                  isDayBlockingMode={isDayBlockingMode}
                  renderReservationItem={renderItem}
                  statusIcon={statusIcon}
                  onOpenOfflineForSlot={openOfflineForSlot}
                  onOpenOfflineForDay={openOfflineForDay}
                  offlineOpen={offlineOpen}
                  setOfflineOpen={setOfflineOpen}
                  metaLoading={metaLoading}
                  offlineForm={offlineForm}
                  setOfflineForm={setOfflineForm}
                  conflicts={conflicts}
                  durationLabel={durationLabel}
                  filteredStaff={filteredStaff}
                  disabledIds={disabledIds}
                  submitOffline={submitOffline}
                  getServiceDurationMinutes={getServiceDurationMinutes}
                  teamEnabled={teamEnabled}
                  isUserPickTeam={isUserPickTeam}
                  isAutoAssignTeam={isAutoAssignTeam}
                  offlineSlots={offlineSlots}
                  offlineBufferMin={OFFLINE_BUFFER_MIN}
                  baseBreakMin={BASE_BREAK_MIN}
                  bookingBufferMin={bookingBufferMin}
                />
              </div>
            ) : (
              <div className={styles.reservationsStack} data-single={statusFilter !== "all" || Boolean(search.trim()) || !hasProviderProfile}>
                {hasProviderProfile &&
                  renderReservationGroup({
                    variant: "received",
                    label: "Do Twojego profilu",
                    title: "Otrzymane rezerwacje",
                    badge: receivedBadge,
                    count: visibleReceived.length,
                    icon: <FiInbox className={styles.emptyIcon} />,
                    emptyTitle: statusFilter === "all" && !search.trim() ? "Brak otrzymanych rezerwacji" : "Brak rezerwacji w tym filtrze",
                    emptyText:
                      statusFilter === "all" && !search.trim() ? "Gdy ktoś zarezerwuje termin w Twoim profilu, pojawi się on właśnie tutaj." : "Wybierz inny filtr lub wróć do wszystkich rezerwacji.",
                    children:
                      visibleReceived.length > 0 ? (
                        <ul className={styles.list}>
                          {visibleReceived.map((reservation) =>
                            renderItem(reservation, "received")
                          )}
                        </ul>
                      ) : null,
                  })}

                {renderReservationGroup({
                  variant: "sent",
                  label: "Twoje konto → profile",
                  title: "Wysłane rezerwacje",
                  badge: sentBadge,
                  count: visibleSent.length,
                  icon: <FiSend className={styles.emptyIcon} />,
                  emptyTitle: statusFilter === "all" && !search.trim() ? "Brak wysłanych rezerwacji" : "Brak rezerwacji w tym filtrze",
                  emptyText:
                    statusFilter === "all" && !search.trim() ? "Gdy zarezerwujesz termin u innego usługodawcy, rezerwacja pojawi się w tej sekcji." : "Wybierz inny filtr lub wróć do wszystkich rezerwacji.",
                  children:
                    visibleSent.length > 0 ? (
                      <ul className={styles.list}>
                        {visibleSent.map((reservation) =>
                          renderItem(reservation, "sent")
                        )}
                      </ul>
                    ) : null,
                })}

                {!hasProviderProfile &&
                  renderReservationGroup({
                    label: "Profil usługodawcy",
                    title: "Rezerwacje do Twojego profilu",
                    badge: "—",
                    icon: <FiCalendar className={styles.emptyIcon} />,
                    emptyTitle: "Nie masz jeszcze profilu usługodawcy",
                    emptyText:
                      "Po utworzeniu profilu pojawią się tutaj otrzymane rezerwacje oraz kalendarz terminów.",
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {actionDialog && <ReservationActionDialog {...actionDialog} onComplete={completeActionDialog} />}
    </section>
  );
};

export default ReservationList;
