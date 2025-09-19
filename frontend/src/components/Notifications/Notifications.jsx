import { useEffect, useState, useMemo } from 'react';
import styles from './Notifications.module.scss';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';

const Notifications = ({ user, setUnreadCount }) => {
  const [conversations, setConversations] = useState([]);
  const [profileNameMap, setProfileNameMap] = useState({}); // uid -> profile.name (jeśli jest)
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // pobierz konwersacje
  useEffect(() => {
    const fetchConversations = async () => {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/conversations/by-uid/${user.uid}`
        );
        const list = Array.isArray(res.data) ? res.data : [];
        setConversations(list);

        // zsumuj nieprzeczytane
        const unread = list.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
        setUnreadCount(unread);
      } catch (err) {
        console.error('❌ Błąd pobierania konwersacji:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user?.uid, setUnreadCount]);

  // zbierz wszystkie "drugie" uid-y
  const otherUids = useMemo(
    () =>
      conversations
        .map(c => c.withUid)
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i),
    [conversations]
  );

  // dociągnij nazwy PROFILI dla drugich uczestników
  useEffect(() => {
    const fetchProfiles = async () => {
      if (otherUids.length === 0) return;
      try {
        const entries = await Promise.all(
          otherUids.map(async uid => {
            try {
              const r = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/profiles/by-user/${uid}`
              );
              const name = r?.data?.name?.trim();
              return [uid, name || null];
            } catch (e) {
              // 404 -> brak profilu
              return [uid, null];
            }
          })
        );
        const map = Object.fromEntries(entries);
        setProfileNameMap(map);
      } catch (e) {
        console.error('❌ Błąd pobierania nazw profili:', e);
      }
    };

    fetchProfiles();
  }, [otherUids]);

  // scroll po powrocie
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
  }, [location.state, loading, location.pathname]);

  return (
    <div id="scrollToId" className={styles.section}>
      <div className={styles.wrapper}>
        <h2 className={styles.sectionTitle}>Twoje powiadomienia</h2>

        {loading ? (
          <p className={styles.loading}>⏳ Ładowanie wiadomości...</p>
        ) : conversations.length === 0 ? (
          <p className={styles.empty}>Brak wiadomości.</p>
        ) : (
          <ul className={styles.list}>
            {conversations.map(convo => {
              const lastMsg = convo.lastMessage;
              if (!lastMsg) return null;

              const isUnread = (convo.unreadCount || 0) > 0;
              const isSender = lastMsg.fromUid === user.uid;

              // PRIORYTET WYŚWIETLANIA:
              // 1) nazwa PROFILU drugiej strony (jeśli istnieje)
              // 2) nazwa konta drugiej strony (withDisplayName z backendu)
              // 3) fallback
              const profileName = profileNameMap[convo.withUid];
              const otherName =
                (profileName && profileName.trim()) ||
                convo.withDisplayName ||
                'Użytkownik';

              const messageLabel = isSender ? (
                <>
                  Wysłałeś/aś wiadomość do{' '}
                  <span className={styles.name}>{otherName}</span>
                </>
              ) : (
                <>
                  Otrzymałeś/aś wiadomość od{' '}
                  <span className={styles.name}>{otherName}</span>
                </>
              );

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
