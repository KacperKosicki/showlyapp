import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './UserCard.module.scss';
import { FaStar, FaMapMarkerAlt } from 'react-icons/fa';
import AlertBox from '../AlertBox/AlertBox';

const UserCard = ({ user, currentUser }) => {
  const {
    name,
    avatar,
    role,
    rating,
    reviews,
    location,
    tags,
    priceFrom,
    priceTo,
    availableDates = [],
    profileType,
    description,
    links = []
  } = user;

  const [isExpanded, setIsExpanded] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const navigate = useNavigate();

  const slugify = (text) =>
    text
      .toLowerCase()
      .normalize("NFD") // usuwa znaki diakrytyczne
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '-') // spacje na myślniki
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');

  const slug = `${slugify(name)}-${slugify(role)}`;

  return (
    <>
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
          <div className={styles.topInfo}>
            <span className={`${styles.profileBadge} ${styles[profileType]}`}>
              {profileType === 'zawodowy' && 'ZAWODOWY'}
              {profileType === 'hobbystyczny' && 'HOBBY'}
              {profileType === 'serwis' && 'SERWIS'}
              {profileType === 'społeczność' && 'SPOŁECZNOŚĆ'}
            </span>

            <h3 className={styles.name}>{name}</h3>
            <p className={styles.role}>{role}</p>
          </div>
        </div>

        {description?.trim() ? (
          <>
            <p className={`${styles.description} ${isExpanded ? styles.expanded : ''}`}>
              {description}
            </p>
            {description.length > 120 && (
              <button
                className={styles.toggleButton}
                onClick={() => setIsExpanded(prev => !prev)}
              >
                {isExpanded ? 'Zwiń' : 'Pokaż więcej'}
              </button>
            )}
          </>
        ) : (
          <p className={styles.noDescription}>Użytkownik nie dodał jeszcze opisu.</p>
        )}

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
            <p className={styles.price}>Cennik: <em>Brak danych</em></p>
          )}

          <button
            className={styles.calendarToggle}
            onClick={() => {
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

              navigate(`/rezerwacja/${slug}`, {
                state: { userId: user.userId, availableDates }
              });
            }}

          >
            ZOBACZ DOSTĘPNE DNI LUB ZAREZERWUJ TERMIN
          </button>

          {links?.filter(link => link.trim() !== '').length > 0 ? (
            <div className={styles.links}>
              {links.map((link, i) =>
                link.trim() ? (
                  <a key={i} href={link} target="_blank" rel="noopener noreferrer">
                    🌐 Link {i + 1}
                  </a>
                ) : null
              )}
            </div>
          ) : (
            <p className={styles.noDescription}>Użytkownik nie dodał jeszcze żadnych linków.</p>
          )}
        </div>

        <div className={styles.buttons}>
          <button
            className={styles.buttonPrimary}
            onClick={() => navigate(`/profil/${slug}`, { state: { scrollToId: 'profileWrapper' } })}
          >
            ZOBACZ WIZYTÓWKĘ
          </button>
          {currentUser && currentUser.uid !== user.userId && (
            <button
              className={styles.buttonSecondary}
              onClick={() =>
                navigate(`/wiadomosc/${user.userId}`, {
                  state: { scrollToId: 'messageFormContainer' },
                })
              }
            >
              ZADAJ PYTANIE
            </button>
          )}
        </div>
      </div>

      {showAlert && (
        <AlertBox
          type="error"
          message={
            !currentUser
              ? "Aby zarezerwować termin, musisz być zalogowany."
              : "Nie możesz zarezerwować terminu u samego siebie."
          }
        />
      )}

    </>
  );
};

export default UserCard;
