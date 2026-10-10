import styles from './DataLoader.module.scss';

// One visual language for page, section and small embedded loading states.
export default function DataLoader({ label = 'Ładujemy dane…', detail = 'Przygotowujemy Twój widok.', layout = 'cards', compact = false, hideLabelOnMobile = false, className = '', children }) {
  const Root = compact ? 'span' : 'div';
  return <Root className={[styles.loader, compact ? styles.compact : '', hideLabelOnMobile ? styles.collapse : '', className].filter(Boolean).join(' ')} role="status" aria-live="polite" aria-atomic="true" aria-busy="true" data-layout={layout}>
    <span className={styles.status}>
      <span className={styles.mark} aria-hidden="true"><img src="/images/other/logo-showly.png" alt="" width="32" height="32" /></span>
      <span className={styles.copy}><strong>{label}</strong>{!compact && <span>{detail}</span>}</span>
      <span className={styles.progress} aria-hidden="true"><span /></span>
    </span>
    {!compact && (children ? <div className={styles.placeholders} aria-hidden="true">{children}</div> : layout !== 'none' && <div className={styles.placeholders} aria-hidden="true" data-skeleton={layout}>
      {layout === 'profile' ? <><div className={styles.hero}><i className={styles.avatar} /><i /><i /></div><div className={styles.fields}>{[0, 1, 2].map(i => <div className={styles.field} key={i}><i /><i /></div>)}</div></>
        : layout === 'calendar' ? Array.from({ length: 35 }, (_, i) => <div className={styles.day} key={i} />)
        : layout === 'form' ? [0, 1, 2].map(i => <div className={styles.field} key={i}><i /><i /></div>)
        : layout === 'list' ? [0, 1, 2].map(i => <div className={styles.row} key={i}><i className={styles.avatar} /><span><i /><i /></span></div>)
        : [0, 1, 2].map(i => <div className={styles.card} key={i}><div className={styles.photo} /><span><i /><i /><i /></span></div>)}
    </div>)}
  </Root>;
}
