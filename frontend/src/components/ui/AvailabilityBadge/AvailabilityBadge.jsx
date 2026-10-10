import { useEffect, useState } from 'react';
import { FiCalendar, FiCheckCircle, FiClock, FiPauseCircle } from 'react-icons/fi';
import { getAvailabilityPresentation } from '../../../utils/profileAvailabilityStatus';
import styles from './AvailabilityBadge.module.scss';

const ICONS = { open: FiCheckCircle, limited: FiClock, 'from-date': FiCalendar, unavailable: FiPauseCircle };
const AvailabilityBadge = ({ value, compact = false }) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const status = getAvailabilityPresentation(value, now);
  if (!status) return null;
  const Icon = ICONS[status.state];
  return <div className={`${styles.status} ${compact ? styles.compact : ''}`} data-availability={status.state} aria-label="Dostępność podana przez autora profilu">
    <span className={styles.label}><Icon aria-hidden="true" /><span>{status.label}</span></span>
    {status.note && <span className={styles.note}>{status.note}</span>}
  </div>;
};
export default AvailabilityBadge;
