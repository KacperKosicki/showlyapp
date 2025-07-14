import { useEffect, useState } from 'react';
import styles from './ReservationList.module.scss';
import axios from 'axios';

const ReservationList = ({ user }) => {
  const [clientReservations, setClientReservations] = useState([]);
  const [serviceReservations, setServiceReservations] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleStatusChange = async (reservationId, newStatus) => {
    try {
      await axios.patch(`${process.env.REACT_APP_API_URL}/api/reservations/${reservationId}/status`, {
        status: newStatus
      });

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

  return (
    <section className={styles.reservationList}>
      <div className={styles.wrapper}>
        <h2 className={styles.title}>Panel rezerwacji</h2>
        <div className={styles.columns}>
          <div className={styles.column}>
            <h3 className={styles.heading}>Wysłane rezerwacje</h3>
            {clientReservations.length === 0 ? (
              <p className={styles.empty}>Brak wysłanych rezerwacji.</p>
            ) : (
              <ul className={styles.list}>
                {clientReservations.map(res => (
                  <li key={res._id} className={styles.item}>
                    <div className={styles.row}><strong>Do:</strong> {res.providerProfileName} ({res.providerProfileRole})</div>
                    <div className={styles.row}><strong>Data:</strong> {res.date}</div>
                    <div className={styles.row}><strong>Godzina:</strong> {res.fromTime} – {res.toTime}</div>
                    <div className={styles.row}><strong>Status:</strong> {res.status}</div>
                    <div className={styles.row}><strong>Opis:</strong> {res.description}</div>

                    {res.status === 'oczekująca' && (
                      <div className={styles.actions}>
                        <button onClick={() => handleStatusChange(res._id, 'anulowana')} className={styles.cancel}>
                          ❌ Anuluj
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.column}>
            <h3 className={styles.heading}>Otrzymane rezerwacje</h3>
            {serviceReservations.length === 0 ? (
              <p className={styles.empty}>Brak otrzymanych rezerwacji.</p>
            ) : (
              <ul className={styles.list}>
                {serviceReservations.map(res => (
                  <li key={res._id} className={styles.item}>
                    <div className={styles.row}><strong>Od:</strong> {res.userName}</div>
                    <div className={styles.row}><strong>Data:</strong> {res.date}</div>
                    <div className={styles.row}><strong>Godzina:</strong> {res.fromTime} – {res.toTime}</div>
                    <div className={styles.row}><strong>Status:</strong> {res.status}</div>
                    <div className={styles.row}><strong>Opis:</strong> {res.description}</div>

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
