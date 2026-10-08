import styles from './Announcements.module.scss';

export default function AnnouncementBackdrop({ word = 'POMYSŁY' }) {
  return <div className={styles.pageBackdrop} aria-hidden="true">
    <span className={styles.backdropWord}>{word}</span>
    <span className={styles.backdropDots} />
    <span className={styles.backdropOrbit} />
  </div>;
}
