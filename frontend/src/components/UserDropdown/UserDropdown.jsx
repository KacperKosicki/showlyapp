import { useState, useEffect, useRef } from 'react';
import styles from './UserDropdown.module.scss';
import { FaChevronDown } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { auth } from '../../firebase';

const API = process.env.REACT_APP_API_URL;

/** =========================
 * helpers
 * ========================= */
const isLocalhostUrl = (u = '') =>
  /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(String(u || ''));

const normalizeAvatar = (val = '') => {
  const v = String(val || '').trim();
  if (!v) return '';

  // pełny URL (Cloudinary/Google/itd.) → zostaw jak jest
  if (/^https?:\/\//i.test(v)) return v;

  // kompatybilność ze starym /uploads (jeśli jeszcze gdzieś występuje)
  if (v.startsWith('/uploads/')) return `${API}${v}`;
  if (v.startsWith('uploads/')) return `${API}/${v}`;

  return '';
};

const pickAvatar = ({ dbAvatar, firebasePhotoURL }) =>
  normalizeAvatar(dbAvatar) || normalizeAvatar(firebasePhotoURL) || '';

/** =========================
 * component
 * ========================= */
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

  // 🔄 Świeży user + avatar z backendu lub Firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (!u) {
          setPhotoURL('');
          return;
        }

        await u.reload().catch(() => {});

        // jeśli Firebase ma photoURL na localhost → wyczyść (żeby nie psuło produkcji)
        if (isLocalhostUrl(u.photoURL)) {
          try {
            await updateProfile(u, { photoURL: '' });
          } catch {}
        }

        // pobierz avatar z DB
        let dbAvatar = '';
        try {
          const r = await fetch(`${API}/api/users/${u.uid}`);
          if (r.ok) {
            const db = await r.json();
            dbAvatar = db?.avatar || '';
          }
        } catch {}

        setPhotoURL(
          pickAvatar({
            dbAvatar,
            firebasePhotoURL: auth.currentUser?.photoURL || ''
          })
        );
      } catch {
        // jak coś wybuchnie — pokaż placeholder
        setPhotoURL('');
      }
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
          console.warn('ℹ️ Brak profilu — wszystko OK ✅');
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
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
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

  const displayEmail = user?.email || auth.currentUser?.email || 'Konto';

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <div className={styles.trigger} onClick={() => setOpen((prev) => !prev)}>
        {/* zawsze pokazuj avatara (fallback) */}
        <img
          src={photoURL || '/images/other/no-image.png'}
          alt=""
          className={styles.miniAvatar}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = '/images/other/no-image.png';
          }}
        />

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
