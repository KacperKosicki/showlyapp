import { useState, useEffect, useRef } from 'react';
import styles from './UserDropdown.module.scss';
import { FaChevronDown } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';

const UserDropdown = ({ user, refreshTrigger }) => {
  const [open, setOpen] = useState(false);
  const [remainingDays, setRemainingDays] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;

      try {
        const res = await axios.get(`/api/profiles/by-user/${user.uid}`);
        const profile = res.data;

        if (profile?.visibleUntil) {
          const now = new Date();
          const until = new Date(profile.visibleUntil);
          const diff = Math.ceil((until - now) / (1000 * 60 * 60 * 24));

          // 🔍 Lokalna walidacja daty ważności
          if (until < now) {
            setIsVisible(false);
            setRemainingDays(0);
          } else {
            setIsVisible(profile.isVisible !== false);
            setRemainingDays(Math.max(0, diff));
          }

          setHasProfile(true);
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setHasProfile(false);
        } else {
          console.error('Błąd pobierania profilu:', err);
        }
      }
    };

    fetchProfile();
  }, [user, refreshTrigger]);


  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('showlyUser');
      window.location.reload();
    } catch (err) {
      console.error('Błąd wylogowania:', err);
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
          <button onClick={() => navigate('/create-profile')}>
            Stwórz wizytówkę
          </button>
        )}
        {hasProfile && (
          <button onClick={() => navigate('/your-profile')}>
            Twoja wizytówka:{' '}
            {isVisible ? (
              <span className={styles.statusActive}>Pozostało {remainingDays} dni</span>
            ) : (
              <span className={styles.statusExpired}>Wygasła</span>
            )}
          </button>
        )}
        <button onClick={handleLogout}>Wyloguj</button>
      </div>
    </div>
  );
};

export default UserDropdown;
