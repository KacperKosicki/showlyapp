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
import { FaPhoneAlt, FaEnvelope, FaMapMarkedAlt, FaGlobe } from 'react-icons/fa';
import { FaFacebook, FaInstagram, FaYoutube, FaTiktok, FaLinkedin, FaXTwitter } from 'react-icons/fa6';

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

const normalizePhone = (val = '') => String(val || '').replace(/\s+/g, '').trim();

const buildGoogleMapsLink = (address) => {
  const a = (address || '').trim();
  if (!a) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
};

const ensureUrl = (url = '') => {
  const u = (url || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
};

const API = process.env.REACT_APP_API_URL;

const normalizeAvatar = (val = '') => {
  const v = String(val || '').trim();
  if (!v) return v;

  // ✅ obsługa base64/DataURL (Twoje avatary z uploadu)
  if (v.startsWith('data:image/')) return v;

  // ✅ obsługa blob (czasem przy podglądzie)
  if (v.startsWith('blob:')) return v;

  // pełny URL -> zostaw
  if (/^https?:\/\//i.test(v)) return v;

  // kompatybilność /uploads (z backendu)
  if (v.startsWith('/uploads/')) return `${API}${v}`;
  if (v.startsWith('uploads/')) return `${API}/${v}`;

  // jeśli wygląda jak domena/URL bez protokołu -> dodaj https
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?]|$)/i.test(v)) return `https://${v}`;

  return v;
};

