import { useEffect } from 'react';
import styles from './AlertBox.module.scss';
import { FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaInfoCircle } from 'react-icons/fa';

const icons = {
  success: <FaCheckCircle />,
  error: <FaTimesCircle />,
  info: <FaInfoCircle />,
  warning: <FaExclamationTriangle />,
};

const AlertBox = ({ type = 'info', message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`${styles.alert} ${styles[type]}`}>
      <span className={styles.icon}>{icons[type]}</span>
      <span>{message}</span>
      <button className={styles.close} onClick={onClose}>×</button>
    </div>
  );
};

export default AlertBox;
