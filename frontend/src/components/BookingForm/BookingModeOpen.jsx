// BookingModeOpen.jsx — czyste zapytanie (bez kalendarza)
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './BookingForm.module.scss';
import LoadingButton from '../ui/LoadingButton/LoadingButton';
import { api } from '../../api/api';

const CHANNEL = 'account_to_profile';

export default function BookingModeOpen({ user, provider, pushAlert }) {
  const [subject, setSubject] = useState('Zapytanie o usługę');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    if (sending) return; // ✅ blokada podwójnego kliku
    setSending(true);

    try {
      if (!user?.uid) {
        pushAlert?.({ show: true, type: 'error', message: 'Musisz być zalogowany.' });
        return;
      }

      if (!provider?.userId) {
        pushAlert?.({ show: true, type: 'error', message: 'Brak danych usługodawcy.' });
        return;
      }

      const body = (message || '').trim();
      if (!body) {
        pushAlert?.({ show: true, type: 'error', message: 'Napisz krótką wiadomość.' });
        return;
      }

      const content = [
        subject?.trim() ? `Temat: ${subject.trim()}` : null,
        phone?.trim() ? `Telefon: ${phone.trim()}` : null,
        '',
        body,
      ]
        .filter(Boolean)
        .join('\n');

      const { data } = await api.post('/api/conversations/send', {
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
        return;
      }

      // fallback (gdyby API nie zwróciło id)
      pushAlert?.({ show: true, type: 'success', message: 'Zapytanie wysłane.' });
      setMessage('');
      setPhone('');
    } catch (err) {
      // typowy przypadek: backend mówi "masz już konwersację"
      if (err?.response?.status === 403) {
        const existingId = err?.response?.data?.conversationId || null;

        const draftContent = [
          subject?.trim() ? `Temat: ${subject.trim()}` : null,
          phone?.trim() ? `Telefon: ${phone.trim()}` : null,
          '',
          (message || '').trim(),
        ]
          .filter(Boolean)
          .join('\n');

        sessionStorage.setItem(
          'flash',
          JSON.stringify({
            type: 'info',
            message: 'Masz już otwartą rozmowę z tym użytkownikiem. Kontynuuj w istniejącym wątku.',
            ttl: 6000,
            ts: Date.now(),
          })
        );

        sessionStorage.setItem('draft', draftContent);

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
    } finally {
      setSending(false); // ✅ zawsze odblokuje
    }
  };

  return (
    <>
      <label className={styles.field}>
        <h3 className={styles.fieldTitle}>Temat (opcjonalnie):</h3>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Np. Wycena strony internetowej"
          disabled={sending}
        />
      </label>

      <label className={styles.field}>
        <h3 className={styles.fieldTitle}>Telefon (opcjonalnie):</h3>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Np. 500 600 700"
          disabled={sending}
        />
      </label>

      <label className={styles.field}>
        <h3 className={styles.fieldTitle}>Wiadomość:</h3>
        <textarea
          rows="5"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Opisz krótko czego potrzebujesz, budżet, termin orientacyjny itp."
          disabled={sending}
        />
      </label>

      <LoadingButton
        onClick={handleSubmit}
        isLoading={sending}
        disabled={sending || !(message || '').trim()}
        className={styles.submit}
      >
        Wyślij zapytanie
      </LoadingButton>
    </>
  );
}