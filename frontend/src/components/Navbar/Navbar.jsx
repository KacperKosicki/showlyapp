import { FaUser } from "react-icons/fa";
import styles from "./Navbar.module.scss";
import { Link, useNavigate } from "react-router-dom";
import UserDropdown from "../UserDropdown/UserDropdown";

const Navbar = ({
  user,
  loadingUser,
  refreshTrigger,
  unreadCount,
  setUnreadCount,
  pendingReservationsCount,
  setAlert,
}) => {
  const navigate = useNavigate();

  const handleAuthNavigate = (path, scrollToId) => {
    navigate(path, { state: { scrollToId } });
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.left}>
        <Link to="/" className={styles.logoWrap}>
          <span className={styles.logo}>Showly.me</span>
          <span className={styles.beta}>BETA</span>
        </Link>
      </div>

      <div className={styles.right}>
        <div className={styles.actionGroup}>
          {user ? (
            <UserDropdown
              user={user}
              loadingUser={loadingUser}
              refreshTrigger={refreshTrigger}
              unreadCount={unreadCount}
              setUnreadCount={setUnreadCount}
              pendingReservationsCount={pendingReservationsCount}
              setAlert={setAlert}
            />
          ) : (
<div className={styles.authButtons}>
  <button
    type="button"
    className={styles.loginPrompt}
    onClick={() => handleAuthNavigate("/login", "loginBox")}
  >
    <span className={styles.iconWrap}>
      <FaUser className={styles.icon} />
    </span>
    <span className={styles.buttonText}>Zaloguj się</span>
  </button>

  <button
    type="button"
    className={styles.registerPrompt}
    onClick={() => handleAuthNavigate("/register", "registerBox")}
  >
    <span className={styles.iconWrap}>
      <FaUser className={styles.icon} />
    </span>
    <span className={styles.buttonText}>Zarejestruj się</span>
  </button>
</div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;