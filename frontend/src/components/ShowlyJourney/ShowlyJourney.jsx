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
    <section className={styles.how} id="showlyJourney">
      <div className={styles.bg} aria-hidden="true">
        <span className={styles.orbOne} />
        <span className={styles.orbTwo} />
        <span className={styles.noise} />
      </div>

      <div className={styles.wrap}>
        <div className={styles.header}>
          <div className={styles.eyebrow}>
            <span>Jak działa Showly?</span>
            <b>prosto, szybko i bez chaosu</b>
          </div>

          <h2>
            Od pustego profilu do gotowej
            <span> wizytówki online.</span>
          </h2>

          <p>
            Showly zbiera wszystko, co klient powinien zobaczyć przed kontaktem:
            ofertę, zdjęcia, opinie, cennik, dostępność i możliwość wysłania
            wiadomości lub rezerwacji.
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.steps}>
            {steps.map((step, index) => (
              <article className={styles.stepCard} key={step.title}>
                <div className={styles.stepNumber}>0{index + 1}</div>

                <div className={styles.stepIcon}>{step.icon}</div>

                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.preview}>
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
                    <h3>Showly.me</h3>
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
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShowlyJourney;