import { useEffect, useState, useCallback, useMemo } from 'react';
import styles from './ReservationList.module.scss';
import axios from 'axios';
import AlertBox from '../AlertBox/AlertBox';
import { useLocation } from 'react-router-dom';
import { FiInbox, FiSend } from 'react-icons/fi';
import { FiCalendar, FiClock, FiTag, FiCheckCircle, FiXCircle, FiAlertCircle, FiFileText, FiUser } from 'react-icons/fi';

const API = process.env.REACT_APP_API_URL;

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
  const location = useLocation();

  const [alert, setAlert] = useState({ show: false, type: 'info', message: '', onClose: null });
  const [disabledIds, setDisabledIds] = useState(new Set());

  // Mapa nazw kont po userId (undefined=pending, null=brak, string=nazwa)
  const [accountNameMap, setAccountNameMap] = useState({});

  const safeParse = (str) => { try { return JSON.parse(str); } catch { return null; } };

  const refetch = useCallback(async () => {
    if (!user?.uid) return;
    const [resClient, resService] = await Promise.all([
      axios.get(`${API}/api/reservations/by-user/${user.uid}`),
      axios.get(`${API}/api/reservations/by-provider/${user.uid}`)
    ]);
    setClientReservations(resClient.data || []);
    setServiceReservations(resService.data || []);
  }, [user]);

  useEffect(() => {
    (async () => {
      try { await refetch(); } catch (e) { console.error('❌ Błąd pobierania rezerwacji:', e); }
      finally { setLoading(false); }
    })();
  }, [refetch]);

  useEffect(() => {
    if (!loading && resetPendingReservationsCount) resetPendingReservationsCount();
  }, [loading, resetPendingReservationsCount]);

  // 〰️ scroll po wejściu / powrocie
  useEffect(() => {
    const scrollTo = location.state?.scrollToId;
    if (!scrollTo || loading) return;

    const tryScroll = () => {
      const el = document.getElementById(scrollTo);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState({}, document.title, location.pathname);
      } else {
        requestAnimationFrame(tryScroll);
      }
    };
    requestAnimationFrame(tryScroll);
  }, [location.state, loading, location.pathname]);

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
        `${API}/api/reservations/${reservationId}/status`,
        { status: newStatus }
      );
      if (newStatus === 'anulowana')
        return withToastAndRefresh('warning', 'Rezerwacja anulowana – slot zwolniony.', reservationId);
      if (newStatus === 'odrzucona')
        return withToastAndRefresh('warning', 'Rezerwacja odrzucona – slot zwolniony.', reservationId);
      if (newStatus === 'zaakceptowana') {
        setAlert({ show: true, type: 'success', message: 'Pomyślnie potwierdzono rezerwację.', onClose: null });
        await refetch();
        setDisabledIds(prev => { const n = new Set(prev); n.delete(reservationId); return n; });
        return;
      }
      withToastAndRefresh('info', 'Status zaktualizowany.', reservationId);
    } catch (err) {
      console.error('❌ Błąd zmiany statusu rezerwacji:', err);
      setAlert({ show: true, type: 'error', message: 'Nie udało się zmienić statusu.', onClose: null });
      setDisabledIds(prev => { const n = new Set(prev); n.delete(reservationId); return n; });
    }
  };

  const markSeen = async (id, who) => {
    try {
      await axios.patch(`${API}/api/reservations/${id}/seen`, { who });
      if (who === 'client') setClientReservations(prev => prev.filter(r => r._id !== id));
      else setServiceReservations(prev => prev.filter(r => r._id !== id));
    } catch (e) { console.error('❌ markSeen error', e); }
  };

  const handleExpire = () => { refetch(); };

  const timeLabel = (res) => {
    const whole = res.dateOnly || (res.fromTime === '00:00' && res.toTime === '23:59');
    return whole ? 'cały dzień' : `${res.fromTime} – ${res.toTime}`;
  };

  // Unikalne UID-y nadawców (klientów) z otrzymanych rezerwacji
  const senderUids = useMemo(() => {
    const arr = serviceReservations.map(r => r.userId).filter(Boolean);
    return Array.from(new Set(arr));
  }, [serviceReservations]);

  // Nazwa konta po userId; fallback do snapshotu userName
  const getAccountName = (uid, fallbackName) => {
    if (!uid) return (fallbackName?.trim()) || 'Użytkownik';
    const name = accountNameMap[uid]; // undefined=pending | null=brak | string=nazwa
    if (name === undefined) return ''; // pending -> skeleton
    if (typeof name === 'string' && name.trim()) return name.trim();
    return (fallbackName?.trim()) || 'Użytkownik';
  };

  // Dociąganie displayName kont po userId
  useEffect(() => {
    if (senderUids.length === 0) return;

    // oznacz pending
    setAccountNameMap(prev => {
      const next = { ...prev };
      senderUids.forEach(uid => {
        if (!Object.prototype.hasOwnProperty.call(next, uid)) next[uid] = undefined;
      });
      return next;
    });

    const fetchOne = async (uid) => {
      try {
        const r = await axios.get(`${API}/api/users/${uid}`);
        const data = r?.data;
        const dn =
          (data?.displayName && String(data.displayName).trim()) ||
          (data?.name && String(data.name).trim()) ||
          null;
        return dn;
      } catch {
        return null;
      }
    };

    (async () => {
      const entries = await Promise.all(senderUids.map(async (uid) => [uid, await fetchOne(uid)]));
      setAccountNameMap(prev => {
        const next = { ...prev };
        entries.forEach(([uid, name]) => { next[uid] = name; });
        return next;
      });
    })();
  }, [senderUids]);

  const formatDatePL = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const statusIcon = (status) => {
    if (status === 'zaakceptowana') return <FiCheckCircle className={styles.chipIcon} aria-hidden="true" />;
    if (status === 'odrzucona' || status === 'anulowana') return <FiXCircle className={styles.chipIcon} aria-hidden="true" />;
    return <FiAlertCircle className={styles.chipIcon} aria-hidden="true" />;
  };

