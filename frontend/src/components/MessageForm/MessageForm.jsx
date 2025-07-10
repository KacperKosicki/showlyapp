import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './MessageForm.module.scss';
import axios from 'axios';
import AlertBox from '../AlertBox/AlertBox';
import { useLocation } from 'react-router-dom';

const MessageForm = ({ user }) => {
  const { recipientId } = useParams();
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [canSend, setCanSend] = useState(true);
  const [alert, setAlert] = useState(null);
  const [hasConversation, setHasConversation] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
  }, [location.state]);

  const checkConversation = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/conversations/check/${user.uid}/${recipientId}`);
      setHasConversation(res.data.exists);

      if (res.data.exists) {
        setConversationId(res.data.id);

        const threadRes = await axios.get(`${process.env.REACT_APP_API_URL}/api/conversations/${res.data.id}`, {
          headers: { uid: user.uid }
        });

        const messages = threadRes.data.messages;
        const lastMsg = messages[messages.length - 1];
        setCanSend(!lastMsg || lastMsg.from !== user.uid);
      } else {
        setConversationId(null);
        setCanSend(true);
      }
    } catch (err) {
      console.error('❌ Błąd sprawdzania konwersacji:', err);
    }
  }, [user.uid, recipientId]);

  useEffect(() => {
    checkConversation();
  }, [checkConversation]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/conversations/send`, {
        from: user.uid,
        to: recipientId,
        content: message.trim()
      });

      setMessage('');

      setAlert({ type: 'success', message: 'Wiadomość wysłana!' });
      setTimeout(() => navigate('/powiadomienia'), 2000);
    } catch (err) {
      if (err.response?.status === 403) {
        setCanSend(false);
        setAlert({ type: 'error', message: 'Musisz poczekać na odpowiedź drugiej osoby.' });
      } else {
        setAlert({ type: 'error', message: 'Błąd podczas wysyłania wiadomości.' });
      }
    }
  };

  return (
    <div id="messageFormContainer" className={styles.container}>
      <div className={styles.wrapper}>
        <h2>{hasConversation ? 'Kontynuuj rozmowę' : 'Napisz wiadomość'}</h2>

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
              ? 'Masz już konwersację z tym użytkownikiem. Twoja wiadomość zostanie do niej dodana.'
              : 'Czekasz na odpowiedź drugiej osoby. Nie możesz wysłać kolejnej wiadomości.'}
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
            Wyślij
          </button>
        </form>
      </div>
    </div>
  );
};

export default MessageForm;
