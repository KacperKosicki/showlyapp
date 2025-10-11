// BookingModeOpen.jsx — czyste zapytanie (bez kalendarza)
import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styles from './BookingForm.module.scss';

const CHANNEL = 'account_to_profile';

export default function BookingModeOpen({ user, provider, pushAlert }) {
  const [subject, setSubject] = useState('Zapytanie o usługę');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!user?.uid) {
      return pushAlert?.({ show: true, type: 'error', message: 'Musisz być zalogowany.' });
    }
    const body = (message || '').trim();
    if (!body) {
      return pushAlert?.({ show: true, type: 'error', message: 'Napisz krótką wiadomość.' });
    }

    const content = [
      subject?.trim() ? `Temat: ${subject.trim()}` : null,
      phone?.trim() ? `Telefon: ${phone.trim()}` : null,
      '',
      body,
    ].filter(Boolean).join('\n');

    try {
      setSending(true);

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
        return;
      }

      pushAlert?.({ show: true, type: 'success', message: 'Zapytanie wysłane.' });
      setMessage('');
      setPhone('');
    } catch (err) {
      if (err?.response?.status === 403) {
        const existingId = err?.response?.data?.conversationId || null;

        sessionStorage.setItem('flash', JSON.stringify({
          type: 'info',
          message: 'Masz już otwartą rozmowę z tym użytkownikiem. Kontynuuj w istniejącym wątku.',
          ttl: 6000,
          ts: Date.now(),
        }));
        sessionStorage.setItem('draft', content);

        navigate(
          existingId ? `/konwersacja/${existingId}` : `/wiadomosc/${provider.userId}`,
          { state: { scrollToId: 'threadPageLayout' } }
        );
        return;
      }
      pushAlert?.({ show: true, type: 'error', message: 'Nie udało się wysłać zapytania.' });
    } finally {
      setSending(false);
    }
  };

  // ⤵️ tylko zawartość (bez własnego <section>/<div className="wrapper">)
  return (
    <>
      <label className={styles.field}>
        <h3 className={styles.fieldTitle}>Temat (opcjonalnie):</h3>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Np. Wycena strony internetowej"
        />
      </label>

      <label className={styles.field}>
        <h3 className={styles.fieldTitle}>Telefon (opcjonalnie):</h3>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="Np. 500 600 700"
        />
      </label>

      <label className={styles.field}>
        <h3 className={styles.fieldTitle}>Wiadomość:</h3>
        <textarea
          rows="5"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Opisz krótko czego potrzebujesz, budżet, termin orientacyjny itp."
        />
      </label>

      <button
        onClick={handleSubmit}
        className={styles.submit}
        disabled={sending}
        aria-busy={sending}
      >
        {sending ? 'Wysyłanie…' : 'Wyślij zapytanie'}
      </button>
    </>
  );
}
