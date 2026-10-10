import { FiUser, FiAlignLeft, FiLayers, FiImage, FiMail, FiSliders, FiEye, FiArrowUpRight, FiCheck, FiPlus, FiCreditCard } from 'react-icons/fi';
import styles from './ProfileWorkspace.module.scss';

export const getProfileMilestones = (data = {}) => [
  { id: 'basicInfoSection', label: 'Dane', detail: 'Rola i lokalizacja', icon: FiUser, ready: !!(data.role?.trim() && data.location?.trim()) },
  { id: 'descriptionSection', label: 'Historia', detail: 'Kilka słów o Tobie', icon: FiAlignLeft, ready: !!data.description?.trim() },
  { id: 'appearanceSection', label: 'Wygląd', detail: 'Motyw i kompozycja', icon: FiSliders, ready: !!(data.theme && (typeof data.theme === 'string' || Object.keys(data.theme).length)) },
  { id: 'offerSection', label: 'Oferta', detail: 'Usługi i możliwości', icon: FiLayers, ready: (data.services || []).some(item => item.isActive !== false) },
  { id: 'mediaSection', label: 'Realizacje', detail: 'Galeria i linki', icon: FiImage, ready: !!(data.photos?.length || data.links?.length) },
  { id: 'contactSection', label: 'Kontakt', detail: 'Jak do Ciebie trafić', icon: FiMail, ready: !!(data.contact?.email?.trim() || data.contact?.phone?.trim()) },
];
const ProfileWorkspace = ({ profile, editData, isEditing }) => {
  const steps = getProfileMilestones(isEditing ? editData || profile : profile);
  const complete = steps.filter(step => step.ready).length;
  const next = steps.find(step => !step.ready);
  return <section className={styles.workspace} aria-labelledby="workspace-title">
    <div className={styles.top}><div><span className={styles.kicker}>Od pomysłu do wizytówki</span><h2 id="workspace-title">Nadaj temu swój charakter.</h2><p>Sześć miejsc, w których pokażesz siebie. Wybierz, co chcesz teraz dopracować.</p></div><div className={styles.progress}><span><strong>{complete}</strong> / {steps.length}</span><p>obszarów uzupełnionych</p><div className={styles.track} role="progressbar" aria-label="Uzupełnione obszary wizytówki" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={complete}><span style={{width: (complete / steps.length * 100) + '%'}} /></div></div></div>
    <nav className={styles.tiles} aria-label="Zarządzanie wizytówką">{steps.map(({id, label, detail, icon: Icon, ready}, index) => <a href={'#' + id} key={id} className={styles.tile} data-ready={ready}><div className={styles.tileTop}><Icon aria-hidden="true" /><span>{String(index + 1).padStart(2, '0')}</span></div><strong>{label}</strong><span className={styles.detail}>{detail}</span><div className={styles.tileBottom}>{ready ? <FiCheck aria-hidden="true" /> : <FiPlus aria-hidden="true" />}<span>{ready ? 'Uzupełnione' : 'Do dopracowania'}</span><FiArrowUpRight aria-hidden="true" /></div></a>)}</nav>
    <div className={styles.bottom}><p>{next ? <>Następny krok? <a href={'#' + next.id}>{next.label} <FiArrowUpRight aria-hidden="true" /></a></> : 'Podstawy są gotowe. Teraz liczą się detale, które Cię wyróżnią.'}<span>To wskazówki — sam wybierasz, co pokazujesz.</span></p><div className={styles.tools}><a href="#profileDesignPreview"><FiEye aria-hidden="true" /> Podgląd na żywo</a><a href="#billingSection"><FiCreditCard aria-hidden="true" /> Plan i widoczność</a></div></div>
  </section>;
};
export default ProfileWorkspace;
