import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiCalendar, FiX } from 'react-icons/fi';
import styles from './ReservationActionDialog.module.scss';

const ReservationActionDialog = ({ title, description, label, confirmText, required = false, minLength = 0, maxLength = 500, danger = false, onComplete }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const dialogRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onComplete(null); }
      if (event.key !== 'Tab') return;
      const controls = dialogRef.current?.querySelectorAll('button:not(:disabled), textarea');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onComplete]);

  const submit = (event) => {
    event.preventDefault();
    const text = value.trim();
    if ((required && !text) || (text && text.length < minLength)) {
      setError(minLength > 1 ? `Wpisz co najmniej ${minLength} znaków.` : 'Uzupełnij to pole.');
      return;
    }
    onComplete(text);
  };

  return createPortal(
    <div className={styles.overlay} onClick={(event) => { if (event.target === event.currentTarget) onComplete(null); }}>
      <form ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="reservation-action-title" aria-describedby="reservation-action-description" onSubmit={submit} noValidate>
        <header className={styles.header}>
          <FiCalendar className={styles.icon} aria-hidden="true" />
          <div><span>Showly / Twoja rezerwacja</span><h2 id="reservation-action-title">{title}</h2></div>
          <button type="button" className={styles.close} aria-label="Zamknij okno" onClick={() => onComplete(null)}><FiX /></button>
        </header>
        <div className={styles.body}>
          <p id="reservation-action-description">{description}</p>
          <label className={styles.field} htmlFor="reservation-action-text">{label}</label>
          <textarea ref={inputRef} id="reservation-action-text" value={value} onChange={(event) => { setValue(event.target.value); setError(''); }} maxLength={maxLength} aria-required={required} aria-invalid={!!error} aria-describedby={error ? 'reservation-action-error' : 'reservation-action-count'} placeholder={required ? 'Wpisz tutaj…' : 'Możesz zostawić to pole puste.'} />
          <div className={styles.counter} id="reservation-action-count">{value.length} / {maxLength}</div>
          {error && <p className={styles.error} id="reservation-action-error" role="alert">{error}</p>}
        </div>
        <footer className={styles.actions}>
          <button type="button" onClick={() => onComplete(null)}>Wróć</button>
          <button type="submit" className={danger ? styles.danger : styles.primary}>{confirmText}</button>
        </footer>
      </form>
    </div>, document.body
  );
};

export default ReservationActionDialog;
