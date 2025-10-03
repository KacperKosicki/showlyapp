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

const CHANNEL = 'account_to_profile';

export default function BookingForm({ user }) {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [reservedSlots, setReserved] = useState([]); // { date, from, to }
  const [pendingSlots, setPending] = useState([]);   // { date, from, to }
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setDate] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedService, setService] = useState(null);
  const [selectedSlot, setSlot] = useState(''); // "HH:mm"
  const [description, setDescription] = useState('');
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  // Dla trybu dziennego / open
  const [unavailableDays, setUnavailableDays] = useState([]); // ['YYYY-MM-DD', ...]
  const [onlyInquiry, setOnlyInquiry] = useState(false);       // „Tylko zapytanie”

  // 1) Profil
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/profiles/slug/${slug}`)
      .then(({ data }) => {
        data.workingDays = data.workingDays.map(d => Number(d));
        setProvider(data);
      })
      .catch(() => {
        setAlert({ show: true, type: 'error', message: 'Nie udało się załadować profilu.' });
      });
  }, [slug]);

  // 2) Rezerwacje (tylko gdy kalendarz)
  useEffect(() => {
    if (!provider || provider.bookingMode !== 'calendar') return;
    const load = async () => {
      const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/api/reservations/by-provider/${provider.userId}`);
      const booked = data
        .filter(r => r.status === 'zaakceptowana')
        .map(r => ({ date: r.date, from: r.fromTime, to: r.toTime }));
      const pending = data
        .filter(r => r.status === 'oczekująca')
        .map(r => ({ date: r.date, from: r.fromTime, to: r.toTime }));
      setReserved(booked);
      setPending(pending);
    };
    load();
  }, [provider]);

  // 3) Dni niedostępne (tylko dla request-blocking)
  useEffect(() => {
    if (!provider || provider.bookingMode !== 'request-blocking') return;
    const loadUnavailable = async () => {
      try {
        const { data } = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/reservations/unavailable-days/${provider.userId}`
        );
        setUnavailableDays(Array.isArray(data) ? data : []);
      } catch {
        // ignoruj — pokażemy walidację przy submit
      }
    };
    loadUnavailable();
  }, [provider]);

  // 4) Redirect, jeśli ukryte
  useEffect(() => {
    if (provider?.showAvailableDates === false) {
      navigate('/', { replace: true });
    }
  }, [provider, navigate]);

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

  // 5) Kalendarz: lista dni
  const daysInMonth = provider?.bookingMode === 'calendar'
    ? eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
    : [];
  const startDayIndex = provider ? getDay(startOfMonth(currentMonth)) : 0;
  const isDayActive = day => provider.workingDays.includes(getDay(day));

  // 6) Czas trwania usług → minuty
  const durationToMinutes = svc => {
    const { value, unit } = svc.duration || {};
    if (!value || !unit) return 0;
    switch (unit) {
      case 'minutes': return value;
      case 'hours': return value * 60;
      case 'days': return value * 60 * 24;
      default: return value;
    }
  };

  // 7) Generowanie slotów (kalendarz)
  useEffect(() => {
    if (!provider || provider.bookingMode !== 'calendar') return;
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

  const isUnavailable = (yyyyMmDd) => unavailableDays.includes(yyyyMmDd);

  // 8) Submit — przełączanie po trybie
  const handleSubmit = async e => {
    e.preventDefault?.();

    if (!user?.uid) {
      return setAlert({ show: true, type: 'error', message: 'Musisz być zalogowany.' });
    }
    if (!provider) return;

    const mode = provider.bookingMode;

    // === A) KALENDARZ (godzinowy) ===
    if (mode === 'calendar') {
      if (!selectedDate || !selectedService || !selectedSlot) {
        return setAlert({ show: true, type: 'error', message: 'Wybierz dzień, usługę i godzinę.' });
      }

      // anty-przeterminowanie
      const [h, m] = selectedSlot.split(':').map(Number);
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(h, m, 0, 0);
      const step = 15;
      let nowRoundedUp = startOfMinute(new Date());
      const remNow = nowRoundedUp.getMinutes() % step;
      if (remNow) nowRoundedUp = addMinutes(nowRoundedUp, step - remNow);
      if (isSameDay(selectedDate, new Date()) && startDateTime < nowRoundedUp) {
        return setAlert({ show: true, type: 'error', message: 'Wybrany slot już minął. Wybierz nowszą godzinę.' });
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
        serviceId: selectedService._id, // ⬅️ DODANE
      };

      try {
        await axios.post(`${process.env.REACT_APP_API_URL}/api/reservations`, payload);
        await fetchReservations(provider.userId);
        setAlert({ show: true, type: 'success', message: 'Rezerwacja wysłana – oczekuje na potwierdzenie.' });
        setSlot('');
        setDescription('');
        setTimeout(() => { setDate(null); setService(null); }, 100);
      } catch {
        setAlert({ show: true, type: 'error', message: 'Błąd przy wysyłaniu.' });
      }
      return;
    }

    // === B) REQUEST-BLOCKING (rezerwacja dnia LUB samo zapytanie) ===
    if (mode === 'request-blocking') {
      if (!selectedDate) {
        return setAlert({ show: true, type: 'error', message: 'Wybierz dzień.' });
      }
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Jeśli „tylko zapytanie” lub dzień jest oznaczony jako niedostępny → idziemy w wiadomość
      if (onlyInquiry || isUnavailable(dateStr)) {
        try {
          const { data } = await axios.post(`${process.env.REACT_APP_API_URL}/api/conversations/send`, {
            from: user.uid,
            to: provider.userId,
            channel: CHANNEL,
            content: `Zapytanie o dostępność dnia ${dateStr}:\n\n${description || '(brak opisu)'}`
          });
          setAlert({ show: true, type: 'success', message: 'Zapytanie wysłane.' });
          setTimeout(() => {
            if (data?.id) navigate(`/konwersacja/${data.id}`, { state: { scrollToId: 'threadPageLayout' } });
            else navigate('/powiadomienia');
          }, 600);
        } catch {
          setAlert({ show: true, type: 'error', message: 'Nie udało się wysłać zapytania.' });
        }
        return;
      }

      // Normalna prośba o rezerwację całego dnia
      try {
        const payload = {
          userId: user.uid,
          userName: user.displayName || user.email || 'Użytkownik',
          providerUserId: provider.userId,
          providerName: provider.name || 'Usługodawca',
          providerProfileId: provider._id,
          providerProfileName: provider.name || '',
          providerProfileRole: provider.role || '',
          date: dateStr,
          description
        };
        await axios.post(`${process.env.REACT_APP_API_URL}/api/reservations/day`, payload);
        setAlert({ show: true, type: 'success', message: 'Wysłano prośbę o rezerwację dnia.' });
        setDescription('');
      } catch (err) {
        const msg = err?.response?.data?.message || 'Nie udało się utworzyć rezerwacji dnia.';
        setAlert({ show: true, type: 'error', message: msg });
      }
      return;
    }

    // === C) REQUEST-OPEN (tylko zapytania) ===
    if (mode === 'request-open') {
      const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
      const content = [
        'Zapytanie o usługę:',
        dateStr ? `Preferowana data: ${dateStr}` : null,
        description?.trim() ? `Opis:\n${description.trim()}` : null
      ].filter(Boolean).join('\n\n');

      try {
        const { data } = await axios.post(`${process.env.REACT_APP_API_URL}/api/conversations/send`, {
          from: user.uid,
          to: provider.userId,
          channel: CHANNEL,
          content: content || 'Zapytanie (bez szczegółów).'
        });
        setAlert({ show: true, type: 'success', message: 'Zapytanie wysłane.' });
        setDescription('');
        setDate(null);
        setTimeout(() => {
          if (data?.id) navigate(`/konwersacja/${data.id}`, { state: { scrollToId: 'threadPageLayout' } });
          else navigate('/powiadomienia');
        }, 600);
      } catch {
        setAlert({ show: true, type: 'error', message: 'Nie udało się wysłać zapytania.' });
      }
      return;
    }
  };

  if (!provider) return <div className={styles.loading}>🔄 Ładowanie…</div>;

  const mode = provider.bookingMode;

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
          <h2 className={styles.formMainHeading}>
            Zarezerwuj u <span className={styles.providerName}>{provider.name}</span>
          </h2>

          {/* Wspólny opis */}
          <label className={styles.field}>
            <h3 className={styles.fieldTitle}>Opis / uwagi:</h3>
            <textarea
              rows="3"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={
                mode === 'calendar'
                  ? 'Np. strzyżenie + mycie…'
                  : mode === 'request-blocking'
                    ? 'Opisz, czego potrzebujesz w danym dniu…'
                    : 'Opisz, czego potrzebujesz…'
              }
            />
          </label>

          {/* === KALENDARZ (sloty) === */}
          {mode === 'calendar' && (
            <>
              <label className={styles.field}>
                <h3 className={styles.fieldTitle}>Wybierz usługę:</h3>
                <select
                  value={selectedService?._id || ''}
                  onChange={e => {
                    const svc = provider.services.find(s => s._id === e.target.value);
                    setService(svc || null);
                    setSlot('');
                    setDate(null);
                  }}
                >
                  <option value="">– wybierz –</option>
                  {provider.services.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.name} {s.duration.value} {
                        s.duration.unit === 'minutes' ? 'min' :
                          s.duration.unit === 'hours' ? 'godzin' :
                            s.duration.unit === 'days' ? 'dni' : s.duration.unit
                      }
                    </option>
                  ))}
                </select>
              </label>

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
                        <span><span className={`${styles.legendBox} ${styles.legendPending}`}></span>oczekuje</span>
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
          )}

          {/* === REQUEST-BLOCKING (dzień) === */}
          {mode === 'request-blocking' && (
            <>
              {unavailableDays.length > 0 && (
                <div className={styles.infoBox}>
                  Niedostępne: {unavailableDays.join(', ')}
                </div>
              )}

              <label className={styles.field}>
                <span>Wybierz dzień:</span>
                <input
                  type="date"
                  value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => setDate(e.target.value ? new Date(e.target.value) : null)}
                />
              </label>

              <div className={styles.toggleRow}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={onlyInquiry}
                    onChange={() => setOnlyInquiry(v => !v)}
                  />
                  Tylko zapytanie (bez blokowania dnia)
                </label>
              </div>

              {!!selectedDate && isUnavailable(format(selectedDate, 'yyyy-MM-dd')) && !onlyInquiry && (
                <div className={styles.warnBox}>
                  Ten dzień jest niedostępny – możesz wysłać samo zapytanie.
                </div>
              )}

              <button onClick={handleSubmit} className={styles.submit}>
                {onlyInquiry ? 'Wyślij zapytanie' : 'Zarezerwuj dzień'}
              </button>
            </>
          )}

          {/* === REQUEST-OPEN (tylko zapytania) === */}
          {mode === 'request-open' && (
            <>
              <label className={styles.field}>
                <span>Preferowana data (opcjonalnie):</span>
                <input
                  type="date"
                  value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => setDate(e.target.value ? new Date(e.target.value) : null)}
                />
              </label>

              <button onClick={handleSubmit} className={styles.submit}>
                Wyślij zapytanie
              </button>
            </>
          )}
        </section>
      </div>
    </>
  );
}
