import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './MessageForm.module.scss';
import axios from 'axios';
import AlertBox from '../AlertBox/AlertBox'; // Dodaj import do komponentu alertu

const MessageForm = ({ user }) => {
  const { recipientId } = useParams();
  const [message, setMessage] = useState('');
  const [hasThread, setHasThread] = useState(false);
  const [canSend, setCanSend] = useState(true);
  const [threadId, setThreadId] = useState(null);
  const [alert, setAlert] = useState(null);
  const navigate = useNavigate();

  const checkThread = useCallback(async () => {
    try {
      const res = await axios.get(`/api/messages/check-conversation/${user.uid}/${recipientId}`);
      setHasThread(res.data.exists);

      if (res.data.threadId) {
        setThreadId(res.data.threadId);
        const threadRes = await axios.get(`/api/messages/thread/${res.data.threadId}`);
        const messages = threadRes.data;

        const lastMessage = [...messages].reverse().find(Boolean);
        setCanSend(!lastMessage || lastMessage.from !== user.uid);
      } else {
        setCanSend(true);
      }
    } catch (err) {
      console.error('❌ Błąd sprawdzania konwersacji:', err);
    }
  }, [user.uid, recipientId]);

  useEffect(() => {
    checkThread();
  }, [checkThread]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await axios.post('/api/messages/send', {
        from: user.uid,
        to: recipientId,
        content: message.trim(),
      });

      setMessage('');
      await checkThread(); // odśwież dane

      setAlert({ type: 'success', message: 'Wiadomość wysłana!' });
      setTimeout(() => navigate('/powiadomienia'), 2000);
    } catch (err) {
      if (err.response?.status === 403) {
        setCanSend(false);
        setAlert({ type: 'error', message: 'Nie możesz wysłać kolejnej wiadomości przed odpowiedzią drugiej osoby.' });
      } else {
        setAlert({ type: 'error', message: 'Błąd wysyłania wiadomości.' });
      }
    }
  };

  return (
    <div className={styles.wrapper}>
      <h2>{hasThread ? 'Kontynuuj rozmowę' : 'Napisz wiadomość'}</h2>

      {alert && (
        <AlertBox
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {hasThread && (
        <p className={styles.info}>
          {canSend
            ? 'Masz już konwersację z tym użytkownikiem. Twoja wiadomość zostanie do niej dodana.'
            : 'Czekasz na odpowiedź drugiej osoby. Nie możesz wysłać kolejnej wiadomości w tej chwili.'}
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
  );
};

export default MessageForm;
