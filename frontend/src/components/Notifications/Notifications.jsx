import { useEffect, useState } from 'react';
import styles from './Notifications.module.scss';
import axios from 'axios';

const Notifications = ({ user, setUnreadCount }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`/api/messages/inbox/by-uid/${user.uid}`);
      setMessages(res.data);

      // 🔔 Oznacz jako przeczytane tylko te nieprzeczytane
      const unreadMessages = res.data.filter((msg) => !msg.read);
      if (unreadMessages.length > 0) {
        for (const msg of unreadMessages) {
          await axios.patch(`/api/messages/read/${msg._id}`);
        }
        setUnreadCount(0); // zresetuj licznik tylko jeśli coś było nieprzeczytane
      }

    } catch (err) {
      console.error('Błąd pobierania wiadomości:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) fetchMessages();
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.uid) {
        fetchMessages();
      }
    }, 5000); // ⏱ odświeżaj co 5 sekund

    return () => clearInterval(interval);
  }, [user]);

  if (loading) return <p className={styles.loading}>⏳ Ładowanie wiadomości...</p>;

  return (
    <div className={styles.wrapper}>
      <h2>📨 Twoje wiadomości</h2>
      {messages.length === 0 ? (
        <p className={styles.empty}>Brak wiadomości.</p>
      ) : (
        <ul className={styles.list}>
          {messages.map((msg) => (
            <li key={msg._id} className={`${styles.item} ${msg.read ? styles.read : styles.unread}`}>
              <div className={styles.top}>
                <span className={styles.from}>Od: {msg.senderName}</span>
                <span className={styles.date}>{new Date(msg.createdAt).toLocaleString()}</span>
              </div>
              <p className={styles.content}>{msg.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;
