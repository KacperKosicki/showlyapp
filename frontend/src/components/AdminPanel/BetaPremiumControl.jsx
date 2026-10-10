import DataLoader from '../ui/DataLoader/DataLoader';
import { useEffect, useState } from 'react';
import { FiZap, FiCheck, FiPower } from 'react-icons/fi';
import { adminApi } from '../../api/adminApi';
import styles from './BetaPremiumControl.module.scss';

export default function BetaPremiumControl() {
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmOff, setConfirmOff] = useState(false);
  useEffect(() => {
    let active = true;
    adminApi.betaPremium().then(({ data }) => { if (active) setSettings(data); })
      .catch(() => { if (active) setError('Nie udało się pobrać ustawień. Odśwież panel.'); });
    return () => { active = false; };
  }, []);

  async function save(enabled) {
    setBusy(true); setError('');
    try {
      const { data } = await adminApi.setBetaPremium(enabled);
      setSettings(data); setConfirmOff(false);
      window.dispatchEvent(new Event('showly:beta-premium-changed'));
    } catch (err) {
      setError(err?.response?.data?.message || 'Zmiana nie została zapisana. Spróbuj ponownie.');
    } finally { setBusy(false); }
  }

  return <section className={`${styles.panel} ${settings?.enabled ? styles.active : ''}`} aria-labelledby="beta-premium-title">
    <div className={styles.icon} aria-hidden="true"><FiZap /></div>
    <div className={styles.content}>
      <span className={styles.eyebrow}>SHOWLY / TRYB TESTOWY</span>
      <h3 id="beta-premium-title">Premium dla wszystkich</h3>
      <p>Jednym przełącznikiem udostępnij najwyższy plan istniejącym i nowym profilom. Pełne limity, rezerwacje i widoczność na czas testów — bez karty i zakupów w Stripe.</p>
      <span className={styles.status} role={settings ? 'status' : undefined}>{settings ? (settings.enabled ? 'Włączone · bezpłatne Premium' : 'Wyłączone · standardowe plany') : error ? 'Ustawienia są chwilowo niedostępne.' : <DataLoader label="Ładujemy ustawienia testów…" compact />}</span>
      <p className={styles.note}>Wyłączenie przywraca dotychczasowe plany i terminy widoczności. Zapisane dane pozostają. Nikogo nie zapisze automatycznie na płatny plan. Ten tryb nie anuluje istniejących subskrypcji Stripe.</p>
      {confirmOff && <div className={styles.confirm}>
        <p>Kończysz bezpłatny dostęp Premium. Profile z wygasłym okresem widoczności przestaną być publiczne; funkcje i limity wrócą do zapisanych planów.</p>
        <button type="button" disabled={busy} onClick={() => save(false)}>Zakończ testowe Premium</button>
        <button type="button" disabled={busy} onClick={() => setConfirmOff(false)}>Wróć</button>
      </div>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </div>
    <button className={styles.toggle} type="button" disabled={!settings || busy} aria-pressed={settings?.enabled || false}
      onClick={() => settings.enabled ? setConfirmOff(true) : save(true)}>
      {settings?.enabled ? <FiCheck /> : <FiPower />}{busy ? 'Zapisywanie…' : settings?.enabled ? 'Wyłącz testowe Premium' : 'Włącz testowe Premium'}
    </button>
  </section>;
}
