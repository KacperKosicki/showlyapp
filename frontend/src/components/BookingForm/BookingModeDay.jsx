import { useEffect, useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, format, getDay, isBefore, startOfDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiSend } from 'react-icons/fi';
import styles from './BookingControls.module.scss';
import BookingServicePicker from './BookingServicePicker';
import BookingDatePicker from './BookingDatePicker';
import BookingSummary from './BookingSummary';
import LoadingButton from '../ui/LoadingButton/LoadingButton';
import { api } from '../../api/api';
import { dayBookingMode, dayBookingCopy, occursOn } from '../../utils/dayBooking';

export default function BookingModeDay({ user, provider, pushAlert, preselectedServiceId }) {
  const navigate = useNavigate();
  const kind = dayBookingMode(provider), copy = dayBookingCopy(provider);
  const [currentMonth, setMonth] = useState(new Date());
  const [date, setDate] = useState(null), [endDate, setEndDate] = useState(null);
  const [service, setService] = useState(null), [inquiry, setInquiry] = useState(false);
  const [fromTime, setFromTime] = useState(''), [toTime, setToTime] = useState('');
  const [description, setDescription] = useState(''), [sending, setSending] = useState(false);
  const [availability, setAvailability] = useState({ loading: true, error: false, unavailable: [], busy: [] });
  const [reload, setReload] = useState(0);
  const services = useMemo(() => (provider?.services || []).filter(item => item.isActive !== false), [provider?.services]);
  useEffect(() => {
    if (preselectedServiceId) setService(services.find(item => String(item._id) === String(preselectedServiceId)) || null);
  }, [preselectedServiceId, services]);
  useEffect(() => {
    setDate(null); setEndDate(null); setFromTime(''); setToTime('');
  }, [kind, service?._id]);
  useEffect(() => {
    let alive = true;
    setAvailability(prev => ({ ...prev, loading: true, error: false }));
    Promise.all([api.get(`/api/reservations/unavailable-days/${provider.userId}`), api.get(`/api/reservations/day-busy/${provider.userId}`)])
      .then(([days, busy]) => { if (alive) setAvailability({ loading: false, error: false, unavailable: Array.isArray(days.data) ? days.data : [], busy: Array.isArray(busy.data) ? busy.data : [] }); })
      .catch(() => { if (alive) setAvailability(prev => ({ ...prev, loading: false, error: true })); });
    return () => { alive = false; };
  }, [provider.userId, reload]);
  const iso = value => value ? format(value, 'yyyy-MM-dd') : '';
  const manuallyBlocked = day => (provider.blockedDays || []).includes(day) || (provider.availabilityOverrides || []).some(item => item.type === 'day' && item.date === day);
  const blocked = day => manuallyBlocked(day) || (kind !== 'order' && availability.unavailable.includes(day)) || (['stay', 'exclusive-day'].includes(kind) && (availability.busy.some(item => occursOn(item, day)) || (provider.availabilityOverrides || []).some(item => item.type === 'slot' && item.date === day)));
  const rangeBlocked = (start, end) => {
    const nights = differenceInCalendarDays(end, start);
    if (nights < 1 || nights > 366) return true;
    for (let offset = 0; offset < nights; offset++) if (blocked(iso(addDays(start, offset)))) return true;
    return false;
  };
  const disabledDay = day => {
    if (isBefore(startOfDay(day), startOfDay(new Date()))) return true;
    if (inquiry) return false;
    if (kind === 'stay' && date && !endDate && day > date) return rangeBlocked(date, day);
    if (kind !== 'stay' && provider.workingDays?.length && !provider.workingDays.includes(getDay(day))) return true;
    return blocked(iso(day));
  };
  const pickDay = day => {
    if (kind === 'stay' && date && !endDate && day > date) setEndDate(day);
    else { setDate(day); setEndDate(null); }
  };
  let problem = '';
  if (!date) problem = 'Wybierz datę.';
  else if (kind === 'stay' && (!endDate || differenceInCalendarDays(endDate, date) < 1 || differenceInCalendarDays(endDate, date) > 366 || (!inquiry && rangeBlocked(date, endDate)))) problem = 'Wybierz dostępny pobyt od przyjazdu do wyjazdu (1–366 nocy).';
  else if (kind === 'hours' && (!fromTime || !toTime || toTime <= fromTime)) problem = 'Podaj poprawne godziny od–do w tym samym dniu.';
  else if (kind === 'hours' && (fromTime < (provider.workingHours?.from || '08:00') || toTime > (provider.workingHours?.to || '20:00'))) problem = 'Wybierz godziny w harmonogramie usługodawcy.';
  else if (!inquiry && (availability.loading || availability.error)) problem = 'Poczekaj na sprawdzenie dostępności.';
  else if (!inquiry && services.length && !service) problem = 'Wybierz usługę.';
  else if (!inquiry && blocked(iso(date))) problem = 'Ten termin jest niedostępny.';
  else if (!inquiry && kind === 'hours' && (availability.busy.some(item => item.date === iso(date) && !item.dateOnly && item.bookingKind !== 'stay' && fromTime < item.toTime && toTime > item.fromTime) || (provider.availabilityOverrides || []).some(item => item.type === 'slot' && item.date === iso(date) && fromTime < item.toTime && toTime > item.fromTime))) problem = 'Wybrane godziny są niedostępne. Zmień przedział.';
  const timing = kind === 'stay' ? `${iso(date)} – ${iso(endDate)} (przyjazd / wyjazd)` : kind === 'hours' ? `${iso(date)}, ${fromTime}–${toTime}` : iso(date);
  async function submit(event) {
    event.preventDefault();
    if (sending) return;
    if (!user?.uid) { pushAlert?.({ show: true, type: 'error', message: 'Zaloguj się, aby wysłać zgłoszenie.' }); return; }
    if (problem) { pushAlert?.({ show: true, type: 'error', message: problem }); return; }
    setSending(true);
    try {
      if (inquiry) {
        const content = [`Zapytanie: ${copy.title}`, `Termin: ${timing}`, service ? `Usługa: ${service.name}` : null, description.trim()].filter(Boolean).join('\n\n');
        try {
          const { data } = await api.post('/api/conversations/send', { from: user.uid, to: provider.userId, channel: 'account_to_profile', content });
          if (data?.id) navigate(`/konwersacja/${data.id}`);
          else pushAlert?.({ show: true, type: 'success', message: 'Zapytanie wysłane.' });
        } catch (error) {
          if (error.response?.status !== 403) throw error;
          sessionStorage.setItem('draft', content);
          const id = error.response.data?.conversationId;
          navigate(id ? `/konwersacja/${id}` : `/wiadomosc/${provider.userId}`);
        }
      } else {
        const { data } = await api.post('/api/reservations/day', { userId: user.uid, userName: user.displayName || user.email || 'Klient', providerUserId: provider.userId, providerProfileId: provider._id, date: iso(date), ...(kind === 'stay' ? { endDate: iso(endDate) } : {}), ...(kind === 'hours' ? { fromTime, toTime } : {}), description: description.trim(), ...(service ? { serviceId: service._id, serviceName: service.name } : {}) });
        sessionStorage.setItem('flash', JSON.stringify({ type: 'success', message: data?.status === 'zaakceptowana' ? 'Termin potwierdzony. Szczegóły znajdziesz poniżej.' : 'Zgłoszenie wysłane. Czeka na potwierdzenie usługodawcy.', ttl: 6000, ts: Date.now() }));
        navigate('/rezerwacje');
      }
    } catch (error) {
      pushAlert?.({ show: true, type: 'error', message: error.response?.data?.message || 'Nie udało się wysłać zgłoszenia.' });
      if (error.response?.status === 409) setReload(value => value + 1);
    } finally { setSending(false); }
  }
  return <div className={styles.form}>
    <BookingServicePicker label={kind === "order" ? "Wybierz ofertę" : kind === "stay" ? "Wybierz ofertę pobytu" : "Wybierz usługę"} services={services} value={service} onChange={setService} disabled={sending} optional={inquiry} />
    <p className={styles.notice}>{copy.text}</p>
    <label className={styles.toggle}><input type="checkbox" checked={inquiry} disabled={sending} onChange={event => { setInquiry(event.target.checked); setDate(null); setEndDate(null); }} />Tylko zapytanie o termin</label>
    {availability.loading && !inquiry && <p className={styles.hint} role="status">Sprawdzamy dostępność…</p>}
    {availability.error && !inquiry && <p className={styles.notice} role="alert">Nie udało się sprawdzić dostępności. <button type="button" onClick={() => setReload(value => value + 1)}>Spróbuj ponownie</button></p>}
    {services.length && !service && !inquiry ? <p className={styles.notice}>Wybierz usługę, aby sprawdzić dostępne terminy.</p> : <>
      {kind === 'stay' && <p className={styles.hint}>{date && !endDate ? 'Teraz wybierz dzień wyjazdu.' : 'Wybierz dzień przyjazdu, a potem wyjazdu.'}</p>}
      <BookingDatePicker month={currentMonth} onMonthChange={setMonth} value={date} endValue={kind === 'stay' ? endDate : null} onChange={pickDay} disabled={sending || (!inquiry && (availability.loading || availability.error))} isDisabled={disabledDay} />
    </>}
      {kind === 'stay' && date && <label className={styles.field}>Data wyjazdu<input type="date" value={iso(endDate)} min={iso(addDays(date, 1))} disabled={sending} onChange={event => setEndDate(event.target.value ? new Date(event.target.value + 'T12:00:00') : null)} /></label>}
      {kind === 'hours' && date && <div className={styles.timeRange}>
        <label className={styles.field}>Godzina od<input type="time" value={fromTime} min={provider.workingHours?.from || '08:00'} max={provider.workingHours?.to || '20:00'} required disabled={sending} onChange={event => setFromTime(event.target.value)} /></label>
        <label className={styles.field}>Godzina do<input type="time" value={toTime} min={fromTime || provider.workingHours?.from || '08:00'} max={provider.workingHours?.to || '20:00'} required disabled={sending} onChange={event => setToTime(event.target.value)} /></label>
      </div>}
    <form className={styles.review} onSubmit={submit}>
      <label className={styles.field}>Uwagi (opcjonalnie)<textarea rows="3" value={description} disabled={sending} onChange={event => setDescription(event.target.value)} placeholder="Dodatkowe szczegóły, np. smak tortu lub miejsce realizacji" /></label>
      {date && <BookingSummary service={service} date={date} endDate={endDate} kind={kind} time={kind === 'hours' && fromTime && toTime ? `${fromTime}–${toTime}` : null} inquiry={inquiry} />}
      {date && problem && <p className={styles.hint} role="status">{problem}</p>}
      <LoadingButton type="submit" isLoading={sending} disabled={sending || Boolean(problem)} className={styles.submit}>{inquiry ? <FiSend aria-hidden="true" /> : <FiCheckCircle aria-hidden="true" />}{inquiry ? 'Wyślij zapytanie' : copy.action}</LoadingButton>
      <p className={styles.hint}>{inquiry ? 'Zapytanie nie blokuje terminu. Odpowiedź znajdziesz w wiadomościach.' : provider.autoAcceptReservations ? 'Ten profil automatycznie potwierdza zgłoszenia.' : 'Usługodawca potwierdzi zgłoszenie. Status zobaczysz w swoich rezerwacjach.'}</p>
    </form>
  </div>;
}
