import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styles from './PublicProfile.module.scss';
import { FaMapMarkerAlt, FaStar, FaRegEye } from 'react-icons/fa';
import { FaHeart, FaRegHeart } from 'react-icons/fa6';
import { auth } from '../../firebase';
import 'react-calendar/dist/Calendar.css';
import AlertBox from '../AlertBox/AlertBox';
import { useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';

const prettyUrl = (url) => {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
    const qs = u.search || '';
    return `${host}${path}${qs}`;
  } catch {
    return url;
  }
};

const PublicProfile = () => {
  const { slug } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [comment, setComment] = useState('');
  const [alert, setAlert] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [uid, setUid] = useState(auth.currentUser?.uid ?? null);
  const maxChars = 200;
  const routerLocation = useLocation();

  const mapUnit = (unit) => {
    switch (unit) {
      case 'minutes': return 'min';
      case 'hours': return 'h';
      case 'days': return 'dni';
      default: return unit;
    }
  };

  const [favCount, setFavCount] = useState(0);
  const [isFav, setIsFav] = useState(false);

  // 🔄 Synchronizacja po pobraniu profilu
  useEffect(() => {
    if (!profile) return;
    if (typeof profile.favoritesCount === 'number') setFavCount(profile.favoritesCount);
    setIsFav(!!profile.isFavorite);
  }, [profile]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return unsub;
  }, []);

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
        const headers = uid ? { uid } : {};
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/profiles/slug/${slug}`, { headers });

        if (res.status === 403) {
          setAlert({ type: 'error', message: 'Profil jest obecnie niewidoczny lub wygasł.' });
          setProfile(null);
          return;
        }

        if (!res.ok) throw new Error('Nie znaleziono wizytówki.');

        const data = await res.json();
        setProfile(data);

        // 🟩 DODAJ TE 2 LINIE:
        if (typeof data.favoritesCount === 'number') setFavCount(data.favoritesCount);
        if (typeof data.isFavorite === 'boolean') setIsFav(data.isFavorite);

      } catch (err) {
        console.error('❌ Błąd:', err);
        setAlert({ type: 'error', message: 'Nie udało się załadować wizytówki.' });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [slug, uid]); // 🟩 ważne: dodaj uid!

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

  const toggleFavorite = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setAlert({ type: 'error', message: 'Aby dodać do ulubionych, musisz być zalogowany.' });
      return;
    }
    if (currentUser.uid === profile?.userId) {
      setAlert({ type: 'error', message: 'Nie możesz dodać własnego profilu do ulubionych.' });
      return;
    }

    const next = !isFav;
    setIsFav(next);
    setFavCount(c => Math.max(0, c + (next ? 1 : -1)));

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/favorites/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          uid: currentUser.uid
        },
        body: JSON.stringify({ profileUserId: profile.userId })
      });
      const data = await res.json();
      if (typeof data?.isFav === 'boolean') setIsFav(data.isFav);
      if (typeof data?.count === 'number') setFavCount(data.count);
    } catch {
      // revert na błędzie
      setIsFav(v => !v);
      setFavCount(c => Math.max(0, c + (next ? -1 : +1)));
      setAlert({ type: 'error', message: 'Nie udało się zaktualizować ulubionych. Spróbuj ponownie.' });
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
    priceFrom, priceTo = [], description, links = [],
    profileType
  } = profile;

  const hasGallery = Array.isArray(profile.photos) && profile.photos.length > 0;
  const hasServices = Array.isArray(profile.services) && profile.services.length > 0;
  const needsBottomSpace = !(hasGallery || hasServices);

  const cleanLinks = (links || [])
    .map(l => (l || '').trim())
    .filter(Boolean);

  return (
    <>
      <div
        id="profileWrapper"
        className={`${styles.profileWrapper} ${needsBottomSpace ? styles.spaciousBottom : ''}`}
      >
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
              <h3 className={styles.bannerTitle}>Witaj na profilu {name}</h3>
              <p className={styles.bannerDesc}>
                Profil, który mówi sam za siebie — sprawdź szczegóły!
              </p>
            </div>

            <svg
              className={styles.bannerWave}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
              style={{ display: 'block', transform: 'translateZ(0)' }}   // anty-hairline
            >
              <path fill="#ffffff" stroke="none" d="M0,160L60,170.7C120,181,240,203,360,192C480,181,600,139,720,128C840,117,960,139,1080,154.7C1200,171,1320,181,1380,186.7L1440,192L1440,320L0,320Z" />
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

            {cleanLinks.length > 0 ? (
              <ul className={styles.links}>
                {cleanLinks.map((link, i) => (
                  <li key={`${link}-${i}`}>
                    <a href={link} target="_blank" rel="noopener noreferrer" title={link}>
                      {prettyUrl(link)}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.noLinks}>Użytkownik nie dodał jeszcze żadnych linków.</p>
            )}


            {!isOwner && (
              <div className={styles.ratingSection}>
                <div className={styles.separator} />
                <p>{hasRated ? 'Oceniłeś/aś już ten profil:' : 'Oceń ten profil:'}</p>
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

          <div className={styles.separator} />

          <div className={styles.bottomMeta}>
            <div className={styles.visits}>
              <FaRegEye />
              <span>Ten profil odwiedzono <strong>{profile?.visits ?? 0}</strong> razy</span>
            </div>

            <button
              type="button"
              className={`${styles.favoritesBtn} ${isFav ? styles.active : ''}`}
              onClick={toggleFavorite}
              aria-label={isFav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
              title={isFav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
            >
              <span className={styles.favLabel}>
                Ulubione: <strong>{favCount}</strong>
              </span>
              {isFav ? <FaHeart className={styles.heartFilled} /> : <FaRegHeart className={styles.heart} />}
            </button>
          </div>

        </div>

        <div className={styles.reviewsBox}>
          <div className={styles.reviewsBanner}>
            <div className={styles.bannerOverlay}></div>
            <div className={styles.bannerContent}>
              <h3 className={styles.bannerTitle}>Opinie profilu {name}</h3>
              <p className={styles.bannerDesc}>Sprawdź, co inni sądzą o tym profilu!</p>
            </div>
            <svg className={styles.bannerWave} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" preserveAspectRatio="none">
              <path fill="#ffffff" d="M0,160L60,170.7C120,181,240,203,360,192C480,181,600,139,720,128C840,117,960,139,1080,154.7C1200,171,1320,181,1380,186.7L1440,192L1440,320L0,320Z" />
            </svg>
          </div>

          <div className={styles.reviewsBody}>
            {profile.ratedBy?.length > 0 ? (
<ul className={styles.reviewsList}>
  {profile.ratedBy.map((op, i) => {
    const ratingVal = Number(op.rating);
    const avatarSrc = op.userAvatar && op.userAvatar.trim()
      ? op.userAvatar
      : '/images/other/no-image.png'; // fallback

    const dateLabel = op.createdAt
      ? new Date(op.createdAt).toLocaleDateString('pl-PL', { year: 'numeric', month: 'short', day: 'numeric' })
      : '';

    return (
      <li key={i} className={styles.reviewItem}>
        <div className={styles.reviewHeader}>
          <div className={styles.reviewUserBox}>
            <img className={styles.reviewAvatar} src={avatarSrc} alt="" />
            <div className={styles.reviewUserMeta}>
              <strong className={styles.reviewUser}>{op.userName || 'Użytkownik'}</strong>
              {dateLabel && <span className={styles.reviewDate}>{dateLabel}</span>}
            </div>
          </div>

          <span className={styles.reviewRating}>
            {[...Array(5)].map((_, idx) => (
              <FaStar key={idx} className={idx < ratingVal ? styles.starSelected : styles.star} />
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
        <section className={styles.galleryBox}>
          <div className={styles.galleryBanner}>
            <div className={styles.bannerOverlay}></div>
            <div className={styles.bannerContent}>
              <h3 className={styles.bannerTitle}>Galeria profilu {name}</h3>
              <p className={styles.bannerDesc}>Zobacz efekty pracy i inspiracje — obrazy mówią więcej niż słowa!</p>
            </div>
            <svg
              className={styles.bannerWave}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
            >
              <path
                fill="#ffffff"
                d="M0,160L60,170.7C120,181,240,203,360,192C480,181,600,139,720,128C840,117,960,139,1080,154.7C1200,171,1320,181,1380,186.7L1440,192L1440,320L0,320Z"
              />
            </svg>
          </div>

          <div className={styles.galleryBody}>
            <div className={styles.galleryGrid}>
              {profile.photos.map((url, i) => (
                <div
                  key={i}
                  className={styles.galleryItem}
                  onClick={() => setFullscreenImage(url)}
                >
                  <img src={url} alt={`Zdjęcie ${i + 1}`} />
                </div>
              ))}
            </div>
          </div>

          {fullscreenImage && (
            <div className={styles.lightbox} onClick={() => setFullscreenImage(null)}>
              <img src={fullscreenImage} alt="Podgląd zdjęcia" />
            </div>
          )}
        </section>
      )}

      {/* ===== Sekcja usług użytkownika ===== */}
      {profile.services?.length > 0 && (
        <section className={styles.servicesBox} id="services">
          <div className={styles.servicesBanner}>
            <div className={styles.bannerOverlay}></div>
            <div className={styles.bannerContent}>
              <h3 className={styles.bannerTitle}>Usługi profilu {name}</h3>
              <p className={styles.bannerDesc}>
                Wybierz coś dla siebie — nazwa usługi oraz czas jej realizacji poniżej!
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
                d="M0,160L60,170.7C120,181,240,203,360,192C480,181,600,139,720,128C840,117,960,139,1080,154.7C1200,171,1320,181,1380,186.7L1440,192L1440,320L0,320Z"
              />
            </svg>
          </div>

          <div className={styles.servicesBody}>
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
          </div>
        </section>
      )}
    </>
  );
};

export default PublicProfile;
