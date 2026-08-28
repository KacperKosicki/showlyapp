import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowUpRight,
  FiCalendar,
  FiChevronDown,
  FiExternalLink,
  FiEye,
  FiGlobe,
  FiMapPin,
  FiSend,
  FiShield,
  FiStar,
} from "react-icons/fi";
import { FaHeart, FaRegHeart } from "react-icons/fa6";
import axios from "axios";

import { auth } from "../../firebase";
import styles from "./UserCard.module.scss";

const DEFAULT_AVATAR = "/images/other/no-image.png";
const API = process.env.REACT_APP_API_URL;

const ensureUrl = (url = "") => {
  const value = String(url || "").trim();

  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  return `https://${value}`;
};

const prettyUrl = (url) => {
  try {
    const parsedUrl = new URL(ensureUrl(url));
    const host = parsedUrl.hostname.replace(/^www\./, "");
    const path =
      parsedUrl.pathname === "/"
        ? ""
        : parsedUrl.pathname.replace(/\/$/, "");

    return `${host}${path}`;
  } catch {
    return url;
  }
};

const THEME_PRESETS = {
  violet: { primary: "#6f4ef2", secondary: "#ff4081" },
  purple: { primary: "#6f4ef2", secondary: "#a78bfa" },
  pink: { primary: "#ec4899", secondary: "#fb7185" },
  rose: { primary: "#e11d48", secondary: "#fb7185" },
  blue: { primary: "#2563eb", secondary: "#06b6d4" },
  green: { primary: "#22c55e", secondary: "#a3e635" },
  orange: { primary: "#f97316", secondary: "#facc15" },
  red: { primary: "#ef4444", secondary: "#fb7185" },
  dark: { primary: "#111827", secondary: "#4b5563" },
};

const resolveUserCardTheme = (theme) => {
  const variant = theme?.variant || "violet";
  const preset = THEME_PRESETS[variant] || THEME_PRESETS.violet;

  return {
    primary:
      String(theme?.primary || theme?.accent || "").trim() ||
      preset.primary,
    secondary:
      String(theme?.secondary || theme?.accent2 || "").trim() ||
      preset.secondary,
  };
};

const pickUrl = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value.url === "string") {
    return value.url;
  }
  return "";
};

const normalizeImage = (value) => {
  const image = String(pickUrl(value) || "").trim();

  if (!image) return "";
  if (image.startsWith("data:image/") || image.startsWith("blob:")) return image;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith("/uploads/")) return `${API}${image}`;
  if (image.startsWith("uploads/")) return `${API}/${image}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?]|$)/i.test(image)) {
    return `https://${image}`;
  }
  return image;
};

const getProfileTypeLabel = (profileType) => {
  if (profileType === "zawodowy") return "Profil zawodowy";
  if (profileType === "hobbystyczny") return "Hobby";
  if (profileType === "serwis") return "Serwis";
  if (profileType === "społeczność") return "Społeczność";
  return "Profil Showly";
};

const getPartnerLabel = (partnership = {}) => {
  const tier = String(partnership?.tier || "none").toLowerCase();

  return (
    String(partnership?.badgeText || partnership?.label || "").trim() ||
    (tier === "verified"
      ? "Zweryfikowany"
      : tier === "ambassador"
        ? "Ambasador Showly"
        : tier === "founding-partner"
          ? "Founding Partner"
          : "Partner Showly")
  );
};

