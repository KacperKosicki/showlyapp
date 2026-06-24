import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import styles from "./ShowlyJourney.module.scss";
import {
  FaUserPlus,
  FaPalette,
  FaLink,
  FaStar,
  FaCalendarAlt,
  FaPaperPlane,
  FaCheckCircle,
} from "react-icons/fa";

const steps = [
  {
    icon: <FaUserPlus />,
    title: "Zakładasz profil",
    text: "Tworzysz darmową wizytówkę i uzupełniasz najważniejsze informacje o sobie lub swojej usłudze.",
  },
  {
    icon: <FaPalette />,
    title: "Dodajesz ofertę",
    text: "Wrzucasz opis, zdjęcia, cennik, usługi, lokalizację, dostępność i linki społecznościowe.",
  },
  {
    icon: <FaLink />,
    title: "Udostępniasz link",
    text: "Wysyłasz klientowi jeden prosty link, który prowadzi do całej Twojej oferty online.",
  },
  {
    icon: <FaStar />,
    title: "Zbierasz opinie",
    text: "Klienci mogą oceniać Twój profil, zostawiać komentarze i budować Twoją wiarygodność.",
  },
];

const features = [
  "profil w jednym linku",
  "galeria zdjęć",
  "opinie klientów",
  "cennik usług",
  "kontakt i social media",
  "rezerwacje lub zapytania",
];

const ShowlyJourney = () => {
  const location = useLocation();

  useEffect(() => {
    const scrollTo = location.state?.scrollToId;

    if (!scrollTo) return;

    const tryScroll = () => {
      const el = document.getElementById(scrollTo);

      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        window.history.replaceState({}, document.title, location.pathname);
        return;
      }

      requestAnimationFrame(tryScroll);
    };

    requestAnimationFrame(tryScroll);
  }, [location.state, location.pathname]);

  return (
    <section className={styles.section} id="showlyJourney">
      <div className={styles.inner}>
        <div className={styles.layout}>
          <aside className={styles.side}>
            <span className={styles.overline}>Showly Journey</span>

            <h2 className={styles.heading}>
              Od pustego profilu do gotowej{" "}
              <span>wizytówki online.</span>
            </h2>

            <p className={styles.description}>
              Showly zbiera wszystko, co klient powinien zobaczyć przed
              kontaktem: ofertę, zdjęcia, opinie, cennik, dostępność i możliwość
              wysłania wiadomości lub rezerwacji.
            </p>

            <div className={styles.metaRow}>
              <div className={styles.metaCard}>
                <strong>01</strong>
                <span>zakładasz profil</span>
              </div>

              <div className={styles.metaCard}>
                <strong>1 link</strong>
                <span>do całej oferty</span>
              </div>

              <div className={styles.metaCard}>
                <strong>mobile</strong>
                <span>gotowe na telefon</span>
              </div>
            </div>

            <div className={styles.infoBox}>
              <span>Profil • Oferta • Kontakt</span>

              <p>
                Zamiast wysyłać osobno zdjęcia, ceny, opis, opinie i social
                media — wysyłasz jeden link do kompletnego profilu.
              </p>
            </div>
          </aside>

          <div className={styles.content}>
            <div className={styles.chapterHead}>
              <div>
                <span className={styles.chapterLabel}>Jak działa Showly?</span>

                <h3>Prosty proces bez kombinowania i chaosu.</h3>
              </div>

              <span className={styles.chapterNumber}>04</span>
            </div>

            <div className={styles.journeyGrid}>
              <div className={styles.steps}>
                {steps.map((step, index) => (
                  <article className={styles.stepCard} key={step.title}>
                    <div className={styles.stepNumber}>0{index + 1}</div>

                    <div className={styles.stepIcon}>{step.icon}</div>

                    <div className={styles.stepContent}>
                      <h4>{step.title}</h4>
                      <p>{step.text}</p>
                    </div>
                  </article>
                ))}
              </div>

              <aside className={styles.previewPanel}>
                <div className={styles.previewHeader}>
                  <span>Podgląd profilu</span>
                  <b>showly.me/twoja-nazwa</b>
                </div>

                <div className={styles.phone}>
                  <div className={styles.phoneTop}>
                    <span />
                  </div>

                  <div className={styles.profile}>
                    <div className={styles.cover} />

                    <div className={styles.profileMain}>
                      <div className={styles.avatar}>
                        <img src="/images/other/logo-showly.png" alt="Showly" />
                      </div>

                      <div>
                        <h4>Showly.me</h4>
                        <p>Profile online • Cała Polska</p>
                      </div>
                    </div>

                    <div className={styles.badges}>
                      <span>Widoczność online</span>
                      <span>Jeden link</span>
                      <span>Mobilnie</span>
                    </div>

                    <div className={styles.infoList}>
                      <div>
                        <FaStar />
                        <span>5.0 / 5 opinii klientów</span>
                      </div>

                      <div>
                        <FaCalendarAlt />
                        <span>Najbliższy termin: zawsze</span>
                      </div>

                      <div>
                        <FaPaperPlane />
                        <span>Szybkie zapytanie do profilu</span>
                      </div>
                    </div>

                    <button type="button">Utwórz profil / działaj</button>
                  </div>
                </div>

                <div className={styles.featureBox}>
                  <strong>Co dostajesz?</strong>

                  <div>
                    {features.map((item) => (
                      <span key={item}>
                        <FaCheckCircle />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShowlyJourney;