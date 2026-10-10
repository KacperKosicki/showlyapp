import { FiArrowUpRight, FiCheck, FiLayers, FiStar } from 'react-icons/fi';
import { projectPhoto } from '../../utils/profileProjects';
import { profileImageUrl } from '../../utils/profileDesign';
import styles from './PortfolioProjects.module.scss';

const PortfolioProjects = ({ projects = [], photos = [], onOpenPhoto, compact = false }) => <div className={`${styles.grid} ${compact ? styles.compact : ''}`}>
  {projects.filter(project => project.title?.trim()).map((project, index) => {
    const image = profileImageUrl(projectPhoto(project, photos));
    return <article key={index} className={styles.card} data-featured={!!project.featured}>
      {image ? <div className={styles.media}><img src={image} alt={project.title} loading="lazy" />{onOpenPhoto && <button type="button" onClick={() => onOpenPhoto(image)} aria-label={`Otwórz zdjęcie realizacji: ${project.title}`}><FiArrowUpRight aria-hidden="true" /></button>}</div> : <div className={styles.poster} aria-hidden="true"><FiLayers /><span>{String(index + 1).padStart(2, '0')}</span></div>}
      <div className={styles.copy}><div className={styles.meta}><span>{project.category || 'Realizacja'}</span>{project.featured && <span><FiStar aria-hidden="true" /> Wyróżniona</span>}</div><h3>{project.title}</h3>{project.description && <p>{project.description}</p>}{project.outcome && <div className={styles.outcome}><FiCheck aria-hidden="true" /><div><span>Efekt pracy</span><p>{project.outcome}</p></div></div>}</div>
    </article>;
  })}
</div>;
export default PortfolioProjects;
