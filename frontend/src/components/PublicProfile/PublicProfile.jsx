import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styles from './PublicProfile.module.scss';
import { FaMapMarkerAlt, FaStar } from 'react-icons/fa';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const PublicProfile = () => {
  const { slug } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/profiles/slug/${slug}`);
        if (!res.ok) throw new Error('Nie znaleziono wizytówki.');
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        console.error('❌ Błąd:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [slug]);

  if (loading) return <div className={styles.loading}>⏳ Wczytywanie wizytówki...</div>;
  if (!profile) return <div className={styles.error}>❌ Nie znaleziono wizytówki.</div>;

  const {
    name, avatar, role, rating, reviews, location, tags,
    priceFrom, priceTo, availableDates = [], description, links = [],
    profileType
  } = profile;

  const tileDisabled = ({ date }) => {
    const formatted = date.toLocaleDateString('sv-SE');
    return !availableDates.includes(formatted);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.topBar}>
          <div className={styles.location}>
            <FaMapMarkerAlt />
            <span>{location}</span>
          </div>
          <div className={styles.rating}>
            <FaStar />
            <span>{rating} <small>({reviews})</small></span>
          </div>
        </div>

        <div className={styles.top}>
          <img src={avatar} alt={name} className={styles.avatar} />
          <div className={styles.info}>
            <span className={`${styles.badge} ${styles[profileType]}`}>
              {profileType === 'zawodowy' && 'Zawód'}
              {profileType === 'hobbystyczny' && 'Hobby'}
              {profileType === 'serwis' && 'Serwis'}
              {profileType === 'społeczność' && 'Społeczność'}
            </span>

            <h2>{name}</h2>
            <p className={styles.role}>{role}</p>
            {description?.trim() ? (
              <p className={styles.description}>{description}</p>
            ) : (
              <p className={styles.noDescription}>Użytkownik nie dodał jeszcze opisu.</p>
            )}
          </div>
        </div>

        {tags?.length > 0 && (
          <div className={styles.tags}>
            {tags.map(tag => (
              <span key={tag} className={styles.tag}>{tag.toUpperCase()}</span>
            ))}
          </div>
        )}

        <div className={styles.separator} />

        <div className={styles.details}>
          {priceFrom && priceTo ? (
            <p className={styles.price}>
              Cennik od <strong>{priceFrom} zł</strong> do <strong>{priceTo} zł</strong>
            </p>
          ) : (
            <p className={styles.price}>
              <em>Cennik: brak danych</em>
            </p>
          )}

          <button
            className={styles.calendarToggle}
            onClick={() => setShowCalendar(prev => !prev)}
          >
            📅 Zobacz dostępne dni
          </button>

          {showCalendar && (
            <Calendar
              tileDisabled={tileDisabled}
              locale="pl-PL"
              className={styles.calendar}
            />
          )}

          {links?.length > 0 && (
            <ul className={styles.links}>
              {links.map((link, i) =>
                link ? (
                  <li key={i}>
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      🌐 Link {i + 1}
                    </a>
                  </li>
                ) : null
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;
