import styles from './PanelBackdrop.module.scss';

export default function PanelBackdrop({ word, compact = false }) {
  return <div className={`${styles.backdrop} ${compact ? styles.compact : ''}`} aria-hidden="true">
    {word && <span className={styles.word}>{word}</span>}
    <span className={styles.shape} />
    <span className={styles.swoop} />
  </div>;
}
