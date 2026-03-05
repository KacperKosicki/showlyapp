import styles from "./WhyUs.module.scss";
import { FiZap, FiShield, FiGrid } from "react-icons/fi";

const WhyUs = () => {
  return (
    <section className={styles.section} id="whyus">
      {/* ✨ background layers */}
      <div className={styles.bg} aria-hidden="true">
        <span className={styles.aurora} />
        <span className={styles.aurora2} />
        <span className={styles.grid} />
        <span className={styles.vignette} />
        <span className={styles.grain} />
      </div>

      <div className={styles.wrap}>
        {/* header */}
        <header className={styles.head}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Showly</span>
            <span className={styles.labelDot} />
            <span className={styles.labelDesc}>Dlaczego to działa?</span>
            <span className={styles.labelLine} />
            <span className={styles.pill}>Prosto • Premium • Mobile</span>
          </div>

          <h2 className={styles.title}>
            Dlaczego <span className={styles.titleAccent}>My?</span>
          </h2>

          <p className={styles.subtitle}>
            Łączymy klientów z profesjonalistami w sposób, który jest szybki, bezpieczny i po prostu wygodny —
            szczególnie na telefonie.
          </p>
        </header>

        {/* features */}
        <div className={styles.features}>
          <article className={styles.card}>
            <div className={styles.cardTop}>
              <div className={styles.icon} aria-hidden="true">
                <FiZap />
              </div>
              <div className={styles.cardTitle}>Szybkość</div>
            </div>
            <p className={styles.cardText}>
              Znajdź usługę lub specjalistę w kilka sekund dzięki inteligentnym filtrom i czytelnemu układowi profili.
            </p>
            <div className={styles.cardMeta}>
              <span className={styles.badge}>mniej klików</span>
              <span className={styles.badge}>więcej efektu</span>
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardTop}>
              <div className={styles.icon} aria-hidden="true">
                <FiShield />
              </div>
              <div className={styles.cardTitle}>Zaufanie</div>
            </div>
            <p className={styles.cardText}>
              Weryfikowane profile i realne opinie pomagają wybrać najlepiej — bez stresu i bez niespodzianek.
            </p>
            <div className={styles.cardMeta}>
              <span className={styles.badge}>opinie</span>
              <span className={styles.badge}>wiarygodność</span>
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardTop}>
              <div className={styles.icon} aria-hidden="true">
                <FiGrid />
              </div>
              <div className={styles.cardTitle}>Różnorodność</div>
            </div>
            <p className={styles.cardText}>
              Od korepetycji po fryzjerstwo — szeroki wachlarz kategorii i profili gotowych do kontaktu od ręki.
            </p>
            <div className={styles.cardMeta}>
              <span className={styles.badge}>wiele branż</span>
              <span className={styles.badge}>jedna platforma</span>
            </div>
          </article>
        </div>

        {/* bottom line */}
        <div className={styles.bottomBar}>
          <div className={styles.barLine} />
          <div className={styles.barText}>Wygląda nowocześnie. Działa intuicyjnie. Sprzedaje lepiej.</div>
        </div>
      </div>
    </section>
  );
};

export default WhyUs;