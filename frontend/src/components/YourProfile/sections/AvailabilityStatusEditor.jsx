import { AVAILABILITY_OPTIONS, availabilityDay, normalizeAvailabilityStatus, getAvailabilityPresentation } from '../../../utils/profileAvailabilityStatus';
import AvailabilityBadge from '../../ui/AvailabilityBadge/AvailabilityBadge';
import styles from './AvailabilityStatusEditor.module.scss';

const AvailabilityStatusEditor = ({ data, isEditing, onChange, error }) => {
  const status = normalizeAvailabilityStatus(data?.availabilityStatus);
  const update = changes => onChange(prev => ({ ...prev, availabilityStatus: { ...normalizeAvailabilityStatus(prev.availabilityStatus), ...changes } }));
  const presentation = getAvailabilityPresentation(status);
  const expired = status.state !== 'hidden' && status.until && status.until < availabilityDay();
  return <div className={styles.editor}>
    <p className={styles.intro}>Daj znać, czy można się z Tobą umawiać. Status pojawi się przy Twoich danych na publicznym profilu. Nie zmienia ustawień kalendarza ani rezerwacji.</p>
    {isEditing ? <>
      <div className={styles.options} role="group" aria-label="Wybierz status dostępności">{AVAILABILITY_OPTIONS.map(([state, label]) => <button type="button" key={state} aria-pressed={status.state === state} onClick={() => update({ state })}>{label}</button>)}</div>
      {status.state !== 'hidden' && <div className={styles.fields}>
        {status.state === 'from-date' && <label>Wolne terminy od<input type="date" value={status.availableFrom} onChange={e => update({ availableFrom: e.target.value })} /></label>}
        <label>Pokazuj status do <small>opcjonalnie, do końca wybranego dnia</small><input type="date" value={status.until} onChange={e => update({ until: e.target.value })} /></label>
        <label className={styles.note}>Krótka wiadomość <small>{status.note.length}/120 znaków · opcjonalnie</small><input type="text" value={status.note} maxLength={120} placeholder="Np. Zapraszam do współpracy przy nowych projektach" onChange={e => update({ note: e.target.value })} /></label>
      </div>}
    </> : null}
    <div className={styles.preview}><span>{isEditing ? 'Tak zobaczą to odwiedzający' : 'Twój publiczny status'}</span>{presentation ? <AvailabilityBadge value={status} /> : <p>{expired ? 'Status wygasł i nie jest już wyświetlany.' : status.state === 'hidden' ? 'Status dostępności jest ukryty.' : 'Uzupełnij dane statusu, aby pokazać go na profilu.'}</p>}</div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {isEditing && status.state !== 'hidden' && <small className={styles.help}>Bez daty wygaśnięcia status pozostaje widoczny do Twojej kolejnej zmiany. Dostępność od wskazanej daty zmieni się wtedy na „Przyjmuję nowe zlecenia”.</small>}
  </div>;
};
export default AvailabilityStatusEditor;
