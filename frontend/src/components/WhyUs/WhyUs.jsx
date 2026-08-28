import { useEffect, useRef } from "react";
import {
  FiArrowDown,
  FiCheck,
  FiGrid,
  FiShield,
  FiZap,
} from "react-icons/fi";

import styles from "./WhyUs.module.scss";

const reasons = [
  {
    icon: FiZap,
    number: "01",
    label: "Szybciej",
    title: "Od potrzeby do właściwego profilu bez objazdów.",
    text: "Wyszukiwanie i uporządkowane wizytówki skracają drogę, którą dziś często pokonujesz między postami, komentarzami i przypadkowymi linkami.",
    details: ["mniej szukania", "czytelny profil", "szybszy wybór"],
  },
  {
    icon: FiShield,
    number: "02",
    label: "Pewniej",
    title: "Widzisz konkrety przed pierwszą wiadomością.",
    text: "Oferta, ceny, realizacje i opinie są obok siebie. Możesz porównać profile spokojniej i napisać dopiero wtedy, gdy wiesz, czego się spodziewać.",
    details: ["opinie", "jasna oferta", "świadoma decyzja"],
  },
  {
    icon: FiGrid,
    number: "03",
    label: "Szerzej",
    title: "Różne branże działają tu na własnych zasadach.",
    text: "Showly daje wspólną, czytelną formę bez zamykania usługodawców w jednym schemacie. Lokalnie lub online, samodzielnie albo jako firma.",
    details: ["wiele branż", "lokalnie i online", "własny styl"],
  },
];

const WhyUs = () => {
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
      id="whyus"
      aria-labelledby="whyus-title"
    >
      <div className={styles.background} aria-hidden="true">
        <span className={styles.bigWord}>DLACZEGO</span>
        <span className={styles.dotField} />
      </div>

      <div className={styles.inner}>
        <header className={styles.header}>
          <div
            className={`${styles.heading} ${styles.reveal} ${styles.fromLeft}`}
          >
            <span className={styles.kicker}>
              <span className={styles.kickerDot} />
              Dlaczego Showly?
            </span>

            <h2 id="whyus-title">
              Dobra decyzja zaczyna się
              <span>od dobrych informacji.</span>
            </h2>
          </div>

          <div
            className={`${styles.lead} ${styles.reveal} ${styles.fromRight}`}
            style={{ "--reveal-delay": "100ms" }}
          >
            <p>
              Showly nie wybiera za Ciebie. Porządkuje ofertę, realizacje,
              opinie i kontakt, aby łatwiej było znaleźć właściwą osobę i
              podjąć świadomą decyzję.
            </p>

            <div className={styles.leadMeta}>
              <strong>03</strong>
              <span>
                powody, dla których wszystko staje się prostsze
              </span>
            </div>
          </div>
        </header>

        <div className={styles.board}>
          <aside
            className={`${styles.manifestCard} ${styles.reveal} ${styles.fromLeft}`}
            aria-label="Showly w skrócie"
          >
            <span className={styles.manifestCircle} aria-hidden="true" />
            <span className={styles.manifestBlock} aria-hidden="true" />

            <div className={styles.manifestTop}>
              <span className={styles.manifestLabel}>
                <FiCheck aria-hidden="true" />
                Showly w skrócie
              </span>

              <h3>Mniej szukania. Więcej pewności przed kontaktem.</h3>

              <p>
                Zamiast składać ofertę z kilku miejsc, otwierasz jeden
                profil i sprawdzasz to, co naprawdę wpływa na wybór.
              </p>
            </div>

            <div className={styles.path}>
              <div>
                <small>Potrzeba</small>
                <strong>prowadzi do właściwego profilu</strong>
              </div>

              <span aria-hidden="true">→</span>

              <div>
                <small>Profil</small>
                <strong>prowadzi do konkretnego działania</strong>
              </div>
            </div>

            <span className={styles.manifestStamp} aria-hidden="true">
              PROSTO
              <br />
              I CZYTELNIE
            </span>
          </aside>

          <div
            className={`${styles.reasons} ${styles.reveal} ${styles.fromRight}`}
            style={{ "--reveal-delay": "80ms" }}
            role="list"
          >
            {reasons.map((reason, index) => {
              const Icon = reason.icon;

              return (
                <article
                  className={styles.reason}
                  key={reason.number}
                  role="listitem"
                  style={{
                    "--reason-delay": `${index * 80}ms`,
                  }}
                >
                  <span className={styles.reasonNumber}>
                    {reason.number}
                  </span>

                  <span className={styles.reasonIcon}>
                    <Icon aria-hidden="true" />
                  </span>

                  <div className={styles.reasonContent}>
                    <span className={styles.reasonLabel}>{reason.label}</span>
                    <h3>{reason.title}</h3>
                    <p>{reason.text}</p>

                    <div className={styles.details}>
                      {reason.details.map((detail) => (
                        <span key={detail}>{detail}</span>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div
          className={`${styles.closing} ${styles.reveal} ${styles.fromBottom}`}
          style={{ "--reveal-delay": "110ms" }}
        >
          <span className={styles.closingIcon}>
            <FiArrowDown aria-hidden="true" />
          </span>

          <div>
            <span>Najważniejsze zostaje po Twojej stronie</span>
            <p>
              Każdy profil zachowuje własny charakter. Showly tylko pomaga
              pokazać go w uporządkowany sposób.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
