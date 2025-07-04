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
  FaCheckCircle,
  FaBriefcase
} from 'react-icons/fa';

const YourProfile = ({ user }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`/api/profiles/by-user/${user.uid}`);
      const profile = res.data;

      // Lokalna walidacja daty ważności
      const now = new Date();
      const until = new Date(profile.visibleUntil);
      if (until < now) {
        profile.isVisible = false;
      }

      setProfile(profile);
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        console.error('Błąd podczas pobierania profilu:', err);
      }
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
      await fetchProfile(); // odśwież dane po przedłużeniu
    } catch (err) {
      console.error('❌ Błąd przedłużania widoczności:', err);
      alert('Nie udało się przedłużyć widoczności.');
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
          <p>🔒 Twoja wizytówka jest obecnie <strong>niewidoczna</strong>.</p>
          <p>Wygasła dnia: <strong>{new Date(profile.visibleUntil).toLocaleDateString()}</strong></p>
          <button onClick={handleExtendVisibility}>Przedłuż widoczność</button>
        </div>
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
          <p><FaMapMarkerAlt /> <strong>Lokalizacja:</strong> {profile.location}</p>
          <p><FaMoneyBillWave /> <strong>Cennik:</strong>{' '}
            {profile.priceFrom && profile.priceTo ? (
              <>
                od <strong>{profile.priceFrom} zł</strong> do <strong>{profile.priceTo} zł</strong>
              </>
            ) : (
              <em> Brak danych</em>
            )}
          </p>

          <p><FaCalendarAlt /> <strong>Dostępność:</strong>{' '}
            <span className={profile.available ? styles.available : styles.unavailable}>
              {profile.available ? 'Tak' : 'Nie'}
            </span>
          </p>
          <p><FaCalendarAlt /> <strong>Data dostępności:</strong> {profile.availabilityDate}</p>
          <p><FaInfoCircle /> <strong>Opis:</strong><br /> {profile.description || 'Brak opisu.'}</p>

          {profile.hasBusiness && (
            <p><FaBriefcase /> <strong>Działalność gospodarcza:</strong> Tak (NIP: {profile.nip || 'brak'})</p>
          )}

          <p><FaTags /> <strong>Tagi:</strong>{' '}
            <span className={styles.tags}>
              {profile.tags.map(tag => (
                <span key={tag}>{tag.toUpperCase()}</span>
              ))}
            </span>
          </p>

          {profile.links?.length > 0 && (
            <p><FaLink /> <strong>Linki:</strong>
              <ul className={styles.links}>
                {profile.links.filter(l => l).map((link, i) => (
                  <li key={i}><a href={link} target="_blank" rel="noopener noreferrer">{link}</a></li>
                ))}
              </ul>
            </p>
          )}

          <p><FaStar /> <strong>Ocena:</strong> {profile.rating} ⭐ ({profile.reviews} opinii)</p>
        </div>
      </div>
    </div>
  );
};

export default YourProfile;
