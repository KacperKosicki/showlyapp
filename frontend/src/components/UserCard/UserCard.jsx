import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./UserCard.module.scss";
import { FaStar, FaMapMarkerAlt, FaRegEye } from "react-icons/fa";
import { FaHeart, FaRegHeart } from "react-icons/fa6";
import AlertBox from "../AlertBox/AlertBox";
import axios from "axios";

const DEFAULT_AVATAR = "/images/other/no-image.png";
const API = process.env.REACT_APP_API_URL;

// ✅ url bez protokołu -> działa
const ensureUrl = (url = "") => {
  const u = (url || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
};

// ✅ czytelna etykieta linku
const prettyUrl = (url) => {
  try {
    const u = new URL(ensureUrl(url));
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname === "/" ? "" : u.pathname.replace(/\/$/, "");
    const qs = u.search || "";
    return `${host}${path}${qs}`;
  } catch {
    return url;
  }
};

// ✅ ujednolicone z PublicProfile (uploads / http / data / blob)
const normalizeAvatar = (val = "") => {
  const v = String(val || "").trim();
  if (!v) return "";

  if (v.startsWith("data:image/")) return v;
  if (v.startsWith("blob:")) return v;
  if (/^https?:\/\//i.test(v)) return v;

  if (v.startsWith("/uploads/")) return `${API}${v}`;
  if (v.startsWith("uploads/")) return `${API}/${v}`;

  // domena bez protokołu
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?]|$)/i.test(v)) return `https://${v}`;

  return v;
};

const THEME_PRESETS = {
  violet: { primary: "#6f4ef2", secondary: "#ff4081" },
  blue: { primary: "#2563eb", secondary: "#06b6d4" },
  green: { primary: "#22c55e", secondary: "#a3e635" },
  orange: { primary: "#f97316", secondary: "#facc15" },
  red: { primary: "#ef4444", secondary: "#fb7185" },
  dark: { primary: "#111827", secondary: "#4b5563" },
};

const resolveUserCardTheme = (theme) => {
  const variant = theme?.variant || "violet";
  const preset = THEME_PRESETS[variant] || THEME_PRESETS.violet;

  const primary = (theme?.primary || theme?.accent || "").trim() || preset.primary;
  const secondary = (theme?.secondary || theme?.accent2 || "").trim() || preset.secondary;

  return {
    primary,
    secondary,
    banner: `linear-gradient(135deg, ${primary}, ${secondary})`,
  };
};

