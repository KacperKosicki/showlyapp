import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiArrowUpRight,
  FiCamera,
  FiMapPin,
  FiSearch,
  FiStar,
} from "react-icons/fi";

import SearchBar from "../SearchBar/SearchBar";
import styles from "./Hero.module.scss";

const profileAvatars = [
  { initials: "FO", label: "Fotografia", tone: "violet" },
  { initials: "DJ", label: "DJ", tone: "orange" },
  { initials: "BE", label: "Beauty", tone: "green" },
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
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );

    animatedElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={styles.hero} id="hero">
      <div className={styles.background} aria-hidden="true">
        <span className={styles.bigWord}>SHOWLY</span>
        <span className={styles.gridDot} />
        <span className={styles.scribble}>↗</span>
      </div>

      <div className={styles.inner}>
        <div className={styles.layout}>
          <div className={styles.content}>
            <h1
              className={`${styles.title} ${styles.reveal} ${styles.fromLeft}`}
              style={{ "--reveal-delay": "70ms" }}
            >
              Twoja oferta.
              <span className={styles.highlight}>Jeden link.</span>
              Zero chaosu.
            </h1>

            <p
              className={`${styles.lead} ${styles.reveal} ${styles.fromBottom}`}
              style={{ "--reveal-delay": "130ms" }}
            >
              Pokaż usługi, ceny, zdjęcia i wolne terminy w profilu, który
              naprawdę wygląda jak Twoja marka.
            </p>

            <div
              className={`${styles.actions} ${styles.reveal} ${styles.fromBottom}`}
              style={{ "--reveal-delay": "190ms" }}
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
                    <span>Edytuj swój profil</span>
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
                    <span>Stwórz swój profil</span>
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
                className={styles.textBtn}
                onClick={() =>
                  handleNavigate("/jak-to-dziala", "showlyJourney")
                }
              >
                <span>Zobacz, jak to działa</span>
                <FiArrowRight aria-hidden="true" />
              </button>
            </div>

            <div
              className={`${styles.searchBlock} ${styles.reveal} ${styles.fromBottom}`}
              style={{ "--reveal-delay": "250ms" }}
            >
              <div className={styles.searchHeading}>
                <FiSearch aria-hidden="true" />
                <div>
                  <strong>Szukasz konkretnej usługi?</strong>
                  <span>Wpisz nazwę, branżę albo miasto</span>
                </div>
              </div>

              <div className={styles.searchField}>
                <SearchBar variant="hero" />
              </div>
            </div>
          </div>

          <aside
            className={`${styles.visual} ${styles.reveal} ${styles.fromRight}`}
            style={{ "--reveal-delay": "110ms" }}
            aria-label="Przykładowy profil w Showly"
          >
            <div className={styles.sticker} aria-hidden="true">
              TWOJE
              <br />
              MIEJSCE
            </div>

            <article className={styles.profileCard}>
              <header className={styles.cardTop}>
                <span className={styles.brandMark}>s.</span>
                <span className={styles.cardUrl}>showly.me/anna-studio</span>
                <span className={styles.cardStatus}>online</span>
              </header>

              <div className={styles.gallery} aria-label="Przykładowa galeria">
                <div className={styles.galleryMain}>
                  <FiCamera aria-hidden="true" />
                  <span>Twoje zdjęcie</span>
                </div>
                <div className={styles.gallerySmallOne} />
                <div className={styles.gallerySmallTwo} />

                <span className={styles.location}>
                  <FiMapPin aria-hidden="true" />
                  Poznań
                </span>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.profileIntro}>
                  <div className={styles.mainAvatar}>AN</div>

                  <div className={styles.profileName}>
                    <span>Fotografia &amp; video</span>
                    <h2>Anna Nowak Studio</h2>
                  </div>

                  <div className={styles.rating}>
                    <FiStar aria-hidden="true" />
                    <strong>4.9</strong>
                  </div>
                </div>

                <div className={styles.serviceTags}>
                  <span>Śluby</span>
                  <span>Portrety</span>
                  <span>Reportaż</span>
                </div>

                <div className={styles.cardAction}>
                  <span>Zobacz ofertę</span>
                  <FiArrowUpRight aria-hidden="true" />
                </div>
              </div>
            </article>

            <div className={styles.avatarCard}>
              <div className={styles.avatarStack} aria-hidden="true">
                {profileAvatars.map((profile) => (
                  <span
                    className={`${styles.miniAvatar} ${styles[profile.tone]}`}
                    key={profile.initials}
                    title={profile.label}
                  >
                    {profile.initials}
                  </span>
                ))}
              </div>

              <p>
                <strong>Każda branża.</strong>
                <span>Jeden dobry format.</span>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default Hero;