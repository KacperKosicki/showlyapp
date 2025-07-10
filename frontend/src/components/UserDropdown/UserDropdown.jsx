import { useState, useEffect, useRef } from 'react';
import styles from './UserDropdown.module.scss';
import { FaChevronDown } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';

const UserDropdown = ({ user, refreshTrigger, unreadCount, setUnreadCount }) => {
  const [open, setOpen] = useState(false);
  const [remainingDays, setRemainingDays] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const location = useLocation(); // ⬅ reaguje na zmiany ścieżki

  // 🔍 Sprawdzanie statusu wizytówki
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;

      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/profiles/by-user/${user.uid}`);
        const profile = res.data;

        if (profile?.visibleUntil) {
          const now = new Date();
          const until = new Date(profile.visibleUntil);
          const diff = Math.ceil((until - now) / (1000 * 60 * 60 * 24));

          setIsVisible(profile.isVisible !== false && until > now);
          setRemainingDays(diff > 0 ? diff : 0);
          setHasProfile(true);
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
      if (!user?.uid) return;

      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/conversations/by-uid/${user.uid}`);
        const totalUnread = res.data.reduce((acc, convo) => acc + convo.unreadCount, 0);
        setUnreadCount(totalUnread);
      } catch (err) {
        console.error('❌ Błąd pobierania liczby wiadomości:', err);
      }

    };

    fetchUnread();
  }, [user, refreshTrigger, location.pathname]); // aktualizuj przy każdej zmianie strony

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
        }, 100); // ⏱ małe opóźnienie by mieć pewność, że element istnieje
      }
    } else {
      navigate(path, { state: { scrollToId } }); // przekaż scrollId do innej strony
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

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <div className={styles.trigger} onClick={() => setOpen(prev => !prev)}>
        <span>{user.email}</span>
        <FaChevronDown className={styles.icon} />
      </div>

      <div className={`${styles.menu} ${open ? styles.visible : ''}`}>
        {!hasProfile && (
          <button onClick={() => handleNavigate('/create-profile', 'scrollToId')}>
            Stwórz wizytówkę
          </button>
        )}

        {hasProfile && (
          <button onClick={() => handleNavigate('/your-profile', 'scrollToId')}>
            Twoja wizytówka:{' '}
            {isVisible ? (
              <span className={styles.statusActive}>Pozostało {remainingDays} dni</span>
            ) : (
              <span className={styles.statusExpired}>Wygasła</span>
            )}
          </button>
        )}

        <button onClick={() => handleNavigate('/powiadomienia', 'scrollToId')}>
          Powiadomienia {unreadCount > 0 && <strong>({unreadCount})</strong>}
        </button>

        <button onClick={handleLogout}>Wyloguj</button>
      </div>
    </div>
  );
};

export default UserDropdown;
