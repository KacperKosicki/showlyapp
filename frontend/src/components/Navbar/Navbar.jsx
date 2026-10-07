import { useEffect, useState } from "react";
import {
  FiArrowUpRight,
  FiMoon,
  FiSun,
  FiUser,
  FiUserPlus,
} from "react-icons/fi";
import { Link, useLocation, useNavigate } from "react-router-dom";

import UserDropdown from "../UserDropdown/UserDropdown";
import styles from "./Navbar.module.scss";

const THEME_STORAGE_KEY = "theme";

const navItems = [
  { label: "O Showly", scrollToId: "about-app" },
  { label: "Jak działa", scrollToId: "how-showly-works" },
  { label: "Promowane profile", scrollToId: "promoted-partners-title" },
  { label: "Wszystkie profile", scrollToId: "showly-directory" },
];

const getInitialTheme = () => {
  if (typeof window === "undefined") {
    return "light";
  }

  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === "dark" || savedTheme === "light"
      ? savedTheme
      : "light";
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
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);

  const isDarkTheme = theme === "dark";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 28);
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
      // Motyw nadal działa w bieżącej sesji.
    }
  }, [theme]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const lightTop = "#f1eee4";
    const lightScrolled = "#fffdf7";
    const darkTop = "#111310";
    const darkScrolled = "#1c1f1b";

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

  const handleSectionNavigate = (scrollToId) => {
    if (location.pathname === "/") {
      const element = document.getElementById(scrollToId);

      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    navigate("/", { state: { scrollToId } });
  };

  const handleLogoClick = (event) => {
    if (location.pathname !== "/") {
      return;
    }

    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === "dark" ? "light" : "dark"
    );
  };

  return (
    <header
      className={`${styles.navbarShell} ${scrolled ? styles.scrolled : ""
        }`}
    >
      <nav className={styles.navbar} aria-label="Główna nawigacja Showly">
        <Link
          to="/"
          className={styles.logoWrap}
          aria-label="Przejdź na początek strony Showly"
          onClick={handleLogoClick}
        >
          <span className={styles.logoMark} aria-hidden="true">
            <img
              src="/images/other/logo-showly.png"
              alt=""
              className={styles.logoImage}
            />
          </span>

          <span className={styles.logoText}>Showly.me</span>
          <span className={styles.beta}>Beta</span>
        </Link>

        <div className={styles.navLinks} aria-label="Sekcje strony głównej">
          {navItems.map((item) => (
            <button
              type="button"
              className={styles.navLink}
              onClick={() => handleSectionNavigate(item.scrollToId)}
              key={item.scrollToId}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className={styles.right}>
          <button
            type="button"
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label={
              isDarkTheme ? "Włącz jasny motyw" : "Włącz ciemny motyw"
            }
            aria-pressed={isDarkTheme}
            title={isDarkTheme ? "Jasny motyw" : "Ciemny motyw"}
          >
            {isDarkTheme ? (
              <FiSun aria-hidden="true" />
            ) : (
              <FiMoon aria-hidden="true" />
            )}
          </button>

          {loadingUser && !user ? (
            <div
              className={styles.loadingSlot}
              role="status"
              aria-label="Ładowanie użytkownika"
            >
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
                aria-label="Zaloguj się"
                title="Zaloguj się"
              >
                <FiUser aria-hidden="true" />
                <span>Zaloguj</span>
              </button>

              <button
                type="button"
                className={styles.registerPrompt}
                onClick={() =>
                  handleAuthNavigate("/register", "registerBox")
                }
                aria-label="Załóż konto"
                title="Załóż konto"
              >
                <FiUserPlus aria-hidden="true" />
                <span>Załóż konto</span>
                <FiArrowUpRight
                  className={styles.registerArrow}
                  aria-hidden="true"
                />
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;