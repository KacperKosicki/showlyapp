import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // dodaj useNavigate
import styles from './BookingForm.module.scss';
import axios from 'axios';

const BookingForm = ({ user }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [reservedSlots, setReservedSlots] = useState([]); // ⬅️ nowość
  const [mode, setMode] = useState('select');
  const [selectedSlot, setSelectedSlot] = useState('');

  const [form, setForm] = useState({
    date: '',
    fromTime: '',
    toTime: '',
    duration: 60,
    description: '',
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Pobieranie danych usługodawcy i jego dostępnych terminów
  useEffect(() => {
    const fetchProviderData = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/profiles/slug/${slug}`);
        setProvider(res.data);
        setAvailableDates(res.data.availableDates || []);
      } catch (err) {
        console.error('❌ Błąd pobierania danych usługodawcy:', err);
        setError('Nie udało się załadować danych usługodawcy.');
      }
    };

    fetchProviderData();

    const interval = setInterval(() => {
      fetchProviderData();
    }, 10000);

    return () => clearInterval(interval);
  }, [slug]);

  // Blokada wejścia na formularz rezerwacji jeśli wyłączone
  useEffect(() => {
    if (provider && provider.showAvailableDates === false) {
      // Możesz wyświetlić krótki komunikat, ale przekieruje od razu
      navigate('/', { replace: true });
    }
  }, [provider, navigate]);

  // Pobieranie zaakceptowanych rezerwacji (zajętych slotów)
  useEffect(() => {
    const fetchReservedSlots = async () => {
      if (!provider?.userId) return;
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/reservations/by-provider/${provider.userId}`);
        const confirmed = res.data.filter(r => r.status === 'zaakceptowana');
        setReservedSlots(confirmed);
      } catch (err) {
        console.error('❌ Błąd pobierania zajętych terminów:', err);
      }
    };

    fetchReservedSlots();

    const interval = setInterval(() => {
      fetchReservedSlots();
    }, 10000);

    return () => clearInterval(interval);
  }, [provider]);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.date || !form.fromTime || !form.toTime || !provider) {
      setError('Uzupełnij wszystkie wymagane pola.');
      return;
    }

    const overlapsWithReserved = reservedSlots.some(res =>
      res.date === form.date &&
      (
        (form.fromTime >= res.fromTime && form.fromTime < res.toTime) ||
        (form.toTime > res.fromTime && form.toTime <= res.toTime) ||
        (form.fromTime <= res.fromTime && form.toTime >= res.toTime)
      )
    );

    if (overlapsWithReserved) {
      setError('❌ Wybrany termin koliduje z już zarezerwowanym terminem.');
      return;
    }

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/reservations`, {
        userId: user.uid,
        providerUserId: provider.userId,
        providerProfileId: provider._id,
        date: form.date,
        fromTime: form.fromTime,
        toTime: form.toTime,
        duration: form.duration,
        description: form.description
      });

      setMessage('✅ Rezerwacja wysłana. Oczekuj odpowiedzi.');
      setForm({
        date: '',
        fromTime: '',
        toTime: '',
        duration: 60,
        description: '',
      });
      setSelectedSlot('');
    } catch (err) {
      console.error(err);
      setError('❌ Wystąpił błąd przy wysyłaniu.');
    }
  };

  if (!provider) {
    return <div className={styles.loading}>🔄 Trwa ładowanie danych profilu...</div>;
  }

  // Możesz opcjonalnie wyświetlić komunikat zanim przekieruje
  if (provider.showAvailableDates === false) {
    return <div className={styles.error}>Rezerwacje są wyłączone dla tego profilu. Przekierowanie...</div>;
  }

  return (
    <section className={styles.section}>
      <div className={styles.wrapper}>
        <h2>Zarezerwuj termin</h2>

        <div className={styles.modeToggle}>
          <button
            type="button"
            className={mode === 'select' ? styles.active : ''}
            onClick={() => setMode('select')}
          >
            Wybierz z dostępnych terminów
          </button>
          <button
            type="button"
            className={mode === 'custom' ? styles.active : ''}
            onClick={() => setMode('custom')}
          >
            Zaproponuj własny termin
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'select' ? (
            <label>
              Dostępne terminy:
              <select
                value={selectedSlot}
                onChange={(e) => {
                  const [date, fromTime, toTime] = e.target.value.split('|');
                  setSelectedSlot(e.target.value);
                  setForm((prev) => ({ ...prev, date, fromTime, toTime }));
                }}
              >
                <option value="">-- Wybierz termin --</option>
                {availableDates
                  .filter((slot) => {
                    return !reservedSlots.some(res =>
                      res.date === slot.date &&
                      res.fromTime === slot.fromTime &&
                      res.toTime === slot.toTime
                    );
                  })
                  .map((slot, i) => (
                    <option key={i} value={`${slot.date}|${slot.fromTime}|${slot.toTime}`}>
                      {`${slot.date} | ${slot.fromTime} – ${slot.toTime}`}
                    </option>
                  ))}
              </select>
            </label>
          ) : (
            <>
              <label>Data:
                <input type="date" name="date" value={form.date} onChange={handleChange} required />
              </label>
              <label>Godzina od:
                <input type="time" name="fromTime" value={form.fromTime} onChange={handleChange} required />
              </label>
              <label>Godzina do:
                <input type="time" name="toTime" value={form.toTime} onChange={handleChange} required />
              </label>
            </>
          )}

          <label>Opis usługi:
            <textarea name="description" value={form.description} onChange={handleChange} rows="3" />
          </label>

          {message && <p className={styles.success}>{message}</p>}
          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitButton}>Wyślij rezerwację</button>
        </form>
      </div>
    </section>
  );
};

export default BookingForm;
