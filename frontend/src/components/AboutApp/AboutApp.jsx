import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import styles from "./AboutApp.module.scss";

import {
  FiArrowRight,
  FiCheck,
  FiEdit3,
  FiEye,
  FiLink2,
  FiSmartphone,
} from "react-icons/fi";

const benefits = [
  {
    icon: FiLink2,
    number: "01",
    title: "Jeden konkretny link",
    text:
      "Oferta, zdjęcia, kontakt, ceny i najważniejsze informacje znajdują się w jednym miejscu.",
    animation: "fromLeft",
  },
  {
    icon: FiEye,
    number: "02",
    title: "Klient szybciej rozumie ofertę",
    text:
      "Nie musi przeglądać starych postów, relacji i wiadomości, żeby dowiedzieć się, czym się zajmujesz.",
    animation: "fromBottom",
  },
  {
    icon: FiEdit3,
    number: "03",
    title: "Edytujesz wszystko samodzielnie",
    text:
      "Możesz aktualizować opis, zdjęcia, ceny i usługi bez przebudowy całej strony internetowej.",
    animation: "fromRight",
  },
];

const industries = [
  "fryzjerzy",
  "fotografowie",
  "DJ-e",
  "trenerzy",
  "korepetytorzy",
  "freelancerzy",
  "twórcy",
  "lokalne firmy",
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

    const animatedElements = section.querySelectorAll(
      `.${styles.reveal}`
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealVisible);
          } else {
            entry.target.classList.remove(styles.revealVisible);
          }
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -8% 0px",
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
        onClick={() =>
          handleNavigate("/stworz-profil", "createProfile")
        }
      >
        Stwórz swój profil
      </button>
    );
  };

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="about-app"
    >
      <div className={styles.decor} aria-hidden="true">
        <span className={styles.orbOne} />
        <span className={styles.orbTwo} />
        <span className={styles.line} />
      </div>

      <div className={styles.inner}>
        <header className={styles.hero}>
          <div
            className={`${styles.heroHeading} ${styles.reveal} ${styles.fromLeft}`}
          >
            <span className={styles.eyebrow}>O Showly</span>

            <h2>
              Twoja oferta nie powinna ginąć między postami,
              wiadomościami i przypadkowymi linkami.
            </h2>
          </div>

          <div
            className={`${styles.heroSide} ${styles.reveal} ${styles.fromRight}`}
            style={{ "--reveal-delay": "120ms" }}
          >
            <p>
              Showly daje Ci jedno czytelne miejsce, w którym klient może
              sprawdzić, czym się zajmujesz, zobaczyć realizacje i przejść
              prosto do kontaktu.
            </p>

            <div className={styles.heroActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() =>
                  handleNavigate("/profile", "profilesHub")
                }
              >
                Zobacz profile
                <FiArrowRight aria-hidden="true" />
              </button>

              {renderProfileButton()}
            </div>
          </div>
        </header>

        <section className={styles.story}>
          <article
            className={`${styles.problem} ${styles.reveal} ${styles.fromLeft}`}
          >
            <span className={styles.sectionNumber}>01</span>

            <div>
              <span className={styles.eyebrow}>Problem</span>

              <h3>
                Klient często musi sam składać Twoją ofertę z kilku miejsc.
              </h3>

              <p>
                Jedne informacje są na Facebooku, inne na Instagramie,
                cennik znajduje się w wiadomości, a zdjęcia realizacji w
                kilku różnych postach.
              </p>
            </div>
          </article>

          <div
            className={`${styles.connector} ${styles.reveal} ${styles.fromTop}`}
            aria-hidden="true"
          >
            <FiArrowRight />
          </div>

          <article
            className={`${styles.solution} ${styles.reveal} ${styles.fromRight}`}
            style={{ "--reveal-delay": "120ms" }}
          >
            <span className={styles.sectionNumber}>02</span>

            <div>
              <span className={styles.eyebrow}>Rozwiązanie</span>

              <h3>
                Showly porządkuje wszystko pod jednym publicznym linkiem.
              </h3>

              <p>
                Profil może działać jak prosta wizytówka, mini strona i
                centrum kontaktu dla Twojej działalności.
              </p>

              <div className={styles.checks}>
                <span>
                  <FiCheck aria-hidden="true" />
                  opis i oferta
                </span>

                <span>
                  <FiCheck aria-hidden="true" />
                  zdjęcia i realizacje
                </span>

                <span>
                  <FiCheck aria-hidden="true" />
                  ceny i usługi
                </span>

                <span>
                  <FiCheck aria-hidden="true" />
                  kontakt lub rezerwacja
                </span>
              </div>
            </div>
          </article>
        </section>

        <section className={styles.benefitsSection}>
          <div
            className={`${styles.sectionIntro} ${styles.reveal} ${styles.fromTop}`}
          >
            <span className={styles.eyebrow}>Najważniejsze korzyści</span>

            <h3>
              Mniej tłumaczenia. Więcej konkretów dla klienta.
            </h3>
          </div>

          <div className={styles.benefits}>
            {benefits.map((item, index) => {
              const Icon = item.icon;

              return (
                <article
                  className={`${styles.benefit} ${
                    index === 0 ? styles.benefitWide : ""
                  } ${styles.reveal} ${styles[item.animation]}`}
                  style={{
                    "--reveal-delay": `${index * 100}ms`,
                  }}
                  key={item.number}
                >
                  <div className={styles.benefitTop}>
                    <span>{item.number}</span>
                    <Icon aria-hidden="true" />
                  </div>

                  <div>
                    <h4>{item.title}</h4>
                    <p>{item.text}</p>
                  </div>
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

            <h3>
              Dla osób, które sprzedają usługę, talent, wiedzę albo czas.
            </h3>

            <p>
              Showly sprawdzi się zarówno przy lokalnej działalności, jak
              i przy budowaniu własnej marki czy portfolio.
            </p>
          </div>

          <div
            className={`${styles.audienceList} ${styles.reveal} ${styles.fromRight}`}
            style={{ "--reveal-delay": "100ms" }}
          >
            {industries.map((industry) => (
              <span key={industry}>{industry}</span>
            ))}
          </div>

          <div
            className={`${styles.mobileNote} ${styles.reveal} ${styles.fromBottom}`}
            style={{ "--reveal-delay": "160ms" }}
          >
            <FiSmartphone aria-hidden="true" />

            <div>
              <strong>Gotowe do udostępniania</strong>
              <p>
                Dodaj link do bio, ogłoszenia, wiadomości albo posta.
              </p>
            </div>
          </div>
        </section>

        <footer
          className={`${styles.cta} ${styles.reveal} ${styles.fromBottom}`}
        >
          <div>
            <span className={styles.eyebrow}>Start</span>

            <h3>
              Jeden profil. Jeden link. Wszystko, czego potrzebuje klient.
            </h3>
          </div>

          <div className={styles.ctaActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() =>
                handleNavigate("/profile", "profilesHub")
              }
            >
              Przeglądaj profile
              <FiArrowRight aria-hidden="true" />
            </button>

            {renderProfileButton()}
          </div>
        </footer>
      </div>
    </section>
  );
};

export default AboutApp;