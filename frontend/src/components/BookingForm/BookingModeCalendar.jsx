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

const durationToMinutes = (svc) => {
  const { value, unit } = svc?.duration || {};
  if (!value || !unit) return 0;
  if (unit === 'minutes') return value;
  if (unit === 'hours') return value * 60;
  if (unit === 'days') return value * 60 * 24;
  return value;
};

export default function BookingModeCalendar({ user, provider, pushAlert }) {
  const [reservedSlots, setReserved] = useState([]); // { date, from, to }
  const [pendingSlots, setPending] = useState([]);   // { date, from, to }
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setDate] = useState(null);
  const [selectedService, setService] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedSlot, setSlot] = useState(''); // "HH:mm"
  const [description, setDescription] = useState('');
  const navigate = useNavigate();

  const daysInMonth = useMemo(() => (
    eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  ), [currentMonth]);

  const startDayIndex = useMemo(() => getDay(startOfMonth(currentMonth)), [currentMonth]);
  const isDayActive = (day) => Array.isArray(provider.workingDays) && provider.workingDays.includes(getDay(day));

  const fetchReservations = async () => {
    const { data } = await axios.get(
      `${process.env.REACT_APP_API_URL}/api/reservations/by-provider/${provider.userId}`
    );
    const booked = data
      .filter(r => r.status === 'zaakceptowana')
      .map(r => ({ date: r.date, from: r.fromTime, to: r.toTime }));
    const pending = data
      .filter(r => r.status === 'oczekująca')
      .map(r => ({ date: r.date, from: r.fromTime, to: r.toTime }));
    setReserved(booked);
    setPending(pending);
  };

  // Ładuj rezerwacje po wejściu
  useEffect(() => { fetchReservations(); }, []); // eslint-disable-line

  // Generowanie slotów na podstawie wybranej daty/usługi i rezerwacji
  useEffect(() => {
    if (!selectedDate || !selectedService) {
      setTimeSlots([]);
      return;
    }

    const [h0, m0] = provider.workingHours.from.split(':').map(Number);
    const [h1, m1] = provider.workingHours.to.split(':').map(Number);

    let cursor = startOfMinute(new Date(selectedDate));
    cursor.setHours(h0, m0, 0, 0);
    const step = 15;
    const rem = cursor.getMinutes() % step;
    if (rem) cursor = addMinutes(cursor, step - rem);

    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(h1, m1, 0, 0);

    const buffer = 15;
    const durMin = durationToMinutes(selectedService);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const allBusy = [...reservedSlots, ...pendingSlots]
      .filter(s => s.date === dateStr)
      .map(s => ({
        from: new Date(`${s.date}T${s.from}`).getTime(),
        to: addMinutes(new Date(`${s.date}T${s.to}`), buffer).getTime(),
        status: reservedSlots.find(r => r.date === s.date && r.from === s.from) ? 'reserved' : 'pending'
      }))
      .sort((a, b) => a.from - b.from);

    const isToday = isSameDay(selectedDate, new Date());
    let nowRoundedUp = null;
    if (isToday) {
      const now = new Date();
      nowRoundedUp = startOfMinute(now);
      const remNow = nowRoundedUp.getMinutes() % step;
      if (remNow) nowRoundedUp = addMinutes(nowRoundedUp, step - remNow);
    }

    const slots = [];
    while (cursor < dayEnd) {
      const start = new Date(cursor);
      const end = addMinutes(start, durMin);
      const endWithBuffer = addMinutes(end, buffer);
      const slotStartMs = start.getTime();
      const slotEndMs = endWithBuffer.getTime();

      let status = 'free';
      if (endWithBuffer > dayEnd) status = 'disabled';

      const conflict = allBusy.find(busy => slotStartMs >= busy.from && slotStartMs < busy.to);
      if (conflict) {
        status = conflict.status;
      } else if (status === 'free') {
        const nextBusy = allBusy.find(busy => busy.from >= slotStartMs);
        if (nextBusy && slotEndMs > nextBusy.from) status = 'disabled';
      }
      if (isToday && nowRoundedUp && start < nowRoundedUp && status === 'free') {
        status = 'disabled';
      }

      slots.push({ label: format(start, 'HH:mm'), status });
      cursor = addMinutes(cursor, step);
    }

    setTimeSlots(slots);
  }, [selectedDate, selectedService, provider, reservedSlots, pendingSlots]);

  const handleSubmit = async (e) => {
    e.preventDefault?.();

    if (!user?.uid) {
      return pushAlert?.({ show: true, type: 'error', message: 'Musisz być zalogowany.' });
    }
    if (!selectedDate || !selectedService || !selectedSlot) {
      return pushAlert?.({ show: true, type: 'error', message: 'Wybierz dzień, usługę i godzinę.' });
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
      return pushAlert?.({ show: true, type: 'error', message: 'Wybrany slot już minął. Wybierz nowszą godzinę.' });
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
    };

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/reservations`, payload);

      // (opcjonalnie) odśwież lokalne rezerwacje:
      await fetchReservations();

      // 👉 Zamiast lokalnego pushAlert — zapisz flash, by komunikat był widoczny po przejściu:
      sessionStorage.setItem('flash', JSON.stringify({
        type: 'success',
        message: 'Rezerwacja wysłana – oczekuje na potwierdzenie.',
        ttl: 6000,
        ts: Date.now(),
      }));

      // (opcjonalnie) przekaż info do podświetlenia w /rezerwacje
      sessionStorage.setItem('reservationHighlight', JSON.stringify({
        date: payload.date,
        fromTime,
        toTime,
        serviceId: selectedService._id,
      }));

      // ➜ przekierowanie do systemu rezerwacji
      navigate('/rezerwacje', { state: { scrollToId: 'reservationsTop' } });

      // lokalne czyszczenie nie jest konieczne (komponent i tak się odmontuje),
      // ale można zachować:
      setSlot('');
      setDescription('');
      setTimeout(() => { setDate(null); setService(null); }, 100);
    } catch {
      pushAlert?.({ show: true, type: 'error', message: 'Błąd przy wysyłaniu.' });
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
                    disabled={s.status !== 'free'}
                    onClick={() => s.status === 'free' && setSlot(s.label)}
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

              <button type="submit" className={styles.submit}>Rezerwuj termin</button>
            </form>
          )}
        </>
      )}
    </>
  );
}
