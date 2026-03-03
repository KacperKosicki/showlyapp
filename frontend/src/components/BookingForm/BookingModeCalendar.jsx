// BookingModeCalendar.jsx
import { useEffect, useMemo, useState, useCallback } from 'react';
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
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import styles from './BookingForm.module.scss';
import LoadingButton from '../ui/LoadingButton/LoadingButton';
import { api } from '../../api/api';

// ✅ stała przerwa po usłudze (jak na backendzie)
const SLOT_BREAK_MIN = 5;

// ✅ siatka startów ZAWSZE co 5 minut (niezależnie od bufora)
const GRID_STEP_MIN = 5;

const durationToMinutes = (svc) => {
  const { value, unit } = svc?.duration || {};
  if (!value || !unit) return 0;
  if (unit === 'minutes') return value;
  if (unit === 'hours') return value * 60;
  if (unit === 'days') return value * 60 * 24;
  return value;
};

// zaokrąglenie "w górę" do kroku (np. 10:02 -> 10:05)
const ceilToStep = (dt, stepMin) => {
  const d = startOfMinute(dt);
  const rem = d.getMinutes() % stepMin;
  return rem ? addMinutes(d, stepMin - rem) : d;
};

export default function BookingModeCalendar({ user, provider, pushAlert }) {
  const [reservedSlots, setReserved] = useState([]); // { date, fromTime, toTime }
  const [pendingSlots, setPending] = useState([]); // { date, fromTime, toTime }
  const [reservationsAll, setReservationsAll] = useState([]); // RAW rezerwacje całego zespołu
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setDate] = useState(null);
  const [selectedService, setService] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedSlot, setSlot] = useState(''); // "HH:mm"
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✨ Zespół
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');

  const navigate = useNavigate();

  const daysInMonth = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
      }),
    [currentMonth]
  );

  const startDayIndex = useMemo(() => getDay(startOfMonth(currentMonth)), [currentMonth]);
  const isDayActive = (day) =>
    Array.isArray(provider?.workingDays) && provider.workingDays.includes(getDay(day));

  const isTeamEnabled = provider?.bookingMode === 'calendar' && provider?.team?.enabled === true;
  const isUserPick = isTeamEnabled && provider?.team?.assignmentMode === 'user-pick';
  const isAutoAssign = isTeamEnabled && provider?.team?.assignmentMode === 'auto-assign';

  // ✅ BUFFER z profilu (0/5/10/15), fallback 0
  const bookingBufferMin = useMemo(() => {
    const b = Number(provider?.bookingBufferMin);
    return [0, 5, 10, 15].includes(b) ? b : 0;
  }, [provider?.bookingBufferMin]);

  // ✅ EFFECTIVE = 5 + bookingBufferMin (czyli 5/10/15/20)
  const effectiveBufferMin = useMemo(() => {
    return SLOT_BREAK_MIN + bookingBufferMin;
  }, [bookingBufferMin]);

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
      .filter((r) => r.status === 'zaakceptowana')
      .map((r) => ({ date: r.date, fromTime: r.fromTime, toTime: r.toTime }));

    const pending = filtered
      .filter((r) => r.status === 'oczekująca' || r.status === 'tymczasowa')
      .map((r) => ({ date: r.date, fromTime: r.fromTime, toTime: r.toTime }));

    setReserved(booked);
    setPending(pending);
  }, [provider?.userId, isUserPick, selectedStaffId]);

  // ✅ Ładuj rezerwacje po wejściu (i przy zmianie provider)
  useEffect(() => {
    fetchReservations().catch(() => {});
  }, [fetchReservations]);

  // ✅ Przeładuj przy zmianie pracownika w trybie user-pick
  useEffect(() => {
    if (!isUserPick) return;
    fetchReservations().catch(() => {});
  }, [isUserPick, selectedStaffId, fetchReservations]);

  // Generowanie slotów (capacity-aware dla auto-assign)
  useEffect(() => {
    if (!selectedDate || !selectedService) {
      setTimeSlots([]);
      return;
    }

    const whFrom = provider?.workingHours?.from || '08:00';
    const whTo = provider?.workingHours?.to || '20:00';

    const [h0, m0] = whFrom.split(':').map(Number);
    const [h1, m1] = whTo.split(':').map(Number);

    const step = GRID_STEP_MIN; // ✅ zawsze 5
    const buffer = effectiveBufferMin; // ✅ 5 + bookingBufferMin
    const durMin = durationToMinutes(selectedService);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // godziny dnia
    let cursor = startOfMinute(new Date(selectedDate));
    cursor.setHours(h0, m0, 0, 0);
    // ✅ start dnia do siatki 5-min
    cursor = ceilToStep(cursor, step);

    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(h1, m1, 0, 0);

    // teraz (dla dzisiejszego dnia)
    const isToday = isSameDay(selectedDate, new Date());
    let nowRoundedUp = null;
    if (isToday) {
      nowRoundedUp = ceilToStep(new Date(), step); // ✅ do 5-min
    }

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
      ? Math.max(0, eligibleStaff.reduce((sum, s) => sum + Math.max(1, Number(s.capacity) || 1), 0))
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
              (r) => !r.dateOnly && ['zaakceptowana', 'oczekująca', 'tymczasowa'].includes(r.status)
            )
            .filter((r) => eligibleIds.has(String(r.staffId)))
            .map((r) => {
              const from = new Date(`${r.date}T${r.fromTime}`);
              const toNoBuf = new Date(`${r.date}T${r.toTime}`); // ✅ koniec usługi
              const toWithBuf = addMinutes(toNoBuf, buffer); // ✅ koniec usługi + bufor

              return {
                fromMs: +from,
                toMs: +toNoBuf,
                toBufMs: +toWithBuf,
                status: r.status === 'zaakceptowana' ? 'reserved' : 'pending',
                staffId: String(r.staffId || ''),
              };
            })
        : [...reservedSlots, ...pendingSlots]
            .filter((s) => s.date === dateStr)
            .map((s) => {
              const from = new Date(`${s.date}T${s.fromTime}`);
              const toNoBuf = new Date(`${s.date}T${s.toTime}`); // ✅ koniec usługi
              const toWithBuf = addMinutes(toNoBuf, buffer); // ✅ koniec usługi + bufor

              const isRes = reservedSlots.some(
                (r) => r.date === s.date && r.fromTime === s.fromTime && r.toTime === s.toTime
              );

              return {
                fromMs: +from,
                toMs: +toNoBuf,
                toBufMs: +toWithBuf,
                status: isRes ? 'reserved' : 'pending',
                staffId: '',
              };
            })
    ).sort((a, b) => a.fromMs - b.fromMs);

    const slots = [];

    while (cursor < dayEnd) {
      const start = new Date(cursor);
      const end = addMinutes(start, durMin);
      const endWithBuffer = addMinutes(end, buffer);

      const slotStartMs = +start;
      const slotEndMs = +endWithBuffer;

      let status = 'free';
      if (endWithBuffer > dayEnd) status = 'disabled';

      // ✅ overlap liczymy po "toBufMs" (czyli usługa + bufor)
      const overlaps = dayBusy.filter((b) => slotStartMs < b.toBufMs && slotEndMs > b.fromMs);

      // ✅ rozróżnienie: start wpada w usługę czy tylko w bufor
      const startsInService = overlaps.some((o) => slotStartMs >= o.fromMs && slotStartMs <= o.toMs);
      const startsInBuffer =
        !startsInService && overlaps.some((o) => slotStartMs > o.toMs && slotStartMs < o.toBufMs);

      // dla nie-auto-assign: jaki kolor ma mieć "usługa" (reserved/pending)
      const anyReservedHere = overlaps.some(
        (o) => o.status === 'reserved' && slotStartMs >= o.fromMs && slotStartMs <= o.toMs
      );

      if (isAutoAssign) {
        if (totalCapacity <= 0) {
          status = 'disabled';
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
            const accepted = overlaps.filter((o) => o.status === 'reserved');
            const pendingOnly = overlaps.filter((o) => o.status === 'pending');

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

            if (startsInsideAccepted) status = 'reserved';
            else if (startsInsidePending) status = 'pending';
            else if (startsInsideBuffer2) status = 'disabled';
            else status = 'disabled';
          }
        }
      } else {
        // ✅ najpierw kolorujemy "obszar usługi", a bufor robimy szary
        if (startsInService && status !== 'disabled') {
          status = anyReservedHere ? 'reserved' : 'pending';
        } else if (startsInBuffer && status !== 'disabled') {
          status = 'disabled';
        } else {
          const directConflict = overlaps.length > 0;
          if (directConflict && status !== 'disabled') {
            status = 'disabled';
          } else if (status === 'free') {
            const nextBusy = dayBusy.find((b) => b.fromMs >= slotStartMs);
            if (nextBusy && slotEndMs > nextBusy.fromMs) status = 'disabled';
          }
        }
      }

      // ⛔️ Dziś: wszystko, co zaczyna się przed "teraz", szare
      if (isToday && nowRoundedUp && start < nowRoundedUp) {
        status = 'disabled';
      }

      slots.push({ label: format(start, 'HH:mm'), status });
      cursor = addMinutes(cursor, step); // ✅ zawsze 5 min
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
        pushAlert?.({ show: true, type: 'error', message: 'Musisz być zalogowany.' });
        return;
      }
      if (!selectedDate || !selectedService || !selectedSlot) {
        pushAlert?.({ show: true, type: 'error', message: 'Wybierz dzień, usługę i godzinę.' });
        return;
      }
      if (isUserPick && !selectedStaffId) {
        pushAlert?.({ show: true, type: 'error', message: 'Wybierz pracownika.' });
        return;
      }

      const step = GRID_STEP_MIN; // ✅ walidacja też co 5 min
      const [h, m] = selectedSlot.split(':').map(Number);
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(h, m, 0, 0);

      const nowRoundedUp = ceilToStep(new Date(), step);

      if (isSameDay(selectedDate, new Date()) && startDateTime < nowRoundedUp) {
        pushAlert?.({
          show: true,
          type: 'error',
          message: 'Wybrany slot już minął. Wybierz nowszą godzinę.',
        });
        return;
      }

      const fromTime = format(startDateTime, 'HH:mm');
      const toTime = format(addMinutes(startDateTime, durationToMinutes(selectedService)), 'HH:mm');

      const payload = {
        userId: user.uid,
        providerUserId: provider.userId,
        providerProfileId: provider._id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        fromTime,
        toTime,
        description,
        serviceId: selectedService._id,
        ...(isUserPick && selectedStaffId ? { staffId: selectedStaffId } : {}),
      };

      // ✅ zamiast axios -> api (Bearer token leci automatycznie)
      await api.post(`/api/reservations`, payload);

      await fetchReservations();

      sessionStorage.setItem(
        'flash',
        JSON.stringify({
          type: 'success',
          message: 'Rezerwacja wysłana – oczekuje na potwierdzenie.',
          ttl: 6000,
          ts: Date.now(),
        })
      );

      sessionStorage.setItem(
        'reservationHighlight',
        JSON.stringify({
          date: payload.date,
          fromTime,
          toTime,
          serviceId: selectedService._id,
        })
      );

      navigate('/rezerwacje', { state: { scrollToId: 'reservationsTop' } });

      setSlot('');
      setDescription('');
      setTimeout(() => {
        setDate(null);
        setService(null);
        setSelectedStaffId('');
      }, 100);
    } catch (err) {
      console.error('❌ BookingModeCalendar submit error:', err);
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 401 ? 'Brak autoryzacji (401). Zaloguj się ponownie.' : null) ||
        'Błąd przy wysyłaniu.';
      pushAlert?.({ show: true, type: 'error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Opis wspólny */}
      <label className={styles.field}>
        <h3 className={styles.fieldTitle}>Opis / uwagi:</h3>
        <textarea
          rows="3"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Np. strzyżenie + mycie…"
        />
      </label>

      {/* Usługi */}
      <label className={styles.field}>
        <h3 className={styles.fieldTitle}>Wybierz usługę:</h3>
        <select
          value={selectedService?._id || ''}
          onChange={(e) => {
            const svc = (provider.services || []).find((s) => s._id === e.target.value);
            setService(svc || null);
            setSlot('');
            setDate(null);
            setSelectedStaffId('');
          }}
        >
          <option value="">– wybierz –</option>
          {(provider.services || []).map((s) => (
            <option key={s._id} value={s._id}>
              {s.name} {s.duration.value}{' '}
              {s.duration.unit === 'minutes'
                ? 'min'
                : s.duration.unit === 'hours'
                ? 'godzin'
                : s.duration.unit === 'days'
                ? 'dni'
                : s.duration.unit}
            </option>
          ))}
        </select>
      </label>

      {/* ✨ Wybór pracownika (tylko calendar + team.enabled + user-pick) */}
      {isUserPick && selectedService && (
        <label className={styles.field}>
          <h3 className={styles.fieldTitle}>Wybierz osobę (pracownika):</h3>
          <select
            value={selectedStaffId}
            onChange={(e) => {
              setSelectedStaffId(e.target.value);
              setSlot('');
              setDate(null);
            }}
          >
            <option value="">– wybierz –</option>
            {staffList
              .filter((s) =>
                (s.serviceIds || []).some((id) => String(id) === String(selectedService?._id))
              )
              .map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                  {s.role ? ` — ${s.role}` : ''}
                </option>
              ))}
          </select>
        </label>
      )}

      {/* Info dla auto-assign */}
      {isAutoAssign && selectedService && (
        <div className={styles.infoBox}>
          Pracownik zostanie przydzielony automatycznie do wybranego terminu.
        </div>
      )}

      {/* Kalendarz + sloty */}
      {selectedService && (
        <>
          <div className={styles.monthNav}>
            <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              &lt;
            </button>
            <span>{format(currentMonth, 'LLLL yyyy', { locale: pl })}</span>
            <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              &gt;
            </button>
          </div>

          <div className={styles.calendarGrid}>
            {['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'].map((d) => (
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
              const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={`${styles.day} ${!active || isPast ? styles.disabledDay : ''} ${
                    sel ? styles.selectedDay : ''
                  }`}
                  disabled={!active || isPast}
                  onClick={() => active && !isPast && setDate(day)}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <form onSubmit={handleSubmit} className={styles.slotsForm}>
              <h3 className={styles.slotsTitle}>
                Wolne terminy na dzień: {format(selectedDate, 'dd.MM.yyyy')}
              </h3>

              <div className={styles.slotsGrid}>
                {timeSlots.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`
                      ${styles.slot}
                      ${s.status === 'disabled' ? styles.slotDisabled : ''}
                      ${s.status === 'reserved' ? styles.slotReserved : ''}
                      ${s.status === 'pending' ? styles.slotPending : ''}
                      ${selectedSlot === s.label ? styles.slotSelected : ''}
                    `}
                    disabled={s.status !== 'free' || isSubmitting}
                    onClick={() => !isSubmitting && s.status === 'free' && setSlot(s.label)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className={styles.legend}>
                <span>
                  <span className={`${styles.legendBox} ${styles.legendReserved}`} />
                  zajęte
                </span>
                <span>
                  <span className={`${styles.legendBox} ${styles.legendPending}`} />
                  oczekujące
                </span>
                <span>
                  <span className={`${styles.legendBox} ${styles.legendDisabled}`} />
                  niedostępne
                </span>
                <span>
                  <span className={`${styles.legendBox} ${styles.legendFree}`} />
                  wolne
                </span>

                <span className={styles.legendInfo}>
                  Przerwa między usługami: <b>{effectiveBufferMin} min</b>
                  {bookingBufferMin > 0
                    ? ` (5 min stałej przerwy + ${bookingBufferMin} min z profilu)`
                    : ' (5 min stałej przerwy)'}
                  {` • siatka slotów: ${GRID_STEP_MIN} min`}
                </span>
              </div>

              <LoadingButton
                type="submit"
                isLoading={isSubmitting}
                disabled={!selectedSlot || isSubmitting}
                className={styles.submit}
              >
                Rezerwuj termin
              </LoadingButton>
            </form>
          )}
        </>
      )}
    </>
  );
}