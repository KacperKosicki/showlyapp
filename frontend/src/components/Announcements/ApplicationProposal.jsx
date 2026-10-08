import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowUpRight, FiMapPin, FiStar, FiMessageSquare, FiCheck, FiX } from 'react-icons/fi';
import { applicationStatuses } from './announcementData';
import { profileImage } from './announcementVisuals';
import styles from './Announcements.module.scss';

export default function ApplicationProposal({ application, busy, onConversation, onStatus }) {
  const [failedAvatar, setFailedAvatar] = useState('');
  const profile = application.profileId;
  const avatar = profileImage(profile?.avatar);
  const banner = profileImage(profile?.banner);
  const accent = /^#([\da-f]{3}|[\da-f]{6})$/i.test(profile?.theme?.primary || '') ? profile.theme.primary : '#6557ef';
  const identity = <>
    <span className={styles.proposalAvatar}>{avatar && failedAvatar !== avatar ? <img src={avatar} alt="" loading="lazy" onError={() => setFailedAvatar(avatar)} /> : <span>{profile?.name?.slice(0, 1) || '?'}</span>}</span>
    <span className={styles.proposalIdentity}><small>{profile?.role || 'Usługodawca Showly'}</small><strong>{profile?.name || 'Profil niedostępny'}</strong><span>{profile?.location && <span><FiMapPin />{profile.location}</span>}{Number(profile?.reviews) > 0 && <span><FiStar />{Number(profile.rating || 0).toFixed(1)} · {profile.reviews} opinii</span>}</span></span>
    {profile?.slug && <FiArrowUpRight className={styles.proposalArrow} aria-hidden="true" />}
  </>;
  return <article className={styles.proposal} style={{ '--profile-accent': accent }}>
    <div className={styles.proposalCover}>
      {banner && <img className={styles.proposalBanner} src={banner} alt="" loading="lazy" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />}
      <span className={styles.proposalStatus}>{applicationStatuses[application.status]}</span>
      {profile?.slug ? <Link className={styles.proposalProfile} to={`/${profile.slug}`} aria-label={`Zobacz profil: ${profile.name}`}>{identity}</Link> : <div className={styles.proposalProfile}>{identity}</div>}
    </div>
    <div className={styles.proposalBody}>
      {profile?.tags?.length > 0 && <div className={styles.proposalTags}>{profile.tags.slice(0, 4).map((tag, index) => <span key={`${tag}-${index}`}>{tag}</span>)}</div>}
      <span className={styles.kicker}>Propozycja współpracy</span>
      <p className={styles.proposalMessage}>{application.message}</p>
      {application.proposedBudget != null && <div className={styles.proposalQuote}><span>Proponowana kwota</span><strong>{Number(application.proposedBudget).toLocaleString('pl-PL')} zł</strong></div>}
      <div className={`${styles.actions} ${styles.proposalActions}`}>
        <button className={styles.primary} disabled={busy} onClick={onConversation}><FiMessageSquare />Rozmowa</button>
        {application.status !== 'withdrawn' && <>
          <button disabled={busy || application.status === 'shortlisted'} onClick={() => onStatus('shortlisted')}><FiCheck />Do dalszej rozmowy</button>
          <button disabled={busy || application.status === 'declined'} onClick={() => onStatus('declined')}><FiX />Odrzuć</button>
        </>}
      </div>
    </div>
  </article>;
}
