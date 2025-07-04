import styles from './WhyUs.module.scss';

const WhyUs = () => {
  return (
    <section className={styles.section}>
      {/* Fala górna */}
      <div className={`${styles.wave} ${styles.top}`}>
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="#fff" d="M0,160 C120,60 240,260 360,160 C480,60 600,260 720,160 C840,60 960,260 1080,160 C1200,60 1320,260 1440,160 L1440,0 L0,0 Z" />
        </svg>
      </div>

      <div className={styles.container}>
        <h2 className={styles.title}>Dlaczego My?</h2>
        <p className={styles.subtitle}>
          Nasza platforma łączy profesjonalistów z klientami w prosty i intuicyjny sposób.
        </p>
        <div className={styles.features}>
          <div className={styles.feature}>
            <h3>Szybkość</h3>
            <p>Znajdź usługę lub specjalistę w kilka sekund dzięki naszym inteligentnym filtrom.</p>
          </div>
          <div className={styles.feature}>
            <h3>Zaufanie</h3>
            <p>Weryfikowane profile i realne opinie użytkowników zwiększają bezpieczeństwo wyboru.</p>
          </div>
          <div className={styles.feature}>
            <h3>Różnorodność</h3>
            <p>Od korepetycji po fryzjerstwo – szeroki wachlarz kategorii dostępnych od ręki.</p>
          </div>
        </div>
      </div>

      {/* Fala dolna */}
      <div className={`${styles.wave} ${styles.bottom}`}>
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="#fff" d="M0,160 C120,260 240,60 360,160 C480,260 600,60 720,160 C840,260 960,60 1080,160 C1200,260 1320,60 1440,160 L1440,320 L0,320 Z" />
        </svg>
      </div>
    </section>
  );
};

export default WhyUs;
