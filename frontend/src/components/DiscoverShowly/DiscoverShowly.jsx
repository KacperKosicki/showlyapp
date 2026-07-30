import { useEffect, useRef } from "react";

import styles from "./DiscoverShowly.module.scss";

import {
  FiArrowRight,
  FiClock,
  FiMessageSquare,
  FiThumbsUp,
  FiUsers,
} from "react-icons/fi";

const items = [
  {
    icon: FiUsers,
    number: "01",
    label: "Profile",
    title: "Odkrywaj specjalistów z różnych branż.",
    text:
      "Przeglądaj wizytówki osób działających lokalnie i online. Zobacz, czym się zajmują, gdzie pracują i jak wygląda ich oferta.",
    details: ["branże", "lokalizacja", "wizytówki"],
    animation: "fromLeft",
  },
  {
    icon: FiMessageSquare,
    number: "02",
    label: "Kontakt",
    title: "Zadawaj pytania bez szukania właściwego miejsca.",
    text:
      "Przejdź bezpośrednio do wiadomości, doprecyzuj usługę i ustal najważniejsze szczegóły z usługodawcą.",
    details: ["wiadomości", "kontakt", "szczegóły"],
    animation: "fromRight",
  },
  {
    icon: FiClock,
    number: "03",
    label: "Dostępność",
    title: "Sprawdzaj terminy tam, gdzie są aktywne.",
    text:
      "Nie każdy profil działa w ten sam sposób. Tam, gdzie dostępne są rezerwacje, możesz wygodnie sprawdzić terminy.",
    details: ["terminy", "rezerwacje", "elastyczność"],
    animation: "fromLeft",
  },
  {
    icon: FiThumbsUp,
    number: "04",
    label: "Decyzja",
    title: "Porównuj konkrety i wybieraj świadomie.",
    text:
      "Zdjęcia, opinie, zakres usług i podstawowe informacje pomagają szybciej ocenić, który profil najlepiej odpowiada Twoim potrzebom.",
    details: ["opinie", "porównanie", "zaufanie"],
    animation: "fromBottom",
  },
];

const DiscoverShowly = () => {
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
      id="discover-showly"
    >
      <div className={styles.decor} aria-hidden="true">
        <span className={styles.orbOne} />
        <span className={styles.orbTwo} />
        <span className={styles.lineOne} />
        <span className={styles.lineTwo} />
      </div>

      <div className={styles.inner}>
        <header className={styles.header}>
          <div
            className={`${styles.heading} ${styles.reveal} ${styles.fromLeft}`}
          >
            <span className={styles.eyebrow}>Odkrywaj Showly</span>

            <h2>
              Znajdź właściwą osobę, poznaj ofertę i przejdź prosto do działania.
            </h2>
          </div>

          <div
            className={`${styles.lead} ${styles.reveal} ${styles.fromRight}`}
            style={{ "--reveal-delay": "120ms" }}
          >
            <p>
              Showly pomaga przejść od ogólnego wyszukiwania do konkretnego
              profilu — bez przeglądania przypadkowych postów, komentarzy i
              wielu osobnych linków.
            </p>

            <div className={styles.leadMeta}>
              <strong>Profile / kontakt / terminy</strong>
              <span>wszystko w jednej, uporządkowanej ścieżce</span>
            </div>
          </div>
        </header>

        <div className={styles.features}>
          {items.map((item, index) => {
            const Icon = item.icon;

            return (
              <article
                className={`${styles.feature} ${
                  styles[`feature${index + 1}`]
                } ${styles.reveal} ${styles[item.animation]}`}
                style={{
                  "--reveal-delay": `${index * 110}ms`,
                }}
                key={item.number}
              >
                <div className={styles.featureTop}>
                  <span className={styles.featureNumber}>
                    {item.number}
                  </span>

                  <div className={styles.featureIcon}>
                    <Icon aria-hidden="true" />
                  </div>
                </div>

                <div className={styles.featureBody}>
                  <span className={styles.featureLabel}>
                    {item.label}
                  </span>

                  <h3>{item.title}</h3>

                  <p>{item.text}</p>

                  <div className={styles.details}>
                    {item.details.map((detail) => (
                      <span key={detail}>{detail}</span>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <footer
          className={`${styles.footer} ${styles.reveal} ${styles.fromBottom}`}
          style={{ "--reveal-delay": "100ms" }}
        >
          <div>
            <span className={styles.eyebrow}>Sprawdź dalej</span>

            <h3>
              Przewiń niżej i zobacz profile dostępne aktualnie na platformie.
            </h3>
          </div>

          <div className={styles.footerNote}>
            <p>
              Porównaj różne branże, style pracy i zakresy usług. Być może
              właściwy profil jest już kilka kroków niżej.
            </p>

            <FiArrowRight aria-hidden="true" />
          </div>
        </footer>
      </div>
    </section>
  );
};

export default DiscoverShowly;