const UserCard = ({
  user,
  currentUser,
  setAlert,
  isPreview = false,
  onPreviewBlocked,
}) => {
  const {
    name,
    avatar,
    banner,
    role,
    rating,
    reviews,
    location,
    tags = [],
    priceFrom,
    priceTo,
    availableDates = [],
    profileType,
    description,
    links = [],
    partnership = {},
  } = user;

  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [visits, setVisits] = useState(
    typeof user.visits === "number" ? user.visits : 0
  );
  const [favoriteCount, setFavoriteCount] = useState(
    typeof user.favoritesCount === "number" ? user.favoritesCount : 0
  );
  const [isFavorite, setIsFavorite] = useState(!!user.isFavorite);

  const authHeaders = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    const uid = firebaseUser?.uid || currentUser?.uid || "";

    if (!firebaseUser) return uid ? { uid } : {};

    let token = "";
    try {
      token = await firebaseUser.getIdToken();
    } catch {
      token = "";
    }

    return {
      ...(uid ? { uid } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [currentUser?.uid]);

  useEffect(() => {
    if (typeof user.isFavorite === "boolean") {
      setIsFavorite(user.isFavorite);
    }
  }, [user.userId, user.isFavorite]);

  useEffect(() => {
    if (typeof user.favoritesCount === "number") {
      setFavoriteCount(user.favoritesCount);
    }
  }, [user.userId, user.favoritesCount]);

  useEffect(() => {
    if (typeof user.visits === "number") {
      setVisits(user.visits);
    }
  }, [user.userId, user.visits]);

  const showAlert = (message, type = "error") => {
    if (typeof setAlert !== "function") return;

    setAlert({ message, type });
    window.clearTimeout(showAlert._timeout);
    showAlert._timeout = window.setTimeout(() => setAlert(null), 4000);
  };

  const blockIfPreview = (event, message) => {
    if (!isPreview) return false;

    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (typeof onPreviewBlocked === "function") {
      onPreviewBlocked(message);
    } else {
      showAlert(message, "info");
    }
    return true;
  };

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
  const avatarSrc = normalizeImage(avatar) || DEFAULT_AVATAR;

  const publicBilling = user?.billingPublic || user?.billing || {};
  const billingFeatures = publicBilling?.features || null;
  const hasBillingFeatures =
    billingFeatures && Object.keys(billingFeatures).length > 0;
  const canUseBooking = hasBillingFeatures ? !!billingFeatures.booking : true;
  const canUseRequestBlocking = hasBillingFeatures
    ? !!billingFeatures.requestBlocking
    : true;
  const rawBookingMode = String(user?.bookingMode || "off").toLowerCase();
  const bookingMode =
    rawBookingMode === "calendar" && canUseBooking
      ? "calendar"
      : rawBookingMode === "request-blocking" && canUseRequestBlocking
        ? "request-blocking"
        : rawBookingMode === "request-open"
          ? "request-open"
          : "off";
  const bookingEnabled = !["off", "none", "disabled", ""].includes(bookingMode);
  const allowBooking =
    bookingEnabled && user?.showAvailableDates !== false;
  const showNoBookingInfo =
    bookingEnabled && user?.showAvailableDates === false;
  const bookingLabel =
    bookingMode === "calendar" ? "Wolny termin" : "Wyślij zapytanie";

  const bannerSrc = normalizeImage(banner);
  const showBanner = !!bannerSrc;
  const theme = resolveUserCardTheme(user?.theme);
  const cardStyle = {
    "--card-theme": theme.primary,
    "--card-theme-dark": `color-mix(in srgb, ${theme.primary} 82%, #000000)`,
    "--card-theme-soft": `color-mix(in srgb, ${theme.primary} 12%, transparent)`,
    "--card-secondary": theme.secondary,
    "--uc-banner-image": showBanner
      ? `url("${bannerSrc.replace(/"/g, "%22")}")`
      : "none",
  };

  const fromPrice = Number(priceFrom);
  const toPrice = Number(priceTo);
  const hasPrice = Number.isFinite(fromPrice) && fromPrice > 0;
  const hasPriceRange =
    hasPrice && Number.isFinite(toPrice) && toPrice > fromPrice;
  const priceLabel = hasPriceRange
    ? `${fromPrice}–${toPrice} zł`
    : hasPrice
      ? `od ${fromPrice} zł`
      : "Zapytaj o cenę";

  const visibleTags = Array.isArray(tags) ? tags.slice(0, 3) : [];
  const cleanLinks = (Array.isArray(links) ? links : [])
    .map((link) => ensureUrl(pickUrl(link)))
    .filter(Boolean)
    .slice(0, 3);
  const isPartner = !!partnership?.isPartner;
  const partnerLabel = getPartnerLabel(partnership);

  const toggleFavorite = async () => {
    if (!currentUser) {
      showAlert("Aby dodać do ulubionych, musisz być zalogowany.");
      return;
    }
    if (currentUser.uid === user.userId) {
      showAlert("Nie możesz dodać własnego profilu do ulubionych.");
      return;
    }
    if (!auth.currentUser) {
      showAlert("Sesja jeszcze się ładuje. Spróbuj ponownie za chwilę.", "info");
      return;
    }

    const previousValue = isFavorite;
    const nextValue = !previousValue;
    setIsFavorite(nextValue);
    setFavoriteCount((count) =>
      Math.max(0, count + (nextValue ? 1 : -1))
    );

    try {
      const headers = await authHeaders();
      const { data } = await axios.post(
        `${API}/api/favorites/toggle`,
        { profileUserId: user.userId },
        { headers }
      );
      const finalValue =
        typeof data?.isFav === "boolean" ? data.isFav : nextValue;

      if (typeof data?.isFav === "boolean") setIsFavorite(data.isFav);
      if (typeof data?.count === "number") setFavoriteCount(data.count);

      window.dispatchEvent(
        new CustomEvent("showly:favorites-updated", {
          detail: {
            profileUserId: user.userId,
            isFav: finalValue,
            count: typeof data?.count === "number" ? data.count : undefined,
          },
        })
      );

      showAlert(
        finalValue
          ? "Profil został dodany do ulubionych."
          : "Profil został usunięty z ulubionych.",
        "info"
      );
    } catch (error) {
      setIsFavorite(previousValue);
      setFavoriteCount((count) =>
        Math.max(0, count + (previousValue ? 1 : -1))
      );
      showAlert(
        error?.response?.status === 401
          ? "Brak autoryzacji. Zaloguj się ponownie."
          : "Nie udało się zaktualizować ulubionych."
      );
    }
  };

  const handleViewProfile = async () => {
    try {
      if (user?.userId) {
        const headers = currentUser?.uid ? await authHeaders() : {};
        const { data } = await axios.patch(
          `${API}/api/profiles/${user.userId}/visit`,
          null,
          { headers }
        );

        if (typeof data?.visits === "number") {
          setVisits(data.visits);
        }
      }
    } catch {
      // Licznik odwiedzin nie blokuje przejścia do profilu.
    }

    navigate(`/${slug}`, {
      state: { scrollToId: "profileWrapper" },
    });
  };

  const goToBooking = () => {
    if (!currentUser) {
      showAlert(
        "Aby skorzystać z rezerwacji lub zapytania, musisz być zalogowany."
      );
      return;
    }
    if (currentUser.uid === user.userId) {
      showAlert("Nie możesz wykonać rezerwacji na własnym profilu.");
      return;
    }

    navigate(`/rezerwacja/${slug}`, {
      state: { userId: user.userId, availableDates },
    });
  };

  const startAccountToProfile = () => {
    if (!currentUser) {
      showAlert("Aby wysłać wiadomość, musisz być zalogowany.");
      return;
    }
    if (currentUser.uid === user.userId) {
      showAlert("Nie możesz wysłać wiadomości do własnego profilu.");
      return;
    }

    navigate(`/wiadomosc/${user.userId}`, {
      state: { scrollToId: "messageFormContainer" },
    });
  };

  return (
    <article
      className={`${styles.card} ${isPartner ? styles.partnerCard : ""}`}
      style={cardStyle}
    >
      <header
        className={`${styles.visual} ${
          showBanner ? styles.visualWithBanner : ""
        }`}
      >
        {!showBanner && (
          <div className={styles.visualShapes} aria-hidden="true">
            <span className={styles.limeBlock} />
            <span className={styles.circle} />
          </div>
        )}

        <div className={styles.visualTop}>
          <div className={styles.visualBadges}>
            <span className={styles.profileBadge}>
              {getProfileTypeLabel(profileType)}
            </span>

            {isPartner && (
              <span className={styles.partnerBadge}>{partnerLabel}</span>
            )}
          </div>

          <button
            type="button"
            className={`${styles.favoriteButton} ${
              isFavorite ? styles.favoriteActive : ""
            }`}
            onClick={(event) => {
              if (
                blockIfPreview(
                  event,
                  "Ulubione są dostępne po utworzeniu profilu."
                )
              ) {
                return;
              }
              toggleFavorite();
            }}
            aria-label={
              isFavorite ? "Usuń profil z ulubionych" : "Dodaj profil do ulubionych"
            }
            title={
              isPreview
                ? "Podgląd — ulubione wyłączone"
                : isFavorite
                  ? "Usuń z ulubionych"
                  : "Dodaj do ulubionych"
            }
          >
            {isFavorite ? <FaHeart /> : <FaRegHeart />}
            {favoriteCount > 0 && <small>{favoriteCount}</small>}
          </button>
        </div>

        <div className={styles.visualBottom}>
          <div className={styles.avatarWrap}>
            <img
              src={avatarSrc}
              alt={name || "Profil"}
              className={styles.avatar}
              decoding="async"
              onError={(event) => {
                if (!event.currentTarget.dataset.fallback) {
                  event.currentTarget.dataset.fallback = "1";
                  event.currentTarget.src = DEFAULT_AVATAR;
                }
              }}
            />
          </div>

          <div className={styles.visualIdentity}>
            <p className={styles.role}>{role || "Usługodawca"}</p>
            <h3 className={styles.name}>{name || "Profil użytkownika"}</h3>

            <div className={styles.meta}>
              <span className={styles.metaItem}>
                <FiMapPin aria-hidden="true" />
                <span>{location || "Online"}</span>
              </span>

              <span className={styles.metaItem}>
                <FiStar aria-hidden="true" />
                <strong>{Number(rating || 0).toFixed(1)}</strong>
                <span>({Number(reviews || 0)})</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className={styles.content}>
        {description?.trim() && (
          <div className={styles.descriptionBox}>
            <p
              className={`${styles.description} ${
                isExpanded ? styles.descriptionExpanded : ""
              }`}
            >
              {description}
            </p>

            {description.length > 120 && (
              <button
                type="button"
                className={styles.descriptionToggle}
                onClick={() => setIsExpanded((current) => !current)}
                aria-expanded={isExpanded}
              >
                <span>{isExpanded ? "Zwiń opis" : "Pokaż więcej"}</span>
                <FiChevronDown
                  className={
                    isExpanded ? styles.descriptionToggleOpen : ""
                  }
                  aria-hidden="true"
                />
              </button>
            )}
          </div>
        )}

        {visibleTags.length > 0 && (
          <div className={styles.tags}>
            {visibleTags.map((tag) => (
              <span className={styles.tag} key={tag}>
                {String(tag).toUpperCase()}
              </span>
            ))}
          </div>
        )}

        {cleanLinks.length > 0 && (
          <div className={styles.links} aria-label="Linki profilu">
            {cleanLinks.map((link, index) => {
              const linkContent = (
                <>
                  <span className={styles.linkIcon}>
                    <FiGlobe aria-hidden="true" />
                  </span>

                  <span className={styles.linkText}>
                    {prettyUrl(link)}
                  </span>

                  <FiExternalLink
                    className={styles.linkArrow}
                    aria-hidden="true"
                  />
                </>
              );

              if (isPreview) {
                return (
                  <button
                    type="button"
                    className={styles.linkRow}
                    key={`${link}-${index}`}
                    onClick={(event) =>
                      blockIfPreview(
                        event,
                        "Linki będą aktywne po utworzeniu profilu."
                      )
                    }
                  >
                    {linkContent}
                  </button>
                );
              }

              return (
                <a
                  className={styles.linkRow}
                  href={link}
                  key={`${link}-${index}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                >
                  {linkContent}
                </a>
              );
            })}
          </div>
        )}

        <div className={styles.priceRow}>
          <span>Orientacyjna cena</span>
          <strong>{priceLabel}</strong>
        </div>

        {showNoBookingInfo && (
          <p className={styles.bookingNote}>
            Ten profil nie udostępnia terminów — możesz napisać wiadomość.
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.viewButton}
            onClick={(event) => {
              if (
                blockIfPreview(
                  event,
                  "Profil będzie dostępny po zakończeniu tworzenia."
                )
              ) {
                return;
              }
              handleViewProfile();
            }}
          >
            <span>Zobacz profil</span>
            <FiArrowUpRight aria-hidden="true" />
          </button>

          {allowBooking && (
            <button
              type="button"
              className={styles.bookingButton}
              disabled={isPreview}
              onClick={(event) => {
                if (
                  blockIfPreview(
                    event,
                    "Rezerwacje są dostępne po utworzeniu profilu."
                  )
                ) {
                  return;
                }
                goToBooking();
              }}
              title={
                isPreview
                  ? "Podgląd — rezerwacje wyłączone"
                  : bookingLabel
              }
            >
              <FiCalendar aria-hidden="true" />
              <span>{bookingLabel}</span>
            </button>
          )}

          {!isPreview &&
            currentUser &&
            currentUser.uid !== user.userId && (
              <button
                type="button"
                className={styles.messageButton}
                onClick={startAccountToProfile}
              >
                <FiSend aria-hidden="true" />
                <span>Zadaj pytanie</span>
              </button>
            )}
        </div>

        <footer className={styles.cardFooter}>
          <span className={styles.statItem}>
            <FiEye aria-hidden="true" />
            <span>
              <strong>{Number(visits || 0).toLocaleString("pl-PL")}</strong>
              <small>Odwiedzin</small>
            </span>
          </span>

          <span className={styles.statItem}>
            <FaRegHeart aria-hidden="true" />
            <span>
              <strong>{favoriteCount}</strong>
              <small>Ulubione</small>
            </span>
          </span>

          <span className={styles.statItem}>
            <FiShield aria-hidden="true" />
            <span>
              <strong>{isPartner ? "Partner" : "Aktywny"}</strong>
              <small>Status</small>
            </span>
          </span>
        </footer>
      </section>
    </article>
  );
};

export default UserCard;