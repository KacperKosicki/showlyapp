import { useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowUpRight,
  FiArrowUp,
  FiHeart,
  FiMail,
  FiSearch,
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
  {
    label: "Kontakt",
    path: "/kontakt",
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

  const shouldOpenProfilePanel =
    isLoggedIn &&
    (hasProfile || loadingProfileStatus);

  const profileAction = shouldOpenProfilePanel
    ? {
        label: loadingProfileStatus
          ? "Twój profil"
          : "Zarządzaj profilem",
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
    {
      label: "Ulubione",
      path: "/ulubione",
      scrollToId: "scrollToId",
      icon: <FiHeart />,
    },
  ];

  const scrollToSection = (scrollToId) => {
    if (!scrollToId) {
      return;
    }

    const targetIds = [
      scrollToId,
      scrollToId !== "scrollToId"
        ? "scrollToId"
        : null,
    ].filter(Boolean);

    let attempts = 0;

    const tryScroll = () => {
      const element = targetIds
        .map((targetId) =>
          document.getElementById(targetId)
        )
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

  const handleNavigate = (
    path,
    scrollToId = null
  ) => {
    if (
      location.pathname === path &&
      scrollToId
    ) {
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
            onClick={() =>
              handleNavigate(
                item.path,
                item.scrollToId
              )
            }
          >
            <span>{item.label}</span>
            <FiArrowUpRight aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <footer
      className={styles.footer}
      id="footer"
    >
      <div
        className={styles.decor}
        aria-hidden="true"
      >
        <span className={styles.orbOne} />
        <span className={styles.orbTwo} />
        <span className={styles.waveOne} />
        <span className={styles.waveTwo} />
      </div>

      <div className={styles.inner}>
        <section className={styles.top}>
          <div className={styles.brand}>
            <span className={styles.eyebrow}>
              Showly.me
            </span>

            <h2>
              Profil, który{" "}
              <span>pracuje za Ciebie.</span>
            </h2>

            <p>
              Jedno miejsce na opis, ofertę,
              zdjęcia, opinie, kontakt i rezerwacje.
              Bez budowania własnej strony od zera.
            </p>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={() =>
                  handleNavigate(
                    profileAction.path,
                    profileAction.scrollToId
                  )
                }
              >
                {profileAction.icon}
                <span>{profileAction.label}</span>
              </button>

              <button
                type="button"
                className={styles.secondaryAction}
                onClick={() =>
                  handleNavigate(
                    "/profile",
                    "profilesHub"
                  )
                }
              >
                <FiSearch />
                <span>Przeglądaj profile</span>
              </button>
            </div>
          </div>

          <div className={styles.contact}>
            <span className={styles.contactLabel}>
              Kontakt
            </span>

            <a
              href="mailto:kontakt@showly.me"
              className={styles.email}
            >
              <FiMail aria-hidden="true" />

              <span>kontakt@showly.me</span>

              <FiArrowUpRight
                aria-hidden="true"
                className={styles.emailArrow}
              />
            </a>
          </div>
        </section>

        <section className={styles.navigation}>
          <nav
            className={styles.navGroup}
            aria-label="Nawigacja platformy"
          >
            <span className={styles.navTitle}>
              Platforma
            </span>

            {renderLinks(productLinks)}
          </nav>

          <nav
            className={styles.navGroup}
            aria-label="Nawigacja użytkownika"
          >
            <span className={styles.navTitle}>
              Dla Ciebie
            </span>

            {renderLinks(creatorLinks)}
          </nav>

          <div className={styles.footerNote}>
            <span className={styles.navTitle}>
              Showly
            </span>

            <p>
              Wizytówki dla usługodawców,
              twórców i specjalistów.
            </p>
          </div>
        </section>

        <div className={styles.bottom}>
          <div className={styles.bottomLeft}>
            <span className={styles.copy}>
              © {year} Showly.me
            </span>

            <div className={styles.legalLinks}>
              {legalLinks.map((link) => (
                <button
                  key={link.label}
                  type="button"
                  className={styles.legalLink}
                  onClick={() =>
                    handleNavigate(
                      link.path,
                      link.scrollToId
                    )
                  }
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
