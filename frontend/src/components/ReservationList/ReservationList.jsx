// ReservationList.jsx
import { useEffect, useState } from 'react';
import styles from './ReservationList.module.scss';
import axios from 'axios';

const ReservationList = ({ user, resetPendingReservationsCount }) => {
  const [clientReservations, setClientReservations]   = useState([]);
  const [serviceReservations, setServiceReservations] = useState([]);
  const [loading, setLoading]                         = useState(true);

  useEffect(() => {
    const fetchReservations = async () => {
      if (!user?.uid) return;
      try {
        const [resClient, resService] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/api/reservations/by-user/${user.uid}`),
          axios.get(`${process.env.REACT_APP_API_URL}/api/reservations/by-provider/${user.uid}`)
        ]);
        setClientReservations(resClient.data);
        setServiceReservations(resService.data);
      } catch (err) {
        console.error('❌ Błąd pobierania rezerwacji:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReservations();
  }, [user]);

  useEffect(() => {
    if (!loading && resetPendingReservationsCount) {
      resetPendingReservationsCount();
    }
  }, [loading, resetPendingReservationsCount]);

  const handleStatusChange = async (reservationId, newStatus) => {
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_URL}/api/reservations/${reservationId}/status`,
        { status: newStatus }
      );
      // odśwież dane
      const [resClient, resService] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/api/reservations/by-user/${user.uid}`),
        axios.get(`${process.env.REACT_APP_API_URL}/api/reservations/by-provider/${user.uid}`)
      ]);
      setClientReservations(resClient.data);
      setServiceReservations(resService.data);
    } catch (err) {
      console.error('❌ Błąd zmiany statusu rezerwacji:', err);
    }
  };

  if (loading) {
    return <div className={styles.loading}>⏳ Ładowanie rezerwacji...</div>;
  }

  // Funkcja pomocnicza do wyświetlania pól rezerwacji
  const renderFields = (res, type) => (
    <>
      <div className={styles.row}>
        <span className={styles.label}>{type === 'sent' ? 'Do:' : 'Od:'}</span>
        <span className={styles.value}>
          {type === 'sent'
            ? `${res.providerProfileName} (${res.providerProfileRole})`
            : res.userName}
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Data:</span>
        <span className={styles.value}>{res.date}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Godzina:</span>
        <span className={styles.value}>{res.fromTime} – {res.toTime}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Status:</span>
        <span className={`${styles.statusBadge} ${
          res.status === 'zaakceptowana' ? styles.accepted
            : res.status === 'odrzucona'   ? styles.rejected
            : styles.pending
        }`}>
          {res.status}
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Opis:</span>
        <span className={styles.value}>{res.description}</span>
      </div>
    </>
  );

  return (
    <section className={styles.reservationList}>
      <div className={styles.wrapper}>
        <h2 className={styles.title}>Panel rezerwacji</h2>
        <div className={styles.columns}>
          {/* Wysłane rezerwacje */}
          <div className={styles.column}>
            <h3 className={styles.heading}>Wysłane rezerwacje</h3>
            {clientReservations.length === 0 ? (
              <p className={styles.empty}>Brak wysłanych rezerwacji.</p>
            ) : (
              <ul className={styles.list}>
                {clientReservations.map(res => (
                  <li
                    key={res._id}
                    className={`${styles.item} ${
                      res.status === 'zaakceptowana' ? styles.accepted
                        : res.status === 'odrzucona'   ? styles.rejected
                        : styles.pending
                    }`}
                  >
                    {renderFields(res, 'sent')}
                    {res.status === 'oczekująca' && (
                      <div className={styles.actions}>
                        <button
                          onClick={() => handleStatusChange(res._id, 'anulowana')}
                          className={styles.cancel}
                        >
                          ❌ Anuluj
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Otrzymane rezerwacje */}
          <div className={styles.column}>
            <h3 className={styles.heading}>Otrzymane rezerwacje</h3>
            {serviceReservations.length === 0 ? (
              <p className={styles.empty}>Brak otrzymanych rezerwacji.</p>
            ) : (
              <ul className={styles.list}>
                {serviceReservations.map(res => (
                  <li
                    key={res._id}
                    className={`${styles.item} ${
                      res.status === 'zaakceptowana' ? styles.accepted
                        : res.status === 'odrzucona'   ? styles.rejected
                        : styles.pending
                    }`}
                  >
                    {renderFields(res, 'received')}
                    {res.status === 'oczekująca' && (
                      <div className={styles.actions}>
                        <button onClick={() => handleStatusChange(res._id, 'zaakceptowana')}>
                          ✅ Potwierdź
                        </button>
                        <button onClick={() => handleStatusChange(res._id, 'odrzucona')}>
                          ❌ Odrzuć
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReservationList;
