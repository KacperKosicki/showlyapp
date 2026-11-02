import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiArrowLeft, FiArrowRight, FiCheck, FiCompass, FiX } from 'react-icons/fi';
import styles from '../YourProfile.module.scss';

const steps = [
  ['basicInfoSection', 'Dane podstawowe', 'Ustaw rolę, lokalizację i zdjęcie profilowe. U góry strony wybierz „Edytuj profil”, aby wprowadzić zmiany.'],
  ['descriptionSection', 'Opis', 'Napisz, czym się zajmujesz i komu możesz pomóc. Ten tekst pojawi się na publicznej wizytówce.'],
  ['appearanceSection', 'Wygląd', 'Wybierz motyw i zdecyduj, które elementy mają się wyświetlać. Efekt sprawdzisz w podglądzie na żywo.'],
  ['offerSection', 'Oferta i rezerwacje', 'Dodaj usługi, ceny i czas trwania. Jeśli Twój plan obsługuje rezerwacje, tutaj ustawisz też dostępność.'],
  ['mediaSection', 'Realizacje', 'Dodaj zdjęcia, projekty i linki, żeby pokazać klientom przykłady swojej pracy.'],
  ['contactSection', 'Kontakt', 'Uzupełnij dane kontaktowe. W następnej sekcji możesz dodać informacje uzupełniające, np. odpowiedzi na częste pytania.'],
  ['billingSection', 'Plan i widoczność', 'Sprawdź swój plan i dostępne funkcje. Po edycji użyj „Zapisz zmiany profilu” na pasku u góry.'],
];

const ProfileTour = ({ userId }) => {
  const storageKey = 'showly:profile-tour:v1:' + userId;
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return window.localStorage.getItem(storageKey) !== 'done';
    } catch {
      return true;
    }
  });
  const [step, setStep] = useState(null);
  const headingRef = useRef(null);
  const restartRef = useRef(null);
  const restoreFocus = useRef(false);
  const current = steps[step];

  useEffect(() => {
    if (!current) {
      if (restoreFocus.current) {
        restartRef.current?.focus();
        restoreFocus.current = false;
      }
      return;
    }

    headingRef.current?.focus({ preventScroll: true });
    const section = document.getElementById(current[0]);
    section?.scrollIntoView?.({ block: 'start' });
    section?.classList.add(styles.tourTarget);
    return () => section?.classList.remove(styles.tourTarget);
  }, [current]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(storageKey, 'done');
    } catch {
      // The guide can still be dismissed when browser storage is unavailable.
    }
    restoreFocus.current = true;
    setShowIntro(false);
    setStep(null);
  };

  if (!showIntro && !current) {
    return <button ref={restartRef} type="button" className={styles.tourRestart} onClick={() => setStep(0)}><FiCompass aria-hidden="true" /> Pokaż samouczek</button>;
  }

  if (!current) {
    return (
      <aside className={styles.tourIntro} aria-label="Samouczek wizytówki">
        <div>
          <h2>Pierwszy raz w ustawieniach?</h2>
          <p>W kilku krokach zobaczysz, gdzie zmienić dane, wygląd i ofertę wizytówki.</p>
        </div>
        <div className={styles.tourActions}>
          <button type="button" onClick={dismiss}><FiX aria-hidden="true" /> Pomiń</button>
          <button type="button" data-primary onClick={() => setStep(0)}><FiCompass aria-hidden="true" /> Rozpocznij samouczek</button>
        </div>
      </aside>
    );
  }

  const last = step === steps.length - 1;
  return createPortal(
    <aside className={styles.tourPanel} aria-label="Samouczek wizytówki" onKeyDown={event => {
      if (event.key === 'Escape') dismiss();
    }}>
      <p className={styles.tourCount}>Samouczek · {step + 1} z {steps.length}</p>
      <h2 ref={headingRef} tabIndex={-1} aria-describedby="profile-tour-description">{current[1]}</h2>
      <p id="profile-tour-description">{current[2]}</p>
      <div className={styles.tourActions}>
        <button type="button" onClick={dismiss}><FiX aria-hidden="true" /> Zamknij</button>
        {step > 0 && <button type="button" onClick={() => setStep(step - 1)}><FiArrowLeft aria-hidden="true" /> Wstecz</button>}
        <button type="button" data-primary onClick={last ? dismiss : () => setStep(step + 1)}>
          {last ? <>Zakończ <FiCheck aria-hidden="true" /></> : <>Dalej <FiArrowRight aria-hidden="true" /></>}
        </button>
      </div>
    </aside>,
    document.body
  );
};

export default ProfileTour;
