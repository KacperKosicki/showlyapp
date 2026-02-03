import styles from './Footer.module.scss';
import { FaFacebookF, FaInstagram, FaTwitter, FaLinkedin } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.column}>
          <h4 className={styles.footerLogo}>
            LooklyApp <span className={styles.beta}>BETA</span>
          </h4>
          <p>Łączymy specjalistów z klientami – prosto, szybko i skutecznie.</p>
        </div>
        <div className={styles.column}>
          <h4>Nawigacja</h4>
          <ul>
            <li><a href="/">Strona Główna</a></li>
            <li><a href="#features">Dlaczego My?</a></li>
            <li><a href="#specialists">Specjaliści</a></li>
            <li><a href="#contact">Kontakt</a></li>
          </ul>
        </div>
        <div className={styles.column}>
          <h4>Kontakt</h4>
          <p>kontakt@looklyapp.pl</p>
          <p>+48 123 456 789</p>
          <div className={styles.socials}>
            <button
              type="button"
              className={styles.socialBtn}
              aria-label="Facebook (wkrótce)"
              title="Wkrótce"
            >
              <FaFacebookF />
            </button>

            <button
              type="button"
              className={styles.socialBtn}
              aria-label="Instagram (wkrótce)"
              title="Wkrótce"
            >
              <FaInstagram />
            </button>

            <button
              type="button"
              className={styles.socialBtn}
              aria-label="Twitter (wkrótce)"
              title="Wkrótce"
            >
              <FaTwitter />
            </button>

            <button
              type="button"
              className={styles.socialBtn}
              aria-label="LinkedIn (wkrótce)"
              title="Wkrótce"
            >
              <FaLinkedin />
            </button>
          </div>

        </div>
      </div>
      <div className={styles.bottom}>
        <p>&copy; {new Date().getFullYear()} LooklyApp. Wszelkie prawa zastrzeżone.</p>
      </div>
    </footer>
  );
};

export default Footer;
