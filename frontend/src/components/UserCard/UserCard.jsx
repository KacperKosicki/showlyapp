import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './UserCard.module.scss';
import { FaStar, FaMapMarkerAlt, FaRegEye } from 'react-icons/fa';
import AlertBox from '../AlertBox/AlertBox';
import axios from 'axios';

const DEFAULT_AVATAR = '/images/other/no-image.png'; // ta sama ścieżka co w YourProfile

const UserCard = ({ user, currentUser }) => {
  const {
    name, avatar, role, rating, reviews, location, tags,
    priceFrom, priceTo, availableDates = [], profileType,
    description, links = [], showAvailableDates
  } = user;

  const avatarSrc = (typeof avatar === 'string' && avatar.trim()) ? avatar : DEFAULT_AVATAR;
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [visits, setVisits] = useState(typeof user.visits === 'number' ? user.visits : 0);

  const navigate = useNavigate();

  const slugify = (text) =>
    text.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');

  const slug = `${slugify(name)}-${slugify(role)}`;

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
    } catch (_) {
      /* ignore */
    } finally {
      navigate(`/profil/${slug}`, { state: { scrollToId: 'profileWrapper' } });
    }
  };

  const startAccountToProfile = () => {
    if (!currentUser) {
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 4000);
      return;
    }
    if (currentUser.uid === user.userId) {
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 4000);
      return;
    }
    navigate(`/wiadomosc/${user.userId}`, {
      state: { scrollToId: 'messageFormContainer' } // kanał narzucimy w MessageForm
    });
  };

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
              // gdy URL uszkodzony – podmień na domyślny, bez pętli
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

          {links?.filter(l => l.trim()).length > 0
            ? <div className={styles.links}>
              {links.map((link, i) => link.trim()
                ? <a key={i} href={link} target="_blank" rel="noopener noreferrer">🌐 Link {i + 1}</a>
                : null
              )}
            </div>
            : <p className={styles.noDescription}>Użytkownik nie dodał jeszcze żadnych linków.</p>
          }
        </div>

        <div className={styles.separator} />

        {!showAvailableDates && (
          <p className={styles.noReservationInfo}>
            Ten profil nie udostępnia wolnych terminów – możesz tylko napisać wiadomość do użytkownika.
          </p>
        )}

        <div className={styles.buttons}>
          {showAvailableDates && (
            <button
              className={styles.calendarToggle}
              onClick={() => {
                if (!currentUser || currentUser.uid === user.userId) {
                  setShowAlert(true);
                  setTimeout(() => setShowAlert(false), 4000);
                  return;
                }
                navigate(`/rezerwacja/${slug}`, {
                  state: { userId: user.userId, availableDates },
                });
              }}
            >
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

        <div className={styles.visits}>
          <FaRegEye />
          <span>Ten profil odwiedzono <strong>{visits}</strong> razy</span>
        </div>
      </div>

      {showAlert && (
        <AlertBox
          type="error"
          message={
            !currentUser
              ? 'Aby zarezerwować termin lub napisać wiadomość, musisz być zalogowany.'
              : 'Nie możesz wykonać tej akcji na własnym profilu.'
          }
        />
      )}
    </>
  );
};

export default UserCard;
