import { useState, useEffect, useRef } from 'react';
import styles from './UserDropdown.module.scss';
import { FaChevronDown } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';

const API = process.env.REACT_APP_API_URL;

/** =========================
 * helpers
 * ========================= */
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
  loadingUser,
  refreshTrigger,
  unreadCount,
  setUnreadCount,
  pendingReservationsCount
}) => {
  const [open, setOpen] = useState(false);

  // profile state
  const [profileStatus, setProfileStatus] = useState('loading'); // loading | has | none | error
  const [remainingDays, setRemainingDays] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  // avatar
  const [photoURL, setPhotoURL] = useState('');

  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const location = useLocation();

  // ✅ Avatar: bez drugiego listenera auth
  useEffect(() => {
    const run = async () => {
      if (!user?.uid) {
        setPhotoURL('');
        return;
      }

      try {
        let dbAvatar = '';
        try {
          const r = await fetch(`${API}/api/users/${user.uid}`, {
            headers: { Accept: 'application/json' }
          });
          if (r.ok) {
            const db = await r.json();
            dbAvatar = db?.avatar || '';
          }
        } catch { }

        const firebasePhotoURL = auth.currentUser?.photoURL || '';

        setPhotoURL(
          pickAvatar({
            dbAvatar,
            firebasePhotoURL
          })
        );
      } catch {
        setPhotoURL('');
      }
    };

    run();
  }, [user?.uid]);

  // ✅ Status wizytówki: Abort + nie pokazuj "stwórz profil" przy błędzie sieci
  useEffect(() => {
    if (!user?.uid) {
      setProfileStatus('none');
      setIsVisible(false);
      setRemainingDays(null);
      return;
    }

    const controller = new AbortController();

    const fetchProfile = async () => {
      try {
        setProfileStatus('loading');

        const res = await fetch(`${API}/api/profiles/by-user/${user.uid}`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        if (res.status === 404) {
          setProfileStatus('none');
          setIsVisible(false);
          setRemainingDays(null);
          return;
        }

        if (!res.ok) {
          setProfileStatus('error');
          return;
        }

        const profile = await res.json();

        if (profile?.visibleUntil) {
          const now = new Date();
          const until = new Date(profile.visibleUntil);
          const diff = Math.ceil((until - now) / (1000 * 60 * 60 * 24));

          setIsVisible(profile.isVisible !== false && until > now);
          setRemainingDays(diff > 0 ? diff : 0);
        } else {
          setIsVisible(!!profile);
          setRemainingDays(!!profile ? 0 : null);
        }

        setProfileStatus(profile ? 'has' : 'none');
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setProfileStatus('error');
        console.error('❌ Błąd pobierania profilu:', err);
      }
    };

    fetchProfile();

    return () => controller.abort();
  }, [user?.uid, refreshTrigger]);

  // 🔔 Unread: zostawiamy axios jak miałeś (ok), ale tylko gdy jest uid
  useEffect(() => {
    const fetchUnread = async () => {
      if (!user?.uid || !setUnreadCount) return;

      try {
        const res = await axios.get(`${API}/api/conversations/by-uid/${user.uid}`);
        const totalUnread = Array.isArray(res.data)
          ? res.data.reduce((acc, c) => acc + Number(c.unreadCount || 0), 0)
          : 0;

        setUnreadCount(totalUnread);
      } catch (err) {
        console.error('❌ Błąd pobierania liczby wiadomości:', err);
      }
    };

    fetchUnread();
  }, [user?.uid, refreshTrigger, location.pathname, setUnreadCount]);

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

  // ✅ gdy aplikacja jeszcze ładuje auth – nie pokazuj "stwórz profil"
  const showProfileActions = !loadingUser;

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <div className={styles.trigger} onClick={() => setOpen((prev) => !prev)}>
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

        {/* ✅ tylko jeśli auth już gotowy */}
        {showProfileActions && profileStatus === 'none' && (
          <button onClick={() => handleNavigate('/stworz-profil', 'scrollToId')}>
            Stwórz profil
          </button>
        )}

        {showProfileActions && profileStatus === 'has' && (
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

        {showProfileActions && profileStatus === "error" && (
          <div className={styles.netBanner} role="status" aria-live="polite">
            <span className={styles.netDot} aria-hidden="true" />
            <span className={styles.netText}>Problem z połączeniem… Spróbuj odświeżyć.</span>
          </div>
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
