import styles from './Announcements.module.scss';

export default function AnnouncementBackdrop({ word = 'POMYSŁY' }) {
  return <div className={styles.pageBackdrop} aria-hidden="true">
    <span className={styles.backdropWord}>{word}</span>
    <span className={styles.backdropShape} />
    <span className={styles.backdropSwoop} />
    <span className={styles.backdropAsterisk}>✳</span>
  </div>;
}
