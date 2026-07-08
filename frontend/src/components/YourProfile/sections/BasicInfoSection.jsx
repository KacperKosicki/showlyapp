import styles from "./BasicInfoSection.module.scss";
import { FaIdBadge, FaImage, FaMapMarkerAlt, FaUserTie } from 'react-icons/fa';

const BasicInfoSection = ({
  profile,
  editData,
  isEditing,
  formErrors,
  hasAvatarNow,
  hasBannerNow,
  fileInputRef,
  bannerInputRef,
  getAvatarUrl,
  getBannerUrl,
  onEditDataChange,
  onImageChange,
  onBannerChange,
  onRemoveAvatar,
  onRemoveBanner,
  canUseBanner,
  bannerUploading,
  onStartSubscription,
  billingActionLoading,
}) => {
  const currentData = isEditing ? editData : profile;
  const bannerUrl = getBannerUrl(currentData);

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
            {'To pierwsze informacje, kt\u00f3re widz\u0105 u\u017cytkownicy po wej\u015bciu na Twoj\u0105 wizyt\u00f3wk\u0119.'}
          </p>
        </div>

        <div className={styles.sectionBadge}>
          <FaIdBadge />
          <span>Start</span>
        </div>
      </div>

      <div className={styles.basicInfoRow}>
        <div className={styles.avatarColumn}>
          <div className={styles.bannerPreview}>
            {bannerUrl ? (
              <img src={bannerUrl} alt="Banner profilu" className={styles.bannerImage} />
            ) : (
              <div className={styles.bannerEmpty}>
                <FaImage />
                <span>Banner profilu</span>
              </div>
            )}
          </div>

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
                {'Wybierz zdj\u0119cie'}
              </label>

              {hasAvatarNow && (
                <button
                  type="button"
                  className={styles.danger}
                  onClick={onRemoveAvatar}
                >
                  {'Usu\u0144 zdj\u0119cie'}
                </button>
              )}

              <small className={styles.hint}>
                {'Kwadratowe zdj\u0119cie wygl\u0105da najlepiej. Maksymalnie ok. 2-3 MB.'}
              </small>

              <div className={styles.bannerControls}>
                {canUseBanner ? (
                  <>
                    <label className={styles.fileBtn}>
                      <input
                        type="file"
                        accept="image/*,heic,heif"
                        ref={bannerInputRef}
                        onChange={onBannerChange}
                        disabled={bannerUploading}
                      />
                      {bannerUploading ? 'Zapisywanie...' : 'Wybierz banner'}
                    </label>

                    {hasBannerNow && (
                      <button
                        type="button"
                        className={styles.danger}
                        onClick={onRemoveBanner}
                        disabled={bannerUploading}
                      >
                        {'Usu\u0144 banner'}
                      </button>
                    )}

                    <small className={styles.hint}>
                      {'Najlepiej sprawdza si\u0119 szerokie zdj\u0119cie, np. 1800 x 720 px.'}
                    </small>
                  </>
                ) : (
                  <div className={styles.bannerLocked}>
                    <strong>{'Banner jest dost\u0119pny w planie Standard i Premium.'}</strong>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => onStartSubscription?.('standard')}
                      disabled={!!billingActionLoading}
                    >
                      {'W\u0142\u0105cz Standard'}
                    </button>
                  </div>
                )}
              </div>
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
                  <option value="">{'\u2014 wybierz \u2014'}</option>
                  <option value="hobbystyczny">Hobby</option>
                  <option value="zawodowy">{'Zaw\u00f3d'}</option>
                  <option value="serwis">Serwis</option>
                  <option value={'spo\u0142eczno\u015b\u0107'}>{'Spo\u0142eczno\u015b\u0107'}</option>
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
                  placeholder={'Np. Pozna\u0144 / ca\u0142a Polska'}
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
