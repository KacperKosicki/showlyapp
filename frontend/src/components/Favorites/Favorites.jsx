import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiAlertCircle, FiArrowUpRight, FiCheck, FiGrid, FiHeart, FiList, FiLock, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi';
import { api } from '../../api/api';
import DataLoader from '../ui/DataLoader/DataLoader';
import PanelBackdrop from '../PanelBackdrop/PanelBackdrop';
import UserCard from '../UserCard/UserCard';
import AlertBox from '../AlertBox/AlertBox';
import { filterFavorites, normalizeFavoriteProfile } from './favoriteProfiles';
import styles from './FavoritesApp.module.scss';

const Favorites = ({ currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('default');
  const [layout, setLayout] = useState('grid');
  const [retry, setRetry] = useState(0);
  const [alert, setAlert] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const closeAlert = useCallback(() => setAlert(null), []);
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let alive = true;
    setProfiles([]); setError(''); setAlert(null); setQuery(''); setFilter('all');
    setLoading(!!currentUser?.uid);
    if (currentUser?.uid) api.get('/api/favorites/my').then(({ data }) => {
      if (alive) setProfiles((Array.isArray(data) ? data : []).map(normalizeFavoriteProfile));
    }).catch(() => {
      if (alive) setError('Nie udało się pobrać ulubionych. Spróbuj ponownie.');
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [currentUser?.uid, retry]);

  useEffect(() => {
    const id = location.state?.scrollToId;
    if (id && !loading) document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }, [location.state, loading]);

  useEffect(() => {
    const update = event => {
      if (event.detail?.isFav === false) setProfiles(prev => prev.filter(profile => profile.userId !== event.detail.profileUserId));
    };
    window.addEventListener('showly:favorites-updated', update);
    return () => window.removeEventListener('showly:favorites-updated', update);
  }, []);

  const filtered = useMemo(() => filterFavorites(profiles, { query, filter, sort, now }), [profiles, query, filter, sort, now]);
  const availableCount = filterFavorites(profiles, { filter: 'available', now }).length;
  const guest = !currentUser?.uid;
  const ready = !guest && !loading && !error;

  return <section id="scrollToId" className={styles.section}>
    {alert && <AlertBox type={alert.type} message={alert.message} onClose={closeAlert} />}
    <PanelBackdrop word="ULUBIONE" />
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1>Dobre kontakty.<span>Na później.</span></h1>
          <p>Niektóre profile po prostu warto zapisać. Wracaj do ludzi, których styl, oferta i pomysły zostały Ci w głowie.</p>
          <Link className={styles.explore} to="/profile" state={{ scrollToId: 'profilesHub' }}>Odkryj kolejne profile <FiArrowUpRight aria-hidden="true" /></Link>
          <div className={styles.introNotes}><span><FiLock aria-hidden="true" /> Kolekcja tylko dla Ciebie</span><span><FiCheck aria-hidden="true" /> {availableCount} przyjmuje zlecenia</span></div>
        </div>
        <aside className={styles.collectionCard} aria-label="Podsumowanie ulubionych">
          <span className={styles.collectionTab}><FiHeart aria-hidden="true" /> W dobrym towarzystwie</span>
          <div className={styles.collectionBody}>
            <div className={styles.collectionTop}><span>Twoje ulubione</span><FiHeart aria-hidden="true" /></div>
            <strong>{loading || error ? '—' : String(profiles.length).padStart(2, '0')}</strong>
            <span className={styles.collectionCaption}>zapisanych profili, do których możesz wrócić</span>
            <div className={styles.collectionFooter}><div className={styles.avatarStack} aria-hidden="true">{profiles.slice(0, 4).map((profile, index) => <span key={profile.userId || index}>{(profile.name || 'S').slice(0, 1).toUpperCase()}</span>)}{!profiles.length && <FiHeart />}</div><FiArrowUpRight aria-hidden="true" /></div>
          </div>
        </aside>
      </header>
      <div className={styles.workspace}>
        <div className={styles.main}>
          <div className={styles.toolbar}>
            <div className={styles.searchIntro}><span><FiHeart aria-hidden="true" /></span><div><h2>Twoi ludzie. Pod ręką.</h2><p>Znajdź właściwy kontakt w swojej kolekcji.</p></div></div>
            <label className={styles.search}><FiSearch aria-hidden="true" /><input type="search" aria-label="Szukaj w ulubionych" placeholder="Nazwa, usługa lub miasto…" value={query} disabled={!ready || !profiles.length} onChange={event => setQuery(event.target.value)} /></label>
            <div className={styles.viewModes} role="group" aria-label="Widok ulubionych"><button type="button" aria-label="Widok listy" aria-pressed={layout === 'list'} onClick={() => setLayout('list')}><FiList /></button><button type="button" aria-label="Widok kart" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}><FiGrid /></button></div>
          </div>
          <div className={styles.filterBar}><div className={styles.tabs} role="group" aria-label="Filtr ulubionych"><button type="button" disabled={!ready} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Wszystkie <span>{profiles.length}</span></button><button type="button" disabled={!ready} aria-pressed={filter === 'available'} onClick={() => setFilter('available')}>Przyjmują zlecenia <span>{availableCount}</span></button></div><label className={styles.sort}><span>Sortuj</span><select aria-label="Sortuj ulubione" value={sort} disabled={!ready} onChange={event => setSort(event.target.value)}><option value="default">Domyślnie</option><option value="name">Nazwa A–Z</option><option value="rating">Najwyżej oceniane</option></select></label></div>
          {loading && !guest ? <DataLoader label="Ładujemy ulubione profile…" layout={layout === 'grid' ? 'cards' : 'list'} /> : guest ? <div className={styles.empty}><FiLock aria-hidden="true" /><h2>Twoja kolekcja czeka.</h2><p>Zaloguj się, aby wrócić do zapisanych profili.</p><Link className={styles.explore} to="/login" state={{ scrollToId: 'loginBox' }}>Przejdź do logowania <FiArrowUpRight aria-hidden="true" /></Link></div> : error ? <div className={styles.empty}><FiAlertCircle aria-hidden="true" /><h2>Spróbujmy jeszcze raz.</h2><p>{error}</p><button className={styles.explore} type="button" onClick={() => setRetry(value => value + 1)}><FiRefreshCw aria-hidden="true" /> Wczytaj ponownie</button></div> : !profiles.length ? <div className={styles.empty}><FiHeart aria-hidden="true" /><h2>Tu zaczyna się Twoja lista.</h2><p>Kliknij serce przy profilu, który Cię zainteresuje. Później łatwo do niego wrócisz.</p><Link className={styles.explore} to="/profile" state={{ scrollToId: 'profilesHub' }}>Znajdź pierwszy profil <FiArrowUpRight aria-hidden="true" /></Link></div> : !filtered.length ? <div className={styles.empty}><FiSearch aria-hidden="true" /><h2>Nie ma takich profili na Twojej liście.</h2><p>Zmień wyszukiwanie lub pokaż wszystkie zapisane osoby.</p><button className={styles.explore} type="button" onClick={() => { setQuery(''); setFilter('all'); }}>Wyczyść filtry <FiX aria-hidden="true" /></button></div> : <>
            <div className={styles.resultCount} aria-live="polite">Wyświetlono {filtered.length} z {profiles.length} zapisanych profili</div>
            <ul className={styles.profiles} data-layout={layout} aria-label="Lista ulubionych profili Showly">{filtered.map((profile, index) => <li key={profile.userId || profile._id || index}><UserCard user={profile} currentUser={currentUser} setAlert={setAlert} /></li>)}</ul>
          </>}
        </div>
      </div>
    </div>
  </section>;
};
export default Favorites;
