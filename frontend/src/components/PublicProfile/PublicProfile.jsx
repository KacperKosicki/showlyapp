import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import styles from "./PublicProfile.module.scss";
import { auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";

import AlertBox from "../AlertBox/AlertBox";
import LoadingButton from "../ui/LoadingButton/LoadingButton";

import { FaMapMarkerAlt, FaStar, FaRegEye, FaPhoneAlt, FaEnvelope, FaMapMarkedAlt, FaGlobe } from "react-icons/fa";
import { FaHeart, FaRegHeart, FaFacebook, FaInstagram, FaYoutube, FaTiktok, FaLinkedin, FaXTwitter } from "react-icons/fa6";
import { FaRegCalendarAlt, FaPaperPlane } from "react-icons/fa";

import "react-calendar/dist/Calendar.css";

const prettyUrl = (url) => {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname === "/" ? "" : u.pathname.replace(/\/$/, "");
    const qs = u.search || "";
    return `${host}${path}${qs}`;
  } catch {
    return url;
  }
};

const normalizePhone = (val = "") => String(val || "").replace(/\s+/g, "").trim();

const buildGoogleMapsLink = (address) => {
  const a = (address || "").trim();
  if (!a) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
};

const ensureUrl = (url = "") => {
  const u = (url || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
};

const API = process.env.REACT_APP_API_URL;

const normalizeAvatar = (val = "") => {
  const v = String(val || "").trim();
  if (!v) return v;

  if (v.startsWith("data:image/")) return v;
  if (v.startsWith("blob:")) return v;
  if (/^https?:\/\//i.test(v)) return v;

  if (v.startsWith("/uploads/")) return `${API}${v}`;
  if (v.startsWith("uploads/")) return `${API}/${v}`;

  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?]|$)/i.test(v)) return `https://${v}`;

  return v;
};

