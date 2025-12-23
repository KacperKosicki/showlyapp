// src/components/ui/LoadingButton/LoadingButton.jsx
import React from "react";
import styles from "./LoadingButton.module.scss";

/**
 * Props:
 * - isLoading: boolean
 * - children: ReactNode
 * - variant: "primary" | "secondary" | "danger" | "ghost"
 * - size: "md" | "sm" | "lg"
 * - disabled: boolean
 * - onClick: () => void | Promise<void>
 * - type: "button" | "submit"
 * - loadingText?: string (opcjonalnie podmienia tekst w trakcie ładowania)
 */
export default function LoadingButton({
  isLoading,
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  onClick,
  type = "button",
  loadingText,
  className = "",
}) {
  const blocked = disabled || isLoading;

  const handleClick = async (e) => {
    if (blocked) return;
    // jeśli parent nie steruje isLoading, nadal pozwalamy na normalne async
    // (parent i tak zwykle ustawia isLoading w state)
    if (onClick) await onClick(e);
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={blocked}
      className={[
        styles.btn,
        styles[variant],
        styles[size],
        blocked ? styles.blocked : "",
        className,
      ].join(" ")}
    >
      <span className={styles.content}>
        <span className={styles.label}>
          {isLoading && loadingText ? loadingText : children}
        </span>

        {isLoading && (
          <span className={styles.loader} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        )}
      </span>
    </button>
  );
}
