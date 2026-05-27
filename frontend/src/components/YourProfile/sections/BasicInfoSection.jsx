import styles from '../YourProfile.module.scss';
import { FaIdBadge, FaMapMarkerAlt, FaUserTie } from 'react-icons/fa';

const BasicInfoSection = ({
  profile,
  editData,
  isEditing,
  formErrors,
  hasAvatarNow,
  fileInputRef,
  getAvatarUrl,
  onEditDataChange,
  onImageChange,
  onRemoveAvatar,
}) => {
  const currentData = isEditing ? editData : profile;

  const updateEditData = (field, value) => {
    onEditDataChange((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <section className={`${styles.card} ${styles.basicCard}`}>
      <div className={styles.cardGlow} aria-hidden="true" />

      <div className={styles.sectionTop}>
        <div>
          <span className={styles.sectionKicker}>Profil publiczny</span>

          <h3 className={styles.sectionTitle}>Dane podstawowe</h3>

          <p className={styles.sectionLead}>
            To pierwsze informacje, które widzą użytkownicy po wejściu na Twoją wizytówkę.
          </p>
        </div>

        <div className={styles.sectionBadge}>
          <FaIdBadge />
          <span>Start</span>
        </div>
      </div>

      <div className={styles.basicInfoRow}>
        <div className={styles.avatarColumn}>
          <div className={styles.avatarFrame}>
            <div className={styles.avatarRing} />

            <img
              src={getAvatarUrl(currentData)}
              alt="Avatar"
              className={styles.avatar}
            />

            <span className={styles.avatarStatus}>
              {profile?.isVisible ? 'Widoczny' : 'Ukryty'}
            </span>
          </div>

          <div className={styles.avatarMeta}>
            <strong>{isEditing ? editData.name || profile?.name : profile?.name}</strong>
            <span>{isEditing ? editData.role || profile?.role : profile?.role}</span>
          </div>

          {isEditing && (
            <div className={styles.controls}>
              <label className={styles.fileBtn}>
                <input
                  type="file"
                  accept="image/*,heic,heif"
                  ref={fileInputRef}
                  onChange={onImageChange}
                />
                Wybierz zdjęcie
              </label>

              {hasAvatarNow && (
                <button
                  type="button"
                  className={styles.danger}
                  onClick={onRemoveAvatar}
                >
                  Usuń zdjęcie
                </button>
              )}

              <small className={styles.hint}>
                Kwadratowe zdjęcie wygląda najlepiej. Maksymalnie ok. 2–3 MB.
              </small>
            </div>
          )}
        </div>

        <div className={styles.basicInfoCol}>
          <div className={styles.inputBlock}>
            <label>
              <FaUserTie />
              <span>Rola</span>
            </label>

            {isEditing ? (
              <>
                <input
                  type="text"
                  className={`${styles.formInput} ${formErrors.role ? styles.inputError : ''}`}
                  value={editData.role || ''}
                  maxLength={40}
                  onChange={(e) => updateEditData('role', e.target.value)}
                  aria-invalid={!!formErrors.role}
                  placeholder="Np. DJ / Fryzjer / Grafik"
                />
                {formErrors.role && <small className={styles.error}>{formErrors.role}</small>}
              </>
            ) : (
              <p>{profile.role || 'Nie podano'}</p>
            )}
          </div>

          <div className={styles.inputBlock}>
            <label>
              <FaIdBadge />
              <span>Typ profilu</span>
            </label>

            {isEditing ? (
              <>
                <select
                  className={`${styles.formInput} ${formErrors.profileType ? styles.inputError : ''}`}
                  value={editData.profileType || ''}
                  onChange={(e) => updateEditData('profileType', e.target.value)}
                  aria-invalid={!!formErrors.profileType}
                >
                  <option value="">— wybierz —</option>
                  <option value="hobbystyczny">Hobby</option>
                  <option value="zawodowy">Zawód</option>
                  <option value="serwis">Serwis</option>
                  <option value="społeczność">Społeczność</option>
                </select>

                {formErrors.profileType && (
                  <small className={styles.error}>{formErrors.profileType}</small>
                )}
              </>
            ) : (
              <p>{profile.profileType || 'Nie podano'}</p>
            )}
          </div>

          <div className={styles.inputBlock}>
            <label>
              <FaMapMarkerAlt />
              <span>Lokalizacja</span>
            </label>

            {isEditing ? (
              <>
                <input
                  type="text"
                  className={`${styles.formInput} ${formErrors.location ? styles.inputError : ''}`}
                  value={editData.location || ''}
                  maxLength={30}
                  onChange={(e) => updateEditData('location', e.target.value)}
                  aria-invalid={!!formErrors.location}
                  placeholder="Np. Poznań / cała Polska"
                />
                {formErrors.location && (
                  <small className={styles.error}>{formErrors.location}</small>
                )}
              </>
            ) : (
              <p>{profile.location || 'Nie podano'}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BasicInfoSection;
