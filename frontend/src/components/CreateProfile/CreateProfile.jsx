import { useEffect, useRef, useState } from "react";
import styles from "./CreateProfile.module.scss";
import axios from "axios";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import UserCard from "../UserCard/UserCard";
import LoadingButton from "../ui/LoadingButton/LoadingButton";

const DEFAULT_AVATAR = "/images/other/no-image.png";

const CreateProfile = ({ user, setRefreshTrigger }) => {
  const [form, setForm] = useState({
    name: "",
    avatar: DEFAULT_AVATAR, // ✅ podgląd: blob lub default
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
    durationValue: "",
    durationUnit: "minutes",
  });

  const locationHook = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formErrors, setFormErrors] = useState({});
  const [serviceError, setServiceError] = useState("");
  const [previewMsg, setPreviewMsg] = useState("");

  const [loading, setLoading] = useState(false);

  // ✅ avatar: plik + blob preview (pokazuj od razu, zapisuj dopiero po "Utwórz")
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

  // ✅ sprzątanie blob URL
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

  const uid = user?.uid || user?.localId || user?.email;

  // =========================================================
  // ✅ Upload avatara dopiero po utworzeniu profilu
  // POST /api/profiles/:uid/avatar (FormData: file)
  // =========================================================
  const uploadAvatarAfterCreate = async (file) => {
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);

    await axios.post(
      `${process.env.REACT_APP_API_URL}/api/profiles/${uid}/avatar`,
      fd,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
  };

  const resetAvatarLocal = async () => {
    if (resetAvatarLoading) return;

    setResetAvatarLoading(true);
    setFormErrors((p) => ({ ...p, avatar: "" }));

    // zwolnij poprzedni blob
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

  // =========================================================
  // ✅ Form handlers
  // =========================================================
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
      default:
        return "";
    }
  };

  // =========================================================
  // ✅ Submit
  // =========================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const errors = {};

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
          (s.duration.unit === "minutes" && s.duration.value < 15) ||
          (s.duration.unit === "hours" && s.duration.value < 1) ||
          (s.duration.unit === "days" && s.duration.value < 1)
      )
    ) {
      errors.services = "Każda usługa musi mieć minimum 15 minut, 1 godzinę lub 1 dzień!";
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);

    // ✅ NIE wysyłamy blob: do backendu. Avatar w DB ustawimy po create przez endpoint /:uid/avatar
    const payload = {
      ...form,
      avatar: { url: "", publicId: "" }, // zgodnie z Twoim modelem
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
      // 1) create profile
      await axios.post(`${process.env.REACT_APP_API_URL}/api/profiles`, payload);

      // 2) upload avatar dopiero po create (brak 404)
      if (avatarFile) {
        setAvatarUploading(true);
        await uploadAvatarAfterCreate(avatarFile);
        setAvatarUploading(false);
      }

      setRefreshTrigger(Date.now());
      setTimeout(() => navigate("/profil"), 300);
    } catch (err) {
      setFormErrors({
        general: err.response?.data?.message || "Wystąpił błąd podczas tworzenia wizytówki",
      });
    } finally {
      setLoading(false);
      setAvatarUploading(false);
    }
  };

  return (
    <div id="scrollToId" className={styles.container}>
      <h2 className={styles.formMainHeading}>Stwórz swój profil</h2>

      <div className={styles.wrapper}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <h3 className={styles.sectionTitle}>1. Dane podstawowe</h3>

          <label>
            Nazwa Twojego profilu:
            <input type="text" name="name" value={form.name} onChange={handleChange} maxLength={30} />
            {formErrors.name && <small className={styles.error}>{formErrors.name}</small>}
          </label>

          <label>
            Rola / Zawód / Tematyka:
            <input type="text" name="role" value={form.role} onChange={handleChange} maxLength={40} />
            {formErrors.role && <small className={styles.error}>{formErrors.role}</small>}
          </label>

          <label>
            Typ profilu:
            <select name="profileType" value={form.profileType} onChange={handleChange}>
              <option value="" disabled>
                -- Wybierz typ profilu --
              </option>
              <option value="zawodowy">Zawodowy</option>
              <option value="hobbystyczny">Hobbystyczny</option>
              <option value="serwis">Serwis</option>
              <option value="społeczność">Społeczność / serwer / blog</option>
            </select>
            {formErrors.profileType && <small className={styles.error}>{formErrors.profileType}</small>}
          </label>

          <label>
            Lokalizacja (miasto):
            <input type="text" name="location" value={form.location} onChange={handleChange} maxLength={30} />
            {formErrors.location && <small className={styles.error}>{formErrors.location}</small>}
          </label>

          <h3 className={styles.sectionTitle}>2. Wygląd i opis</h3>

          <label>
            Avatar (podgląd od razu, zapis po Utwórz):
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              disabled={avatarUploading || loading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                // walidacja
                if (!file.type?.startsWith("image/")) {
                  setFormErrors((p) => ({ ...p, avatar: "Plik musi być obrazkiem." }));
                  return;
                }
                if (file.size > 3 * 1024 * 1024) {
                  setFormErrors((p) => ({ ...p, avatar: "Maksymalny rozmiar avatara to 3MB." }));
                  return;
                }

                setFormErrors((p) => ({ ...p, avatar: "" }));

                // zwolnij poprzedni blob, jeśli był
                if (typeof form.avatar === "string" && form.avatar.startsWith("blob:")) {
                  try {
                    URL.revokeObjectURL(form.avatar);
                  } catch {}
                }

                const previewUrl = URL.createObjectURL(file);
                setAvatarFile(file);
                setForm((prev) => ({ ...prev, avatar: previewUrl })); // ✅ UserCard pokaże od razu
              }}
            />
            {(avatarUploading || loading) && <small>Przetwarzanie...</small>}
            {formErrors.avatar && <small className={styles.error}>{formErrors.avatar}</small>}
          </label>

          <LoadingButton
            type="button"
            isLoading={resetAvatarLoading}
            disabled={resetAvatarLoading || avatarUploading || loading}
            className={styles.resetAvatar}
            onClick={resetAvatarLocal}
          >
            Przywróć domyślny avatar
          </LoadingButton>

          <label>
            Opis działalności / O mnie:
            <textarea name="description" value={form.description} onChange={handleChange} maxLength={500} />
            <small>{form.description.length}/500 znaków</small>
            {formErrors.description && <small className={styles.error}>{formErrors.description}</small>}
          </label>

          <label>
            Tagi (maksymalnie 3):
            {form.tags.map((tag, index) => (
              <div key={index} className={styles.tagInputWrapper}>
                <input
                  type="text"
                  placeholder={`Tag ${index + 1}`}
                  value={tag}
                  maxLength={20}
                  onChange={(e) => handleTagChange(index, e.target.value)}
                />
              </div>
            ))}
            {formErrors.tags && <small className={styles.error}>{formErrors.tags}</small>}
          </label>

          <h3 className={styles.sectionTitle}>3. Dostępność i usługi</h3>

          <label>
            Cennik od:
            <input type="number" name="priceFrom" value={form.priceFrom} onChange={handleChange} min={1} max={100000} />
            {formErrors.priceFrom && <small className={styles.error}>{formErrors.priceFrom}</small>}
          </label>

          <label>
            Cennik do:
            <input
              type="number"
              name="priceTo"
              value={form.priceTo}
              onChange={handleChange}
              min={form.priceFrom ? Number(form.priceFrom) : 1}
              max={1000000}
            />
            {formErrors.priceTo && <small className={styles.error}>{formErrors.priceTo}</small>}
          </label>

          {form.services.length > 0 && (
            <ul className={styles.serviceList}>
              {form.services.map((s, i) => (
                <li key={i}>
                  <strong>{s.name}</strong> – {s.duration.value} {mapUnit(s.duration.unit)}
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        services: prev.services.filter((_, idx) => idx !== i),
                      }))
                    }
                  >
                    Usuń
                  </button>
                </li>
              ))}
            </ul>
          )}

          <label>
            Dodaj usługę:
            <div className={styles.serviceForm}>
              <input
                type="text"
                placeholder="Nazwa usługi (np. Strzyżenie)"
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
              />
              <input
                type="number"
                placeholder="Czas"
                min="1"
                value={newService.durationValue}
                onChange={(e) => setNewService({ ...newService, durationValue: e.target.value })}
              />
              <select
                value={newService.durationUnit}
                onChange={(e) => setNewService({ ...newService, durationUnit: e.target.value })}
              >
                <option value="minutes">minuty</option>
                <option value="hours">godziny</option>
                <option value="days">dni</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  const name = newService.name.trim();
                  const value = Number(newService.durationValue);
                  const unit = newService.durationUnit;

                  const ok =
                    name &&
                    Number.isFinite(value) &&
                    ((unit === "minutes" && value >= 15) ||
                      (unit === "hours" && value >= 1) ||
                      (unit === "days" && value >= 1)) &&
                    ["minutes", "hours", "days"].includes(unit);

                  if (!ok) {
                    setServiceError("Podaj nazwę usługi oraz czas: minimum 15 minut, 1 godzinę lub 1 dzień!");
                    return;
                  }

                  setForm((prev) => ({
                    ...prev,
                    services: [
                      ...prev.services,
                      {
                        name,
                        duration: { value: parseInt(String(value), 10), unit },
                      },
                    ],
                  }));

                  setNewService({ name: "", durationValue: "", durationUnit: "minutes" });
                  setServiceError("");
                }}
              >
                Dodaj
              </button>
            </div>
            {serviceError && <small className={styles.error}>{serviceError}</small>}
          </label>

          <label>
            Tryb działania rezerwacji:
            <select name="bookingMode" value={form.bookingMode} onChange={handleChange}>
              <option value="calendar">Kalendarz godzinowy (np. fryzjer, korepetytor)</option>
              <option value="request-blocking">Zablokuj dzień (np. DJ, cukiernik)</option>
              <option value="request-open">Zapytanie bez blokowania (np. programista)</option>
            </select>
          </label>

          {form.bookingMode === "calendar" && (
            <>
              <h4 className={styles.sectionTitle}>Godziny pracy</h4>

              <label className={styles.inputBlock}>
                Od:
                <input
                  type="time"
                  value={form.workingHours.from}
                  onChange={(e) => {
                    const from = e.target.value;
                    setForm((f) => ({ ...f, workingHours: { ...f.workingHours, from } }));
                  }}
                />
              </label>

              <label className={styles.inputBlock}>
                Do:
                <input
                  type="time"
                  value={form.workingHours.to}
                  onChange={(e) => {
                    const to = e.target.value;
                    setForm((f) => ({ ...f, workingHours: { ...f.workingHours, to } }));
                  }}
                />
              </label>

              <h4 className={styles.sectionTitle}>Dni pracy</h4>
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
            </>
          )}

          {formErrors.services && <small className={styles.error}>{formErrors.services}</small>}

          <h3 className={styles.sectionTitle}>4. Linki i media</h3>

          <label>
            Linki zewnętrzne:
            {form.links.map((link, index) => (
              <input
                key={index}
                type="url"
                placeholder={`Link ${index + 1}`}
                value={link}
                onChange={(e) => handleLinkChange(index, e.target.value)}
              />
            ))}
          </label>

          <h3 className={styles.sectionTitle}>5. Informacje dodatkowe</h3>

          <label className={styles.checkbox}>
            <input type="checkbox" name="hasBusiness" checked={form.hasBusiness} onChange={handleChange} />
            Posiadam działalność gospodarczą
          </label>

          {form.hasBusiness && (
            <label>
              NIP (opcjonalnie):
              <input type="text" name="nip" value={form.nip} onChange={handleChange} />
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
        </form>

        <div className={styles.preview}>
          <h3 className={styles.previewTitle}>Podgląd tworzonego profilu</h3>

          <UserCard
            user={{
              ...form,
              tags: form.tags.filter((tag) => tag.trim() !== "" && tag.length <= 20),
              rating: 0,
              reviews: 0,
              availableDates: [],
              userId: uid,
            }}
            currentUser={user}
            isPreview={true}
            onPreviewBlocked={(msg) => setPreviewMsg(msg)}
          />

          {previewMsg && <p className={styles.error}>{previewMsg}</p>}
        </div>
      </div>
    </div>
  );
};

export default CreateProfile;
