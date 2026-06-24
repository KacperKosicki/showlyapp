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
      <div className={styles.inner}>
        <aside className={styles.side}>
          <span className={styles.overline}>Showly Flow</span>

          <h2 className={styles.title}>Od znalezienia profilu do działania.</h2>

          <p className={styles.subtitle}>
            Showly prowadzi użytkownika prostą ścieżką: szukanie, porównanie,
            kontakt i rezerwacja. Bez przeładowania, bez chaosu i bez zbędnych
            kroków.
          </p>

          <div className={styles.sideMeta}>
            <div className={styles.metaItem}>
              <strong>01</strong>
              <span>znajdź odpowiednią osobę</span>
            </div>

            <div className={styles.metaItem}>
              <strong>02</strong>
              <span>sprawdź ofertę i opinie</span>
            </div>

            <div className={styles.metaItem}>
              <strong>03</strong>
              <span>napisz albo zarezerwuj termin</span>
            </div>
          </div>
        </aside>

        <main className={styles.content}>
          <div className={styles.chapterHead}>
            <div>
              <span className={styles.chapterLabel}>
                4 kroki / Intuicyjnie / Bez stresu
              </span>

              <h3>Jak działa Showly?</h3>
            </div>

            <span className={styles.chapterNumber}>04</span>
          </div>

          <div className={styles.timeline}>
            {steps.map((item, index) => (
              <article className={styles.card} key={item.step}>
                <div className={styles.stepRail} aria-hidden="true">
                  <span className={styles.stepDot}>{item.step}</span>

                  {index !== steps.length - 1 && (
                    <span className={styles.stepConnector} />
                  )}
                </div>

                <div className={styles.cardInner}>
                  <div className={styles.cardTop}>
                    <span className={styles.icon}>{item.icon}</span>

                    <div>
                      <span className={styles.stepLabel}>Krok {item.step}</span>
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
            <span className={styles.summaryNumber}>05</span>

            <div>
              <span className={styles.summaryKicker}>Efekt?</span>

              <p className={styles.summaryText}>
                Użytkownik szybciej rozumie platformę, dłużej zostaje na stronie
                i łatwiej przechodzi do działania.
              </p>

              <div className={styles.summaryMini}>
                <span>mniej chaosu</span>
                <span>lepsze decyzje</span>
                <span>szybszy kontakt</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </section>
  );
};

export default HowShowlyWorks;