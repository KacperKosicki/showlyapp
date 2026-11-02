import { useCallback, useEffect, useState } from 'react';
import { FiBell, FiSmartphone, FiCheckCircle } from 'react-icons/fi';
import { api } from '../../api/api';
import AlertBox from '../AlertBox/AlertBox';
import ActionButton from './ActionButton';
import { enablePushNotifications, disablePushNotifications, getPushDeviceState } from '../../services/pushNotifications';
import styles from './NotificationSettings.module.scss';
import accountStyles from './AccountSettings.module.scss';

const categories = [
  ['reservationRequests', 'Nowe rezerwacje', 'Nowe zapytania i rezerwacje przesłane do Twojej oferty.'],
  ['reservationUpdates', 'Zmiany rezerwacji', 'Potwierdzenia, odrzucenia, anulowania, wygaśnięcia i dodatkowe informacje.'],
  ['messages', 'Wiadomości', 'Nowe rozmowy i wiadomości od innych osób.'],
  ['announcements', 'Ogłoszenia i zgłoszenia', 'Nowe zgłoszenia i zmiany dotyczące Twoich ogłoszeń.'],
];
const descriptions = {
  loading: 'Sprawdzamy dostępność powiadomień na tym urządzeniu…',
  granted: 'Przeglądarka zezwala na powiadomienia. Włączenie poniżej łączy to urządzenie z Twoim kontem.',
  default: 'Możesz włączyć powiadomienia. Przeglądarka poprosi Cię o zgodę.',
  denied: 'Powiadomienia są zablokowane. Zmień uprawnienia Showly w ustawieniach przeglądarki lub urządzenia, a potem sprawdź ponownie.',
  'ios-install': 'Na iPhonie i iPadzie (iOS/iPadOS 16.4 lub nowszy) dodaj Showly do ekranu głównego: Udostępnij → Dodaj do ekranu początkowego. Otwórz Showly z tej ikony i wróć tutaj, aby włączyć powiadomienia.',
  unsupported: 'Ta przeglądarka nie udostępnia obsługiwanych powiadomień push. Spróbuj w aktualnej przeglądarce na swoim urządzeniu.',
  insecure: 'Powiadomienia wymagają bezpiecznego połączenia. Otwórz Showly przez https://showly.me.',
  error: 'Nie udało się sprawdzić stanu urządzenia. Sprawdź połączenie i spróbuj ponownie.',
};

