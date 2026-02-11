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

// ✅ avatar/photos mogą być: string albo { url, publicId }
const pickUrl = (val) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && typeof val.url === "string") return val.url;
  return "";
};

// ✅ ujednolicone z PublicProfile (uploads / http / data / blob) + obsługa obiektu
const normalizeAvatar = (val) => {
  const raw = pickUrl(val);
  const v = String(raw || "").trim();
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
  } = user;

  const navigate = useNavigate();

  // ✅ avatar (fallback + normalizacja) — działa dla string i {url, publicId}
  const avatarSrc = normalizeAvatar(avatar) || DEFAULT_AVATAR;

  // ✅ ceny — czasem z API przychodzą jako stringi
  const pf = Number(priceFrom);
  const pt = Number(priceTo);
  const hasPrice = Number.isFinite(pf) && Number.isFinite(pt) && pf > 0 && pt >= pf;

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

  // ✅ bookingMode
  const bookingMode = String(user?.bookingMode || "off").toLowerCase();
  const bookingEnabled = !["off", "none", "disabled", ""].includes(bookingMode);

  const isCalendar = bookingMode === "calendar";
  const isRequest = bookingMode === "request-open" || bookingMode === "request-blocking";

  // ✅ jedyne źródło prawdy dla UI: blokada tylko gdy === false
  const allowBookingUI = bookingEnabled && user?.showAvailableDates !== false;
  const showNoBookingInfo = bookingEnabled && user?.showAvailableDates === false;

  const bookBtnLabel = isCalendar
    ? "ZAREZERWUJ TERMIN"
    : isRequest
    ? "WYŚLIJ ZAPYTANIE"
    : "ZAREZERWUJ TERMIN";

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
    } catch {}
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
  const cleanLinks = (links || []).map((l) => ensureUrl((l || "").trim())).filter(Boolean);

  const t = resolveUserCardTheme(user?.theme);
  const cssVars = {
    "--uc-primary": t.primary,
    "--uc-secondary": t.secondary,
    "--uc-banner": t.banner,
    "--uc-p-06": `color-mix(in srgb, ${t.primary} 6%, transparent)`,
    "--uc-p-10": `color-mix(in srgb, ${t.primary} 10%, transparent)`,
    "--uc-p-22": `color-mix(in srgb, ${t.primary} 22%, transparent)`,
    "--uc-s-10": `color-mix(in srgb, ${t.secondary} 10%, transparent)`,
  };

  return (
    <>
      <article className={styles.card} style={cssVars}>
        {/* ===== HERO / BANNER ===== */}
        <header className={styles.hero}>
          <div className={styles.heroFade} aria-hidden="true" />

          <div className={styles.heroTop}>
            <span className={styles.locPill} title={location || "Brak lokalizacji"}>
              <FaMapMarkerAlt />
              <span className={styles.locText}>{location || "Brak lokalizacji"}</span>
            </span>

            <span className={styles.ratingPill} title={`Ocena: ${rating} (${reviews})`}>
              <FaStar />
              <span>
                <strong>{Number(rating || 0).toFixed(1)}</strong>
                <span className={styles.dot} />
                <span>{Number(reviews || 0)} opinii</span>
              </span>
            </span>
          </div>

          <div className={styles.heroInner}>
            <div className={styles.avatarWrap}>
              <img
                src={avatarSrc}
                alt={name}
                className={styles.avatar}
                decoding="async"
                onError={(e) => {
                  if (!e.currentTarget.dataset.fallback) {
                    e.currentTarget.dataset.fallback = "1";
                    e.currentTarget.src = DEFAULT_AVATAR;
                  }
                }}
              />
              <div className={styles.avatarRing} aria-hidden="true" />
            </div>

            <div className={styles.heroInfo}>
              <div className={styles.titleRow}>
                <h3 className={styles.name}>
                  <span className={styles.receiverName}>{name}</span>
                </h3>

                <span className={`${styles.profileBadge} ${styles[`type_${profileType}`] || ""}`}>
                  {profileType === "zawodowy" && "ZAWODOWY"}
                  {profileType === "hobbystyczny" && "HOBBY"}
                  {profileType === "serwis" && "SERWIS"}
                  {profileType === "społeczność" && "SPOŁECZNOŚĆ"}
                  {!["zawodowy", "hobbystyczny", "serwis", "społeczność"].includes(profileType) && "PROFIL"}
                </span>
              </div>

              <p className={styles.role} title={role || ""}>
                {role || "—"}
              </p>
            </div>
          </div>
        </header>

        {/* ===== BODY ===== */}
        <section className={styles.body}>
          {description?.trim() ? (
            <>
              <p className={`${styles.description} ${isExpanded ? styles.expanded : ""}`}>{description}</p>
              {description.length > 120 && (
                <button className={styles.toggleButton} onClick={() => setIsExpanded((p) => !p)} type="button">
                  {isExpanded ? "Zwiń" : "Pokaż więcej"}
                </button>
              )}
            </>
          ) : (
            <p className={styles.noDescription}>Użytkownik nie dodał jeszcze opisu.</p>
          )}

          {tags?.length > 0 && (
            <div className={styles.tags}>
              {tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {String(tag).toUpperCase()}
                </span>
              ))}
            </div>
          )}

          <div className={styles.splitLine} />

          <div className={styles.details}>
            {hasPrice ? (
              <p className={styles.price}>
                Cennik: <span>od</span> <strong>{pf} zł</strong> <span>do</span> <strong>{pt} zł</strong>
              </p>
            ) : (
              <p className={styles.price}>
                Cennik: <em>Brak danych</em>
              </p>
            )}

            {cleanLinks.length > 0 ? (
              <div className={styles.linkGrid}>
                {cleanLinks.slice(0, 4).map((link, i) => {
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
                      className={styles.linkTile}
                      title={link}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className={styles.linkDomain}>{label}</span>
                      <span className={styles.linkHint}>Otwórz</span>
                    </a>
                  );
                })}
              </div>
            ) : (
              <p className={styles.noDescription}>Użytkownik nie dodał jeszcze żadnych linków.</p>
            )}
          </div>

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
              <button type="button" className={styles.buttonSecondary} onClick={startAccountToProfile}>
                ZADAJ PYTANIE
              </button>
            )}
          </div>

          {/* ===== BOTTOM META ===== */}
          <div className={styles.bottomMeta}>
            <div className={styles.visits}>
              <FaRegEye />
              <span>
                Odwiedzin: <strong>{Number(visits || 0).toLocaleString("pl-PL")}</strong>
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
        </section>
      </article>

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
