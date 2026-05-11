import { useEffect } from "react";
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
    if (!onClose) return;

    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose, message]);

  if (!message) return null;

  return (
    <div className={styles.alertBox}>
      <div className={`${styles.alert} ${styles[type] || styles.info}`}>
        <span className={styles.icon}>{icons[type] || icons.info}</span>

        <span className={styles.message}>{message}</span>

        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Zamknij komunikat"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default AlertBox;