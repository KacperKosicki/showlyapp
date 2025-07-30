import { useEffect, useState } from 'react';
import styles from './Notifications.module.scss';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

const Notifications = ({ user, setUnreadCount }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const fetchConversations = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/conversations/by-uid/${user.uid}`);
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

  useEffect(() => {
    const scrollTo = location.state?.scrollToId;
    if (!scrollTo || loading) return;

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
  }, [location.state, loading]);


  return (
    <div id="scrollToId" className={styles.section}>
      <div className={styles.wrapper}>
        <h2 className={styles.sectionTitle}>Twoje konwersacje</h2>
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
                ? `Wysłałeś/aś wiadomość do ${convo.withName}`
                : `Otrzymałeś/aś wiadomość od ${convo.withName}`;
              return (
                <li
                  key={convo._id}
                  className={`${styles.item} ${isUnread ? styles.unread : styles.read}`}
                >
                  <Link
                    to={`/konwersacja/${convo._id}`}
                    className={styles.link}
                    state={{ scrollToId: 'threadPageLayout' }}
                  >
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
    </div>
  );
};

export default Notifications;
