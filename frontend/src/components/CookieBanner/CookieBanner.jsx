import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

    const acceptCookies = () => {
        localStorage.setItem(CONSENT_KEY, "accepted");
        localStorage.setItem("showly_cookie_consent_date", new Date().toISOString());
        setVisible(false);
    };

    const rejectCookies = () => {
        localStorage.setItem(CONSENT_KEY, "rejected");
        localStorage.setItem("showly_cookie_consent_date", new Date().toISOString());
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className={styles.cookieBanner} role="dialog" aria-live="polite">
            <div className={styles.content}>
                <div className={styles.iconBox}>🍪</div>

                <div className={styles.text}>
                    <strong>Pliki cookies</strong>

                    <p>
                        Korzystamy z niezbędnych plików cookies oraz podobnych technologii,
                        aby strona działała poprawnie. Opcjonalne cookies mogą służyć do
                        analityki i poprawy działania Showly.
                    </p>

                    <Link to="/polityka-cookies" className={styles.link}>
                        Dowiedz się więcej
                    </Link>
                </div>
            </div>

            <div className={styles.actions}>
                <button
                    type="button"
                    className={styles.rejectBtn}
                    onClick={rejectCookies}
                >
                    Odrzucam
                </button>

                <button
                    type="button"
                    className={styles.acceptBtn}
                    onClick={acceptCookies}
                >
                    Akceptuję
                </button>
            </div>
        </div>
    );
}