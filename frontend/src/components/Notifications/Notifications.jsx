import { useEffect, useState } from 'react';
import styles from './Notifications.module.scss';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Notifications = ({ user, setUnreadCount }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`/api/messages/threads/by-uid/${user.uid}`);
      setMessages(res.data);

      // NIE OZNACZAMY JAKO PRZECZYTANE AUTOMATYCZNIE!
      const unread = res.data.filter((msg) => !msg.read && msg.to === user.uid);
      setUnreadCount(unread.length);
    } catch (err) {
      console.error('Błąd pobierania wiadomości:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) fetchMessages();
  }, [user]);

  return (
    <div className={styles.wrapper}>
      <h2>📨 Twoje konwersacje</h2>
      {loading ? (
        <p className={styles.loading}>⏳ Ładowanie wiadomości...</p>
      ) : messages.length === 0 ? (
        <p className={styles.empty}>Brak wiadomości.</p>
      ) : (
        <ul className={styles.list}>
          {messages.map((msg) => {
            const otherUser = msg.from === user.uid ? msg.recipientName : msg.senderName;
            const isUnread = !msg.read && msg.to === user.uid;

            return (
              <li
                key={msg._id}
                className={`${styles.item} ${isUnread ? styles.unread : styles.read}`}
              >
                <Link to={`/konwersacja/${msg.threadId}`} className={styles.link}>
                  <div className={styles.top}>
                    <span className={styles.from}>
                      {msg.from === user.uid ? `Do: ${otherUser}` : `Od: ${otherUser}`}
                    </span>
                    <span className={styles.date}>
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className={styles.content}>{msg.content}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Notifications;
