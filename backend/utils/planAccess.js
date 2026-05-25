// utils/planAccess.js
const {
  getEffectivePlanKey,
  getEffectivePlan,
  hasFeature,
  getLimit,
  getPublicBilling,
} = require("../config/plans");

/**
 * Bezpieczne liczenie niepustych stringów w tablicy.
 */
function countNonEmptyStrings(arr = []) {
  if (!Array.isArray(arr)) return 0;

  return arr.filter((item) => String(item || "").trim() !== "").length;
}

/**
 * Bezpieczne liczenie szybkich odpowiedzi.
 */
function countQuickAnswers(arr = []) {
  if (!Array.isArray(arr)) return 0;

  return arr.filter((qa) => {
    const title = String(qa?.title || "").trim();
    const answer = String(qa?.answer || "").trim();

    return title || answer;
  }).length;
}

/**
 * Czy profil ma aktywny dostęp do funkcji.
 */
function canUseFeature(profile, featureName, options = {}) {
  return hasFeature(profile, featureName, options);
}

/**
 * Pobiera limit dla profilu.
 */
function getProfileLimit(profile, limitName, options = {}) {
  return getLimit(profile, limitName, options);
}

/**
 * Zwraca czytelne info o planie profilu.
 */
function getProfilePlanInfo(profile, options = {}) {
  const effectivePlanKey = getEffectivePlanKey(profile, options);
  const effectivePlan = getEffectivePlan(profile, options);
  const publicBilling = getPublicBilling(profile);

  return {
    effectivePlanKey,
    label: effectivePlan.label,
    description: effectivePlan.description,
    limits: effectivePlan.limits,
    features: effectivePlan.features,
    billing: publicBilling,
  };
}

/**
 * Middleware do wymagania konkretnej funkcji.
 *
 * Użycie:
 * router.post("/cos", requireFeature("booking"), handler)
 *
 * Wymaga, żeby wcześniej było req.profile.
 */
function requireFeature(featureName, options = {}) {
  return (req, res, next) => {
    try {
      const profile = req.profile;

      if (!profile) {
        return res.status(404).json({
          message: "Nie znaleziono profilu.",
        });
      }

      const allowed = canUseFeature(profile, featureName, options);

      if (!allowed) {
        const planInfo = getProfilePlanInfo(profile, options);

        return res.status(403).json({
          message: "Ta funkcja jest dostępna w wyższym planie.",
          requiredFeature: featureName,
          currentPlan: planInfo.effectivePlanKey,
          plan: planInfo,
        });
      }

      return next();
    } catch (err) {
      console.error("❌ requireFeature error:", err);

      return res.status(500).json({
        message: "Błąd sprawdzania dostępu do funkcji.",
      });
    }
  };
}

/**
 * Walidacja limitów profilu przy zapisie.
 *
 * Przyjmuje:
 * - profile: aktualny profil z bazy
 * - data: dane, które chcesz zapisać
 *
 * Zwraca:
 * {
 *   ok: boolean,
 *   errors: [],
 *   planInfo: {}
 * }
 */
