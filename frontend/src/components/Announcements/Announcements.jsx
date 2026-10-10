import DataLoader from '../ui/DataLoader/DataLoader';
import AnnouncementBackdrop from './AnnouncementBackdrop';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight, FiArrowUpRight, FiSearch, FiMessageCircle, FiZap, FiAperture, FiPlus } from 'react-icons/fi';
import { announcementApi } from './announcementApi';
import { categories, countLabel, workModes } from './announcementData';
import AnnouncementCard from './AnnouncementCard';
import useScrollReveal from '../../utils/useScrollReveal';
import styles from './Announcements.module.scss';

export default function Announcements({ user }) {
  const sectionRef = useScrollReveal();
  const [filters, setFilters] = useState({ q: '', location: '', category: '', workMode: '', budgetMin: '', budgetMax: '', dateFrom: '' });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const timer = setTimeout(async () => {
      try {
        const query = new URLSearchParams({ page, limit: 12 });
        Object.entries(filters).forEach(([key, value]) => { if (value !== '') query.set(key, value); });
        const data = await announcementApi(`?${query}`, { signal: controller.signal });
        setResult(data);
      } catch (err) { if (err.name !== 'AbortError') setError(err.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filters, page, retry]);
  const change = event => { setFilters(current => ({ ...current, [event.target.name]: event.target.value })); setPage(1); };
  return <section ref={sectionRef} id="announcements" className={`${styles.section} ${styles.browsePage}`}><AnnouncementBackdrop word="WSPÓŁPRACA" /><div className={styles.inner}>
    <header className={styles.browseHero}>
      <div className={styles.heroCopy} data-reveal>
        <h1>Masz pomysł.<br /><span>Znajdź człowieka.</span></h1>
        <p>Małe plany. Wielkie możliwości. Opowiedz, czego szukasz — ktoś z Showly ma talent, którego właśnie potrzebujesz.</p>
        <div className={styles.heroLinks}>
          <Link className={styles.primary} to={user ? '/twoje-ogloszenia?nowe=1' : '/login'} state={{ scrollToId: user ? 'announcements' : 'loginBox' }}>Dodaj ogłoszenie<FiArrowUpRight aria-hidden="true" /></Link>
          <Link to={user ? '/twoje-ogloszenia' : '/login'}>Twoje ogłoszenia <FiArrowRight aria-hidden="true" /></Link>
        </div>
      </div>
      <div className={styles.connectionArt} data-reveal style={{ '--reveal-delay': '120ms' }} aria-hidden="true">
        <svg className={styles.connectionLine} viewBox="0 0 460 330" fill="none"><path d="M75 95C180-10 400 20 357 152S109 294 167 197 360 166 395 270" /><path d="m376 264 19 6-1-20" /></svg>
        <span className={styles.ideaNote}><FiZap /><small>PUNKT WYJŚCIA</small><strong>Twój<br />pomysł.</strong><span>To tutaj się zaczyna <FiArrowUpRight /></span></span>
        <span className={styles.talentNote}><span className={styles.talentMarks}><b><FiAperture /></b><b><FiArrowUpRight /></b><b><FiPlus /></b></span><small>DRUGA STRONA</small><strong>Czyjś talent.</strong><span>Razem można więcej.</span></span>
        <span className={styles.matchSeal}>DOBRE<br />POŁĄCZENIE<FiMessageCircle /></span>
      </div>
    </header>
    <div className={styles.processBand} aria-label="Jak działają ogłoszenia"><span><b>01 /</b> Opisz swój pomysł</span><FiArrowRight aria-hidden="true" /><span><b>02 /</b> Poznaj propozycje</span><FiArrowRight aria-hidden="true" /><span><b>03 /</b> Zacznij rozmowę</span><small>30 dni na dobre połączenie.</small></div>
    <div className={styles.browseLayout}>
      <aside className={`${styles.panel} ${styles.searchPanel}`} data-reveal aria-label="Wyszukiwarka ogłoszeń">
        <div className={styles.searchHeading}><FiSearch /><div><h2>Znajdź coś dla siebie.</h2><p>Szukaj po pomyśle, branży lub miejscu współpracy.</p></div></div>
        <div className={styles.twoColumns}><label className={styles.field}><span>Czego szukasz?</span><input name="q" value={filters.q} onChange={change} maxLength={100} placeholder="DJ, strona internetowa, kwiaty…" type="search" /></label><label className={styles.field}><span>Miejscowość</span><input name="location" value={filters.location} onChange={change} maxLength={100} placeholder="Miasto lub okolice" /></label></div>
        <div className={styles.chips}><button type="button" aria-pressed={!filters.category} onClick={() => { setFilters(current => ({ ...current, category: '' })); setPage(1); }}>Wszystkie</button>{categories.map(([key, title]) => <button key={key} type="button" aria-pressed={filters.category === key} onClick={() => { setFilters(current => ({ ...current, category: current.category === key ? '' : key })); setPage(1); }}>{title}</button>)}</div>
        <details className={styles.filters}><summary>Dopasuj termin, miejsce i budżet</summary><div className={styles.filterGrid}><label className={styles.field}><span>Miejsce współpracy</span><select name="workMode" value={filters.workMode} onChange={change}><option value="">Dowolne</option>{Object.entries(workModes).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></label><label className={styles.field}><span>Termin od</span><input type="date" name="dateFrom" value={filters.dateFrom} onChange={change} /></label>{['budgetMin', 'budgetMax'].map((name, i) => <label className={styles.field} key={name}><span>Budżet {i ? 'do' : 'od'} (zł)</span><input type="number" min="0" max="10000000" step=".01" name={name} value={filters[name]} onChange={change} /></label>)}</div><small className={styles.muted}>Wyniki uwzględniają także ogłoszenia z terminem lub budżetem do ustalenia.</small></details>
        <button className={styles.reset} type="button" onClick={() => { setFilters({ q: '', location: '', category: '', workMode: '', budgetMin: '', budgetMax: '', dateFrom: '' }); setPage(1); }}>Wyczyść filtry</button>
      </aside>
      <div className={styles.resultsArea} data-reveal style={{ '--reveal-delay': '80ms' }}>
        <div className={styles.resultsHeader}><div><h2>Znajdź swój następny projekt.</h2></div><span aria-live="polite">{loading ? 'Szukamy…' : countLabel(result.total)}</span></div>
        {loading ? <DataLoader label="Ładujemy ogłoszenia…" detail="Szukamy pomysłów, do których możesz dołączyć." layout="cards" /> : error ? <div className={styles.empty} role="alert"><strong>{error}</strong><button type="button" onClick={() => setRetry(value => value + 1)}>Spróbuj ponownie</button></div> : result.items.length ? <><div className={styles.cardGrid}>{result.items.map(item => <AnnouncementCard key={item._id} item={item} />)}</div><nav className={styles.pagination} aria-label="Strony ogłoszeń"><button disabled={page === 1} onClick={() => setPage(value => value - 1)}><FiArrowLeft />Poprzednia</button><span>Strona {page} / {Math.max(1, Math.ceil(result.total / 12))}</span><button disabled={page * 12 >= result.total} onClick={() => setPage(value => value + 1)}>Następna<FiArrowRight /></button></nav></> : <div className={styles.empty}><FiSearch className={styles.emptyIcon} /><strong>Jeszcze nie ma takich ogłoszeń.</strong><p>Zmień filtry lub opublikuj własny pomysł — nie potrzebujesz profilu usługodawcy.</p><Link to={user ? '/twoje-ogloszenia?nowe=1' : '/login'} className={styles.primary}>Dodaj swój pomysł</Link></div>}
      </div></div>
    <footer className={styles.browseClosing} data-reveal><span>Nie widzisz swojego pomysłu?</span><strong>Zrób dla niego miejsce.</strong><Link to={user ? '/twoje-ogloszenia?nowe=1' : '/login'}>Dodaj ogłoszenie<FiArrowUpRight aria-hidden="true" /></Link></footer>
  </div></section>;
}
