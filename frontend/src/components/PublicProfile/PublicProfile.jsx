import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styles from './PublicProfile.module.scss';
import { FaMapMarkerAlt, FaStar } from 'react-icons/fa';
import Calendar from 'react-calendar';
import { auth } from '../../firebase';
import 'react-calendar/dist/Calendar.css';

const PublicProfile = () => {
  const { slug } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [comment, setComment] = useState('');
  const maxChars = 100;

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

  useEffect(() => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId || !profile?.ratedBy) return;

    const userRating = profile.ratedBy.find(r => r.userId === currentUserId);
    if (userRating) {
      setHasRated(true);
      setSelectedRating(userRating.rating);
    }
  }, [profile]);

  useEffect(() => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId || !profile?.userId) return;
    setIsOwner(profile.userId === currentUserId);
    setHasRated(profile.ratedBy?.some(r => r.userId === currentUserId));
  }, [profile]);

  const tileDisabled = ({ date }) => {
    const formatted = date.toLocaleDateString('sv-SE');
    return !profile.availableDates.includes(formatted);
  };

  const handleRate = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return alert('Musisz być zalogowany, aby ocenić.');
    if (hasRated) return alert('Już oceniłeś ten profil.');
    if (!selectedRating) return alert('Wybierz liczbę gwiazdek.');

    if (comment.trim().length < 5)
      return alert('Komentarz musi mieć min. 5 znaków.');

    if (comment.length > maxChars) {
      alert(`Komentarz może mieć maksymalnie ${maxChars} znaków (obecnie: ${comment.length}).`);
      return;
    }

    try {
      const res = await fetch(`/api/profiles/rate/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, rating: selectedRating, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert('Dziękujemy za opinię!');
      const updated = await fetch(`/api/profiles/slug/${slug}`);
      const updatedData = await updated.json();
      setProfile(updatedData);
    } catch (err) {
      alert(`❌ ${err.message}`);
    }
  };

  if (loading) return <div className={styles.loading}>⏳ Wczytywanie wizytówki...</div>;
  if (!profile) return <div className={styles.error}>❌ Nie znaleziono wizytówki.</div>;

  const {
    name, avatar, role, rating, reviews, location, tags,
    priceFrom, priceTo, availableDates = [], description, links = [],
    profileType
  } = profile;

  return (
    <div className={styles.profileWrapper}>
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

          {links?.filter(link => link.trim() !== '').length > 0 ? (
            <ul className={styles.links}>
              {links.map((link, i) =>
                link.trim() ? (
                  <li key={i}>
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      🌐 Link {i + 1}
                    </a>
                  </li>
                ) : null
              )}
            </ul>
          ) : (
            <p className={styles.noDescription}>Użytkownik nie dodał jeszcze żadnych linków.</p>
          )}

          <div className={styles.separator} />

          {!isOwner && (
            <div className={styles.ratingSection}>
              <p>{hasRated ? 'Oceniłeś już ten profil:' : 'Oceń tę wizytówkę:'}</p>
              <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map(val => (
                  <FaStar
                    key={val}
                    className={
                      val <= (hoveredRating || selectedRating)
                        ? styles.starSelected
                        : styles.star
                    }
                    onClick={!hasRated ? () => setSelectedRating(val) : undefined}
                    onMouseEnter={!hasRated ? () => setHoveredRating(val) : undefined}
                    onMouseLeave={!hasRated ? () => setHoveredRating(0) : undefined}
                  />
                ))}
              </div>

              {!hasRated && (
                <>
                  <textarea
                    className={styles.commentInput}
                    placeholder="Dlaczego wystawiasz taką ocenę?"
                    value={comment}
                    onChange={(e) => {
                      const text = e.target.value;
                      if (text.length <= maxChars) {
                        setComment(text);
                      }
                    }}
                  />

                  <small className={styles.wordCounter}>
                    {comment.length} / {maxChars} znaków
                  </small>

                  <button className={styles.sendButton} onClick={handleRate}>
                    Wyślij opinię
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.reviewsBox}>
        <h3>🗣️ Opinie użytkowników</h3>
        {profile.ratedBy?.length > 0 ? (
          <ul className={styles.reviewsList}>
            {profile.ratedBy.map((op, i) => (
              <li key={i} className={styles.reviewItem}>
                <div className={styles.reviewHeader}>
                  <strong className={styles.reviewUser}>
                    {op.userName || 'Użytkownik'}
                  </strong>
                  <span className={styles.reviewRating}>
                    {[...Array(5)].map((_, idx) => (
                      <FaStar
                        key={idx}
                        className={idx < op.rating ? styles.starSelected : styles.star}
                      />
                    ))}
                  </span>
                </div>
                <p className={styles.reviewText}>{op.comment}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.noReviews}>Brak opinii</p>
        )}
      </div>
    </div>
  );
};

export default PublicProfile;
