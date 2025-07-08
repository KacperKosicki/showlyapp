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
  const [receiverName, setReceiverName] = useState('');
  const [canReply, setCanReply] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchThread = useCallback(async () => {
    try {
      const res = await axios.get(`/api/conversations/${threadId}`, {
        headers: { uid: user.uid }
      });

      const { messages: msgs, participants } = res.data;
      setMessages(msgs);

      const other = participants.find(p => p.uid !== user.uid);
      if (other) {
        setReceiverId(other.uid);
        setReceiverName(other.name || 'Użytkownik');
      }

      const last = msgs[msgs.length - 1];
      setCanReply(last?.fromUid !== user.uid);

      const unreadInThread = msgs.filter(m => !m.read && m.toUid === user.uid);
      if (unreadInThread.length > 0) {
        await axios.patch(`/api/conversations/${threadId}/read`, null, {
          headers: { uid: user.uid }
        });
        if (setUnreadCount) {
          setUnreadCount(prev => Math.max(prev - unreadInThread.length, 0));
        }
      }
    } catch (err) {
      console.error('❌ Błąd pobierania konwersacji:', err);
      if ([401, 403].includes(err.response?.status)) navigate('/');
    }
  }, [threadId, user.uid, navigate, setUnreadCount]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (!canReply) {
      setErrorMsg('Nie możesz wysłać wiadomości przed odpowiedzią drugiej osoby.');
      return;
    }

    try {
      await axios.post('/api/conversations/send', {
        from: user.uid,
        to: receiverId,
        content: newMessage.trim()
      });

      setNewMessage('');
      setErrorMsg('');
      fetchThread();
    } catch (err) {
      console.error('❌ Błąd wysyłania odpowiedzi:', err);
      if (err.response?.status === 403) {
        setErrorMsg('Musisz poczekać na odpowiedź drugiej osoby.');
      } else {
        setErrorMsg('Wystąpił błąd podczas wysyłania wiadomości.');
      }
    }
  };

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  return (
    <div className={styles.threadWrapper}>
      <button onClick={() => navigate('/powiadomienia')} className={styles.backButton}>
        ← Wróć do powiadomień
      </button>

      <h2 className={styles.title}>Rozmowa z: {receiverName}</h2>

      <div className={styles.thread}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`${styles.message} ${msg.fromUid === user.uid ? styles.own : styles.their}`}
          >
            <p className={styles.author}>
              {msg.fromUid === user.uid ? user.name || 'Ty' : receiverName}
            </p>
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
