import { useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./AlertBox.module.scss";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaInfoCircle,
} from "react-icons/fa";

const icons = {
  success: <FaCheckCircle />,
  error: <FaTimesCircle />,
  info: <FaInfoCircle />,
  warning: <FaExclamationTriangle />,
};

const AlertBox = ({ type = "info", message, onClose }) => {
  useEffect(() => {
    if (!onClose || !message) return undefined;

    const timer = window.setTimeout(onClose, 5000);

    return () => window.clearTimeout(timer);
  }, [onClose, message]);

  if (!message || typeof document === "undefined") return null;

  const safeType = styles[type] ? type : "info";

  return createPortal(
    <div className={styles.alertBox}>
      <div
        className={`${styles.alert} ${styles[safeType]}`}
        role="alert"
        aria-live="polite"
      >
        <span className={styles.icon} aria-hidden="true">
          {icons[safeType] || icons.info}
        </span>

        <span className={styles.message}>{message}</span>

        {onClose && (
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Zamknij komunikat"
          >
            ×
          </button>
        )}
      </div>
    </div>,
    document.body
  );
};

export default AlertBox;
