import { cloneElement, isValidElement } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowUpRight, FiInbox } from 'react-icons/fi';
import styles from './WorkspaceEmptyState.module.scss';

const discover = { label: 'Poznaj profile Showly', to: '/profile', state: { scrollToId: 'profilesHub' } };

export default function WorkspaceEmptyState({ icon, title, text, action = discover, className = '' }) {
  const illustration = isValidElement(icon) ? cloneElement(icon, { className: undefined, 'aria-hidden': true }) : <FiInbox aria-hidden="true" />;
  return <div className={`${styles.empty} ${className}`}>
    <span className={styles.icon} aria-hidden="true">{illustration}</span>
    <h3>{title}</h3>
    <p>{text}</p>
    {action && (action.to ? <Link className={styles.action} to={action.to} state={action.state}>{action.label}<FiArrowUpRight aria-hidden="true" /></Link> : <button className={styles.action} type="button" onClick={action.onClick}>{action.label}<FiArrowUpRight aria-hidden="true" /></button>)}
  </div>;
}
