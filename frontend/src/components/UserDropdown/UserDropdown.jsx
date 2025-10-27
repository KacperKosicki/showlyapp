import { useState, useEffect, useRef } from 'react';
import styles from './UserDropdown.module.scss';
import { FaChevronDown } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { auth } from '../../firebase';

const API = process.env.REACT_APP_API_URL;

/** === helpers === */
const isLocalhostUrl = (u = '') =>
  /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(u);

const normalizeAvatar = (val = '') => {
  if (!val) return '';
  // /uploads… albo uploads… -> doklej backend
  if (val.startsWith('/uploads/')) return `${API}${val}`;
  if (val.startsWith('uploads/')) return `${API}/${val}`;
  // http -> https
  return val.replace(/^http:\/\//i, 'https://');
};

const pickAvatar = ({ dbAvatar, firebasePhotoURL }) => {
  // 1) avatar z DB (o ile nie localhost) ma priorytet
  if (dbAvatar && !isLocalhostUrl(dbAvatar)) return normalizeAvatar(dbAvatar);
  // 2) firebase photoURL (o ile nie localhost)
  if (firebasePhotoURL && !isLocalhostUrl(firebasePhotoURL))
    return normalizeAvatar(firebasePhotoURL);
  // 3) fallback
  return '';
};

const UserDropdown = ({
  user,
  refreshTrigger,
  unreadCount,
  setUnreadCount,
  pendingReservationsCount
}) => {
  const [open, setOpen] = useState(false);
  const [remainingDays, setRemainingDays] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [photoURL, setPhotoURL] = useState('');

  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const location = useLocation();

  // 🔄 Świeży user + naprawa złego photoURL (localhost)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (!u) {
          setPhotoURL('');
          return;
        }
        await u.reload().catch(() => {});
        // Jeśli w Firebase wisi stary localhost, wyczyść go
        if (isLocalhostUrl(u.photoURL)) {
          try { await updateProfile(u, { photoURL: '' }); } catch {}
        }
        // Pobierz usera z backendu, by mieć avatar z DB
        let dbAvatar = '';
        try {
          const r = await fetch(`${API}/api/users/${u.uid}`);
          if (r.ok) {
            const db = await r.json();
            dbAvatar = db?.avatar || '';
          }
        } catch {}
        setPhotoURL(pickAvatar({ dbAvatar, firebasePhotoURL: auth.currentUser?.photoURL || '' }));
      } catch {}
    });
    return () => unsub();
  }, []);

  // 🔍 Status wizytówki
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;
      try {
        const res = await axios.get(
          `${API}/api/profiles/by-user/${user.uid}`,
          { headers: { Accept: 'application/json' } }
        );
        const profile = res.data;
        if (profile?.visibleUntil) {
          const now = new Date();
          const until = new Date(profile.visibleUntil);
          const diff = Math.ceil((until - now) / (1000 * 60 * 60 * 24));
          setIsVisible(profile.isVisible !== false && until > now);
          setRemainingDays(diff > 0 ? diff : 0);
          setHasProfile(true);
        } else {
          setHasProfile(!!profile);
          setIsVisible(!!profile);
          setRemainingDays(!!profile ? 0 : null);
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setHasProfile(false);
          setIsVisible(false);
          setRemainingDays(null);
        } else {
          console.error('❌ Błąd pobierania profilu:', err);
        }
      }
    };
    fetchProfile();
  }, [user, refreshTrigger]);

  // 🔔 Unread
  useEffect(() => {
    const fetchUnread = async () => {
      if (!user?.uid || !setUnreadCount) return;
      try {
        const res = await axios.get(`${API}/api/conversations/by-uid/${user.uid}`);
        const totalUnread = res.data.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
        setUnreadCount(totalUnread);
      } catch (err) {
        console.error('❌ Błąd pobierania liczby wiadomości:', err);
      }
    };
    fetchUnread();
  }, [user, refreshTrigger, location.pathname, setUnreadCount]);

  // 👋 Zamknięcie dropdown po kliknięciu poza
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (path, scrollToId = null) => {
    setOpen(false);
    if (location.pathname === path && scrollToId) {
      const el = document.getElementById(scrollToId);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } else {
      navigate(path, { state: { scrollToId } });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('showlyUser');
      navigate('/');
    } catch (err) {
      console.error('❌ Błąd wylogowania:', err);
    }
  };

  const currentUser = auth.currentUser;
  const displayEmail = user?.email || currentUser?.email || 'Konto';

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <div className={styles.trigger} onClick={() => setOpen((prev) => !prev)}>
        {photoURL ? (
          <img
            src={photoURL}
            alt=""
            className={styles.miniAvatar}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => { e.currentTarget.src = '/images/other/no-image.png'; }}
          />
        ) : null}
        <span>{displayEmail}</span>
        <FaChevronDown className={styles.icon} />
      </div>

      <div className={`${styles.menu} ${open ? styles.visible : ''}`}>
        <button onClick={() => handleNavigate('/konto', 'scrollToId')}>Twoje konto</button>

        {!hasProfile && (
          <button onClick={() => handleNavigate('/stworz-profil', 'scrollToId')}>
            Stwórz profil
          </button>
        )}

        {hasProfile && (
          <button
            onClick={() => handleNavigate('/profil', 'scrollToId')}
            className={styles.menuItemTwoLine}
          >
            <span className={styles.itemTitle}>Twój profil</span>
            {isVisible ? (
              <span className={`${styles.itemSub} ${styles.statusActive}`}>
                Pozostało {remainingDays} dni
              </span>
            ) : (
              <span className={`${styles.itemSub} ${styles.statusExpired}`}>Wygasła</span>
            )}
          </button>
        )}

        <button onClick={() => handleNavigate('/powiadomienia', 'scrollToId')}>
          Powiadomienia {unreadCount > 0 && <strong>({unreadCount})</strong>}
        </button>

        <button onClick={() => handleNavigate('/rezerwacje', 'scrollToId')}>
          Rezerwacje {Number(pendingReservationsCount) > 0 && (
            <strong className={styles.badge}>({pendingReservationsCount})</strong>
          )}
        </button>

        <button onClick={() => handleNavigate('/ulubione', 'scrollToId')}>Ulubione</button>
        <button onClick={handleLogout}>Wyloguj</button>
      </div>
    </div>
  );
};

export default UserDropdown;
