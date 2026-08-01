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
  {
    number: "01",
    title: "Oferta bez dopytywania",
    text: "Usługi, cennik, opis i zdjęcia znajdują się razem.",
  },
  {
    number: "02",
    title: "Kontakt od razu z profilu",
    text: "Klient może napisać, sprawdzić dane albo wybrać termin.",
  },
  {
    number: "03",
    title: "Link gotowy do udostępnienia",
    text: "Dodajesz go do bio, posta, ogłoszenia lub wiadomości.",
  },
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
        <span className={styles.diagonalLine} />
        <span className={styles.cornerMark} />
      </div>

      <div className={styles.inner}>
        <header
          className={`${styles.metaBar} ${styles.reveal} ${styles.fromTop}`}
        >
          <span>Platforma profili usługowych</span>

          <div>
            <span>Showly.me</span>
            <span>Beta</span>
            <span>Online</span>
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
                  Jeden profil.
                  <br />
                  Daj się znaleźć.
                  <br />
                  <span>Pokaż, co robisz.</span>
                </h1>
              </div>
            </div>

            <p
              className={`${styles.lead} ${styles.reveal} ${styles.fromLeft}`}
              style={{ "--reveal-delay": "140ms" }}
            >
              Stwórz profil z usługami, galerią, cennikiem, opiniami i
              kontaktem. Jedno miejsce, które możesz wysłać klientowi, dodać
              do bio albo wkleić w ogłoszeniu.
            </p>

            <div
              className={`${styles.searchBlock} ${styles.reveal} ${styles.fromBottom}`}
              style={{ "--reveal-delay": "210ms" }}
            >
              <div className={styles.searchIntro}>
                <div className={styles.searchLabel}>
                  <FiSearch aria-hidden="true" />
                  <span>Wyszukiwanie</span>
                </div>

                <div className={styles.searchCopy}>
                  <strong>Znajdź właściwy profil</strong>
                  <small>rola, usługa albo miasto</small>
                </div>
              </div>

              <div className={styles.searchField}>
                <SearchBar variant="hero" />
              </div>

              <div className={styles.searchFooter}>
                <p className={styles.hint}>
                  Spróbuj: <b>DJ Poznań</b>, <b>fryzjer Piła</b>,{" "}
                  <b>cukiernia</b>
                </p>

                <span>profile zamiast przypadkowych postów</span>
              </div>
            </div>

            <div
              className={`${styles.actions} ${styles.reveal} ${styles.fromBottom}`}
              style={{ "--reveal-delay": "280ms" }}
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
                <span>Zobacz jak działa Showly</span>
                <FiArrowRight aria-hidden="true" />
              </button>
            </div>

            <div
              className={`${styles.trustLine} ${styles.reveal} ${styles.fromBottom}`}
              style={{ "--reveal-delay": "340ms" }}
            >
              <span>
                <FiCheck aria-hidden="true" />
                bez osobnej strony
              </span>

              <span>
                <FiCheck aria-hidden="true" />
                gotowe na telefon
              </span>

              <span>
                <FiCheck aria-hidden="true" />
                jeden publiczny link
              </span>
            </div>
          </div>

          <aside
            className={`${styles.side} ${styles.reveal} ${styles.fromRight}`}
            style={{ "--reveal-delay": "160ms" }}
            aria-label="Co możesz pokazać w Showly"
          >
            <div className={styles.sideAccent} aria-hidden="true" />

            <header className={styles.sideHeader}>
              <div>
                <span className={styles.sideEyebrow}>02 / Profil publiczny</span>
                <h2>Wszystko, czego klient potrzebuje do decyzji.</h2>
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
                <article className={styles.profilePoint} key={point.number}>
                  <span className={styles.pointNumber}>{point.number}</span>

                  <div>
                    <strong>{point.title}</strong>
                    <p>{point.text}</p>
                  </div>
                </article>
              ))}
            </div>

            <footer className={styles.sideFooter}>
              <div>
                <strong>1 link</strong>
                <span>do całej oferty</span>
              </div>

              <div>
                <strong>24/7</strong>
                <span>profil dostępny online</span>
              </div>
            </footer>
          </aside>
        </div>

        <footer
          className={`${styles.bottomRail} ${styles.reveal} ${styles.fromBottom}`}
          style={{ "--reveal-delay": "360ms" }}
        >
          <div className={styles.journey} aria-hidden="true">
            <span>Znajdź</span>
            <FiArrowRight />
            <span>Porównaj</span>
            <FiArrowRight />
            <span>Skontaktuj się</span>
          </div>

          <span className={styles.scrollNote}>
            Przewiń i zobacz, jak Showly porządkuje drogę klienta
          </span>
        </footer>
      </div>
    </section>
  );
};

export default Hero;
