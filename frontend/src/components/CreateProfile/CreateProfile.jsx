import { useEffect, useRef, useState } from "react";
import styles from "./CreateProfile.module.scss";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import UserCard from "../UserCard/UserCard";
import LoadingButton from "../ui/LoadingButton/LoadingButton";
import { api } from "../../api/api";
import {
  FiUser,
  FiMapPin,
  FiTag,
  FiBriefcase,
  FiImage,
  FiFileText,
  FiDollarSign,
  FiClock,
  FiLink,
  FiCheckCircle,
  FiGrid,
  FiCalendar,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import {
  TAGS_LIMIT,
  TAG_MAX_LENGTH,
  SERVICE_NAME_MAX_LENGTH,
  SERVICE_SHORT_DESCRIPTION_MAX_LENGTH,
  SERVICE_PRICE_MAX,
  SERVICE_DURATION_LIMITS,
} from "../constants/validationLimits";

const DEFAULT_AVATAR = "/images/other/no-image.png";

const CREATE_PLAN = {
  key: "free",
  name: "Free",
  label: "Starter",
  priceLabel: "0 zł",
  description: "Podstawowa wizytówka na start.",
  features: {
    profile: true,
    messages: true,
    booking: false,
    requestBlocking: false,
    team: false,
    premiumThemes: false,
    advancedChat: false,
    analytics: false,
    customSlug: false,
    priorityProfile: false,
  },
  limits: {
    photos: 3,
    services: 3,
    serviceGallery: 2,
    links: 1,
    quickAnswers: 1,
    descriptionLength: 200,
  },
};

const CreateProfile = ({ user, setRefreshTrigger }) => {
  const [form, setForm] = useState({
    name: "",
    avatar: DEFAULT_AVATAR,
    role: "",
    location: "",
    priceFrom: "",
    priceTo: "",
    availabilityDate: "",
    services: [],
    available: true,
    profileType: "zawodowy",
    description: "",
    links: ["", "", ""],
    tags: ["", "", ""],
    hasBusiness: false,
    nip: "",
    bookingMode: "request-open",
    workingHours: { from: "08:00", to: "20:00" },
    workingDays: [1, 2, 3, 4, 5],
  });

  const [newService, setNewService] = useState({
    name: "",
    shortDescription: "",
    category: "service",
    priceMode: "contact",
    priceValue: "",
    priceFrom: "",
    priceTo: "",
    durationValue: "",
    durationUnit: "minutes",
    bookingEnabled: false,
    bookingType: "none",
  });

  const locationHook = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formErrors, setFormErrors] = useState({});
  const [serviceError, setServiceError] = useState("");
  const [previewMsg, setPreviewMsg] = useState("");
  const [acceptedRegulations, setAcceptedRegulations] = useState(false);

  const [loading, setLoading] = useState(false);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [resetAvatarLoading, setResetAvatarLoading] = useState(false);

  useEffect(() => {
    const scrollTo = locationHook.state?.scrollToId;
    if (!scrollTo) return;

    const tryScroll = () => {
      const el = document.getElementById(scrollTo);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState({}, document.title, locationHook.pathname);
      } else {
        requestAnimationFrame(tryScroll);
      }
    };

    requestAnimationFrame(tryScroll);
  }, [locationHook.state, locationHook.pathname]);

  useEffect(() => {
    return () => {
      if (typeof form.avatar === "string" && form.avatar.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(form.avatar);
        } catch { }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const uid = user?.uid;

  const uploadAvatarAfterCreate = async (file) => {
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);
    await api.post(`/api/profiles/${uid}/avatar`, fd);
  };

  const resetAvatarLocal = async () => {
    if (resetAvatarLoading) return;

    setResetAvatarLoading(true);
    setFormErrors((p) => ({ ...p, avatar: "" }));

    if (typeof form.avatar === "string" && form.avatar.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(form.avatar);
      } catch { }
    }

    setAvatarFile(null);
    setForm((prev) => ({ ...prev, avatar: DEFAULT_AVATAR }));

    if (fileInputRef.current) fileInputRef.current.value = "";

    setTimeout(() => setResetAvatarLoading(false), 250);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    if (name === "bookingMode") {
      if (value === "calendar" || value === "request-blocking") {
        setFormErrors((prev) => ({
          ...prev,
          bookingMode:
            "Kalendarz i blokowanie dni są dostępne w planie Premium. Na start wybierz zapytania.",
        }));

        setForm((prev) => ({
          ...prev,
          bookingMode: "request-open",
        }));

        return;
      }

      setFormErrors((prev) => ({ ...prev, bookingMode: "" }));
      setForm((prev) => ({ ...prev, bookingMode: value }));
      return;
    }

    if (name === "priceFrom" || name === "priceTo") {
      if (value === "") {
        setForm((prev) => ({ ...prev, [name]: "" }));
        return;
      }

      let n = Number(value);
      if (!Number.isFinite(n)) n = "";

      if (name === "priceFrom") {
        if (n < 1) n = 1;
        if (n > 100000) n = 100000;
      }

      if (name === "priceTo") {
        if (n > 1000000) n = 1000000;
      }

      setForm((prev) => ({ ...prev, [name]: n }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLinkChange = (index, value) => {
    const updatedLinks = [...form.links];
    updatedLinks[index] = value;
    setForm((prev) => ({ ...prev, links: updatedLinks }));
  };

  const handleTagChange = (index, value) => {
    const updatedTags = [...form.tags];
    updatedTags[index] = cleanTagInput(value);
    setForm((prev) => ({ ...prev, tags: updatedTags }));
  };

  const mapUnit = (unit) => {
    switch (unit) {
      case "minutes":
        return "min";
      case "hours":
        return "h";
      case "days":
        return "dni";
      case "weeks":
        return "tyg";
      default:
        return "";
    }
  };

  const mapCategory = (cat) => {
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

  const formatServicePrice = (service) => {
    const mode = service?.price?.mode;
    const amount = service?.price?.amount;
    const from = service?.price?.from;
    const to = service?.price?.to;
    const currency = service?.price?.currency || "PLN";

    if (mode === "fixed" && amount !== null && amount !== undefined) {
      return `${amount} ${currency}`;
    }

    if (mode === "from" && from !== null && from !== undefined) {
      return `od ${from} ${currency}`;
    }

    if (
      mode === "range" &&
      from !== null &&
      from !== undefined &&
      to !== null &&
      to !== undefined
    ) {
      return `${from}–${to} ${currency}`;
    }

    if (mode === "contact") return "wycena indywidualna";
    if (mode === "free") return "darmowe";

    return "bez ceny";
  };

  const cleanServiceText = (value, maxLength) => {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trimStart()
      .slice(0, maxLength);
  };

  const cleanIntegerInput = (value, maxLength = 7) => {
    return String(value || "")
      .replace(/[^\d]/g, "")
      .slice(0, maxLength);
  };

  const cleanTagInput = (value) => {
    return String(value || "")
      .replace(/[#,\n\r\t]/g, "")
      .replace(/\s+/g, " ")
      .trimStart()
      .slice(0, TAG_MAX_LENGTH);
  };

  const hasSpammyRepeatedChars = (value) => {
    const text = String(value || "").trim();

    if (/(.)\1{12,}/i.test(text)) return true;

    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});

    return Object.values(wordCount).some((count) => count >= 5);
  };

  const getDurationLimitText = (unit) => {
    const limit = SERVICE_DURATION_LIMITS[unit];

    if (!limit) return "";

    return `${limit.min}–${limit.max} ${limit.label}`;
  };

  const validateServiceData = (service) => {
    const name = String(service?.name || "").trim();
    const shortDescription = String(service?.shortDescription || "").trim();

    if (!name) {
      return "Podaj nazwę usługi.";
    }

    if (name.length > SERVICE_NAME_MAX_LENGTH) {
      return `Nazwa usługi może mieć maksymalnie ${SERVICE_NAME_MAX_LENGTH} znaków.`;
    }

    if (name.length < 3) {
      return "Nazwa usługi musi mieć minimum 3 znaki.";
    }

    if (hasSpammyRepeatedChars(name)) {
      return "Nazwa usługi wygląda na spam. Wpisz normalną nazwę usługi.";
    }

    if (shortDescription.length > SERVICE_SHORT_DESCRIPTION_MAX_LENGTH) {
      return `Krótki opis usługi może mieć maksymalnie ${SERVICE_SHORT_DESCRIPTION_MAX_LENGTH} znaków.`;
    }

    if (shortDescription && shortDescription.length < 10) {
      return "Krótki opis powinien mieć minimum 10 znaków albo zostaw go pusty.";
    }

    if (hasSpammyRepeatedChars(shortDescription)) {
      return "Krótki opis wygląda na spam. Wpisz normalny opis usługi.";
    }

    const durationValue = Number(service?.duration?.value);
    const durationUnit = service?.duration?.unit || "minutes";
    const durationLimit = SERVICE_DURATION_LIMITS[durationUnit];

    if (!durationLimit || !Number.isFinite(durationValue)) {
      return "Podaj poprawny czas usługi.";
    }

    if (durationValue < durationLimit.min || durationValue > durationLimit.max) {
      return `Czas usługi dla jednostki "${durationLimit.label}" musi być w zakresie ${durationLimit.min}–${durationLimit.max}.`;
    }

    const priceMode = service?.price?.mode || "contact";

    if (!["contact", "free", "fixed", "from", "range"].includes(priceMode)) {
      return "Wybierz poprawny typ ceny.";
    }

    if (priceMode === "fixed") {
      const amount = Number(service?.price?.amount);

      if (!Number.isFinite(amount) || amount < 0 || amount > SERVICE_PRICE_MAX) {
        return `Cena stała musi być w zakresie 0–${SERVICE_PRICE_MAX} zł.`;
      }
    }

    if (priceMode === "from") {
      const from = Number(service?.price?.from);

      if (!Number.isFinite(from) || from < 0 || from > SERVICE_PRICE_MAX) {
        return `Cena „od” musi być w zakresie 0–${SERVICE_PRICE_MAX} zł.`;
      }
    }

    if (priceMode === "range") {
      const from = Number(service?.price?.from);
      const to = Number(service?.price?.to);

      if (
        !Number.isFinite(from) ||
        !Number.isFinite(to) ||
        from < 0 ||
        to < 0 ||
        from > SERVICE_PRICE_MAX ||
        to > SERVICE_PRICE_MAX ||
        to < from
      ) {
        return `Zakres cen musi być poprawny: od 0 do ${SERVICE_PRICE_MAX} zł, a cena „do” nie może być mniejsza niż „od”.`;
      }
    }

    return "";
  };

  const handleAddService = () => {
    if (form.services.length >= CREATE_PLAN.limits.services) {
      setServiceError(
        `Plan Starter pozwala dodać maksymalnie ${CREATE_PLAN.limits.services} usługi. Po utworzeniu profilu możesz przejść na Standard lub Premium.`
      );
      return;
    }

    const name = cleanServiceText(newService.name, SERVICE_NAME_MAX_LENGTH).trim();
    const shortDescription = cleanServiceText(
      newService.shortDescription,
      SERVICE_SHORT_DESCRIPTION_MAX_LENGTH
    ).trim();

    const category = newService.category || "service";
    const priceMode = newService.priceMode || "contact";
    const durationValue = Number(newService.durationValue);
    const durationUnit = newService.durationUnit || "minutes";

    const price = {
      mode: priceMode,
      amount: null,
      from: null,
      to: null,
      currency: "PLN",
      unitLabel: "",
      note: "",
    };

    if (priceMode === "fixed") {
      price.amount = Number(newService.priceValue);
    }

    if (priceMode === "from") {
      price.from = Number(newService.priceValue);
    }

    if (priceMode === "range") {
      price.from = Number(newService.priceFrom);
      price.to = Number(newService.priceTo);
    }

    const serviceToValidate = {
      name,
      shortDescription,
      price,
      duration: {
        value: durationValue,
        unit: durationUnit,
      },
    };

    const validationError = validateServiceData(serviceToValidate);

    if (validationError) {
      setServiceError(validationError);
      return;
    }

    const bookingEnabled = !!newService.bookingEnabled;

    if (bookingEnabled && newService.bookingType === "calendar") {
      setServiceError(
        "Kalendarz godzinowy jest dostępny w planie Premium. W planie Starter możesz dodać usługę jako zapytanie."
      );
      return;
    }

    const bookingType = bookingEnabled ? "request" : "none";

    setForm((prev) => ({
      ...prev,
      services: [
        ...prev.services,
        {
          name,
          shortDescription,
          description: "",
          category,
          image: { url: "", publicId: "" },
          gallery: [],
          price,
          duration: {
            value: parseInt(String(durationValue), 10),
            unit: durationUnit,
            label:
              durationUnit === "minutes" || durationUnit === "hours"
                ? "czas wizyty"
                : "czas realizacji",
          },
          booking: {
            enabled: bookingEnabled,
            type: bookingType,
          },
          delivery: {
            mode: "none",
            turnaroundText: "",
          },
          tags: [],
          featured: false,
          isActive: true,
          order: prev.services.length,
        },
      ],
    }));

    setNewService({
      name: "",
      shortDescription: "",
      category: "service",
      priceMode: "contact",
      priceValue: "",
      priceFrom: "",
      priceTo: "",
      durationValue: "",
      durationUnit: "minutes",
      bookingEnabled: false,
      bookingType: "none",
    });

    setServiceError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const errors = {};

    if (!uid) {
      errors.general = "Brak UID użytkownika (zaloguj się ponownie).";
      setFormErrors(errors);
      return;
    }

    if (!form.name.trim() || form.name.length > 30) {
      errors.name = "Podaj nazwę (maks. 30 znaków)";
    }

    if (!form.role.trim() || form.role.length > 40) {
      errors.role = "Podaj rolę (maks. 40 znaków)";
    }

    if (!form.location.trim() || form.location.length > 30) {
      errors.location = "Podaj lokalizację (maks. 30 znaków)";
    }

    const nonEmptyTags = form.tags.filter((tag) => tag.trim() !== "");
    if (nonEmptyTags.length === 0) {
      errors.tags = "Podaj przynajmniej 1 tag";
    }

    if (nonEmptyTags.length > TAGS_LIMIT) {
      errors.tags = `Możesz dodać maksymalnie ${TAGS_LIMIT} tagi.`;
    }

    const uniqueTags = new Set(nonEmptyTags.map((tag) => tag.toLowerCase()));

    if (nonEmptyTags.some((tag) => tag.length > TAG_MAX_LENGTH)) {
      errors.tags = `Jeden tag może mieć maksymalnie ${TAG_MAX_LENGTH} znaków.`;
    }

    if (uniqueTags.size !== nonEmptyTags.length) {
      errors.tags = "Tagi nie mogą się powtarzać.";
    }

    const nonEmptyLinks = form.links.filter((link) => link.trim() !== "");
    if (nonEmptyLinks.length > CREATE_PLAN.limits.links) {
      errors.links = `Plan Starter pozwala dodać maksymalnie ${CREATE_PLAN.limits.links} linki.`;
    }

    if (form.description.length > CREATE_PLAN.limits.descriptionLength) {
      errors.description = `Opis nie może przekraczać ${CREATE_PLAN.limits.descriptionLength} znaków w planie Starter.`;
    }

    if (!form.profileType) {
      errors.profileType = "Wybierz typ profilu";
    }

    if ((form.services || []).length > CREATE_PLAN.limits.services) {
      errors.services = `Plan Starter pozwala dodać maksymalnie ${CREATE_PLAN.limits.services} usługi.`;
    }

    if (form.bookingMode === "calendar" || form.bookingMode === "request-blocking") {
      errors.bookingMode =
        "Kalendarz i blokowanie dni są dostępne w planie Premium. W planie Starter wybierz zapytania.";
    }

    const priceFromNum = Number(form.priceFrom);
    const priceToNum = Number(form.priceTo);

    if (!Number.isFinite(priceFromNum) || priceFromNum < 1 || priceFromNum > 100000) {
      errors.priceFrom = "Cena od musi być w zakresie 1–100 000";
    }

    if (!Number.isFinite(priceToNum) || priceToNum < priceFromNum || priceToNum > 1000000) {
      errors.priceTo = 'Cena do musi być większa niż "od" i nie większa niż 1 000 000';
    }

    const serviceValidationError = (form.services || [])
      .map((service) => validateServiceData(service))
      .find(Boolean);

    if (serviceValidationError) {
      errors.services = serviceValidationError;
    }

    if (!acceptedRegulations) {
      errors.regulations = "Potwierdź, że rozumiesz i akceptujesz regulamin serwisu.";
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);

    const payload = {
      ...form,
      avatar: { url: "", publicId: "" },
      priceFrom: priceFromNum,
      priceTo: priceToNum,
      rating: 0,
      reviews: 0,
      tags: nonEmptyTags
        .map((tag) => tag.trim())
        .slice(0, TAGS_LIMIT),
      links: form.links
        .map((link) => link.trim())
        .filter(Boolean)
        .slice(0, CREATE_PLAN.limits.links),
      availableDates: [],
      services: form.services.slice(0, CREATE_PLAN.limits.services),
      bookingMode: "request-open",
      workingHours: form.workingHours || { from: "08:00", to: "20:00" },
      workingDays: form.workingDays || [1, 2, 3, 4, 5],
      team: {
        enabled: false,
        assignmentMode: "user-pick",
      },
      bookingBufferMin: 0,
      userId: uid,
      visibleUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    try {
      await api.post(`/api/profiles`, payload);

      if (avatarFile) {
        setAvatarUploading(true);
        await uploadAvatarAfterCreate(avatarFile);
        setAvatarUploading(false);
      }

      setRefreshTrigger(Date.now());
      setTimeout(() => navigate("/profil"), 300);
    } catch (err) {
      setFormErrors({
        general:
          err.response?.data?.message || "Wystąpił błąd podczas tworzenia wizytówki",
      });
    } finally {
      setLoading(false);
      setAvatarUploading(false);
    }
  };

  const activeTagsCount = form.tags.filter((tag) => tag.trim() !== "").length;
  const activeLinksCount = form.links.filter((link) => link.trim() !== "").length;
  const servicesCount = form.services.length;

  return (
    <section id="scrollToId" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.layout}>
          <aside className={styles.side}>
            <span className={styles.overline}>Showly Create Profile</span>

            <h2 className={styles.heading}>
              Stwórz swój <span>profil</span> Showly.
            </h2>

            <p className={styles.description}>
              Uzupełnij podstawowe informacje, dodaj usługi, linki oraz opis działalności.
              Podgląd wizytówki aktualizuje się na bieżąco, więc od razu widzisz,
              jak profil będzie wyglądał publicznie.
            </p>

            <div className={styles.metaRow}>
              <div className={styles.metaCard}>
                <strong>
                  {activeTagsCount}/{TAGS_LIMIT}
                </strong>
                <span>aktywnych tagów</span>
              </div>

              <div className={styles.metaCard}>
                <strong>
                  {servicesCount}/{CREATE_PLAN.limits.services}
                </strong>
                <span>dodanych usług</span>
              </div>

              <div className={styles.metaCard}>
                <strong>
                  {activeLinksCount}/{CREATE_PLAN.limits.links}
                </strong>
                <span>linków w planie Starter</span>
              </div>
            </div>

            <div className={styles.planNotice}>
              <div className={styles.planNoticeContent}>
                <span className={styles.planEyebrow}>Plan startowy</span>

                <h3 className={styles.planTitle}>
                  Tworzysz profil w planie {CREATE_PLAN.label}
                </h3>

                <p className={styles.planText}>
                  Na start możesz dodać podstawowe informacje, opis, tagi, linki
                  i kilka usług. Po utworzeniu profilu odblokujesz możliwość przejścia
                  na Standard lub Premium w panelu zarządzania profilem.
                </p>

                <div className={styles.planLimits}>
                  <span>{TAGS_LIMIT} tagi</span>
                  <span>{CREATE_PLAN.limits.links} link</span>
                  <span>{CREATE_PLAN.limits.services} usługi</span>
                  <span>{CREATE_PLAN.limits.descriptionLength} znaków opisu</span>
                </div>
              </div>

              <div className={styles.planBadge}>{CREATE_PLAN.label}</div>
            </div>

            <div className={styles.infoBox}>
              <span>Profil • Usługi • Podgląd</span>

              <p>
                Formularz po prawej prowadzi Cię krok po kroku. Po uzupełnieniu
                danych możesz od razu utworzyć publiczną wizytówkę.
              </p>
            </div>

            <div className={styles.previewColumn}>
              <div className={styles.previewSticky}>
                <div className={styles.contentBox}>
                  <div className={styles.contentHeader}>
                    <h3 className={styles.contentTitle}>Podgląd tworzonego profilu</h3>
                    <span className={styles.badge}>Live</span>
                  </div>

                  <div className={styles.previewCardWrap}>
                    <UserCard
                      user={{
                        ...form,
                        tags: form.tags.filter(
                          (tag) => tag.trim() !== "" && tag.length <= TAG_MAX_LENGTH
                        ),
                        links: form.links.filter((link) => link.trim() !== ""),
                        rating: 0,
                        reviews: 0,
                        availableDates: [],
                        userId: uid,
                      }}
                      currentUser={user}
                      isPreview={true}
                      onPreviewBlocked={(msg) => setPreviewMsg(msg)}
                    />
                  </div>

                  {previewMsg && <p className={styles.error}>{previewMsg}</p>}
                </div>
              </div>
            </div>
          </aside>

          <div className={styles.contentPanel}>
            <div className={styles.chapterHead}>
              <div>
                <span className={styles.chapterLabel}>Tworzenie wizytówki</span>

                <h3>Uzupełnij dane profilu i przygotuj swoją publiczną stronę.</h3>
              </div>

              <span className={styles.chapterNumber}>01</span>
            </div>

            <form onSubmit={handleSubmit} className={styles.formColumn}>
              <div className={styles.contentBox}>
                <div className={styles.contentHeader}>
                  <h3 className={styles.contentTitle}>1. Dane podstawowe</h3>
                  <span className={styles.badge}>
                    <FiUser />
                    Start
                  </span>
                </div>

                <div className={styles.fieldGrid}>
                  <label className={styles.formField}>
                    <span className={styles.fieldLabel}>
                      <FiUser className={styles.fieldIcon} />
                      Nazwa Twojego profilu
                    </span>
                    <input
                      className={styles.formInput}
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      maxLength={30}
                      placeholder="Np. Twoja Nazwa"
                    />
                    {formErrors.name && <small className={styles.error}>{formErrors.name}</small>}
                  </label>

                  <label className={styles.formField}>
                    <span className={styles.fieldLabel}>
                      <FiBriefcase className={styles.fieldIcon} />
                      Rola / Zawód / Tematyka
                    </span>
                    <input
                      className={styles.formInput}
                      type="text"
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      maxLength={40}
                      placeholder="Np. Korepetytor / DJ / Grafik"
                    />
                    {formErrors.role && <small className={styles.error}>{formErrors.role}</small>}
                  </label>

                  <label className={styles.formField}>
                    <span className={styles.fieldLabel}>
                      <FiGrid className={styles.fieldIcon} />
                      Typ profilu
                    </span>
                    <select
                      className={styles.formSelect}
                      name="profileType"
                      value={form.profileType}
                      onChange={handleChange}
                    >
                      <option value="" disabled>
                        -- Wybierz typ profilu --
                      </option>
                      <option value="zawodowy">Zawodowy</option>
                      <option value="hobbystyczny">Hobbystyczny</option>
                      <option value="serwis">Serwis</option>
                      <option value="społeczność">Społeczność / serwer / blog</option>
                    </select>
                    {formErrors.profileType && (
                      <small className={styles.error}>{formErrors.profileType}</small>
                    )}
                  </label>

                  <label className={styles.formField}>
                    <span className={styles.fieldLabel}>
                      <FiMapPin className={styles.fieldIcon} />
                      Lokalizacja
                    </span>
                    <input
                      className={styles.formInput}
                      type="text"
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      maxLength={30}
                      placeholder="Np. Poznań / cała Polska"
                    />
                    {formErrors.location && (
                      <small className={styles.error}>{formErrors.location}</small>
                    )}
                  </label>
                </div>
              </div>

              <div className={styles.contentBox}>
                <div className={styles.contentHeader}>
                  <h3 className={styles.contentTitle}>2. Wygląd i opis</h3>
                  <span className={styles.badge}>
                    <FiImage />
                    Design
                  </span>
                </div>

                <div className={styles.formStack}>
                  <label className={styles.formField}>
                    <span className={styles.fieldLabel}>
                      <FiImage className={styles.fieldIcon} />
                      Avatar
                    </span>

                    <div className={styles.avatarUploader}>
                      <div className={styles.avatarPreviewBox}>
                        <img
                          src={form.avatar || DEFAULT_AVATAR}
                          alt="Podgląd avatara"
                          className={styles.avatarPreview}
                        />
                      </div>

                      <div className={styles.avatarActions}>
                        <input
                          className={styles.formFile}
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          disabled={avatarUploading || loading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            if (!file.type?.startsWith("image/")) {
                              setFormErrors((p) => ({
                                ...p,
                                avatar: "Plik musi być obrazkiem.",
                              }));
                              return;
                            }

                            if (file.size > 3 * 1024 * 1024) {
                              setFormErrors((p) => ({
                                ...p,
                                avatar: "Maksymalny rozmiar avatara to 3MB.",
                              }));
                              return;
                            }

                            setFormErrors((p) => ({ ...p, avatar: "" }));

                            if (
                              typeof form.avatar === "string" &&
                              form.avatar.startsWith("blob:")
                            ) {
                              try {
                                URL.revokeObjectURL(form.avatar);
                              } catch { }
                            }

                            const previewUrl = URL.createObjectURL(file);
                            setAvatarFile(file);
                            setForm((prev) => ({ ...prev, avatar: previewUrl }));
                          }}
                        />

                        <LoadingButton
                          type="button"
                          isLoading={resetAvatarLoading}
                          disabled={resetAvatarLoading || avatarUploading || loading}
                          className={styles.secondaryButton}
                          onClick={resetAvatarLocal}
                        >
                          Przywróć domyślny avatar
                        </LoadingButton>

                        {(avatarUploading || loading) && (
                          <small className={styles.helperText}>Przetwarzanie avatara...</small>
                        )}
                        {formErrors.avatar && (
                          <small className={styles.error}>{formErrors.avatar}</small>
                        )}
                      </div>
                    </div>
                  </label>

                  <label className={styles.formField}>
                    <span className={styles.fieldLabel}>
                      <FiFileText className={styles.fieldIcon} />
                      Opis działalności / O mnie
                    </span>
                    <textarea
                      className={styles.formTextarea}
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      maxLength={CREATE_PLAN.limits.descriptionLength}
                      placeholder="Napisz kilka zdań o sobie, swojej działalności i tym, co oferujesz..."
                    />
                    <small className={styles.counterText}>
                      {form.description.length}/{CREATE_PLAN.limits.descriptionLength} znaków — plan Starter
                    </small>
                    {formErrors.description && (
                      <small className={styles.error}>{formErrors.description}</small>
                    )}
                  </label>

                  <label className={styles.formField}>
                    <span className={styles.fieldLabel}>
                      <FiTag className={styles.fieldIcon} />
                      Tagi — {activeTagsCount}/{TAGS_LIMIT}
                    </span>

                    <div className={styles.inlineGrid}>
                      {form.tags.map((tag, index) => (
                        <div key={index} className={styles.tagInputWrapper}>
                          <input
                            className={styles.formInput}
                            type="text"
                            placeholder={`Tag ${index + 1}`}
                            value={tag}
                            maxLength={TAG_MAX_LENGTH}
                            onChange={(e) => handleTagChange(index, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>

                    {formErrors.tags && <small className={styles.error}>{formErrors.tags}</small>}
                  </label>
                </div>
              </div>

              <div className={styles.contentBox}>
                <div className={styles.contentHeader}>
                  <h3 className={styles.contentTitle}>3. Dostępność i usługi</h3>
                  <span className={styles.badge}>
                    <FiCalendar />
                    Oferta
                  </span>
                </div>

                <div className={styles.fieldGrid}>
                  <label className={styles.formField}>
                    <span className={styles.fieldLabel}>
                      <FiDollarSign className={styles.fieldIcon} />
                      Cennik od
                    </span>
                    <input
                      className={styles.formInput}
                      type="number"
                      name="priceFrom"
                      value={form.priceFrom}
                      onChange={handleChange}
                      min={1}
                      max={100000}
                      placeholder="Np. 100"
                    />
                    {formErrors.priceFrom && (
                      <small className={styles.error}>{formErrors.priceFrom}</small>
                    )}
                  </label>

                  <label className={styles.formField}>
                    <span className={styles.fieldLabel}>
                      <FiDollarSign className={styles.fieldIcon} />
                      Cennik do
                    </span>
                    <input
                      className={styles.formInput}
                      type="number"
                      name="priceTo"
                      value={form.priceTo}
                      onChange={handleChange}
                      min={form.priceFrom ? Number(form.priceFrom) : 1}
                      max={1000000}
                      placeholder="Np. 1000"
                    />
                    {formErrors.priceTo && (
                      <small className={styles.error}>{formErrors.priceTo}</small>
                    )}
                  </label>
                </div>

                {form.services.length > 0 && (
                  <ul className={styles.serviceList}>
                    {form.services.map((s, i) => (
                      <li key={i} className={styles.serviceItem}>
                        <div className={styles.serviceItemTop}>
                          <div>
                            <strong className={styles.serviceName}>{s.name}</strong>
                            {s.shortDescription && (
                              <p className={styles.serviceDesc}>{s.shortDescription}</p>
                            )}
                          </div>

                          <span className={styles.serviceBadge}>{mapCategory(s.category)}</span>
                        </div>

                        <div className={styles.serviceMeta}>
                          <span>{formatServicePrice(s)}</span>
                          <span>
                            {s.duration.value} {mapUnit(s.duration.unit)}
                          </span>
                          <span>
                            {s.booking?.enabled
                              ? s.booking.type === "calendar"
                                ? "rezerwacja"
                                : "zapytanie"
                              : "bez rezerwacji"}
                          </span>
                        </div>

                        <button
                          type="button"
                          className={styles.removeServiceBtn}
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              services: prev.services.filter((_, idx) => idx !== i),
                            }))
                          }
                        >
                          <FiTrash2 />
                          Usuń usługę
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className={styles.serviceCard}>
                  <div className={styles.serviceCardHead}>
                    <h4 className={styles.serviceCardTitle}>Dodaj usługę / ofertę</h4>
                    <span className={styles.serviceCardPill}>
                      {servicesCount}/{CREATE_PLAN.limits.services} w planie Starter
                    </span>
                  </div>

                  <div className={styles.serviceGrid}>
                    <div>
                      <input
                        className={styles.formInput}
                        type="text"
                        placeholder="Nazwa (np. Strzyżenie męskie)"
                        value={newService.name}
                        maxLength={SERVICE_NAME_MAX_LENGTH}
                        disabled={servicesCount >= CREATE_PLAN.limits.services}
                        onChange={(e) =>
                          setNewService((prev) => ({
                            ...prev,
                            name: cleanServiceText(e.target.value, SERVICE_NAME_MAX_LENGTH),
                          }))
                        }
                      />

                      <small className={styles.fieldCounter}>
                        {newService.name.length}/{SERVICE_NAME_MAX_LENGTH}
                      </small>
                    </div>

                    <select
                      className={styles.formSelect}
                      value={newService.category}
                      disabled={servicesCount >= CREATE_PLAN.limits.services}
                      onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                    >
                      <option value="service">Usługa</option>
                      <option value="product">Produkt</option>
                      <option value="project">Projekt</option>
                      <option value="artwork">Obraz / dzieło</option>
                      <option value="handmade">Rękodzieło</option>
                      <option value="lesson">Lekcja</option>
                      <option value="consultation">Konsultacja</option>
                      <option value="event">Event</option>
                      <option value="custom">Inne</option>
                    </select>

                    <div>
                      <input
                        className={styles.formInput}
                        type="text"
                        placeholder="Krótki opis (opcjonalnie)"
                        value={newService.shortDescription}
                        maxLength={SERVICE_SHORT_DESCRIPTION_MAX_LENGTH}
                        disabled={servicesCount >= CREATE_PLAN.limits.services}
                        onChange={(e) =>
                          setNewService((prev) => ({
                            ...prev,
                            shortDescription: cleanServiceText(
                              e.target.value,
                              SERVICE_SHORT_DESCRIPTION_MAX_LENGTH
                            ),
                          }))
                        }
                      />

                      <small className={styles.fieldCounter}>
                        {newService.shortDescription.length}/{SERVICE_SHORT_DESCRIPTION_MAX_LENGTH}
                      </small>
                    </div>

                    <select
                      className={styles.formSelect}
                      value={newService.priceMode}
                      disabled={servicesCount >= CREATE_PLAN.limits.services}
                      onChange={(e) =>
                        setNewService({
                          ...newService,
                          priceMode: e.target.value,
                          priceValue: "",
                          priceFrom: "",
                          priceTo: "",
                        })
                      }
                    >
                      <option value="contact">Wycena indywidualna</option>
                      <option value="fixed">Cena stała</option>
                      <option value="from">Cena od</option>
                      <option value="range">Zakres cen</option>
                      <option value="free">Darmowe</option>
                    </select>

                    {(newService.priceMode === "fixed" || newService.priceMode === "from") && (
                      <div>
                        <input
                          className={styles.formInput}
                          type="number"
                          inputMode="numeric"
                          placeholder={newService.priceMode === "fixed" ? "Cena" : "Cena od"}
                          min="0"
                          max={SERVICE_PRICE_MAX}
                          value={newService.priceValue}
                          disabled={servicesCount >= CREATE_PLAN.limits.services}
                          onChange={(e) =>
                            setNewService((prev) => ({
                              ...prev,
                              priceValue: cleanIntegerInput(e.target.value, 7),
                            }))
                          }
                        />

                        <small className={styles.fieldCounter}>
                          Dostępny zakres: 0–{SERVICE_PRICE_MAX} zł
                        </small>
                      </div>
                    )}

                    {newService.priceMode === "range" && (
                      <>
                        <div>
                          <input
                            className={styles.formInput}
                            type="number"
                            inputMode="numeric"
                            placeholder="Cena od"
                            min="0"
                            max={SERVICE_PRICE_MAX}
                            value={newService.priceFrom}
                            disabled={servicesCount >= CREATE_PLAN.limits.services}
                            onChange={(e) =>
                              setNewService((prev) => ({
                                ...prev,
                                priceFrom: cleanIntegerInput(e.target.value, 7),
                              }))
                            }
                          />

                          <small className={styles.fieldCounter}>
                            Dostępny zakres: 0–{SERVICE_PRICE_MAX} zł
                          </small>
                        </div>

                        <div>
                          <input
                            className={styles.formInput}
                            type="number"
                            inputMode="numeric"
                            placeholder="Cena do"
                            min="0"
                            max={SERVICE_PRICE_MAX}
                            value={newService.priceTo}
                            disabled={servicesCount >= CREATE_PLAN.limits.services}
                            onChange={(e) =>
                              setNewService((prev) => ({
                                ...prev,
                                priceTo: cleanIntegerInput(e.target.value, 7),
                              }))
                            }
                          />

                          <small className={styles.fieldCounter}>
                            Dostępny zakres: 0–{SERVICE_PRICE_MAX} zł
                          </small>
                        </div>
                      </>
                    )}

                    <div>
                      <input
                        className={styles.formInput}
                        type="number"
                        inputMode="numeric"
                        placeholder="Czas"
                        min={SERVICE_DURATION_LIMITS[newService.durationUnit]?.min || 1}
                        max={SERVICE_DURATION_LIMITS[newService.durationUnit]?.max || 999}
                        value={newService.durationValue}
                        disabled={servicesCount >= CREATE_PLAN.limits.services}
                        onChange={(e) =>
                          setNewService((prev) => ({
                            ...prev,
                            durationValue: cleanIntegerInput(e.target.value, 4),
                          }))
                        }
                      />

                      <small className={styles.fieldCounter}>
                        Dostępny zakres: {getDurationLimitText(newService.durationUnit)}
                      </small>
                    </div>

                    <select
                      className={styles.formSelect}
                      value={newService.durationUnit}
                      disabled={servicesCount >= CREATE_PLAN.limits.services}
                      onChange={(e) =>
                        setNewService({ ...newService, durationUnit: e.target.value })
                      }
                    >
                      <option value="minutes">Minuty</option>
                      <option value="hours">Godziny</option>
                      <option value="days">Dni</option>
                      <option value="weeks">Tygodnie</option>
                    </select>
                  </div>

                  <div className={styles.serviceOptions}>
                    <label className={styles.checkboxInline}>
                      <input
                        type="checkbox"
                        checked={newService.bookingEnabled}
                        disabled={servicesCount >= CREATE_PLAN.limits.services}
                        onChange={(e) =>
                          setNewService((prev) => ({
                            ...prev,
                            bookingEnabled: e.target.checked,
                            bookingType: e.target.checked ? "request" : "none",
                          }))
                        }
                      />
                      Umożliw zapytanie o usługę
                    </label>

                    {newService.bookingEnabled && (
                      <select
                        className={styles.formSelect}
                        value={newService.bookingType}
                        disabled={servicesCount >= CREATE_PLAN.limits.services}
                        onChange={(e) =>
                          setNewService({ ...newService, bookingType: e.target.value })
                        }
                      >
                        <option value="request">Zapytanie — Starter</option>
                        <option value="calendar" disabled>
                          Kalendarz — Premium
                        </option>
                      </select>
                    )}
                  </div>

                  <button
                    type="button"
                    className={styles.addServiceBtn}
                    onClick={handleAddService}
                    disabled={servicesCount >= CREATE_PLAN.limits.services}
                  >
                    <FiPlus />
                    {servicesCount >= CREATE_PLAN.limits.services
                      ? "Limit usług w planie Starter"
                      : "Dodaj usługę"}
                  </button>

                  {serviceError && <small className={styles.error}>{serviceError}</small>}
                </div>

                <label className={styles.formField}>
                  <span className={styles.fieldLabel}>
                    <FiClock className={styles.fieldIcon} />
                    Tryb działania rezerwacji
                  </span>
                  <select
                    className={styles.formSelect}
                    name="bookingMode"
                    value={form.bookingMode}
                    onChange={handleChange}
                  >
                    <option value="calendar" disabled>
                      Kalendarz godzinowy — dostępny w Premium
                    </option>
                    <option value="request-blocking" disabled>
                      Blokowanie dni — dostępne w Premium
                    </option>
                    <option value="request-open">Zapytanie bez blokowania — Starter</option>
                  </select>

                  <small className={styles.helperText}>
                    W planie Starter dostępny jest tryb zapytań. Kalendarz i blokowanie
                    dni odblokujesz po przejściu na Premium.
                  </small>

                  {formErrors.bookingMode && (
                    <small className={styles.error}>{formErrors.bookingMode}</small>
                  )}
                </label>

                {formErrors.services && <small className={styles.error}>{formErrors.services}</small>}
              </div>

              <div className={styles.contentBox}>
                <div className={styles.contentHeader}>
                  <h3 className={styles.contentTitle}>4. Linki i media</h3>
                  <span className={styles.badge}>
                    <FiLink />
                    Media
                  </span>
                </div>

                <div className={styles.inlineGrid}>
                  {form.links.map((link, index) => (
                    <label key={index} className={styles.formField}>
                      <span className={styles.fieldLabel}>Link {index + 1}</span>
                      <input
                        className={styles.formInput}
                        type="url"
                        placeholder="https://..."
                        value={link}
                        onChange={(e) => handleLinkChange(index, e.target.value)}
                      />
                    </label>
                  ))}
                </div>

                <small className={styles.counterText}>
                  {activeLinksCount}/{CREATE_PLAN.limits.links} linki — plan Starter
                </small>

                {formErrors.links && <small className={styles.error}>{formErrors.links}</small>}
              </div>

              <div className={styles.contentBox}>
                <div className={styles.contentHeader}>
                  <h3 className={styles.contentTitle}>5. Informacje dodatkowe</h3>
                  <span className={styles.badge}>
                    <FiCheckCircle />
                    Final
                  </span>
                </div>

                <div className={styles.formStack}>
                  <label className={`${styles.formField} ${styles.checkboxBox}`}>
                    <span className={styles.checkboxInline}>
                      <input
                        type="checkbox"
                        name="hasBusiness"
                        checked={form.hasBusiness}
                        onChange={handleChange}
                      />
                      Posiadam działalność gospodarczą
                    </span>
                  </label>

                  {form.hasBusiness && (
                    <label className={styles.formField}>
                      <span className={styles.fieldLabel}>NIP (opcjonalnie)</span>
                      <input
                        className={styles.formInput}
                        type="text"
                        name="nip"
                        value={form.nip}
                        onChange={handleChange}
                        placeholder="Np. 1234567890"
                      />
                    </label>
                  )}

                  <div
                    className={`${styles.termsBox} ${formErrors.regulations ? styles.termsBoxError : ""}`}
                  >
                    <label className={styles.termsLabel}>
                      <input
                        type="checkbox"
                        checked={acceptedRegulations}
                        onChange={(e) => {
                          setAcceptedRegulations(e.target.checked);
                          if (e.target.checked) {
                            setFormErrors((prev) => ({ ...prev, regulations: "" }));
                          }
                        }}
                        aria-invalid={!!formErrors.regulations}
                      />

                      <span>
                        Potwierdzam, że rozumiem i akceptuję{" "}
                        <Link
                          to="/regulamin"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                        >
                          regulamin serwisu
                        </Link>
                        .
                      </span>
                    </label>
                  </div>

                  {formErrors.regulations && (
                    <small className={styles.error}>{formErrors.regulations}</small>
                  )}

                  <LoadingButton
                    type="submit"
                    isLoading={loading}
                    disabled={loading || avatarUploading}
                    className={styles.submitButton}
                  >
                    Utwórz profil
                  </LoadingButton>

                  {formErrors.general && <p className={styles.error}>{formErrors.general}</p>}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CreateProfile;
