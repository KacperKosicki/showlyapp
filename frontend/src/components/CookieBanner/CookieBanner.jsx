import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowUpRight, FiCheck, FiShield } from "react-icons/fi";
import styles from "./CookieBanner.module.scss";

const CONSENT_KEY = "showly_cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);

    if (!consent) {
      setVisible(true);
    }
  }, []);

  const saveConsent = (value) => {
    localStorage.setItem(CONSENT_KEY, value);
    localStorage.setItem(
      "showly_cookie_consent_date",
      new Date().toISOString()
    );

    setVisible(false);
  };

  const acceptCookies = () => {
    saveConsent("accepted");
  };

  const rejectCookies = () => {
    saveConsent("rejected");
  };

  if (!visible) return null;

  return (
    <div
      className={styles.cookieBanner}
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-description"
    >
      <div className={styles.content}>
        <div className={styles.heading}>
          <span className={styles.icon} aria-hidden="true"><FiShield /></span>
          <div>
            <span className={styles.overline}>Showly / Twój wybór</span>
            <h2 id="cookie-banner-title">Ciasteczka w Showly.</h2>
          </div>
        </div>
        <p id="cookie-banner-description">
          Niezbędne cookies pomagają stronie działać. Opcjonalne mogą służyć
          do analityki i ulepszania Showly. Ty decydujesz, czy je zaakceptować.
        </p>
        <Link to="/polityka-cookies" className={styles.link}>
          Polityka cookies <FiArrowUpRight aria-hidden="true" />
        </Link>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.rejectBtn} onClick={rejectCookies}>
          Tylko niezbędne
        </button>
        <button type="button" className={styles.acceptBtn} onClick={acceptCookies}>
          <FiCheck aria-hidden="true" /> Akceptuję
        </button>
      </div>
    </div>
  );
}
