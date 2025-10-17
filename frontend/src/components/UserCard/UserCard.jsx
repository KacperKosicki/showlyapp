import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './UserCard.module.scss';
import { FaStar, FaMapMarkerAlt, FaRegEye } from 'react-icons/fa';
import { FaHeart, FaRegHeart } from 'react-icons/fa6';
import AlertBox from '../AlertBox/AlertBox';
import axios from 'axios';

const DEFAULT_AVATAR = '/images/other/no-image.png';

const prettyUrl = (url) => {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname === '/' ? '' : u.pathname;
    return `${host}${path}`;
  } catch { return url; }
};

const UserCard = ({ user, currentUser }) => {
  const {
    name, avatar, role, rating, reviews, location, tags,
    priceFrom, priceTo, availableDates = [], profileType,
    description, links = [], showAvailableDates
  } = user;

  const avatarSrc = (typeof avatar === 'string' && avatar.trim()) ? avatar : DEFAULT_AVATAR;

  const [isExpanded, setIsExpanded] = useState(false);
  const [visits, setVisits] = useState(typeof user.visits === 'number' ? user.visits : 0);

  // 🔔 centralny alert z dowolnym komunikatem
  const [alertBox, setAlertBox] = useState({ show: false, type: 'error', message: '' });
  const showAlert = (message, type = 'error', ttl = 4000) => {
    setAlertBox({ show: true, type, message });
    window.clearTimeout(showAlert._t);
    showAlert._t = window.setTimeout(() => setAlertBox(a => ({ ...a, show: false })), ttl);
  };

  // ❤️ ulubione
  const [favCount, setFavCount] = useState(
    typeof user.favoritesCount === 'number' ? user.favoritesCount : 0
  );
  const [isFav, setIsFav] = useState(!!user.isFavorite);

  // SYNC po refetch/odświeżeniu listy
  useEffect(() => { setIsFav(!!user.isFavorite); }, [user.userId, user.isFavorite]);
  useEffect(() => {
    if (typeof user.favoritesCount === 'number') setFavCount(user.favoritesCount);
  }, [user.userId, user.favoritesCount]);

  const navigate = useNavigate();

  const slugify = (text) =>
    text.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');

  const slug = `${slugify(name)}-${slugify(role)}`;

  // === Ulubione ===
  const toggleFavorite = async () => {
    if (!currentUser) {
      showAlert('Aby dodać do ulubionych, musisz być zalogowany.');
      return;
    }
    if (currentUser.uid === user.userId) {
      showAlert('Nie możesz dodać własnego profilu do ulubionych.');
      return;
    }

    // OPTIMISTIC
    const next = !isFav;
    setIsFav(next);
    setFavCount(c => Math.max(0, c + (next ? 1 : -1)));

    try {
      const { data } = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/favorites/toggle`,
        { profileUserId: user.userId },
        { headers: { uid: currentUser.uid } }
      );
      if (typeof data?.isFav === 'boolean') setIsFav(data.isFav);
      if (typeof data?.count === 'number') setFavCount(data.count);
    } catch {
      // REVERT on error
      setIsFav(v => !v);
      setFavCount(c => Math.max(0, c + (next ? -1 : +1)));
      showAlert('Nie udało się zaktualizować ulubionych. Spróbuj ponownie.');
    }
  };

  // === Profil (wejście) ===
  const handleViewProfile = async () => {
    try {
      if (user?.userId) {
        const { data } = await axios.patch(
          `${process.env.REACT_APP_API_URL}/api/profiles/${user.userId}/visit`,
          null,
          { headers: currentUser?.uid ? { uid: currentUser.uid } : {} }
        );
        if (typeof data?.visits === 'number') setVisits(data.visits);
      }
    } catch {}
    navigate(`/profil/${slug}`, { state: { scrollToId: 'profileWrapper' } });
  };

  // === Wiadomość ===
  const startAccountToProfile = () => {
    if (!currentUser) {
      showAlert('Aby wysłać wiadomość, musisz być zalogowany.');
      return;
    }
    if (currentUser.uid === user.userId) {
      showAlert('Nie możesz wysłać wiadomości do własnego profilu.');
      return;
    }
    navigate(`/wiadomosc/${user.userId}`, { state: { scrollToId: 'messageFormContainer' } });
  };

  // === Rezerwacja ===
  const goToBooking = () => {
    if (!currentUser) {
      showAlert('Aby zarezerwować termin, musisz być zalogowany.');
      return;
    }
    if (currentUser.uid === user.userId) {
      showAlert('Nie możesz zarezerwować terminu na własnym profilu.');
      return;
    }
    navigate(`/rezerwacja/${slug}`, { state: { userId: user.userId, availableDates } });
  };

  const cleanLinks = (links || []).map(l => (l || '').trim()).filter(Boolean);

  return (
    <>
      <div className={styles.card}>
        <div className={styles.topBar}>
          <div className={styles.location}><FaMapMarkerAlt /><span>{location}</span></div>
          <div className={styles.rating}><FaStar /><span>{rating} <small>({reviews})</small></span></div>
        </div>

        <div className={styles.top}>
          <img
            src={avatarSrc}
            alt={name}
            className={styles.avatar}
            onError={(e) => {
              if (!e.currentTarget.dataset.fallback) {
                e.currentTarget.dataset.fallback = '1';
                e.currentTarget.src = DEFAULT_AVATAR;
              }
            }}
          />
          <div className={styles.topInfo}>
            <span className={`${styles.profileBadge} ${styles[profileType]}`}>
              {profileType === 'zawodowy' && 'ZAWODOWY'}
              {profileType === 'hobbystyczny' && 'HOBBY'}
              {profileType === 'serwis' && 'SERWIS'}
              {profileType === 'społeczność' && 'SPOŁECZNOŚĆ'}
            </span>
            <h3 className={styles.name}><span className={styles.receiverName}>{name}</span></h3>
            <p className={styles.role}>{role}</p>
          </div>
        </div>

        {description?.trim()
          ? <>
              <p className={`${styles.description} ${isExpanded ? styles.expanded : ''}`}>{description}</p>
              {description.length > 120 && (
                <button className={styles.toggleButton} onClick={() => setIsExpanded(p => !p)}>
                  {isExpanded ? 'Zwiń' : 'Pokaż więcej'}
                </button>
              )}
            </>
          : <p className={styles.noDescription}>Użytkownik nie dodał jeszcze opisu.</p>
        }

        <div className={styles.separator} />

        {tags?.length > 0 && (
          <div className={styles.tags}>
            {tags.map(tag => <span key={tag} className={styles.tag}>{tag.toUpperCase()}</span>)}
          </div>
        )}

        <div className={styles.details}>
          {priceFrom && priceTo
            ? <p className={styles.price}>Cennik od <strong>{priceFrom} zł</strong> do <strong>{priceTo} zł</strong></p>
            : <p className={styles.price}>Cennik: <em>Brak danych</em></p>
          }
          {cleanLinks.length > 0
            ? (
              <div className={styles.links}>
                {cleanLinks.map((link, i) => (
                  <a key={`${link}-${i}`} href={link} target="_blank" rel="noopener noreferrer" title={link}>
                    {prettyUrl(link)}
                  </a>
                ))}
              </div>
            )
            : <p className={styles.noDescription}>Użytkownik nie dodał jeszcze żadnych linków.</p>
          }
        </div>

        <div className={styles.separator} />

        {!showAvailableDates && (
          <p className={styles.noReservationInfo}>
            Ten profil nie udostępnia wolnych terminów – możesz tylko napisać wiadomość.
          </p>
        )}

        <div className={styles.buttons}>
          {showAvailableDates && (
            <button className={styles.calendarToggle} onClick={goToBooking}>
              ZAREZERWUJ TERMIN
            </button>
          )}

          <button className={styles.buttonSecondary} onClick={handleViewProfile}>
            ZOBACZ PROFIL
          </button>

          {currentUser && currentUser.uid !== user.userId && (
            <button className={styles.buttonSecondary} onClick={startAccountToProfile}>
              ZADAJ PYTANIE
            </button>
          )}
        </div>

        {/* meta dół */}
        <div className={styles.bottomMeta}>
          <div className={styles.visits}>
            <FaRegEye />
            <span>Ten profil odwiedzono <strong>{visits}</strong> razy</span>
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

      {alertBox.show && (
        <AlertBox
          type={alertBox.type}
          message={alertBox.message}
          onClose={() => setAlertBox(a => ({ ...a, show: false }))}
        />
      )}
    </>
  );
};

export default UserCard;
