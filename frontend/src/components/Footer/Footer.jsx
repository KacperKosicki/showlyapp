import styles from "./Footer.module.scss";
import { FaFacebookF, FaInstagram, FaXTwitter, FaLinkedinIn } from "react-icons/fa6";
import { FiMail, FiPhone, FiMapPin, FiArrowUpRight } from "react-icons/fi";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer} id="footer">
      {/* ✨ background layers */}
      <div className={styles.bg} aria-hidden="true">
        <span className={styles.aurora} />
        <span className={styles.aurora2} />
        <span className={styles.grid} />
        <span className={styles.vignette} />
        <span className={styles.grain} />
      </div>

      <div className={styles.wrap}>
        <div className={styles.top}>
          {/* brand */}
          <div className={styles.brand}>
            <div className={styles.brandTop}>
              <div className={styles.logoMark} aria-hidden="true" />
              <h4 className={styles.footerLogo}>
                Showly.me <span className={styles.beta}>BETA</span>
              </h4>
            </div>

            <p className={styles.brandText}>
              Showly.me to nowoczesna wizytówka usług online – profil, cennik, galeria i kontakt w jednym miejscu.
            </p>

            <div className={styles.pills}>
              <span className={styles.pill}>Mobile-first</span>
              <span className={styles.pill}>Premium UI</span>
              <span className={styles.pill}>Prosto</span>
            </div>
          </div>

          {/* navigation */}
          <nav className={styles.card} aria-label="Nawigacja">
            <h4 className={styles.cardTitle}>Nawigacja</h4>
            <ul className={styles.links}>
              <li>
                <a href="/" className={styles.link}>
                  Strona Główna <FiArrowUpRight />
                </a>
              </li>
              <li>
                <a href="#whyus" className={styles.link}>
                  Dlaczego My? <FiArrowUpRight />
                </a>
              </li>
              <li>
                <a href="#specialists" className={styles.link}>
                  Specjaliści <FiArrowUpRight />
                </a>
              </li>
              <li>
                <a href="/kontakt" className={styles.link}>
                  Kontakt <FiArrowUpRight />
                </a>
              </li>
            </ul>
          </nav>

          {/* contact */}
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>Kontakt</h4>

            <div className={styles.contact}>
              <div className={styles.contactRow}>
                <span className={styles.contactIcon} aria-hidden="true">
                  <FiMail />
                </span>
                <span className={styles.contactText}>kontakt@showly.me</span>
              </div>

              <div className={styles.contactRow}>
                <span className={styles.contactIcon} aria-hidden="true">
                  <FiPhone />
                </span>
                <span className={styles.contactText}>+48 123 456 789</span>
              </div>

              <div className={styles.contactRow}>
                <span className={styles.contactIcon} aria-hidden="true">
                  <FiMapPin />
                </span>
                <span className={styles.contactText}>Polska • działamy online</span>
              </div>
            </div>

            <div className={styles.socials} aria-label="Social media (wkrótce)">
              <button type="button" className={styles.socialBtn} aria-label="Facebook (wkrótce)" title="Wkrótce" disabled>
                <FaFacebookF />
              </button>
              <button type="button" className={styles.socialBtn} aria-label="Instagram (wkrótce)" title="Wkrótce" disabled>
                <FaInstagram />
              </button>
              <button type="button" className={styles.socialBtn} aria-label="X / Twitter (wkrótce)" title="Wkrótce" disabled>
                <FaXTwitter />
              </button>
              <button type="button" className={styles.socialBtn} aria-label="LinkedIn (wkrótce)" title="Wkrótce" disabled>
                <FaLinkedinIn />
              </button>
            </div>

            <div className={styles.note}>
              Sociale odpalimy wkrótce — na razie zbieramy feedback i dopieszczamy UX.
            </div>
          </div>
        </div>

        {/* bottom */}
        <div className={styles.bottom}>
          <div className={styles.bottomLeft}>
            <span className={styles.copy}>© {year} Showly.me. Wszelkie prawa zastrzeżone.</span>
            <span className={styles.sep} aria-hidden="true" />
            <a className={styles.smallLink} href="/regulamin">
              Regulamin
            </a>
            <span className={styles.dot} aria-hidden="true" />
            <a className={styles.smallLink} href="/polityka-prywatnosci">
              Polityka prywatności
            </a>
            <span className={styles.dot} aria-hidden="true" />
            <a className={styles.smallLink} href="/cookies">
              Cookies
            </a>
          </div>

          <a className={styles.toTop} href="#hero" aria-label="Wróć na górę">
            Do góry <span aria-hidden="true">↑</span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;