import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./BillingCancel.module.scss";

export default function BillingCancel({ triggerRefresh }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (typeof triggerRefresh === "function") triggerRefresh();

    if (location.search || location.state) {
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [triggerRefresh, location.pathname]); // ✅ zamiast search/state

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.badge}>⚠️</div>

        <h1 className={styles.title}>Płatność anulowana</h1>
        <p className={styles.sub}>
          Nic się nie stało — możesz spróbować ponownie, gdy będziesz gotowy.
        </p>

        <div className={styles.actions}>
          <button className={styles.primary} onClick={() => navigate("/profil")}>
            Wróć do profilu
          </button>
          <button className={styles.ghost} onClick={() => navigate(-1)}>
            Cofnij
          </button>
        </div>
      </div>
    </div>
  );
}
