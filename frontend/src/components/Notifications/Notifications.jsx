import { useEffect, useState } from 'react';
import styles from './Notifications.module.scss';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Notifications = ({ user, setUnreadCount }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      const res = await axios.get(`/api/conversations/by-uid/${user.uid}`);
      setConversations(res.data);

      const unread = res.data.reduce((acc, convo) => acc + convo.unreadCount, 0);
      setUnreadCount(unread);
    } catch (err) {
      console.error('❌ Błąd pobierania konwersacji:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) fetchConversations();
  }, [user]);

  return (
    <div className={styles.wrapper}>
      <h2>Twoje konwersacje</h2>
      {loading ? (
        <p className={styles.loading}>⏳ Ładowanie wiadomości...</p>
      ) : conversations.length === 0 ? (
        <p className={styles.empty}>Brak wiadomości.</p>
      ) : (
        <ul className={styles.list}>
          {conversations.map((convo) => {
            const lastMsg = convo.lastMessage;
            const isUnread = convo.unreadCount > 0;
            const isSender = lastMsg.fromUid === user.uid;

            const messageLabel = isSender
              ? `📤 Wysłałeś/aś wiadomość do ${convo.withName}`
              : `📩 Otrzymałeś/aś wiadomość od ${convo.withName}`;
            return (
              <li
                key={convo._id}
                className={`${styles.item} ${isUnread ? styles.unread : styles.read}`}
              >
                <Link to={`/konwersacja/${convo._id}`} className={styles.link}>
                  <div className={styles.top}>
                    <span className={styles.from}>{messageLabel}</span>
                    <span className={styles.date}>
                      {new Date(lastMsg.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className={styles.content}>{lastMsg.content}</p>
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
