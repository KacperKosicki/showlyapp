// BookingForm.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import styles from './BookingForm.module.scss';
import axios from 'axios';
import AlertBox from '../AlertBox/AlertBox';

export default function BookingForm({ user }) {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [reservedSlots, setReserved] = useState([]); // { date, from, to }
  const [pendingSlots, setPending] = useState([]); // { date, from, to }
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setDate] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedService, setService] = useState(null);
  const [selectedSlot, setSlot] = useState(''); // "HH:mm"
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  // 1️⃣ Profil
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/profiles/slug/${slug}`)
      .then(({ data }) => {
        data.workingDays = data.workingDays.map(d => Number(d));
        setProvider(data);
      })
      .catch(() => setError('Nie udało się załadować profilu.'));
  }, [slug]);

  // 2️⃣ Zaakceptowane rezerwacje
  useEffect(() => {
    if (!provider) return;
    axios.get(`${process.env.REACT_APP_API_URL}/api/reservations/by-provider/${provider.userId}`)
      .then(({ data }) => {
        // zaakceptowane na czerwono
        const booked = data
          .filter(r => r.status === 'zaakceptowana')
          .map(r => ({ date: r.date, from: r.fromTime, to: r.toTime }));

        // OCZEKUJĄCE na żółto!
        const pending = data
          .filter(r => r.status === 'oczekująca')
          .map(r => ({ date: r.date, from: r.fromTime, to: r.toTime }));

        setReserved(booked);
        setPending(pending); // <<< DODAJ TO!
      });
  }, [provider]);


  // 3️⃣ Redirect jeśli wyłączone
  useEffect(() => {
    if (provider?.showAvailableDates === false) {
      navigate('/', { replace: true });
    }
  }, [provider, navigate]);

  useEffect(() => {
    if (!provider) return;
    fetchReservations(provider.userId);
  }, [provider]);

  const fetchReservations = async (providerId) => {
    const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/api/reservations/by-provider/${providerId}`);
    const booked = data
      .filter(r => r.status === 'zaakceptowana')
      .map(r => ({ date: r.date, from: r.fromTime, to: r.toTime }));

    const pending = data
      .filter(r => r.status === 'oczekująca')
      .map(r => ({ date: r.date, from: r.fromTime, to: r.toTime }));

    setReserved(booked);
    setPending(pending);
  };

  // 4️⃣ Dni w miesiącu
  const daysInMonth = provider?.bookingMode === 'calendar'
    ? eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
    : [];

  const startDayIndex = provider ? getDay(startOfMonth(currentMonth)) : 0;
  const isDayActive = day => provider.workingDays.includes(getDay(day));

  // pomocniczo: konwertuje trwałość usługi na minuty
  const durationToMinutes = svc => {
    const { value, unit } = svc.duration;

    switch (unit) {
      case 'minutes': return value;
      case 'hours': return value * 60;
      case 'days': return value * 60 * 24;
      default:
        console.warn('Nieznana jednostka czasu:', unit);
        return value;
    }
  };

  // 7️⃣ Generowanie slotów
  useEffect(() => {
    if (!selectedDate || !selectedService) {
      setTimeSlots([]);
      return;
    }

    const [h0, m0] = provider.workingHours.from.split(':').map(Number);
    const [h1, m1] = provider.workingHours.to.split(':').map(Number);

    let cursor = startOfMinute(new Date(selectedDate));
    cursor.setHours(h0, m0, 0, 0);
    const rem = cursor.getMinutes() % 15;
    if (rem) cursor = addMinutes(cursor, 15 - rem);

    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(h1, m1, 0, 0);

    const slots = [];
    const step = 15;
    const buffer = 15;
    const durMin = durationToMinutes(selectedService);

    // Na dany dzień: sortujemy rezerwacje
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const allBusy = [...reservedSlots, ...pendingSlots]
      .filter(s => s.date === dateStr)
      .map(s => ({
        from: new Date(`${s.date}T${s.from}`).getTime(),
        to: addMinutes(new Date(`${s.date}T${s.to}`), buffer).getTime(),
        status: reservedSlots.find(r => r.date === s.date && r.from === s.from)
          ? 'reserved'
          : 'pending'
      }))
      .sort((a, b) => a.from - b.from);

    // 👉 NOWE: wyliczamy "teraz" zaokrąglone w górę
    const isToday = isSameDay(selectedDate, new Date());
    let nowRoundedUp = null;
    if (isToday) {
      const now = new Date();
      nowRoundedUp = startOfMinute(now);
      const remNow = nowRoundedUp.getMinutes() % step;
      if (remNow) nowRoundedUp = addMinutes(nowRoundedUp, step - remNow);
    }

    while (cursor < dayEnd) {
      const start = new Date(cursor);
      const end = addMinutes(start, durMin);
      const endWithBuffer = addMinutes(end, buffer);
      const slotStartMs = start.getTime();
      const slotEndMs = endWithBuffer.getTime();

      let status = 'free';

      // 1️⃣ Jeśli slot kończy się po godzinach pracy – blokuj!
      if (endWithBuffer > dayEnd) {
        status = 'disabled';
      }

      // 2️⃣ Kolizja z rezerwacją
      const conflict = allBusy.find(busy => slotStartMs >= busy.from && slotStartMs < busy.to);
      if (conflict) {
        status = conflict.status;
      } else if (status === 'free') {
        // 3️⃣ Czy wciśnie się przed następną rezerwacją?
        const nextBusy = allBusy.find(busy => busy.from >= slotStartMs);
        if (nextBusy && slotEndMs > nextBusy.from) {
          status = 'disabled';
        }
      }

      // 👉 NOWE: dla dzisiejszej daty wyłącz sloty przed "teraz"
      if (isToday && nowRoundedUp && start < nowRoundedUp && status === 'free') {
        status = 'disabled';
      }

      slots.push({ label: format(start, 'HH:mm'), status });
      cursor = addMinutes(cursor, step);
    }

    setTimeSlots(slots);
  }, [selectedDate, selectedService, provider, reservedSlots, pendingSlots]);

  // 8️⃣ Wyślij
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (provider.bookingMode === 'calendar') {
      if (!selectedDate || !selectedService || !selectedSlot) {
        return setAlert({ show: true, type: 'error', message: 'Wybierz dzień, usługę i godzinę.' });
      }

      // ⬇️ DODAJ TEN BLOK TU — re-walidacja przeterminowanego slotu
      const [h, m] = selectedSlot.split(':').map(Number);
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(h, m, 0, 0);

      // "teraz" zaokrąglone w górę do 15 min
      const step = 15;
      let nowRoundedUp = startOfMinute(new Date());
      const remNow = nowRoundedUp.getMinutes() % step;
      if (remNow) nowRoundedUp = addMinutes(nowRoundedUp, step - remNow);

      if (isSameDay(selectedDate, new Date()) && startDateTime < nowRoundedUp) {
        return setAlert({
          show: true,
          type: 'error',
          message: 'Wybrany slot już minął. Wybierz nowszą godzinę.'
        });
      }
      // ⬆️ KONIEC DODANEGO BLOKU
    }

    if (provider.bookingMode === 'request-blocking' && !selectedDate) {
      return setAlert({ show: true, type: 'error', message: 'Wybierz dzień.' });
    }

    let payload = {
      userId: user.uid,
      providerUserId: provider.userId,
      providerProfileId: provider._id,
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
      description
    };

    let fromTime = null;
    let toTime = null;

    if (provider.bookingMode === 'calendar') {
      const [h, m] = selectedSlot.split(':').map(Number);
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(h, m, 0, 0);

      fromTime = format(startDateTime, 'HH:mm');
      toTime = format(
        addMinutes(startDateTime, durationToMinutes(selectedService)),
        'HH:mm'
      );

      payload = { ...payload, fromTime, toTime };
    }

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/reservations`, payload);
      await fetchReservations(provider.userId);

      setTimeout(() => {
        setDate(null);
        setService(null);
      }, 100);

      setAlert({ show: true, type: 'success', message: 'Rezerwacja wysłana – oczekuje na potwierdzenie.' });
      setSlot('');
      setDescription('');
    } catch {
      setAlert({ show: true, type: 'error', message: 'Błąd przy wysyłaniu.' });
    }
  };

  if (!provider) return <div className={styles.loading}>🔄 Ładowanie…</div>;

  return (
    <>
      {alert.show && (
        <AlertBox
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ ...alert, show: false })}
        />
      )}
      <div className={styles.wrapper}>
        <section className={styles.section}>
          <h2 className={styles.formMainHeading}>Zarezerwuj u {provider.name}</h2>

          {provider.bookingMode === 'calendar' && (
            <>
              <label className={styles.field}>
                <h3 className={styles.fieldTitle}>Opis / uwagi:</h3>
                <textarea rows="3" value={description} onChange={e => setDescription(e.target.value)} />
              </label>
              <label className={styles.field}>
                <h3 className={styles.fieldTitle}>Wybierz usługę:</h3>
                <select
                  value={selectedService?._id || ''}
                  onChange={e => {
                    const svc = provider.services.find(s => s._id === e.target.value);
                    setService(svc || null);
                    setSlot(''); setDate(null);
                  }}
                >
                  <option value="">– wybierz –</option>
                  {provider.services.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.name} {s.duration.value} {
                        s.duration.unit === 'minutes' ? 'min' :
                          s.duration.unit === 'hours' ? 'godzin' :
                            s.duration.unit === 'days' ? 'dni' :
                              s.duration.unit
                      }
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {provider.bookingMode === 'calendar' && selectedService && (
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

                  // NOWE: czy dzień jest w przeszłości (przed dziś)
                  const isPast = isBefore(startOfDay(day), startOfDay(new Date()));

                  return (
                    <button
                      key={day.toISOString()}
                      className={`
        ${styles.day}
        ${!active || isPast ? styles.disabledDay : ''}
        ${sel ? styles.selectedDay : ''}
      `}
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
                  <h3 className={styles.slotsTitle}>Wolne terminy na dzień: {format(selectedDate, 'dd.MM.yyyy')}</h3>
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
                    <span><span className={`${styles.legendBox} ${styles.legendPending}`}></span>oczekuje</span>
                    <span><span className={`${styles.legendBox} ${styles.legendDisabled}`}></span>niedostępne</span>
                    <span><span className={`${styles.legendBox} ${styles.legendFree}`}></span>wolne</span>
                    <span className={styles.legendInfo}>+ 15 min przerwy między usługami</span>
                  </div>

                  {error && <p className={styles.error}>{error}</p>}
                  {message && <p className={styles.success}>{message}</p>}
                  <button type="submit" className={styles.submit}>Rezerwuj termin</button>
                </form>
              )}
            </>
          )}

          {provider.bookingMode === 'request-blocking' && (
            <label className={styles.field}>
              Wybierz dzień:
              <input
                type="date"
                value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                onChange={e => setDate(new Date(e.target.value))}
              />
            </label>
          )}

          {provider.bookingMode === 'request-open' && (
            <p>Profil przyjmuje zapytania bez blokowania terminów. Napisz czego potrzebujesz:</p>
          )}

          {provider.bookingMode !== 'calendar' && (
            <>
              {error && <p className={styles.error}>{error}</p>}
              {message && <p className={styles.success}>{message}</p>}
              <button onClick={handleSubmit} className={styles.submit}>Wyślij rezerwację</button>
            </>
          )}
        </section>
      </div>
    </>
  );
}
