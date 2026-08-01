import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiEdit3,
  FiEye,
  FiLink2,
  FiSmartphone,
} from "react-icons/fi";

import styles from "./AboutApp.module.scss";

const benefits = [
  {
    icon: FiLink2,
    number: "01",
    title: "Wszystko w jednym miejscu",
    text: "Oferta, zdjęcia, ceny i kontakt są dostępne pod jednym czytelnym linkiem.",
  },
  {
    icon: FiEye,
    number: "02",
    title: "Oferta zrozumiała od razu",
    text: "Klient szybko widzi, czym się zajmujesz i czy Twoja oferta jest dla niego.",
  },
  {
    icon: FiEdit3,
    number: "03",
    title: "Pełna kontrola nad profilem",
    text: "Samodzielnie zmieniasz opis, usługi, zdjęcia i pozostałe informacje.",
  },
];

const industries = [
  "usługi lokalne",
  "freelancerzy",
  "twórcy",
  "fotografowie",
  "DJ-e",
  "korepetytorzy",
];

const AboutApp = ({ user, hasProfile, loadingProfileStatus }) => {
  const sectionRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

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
      {
        threshold: 0.12,
        rootMargin: "0px 0px -6% 0px",
      }
    );

    animatedElements.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleNavigate = (path, scrollToId = null) => {
    if (location.pathname === path && scrollToId) {
      const element = document.getElementById(scrollToId);

      if (element) {
        window.setTimeout(() => {
          element.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 100);
      }

      return;
    }

    navigate(path, {
      state: {
        scrollToId,
      },
    });
  };

  const renderProfileButton = () => {
    if (!user) {
      return (
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => handleNavigate("/register", "registerBox")}
        >
          Załóż darmowy profil
        </button>
      );
    }

    if (loadingProfileStatus) {
      return (
        <button
          type="button"
          className={styles.secondaryButton}
          disabled
        >
          Sprawdzanie profilu...
        </button>
      );
    }

    if (hasProfile) {
      return (
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => handleNavigate("/profil", "profileWrapper")}
        >
          Edytuj swój profil
        </button>
      );
    }

    return (
      <button
        type="button"
        className={styles.secondaryButton}
        onClick={() => handleNavigate("/stworz-profil", "createProfile")}
      >
        Stwórz swój profil
      </button>
    );
  };

  return (
    <section ref={sectionRef} className={styles.section} id="about-app">
      <div className={styles.decor} aria-hidden="true">
        <span className={styles.orbOne} />
        <span className={styles.orbTwo} />
      </div>

      <div className={styles.inner}>
        <header className={styles.intro}>
          <div
            className={`${styles.introHeading} ${styles.reveal} ${styles.fromLeft}`}
          >
            <span className={styles.eyebrow}>O Showly</span>

            <h2>Jedno miejsce dla Twojej oferty.</h2>
          </div>

          <div
            className={`${styles.introSide} ${styles.reveal} ${styles.fromRight}`}
            style={{ "--reveal-delay": "100ms" }}
          >
            <p>
              Showly porządkuje najważniejsze informacje o Twojej działalności,
              żeby klient nie musiał szukać ich w postach, wiadomościach i kilku
              różnych aplikacjach.
            </p>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => handleNavigate("/profile", "profilesHub")}
              >
                Zobacz profile
                <FiArrowRight aria-hidden="true" />
              </button>

              {renderProfileButton()}
            </div>
          </div>
        </header>

        <section className={styles.valueSection}>
          <div
            className={`${styles.valueIntro} ${styles.reveal} ${styles.fromTop}`}
          >
            <span className={styles.eyebrow}>Prościej dla obu stron</span>

            <h3>Klient od razu widzi to, co naprawdę ważne.</h3>
          </div>

          <div className={styles.benefits}>
            {benefits.map((item, index) => {
              const Icon = item.icon;

              return (
                <article
                  className={`${styles.benefit} ${styles.reveal} ${styles.fromBottom}`}
                  style={{ "--reveal-delay": `${index * 80}ms` }}
                  key={item.number}
                >
                  <div className={styles.benefitTop}>
                    <span>{item.number}</span>
                    <Icon aria-hidden="true" />
                  </div>

                  <h4>{item.title}</h4>
                  <p>{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.audienceSection}>
          <div
            className={`${styles.audienceText} ${styles.reveal} ${styles.fromLeft}`}
          >
            <span className={styles.eyebrow}>Dla kogo?</span>

            <h3>Dla osób, które pokazują swoją pracę i sprzedają usługi.</h3>

            <p>
              Niezależnie od branży możesz zebrać ofertę, realizacje i kontakt w
              jednym profilu.
            </p>

            <div className={styles.shareNote}>
              <FiSmartphone aria-hidden="true" />

              <div>
                <strong>Jeden link, wiele zastosowań</strong>
                <span>Bio, post, ogłoszenie albo wiadomość do klienta.</span>
              </div>
            </div>
          </div>

          <div
            className={`${styles.audienceList} ${styles.reveal} ${styles.fromRight}`}
            style={{ "--reveal-delay": "100ms" }}
          >
            {industries.map((industry) => (
              <span key={industry}>{industry}</span>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
};

export default AboutApp;
