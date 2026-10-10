import { FiArrowDown, FiArrowUp, FiPlus, FiStar, FiTrash2 } from 'react-icons/fi';
import { MAX_PROJECTS, photoKey } from '../../../utils/profileProjects';
import PortfolioProjects from '../../PublicProfile/PortfolioProjects';
import styles from './PortfolioEditor.module.scss';

const PortfolioEditor = ({ profile, editData, isEditing, setEditData, error }) => {
  const data = isEditing ? editData : profile;
  const projects = data?.projects || [];
  const photos = data?.photos || [];
  const update = (index, changes) => setEditData(prev => ({ ...prev,
    projects: (prev.projects || []).map((item, i) => i === index ? { ...item, ...changes } : item),
  }));
  const move = (index, offset) => setEditData(prev => {
    const items = [...(prev.projects || [])];
    [items[index], items[index + offset]] = [items[index + offset], items[index]];
    return { ...prev, projects: items };
  });
  return <div className={styles.editor}>
    <div className={styles.intro}><span>Od pomysłu do efektu</span><h3>Pokaż, co za Tobą stoi.</h3><p>Nie tylko zdjęcie. Opowiedz, co zrobiłeś i jaki był rezultat. Do 6 realizacji, w kolejności wybranej przez Ciebie.</p></div>
    {!isEditing && (projects.length ? <PortfolioProjects projects={projects} photos={photos} /> : <p>Twoje realizacje pojawią się tutaj. Włącz edycję, aby dodać pierwszy projekt.</p>)}
    {isEditing && <>
      {projects.map((project, index) => <article key={index} className={styles.project}>
        <header><strong>Realizacja {String(index + 1).padStart(2, '0')}</strong><div className={styles.actions}>
          <button type="button" aria-label={`Przesuń realizację ${index + 1} w górę`} disabled={index === 0} onClick={() => move(index, -1)}><FiArrowUp /></button>
          <button type="button" aria-label={`Przesuń realizację ${index + 1} w dół`} disabled={index === projects.length - 1} onClick={() => move(index, 1)}><FiArrowDown /></button>
          <button type="button" aria-label={`Usuń realizację ${index + 1}`} onClick={() => setEditData(prev => ({ ...prev, projects: prev.projects.filter((_, i) => i !== index) }))}><FiTrash2 /></button>
        </div></header>
        <div className={styles.fields}>
          <label>Tytuł projektu <small>do 80 znaków</small><input value={project.title || ''} maxLength={80} placeholder="Np. Identyfikacja wizualna lokalnej kawiarni" onChange={e => update(index, { title: e.target.value })} /></label>
          <label>Kategoria <small>opcjonalnie</small><input value={project.category || ''} maxLength={40} placeholder="Np. Branding / Fotografia / Trening" onChange={e => update(index, { category: e.target.value })} /></label>
          <label className={styles.full}>Co zrobiłeś? <small>do 800 znaków</small><textarea value={project.description || ''} maxLength={800} rows={4} placeholder="Zadanie, Twój pomysł i zakres pracy…" onChange={e => update(index, { description: e.target.value })} /></label>
          <label className={styles.full}>Rezultat <small>do 240 znaków</small><textarea value={project.outcome || ''} maxLength={240} rows={2} placeholder="Co udało się osiągnąć?" onChange={e => update(index, { outcome: e.target.value })} /></label>
          <label>Zdjęcie z galerii <small>opcjonalnie</small><select value={project.photoKey || ''} onChange={e => update(index, { photoKey: e.target.value })}><option value="">Karta bez zdjęcia</option>{photos.map((photo, i) => <option key={i} value={photoKey(photo)}>Zdjęcie {i + 1}</option>)}{project.photoKey && !photos.some(photo => photoKey(photo) === project.photoKey) && <option value={project.photoKey}>Zdjęcie usunięte — wybierz inne</option>}</select></label>
          <label className={styles.featured}><input type="checkbox" checked={!!project.featured} onChange={e => update(index, { featured: e.target.checked })} /><FiStar aria-hidden="true" /> Wyróżnij realizację</label>
        </div>
      </article>)}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button className={styles.add} type="button" disabled={projects.length >= MAX_PROJECTS} onClick={() => setEditData(prev => ({ ...prev, projects: [...(prev.projects || []), { title: '', category: '', description: '', outcome: '', photoKey: '', featured: false }] }))}><FiPlus aria-hidden="true" /> Dodaj realizację <span>{projects.length} / {MAX_PROJECTS}</span></button>
      {!photos.length && <p className={styles.hint}>Chcesz dodać zdjęcie? Wgraj je w galerii powyżej, zapisz profil i wybierz je tutaj.</p>}
    </>}
  </div>;
};
export default PortfolioEditor;
