import { useEffect, useRef, useState } from "react";
import styles from "./CreateProfile.module.scss";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
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

const DEFAULT_AVATAR = "/images/other/no-image.png";

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
    priceMode: "fixed",
    priceValue: "",
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
        } catch {}
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
      } catch {}
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
    updatedTags[index] = value;
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
      default:
        return "Oferta";
    }
  };

  const formatServicePrice = (service) => {
    const mode = service?.price?.mode;
    const amount = service?.price?.amount;
    const from = service?.price?.from;
    const currency = service?.price?.currency || "PLN";

    if (mode === "fixed" && amount) return `${amount} ${currency}`;
    if (mode === "from" && from) return `od ${from} ${currency}`;
    if (mode === "contact") return "wycena indywidualna";
    if (mode === "free") return "darmowe";
    return "bez ceny";
  };

  const handleAddService = () => {
    const name = newService.name.trim();
    const shortDescription = newService.shortDescription.trim();
    const category = newService.category;
    const priceMode = newService.priceMode;
    const durationValue = Number(newService.durationValue);
    const durationUnit = newService.durationUnit;

    const hasValidDuration =
      Number.isFinite(durationValue) &&
      ((durationUnit === "minutes" && durationValue >= 15) ||
        (durationUnit === "hours" && durationValue >= 1) ||
        (durationUnit === "days" && durationValue >= 1));

    if (!name || name.length < 2) {
      setServiceError("Podaj nazwę usługi (minimum 2 znaki).");
      return;
    }

    if (shortDescription.length > 120) {
      setServiceError("Krótki opis usługi może mieć maksymalnie 120 znaków.");
      return;
    }

    if (!hasValidDuration) {
      setServiceError("Czas usługi: minimum 15 minut, 1 godzina lub 1 dzień.");
      return;
    }

    let price = {
      mode: priceMode,
      amount: null,
      from: null,
      to: null,
      currency: "PLN",
      unitLabel: "",
      note: "",
    };

    if (priceMode === "fixed") {
      const amount = Number(newService.priceValue);
      if (!Number.isFinite(amount) || amount < 0) {
        setServiceError("Podaj poprawną cenę stałą usługi.");
        return;
      }
      price.amount = amount;
    }

    if (priceMode === "from") {
      const from = Number(newService.priceValue);
      if (!Number.isFinite(from) || from < 0) {
        setServiceError("Podaj poprawną cenę 'od'.");
        return;
      }
      price.from = from;
    }

    if (priceMode === "contact" || priceMode === "free") {
      price.amount = null;
      price.from = null;
      price.to = null;
    }

    const bookingEnabled = !!newService.bookingEnabled;
    const bookingType = bookingEnabled
      ? newService.bookingType === "calendar"
        ? "calendar"
        : "request"
      : "none";

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
      priceMode: "fixed",
      priceValue: "",
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

    if (form.description.length > 500) {
      errors.description = "Opis nie może przekraczać 500 znaków";
    }

    if (!form.profileType) {
      errors.profileType = "Wybierz typ profilu";
    }

    const priceFromNum = Number(form.priceFrom);
    const priceToNum = Number(form.priceTo);

    if (!Number.isFinite(priceFromNum) || priceFromNum < 1 || priceFromNum > 100000) {
      errors.priceFrom = "Cena od musi być w zakresie 1–100 000";
    }

    if (!Number.isFinite(priceToNum) || priceToNum < priceFromNum || priceToNum > 1000000) {
      errors.priceTo = 'Cena do musi być większa niż "od" i nie większa niż 1 000 000';
    }

    if (
      (form.services || []).some(
        (s) =>
          !s.name?.trim() ||
          ((s.duration.unit === "minutes" && s.duration.value < 15) ||
            (s.duration.unit === "hours" && s.duration.value < 1) ||
            (s.duration.unit === "days" && s.duration.value < 1))
      )
    ) {
      errors.services =
        "Każda usługa musi mieć poprawną nazwę i czas trwania/realizacji.";
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
      tags: nonEmptyTags.map((tag) => tag.trim()),
      availableDates: [],
      services: form.services,
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
  const servicesCount = form.services.length;

  return (
    <section id="scrollToId" className={styles.section}>
      <div className={styles.sectionBackground} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.head}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Showly Create Profile</span>
            <span className={styles.labelDot} />
            <span className={styles.labelDesc}>Budujesz swoją publiczną wizytówkę</span>
            <span className={styles.labelLine} />
            <span className={styles.pill}>Profil • Usługi • Podgląd</span>
          </div>

          <h2 className={styles.heading}>
            Stwórz swój <span className={styles.headingAccent}>profil</span> i pokaż się
            światu 🚀
          </h2>

          <p className={styles.description}>
            Uzupełnij podstawowe informacje, dodaj usługi, linki oraz opis działalności.
            Po prawej stronie od razu widzisz podgląd swojej wizytówki.
          </p>

          <div className={styles.metaRow}>
            <div className={styles.metaCard}>
              <strong>{activeTagsCount}/3</strong>
              <span>aktywnych tagów</span>
            </div>

            <div className={styles.metaCard}>
              <strong>{servicesCount}</strong>
              <span>dodanych usług</span>
            </div>

            <div className={styles.metaCard}>
              <strong>{form.bookingMode === "calendar" ? "Kalendarz" : "Zapytania"}</strong>
              <span>wybrany tryb działania</span>
            </div>
          </div>
        </div>

        <div className={styles.layout}>
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
                    placeholder="Np. TYGA-TECH"
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
                    placeholder="Np. Serwis laserów / DJ / Grafik"
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
                    placeholder="Np. Piła / cała Polska"
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
                            } catch {}
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
                    maxLength={500}
                    placeholder="Napisz kilka zdań o sobie, swojej działalności i tym, co oferujesz..."
                  />
                  <small className={styles.counterText}>
                    {form.description.length}/500 znaków
                  </small>
                  {formErrors.description && (
                    <small className={styles.error}>{formErrors.description}</small>
                  )}
                </label>

                <label className={styles.formField}>
                  <span className={styles.fieldLabel}>
                    <FiTag className={styles.fieldIcon} />
                    Tagi (maksymalnie 3)
                  </span>

                  <div className={styles.inlineGrid}>
                    {form.tags.map((tag, index) => (
                      <div key={index} className={styles.tagInputWrapper}>
                        <input
                          className={styles.formInput}
                          type="text"
                          placeholder={`Tag ${index + 1}`}
                          value={tag}
                          maxLength={20}
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
                  <span className={styles.serviceCardPill}>Nowa pozycja</span>
                </div>

                <div className={styles.serviceGrid}>
                  <input
                    className={styles.formInput}
                    type="text"
                    placeholder="Nazwa (np. Strzyżenie męskie)"
                    value={newService.name}
                    maxLength={80}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  />

                  <select
                    className={styles.formSelect}
                    value={newService.category}
                    onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                  >
                    <option value="service">Usługa</option>
                    <option value="product">Produkt</option>
                    <option value="project">Projekt</option>
                    <option value="artwork">Obraz / dzieło</option>
                    <option value="handmade">Rękodzieło</option>
                    <option value="lesson">Lekcja</option>
                    <option value="consultation">Konsultacja</option>
                  </select>

                  <input
                    className={styles.formInput}
                    type="text"
                    placeholder="Krótki opis (opcjonalnie)"
                    value={newService.shortDescription}
                    maxLength={120}
                    onChange={(e) =>
                      setNewService({ ...newService, shortDescription: e.target.value })
                    }
                  />

                  <select
                    className={styles.formSelect}
                    value={newService.priceMode}
                    onChange={(e) =>
                      setNewService({
                        ...newService,
                        priceMode: e.target.value,
                        priceValue: "",
                      })
                    }
                  >
                    <option value="fixed">Cena stała</option>
                    <option value="from">Cena od</option>
                    <option value="contact">Wycena indywidualna</option>
                    <option value="free">Darmowe</option>
                  </select>

                  {(newService.priceMode === "fixed" || newService.priceMode === "from") && (
                    <input
                      className={styles.formInput}
                      type="number"
                      placeholder={newService.priceMode === "fixed" ? "Cena" : "Cena od"}
                      min="0"
                      value={newService.priceValue}
                      onChange={(e) =>
                        setNewService({ ...newService, priceValue: e.target.value })
                      }
                    />
                  )}

                  <input
                    className={styles.formInput}
                    type="number"
                    placeholder="Czas"
                    min="1"
                    value={newService.durationValue}
                    onChange={(e) =>
                      setNewService({ ...newService, durationValue: e.target.value })
                    }
                  />

                  <select
                    className={styles.formSelect}
                    value={newService.durationUnit}
                    onChange={(e) =>
                      setNewService({ ...newService, durationUnit: e.target.value })
                    }
                  >
                    <option value="minutes">Minuty</option>
                    <option value="hours">Godziny</option>
                    <option value="days">Dni</option>
                  </select>
                </div>

                <div className={styles.serviceOptions}>
                  <label className={styles.checkboxInline}>
                    <input
                      type="checkbox"
                      checked={newService.bookingEnabled}
                      onChange={(e) =>
                        setNewService((prev) => ({
                          ...prev,
                          bookingEnabled: e.target.checked,
                          bookingType: e.target.checked ? "request" : "none",
                        }))
                      }
                    />
                    Umożliw rezerwację / zapytanie
                  </label>

                  {newService.bookingEnabled && (
                    <select
                      className={styles.formSelect}
                      value={newService.bookingType}
                      onChange={(e) =>
                        setNewService({ ...newService, bookingType: e.target.value })
                      }
                    >
                      <option value="request">Zapytanie</option>
                      <option value="calendar">Kalendarz</option>
                    </select>
                  )}
                </div>

                <button
                  type="button"
                  className={styles.addServiceBtn}
                  onClick={handleAddService}
                >
                  <FiPlus />
                  Dodaj usługę
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
                  <option value="calendar">
                    Kalendarz godzinowy (np. fryzjer, korepetytor)
                  </option>
                  <option value="request-blocking">
                    Zablokuj dzień (np. DJ, cukiernik)
                  </option>
                  <option value="request-open">
                    Zapytanie bez blokowania (np. programista)
                  </option>
                </select>
              </label>

              {form.bookingMode === "calendar" && (
                <div className={styles.scheduleBox}>
                  <h4 className={styles.subSectionTitle}>Godziny i dni pracy</h4>

                  <div className={styles.fieldGrid}>
                    <label className={styles.formField}>
                      <span className={styles.fieldLabel}>Od</span>
                      <input
                        className={styles.formInput}
                        type="time"
                        value={form.workingHours.from}
                        onChange={(e) => {
                          const from = e.target.value;
                          setForm((f) => ({
                            ...f,
                            workingHours: { ...f.workingHours, from },
                          }));
                        }}
                      />
                    </label>

                    <label className={styles.formField}>
                      <span className={styles.fieldLabel}>Do</span>
                      <input
                        className={styles.formInput}
                        type="time"
                        value={form.workingHours.to}
                        onChange={(e) => {
                          const to = e.target.value;
                          setForm((f) => ({
                            ...f,
                            workingHours: { ...f.workingHours, to },
                          }));
                        }}
                      />
                    </label>
                  </div>

                  <fieldset className={styles.fieldset}>
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                      <label key={d} className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          value={d}
                          checked={form.workingDays.includes(d)}
                          onChange={(e) => {
                            const day = Number(e.target.value);
                            setForm((f) => {
                              const days = f.workingDays.includes(day)
                                ? f.workingDays.filter((x) => x !== day)
                                : [...f.workingDays, day];
                              return { ...f, workingDays: days };
                            });
                          }}
                        />
                        {["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"][d]}
                      </label>
                    ))}
                  </fieldset>
                </div>
              )}

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
                      placeholder={`https://...`}
                      value={link}
                      onChange={(e) => handleLinkChange(index, e.target.value)}
                    />
                  </label>
                ))}
              </div>
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

          <aside className={styles.previewColumn}>
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
                        (tag) => tag.trim() !== "" && tag.length <= 20
                      ),
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
          </aside>
        </div>
      </div>
    </section>
  );
};

export default CreateProfile;