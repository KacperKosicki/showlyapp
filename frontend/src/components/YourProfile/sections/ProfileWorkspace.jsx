import { FiUser, FiAlignLeft, FiLayers, FiImage, FiMail, FiSliders, FiArrowUpRight, FiCheck, FiCreditCard, FiEye, FiList, FiAward } from 'react-icons/fi';
import styles from './ProfileWorkspace.module.scss';

export const getProfileMilestones = (data = {}) => [
  { id: 'basicInfoSection', label: 'Dane', icon: FiUser, ready: !!(data.role?.trim() && data.location?.trim()) },
  { id: 'descriptionSection', label: 'Opis', icon: FiAlignLeft, ready: !!data.description?.trim() },
  { id: 'appearanceSection', label: 'Wygląd', icon: FiSliders, ready: !!(data.theme && (typeof data.theme === 'string' || Object.keys(data.theme).length)) },
  { id: 'offerSection', label: 'Oferta', icon: FiLayers, ready: (data.services || []).some(item => item.isActive !== false) },
  { id: 'mediaSection', label: 'Realizacje', icon: FiImage, ready: !!(data.photos?.length || data.links?.length) },
  { id: 'contactSection', label: 'Kontakt', icon: FiMail, ready: !!(data.contact?.email?.trim() || data.contact?.phone?.trim()) },
];
const ProfileWorkspace = ({ profile, editData, isEditing, onShowPreview }) => {
  const sections = getProfileMilestones(isEditing ? editData || profile : profile);
  const complete = sections.filter(section => section.ready).length;

  return (
    <section className={styles.workspace} aria-labelledby="workspace-title">
      <div className={styles.heading}>
        <h2 id="workspace-title">Ustawienia wizytówki</h2>
        <span className={styles.badge}>{complete} z {sections.length} głównych sekcji uzupełnionych</span>
      </div>
      <progress aria-label="Uzupełnione obszary wizytówki" value={complete} max={sections.length} />
      <nav className={styles.links} aria-label="Sekcje wizytówki">
        {[
          ...sections,
          { id: 'additionalInfoSection', label: 'Dodatkowe informacje', icon: FiList },
          { id: 'achievementsSection', label: 'Gablota odznak', icon: FiAward },
          { id: 'billingSection', label: 'Plan i widoczność', icon: FiCreditCard },
          { id: 'profileDesignPreview', label: 'Podgląd na żywo', icon: FiEye, onClick: onShowPreview },
        ].map(({ id, label, icon: Icon, ready, onClick }) => (
          <a href={'#' + id} key={id} onClick={onClick}>
            <span className={styles.icon} aria-hidden="true"><Icon /></span>
            {label}
            <span className={styles.indicator} data-ready={ready} aria-hidden="true">
              {ready ? <FiCheck /> : <FiArrowUpRight />}
            </span>
          </a>
        ))}
      </nav>
    </section>
  );
};

export default ProfileWorkspace;
