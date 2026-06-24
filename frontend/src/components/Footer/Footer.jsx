import styles from "./Footer.module.scss";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaXTwitter,
} from "react-icons/fa6";
import {
  FiArrowUpRight,
  FiCheckCircle,
  FiCompass,
  FiCreditCard,
  FiGrid,
  FiHeart,
  FiMail,
  FiMapPin,
  FiMessageCircle,
  FiSearch,
  FiShield,
  FiStar,
  FiTrendingUp,
  FiUserPlus,
} from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";

const productLinks = [
  { label: "Strona główna", path: "/", scrollToId: "hero", icon: <FiCompass /> },
  {
    label: "Jak to działa",
    path: "/jak-to-dziala",
    scrollToId: "showlyJourney",
    icon: <FiGrid />,
  },
  { label: "Profile", path: "/profile", scrollToId: "profilesHub", icon: <FiSearch /> },
  {
    label: "Kontakt",
    path: "/kontakt",
    scrollToId: "scrollToId",
    icon: <FiMessageCircle />,
  },
];

const legalLinks = [
  { label: "Regulamin", path: "/regulamin", scrollToId: "scrollToId" },
  { label: "Polityka cookies", path: "/polityka-cookies", scrollToId: "scrollToId" },
  { label: "Kontakt", path: "/kontakt", scrollToId: "scrollToId" },
];

