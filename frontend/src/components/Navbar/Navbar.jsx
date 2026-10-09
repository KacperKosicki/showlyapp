import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiArrowUpRight,
  FiClipboard,
  FiMenu,
  FiX,
  FiInfo,
  FiZap,
  FiStar,
  FiUsers,
  FiMoon,
  FiSun,
  FiUser,
  FiUserPlus,
} from "react-icons/fi";
import { Link, useLocation, useNavigate } from "react-router-dom";

import UserDropdown from "../UserDropdown/UserDropdown";
import dropdownStyles from "../UserDropdown/UserDropdown.module.scss";
import styles from "./Navbar.module.scss";
import BetaTestBanner from '../BetaTestBanner/BetaTestBanner';

const THEME_STORAGE_KEY = "theme";

const navItems = [
  { label: "O Showly", scrollToId: "about-app", Icon: FiInfo },
  { label: "Jak działa", scrollToId: "how-showly-works", Icon: FiZap },
  { label: "Promowane profile", scrollToId: "promoted-partners-title", Icon: FiStar },
  { label: "Wszystkie profile", scrollToId: "showly-directory", Icon: FiUsers },
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
  const isHomePage = location.pathname === "/";

  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);
  const [activeMenu, setActiveMenu] = useState(null);
  const navigationOpen = activeMenu === 'navigation';
  const navigationRef = useRef(null);
  const navigationTriggerRef = useRef(null);
  const navigationMenuRef = useRef(null);
  const handleAccountMenuChange = useCallback(open => {
    setActiveMenu(current => open ? 'account' : current === 'account' ? null : current);
  }, []);

  useEffect(() => { setActiveMenu(null); }, [location.pathname, location.key]);

  useEffect(() => {
    const closeOnDesktop = () => {
      if (window.innerWidth > 1200) setActiveMenu(current => current === 'navigation' ? null : current);
    };
    window.addEventListener('resize', closeOnDesktop);
    return () => window.removeEventListener('resize', closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!navigationOpen) return undefined;
    navigationMenuRef.current?.querySelector('[role="menuitem"]')?.focus();
    const closeOutside = event => {
      if (!navigationRef.current?.contains(event.target)) {
        setActiveMenu(current => current === 'navigation' ? null : current);
      }
    };
    const closeWithEscape = event => {
      if (event.key === 'Escape') {
        setActiveMenu(null);
        navigationTriggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeWithEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeWithEscape);
    };
  }, [navigationOpen]);

  const handleNavigationKeys = event => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = [...navigationMenuRef.current.querySelectorAll('[role="menuitem"]')];
    const current = items.indexOf(document.activeElement);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[index]?.focus();
  };

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

    const floating = scrolled || !isHomePage;
    const statusColor = isDarkTheme
      ? floating
        ? darkScrolled
        : darkTop
      : floating
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
  }, [isDarkTheme, scrolled, isHomePage]);

  const handleAuthNavigate = (path, scrollToId) => {
    navigate(path, { state: { scrollToId } });
  };

  const handleSectionNavigate = (scrollToId) => {
    setActiveMenu(null);
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
    <>
    <BetaTestBanner user={user} />
    <header
      className={`${styles.navbarShell} ${!isHomePage ? styles.subpage : ""} ${scrolled || !isHomePage ? styles.scrolled : ""
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

        <div className={styles.navLinks} aria-label="Nawigacja Showly">
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
          <Link className={`${styles.navLink} ${styles.announcementsNav}`} to="/ogloszenia" state={{ scrollToId: 'announcements' }}><span className={styles.newBadge}>Nowość</span>Ogłoszenia</Link>
        </div>

        <div className={styles.right}>
          <div className={`${styles.mobileNavigationWrap} ${dropdownStyles.dropdown}`} ref={navigationRef}>
            <button type="button" ref={navigationTriggerRef}
              className={`${styles.themeToggle} ${styles.mobileMenuToggle}`}
              onClick={() => setActiveMenu(current => current === 'navigation' ? null : 'navigation')}
              aria-label={navigationOpen ? 'Zamknij menu nawigacji' : 'Otwórz menu nawigacji'}
              aria-expanded={navigationOpen} aria-haspopup="menu" aria-controls="showly-mobile-navigation">
              {navigationOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
            </button>
            {navigationOpen && <div id="showly-mobile-navigation" ref={navigationMenuRef}
              className={`${dropdownStyles.menu} ${dropdownStyles.menuVisible} ${styles.mobileNavigation}`} role="menu" aria-label="Nawigacja Showly"
              onKeyDown={handleNavigationKeys}
              onBlur={event => {
                if (event.relatedTarget && !navigationRef.current?.contains(event.relatedTarget)) {
                  setActiveMenu(current => current === 'navigation' ? null : current);
                }
              }}>
              <div className={styles.mobileNavigationHeader}><small>Poznaj Showly</small><strong>Dokąd chcesz przejść?</strong></div>
              <div className={dropdownStyles.menuList}>
              {navItems.map(({ label, scrollToId, Icon }) => <button type="button" role="menuitem"
                className={dropdownStyles.item} key={scrollToId} onClick={() => handleSectionNavigate(scrollToId)}>
                <span className={dropdownStyles.itemLeft}><Icon className={dropdownStyles.itemIcon} aria-hidden="true" /><span>{label}</span></span><FiArrowUpRight className={dropdownStyles.itemArrow} aria-hidden="true" />
              </button>)}
              <Link role="menuitem" className={dropdownStyles.item} to="/ogloszenia"
                state={{ scrollToId: 'announcements' }} onClick={() => setActiveMenu(null)}>
                <span className={dropdownStyles.itemLeft}><FiClipboard className={dropdownStyles.itemIcon} aria-hidden="true" /><span>Ogłoszenia</span></span><small className={styles.mobileNavigationNew}>Nowość</small>
              </Link>
              </div>
            </div>}
          </div>
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
                menuOpen={activeMenu === 'account'}
                onMenuOpenChange={handleAccountMenuChange}
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
    </>
  );
};

export default Navbar;
