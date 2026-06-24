import styles from "./DiscoverShowly.module.scss";
import { FiUsers, FiMessageSquare, FiClock, FiThumbsUp } from "react-icons/fi";

const items = [
  {
    icon: <FiUsers />,
    title: "Profile z różnych branż",
    text: "Przeglądaj wizytówki specjalistów z wielu kategorii — od usług lokalnych po działalność online.",
    badges: ["branże", "wizytówki", "kategorie"],
  },
  {
    icon: <FiMessageSquare />,
    title: "Szybki kontakt",
    text: "Zadaj pytanie, doprecyzuj usługę i ustal szczegóły bez wychodzenia z platformy.",
    badges: ["wiadomości", "kontakt", "wygoda"],
  },
  {
    icon: <FiClock />,
    title: "Dostępność i terminy",
    text: "Sprawdzaj dostępność usługodawców i korzystaj z wygodnych form rezerwacji tam, gdzie są aktywne.",
    badges: ["terminy", "rezerwacje", "elastyczność"],
  },
  {
    icon: <FiThumbsUp />,
    title: "Opinie i decyzje",
    text: "Porównuj profile, zdjęcia, zakres usług i oceny, żeby podejmować lepsze decyzje szybciej.",
    badges: ["opinie", "porównanie", "zaufanie"],
  },
];

const DiscoverShowly = () => {
  return (
    <section className={styles.section} id="discover-showly">
      <div className={styles.inner}>
        <aside className={styles.side}>
          <span className={styles.overline}>Showly Explore</span>

          <h2 className={styles.title}>
            Odkrywaj profile bez chaosu.
          </h2>

          <p className={styles.subtitle}>
            Showly pomaga szybko znaleźć odpowiednią osobę, porównać oferty i
            przejść od zainteresowania do działania — bez zbędnych kroków.
          </p>

          <div className={styles.sideMeta}>
            <div className={styles.metaItem}>
              <strong>01</strong>
              <span>profile i branże</span>
            </div>

            <div className={styles.metaItem}>
              <strong>02</strong>
              <span>kontakt i wiadomości</span>
            </div>

            <div className={styles.metaItem}>
              <strong>03</strong>
              <span>terminy i decyzje</span>
            </div>
          </div>
        </aside>

        <main className={styles.content}>
          <div className={styles.chapterHead}>
            <div>
              <span className={styles.chapterLabel}>
                Profile / Kontakt / Rezerwacje
              </span>

              <h3>Co możesz zrobić w Showly?</h3>
            </div>

            <span className={styles.chapterNumber}>04</span>
          </div>

          <div className={styles.gridCards}>
            {items.map((item, index) => (
              <article key={item.title} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.cardNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className={styles.icon}>{item.icon}</div>
                </div>

                <h3 className={styles.cardTitle}>{item.title}</h3>

                <p className={styles.cardText}>{item.text}</p>

                <div className={styles.cardMeta}>
                  {item.badges.map((badge) => (
                    <span key={badge} className={styles.badge}>
                      {badge}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className={styles.bottomPanel}>
            <span className={styles.bottomNumber}>05</span>

            <p className={styles.bottomText}>
              Przewijaj niżej i sprawdź wybrane wizytówki dostępne aktualnie na
              platformie.
            </p>
          </div>
        </main>
      </div>
    </section>
  );
};

export default DiscoverShowly;