// BookingModeDay.jsx — kalendarz “dniowy” (bez slotów) + opcjonalna usługa
import { useEffect, useMemo, useState } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, getDay,
  addMonths, subMonths, isSameDay, startOfDay, isBefore
} from 'date-fns';
import { pl } from 'date-fns/locale';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styles from './BookingForm.module.scss';
import LoadingButton from "../ui/LoadingButton/LoadingButton";

const CHANNEL = 'account_to_profile';

export default function BookingModeDay({ user, provider, pushAlert }) {
  const [unavailableDays, setUnavailableDays] = useState([]); // ['YYYY-MM-DD']
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setDate] = useState(null);
  const [selectedService, setService] = useState(null);
  const [onlyInquiry, setOnlyInquiry] = useState(false);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Dni niedostępne
  useEffect(() => {
    const loadUnavailable = async () => {
      try {
        const { data } = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/reservations/unavailable-days/${provider.userId}`
        );
        setUnavailableDays(Array.isArray(data) ? data : []);
      } catch { /* cicho – walidacja przy submit */ }
    };
    loadUnavailable();
  }, [provider.userId]);

  const isUnavailable = (yyyyMmDd) => unavailableDays.includes(yyyyMmDd);

  // Siatka miesięcy
  const daysInMonth = useMemo(() => (
    eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  ), [currentMonth]);

  const startDayIndex = useMemo(() => getDay(startOfMonth(currentMonth)), [currentMonth]);

  // Czy dzień aktywny do wyboru
  const isDayActive = (day) => {
    const past = isBefore(startOfDay(day), startOfDay(new Date()));
    const dateStr = format(day, 'yyyy-MM-dd');
    const blocked = isUnavailable(dateStr);
    const respectsWorkingDays = Array.isArray(provider.workingDays) && provider.workingDays.length
      ? provider.workingDays.includes(getDay(day))
      : true;
    return !past && !blocked && respectsWorkingDays;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (!user?.uid) {
        pushAlert?.({ show: true, type: 'error', message: 'Musisz być zalogowany.' });
        return;
      }
      if (!selectedDate) {
        pushAlert?.({ show: true, type: 'error', message: 'Wybierz dzień.' });
        return;
      }

      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // A) Tylko zapytanie → rozmowa
      if (onlyInquiry) {
        const content = [
          `Zapytanie o dostępność dnia ${dateStr}`,
          selectedService ? `Usługa: ${selectedService.name}` : null,
          description?.trim() ? `Opis:\n${description.trim()}` : null,
        ].filter(Boolean).join('\n\n');

        try {
          const { data } = await axios.post(`${process.env.REACT_APP_API_URL}/api/conversations/send`, {
            from: user.uid,
            to: provider.userId,
            channel: CHANNEL,
            content,
          });

          if (data?.id) {
            sessionStorage.setItem('flash', JSON.stringify({
              type: 'success',
              message: 'Twoje zapytanie zostało wysłane.',
              ttl: 6000,
              ts: Date.now(),
            }));

            sessionStorage.setItem('optimisticMessage', JSON.stringify({
              _id: `temp-${Date.now()}`,
              from: user.uid,
              to: provider.userId,
              channel: CHANNEL,
              content,
              createdAt: new Date().toISOString(),
              pending: true,
            }));

            navigate(`/konwersacja/${data.id}`, { state: { scrollToId: 'threadPageLayout' } });
          }
        } catch (err) {
          if (err?.response?.status === 403) {
            const existingId = err?.response?.data?.conversationId || null;

            sessionStorage.setItem('flash', JSON.stringify({
              type: 'info',
              message: 'Masz już otwartą rozmowę z tym użytkownikiem. Kontynuuj w istniejącym wątku.',
              ttl: 6000,
              ts: Date.now(),
            }));

            sessionStorage.setItem('draft', [
              `Zapytanie o dostępność dnia ${dateStr}`,
              selectedService ? `Usługa: ${selectedService.name}` : null,
              description?.trim() ? `Opis:\n${description.trim()}` : null,
            ].filter(Boolean).join('\n\n'));

            navigate(
              existingId ? `/konwersacja/${existingId}` : `/wiadomosc/${provider.userId}`,
              { state: { scrollToId: 'threadPageLayout' } }
            );
            return;
          }

          pushAlert?.({ show: true, type: 'error', message: 'Nie udało się wysłać zapytania.' });
        }

        return;
      }

      // B) Rezerwacja całego dnia
      if (isUnavailable(dateStr)) {
        pushAlert?.({ show: true, type: 'error', message: 'Ten dzień jest niedostępny. Użyj "Tylko zapytanie".' });
        return;
      }

      const payload = {
        userId: user.uid,
        userName: user.displayName || user.email || 'Użytkownik',
        providerUserId: provider.userId,
        providerName: provider.name || 'Usługodawca',
        providerProfileId: provider._id,
        providerProfileName: provider.name || '',
        providerProfileRole: provider.role || '',
        date: dateStr,
        description: (description || '').trim(),
        ...(selectedService?._id ? { serviceId: selectedService._id, serviceName: selectedService.name } : {}),
      };

      await axios.post(`${process.env.REACT_APP_API_URL}/api/reservations/day`, payload);

      sessionStorage.setItem('flash', JSON.stringify({
        type: 'success',
        message: 'Wysłano prośbę o rezerwację dnia – oczekuje na potwierdzenie.',
        ttl: 6000,
        ts: Date.now(),
      }));

      navigate('/rezerwacje');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Nie udało się utworzyć rezerwacji dnia.';
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
          onChange={e => setDescription(e.target.value)}
          placeholder="Opisz, czego potrzebujesz w danym dniu…"
        />
      </label>

      {/* (Opcjonalnie) wybór usługi */}
      {Array.isArray(provider.services) && provider.services.length > 0 && (
        <label className={styles.field}>
          <h3 className={styles.fieldTitle}>Wybierz usługę (opcjonalnie):</h3>
          <select
            value={selectedService?._id || ''}
            onChange={e => {
              const svc = provider.services.find(s => s._id === e.target.value);
              setService(svc || null);
            }}
          >
            <option value="">– bez wyboru –</option>
            {provider.services.map(s => (
              <option key={s._id} value={s._id}>
                {s.name}
                {s.duration?.value ? ` • ${s.duration.value} ${s.duration.unit === 'minutes' ? 'min' :
                  s.duration.unit === 'hours' ? 'godz.' :
                    s.duration.unit === 'days' ? 'dni' : s.duration.unit
                  }` : ''}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Nawigacja miesięcy */}
      <div className={styles.monthNav}>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          &lt;
        </button>

        <span>{format(currentMonth, 'LLLL yyyy', { locale: pl })}</span>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          &gt;
        </button>
      </div>


      {/* Siatka kalendarza (bez slotów) */}
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
          const dateStr = format(day, 'yyyy-MM-dd');
          const unavailable = isUnavailable(dateStr);

          return (
            <button
              key={day.toISOString()}
              className={`${styles.day} ${(!active || unavailable) ? styles.disabledDay : ''} ${sel ? styles.selectedDay : ''}`}
              disabled={!active || isSubmitting}
              onClick={() => !isSubmitting && active && setDate(day)}
              title={unavailable ? 'Dzień niedostępny' : ''}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {/* Info o niedostępnych (lista) */}
      {unavailableDays.length > 0 && (
        <div className={styles.infoBox}>
          Niedostępne: {unavailableDays.join(', ')}
        </div>
      )}

      {/* Przełącznik „tylko zapytanie” */}
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
          Ten dzień jest niedostępny – prześlij „Tylko zapytanie”.
        </div>
      )}

      <LoadingButton
        onClick={handleSubmit}
        isLoading={isSubmitting}
        disabled={!selectedDate || isSubmitting}
        className={styles.submit}
      >
        {onlyInquiry ? 'Wyślij zapytanie' : 'Rezerwuj termin'}
      </LoadingButton>
    </>
  );
}
