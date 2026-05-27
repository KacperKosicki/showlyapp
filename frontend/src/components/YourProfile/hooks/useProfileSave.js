import { useState } from "react";
import axios from "axios";

const EMPTY_SOCIALS = {
  website: "",
  facebook: "",
  instagram: "",
  youtube: "",
  tiktok: "",
};

const useProfileSave = ({
  user,
  editData,
  profile,
  staffEdits,
  setStaffEdits,
  setIsEditing,
  setFormErrors,
  authHeaders,
  uploadPendingImages,
  fetchProfile,
  fetchStaff,
  showAlert,
  validateServiceData,
  normalizeTagsForSave,
  maxDescription,
  maxServices,
  maxLinks,
  maxQuickAnswers,
  canUseBooking,
  canUseTeam,
  canUseAutoAccept,
  canUsePremiumThemes,
  canUseSocialMedia,
  tagsLimit,
  tagMaxLength,
  linkMaxLength,
  socialLinkMaxLength,
  contactEmailMaxLength,
  contactPhoneMaxLength,
  contactStreetMaxLength,
  contactPostcodeMaxLength,
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const validateEditData = (data) => {
    const errors = {};

    if (!data.role?.trim()) {
      errors.role = "Podaj rolę (maks. 40 znaków)";
    } else if (data.role.length > 40) {
      errors.role = "Rola maks. 40 znaków";
    }

    if (!data.location?.trim()) {
      errors.location = "Podaj lokalizację (maks. 30 znaków)";
    } else if (data.location.length > 30) {
      errors.location = "Lokalizacja maks. 30 znaków";
    }

    if (!data.profileType) {
      errors.profileType = "Wybierz typ profilu";
    }

    const nonEmptyTags = (data.tags || [])
      .map((tag) => String(tag || "").trim())
      .filter(Boolean);

    const uniqueTags = new Set(nonEmptyTags.map((tag) => tag.toLowerCase()));

    if (nonEmptyTags.length === 0) {
      errors.tags = "Podaj przynajmniej 1 tag.";
    }

    if (nonEmptyTags.length > tagsLimit) {
      errors.tags = `Możesz dodać maksymalnie ${tagsLimit} tagi.`;
    }

    if (nonEmptyTags.some((tag) => tag.length > tagMaxLength)) {
      errors.tags = `Jeden tag może mieć maksymalnie ${tagMaxLength} znaków.`;
    }

    if (uniqueTags.size !== nonEmptyTags.length) {
      errors.tags = "Tagi nie mogą się powtarzać.";
    }

    if ((data.description || "").length > maxDescription) {
      errors.description = `Opis nie może przekraczać ${maxDescription} znaków w obecnym planie.`;
    }

    if ((data.services || []).length > maxServices) {
      errors.services = `Obecny plan pozwala dodać maksymalnie ${maxServices} usług.`;
    }

    const nonEmptyLinks = (data.links || []).filter(
      (link) => String(link || "").trim() !== ""
    );

    if (nonEmptyLinks.some((link) => link.length > linkMaxLength)) {
      errors.links = `Link może mieć maksymalnie ${linkMaxLength} znaków.`;
    }

    const nonEmptyQuickAnswers = (data.quickAnswers || []).filter(
      (qa) =>
        String(qa?.title || "").trim() ||
        String(qa?.answer || "").trim()
    );

    if (nonEmptyQuickAnswers.length > maxQuickAnswers) {
      errors.quickAnswers = `Obecny plan pozwala dodać maksymalnie ${maxQuickAnswers} szybkich odpowiedzi.`;
    }

    if (!canUseBooking && ["calendar", "request-blocking"].includes(data.bookingMode)) {
      errors.bookingMode = "Kalendarz i blokowanie dni są dostępne tylko w planie Premium.";
    }

    if (!canUseTeam && data.team?.enabled) {
      errors.team = "Zespół i pracownicy są dostępni tylko w planie Premium.";
    }

    if (!canUseAutoAccept && data.autoAcceptReservations) {
      errors.autoAcceptReservations =
        "Automatyczna akceptacja rezerwacji jest dostępna tylko w planie Premium.";
    }

    const priceFrom = Number(data.priceFrom);
    const priceTo = Number(data.priceTo);

    if (!priceFrom || priceFrom < 1 || priceFrom > 100000) {
      errors.priceFrom = "Cena od musi być w zakresie 1–100 000";
    }

    if (!priceTo || priceTo < priceFrom || priceTo > 1000000) {
      errors.priceTo = 'Cena do musi być większa niż "od" i nie większa niż 1 000 000';
    }

    const quickAnswers = data.quickAnswers || [];
    const invalidQA = quickAnswers.some((qa) => {
      const titleLength = qa.title?.trim().length || 0;
      const answerLength = qa.answer?.trim().length || 0;
      const hasTitle = titleLength > 0;
      const hasAnswer = answerLength > 0;

      return (
        (hasTitle && !hasAnswer) ||
        (!hasTitle && hasAnswer) ||
        (hasTitle && titleLength > 10) ||
        (hasAnswer && answerLength > 64)
      );
    });

    if (invalidQA) {
      errors.quickAnswers =
        "Każda szybka odpowiedź musi zawierać oba pola. Tytuł max. 10 znaków, odpowiedź max. 64 znaki.";
    }

    const buf = Number(data.bookingBufferMin ?? 0);

    if (!canUseBooking && buf !== 0) {
      errors.bookingBufferMin =
        "Przerwa między usługami jest dostępna tylko w planie Premium.";
    }

    if (![0, 5, 10, 15].includes(buf)) {
      errors.bookingBufferMin = "Buffer musi mieć wartość: 0, 5, 10 lub 15 minut.";
    }

    const contact = data.contact || {};
    const email = String(contact.email || "").trim();
    const phone = String(contact.phone || "").trim();
    const street = String(contact.street || "").trim();
    const postcode = String(contact.postcode || "").trim();

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.contactEmail = "Nieprawidłowy e-mail";
    }

    if (email && email.length > contactEmailMaxLength) {
      errors.contactEmail = `E-mail max. ${contactEmailMaxLength} znaków`;
    }

    if (phone && phone.length > contactPhoneMaxLength) {
      errors.contactPhone = `Telefon max. ${contactPhoneMaxLength} znaków`;
    }

    if (street && street.length > contactStreetMaxLength) {
      errors.contactStreet = `Ulica max. ${contactStreetMaxLength} znaków`;
    }

    if (postcode && postcode.length > contactPostcodeMaxLength) {
      errors.contactPostcode = `Kod max. ${contactPostcodeMaxLength} znaków`;
    }

    const isUrlish = (value) => {
      if (!value) return true;

      try {
        new URL(value.startsWith("http") ? value : `https://${value}`);
        return true;
      } catch {
        return false;
      }
    };

    const socials = data.socials || {};

    ["website", "facebook", "instagram", "youtube", "tiktok"].forEach((key) => {
      const value = socials[key]?.trim();

      if (value && value.length > socialLinkMaxLength) {
        errors[`social_${key}`] = `Link max. ${socialLinkMaxLength} znaków`;
      }

      if (value && !isUrlish(value)) {
        errors[`social_${key}`] = "Nieprawidłowy link";
      }
    });

    const serviceValidationError = (data.services || [])
      .map((service) => validateServiceData(service))
      .find(Boolean);

    if (serviceValidationError) {
      errors.services = serviceValidationError;
    }

    return errors;
  };

  const handleSaveChanges = async () => {
    if (isSaving) return;

    const errors = validateEditData(editData);

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      showAlert("Uzupełnij poprawnie wszystkie wymagane pola.", "warning");
      return;
    }

    setIsSaving(true);

    try {
      const { photoHashes, ...payload } = editData;

      const themeDraft = payload.theme || {};
      const mappedTheme = {
        variant: themeDraft.variant || "system",
        primary: themeDraft.primary || "#6f4ef2",
        secondary: themeDraft.secondary || "#ff4081",
      };

      const currentTheme = profile?.theme || {};

      const safeTheme = canUsePremiumThemes
        ? mappedTheme
        : {
            variant: currentTheme.variant || "system",
            primary: currentTheme.primary || "#6f4ef2",
            secondary: currentTheme.secondary || "#ff4081",
          };

      const contact = payload.contact || {};

      const builtAddressFull = [payload.location, contact.postcode, contact.street]
        .filter(Boolean)
        .join(", ")
        .trim();

      const safeBookingMode = canUseBooking
        ? payload.bookingMode || "request-open"
        : "request-open";

      const safeTeam = canUseTeam
        ? payload.team || { enabled: false, assignmentMode: "user-pick" }
        : { enabled: false, assignmentMode: "user-pick" };

      const safeAutoAcceptReservations = canUseAutoAccept
        ? !!payload.autoAcceptReservations
        : false;

      const safeServices = (payload.services || []).slice(0, maxServices);
      const safeLinks = (payload.links || []).slice(0, maxLinks);

      const safeQuickAnswers = (payload.quickAnswers || [])
        .filter((qa) => qa.title?.trim() || qa.answer?.trim())
        .slice(0, maxQuickAnswers);

      await axios.patch(
        `${process.env.REACT_APP_API_URL}/api/profiles/update/${user.uid}`,
        {
          ...payload,
          services: safeServices,
          links: safeLinks,
          bookingMode: safeBookingMode,
          bookingBufferMin: canUseBooking
            ? Number(payload.bookingBufferMin ?? 0)
            : 0,
          autoAcceptReservations: safeAutoAcceptReservations,
          theme: safeTheme,
          contact: {
            email: contact.email || "",
            phone: contact.phone || "",
            street: contact.street || "",
            postcode: contact.postcode || "",
            addressFull: builtAddressFull,
          },
          socials: canUseSocialMedia
            ? payload.socials || EMPTY_SOCIALS
            : EMPTY_SOCIALS,
          showAvailableDates: !!payload.showAvailableDates,
          tags: normalizeTagsForSave(payload.tags),
          quickAnswers: safeQuickAnswers,
          team: safeTeam,
        },
        {
          headers: await authHeaders({
            "Content-Type": "application/json",
          }),
        }
      );

      await uploadPendingImages();

      const staffUpdateEntries = Object.entries(staffEdits);

      if (staffUpdateEntries.length) {
        await Promise.all(
          staffUpdateEntries.map(async ([id, changes]) =>
            axios.patch(
              `${process.env.REACT_APP_API_URL}/api/staff/${id}`,
              changes,
              {
                headers: await authHeaders({
                  "Content-Type": "application/json",
                }),
              }
            )
          )
        );
      }

      const refreshedProfile = await fetchProfile();

      if (refreshedProfile?._id && fetchStaff) {
        await fetchStaff(refreshedProfile._id);
      }

      setStaffEdits({});
      setIsEditing(false);
      setFormErrors({});
      showAlert("Zapisano zmiany w profilu.", "success");
    } catch (err) {
      console.error("❌ Błąd zapisu profilu/pracowników:", err);
      console.log("AUTH ERR:", err?.response?.status, err?.response?.data);
      showAlert("Wystąpił błąd podczas zapisywania.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isSaving,
    handleSaveChanges,
  };
};

export default useProfileSave;