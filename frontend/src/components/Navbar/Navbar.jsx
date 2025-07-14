import { FaUser } from 'react-icons/fa';
import styles from './Navbar.module.scss';
import { Link, useNavigate } from 'react-router-dom';
import UserDropdown from '../UserDropdown/UserDropdown';

const Navbar = ({ user, refreshTrigger, unreadCount, setUnreadCount, pendingReservationsCount }) => {
  const navigate = useNavigate();

  return (
    <nav className={styles.navbar}>
      <div className={styles.left}>
        <Link to="/" className={styles.logo}>LOOKLYAPP</Link>
      </div>

      <div className={styles.right}>
        <div className={styles.actionGroup}>
          {user ? (
            <UserDropdown
              user={user}
              refreshTrigger={refreshTrigger}
              unreadCount={unreadCount}
              setUnreadCount={setUnreadCount}
              pendingReservationsCount={pendingReservationsCount}
            />
          ) : (
            <div className={styles.loginPrompt} onClick={() => navigate('/login')}>
              <FaUser className={styles.icon} />
              <span>Zaloguj się / Zarejestruj się</span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
