import { useState } from 'react';
import { FiUser } from 'react-icons/fi';
import styles from './Announcements.module.scss';

export default function AnnouncementAuthor({ name = 'Użytkownik Showly', avatar = '' }) {
  const [failed, setFailed] = useState('');
  const source = avatar.startsWith('/uploads/') || avatar.startsWith('uploads/')
    ? `${process.env.REACT_APP_API_URL || ''}/${avatar.replace(/^\//, '')}` : avatar;
  return <span className={styles.cardAuthor}>
    <span className={styles.authorAvatar} aria-hidden="true">
      {source && failed !== source ? <img src={source} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(source)} /> : <FiUser />}
    </span>
    <span className={styles.authorCopy}><small>Wystawia</small><strong>{name || 'Użytkownik Showly'}</strong></span>
  </span>;
}