export default function NotificationSettings({ user }) {
  const [device, setDevice] = useState({ state: 'loading', enabled: false });
  const [preferences, setPreferences] = useState(null);
  const [busy, setBusy] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [preferencesError, setPreferencesError] = useState(false);
  const refreshDevice = useCallback(async () => {
    try { setDevice(await getPushDeviceState()); }
    catch { setDevice({ state: 'error', enabled: false }); }
  }, []);
  const loadPreferences = useCallback(async () => {
    try { const { data } = await api.get('/api/users/notification-preferences'); setPreferences(data); setPreferencesError(false); }
    catch { setPreferencesError(true); }
  }, []);
  useEffect(() => {
    if (!user?.uid) return undefined;
    refreshDevice(); loadPreferences();
    window.addEventListener('focus', refreshDevice);
    return () => window.removeEventListener('focus', refreshDevice);
  }, [user?.uid, refreshDevice, loadPreferences]);

  const toggleDevice = async () => {
    setBusy('device');
    setFeedback(null);
    try {
      const result = device.enabled ? await disablePushNotifications(user.uid) : await enablePushNotifications(user.uid);
      setFeedback({
        type: result.success ? 'success' : 'error',
        message: result.success ? (device.enabled ? 'Wyłączono powiadomienia na tym urządzeniu.' : 'Włączono powiadomienia na tym urządzeniu.') : 'Nie udało się zmienić ustawienia. Sprawdź uprawnienia urządzenia i połączenie.',
      });
      await refreshDevice();
    } catch {
      setFeedback({ type: 'error', message: 'Nie udało się zmienić ustawienia. Spróbuj ponownie.' });
    } finally {
      setBusy('');
    }
  };

  const checkDevice = async () => {
    setBusy('check');
    try { await refreshDevice(); }
    finally { setBusy(''); }
  };

  const retryPreferences = async () => {
    setBusy('preferences');
    try { await loadPreferences(); }
    finally { setBusy(''); }
  };
  const toggleCategory = async (key, enabled) => {
    setBusy(key); setFeedback(null);
    try { const { data } = await api.patch('/api/users/notification-preferences', { [key]: enabled }); setPreferences(data); setFeedback({ type: 'success', message: 'Zapisano rodzaje powiadomień push dla Twojego konta.' }); }
    catch { setFeedback({ type: 'error', message: 'Nie udało się zapisać zmiany. Spróbuj ponownie.' }); }
    finally { setBusy(''); }
  };

  return <fieldset className={`${accountStyles.setting} ${styles.panel}`} id="notification-settings" aria-labelledby="notification-settings-title">
    <legend>04 / Powiadomienia</legend>
    <header className={accountStyles.settingHeader}><div className={accountStyles.settingTitle}><span className={accountStyles.settingIcon}><FiBell aria-hidden="true" /></span><div><h2 id="notification-settings-title">Powiadomienia</h2></div></div></header>
    <p className={styles.intro}>Nowe informacje w Showly i alerty na Twoim urządzeniu.</p>
    <div className={styles.inApp}><FiCheckCircle aria-hidden="true" /><p><strong>Zmiany w Showly są zawsze widoczne.</strong><br />Nowe rezerwacje i aktualizacje pojawiają się przy pozycji „Rezerwacje” w menu konta. Oznaczysz je jako przeczytane na liście rezerwacji. Ustawienia poniżej dotyczą dodatkowych powiadomień push.</p></div>
    <div className={styles.device}><div><h3><FiSmartphone aria-hidden="true" />To urządzenie</h3><strong>{device.state === 'loading' ? 'Sprawdzamy stan urządzenia' : device.state === 'error' ? 'Stan urządzenia nieznany' : device.enabled ? 'Powiadomienia włączone' : 'Powiadomienia niewłączone'}</strong><p>{descriptions[device.state]}</p><small>Android i komputer: dostępność zależy od przeglądarki oraz jej uprawnień. Alerty mogą być wyciszone przez ustawienia systemu lub tryb skupienia.</small></div><div className={styles.actions}>
      <ActionButton icon={<FiBell aria-hidden="true" />} isLoading={busy === 'device'} disabled={!!busy || !user?.uid || !['default', 'granted'].includes(device.state)} onClick={toggleDevice}>
        {device.enabled ? 'Wyłącz na tym urządzeniu' : 'Włącz powiadomienia'}
      </ActionButton>
      <ActionButton className={styles.secondary} isLoading={busy === 'check'} disabled={!!busy} onClick={checkDevice}>
        Sprawdź ponownie
      </ActionButton>
    </div></div>
    <fieldset disabled={!!busy || !preferences}><legend>Jakie powiadomienia push chcesz otrzymywać?</legend><p className={styles.hint}>Wybór zapisuje się dla konta i obowiązuje na wszystkich włączonych urządzeniach.</p>{categories.map(([key, title, description]) => <label className={styles.choice} key={key}><span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" checked={preferences?.[key] !== false} onChange={event => toggleCategory(key, event.target.checked)} /><span className={styles.switch} aria-hidden="true" /></label>)}</fieldset>
    {preferencesError && <p role="alert">Nie udało się pobrać ustawień. <ActionButton className={styles.retry} isLoading={busy === 'preferences'} disabled={!!busy} onClick={retryPreferences}>Spróbuj ponownie</ActionButton></p>}
    {feedback && <AlertBox type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}
  </fieldset>;
}
