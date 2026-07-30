import { useEffect, useRef } from "react";

import styles from "./HowShowlyWorks.module.scss";

import {
  FiArrowRight,
  FiCalendar,
  FiMessageCircle,
  FiSearch,
  FiStar,
} from "react-icons/fi";

const steps = [
  {
    icon: FiSearch,
    number: "01",
    label: "Wyszukiwanie",
    title: "Zaczynasz od tego, czego naprawdę potrzebujesz.",
    text:
      "Wpisujesz usługę, kategorię albo miasto. Showly prowadzi Cię bezpośrednio do profili, które pasują do Twojego wyszukiwania.",
    details: ["usługi", "kategorie", "lokalizacja"],
    animation: "fromLeft",
  },
  {
    icon: FiStar,
    number: "02",
    label: "Porównanie",
    title: "Sprawdzasz konkrety, a nie przypadkowe posty.",
    text:
      "Opis, zdjęcia, ceny i opinie znajdują się razem, więc łatwiej ocenić, czy dana osoba lub firma pasuje do Twoich potrzeb.",
    details: ["opinie", "zdjęcia", "ceny"],
    animation: "fromBottom",
  },
  {
    icon: FiMessageCircle,
    number: "03",
    label: "Kontakt",
    title: "Nie szukasz już właściwego miejsca do napisania.",
    text:
      "Profil prowadzi Cię bezpośrednio do kontaktu, wiadomości albo innej formy rozmowy wybranej przez usługodawcę.",
    details: ["wiadomość", "kontakt", "szybka decyzja"],
    animation: "fromRight",
  },
  {
    icon: FiCalendar,
    number: "04",
    label: "Działanie",
    title: "Rezerwujesz termin albo od razu przechodzisz dalej.",
    text:
      "Jeżeli profil korzysta z rezerwacji, wybierasz dostępny termin. W innym przypadku masz gotowe informacje i możesz od razu napisać.",
    details: ["terminy", "rezerwacje", "wygoda"],
    animation: "fromBottom",
  },
];

const HowShowlyWorks = () => {
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
      id="how-showly-works"
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
            <span className={styles.eyebrow}>Jak działa Showly?</span>

            <h2>
              Od wyszukania usługi do kontaktu — bez zbierania informacji
              z kilku różnych miejsc.
            </h2>
          </div>

          <div
            className={`${styles.lead} ${styles.reveal} ${styles.fromRight}`}
            style={{ "--reveal-delay": "120ms" }}
          >
            <p>
              Showly porządkuje drogę klienta. Najpierw znajdujesz właściwy
              profil, później porównujesz ofertę, a na końcu przechodzisz do
              kontaktu albo rezerwacji.
            </p>

            <div className={styles.leadMeta}>
              <strong>4 proste etapy</strong>
              <span>bez chaosu między postami i wiadomościami</span>
            </div>
          </div>
        </header>

        <div className={styles.steps}>
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <article
                className={`${styles.step} ${styles[`step${index + 1}`]} ${styles.reveal
                  } ${styles[step.animation]}`}
                style={{
                  "--reveal-delay": `${index * 110}ms`,
                }}
                key={step.number}
              >
                <div className={styles.stepTop}>
                  <span className={styles.stepNumber}>{step.number}</span>

                  <div className={styles.stepIcon}>
                    <Icon aria-hidden="true" />
                  </div>
                </div>

                <div className={styles.stepBody}>
                  <span className={styles.stepLabel}>{step.label}</span>

                  <h3>{step.title}</h3>

                  <p>{step.text}</p>

                  <div className={styles.details}>
                    {step.details.map((detail) => (
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
            <span className={styles.eyebrow}>Efekt</span>

            <h3>
              Klient szybciej rozumie ofertę i wie, co zrobić dalej.
            </h3>
          </div>

          <div className={styles.footerNote}>
            <p>
              Mniej szukania, mniej pytań o podstawowe informacje i prostsza
              droga od zainteresowania do decyzji.
            </p>

            <FiArrowRight aria-hidden="true" />
          </div>
        </footer>
      </div>
    </section>
  );
};

export default HowShowlyWorks;