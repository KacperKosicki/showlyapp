import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import styles from './MessageForm.module.scss';
import axios from 'axios';
import AlertBox from '../AlertBox/AlertBox';

const MessageForm = ({ user }) => {
  const { recipientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [canSend, setCanSend] = useState(true);
  const [alert, setAlert] = useState(null);
  const [hasConversation, setHasConversation] = useState(false);
  const [receiverName, setReceiverName] = useState(''); // nazwa UŻYTKOWNIKA

  // płynny scroll po powrocie ze state.scrollToId
  useEffect(() => {
    const scrollTo = location.state?.scrollToId;
    if (!scrollTo) return;

    const timeout = setTimeout(() => {
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

    return () => clearTimeout(timeout);
  }, [location.state, location.pathname]);

  // 👉 pobierz nazwę UŻYTKOWNIKA (nie profilu)
  const fetchUserNameByUid = useCallback(async (uid) => {
    if (!uid || uid === 'SYSTEM') {
      setReceiverName('Nieznany użytkownik');
      return;
    }
    try {
      // spróbuj typowego endpointu użytkownika:
      // dopasuj do swojego backendu (np. /api/users/by-uid/:uid lub /api/users/:uid)
      const endpoints = [
        `${process.env.REACT_APP_API_URL}/api/users/by-uid/${uid}`,
        `${process.env.REACT_APP_API_URL}/api/users/${uid}`,
      ];

      let userObj = null;
      for (const url of endpoints) {
        try {
          const res = await axios.get(url);
          if (res?.data) { userObj = res.data; break; }
        } catch (_) { /* próbujemy kolejny endpoint */ }
      }

      const candidate =
        userObj?.name ||
        userObj?.displayName ||
        userObj?.username ||
        userObj?.fullName ||
        userObj?.user?.name ||
        userObj?.user?.displayName ||
        '';

      setReceiverName(candidate || 'Nieznany użytkownik');
    } catch (err) {
      console.error('❌ Błąd pobierania nazwy użytkownika:', err);
      setReceiverName('Nieznany użytkownik');
    }
  }, []);

  // sprawdź konwersację; jeśli istnieje – ustaw nazwę z participants
  const checkConversation = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/conversations/check/${user.uid}/${recipientId}`
      );
      setHasConversation(res.data.exists);

      if (res.data.exists) {
        setConversationId(res.data.id);

        const threadRes = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/conversations/${res.data.id}`,
          { headers: { uid: user.uid } }
        );

        const messages = threadRes.data?.messages || [];
        const lastMsg = messages[messages.length - 1];
        // Uwaga: w Twoim ThreadView jest fromUid — trzymamy spójnie
        setCanSend(!lastMsg || lastMsg.fromUid !== user.uid);

        // weź nazwę DRUGIEGO uczestnika z participants (user-level name)
        const { participants = [] } = threadRes.data || {};
        const other = participants.find(p => p.uid !== user.uid);
        if (other?.name) {
          setReceiverName(other.name);
        } else {
          // gdyby participants nie miało name — dobij do users
          await fetchUserNameByUid(recipientId);
        }
      } else {
        setConversationId(null);
        setCanSend(true);
        // brak konwersacji → pobierz nazwę użytkownika po uid
        await fetchUserNameByUid(recipientId);
      }
    } catch (err) {
      console.error('❌ Błąd sprawdzania konwersacji:', err);
      // w razie błędu spróbuj chociaż pobrać nazwę użytkownika
      await fetchUserNameByUid(recipientId);
    }
  }, [user.uid, recipientId, fetchUserNameByUid]);

  useEffect(() => {
    checkConversation();
  }, [checkConversation]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || !canSend) return;

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/conversations/send`, {
        from: user.uid,
        to: recipientId,
        content: message.trim(),
      });

      setMessage('');
      setAlert({ type: 'success', message: 'Wiadomość wysłana!' });
      setTimeout(() => navigate('/powiadomienia'), 2000);
    } catch (err) {
      if (err.response?.status === 403) {
        setCanSend(false);
        setAlert({
          type: 'error',
          message: 'Musisz poczekać na odpowiedź drugiej osoby.',
        });
      } else {
        setAlert({
          type: 'error',
          message: 'Błąd podczas wysyłania wiadomości.',
        });
      }
    }
  };

  return (
    <div id="messageFormContainer" className={styles.container}>
      <div className={styles.wrapper}>
        <h2 className={styles.conversationTitle}>
          {hasConversation ? (
            <>
              Kontynuuj rozmowę z{' '}
              <span className={styles.receiverName}>{receiverName}</span>
            </>
          ) : (
            <>
              Napisz wiadomość do{' '}
              <span className={styles.receiverName}>{receiverName}</span>
            </>
          )}
        </h2>

        {alert && (
          <AlertBox
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        {hasConversation && (
          <p className={styles.info}>
            {canSend
              ? '📖 Masz już konwersację z tym użytkownikiem. Twoja wiadomość zostanie do niej dodana.'
              : '⌛️ Czekasz na odpowiedź drugiej osoby. Nie możesz wysłać kolejnej wiadomości.'}
          </p>
        )}

        <form onSubmit={handleSend}>
          <textarea
            className={styles.textarea}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Wpisz swoją wiadomość..."
            required
            disabled={!canSend}
          />
          <button type="submit" className={styles.button} disabled={!canSend}>
            Wyślij wiadomość
          </button>
        </form>
      </div>
    </div>
  );
};

export default MessageForm;
