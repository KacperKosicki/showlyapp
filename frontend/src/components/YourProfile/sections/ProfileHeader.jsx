import { Link } from 'react-router-dom';
import styles from '../YourProfile.module.scss';

const ProfileHeader = ({ profile, isEditing, onEdit }) => {
  return (
    <div className={styles.head}>
      <div className={styles.labelRow}>
        <span className={styles.labelBadge}>Twój profil</span>
        <span className={styles.labelDot} />
        <span className={styles.labelDesc}>
          Zarządzaj wizytówką, usługami, galerią i ustawieniami rezerwacji
        </span>
        <span className={styles.labelLine} />
        <span className={styles.pill}>Showly • Edycja • Profil • Rezerwacje</span>
      </div>

      <div className={styles.headTop}>
        <div className={styles.headText}>
          <h2 className={styles.heading}>Panel Twojego profilu</h2>

          <p className={styles.description}>
            {profile ? (
              <>
                Pomyślnie wczytano Twój profil: <strong>{profile.name}</strong>
              </>
            ) : (
              'Ładowanie danych…'
            )}
          </p>
        </div>

        {!isEditing && (
          <div className={styles.headActions}>
            <Link
              to={profile?.slug ? `/profil/${profile.slug}` : '#'}
              state={profile?.slug ? { scrollToId: 'profileWrapper' } : undefined}
              className={styles.primary}
              style={!profile?.slug ? { pointerEvents: 'none', opacity: 0.6 } : undefined}
              aria-label="Przejdź do publicznego profilu"
              title={profile?.slug ? 'Zobacz swój publiczny profil' : 'Brak sluga profilu'}
            >
              Przejdź do widoku profilu
            </Link>

            <button
              type="button"
              onClick={onEdit}
              className={styles.primary}
              aria-label="Edytuj profil"
            >
              Edytuj profil
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;
