// BookingModeCalendar.jsx
import { useEffect, useMemo, useState } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, getDay,
  addMonths, subMonths, isSameDay, addMinutes, startOfMinute, startOfDay, isBefore
} from 'date-fns';
import { pl } from 'date-fns/locale';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styles from './BookingForm.module.scss';
import LoadingButton from "../ui/LoadingButton/LoadingButton";

const durationToMinutes = (svc) => {
  const { value, unit } = svc?.duration || {};
  if (!value || !unit) return 0;
  if (unit === 'minutes') return value;
  if (unit === 'hours') return value * 60;
  if (unit === 'days') return value * 60 * 24;
  return value;
};

export default function BookingModeCalendar({ user, provider, pushAlert }) {
  const [reservedSlots, setReserved] = useState([]); // { date, fromTime, toTime }
  const [pendingSlots, setPending] = useState([]);   // { date, fromTime, toTime }
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

  const daysInMonth = useMemo(() => (
    eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  ), [currentMonth]);

  const startDayIndex = useMemo(() => getDay(startOfMonth(currentMonth)), [currentMonth]);
  const isDayActive = (day) => Array.isArray(provider.workingDays) && provider.workingDays.includes(getDay(day));

  const isTeamEnabled = provider?.bookingMode === 'calendar' && provider?.team?.enabled === true;
  const isUserPick = isTeamEnabled && provider?.team?.assignmentMode === 'user-pick';
  const isAutoAssign = isTeamEnabled && provider?.team?.assignmentMode === 'auto-assign';

  // Załaduj personel (gdy team.enabled)
  useEffect(() => {
    if (!isTeamEnabled) return;
    axios
      .get(`${process.env.REACT_APP_API_URL}/api/staff`, { params: { profileId: provider._id } })
      .then(({ data }) => setStaffList(Array.isArray(data) ? data : []))
      .catch(() => setStaffList([]));
  }, [isTeamEnabled, provider?._id]);

  // Pobierz rezerwacje (z opcjonalnym filtrem po staffId dla user-pick)
  const fetchReservations = async () => {
    const { data } = await axios.get(
      `${process.env.REACT_APP_API_URL}/api/reservations/by-provider/${provider.userId}`
    );

    const filtered = (isUserPick && selectedStaffId)
      ? data.filter(r => r.staffId && String(r.staffId) === String(selectedStaffId))
      : data;

    // RAW całego zespołu – potrzebne dla auto-assign
    setReservationsAll(data);

    const booked = filtered
      .filter(r => r.status === 'zaakceptowana')
      .map(r => ({ date: r.date, fromTime: r.fromTime, toTime: r.toTime }));

    const pending = filtered
      .filter(r => r.status === 'oczekująca' || r.status === 'tymczasowa')
      .map(r => ({ date: r.date, fromTime: r.fromTime, toTime: r.toTime }));

    setReserved(booked);
    setPending(pending);
  };

  // Ładuj rezerwacje po wejściu
  useEffect(() => { fetchReservations(); }, []); // eslint-disable-line

  // Przeładuj przy zmianie pracownika w trybie user-pick
  useEffect(() => {
    if (isUserPick) fetchReservations(); // eslint-disable-line
  }, [selectedStaffId]); // eslint-disable-line

  // Generowanie slotów (capacity-aware dla auto-assign)
  useEffect(() => {
    if (!selectedDate || !selectedService) {
      setTimeSlots([]);
      return;
    }

    const [h0, m0] = provider.workingHours.from.split(':').map(Number);
    const [h1, m1] = provider.workingHours.to.split(':').map(Number);

    const step = 15;
    const buffer = 15;
    const durMin = durationToMinutes(selectedService);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // godziny dnia
    let cursor = startOfMinute(new Date(selectedDate));
    cursor.setHours(h0, m0, 0, 0);
    const rem = cursor.getMinutes() % step;
    if (rem) cursor = addMinutes(cursor, step - rem);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(h1, m1, 0, 0);

    // teraz (dla dzisiejszego dnia)
    const isToday = isSameDay(selectedDate, new Date());
    let nowRoundedUp = null;
    if (isToday) {
      const now = startOfMinute(new Date());
      const remNow = now.getMinutes() % step;
      nowRoundedUp = remNow ? addMinutes(now, step - remNow) : now;
    }

    // ===== eligible & capacity dla auto-assign =====
    const eligibleStaff = (isTeamEnabled && provider?.team?.enabled)
      ? staffList.filter(s =>
        s.active &&
        (s.serviceIds || []).some(id => String(id) === String(selectedService?._id))
      )
      : [];

    const eligibleIds = new Set(eligibleStaff.map(s => String(s._id)));

    const totalCapacity = isAutoAssign
      ? Math.max(0, eligibleStaff.reduce((sum, s) => sum + Math.max(1, Number(s.capacity) || 1), 0))
      : 0;

    // 🆕 mapa pojemności per pracownik (dla auto-assign)
    const capacityMap = new Map(
      eligibleStaff.map(s => [String(s._id), Math.max(1, Number(s.capacity) || 1)])
    );

    // ===== dayBusy =====
    // auto-assign → liczymy zajętość TYLKO z rezerwacji pracowników z puli dla wybranej usługi
    // pozostałe tryby → stara lista z reservedSlots/pendingSlots (już przefiltrowana dla user-pick)
    const dayBusy = (isAutoAssign
      ? reservationsAll
        .filter(r => r.date === dateStr)
        .filter(r => !r.dateOnly && ['zaakceptowana', 'oczekująca', 'tymczasowa'].includes(r.status))
        .filter(r => eligibleIds.has(String(r.staffId)))
        .map(r => {
          const from = new Date(`${r.date}T${r.fromTime}`);
          const to = addMinutes(new Date(`${r.date}T${r.toTime}`), buffer);
          return {
            fromMs: +from,
            toMs: +to,
            status: (r.status === 'zaakceptowana') ? 'reserved' : 'pending',
            staffId: String(r.staffId || '')
          };
        })
      : [...reservedSlots, ...pendingSlots]
        .filter(s => s.date === dateStr)
        .map(s => {
          const from = new Date(`${s.date}T${s.fromTime}`);
          const to = addMinutes(new Date(`${s.date}T${s.toTime}`), buffer);
          const isRes = reservedSlots.find(r => r.date === s.date && r.fromTime === s.fromTime);
          return {
            fromMs: +from,
            toMs: +to,
            status: isRes ? 'reserved' : 'pending',
            staffId: '' // bez zespołu nie ma znaczenia
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

      // twarde nakładki na ten slot (uwzględniając buffer)
      const overlaps = dayBusy.filter(b => slotStartMs < b.toMs && slotEndMs > b.fromMs);

      if (isAutoAssign) {
        if (totalCapacity <= 0) {
          status = 'disabled';
        } else {
          // 🆕 policz zużytą pojemność per pracownik w tym slocie
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
            const accepted = overlaps.filter(o => o.status === 'reserved');
            const pendingOnly = overlaps.filter(o => o.status === 'pending');

            const startsInsideAccepted = accepted.some(o =>
              slotStartMs >= o.fromMs && slotStartMs < o.toMs
            );
            const startsInsidePending = pendingOnly.some(o =>
              slotStartMs >= o.fromMs && slotStartMs < o.toMs
            );

            if (startsInsideAccepted) {
              status = 'reserved';   // czerwony
            } else if (startsInsidePending) {
              status = 'pending';    // żółty
            } else {
              status = 'disabled';   // tylko dogonienie/BUF → szary
            }
          }


          // brak „onlyNextStarts” – zero sztucznego szarzenia
        }
      } else {
        // bez zespołu / user-pick: jeden konflikt blokuje slot
        const directConflict = overlaps.length > 0;
        if (directConflict && status !== 'disabled') {
          const accepted = overlaps.filter(o => o.status === 'reserved');
          const pendingOnly = overlaps.filter(o => o.status === 'pending');

          const startsInsideAccepted = accepted.some(o =>
            slotStartMs >= o.fromMs && slotStartMs < o.toMs
          );
          const startsInsidePending = pendingOnly.some(o =>
            slotStartMs >= o.fromMs && slotStartMs < o.toMs
          );

          if (startsInsideAccepted) {
            status = 'reserved';   // czerwony
          } else if (startsInsidePending) {
            status = 'pending';    // żółty
          } else {
            status = 'disabled';   // dogonienie/BUF → szary
          }
        }

        else if (status === 'free') {
          // opcjonalny „soft block” przed zbliżającą się rezerwacją
          const nextBusy = dayBusy.find(b => b.fromMs >= slotStartMs);
          if (nextBusy && slotEndMs > nextBusy.fromMs) status = 'disabled';
        }
      }

      // przeszłość dziś – szare, chyba że w tym oknie jest zaakceptowana rezerwacja
      // ⛔️ Dziś: wszystko, co zaczyna się przed "teraz", jest po prostu niedostępne (szare)
      if (isToday && nowRoundedUp && start < nowRoundedUp) {
        status = 'disabled';
      }


      slots.push({ label: format(start, 'HH:mm'), status });
      cursor = addMinutes(cursor, step);
    }

    setTimeSlots(slots);
  }, [
    selectedDate,
    selectedService,
    provider,
    reservedSlots,
    pendingSlots,
    isAutoAssign,
    isTeamEnabled,
    staffList,
    reservationsAll
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault?.();

    if (isSubmitting) return; // ⬅️ blokada podwójnego kliku
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

      // anty-przeterminowanie
      const step = 15;
      const [h, m] = selectedSlot.split(':').map(Number);
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(h, m, 0, 0);

      let nowRoundedUp = startOfMinute(new Date());
      const remNow = nowRoundedUp.getMinutes() % step;
      if (remNow) nowRoundedUp = addMinutes(nowRoundedUp, step - remNow);

      if (isSameDay(selectedDate, new Date()) && startDateTime < nowRoundedUp) {
        pushAlert?.({ show: true, type: 'error', message: 'Wybrany slot już minął. Wybierz nowszą godzinę.' });
        return;
      }

      const fromTime = format(startDateTime, 'HH:mm');
      const toTime = format(
        addMinutes(startDateTime, durationToMinutes(selectedService)),
        'HH:mm'
      );

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

      await axios.post(`${process.env.REACT_APP_API_URL}/api/reservations`, payload);

      // odśwież lokalne rezerwacje (żeby slot zmienił kolor)
      await fetchReservations();

      // flash po przejściu
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
    } catch {
      pushAlert?.({ show: true, type: 'error', message: 'Błąd przy wysyłaniu.' });
    } finally {
      setIsSubmitting(false); // ✅ zawsze odblokuje przycisk
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
          onChange={e => setDescription(e.target.value)}
          placeholder="Np. strzyżenie + mycie…"
        />
      </label>

      {/* Usługi */}
      <label className={styles.field}>
        <h3 className={styles.fieldTitle}>Wybierz usługę:</h3>
        <select
          value={selectedService?._id || ''}
          onChange={e => {
            const svc = (provider.services || []).find(s => s._id === e.target.value);
            setService(svc || null);
            setSlot('');
            setDate(null);
            setSelectedStaffId(''); // reset pracownika przy zmianie usługi
          }}
        >
          <option value="">– wybierz –</option>
          {(provider.services || []).map(s => (
            <option key={s._id} value={s._id}>
              {s.name} {s.duration.value}{' '}
              {s.duration.unit === 'minutes' ? 'min' :
                s.duration.unit === 'hours' ? 'godzin' :
                  s.duration.unit === 'days' ? 'dni' : s.duration.unit}
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
            onChange={e => {
              setSelectedStaffId(e.target.value);
              setSlot('');
              setDate(null);
            }}
          >
            <option value="">– wybierz –</option>
            {staffList
              .filter(s => (s.serviceIds || []).some(id => String(id) === String(selectedService?._id)))
              .map(s => (
                <option key={s._id} value={s._id}>
                  {s.name}{s.role ? ` — ${s.role}` : ''}
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
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>&lt;</button>
            <span>{format(currentMonth, 'LLLL yyyy', { locale: pl })}</span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>&gt;</button>
          </div>

          <div className={styles.calendarGrid}>
            {['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'].map(d =>
              <div key={d} className={styles.weekday}>{d}</div>
            )}
            {Array(startDayIndex).fill(null).map((_, i) =>
              <div key={i} className={styles.blankDay} />
            )}
            {daysInMonth.map(day => {
              const active = isDayActive(day);
              const sel = selectedDate && isSameDay(day, selectedDate);
              const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
              return (
                <button
                  key={day.toISOString()}
                  className={`${styles.day} ${!active || isPast ? styles.disabledDay : ''} ${sel ? styles.selectedDay : ''}`}
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
                <span><span className={`${styles.legendBox} ${styles.legendReserved}`}></span>zajęte</span>
                <span><span className={`${styles.legendBox} ${styles.legendPending}`}></span>oczekujące</span>
                <span><span className={`${styles.legendBox} ${styles.legendDisabled}`}></span>niedostępne</span>
                <span><span className={`${styles.legendBox} ${styles.legendFree}`}></span>wolne</span>
                <span className={styles.legendInfo}>+ 15 min przerwy między usługami</span>
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