const renderInfo = (res) => (
  <div className={styles.info}>
    <span className={styles.chip}>
      <FiCalendar className={styles.chipIcon} aria-hidden="true" />
      {formatDatePL(res.date)}
    </span>

    <span className={styles.chip}>
      <FiClock className={styles.chipIcon} aria-hidden="true" />
      {timeLabel(res)}
    </span>

    {res.serviceName && (
      <span className={styles.chip}>
        <FiTag className={styles.chipIcon} aria-hidden="true" />
        {res.serviceName}
      </span>
    )}

    {/* ⇩ NOWE: pracownik, jeśli tryb team i coś zapisaliśmy */}
    {(res.staffName || res.staffId) && (
      <span
        className={styles.chip}
        title={res.staffAutoAssigned ? 'Przypisano automatycznie' : 'Wybrany przez klienta'}
      >
        <FiUser className={styles.chipIcon} aria-hidden="true" />
        {res.staffName || `#${String(res.staffId).slice(-5)}`}
        {res.staffAutoAssigned ? ' (auto)' : ''}
      </span>
    )}

    <span
      className={`${styles.chip} ${
        res.status === 'zaakceptowana'
          ? styles.chipAccepted
          : (res.status === 'odrzucona' || res.status === 'anulowana')
          ? styles.chipRejected
          : styles.chipPending
      }`}
    >
      {statusIcon(res.status)}
      {res.status}
    </span>
  </div>
);

  // ► Liczniki do badge
  const pendingSent = clientReservations.filter(r => r.status === 'oczekująca').length;
  const pendingReceived = serviceReservations.filter(r => r.status === 'oczekująca').length;

  // ► Pomocnicze: skeleton dla nazw
  const renderNameNode = (rawName) =>
    rawName ? (
      <span className={styles.name}>{rawName}</span>
    ) : (
      <span className={`${styles.name} ${styles.nameSkeleton} ${styles.shimmer}`} />
    );

  const renderHeader = (res, variant) => {
    if (variant === 'sent') {
      return (
        <>
          <FiSend className={styles.icon} />
          <span className={styles.metaText}>
            Rezerwacja z <b>Twojego konta</b> do profilu{' '}
            <span className={styles.name}>
              {res.providerProfileName || 'Profil'}
            </span>
          </span>
        </>
      );
    }

    // received -> nazwa NADAWCY: po userId (fallback: snapshot userName)
    const rawAccountName = getAccountName(res.userId, res.userName);
    return (
      <>
        <FiInbox className={styles.icon} />
        <span className={styles.metaText}>
          Otrzymana rezerwacja do <b>Twojego profilu</b> od{' '}
          {renderNameNode(rawAccountName)}
        </span>
      </>
    );
  };

  const renderClosedInfo = (res, viewer) => {
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
        <button className={styles.seenBtn} onClick={() => markSeen(res._id, who)}>
          OK, widzę
        </button>
      </div>
    );
  };

  const renderDescription = (res, viewer) => {
    const text = (res.description || '').trim();
    if (!text) return null;

    const title = viewer === 'received' ? 'Opis od klienta' : 'Twój opis do rezerwacji';

    return (
      <div className={styles.note}>
        <div className={styles.noteHeader}>
          <FiFileText className={styles.noteIcon} aria-hidden="true" />
          <span>{title}</span>
        </div>
        <div className={styles.noteBody}>{text}</div>
      </div>
    );
  };

  const renderItem = (res, variant) => {
    const isPending = res.status === 'oczekująca';
    return (
      <li key={res._id} className={`${styles.item} ${isPending ? styles.unread : styles.read}`}>
        <div className={styles.link}>
          <div className={styles.top}>
            <span className={styles.meta}>{renderHeader(res, variant)}</span>
            <span className={styles.date}>
              {new Date(res.createdAt || res.updatedAt || Date.now()).toLocaleString()}
              {isPending && <span className={styles.dot} aria-hidden="true" />}
            </span>
          </div>

          {renderInfo(res)}
          {renderDescription(res, variant)}

          {res.status === 'oczekująca' && res.pendingExpiresAt && (
            <Countdown until={res.pendingExpiresAt} onExpire={handleExpire} />
          )}
          {renderClosedInfo(res, variant)}

          {variant === 'sent' && res.status === 'oczekująca' && (
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

          {variant === 'received' && res.status === 'oczekująca' && (
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
        </div>
      </li>
    );
  };

  if (loading) {
    return <div className={styles.loading}>⏳ Ładowanie rezerwacji...</div>;
  }

  return (
    <section id="scrollToId" className={styles.section}>
      {alert.show && (
        <AlertBox
          type={alert.type}
          message={alert.message}
          onClose={alert.onClose || (() => setAlert(a => ({ ...a, show: false })))}
        />
      )}

      <div className={styles.wrapper}>
        <div className={styles.headerRow}>
          <div>
            <h2 className={styles.sectionTitle}>Twoje rezerwacje</h2>
            <p className={styles.subTitle}>
              Tutaj znajdziesz <strong className={styles.subStrong}>wysłane</strong> i{' '}
              <strong className={styles.subStrong}>otrzymane</strong> rezerwacje — w jednolitym, czytelnym układzie.
            </p>
          </div>
        </div>

        {/* SEGMENT: OTRZYMANE */}
        <div className={styles.sectionGroup}>
          <div className={styles.groupHeader}>
            <h3 className={styles.groupTitle}>Otrzymane rezerwacje (do Twojego profilu)</h3>
            <span className={styles.badge}>
              {pendingReceived > 0 ? `${pendingReceived} oczek.` : `${serviceReservations.length}`}
            </span>
          </div>

          {serviceReservations.length === 0 ? (
            <p className={styles.emptyGroup}>Brak otrzymanych rezerwacji.</p>
          ) : (
            <ul className={styles.list}>
              {serviceReservations.map((r) => renderItem(r, 'received'))}
            </ul>
          )}
        </div>

        {/* SEGMENT: WYSŁANE */}
        <div className={styles.sectionGroup}>
          <div className={styles.groupHeader}>
            <h3 className={styles.groupTitle}>Wysłane rezerwacje (Twoje konto → inne profile)</h3>
            <span className={styles.badge}>
              {pendingSent > 0 ? `${pendingSent} oczek.` : `${clientReservations.length}`}
            </span>
          </div>

          {clientReservations.length === 0 ? (
            <p className={styles.emptyGroup}>Brak wysłanych rezerwacji.</p>
          ) : (
            <ul className={styles.list}>
              {clientReservations.map((r) => renderItem(r, 'sent'))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

export default ReservationList;