const Footer = ({ user = null, hasProfile = false, loadingProfileStatus = false }) => {
  const year = new Date().getFullYear();
  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = Boolean(user?.uid);
  const shouldOpenProfilePanel = isLoggedIn && (hasProfile || loadingProfileStatus);

  const profileAction = shouldOpenProfilePanel
    ? {
      label: loadingProfileStatus ? "Twój profil" : "Zarządzaj profilem",
      path: "/profil",
      scrollToId: "profileWrapper",
      icon: <FiStar />,
    }
    : {
      label: "Stwórz profil",
      path: "/stworz-profil",
      scrollToId: "scrollToId",
      icon: <FiUserPlus />,
    };

  const creatorLinks = [
    profileAction,
    { label: "Ulubione", path: "/ulubione", scrollToId: "scrollToId", icon: <FiHeart /> },
    {
      label: "Płatności i plany",
      path: shouldOpenProfilePanel ? "/profil" : "/stworz-profil",
      scrollToId: shouldOpenProfilePanel ? "billingSection" : "scrollToId",
      icon: <FiCreditCard />,
    },
  ];

  const scrollToSection = (scrollToId) => {
    if (!scrollToId) return;

    const targetIds = [
      scrollToId,
      scrollToId !== "scrollToId" ? "scrollToId" : null,
    ].filter(Boolean);

    let attempts = 0;

    const tryScroll = () => {
      const el = targetIds
        .map((targetId) => document.getElementById(targetId))
        .find(Boolean);

      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
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
    if (location.pathname === path && scrollToId) {
      scrollToSection(scrollToId);
      return;
    }

    navigate(path, { state: { scrollToId } });
  };

  const scrollToTop = () => {
    const html = document.documentElement;
    const body = document.body;

    const previousHtmlBehavior = html.style.scrollBehavior;
    const previousBodyBehavior = body.style.scrollBehavior;

    html.style.scrollBehavior = "smooth";
    body.style.scrollBehavior = "smooth";

    window.scrollTo({ top: 0, behavior: "smooth" });

    setTimeout(() => {
      html.scrollTop = 0;
      body.scrollTop = 0;

      html.style.scrollBehavior = previousHtmlBehavior;
      body.style.scrollBehavior = previousBodyBehavior;
    }, 500);
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
            {item.icon && <span className={styles.navIcon}>{item.icon}</span>}
            <span>{item.label}</span>
            <FiArrowUpRight className={styles.navArrow} />
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <footer className={styles.footer} id="footer">
      <div className={styles.topWave} aria-hidden="true">
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0,58 C180,98 330,18 520,48 C725,82 835,122 1040,72 C1210,30 1320,42 1440,74 L1440,0 L0,0 Z" />
        </svg>
      </div>
      <div className={styles.bg} aria-hidden="true">
        <span className={styles.gradientWash} />
        <span className={styles.glowOne} />
        <span className={styles.glowTwo} />
        <span className={styles.mesh} />
        <span className={styles.noise} />
      </div>

      <div className={styles.wrap}>
        <section className={styles.heroBand} aria-label="Showly footer">
          <div className={styles.brandPanel}>
            <div className={styles.brandTop}>
              <span className={styles.logoMark} aria-hidden="true">
                <span />
              </span>

              <div>
                <p className={styles.kicker}>Showly.me</p>
                <h2 className={styles.brandTitle}>
                  Profil, który pracuje za Ciebie.
                </h2>
              </div>
            </div>

            <p className={styles.brandText}>
              Jedno miejsce na opis, usługi, zdjęcia, opinie, kontakt i rezerwacje.
              Showly pomaga wyglądać profesjonalnie bez budowania własnej strony od zera.
            </p>

            <div className={styles.ctaRow}>
              <button
                type="button"
                className={styles.primaryCta}
                onClick={() => handleNavigate(profileAction.path, profileAction.scrollToId)}
              >
                {profileAction.icon}
                {profileAction.label}
              </button>

              <button
                type="button"
                className={styles.secondaryCta}
                onClick={() => handleNavigate("/profile", "profilesHub")}
              >
                <FiSearch />
                Przeglądaj profile
              </button>
            </div>
          </div>

          <div className={styles.signalPanel}>
            <div className={styles.signalTop}>
              <span className={styles.signalIcon}>
                <FiTrendingUp />
              </span>

              <div>
                <span className={styles.signalLabel}>Widoczność</span>
                <strong>Starter, Standard i Premium</strong>
              </div>
            </div>

            <div className={styles.signalGrid}>
              <div className={styles.signalItem}>
                <FiCheckCircle />
                <span>Publiczna wizytówka</span>
              </div>

              <div className={styles.signalItem}>
                <FiShield />
                <span>Regulamin i zgody</span>
              </div>

              <div className={styles.signalItem}>
                <FiMessageCircle />
                <span>Szybki kontakt</span>
              </div>

              <div className={styles.signalItem}>
                <FiStar />
                <span>Lepsza prezentacja</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.mainGrid}>
          <div className={styles.infoCard}>
            <h3 className={styles.cardTitle}>Showly w skrócie</h3>
            <p>
              Twórcy, specjaliści i usługodawcy mogą pokazać ofertę w sposób, który
              klient szybko rozumie: kim jesteś, co robisz, ile kosztuje usługa i jak
              się z Tobą skontaktować.
            </p>

            <div className={styles.badges}>
              <span>Mobile-first</span>
              <span>Profile usług</span>
              <span>Galeria i opinie</span>
            </div>
          </div>

          <nav className={styles.linkCard} aria-label="Nawigacja produktu">
            <h3 className={styles.cardTitle}>Platforma</h3>
            {renderLinks(productLinks)}
          </nav>

          <nav className={styles.linkCard} aria-label="Nawigacja dla twórców">
            <h3 className={styles.cardTitle}>Dla twórców</h3>
            {renderLinks(creatorLinks)}
          </nav>

          <div className={styles.contactCard}>
            <h3 className={styles.cardTitle}>Kontakt</h3>

            <a className={styles.contactRow} href="mailto:kontakt@showly.me">
              <span className={styles.contactIcon}>
                <FiMail />
              </span>
              <span>
                <small>E-mail</small>
                <strong>kontakt@showly.me</strong>
              </span>
            </a>

            <div className={styles.contactRow}>
              <span className={styles.contactIcon}>
                <FiMapPin />
              </span>
              <span>
                <small>Działamy</small>
                <strong>Online, cała Polska</strong>
              </span>
            </div>

            <div
              className={styles.socials}
              role="group"
              aria-label="Social media wkrótce"
            >
              <button
                type="button"
                className={styles.socialBtn}
                disabled
                title="Wkrótce"
                aria-label="Facebook wkrótce"
              >
                <FaFacebookF />
              </button>
              <button
                type="button"
                className={styles.socialBtn}
                disabled
                title="Wkrótce"
                aria-label="Instagram wkrótce"
              >
                <FaInstagram />
              </button>
              <button
                type="button"
                className={styles.socialBtn}
                disabled
                title="Wkrótce"
                aria-label="X wkrótce"
              >
                <FaXTwitter />
              </button>
              <button
                type="button"
                className={styles.socialBtn}
                disabled
                title="Wkrótce"
                aria-label="LinkedIn wkrótce"
              >
                <FaLinkedinIn />
              </button>
            </div>
          </div>
        </section>

        <div className={styles.bottom}>
          <div className={styles.bottomLeft}>
            <span className={styles.copy}>© {year} Showly.me</span>
            <span className={styles.separator} aria-hidden="true" />

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
            aria-label="Wróć na górę"
          >
            Do góry
            <span aria-hidden="true">↑</span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
