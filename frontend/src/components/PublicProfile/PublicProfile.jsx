import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styles from './PublicProfile.module.scss';
import { FaMapMarkerAlt, FaStar, FaRegEye } from 'react-icons/fa';
import { auth } from '../../firebase';
import 'react-calendar/dist/Calendar.css';
import AlertBox from '../AlertBox/AlertBox';
import { useLocation } from 'react-router-dom';

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
  const [alert, setAlert] = useState(null);
  const maxChars = 100;
  const routerLocation = useLocation();

  const mapUnit = (unit) => {
    switch (unit) {
      case 'minutes': return 'min';
      case 'hours': return 'h';
      case 'days': return 'dni';
      default: return unit;
    }
  };

  useEffect(() => {
    const scrollTo = routerLocation.state?.scrollToId;
    if (!scrollTo || loading) return;

    const tryScroll = () => {
      const el = document.getElementById(scrollTo);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState({}, document.title, routerLocation.pathname);
      } else {
        requestAnimationFrame(tryScroll);
      }
    };

    requestAnimationFrame(tryScroll);
  }, [routerLocation.state, loading]);


  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/profiles/slug/${slug}`);

        if (res.status === 403) {
          setAlert({ type: 'error', message: 'Profil jest obecnie niewidoczny lub wygasł.' });
          setProfile(null); // profil nie będzie renderowany
          return;
        }

        if (!res.ok) throw new Error('Nie znaleziono wizytówki.');

        const data = await res.json();
        setProfile(data);
      } catch (err) {
        console.error('❌ Błąd:', err);
        setAlert({ type: 'error', message: 'Nie udało się załadować wizytówki.' });
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
    if (!userId) return setAlert({ type: 'error', message: 'Musisz być zalogowany, aby ocenić.' });
    if (hasRated) return setAlert({ type: 'info', message: 'Już oceniłeś/aś ten profil.' });
    if (!selectedRating) return setAlert({ type: 'warning', message: 'Wybierz liczbę gwiazdek.' });

    if (comment.trim().length < 10)
      return setAlert({ type: 'warning', message: 'Komentarz musi mieć min. 10 znaków.' });

    if (comment.length > maxChars) {
      return setAlert({
        type: 'error',
        message: `Komentarz może mieć maksymalnie ${maxChars} znaków (obecnie: ${comment.length}).`,
      });
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/profiles/rate/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, rating: selectedRating, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setAlert({ type: 'success', message: 'Dziękujemy za opinię!' });

      const updated = await fetch(`${process.env.REACT_APP_API_URL}/api/profiles/slug/${slug}`);
      const updatedData = await updated.json();
      setProfile(updatedData);
    } catch (err) {
      setAlert({ type: 'error', message: `${err.message}` });
    }
  };

  if (loading) return <div className={styles.loading}>⏳ Wczytywanie wizytówki...</div>;
  if (!profile) {
    return (
      <div className={styles.error}>
        {alert ? (
          <AlertBox
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        ) : (
          <div className={styles.errorBox}>
            <span className={styles.icon}>❌</span>
            <p>Nie znaleziono profilu lub jest obecnie niewidoczony.</p>
          </div>

        )}
      </div>
    );
  }

  const {
    name, avatar, role, rating, reviews, location, tags,
    priceFrom, priceTo, availableDates = [], description, links = [],
    profileType
  } = profile;

  return (
    <>
      <div id="profileWrapper" className={styles.profileWrapper}>
        {alert && (
          <AlertBox
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        <div className={styles.card}>
          <div className={styles.banner}>
            <div className={styles.bannerOverlay}></div>
            <div className={styles.bannerContent}>
              <p className={styles.bannerSubtitle}>Witaj na profilu</p>
              <h2 className={styles.bannerName}>{name}</h2>
              <p className={styles.bannerDesc}>
                Odkryj ofertę, zarezerwuj termin i poznaj bliżej
              </p>
            </div>

            <svg
              className={styles.bannerWave}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
            >
              <path
                fill="#ffffff"
                fillOpacity="1"
                d="M0,160L60,170.7C120,181,240,203,360,192C480,181,600,139,720,128C840,117,960,139,1080,154.7C1200,171,1320,181,1380,186.7L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
              ></path>
            </svg>
          </div>


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

              <div className={styles.separator} />

              {description?.trim() ? (
                <p className={styles.description}>{description}</p>
              ) : (
                <p className={styles.noDescription}>Użytkownik nie dodał jeszcze opisu.</p>
              )}
            </div>
          </div>

          <div className={styles.separator} />

          {tags?.length > 0 && (
            <div className={styles.tags}>
              {tags.map(tag => (
                <span key={tag} className={styles.tag}>{tag.toUpperCase()}</span>
              ))}
            </div>
          )}

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
              <p className={styles.noLinks}>Użytkownik nie dodał jeszcze żadnych linków.</p>
            )}

            {!isOwner && (
              <div className={styles.ratingSection}>
                <div className={styles.separator} />
                <p>{hasRated ? 'Oceniłeś/aś już ten profil:' : 'Oceń tę wizytówkę:'}</p>
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
          <div className={styles.visits}>
            <FaRegEye />
            <span>
              Ten profil odwiedzono <strong>{profile?.visits ?? 0}</strong> razy
            </span>
          </div>
        </div>

<div className={styles.reviewsBox}>
  <div className={styles.reviewsBanner}>
    <div className={styles.reviewsBannerOverlay}></div>
    <div className={styles.reviewsBannerContent}>
      <h3 className={styles.reviewsBannerTitle}>Opinie użytkowników</h3>
      <p className={styles.reviewsBannerDesc}>Sprawdź, co inni sądzą o tym profilu!</p>
    </div>
    <svg className={styles.reviewsWave} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" preserveAspectRatio="none">
      <path fill="#ffffff" d="M0,160L60,170.7C120,181,240,203,360,192C480,181,600,139,720,128C840,117,960,139,1080,154.7C1200,171,1320,181,1380,186.7L1440,192L1440,320L0,320Z"/>
    </svg>
  </div>

  <div className={styles.reviewsBody}>
    {profile.ratedBy?.length > 0 ? (
      <ul className={styles.reviewsList}>
        {profile.ratedBy.map((op, i) => {
          const ratingVal = Number(op.rating);
          return (
            <li key={i} className={styles.reviewItem}>
              <div className={styles.reviewHeader}>
                <strong className={styles.reviewUser}>{op.userName || 'Użytkownik'}</strong>
                <span className={styles.reviewRating}>
                  {[...Array(5)].map((_, idx) => (
                    <FaStar key={idx} className={idx < ratingVal ? styles.starSelected : styles.star}/>
                  ))}
                </span>
              </div>
              <p className={styles.reviewText}>{op.comment}</p>
            </li>
          );
        })}
      </ul>
    ) : (
      <p className={styles.noReviews}>Brak opinii użytkowników</p>
    )}
  </div>
</div>


      </div>

      {profile.photos?.length > 0 && (
        <div className={styles.galleryWrapper}>
          <div className={styles.galleryHeader}>
            <h2>Galeria użytkownika {name}</h2>
            <p>Rzuć okiem na to, czym się zajmuje ten użytkownik — zdjęcia mówią więcej niż słowa!</p>
          </div>
          <div className={styles.carousel}>
            {profile.photos.map((url, i) => (
              <div key={i} className={styles.slide}>
                <img src={url} alt={`Zdjęcie ${i + 1}`} />
              </div>
            ))}
          </div>
        </div>
      )}
      {/* ===== Sekcja usług użytkownika ===== */}
      {profile.services?.length > 0 && (
        <div className={styles.servicesWrapper}>           {/* nowy wrapper */}
          <section className={styles.servicesSection} id="services">
            <h3>Usługi <span className={styles.spanName}>{name}</span></h3>
            {profile.services.length > 0 ? (
              <ul className={styles.servicesList}>
                {profile.services.map((s, i) => (
                  <li key={i}>
                    <span className={styles.serviceName}>{s.name}</span>
                    <span className={styles.serviceDuration}>
                      — {s.duration.value} {mapUnit(s.duration.unit)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.noDescription}>
                Użytkownik nie dodał jeszcze żadnych usług.
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
};

export default PublicProfile;
