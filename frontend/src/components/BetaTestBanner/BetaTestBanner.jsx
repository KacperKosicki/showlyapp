import { useEffect, useLayoutEffect, useState } from 'react';
import { FiX, FiZap } from 'react-icons/fi';
import styles from './BetaTestBanner.module.scss';
import { updateBrowserTheme } from '../../utils/browserTheme';

const DISMISS_KEY = 'showly:beta-banner-dismissed';
const message = 'Trwają testy Showly — załóż konto lub zaloguj się i stwórz profil z najwyższym planem Premium za darmo. Wszystkie funkcje na czas testów, bez karty i bez opłat.';
const readDismissal = () => {
  try { return sessionStorage.getItem(DISMISS_KEY); } catch { return null; }
};

export default function BetaTestBanner() {
  const [campaign, setCampaign] = useState(null);
  const [dismissed, setDismissed] = useState(readDismissal);

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
    document.documentElement.setAttribute('data-beta-banner-visible', String(visible));
    updateBrowserTheme(document.documentElement.style.getPropertyValue('--browser-nav-color') || '#fffdf7');
    return () => {
      document.documentElement.style.removeProperty('--beta-banner-height');
      document.documentElement.removeAttribute('data-beta-banner-visible');
      updateBrowserTheme(document.documentElement.style.getPropertyValue('--browser-nav-color') || '#fffdf7');
    };
  }, [visible]);

  const dismiss = () => {
    setDismissed(campaign);
    try { sessionStorage.setItem(DISMISS_KEY, campaign); } catch { /* Closing still works without storage. */ }
  };

  if (!visible) return null;
  return <aside className={styles.banner} aria-label="Bezpłatne testy Showly">
    <span className={styles.badge}><FiZap aria-hidden="true" /><span>BETA</span><b>0 ZŁ</b></span>
    <p className={styles.accessible}>{message}</p>
    <div className={styles.viewport} aria-hidden="true"><div className={styles.track}>
      {[0, 1].map(copy => <span className={styles.copy} key={copy}>
        {message}<span className={styles.dot} />
      </span>)}
    </div></div>
    <button className={styles.control} type="button" onClick={dismiss} aria-label="Zamknij informację o testach"><FiX /></button>
  </aside>;
}
