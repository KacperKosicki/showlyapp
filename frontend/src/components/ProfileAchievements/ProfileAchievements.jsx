import { useId } from 'react';
import { FiActivity, FiAward, FiCalendar, FiClock, FiHeart, FiShield, FiCamera, FiCheck, FiLayers, FiLock, FiMessageCircle, FiStar } from 'react-icons/fi';
import styles from './ProfileAchievements.module.scss';

const icons = {
  'first-profile': FiStar,
  'first-service': FiLayers,
  portfolio: FiCamera,
  'first-booking': FiCalendar,
  reviews: FiMessageCircle,
  'ten-bookings': FiAward,
  'profile-90-days': FiClock,
  'regular-bookings': FiActivity,
  'profile-365-days': FiShield,
  'ten-reviews': FiHeart,
};

const frames = {
  common: 'M70 18 109 36v36c0 21-16 38-39 48-23-10-39-27-39-48V36Z',
  rare: 'M70 14 85 26 104 25 108 43 125 55 118 73 122 91 103 98 94 115 76 110 70 124 64 110 46 115 37 98 18 91 22 73 15 55 32 43 36 25 55 26Z',
  exclusive: 'M70 11 84 24 105 19 108 39 129 43 120 63 135 79 115 90 114 111 93 109 82 128 70 119 58 128 47 109 26 111 25 90 5 79 20 63 11 43 32 39 35 19 56 24Z',
};

const laurel = 'M34 101C21 88 17 73 21 56m3 28C13 82 8 75 9 67c9 2 14 8 15 17Zm5 9C16 93 11 89 8 82c10-1 17 3 21 11Zm7 9c-11 2-19-1-24-7 10-3 18-1 24 7ZM21 74c-8-4-11-11-8-18 7 4 10 11 8 18Z';
const spark = 'M0-6 1.5-1.5 6 0 1.5 1.5 0 6-1.5 1.5-6 0-1.5-1.5Z';

function Crest({ tier }) {
  const id = useId();
  const frame = frames[tier] || frames.common;
  const exclusive = tier === 'exclusive';
  const ornate = tier !== 'common';

  return (
    <svg className={styles.crest} viewBox="0 0 140 140" focusable="false">
      <defs>
        <linearGradient id={id + '-metal'} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0" className={styles.metalShade} />
          <stop offset=".28" className={styles.metalLight} />
          <stop offset=".51" className={styles.metalMid} />
          <stop offset=".72" className={styles.metalShade} />
          <stop offset="1" className={styles.metalLight} />
        </linearGradient>
        <radialGradient id={id + '-enamel'} cx="35%" cy="25%" r="80%">
          <stop offset="0" className={styles.enamelLight} />
          <stop offset=".72" className={styles.enamelBase} />
          <stop offset="1" className={styles.enamelShade} />
        </radialGradient>
      </defs>
      <g fill={`url(#${id}-metal)`}>
        <path className={styles.ribbon} d="M46 96 34 129 52 123 61 135 70 105 79 135 88 123 106 129 94 96Z" />
        <path className={styles.rim} d={frame} />
        <path className={styles.innerRim} d={frame} transform="translate(70 70) scale(.89) translate(-70 -70)" />
        {ornate && <path className={styles.laurel} d={laurel} />}
        {ornate && <path className={styles.laurel} d={laurel} transform="translate(140 0) scale(-1 1)" />}
        <circle cx="70" cy="68" r="35" />
        <circle className={styles.engraving} cx="70" cy="68" r="32" />
        <circle className={styles.enamel} cx="70" cy="68" r="28" fill={`url(#${id}-enamel)`} />
        <path className={styles.glint} d="M48 61c3-11 14-17 24-16" />
        <path d="M70 103l5 5-5 5-5-5Z" />
        {exclusive && <g className={styles.jewel}>
          <path d="m58 23 7-8h10l7 8-12 14Z" />
          <path d="m58 23 12 14 5-22-5 8Z" />
          <path d="m70 23 5-8 7 8-12 14Z" />
        </g>}
        {exclusive && <g className={styles.sparkles}>
          <path d={spark} transform="translate(18 26)" />
          <path d={spark} transform="translate(121 30) scale(.8)" />
          <path d={spark} transform="translate(118 110) scale(.55)" />
        </g>}
      </g>
    </svg>
  );
}
const tiers = { common: 'Podstawowa', rare: 'Rzadka', exclusive: 'Ekskluzywna' };

function AchievementMedal({ badge, locked, featured }) {
  const Icon = icons[badge.id] || FiAward;
  return (
    <span className={styles.medal} aria-hidden="true">
      <Crest tier={badge.tier} />
      <Icon className={styles.glyph} />
      {locked && <FiLock className={styles.marker} />}
      {featured && <FiCheck className={styles.marker} />}
    </span>
  );
}

export function AchievementBadge({ badge, locked = false, featured = false, children }) {
  return (
    <li className={styles.badge} data-tier={badge.tier} data-locked={locked} data-featured={featured}>
      <AchievementMedal badge={badge} locked={locked} featured={featured} />
      <div className={styles.copy}>
        <span className={styles.tier}>{tiers[badge.tier]}{locked ? ' · Do zdobycia' : ''}</span>
        <strong>{badge.title}</strong>
        <p>{badge.description}</p>
      </div>
      {children}
    </li>
  );
}

export function PublicAchievementList({ badges, decorations, motion }) {
  return (
    <ul className={`${styles.grid} ${styles.publicShowcase}`} data-decorations={decorations} data-motion={motion}>
      {badges.map(badge => <AchievementBadge key={badge.id} badge={badge} />)}
    </ul>
  );
}

export function ProfileAchievementHighlights({ badges, decorations }) {
  if (!badges?.length) return null;

  return (
    <a href="#achievements" className={styles.highlights} data-decorations={decorations} aria-label={`Odznaki Showly: ${badges.map(badge => badge.title).join(", ")}`}>
      <ul className={styles.highlightList}>
        {badges.map(badge => (
          <li className={styles.highlight} data-tier={badge.tier} key={badge.id} title={badge.title}>
            <AchievementMedal badge={badge} />
          </li>
        ))}
      </ul>
    </a>
  );
}
