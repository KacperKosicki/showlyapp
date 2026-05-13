import { useEffect, useState } from "react";
import { FaUser, FaUserPlus } from "react-icons/fa";
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAuthNavigate = (path, scrollToId) => {
    navigate(path, { state: { scrollToId } });
  };

  return (
    <div className={`${styles.navbarShell} ${scrolled ? styles.scrolled : ""}`}>
      <nav className={styles.navbar}>
        <Link to="/" className={styles.logoWrap}>
          <span className={styles.logoMark}>S</span>
          <span className={styles.logoText}>Showly.me</span>
          <span className={styles.beta}>Beta</span>
        </Link>

        <div className={styles.right}>
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
                <FaUser />
                <span>Zaloguj</span>
              </button>

              <button
                type="button"
                className={styles.registerPrompt}
                onClick={() => handleAuthNavigate("/register", "registerBox")}
              >
                <FaUserPlus />
                <span>Załóż konto</span>
              </button>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Navbar;