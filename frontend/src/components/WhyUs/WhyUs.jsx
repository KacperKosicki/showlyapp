import { useEffect, useRef } from "react";

import styles from "./WhyUs.module.scss";

import {
  FiArrowDown,
  FiGrid,
  FiShield,
  FiZap,
} from "react-icons/fi";

const reasons = [
  {
    icon: FiZap,
    number: "01",
    label: "Szybkość",
    title: "Mniej kroków między potrzebą a właściwym profilem.",
    text:
      "Czytelne profile, wyszukiwanie i konkretne informacje pomagają szybciej znaleźć usługę bez przekopywania się przez posty, komentarze i przypadkowe linki.",
    details: ["mniej klików", "czytelne profile", "szybszy wybór"],
    animation: "fromLeft",
  },
  {
    icon: FiShield,
    number: "02",
    label: "Zaufanie",
    title: "Decyzję podejmujesz na podstawie konkretów.",
    text:
      "Zdjęcia, opis, zakres usług i opinie są zebrane w jednym miejscu. Klient może spokojniej porównać profile i wybrać osobę, która naprawdę mu odpowiada.",
    details: ["opinie", "wiarygodność", "jasna oferta"],
    animation: "fromRight",
  },
  {
    icon: FiGrid,
    number: "03",
    label: "Różnorodność",
    title: "Jedna platforma nie musi oznaczać jednej branży.",
    text:
      "Showly może łączyć lokalnych usługodawców, freelancerów, twórców i specjalistów online bez zamykania ich w jednym sztywnym schemacie.",
    details: ["wiele branż", "lokalnie i online", "jedno miejsce"],
    animation: "fromLeft",
  },
];

const WhyUs = () => {
  const sectionRef = useRef(null);

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

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="whyus"
    >
      <div className={styles.decor} aria-hidden="true">
        <span className={styles.orbOne} />
        <span className={styles.orbTwo} />
        <span className={styles.verticalLine} />
        <span className={styles.horizontalLine} />
      </div>

      <div className={styles.inner}>
        <header className={styles.header}>
          <div
            className={`${styles.heading} ${styles.reveal} ${styles.fromLeft}`}
          >
            <span className={styles.eyebrow}>Dlaczego Showly?</span>

            <h2>
              Nie chodzi o kolejną platformę. Chodzi o prostszą drogę do
              właściwej decyzji.
            </h2>
          </div>

          <aside
            className={`${styles.index} ${styles.reveal} ${styles.fromRight}`}
            style={{ "--reveal-delay": "120ms" }}
          >
            <span>01</span>
            <span>02</span>
            <span>03</span>

            <div className={styles.indexCaption}>
              <strong>3 powody</strong>
              <small>szybkość, zaufanie i różnorodność</small>
            </div>
          </aside>
        </header>

        <div className={styles.reasons}>
          {reasons.map((reason, index) => {
            const Icon = reason.icon;
            const reverse = index % 2 !== 0;

            return (
              <article
                className={`${styles.reason} ${
                  reverse ? styles.reasonReverse : ""
                } ${styles.reveal} ${styles[reason.animation]}`}
                style={{
                  "--reveal-delay": `${index * 100}ms`,
                }}
                key={reason.number}
              >
                <div className={styles.reasonNumber}>
                  <span>{reason.number}</span>
                </div>

                <div className={styles.reasonContent}>
                  <div className={styles.reasonLabel}>
                    <Icon aria-hidden="true" />
                    <span>{reason.label}</span>
                  </div>

                  <h3>{reason.title}</h3>

                  <p>{reason.text}</p>

                  <div className={styles.details}>
                    {reason.details.map((detail) => (
                      <span key={detail}>{detail}</span>
                    ))}
                  </div>
                </div>

                <div className={styles.reasonSide} aria-hidden="true">
                  <Icon />
                </div>
              </article>
            );
          })}
        </div>

        <footer
          className={`${styles.footer} ${styles.reveal} ${styles.fromBottom}`}
          style={{ "--reveal-delay": "100ms" }}
        >
          <div className={styles.footerIcon}>
            <FiArrowDown aria-hidden="true" />
          </div>

          <p>
            Wygląda nowocześnie. Działa intuicyjnie. Pomaga szybciej przejść
            od zainteresowania do kontaktu.
          </p>
        </footer>
      </div>
    </section>
  );
};

export default WhyUs;