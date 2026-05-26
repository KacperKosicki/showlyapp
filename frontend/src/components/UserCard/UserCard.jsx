import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./UserCard.module.scss";

import {
  FaStar,
  FaMapMarkerAlt,
  FaInfoCircle,
  FaRegEye,
  FaShieldAlt,
  FaRegCalendarAlt,
  FaPaperPlane,
  FaExternalLinkAlt,
  FaGlobe,
  FaLink,
  FaMoneyBillWave,
} from "react-icons/fa";

import { FaHeart, FaRegHeart } from "react-icons/fa6";
import axios from "axios";
import { auth } from "../../firebase";

const DEFAULT_AVATAR = "/images/other/no-image.png";
const API = process.env.REACT_APP_API_URL;

const ensureUrl = (url = "") => {
  const u = (url || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
};

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

const pickUrl = (val) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && typeof val.url === "string") return val.url;
  return "";
};

const normalizeAvatar = (val) => {
  const raw = pickUrl(val);
  const v = String(raw || "").trim();
  if (!v) return "";

  if (v.startsWith("data:image/")) return v;
  if (v.startsWith("blob:")) return v;
  if (/^https?:\/\//i.test(v)) return v;

  if (v.startsWith("/uploads/")) return `${API}${v}`;
  if (v.startsWith("uploads/")) return `${API}/${v}`;

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

const PARTNER_COLORS = {
  partner: "#59d0ff",
  verified: "#22c55e",
  ambassador: "#a855f7",
  "founding-partner": "#7dd3fc",
};

const resolvePartnerData = (partnership = {}) => {
  const isPartner = !!partnership?.isPartner;
  const tier = String(partnership?.tier || "none").toLowerCase();

  const baseColor =
    (partnership?.color || "").trim() ||
    PARTNER_COLORS[tier] ||
    "#59d0ff";

  const label =
    (partnership?.badgeText || "").trim() ||
    (partnership?.label || "").trim() ||
    (tier === "verified"
      ? "ZWERYFIKOWANY"
      : tier === "ambassador"
        ? "AMBASADOR SHOWLY"
        : tier === "founding-partner"
          ? "FOUNDING PARTNER"
          : "PARTNER SHOWLY");

  return {
    isPartner,
    tier,
    color: baseColor,
    label,
  };
};

const getProfileTypeLabel = (profileType) => {
  if (profileType === "zawodowy") return "ZAWODOWY";
  if (profileType === "hobbystyczny") return "HOBBY";
  if (profileType === "serwis") return "SERWIS";
  if (profileType === "społeczność") return "SPOŁECZNOŚĆ";
  return "PROFIL";
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
    partnership = {},
  } = user;

  const navigate = useNavigate();

  const [isExpanded, setIsExpanded] = useState(false);
  const [visits, setVisits] = useState(
    typeof user.visits === "number" ? user.visits : 0
  );

  const [favCount, setFavCount] = useState(
    typeof user.favoritesCount === "number" ? user.favoritesCount : 0
  );

  const [isFav, setIsFav] = useState(!!user.isFavorite);

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
      setIsFav(user.isFavorite);
    }
  }, [user.userId, user.isFavorite]);

  useEffect(() => {
    if (typeof user.favoritesCount === "number") {
      setFavCount(user.favoritesCount);
    }
  }, [user.userId, user.favoritesCount]);

  const showAlert = (message, type = "error") => {
    if (typeof setAlert === "function") {
      setAlert({ message, type });

      window.clearTimeout(showAlert._t);
      showAlert._t = window.setTimeout(() => {
        setAlert(null);
      }, 4000);
    }
  };

  const blockIfPreview = (e, msg) => {
    if (!isPreview) return false;

    e?.preventDefault?.();
    e?.stopPropagation?.();

    if (typeof onPreviewBlocked === "function") {
      onPreviewBlocked(msg);
    } else {
      showAlert(msg, "info");
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

  const avatarSrc = normalizeAvatar(avatar) || DEFAULT_AVATAR;

  const pf = Number(priceFrom);
  const pt = Number(priceTo);
  const hasPrice = Number.isFinite(pf) && Number.isFinite(pt) && pf > 0 && pt >= pf;

  const publicBilling = user?.billingPublic || user?.billing || {};
  const billingFeatures = publicBilling?.features || null;

  const hasBillingFeatures =
    billingFeatures && Object.keys(billingFeatures).length > 0;

  const canUseBooking = hasBillingFeatures
    ? !!billingFeatures.booking
    : true;

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

  const isCalendar = bookingMode === "calendar";
  const isRequest =
    bookingMode === "request-open" || bookingMode === "request-blocking";

  const allowBookingUI = bookingEnabled && user?.showAvailableDates !== false;
  const showNoBookingInfo = bookingEnabled && user?.showAvailableDates === false;

  const bookBtnLabel = isCalendar
    ? "Zarezerwuj termin"
    : isRequest
      ? "Wyślij zapytanie"
      : "Zarezerwuj termin";

  const cleanLinks = (links || [])
    .map((l) => ensureUrl((l || "").trim()))
    .filter(Boolean);

  const t = resolveUserCardTheme(user?.theme);
  const partner = resolvePartnerData(partnership);

  const cssVars = {
    "--uc-primary": t.primary,
    "--uc-secondary": t.secondary,
    "--uc-banner": t.banner,

    "--uc-p-06": `color-mix(in srgb, ${t.primary} 6%, transparent)`,
    "--uc-p-10": `color-mix(in srgb, ${t.primary} 10%, transparent)`,
    "--uc-p-14": `color-mix(in srgb, ${t.primary} 14%, transparent)`,
    "--uc-p-18": `color-mix(in srgb, ${t.primary} 18%, transparent)`,
    "--uc-p-22": `color-mix(in srgb, ${t.primary} 22%, transparent)`,

    "--uc-s-06": `color-mix(in srgb, ${t.secondary} 6%, transparent)`,
    "--uc-s-10": `color-mix(in srgb, ${t.secondary} 10%, transparent)`,
    "--uc-s-14": `color-mix(in srgb, ${t.secondary} 14%, transparent)`,

    "--uc-partner": partner.color,
    "--uc-partner-soft": `color-mix(in srgb, ${partner.color} 16%, white)`,
    "--uc-partner-border": `color-mix(in srgb, ${partner.color} 42%, rgba(15, 23, 42, 0.12))`,
    "--uc-partner-glow": `color-mix(in srgb, ${partner.color} 28%, transparent)`,
  };

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

    const prevIsFav = isFav;
    const next = !prevIsFav;

    setIsFav(next);
    setFavCount((c) => Math.max(0, c + (next ? 1 : -1)));

    try {
      const headers = await authHeaders();

      const { data } = await axios.post(
        `${API}/api/favorites/toggle`,
        { profileUserId: user.userId },
        { headers }
      );

      const finalIsFav = typeof data?.isFav === "boolean" ? data.isFav : next;

      if (typeof data?.isFav === "boolean") setIsFav(data.isFav);
      if (typeof data?.count === "number") setFavCount(data.count);

      window.dispatchEvent(
        new CustomEvent("showly:favorites-updated", {
          detail: {
            profileUserId: user.userId,
            isFav: finalIsFav,
            count: typeof data?.count === "number" ? data.count : undefined,
          },
        })
      );

      showAlert(
        finalIsFav
          ? "Profil został dodany do ulubionych."
          : "Profil został usunięty z ulubionych.",
        "info"
      );
    } catch (e) {
      setIsFav(prevIsFav);
      setFavCount((c) => Math.max(0, c + (prevIsFav ? 1 : -1)));

      showAlert(
        e?.response?.status === 401
          ? "Brak autoryzacji (401). Token nie został zaakceptowany."
          : "Nie udało się zaktualizować ulubionych. Spróbuj ponownie."
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

        if (typeof data?.visits === "number") setVisits(data.visits);
      }
    } catch {
      // ignore
    }

    navigate(`/profil/${slug}`, { state: { scrollToId: "profileWrapper" } });
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

  const goToBooking = () => {
    if (!currentUser) {
      showAlert("Aby skorzystać z rezerwacji/zapytania, musisz być zalogowany.");
      return;
    }

    if (currentUser.uid === user.userId) {
      showAlert("Nie możesz wykonać rezerwacji/zapytania na własnym profilu.");
      return;
    }

    if (user?.showAvailableDates === false) {
      showAlert(
        "Ten profil nie udostępnia wolnych terminów — możesz tylko napisać wiadomość.",
        "info"
      );
      return;
    }

    navigate(`/rezerwacja/${slug}`, {
      state: { userId: user.userId, availableDates },
    });
  };

  return (
    <article
      className={`${styles.card} ${partner.isPartner ? styles.partnerCard : ""}`}
      style={cssVars}
    >
      <header className={styles.hero}>
        <div className={styles.heroDecor} aria-hidden="true">
          <span className={styles.heroGlowA} />
          <span className={styles.heroGlowB} />
          <span className={styles.heroGrid} />
        </div>

        <div className={styles.heroFade} aria-hidden="true" />

        <div className={styles.heroTop}>
          <span className={styles.locPill} title={location || "Brak lokalizacji"}>
            <FaMapMarkerAlt />
            <span className={styles.locText}>
              {location || "Brak lokalizacji"}
            </span>
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
              alt={name || "Profil"}
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
            <div className={styles.badgesRow}>
              {partner.isPartner && (
                <span
                  className={`${styles.partnerBadge} ${styles[`partner_${partner.tier}`] || ""
                    }`}
                >
                  {partner.label}
                </span>
              )}

              <span
                className={`${styles.profileBadge} ${styles[`type_${profileType}`] || ""
                  }`}
              >
                {getProfileTypeLabel(profileType)}
              </span>
            </div>

            <h3 className={styles.name}>
              <span className={styles.receiverName}>{name || "Profil użytkownika"}</span>
            </h3>

            <p className={styles.role} title={role || ""}>
              {role || "—"}
            </p>
          </div>
        </div>
      </header>

      <section className={styles.body}>
        {description?.trim() ? (
          <div className={styles.descBox}>
            <p
              className={`${styles.description} ${isExpanded ? styles.expanded : ""
                }`}
            >
              {description}
            </p>

            {description.length > 120 && (
              <button
                className={styles.toggleButton}
                onClick={() => setIsExpanded((p) => !p)}
                type="button"
              >
                {isExpanded ? "Zwiń" : "Pokaż więcej"}
              </button>
            )}
          </div>
        ) : (
          <div className={styles.emptyBox}>
            <div className={styles.emptyIcon}>
              <FaInfoCircle />
            </div>

            <div className={styles.emptyContent}>
              <span>Użytkownik nie dodał jeszcze opisu.</span>
            </div>
          </div>
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
          <div className={styles.pricePill}>
            <span className={styles.priceIcon}>
              <FaMoneyBillWave />
            </span>

            {hasPrice ? (
              <div>
                <small>Cennik</small>
                <strong>
                  od {pf} zł do {pt} zł
                </strong>
              </div>
            ) : (
              <div>
                <small>Cennik</small>
                <em>brak danych</em>
              </div>
            )}
          </div>

          {cleanLinks.length > 0 ? (
            <div className={styles.linkGrid}>
              {cleanLinks.slice(0, 3).map((link, i) => {
                const label = prettyUrl(link);

                const content = (
                  <>
                    <div className={styles.linkTileLeft}>
                      <span className={styles.linkBadge}>
                        <FaGlobe />
                      </span>

                      <div className={styles.linkText}>
                        <strong>{label}</strong>
                        <small>
                          {isPreview ? "Podgląd — link nieaktywny" : "Otwórz zewnętrzny link"}
                        </small>
                      </div>
                    </div>

                    <span className={styles.linkArrow}>
                      <FaExternalLinkAlt />
                    </span>
                  </>
                );

                if (isPreview) {
                  return (
                    <span
                      key={`${link}-${i}`}
                      className={`${styles.linkTile} ${styles.linkDisabled}`}
                      onClick={(e) =>
                        blockIfPreview(
                          e,
                          "Linki są aktywne dopiero po utworzeniu profilu."
                        )
                      }
                      title="Podgląd — link nieaktywny"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          blockIfPreview(
                            e,
                            "Linki są aktywne dopiero po utworzeniu profilu."
                          );
                        }
                      }}
                    >
                      {content}
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
                    {content}
                  </a>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyBox}>
              <div className={styles.emptyIcon}>
                <FaLink />
              </div>

              <div className={styles.emptyContent}>
                <span>Użytkownik nie dodał jeszcze żadnych linków.</span>
              </div>
            </div>
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
                if (
                  blockIfPreview(
                    e,
                    "Rezerwacje są dostępne dopiero po utworzeniu profilu."
                  )
                ) {
                  return;
                }

                goToBooking();
              }}
              title={
                isPreview
                  ? "Podgląd — rezerwacje wyłączone"
                  : "Rezerwacja / zapytanie"
              }
            >
              <FaRegCalendarAlt />
              {bookBtnLabel}
            </button>
          )}

          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={(e) => {
              if (
                blockIfPreview(
                  e,
                  "To tylko podgląd — profil będzie dostępny po utworzeniu."
                )
              ) {
                return;
              }

              handleViewProfile();
            }}
            title={isPreview ? "Podgląd — po utworzeniu profilu" : "Zobacz profil"}
          >
            <FaRegEye />
            Zobacz profil
          </button>

          {!isPreview && currentUser && currentUser.uid !== user.userId && (
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={startAccountToProfile}
            >
              <FaPaperPlane />
              Zadaj pytanie
            </button>
          )}
        </div>

        <div className={styles.cardStats}>
          <div className={styles.statBox}>
            <span className={styles.statIcon}>
              <FaRegEye />
            </span>

            <div>
              <strong>{Number(visits || 0).toLocaleString("pl-PL")}</strong>
              <small>Odwiedzin</small>
            </div>
          </div>

          <button
            type="button"
            className={`${styles.statBox} ${styles.favoriteStat} ${isFav ? styles.active : ""
              }`}
            onClick={(e) => {
              if (
                blockIfPreview(
                  e,
                  "Nie możesz dodać do ulubionych w podglądzie."
                )
              ) {
                return;
              }

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
            <span className={styles.statIcon}>
              {isFav ? <FaHeart /> : <FaRegHeart />}
            </span>

            <div>
              <strong>{favCount}</strong>
              <small>Ulubione</small>
            </div>
          </button>

          <div className={styles.statBox}>
            <span className={styles.statIcon}>
              <FaShieldAlt />
            </span>

            <div>
              <strong>{partner.isPartner ? "Partner" : "Aktywny"}</strong>
              <small>Status</small>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
};

export default UserCard;