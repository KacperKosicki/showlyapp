import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./BillingSuccess.module.scss";

export default function BillingSuccess({ triggerRefresh }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [sec, setSec] = useState(4);

  useEffect(() => {
    // ✅ odśwież globalne liczniki (unread / pending / itd.)
    if (typeof triggerRefresh === "function") triggerRefresh();

    // ✅ zabezpieczenie przed ponownym uruchamianiem przy back/forward
    // usuwa query/state po wejściu
    if (location.search || location.state) {
      window.history.replaceState({}, document.title);
    }

    const i = setInterval(() => setSec((s) => Math.max(0, s - 1)), 1000);
    const t = setTimeout(() => {
      navigate("/profil", { replace: true, state: { refresh: true } });
    }, 4000);

    return () => {
      clearInterval(i);
      clearTimeout(t);
    };
  }, [navigate, triggerRefresh, location.search, location.state]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.badge}>✅</div>

        <h1 className={styles.title}>Płatność zakończona</h1>
        <p className={styles.sub}>
          Jeśli webhook już się wykonał, Twoja widoczność została przedłużona.
          <span className={styles.hint}> Możesz od razu wrócić do profilu.</span>
        </p>

        <div className={styles.actions}>
          <button
            className={styles.primary}
            onClick={() => navigate("/profil", { state: { refresh: true } })}
          >
            Wróć do profilu
          </button>
          <button className={styles.ghost} onClick={() => navigate("/")}>
            Strona główna
          </button>
        </div>

        <div className={styles.meta}>
          Automatyczne przekierowanie za <b>{sec}s</b>
        </div>
      </div>
    </div>
  );
}
