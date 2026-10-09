import { useEffect, useLayoutEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowUpRight, FiPause, FiPlay, FiX, FiZap } from 'react-icons/fi';
import styles from './BetaTestBanner.module.scss';

const DISMISS_KEY = 'showly:beta-banner-dismissed';
const message = 'Trwają testy Showly! Zaloguj się lub załóż konto i stwórz profil z najwyższym planem Premium za darmo. Bez karty, bez opłat — przez cały czas testów.';
const readDismissal = () => {
  try { return sessionStorage.getItem(DISMISS_KEY); } catch { return null; }
};

export default function BetaTestBanner({ user }) {
  const [campaign, setCampaign] = useState(null);
  const [dismissed, setDismissed] = useState(readDismissal);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let active = true;
    let request;
    async function refresh() {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/platform/status`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Status unavailable');
        const data = await response.json();
        if (active && !controller.signal.aborted) setCampaign(data.betaPremiumEnabled === true ? String(data.betaCampaignId || 'current') : null);
      } catch (error) {
        if (active && !controller.signal.aborted) setCampaign(null);
      }
    }
    const refreshVisible = () => { if (document.visibilityState !== 'hidden') refresh(); };
    refresh();
    const interval = setInterval(refreshVisible, 60000);
    window.addEventListener('focus', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
    window.addEventListener('showly:beta-premium-changed', refresh);
    return () => {
      active = false; request?.abort(); clearInterval(interval);
      window.removeEventListener('focus', refreshVisible);
      document.removeEventListener('visibilitychange', refreshVisible);
      window.removeEventListener('showly:beta-premium-changed', refresh);
    };
  }, []);

  const visible = campaign !== null && dismissed !== campaign;
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--beta-banner-height', visible ? '40px' : '0px');
    return () => document.documentElement.style.removeProperty('--beta-banner-height');
  }, [visible]);

  const dismiss = () => {
    setDismissed(campaign);
    try { sessionStorage.setItem(DISMISS_KEY, campaign); } catch { /* Closing still works without storage. */ }
  };

  if (!visible) return null;
  return <aside className={`${styles.banner} ${paused ? styles.paused : ''}`} aria-label="Bezpłatne testy Showly">
    <span className={styles.badge}><FiZap aria-hidden="true" /><span>BETA</span><b>0 ZŁ</b></span>
    <p className={styles.accessible}>{message}</p>
    <div className={styles.viewport} aria-hidden="true"><div className={styles.track}>
      {[0, 1].map(copy => <span className={styles.copy} key={copy}>
        <strong>Trwają testy Showly!</strong><span className={styles.dot} />
        Zaloguj się lub załóż konto i stwórz profil z najwyższym planem Premium za darmo.
        <span className={styles.dot} /><strong>Bez karty. Bez opłat. Tylko na czas trwania testów.</strong><span className={styles.dot} />
      </span>)}
    </div></div>
    <Link className={styles.join} to={user ? '/profil' : '/register'}>{user ? 'Sprawdź Premium' : 'Dołącz za darmo'}<FiArrowUpRight aria-hidden="true" /></Link>
    <button className={`${styles.control} ${styles.pause}`} type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Wznów przesuwanie komunikatu' : 'Wstrzymaj przesuwanie komunikatu'} aria-pressed={paused}>
      {paused ? <FiPlay /> : <FiPause />}
    </button>
    <button className={styles.control} type="button" onClick={dismiss} aria-label="Zamknij informację o testach"><FiX /></button>
  </aside>;
}
