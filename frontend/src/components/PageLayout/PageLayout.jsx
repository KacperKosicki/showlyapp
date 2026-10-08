import { useLocation } from 'react-router-dom';
import styles from './PageLayout.module.scss';

export default function PageLayout({ children }) {
  const { pathname } = useLocation();
  return <main className={pathname === '/' ? styles.home : styles.page}>{children}</main>;
}
