import DataLoader from '../ui/DataLoader/DataLoader';
import styles from './AppLoader.module.scss';
export default function AppLoader({ label = "Ładujemy Showly…", detail = "Twoje miejsce na pomysły, ludzi i możliwości." }) {
  return <div className={styles.loaderPage} aria-label="Ładowanie aplikacji"><div className={styles.content}><DataLoader label={label} detail={detail} layout="none" /></div></div>;
}
