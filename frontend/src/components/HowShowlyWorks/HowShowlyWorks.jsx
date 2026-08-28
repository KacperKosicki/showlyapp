import { useEffect, useRef } from "react";
import {
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiMessageCircle,
  FiSearch,
  FiStar,
} from "react-icons/fi";

import styles from "./HowShowlyWorks.module.scss";

const steps = [
  {
    icon: FiSearch,
    number: "01",
    label: "Szukasz",
    title: "Wpisujesz usługę albo miejsce.",
    text: "Showly pokazuje profile pasujące do tego, czego potrzebujesz — bez przekopywania postów i grup.",
    details: ["usługa", "branża", "lokalizacja"],
  },
  {
    icon: FiStar,
    number: "02",
    label: "Sprawdzasz",
    title: "Porównujesz całą ofertę.",
    text: "Opis, ceny, realizacje i opinie pomagają szybko ocenić, czy to właściwy wybór.",
    details: ["oferta", "zdjęcia", "opinie"],
  },
  {
    icon: FiMessageCircle,
    number: "03",
    label: "Kontaktujesz się",
    title: "Wybierasz wygodny kontakt.",
    text: "Piszesz wiadomość albo korzystasz z danych i kanałów udostępnionych przez usługodawcę.",
    details: ["wiadomość", "telefon", "social media"],
  },
  {
    icon: FiCalendar,
    number: "04",
    label: "Umawiasz",
    title: "Rezerwujesz lub ustalasz szczegóły.",
    text: "Jeśli profil obsługuje rezerwacje, wybierasz termin. Jeśli nie — od razu przechodzisz do rozmowy.",
    details: ["termin", "rezerwacja", "decyzja"],
  },
];

const HowShowlyWorks = () => {
  const sectionRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return undefined;
    }

    const elements = section.querySelectorAll(`.${styles.reveal}`);

    if (typeof IntersectionObserver === "undefined") {
      elements.forEach((element) => {
        element.classList.add(styles.revealVisible);
      });

      return undefined;
    }

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
        threshold: 0.1,
        rootMargin: "0px 0px -5% 0px",
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="how-showly-works"
      aria-labelledby="how-showly-works-title"
    >
      <div className={styles.background} aria-hidden="true">
        <span className={styles.bigWord}>PROCES</span>
        <span className={styles.dotField} />
      </div>

      <div className={styles.inner}>
        <header className={styles.header}>
          <div
            className={`${styles.heading} ${styles.reveal} ${styles.fromLeft}`}
          >
            <span className={styles.kicker}>
              <span className={styles.kickerDot} />
              Jak działa Showly?
            </span>

            <h2 id="how-showly-works-title">
              Znajdź. Sprawdź.
              <span>Napisz. Umów.</span>
            </h2>
          </div>

          <div
            className={`${styles.lead} ${styles.reveal} ${styles.fromRight}`}
            style={{ "--reveal-delay": "100ms" }}
          >
            <p>
              Jedna prosta droga od pierwszego wyszukiwania do kontaktu
              z właściwą osobą. Bez zbierania informacji z kilku miejsc.
            </p>

            <div className={styles.routeSummary}>
              <span className={styles.routeNumber}>04</span>

              <div>
                <strong>czytelne etapy</strong>
                <small>każdy prowadzi do konkretnego działania</small>
              </div>
            </div>
          </div>
        </header>

        <div className={styles.steps} role="list">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <article
                className={`${styles.step} ${styles[`step${index + 1}`]} ${styles.reveal} ${styles.fromBottom}`}
                style={{ "--reveal-delay": `${index * 85}ms` }}
                key={step.number}
                role="listitem"
              >
                <div className={styles.stepTop}>
                  <span className={styles.stepNumber}>{step.number}</span>

                  <span className={styles.stepIcon}>
                    <Icon aria-hidden="true" />
                  </span>
                </div>

                <div className={styles.stepBody}>
                  <span className={styles.stepLabel}>{step.label}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>

                <div className={styles.details}>
                  {step.details.map((detail) => (
                    <span key={detail}>{detail}</span>
                  ))}
                </div>

                {index < steps.length - 1 && (
                  <span className={styles.connector} aria-hidden="true">
                    <FiArrowRight />
                  </span>
                )}
              </article>
            );
          })}
        </div>

        <footer
          className={`${styles.result} ${styles.reveal} ${styles.fromBottom}`}
          style={{ "--reveal-delay": "120ms" }}
        >
          <span className={styles.resultIcon}>
            <FiCheck aria-hidden="true" />
          </span>

          <div className={styles.resultCopy}>
            <span>Efekt</span>
            <h3>Klient wie, co oferujesz i co zrobić dalej.</h3>
          </div>

          <p>
            Mniej pytań o podstawy. Więcej rozmów z osobami, które już
            znają Twoją ofertę.
          </p>

          <FiArrowRight className={styles.resultArrow} aria-hidden="true" />
        </footer>
      </div>
    </section>
  );
};

export default HowShowlyWorks;
