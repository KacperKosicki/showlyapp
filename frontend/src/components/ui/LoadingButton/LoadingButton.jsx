import React from "react";
import styles from "./LoadingButton.module.scss";

export default function LoadingButton({
  isLoading = false,
  disabled = false,
  onClick,
  type = "button",
  className = "",
  children,
  ...rest
}) {
  const blocked = disabled || isLoading;

  const handleClick = async (e) => {
    if (blocked) return;
    if (onClick) await onClick(e);
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={blocked}
      className={`${styles.button} ${className}`}
      aria-busy={isLoading ? "true" : "false"}
      {...rest}
    >
      <span className={`${styles.content} ${isLoading ? styles.hidden : ""}`}>
        {children}
      </span>

      {isLoading && (
        <span className={styles.loader} aria-hidden="true">
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </span>
      )}
    </button>
  );
}