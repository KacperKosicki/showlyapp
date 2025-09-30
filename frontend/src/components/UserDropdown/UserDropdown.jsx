import { useState, useEffect, useRef } from 'react';
import styles from './UserDropdown.module.scss';
import { FaChevronDown } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';

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

  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const location = useLocation();

  // 👤 Upewnij się, że photoURL jest aktualne (szczególnie po Google SSO)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (u && !u.photoURL) {
          await u.reload(); // często po Google photoURL wpada po reloadzie
        }
      } catch (_) { }
    });
    return () => unsub();
  }, []);

  // 🔍 Sprawdzanie statusu wizytówki
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;

      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/profiles/by-user/${user.uid}`
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
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setHasProfile(false);
        } else {
          console.error('❌ Błąd pobierania profilu:', err);
        }
      }
    };

    fetchProfile();
  }, [user, refreshTrigger]);

  // 🔔 Liczba nieprzeczytanych wiadomości
  useEffect(() => {
    const fetchUnread = async () => {
      if (!user?.uid || !setUnreadCount) return;

      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/conversations/by-uid/${user.uid}`
        );
        const totalUnread = res.data.reduce(
          (acc, convo) => acc + (convo.unreadCount || 0),
          0
        );
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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (path, scrollToId = null) => {
    setOpen(false);

    if (location.pathname === path && scrollToId) {
      const el = document.getElementById(scrollToId);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } else {
      navigate(path, { state: { scrollToId } });
    }
  };

  // 🔐 Wylogowanie
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
  const photoURL =
    currentUser?.photoURL || user?.photoURL || user?.avatar || null;

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <div className={styles.trigger} onClick={() => setOpen((prev) => !prev)}>
        {photoURL && (
          <img
            src={photoURL}
            alt=""
            className={styles.miniAvatar}
            decoding="async"
            referrerPolicy="no-referrer"
          />
        )}
        <span>{displayEmail}</span>
        <FaChevronDown className={styles.icon} />
      </div>

      <div className={`${styles.menu} ${open ? styles.visible : ''}`}>
        {/* Twoje konto */}
        <button onClick={() => handleNavigate('/konto')}>
          Twoje konto
        </button>

        {/* Wizytówka (dwuliniowo) */}
        {!hasProfile && (
          <button onClick={() => handleNavigate('/create-profile', 'scrollToId')}>
            Stwórz profil
          </button>
        )}

        {hasProfile && (
          <button
            onClick={() => handleNavigate('/your-profile', 'scrollToId')}
            className={styles.menuItemTwoLine}
          >
            <span className={styles.itemTitle}>Twój profil</span>
            {isVisible ? (
              <span className={`${styles.itemSub} ${styles.statusActive}`}>
                Pozostało {remainingDays} dni
              </span>
            ) : (
              <span className={`${styles.itemSub} ${styles.statusExpired}`}>
                Wygasła
              </span>
            )}
          </button>
        )}

        {/* Powiadomienia */}
        <button onClick={() => handleNavigate('/powiadomienia', 'scrollToId')}>
          Powiadomienia {unreadCount > 0 && <strong>({unreadCount})</strong>}
        </button>

        {/* Rezerwacje */}
        <button onClick={() => handleNavigate('/rezerwacje')}>
          Rezerwacje{' '}
          {Number(pendingReservationsCount) > 0 && (
            <strong className={styles.badge}>({pendingReservationsCount})</strong>
          )}
        </button>

        {/* Wylogowanie */}
        <button onClick={handleLogout}>Wyloguj</button>
      </div>
    </div>
  );
};

export default UserDropdown;
