import { useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiArrowUp,
  FiArrowUpRight,
  FiMail,
  FiStar,
  FiUserPlus,
} from "react-icons/fi";

import styles from "./Footer.module.scss";

const productLinks = [
  {
    label: "Strona główna",
    path: "/",
    scrollToId: "hero",
  },
  {
    label: "Jak to działa",
    path: "/jak-to-dziala",
    scrollToId: "showlyJourney",
  },
  {
    label: "Profile",
    path: "/profile",
    scrollToId: "profilesHub",
  },
  {
    label: "Kontakt",
    path: "/kontakt",
    scrollToId: "scrollToId",
  },
];

const legalLinks = [
  {
    label: "Regulamin",
    path: "/regulamin",
    scrollToId: "scrollToId",
  },
  {
    label: "Polityka cookies",
    path: "/polityka-cookies",
    scrollToId: "scrollToId",
  },
];

const Footer = ({
  user = null,
  hasProfile = false,
  loadingProfileStatus = false,
}) => {
  const year = new Date().getFullYear();
  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = Boolean(user?.uid);

  const profileAction = loadingProfileStatus && isLoggedIn
    ? {
      label: "Sprawdzanie profilu...",
      path: null,
      scrollToId: null,
      Icon: FiStar,
      disabled: true,
    }
    : isLoggedIn && hasProfile
      ? {
        label: "Zarządzaj profilem",
        path: "/profil",
        scrollToId: "profileWrapper",
        Icon: FiStar,
        disabled: false,
      }
      : {
        label: "Stwórz profil",
        path: "/stworz-profil",
        scrollToId: "scrollToId",
        Icon: FiUserPlus,
        disabled: false,
      };

  const creatorLinks = [
    {
      label: isLoggedIn && hasProfile ? "Twój profil" : "Stwórz profil",
      path: isLoggedIn && hasProfile ? "/profil" : "/stworz-profil",
      scrollToId: isLoggedIn && hasProfile ? "profileWrapper" : "scrollToId",
    },
    {
      label: "Ulubione",
      path: "/ulubione",
      scrollToId: "scrollToId",
    },
  ];

  const scrollToSection = (scrollToId) => {
    if (!scrollToId) {
      return;
    }

    const targetIds = [
      scrollToId,
      scrollToId !== "scrollToId" ? "scrollToId" : null,
    ].filter(Boolean);

    let attempts = 0;

    const tryScroll = () => {
      const element = targetIds
        .map((targetId) => document.getElementById(targetId))
        .find(Boolean);

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        return;
      }

      attempts += 1;

      if (attempts < 20) {
        requestAnimationFrame(tryScroll);
      }
    };

    requestAnimationFrame(tryScroll);
  };

  const handleNavigate = (path, scrollToId = null) => {
    if (!path) {
      return;
    }

    if (location.pathname === path && scrollToId) {
      scrollToSection(scrollToId);
      return;
    }

    navigate(path, {
      state: {
        scrollToId,
      },
    });
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const renderLinks = (items) => (
    <ul className={styles.linkList}>
      {items.map((item) => (
        <li key={`${item.path}-${item.label}`}>
          <button
            type="button"
            className={styles.navLink}
            onClick={() => handleNavigate(item.path, item.scrollToId)}
          >
            <span>{item.label}</span>
            <FiArrowUpRight aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );

  const ProfileIcon = profileAction.Icon;

  return (
    <footer className={styles.footer} id="footer">
      <div className={styles.decor} aria-hidden="true">
        <span className={styles.orb} />
        <span className={styles.line} />
      </div>

      <div className={styles.inner}>
        <section className={styles.intro}>
          <div className={styles.introCopy}>
            <span className={styles.eyebrow}>Showly.me</span>

            <h2>Jedno miejsce na Twoją ofertę.</h2>

            <p>
              Pokaż usługi, realizacje i kontakt pod jednym linkiem, który łatwo
              udostępnisz klientom.
            </p>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryAction}
              disabled={profileAction.disabled}
              onClick={() =>
                handleNavigate(profileAction.path, profileAction.scrollToId)
              }
            >
              <ProfileIcon aria-hidden="true" />
              <span>{profileAction.label}</span>
              {!profileAction.disabled && <FiArrowRight aria-hidden="true" />}
            </button>

            <button
              type="button"
              className={styles.textAction}
              onClick={() => handleNavigate("/profile", "profilesHub")}
            >
              <span>Przeglądaj profile</span>
              <FiArrowUpRight aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className={styles.navigation}>
          <nav className={styles.navGroup} aria-label="Nawigacja platformy">
            <span className={styles.navTitle}>Platforma</span>
            {renderLinks(productLinks)}
          </nav>

          <nav className={styles.navGroup} aria-label="Nawigacja użytkownika">
            <span className={styles.navTitle}>Dla Ciebie</span>
            {renderLinks(creatorLinks)}
          </nav>

          <div className={styles.contact}>
            <span className={styles.navTitle}>Kontakt</span>

            <p>Masz pytanie albo chcesz zgłosić problem?</p>

            <a href="mailto:kontakt@showly.me" className={styles.email}>
              <FiMail aria-hidden="true" />
              <span>kontakt@showly.me</span>
              <FiArrowUpRight aria-hidden="true" />
            </a>
          </div>
        </section>

        <div className={styles.bottom}>
          <div className={styles.bottomLeft}>
            <span className={styles.copy}>© {year} Showly.me</span>

            <div className={styles.legalLinks}>
              {legalLinks.map((link) => (
                <button
                  key={link.label}
                  type="button"
                  className={styles.legalLink}
                  onClick={() => handleNavigate(link.path, link.scrollToId)}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className={styles.toTop}
            onClick={scrollToTop}
            aria-label="Wróć na górę strony"
          >
            <span>Do góry</span>
            <FiArrowUp aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
