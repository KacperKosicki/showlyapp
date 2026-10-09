import { useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowUp,
  FiArrowUpRight,
  FiMail,
  FiSend,
  FiStar,
  FiUserPlus,
} from "react-icons/fi";

import styles from "./Footer.module.scss";
import useScrollReveal from "../../utils/useScrollReveal";

const productLinks = [
  { label: "Ogłoszenia", path: "/ogloszenia", scrollToId: "announcements" },
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
  const revealRef = useScrollReveal();
  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = Boolean(user?.uid);

  const profileAction =
    loadingProfileStatus && isLoggedIn
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
    { label: "Twoje ogłoszenia", path: "/twoje-ogloszenia", scrollToId: "announcements" },
    {
      label: isLoggedIn && hasProfile ? "Twój profil" : "Stwórz profil",
      path: isLoggedIn && hasProfile ? "/profil" : "/stworz-profil",
      scrollToId:
        isLoggedIn && hasProfile ? "profileWrapper" : "scrollToId",
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
    <footer className={styles.footer} id="footer" ref={revealRef}>
      <div className={styles.backdrop} aria-hidden="true"><span>SHOWLY.</span></div>
      <div className={styles.inner}>
        <div className={styles.topBar}>
          <div className={styles.wordmark} aria-label="Showly.me Beta">
            <img src="/images/other/logo-showly.png" alt="" />
            <strong>Showly.me</strong><small>Beta</small>
          </div>
          <p>Miejsce dla ofert, pomysłów i współpracy.</p>
          <button type="button" className={styles.topShortcut} onClick={scrollToTop} aria-label="Wróć na górę strony"><span>Do góry</span><FiArrowUp aria-hidden="true" /></button>
        </div>
        <div className={styles.main} data-reveal>
          <section className={styles.statement}>
            <h2>Dobrych ludzi.<br /><span>Warto poznać.</span></h2>
            <p>Jedni mają pomysł. Inni mają talent. W Showly możecie znaleźć się nawzajem i zrobić coś dobrego.</p>
            <button type="button" className={styles.discoverLink} onClick={() => handleNavigate('/profile', 'profilesHub')}>Poznaj profile <FiArrowUpRight aria-hidden="true" /></button>
          </section>
          <div className={styles.invites}>
            <section className={styles.ideaInvite}>
              <FiSend className={styles.inviteIcon} aria-hidden="true" />
              <div><h3>Masz pomysł?</h3><p>Znajdź człowieka, który pomoże go zrealizować.</p></div>
              <button type="button" className={styles.ideaAction} onClick={() => handleNavigate('/ogloszenia', 'announcements')}>Odkryj ogłoszenia <FiArrowUpRight aria-hidden="true" /></button>
            </section>
            <section className={styles.profileInvite}>
              <ProfileIcon className={styles.inviteIcon} aria-hidden="true" />
              <div><h3>Masz talent?</h3><p>Daj się znaleźć. Pokaż, co możesz zrobić dla innych.</p></div>
              <button type="button" className={styles.profileAction} disabled={profileAction.disabled} onClick={() => handleNavigate(profileAction.path, profileAction.scrollToId)}>{profileAction.label}{!profileAction.disabled && <FiArrowUpRight aria-hidden="true" />}</button>
            </section>
          </div>
        </div>
        <div className={styles.utility}>
          <div className={styles.contact}>
            <span className={styles.navTitle}>Porozmawiajmy</span>
            <p>Masz pytanie, pomysł lub coś nie działa?<br />Napisz do nas.</p>
            <a href="mailto:kontakt@showly.me" className={styles.email}><FiMail aria-hidden="true" /><span>kontakt@showly.me</span><FiArrowUpRight aria-hidden="true" /></a>
          </div>
          <nav className={styles.navGroup} aria-label="Nawigacja platformy"><span className={styles.navTitle}>Odkrywaj Showly</span>{renderLinks(productLinks)}</nav>
          <nav className={styles.navGroup} aria-label="Nawigacja użytkownika"><span className={styles.navTitle}>Twoje miejsce</span>{renderLinks(creatorLinks)}</nav>
        </div>
        <div className={styles.bottom}>
          <span className={styles.copy}>© {year} Showly.me</span>
          <div className={styles.legalLinks}>{legalLinks.map(link => <button key={link.label} type="button" className={styles.legalLink} onClick={() => handleNavigate(link.path, link.scrollToId)}>{link.label}</button>)}</div>
          <span className={styles.bottomNote}><i aria-hidden="true" />Projekt w fazie beta</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
