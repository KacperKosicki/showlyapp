// BookingModeDay.jsx — kalendarz “dniowy” (bez slotów) + usługa wymagana do rezerwacji dnia (gdy są usługi)
import { useEffect, useMemo, useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  startOfDay,
  isBefore,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import styles from './BookingForm.module.scss';
import LoadingButton from '../ui/LoadingButton/LoadingButton';
import { api } from '../../api/api';

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

  // ✅ logika: jeśli profil ma usługi i NIE jest to "Tylko zapytanie" → usługa wymagana
  const hasServices = Array.isArray(provider?.services) && provider.services.length > 0;
  const serviceRequiredForBooking = hasServices && !onlyInquiry;

  // Dni niedostępne (PUBLIC endpoint)
  useEffect(() => {
    const loadUnavailable = async () => {
      try {
        if (!provider?.userId) return;
        const { data } = await api.get(`/api/reservations/unavailable-days/${provider.userId}`);
        setUnavailableDays(Array.isArray(data) ? data : []);
      } catch {
        // cicho – walidacja i tak jest przy submit
        setUnavailableDays([]);
      }
    };
    loadUnavailable();
  }, [provider?.userId]);

  const isUnavailable = (yyyyMmDd) => unavailableDays.includes(yyyyMmDd);

  // Siatka miesięcy
  const daysInMonth = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
      }),
    [currentMonth]
  );

  const startDayIndex = useMemo(() => getDay(startOfMonth(currentMonth)), [currentMonth]);

  // Czy dzień aktywny do wyboru
  const isDayActive = (day) => {
    // ✅ jeżeli rezerwujemy dzień i są usługi → najpierw wybierz usługę
    if (serviceRequiredForBooking && !selectedService) return false;

    const past = isBefore(startOfDay(day), startOfDay(new Date()));
    const dateStr = format(day, 'yyyy-MM-dd');
    const blocked = isUnavailable(dateStr);

    const respectsWorkingDays =
      Array.isArray(provider?.workingDays) && provider.workingDays.length
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

      // A) Tylko zapytanie → rozmowa (usługa opcjonalna)
      if (onlyInquiry) {
        const content = [
          `Zapytanie o dostępność dnia ${dateStr}`,
          selectedService ? `Usługa: ${selectedService.name}` : null,
          description?.trim() ? `Opis:\n${description.trim()}` : null,
        ]
          .filter(Boolean)
          .join('\n\n');

        try {
          const { data } = await api.post(`/api/conversations/send`, {
            from: user.uid,
            to: provider.userId,
            channel: CHANNEL,
            content,
          });

          if (data?.id) {
            sessionStorage.setItem(
              'flash',
              JSON.stringify({
                type: 'success',
                message: 'Twoje zapytanie zostało wysłane.',
                ttl: 6000,
                ts: Date.now(),
              })
            );

            sessionStorage.setItem(
              'optimisticMessage',
              JSON.stringify({
                _id: `temp-${Date.now()}`,
                from: user.uid,
                to: provider.userId,
                channel: CHANNEL,
                content,
                createdAt: new Date().toISOString(),
                pending: true,
              })
            );

            navigate(`/konwersacja/${data.id}`, { state: { scrollToId: 'threadPageLayout' } });
          }
        } catch (err) {
          if (err?.response?.status === 403) {
            const existingId = err?.response?.data?.conversationId || null;

            sessionStorage.setItem(
              'flash',
              JSON.stringify({
                type: 'info',
                message:
                  'Masz już otwartą rozmowę z tym użytkownikiem. Kontynuuj w istniejącym wątku.',
                ttl: 6000,
                ts: Date.now(),
              })
            );

            sessionStorage.setItem(
              'draft',
              [
                `Zapytanie o dostępność dnia ${dateStr}`,
                selectedService ? `Usługa: ${selectedService.name}` : null,
                description?.trim() ? `Opis:\n${description.trim()}` : null,
              ]
                .filter(Boolean)
                .join('\n\n')
            );

            navigate(existingId ? `/konwersacja/${existingId}` : `/wiadomosc/${provider.userId}`, {
              state: { scrollToId: 'threadPageLayout' },
            });
            return;
          }

          const msg =
            err?.response?.data?.message ||
            (err?.response?.status === 401 ? 'Brak autoryzacji (401). Zaloguj się ponownie.' : null) ||
            'Nie udało się wysłać zapytania.';
          pushAlert?.({ show: true, type: 'error', message: msg });
        }

        return;
      }

      // B) Rezerwacja całego dnia
      if (serviceRequiredForBooking && !selectedService) {
        pushAlert?.({
          show: true,
          type: 'error',
          message: 'Wybierz usługę, aby zarezerwować dzień.',
        });
        return;
      }

      if (isUnavailable(dateStr)) {
        pushAlert?.({
          show: true,
          type: 'error',
          message: 'Ten dzień jest niedostępny. Użyj "Tylko zapytanie".',
        });
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
        ...(selectedService?._id
          ? { serviceId: selectedService._id, serviceName: selectedService.name }
          : {}),
      };

      await api.post(`/api/reservations/day`, payload);

      sessionStorage.setItem(
        'flash',
        JSON.stringify({
          type: 'success',
          message: 'Wysłano prośbę o rezerwację dnia – oczekuje na potwierdzenie.',
          ttl: 6000,
          ts: Date.now(),
        })
      );

      navigate('/rezerwacje');
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 401 ? 'Brak autoryzacji (401). Zaloguj się ponownie.' : null) ||
        'Nie udało się utworzyć rezerwacji dnia.';
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
          placeholder="Opisz, czego potrzebujesz w danym dniu…"
        />
      </label>

      {/* wybór usługi */}
      {hasServices && (
        <label className={styles.field}>
          <h3 className={styles.fieldTitle}>
            {onlyInquiry ? 'Wybierz usługę (opcjonalnie):' : 'Wybierz usługę (wymagane):'}
          </h3>
          <select
            value={selectedService?._id || ''}
            onChange={(e) => {
              const svc = (provider.services || []).find(
                (s) => String(s._id) === String(e.target.value)
              );
              setService(svc || null);
              setDate(null); // ✅ reset wyboru dnia po zmianie usługi
            }}
          >
            <option value="">{onlyInquiry ? '– bez wyboru –' : '— wybierz usługę —'}</option>

            {(provider.services || []).map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
                {s.duration?.value
                  ? ` • ${s.duration.value} ${
                      s.duration.unit === 'minutes'
                        ? 'min'
                        : s.duration.unit === 'hours'
                        ? 'godz.'
                        : s.duration.unit === 'days'
                        ? 'dni'
                        : s.duration.unit
                    }`
                  : ''}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* ✅ komunikat: blokada dni do czasu wyboru usługi (tylko przy rezerwacji dnia) */}
      {serviceRequiredForBooking && !selectedService && (
        <div className={styles.warnBox}>
          Najpierw wybierz usługę — dopiero potem wybierzesz dzień do rezerwacji.
        </div>
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
          const dateStr = format(day, 'yyyy-MM-dd');
          const unavailable = isUnavailable(dateStr);

          return (
            <button
              key={day.toISOString()}
              className={`${styles.day} ${!active || unavailable ? styles.disabledDay : ''} ${
                sel ? styles.selectedDay : ''
              }`}
              disabled={!active || isSubmitting}
              onClick={() => !isSubmitting && active && setDate(day)}
              title={
                unavailable
                  ? 'Dzień niedostępny'
                  : serviceRequiredForBooking && !selectedService
                  ? 'Najpierw wybierz usługę'
                  : ''
              }
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {/* Info o niedostępnych (lista) */}
      {unavailableDays.length > 0 && (
        <div className={styles.infoBox}>Niedostępne: {unavailableDays.join(', ')}</div>
      )}

      {/* Przełącznik „tylko zapytanie” */}
      <div className={styles.toggleRow}>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={onlyInquiry}
            onChange={() => {
              setOnlyInquiry((v) => !v);
              setDate(null); // ✅ po zmianie trybu resetujemy wybór dnia
            }}
          />
          Tylko zapytanie (bez blokowania dnia)
        </label>
      </div>

      {!!selectedDate && isUnavailable(format(selectedDate, 'yyyy-MM-dd')) && !onlyInquiry && (
        <div className={styles.warnBox}>Ten dzień jest niedostępny – prześlij „Tylko zapytanie”.</div>
      )}

      <LoadingButton
        onClick={handleSubmit}
        isLoading={isSubmitting}
        disabled={!selectedDate || isSubmitting || (serviceRequiredForBooking && !selectedService)}
        className={styles.submit}
      >
        {onlyInquiry ? 'Wyślij zapytanie' : 'Rezerwuj termin'}
      </LoadingButton>
    </>
  );
}