import { Link } from 'react-router-dom';
import { FiArrowUpRight, FiCalendar, FiMapPin, FiCreditCard } from 'react-icons/fi';
import { budgetLabel, categoryName, dateLabel, workModes } from './announcementData';
import styles from './Announcements.module.scss';
import { categoryVisual } from './announcementVisuals';
import AnnouncementAuthor from './AnnouncementAuthor';

export default function AnnouncementCard({ item, example = false, duplicate = false, compact = false }) {
  const { Icon, color } = categoryVisual(item.category);
  return <article className={`${styles.card} ${styles.projectCard} ${compact ? styles.compactCard : ''}`} style={{ '--idea-color': color }}>
    <div className={styles.cardIllustration}><Icon aria-hidden="true" /><span className={styles.cardCoverCopy}><small>POMYSŁ SZUKA TALENTU</small><strong>{workModes[item.workMode] || 'Twój pomysł'}</strong></span><span className={styles.cardStamp} aria-hidden="true">ZRÓBMY<br />COŚ RAZEM<FiArrowUpRight /></span></div>
    <div className={styles.cardTop}><span className={styles.category}>{categoryName(item.category)}</span>{example && <span className={styles.smallLabel}>Przykład</span>}</div>
    <h3><Link tabIndex={duplicate ? -1 : undefined} to={example ? '/ogloszenia' : `/ogloszenia/${item._id}`} state={{ scrollToId: 'announcements' }}>{item.title || 'Twój pomysł. Dobry początek.'}</Link></h3>
    <p className={styles.cardDescription}>{item.description || 'Opisz, kogo szukasz i co chcesz wspólnie zrobić.'}</p>
    <dl className={styles.facts}>
      <div><dt><FiMapPin aria-hidden="true" /> Miejsce</dt><dd>{item.workMode === 'remote' ? 'Zdalnie' : item.location || workModes[item.workMode]}</dd></div>
      <div><dt><FiCalendar aria-hidden="true" /> Termin</dt><dd>{dateLabel(item) || 'Termin do ustalenia'}</dd></div>
      <div><dt><FiCreditCard aria-hidden="true" /> Budżet</dt><dd>{budgetLabel(item)}</dd></div>
    </dl>
    <div className={styles.cardFooter}>{example ? <span>Tak może wyglądać Twoje ogłoszenie</span> : <AnnouncementAuthor name={item.authorName} avatar={item.authorAvatar} />}<Link tabIndex={duplicate ? -1 : undefined} to={example ? '/ogloszenia' : `/ogloszenia/${item._id}`} state={{ scrollToId: 'announcements' }} aria-label={`Zobacz ogłoszenie: ${item.title}`}>Zobacz <FiArrowUpRight aria-hidden="true" /></Link></div>
  </article>;
}
