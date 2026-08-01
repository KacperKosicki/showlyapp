import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiArrowUpRight,
  FiCheck,
  FiLink,
  FiSearch,
} from "react-icons/fi";

import SearchBar from "../SearchBar/SearchBar";
import styles from "./Hero.module.scss";

const profilePoints = [
  "Usługi i cennik",
  "Galeria i opinie",
  "Kontakt i rezerwacje",
];

const Hero = ({ user, hasProfile, loadingProfileStatus }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const sectionRef = useRef(null);

  const handleNavigate = (path, scrollToId = null) => {
    if (location.pathname === path && scrollToId) {
      const element = document.getElementById(scrollToId);

      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }

      return;
    }

    navigate(path, { state: { scrollToId } });
  };

  useEffect(() => {
    document.body.classList.add("hero-page");
    document.documentElement.classList.add("hero-page-html");

    return () => {
      document.body.classList.remove("hero-page");
      document.documentElement.classList.remove("hero-page-html");
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return undefined;
    }

    const animatedElements = section.querySelectorAll(`.${styles.reveal}`);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealVisible);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -4% 0px",
      }
    );

    animatedElements.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.hero} id="hero">
      <div className={styles.decor} aria-hidden="true">
        <span className={styles.orbOne} />
        <span className={styles.orbTwo} />
        <span className={styles.verticalLine} />
        <span className={styles.cornerMark} />
      </div>

      <div className={styles.inner}>
        <header
          className={`${styles.metaBar} ${styles.reveal} ${styles.fromTop}`}
        >
          <span>Showly.me</span>

          <div>
            <span>Profile usługowe</span>
            <span>Beta</span>
          </div>
        </header>

        <div className={styles.layout}>
          <div className={styles.content}>
            <div className={styles.headingRow}>
              <span className={styles.chapter} aria-hidden="true">
                01
              </span>

              <div className={styles.headingCopy}>
                <span className={styles.eyebrow}>
                  Jeden profil. Cała oferta.
                </span>

                <h1 className={styles.title}>
                  Pokaż swoją ofertę.
                  <br />
                  <span>Daj się znaleźć.</span>
                </h1>
              </div>
            </div>

            <p
              className={`${styles.lead} ${styles.reveal} ${styles.fromLeft}`}
              style={{ "--reveal-delay": "120ms" }}
            >
              Usługi, zdjęcia, ceny i kontakt w jednym profilu, który możesz
              łatwo udostępnić klientom.
            </p>

            <div
              className={`${styles.searchBlock} ${styles.reveal} ${styles.fromBottom}`}
              style={{ "--reveal-delay": "180ms" }}
            >
              <div className={styles.searchIntro}>
                <div className={styles.searchLabel}>
                  <FiSearch aria-hidden="true" />
                  <strong>Znajdź usługę lub profil</strong>
                </div>

                <small>Wpisz usługę, osobę albo miasto</small>
              </div>

              <div className={styles.searchField}>
                <SearchBar variant="hero" />
              </div>

              <p className={styles.hint}>
                Na przykład: <b>DJ Poznań</b> lub <b>fryzjer Piła</b>
              </p>
            </div>

            <div
              className={`${styles.actions} ${styles.reveal} ${styles.fromBottom}`}
              style={{ "--reveal-delay": "240ms" }}
            >
              {user ? (
                loadingProfileStatus ? (
                  <button type="button" className={styles.primaryBtn} disabled>
                    <span>Sprawdzanie profilu...</span>
                  </button>
                ) : hasProfile ? (
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => handleNavigate("/profil", "profileWrapper")}
                  >
                    <span>Edytuj profil</span>
                    <FiArrowUpRight aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() =>
                      handleNavigate("/stworz-profil", "scrollToId")
                    }
                  >
                    <span>Stwórz profil</span>
                    <FiArrowUpRight aria-hidden="true" />
                  </button>
                )
              ) : (
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => handleNavigate("/register", "registerBox")}
                >
                  <span>Załóż darmowy profil</span>
                  <FiArrowUpRight aria-hidden="true" />
                </button>
              )}

              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() =>
                  handleNavigate("/jak-to-dziala", "showlyJourney")
                }
              >
                <span>Jak działa Showly?</span>
                <FiArrowRight aria-hidden="true" />
              </button>
            </div>

            <div
              className={`${styles.trustLine} ${styles.reveal} ${styles.fromBottom}`}
              style={{ "--reveal-delay": "290ms" }}
            >
              <span>
                <FiCheck aria-hidden="true" />
                bez własnej strony
              </span>

              <span>
                <FiCheck aria-hidden="true" />
                jeden link do udostępnienia
              </span>
            </div>
          </div>

          <aside
            className={`${styles.side} ${styles.reveal} ${styles.fromRight}`}
            style={{ "--reveal-delay": "150ms" }}
            aria-label="Najważniejsze elementy profilu Showly"
          >
            <div className={styles.sideAccent} aria-hidden="true" />

            <header className={styles.sideHeader}>
              <div>
                <span className={styles.sideEyebrow}>Twój profil w Showly</span>
                <h2>Wszystko ważne. Bez chaosu.</h2>
              </div>

              <FiLink aria-hidden="true" />
            </header>

            <div className={styles.urlBar}>
              <span>showly.me/</span>
              <strong>twoja-nazwa</strong>
              <FiArrowUpRight aria-hidden="true" />
            </div>

            <div className={styles.profileList}>
              {profilePoints.map((point) => (
                <div className={styles.profilePoint} key={point}>
                  <FiCheck aria-hidden="true" />
                  <strong>{point}</strong>
                </div>
              ))}
            </div>

            <p className={styles.sideMessage}>
              Klient od razu widzi, co robisz i jak może się z Tobą
              skontaktować.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default Hero;
