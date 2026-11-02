import { Link } from 'react-router-dom';
import { FiArrowUpRight, FiEdit3, FiUser } from 'react-icons/fi';
import { profileImageUrl } from '../../../utils/profileDesign';
import styles from './ProfileHeader.module.scss';

const ProfileHeader = ({ profile, isEditing, onEdit }) => {
  const avatar = profileImageUrl(profile.avatar);

  return (
    <header className={styles.head}>
      <div className={styles.intro}>
        <div>
          <h1>Pokaż klientom, <span>co robisz najlepiej.</span></h1>
          <p>Zarządzaj tym, co klienci widzą w Showly. Uzupełnij dane, dodaj ofertę i dopasuj wygląd do swojej marki.</p>
        </div>
        <FiUser className={styles.headerIcon} aria-hidden="true" />
      </div>

      <div className={styles.identity}>
        <div className={styles.identityRow}>
          {avatar ? (
            <img className={styles.avatar} src={avatar} alt="" />
          ) : (
            <span className={styles.avatarFallback} aria-hidden="true"><FiUser /></span>
          )}
          <div>
            <span className={styles.kicker}>{isEditing ? 'Tryb edycji' : 'Twój profil'}</span>
            <strong>{profile.name || 'Twoja marka'}</strong>
            {profile.role && <p>{profile.role}</p>}
          </div>
        </div>

        <div className={styles.actions}>
          {!isEditing && (
            <button type="button" onClick={onEdit}>
              <FiEdit3 aria-hidden="true" /> Edytuj profil
            </button>
          )}
          {profile.slug && (
            <Link to={'/' + profile.slug} state={{ scrollToId: 'profileWrapper' }}>
              Zobacz profil publiczny <FiArrowUpRight aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default ProfileHeader;
