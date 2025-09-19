import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import styles from './MessageForm.module.scss';
import axios from 'axios';
import AlertBox from '../AlertBox/AlertBox';

const MessageForm = ({ user }) => {
  const { recipientId } = useParams(); // firebaseUid właściciela profilu
  const navigate = useNavigate();
  const location = useLocation();

  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [canSend, setCanSend] = useState(true);
  const [alert, setAlert] = useState(null);
  const [hasConversation, setHasConversation] = useState(false);
  const [receiverName, setReceiverName] = useState(''); // <- NAZWA PROFILU (fallback: konto)

  // płynny scroll po powrocie
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

  // 1) spróbuj pobrać NAZWĘ PROFILU użytkownika (wizytówkę)
  const fetchProfileNameByUid = useCallback(async (uid) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/profiles/by-user/${uid}`);
      const prof = res.data;
      if (prof?.name && prof.name.trim()) {
        setReceiverName(prof.name.trim());
        return true;
      }
      return false;
    } catch (e) {
      // 404 => brak profilu, lecimy fallbackiem
      return false;
    }
  }, []);

  // 2) fallback do nazwy konta (displayName/name/email)
  const fetchAccountLabelByUid = useCallback(async (uid) => {
    try {
      // jeśli masz endpoint identity – użyj jego:
      // const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/identity/${uid}`);
      // setReceiverName(res.data?.label || 'Użytkownik');

      // jeśli nie – prosto po użytkowniku:
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

  // sprawdź konwersację i ustaw tytuł odbiorcy (profil > konto)
  const checkConversation = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/conversations/check/${user.uid}/${recipientId}`
      );
      setHasConversation(res.data.exists);

      // NAZWA ODBIORCY: najpierw profil, jeśli brak – konto
      const gotProfile = await fetchProfileNameByUid(recipientId);
      if (!gotProfile) {
        await fetchAccountLabelByUid(recipientId);
      }

      if (res.data.exists) {
        setConversationId(res.data.id);
        const threadRes = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/conversations/${res.data.id}`,
          { headers: { uid: user.uid } }
        );
        const msgs = threadRes.data?.messages || [];
        const last = msgs[msgs.length - 1];
        setCanSend(!last || last.fromUid !== user.uid);
      } else {
        setConversationId(null);
        setCanSend(true);
      }
    } catch (err) {
      // nawet przy błędzie spróbujmy ustawić etykietę odbiorcy
      const gotProfile = await fetchProfileNameByUid(recipientId);
      if (!gotProfile) {
        await fetchAccountLabelByUid(recipientId);
      }
      setConversationId(null);
      setCanSend(true);
    }
  }, [user.uid, recipientId, fetchProfileNameByUid, fetchAccountLabelByUid]);

  useEffect(() => {
    checkConversation();
  }, [checkConversation]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || !canSend) return;

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/conversations/send`, {
        from: user.uid,           // piszesz jako UŻYTKOWNIK (nazwa konta)
        to: recipientId,          // do WŁAŚCICIELA PROFILU (nazwa profilu w UI)
        content: message.trim(),
      });

      setMessage('');
      setAlert({ type: 'success', message: 'Wiadomość wysłana!' });
      setTimeout(() => navigate('/powiadomienia'), 1500);
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
              ? '📖 Masz już konwersację z tym profilem. Twoja wiadomość zostanie do niej dodana.'
              : '⌛️ Czekasz na odpowiedź drugiej strony. Nie możesz wysłać kolejnej wiadomości.'}
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
