import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import styles from "./LoadingLink.module.scss";
import DotsLoader from "../DotsLoader/DotsLoader";

export default function LoadingLink({ to, state, className = "", children, ...rest }) {
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  // ✅ gdy zmieni się trasa → zdejmij loader
  useEffect(() => {
    if (loading) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleClick = (e) => {
    if (loading) {
      e.preventDefault();
      return;
    }

    // opcjonalnie: jeśli klikasz link do tej samej strony → nie odpalaj loadera
    const targetPath = typeof to === "string" ? to : to?.pathname;
    if (targetPath && targetPath === location.pathname) return;

    setLoading(true);
  };

  return (
    <Link
      to={to}
      state={state}
      onClick={handleClick}
      className={[className, loading ? styles.loading : ""].join(" ")}
      aria-busy={loading}
      {...rest}
    >
      <span className={styles.label} aria-hidden={loading}>
        {children}
      </span>

      {loading && (
        <span className={styles.loader} aria-hidden="true">
          <DotsLoader />
        </span>
      )}
    </Link>
  );
}
