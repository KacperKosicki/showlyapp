import styles from "./AppLoader.module.scss";

export default function AppLoader() {
  return (
    <main className={styles.loaderPage} aria-label="Ładowanie aplikacji">
      <div className={styles.content}>
        <div className={styles.brand}>
          <span className={styles.logoMark} aria-hidden="true">
            <img src="/images/other/logo-showly.png" alt="" width="40" height="40" />
          </span>
          <strong>Showly.me</strong>
        </div>
        <h1>Jeszcze chwila.</h1>
        <p role="status">Ładujemy Showly…</p>
        <div className={styles.progress} aria-hidden="true"><span /></div>
      </div>
    </main>
  );
}
