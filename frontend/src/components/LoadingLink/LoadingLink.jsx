// src/components/ui/LoadingLink/LoadingLink.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./LoadingLink.module.scss";

export default function LoadingLink({ to, state, className, children }) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    if (loading) return;
    setLoading(true);
  };

  return (
    <Link
      to={to}
      state={state}
      className={`${className} ${loading ? styles.loading : ""}`}
      onClick={handleClick}
    >
      {loading ? (
        <span className={styles.dots}>
          <span />
          <span />
          <span />
        </span>
      ) : (
        children
      )}
    </Link>
  );
}