const UserCard = ({ user, currentUser, isPreview = false, onPreviewBlocked }) => {
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
    links = [],
    showAvailableDates,
  } = user;

  const navigate = useNavigate();

  // ✅ avatar (fallback + normalizacja)
  const avatarSrc = normalizeAvatar(avatar) || DEFAULT_AVATAR;

  const [isExpanded, setIsExpanded] = useState(false);
  const [visits, setVisits] = useState(typeof user.visits === "number" ? user.visits : 0);

  // 🔔 centralny alert z dowolnym komunikatem
  const [alertBox, setAlertBox] = useState({ show: false, type: "error", message: "" });
  const showAlert = (message, type = "error", ttl = 4000) => {
    setAlertBox({ show: true, type, message });
    window.clearTimeout(showAlert._t);
    showAlert._t = window.setTimeout(() => setAlertBox((a) => ({ ...a, show: false })), ttl);
  };

  const blockIfPreview = (e, msg) => {
    if (!isPreview) return false;
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (typeof onPreviewBlocked === "function") onPreviewBlocked(msg);
    else showAlert(msg, "info");
    return true;
  };

  // ❤️ ulubione
  const [favCount, setFavCount] = useState(
    typeof user.favoritesCount === "number" ? user.favoritesCount : 0
  );
  const [isFav, setIsFav] = useState(!!user.isFavorite);

  // SYNC po refetch/odświeżeniu listy
  useEffect(() => {
    setIsFav(!!user.isFavorite);
  }, [user.userId, user.isFavorite]);

  useEffect(() => {
    if (typeof user.favoritesCount === "number") setFavCount(user.favoritesCount);
  }, [user.userId, user.favoritesCount]);

  // slugify (fallback tylko jeśli nie ma slug z API)
  const slugify = (text = "") =>
    String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");

  const slug = user?.slug || `${slugify(name)}-${slugify(role)}`;

  // ✅ bookingMode (opcjonalnie — jak w PublicProfile)
  const bookingMode = String(user?.bookingMode || "off").toLowerCase();
  const bookingEnabled = !["off", "none", "disabled", ""].includes(bookingMode);

  const isCalendar = bookingMode === "calendar";
  const isRequest = bookingMode === "request-open" || bookingMode === "request-blocking";

  // ✅ jedyne źródło prawdy dla UI: blokada tylko gdy === false
  const allowBookingUI = bookingEnabled && user?.showAvailableDates !== false;
  const showNoBookingInfo = bookingEnabled && user?.showAvailableDates === false;

  const bookBtnLabel = isCalendar ? "ZAREZERWUJ TERMIN" : isRequest ? "WYŚLIJ ZAPYTANIE" : "ZAREZERWUJ TERMIN";

  // === Ulubione ===
  const toggleFavorite = async () => {
    if (!currentUser) {
      showAlert("Aby dodać do ulubionych, musisz być zalogowany.");
      return;
    }
    if (currentUser.uid === user.userId) {
      showAlert("Nie możesz dodać własnego profilu do ulubionych.");
      return;
    }

    // OPTIMISTIC
    const next = !isFav;
    setIsFav(next);
    setFavCount((c) => Math.max(0, c + (next ? 1 : -1)));

    try {
      const { data } = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/favorites/toggle`,
        { profileUserId: user.userId },
        { headers: { uid: currentUser.uid } }
      );
      if (typeof data?.isFav === "boolean") setIsFav(data.isFav);
      if (typeof data?.count === "number") setFavCount(data.count);
    } catch {
      // REVERT on error
      setIsFav((v) => !v);
      setFavCount((c) => Math.max(0, c + (next ? -1 : +1)));
      showAlert("Nie udało się zaktualizować ulubionych. Spróbuj ponownie.");
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
        if (typeof data?.visits === "number") setVisits(data.visits);
      }
    } catch { }
    navigate(`/profil/${slug}`, { state: { scrollToId: "profileWrapper" } });
  };

  // === Wiadomość ===
  const startAccountToProfile = () => {
    if (!currentUser) {
      showAlert("Aby wysłać wiadomość, musisz być zalogowany.");
      return;
    }
    if (currentUser.uid === user.userId) {
      showAlert("Nie możesz wysłać wiadomości do własnego profilu.");
      return;
    }
    navigate(`/wiadomosc/${user.userId}`, { state: { scrollToId: "messageFormContainer" } });
  };

  // === Rezerwacja / Zapytanie ===
  const goToBooking = () => {
    if (!currentUser) {
      showAlert("Aby skorzystać z rezerwacji/zapytania, musisz być zalogowany.");
      return;
    }
    if (currentUser.uid === user.userId) {
      showAlert("Nie możesz wykonać rezerwacji/zapytania na własnym profilu.");
      return;
    }

    // ✅ jedyna blokada: showAvailableDates === false
    if (user?.showAvailableDates === false) {
      showAlert("Ten profil nie udostępnia wolnych terminów — możesz tylko napisać wiadomość.", "info");
      return;
    }

    navigate(`/rezerwacja/${slug}`, { state: { userId: user.userId, availableDates } });
  };

  // ✅ linki: normalizacja + filtr
  const cleanLinks = (links || [])
    .map((l) => ensureUrl((l || "").trim()))
    .filter(Boolean);

  const t = resolveUserCardTheme(user?.theme);
  const cssVars = {
    "--uc-primary": t.primary,
    "--uc-secondary": t.secondary,
    "--uc-banner": t.banner,
  };

  return (
    <>
      <div className={styles.card} style={cssVars}>
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
            src={avatarSrc}
            alt={name}
            className={styles.avatar}
            onError={(e) => {
              if (!e.currentTarget.dataset.fallback) {
                e.currentTarget.dataset.fallback = "1";
                e.currentTarget.src = DEFAULT_AVATAR;
              }
            }}
          />
          <div className={styles.topInfo}>
            <span className={`${styles.profileBadge} ${styles[profileType]}`}>
              {profileType === "zawodowy" && "ZAWODOWY"}
              {profileType === "hobbystyczny" && "HOBBY"}
              {profileType === "serwis" && "SERWIS"}
              {profileType === "społeczność" && "SPOŁECZNOŚĆ"}
            </span>
            <h3 className={styles.name}>
              <span className={styles.receiverName}>{name}</span>
            </h3>
            <p className={styles.role}>{role}</p>
          </div>
        </div>

        {description?.trim() ? (
          <>
            <p className={`${styles.description} ${isExpanded ? styles.expanded : ""}`}>{description}</p>
            {description.length > 120 && (
              <button className={styles.toggleButton} onClick={() => setIsExpanded((p) => !p)}>
                {isExpanded ? "Zwiń" : "Pokaż więcej"}
              </button>
            )}
          </>
        ) : (
          <p className={styles.noDescription}>Użytkownik nie dodał jeszcze opisu.</p>
        )}

        <div className={styles.separator} />

        {tags?.length > 0 && (
          <div className={styles.tags}>
            {tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {String(tag).toUpperCase()}
              </span>
            ))}
          </div>
        )}

        <div className={styles.details}>
          {typeof priceFrom === "number" && typeof priceTo === "number" ? (
            <p className={styles.price}>
              Cennik od <strong>{priceFrom} zł</strong> do <strong>{priceTo} zł</strong>
            </p>
          ) : (
            <p className={styles.price}>
              Cennik: <em>Brak danych</em>
            </p>
          )}

          {cleanLinks.length > 0 ? (
            <div className={styles.links}>
              {cleanLinks.map((link, i) => {
                const label = prettyUrl(link);

                if (isPreview) {
                  return (
                    <span
                      key={`${link}-${i}`}
                      className={styles.linkDisabled}
                      onClick={(e) => blockIfPreview(e, "Linki są aktywne dopiero po utworzeniu profilu.")}
                      title="Podgląd — link nieaktywny"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          blockIfPreview(e, "Linki są aktywne dopiero po utworzeniu profilu.");
                        }
                      }}
                    >
                      {label}
                    </span>
                  );
                }

                return (
                  <a
                    key={`${link}-${i}`}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link}
                    onClick={(e) => {
                      // na wszelki wypadek: nie pozwól kliknąć w kartę jeśli link
                      e.stopPropagation();
                    }}
                  >
                    {label}
                  </a>
                );
              })}
            </div>
          ) : (
            <p className={styles.noDescription}>Użytkownik nie dodał jeszcze żadnych linków.</p>
          )}
        </div>

        <div className={styles.separator} />

        {showNoBookingInfo && (
          <p className={styles.noReservationInfo}>
            Ten profil nie udostępnia wolnych terminów – możesz tylko napisać wiadomość.
          </p>
        )}

        <div className={styles.buttons}>
          {allowBookingUI && (
            <button
              type="button"
              className={styles.calendarToggle}
              disabled={isPreview}
              onClick={(e) => {
                if (blockIfPreview(e, "Rezerwacje są dostępne dopiero po utworzeniu profilu.")) return;
                goToBooking();
              }}
              title={isPreview ? "Podgląd — rezerwacje wyłączone" : "Rezerwacja / zapytanie"}
            >
              {bookBtnLabel}
            </button>
          )}

          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={(e) => {
              if (blockIfPreview(e, "To tylko podgląd — profil będzie dostępny po utworzeniu.")) return;
              handleViewProfile();
            }}
            title={isPreview ? "Podgląd — po utworzeniu profilu" : "Zobacz profil"}
          >
            ZOBACZ PROFIL
          </button>

          {!isPreview && currentUser && currentUser.uid !== user.userId && (
            <button className={styles.buttonSecondary} onClick={startAccountToProfile}>
              ZADAJ PYTANIE
            </button>
          )}
        </div>

        {/* meta dół */}
        <div className={styles.bottomMeta}>
          <div className={styles.visits}>
            <FaRegEye />
            <span>
              Ten profil odwiedzono <strong>{visits}</strong> razy
            </span>
          </div>

          <button
            type="button"
            className={`${styles.favoritesBtn} ${isFav ? styles.active : ""}`}
            onClick={(e) => {
              if (blockIfPreview(e, "Nie możesz dodać do ulubionych w podglądzie.")) return;
              toggleFavorite();
            }}
            aria-label={isFav ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
            title={
              isPreview
                ? "Podgląd — ulubione wyłączone"
                : isFav
                  ? "Usuń z ulubionych"
                  : "Dodaj do ulubionych"
            }
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
          onClose={() => setAlertBox((a) => ({ ...a, show: false }))}
        />
      )}
    </>
  );
};

export default UserCard;