// === blokada body bez „skoku” strony ===
const lockBodyScroll = () => {
  const y = window.scrollY || document.documentElement.scrollTop;
  document.body.dataset.scrollY = String(y);
  document.body.style.position = 'fixed';
  document.body.style.top = `-${y}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
};

const unlockBodyScroll = () => {
  const y = parseInt(document.body.dataset.scrollY || '0', 10);

  // zdejmij blokadę
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';

  // odtwórz pozycję PO jednym tiku
  requestAnimationFrame(() => {
    window.scrollTo(0, y);
    document.body.dataset.scrollY = ''; // wyczyść dopiero teraz
  });
};

const THEME_PRESETS = {
  violet: { primary: '#6f4ef2', secondary: '#ff4081' },
  blue: { primary: '#2563eb', secondary: '#06b6d4' },
  green: { primary: '#22c55e', secondary: '#a3e635' },
  orange: { primary: '#f97316', secondary: '#facc15' },
  red: { primary: '#ef4444', secondary: '#fb7185' },
  dark: { primary: '#111827', secondary: '#4b5563' },
};

const resolveProfileTheme = (theme) => {
  const variant = theme?.variant || 'violet';
  const preset = THEME_PRESETS[variant] || THEME_PRESETS.violet;

  const primary = (theme?.primary || theme?.accent || '').trim() || preset.primary;
  const secondary = (theme?.secondary || theme?.accent2 || '').trim() || preset.secondary;

  return {
    primary,
    secondary,
    banner: `linear-gradient(135deg, ${primary}, ${secondary})`,
  };
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

  // Handlery już wewnątrz komponentu
  const openLightbox = (src) => setFullscreenImage(src);
  const closeLightbox = () => setFullscreenImage(null);

  // Blokuj/odblokuj scroll gdy lightbox się pojawia/znika
  useEffect(() => {
    if (fullscreenImage) {
      lockBodyScroll();
      return () => {
        // odblokuj TYLKO gdy zamykamy lightbox
        unlockBodyScroll();
      };
    }
    // gdy fullscreenImage === false nic tu nie rób
  }, [fullscreenImage]);


  // Zamknięcie klawiszem Escape
  useEffect(() => {
    if (!fullscreenImage) return;
    const onKey = (e) => e.key === 'Escape' && closeLightbox();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreenImage]);

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

    const u = auth.currentUser;
    const userName = u?.displayName || u?.email || 'Użytkownik';

    let userAvatar = normalizeAvatar(u?.photoURL || '');

    try {
      const r = await fetch(`${API}/api/users/${userId}`);
      if (r.ok) {
        const dbUser = await r.json();
        userAvatar = normalizeAvatar(dbUser?.avatar || userAvatar) || '';
      }
    } catch { }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/profiles/rate/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, rating: selectedRating, comment, userName, userAvatar }),
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
    priceFrom = null, priceTo = null, description, links = [],
    profileType,
    contact = {},
    socials = {},
  } = profile;

  const themeVars = resolveProfileTheme(profile.theme);

  const cssVars = {
    '--pp-primary': themeVars.primary,
    '--pp-secondary': themeVars.secondary,
    '--pp-banner': themeVars.banner,
  };

  const hasGallery = Array.isArray(profile.photos) && profile.photos.length > 0;
  const hasServices = Array.isArray(profile.services) && profile.services.length > 0;
  const needsBottomSpace = !(hasGallery || hasServices);

  const cleanLinks = (links || [])
    .map(l => (l || '').trim())
    .filter(Boolean);

  const contactPhone = normalizePhone(contact?.phone);
  const contactEmail = (contact?.email || '').trim();

  const fullAddress =
    (contact?.addressFull || '').trim() ||
    [location, contact?.street, contact?.postcode]
      .map(v => (v || '').trim())
      .filter(Boolean)
      .join(', ');

  const mapsUrl = buildGoogleMapsLink(fullAddress);

  const socialItems = [
    { key: 'website', label: 'WWW', icon: <FaGlobe />, url: socials?.website },
    { key: 'facebook', label: 'Facebook', icon: <FaFacebook />, url: socials?.facebook },
    { key: 'instagram', label: 'Instagram', icon: <FaInstagram />, url: socials?.instagram },
    { key: 'youtube', label: 'YouTube', icon: <FaYoutube />, url: socials?.youtube },
    { key: 'tiktok', label: 'TikTok', icon: <FaTiktok />, url: socials?.tiktok },
    { key: 'linkedin', label: 'LinkedIn', icon: <FaLinkedin />, url: socials?.linkedin },
    { key: 'x', label: 'X', icon: <FaXTwitter />, url: socials?.x },
  ]
    .map(s => ({ ...s, url: ensureUrl(s.url) }))
    .filter(s => !!s.url);

  return (
    <div style={cssVars}>
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
              style={{ display: 'block', transform: 'translateZ(0)' }}
            >
              <path
                fill="#ffffff"
                stroke="none"
                d="M0,160L60,170.7C120,181,240,203,360,192C480,181,600,139,720,128C840,117,960,139,1080,154.7C1200,171,1320,181,1380,186.7L1440,192L1440,320L0,320Z"
              />
            </svg>
          </div>

          <div className={styles.topBar}>
            <div className={styles.location}>
              <FaMapMarkerAlt />
              <span>{location}</span>
            </div>
            <div className={styles.rating}>
              <FaStar />
              <span>
                {rating} <small>({reviews})</small>
              </span>
            </div>
          </div>

          <div className={styles.top}>
            <img
              src={normalizeAvatar(avatar) || '/images/other/no-image.png'}
              alt={name}
              className={styles.avatar}
              onError={(e) => {
                e.currentTarget.src = '/images/other/no-image.png';
              }}
            />

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
              {tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag.toUpperCase()}
                </span>
              ))}
            </div>
          )}

          <div className={styles.details}>
            {typeof priceFrom === 'number' && typeof priceTo === 'number' ? (
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
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={link}
                    >
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
                  {[1, 2, 3, 4, 5].map((val) => (
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
                        if (text.length <= maxChars) setComment(text);
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
              <span>
                Ten profil odwiedzono <strong>{profile?.visits ?? 0}</strong> razy
              </span>
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
              {isFav ? (
                <FaHeart className={styles.heartFilled} />
              ) : (
                <FaRegHeart className={styles.heart} />
              )}
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

          <div className={styles.reviewsBody}>
            {profile.ratedBy?.length > 0 ? (
              <ul className={styles.reviewsList}>
                {profile.ratedBy.map((op, i) => {
                  const ratingVal = Number(op.rating);
                  const avatarSrc =
                    normalizeAvatar(op.userAvatar) || '/images/other/no-image.png';

                  const dateLabel = op.createdAt
                    ? new Date(op.createdAt).toLocaleDateString('pl-PL', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                    : '';

                  return (
                    <li key={i} className={styles.reviewItem}>
                      <div className={styles.reviewHeader}>
                        <div className={styles.reviewUserBox}>
                          <img
                            className={styles.reviewAvatar}
                            src={avatarSrc}
                            alt=""
                            decoding="async"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.src = '/images/other/no-image.png';
                            }}
                          />

                          <div className={styles.reviewUserMeta}>
                            <strong className={styles.reviewUser}>
                              {op.userName || 'Użytkownik'}
                            </strong>
                            {dateLabel && (
                              <span className={styles.reviewDate}>{dateLabel}</span>
                            )}
                          </div>
                        </div>

                        <span className={styles.reviewRating}>
                          {[...Array(5)].map((_, idx) => (
                            <FaStar
                              key={idx}
                              className={idx < ratingVal ? styles.starSelected : styles.star}
                            />
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
              <p className={styles.bannerDesc}>
                Zobacz efekty pracy i inspiracje — obrazy mówią więcej niż słowa!
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

          <div className={styles.galleryBody}>
            <div className={styles.galleryGrid}>
              {profile.photos.map((url, i) => {
                const src = normalizeAvatar(url) || url;
                return (
                  <div
                    key={i}
                    className={styles.galleryItem}
                    onClick={() => openLightbox(src)}
                  >
                    <img
                      src={src}
                      alt={`Zdjęcie ${i + 1}`}
                      onError={(e) => {
                        e.currentTarget.src = '/images/other/no-image.png';
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {fullscreenImage && (
            <div
              className={styles.lightbox}
              onClick={closeLightbox}
              role="dialog"
              aria-modal="true"
            >
              <img src={fullscreenImage} alt="" />
            </div>
          )}
        </section>
      )}

      {(profile.services?.length > 0 || contact || socials) && (
        <section className={styles.bottomRow} id="services">
          {/* ===== USŁUGI ===== */}
          {profile.services?.length > 0 && (
            <div className={styles.servicesBox}>
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
            </div>
          )}

          {/* ===== INFORMACJE PROFILU ===== */}
          <div className={styles.profileInfoBox}>
            <div className={styles.profileInfoBanner}>
              <div className={styles.bannerOverlay}></div>
              <div className={styles.bannerContent}>
                <h3 className={styles.bannerTitle}>Informacje profilu {name}</h3>
                <p className={styles.bannerDesc}>
                  Dane kontaktowe i social media — kliknij, aby przejść lub skontaktować się.
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

            <div className={styles.profileInfoBody}>
              <ul className={styles.contactList}>
                <li className={styles.contactRow}>
                  <span className={styles.contactLeft}>
                    <FaMapMarkedAlt className={styles.contactIcon} />
                    <span className={styles.contactLabel}>Adres</span>
                  </span>

                  {fullAddress ? (
                    <a
                      className={styles.contactValueLink}
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {fullAddress}
                    </a>
                  ) : (
                    <span className={styles.contactValueMuted}>Brak danych</span>
                  )}
                </li>

                <li className={styles.contactRow}>
                  <span className={styles.contactLeft}>
                    <FaPhoneAlt className={styles.contactIcon} />
                    <span className={styles.contactLabel}>Telefon</span>
                  </span>

                  {contactPhone ? (
                    <a className={styles.contactValueLink} href={`tel:${contactPhone}`}>
                      {contact.phone}
                    </a>
                  ) : (
                    <span className={styles.contactValueMuted}>Brak danych</span>
                  )}
                </li>

                <li className={styles.contactRow}>
                  <span className={styles.contactLeft}>
                    <FaEnvelope className={styles.contactIcon} />
                    <span className={styles.contactLabel}>E-mail</span>
                  </span>

                  {contactEmail ? (
                    <a className={styles.contactValueLink} href={`mailto:${contactEmail}`}>
                      {contactEmail}
                    </a>
                  ) : (
                    <span className={styles.contactValueMuted}>Brak danych</span>
                  )}
                </li>
              </ul>

              <div className={styles.infoDivider} />

              {socialItems.length > 0 ? (
                <div className={styles.socialGrid}>
                  {socialItems.map((s) => (
                    <a
                      key={s.key}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.socialTile}
                      title={s.label}
                      aria-label={s.label}
                    >
                      <span className={styles.socialIcon}>{s.icon}</span>
                      <span className={styles.socialLabel}>{s.label}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className={styles.infoEmpty}>Brak social mediów.</p>
              )}

              {cleanLinks.length > 0 && (
                <>
                  <div className={styles.infoDivider} />
                  <div className={styles.infoLinksGrid}>
                    {cleanLinks.map((link, i) => (
                      <a
                        key={`${link}-${i}`}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.infoLinkPill}
                      >
                        {prettyUrl(link)}
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

    </div>
  );
};

export default PublicProfile;