// === blokada body bez „skoku” strony ===
const lockBodyScroll = () => {
  const y = window.scrollY || document.documentElement.scrollTop;
  document.body.dataset.scrollY = String(y);
  document.body.style.position = "fixed";
  document.body.style.top = `-${y}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
};

const unlockBodyScroll = () => {
  const y = parseInt(document.body.dataset.scrollY || "0", 10);

  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";

  requestAnimationFrame(() => {
    window.scrollTo(0, y);
    document.body.dataset.scrollY = "";
  });
};

const THEME_PRESETS = {
  violet: { primary: "#6f4ef2", secondary: "#ff4081" },
  blue: { primary: "#2563eb", secondary: "#06b6d4" },
  green: { primary: "#22c55e", secondary: "#a3e635" },
  orange: { primary: "#f97316", secondary: "#facc15" },
  red: { primary: "#ef4444", secondary: "#fb7185" },
  dark: { primary: "#111827", secondary: "#4b5563" },
};

const resolveProfileTheme = (theme) => {
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

export default function PublicProfile() {
  const { slug } = useParams();
  const routerLocation = useLocation();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const [comment, setComment] = useState("");
  const [alert, setAlert] = useState(null);

  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [uid, setUid] = useState(auth.currentUser?.uid ?? null);

  const [isRatingSending, setIsRatingSending] = useState(false);

  const maxChars = 200;

  const openLightbox = (src) => setFullscreenImage(src);
  const closeLightbox = () => setFullscreenImage(null);

  useEffect(() => {
    if (fullscreenImage) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
  }, [fullscreenImage]);

  useEffect(() => {
    if (!fullscreenImage) return;
    const onKey = (e) => e.key === "Escape" && closeLightbox();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fullscreenImage]);

  const mapUnit = (unit) => {
    switch (unit) {
      case "minutes":
        return "min";
      case "hours":
        return "h";
      case "days":
        return "dni";
      default:
        return unit;
    }
  };

  const [favCount, setFavCount] = useState(0);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    if (!profile) return;
    if (typeof profile.favoritesCount === "number") setFavCount(profile.favoritesCount);
    setIsFav(!!profile.isFavorite);
  }, [profile]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return unsub;
  }, []);

  // scroll do sekcji po wejściu
  useEffect(() => {
    const scrollTo = routerLocation.state?.scrollToId;
    if (!scrollTo || loading) return;

    const tryScroll = () => {
      const el = document.getElementById(scrollTo);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState({}, document.title, routerLocation.pathname);
      } else {
        requestAnimationFrame(tryScroll);
      }
    };

    requestAnimationFrame(tryScroll);
  }, [routerLocation.state, loading, routerLocation.pathname]);

  // fetch profilu
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const headers = uid ? { uid } : {};
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/profiles/slug/${slug}`, { headers });

        if (res.status === 403) {
          setAlert({ type: "error", message: "Profil jest obecnie niewidoczny lub wygasł." });
          setProfile(null);
          return;
        }

        if (!res.ok) throw new Error("Nie znaleziono wizytówki.");

        const data = await res.json();
        setProfile(data);

        if (typeof data.favoritesCount === "number") setFavCount(data.favoritesCount);
        if (typeof data.isFavorite === "boolean") setIsFav(data.isFavorite);
      } catch (err) {
        console.error("❌ Błąd:", err);
        setAlert({ type: "error", message: "Nie udało się załadować wizytówki." });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [slug, uid]);

  // wykryj czy już oceniał
  useEffect(() => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId || !profile?.ratedBy) return;

    const userRating = profile.ratedBy.find((r) => r.userId === currentUserId);
    if (userRating) {
      setHasRated(true);
      setSelectedRating(userRating.rating);
    }
  }, [profile]);

  // owner / rated
  useEffect(() => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId || !profile?.userId) return;
    setIsOwner(profile.userId === currentUserId);
    setHasRated(profile.ratedBy?.some((r) => r.userId === currentUserId));
  }, [profile]);

  const handleRate = async () => {
    if (isRatingSending) return;

    const userId = auth.currentUser?.uid;
    if (!userId) return setAlert({ type: "error", message: "Musisz być zalogowany, aby ocenić." });
    if (hasRated) return setAlert({ type: "info", message: "Już oceniłeś/aś ten profil." });
    if (!selectedRating) return setAlert({ type: "warning", message: "Wybierz liczbę gwiazdek." });

    if (comment.trim().length < 10) {
      return setAlert({ type: "warning", message: "Komentarz musi mieć min. 10 znaków." });
    }

    if (comment.length > maxChars) {
      return setAlert({
        type: "error",
        message: `Komentarz może mieć maksymalnie ${maxChars} znaków (obecnie: ${comment.length}).`,
      });
    }

    setIsRatingSending(true);

    const u = auth.currentUser;
    const userName = u?.displayName || u?.email || "Użytkownik";
    let userAvatar = normalizeAvatar(u?.photoURL || "");

    try {
      const r = await fetch(`${API}/api/users/${userId}`);
      if (r.ok) {
        const dbUser = await r.json();
        userAvatar = normalizeAvatar(dbUser?.avatar || userAvatar) || "";
      }
    } catch { }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/profiles/rate/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, rating: selectedRating, comment, userName, userAvatar }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setAlert({ type: "success", message: "Dziękujemy za opinię!" });

      const updated = await fetch(`${process.env.REACT_APP_API_URL}/api/profiles/slug/${slug}`);
      const updatedData = await updated.json();
      setProfile(updatedData);
    } catch (err) {
      setAlert({ type: "error", message: `${err.message}` });
    } finally {
      setIsRatingSending(false);
    }
  };

  const goToBooking = () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setAlert({ type: "error", message: "Aby skorzystać z rezerwacji, musisz być zalogowany." });
      return;
    }
    if (currentUser.uid === profile?.userId) {
      setAlert({ type: "info", message: "Nie możesz wykonać rezerwacji na własnym profilu." });
      return;
    }

    // ✅ jedyna blokada: showAvailableDates
    if (profile?.showAvailableDates === false) {
      setAlert({ type: "info", message: "Ten profil nie udostępnia wolnych terminów — możesz tylko napisać wiadomość." });
      return;
    }

    navigate(`/rezerwacja/${slug}`);
  };

  const startMessage = () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setAlert({ type: "error", message: "Aby wysłać wiadomość, musisz być zalogowany." });
      return;
    }
    if (currentUser.uid === profile?.userId) {
      setAlert({ type: "info", message: "Nie możesz wysłać wiadomości do własnego profilu." });
      return;
    }

    navigate(`/wiadomosc/${profile.userId}`, { state: { scrollToId: "messageFormContainer" } });
  };


  const toggleFavorite = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setAlert({ type: "error", message: "Aby dodać do ulubionych, musisz być zalogowany." });
      return;
    }
    if (currentUser.uid === profile?.userId) {
      setAlert({ type: "error", message: "Nie możesz dodać własnego profilu do ulubionych." });
      return;
    }

    const next = !isFav;
    setIsFav(next);
    setFavCount((c) => Math.max(0, c + (next ? 1 : -1)));

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/favorites/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          uid: currentUser.uid,
        },
        body: JSON.stringify({ profileUserId: profile.userId }),
      });

      const data = await res.json();
      if (typeof data?.isFav === "boolean") setIsFav(data.isFav);
      if (typeof data?.count === "number") setFavCount(data.count);
    } catch {
      setIsFav((v) => !v);
      setFavCount((c) => Math.max(0, c + (next ? -1 : +1)));
      setAlert({ type: "error", message: "Nie udało się zaktualizować ulubionych. Spróbuj ponownie." });
    }
  };

  // ====== UI states ======
  if (loading) return <div className={styles.state}>⏳ Wczytywanie wizytówki...</div>;

  if (!profile) {
    return (
      <div className={styles.state}>
        {alert ? (
          <AlertBox type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        ) : (
          <div className={styles.emptyCard}>
            <span className={styles.emptyIcon}>❌</span>
            <p>Nie znaleziono profilu lub jest obecnie niewidoczny.</p>
          </div>
        )}
      </div>
    );
  }

  const {
    name,
    avatar,
    role,
    rating,
    reviews,
    location,
    tags,
    priceFrom = null,
    priceTo = null,
    description,
    links = [],
    profileType,
    contact = {},
    socials = {},
  } = profile;

  // ===== rating/reviews (ładnie + bezpiecznie) =====
  const ratedByArr = Array.isArray(profile?.ratedBy) ? profile.ratedBy : [];

  // liczba opinii: najpierw ratedBy, potem reviews, na końcu 0
  const reviewsCount =
    ratedByArr.length > 0
      ? ratedByArr.length
      : Array.isArray(reviews)
        ? reviews.length
        : Number.isFinite(Number(reviews))
          ? Number(reviews)
          : 0;

  // średnia ocena: najpierw liczona z ratedBy, potem rating z bazy, na końcu 0
  const avgRating =
    ratedByArr.length > 0
      ? ratedByArr.reduce((sum, r) => sum + Number(r?.rating || 0), 0) / ratedByArr.length
      : Number.isFinite(Number(rating))
        ? Number(rating)
        : 0;

  const avgRatingLabel = avgRating > 0 ? avgRating.toFixed(1) : "0.0";

  const themeVars = resolveProfileTheme(profile.theme);
  const cssVars = {
    "--pp-primary": themeVars.primary,
    "--pp-secondary": themeVars.secondary,
    "--pp-banner": themeVars.banner,
  };

  const hasGallery = Array.isArray(profile.photos) && profile.photos.length > 0;
  const hasServices = Array.isArray(profile.services) && profile.services.length > 0;

  const bookingMode = String(profile?.bookingMode || "off").toLowerCase();
  const bookingEnabled = !["off", "none", "disabled", ""].includes(bookingMode);

  const isCalendar = bookingMode === "calendar";

  // ✅ jedyne źródło prawdy (bez dat)
  const allowBookingUI = bookingEnabled && profile?.showAvailableDates !== false;

  // ✅ pokazujemy główne CTA tylko gdy allowBookingUI
  const showBookButton = !isOwner && allowBookingUI;

  // ✅ info “możesz tylko napisać” tylko gdy booking włączony, ale showAvailableDates wyłączone
  const showNoBookingInfo = !isOwner && bookingEnabled && !allowBookingUI;

  // Tekst CTA zależny od trybu
  const bookBtnLabel = isCalendar ? "ZAREZERWUJ TERMIN" : "WYŚLIJ ZAPYTANIE";

  const cleanLinks = (links || [])
    .map((l) => (l || "").trim())
    .filter(Boolean);

  const contactPhone = normalizePhone(contact?.phone);
  const contactEmail = (contact?.email || "").trim();

  const fullAddress =
    (contact?.addressFull || "").trim() ||
    [location, contact?.postcode, contact?.street]
      .map((v) => (v || "").trim())
      .filter(Boolean)
      .join(", ");

  const mapsUrl = buildGoogleMapsLink(fullAddress);

  const socialItems = [
    { key: "website", label: "WWW", icon: <FaGlobe />, url: socials?.website },
    { key: "facebook", label: "Facebook", icon: <FaFacebook />, url: socials?.facebook },
    { key: "instagram", label: "Instagram", icon: <FaInstagram />, url: socials?.instagram },
    { key: "youtube", label: "YouTube", icon: <FaYoutube />, url: socials?.youtube },
    { key: "tiktok", label: "TikTok", icon: <FaTiktok />, url: socials?.tiktok },
    { key: "linkedin", label: "LinkedIn", icon: <FaLinkedin />, url: socials?.linkedin },
    { key: "x", label: "X", icon: <FaXTwitter />, url: socials?.x },
  ]
    .map((s) => ({ ...s, url: ensureUrl(s.url) }))
    .filter((s) => !!s.url);

  const hasContact = !!fullAddress || !!contactPhone || !!contactEmail;
  const hasSocials = socialItems.length > 0;
  const hasInfoBox = hasContact || hasSocials || cleanLinks.length > 0;

  const typeLabel =
    profileType === "zawodowy"
      ? "Zawód"
      : profileType === "hobbystyczny"
        ? "Hobby"
        : profileType === "serwis"
          ? "Serwis"
          : profileType === "społeczność"
            ? "Społeczność"
            : "Profil";

  return (
    <div className={styles.page} style={cssVars}>
      {/* top glow background */}
      <div className={styles.bgGlow} aria-hidden="true" />

      <div className={styles.shell} id="profileWrapper">
        {alert && <AlertBox type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

        {/* ===== HERO ===== */}
        <header className={styles.hero}>
          <div className={styles.heroInner}>
            {/* ✅ BADGE w prawym górnym rogu */}
            <div className={styles.heroBadge}>
              <div className={styles.badgeItem}>
                <FaRegEye />
                <span>
                  <span>
                    <strong>{Number(profile?.visits ?? 0).toLocaleString("pl-PL")}</strong>&nbsp;odwiedzin
                  </span>
                </span>
              </div>

              <div
                className={styles.badgeItem}
                title={`Ocena: ${avgRatingLabel} (${reviewsCount} opinii)`}
                aria-label={`Ocena ${avgRatingLabel}, liczba opinii ${reviewsCount}`}
              >
                <FaStar />
                <span>
                  <strong>{avgRatingLabel}</strong>
                  <span className={styles.badgeDot} />
                  <span>
                    {reviewsCount}{" "}
                    {reviewsCount === 1 ? "opinia" : reviewsCount > 1 && reviewsCount < 5 ? "opinie" : "opinii"}
                  </span>
                </span>
              </div>
            </div>

            {/* ✅ LOKALIZACJA w lewym górnym rogu heroInner */}
            <div className={styles.heroTopLeft}>
              <span className={styles.locPill} title={location || "Brak lokalizacji"}>
                <FaMapMarkerAlt />
                <span className={styles.locText}>{location || "Brak lokalizacji"}</span>
              </span>
            </div>

            <div className={styles.heroLeft}>
              {/* ✅ NAZWA + TYP obok nazwy */}
              <div className={styles.titleRow}>
                <h1 className={styles.heroTitle}>{name}</h1>

                <span className={`${styles.titlePill} ${styles[`type_${profileType}`] || ""}`}>
                  {typeLabel}
                </span>
              </div>
              {/* ✅ ROLE + RATING pod nazwą */}
              <div className={styles.metaRow}>
                {role?.trim() && (
                  <div className={styles.roleText} title={role}>
                    {role}
                  </div>
                )}
              </div>


              <div className={styles.heroActions}>
                <button
                  type="button"
                  className={`${styles.favBtn} ${isFav ? styles.favActive : ""}`}
                  onClick={toggleFavorite}
                  aria-label={isFav ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                  title={isFav ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                >
                  {isFav ? <FaHeart /> : <FaRegHeart />}
                  <span>
                    Ulubione: <strong>{favCount}</strong>
                  </span>
                </button>

                {hasServices && (
                  <a className={styles.ghostBtn} href="#services">
                    Zobacz usługi
                  </a>
                )}

                {/* ✅ NOWE CTA */}
                <div className={styles.ctaRow}>
                  {showBookButton && (
                    <button type="button" className={styles.ctaPrimary} onClick={goToBooking}>
                      <FaRegCalendarAlt />
                      {bookBtnLabel}
                    </button>
                  )}

                  {showNoBookingInfo && (
                    <div className={styles.reservationInfo}>
                      Ten profil nie udostępnia wolnych terminów – możesz tylko napisać wiadomość.
                    </div>
                  )}

                  {!isOwner && (
                    <button type="button" className={styles.ctaSecondary} onClick={startMessage}>
                      <FaPaperPlane />
                      ZADAJ PYTANIE
                    </button>
                  )}
                </div>

              </div>

            </div>

            <div className={styles.heroRight}>
              <div className={styles.avatarWrap}>
                <img
                  src={normalizeAvatar(avatar) || "/images/other/no-image.png"}
                  alt={name}
                  className={styles.avatar}
                  onError={(e) => {
                    e.currentTarget.src = "/images/other/no-image.png";
                  }}
                />
                <div className={styles.avatarRing} aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className={styles.heroFade} aria-hidden="true" />
        </header>

        {/* ===== GRID ===== */}
        <main className={styles.grid}>
          {/* ===== LEFT / MAIN CARD ===== */}
          <section className={styles.mainCard}>
            <div className={styles.cardHeader}>
              <div className={styles.titleWrap}>
                <h2 className={styles.sectionTitle}>O profilu</h2>
              </div>

              <div className={styles.pricePill}>

                {typeof priceFrom === "number" && typeof priceTo === "number" ? (
                  <>
                    Cennik: <span>od</span> <strong>{priceFrom} zł</strong> <span>do</span> <strong>{priceTo} zł</strong>
                  </>
                ) : (
                  <em>Cennik: brak danych</em>
                )}
              </div>
            </div>

            <div className={styles.cardBody}>
              {description?.trim() ? (
                <p className={styles.desc}>{description}</p>
              ) : (
                <p className={styles.muted}>Użytkownik nie dodał jeszcze opisu.</p>
              )}

              {tags?.length > 0 && (
                <div className={styles.chips}>
                  {tags.map((tag) => (
                    <span key={tag} className={styles.chip}>
                      {String(tag).toUpperCase()}
                    </span>
                  ))}
                </div>
              )}

              <div className={styles.splitLine} />

              {/* LINKI */}
              <div className={styles.block}>
                <h3 className={styles.blockTitle}>Linki</h3>

                {cleanLinks.length > 0 ? (
                  <div className={styles.linkGrid}>
                    {cleanLinks.map((link, i) => (
                      <a
                        key={`${link}-${i}`}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.linkTile}
                        title={link}
                      >
                        <span className={styles.linkDomain}>{prettyUrl(link)}</span>
                        <span className={styles.linkHint}>Otwórz</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className={styles.muted}>Użytkownik nie dodał jeszcze żadnych linków.</p>
                )}
              </div>

              <div className={styles.splitLine} />

              {/* OCENA */}
              {!isOwner && (
                <div className={styles.rateBox}>
                  <div className={styles.rateTop}>
                    <h3 className={styles.blockTitle}>{hasRated ? "Twoja ocena" : "Oceń profil"}</h3>
                    <span className={styles.rateHint}>{hasRated ? "Dziękujemy!" : "Wybierz gwiazdki + dodaj komentarz"}</span>
                  </div>

                  <div className={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((val) => (
                      <FaStar
                        key={val}
                        className={
                          val <= (hoveredRating || selectedRating) ? styles.starOn : styles.starOff
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
                        className={styles.textarea}
                        placeholder="Napisz krótko, co było na plus / co można poprawić (min. 10 znaków)"
                        value={comment}
                        onChange={(e) => {
                          const text = e.target.value;
                          if (text.length <= maxChars) setComment(text);
                        }}
                      />

                      <div className={styles.textareaMeta}>
                        <span className={styles.mutedSmall}>Bądź konkretny/a — to pomaga.</span>
                        <span className={styles.counter}>
                          {comment.length} / {maxChars}
                        </span>
                      </div>

                      <LoadingButton
                        type="button"
                        isLoading={isRatingSending}
                        disabled={isRatingSending}
                        className={styles.primaryBtn}
                        onClick={handleRate}
                      >
                        Wyślij opinię
                      </LoadingButton>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ===== RIGHT / STICKY PANEL ===== */}
          <aside className={styles.side}>
            {/* OPINIE */}
            <section className={styles.sideCard}>
              <div className={styles.sideHeader}>
                <h2 className={styles.sectionTitle}>Opinie</h2>
                <span className={styles.badgeCount}>{profile.ratedBy?.length || 0}</span>
              </div>

              {profile.ratedBy?.length > 0 ? (
                <ul className={styles.reviewList}>
                  {profile.ratedBy.map((op, i) => {
                    const ratingVal = Number(op.rating);
                    const avatarSrc = normalizeAvatar(op.userAvatar) || "/images/other/no-image.png";

                    const dateLabel = op.createdAt
                      ? new Date(op.createdAt).toLocaleDateString("pl-PL", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                      : "";

                    return (
                      <li key={i} className={styles.review}>
                        <div className={styles.reviewTop}>
                          <div className={styles.reviewUser}>
                            <img
                              src={avatarSrc}
                              alt=""
                              className={styles.reviewAvatar}
                              decoding="async"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.src = "/images/other/no-image.png";
                              }}
                            />
                            <div className={styles.reviewMeta}>
                              <strong className={styles.reviewName}>{op.userName || "Użytkownik"}</strong>
                              {dateLabel && <span className={styles.reviewDate}>{dateLabel}</span>}
                            </div>
                          </div>

                          <div className={styles.reviewStars}>
                            {[...Array(5)].map((_, idx) => (
                              <FaStar key={idx} className={idx < ratingVal ? styles.starMiniOn : styles.starMiniOff} />
                            ))}
                          </div>
                        </div>

                        <p className={styles.reviewText}>{op.comment}</p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className={styles.muted}>Brak opinii użytkowników.</p>
              )}
            </section>

            {/* INFO / KONTAKT */}
            {hasInfoBox && (
              <section className={styles.sideCard}>
                <div className={styles.sideHeader}>
                  <h2 className={styles.sectionTitle}>Kontakt i social</h2>
                </div>

                <div className={styles.infoList}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLeft}>
                      <FaMapMarkedAlt />
                      <span>Adres</span>
                    </span>

                    {fullAddress ? (
                      <a className={styles.infoLink} href={mapsUrl} target="_blank" rel="noopener noreferrer">
                        {fullAddress}
                      </a>
                    ) : (
                      <span className={styles.muted}>Brak danych</span>
                    )}
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLeft}>
                      <FaPhoneAlt />
                      <span>Telefon</span>
                    </span>

                    {contactPhone ? (
                      <a className={styles.infoLink} href={`tel:${contactPhone}`}>
                        {contact.phone}
                      </a>
                    ) : (
                      <span className={styles.muted}>Brak danych</span>
                    )}
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLeft}>
                      <FaEnvelope />
                      <span>E-mail</span>
                    </span>

                    {contactEmail ? (
                      <a className={styles.infoLink} href={`mailto:${contactEmail}`}>
                        {contactEmail}
                      </a>
                    ) : (
                      <span className={styles.muted}>Brak danych</span>
                    )}
                  </div>
                </div>

                {hasSocials && (
                  <>
                    <div className={styles.splitLine} />
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
                          <span className={styles.socialText}>{s.label}</span>
                        </a>
                      ))}
                    </div>
                  </>
                )}

                {cleanLinks.length > 0 && (
                  <>
                    <div className={styles.splitLine} />
                    <div className={styles.pills}>
                      {cleanLinks.map((link, i) => (
                        <a
                          key={`${link}-${i}`}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.pill}
                        >
                          {prettyUrl(link)}
                        </a>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}
          </aside>
        </main>

        {/* ===== GALLERY ===== */}
        {hasGallery && (
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Galeria</h2>
              <span className={styles.mutedSmall}>Kliknij zdjęcie, aby powiększyć</span>
            </div>

            <div className={styles.gallery}>
              {profile.photos.map((url, i) => {
                const src = normalizeAvatar(url) || url;
                return (
                  <button
                    key={i}
                    type="button"
                    className={styles.galleryItem}
                    onClick={() => openLightbox(src)}
                    aria-label={`Otwórz zdjęcie ${i + 1}`}
                    title="Otwórz"
                  >
                    <img
                      src={src}
                      alt={`Zdjęcie ${i + 1}`}
                      onError={(e) => {
                        e.currentTarget.src = "/images/other/no-image.png";
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ===== SERVICES ===== */}
        {(hasServices || hasInfoBox) && (
          <section className={styles.sectionCard} id="services">
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Usługi</h2>
              <span className={styles.mutedSmall}>Nazwa + czas realizacji</span>
            </div>

            {hasServices ? (
              <ul className={styles.services}>
                {profile.services.map((s, i) => (
                  <li key={i} className={styles.serviceRow}>
                    <span className={styles.serviceName}>{s.name}</span>
                    <span className={styles.serviceTime}>
                      {s.duration.value} {mapUnit(s.duration.unit)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>Brak usług do wyświetlenia.</p>
            )}
          </section>
        )}
      </div>

      {/* LIGHTBOX */}
      {fullscreenImage && (
        <div className={styles.lightbox} onClick={closeLightbox} role="dialog" aria-modal="true">
          <button type="button" className={styles.lightboxClose} onClick={closeLightbox} aria-label="Zamknij">
            ✕
          </button>
          <img src={fullscreenImage} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
