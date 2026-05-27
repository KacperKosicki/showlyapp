import { Link } from 'react-router-dom';
import styles from '../YourProfile.module.scss';

const EmptyProfileState = () => {
  return (
    <div className={`${styles.wrapper} ${styles.emptyWrap}`}>
      <div className={styles.emptyCard} role="status" aria-live="polite">
        <div className={styles.emptyBadge}>Brak profilu</div>

        <h2 className={styles.emptyTitle}>Nie masz jeszcze wizytówki</h2>

        <p className={styles.emptyDesc}>
          Stwórz swój profil i zaprezentuj usługi — dodaj opis, zdjęcia, cennik i dostępne terminy.
          To tylko chwila, a pomoże klientom łatwo Cię znaleźć.
        </p>

        <ul className={styles.emptyList}>
          <li>
            <span className={styles.dot} aria-hidden="true"></span>
            <span>Wyróżnij się zdjęciami i krótkim opisem.</span>
          </li>

          <li>
            <span className={styles.dot} aria-hidden="true"></span>
            <span>Ustal zakres cen i czas usług.</span>
          </li>

          <li>
            <span className={styles.dot} aria-hidden="true"></span>
            <span>Opcjonalnie pokaż dostępne terminy do rezerwacji.</span>
          </li>
        </ul>

        <div className={styles.emptyCtas}>
          <Link to="/stworz-profil" className={`${styles.primary} ${styles.ctaPrimary}`}>
            Stwórz swój profil
          </Link>

          <Link to="/" className={styles.ghostLight}>
            Wróć na stronę główną
          </Link>
        </div>

        <div className={styles.emptyArt} aria-hidden="true">
          <div className={styles.bubble}></div>
          <div className={`${styles.bubble} ${styles.two}`}></div>
          <div className={`${styles.bubble} ${styles.three}`}></div>
        </div>
      </div>
    </div>
  );
};

export default EmptyProfileState;
