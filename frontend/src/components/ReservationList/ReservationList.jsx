import { useEffect, useState, useCallback } from 'react';
import styles from './ReservationList.module.scss';
import axios from 'axios';
import AlertBox from '../AlertBox/AlertBox';

// --- Countdown z onExpire (po wybiciu 0 wywoła onExpire) ---
function Countdown({ until, onExpire }) {
  const [txt, setTxt] = useState('');

  useEffect(() => {
    let fired = false;

    const toLabel = (ms) => {
      if (ms <= 0) return '00:00';
      const s = Math.floor(ms / 1000);
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      return `${mm}:${ss}`;
    };

    const tick = () => {
      const ms = new Date(until).getTime() - Date.now();
      setTxt(toLabel(ms));
      if (ms <= 0 && !fired) {
        fired = true;
        onExpire?.();
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until, onExpire]);

  return (
    <div className={styles.countdown}>
      Wygasa za: <strong>{txt}</strong>
    </div>
  );
}

const ReservationList = ({ user, resetPendingReservationsCount }) => {
  const [clientReservations, setClientReservations] = useState([]);
  const [serviceReservations, setServiceReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  // toast (AlertBox)
  const [alert, setAlert] = useState({ show: false, type: 'info', message: '', onClose: null });

  // blokada podwójnych kliknięć
  const [disabledIds, setDisabledIds] = useState(new Set());

  const safeParse = (str) => {
    try { return JSON.parse(str); } catch { return null; }
  };

  const refetch = useCallback(async () => {
    if (!user?.uid) return;
    const [resClient, resService] = await Promise.all([
      axios.get(`${process.env.REACT_APP_API_URL}/api/reservations/by-user/${user.uid}`),
      axios.get(`${process.env.REACT_APP_API_URL}/api/reservations/by-provider/${user.uid}`)
    ]);
    setClientReservations(resClient.data);
    setServiceReservations(resService.data);
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        await refetch();
      } catch (err) {
        console.error('❌ Błąd pobierania rezerwacji:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [refetch]);

  useEffect(() => {
    if (!loading && resetPendingReservationsCount) {
      resetPendingReservationsCount();
    }
  }, [loading, resetPendingReservationsCount]);

  // 🔔 Pokaż flash po wejściu (np. po przekierowaniu z formularza rezerwacji)
  useEffect(() => {
    if (loading) return;
    const raw = sessionStorage.getItem('flash');
    const flash = safeParse(raw);
    if (!flash) return;

    const age = Date.now() - (flash.ts || 0);
    const ttl = flash.ttl ?? 6000;
    if (age < ttl) {
      const remaining = ttl - age;
      setAlert({
        show: true,
        type: flash.type || 'info',
        message: flash.message || '',
        onClose: () => {
          setAlert(a => ({ ...a, show: false }));
          sessionStorage.removeItem('flash');
        }
      });
      const tid = setTimeout(() => {
        setAlert(a => ({ ...a, show: false }));
        sessionStorage.removeItem('flash');
      }, remaining);
      return () => clearTimeout(tid);
    } else {
      sessionStorage.removeItem('flash');
    }
  }, [loading]);

  // delikatny polling co 30s, kiedy są oczekujące
  useEffect(() => {
    const hasPendings =
      clientReservations.some(r => r.status === 'oczekująca') ||
      serviceReservations.some(r => r.status === 'oczekująca');

    if (!hasPendings) return;
    const id = setInterval(() => { refetch(); }, 30000);
    return () => clearInterval(id);
  }, [clientReservations, serviceReservations, refetch]);

  const withToastAndRefresh = (type, message, unlockId) => {
    const onClose = async () => {
      setAlert(a => ({ ...a, show: false }));
      await refetch();
      if (unlockId) {
        setDisabledIds(prev => {
          const next = new Set(prev);
          next.delete(unlockId);
          return next;
        });
      }
    };
    setAlert({ show: true, type, message, onClose });
  };

  const handleStatusChange = async (reservationId, newStatus) => {
    try {
      setDisabledIds(prev => new Set(prev).add(reservationId));

      await axios.patch(
        `${process.env.REACT_APP_API_URL}/api/reservations/${reservationId}/status`,
        { status: newStatus }
      );

      if (newStatus === 'anulowana') {
        withToastAndRefresh('warning', 'Rezerwacja anulowana – slot zwolniony.', reservationId);
        return;
      }
      if (newStatus === 'odrzucona') {
        withToastAndRefresh('warning', 'Rezerwacja odrzucona – slot zwolniony.', reservationId);
        return;
      }
      if (newStatus === 'zaakceptowana') {
        setAlert({ show: true, type: 'success', message: 'Pomyślnie potwierdzono rezerwację.', onClose: null });
        await refetch();
        setDisabledIds(prev => {
          const next = new Set(prev);
          next.delete(reservationId);
          return next;
        });
        return;
      }

      withToastAndRefresh('info', 'Status zaktualizowany.', reservationId);
    } catch (err) {
      console.error('❌ Błąd zmiany statusu rezerwacji:', err);
      setAlert({ show: true, type: 'error', message: 'Nie udało się zmienić statusu.', onClose: null });
      setDisabledIds(prev => {
        const next = new Set(prev);
        next.delete(reservationId);
        return next;
      });
    }
  };

  // oznacz „przeczytane” i optymistycznie schowaj z listy
  const markSeen = async (id, who) => {
    try {
      await axios.patch(`${process.env.REACT_APP_API_URL}/api/reservations/${id}/seen`, { who });
      if (who === 'client') {
        setClientReservations(prev => prev.filter(r => r._id !== id));
      } else {
        setServiceReservations(prev => prev.filter(r => r._id !== id));
      }
    } catch (e) {
      console.error('❌ markSeen error', e);
    }
  };

  // auto odśwież po wybiciu timera (serwer sam zamknie „oczekującą” jako expired)
  const handleExpire = () => {
    refetch();
  };

  // 1) helper nad renderFields
  const timeLabel = (res) => {
    const whole = res.dateOnly || (res.fromTime === '00:00' && res.toTime === '23:59');
    return whole ? 'cały dzień' : `${res.fromTime} – ${res.toTime}`;
  };

  if (loading) {
    return <div className={styles.loading}>⏳ Ładowanie rezerwacji...</div>;
  }

  // boks informacyjny dla zamkniętych (anulowana/odrzucona/wygasła)
  const renderClosedInfo = (res, viewer) => {
    // viewer: 'sent' (klient patrzy na wysłane) | 'received' (usługodawca patrzy na otrzymane)
    if (!['anulowana', 'odrzucona'].includes(res.status)) return null;

    const who = viewer === 'sent' ? 'client' : 'provider';
    const unseen = viewer === 'sent' ? !res.clientSeen : !res.providerSeen;
    if (!unseen) return null;

    const label =
      res.closedReason === 'expired'
        ? 'Rezerwacja wygasła (brak potwierdzenia w czasie).'
        : res.status === 'anulowana'
          ? 'Klient anulował rezerwację.'
          : 'Usługodawca odrzucił rezerwację.';

    return (
      <div className={styles.closedInfo}>
        <span>{label}</span>
        <button
          className={styles.seenBtn}
          onClick={() => markSeen(res._id, who)}
        >
          OK, widzę
        </button>
      </div>
    );
  };

  // ✅ Preferuj nazwę profilu nad mailem w „Od:”
  const senderLabel = (res) => {
    return res.userProfileName?.trim()
      ? res.userProfileName
      : (res.userName || 'Użytkownik');
  };

  // Funkcja pomocnicza do wyświetlania pól rezerwacji
  const renderFields = (res, type) => (
    <>
      <div className={styles.row}>
        <span className={styles.label}>{type === 'sent' ? 'Do:' : 'Od:'}</span>
        <span className={styles.value}>
          {type === 'sent'
            ? `${res.providerProfileName} (${res.providerProfileRole})`
            : senderLabel(res)}
        </span>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Data:</span>
        <span className={styles.value}>{res.date}</span>
      </div>

      {/* JEDEN wiersz „Godzina” z ładną etykietą */}
      <div className={styles.row}>
        <span className={styles.label}>Godzina:</span>
        <span className={styles.value}>{timeLabel(res)}</span>
      </div>

      {res.serviceName && (
        <div className={styles.row}>
          <span className={styles.label}>Usługa:</span>
          <span className={styles.value}>{res.serviceName}</span>
        </div>
      )}

      <div className={styles.row}>
        <span className={styles.label}>Status:</span>
        <span
          className={`${styles.statusBadge} ${
            res.status === 'zaakceptowana'
              ? styles.accepted
              : res.status === 'odrzucona' || res.status === 'anulowana'
              ? styles.rejected
              : styles.pending
          }`}
        >
          {res.status}
        </span>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Opis:</span>
        <span className={`${styles.value} ${styles.pre}`}>
          {res.description?.trim() ? res.description : '—'}
        </span>
      </div>

      {res.status === 'oczekująca' && res.pendingExpiresAt && (
        <Countdown until={res.pendingExpiresAt} onExpire={handleExpire} />
      )}

      {renderClosedInfo(res, type === 'sent' ? 'sent' : 'received')}
    </>
  );

  return (
    <section className={styles.reservationList}>
      {/* TOAST */}
      {alert.show && (
        <AlertBox
          type={alert.type}
          message={alert.message}
          onClose={alert.onClose || (() => setAlert(a => ({ ...a, show: false })))}
        />
      )}

      <div className={styles.wrapper}>
        <h2 className={styles.title}>Panel rezerwacji</h2>
        <div className={styles.columns}>
          {/* Wysłane rezerwacje (klient) */}
          <div className={styles.column}>
            <h3 className={styles.heading}>Wysłane rezerwacje/zapytania</h3>
            {clientReservations.length === 0 ? (
              <p className={styles.empty}>Brak wysłanych rezerwacji.</p>
            ) : (
              <ul className={styles.list}>
                {clientReservations.map(res => (
                  <li
                    key={res._id}
                    className={`${styles.item} ${
                      res.status === 'zaakceptowana' ? styles.accepted
                        : res.status === 'odrzucona' ? styles.rejected
                        : res.status === 'anulowana' ? styles.rejected
                        : styles.pending
                    }`}
                  >
                    {renderFields(res, 'sent')}
                    {res.status === 'oczekująca' && (
                      <div className={styles.actions}>
                        <button
                          onClick={() => handleStatusChange(res._id, 'anulowana')}
                          className={styles.cancel}
                          disabled={disabledIds.has(res._id)}
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

          {/* Otrzymane rezerwacje (usługodawca) */}
          <div className={styles.column}>
            <h3 className={styles.heading}>Otrzymane rezerwacje/zapytania</h3>
            {serviceReservations.length === 0 ? (
              <p className={styles.empty}>Brak otrzymanych rezerwacji.</p>
            ) : (
              <ul className={styles.list}>
                {serviceReservations.map(res => (
                  <li
                    key={res._id}
                    className={`${styles.item} ${
                      res.status === 'zaakceptowana' ? styles.accepted
                        : res.status === 'odrzucona' ? styles.rejected
                        : res.status === 'anulowana' ? styles.rejected
                        : styles.pending
                    }`}
                  >
                    {renderFields(res, 'received')}
                    {res.status === 'oczekująca' && (
                      <div className={styles.actions}>
                        <button
                          onClick={() => handleStatusChange(res._id, 'zaakceptowana')}
                          disabled={disabledIds.has(res._id)}
                        >
                          ✅ Potwierdź
                        </button>
                        <button
                          onClick={() => handleStatusChange(res._id, 'odrzucona')}
                          disabled={disabledIds.has(res._id)}
                        >
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
