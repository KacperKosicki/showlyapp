import { Link } from 'react-router-dom';
import { FiArrowUpRight, FiEdit3, FiImage, FiLayers, FiLink, FiZap } from 'react-icons/fi';
import { profileImageUrl } from '../../../utils/profileDesign';
import styles from './ProfileHeader.module.scss';

const countLabel = (count, one, few, many) => ({ one, few, many }[new Intl.PluralRules('pl').select(count)] || many);

const ProfileHeader = ({ profile, editData, isEditing, onEdit }) => {
  const data = isEditing ? editData || profile : profile;
  const avatar = profileImageUrl(data?.avatar);
  const servicesCount = (data?.services || []).filter(item => item.isActive !== false).length;
  const photosCount = data?.photos?.length || 0;
  const linksCount = data?.links?.length || 0;
  const stats = [
    { icon: FiLayers, value: servicesCount, label: countLabel(servicesCount, 'usługa', 'usługi', 'usług') },
    { icon: FiImage, value: photosCount, label: countLabel(photosCount, 'zdjęcie', 'zdjęcia', 'zdjęć') },
    { icon: FiLink, value: linksCount, label: countLabel(linksCount, 'link', 'linki', 'linków') },
  ];
  return <header className={styles.head}>
    <div className={styles.headText}>
      <div className={styles.labelRow}><span className={styles.labelBadge}><FiZap aria-hidden="true" /> Studio wizytówki</span><span className={styles.mode}>{isEditing ? 'Tryb edycji' : 'Twoja przestrzeń'}</span></div>
      <h1 className={styles.heading}>Daj się<br /><span>zapamiętać.</span></h1>
      <p className={styles.description}>Twój styl, Twoja oferta, Twoje zasady. Zbuduj miejsce, które pokazuje, co potrafisz — od pierwszego spojrzenia.</p>
      <div className={styles.headActions}>
        {!isEditing ? <button type="button" onClick={onEdit} className={styles.primary} aria-label="Edytuj profil"><FiEdit3 aria-hidden="true" /> Edytuj profil <FiArrowUpRight aria-hidden="true" /></button> : <span className={styles.editingNote}><FiEdit3 aria-hidden="true" /> Zmieniaj śmiało. Zapisz, gdy wszystko będzie gotowe.</span>}
        {profile?.slug && <Link to={'/' + profile.slug} state={{ scrollToId: 'profileWrapper' }} className={styles.secondary} aria-label="Przejdź do publicznego profilu">Zobacz profil <FiArrowUpRight aria-hidden="true" /></Link>}
      </div>
    </div>
    <div className={styles.identityCard}>
      <span className={styles.identityKicker}>Za tą marką stoisz Ty</span>
      <div className={styles.identityTop}>
        <div className={styles.avatar}>{avatar ? <img src={avatar} alt="" onError={event => { event.currentTarget.src = '/images/other/no-image.png'; }} /> : <span>{(data?.name || 'S').slice(0, 1)}</span>}</div>
        <div><strong>{data?.name || 'Twoja marka'}</strong><p>{data?.role || 'Miejsce na Twój talent'}</p></div>
      </div>
      {profile?.slug && <span className={styles.address}>showly.me/{profile.slug}</span>}
      <div className={styles.stats}>{stats.map(({icon: Icon, value, label}) => <div key={label}><Icon aria-hidden="true" /><strong>{value}</strong><span>{label}</span></div>)}</div>
      <div className={styles.identityFooter}><span className={styles.statusDot} />{isEditing ? 'Podgląd aktualnych zmian' : 'Wszystko zaczyna się od Ciebie'}<FiArrowUpRight aria-hidden="true" /></div>
    </div>
  </header>;
};
export default ProfileHeader;
