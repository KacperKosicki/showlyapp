import { useEffect, useState } from "react";
import { FaMoon, FaSun, FaUser, FaUserPlus } from "react-icons/fa";
import styles from "./Navbar.module.scss";
import { Link, useNavigate } from "react-router-dom";
import UserDropdown from "../UserDropdown/UserDropdown";

const THEME_STORAGE_KEY = "theme";

const getInitialTheme = () => {
  if (typeof window === "undefined") return "light";

  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    return savedTheme === "dark" || savedTheme === "light" ? savedTheme : "light";
  } catch {
    return "light";
  }
};

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
  const [theme, setTheme] = useState(getInitialTheme);

  const isDarkTheme = theme === "dark";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 18);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Motyw nadal działa w bieżącej sesji, nawet jeśli zapis jest zablokowany.
    }
  }, [theme]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const lightTop = "#ffffff";
    const lightScrolled = "#f7f3ff";

    const darkTop = "#111216";
    const darkScrolled = "#191923";

    const statusColor = isDarkTheme
      ? scrolled
        ? darkScrolled
        : darkTop
      : scrolled
        ? lightScrolled
        : lightTop;

    let metaTheme = document.querySelector('meta[name="theme-color"]');

    if (!metaTheme) {
      metaTheme = document.createElement("meta");
      metaTheme.setAttribute("name", "theme-color");
      document.head.appendChild(metaTheme);
    }

    metaTheme.setAttribute("content", statusColor);

    document.documentElement.style.setProperty("--app-status-bg", statusColor);
  }, [isDarkTheme, scrolled]);

  const handleAuthNavigate = (path, scrollToId) => {
    navigate(path, { state: { scrollToId } });
  };

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  };

  return (
    <header className={`${styles.navbarShell} ${scrolled ? styles.scrolled : ""}`}>
      <nav className={styles.navbar} aria-label="Główna nawigacja Showly">
        <Link
          to="/"
          className={styles.logoWrap}
          aria-label="Przejdź na stronę główną Showly"
        >
          <span className={styles.logoMark}>S</span>

          <span className={styles.logoGroup}>
            <span className={styles.logoText}>Showly.me</span>
            <span className={styles.logoSub}>profil online</span>
          </span>

          <span className={styles.beta}>Beta</span>
        </Link>

        <div className={styles.right}>
          <button
            type="button"
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label={isDarkTheme ? "Włącz jasny motyw" : "Włącz ciemny motyw"}
            aria-pressed={isDarkTheme}
            title={isDarkTheme ? "Jasny motyw" : "Ciemny motyw"}
          >
            <span className={styles.themeIcon}>
              {isDarkTheme ? <FaSun /> : <FaMoon />}
            </span>

            <span className={styles.themeLabel}>
              {isDarkTheme ? "Jasny" : "Ciemny"}
            </span>
          </button>

          {loadingUser && !user ? (
            <div className={styles.loadingSlot} aria-label="Ładowanie użytkownika">
              <span className={styles.loadingDot} />
              <span className={styles.loadingLine} />
            </div>
          ) : user ? (
            <div className={styles.userSlot}>
              <UserDropdown
                user={user}
                loadingUser={loadingUser}
                refreshTrigger={refreshTrigger}
                unreadCount={unreadCount}
                setUnreadCount={setUnreadCount}
                pendingReservationsCount={pendingReservationsCount}
                setAlert={setAlert}
              />
            </div>
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
    </header>
  );
};

export default Navbar;