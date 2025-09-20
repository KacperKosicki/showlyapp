import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import styles from './MessageForm.module.scss';
import axios from 'axios';
import AlertBox from '../AlertBox/AlertBox';

const CHANNEL = 'account_to_profile'; // zawsze KONTO ➜ WIZYTÓWKA

const MessageForm = ({ user }) => {
  const { recipientId } = useParams(); // firebaseUid właściciela profilu
  const navigate = useNavigate();
  const location = useLocation();

  const [message, setMessage] = useState('');
  const [alert, setAlert] = useState(null);
  const [receiverName, setReceiverName] = useState('');
  const [loading, setLoading] = useState(true);

  // płynny scroll
  useEffect(() => {
    const scrollTo = location.state?.scrollToId;
    if (!scrollTo) return;
    const t = setTimeout(() => {
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
    }, 100);
    return () => clearTimeout(t);
  }, [location.state, location.pathname]);

  const fetchProfileNameByUid = useCallback(async (uid) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/profiles/by-user/${uid}`);
      const prof = res.data;
      if (prof?.name && prof.name.trim()) {
        setReceiverName(prof.name.trim());
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const fetchAccountLabelByUid = useCallback(async (uid) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/by-uid/${uid}`);
      const u = res.data;
      const label =
        u?.displayName?.trim() ||
        u?.name?.trim() ||
        u?.email ||
        'Użytkownik';
      setReceiverName(label);
    } catch {
      setReceiverName('Użytkownik');
    }
  }, []);

  // jeśli istnieje MÓJ wątek KONTO➜WIZYTÓWKA (starter = user.uid) → przekieruj
  const checkConversation = useCallback(async () => {
    if (!user?.uid || !recipientId) return;

    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/conversations/check/${user.uid}/${recipientId}?channel=${CHANNEL}&starter=${user.uid}`
      );

      // nazwa adresata (profil -> fallback konto)
      const gotProfile = await fetchProfileNameByUid(recipientId);
      if (!gotProfile) await fetchAccountLabelByUid(recipientId);

      if (res.data.exists && res.data.id) {
        navigate(`/konwersacja/${res.data.id}`, { state: { scrollToId: 'threadPageLayout' } });
        return; // nie pokazuj formularza
      }
    } catch (_) {
      // brak wątku lub błąd – pokaż formularz
    } finally {
      setLoading(false);
    }
  }, [user?.uid, recipientId, navigate, fetchProfileNameByUid, fetchAccountLabelByUid]);

  useEffect(() => {
    checkConversation();
  }, [checkConversation]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      const { data } = await axios.post(`${process.env.REACT_APP_API_URL}/api/conversations/send`, {
        from: user.uid,         // piszesz jako KONTO
        to: recipientId,        // do WŁAŚCICIELA PROFILU
        content: message.trim(),
        channel: CHANNEL,       // KONTO ➜ WIZYTÓWKA
      });

      setMessage('');
      setAlert({ type: 'success', message: 'Wiadomość wysłana!' });

      // po wysłaniu wejdź w świeży/odświeżony wątek
      if (data?.id) {
        setTimeout(() => {
          navigate(`/konwersacja/${data.id}`, { state: { scrollToId: 'threadPageLayout' } });
        }, 600);
      } else {
        setTimeout(() => navigate('/powiadomienia'), 800);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setAlert({ type: 'error', message: 'Musisz poczekać na odpowiedź w tym wątku.' });
      } else if (err.response?.data?.message) {
        setAlert({ type: 'error', message: err.response.data.message });
      } else {
        setAlert({ type: 'error', message: 'Błąd podczas wysyłania wiadomości.' });
      }
    }
  };

  if (loading) {
    return (
      <div id="messageFormContainer" className={styles.container}>
        <div className={styles.wrapper}><p>Ładowanie…</p></div>
      </div>
    );
  }

  return (
    <div id="messageFormContainer" className={styles.container}>
      <div className={styles.wrapper}>
        <h2 className={styles.conversationTitle}>
          Konto ➜ Wizytówka: napisz do{' '}
          <span className={styles.receiverName}>{receiverName}</span>
        </h2>

        {alert && (
          <AlertBox
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        <form onSubmit={handleSend}>
          <textarea
            className={styles.textarea}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Wpisz swoją wiadomość..."
            required
          />
          <button type="submit" className={styles.button}>Wyślij wiadomość</button>
        </form>
      </div>
    </div>
  );
};

export default MessageForm;
