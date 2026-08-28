import { useEffect, useRef, useState } from "react";
import {
  FiArrowRight,
  FiClock,
  FiMessageSquare,
  FiThumbsUp,
  FiUsers,
} from "react-icons/fi";

import styles from "./DiscoverShowly.module.scss";

const items = [
  {
    icon: FiUsers,
    number: "01",
    label: "Profile",
    title: "Zobacz, kto robi to, czego szukasz.",
    text: "Każda wizytówka pokazuje specjalizację, lokalizację i najważniejsze informacje o sposobie pracy.",
    details: ["branża", "lokalizacja", "o profilu"],
  },
  {
    icon: FiMessageSquare,
    number: "02",
    label: "Kontakt",
    title: "Od razu wiesz, jak zacząć rozmowę.",
    text: "Wiadomość, telefon i pozostałe kanały kontaktu są zebrane przy właściwym profilu.",
    details: ["wiadomość", "telefon", "social media"],
  },
  {
    icon: FiClock,
    number: "03",
    label: "Dostępność",
    title: "Sprawdź terminy, jeśli profil je udostępnia.",
    text: "Usługodawca sam wybiera sposób obsługi zapytań. Rezerwujesz termin albo ustalasz go w rozmowie.",
    details: ["terminy", "rezerwacja", "zapytanie"],
  },
  {
    icon: FiThumbsUp,
    number: "04",
    label: "Decyzja",
    title: "Porównuj ofertę, a nie obietnice.",
    text: "Realizacje, ceny, usługi i opinie pomagają wybrać profil odpowiadający Twoim potrzebom.",
    details: ["realizacje", "ceny", "opinie"],
  },
];

const DiscoverShowly = () => {
  const sectionRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeItem = items[activeIndex];
  const ActiveIcon = activeItem.icon;

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

  const scrollToProfiles = () => {
    const profilesHub = document.getElementById("profilesHub");
    const nextSection = sectionRef.current?.nextElementSibling;
    const target = profilesHub || nextSection;

    target?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="discover-showly"
      aria-labelledby="discover-showly-title"
    >
      <div className={styles.background} aria-hidden="true">
        <span className={styles.bigWord}>ODKRYWAJ</span>
        <span className={styles.dotField} />
      </div>

      <div className={styles.inner}>
        <header className={styles.header}>
          <div
            className={`${styles.heading} ${styles.reveal} ${styles.fromLeft}`}
          >
            <span className={styles.kicker}>
              <span className={styles.kickerDot} />
              Odkrywaj Showly
            </span>

            <h2 id="discover-showly-title">
              Najpierw potrzeba.
              <span>Potem właściwy profil.</span>
            </h2>
          </div>

          <div
            className={`${styles.lead} ${styles.reveal} ${styles.fromRight}`}
            style={{ "--reveal-delay": "100ms" }}
          >
            <p>
              Nie musisz znać nazwiska ani firmy. Zacznij od usługi,
              lokalizacji albo tego, co chcesz sprawdzić przed kontaktem.
            </p>

            <div className={styles.leadNote}>
              <strong>Jeden profil</strong>
              <span>oferta, realizacje, kontakt i dostępność</span>
            </div>
          </div>
        </header>

        <div
          className={`${styles.explorer} ${styles.reveal} ${styles.fromBottom}`}
          style={{ "--reveal-delay": "80ms" }}
        >
          <div className={styles.explorerNav}>
            <div className={styles.explorerNavHead}>
              <span>Co chcesz sprawdzić?</span>
              <small>Wybierz obszar profilu</small>
            </div>

            <div
              className={styles.tabs}
              role="tablist"
              aria-label="Elementy profilu Showly"
            >
              {items.map((item, index) => {
                const Icon = item.icon;
                const isActive = index === activeIndex;

                return (
                  <button
                    type="button"
                    id={`discover-tab-${index}`}
                    className={`${styles.tab} ${
                      isActive ? styles.tabActive : ""
                    }`}
                    onClick={() => setActiveIndex(index)}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls="discover-preview"
                    key={item.number}
                  >
                    <span className={styles.tabIcon}>
                      <Icon aria-hidden="true" />
                    </span>

                    <span className={styles.tabCopy}>
                      <small>{item.number}</small>
                      <strong>{item.label}</strong>
                    </span>

                    <FiArrowRight
                      className={styles.tabArrow}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={styles.preview}
            id="discover-preview"
            role="tabpanel"
            aria-labelledby={`discover-tab-${activeIndex}`}
            key={activeItem.number}
          >
            <span className={styles.previewCircle} aria-hidden="true" />

            <div className={styles.previewTop}>
              <span className={styles.previewIcon}>
                <ActiveIcon aria-hidden="true" />
              </span>

              <span className={styles.previewCount}>
                {activeItem.number} / 04
              </span>
            </div>

            <div className={styles.previewBody}>
              <span className={styles.previewLabel}>{activeItem.label}</span>
              <h3>{activeItem.title}</h3>
              <p>{activeItem.text}</p>
            </div>

            <div className={styles.previewDetails}>
              {activeItem.details.map((detail) => (
                <span key={detail}>{detail}</span>
              ))}
            </div>
          </div>
        </div>

        <footer
          className={`${styles.footer} ${styles.reveal} ${styles.fromBottom}`}
          style={{ "--reveal-delay": "110ms" }}
        >
          <div className={styles.footerCopy}>
            <span>Sprawdź sam</span>
            <h3>Profile są już kilka kroków niżej.</h3>
            <p>
              Porównaj różne branże, sposoby pracy i zakresy usług.
            </p>
          </div>

          <button
            type="button"
            className={styles.browseButton}
            onClick={scrollToProfiles}
          >
            <span>Przeglądaj profile</span>
            <FiArrowRight aria-hidden="true" />
          </button>
        </footer>
      </div>
    </section>
  );
};

export default DiscoverShowly;
