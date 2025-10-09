// BookingForm.jsx (kontroler trybu)
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './BookingForm.module.scss';
import AlertBox from '../AlertBox/AlertBox';
import BookingModeCalendar from './BookingModeCalendar';
import BookingModeDay from './BookingModeDay';
import BookingModeOpen from './BookingModeOpen';

export default function BookingForm({ user }) {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  // 1) Załaduj profil
  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_API_URL}/api/profiles/slug/${slug}`)
      .then(({ data }) => {
        data.workingDays = (data.workingDays || []).map(Number);
        setProvider(data);
      })
      .catch(() => {
        setAlert({ show: true, type: 'error', message: 'Nie udało się załadować profilu.' });
      });
  }, [slug]);

  // 2) Redirect gdy ukryte
  useEffect(() => {
    if (provider?.showAvailableDates === false) {
      navigate('/', { replace: true });
    }
  }, [provider, navigate]);

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

          {/* Wspólny opis przekazywany i obsługiwany wewnątrz trybów */}
          {mode === 'calendar' && (
            <BookingModeCalendar user={user} provider={provider} pushAlert={setAlert} />
          )}

          {mode === 'request-blocking' && (
            <BookingModeDay user={user} provider={provider} pushAlert={setAlert} />
          )}

          {mode === 'request-open' && (
            <BookingModeOpen user={user} provider={provider} pushAlert={setAlert} />
          )}
        </section>
      </div>
    </>
  );
}
