import AnnouncementBackdrop from './AnnouncementBackdrop';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiArrowUpRight, FiCalendar, FiMapPin, FiCreditCard, FiSend, FiMessageSquare } from 'react-icons/fi';
import { announcementApi } from './announcementApi';
import { applicationStatuses, budgetLabel, categoryName, countLabel, dateLabel, formatDate, scopes, statuses, workModes } from './announcementData';
import AlertBox from '../AlertBox/AlertBox';
import { categoryVisual } from './announcementVisuals';
import styles from './Announcements.module.scss';
import AnnouncementAuthor from './AnnouncementAuthor';

export default function AnnouncementDetail({ user }) {
  const { id } = useParams(); const navigate = useNavigate();
  const [item, setItem] = useState(null); const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(''); const [budget, setBudget] = useState('');
  const [alert, setAlert] = useState(null); const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    announcementApi(`/${id}`, { authenticated: Boolean(user), signal: controller.signal }).then(data => { if (!controller.signal.aborted) setItem(data); }).catch(err => { if (err.name !== 'AbortError') setError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, user, refresh]);
  const apply = async event => {
    event.preventDefault(); setBusy(true);
    try { await announcementApi(`/${id}/applications`, { authenticated: true, method: 'POST', body: { message, proposedBudget: budget } }); setAlert({ type: 'success', message: 'Zgłoszenie wysłane. Rozmowa czeka w centrum wiadomości.' }); setRefresh(value => value + 1); }
    catch (err) { setAlert({ type: 'error', message: err.message }); }
    finally { setBusy(false); }
  };
  const openConversation = async () => {
    setBusy(true);
    try { const data = await announcementApi(`/${id}/applications/${item.ownApplication._id}/conversation`, { authenticated: true, method: 'POST' }); navigate(`/konwersacja/${data.id}`, { state: { scrollToId: 'threadPageLayout' } }); }
    catch (err) { setAlert({ type: 'error', message: err.message }); }
    finally { setBusy(false); }
  };
  const { Icon, color } = categoryVisual(item?.category);
  return <section className={`${styles.section} ${styles.detailPage}`} id="announcements"><AnnouncementBackdrop /><div className={styles.inner}>
    <Link className={styles.back} to="/ogloszenia" state={{ scrollToId: 'announcements' }}><FiArrowLeft />Wszystkie ogłoszenia</Link>
    {alert && <AlertBox {...alert} onClose={() => setAlert(null)} />}
    {loading ? <div className={styles.empty} role="status">Ładujemy ogłoszenie…</div> : error ? <div className={styles.empty} role="alert"><strong>{error}</strong><button onClick={() => setRefresh(value => value + 1)}>Spróbuj ponownie</button></div> : item && <div className={styles.detailLayout}>
      <article className={`${styles.panel} ${styles.detailPanel}`} style={{ '--idea-color': color }}>
        <header className={styles.detailHeader}>
          <div className={styles.detailCoverTop}><span className={styles.detailCoverLabel}><Icon aria-hidden="true" />POMYSŁ SZUKA TALENTU</span><span className={styles.detailCoverArrow} aria-hidden="true"><FiArrowUpRight /></span></div>
          <div className={styles.cardTop}><span className={styles.category}>{categoryName(item.category)}</span><span className={styles.status}>{statuses[item.state]}</span></div>
          <h1 className={styles.detailTitle}>{item.title}</h1>
          <div className={styles.detailByline}><AnnouncementAuthor name={item.authorName} avatar={item.authorAvatar} /><span className={styles.detailApplicationCount}><FiMessageSquare aria-hidden="true" />{countLabel(item.applicationCount, 'applications')}</span></div>
        </header>
        <div className={styles.detailBody}>
          <dl className={styles.detailFacts}><div><dt><FiMapPin aria-hidden="true" />Gdzie</dt><dd>{item.workMode === 'remote' ? 'Zdalnie' : item.location || 'Dowolna miejscowość'}<small>{workModes[item.workMode]}</small></dd></div><div><dt><FiCalendar aria-hidden="true" />Kiedy</dt><dd>{dateLabel(item) || 'Termin do ustalenia'}<small>{scopes[item.scope]}</small></dd></div><div><dt><FiCreditCard aria-hidden="true" />Budżet</dt><dd>{budgetLabel(item)}<small>Kwota podana przez autora</small></dd></div></dl>
          <div className={styles.detailStoryHeading}><span aria-hidden="true">01</span><h2 className={styles.detailSubtitle}>Pomysł i szczegóły</h2></div><div className={styles.description}>{item.description}</div>
          {item.expiresAt && <p className={`${styles.muted} ${styles.detailExpiry}`}><FiCalendar aria-hidden="true" /><span>Widoczność do {formatDate(item.expiresAt)}. Autor może wcześniej zakończyć lub ukryć ogłoszenie.</span></p>}
        </div>
      </article>
      <aside className={`${styles.panel} ${styles.responsePanel}`}><div className={styles.responseIntro}><span className={styles.responseSymbol} aria-hidden="true"><FiSend /></span><span className={styles.kicker}>Twój następny krok</span><h2>Pasuje do Ciebie?</h2><p>Dobry pomysł zaczyna się od rozmowy.</p></div>
        {item.isOwner ? <div className={styles.empty}><strong>To Twoje ogłoszenie.</strong><p>Zobacz zgłoszenia i porozmawiaj z usługodawcami w swoim panelu.</p><Link to="/twoje-ogloszenia" className={styles.primary}>Zarządzaj ogłoszeniem</Link></div> : !user ? <div className={styles.empty}><strong>Zgłaszasz się jako profil.</strong><p>Zaloguj się i użyj wizytówki usługodawcy, aby odpowiedzieć na ten pomysł.</p><Link to="/login" className={styles.primary}>Zaloguj się</Link></div> : item.ownApplication && item.ownApplication.status !== 'withdrawn' ? <div className={styles.empty}><FiSend className={styles.emptyIcon} /><strong>{applicationStatuses[item.ownApplication.status]}</strong><p>Twoje zgłoszenie zostało zapisane. Odpowiedzi znajdziesz w wiadomościach oraz panelu zgłoszeń.</p><button disabled={busy} className={styles.primary} onClick={openConversation}><FiMessageSquare />Przejdź do rozmowy</button><Link to="/twoje-ogloszenia?zakladka=zgloszenia">Twoje zgłoszenia</Link></div> : !item.profile ? <div className={styles.empty}><strong>Najpierw pokaż swoją ofertę.</strong><p>Do ogłoszeń zgłaszają się wyłącznie profile usługodawców. Autor zobaczy Twoją wizytówkę razem z propozycją.</p><Link to="/stworz-profil" className={styles.primary}>Stwórz profil usługodawcy</Link></div> : <form className={styles.applicationForm} onSubmit={apply}><p className={styles.muted}>Zgłaszasz się jako <strong>{item.profile.name}</strong>. Wiadomość rozpocznie rozmowę z autorem ogłoszenia.</p><label className={styles.field}><span>Twoja propozycja</span><textarea aria-label="Twoja propozycja" value={message} onChange={event => setMessage(event.target.value)} required minLength={20} maxLength={2000} rows={7} placeholder="Napisz, co możesz zaproponować, czy termin Ci odpowiada i dlaczego warto porozmawiać." /><small>{message.length} / 2000 · minimum 20 znaków</small></label><label className={styles.field}><span>Proponowana kwota (zł, opcjonalnie)</span><input type="number" min="0" max="10000000" step=".01" value={budget} onChange={event => setBudget(event.target.value)} /></label><button className={styles.primary} disabled={busy || !item.canApply} type="submit"><FiSend />{busy ? 'Wysyłamy…' : 'Zgłoś się z profilem'}</button><small className={styles.muted}>Zgłoszenie jest propozycją współpracy. Szczegóły i warunki ustalacie w rozmowie.</small></form>}
      </aside>
    </div>}
  </div></section>;
}
