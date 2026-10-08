import { Link } from 'react-router-dom';
import { FiArrowUpRight, FiCalendar, FiMapPin, FiCreditCard } from 'react-icons/fi';
import { budgetLabel, categoryName, dateLabel, workModes } from './announcementData';
import styles from './Announcements.module.scss';
import { categoryVisual } from './announcementVisuals';

export default function AnnouncementCard({ item, example = false, duplicate = false, compact = false }) {
  const { Icon, color } = categoryVisual(item.category);
  return <article className={`${styles.card} ${compact ? styles.compactCard : ''}`} style={{ '--idea-color': color }}>
    <div className={styles.cardIllustration}><Icon aria-hidden="true" /><span>{workModes[item.workMode] || 'Twój pomysł'}</span><span className={styles.cardStamp} aria-hidden="true">SZUKAM<br />TALENTU</span></div>
    <div className={styles.cardTop}><span className={styles.category}>{categoryName(item.category)}</span>{example && <span className={styles.smallLabel}>Przykład</span>}</div>
    <h3><Link tabIndex={duplicate ? -1 : undefined} to={example ? '/ogloszenia' : `/ogloszenia/${item._id}`} state={{ scrollToId: 'announcements' }}>{item.title || 'Twój pomysł. Dobry początek.'}</Link></h3>
    <p className={styles.cardDescription}>{item.description || 'Opisz, kogo szukasz i co chcesz wspólnie zrobić.'}</p>
    <dl className={styles.facts}>
      <div><dt><FiMapPin aria-hidden="true" /> Miejsce</dt><dd>{item.workMode === 'remote' ? 'Zdalnie' : item.location || workModes[item.workMode]}</dd></div>
      <div><dt><FiCalendar aria-hidden="true" /> Termin</dt><dd>{dateLabel(item) || 'Termin do ustalenia'}</dd></div>
      <div><dt><FiCreditCard aria-hidden="true" /> Budżet</dt><dd>{budgetLabel(item)}</dd></div>
    </dl>
    <div className={styles.cardFooter}><span>{example ? 'Tak może wyglądać Twoje ogłoszenie' : `Wystawia: ${item.authorName || 'Użytkownik Showly'}`}</span><Link tabIndex={duplicate ? -1 : undefined} to={example ? '/ogloszenia' : `/ogloszenia/${item._id}`} state={{ scrollToId: 'announcements' }} aria-label={`Zobacz ogłoszenie: ${item.title}`}>Zobacz <FiArrowUpRight aria-hidden="true" /></Link></div>
  </article>;
}
