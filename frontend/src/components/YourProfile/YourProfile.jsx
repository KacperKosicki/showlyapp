import { useEffect, useState } from 'react';
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

const YourProfile = ({ user }) => {
  const [profile, setProfile] = useState(null);
  const [editData, setEditData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

  const handleExtendVisibility = async () => {
    try {
      await axios.patch(`/api/profiles/extend/${user.uid}`);
      await fetchProfile();
    } catch (err) {
      console.error('❌ Błąd przedłużania widoczności:', err);
      alert('Nie udało się przedłużyć widoczności.');
    }
  };

  const handleSaveChanges = async () => {
    try {
      await axios.patch(`/api/profiles/update/${user.uid}`, editData);
      await fetchProfile();
      setIsEditing(false);
      alert("✅ Zapisano zmiany");
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

      {!isEditing && (
        <button onClick={() => setIsEditing(true)} className={styles.editButton}>
          ✏️ Edytuj profil
        </button>
      )}

      <div className={styles.card}>
        <div className={styles.left}>
          <img
            src={profile.avatar || '/images/default-avatar.png'}
            alt="Avatar"
            className={styles.avatar}
          />
        </div>
        <div className={styles.right}>
          <h3>{profile.name}</h3>

          <p><FaUserTie /> <strong>Rola:</strong> {profile.role}</p>

          <p><FaIdBadge /> <strong>Typ profilu:</strong> {profile.profileType}</p>

          <p><FaMapMarkerAlt /> <strong>Lokalizacja:</strong>{' '}
            {isEditing ? (
              <input
                type="text"
                className={styles.formInput}
                value={editData.location || ''}
                onChange={(e) => setEditData({ ...editData, location: e.target.value })}
              />

            ) : profile.location}
          </p>

          <p><FaMoneyBillWave /> <strong>Cennik:</strong>{' '}
            {isEditing ? (
              <>
                od <input
                  type="number"
                  className={styles.formInput}
                  value={editData.priceFrom || ''}
                  onChange={(e) => setEditData({ ...editData, priceFrom: e.target.value })}
                /> do <input
                  type="number"
                  className={styles.formInput}
                  value={editData.priceTo || ''}
                  onChange={(e) => setEditData({ ...editData, priceTo: e.target.value })}
                /> zł

              </>
            ) : (
              profile.priceFrom && profile.priceTo ? (
                <>od <strong>{profile.priceFrom} zł</strong> do <strong>{profile.priceTo} zł</strong></>
              ) : <em> Brak danych</em>
            )}
          </p>

          <p><FaCalendarAlt /> <strong>Data dostępności:</strong>{' '}
            {isEditing ? (
              <input
                type="date"
                className={styles.formInput}
                value={editData.availabilityDate?.slice(0, 10) || ''}
                onChange={(e) => setEditData({ ...editData, availabilityDate: e.target.value })}
              />

            ) : profile.availabilityDate}
          </p>

          <p><FaInfoCircle /> <strong>Opis:</strong><br />
            {isEditing ? (
              <textarea
                value={editData.description || ''}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                rows={4}
              />
            ) : (profile.description || 'Brak opisu.')}
          </p>

          {profile.hasBusiness && (
            <p><FaBriefcase /> <strong>Działalność gospodarcza:</strong> Tak (NIP: {profile.nip || 'brak'})</p>
          )}

          <p><FaTags /> <strong>Tagi:</strong></p>
          {isEditing ? (
            <div className={styles.tagsWrapper}>
              {[0, 1, 2].map(i => (
                <input
                  key={i}
                  type="text"
                  className={styles.formInput}
                  value={editData.tags?.[i] || ''}
                  placeholder={`Tag ${i + 1}`}
                  onChange={(e) => {
                    const newTags = [...(editData.tags || [])];
                    newTags[i] = e.target.value;
                    setEditData({ ...editData, tags: newTags });
                  }}
                />
              ))}
            </div>
          ) : (
            <span className={styles.tags}>
              {profile.tags.map(tag => (
                <span key={tag}>{tag.toUpperCase()}</span>
              ))}
            </span>
          )}


          <p><FaLink /> <strong>Linki:</strong></p>
          {isEditing ? (
            <div className={styles.linksWrapper}>
              {[0, 1, 2].map(i => (
                <input
                  key={i}
                  type="text"
                  className={styles.formInput}
                  value={editData.links?.[i] || ''}
                  placeholder={`Link ${i + 1}`}
                  onChange={(e) => {
                    const newLinks = [...(editData.links || [])];
                    newLinks[i] = e.target.value;
                    setEditData({ ...editData, links: newLinks });
                  }}
                />
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
