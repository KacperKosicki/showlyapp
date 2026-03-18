import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import styles from "./PublicProfile.module.scss";
import { auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";

import AlertBox from "../AlertBox/AlertBox";
import LoadingButton from "../ui/LoadingButton/LoadingButton";

import {
  FaMapMarkerAlt,
  FaStar,
  FaRegEye,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkedAlt,
  FaGlobe,
} from "react-icons/fa";
import {
  FaHeart,
  FaRegHeart,
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaTiktok,
  FaLinkedin,
  FaXTwitter,
  FaListUl,
} from "react-icons/fa6";
import { FaRegCalendarAlt, FaPaperPlane } from "react-icons/fa";

import { FiFlag } from "react-icons/fi";
import { reportApi } from "../../api/reportApi";

import "react-calendar/dist/Calendar.css";

const REPORT_REASONS = [
  { v: "spam", label: "Spam / reklama" },
  { v: "fake", label: "Fałszywe informacje" },
  { v: "abuse", label: "Nękanie / obraźliwe treści" },
  { v: "illegal", label: "Nielegalne treści" },
  { v: "other", label: "Inne" },
];

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

const authHeaders = async (extra = {}) => {
  const firebaseUser = auth.currentUser;

  const uid = firebaseUser?.uid || "";
  let token = "";

  try {
    token = firebaseUser?.getIdToken ? await firebaseUser.getIdToken(true) : "";
  } catch {
    token = "";
  }

  return {
    ...(uid ? { uid } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
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

const normalizePhotos = (photos) => {
  if (!Array.isArray(photos)) return [];
  return photos
    .map((p) => normalizeAvatar(p) || (typeof p === "string" ? p : p?.url) || "")
    .map((s) => String(s || "").trim())
    .filter(Boolean);
};

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

  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState("profile");
  const [reportReviewId, setReportReviewId] = useState(null);
  const [reportReason, setReportReason] = useState("spam");
  const [reportMsg, setReportMsg] = useState("");
  const [reportSending, setReportSending] = useState(false);

  const maxChars = 200;

  const openLightbox = (src) => setFullscreenImage(src);
  const closeLightbox = () => setFullscreenImage(null);

  const openReportProfile = () => {
    setReportType("profile");
    setReportReviewId(null);
    setReportReason("spam");
    setReportMsg("");
    setReportOpen(true);
  };

  const openReportReview = (reviewId) => {
    setReportType("review");
    setReportReviewId(reviewId);
    setReportReason("abuse");
    setReportMsg("");
    setReportOpen(true);
  };

  const submitReport = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setAlert({ type: "error", message: "Aby zgłosić, musisz być zalogowany." });
      return;
    }

    if (reportType === "profile" && currentUser.uid === profile?.userId) {
      setAlert({ type: "info", message: "Nie możesz zgłosić własnego profilu." });
      return;
    }

    if (!profile?.userId) {
      setAlert({ type: "error", message: "Brak danych profilu (userId)." });
      return;
    }

    if (reportType === "review" && !reportReviewId) {
      setAlert({ type: "error", message: "Brak identyfikatora opinii." });
      return;
    }

    try {
      setReportSending(true);

      await reportApi.create({
        type: reportType,
        profileUserId: profile.userId,
        reason: reportReason,
        message: reportMsg,
        reviewId: reportType === "review" ? reportReviewId : null,
      });

      setAlert({ type: "success", message: "Zgłoszenie wysłane. Dziękujemy!" });
      setReportOpen(false);
    } catch (e) {
      setAlert({
        type: "error",
        message: e?.response?.data?.message || "Nie udało się wysłać zgłoszenia.",
      });
    } finally {
      setReportSending(false);
    }
  };

  useEffect(() => {
    if (reportOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
  }, [reportOpen]);

  useEffect(() => {
    if (fullscreenImage) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
  }, [fullscreenImage]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (fullscreenImage) closeLightbox();
        if (reportOpen) setReportOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fullscreenImage, reportOpen]);

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

  const mapServiceCategory = (cat) => {
    switch (cat) {
      case "service":
        return "Usługa";
      case "product":
        return "Produkt";
      case "project":
        return "Projekt";
      case "artwork":
        return "Obraz / dzieło";
      case "handmade":
        return "Rękodzieło";
      case "lesson":
        return "Lekcja";
      case "consultation":
        return "Konsultacja";
      case "event":
        return "Event";
      case "custom":
        return "Inne";
      default:
        return "Oferta";
    }
  };

  const getServiceImageUrl = (service) => {
    if (!service) return "";
    if (typeof service.image === "string") return normalizeAvatar(service.image);
    if (service.image?.url) return normalizeAvatar(service.image.url);
    return "";
  };

  const formatServicePrice = (service) => {
    const mode = service?.price?.mode;
    const currency = service?.price?.currency || "PLN";

    if (mode === "fixed" && service?.price?.amount != null) {
      return `${service.price.amount} ${currency}`;
    }

    if (mode === "from" && service?.price?.from != null) {
      return `od ${service.price.from} ${currency}`;
    }

    if (
      mode === "range" &&
      service?.price?.from != null &&
      service?.price?.to != null
    ) {
      return `${service.price.from}–${service.price.to} ${currency}`;
    }

    if (mode === "free") return "Darmowe";
    if (mode === "contact") return "Wycena indywidualna";

    return "Brak ceny";
  };

  const [, setFavCount] = useState(0);
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

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(`${API}/api/profiles/slug/${slug}`, { headers });

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

  useEffect(() => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId || !profile?.ratedBy) return;

    const userRating = profile.ratedBy.find((r) => r.userId === currentUserId);
    if (userRating) {
      setHasRated(true);
      setSelectedRating(userRating.rating);
    }
  }, [profile]);

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
      const r = await fetch(`${API}/api/users/${userId}`, { headers: await authHeaders() });
      if (r.ok) {
        const dbUser = await r.json();
        userAvatar = normalizeAvatar(dbUser?.avatar || userAvatar) || "";
      }
    } catch { }

    try {
      const headers = await authHeaders({ "Content-Type": "application/json" });

      const res = await fetch(`${API}/api/profiles/rate/${slug}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ userId, rating: selectedRating, comment, userName, userAvatar }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setAlert({ type: "success", message: "Dziękujemy za opinię!" });

      const updated = await fetch(`${API}/api/profiles/slug/${slug}`, { headers: await authHeaders() });
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

    if (profile?.showAvailableDates === false) {
      setAlert({
        type: "info",
        message: "Ten profil nie udostępnia wolnych terminów — możesz tylko napisać wiadomość.",
      });
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

    const prevIsFav = isFav;
    const next = !prevIsFav;

    setIsFav(next);
    setFavCount((c) => Math.max(0, c + (next ? 1 : -1)));

    try {
      const res = await fetch(`${API}/api/favorites/toggle`, {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ profileUserId: profile.userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Nie udało się zaktualizować ulubionych.");
      }

      const finalIsFav = typeof data?.isFav === "boolean" ? data.isFav : next;

      if (typeof data?.isFav === "boolean") setIsFav(data.isFav);
      if (typeof data?.count === "number") setFavCount(data.count);

      setAlert({
        type: "info",
        message: finalIsFav
          ? "Profil został dodany do ulubionych."
          : "Profil został usunięty z ulubionych.",
      });
    } catch {
      setIsFav(prevIsFav);
      setFavCount((c) => Math.max(0, c + (prevIsFav ? 1 : -1)));

      setAlert({
        type: "error",
        message: "Nie udało się zaktualizować ulubionych. Spróbuj ponownie.",
      });
    }
  };

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
    partnership = {},
  } = profile;

  const pf = Number(priceFrom);
  const pt = Number(priceTo);
  const hasPrice = Number.isFinite(pf) && Number.isFinite(pt) && pf > 0 && pt >= pf;

  const profileAvatarSrc = normalizeAvatar(avatar) || "/images/other/no-image.png";

  const gallery = normalizePhotos(profile.photos);
  const hasGallery = gallery.length > 0;

  const ratedByArr = Array.isArray(profile?.ratedBy) ? profile.ratedBy : [];

  const reviewsCount =
    ratedByArr.length > 0
      ? ratedByArr.length
      : Array.isArray(reviews)
        ? reviews.length
        : Number.isFinite(Number(reviews))
          ? Number(reviews)
          : 0;

  const avgRating =
    ratedByArr.length > 0
      ? ratedByArr.reduce((sum, r) => sum + Number(r?.rating || 0), 0) / ratedByArr.length
      : Number.isFinite(Number(rating))
        ? Number(rating)
        : 0;

  const avgRatingLabel = avgRating > 0 ? avgRating.toFixed(1) : "0.0";

  const themeVars = resolveProfileTheme(profile.theme);
  const partner = resolvePartnerData(partnership);

  const cssVars = {
    "--pp-primary": themeVars.primary,
    "--pp-secondary": themeVars.secondary,
    "--pp-banner": themeVars.banner,
    "--pp-partner": partner.color,
    "--pp-partner-soft": `color-mix(in srgb, ${partner.color} 16%, white)`,
    "--pp-partner-border": `color-mix(in srgb, ${partner.color} 42%, rgba(15, 23, 42, 0.12))`,
    "--pp-partner-glow": `color-mix(in srgb, ${partner.color} 28%, transparent)`,
  };

  const visibleServices = Array.isArray(profile.services)
    ? profile.services
      .filter((s) => s?.isActive !== false)
      .sort((a, b) => Number(a?.order ?? 0) - Number(b?.order ?? 0))
    : [];

  const hasServices = visibleServices.length > 0;

  const bookingMode = String(profile?.bookingMode || "off").toLowerCase();
  const bookingEnabled = !["off", "none", "disabled", ""].includes(bookingMode);
  const isCalendar = bookingMode === "calendar";

  const allowBookingUI = bookingEnabled && profile?.showAvailableDates !== false;

  const showBookButton = !isOwner && allowBookingUI;
  const bookBtnLabel = isCalendar ? "ZAREZERWUJ TERMIN" : "WYŚLIJ ZAPYTANIE";

  const cleanLinks = (links || []).map((l) => (l || "").trim()).filter(Boolean);

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
      ? "ZAWODOWY"
      : profileType === "hobbystyczny"
        ? "HOBBY"
        : profileType === "serwis"
          ? "SERWIS"
          : profileType === "społeczność"
            ? "SPOŁECZNOŚĆ"
            : "PROFIL";

  return (
    <div className={styles.page} style={cssVars}>
      <div className={styles.bgGlow} aria-hidden="true" />

      <div
        className={`${styles.shell} ${partner.isPartner ? styles.partnerShell : ""}`}
        id="profileWrapper"
      >
        {alert && <AlertBox type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

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
              <span className={styles.locText}>{location || "Brak lokalizacji"}</span>
            </span>

            <span className={styles.ratingPill} title={`Ocena: ${avgRatingLabel} (${reviewsCount})`}>
              <FaStar />
              <span>
                <strong>{avgRatingLabel}</strong>
                <span className={styles.dot} />
                <span>{reviewsCount} opinii</span>
              </span>
            </span>
          </div>

          <div className={styles.heroInner}>
            <div className={styles.heroIdentity}>
              <div className={styles.avatarWrap}>
                <img
                  src={profileAvatarSrc}
                  alt={name}
                  className={styles.avatar}
                  onError={(e) => {
                    e.currentTarget.src = "/images/other/no-image.png";
                  }}
                />
                <div className={styles.avatarRing} aria-hidden="true" />
              </div>

              <div className={styles.heroInfo}>
                <div className={styles.titleRow}>
                  <h1 className={styles.heroTitle}>{name}</h1>

                  <div className={styles.badgesRow}>
                    {partner.isPartner && (
                      <span
                        className={`${styles.partnerBadge} ${styles[`partner_${partner.tier}`] || ""
                          }`}
                      >
                        {partner.label}
                      </span>
                    )}

                    {role?.trim() && <span className={styles.roleBadge}>{role}</span>}

                    <span className={`${styles.titlePill} ${styles[`type_${profileType}`] || ""}`}>
                      {typeLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.heroBottom}>
              <div className={styles.metricRow}>
                <div className={styles.metricCard}>
                  <span className={styles.metricIcon}>
                    <FaRegEye />
                  </span>
                  <div className={styles.metricContent}>
                    <strong>{Number(profile?.visits ?? 0).toLocaleString("pl-PL")}</strong>
                    <span>Odwiedzin</span>
                  </div>
                </div>

                <button
                  type="button"
                  className={`${styles.metricCard} ${styles.favoriteMetric} ${isFav ? styles.favActive : ""}`}
                  onClick={toggleFavorite}
                >
                  <span className={styles.metricIcon}>
                    {isFav ? <FaHeart /> : <FaRegHeart />}
                  </span>
                  <div className={styles.metricContent}>
                    <strong>{isFav ? "W ulubionych" : "Dodaj"}</strong>
                    <span>Ulubione</span>
                  </div>
                </button>
              </div>

              <div className={styles.heroActions}>
                {hasServices && (
                  <a className={styles.ghostBtn} href="#services">
                    <FaListUl />
                    <span>Zobacz usługi</span>
                  </a>
                )}

                {!isOwner && (
                  <button
                    type="button"
                    className={styles.reportPill}
                    onClick={openReportProfile}
                  >
                    <FiFlag />
                    <span className={styles.reportText}>Zgłoś profil</span>
                  </button>
                )}
              </div>

              <div className={styles.ctaRow}>
                {showBookButton && (
                  <button
                    type="button"
                    className={styles.ctaPrimary}
                    onClick={goToBooking}
                  >
                    <FaRegCalendarAlt />
                    {bookBtnLabel}
                  </button>
                )}

                {!isOwner && (
                  <button
                    type="button"
                    className={styles.ctaSecondary}
                    onClick={startMessage}
                  >
                    <FaPaperPlane />
                    ZADAJ PYTANIE
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className={styles.grid}>
          <section className={styles.mainCol}>
            <section className={styles.mainCard}>
              <div className={styles.cardHeader}>
                <div className={styles.titleWrap}>
                  <h2 className={styles.sectionTitle}>O profilu</h2>
                  <p className={styles.sectionSub}>Najważniejsze informacje o działalności i ofercie.</p>
                </div>

                <div className={styles.pricePill}>
                  {hasPrice ? (
                    <>
                      Cennik: <span>od</span> <strong>{pf} zł</strong> <span>do</span> <strong>{pt} zł</strong>
                    </>
                  ) : (
                    <em>Cennik: brak danych</em>
                  )}
                </div>
              </div>

              <div className={styles.cardBody}>
                {description?.trim() ? (
                  <div className={styles.descBox}>
                    <p className={styles.desc}>{description}</p>
                  </div>
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

                <div className={styles.block}>
                  <div className={styles.blockHeader}>
                    <h3 className={styles.blockTitle}>Linki</h3>
                    <span className={styles.blockHint}>
                      {cleanLinks.length > 0 ? `${cleanLinks.length} ${cleanLinks.length === 1 ? "link" : "linki"}` : ""}
                    </span>
                  </div>

                  {cleanLinks.length > 0 ? (
                    <div className={styles.linkGrid}>
                      {cleanLinks.map((link, i) => {
                        const href = ensureUrl(link);
                        return (
                          <a
                            key={`${href}-${i}`}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.linkTile}
                            title={href}
                          >
                            <div className={styles.linkTileLeft}>
                              <span className={styles.linkBadge}>
                                <FaGlobe />
                              </span>
                              <span className={styles.linkDomain}>{prettyUrl(href)}</span>
                            </div>
                            <span className={styles.linkHint}>Otwórz</span>
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <p className={styles.muted}>Użytkownik nie dodał jeszcze żadnych linków.</p>
                  )}
                </div>

                {!isOwner && (
                  <>
                    <div className={styles.splitLine} />

                    <div className={styles.rateBox}>
                      <div className={styles.rateTop}>
                        <div>
                          <h3 className={styles.blockTitle}>{hasRated ? "Twoja ocena" : "Oceń profil"}</h3>
                          <span className={styles.rateHint}>
                            {hasRated ? "Dziękujemy za opinię!" : "Wybierz gwiazdki i dodaj krótki komentarz."}
                          </span>
                        </div>
                      </div>

                      <div className={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((val) => (
                          <FaStar
                            key={val}
                            className={val <= (hoveredRating || selectedRating) ? styles.starOn : styles.starOff}
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
                  </>
                )}
              </div>
            </section>

            {hasGallery && (
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Galeria</h2>
                    <p className={styles.sectionSub}>Zdjęcia profilu i realizacji.</p>
                  </div>
                  <span className={styles.badgeCount}>{gallery.length}</span>
                </div>

                <div className={styles.gallery}>
                  {gallery.map((src, i) => (
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
                      <span className={styles.galleryOverlay}>Podgląd</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {hasServices && (
              <section className={styles.sectionCard} id="services">
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Usługi</h2>
                    <p className={styles.sectionSub}>Oferta, ceny i czas realizacji.</p>
                  </div>
                  <span className={styles.badgeCount}>{visibleServices.length}</span>
                </div>

                <div className={styles.servicesGrid}>
                  {visibleServices.map((s, i) => {
                    const img = getServiceImageUrl(s);
                    const categoryLabel = mapServiceCategory(s.category);
                    const priceLabel = formatServicePrice(s);
                    const durationLabel =
                      s?.duration?.value && s?.duration?.unit
                        ? `${s.duration.value} ${mapUnit(s.duration.unit)}`
                        : "Brak czasu";

                    return (
                      <article key={s._id || i} className={styles.serviceCard}>
                        <div className={styles.serviceMedia}>
                          {img ? (
                            <img
                              src={img}
                              alt={s.name || `Usługa ${i + 1}`}
                              className={styles.serviceImage}
                              onError={(e) => {
                                e.currentTarget.src = "/images/other/no-image.png";
                              }}
                            />
                          ) : (
                            <div className={styles.serviceImagePlaceholder}>
                              <FaRegCalendarAlt />
                              <span>Bez zdjęcia</span>
                            </div>
                          )}

                          <div className={styles.serviceBadges}>
                            <span className={styles.serviceCategoryBadge}>{categoryLabel}</span>

                            {s.featured && (
                              <span className={styles.serviceFeaturedBadge}>
                                Wyróżniona
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={styles.serviceContent}>
                          <div className={styles.serviceTop}>
                            <h3 className={styles.serviceCardTitle}>{s.name}</h3>
                          </div>

                          {s.shortDescription?.trim() ? (
                            <p className={styles.serviceDescription}>{s.shortDescription}</p>
                          ) : (
                            <p className={styles.serviceDescriptionMuted}>
                              Użytkownik nie dodał krótkiego opisu tej usługi.
                            </p>
                          )}

                          <div className={styles.serviceMetaGrid}>
                            <div className={styles.serviceMetaItem}>
                              <span className={styles.serviceMetaLabel}>Cena</span>
                              <span className={styles.serviceMetaValue}>{priceLabel}</span>
                            </div>

                            <div className={styles.serviceMetaItem}>
                              <span className={styles.serviceMetaLabel}>Czas</span>
                              <span className={styles.serviceMetaValue}>{durationLabel}</span>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </section>

          <aside className={styles.side}>
            <section className={styles.sideCard}>
              <div className={styles.sideHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Opinie</h2>
                  <p className={styles.sectionSub}>Oceny i komentarze użytkowników.</p>
                </div>
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
                      <li key={op?._id || i} className={styles.review}>
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

                          <div className={styles.reviewRight}>
                            <div className={styles.reviewStars}>
                              {[...Array(5)].map((_, idx) => (
                                <FaStar key={idx} className={idx < ratingVal ? styles.starMiniOn : styles.starMiniOff} />
                              ))}
                            </div>

                            <button
                              type="button"
                              className={styles.reportMiniBtn}
                              onClick={() => openReportReview(op?._id)}
                              title="Zgłoś opinię"
                              aria-label="Zgłoś opinię"
                              disabled={!op?._id}
                            >
                              <FiFlag />
                            </button>
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

            {hasInfoBox && (
              <section className={styles.sideCard}>
                <div className={styles.sideHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Kontakt i social media</h2>
                    <p className={styles.sectionSub}>Najważniejsze kanały kontaktu w jednym miejscu.</p>
                  </div>
                </div>

                <div className={styles.infoList}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLeft}>
                      <span className={styles.infoIcon}>
                        <FaMapMarkedAlt />
                      </span>
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
                      <span className={styles.infoIcon}>
                        <FaPhoneAlt />
                      </span>
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
                      <span className={styles.infoIcon}>
                        <FaEnvelope />
                      </span>
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

                {socialItems.length > 0 && (
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
              </section>
            )}
          </aside>
        </main>
      </div>

      {fullscreenImage && (
        <div className={styles.lightbox} onClick={closeLightbox} role="dialog" aria-modal="true">
          <button type="button" className={styles.lightboxClose} onClick={closeLightbox} aria-label="Zamknij">
            ✕
          </button>
          <img src={fullscreenImage} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {reportOpen && (
        <div
          className={styles.reportModalBackdrop}
          onClick={() => setReportOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className={styles.reportModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.reportModalTop}>
              <h3 className={styles.reportTitle}>
                {reportType === "profile" ? "Zgłoś profil" : "Zgłoś opinię"}
              </h3>
              <button
                type="button"
                className={styles.reportClose}
                onClick={() => setReportOpen(false)}
                aria-label="Zamknij"
              >
                ✕
              </button>
            </div>

            <div className={styles.reportRow}>
              <label className={styles.reportLabel}>Powód</label>
              <select
                className={styles.reportSelect}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r.v} value={r.v}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.reportRow}>
              <label className={styles.reportLabel}>Dodatkowe informacje (opcjonalnie)</label>
              <textarea
                className={styles.reportTextarea}
                value={reportMsg}
                onChange={(e) => setReportMsg(e.target.value.slice(0, 400))}
                placeholder="Opisz krótko dlaczego zgłaszasz…"
              />
              <div className={styles.reportHint}>{reportMsg.length} / 400</div>
            </div>

            <div className={styles.reportActions}>
              <button
                type="button"
                className={styles.reportGhost}
                onClick={() => setReportOpen(false)}
                disabled={reportSending}
              >
                Anuluj
              </button>

              <LoadingButton
                type="button"
                className={styles.reportPrimary}
                isLoading={reportSending}
                disabled={reportSending}
                onClick={submitReport}
              >
                Wyślij zgłoszenie
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}