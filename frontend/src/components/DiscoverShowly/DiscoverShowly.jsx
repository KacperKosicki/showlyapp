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
      <div className={styles.bg} aria-hidden="true">
        <span className={styles.aurora} />
        <span className={styles.aurora2} />
        <span className={styles.grid} />
        <span className={styles.glow} />
        <span className={styles.vignette} />
        <span className={styles.grain} />
      </div>

      <div className={styles.wrap}>
        <header className={styles.head}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Showly Explore</span>
            <span className={styles.labelDot} />
            <span className={styles.labelDesc}>Przestrzeń do odkrywania usług</span>
            <span className={styles.labelLine} />
            <span className={styles.pill}>Profile • Kontakt • Rezerwacje</span>
          </div>

          <h2 className={styles.title}>
            Odkrywaj <span className={styles.titleAccent}>najlepsze profile</span>
          </h2>

          <p className={styles.subtitle}>
            Showly pomaga szybko znaleźć odpowiednią osobę, porównać oferty i
            przejść od zainteresowania do działania — bez chaosu i bez zbędnych kroków.
          </p>
        </header>

        <div className={styles.gridCards}>
          {items.map((item) => (
            <article key={item.title} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.icon}>{item.icon}</div>
                <h3 className={styles.cardTitle}>{item.title}</h3>
              </div>

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
          <div className={styles.bottomLine} />
          <p className={styles.bottomText}>
            Przewijaj niżej i sprawdź wybrane wizytówki dostępne aktualnie na platformie.
          </p>
          <div className={styles.bottomLine} />
        </div>
      </div>
    </section>
  );
};

export default DiscoverShowly;