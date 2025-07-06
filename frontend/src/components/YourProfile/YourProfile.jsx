// YourProfile.jsx (zmieniony JSX z nowym układem)
import { useEffect, useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import styles from './YourProfile.module.scss';
import {
  FaMapMarkerAlt,
  FaTags,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaStar,
  FaUserTie,
  FaLink,
  FaIdBadge,
  FaInfoCircle,
  FaBriefcase
} from 'react-icons/fa';

const YourProfile = ({ user, setRefreshTrigger }) => {
  const [profile, setProfile] = useState(null);
  const [editData, setEditData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const fileInputRef = useRef(null);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`/api/profiles/by-user/${user.uid}`);
      const profile = res.data;
      const now = new Date();
      const until = new Date(profile.visibleUntil);
      if (until < now) profile.isVisible = false;
      setProfile(profile);
      setEditData(profile);
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
      else console.error('Błąd podczas pobierania profilu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.uid) return;
    fetchProfile();
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData({ ...editData, avatar: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const validateEditData = (data) => {
    const errors = {};
    if (!data.name?.trim() || data.name.length > 30) errors.name = 'Podaj nazwę (maks. 30 znaków)';
    if (!data.role?.trim() || data.role.length > 40) errors.role = 'Podaj rolę (maks. 40 znaków)';
    if (!data.location?.trim() || data.location.length > 30) errors.location = 'Podaj lokalizację (maks. 30 znaków)';
    const nonEmptyTags = (data.tags || []).filter(tag => tag.trim() !== '');
    if (nonEmptyTags.length === 0) errors.tags = 'Podaj przynajmniej 1 tag';
    if (data.description?.length > 500) errors.description = 'Opis nie może przekraczać 500 znaków';
    if (!data.profileType) errors.profileType = 'Wybierz typ profilu';
    const priceFrom = Number(data.priceFrom);
    const priceTo = Number(data.priceTo);
    if (!priceFrom || priceFrom < 1 || priceFrom > 100000) errors.priceFrom = 'Cena od musi być w zakresie 1–100 000';
    if (!priceTo || priceTo < priceFrom || priceTo > 1000000) errors.priceTo = 'Cena do musi być większa niż "od" i nie większa niż 1 000 000';
    return errors;
  };

  const handleExtendVisibility = async () => {
    try {
      await axios.patch(`/api/profiles/extend/${user.uid}`);
      await fetchProfile();
      setRefreshTrigger(Date.now()); // 👈 DODAĆ TO
    } catch (err) {
      console.error('❌ Błąd przedłużania widoczności:', err);
      alert('Nie udało się przedłużyć widoczności.');
    }
  };


  const handleSaveChanges = async () => {
    const errors = validateEditData(editData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      alert('❌ Uzupełnij poprawnie wszystkie wymagane pola.');
      return;
    }
    try {
      await axios.patch(`/api/profiles/update/${user.uid}`, {
        ...editData,
        tags: (editData.tags || []).filter(tag => tag.trim() !== ''),
      });
      await fetchProfile();
      setIsEditing(false);
      alert('✅ Zapisano zmiany');
    } catch (err) {
      console.error('❌ Błąd zapisu profilu:', err);
      alert('Błąd zapisu.');
    }
  };

  if (!user) return <Navigate to="/login" replace />;
  if (loading) return <p className={styles.loading}>⏳ Ładowanie profilu...</p>;
  if (notFound) {
    return (
      <div className={styles.noProfile}>
        <p>Nie masz jeszcze wizytówki.</p>
        <a href="/create-profile" className={styles.createLink}>Stwórz swoją wizytówkę</a>
      </div>
    );
  }

  return (
    <div className={styles.profile}>
      <h2>Twoja wizytówka</h2>

      {!profile.isVisible && (
        <div className={styles.expiredNotice}>
          <p>🔒 Twoja wizytówka jest <strong>niewidoczna</strong>.</p>
          <p>Wygasła: <strong>{new Date(profile.visibleUntil).toLocaleDateString()}</strong></p>
          <button onClick={handleExtendVisibility}>Przedłuż widoczność</button>
        </div>
      )}

      <div className={styles.card}>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className={styles.editTopRight}>
            ✏️ Edytuj profil
          </button>
        )}
        <div className={styles.avatarTop}>
          <div
            className={styles.avatarWrapper}
            onClick={() => isEditing && fileInputRef.current.click()}
            style={{ cursor: isEditing ? 'pointer' : 'default' }}
          >
            <img
              src={isEditing ? editData.avatar : profile.avatar || '/images/default-avatar.png'}
              alt="Avatar"
              className={styles.avatar}
            />
            {isEditing && <div className={styles.avatarOverlay}>Kliknij zdjęcie, aby zmienić</div>}
          </div>
          {isEditing && (
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
          )}
        </div>

        <div className={styles.right}>
          <h3>{profile.name}</h3>

          <h4 className={styles.sectionTitle}>1. Dane podstawowe</h4>

          <div className={styles.inputBlock}>
            <label><FaUserTie /> <strong>Rola:</strong></label>
            <p>{profile.role}</p>
          </div>

          <div className={styles.inputBlock}>
            <label><FaIdBadge /> <strong>Typ profilu:</strong></label>
            {isEditing ? (
              <>
                <select
                  className={styles.formInput}
                  value={editData.profileType || ''}
                  onChange={(e) => setEditData({ ...editData, profileType: e.target.value })}
                >
                  <option value="hobbystyczny">Hobby</option>
                  <option value="zawodowy">Zawód</option>
                  <option value="serwis">Serwis</option>
                  <option value="społeczność">Społeczność</option>
                </select>
                {formErrors.profileType && <small className={styles.error}>{formErrors.profileType}</small>}
              </>
            ) : (
              <p>{profile.profileType}</p>
            )}
          </div>

          <div className={styles.inputBlock}>
            <label><FaMapMarkerAlt /> <strong>Lokalizacja:</strong></label>
            {isEditing ? (
              <>
                <input
                  type="text"
                  className={styles.formInput}
                  value={editData.location || ''}
                  onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                />
                {formErrors.location && <small className={styles.error}>{formErrors.location}</small>}
              </>
            ) : (
              <p>{profile.location}</p>
            )}
          </div>

          <h4 className={styles.sectionTitle}>2. Wygląd i opis</h4>
          <div className={styles.descriptionBlock}>
            <div className={styles.descriptionHeader}>
              <FaInfoCircle />
              <strong>Opis:</strong>
            </div>
            {isEditing ? (
              <>
                <textarea
                  value={editData.description || ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={4}
                  className={styles.formTextarea}
                  maxLength={500} // ✅ OGRANICZENIE
                />
                <small>{editData.description?.length || 0}/500 znaków</small>
                {formErrors.description && <small className={styles.error}>{formErrors.description}</small>}
              </>
            ) : (

              <p className={styles.descriptionText}>
                {profile.description || 'Brak opisu.'}
              </p>
            )}
          </div>

          <h4 className={styles.sectionTitle}>3. Dostępność i usługi</h4>
          <div className={styles.pricingBlock}>
            <p><FaMoneyBillWave /> <strong>Cennik:</strong></p>
            {isEditing ? (
              <>
                <label>
                  od:
                  <input type="number" className={styles.formInput} value={editData.priceFrom || ''} onChange={(e) => setEditData({ ...editData, priceFrom: e.target.value })} />
                  {formErrors.priceFrom && <small className={styles.error}>{formErrors.priceFrom}</small>}
                </label>
                <label>
                  do:
                  <input type="number" className={styles.formInput} value={editData.priceTo || ''} onChange={(e) => setEditData({ ...editData, priceTo: e.target.value })} />
                  {formErrors.priceTo && <small className={styles.error}>{formErrors.priceTo}</small>}
                </label>
              </>
            ) : (
              <>
                <p><strong>od:</strong> {profile.priceFrom} zł</p>
                <p><strong>do:</strong> {profile.priceTo} zł</p>
              </>
            )}
          </div>

          <div className={styles.inputBlock}>
            <label><FaCalendarAlt /> <strong>Data dostępności:</strong></label>
            {isEditing ? (
              <input
                type="date"
                className={styles.formInput}
                value={editData.availabilityDate?.slice(0, 10) || ''}
                onChange={(e) => setEditData({ ...editData, availabilityDate: e.target.value })}
              />
            ) : (
              <p>{profile.availabilityDate}</p>
            )}
          </div>

          <h4 className={styles.sectionTitle}>4. Linki i media</h4>

          <div className={styles.inputBlock}>
            <label><FaTags /> <strong>Tagi:</strong></label>
            {isEditing ? (
              <div className={styles.tagsWrapper}>
                {[0, 1, 2].map(i => (
                  <input key={i} type="text" className={styles.formInput} value={editData.tags?.[i] || ''} placeholder={`Tag ${i + 1}`} onChange={(e) => {
                    const newTags = [...(editData.tags || [])];
                    newTags[i] = e.target.value;
                    setEditData({ ...editData, tags: newTags });
                  }} />
                ))}
                {formErrors.tags && <small className={styles.error}>{formErrors.tags}</small>}
              </div>
            ) : (
              <span className={styles.tags}>
                {profile.tags.map(tag => (
                  <span key={tag}>{tag.toUpperCase()}</span>
                ))}
              </span>
            )}
          </div>

          <div className={styles.inputBlock}>
            <label><FaLink /> <strong>Linki:</strong></label>
            {isEditing ? (
              <div className={styles.linksWrapper}>
                {[0, 1, 2].map(i => (
                  <input key={i} type="text" className={styles.formInput} value={editData.links?.[i] || ''} placeholder={`Link ${i + 1}`} onChange={(e) => {
                    const newLinks = [...(editData.links || [])];
                    newLinks[i] = e.target.value;
                    setEditData({ ...editData, links: newLinks });
                  }} />
                ))}
              </div>
            ) : profile.links?.length > 0 && (
              <div className={styles.linkSection}>
                <div className={styles.links}>
                  {profile.links.filter(l => l).map((link, i) => (
                    <a key={i} href={link} target="_blank" rel="noopener noreferrer">{link}</a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <h4 className={styles.sectionTitle}>5. Informacje dodatkowe</h4>
          {profile.hasBusiness && (
            <p><FaBriefcase /> <strong>Działalność gospodarcza:</strong> Tak (NIP: {profile.nip || 'brak'})</p>
          )}
          <p><FaStar /> <strong>Ocena:</strong> {profile.rating} ⭐ ({profile.reviews} opinii)</p>

          {isEditing && (
            <div className={styles.editButtons}>
              <button onClick={handleSaveChanges}>💾 Zapisz</button>
              <button onClick={() => setIsEditing(false)}>❌ Anuluj</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

};

export default YourProfile;
