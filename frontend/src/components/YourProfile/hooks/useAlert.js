import { useCallback, useEffect, useRef, useState } from "react";

const useAlert = (autoCloseMs = 4000) => {
  const [alert, setAlert] = useState(null);
  const alertTimeoutRef = useRef(null);

  const clearAlertTimeout = useCallback(() => {
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
  }, []);

  const clearAlert = useCallback(() => {
    clearAlertTimeout();
    setAlert(null);
  }, [clearAlertTimeout]);

  const showAlert = useCallback(
    (message, type = "info") => {
      clearAlertTimeout();

      setAlert({ message, type });

      alertTimeoutRef.current = setTimeout(() => {
        setAlert(null);
        alertTimeoutRef.current = null;
      }, autoCloseMs);
    },
    [autoCloseMs, clearAlertTimeout]
  );

  useEffect(() => {
    return () => {
      clearAlertTimeout();
    };
  }, [clearAlertTimeout]);

  return {
    alert,
    showAlert,
    clearAlert,
  };
};

export default useAlert;