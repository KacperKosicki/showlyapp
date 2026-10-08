import { useRef, useState } from 'react';
import { FiSave, FiSend } from 'react-icons/fi';
import AnnouncementCard from './AnnouncementCard';
import { categories, emptyAnnouncement, scopes, workModes } from './announcementData';
import styles from './Announcements.module.scss';

export default function AnnouncementForm({ initial, activeId, busy, onSave, onCancel }) {
  const [data, setData] = useState(() => ({ ...emptyAnnouncement, ...initial, budgetMin: initial?.budgetMin ?? '', budgetMax: initial?.budgetMax ?? '' }));
  const [replace, setReplace] = useState(false);
  const intent = useRef('draft');
  const change = event => setData(value => ({ ...value, [event.target.name]: event.target.value }));
  const field = (name, label, props = {}) => <label className={styles.field}><span>{label}</span><input name={name} value={data[name]} onChange={change} {...props} /></label>;
  const select = (name, label, options) => <label className={styles.field}><span>{label}</span><select name={name} value={data[name]} onChange={change}>{options.map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></label>;
  return <div className={styles.formLayout}>
    <form className={styles.form} onSubmit={event => { event.preventDefault(); onSave(data, event.nativeEvent.submitter?.value || intent.current, replace); intent.current = 'draft'; }}>
      <fieldset className={styles.group}><legend>01 / Twój pomysł</legend>
        {field('title', 'Kogo lub czego szukasz?', { required: true, minLength: 5, maxLength: 100, placeholder: 'Np. Szukam DJ-a na wesele / Strona dla pracowni' })}
        <div className={styles.twoColumns}>{select('category', 'Kategoria', categories)}{select('scope', 'Rodzaj współpracy', Object.entries(scopes))}</div>
        <label className={styles.field}><span>Opisz swoje potrzeby</span><textarea aria-label="Opisz swoje potrzeby" name="description" rows={7} required minLength={30} maxLength={4000} value={data.description} onChange={change} placeholder="Co chcesz zrobić? Jaki zakres, styl i rezultat są dla Ciebie ważne?" /><small>{data.description.length} / 4000 · minimum 30 znaków. Nie wpisuj prywatnych danych kontaktowych — rozmowy prowadź przez Showly.</small></label>
      </fieldset>
      <fieldset className={styles.group}><legend>02 / Gdzie i kiedy</legend>
        <div className={styles.twoColumns}>{select('workMode', 'Miejsce współpracy', Object.entries(workModes))}{field('location', 'Miejscowość', { required: data.workMode !== 'remote', minLength: data.workMode !== 'remote' ? 2 : 0, maxLength: 100, placeholder: data.workMode === 'remote' ? 'Opcjonalnie przy pracy zdalnej' : 'Np. Poznań i okolice' })}</div>
        {select('dateMode', 'Jak określisz termin?', [['flexible', 'Do ustalenia'], ['exact', 'Konkretny dzień'], ['range', 'Przedział dat']])}
        {data.dateMode !== 'flexible' && <div className={styles.twoColumns}>{field('dateFrom', data.dateMode === 'exact' ? 'Data' : 'Od', { type: 'date', required: true })}{data.dateMode === 'range' && field('dateTo', 'Do', { type: 'date', required: true, min: data.dateFrom })}</div>}
      </fieldset>
      <fieldset className={styles.group}><legend>03 / Budżet i publikacja</legend>
        {select('budgetMode', 'Budżet w złotych', [['negotiable', 'Do ustalenia'], ['fixed', 'Konkretna kwota'], ['range', 'Przedział kwot']])}
        {data.budgetMode !== 'negotiable' && <div className={styles.twoColumns}>{field('budgetMin', data.budgetMode === 'fixed' ? 'Kwota (zł)' : 'Od (zł)', { type: 'number', min: 0, max: 10000000, step: '.01', required: true })}{data.budgetMode === 'range' && field('budgetMax', 'Do (zł)', { type: 'number', min: data.budgetMin || 0, max: 10000000, step: '.01', required: true })}</div>}
        <p className={styles.muted}>Jedno konto może mieć jedno widoczne ogłoszenie. Publikacja trwa 30 dni. Po tym czasie wpis trafia do archiwum w Twoim panelu i możesz opublikować go ponownie.</p>
        {!initial && activeId && <label className={styles.check}><input type="checkbox" checked={replace} onChange={event => setReplace(event.target.checked)} /><span>Zastąp moje obecne aktywne ogłoszenie tym wpisem. Poprzednie zostanie ukryte, a jego zgłoszenia pozostaną w panelu.</span></label>}
      </fieldset>
      <div className={styles.actions}>
        <button type="button" disabled={busy} onClick={onCancel}>Anuluj</button>
        <button type="submit" disabled={busy} name="intent" value="draft" onClick={() => { intent.current = 'draft'; }}><FiSave />{initial ? 'Zapisz zmiany' : 'Zapisz szkic'}</button>
        {!initial && <button type="submit" className={styles.primary} disabled={busy || (Boolean(activeId) && !replace)} name="intent" value="publish" onClick={() => { intent.current = 'publish'; }}><FiSend />{busy ? 'Zapisujemy…' : 'Publikuj na 30 dni'}</button>}
      </div>
    </form>
    <aside className={styles.preview}><span className={styles.kicker}>Tak zobaczą to usługodawcy</span><AnnouncementCard item={data} example /><p className={styles.muted}>Ogłoszenie publikujesz jako konto. Zgłaszają się osoby z własną wizytówką w Showly.</p></aside>
  </div>;
}
