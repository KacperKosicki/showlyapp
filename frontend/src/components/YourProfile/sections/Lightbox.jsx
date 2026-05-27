import { createPortal } from 'react-dom';
import styles from '../YourProfile.module.scss';

const Lightbox = ({ image, onClose }) => {
  if (!image) return null;

  return createPortal(
    <div
      className={styles.lightbox}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className={styles.lightboxClose}
        onClick={onClose}
        aria-label="Zamknij podgląd"
      >
        ✕
      </button>

      <img
        src={image}
        alt=""
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
};

export default Lightbox;
