import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiPlus, FiEdit3, FiEye, FiEyeOff, FiCheck, FiTrash2, FiMessageSquare } from 'react-icons/fi';
import { announcementApi } from './announcementApi';
import { applicationStatuses, budgetLabel, formatDate, statuses } from './announcementData';
import AnnouncementForm from './AnnouncementForm';
import ApplicationProposal from './ApplicationProposal';
import AlertBox from '../AlertBox/AlertBox';
import AnnouncementBackdrop from './AnnouncementBackdrop';
import styles from './Announcements.module.scss';

export default function MyAnnouncements() {
  const [params, setParams] = useSearchParams(); const navigate = useNavigate();
  const tab = params.get('zakladka') === 'zgloszenia' ? 'applications' : 'owned';
  const [data, setData] = useState({ items: [], applications: [], activeId: null, profile: null });
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [editor, setEditor] = useState(params.has('nowe') ? {} : null);
  const [busy, setBusy] = useState(false); const [alert, setAlert] = useState(null);
  const [selected, setSelected] = useState(null); const [applications, setApplications] = useState([]); const [applicationsLoading, setApplicationsLoading] = useState(false); const [applicationsError, setApplicationsError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await announcementApi('/mine', { authenticated: true })); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController(); setApplicationsLoading(true); setApplicationsError(''); setApplications([]);
    announcementApi(`/${selected}/applications`, { authenticated: true, signal: controller.signal }).then(result => { if (!controller.signal.aborted) setApplications(result.items); }).catch(err => { if (err.name !== 'AbortError') setApplicationsError(err.message); }).finally(() => { if (!controller.signal.aborted) setApplicationsLoading(false); });
    return () => controller.abort();
  }, [selected]);
  const perform = async (path, method = 'POST', body) => {
    setBusy(true);
    try { const result = await announcementApi(path, { authenticated: true, method, body }); await load(); return result; }
    catch (err) { setAlert({ type: 'error', message: err.message }); return null; }
    finally { setBusy(false); }
  };
  const save = async (values, intent, replace) => {
    setBusy(true); let created;
    try {
      created = await announcementApi(editor._id ? `/${editor._id}` : '', { authenticated: true, method: editor._id ? 'PATCH' : 'POST', body: values });
      if (intent === 'publish' && !editor._id) await announcementApi(`/${created._id}/publish`, { authenticated: true, method: 'POST', body: { replace } });
      setEditor(null); setParams({}); setAlert({ type: 'success', message: intent === 'publish' ? 'Ogłoszenie jest widoczne przez 30 dni.' : 'Zapisano ogłoszenie.' });
    } catch (err) {
      if (created?._id) { setEditor(null); setParams({}); }
      setAlert({ type: 'error', message: created?._id ? `Szkic został zapisany. ${err.message}` : err.message });
    } finally { setBusy(false); await load(); }
  };
  const conversation = async (announcementId, applicationId) => {
    const result = await perform(`/${announcementId}/applications/${applicationId}/conversation`);
    if (result) navigate(`/konwersacja/${result.id}`, { state: { scrollToId: 'threadPageLayout' } });
  };
  const changeStatus = async (announcementId, applicationId, status) => {
    const result = await perform(`/${announcementId}/applications/${applicationId}`, 'PATCH', { status });
    if (result && selected === announcementId) {
      setApplications(current => current.map(app => app._id === applicationId ? { ...app, status } : app));
    }
  };
  return <section className={styles.section} id="announcements"><AnnouncementBackdrop /><div className={styles.inner}><div className={styles.panel}>
    <header className={styles.panelHeader}><div><span className={styles.kicker}>Showly / Twoje pomysły i współprace</span><h1>Twoje ogłoszenia.</h1><p>Publikuj z konta. Odpowiadaj z profilu. Zarządzaj wszystkim w jednym miejscu.</p></div><Link to="/ogloszenia">Przeglądaj ogłoszenia <FiEye /></Link></header>
    {alert && <AlertBox {...alert} onClose={() => setAlert(null)} />}
    <div className={styles.tabs} aria-label="Widok ogłoszeń"><button aria-pressed={tab === 'owned'} onClick={() => { setParams({}); setEditor(null); }}>Moje ogłoszenia ({data.items.length})</button><button aria-pressed={tab === 'applications'} onClick={() => { setParams({ zakladka: 'zgloszenia' }); setEditor(null); }}>Moje zgłoszenia ({data.applications.length})</button></div>
    {loading && <p role="status" className={styles.muted}>Odświeżamy dane…</p>}
    {error ? <div className={styles.empty} role="alert"><strong>{error}</strong><button onClick={load}>Spróbuj ponownie</button></div> : tab === 'owned' ? <>
      <div className={styles.manageHeading}><div><h2>Jeden pomysł na pierwszy plan.</h2><p className={styles.muted}>Jedno widoczne ogłoszenie przez 30 dni. Szkice, zakończone wpisy i zgłoszenia pozostają w panelu.</p></div>{!editor && <button className={styles.primary} disabled={loading || busy} onClick={() => { setEditor({}); setSelected(null); }}><FiPlus />Nowe ogłoszenie</button>}</div>
      {editor ? <AnnouncementForm key={editor._id || 'new'} initial={editor._id ? editor : null} activeId={data.activeId} busy={busy} onSave={save} onCancel={() => { setEditor(null); setParams({}); }} /> : <div className={styles.manageList}>
        {!loading && !data.items.length && <div className={styles.empty}><FiPlus className={styles.emptyIcon} /><strong>Pierwszy pomysł czeka na publikację.</strong><p>Nie potrzebujesz wizytówki usługodawcy, aby wystawić ogłoszenie. Wystarczy Twoje konto.</p></div>}
        {data.items.map(item => <article className={styles.manageCard} key={item._id}><div className={styles.manageCardHead}><div><span className={`${styles.status} ${item.state === 'active' ? styles.activeStatus : ''}`}>{statuses[item.state]}</span><h3>{item.title}</h3><p className={styles.muted}>{budgetLabel(item)}{item.expiresAt && ` · ${item.state === 'active' ? 'Widoczne do' : 'Ostatnia publikacja do'} ${formatDate(item.expiresAt)}`}</p></div><button disabled={busy} aria-expanded={selected === item._id} onClick={() => setSelected(selected === item._id ? null : item._id)}><FiMessageSquare />Zgłoszenia ({item.applicationCount})</button></div>
          <div className={styles.actions}><button disabled={busy} onClick={() => { setEditor(item); setSelected(null); }}><FiEdit3 />Edytuj</button>{item.state === 'active' ? <><Link to={`/ogloszenia/${item._id}`} state={{ scrollToId: 'announcements' }}>Podgląd</Link><button disabled={busy} onClick={() => perform(`/${item._id}/pause`)}><FiEyeOff />Ukryj</button><button disabled={busy} onClick={() => perform(`/${item._id}/close`)}><FiCheck />Zakończ</button></> : <button className={styles.primary} disabled={busy || Boolean(data.activeId)} onClick={() => perform(`/${item._id}/publish`)}><FiEye />{item.state === 'draft' ? 'Publikuj' : 'Opublikuj ponownie'} na 30 dni</button>}<details className={styles.deleteConfirm}><summary><FiTrash2 />Usuń</summary><p>Usunąć to ogłoszenie z Twojego panelu i katalogu? Usunięte zostaną też wszystkie rozmowy dotyczące tego ogłoszenia.</p><button className={styles.danger} disabled={busy} onClick={() => { if (selected === item._id) setSelected(null); perform(`/${item._id}`, 'DELETE'); }}>Tak, usuń ogłoszenie</button></details></div>
          {item.state !== 'active' && data.activeId && <p className={styles.muted}>Ukryj aktywne ogłoszenie, aby opublikować ten wpis. Przy dodawaniu nowego możesz także wybrać zastąpienie poprzedniego.</p>}
          {selected === item._id && <div className={styles.applicationList}>{applicationsLoading ? <p role="status">Ładujemy zgłoszenia…</p> : applicationsError ? <p role="alert">{applicationsError}</p> : !applications.length ? <div className={styles.empty}><strong>Jeszcze nikt się nie zgłosił.</strong><p>Gdy usługodawca odpowie, jego profil i propozycja pojawią się tutaj.</p></div> : <div className={styles.proposalGrid}>{applications.map(app => <ApplicationProposal key={app._id} application={app} busy={busy} onConversation={() => conversation(item._id, app._id)} onStatus={status => changeStatus(item._id, app._id, status)} />)}</div>}</div>}
        </article>)}
      </div>}
    </> : <div className={styles.manageList}>
      {!data.profile && <div className={styles.empty}><strong>Zgłaszasz się jako profil usługodawcy.</strong><p>Utwórz wizytówkę, aby odpowiadać na ogłoszenia i pokazać swoją ofertę.</p><Link to="/stworz-profil" className={styles.primary}>Stwórz profil</Link></div>}
      {!loading && !data.applications.length && <div className={styles.empty}><strong>Jeszcze nie masz wysłanych zgłoszeń.</strong><p>Znajdź pomysł, który pasuje do Twoich umiejętności.</p><Link to="/ogloszenia" className={styles.primary}>Odkryj ogłoszenia</Link></div>}
      {data.applications.map(app => <article className={styles.applicationCard} key={app._id}><header><h3>{app.announcementId?.title || 'Ogłoszenie zostało usunięte'}</h3><span className={styles.status}>{applicationStatuses[app.status]}</span></header><p>{app.message}</p><small className={styles.muted}>Zgłoszenie z {formatDate(app.createdAt)}</small><div className={styles.actions}>{app.announcementId && <button disabled={busy} onClick={() => conversation(app.announcementId._id, app._id)}><FiMessageSquare />Rozmowa z autorem</button>}{app.announcementId && app.status !== 'withdrawn' && <button disabled={busy} onClick={() => changeStatus(app.announcementId._id, app._id, 'withdrawn')}>Wycofaj zgłoszenie</button>}</div></article>)}
    </div>}
  </div></div></section>;
}
