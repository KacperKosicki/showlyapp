import styles from "./HowShowlyWorks.module.scss";
import { FiSearch, FiStar, FiMessageCircle, FiCalendar } from "react-icons/fi";

const steps = [
  {
    icon: <FiSearch />,
    step: "01",
    title: "Szukaj po swojemu",
    text: "Przeglądaj profile według kategorii, lokalizacji, opinii i stylu usług. Bez chaosu i bez tracenia czasu.",
    badges: ["filtry", "kategorie", "lokalizacja"],
  },
  {
    icon: <FiStar />,
    step: "02",
    title: "Porównuj profile",
    text: "Sprawdź zdjęcia, opisy, zakres usług, ceny, terminy i oceny — zanim podejmiesz decyzję.",
    badges: ["opinie", "zdjęcia", "usługi"],
  },
  {
    icon: <FiMessageCircle />,
    step: "03",
    title: "Napisz lub zapytaj",
    text: "Skontaktuj się bezpośrednio z usługodawcą, dopytaj o szczegóły albo ustal wszystko w kilku wiadomościach.",
    badges: ["kontakt", "wiadomości", "szybka odpowiedź"],
  },
  {
    icon: <FiCalendar />,
    step: "04",
    title: "Rezerwuj wygodnie",
    text: "Tam, gdzie dostępna jest rezerwacja, wybierasz termin i gotowe. Prosto, mobilnie i bez zbędnych etapów.",
    badges: ["terminy", "rezerwacje", "mobile"],
  },
];

const HowShowlyWorks = () => {
  return (
    <section className={styles.section} id="how-showly-works">
      <div className={styles.bg} aria-hidden="true">
        <span className={styles.aurora} />
        <span className={styles.aurora2} />
        <span className={styles.grid} />
        <span className={styles.ring} />
        <span className={styles.vignette} />
        <span className={styles.grain} />
      </div>

      <div className={styles.wrap}>
        <header className={styles.head}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Showly Flow</span>
            <span className={styles.labelDot} />
            <span className={styles.labelDesc}>Od wejścia do działania</span>
            <span className={styles.labelLine} />
            <span className={styles.pill}>4 kroki • Intuicyjnie • Bez stresu</span>
          </div>

          <h2 className={styles.title}>
            Jak działa <span className={styles.titleAccent}>Showly?</span>
          </h2>

          <p className={styles.subtitle}>
            Pokazujemy użytkownikowi jasną ścieżkę: od znalezienia odpowiedniej osoby,
            przez porównanie profili, aż po kontakt lub rezerwację. Wszystko w jednym miejscu.
          </p>
        </header>

        <div className={styles.timeline}>
          {steps.map((item, index) => (
            <article className={styles.card} key={item.step}>
              <div className={styles.stepLine} aria-hidden="true">
                <span className={styles.stepDot} />
                {index !== steps.length - 1 && <span className={styles.stepConnector} />}
              </div>

              <div className={styles.cardInner}>
                <div className={styles.cardTop}>
                  <div className={styles.icon}>{item.icon}</div>

                  <div className={styles.cardHead}>
                    <span className={styles.step}>{item.step}</span>
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                  </div>
                </div>

                <p className={styles.cardText}>{item.text}</p>

                <div className={styles.cardMeta}>
                  {item.badges.map((badge) => (
                    <span key={badge} className={styles.badge}>
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.summary}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryKicker}>Efekt?</span>
            <p className={styles.summaryText}>
              Użytkownik szybciej rozumie platformę, dłużej zostaje na stronie
              i łatwiej przechodzi do działania.
            </p>
          </div>

          <div className={styles.summaryMini}>
            <span>mniej chaosu</span>
            <span>lepsze decyzje</span>
            <span>szybszy kontakt</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowShowlyWorks;