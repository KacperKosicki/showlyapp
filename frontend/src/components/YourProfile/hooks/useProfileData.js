import { useCallback, useState } from "react";
import axios from "axios";

const DEFAULT_QUICK_ANSWERS = [
  { title: "", answer: "" },
  { title: "", answer: "" },
  { title: "", answer: "" },
];

const normalizeServiceForEdit = (service = {}, index = 0) => ({
  _id: service?._id,
  name: service?.name || "",
  shortDescription: service?.shortDescription || "",
  description: service?.description || "",
  category: service?.category || "service",
  image: service?.image || { url: "", publicId: "" },
  gallery: Array.isArray(service?.gallery) ? service.gallery : [],
  price: {
    mode: service?.price?.mode || "contact",
    amount: service?.price?.amount ?? null,
    from: service?.price?.from ?? null,
    to: service?.price?.to ?? null,
    currency: service?.price?.currency || "PLN",
    unitLabel: service?.price?.unitLabel || "",
    note: service?.price?.note || "",
  },
  duration: {
    value: service?.duration?.value ?? "",
    unit: service?.duration?.unit || "minutes",
    label: service?.duration?.label || "",
  },
  booking: {
    enabled: !!service?.booking?.enabled,
    type: service?.booking?.type || "none",
  },
  delivery: {
    mode: service?.delivery?.mode || "none",
    turnaroundText: service?.delivery?.turnaroundText || "",
  },
  tags: Array.isArray(service?.tags) ? service.tags : [],
  featured: !!service?.featured,
  isActive: typeof service?.isActive === "boolean" ? service.isActive : true,
  order: Number.isFinite(Number(service?.order)) ? Number(service.order) : index,
});

const normalizeProfileForEdit = (profile = {}) => {
  const photos = profile.photos || [];

  const normalizedTheme = {
    variant: profile.theme?.variant || "system",
    primary: profile.theme?.primary || "#6f4ef2",
    secondary: profile.theme?.secondary || "#ff4081",
  };

  const normalizedContact = {
    email: profile.contact?.email || "",
    phone: profile.contact?.phone || "",
    street: profile.contact?.street || "",
    postcode: profile.contact?.postcode || "",
    addressFull: profile.contact?.addressFull || "",
  };

  const normalizedSocials = {
    website: profile.socials?.website || "",
    facebook: profile.socials?.facebook || "",
    instagram: profile.socials?.instagram || "",
    youtube: profile.socials?.youtube || "",
    tiktok: profile.socials?.tiktok || "",
  };

  return {
    ...profile,
    services: (profile.services || []).map((service, index) =>
      normalizeServiceForEdit(service, index)
    ),
    photos,
    quickAnswers: profile.quickAnswers || DEFAULT_QUICK_ANSWERS,
    theme: normalizedTheme,
    contact: normalizedContact,
    socials: normalizedSocials,
    bookingMode: profile.bookingMode || "request-open",
    workingHours: profile.workingHours || { from: "08:00", to: "20:00" },
    workingDays: profile.workingDays || [1, 2, 3, 4, 5],
    availabilityOverrides: Array.isArray(profile.availabilityOverrides)
      ? profile.availabilityOverrides.map((item) => ({
        _id: item?._id,
        type: item?.type || "day",
        date: item?.date || "",
        fromTime: item?.fromTime || "",
        toTime: item?.toTime || "",
        reason: item?.reason || "",
      }))
      : [],
    team: profile.team || { enabled: false, assignmentMode: "user-pick" },
    bookingBufferMin: Number.isFinite(Number(profile.bookingBufferMin))
      ? Number(profile.bookingBufferMin)
      : 0,
    autoAcceptReservations: !!profile.autoAcceptReservations,
  };
};

const useProfileData = ({ user, authHeaders, fetchBillingStatus }) => {
  const [profile, setProfile] = useState(null);
  const [editData, setEditData] = useState({});
  const [initialEditData, setInitialEditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user?.uid) return null;

    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/profiles/by-user/${user.uid}`,
        { headers: await authHeaders() }
      );

      const loadedProfile = res.data;
      const now = new Date();
      const until = new Date(loadedProfile.visibleUntil);

      if (until < now) {
        loadedProfile.isVisible = false;
      }

      const normalizedEditData = normalizeProfileForEdit(loadedProfile);

      setProfile(loadedProfile);
      setEditData(normalizedEditData);
      setInitialEditData(normalizedEditData);
      setNotFound(false);

      await fetchBillingStatus();

      return loadedProfile;
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        console.error("Błąd podczas pobierania profilu:", err);
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.uid, authHeaders, fetchBillingStatus]);

  return {
    profile,
    editData,
    setEditData,
    initialEditData,
    loading,
    notFound,
    fetchProfile,
  };
};

export default useProfileData;