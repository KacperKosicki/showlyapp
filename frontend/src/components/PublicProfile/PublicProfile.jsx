import { useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import styles from "./PublicProfile.module.scss";
import { auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { createPortal } from "react-dom";

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
  FaRegCalendarAlt,
  FaPaperPlane,
  FaShieldAlt,
  FaBolt,
  FaClock,
  FaMoneyBillWave,
  FaImage,
  FaQuoteLeft,
  FaExternalLinkAlt,
  FaInfoCircle,
  FaComments,
  FaLink,
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
  FaCopy,
  FaCheck,
} from "react-icons/fa6";

import { FiFlag } from "react-icons/fi";
import { reportApi } from "../../api/reportApi";

const cn = (...classes) => classes.filter(Boolean).join(" ");

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

const normalizePhone = (val = "") =>
  String(val || "").replace(/\s+/g, "").trim();

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
  const secondary =
    (theme?.secondary || theme?.accent2 || "").trim() || preset.secondary;

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
    (partnership?.color || "").trim() || PARTNER_COLORS[tier] || "#59d0ff";

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
  const pageRef = useRef(null);

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

  const [, setFavCount] = useState(0);
  const [isFav, setIsFav] = useState(false);
  const [copiedProfileLink, setCopiedProfileLink] = useState(false);

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

  const openReportReview = (reviewId, reviewUserId = null) => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setAlert({
        type: "error",
        message: "Aby zgłosić opinię, musisz być zalogowany.",
      });
      return;
    }

    if (!reviewId) {
      setAlert({ type: "error", message: "Brak identyfikatora opinii." });
      return;
    }

    if (reviewUserId && currentUser.uid === reviewUserId) {
      setAlert({ type: "info", message: "Nie możesz zgłosić własnej opinii." });
      return;
    }

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

  useEffect(() => {
    const page = pageRef.current;

    if (!page || loading || !profile) {
      return undefined;
    }

    const animatedElements = page.querySelectorAll(`.${styles.reveal}`);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealVisible);
          } else {
            entry.target.classList.remove(styles.revealVisible);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -7% 0px",
      }
    );

    animatedElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [loading, profile, slug]);

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

    let attempts = 0;

    const scrollWithOffset = () => {
      const el = document.getElementById(scrollTo);

      if (!el && attempts < 20) {
        attempts++;
        requestAnimationFrame(scrollWithOffset);
        return;
      }

      if (!el) return;

      const offset = 90; // ile miejsca od góry
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY - offset;

      window.scrollTo({
        top,
        behavior: "smooth",
      });

      window.history.replaceState({}, document.title, routerLocation.pathname);
    };

    setTimeout(scrollWithOffset, 120);
  }, [routerLocation.state, loading, routerLocation.pathname]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(`${API}/api/profiles/slug/${slug}`, { headers });

        if (res.status === 403) {
          setAlert({
            type: "error",
            message: "Profil jest obecnie niewidoczny lub wygasł.",
          });
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

    if (!userId) {
      return setAlert({
        type: "error",
        message: "Musisz być zalogowany, aby ocenić.",
      });
    }

    if (hasRated) {
      return setAlert({
        type: "info",
        message: "Już oceniłeś/aś ten profil.",
      });
    }

    if (!selectedRating) {
      return setAlert({
        type: "warning",
        message: "Wybierz liczbę gwiazdek.",
      });
    }

    if (comment.trim().length < 10) {
      return setAlert({
        type: "warning",
        message: "Komentarz musi mieć min. 10 znaków.",
      });
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
      const r = await fetch(`${API}/api/users/${userId}`, {
        headers: await authHeaders(),
      });

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
        body: JSON.stringify({
          userId,
          rating: selectedRating,
          comment,
          userName,
          userAvatar,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setAlert({ type: "success", message: "Dziękujemy za opinię!" });

      const updated = await fetch(`${API}/api/profiles/slug/${slug}`, {
        headers: await authHeaders(),
      });

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
      setAlert({
        type: "error",
        message: "Aby skorzystać z rezerwacji, musisz być zalogowany.",
      });
      return;
    }

    if (currentUser.uid === profile?.userId) {
      setAlert({
        type: "info",
        message: "Nie możesz wykonać rezerwacji na własnym profilu.",
      });
      return;
    }

    if (profile?.showAvailableDates === false) {
      setAlert({
        type: "info",
        message:
          "Ten profil nie udostępnia wolnych terminów — możesz tylko napisać wiadomość.",
      });
      return;
    }

    navigate(`/rezerwacja/${slug}`);
  };

  const startMessage = () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setAlert({
        type: "error",
        message: "Aby wysłać wiadomość, musisz być zalogowany.",
      });
      return;
    }

    if (currentUser.uid === profile?.userId) {
      setAlert({
        type: "info",
        message: "Nie możesz wysłać wiadomości do własnego profilu.",
      });
      return;
    }

    navigate(`/wiadomosc/${profile.userId}`, {
      state: { scrollToId: "messageFormContainer" },
    });
  };

  const toggleFavorite = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setAlert({
        type: "error",
        message: "Aby dodać do ulubionych, musisz być zalogowany.",
      });
      return;
    }

    if (currentUser.uid === profile?.userId) {
      setAlert({
        type: "error",
        message: "Nie możesz dodać własnego profilu do ulubionych.",
      });
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

  const copyProfileLink = async () => {
    const url = `https://www.showly.me/${slug}`;

    try {
      await navigator.clipboard.writeText(url);

      setCopiedProfileLink(true);
      setAlert({
        type: "success",
        message: "Link do profilu został skopiowany.",
      });

      setTimeout(() => setCopiedProfileLink(false), 1800);
    } catch {
      setAlert({
        type: "error",
        message: "Nie udało się skopiować linku.",
      });
    }
  };

  if (loading) {
    return (
      <div className={cn(styles.state, styles.loadingState)}>
        <div className={styles.loadingCard}>
          <span className={styles.loadingOrb} />
          <strong>Wczytywanie wizytówki...</strong>
          <p>Ładujemy profil, galerię, opinie i dostępne opcje kontaktu.</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={cn(styles.state, styles.emptyState)}>
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
    banner,
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
  const publicBilling = profile?.billingPublic || profile?.billing || {};
  const publicPlan = String(
    publicBilling?.effectivePlan ||
    publicBilling?.plan ||
    ""
  ).toLowerCase();
  const bannerSrc = normalizeAvatar(banner);
  const showBanner = !!bannerSrc && ["standard", "premium"].includes(publicPlan);

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
      ? ratedByArr.reduce((sum, r) => sum + Number(r?.rating || 0), 0) /
      ratedByArr.length
      : Number.isFinite(Number(rating))
        ? Number(rating)
        : 0;

  const avgRatingLabel = avgRating > 0 ? avgRating.toFixed(1) : "0.0";
  const myRating = ratedByArr.find((r) => r.userId === uid);
  const myRatingLabel = myRating?.rating ? Number(myRating.rating).toFixed(1) : null;

  const themeVars = resolveProfileTheme(profile.theme);
  const partner = resolvePartnerData(partnership);

  const cssVars = {
    "--pp-primary": themeVars.primary,
    "--pp-secondary": themeVars.secondary,
    "--pp-banner": themeVars.banner,
    "--pp-banner-image": showBanner ? `url("${bannerSrc.replace(/"/g, "%22")}")` : "none",
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

  const billingFeatures = publicBilling?.features || null;

  const hasBillingFeatures =
    billingFeatures && Object.keys(billingFeatures).length > 0;

  const canUseSocialMedia = hasBillingFeatures
    ? !!billingFeatures.socialMedia
    : true;

  const canUseBooking = hasBillingFeatures
    ? !!billingFeatures.booking
    : true;

  const canUseRequestBlocking = hasBillingFeatures
    ? !!billingFeatures.requestBlocking
    : true;

  const rawBookingMode = String(profile?.bookingMode || "off").toLowerCase();

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

  const allowBookingUI = bookingEnabled && profile?.showAvailableDates !== false;
  const showBookButton = !isOwner && allowBookingUI;
  const bookBtnLabel = isCalendar ? "Zarezerwuj termin" : "Wyślij zapytanie";

  const getServiceCtaLabel = () => {
    if (isCalendar) return "Zarezerwuj tę usługę";
    if (bookingMode === "request-blocking") return "Zapytaj o termin";
    if (bookingMode === "request-open") return "Wyślij zapytanie";
    return "Skontaktuj się";
  };

  const goToServiceBooking = (service) => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setAlert({
        type: "error",
        message: "Aby skorzystać z rezerwacji lub zapytania, musisz być zalogowany.",
      });
      return;
    }

    if (currentUser.uid === profile?.userId) {
      setAlert({
        type: "info",
        message: "Nie możesz rezerwować własnej usługi.",
      });
      return;
    }

    if (!allowBookingUI) {
      startMessage();
      return;
    }

    navigate(`/rezerwacja/${slug}`, {
      state: {
        serviceId: service?._id,
        serviceName: service?.name,
        bookingMode,
      },
    });
  };

  const cleanLinks = (links || [])
    .map((l) => (l || "").trim())
    .filter(Boolean)
    .slice(0, 3);

  const contactPhone = normalizePhone(contact?.phone);
  const contactEmail = (contact?.email || "").trim();

  const fullAddress =
    (contact?.addressFull || "").trim() ||
    [location, contact?.postcode, contact?.street]
      .map((v) => (v || "").trim())
      .filter(Boolean)
      .join(", ");

  const mapsUrl = buildGoogleMapsLink(fullAddress);

  const socialItems = canUseSocialMedia
    ? [
      { key: "website", label: "WWW", icon: <FaGlobe />, url: socials?.website },
      { key: "facebook", label: "Facebook", icon: <FaFacebook />, url: socials?.facebook },
      { key: "instagram", label: "Instagram", icon: <FaInstagram />, url: socials?.instagram },
      { key: "youtube", label: "YouTube", icon: <FaYoutube />, url: socials?.youtube },
      { key: "tiktok", label: "TikTok", icon: <FaTiktok />, url: socials?.tiktok },
      { key: "linkedin", label: "LinkedIn", icon: <FaLinkedin />, url: socials?.linkedin },
      { key: "x", label: "X", icon: <FaXTwitter />, url: socials?.x },
    ]
      .map((s) => ({ ...s, url: ensureUrl(s.url) }))
      .filter((s) => !!s.url)
    : [];

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

  const statusLabel = partner.isPartner
    ? partner.label
    : isOwner
      ? "Twój profil"
      : "Aktywny profil";

  const priceShortLabel = hasPrice ? `od ${pf} zł` : "brak danych";

  return (
    <div ref={pageRef} className={styles.page} style={cssVars}>
      <div className={styles.pageDecor} aria-hidden="true">
        <span className={styles.decorOrbA} />
        <span className={styles.decorOrbB} />
        <span className={styles.decorLineA} />
        <span className={styles.decorLineB} />
      </div>

      <div
        className={cn(
          styles.shell,
          partner.isPartner && styles.partnerShell,
          isOwner && styles.ownerShell
        )}
        id="profileWrapper"
      >
        {alert && (
          <div className={styles.alertWrap}>
            <AlertBox
              type={alert.type}
              message={alert.message}
              onClose={() => setAlert(null)}
            />
          </div>
        )}

        <header
          className={cn(
            styles.profileHero,
            styles.reveal,
            styles.fromTop,
            showBanner && styles.profileHeroWithBanner,
            partner.isPartner && styles.profileHeroPartner
          )}
        >
          <div className={styles.heroMedia} aria-hidden="true">
            <span className={styles.heroBackdrop} />
            <span className={styles.heroShade} />
            <span className={styles.heroPattern} />
          </div>

          <div className={styles.heroContent}>
            <div className={styles.heroTopbar}>
              <div className={styles.heroKicker}>
                <span className={styles.heroStatusDot} />
                <span>{statusLabel}</span>
              </div>

              {!isOwner && (
                <button
                  type="button"
                  className={styles.reportButton}
                  onClick={openReportProfile}
                >
                  <FiFlag aria-hidden="true" />
                  <span>Zgłoś profil</span>
                </button>
              )}
            </div>

            <div className={styles.heroMain}>
              <div className={styles.identity}>
                <div className={styles.avatarFrame}>
                  <span className={styles.avatarAura} aria-hidden="true" />

                  <img
                    src={profileAvatarSrc}
                    alt={name}
                    className={styles.avatar}
                    onError={(e) => {
                      e.currentTarget.src = "/images/other/no-image.png";
                    }}
                  />

                  <span className={styles.avatarBadge} title="Aktywny profil">
                    <FaBolt aria-hidden="true" />
                  </span>
                </div>

                <div className={styles.identityContent}>
                  <div className={styles.badgeRow}>
                    {partner.isPartner && (
                      <span
                        className={cn(
                          styles.partnerBadge,
                          partner.tier && styles[`partner_${partner.tier}`]
                        )}
                      >
                        {partner.label}
                      </span>
                    )}

                    <span
                      className={cn(
                        styles.profileBadge,
                        profileType && styles[`type_${profileType}`]
                      )}
                    >
                      {typeLabel}
                    </span>
                  </div>

                  <h1 className={styles.heroTitle}>{name}</h1>

                  {role?.trim() && (
                    <p className={styles.heroRole}>{role}</p>
                  )}

                  <div className={styles.heroMeta}>
                    <span className={styles.heroMetaItem}>
                      <FaMapMarkerAlt aria-hidden="true" />
                      {location || "Brak lokalizacji"}
                    </span>

                    <span className={styles.heroMetaDivider} aria-hidden="true" />

                    <span className={styles.heroMetaItem}>
                      <FaStar aria-hidden="true" />
                      <strong>{avgRatingLabel}</strong>
                      <span>{reviewsCount} opinii</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.heroActions}>
                {showBookButton && (
                  <button
                    type="button"
                    className={styles.actionPrimary}
                    onClick={goToBooking}
                  >
                    <FaRegCalendarAlt aria-hidden="true" />
                    <span>
                      <small>Przejdź do działania</small>
                      <strong>{bookBtnLabel}</strong>
                    </span>
                  </button>
                )}

                {!isOwner && (
                  <button
                    type="button"
                    className={styles.actionSecondary}
                    onClick={startMessage}
                  >
                    <FaPaperPlane aria-hidden="true" />
                    <span>
                      <small>Masz dodatkowe pytanie?</small>
                      <strong>Napisz wiadomość</strong>
                    </span>
                  </button>
                )}

                <div className={styles.heroActionRow}>
                  {!isOwner && (
                    <button
                      type="button"
                      className={cn(
                        styles.actionSquare,
                        isFav && styles.favoriteActive
                      )}
                      onClick={toggleFavorite}
                    >
                      {isFav ? <FaHeart aria-hidden="true" /> : <FaRegHeart aria-hidden="true" />}
                      <span>{isFav ? "Zapisano" : "Ulubione"}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className={cn(
                      styles.actionSquare,
                      copiedProfileLink && styles.copiedAction
                    )}
                    onClick={copyProfileLink}
                  >
                    {copiedProfileLink ? <FaCheck aria-hidden="true" /> : <FaCopy aria-hidden="true" />}
                    <span>{copiedProfileLink ? "Skopiowano" : "Udostępnij"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section
          className={cn(styles.profileLedger, styles.reveal, styles.fromBottom)}
          style={{ "--reveal-delay": "100ms" }}
          aria-label="Podsumowanie profilu"
        >
          <div className={styles.ledgerItem}>
            <span className={styles.ledgerIcon}>
              <FaRegEye aria-hidden="true" />
            </span>
            <div className={styles.ledgerCopy}>
              <strong className={styles.ledgerValue}>
                {Number(profile?.visits ?? 0).toLocaleString("pl-PL")}
              </strong>
              <span className={styles.ledgerLabel}>odwiedzin profilu</span>
            </div>
          </div>

          <div className={styles.ledgerItem}>
            <span className={styles.ledgerIcon}>
              <FaMoneyBillWave aria-hidden="true" />
            </span>
            <div className={styles.ledgerCopy}>
              <strong className={styles.ledgerValue}>{priceShortLabel}</strong>
              <span className={styles.ledgerLabel}>informacja o cenie</span>
            </div>
          </div>

          <div className={styles.ledgerItem}>
            <span className={styles.ledgerIcon}>
              <FaListUl aria-hidden="true" />
            </span>
            <div className={styles.ledgerCopy}>
              <strong className={styles.ledgerValue}>{visibleServices.length}</strong>
              <span className={styles.ledgerLabel}>aktywnych usług</span>
            </div>
          </div>

          <div className={styles.ledgerItem}>
            <span className={styles.ledgerIcon}>
              <FaImage aria-hidden="true" />
            </span>
            <div className={styles.ledgerCopy}>
              <strong className={styles.ledgerValue}>{gallery.length}</strong>
              <span className={styles.ledgerLabel}>zdjęć w galerii</span>
            </div>
          </div>

          <div className={styles.ledgerItem}>
            <span className={styles.ledgerIcon}>
              <FaShieldAlt aria-hidden="true" />
            </span>
            <div className={styles.ledgerCopy}>
              <strong className={styles.ledgerValue}>{statusLabel}</strong>
              <span className={styles.ledgerLabel}>status profilu</span>
            </div>
          </div>
        </section>

        <main className={styles.contentGrid}>
          <div className={styles.contentMain}>
            <section className={cn(styles.sectionBlock, styles.reveal, styles.fromLeft)} id="overview">
              <div className={styles.sectionHeading}>
                <span className={styles.sectionNumber}>01</span>

                <div className={styles.sectionHeadingMain}>
                  <span className={styles.sectionEyebrow}>
                    <FaInfoCircle aria-hidden="true" />
                    O profilu
                  </span>

                  <h2 className={styles.sectionTitle}>
                    Wszystko, co najważniejsze, zanim przejdziesz do kontaktu.
                  </h2>

                  <p className={styles.sectionLead}>
                    Opis działalności, zakres cenowy, specjalizacje i miejsca w sieci.
                  </p>
                </div>
              </div>

              <div className={styles.overviewGrid}>
                <div className={styles.overviewCopy}>
                  {description?.trim() ? (
                    <div className={styles.descriptionPanel}>
                      <span className={styles.quoteMark} aria-hidden="true">
                        <FaQuoteLeft />
                      </span>
                      <p className={styles.description}>{description}</p>
                    </div>
                  ) : (
                    <div className={styles.emptyStateInline}>
                      <FaInfoCircle aria-hidden="true" />
                      <p>Użytkownik nie dodał jeszcze opisu.</p>
                    </div>
                  )}

                  {tags?.length > 0 && (
                    <div className={styles.tagList}>
                      {tags.map((tag) => (
                        <span key={tag} className={styles.tag}>
                          {String(tag).toUpperCase()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <aside className={styles.pricePanel}>
                  <span className={styles.priceIcon}>
                    <FaMoneyBillWave aria-hidden="true" />
                  </span>

                  <span className={styles.priceLabel}>Orientacyjny cennik</span>

                  {hasPrice ? (
                    <strong className={styles.priceValue}>
                      {pf}–{pt} zł
                    </strong>
                  ) : (
                    <strong className={styles.priceMissing}>Brak danych</strong>
                  )}

                  <p>
                    Szczegółową cenę sprawdzisz przy konkretnej usłudze lub bezpośrednio u usługodawcy.
                  </p>
                </aside>
              </div>

              <div className={styles.linksPanel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h3 className={styles.panelTitle}>Linki i portfolio</h3>
                    <p className={styles.panelDescription}>
                      Dodatkowe strony, realizacje lub miejsca związane z profilem.
                    </p>
                  </div>

                  {cleanLinks.length > 0 && (
                    <span className={styles.sectionCount}>{cleanLinks.length}</span>
                  )}
                </div>

                {cleanLinks.length > 0 ? (
                  <div className={styles.linkList}>
                    {cleanLinks.map((link, index) => {
                      const href = ensureUrl(link);

                      return (
                        <a
                          key={`${href}-${index}`}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.linkItem}
                        >
                          <span className={styles.linkLeft}>
                            <span className={styles.linkIcon}>
                              <FaGlobe aria-hidden="true" />
                            </span>

                            <span className={styles.linkCopy}>
                              <strong>{prettyUrl(href)}</strong>
                              <small>Otwórz zewnętrzny link</small>
                            </span>
                          </span>

                          <span className={styles.linkArrow}>
                            <FaExternalLinkAlt aria-hidden="true" />
                          </span>
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.emptyStateInline}>
                    <FaLink aria-hidden="true" />
                    <p>Użytkownik nie dodał jeszcze żadnych linków.</p>
                  </div>
                )}
              </div>
            </section>

            {hasGallery && (
              <section className={cn(styles.sectionBlock, styles.reveal, styles.fromRight)} id="gallery">
                <div className={styles.sectionHeading}>
                  <span className={styles.sectionNumber}>02</span>

                  <div className={styles.sectionHeadingMain}>
                    <span className={styles.sectionEyebrow}>
                      <FaImage aria-hidden="true" />
                      Galeria
                    </span>

                    <h2 className={styles.sectionTitle}>
                      Realizacje i zdjęcia, które pokazują styl profilu.
                    </h2>

                    <p className={styles.sectionLead}>
                      Kliknij dowolne zdjęcie, aby otworzyć je w pełnym widoku.
                    </p>

                    {gallery.length > 1 && (
                      <span className={styles.swipeHint}>
                        Przesuń palcem, aby zobaczyć więcej
                      </span>
                    )}
                  </div>

                  <span className={styles.sectionCount}>{gallery.length}</span>
                </div>

                <div className={styles.galleryGrid}>
                  {gallery.map((src, index) => (
                    <button
                      key={`${src}-${index}`}
                      type="button"
                      className={cn(
                        styles.galleryItem,
                        styles.reveal,
                        styles.fromBottom,
                        index === 0 && styles.galleryItemLead
                      )}
                      style={{ "--reveal-delay": `${Math.min(index, 5) * 70}ms` }}
                      onClick={() => openLightbox(src)}
                      aria-label={`Otwórz zdjęcie ${index + 1}`}
                    >
                      <img
                        src={src}
                        alt={`Zdjęcie ${index + 1}`}
                        className={styles.galleryImage}
                        onError={(e) => {
                          e.currentTarget.src = "/images/other/no-image.png";
                        }}
                      />

                      <span className={styles.galleryIndex}>
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <span className={styles.galleryAction}>Otwórz podgląd</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {visibleServices.length > 0 && (
              <section className={cn(styles.sectionBlock, styles.reveal, styles.fromLeft)} id="services">
                <div className={styles.sectionHeading}>
                  <span className={styles.sectionNumber}>03</span>

                  <div className={styles.sectionHeadingMain}>
                    <span className={styles.sectionEyebrow}>
                      <FaListUl aria-hidden="true" />
                      Oferta
                    </span>

                    <h2 className={styles.sectionTitle}>
                      Usługi przedstawione jasno — z ceną, czasem i kolejnym krokiem.
                    </h2>

                    <p className={styles.sectionLead}>
                      Wybierz interesującą pozycję i przejdź bezpośrednio do kontaktu lub rezerwacji.
                    </p>
                  </div>

                  <span className={styles.sectionCount}>{visibleServices.length}</span>
                </div>

                <div className={styles.servicesList}>
                  {visibleServices.map((service, index) => {
                    const image = getServiceImageUrl(service);
                    const categoryLabel = mapServiceCategory(service.category);
                    const priceLabel = formatServicePrice(service);
                    const durationLabel =
                      service?.duration?.value && service?.duration?.unit
                        ? `${service.duration.value} ${mapUnit(service.duration.unit)}`
                        : "Brak czasu";

                    return (
                      <article
                        key={service._id || index}
                        className={cn(
                          styles.serviceCard,
                          styles.reveal,
                          index % 2 === 0 ? styles.fromLeft : styles.fromRight,
                          service.featured && styles.serviceFeatured
                        )}
                        style={{ "--reveal-delay": `${Math.min(index, 5) * 80}ms` }}
                      >
                        <span className={styles.serviceNumber}>
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <div className={styles.serviceMedia}>
                          {image ? (
                            <img
                              src={image}
                              alt={service.name || `Usługa ${index + 1}`}
                              className={styles.serviceImage}
                              onError={(e) => {
                                e.currentTarget.src = "/images/other/no-image.png";
                              }}
                            />
                          ) : (
                            <div className={styles.servicePlaceholder}>
                              <FaRegCalendarAlt aria-hidden="true" />
                              <span>Bez zdjęcia</span>
                            </div>
                          )}

                          <div className={styles.serviceBadgeRow}>
                            <span className={styles.serviceCategory}>
                              {categoryLabel}
                            </span>

                            {service.featured && (
                              <span className={styles.serviceFeaturedBadge}>
                                <FaBolt aria-hidden="true" />
                                Wyróżniona
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={styles.serviceBody}>
                          <div className={styles.serviceHeader}>
                            <h3 className={styles.serviceTitle}>
                              {service.name || `Usługa ${index + 1}`}
                            </h3>
                          </div>

                          {service.shortDescription?.trim() ? (
                            <p className={styles.serviceDescription}>
                              {service.shortDescription}
                            </p>
                          ) : (
                            <div className={styles.emptyStateInline}>
                              <FaInfoCircle aria-hidden="true" />
                              <p>Użytkownik nie dodał krótkiego opisu tej usługi.</p>
                            </div>
                          )}

                          <div className={styles.serviceMeta}>
                            <div className={styles.serviceMetaItem}>
                              <span className={styles.serviceMetaIcon}>
                                <FaMoneyBillWave aria-hidden="true" />
                              </span>
                              <span>
                                <small className={styles.serviceMetaLabel}>Cena</small>
                                <strong className={styles.serviceMetaValue}>{priceLabel}</strong>
                              </span>
                            </div>

                            <div className={styles.serviceMetaItem}>
                              <span className={styles.serviceMetaIcon}>
                                <FaClock aria-hidden="true" />
                              </span>
                              <span>
                                <small className={styles.serviceMetaLabel}>Czas realizacji</small>
                                <strong className={styles.serviceMetaValue}>{durationLabel}</strong>
                              </span>
                            </div>
                          </div>

                          {!isOwner && (
                            <button
                              type="button"
                              className={styles.serviceCta}
                              onClick={() => goToServiceBooking(service)}
                            >
                              <FaRegCalendarAlt aria-hidden="true" />
                              {getServiceCtaLabel()}
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            <section className={cn(styles.sectionBlock, styles.reveal, styles.fromRight)} id="reviews">
              <div className={styles.sectionHeading}>
                <span className={styles.sectionNumber}>04</span>

                <div className={styles.sectionHeadingMain}>
                  <span className={styles.sectionEyebrow}>
                    <FaComments aria-hidden="true" />
                    Opinie
                  </span>

                  <h2 className={styles.sectionTitle}>
                    Doświadczenia osób, które miały kontakt z tym profilem.
                  </h2>

                  <p className={styles.sectionLead}>
                    Oceny i komentarze pomagają szybciej podjąć właściwą decyzję.
                  </p>

                  {ratedByArr.length > 1 && (
                    <span className={styles.swipeHint}>
                      Przesuń palcem, aby zobaczyć więcej
                    </span>
                  )}
                </div>

                <span className={styles.sectionCount}>{ratedByArr.length}</span>
              </div>

              {ratedByArr.length > 0 ? (
                <ul className={styles.reviewList}>
                  {ratedByArr.map((review, index) => {
                    const ratingValue = Number(review.rating);
                    const reviewAvatar =
                      normalizeAvatar(review.userAvatar) || "/images/other/no-image.png";
                    const dateLabel = review.createdAt
                      ? new Date(review.createdAt).toLocaleDateString("pl-PL", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                      : "";

                    return (
                      <li
                        key={review?._id || index}
                        className={cn(
                          styles.reviewCard,
                          styles.reveal,
                          styles.fromBottom,
                          review?.userId === uid && styles.myReview
                        )}
                        style={{ "--reveal-delay": `${Math.min(index, 5) * 70}ms` }}
                      >
                        <div className={styles.reviewHeader}>
                          <div className={styles.reviewUser}>
                            <img
                              src={reviewAvatar}
                              alt=""
                              className={styles.reviewAvatar}
                              decoding="async"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.src = "/images/other/no-image.png";
                              }}
                            />

                            <div className={styles.reviewIdentity}>
                              <strong className={styles.reviewName}>
                                {review.userName || "Użytkownik"}
                              </strong>
                              {dateLabel && (
                                <span className={styles.reviewDate}>{dateLabel}</span>
                              )}
                            </div>
                          </div>

                          <div className={styles.reviewTools}>
                            <div className={styles.reviewStars}>
                              {[...Array(5)].map((_, starIndex) => (
                                <FaStar
                                  key={starIndex}
                                  className={
                                    starIndex < ratingValue
                                      ? styles.starMiniOn
                                      : styles.starMiniOff
                                  }
                                />
                              ))}
                            </div>

                            <button
                              type="button"
                              className={styles.reportReviewButton}
                              onClick={() => openReportReview(review?._id, review?.userId)}
                              disabled={!review?._id}
                              aria-label="Zgłoś opinię"
                            >
                              <FiFlag aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        <p className={styles.reviewText}>{review.comment}</p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className={styles.emptyStatePanel}>
                  <FaStar aria-hidden="true" />
                  <div>
                    <strong>Jeszcze bez opinii</strong>
                    <p>Ten profil nie otrzymał jeszcze żadnego komentarza.</p>
                  </div>
                </div>
              )}
            </section>
          </div>

          <aside className={styles.contentAside}>
            <div className={styles.stickyRail}>
              {hasInfoBox && (
                <section className={cn(styles.contactCard, styles.reveal, styles.fromRight)} id="contact">
                  <div className={styles.sideHeader}>
                    <span className={styles.sideKicker}>
                      <FaPhoneAlt aria-hidden="true" />
                      Kontakt
                    </span>
                    <h2 className={styles.sideTitle}>Wybierz najwygodniejszy kanał.</h2>
                    <p className={styles.sideText}>
                      Dane kontaktowe i social media zebrane w jednym miejscu.
                    </p>
                  </div>

                  <div className={styles.contactList}>
                    {fullAddress && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.contactItem}
                      >
                        <span className={styles.contactIcon}>
                          <FaMapMarkedAlt aria-hidden="true" />
                        </span>
                        <span className={styles.contactCopy}>
                          <small className={styles.contactLabel}>Adres</small>
                          <strong className={styles.contactValue}>{fullAddress}</strong>
                        </span>
                        <FaExternalLinkAlt aria-hidden="true" />
                      </a>
                    )}

                    {contactPhone && (
                      <a href={`tel:${contactPhone}`} className={styles.contactItem}>
                        <span className={styles.contactIcon}>
                          <FaPhoneAlt aria-hidden="true" />
                        </span>
                        <span className={styles.contactCopy}>
                          <small className={styles.contactLabel}>Telefon</small>
                          <strong className={styles.contactValue}>{contact.phone}</strong>
                        </span>
                        <FaExternalLinkAlt aria-hidden="true" />
                      </a>
                    )}

                    {contactEmail && (
                      <a href={`mailto:${contactEmail}`} className={styles.contactItem}>
                        <span className={styles.contactIcon}>
                          <FaEnvelope aria-hidden="true" />
                        </span>
                        <span className={styles.contactCopy}>
                          <small className={styles.contactLabel}>E-mail</small>
                          <strong className={styles.contactValue}>{contactEmail}</strong>
                        </span>
                        <FaExternalLinkAlt aria-hidden="true" />
                      </a>
                    )}
                  </div>

                  {socialItems.length > 0 && (
                    <div className={styles.socialSection}>
                      <h3 className={styles.socialHeading}>Social media</h3>

                      <div className={styles.socialGrid}>
                        {socialItems.map((social) => (
                          <a
                            key={social.key}
                            href={social.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.socialLink}
                            aria-label={social.label}
                          >
                            <span className={styles.socialIcon}>{social.icon}</span>
                            <span className={styles.socialLabel}>{social.label}</span>
                            <span className={styles.socialArrow}>
                              <FaExternalLinkAlt aria-hidden="true" />
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {!isOwner && (
                <section
                  className={cn(styles.ratingCard, styles.reveal, styles.fromRight)}
                  style={{ "--reveal-delay": "120ms" }}
                >
                  <div className={styles.sideHeader}>
                    <span className={styles.sideKicker}>
                      <FaStar aria-hidden="true" />
                      Twoja opinia
                    </span>
                    <h2 className={styles.sideTitle}>
                      {hasRated ? "Ocena została zapisana." : "Podziel się swoim doświadczeniem."}
                    </h2>
                    <p className={styles.sideText}>
                      {hasRated
                        ? "Dziękujemy — Twoja opinia jest już widoczna przy profilu."
                        : "Wybierz gwiazdki i dodaj krótki, konkretny komentarz."}
                    </p>
                  </div>

                  <div className={styles.ratingOverview}>
                    <strong className={styles.ratingScoreValue}>
                      {hasRated && myRatingLabel ? myRatingLabel : avgRatingLabel}
                    </strong>
                    <span className={styles.ratingScoreLabel}>
                      {hasRated ? "Twoja ocena" : "Średnia profilu"}
                    </span>
                  </div>

                  <div className={styles.ratingStars}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <FaStar
                        key={value}
                        className={cn(
                          styles.star,
                          value <= (hoveredRating || selectedRating)
                            ? styles.starOn
                            : styles.starOff,
                          hasRated && styles.starDisabled
                        )}
                        onClick={!hasRated ? () => setSelectedRating(value) : undefined}
                        onMouseEnter={!hasRated ? () => setHoveredRating(value) : undefined}
                        onMouseLeave={!hasRated ? () => setHoveredRating(0) : undefined}
                      />
                    ))}
                  </div>

                  {!hasRated && (
                    <>
                      <textarea
                        className={styles.textarea}
                        placeholder="Napisz, co było na plus lub co można poprawić..."
                        value={comment}
                        onChange={(e) => {
                          const text = e.target.value;
                          if (text.length <= maxChars) setComment(text);
                        }}
                      />

                      <div className={styles.textareaFooter}>
                        <span className={styles.mutedText}>Minimum 10 znaków</span>
                        <span className={styles.counter}>{comment.length} / {maxChars}</span>
                      </div>

                      <LoadingButton
                        type="button"
                        isLoading={isRatingSending}
                        disabled={isRatingSending}
                        className={styles.submitRating}
                        onClick={handleRate}
                      >
                        Wyślij opinię
                      </LoadingButton>
                    </>
                  )}
                </section>
              )}
            </div>
          </aside>
        </main>
      </div>

      {fullscreenImage &&
        createPortal(
          <div
            className={styles.lightbox}
            onClick={closeLightbox}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className={styles.lightboxClose}
              onClick={closeLightbox}
              aria-label="Zamknij"
            >
              ✕
            </button>

            <img
              src={fullscreenImage}
              alt=""
              className={styles.lightboxImage}
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body
        )}

      {reportOpen &&
        createPortal(
          <div
            className={styles.modalBackdrop}
            style={cssVars}
            onClick={() => setReportOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.reportModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div>
                  <span className={styles.sideKicker}>
                    <FiFlag aria-hidden="true" />
                    Zgłoszenie
                  </span>
                  <h3 className={styles.modalTitle}>
                    {reportType === "profile" ? "Zgłoś profil" : "Zgłoś opinię"}
                  </h3>
                </div>

                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={() => setReportOpen(false)}
                  aria-label="Zamknij"
                >
                  ✕
                </button>
              </div>

              <div className={styles.formField}>
                <label htmlFor="report-reason">Powód</label>
                <select
                  id="report-reason"
                  className={styles.select}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                >
                  {REPORT_REASONS.map((reason) => (
                    <option key={reason.v} value={reason.v}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formField}>
                <label htmlFor="report-message">Dodatkowe informacje opcjonalnie</label>
                <textarea
                  id="report-message"
                  className={styles.modalTextarea}
                  value={reportMsg}
                  onChange={(e) => setReportMsg(e.target.value.slice(0, 400))}
                  placeholder="Opisz krótko, dlaczego zgłaszasz..."
                />
                <span className={styles.formHint}>{reportMsg.length} / 400</span>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalSecondary}
                  onClick={() => setReportOpen(false)}
                  disabled={reportSending}
                >
                  Anuluj
                </button>

                <LoadingButton
                  type="button"
                  className={styles.modalPrimary}
                  isLoading={reportSending}
                  disabled={reportSending}
                  onClick={submitReport}
                >
                  Wyślij zgłoszenie
                </LoadingButton>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
