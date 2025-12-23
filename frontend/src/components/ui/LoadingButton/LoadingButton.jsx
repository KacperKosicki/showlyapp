import React from "react";
import styles from "./LoadingButton.module.scss";
import DotsLoader from "../DotsLoader/DotsLoader";

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
      className={className} // tylko Twoje klasy
      aria-busy={isLoading}
      // kotwica dla absolutnego loadera (nie zmienia wyglądu)
      style={{ position: "relative" }}
      {...rest}
    >
      {/* trzyma szerokość */}
      <span style={{ visibility: isLoading ? "hidden" : "visible" }}>
        {children}
      </span>

      {isLoading && (
        <span className={styles.loader} aria-hidden="true">
          <DotsLoader />
        </span>
      )}
    </button>
  );
}
