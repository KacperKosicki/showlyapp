import styles from "./AppLoader.module.scss";

const AppLoader = () => {
  return (
    <main className={styles.loaderPage} aria-live="polite" aria-busy="true">
      <div className={styles.bg} aria-hidden="true">
        <span className={styles.orbOne} />
        <span className={styles.orbTwo} />
        <span className={styles.grid} />
      </div>

      <section className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.logoMark}>S</span>

          <div>
            <strong>Showly.me</strong>
            <span>profil online w jednym linku</span>
          </div>
        </div>

        <div className={styles.loaderBox} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className={styles.text}>
          <h1>Trwa ładowanie aplikacji</h1>
          <p>Przygotowujemy Twoje konto, profil i ustawienia.</p>
        </div>

        <div className={styles.progress} aria-hidden="true">
          <span />
        </div>
      </section>
    </main>
  );
};

export default AppLoader;