function validateProfilePlanLimits(profile, data = {}, options = {}) {
  const errors = [];

  const planInfo = getProfilePlanInfo(profile, options);

  const maxPhotos = getProfileLimit(profile, "photos", options);
  const maxServices = getProfileLimit(profile, "services", options);
  const maxServiceGallery = getProfileLimit(profile, "serviceGallery", options);
  const maxLinks = getProfileLimit(profile, "links", options);
  const maxQuickAnswers = getProfileLimit(profile, "quickAnswers", options);
  const maxDescriptionLength = getProfileLimit(profile, "descriptionLength", options);

  // =========================
  // Zdjęcia profilu
  // =========================
  if (Array.isArray(data.photos) && data.photos.length > maxPhotos) {
    errors.push({
      field: "photos",
      code: "PLAN_LIMIT_PHOTOS",
      message: `Plan ${planInfo.label} pozwala dodać maksymalnie ${maxPhotos} zdjęć profilu.`,
      limit: maxPhotos,
      current: data.photos.length,
    });
  }

  // =========================
  // Usługi
  // =========================
  if (Array.isArray(data.services) && data.services.length > maxServices) {
    errors.push({
      field: "services",
      code: "PLAN_LIMIT_SERVICES",
      message: `Plan ${planInfo.label} pozwala dodać maksymalnie ${maxServices} usług.`,
      limit: maxServices,
      current: data.services.length,
    });
  }

  // =========================
  // Galerie usług
  // =========================
  if (Array.isArray(data.services)) {
    data.services.forEach((service, index) => {
      const gallery = Array.isArray(service?.gallery) ? service.gallery : [];

      if (gallery.length > maxServiceGallery) {
        errors.push({
          field: `services.${index}.gallery`,
          code: "PLAN_LIMIT_SERVICE_GALLERY",
          message: `Plan ${planInfo.label} pozwala dodać maksymalnie ${maxServiceGallery} zdjęć do jednej usługi.`,
          limit: maxServiceGallery,
          current: gallery.length,
        });
      }
    });
  }

  // =========================
  // Linki
  // =========================
  if (Array.isArray(data.links)) {
    const linksCount = countNonEmptyStrings(data.links);

    if (linksCount > maxLinks) {
      errors.push({
        field: "links",
        code: "PLAN_LIMIT_LINKS",
        message: `Plan ${planInfo.label} pozwala dodać maksymalnie ${maxLinks} linków.`,
        limit: maxLinks,
        current: linksCount,
      });
    }
  }

  // =========================
  // Szybkie odpowiedzi
  // =========================
  if (Array.isArray(data.quickAnswers)) {
    const quickAnswersCount = countQuickAnswers(data.quickAnswers);

    if (quickAnswersCount > maxQuickAnswers) {
      errors.push({
        field: "quickAnswers",
        code: "PLAN_LIMIT_QUICK_ANSWERS",
        message: `Plan ${planInfo.label} pozwala dodać maksymalnie ${maxQuickAnswers} szybkich odpowiedzi.`,
        limit: maxQuickAnswers,
        current: quickAnswersCount,
      });
    }
  }

  // =========================
  // Opis
  // =========================
  if (
    typeof data.description === "string" &&
    data.description.length > maxDescriptionLength
  ) {
    errors.push({
      field: "description",
      code: "PLAN_LIMIT_DESCRIPTION",
      message: `Opis w planie ${planInfo.label} może mieć maksymalnie ${maxDescriptionLength} znaków.`,
      limit: maxDescriptionLength,
      current: data.description.length,
    });
  }

  // =========================
  // Booking mode
  // =========================
  const bookingMode = data.bookingMode;

  if (
    ["calendar", "request-blocking"].includes(bookingMode) &&
    !canUseFeature(profile, "booking", options)
  ) {
    errors.push({
      field: "bookingMode",
      code: "FEATURE_BOOKING_REQUIRED",
      message: "Kalendarz i blokowanie dni są dostępne tylko w planie Premium.",
      requiredFeature: "booking",
    });
  }

  // =========================
  // Team
  // =========================
  const teamEnabled = !!data?.team?.enabled;

  if (teamEnabled && !canUseFeature(profile, "team", options)) {
    errors.push({
      field: "team",
      code: "FEATURE_TEAM_REQUIRED",
      message: "Zespół i pracownicy są dostępni tylko w planie Premium.",
      requiredFeature: "team",
    });
  }

  // =========================
  // Premium themes
  // =========================
  const themeVariant = data?.theme?.variant;

  const premiumThemes = ["blue", "green", "orange", "red", "dark"];

  if (
    themeVariant &&
    premiumThemes.includes(themeVariant) &&
    !canUseFeature(profile, "premiumThemes", options)
  ) {
    errors.push({
      field: "theme.variant",
      code: "FEATURE_PREMIUM_THEME_REQUIRED",
      message: "Zaawansowane motywy profilu są dostępne od planu Standard.",
      requiredFeature: "premiumThemes",
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    planInfo,
  };
}

/**
 * Walidacja limitu dodawanych zdjęć profilu przy uploadzie.
 *
 * Użycie:
 * const result = validatePhotoUploadLimit(profile, files.length);
 */
function validatePhotoUploadLimit(profile, newFilesCount = 0, options = {}) {
  const planInfo = getProfilePlanInfo(profile, options);

  const maxPhotos = getProfileLimit(profile, "photos", options);
  const currentPhotos = Array.isArray(profile?.photos) ? profile.photos.length : 0;
  const afterUpload = currentPhotos + Number(newFilesCount || 0);

  if (afterUpload > maxPhotos) {
    return {
      ok: false,
      field: "photos",
      code: "PLAN_LIMIT_PHOTOS",
      message: `Plan ${planInfo.label} pozwala mieć maksymalnie ${maxPhotos} zdjęć profilu.`,
      limit: maxPhotos,
      current: currentPhotos,
      attempted: afterUpload,
      planInfo,
    };
  }

  return {
    ok: true,
    limit: maxPhotos,
    current: currentPhotos,
    attempted: afterUpload,
    planInfo,
  };
}

/**
 * Walidacja limitu galerii konkretnej usługi.
 */
function validateServiceGalleryUploadLimit(
  profile,
  service,
  newFilesCount = 0,
  options = {}
) {
  const planInfo = getProfilePlanInfo(profile, options);

  const maxServiceGallery = getProfileLimit(profile, "serviceGallery", options);
  const currentGallery = Array.isArray(service?.gallery)
    ? service.gallery.length
    : 0;

  const afterUpload = currentGallery + Number(newFilesCount || 0);

  if (afterUpload > maxServiceGallery) {
    return {
      ok: false,
      field: "service.gallery",
      code: "PLAN_LIMIT_SERVICE_GALLERY",
      message: `Plan ${planInfo.label} pozwala mieć maksymalnie ${maxServiceGallery} zdjęć w galerii jednej usługi.`,
      limit: maxServiceGallery,
      current: currentGallery,
      attempted: afterUpload,
      planInfo,
    };
  }

  return {
    ok: true,
    limit: maxServiceGallery,
    current: currentGallery,
    attempted: afterUpload,
    planInfo,
  };
}

/**
 * Pomocnicza funkcja do przycinania danych publicznych według planu.
 *
 * Nie usuwa danych z bazy.
 * Tylko ogranicza to, co możesz pokazać publicznie.
 */
function applyPublicPlanLimits(profile, options = {}) {
  if (!profile) return profile;

  const obj = profile.toObject ? profile.toObject() : { ...profile };

  const maxPhotos = getProfileLimit(obj, "photos", options);
  const maxServices = getProfileLimit(obj, "services", options);
  const maxLinks = getProfileLimit(obj, "links", options);
  const maxQuickAnswers = getProfileLimit(obj, "quickAnswers", options);

  const canUseBooking = canUseFeature(obj, "booking", options);
  const canUseTeam = canUseFeature(obj, "team", options);

  return {
    ...obj,

    photos: Array.isArray(obj.photos) ? obj.photos.slice(0, maxPhotos) : [],

    services: Array.isArray(obj.services)
      ? obj.services.slice(0, maxServices).map((service) => ({
          ...service,
          gallery: Array.isArray(service.gallery)
            ? service.gallery.slice(
                0,
                getProfileLimit(obj, "serviceGallery", options)
              )
            : [],
        }))
      : [],

    links: Array.isArray(obj.links) ? obj.links.slice(0, maxLinks) : [],

    quickAnswers: Array.isArray(obj.quickAnswers)
      ? obj.quickAnswers.slice(0, maxQuickAnswers)
      : [],

    bookingMode: canUseBooking ? obj.bookingMode : "request-open",

    team: canUseTeam
      ? obj.team
      : {
          enabled: false,
          assignmentMode: "user-pick",
        },

    billingPublic: getPublicBilling(obj),
  };
}

/**
 * Pomocnicza odpowiedź błędu do routes.
 */
function sendPlanLimitError(res, validationResult) {
  return res.status(403).json({
    message: "Przekroczono limity obecnego planu.",
    errors: validationResult.errors || [validationResult],
    plan: validationResult.planInfo || null,
  });
}

module.exports = {
  countNonEmptyStrings,
  countQuickAnswers,

  canUseFeature,
  getProfileLimit,
  getProfilePlanInfo,

  requireFeature,

  validateProfilePlanLimits,
  validatePhotoUploadLimit,
  validateServiceGalleryUploadLimit,

  applyPublicPlanLimits,
  sendPlanLimitError,
};