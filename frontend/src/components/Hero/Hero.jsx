import styles from './Hero.module.scss';
import Navbar from '../Navbar/Navbar';
import { Link } from 'react-router-dom';
import SearchBar from '../SearchBar/SearchBar';

const Hero = ({ user, setUser, refreshTrigger, unreadCount, setUnreadCount, pendingReservationsCount }) => {
  return (
    <section className={styles.hero} id="hero">
      <Navbar
        user={user}
        setUser={setUser}
        refreshTrigger={refreshTrigger}
        unreadCount={unreadCount}
        setUnreadCount={setUnreadCount}
        pendingReservationsCount={pendingReservationsCount}
      />
      <div className={styles.heroContent}>
        <h1>Promuj się<br />online!</h1>
        <p>Stwórz swój profil i zaprezentuj swoje usługi</p>

        <div className={styles.actions}>
          <div className={styles.searchWrapper}>
            <SearchBar variant="hero" />
          </div>

          {user ? (
            <Link
              to="/profil"
              state={{ scrollToId: 'scrollToId' }}  // ← ID elementu w YourProfile
              className={styles.ctaButton}
              aria-label="Przejdź do profilu"
            >
              Przejdź do profilu
            </Link>
          ) : (
            <Link
              to="/register"
              state={{ scrollToId: 'registerContainer' }}
              className={styles.ctaButton}
              aria-label="Załóż konto"
            >
              Załóż konto
            </Link>
          )}
        </div>
      </div>

      <div className={styles.wave}>
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path
            fill="#fff"
            d="M0,160L40,149.3C80,139,160,117,240,133.3C320,149,400,203,480,229.3C560,256,640,256,720,218.7C800,181,880,107,960,90.7C1040,75,1120,117,1200,154.7C1280,192,1360,224,1400,240L1440,256L1440,320L0,320Z"
          />
        </svg>
      </div>
    </section>
  );
};

export default Hero;
