import { useEffect, useState, useMemo } from 'react';
import styles from './Notifications.module.scss';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { FiInbox, FiSend, FiMail } from 'react-icons/fi';

const Notifications = ({ user, setUnreadCount }) => {
  const [conversations, setConversations] = useState([]);
  const [profileNameMap, setProfileNameMap] = useState({});
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // 0) Moja wizytówka (nazwa do nagłówka)
  useEffect(() => {
    const fetchMyProfile = async () => {
      if (!user?.uid) return;
      try {
        const r = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/profiles/by-user/${user.uid}`
        );
        if (r?.data?.name) setMyProfile(r.data);
        else setMyProfile(null);
      } catch {
        setMyProfile(null);
      }
    };
    fetchMyProfile();
  }, [user?.uid]);

  // 1) Konwersacje
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

  // 2) Unikalne „drugie” uid-y
  const otherUids = useMemo(
    () =>
      conversations
        .map((c) => c.withUid)
        .filter(Boolean)
        .filter((uid) => uid !== 'SYSTEM')
        .filter((v, i, arr) => arr.indexOf(v) === i),
    [conversations]
  );

  // 3) Nazwy PROFILI drugiej strony (do labeli)
  useEffect(() => {
    const fetchProfiles = async () => {
      if (otherUids.length === 0) return;
      try {
        const entries = await Promise.all(
          otherUids.map(async (uid) => {
            try {
              const r = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/profiles/by-user/${uid}`
              );
              const name = r?.data?.name?.trim();
              return [uid, name || null];
            } catch {
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

  // 4) Scroll po powrocie
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

  // Helper do etykiet:
  // prefer="profile"  -> najpierw nazwa wizytówki, potem fallback do konta
  // prefer="account"  -> najpierw nazwa konta, potem fallback do wizytówki
  const getName = (otherUid, fallback, prefer = 'profile') => {
    const profile = (profileNameMap[otherUid] || '').trim();
    const account = (fallback || '').trim();
    if (prefer === 'account') {
      return account || profile || 'Użytkownik';
    }
    return profile || account || 'Użytkownik';
  };

  // 5) Podział na segmenty — tylko kanał account_to_profile
  const accountToProfile = useMemo(
    () => conversations.filter((c) => c.channel === 'account_to_profile'),
    [conversations]
  );

  // Konto innych -> Twoja wizytówka (kto zaczął? nie Ty)
  const inboxToMyProfile = useMemo(
    () => accountToProfile.filter((c) => c.firstFromUid && c.firstFromUid !== user.uid),
    [accountToProfile, user.uid]
  );

  // Twoje konto -> cudze wizytówki (kto zaczął? Ty)
  const myAccountToOtherProfiles = useMemo(
    () => accountToProfile.filter((c) => c.firstFromUid && c.firstFromUid === user.uid),
    [accountToProfile, user.uid]
  );

  // 5b) System
  const systemConversations = useMemo(
    () => conversations.filter((c) => c.channel === 'system'),
    [conversations]
  );
  const systemUnread = systemConversations.reduce((a, c) => a + (c.unreadCount || 0), 0);

  const inboxUnread = inboxToMyProfile.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const outboxUnread = myAccountToOtherProfiles.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const renderItem = (convo, variant) => {
    const lastMsg = convo.lastMessage;
    if (!lastMsg) return null;

    const isUnread = (convo.unreadCount || 0) > 0;
    const otherUid = convo.withUid;

    let header;
    if (variant === 'inbox') {
      const otherName = getName(otherUid, convo.withDisplayName, 'account');
      header = (
        <>
          <FiInbox className={styles.icon} />
          <span className={styles.metaText}>
            Otrzymałeś/aś wiadomość do Twojego <b>profilu</b> od{' '}
            <span className={styles.name}>{otherName}</span>
          </span>
        </>
      );
    } else if (variant === 'outbox') {
      const otherName = getName(otherUid, convo.withDisplayName, 'profile');
      header = (
        <>
          <FiSend className={styles.icon} />
          <span className={styles.metaText}>
            Rozmowa Twojego <b>konta</b> z wizytówką{' '}
            <span className={styles.name}>{otherName}</span>
          </span>
        </>
      );
    } else {
      // system
      const sysName = (convo.withDisplayName || 'Showly.app').trim();
      header = (
        <>
          <FiMail className={styles.icon} />
          <span className={styles.metaText}>
            Wiadomość systemowa od <span className={styles.name}>{sysName}</span>
          </span>
        </>
      );
    }

    return (
      <li
        key={convo._id}
        className={`${styles.item} ${isUnread ? styles.unread : styles.read} ${variant === 'system' ? styles.itemSystem : ''}`}
      >
        <Link
          to={`/konwersacja/${convo._id}`}
          className={styles.link}
          state={{ scrollToId: 'threadPageLayout' }}
        >
          <div className={styles.top}>
            <span className={styles.meta}>{header}</span>
            <span className={styles.date}>
              {new Date(lastMsg.createdAt).toLocaleString()}
              {isUnread && <span className={styles.dot} aria-hidden="true" />}
            </span>
          </div>
          <p className={styles.content}>{lastMsg.content}</p>
        </Link>
      </li>
    );
  };


  const SkeletonItem = () => (
    <li className={`${styles.item} ${styles.skeletonItem}`}>
      <div className={styles.link}>
        <div className={styles.top}>
          <span className={`${styles.meta} ${styles.skeleton} ${styles.shimmer}`} />
          <span className={`${styles.date} ${styles.skeleton} ${styles.shimmer}`} />
        </div>
        <p className={`${styles.content} ${styles.skeleton} ${styles.shimmer}`} />
      </div>
    </li>
  );

  return (
    <div id="scrollToId" className={styles.section}>
      <div className={styles.wrapper}>
        <div className={styles.headerRow}>
          <div>
            <h2 className={styles.sectionTitle}>Twoje powiadomienia</h2>
            <p className={styles.subTitle}>
              Zebraliśmy wiadomości do Twojego profilu
              {myProfile?.name ? <> <strong className={styles.subStrong}>{myProfile.name}</strong></> : ''}{' '}
              oraz wątki wysłane z <strong className={styles.subStrong}>Twojego konta</strong>.
            </p>
          </div>
        </div>

        {loading ? (
          <ul className={styles.list}>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonItem key={i} />
            ))}
          </ul>
        ) : (
          <>
            {/* SEGMENT 1: Konto innych -> Twoja wizytówka */}
            <div className={styles.sectionGroup}>
              <div className={styles.groupHeader}>
                <h3 className={styles.groupTitle}>
                  Otrzymane wiadomości do Twojego profilu
                  {myProfile?.name ? ` „${myProfile.name}”` : ''}
                </h3>
                <span className={styles.badge}>
                  {inboxUnread > 0 ? `${inboxUnread} nieprzeczyt.` : `${inboxToMyProfile.length}`}
                </span>
              </div>

              {inboxToMyProfile.length === 0 ? (
                <p className={styles.emptyGroup}>Brak wiadomości do Twojego profilu.</p>
              ) : (
                <ul className={styles.list}>
                  {inboxToMyProfile.map((c) => renderItem(c, 'inbox'))}
                </ul>
              )}
            </div>

            {/* SEGMENT 2: Twoje konto -> cudze wizytówki */}
            <div className={styles.sectionGroup}>
              <div className={styles.groupHeader}>
                <h3 className={styles.groupTitle}>
                  Rozmowy z innymi profilami (Twoje konto)
                </h3>
                <span className={styles.badge}>
                  {outboxUnread > 0 ? `${outboxUnread} nieprzeczyt.` : `${myAccountToOtherProfiles.length}`}
                </span>
              </div>

              {myAccountToOtherProfiles.length === 0 ? (
                <p className={styles.emptyGroup}>Brak rozmów z innymi profilami.</p>
              ) : (
                <ul className={styles.list}>
                  {myAccountToOtherProfiles.map((c) => renderItem(c, 'outbox'))}
                </ul>
              )}
            </div>
            {/* SEGMENT 3: Wiadomości systemowe */}
            <div className={styles.sectionGroup}>
              <div className={styles.groupHeader}>
                <h3 className={styles.groupTitle}>Wiadomości systemowe</h3>
                <span className={styles.badge}>
                  {systemUnread > 0 ? `${systemUnread} nieprzeczyt.` : `${systemConversations.length}`}
                </span>
              </div>

              {systemConversations.length === 0 ? (
                <p className={styles.emptyGroup}>Brak wiadomości systemowych.</p>
              ) : (
                <ul className={`${styles.list} ${styles.systemList}`}>
                  {systemConversations.map((c) => renderItem(c, 'system'))}
                </ul>
              )}
            </div>

          </>
        )}
      </div>
    </div>
  );
};

export default Notifications;
