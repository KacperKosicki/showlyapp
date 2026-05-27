import { useState } from "react";
import {
  TAGS_LIMIT,
  TAG_MAX_LENGTH,
  SERVICE_NAME_MAX_LENGTH,
  SERVICE_SHORT_DESCRIPTION_MAX_LENGTH,
  SERVICE_PRICE_MAX,
  SERVICE_DURATION_LIMITS,
} from "../../constants/validationLimits";

const DEFAULT_NEW_SERVICE = {
  name: "",
  shortDescription: "",
  category: "service",
  priceMode: "contact",
  priceValue: "",
  priceFrom: "",
  priceTo: "",
  durationValue: "",
  durationUnit: "minutes",
  isActive: true,
  featured: false,
};

const useProfileServices = ({
  editData,
  setEditData,
  setFormErrors,
  maxServices,
  showAlert,
}) => {
  const [newService, setNewService] = useState(DEFAULT_NEW_SERVICE);

  const getDurationLimitText = (unit) => {
    const limit = SERVICE_DURATION_LIMITS[unit];

    if (!limit) return "";

    return `${limit.min}–${limit.max} ${limit.label}`;
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

  const mapServiceCategory = (category) => {
    switch (category) {
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
    const currency = service?.price?.currency || "PLN";

    if (mode === "fixed" && service?.price?.amount != null) {
      return `${service.price.amount} ${currency}`;
    }

    if (mode === "from" && service?.price?.from != null) {
      return `od ${service.price.from} ${currency}`;
    }

    if (mode === "range" && service?.price?.from != null && service?.price?.to != null) {
      return `${service.price.from}–${service.price.to} ${currency}`;
    }

    if (mode === "free") return "Darmowe";
    if (mode === "contact") return "Wycena indywidualna";

    return "Brak ceny";
  };

  const prettyUrl = (url) => {
    try {
      const parsedUrl = new URL(url);
      const host = parsedUrl.hostname.replace(/^www\./, "");
      const path = parsedUrl.pathname === "/" ? "" : parsedUrl.pathname;

      return `${host}${path}`;
    } catch {
      return url;
    }
  };

  const cleanTagInput = (value) => {
    return String(value || "")
      .replace(/[#,\n\r\t]/g, "")
      .replace(/\s+/g, " ")
      .trimStart()
      .slice(0, TAG_MAX_LENGTH);
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

  const normalizeTagsForSave = (tags = []) => {
    const seen = new Set();

    return tags
      .map((tag) => String(tag || "").trim())
      .filter(Boolean)
      .filter((tag) => {
        const key = tag.toLowerCase();

        if (seen.has(key)) return false;

        seen.add(key);
        return true;
      })
      .slice(0, TAGS_LIMIT);
  };

  const handleAddEditableService = () => {
    const currentServicesCount = (editData.services || []).length;

    if (currentServicesCount >= maxServices) {
      showAlert(`Limit obecnego planu: maksymalnie ${maxServices} usług.`, "warning");
      return;
    }

    const name = cleanServiceText(newService.name, SERVICE_NAME_MAX_LENGTH).trim();
    const shortDescription = cleanServiceText(
      newService.shortDescription,
      SERVICE_SHORT_DESCRIPTION_MAX_LENGTH
    ).trim();

    const value = Number(newService.durationValue);
    const unit = newService.durationUnit || "minutes";
    const priceMode = newService.priceMode || "contact";

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
        value,
        unit,
      },
    };

    const serviceError = validateServiceData(serviceToValidate);

    if (serviceError) {
      setFormErrors((prev) => ({
        ...prev,
        services: serviceError,
      }));

      showAlert(serviceError, "warning");
      return;
    }

    setEditData((prev) => ({
      ...prev,
      services: [
        ...(prev.services || []),
        {
          name,
          shortDescription,
          description: "",
          category: newService.category || "service",
          image: { url: "", publicId: "" },
          gallery: [],
          price,
          duration: {
            value,
            unit,
            label:
              unit === "minutes" || unit === "hours"
                ? "czas wizyty"
                : "czas realizacji",
          },
          booking: {
            enabled: false,
            type: "none",
          },
          delivery: {
            mode: "none",
            turnaroundText: "",
          },
          tags: [],
          featured: !!newService.featured,
          isActive: !!newService.isActive,
          order: (prev.services || []).length,
        },
      ],
    }));

    setNewService(DEFAULT_NEW_SERVICE);

    setFormErrors((prev) => ({
      ...prev,
      services: "",
    }));

    showAlert("Dodano usługę. Pamiętaj, aby zapisać zmiany w profilu.", "success");
  };

  return {
    newService,
    setNewService,
    getDurationLimitText,
    mapUnit,
    mapServiceCategory,
    formatServicePrice,
    prettyUrl,
    cleanTagInput,
    cleanServiceText,
    cleanIntegerInput,
    validateServiceData,
    normalizeTagsForSave,
    handleAddEditableService,
  };
};

export default useProfileServices;