import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import styles from './ThreadView.module.scss';
import { useParams, useNavigate } from 'react-router-dom';

const ThreadView = ({ user, setUnreadCount }) => {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [receiverId, setReceiverId] = useState(null);
  const [canReply, setCanReply] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchThread = useCallback(async () => {
    try {
      const res = await axios.get(`/api/messages/thread/${threadId}`, {
        headers: {
          uid: user.uid,
        },
      });

      setMessages(res.data);

      const otherUser = res.data.find(m => m.from !== user.uid);
      if (otherUser) setReceiverId(otherUser.from);

      const last = res.data[res.data.length - 1];
      setCanReply(last?.from !== user.uid);

      const unreadInThread = res.data.filter(msg => !msg.read && msg.to === user.uid);
      if (unreadInThread.length > 0) {
        for (const msg of unreadInThread) {
          await axios.patch(`/api/messages/read/${msg._id}`);
        }
        if (setUnreadCount) setUnreadCount(0);
      }
    } catch (err) {
      console.error('Błąd pobierania wątku:', err);
      if (err.response?.status === 403 || err.response?.status === 401) {
        navigate('/');
      }
    }
  }, [threadId, user.uid, navigate, setUnreadCount]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      if (!canReply) {
        setErrorMsg('Nie możesz wysłać kolejnej wiadomości, dopóki druga osoba nie odpowie.');
        return;
      }

      await axios.post('/api/messages/reply', {
        from: user.uid,
        to: receiverId,
        content: newMessage.trim(),
        threadId,
      });

      setNewMessage('');
      setErrorMsg('');
      fetchThread();
    } catch (err) {
      console.error('Błąd wysyłania odpowiedzi:', err);
      if (err.response?.status === 403) {
        setErrorMsg('Nie możesz wysłać kolejnej wiadomości, dopóki druga osoba nie odpowie.');
      } else {
        setErrorMsg('Wystąpił błąd podczas wysyłania wiadomości.');
      }
    }
  };

  useEffect(() => {
    fetchThread();
    // Jeśli chcesz, możesz odkomentować auto-odświeżanie:
    // const interval = setInterval(fetchThread, 10000);
    // return () => clearInterval(interval);
  }, [fetchThread]);

  return (
    <div className={styles.threadWrapper}>
      <button onClick={() => navigate('/powiadomienia')} className={styles.backButton}>
        ← Wróć do powiadomień
      </button>

      <div className={styles.thread}>
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`${styles.message} ${msg.from === user.uid ? styles.own : styles.their}`}
          >
            <p className={styles.author}>{msg.senderName}</p>
            <p className={styles.content}>{msg.content}</p>
            <p className={styles.time}>{new Date(msg.createdAt).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {canReply ? (
        <form onSubmit={handleReply} className={styles.form}>
          <textarea
            placeholder="Napisz odpowiedź..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            required
          />
          <button type="submit">Wyślij</button>
        </form>
      ) : (
        <p className={styles.info}>
          Odpowiedź została już wysłana lub czekasz na odpowiedź drugiej osoby.
        </p>
      )}

      {errorMsg && <p className={styles.error}>{errorMsg}</p>}
    </div>
  );
};

export default ThreadView;
