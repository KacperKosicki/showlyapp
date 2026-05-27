// YourProfile.jsx
import { useEffect, useState, useRef } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { createPortal } from "react-dom";
import { auth } from "../../firebase"; // dopasuj ścieżkę
import axios from 'axios';
import styles from './YourProfile.module.scss';
import LoadingButton from '../ui/LoadingButton/LoadingButton';
import {
  FaMapMarkerAlt,
  FaTags,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaStar,
  FaUserTie,
  FaLink,
  FaIdBadge,
  FaBriefcase,
  FaTools,
  FaUsers,
  FaTrash,
  FaPlus,
  FaTimes,
  FaEnvelope,
  FaPhone,
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaGlobe,
  FaTiktok,
  FaClock,
} from 'react-icons/fa';
import AlertBox from "../AlertBox/AlertBox";
import {
  getBillingStatus,
  startSubscriptionCheckout,
  openBillingPortal,
  startExtensionCheckout,
} from "../../api/billingApi";
import {
  TAGS_LIMIT,
  TAG_MAX_LENGTH,
  LINK_MAX_LENGTH,
  SOCIAL_LINK_MAX_LENGTH,
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_PHONE_MAX_LENGTH,
  CONTACT_STREET_MAX_LENGTH,
  CONTACT_POSTCODE_MAX_LENGTH,
  SERVICE_NAME_MAX_LENGTH,
  SERVICE_SHORT_DESCRIPTION_MAX_LENGTH,
  SERVICE_PRICE_MAX,
  SERVICE_DURATION_LIMITS,
} from "../constants/validationLimits";

const YourProfile = ({ user, setRefreshTrigger }) => {
  // =========================
  // Lokalne stany
  // =========================

  const [newService, setNewService] = useState({
    name: '',
    shortDescription: '',
    category: 'service',
    priceMode: 'contact',
    priceValue: '',
    priceFrom: '',
    priceTo: '',
    durationValue: '',
    durationUnit: 'minutes',
    isActive: true,
    featured: false,
  });

  const DEFAULT_LIMITS = {
    photos: 3,
    services: 3,
    serviceGallery: 2,
    links: 1,
    quickAnswers: 1,
    descriptionLength: 200,
  };

  const [profile, setProfile] = useState(null);
  const [editData, setEditData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [newAvailableDate, setNewAvailableDate] = useState({ date: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [alert, setAlert] = useState(null);
  const [initialEditData, setInitialEditData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);
  const [deletingStaffIds, setDeletingStaffIds] = useState([]); // lista id w trakcie usuwania
  const [billingStatus, setBillingStatus] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingActionLoading, setBillingActionLoading] = useState("");

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [serviceImageUploadingIds, setServiceImageUploadingIds] = useState([]);

  const [newPhotoFiles, setNewPhotoFiles] = useState([]); // File[]
  const [newPhotoPreviews, setNewPhotoPreviews] = useState([]); // string[] blob
  const [newPhotoHashes, setNewPhotoHashes] = useState([]); // string[] SHA-256
  const [photosUploading, setPhotosUploading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // --- PODGLĄD ZDJĘĆ ---
  const [fullscreenImage, setFullscreenImage] = useState(null);

  const openLightbox = (src) => setFullscreenImage(src);
  const closeLightbox = () => setFullscreenImage(null);

  // --- PRACOWNICY ---
  const [staff, setStaff] = useState([]); // [{_id, name, active, capacity, serviceIds: []}]
  const [staffLoading, setStaffLoading] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    capacity: 1,
    active: true,
    serviceIds: []
  });
  const [staffEdits, setStaffEdits] = useState({}); // {staffId: {name, capacity, active, serviceIds}}

  const fileInputRef = useRef(null);
  const location = useLocation();
  const addPhotoInputRef = useRef(null);
  const alertTimeoutRef = useRef(null);
  const DEFAULT_AVATAR = '/images/other/no-image.png';

  // =========================
  // Utils
  // =========================
  const authHeaders = async (extra = {}) => {
    const firebaseUser = auth.currentUser;

    const uid = firebaseUser?.uid || user?.uid || "";
    let token = "";

    try {
      token = firebaseUser?.getIdToken ? await firebaseUser.getIdToken() : "";
    } catch {
      token = "";
    }

    return {
      ...(uid ? { uid } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    };
  };

  const getDurationLimitText = (unit) => {
    const limit = SERVICE_DURATION_LIMITS[unit];

    if (!limit) return '';

    return `${limit.min}–${limit.max} ${limit.label}`;
  };

  const fetchBillingStatus = async () => {
    try {
      setBillingLoading(true);
      const data = await getBillingStatus();
      setBillingStatus(data);
    } catch (err) {
      console.error("❌ billing status error:", err);
      setBillingStatus(null);
    } finally {
      setBillingLoading(false);
    }
  };

  const showAlert = (message, type = 'info') => {
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }

    setAlert({ message, type });

    alertTimeoutRef.current = setTimeout(() => {
      setAlert(null);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const scrollTo = location.state?.scrollToId || 'profileWrapper';
    if (loading) return;

    const tryScroll = () => {
      const el = document.getElementById(scrollTo) || document.getElementById('scrollToId');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState({}, document.title, location.pathname);
      } else {
        requestAnimationFrame(tryScroll);
      }
    };

    requestAnimationFrame(tryScroll);
  }, [location.state, loading, location.pathname]);


  // =========================
  // Pobieranie profilu
  // =========================
  const fetchProfile = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/profiles/by-user/${user.uid}`,
        { headers: await authHeaders() }
      );
      const p = res.data;
      const now = new Date();
      const until = new Date(p.visibleUntil);
      if (until < now) p.isVisible = false;

      setProfile(p);
      await fetchBillingStatus();

      const photos = p.photos || [];

      const normalizedTheme = {
        variant: p.theme?.variant || 'system',
        primary: p.theme?.primary || '#6f4ef2',
        secondary: p.theme?.secondary || '#ff4081',
      };

      const normalizedContact = {
        email: p.contact?.email || '',
        phone: p.contact?.phone || '',
        street: p.contact?.street || '',
        postcode: p.contact?.postcode || '',
        addressFull: p.contact?.addressFull || '', // zostaw dla kompatybilności
      };

      const normalizedSocials = {
        website: p.socials?.website || '',
        facebook: p.socials?.facebook || '',
        instagram: p.socials?.instagram || '',
        youtube: p.socials?.youtube || '',
        tiktok: p.socials?.tiktok || '',
      };

      setEditData({
        ...p,
        services: (p.services || []).map((s, index) => normalizeServiceForEdit(s, index)),
        photos,
        quickAnswers: p.quickAnswers || [
          { title: '', answer: '' }, { title: '', answer: '' }, { title: '', answer: '' }
        ],
        theme: normalizedTheme, // ✅ TU
        contact: normalizedContact,
        socials: normalizedSocials,

        bookingMode: p.bookingMode || 'request-open',
        workingHours: p.workingHours || { from: '08:00', to: '20:00' },
        workingDays: p.workingDays || [1, 2, 3, 4, 5],
        team: p.team || { enabled: false, assignmentMode: 'user-pick' },
        bookingBufferMin: Number.isFinite(Number(p.bookingBufferMin)) ? Number(p.bookingBufferMin) : 0,
        autoAcceptReservations: !!p.autoAcceptReservations,
      });

      setInitialEditData({
        ...p,
        services: (p.services || []).map((s, index) => normalizeServiceForEdit(s, index)),
        photos,
        quickAnswers: p.quickAnswers || [{ title: '', answer: '' }, { title: '', answer: '' }, { title: '', answer: '' }],
        theme: normalizedTheme,
        contact: normalizedContact,
        socials: normalizedSocials,

        bookingMode: p.bookingMode || 'request-open',
        workingHours: p.workingHours || { from: '08:00', to: '20:00' },
        workingDays: p.workingDays || [1, 2, 3, 4, 5],
        team: p.team || { enabled: false, assignmentMode: 'user-pick' },
        bookingBufferMin: Number.isFinite(Number(p.bookingBufferMin)) ? Number(p.bookingBufferMin) : 0,
        autoAcceptReservations: !!p.autoAcceptReservations,
      });

      // Po profilu dociągnij pracowników
      await fetchStaff(p._id);
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
      else console.error('Błąd podczas pobierania profilu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.uid) return;

    // ✅ jeśli wracamy z billing success/cancel → wymuś odświeżenie
    const cameFromBilling = !!location.state?.refresh;

    fetchProfile();

    if (cameFromBilling) {
      // sprzątnij state, żeby nie odświeżało w kółko po back/refresh
      window.history.replaceState({}, document.title, location.pathname);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, location.state?.refresh]);

  // =========================
  // Staff: API
  // =========================
  const fetchStaff = async (profileId) => {
    if (!profileId) return;
    try {
      setStaffLoading(true);
      // API: GET /api/staff?profileId=...
      const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/api/staff`, {
        params: { profileId },
        headers: await authHeaders(),
      });
      setStaff(data || []);
    } catch (e) {
      console.error('Nie udało się pobrać pracowników', e);
      showAlert('Nie udało się pobrać pracowników.', 'error');
    } finally {
      setStaffLoading(false);
    }
  };

  const createStaff = async () => {
    if (isCreatingStaff) return;
    if (!profile?._id) return;

    if (!canUseTeam) {
      showAlert('Zespół i pracownicy są dostępni tylko w planie Premium.', 'warning');
      return;
    }

    if (!newStaff.name.trim()) {
      showAlert('Podaj imię pracownika.', 'warning');
      return;
    }

    setIsCreatingStaff(true);
    try {
      const payload = {
        profileId: profile._id,
        name: newStaff.name.trim(),
        capacity: Number(newStaff.capacity) || 1,
        active: !!newStaff.active,
        serviceIds: newStaff.serviceIds || []
      };

      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/staff`,
        payload,
        { headers: await authHeaders({ "Content-Type": "application/json" }) }
      );

      setNewStaff({ name: '', capacity: 1, active: true, serviceIds: [] });
      await fetchStaff(profile._id);

      showAlert('Dodano pracownika.', 'success');
    } catch (e) {
      console.error('Błąd dodawania pracownika', e);
      showAlert('Błąd dodawania pracownika.', 'error');
    } finally {
      setIsCreatingStaff(false);
    }
  };

  const deleteStaff = async (id) => {
    if (deletingStaffIds.includes(id)) return;

    // loader tylko dla tego jednego elementu
    setDeletingStaffIds(prev => [...prev, id]);

    // optymistycznie usuń z listy od razu
    setStaff(prev => prev.filter(s => s._id !== id));

    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/staff/${id}`,
        { headers: await authHeaders() }
      );
      showAlert('Usunięto pracownika.', 'success');
    } catch (e) {
      console.error('Błąd usuwania pracownika', e);
      await fetchStaff(profile._id);
      showAlert('Błąd usuwania pracownika.', 'error');
    } finally {
      setDeletingStaffIds(prev => prev.filter(x => x !== id));
    }
  };

  // =========================
  // Helpers: obrazy, hash
  // =========================
  const hashString = async (str) => {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const hashFile = async (file) => {
    const buf = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const getAvatarUrl = (p) => {
    if (!p) return DEFAULT_AVATAR;

    // tryb edycji: jeśli jest blob preview → pokazuj blob
    if (isEditing && avatarPreview) return avatarPreview;

    // nowy format
    if (p.avatar?.url) return p.avatar.url;

    // stary format (gdyby kiedyś był string)
    if (typeof p.avatar === "string" && p.avatar) return p.avatar;

    return DEFAULT_AVATAR;
  };

  const getPhotoUrl = (photo) => {
    if (!photo) return "";
    if (typeof photo === "string") return photo;         // stary format
    if (photo.url) return photo.url;                     // nowy format
    return "";
  };

  const getServiceImageUrl = (service) => {
    if (!service) return '';
    if (typeof service.image === 'string') return service.image;
    if (service.image?.url) return service.image.url;
    return '';
  };

  const markServiceImageUploading = (serviceId, add = true) => {
    setServiceImageUploadingIds((prev) =>
      add ? [...new Set([...prev, serviceId])] : prev.filter((id) => id !== serviceId)
    );
  };

  const uploadServiceImage = async (serviceId, file) => {
    if (!serviceId || !file) return;

    const fd = new FormData();
    fd.append('file', file);

    await axios.post(
      `${process.env.REACT_APP_API_URL}/api/profiles/${user.uid}/services/${serviceId}/image`,
      fd,
      { headers: await authHeaders({ 'Content-Type': 'multipart/form-data' }) }
    );
  };

  const removeServiceImage = async (serviceId) => {
    if (!serviceId) return;

    await axios.delete(
      `${process.env.REACT_APP_API_URL}/api/profiles/${user.uid}/services/${serviceId}/image`,
      { headers: await authHeaders() }
    );
  };

  // =========================
  // Handlery obrazów
  // =========================
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showAlert("Nieprawidłowy format. Wybierz obraz.", "warning");
      e.target.value = "";
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showAlert("Zdjęcie jest za duże (maks. 3MB).", "warning");
      e.target.value = "";
      return;
    }

    // sprzątanie poprzedniego blob
    if (avatarPreview) {
      try { URL.revokeObjectURL(avatarPreview); } catch { }
    }

    const blobUrl = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreview(blobUrl);

    e.target.value = "";
  };

  const handleRemoveAvatar = async () => {
    try {
      setAvatarUploading(true);

      // usuń blob preview
      if (avatarPreview) {
        try { URL.revokeObjectURL(avatarPreview); } catch { }
      }
      setAvatarPreview("");
      setAvatarFile(null);

      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/profiles/${user.uid}/avatar`,
        { headers: await authHeaders() }
      );
      await fetchProfile();
      setRefreshTrigger(Date.now());
      showAlert("Usunięto avatar.", "success");
    } catch (e) {
      console.error(e);
      showAlert("Nie udało się usunąć avatara.", "error");
    } finally {
      setAvatarUploading(false);
    }
  };

  // =========================
  // Walidacje / zapis profilu
  // =========================
  const validateEditData = (data) => {
    const errors = {};

    if (!data.role?.trim()) errors.role = 'Podaj rolę (maks. 40 znaków)';
    else if (data.role.length > 40) errors.role = 'Rola maks. 40 znaków';

    if (!data.location?.trim()) errors.location = 'Podaj lokalizację (maks. 30 znaków)';
    else if (data.location.length > 30) errors.location = 'Lokalizacja maks. 30 znaków';

    if (!data.profileType) errors.profileType = 'Wybierz typ profilu';

    const nonEmptyTags = (data.tags || [])
      .map((tag) => String(tag || "").trim())
      .filter(Boolean);

    const uniqueTags = new Set(nonEmptyTags.map((tag) => tag.toLowerCase()));

    if (nonEmptyTags.length === 0) {
      errors.tags = "Podaj przynajmniej 1 tag.";
    }

    if (nonEmptyTags.length > TAGS_LIMIT) {
      errors.tags = `Możesz dodać maksymalnie ${TAGS_LIMIT} tagi.`;
    }

    if (nonEmptyTags.some((tag) => tag.length > TAG_MAX_LENGTH)) {
      errors.tags = `Jeden tag może mieć maksymalnie ${TAG_MAX_LENGTH} znaków.`;
    }

    if (uniqueTags.size !== nonEmptyTags.length) {
      errors.tags = "Tagi nie mogą się powtarzać.";
    }

    if ((data.description || '').length > MAX_DESCRIPTION) {
      errors.description = `Opis nie może przekraczać ${MAX_DESCRIPTION} znaków w obecnym planie.`;
    }

    if ((data.services || []).length > MAX_SERVICES) {
      errors.services = `Obecny plan pozwala dodać maksymalnie ${MAX_SERVICES} usług.`;
    }

    const nonEmptyLinks = (data.links || []).filter((link) => String(link || '').trim() !== '');
    if (nonEmptyLinks.some((link) => link.length > LINK_MAX_LENGTH)) {
      errors.links = `Link może mieć maksymalnie ${LINK_MAX_LENGTH} znaków.`;
    }

    const nonEmptyQuickAnswers = (data.quickAnswers || []).filter(
      (qa) => String(qa?.title || '').trim() || String(qa?.answer || '').trim()
    );
    if (nonEmptyQuickAnswers.length > MAX_QUICK_ANSWERS) {
      errors.quickAnswers = `Obecny plan pozwala dodać maksymalnie ${MAX_QUICK_ANSWERS} szybkich odpowiedzi.`;
    }

    if (!canUseBooking && ['calendar', 'request-blocking'].includes(data.bookingMode)) {
      errors.bookingMode = 'Kalendarz i blokowanie dni są dostępne tylko w planie Premium.';
    }

    if (!canUseTeam && data.team?.enabled) {
      errors.team = 'Zespół i pracownicy są dostępni tylko w planie Premium.';
    }

    if (!canUseAutoAccept && data.autoAcceptReservations) {
      errors.autoAcceptReservations =
        'Automatyczna akceptacja rezerwacji jest dostępna tylko w planie Premium.';
    }

    const priceFrom = Number(data.priceFrom);
    const priceTo = Number(data.priceTo);
    if (!priceFrom || priceFrom < 1 || priceFrom > 100000) errors.priceFrom = 'Cena od musi być w zakresie 1–100 000';
    if (!priceTo || priceTo < priceFrom || priceTo > 1000000) errors.priceTo = 'Cena do musi być większa niż "od" i nie większa niż 1 000 000';

    const quickAnswers = data.quickAnswers || [];
    const invalidQA = quickAnswers.some(qa => {
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
      errors.quickAnswers = 'Każda szybka odpowiedź musi zawierać oba pola. Tytuł max. 10 znaków, odpowiedź max. 64 znaki.';
    }

    const buf = Number(data.bookingBufferMin ?? 0);

    if (!canUseBooking && buf !== 0) {
      errors.bookingBufferMin = 'Przerwa między usługami jest dostępna tylko w planie Premium.';
    }

    if (![0, 5, 10, 15].includes(buf)) {
      errors.bookingBufferMin = 'Buffer musi mieć wartość: 0, 5, 10 lub 15 minut.';
    }

    // Kontakt
    const contact = data.contact || {};

    const email = String(contact.email || "").trim();
    const phone = String(contact.phone || "").trim();
    const street = String(contact.street || "").trim();
    const postcode = String(contact.postcode || "").trim();

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.contactEmail = "Nieprawidłowy e-mail";
    }

    if (email && email.length > CONTACT_EMAIL_MAX_LENGTH) {
      errors.contactEmail = `E-mail max. ${CONTACT_EMAIL_MAX_LENGTH} znaków`;
    }

    if (phone && phone.length > CONTACT_PHONE_MAX_LENGTH) {
      errors.contactPhone = `Telefon max. ${CONTACT_PHONE_MAX_LENGTH} znaków`;
    }

    if (street && street.length > CONTACT_STREET_MAX_LENGTH) {
      errors.contactStreet = `Ulica max. ${CONTACT_STREET_MAX_LENGTH} znaków`;
    }

    if (postcode && postcode.length > CONTACT_POSTCODE_MAX_LENGTH) {
      errors.contactPostcode = `Kod max. ${CONTACT_POSTCODE_MAX_LENGTH} znaków`;
    }

    // Social linki (opcjonalnie lekko pilnujemy URL)
    const isUrlish = (v) => {
      if (!v) return true;
      try { new URL(v.startsWith('http') ? v : `https://${v}`); return true; } catch { return false; }
    };

    const socials = data.socials || {};
    ["website", "facebook", "instagram", "youtube", "tiktok"].forEach((k) => {
      const v = socials[k]?.trim();

      if (v && v.length > SOCIAL_LINK_MAX_LENGTH) {
        errors[`social_${k}`] = `Link max. ${SOCIAL_LINK_MAX_LENGTH} znaków`;
      }

      if (v && !isUrlish(v)) {
        errors[`social_${k}`] = "Nieprawidłowy link";
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

  const openAddPhotoPicker = () => {
    const current = (editData.photos || []).length;
    const pending = newPhotoFiles.length;
    if (current + pending >= MAX_PHOTOS) {
      showAlert(`Można dodać maksymalnie ${MAX_PHOTOS} zdjęć.`, "warning");
      return;
    }
    addPhotoInputRef.current?.click();
  };

  const handleAddPhotosSelect = async (e) => {
    const filesAll = Array.from(e.target.files || []);
    if (!filesAll.length) return;

    const current = (editData.photos || []).length;
    const pending = newPhotoFiles.length;
    const slotsLeft = Math.max(0, MAX_PHOTOS - (current + pending));
    const files = filesAll.slice(0, slotsLeft);

    // ✅ set hashy które już mamy w pending
    const existingPending = new Set(newPhotoHashes);

    // (opcjonalnie) lekka deduplikacja po "podpisie" pliku w ramach aktualnie wybranych + pending
    const existingSignatures = new Set(
      newPhotoFiles.map((f) => `${f.name}|${f.size}|${f.lastModified}`)
    );

    const okFiles = [];
    const okPreviews = [];
    const okHashes = [];

    let skippedDup = 0;

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        showAlert("Pominięto plik: nie jest obrazem.", "warning");
        continue;
      }
      if (file.size > 3 * 1024 * 1024) {
        showAlert("Pominięto plik > 3MB.", "warning");
        continue;
      }

      // szybki podpis (czasem wystarczy)
      const sig = `${file.name}|${file.size}|${file.lastModified}`;
      if (existingSignatures.has(sig)) {
        skippedDup++;
        continue;
      }

      // ✅ twarda deduplikacja po hash
      const h = await hashFile(file);
      if (existingPending.has(h)) {
        skippedDup++;
        continue;
      }

      existingSignatures.add(sig);
      existingPending.add(h);

      okFiles.push(file);
      okHashes.push(h);
      okPreviews.push(URL.createObjectURL(file));
    }

    if (!okFiles.length) {
      if (skippedDup) showAlert("Duplikaty zostały pominięte.", "info");
      e.target.value = "";
      return;
    }

    setNewPhotoFiles((prev) => [...prev, ...okFiles]);
    setNewPhotoHashes((prev) => [...prev, ...okHashes]);
    setNewPhotoPreviews((prev) => [...prev, ...okPreviews]);

    if (skippedDup) showAlert("Część plików była duplikatami — pominięto.", "info");

    e.target.value = "";
  };

  const removePendingPhoto = (idx) => {
    setNewPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewPhotoHashes((prev) => prev.filter((_, i) => i !== idx));
    setNewPhotoPreviews((prev) => {
      const url = prev[idx];
      if (url) { try { URL.revokeObjectURL(url); } catch { } }
      return prev.filter((_, i) => i !== idx);
    });
  };

  const removeSavedPhoto = async (photo) => {
    const photoKey =
      typeof photo === "string"
        ? photo
        : photo?.publicId || photo?.url || "";

    if (!photoKey) {
      showAlert("Nie można usunąć tego zdjęcia.", "warning");
      return;
    }

    try {
      setPhotosUploading(true);

      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/profiles/${user.uid}/photos/${encodeURIComponent(photoKey)}`,
        {
          headers: await authHeaders(),
        }
      );

      await fetchProfile();
      setRefreshTrigger(Date.now());
      showAlert("Usunięto zdjęcie.", "success");
    } catch (e) {
      console.error(e);

      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        "Nie udało się usunąć zdjęcia.";

      showAlert(msg, "error");
    } finally {
      setPhotosUploading(false);
    }
  };

  const handleReplaceSavedPhoto = async (e, photo) => {
    const file = e.target.files?.[0];
    const publicId = typeof photo === "string" ? "" : photo?.publicId;

    if (!file) return;

    if (!publicId) {
      showAlert(
        "Nie można zamienić tego zdjęcia, bo brakuje publicId.",
        "warning"
      );
      e.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      showAlert("Nieprawidłowy format. Wybierz obraz.", "warning");
      e.target.value = "";
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      showAlert("Zdjęcie jest za duże (maks. 3MB).", "warning");
      e.target.value = "";
      return;
    }

    try {
      setPhotosUploading(true);

      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/profiles/${user.uid}/photos/${encodeURIComponent(publicId)}`,
        {
          headers: await authHeaders(),
        }
      );

      const fd = new FormData();
      fd.append("files", file);

      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/profiles/${user.uid}/photos`,
        fd,
        {
          headers: await authHeaders({
            "Content-Type": "multipart/form-data",
          }),
        }
      );

      await fetchProfile();
      setRefreshTrigger(Date.now());
      showAlert("Zamieniono zdjęcie.", "success");
    } catch (err) {
      console.error(err);
      showAlert("Nie udało się zamienić zdjęcia.", "error");
    } finally {
      setPhotosUploading(false);
      e.target.value = "";
    }
  };

  const handleServiceImageChange = async (e, serviceId) => {
    const file = e.target.files?.[0];
    if (!file || !serviceId) return;

    if (!file.type.startsWith('image/')) {
      showAlert('Nieprawidłowy format. Wybierz obraz.', 'warning');
      e.target.value = '';
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      showAlert('Zdjęcie usługi jest za duże (maks. 3MB).', 'warning');
      e.target.value = '';
      return;
    }

    try {
      markServiceImageUploading(serviceId, true);
      await uploadServiceImage(serviceId, file);
      await fetchProfile();
      setRefreshTrigger(Date.now());
      showAlert('Zdjęcie usługi zapisane.', 'success');
    } catch (err) {
      console.error(err);
      showAlert('Nie udało się zapisać zdjęcia usługi.', 'error');
    } finally {
      markServiceImageUploading(serviceId, false);
      e.target.value = '';
    }
  };

  const handleRemoveServiceImage = async (serviceId) => {
    if (!serviceId) return;

    try {
      markServiceImageUploading(serviceId, true);
      await removeServiceImage(serviceId);
      await fetchProfile();
      setRefreshTrigger(Date.now());
      showAlert('Usunięto zdjęcie usługi.', 'success');
    } catch (err) {
      console.error(err);
      showAlert('Nie udało się usunąć zdjęcia usługi.', 'error');
    } finally {
      markServiceImageUploading(serviceId, false);
    }
  };

  const handleExtendVisibility = async () => {
    if (isExtending) return;

    setIsExtending(true);
    try {
      const data = await startExtensionCheckout();

      if (!data?.url) {
        showAlert("Nie udało się rozpocząć płatności (brak URL).", "error");
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Nie udało się rozpocząć płatności.";

      console.error("❌ checkout-extension:", err);
      showAlert(msg, "error");
    } finally {
      setIsExtending(false);
    }
  };

  const handleStartSubscription = async (plan) => {
    if (billingActionLoading) return;

    try {
      setBillingActionLoading(plan);

      const data = await startSubscriptionCheckout(plan);

      if (!data?.url) {
        showAlert("Nie udało się utworzyć płatności za plan.", "error");
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Nie udało się rozpocząć płatności za plan.";

      console.error("❌ checkout-subscription:", err);
      showAlert(msg, "error");
    } finally {
      setBillingActionLoading("");
    }
  };

  const handleOpenBillingPortal = async () => {
    if (billingActionLoading) return;

    try {
      setBillingActionLoading("portal");

      const data = await openBillingPortal();

      if (!data?.url) {
        showAlert("Nie udało się otworzyć panelu subskrypcji.", "error");
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Nie udało się otworzyć zarządzania subskrypcją.";

      console.error("❌ billing portal:", err);
      showAlert(msg, "error");
    } finally {
      setBillingActionLoading("");
    }
  };

  const handleSaveChanges = async () => {
    if (isSaving) return; // ✅ blokada podwójnego kliknięcia

    const errors = validateEditData(editData);

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      showAlert("Uzupełnij poprawnie wszystkie wymagane pola.", "warning");
      return;
    }

    setIsSaving(true); // ✅ start loadera

    try {
      const { photoHashes, ...payload } = editData;

      const t = payload.theme || {};
      const mappedTheme = {
        variant: t.variant || "system",
        primary: t.primary || "#6f4ef2",
        secondary: t.secondary || "#ff4081",
      };

      const currentTheme = profile?.theme || {};
      const safeTheme = canUsePremiumThemes
        ? mappedTheme
        : {
          variant: currentTheme.variant || "system",
          primary: currentTheme.primary || "#6f4ef2",
          secondary: currentTheme.secondary || "#ff4081",
        };

      // 1) Zapis profilu
      const c = payload.contact || {};
      const builtAddressFull = [payload.location, c.postcode, c.street].filter(Boolean).join(", ").trim();

      const safeBookingMode = canUseBooking
        ? payload.bookingMode || 'request-open'
        : 'request-open';

      const safeTeam = canUseTeam
        ? payload.team || { enabled: false, assignmentMode: 'user-pick' }
        : { enabled: false, assignmentMode: 'user-pick' };

      const safeAutoAcceptReservations = canUseAutoAccept
        ? !!payload.autoAcceptReservations
        : false;

      const safeServices = (payload.services || []).slice(0, MAX_SERVICES);
      const safeLinks = (payload.links || []).slice(0, MAX_LINKS);
      const safeQuickAnswers = (payload.quickAnswers || []).filter(
        (qa) => qa.title?.trim() || qa.answer?.trim()
      ).slice(0, MAX_QUICK_ANSWERS);

      await axios.patch(
        `${process.env.REACT_APP_API_URL}/api/profiles/update/${user.uid}`,
        {
          ...payload,
          services: safeServices,
          links: safeLinks,
          bookingMode: safeBookingMode,
          bookingBufferMin: canUseBooking ? Number(payload.bookingBufferMin ?? 0) : 0,
          autoAcceptReservations: safeAutoAcceptReservations,
          theme: safeTheme,
          contact: {
            email: c.email || "",
            phone: c.phone || "",
            street: c.street || "",
            postcode: c.postcode || "",
            addressFull: builtAddressFull,
          },
          socials: canUseSocialMedia
            ? payload.socials || {
              website: "",
              facebook: "",
              instagram: "",
              youtube: "",
              tiktok: "",
            }
            : {
              website: "",
              facebook: "",
              instagram: "",
              youtube: "",
              tiktok: "",
            },
          showAvailableDates: !!payload.showAvailableDates,
          tags: normalizeTagsForSave(payload.tags),
          quickAnswers: safeQuickAnswers,
          team: safeTeam,
        },
        {
          headers: await authHeaders({ "Content-Type": "application/json" }),
        }
      );

      // 2) avatar upload (jeśli wybrano nowy)
      if (avatarFile) {
        setAvatarUploading(true);
        const fd = new FormData();
        fd.append("file", avatarFile);

        await axios.post(
          `${process.env.REACT_APP_API_URL}/api/profiles/${user.uid}/avatar`,
          fd,
          { headers: await authHeaders({ "Content-Type": "multipart/form-data" }) }
        );

        setAvatarUploading(false);

        // sprzątanie blob
        if (avatarPreview) {
          try {
            URL.revokeObjectURL(avatarPreview);
          } catch { }
        }
        setAvatarPreview("");
        setAvatarFile(null);
      }

      // 3) galeria upload (jeśli są pending)
      if (newPhotoFiles.length) {
        setPhotosUploading(true);

        const fd = new FormData();
        newPhotoFiles.forEach((f) => fd.append("files", f));

        await axios.post(
          `${process.env.REACT_APP_API_URL}/api/profiles/${user.uid}/photos`,
          fd,
          { headers: await authHeaders({ "Content-Type": "multipart/form-data" }) }
        );

        // sprzątanie preview blobów
        newPhotoPreviews.forEach((u) => {
          try {
            URL.revokeObjectURL(u);
          } catch { }
        });
        setNewPhotoFiles([]);
        setNewPhotoPreviews([]);
        setNewPhotoHashes([]);
        setPhotosUploading(false);
      }

      // 4) Zbiorczy zapis pracowników (tylko zmienione)
      const staffUpdateEntries = Object.entries(staffEdits);
      if (staffUpdateEntries.length) {
        await Promise.all(
          staffUpdateEntries.map(async ([id, changes]) =>
            axios.patch(
              `${process.env.REACT_APP_API_URL}/api/staff/${id}`,
              changes,
              { headers: await authHeaders({ "Content-Type": "application/json" }) }
            )
          )
        );
      }

      // 5) Odśwież + sprzątnij
      await fetchProfile();
      setStaffEdits({});
      setIsEditing(false);
      setFormErrors({});
      showAlert("Zapisano zmiany w profilu.", "success");
    } catch (err) {
      console.error("❌ Błąd zapisu profilu/pracowników:", err);
      console.log("AUTH ERR:", err?.response?.status, err?.response?.data); // 🔍 mega pomocne
      showAlert("Wystąpił błąd podczas zapisywania.", "error");
    } finally {
      setIsSaving(false); // ✅ stop loadera zawsze
    }
  };

  // =========================
  // Misc helpers
  // =========================
  const mapUnit = (unit) => {
    switch (unit) {
      case 'minutes': return 'min';
      case 'hours': return 'h';
      case 'days': return 'dni';
      default: return '';
    }
  };

  const mapServiceCategory = (cat) => {
    switch (cat) {
      case 'service':
        return 'Usługa';
      case 'product':
        return 'Produkt';
      case 'project':
        return 'Projekt';
      case 'artwork':
        return 'Obraz / dzieło';
      case 'handmade':
        return 'Rękodzieło';
      case 'lesson':
        return 'Lekcja';
      case 'consultation':
        return 'Konsultacja';
      case 'event':
        return 'Event';
      case 'custom':
        return 'Inne';
      default:
        return 'Oferta';
    }
  };

  const formatServicePrice = (service) => {
    const mode = service?.price?.mode;
    const currency = service?.price?.currency || 'PLN';

    if (mode === 'fixed' && service?.price?.amount != null) {
      return `${service.price.amount} ${currency}`;
    }

    if (mode === 'from' && service?.price?.from != null) {
      return `od ${service.price.from} ${currency}`;
    }

    if (mode === 'range' && service?.price?.from != null && service?.price?.to != null) {
      return `${service.price.from}–${service.price.to} ${currency}`;
    }

    if (mode === 'free') return 'Darmowe';
    if (mode === 'contact') return 'Wycena indywidualna';

    return 'Brak ceny';
  };

  const normalizeServiceForEdit = (service = {}, index = 0) => ({
    _id: service?._id,
    name: service?.name || '',
    shortDescription: service?.shortDescription || '',
    description: service?.description || '',
    category: service?.category || 'service',
    image: service?.image || { url: '', publicId: '' },
    gallery: Array.isArray(service?.gallery) ? service.gallery : [],
    price: {
      mode: service?.price?.mode || 'contact',
      amount: service?.price?.amount ?? null,
      from: service?.price?.from ?? null,
      to: service?.price?.to ?? null,
      currency: service?.price?.currency || 'PLN',
      unitLabel: service?.price?.unitLabel || '',
      note: service?.price?.note || '',
    },
    duration: {
      value: service?.duration?.value ?? '',
      unit: service?.duration?.unit || 'minutes',
      label: service?.duration?.label || '',
    },
    booking: {
      enabled: !!service?.booking?.enabled,
      type: service?.booking?.type || 'none',
    },
    delivery: {
      mode: service?.delivery?.mode || 'none',
      turnaroundText: service?.delivery?.turnaroundText || '',
    },
    tags: Array.isArray(service?.tags) ? service.tags : [],
    featured: !!service?.featured,
    isActive: typeof service?.isActive === 'boolean' ? service.isActive : true,
    order: Number.isFinite(Number(service?.order)) ? Number(service.order) : index,
  });

  const prettyUrl = (url) => {
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, '');
      const path = u.pathname === '/' ? '' : u.pathname;
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
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trimStart()
      .slice(0, maxLength);
  };

  const cleanIntegerInput = (value, maxLength = 7) => {
    return String(value || '')
      .replace(/[^\d]/g, '')
      .slice(0, maxLength);
  };

  const hasSpammyRepeatedChars = (value) => {
    const text = String(value || '').trim();

    // np. AAAAAAAAAAAAAAAA albo !!!!!!!!!! 
    if (/(.)\1{12,}/i.test(text)) return true;

    // np. "spam spam spam spam spam"
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});

    return Object.values(wordCount).some((count) => count >= 5);
  };

  const validateServiceData = (service) => {
    const name = String(service?.name || '').trim();
    const shortDescription = String(service?.shortDescription || '').trim();

    if (!name) {
      return 'Podaj nazwę usługi.';
    }

    if (name.length > SERVICE_NAME_MAX_LENGTH) {
      return `Nazwa usługi może mieć maksymalnie ${SERVICE_NAME_MAX_LENGTH} znaków.`;
    }

    if (name.length < 3) {
      return 'Nazwa usługi musi mieć minimum 3 znaki.';
    }

    if (hasSpammyRepeatedChars(name)) {
      return 'Nazwa usługi wygląda na spam. Wpisz normalną nazwę usługi.';
    }

    if (shortDescription.length > SERVICE_SHORT_DESCRIPTION_MAX_LENGTH) {
      return `Krótki opis usługi może mieć maksymalnie ${SERVICE_SHORT_DESCRIPTION_MAX_LENGTH} znaków.`;
    }

    if (shortDescription && shortDescription.length < 10) {
      return 'Krótki opis powinien mieć minimum 10 znaków albo zostaw go pusty.';
    }

    if (hasSpammyRepeatedChars(shortDescription)) {
      return 'Krótki opis wygląda na spam. Wpisz normalny opis usługi.';
    }

    const durationValue = Number(service?.duration?.value);
    const durationUnit = service?.duration?.unit || 'minutes';
    const durationLimit = SERVICE_DURATION_LIMITS[durationUnit];

    if (!durationLimit || !Number.isFinite(durationValue)) {
      return 'Podaj poprawny czas usługi.';
    }

    if (durationValue < durationLimit.min || durationValue > durationLimit.max) {
      return `Czas usługi dla jednostki "${durationLimit.label}" musi być w zakresie ${durationLimit.min}–${durationLimit.max}.`;
    }

    const priceMode = service?.price?.mode || 'contact';

    if (!['contact', 'free', 'fixed', 'from', 'range'].includes(priceMode)) {
      return 'Wybierz poprawny typ ceny.';
    }

    if (priceMode === 'fixed') {
      const amount = Number(service?.price?.amount);

      if (!Number.isFinite(amount) || amount < 0 || amount > SERVICE_PRICE_MAX) {
        return `Cena stała musi być w zakresie 0–${SERVICE_PRICE_MAX} zł.`;
      }
    }

    if (priceMode === 'from') {
      const from = Number(service?.price?.from);

      if (!Number.isFinite(from) || from < 0 || from > SERVICE_PRICE_MAX) {
        return `Cena „od” musi być w zakresie 0–${SERVICE_PRICE_MAX} zł.`;
      }
    }

    if (priceMode === 'range') {
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

    return '';
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

    if (currentServicesCount >= MAX_SERVICES) {
      showAlert(`Limit obecnego planu: maksymalnie ${MAX_SERVICES} usług.`, 'warning');
      return;
    }

    const name = cleanServiceText(newService.name, SERVICE_NAME_MAX_LENGTH).trim();
    const shortDescription = cleanServiceText(
      newService.shortDescription,
      SERVICE_SHORT_DESCRIPTION_MAX_LENGTH
    ).trim();

    const value = Number(newService.durationValue);
    const unit = newService.durationUnit || 'minutes';

    const priceMode = newService.priceMode || 'contact';

    const price = {
      mode: priceMode,
      amount: null,
      from: null,
      to: null,
      currency: 'PLN',
      unitLabel: '',
      note: '',
    };

    if (priceMode === 'fixed') {
      price.amount = Number(newService.priceValue);
    }

    if (priceMode === 'from') {
      price.from = Number(newService.priceValue);
    }

    if (priceMode === 'range') {
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

      showAlert(serviceError, 'warning');
      return;
    }

    setEditData((prev) => ({
      ...prev,
      services: [
        ...(prev.services || []),
        {
          name,
          shortDescription,
          description: '',
          category: newService.category || 'service',
          image: { url: '', publicId: '' },
          gallery: [],
          price,
          duration: {
            value,
            unit,
            label:
              unit === 'minutes' || unit === 'hours'
                ? 'czas wizyty'
                : 'czas realizacji',
          },
          booking: {
            enabled: false,
            type: 'none',
          },
          delivery: {
            mode: 'none',
            turnaroundText: '',
          },
          tags: [],
          featured: !!newService.featured,
          isActive: !!newService.isActive,
          order: (prev.services || []).length,
        },
      ],
    }));

    setNewService({
      name: '',
      shortDescription: '',
      category: 'service',
      priceMode: 'contact',
      priceValue: '',
      priceFrom: '',
      priceTo: '',
      durationValue: '',
      durationUnit: 'minutes',
      isActive: true,
      featured: false,
    });

    setFormErrors((prev) => ({
      ...prev,
      services: '',
    }));

    showAlert('Dodano usługę. Pamiętaj, aby zapisać zmiany w profilu.', 'success');
  };

  if (!user) return <Navigate to="/login" replace />;
  if (loading) return <div className={styles.wrapper}>⏳ Ładowanie profilu…</div>;
  if (notFound) {
    return (
      <div className={`${styles.wrapper} ${styles.emptyWrap}`}>
        <div className={styles.emptyCard} role="status" aria-live="polite">
          <div className={styles.emptyBadge}>Brak profilu</div>

          <h2 className={styles.emptyTitle}>Nie masz jeszcze wizytówki</h2>
          <p className={styles.emptyDesc}>
            Stwórz swój profil i zaprezentuj usługi — dodaj opis, zdjęcia, cennik i dostępne terminy.
            To tylko chwila, a pomoże klientom łatwo Cię znaleźć.
          </p>

          <ul className={styles.emptyList}>
            <li>
              <span className={styles.dot} aria-hidden="true"></span>
              <span>Wyróżnij się zdjęciami i krótkim opisem.</span>
            </li>
            <li>
              <span className={styles.dot} aria-hidden="true"></span>
              <span>Ustal zakres cen i czas usług.</span>
            </li>
            <li>
              <span className={styles.dot} aria-hidden="true"></span>
              <span>Opcjonalnie pokaż dostępne terminy do rezerwacji.</span>
            </li>
          </ul>

          <div className={styles.emptyCtas}>
            <Link to="/stworz-profil" className={`${styles.primary} ${styles.ctaPrimary}`}>
              Stwórz swój profil
            </Link>

            <Link to="/" className={styles.ghostLight}>
              Wróć na stronę główną
            </Link>
          </div>

          <div className={styles.emptyArt} aria-hidden="true">
            <div className={styles.bubble}></div>
            <div className={`${styles.bubble} ${styles.two}`}></div>
            <div className={`${styles.bubble} ${styles.three}`}></div>
          </div>
        </div>
      </div>
    );
  }

  const hasAvatarNow =
    Object.prototype.hasOwnProperty.call(editData, 'avatar')
      ? Boolean(editData.avatar)
      : Boolean(profile.avatar);

  const formatPLDate = (d) =>
    d ? new Date(d).toLocaleDateString('pl-PL', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
    }) : '--';

  const now = new Date();
  const until = profile?.visibleUntil ? new Date(profile.visibleUntil) : null;

  const isTimeExpired = until ? until.getTime() < now.getTime() : false;
  const isAdminHidden = profile?.isVisible === false && !isTimeExpired;

  const daysLeft = until
    ? Math.ceil((until.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const isExpired = isTimeExpired;

  const canExtend =
    !isAdminHidden &&
    (isExpired || !!billingStatus?.canExtend || !!billingStatus?.legacy?.canExtend);

  const shouldShowVisibilityNotice =
    isAdminHidden ||
    isExpired ||
    !!billingStatus?.canExtend ||
    !!billingStatus?.legacy?.canExtend;

  const billingPublic = billingStatus?.billing || {};
  const billingPlan =
    billingPublic?.effectivePlan ||
    billingPublic?.plan ||
    billingStatus?.plan?.effectivePlan ||
    billingStatus?.plan?.plan ||
    "free";

  const billingLabel =
    billingPublic?.label ||
    billingStatus?.plan?.label ||
    (billingPlan === "premium" ? "Premium" : billingPlan === "standard" ? "Standard" : "Free");

  const billingCurrentStatus = billingPublic?.status || "inactive";
  const billingLimits = {
    ...DEFAULT_LIMITS,
    ...(billingPublic?.limits || billingStatus?.plan?.limits || {}),
  };
  const billingFeatures = billingPublic?.features || billingStatus?.plan?.features || {};
  const isPaidActive = ["standard", "premium"].includes(billingPlan);

  const MAX_PHOTOS = Number(billingLimits.photos || DEFAULT_LIMITS.photos);
  const MAX_SERVICES = Number(billingLimits.services || DEFAULT_LIMITS.services);
  const MAX_DESCRIPTION = Number(billingLimits.descriptionLength || DEFAULT_LIMITS.descriptionLength);
  const MAX_LINKS = Number(billingLimits.links || DEFAULT_LIMITS.links);
  const MAX_QUICK_ANSWERS = Number(billingLimits.quickAnswers || DEFAULT_LIMITS.quickAnswers);

  const canUseBooking = !!billingFeatures.booking;
  const canUseTeam = !!billingFeatures.team;
  const canUsePremiumThemes = !!billingFeatures.premiumThemes;

  const canUseSocialMedia = !!billingFeatures.socialMedia;

  const canUseAutoAccept = canUseBooking && billingPlan === "premium";

  // =========================
  // Render
  // =========================
  return (
    <div className={styles.wrapper} id="scrollToId">
      {alert && (
        <AlertBox
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className={styles.inner}>
        <div className={styles.head}>
          <div className={styles.labelRow}>
            <span className={styles.labelBadge}>Twój profil</span>
            <span className={styles.labelDot} />
            <span className={styles.labelDesc}>
              Zarządzaj wizytówką, usługami, galerią i ustawieniami rezerwacji
            </span>
            <span className={styles.labelLine} />
            <span className={styles.pill}>Showly • Edycja • Profil • Rezerwacje</span>
          </div>

          <div className={styles.headTop}>
            <div className={styles.headText}>
              <h2 className={styles.heading}>Panel Twojego profilu</h2>
              <p className={styles.description}>
                {profile ? (
                  <>
                    Pomyślnie wczytano Twój profil: <strong>{profile.name}</strong>
                  </>
                ) : (
                  "Ładowanie danych…"
                )}
              </p>
            </div>

            {!isEditing && (
              <div className={styles.headActions}>
                <Link
                  to={profile?.slug ? `/profil/${profile.slug}` : "#"}
                  state={profile?.slug ? { scrollToId: "profileWrapper" } : undefined}
                  className={styles.primary}
                  style={!profile?.slug ? { pointerEvents: "none", opacity: 0.6 } : undefined}
                  aria-label="Przejdź do publicznego profilu"
                  title={profile?.slug ? "Zobacz swój publiczny profil" : "Brak sluga profilu"}
                >
                  Przejdź do widoku profilu
                </Link>

                <button
                  onClick={() => setIsEditing(true)}
                  className={styles.primary}
                  aria-label="Edytuj profil"
                  type="button"
                >
                  Edytuj profil
                </button>
              </div>
            )}
          </div>
        </div>

        <section className={styles.billingPanel}>
          <div className={styles.billingGlowOne} aria-hidden="true" />
          <div className={styles.billingGlowTwo} aria-hidden="true" />
          <div className={styles.billingNoise} aria-hidden="true" />

          <div className={styles.billingHeader}>
            <div>
              <p className={styles.billingEyebrow}>
                <span>Showly.me</span>
                Plan i widoczność profilu
              </p>

              <h2>Twój plan i limity</h2>

              <p>
                Zarządzaj widocznością profilu, zdjęciami, usługami i funkcjami rezerwacji.
                Wybierz plan dopasowany do tego, jak chcesz pokazywać swoją ofertę klientom.
              </p>
            </div>

            <div className={styles.currentPlanBadge}>
              <span>Aktualnie</span>
              <strong>{billingLoading ? "Ładowanie..." : billingLabel}</strong>
            </div>
          </div>

          <div className={styles.billingStatusBox}>
            <div>
              <span>Aktualny plan</span>
              <strong>{billingLabel}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong>{billingCurrentStatus}</strong>
            </div>

            <div>
              <span>Zdjęcia profilu</span>
              <strong>{billingLimits.photos || 3}</strong>
            </div>

            <div>
              <span>Usługi</span>
              <strong>{billingLimits.services || 3}</strong>
            </div>
          </div>

          <div className={styles.planCards}>
            <article
              className={`${styles.planCard} ${styles.starterPlan} ${billingPlan === "free" ? styles.activePlan : ""
                }`}
            >
              <div className={styles.planBadge}>Na start</div>

              <div className={styles.planTop}>
                <div>
                  <h3>Starter</h3>
                  <p>Podstawowa wizytówka</p>
                </div>

                <strong>0 zł</strong>
              </div>

              <p className={styles.planDesc}>
                Podstawowa wizytówka na start. Po 30 dniach możesz przedłużyć widoczność za
                <b> 14,99 zł / kolejne 30 dni</b>.
              </p>

              <ul>
                <li>Widoczność przez 30 dni</li>
                <li>Przedłużenie: 14,99 zł / 30 dni</li>
                <li>Losowy link do profilu</li>
                <li>Do 3 zdjęć profilu</li>
                <li>Do 3 usług</li>
                <li>1 link</li>
                <li>Wiadomości od klientów</li>
                <li>Podstawowy wygląd profilu</li>
                <li>1 szybka odpowiedź profilu</li>
                <li>Opis profilu do 200 znaków</li>
              </ul>

              <button type="button" disabled className={styles.planButtonGhost}>
                {billingPlan === "free" ? "Aktywny plan" : "Plan podstawowy"}
              </button>
            </article>

            <article
              className={`${styles.planCard} ${styles.standardPlan} ${billingPlan === "standard" ? styles.activePlan : ""
                }`}
            >
              <div className={styles.planBadge}>Najlepszy wybór</div>

              <div className={styles.planTop}>
                <div>
                  <h3>Standard</h3>
                  <p>Dla twórców i usługodawców</p>
                </div>

                <strong>29,99 zł <span>/ mies.</span></strong>
              </div>

              <p className={styles.planDesc}>
                Profesjonalny profil z lepszym wyglądem, social mediami i ładnym linkiem.
                <b> Tylko 15 zł więcej niż zwykłe przedłużenie profilu.</b>
              </p>

              <ul>
                <li>Widoczność profilu w cenie subskrypcji</li>
                <li>Ładny link po nazwie i roli</li>
                <li>Do 6 zdjęć profilu</li>
                <li>Do 10 usług</li>
                <li>2 linki</li>
                <li>Wiadomości od klientów</li>
                <li>Rozszerzone motywy profilu</li>
                <li>Social media profilu</li>
                <li>3 szybkie odpowiedzi profilu</li>
                <li>Opis profilu do 500 znaków</li>
                <li>Promowanie i lepsza widoczność w Showly</li>
              </ul>

              {billingPlan === "standard" ? (
                <button type="button" disabled className={styles.planButtonGhost}>
                  Aktywny plan
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.planButton}
                  onClick={() => handleStartSubscription("standard")}
                  disabled={billingActionLoading === "standard"}
                >
                  {billingActionLoading === "standard" ? "Przekierowanie..." : "Wybierz Standard"}
                </button>
              )}
            </article>

            <article
              className={`${styles.planCard} ${styles.premiumPlan} ${billingPlan === "premium" ? styles.activePlan : ""
                }`}
            >
              <div className={styles.planBadge}>Dla profesjonalistów</div>

              <div className={styles.planTop}>
                <div>
                  <h3>Premium</h3>
                  <p>Rezerwacje i zespół</p>
                </div>

                <strong>59,99 zł <span>/ mies.</span></strong>
              </div>

              <p className={styles.planDesc}>
                Pełny pakiet dla profili, które obsługują klientów, terminy, rezerwacje
                i pracowników.
              </p>

              <ul>
                <li>Wszystko ze Standard</li>
                <li>Widoczność profilu w cenie subskrypcji</li>
                <li>Ładny link po nazwie i roli</li>
                <li>Do 15 zdjęć profilu</li>
                <li>Do 20 usług</li>
                <li>3 linki</li>
                <li>5 szybkich odpowiedzi profilu</li>
                <li>Opis profilu do 1000 znaków</li>
                <li>Promowanie i lepsza widoczność w Showly</li>
                <li>Zaawansowany kalendarz rezerwacji</li>
                <li>Tryby rezerwacji: kalendarz, zapytania i blokowanie dni</li>
                <li>Automatyczna akceptacja rezerwacji</li>
                <li>Bufor między rezerwacjami</li>
                <li>Zespół i pracownicy</li>
              </ul>

              {billingPlan === "premium" ? (
                <button type="button" disabled className={styles.planButtonGhost}>
                  Aktywny plan
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.planButton}
                  onClick={() => handleStartSubscription("premium")}
                  disabled={billingActionLoading === "premium"}
                >
                  {billingActionLoading === "premium" ? "Przekierowanie..." : "Wybierz Premium"}
                </button>
              )}
            </article>
          </div>

          {isPaidActive && (
            <div className={styles.billingFooter}>
              <p>
                Subskrypcją możesz zarządzać w bezpiecznym panelu Stripe — anulowanie,
                zmiana karty i historia płatności.
              </p>

              <button
                type="button"
                className={styles.portalButton}
                onClick={handleOpenBillingPortal}
                disabled={billingActionLoading === "portal"}
              >
                {billingActionLoading === "portal" ? "Otwieranie..." : "Zarządzaj subskrypcją"}
              </button>
            </div>
          )}
        </section>

        {shouldShowVisibilityNotice && (
          <div className={`${styles.card} ${styles.noticeCard}`}>
            <div className={styles.noticeContent}>
              {isAdminHidden ? (
                <>
                  <p className={styles.noticeTitle}>
                    ⛔ Twój profil został <strong>wyłączony przez administrację</strong>
                  </p>
                  <p className={styles.noticeText}>
                    Profil jest obecnie niewidoczny mimo ważnej daty widoczności do:{" "}
                    <strong>{until ? until.toLocaleDateString("pl-PL") : "—"}</strong>.
                  </p>
                  <p className={styles.noticeText}>
                    Nie możesz samodzielnie przedłużyć ani przywrócić widoczności, dopóki sprawa nie
                    zostanie wyjaśniona lub poprawiona.
                  </p>
                </>
              ) : isExpired ? (
                <>
                  <p className={styles.noticeTitle}>
                    🔒 Twój profil jest <strong>niewidoczny</strong>
                  </p>
                  <p className={styles.noticeText}>
                    Widoczność wygasła:{" "}
                    <strong>{until ? until.toLocaleDateString("pl-PL") : "—"}</strong>
                  </p>
                  <p className={styles.noticeText}>
                    Aby ponownie aktywować wizytówkę, przedłuż widoczność.
                  </p>
                </>
              ) : (
                <>
                  <p className={styles.noticeTitle}>
                    ⏳ Twoja wizytówka wkrótce wygaśnie
                  </p>
                  <p className={styles.noticeText}>
                    Pozostało: <strong>{daysLeft} dni</strong> (do:{" "}
                    <strong>{until ? until.toLocaleDateString("pl-PL") : "—"}</strong>)
                  </p>
                </>
              )}
            </div>

            {!isAdminHidden && (
              <LoadingButton
                type="button"
                isLoading={isExtending}
                disabled={isExtending || !canExtend}
                className={styles.secondary}
                onClick={handleExtendVisibility}
              >
                Przedłuż widoczność (Stripe)
              </LoadingButton>
            )}
          </div>
        )}

        {/* =========================
          Dane podstawowe
        ========================= */}
        <section className={`${styles.card} ${styles.basicCard}`}>
          <div className={styles.cardGlow} aria-hidden="true" />

          <div className={styles.sectionTop}>
            <div>
              <span className={styles.sectionKicker}>Profil publiczny</span>

              <h3 className={styles.sectionTitle}>Dane podstawowe</h3>

              <p className={styles.sectionLead}>
                To pierwsze informacje, które widzą użytkownicy po wejściu na Twoją wizytówkę.
              </p>
            </div>

            <div className={styles.sectionBadge}>
              <FaIdBadge />
              <span>Start</span>
            </div>
          </div>

          <div className={styles.basicInfoRow}>
            <div className={styles.avatarColumn}>
              <div className={styles.avatarFrame}>
                <div className={styles.avatarRing} />

                <img
                  src={getAvatarUrl(isEditing ? editData : profile)}
                  alt="Avatar"
                  className={styles.avatar}
                />

                <span className={styles.avatarStatus}>
                  {profile?.isVisible ? "Widoczny" : "Ukryty"}
                </span>
              </div>

              <div className={styles.avatarMeta}>
                <strong>{isEditing ? editData.name || profile?.name : profile?.name}</strong>
                <span>{isEditing ? editData.role || profile?.role : profile?.role}</span>
              </div>

              {isEditing && (
                <div className={styles.controls}>
                  <label className={styles.fileBtn}>
                    <input
                      type="file"
                      accept="image/*,heic,heif"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                    />
                    Wybierz zdjęcie
                  </label>

                  {hasAvatarNow && (
                    <button
                      type="button"
                      className={styles.danger}
                      onClick={handleRemoveAvatar}
                    >
                      Usuń zdjęcie
                    </button>
                  )}

                  <small className={styles.hint}>
                    Kwadratowe zdjęcie wygląda najlepiej. Maksymalnie ok. 2–3 MB.
                  </small>
                </div>
              )}
            </div>

            <div className={styles.basicInfoCol}>
              <div className={styles.inputBlock}>
                <label>
                  <FaUserTie />
                  <span>Rola</span>
                </label>

                {isEditing ? (
                  <>
                    <input
                      type="text"
                      className={`${styles.formInput} ${formErrors.role ? styles.inputError : ""}`}
                      value={editData.role || ""}
                      maxLength={40}
                      onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                      aria-invalid={!!formErrors.role}
                      placeholder="Np. DJ / Fryzjer / Grafik"
                    />
                    {formErrors.role && <small className={styles.error}>{formErrors.role}</small>}
                  </>
                ) : (
                  <p>{profile.role || "Nie podano"}</p>
                )}
              </div>

              <div className={styles.inputBlock}>
                <label>
                  <FaIdBadge />
                  <span>Typ profilu</span>
                </label>

                {isEditing ? (
                  <>
                    <select
                      className={`${styles.formInput} ${formErrors.profileType ? styles.inputError : ""}`}
                      value={editData.profileType || ""}
                      onChange={(e) => setEditData({ ...editData, profileType: e.target.value })}
                      aria-invalid={!!formErrors.profileType}
                    >
                      <option value="">— wybierz —</option>
                      <option value="hobbystyczny">Hobby</option>
                      <option value="zawodowy">Zawód</option>
                      <option value="serwis">Serwis</option>
                      <option value="społeczność">Społeczność</option>
                    </select>

                    {formErrors.profileType && (
                      <small className={styles.error}>{formErrors.profileType}</small>
                    )}
                  </>
                ) : (
                  <p>{profile.profileType || "Nie podano"}</p>
                )}
              </div>

              <div className={styles.inputBlock}>
                <label>
                  <FaMapMarkerAlt />
                  <span>Lokalizacja</span>
                </label>

                {isEditing ? (
                  <>
                    <input
                      type="text"
                      className={`${styles.formInput} ${formErrors.location ? styles.inputError : ""}`}
                      value={editData.location || ""}
                      maxLength={30}
                      onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                      aria-invalid={!!formErrors.location}
                      placeholder="Np. Poznań / cała Polska"
                    />
                    {formErrors.location && (
                      <small className={styles.error}>{formErrors.location}</small>
                    )}
                  </>
                ) : (
                  <p>{profile.location || "Nie podano"}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* =========================
          Opis
        ========================= */}
        <section className={`${styles.card} ${styles.descriptionCard}`}>
          <div className={styles.cardGlow} aria-hidden="true" />

          <div className={styles.sectionTop}>
            <div>
              <span className={styles.sectionKicker}>O Tobie</span>

              <h3 className={styles.sectionTitle}>Opis profilu</h3>

              <p className={styles.sectionLead}>
                Opowiedz krótko, czym się zajmujesz, dla kogo jest Twoja oferta i dlaczego warto się z Tobą skontaktować.
              </p>
            </div>

            <div className={styles.sectionBadge}>
              <FaBriefcase />
              <span>Oferta</span>
            </div>
          </div>

          <div className={styles.descriptionBlock}>
            {isEditing ? (
              <div className={styles.descriptionEditor}>
                <div className={styles.textareaShell}>
                  <textarea
                    value={editData.description || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, description: e.target.value })
                    }
                    rows={6}
                    className={styles.descriptionTextarea}
                    maxLength={MAX_DESCRIPTION}
                    placeholder="Np. Pomagam klientom stworzyć profesjonalną wizytówkę online, przygotowuję projekty graficzne i dbam o estetykę każdego szczegółu..."
                  />

                  <div className={styles.textareaDecor} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>

                <div className={styles.descMeta}>
                  <div className={styles.descLeft}>
                    {formErrors.description ? (
                      <small className={styles.error}>{formErrors.description}</small>
                    ) : (
                      <small className={styles.hint}>
                        Dobry opis ma 2–4 krótkie zdania i jasno pokazuje, co oferujesz.
                      </small>
                    )}
                  </div>

                  <div className={styles.descRight}>
                    <span className={styles.counterPill}>
                      {editData.description?.length || 0}/{MAX_DESCRIPTION}
                    </span>
                  </div>
                </div>

                <div className={styles.descProgress}>
                  <span
                    style={{
                      width: `${Math.min(
                        ((editData.description?.length || 0) / MAX_DESCRIPTION) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ) : profile.description ? (
              <div className={styles.descriptionPreview}>
                <div className={styles.quoteMark}>“</div>

                <p className={styles.descriptionText}>{profile.description}</p>

                <div className={styles.descriptionFooter}>
                  <span>Opis publiczny</span>
                  <strong>{profile.description.length} znaków</strong>
                </div>
              </div>
            ) : (
              <div className={styles.descriptionEmpty}>
                <div className={styles.emptyIcon}>
                  <FaBriefcase />
                </div>

                <div>
                  <strong>Nie dodałeś/aś jeszcze opisu</strong>
                  <p>
                    Dodaj kilka zdań o sobie lub swojej działalności, żeby klient od razu wiedział, czym się zajmujesz.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* =========================
  Wygląd profilu
========================= */}
        <section className={`${styles.card} ${styles.appearanceCard}`}>
          <div className={styles.cardGlow} aria-hidden="true" />

          <div className={styles.sectionTop}>
            <div>
              <span className={styles.sectionKicker}>Personalizacja</span>

              <h3 className={styles.sectionTitle}>Wygląd profilu</h3>

              <p className={styles.sectionLead}>
                Dopasuj kolory wizytówki do swojej marki. Akcenty wpływają na nagłówki,
                przyciski, elementy dekoracyjne i wyróżnienia w profilu publicznym.
              </p>
            </div>

            <div className={styles.sectionBadge}>
              <FaTools />
              <span>Design</span>
            </div>
          </div>

          <div className={styles.appearanceBody}>
            <div className={styles.themePreviewCard}>
              <div
                className={styles.themePreviewCover}
                style={{
                  background: `linear-gradient(135deg, ${(isEditing ? editData.theme?.primary : profile.theme?.primary) || "#6f4ef2"
                    }, ${(isEditing ? editData.theme?.secondary : profile.theme?.secondary) || "#ff4081"
                    })`,
                }}
              />

              <div className={styles.themePreviewContent}>
                <div
                  className={styles.themePreviewAvatar}
                  style={{
                    background: `linear-gradient(135deg, ${(isEditing ? editData.theme?.primary : profile.theme?.primary) || "#6f4ef2"
                      }, ${(isEditing ? editData.theme?.secondary : profile.theme?.secondary) || "#ff4081"
                      })`,
                  }}
                >
                  <span>
                    {(profile?.name || "S").slice(0, 1).toUpperCase()}
                  </span>
                </div>

                <div className={styles.themePreviewText}>
                  <strong>{profile?.name || "Twoja marka"}</strong>
                  <span>{profile?.role || "Profil Showly"}</span>
                </div>

                <div className={styles.themePreviewPills}>
                  <span>Usługi</span>
                  <span>Kontakt</span>
                  <span>Opinie</span>
                </div>

                <button
                  type="button"
                  className={styles.themePreviewButton}
                  style={{
                    background: `linear-gradient(135deg, ${(isEditing ? editData.theme?.primary : profile.theme?.primary) || "#6f4ef2"
                      }, ${(isEditing ? editData.theme?.secondary : profile.theme?.secondary) || "#ff4081"
                      })`,
                  }}
                >
                  Podgląd przycisku
                </button>
              </div>
            </div>

            <div className={styles.themeSettingsPanel}>
              {!canUsePremiumThemes && isEditing && (
                <div className={styles.upgradeNotice}>
                  <strong>Personalizacja kolorów jest dostępna w planie Standard i Premium.</strong>
                  <span>
                    W planie Starter profil korzysta z podstawowego wyglądu. Po przejściu
                    na wyższy plan odblokujesz własne kolory i gotowe motywy.
                  </span>
                </div>
              )}

              {isEditing && canUsePremiumThemes ? (
                <>
                  <div className={styles.themeGroupHeader}>
                    <div>
                      <strong>Gotowe motywy</strong>
                      <span>Wybierz preset albo ustaw własne kolory niżej.</span>
                    </div>
                  </div>

                  <div className={styles.colorPresets}>
                    {[
                      { name: "Systemowy", primary: "#6f4ef2", secondary: "#ff4081", variant: "system" },
                      { name: "Pomarańczowy", primary: "#ff5a1f", secondary: "#ffb86b", variant: "orange" },
                      { name: "Niebieski", primary: "#2563eb", secondary: "#7c9dff", variant: "blue" },
                      { name: "Zielony", primary: "#16a34a", secondary: "#86efac", variant: "green" },
                      { name: "Różowy", primary: "#db2777", secondary: "#ff6ea8", variant: "violet" },
                      { name: "Ciemny", primary: "#e50914", secondary: "#9aa3af", variant: "dark" },
                    ].map((preset) => {
                      const isActive = editData.theme?.variant === preset.variant;

                      return (
                        <button
                          key={preset.variant}
                          type="button"
                          className={`${styles.presetBtn} ${isActive ? styles.presetActive : ""}`}
                          onClick={() =>
                            setEditData((prev) => ({
                              ...prev,
                              theme: {
                                ...(prev.theme || {}),
                                variant: preset.variant,
                                primary: preset.primary,
                                secondary: preset.secondary,
                              },
                            }))
                          }
                          title={`Ustaw preset: ${preset.name}`}
                        >
                          <span className={styles.presetDots} aria-hidden="true">
                            <span style={{ background: preset.primary }} />
                            <span style={{ background: preset.secondary }} />
                          </span>

                          <span className={styles.presetName}>{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className={styles.themeGroupHeader}>
                    <div>
                      <strong>Kolory ręczne</strong>
                      <span>Ustaw główny i dodatkowy akcent profilu.</span>
                    </div>
                  </div>

                  <div className={styles.colorGrid}>
                    <div className={styles.colorField}>
                      <label className={styles.colorLabel}>Akcent główny</label>

                      <div className={styles.colorRow}>
                        <input
                          type="color"
                          value={editData.theme?.primary || "#6f4ef2"}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              theme: {
                                ...(prev.theme || {}),
                                primary: e.target.value,
                                variant: "custom",
                              },
                            }))
                          }
                        />

                        <input
                          type="text"
                          className={styles.formInput}
                          value={editData.theme?.primary || "#6f4ef2"}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              theme: {
                                ...(prev.theme || {}),
                                primary: e.target.value,
                                variant: "custom",
                              },
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className={styles.colorField}>
                      <label className={styles.colorLabel}>Akcent dodatkowy</label>

                      <div className={styles.colorRow}>
                        <input
                          type="color"
                          value={editData.theme?.secondary || "#ff4081"}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              theme: {
                                ...(prev.theme || {}),
                                secondary: e.target.value,
                                variant: "custom",
                              },
                            }))
                          }
                        />

                        <input
                          type="text"
                          className={styles.formInput}
                          value={editData.theme?.secondary || "#ff4081"}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              theme: {
                                ...(prev.theme || {}),
                                secondary: e.target.value,
                                variant: "custom",
                              },
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className={styles.colorField}>
                      <label className={styles.colorLabel}>Aktualny motyw</label>

                      <div className={styles.themeCurrentBox}>
                        <span
                          style={{
                            background: `linear-gradient(135deg, ${editData.theme?.primary || "#6f4ef2"
                              }, ${editData.theme?.secondary || "#ff4081"})`,
                          }}
                        />

                        <div>
                          <strong>{editData.theme?.variant || "system"}</strong>
                          <small>Motyw zostanie zapisany po kliknięciu „Zapisz zmiany”.</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.themeViewBox}>
                  <div className={styles.themeViewHeader}>
                    <strong>
                      {profile?.theme?.variant && profile.theme.variant !== "system"
                        ? `Motyw: ${profile.theme.variant}`
                        : "Motyw systemowy"}
                    </strong>

                    {!canUsePremiumThemes && (
                      <span className={styles.lockBadge}>Standard / Premium</span>
                    )}
                  </div>

                  <div className={styles.themeSwatches}>
                    <div>
                      <span
                        style={{
                          background: profile?.theme?.primary || "#6f4ef2",
                        }}
                      />
                      <p>Akcent główny</p>
                      <strong>{profile?.theme?.primary || "#6f4ef2"}</strong>
                    </div>

                    <div>
                      <span
                        style={{
                          background: profile?.theme?.secondary || "#ff4081",
                        }}
                      />
                      <p>Akcent dodatkowy</p>
                      <strong>{profile?.theme?.secondary || "#ff4081"}</strong>
                    </div>
                  </div>

                  {!canUsePremiumThemes && (
                    <p className={styles.themeLockedText}>
                      W obecnym planie własne kolory są zablokowane. Profil korzysta z podstawowego wyglądu Showly.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =========================
  Dostępność i usługi
========================= */}
        <section className={`${styles.card} ${styles.offerCard}`}>
          <div className={styles.cardGlow} aria-hidden="true" />

          <div className={styles.sectionTop}>
            <div>
              <span className={styles.sectionKicker}>Oferta i dostępność</span>

              <h3 className={styles.sectionTitle}>Dostępność i usługi</h3>

              <p className={styles.sectionLead}>
                Ustaw cennik, dodaj usługi, wybierz tryb rezerwacji oraz określ dni i godziny,
                w których klienci mogą się z Tobą kontaktować.
              </p>
            </div>

            <div className={styles.sectionBadge}>
              <FaCalendarAlt />
              <span>Oferta</span>
            </div>
          </div>

          <div className={styles.offerBody}>
            {/* CENNIK */}
            <div className={`${styles.offerPanel} ${styles.pricePanel}`}>
              <div className={styles.offerPanelHead}>
                <div className={styles.offerIcon}>
                  <FaMoneyBillWave />
                </div>

                <div>
                  <strong>Cennik</strong>
                  <span>Zakres cen widoczny na Twojej wizytówce.</span>
                </div>
              </div>

              {isEditing ? (
                <div className={styles.priceModernGrid}>
                  <label className={styles.modernField}>
                    <span>Cena od</span>
                    <input
                      type="number"
                      className={styles.formInput}
                      value={editData.priceFrom || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, priceFrom: e.target.value })
                      }
                      placeholder="Np. 100"
                    />
                    {formErrors.priceFrom && (
                      <small className={styles.error}>{formErrors.priceFrom}</small>
                    )}
                  </label>

                  <label className={styles.modernField}>
                    <span>Cena do</span>
                    <input
                      type="number"
                      className={styles.formInput}
                      value={editData.priceTo || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, priceTo: e.target.value })
                      }
                      placeholder="Np. 1000"
                    />
                    {formErrors.priceTo && (
                      <small className={styles.error}>{formErrors.priceTo}</small>
                    )}
                  </label>
                </div>
              ) : (
                <div className={styles.priceShowcase}>
                  <div>
                    <span>od</span>
                    <strong>{profile.priceFrom || "—"} zł</strong>
                  </div>

                  <div>
                    <span>do</span>
                    <strong>{profile.priceTo || "—"} zł</strong>
                  </div>
                </div>
              )}
            </div>

            {/* TRYB REZERWACJI */}
            <div className={styles.offerPanel}>
              <div className={styles.offerPanelHead}>
                <div className={styles.offerIcon}>
                  <FaClock />
                </div>

                <div>
                  <strong>Tryb rezerwacji</strong>
                  <span>Określ, jak klienci mają umawiać usługi.</span>
                </div>
              </div>

              {isEditing ? (
                <div className={styles.bookingModeGrid}>
                  {[
                    {
                      value: "request-open",
                      title: "Zapytania",
                      text: "Klient wysyła wiadomość bez wyboru konkretnego terminu.",
                    },
                    {
                      value: "request-blocking",
                      title: "Zapytania + blokowanie dni",
                      text: "Dobre dla DJ-ów, cukierników i usług realizowanych w wybrane dni.",
                      premium: true,
                    },
                    {
                      value: "calendar",
                      title: "Kalendarz godzinowy",
                      text: "Klient wybiera konkretną godzinę i usługę.",
                      premium: true,
                    },
                  ].map((mode) => {
                    const checked = editData.bookingMode === mode.value;
                    const locked = mode.premium && !canUseBooking;

                    return (
                      <button
                        key={mode.value}
                        type="button"
                        className={`${styles.bookingModeCard} ${checked ? styles.bookingModeActive : ""
                          } ${locked ? styles.bookingModeLocked : ""}`}
                        onClick={() => {
                          if (locked) {
                            showAlert(
                              "Ten tryb rezerwacji jest dostępny w planie Premium.",
                              "warning"
                            );
                            return;
                          }

                          setEditData((prev) => ({
                            ...prev,
                            bookingMode: mode.value,
                          }));
                        }}
                      >
                        <strong>{mode.title}</strong>
                        <span>{mode.text}</span>

                        {locked && <small>Premium</small>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.modeView}>
                  <strong>
                    {profile.bookingMode === "calendar"
                      ? "Kalendarz godzinowy"
                      : profile.bookingMode === "request-blocking"
                        ? "Zapytania + blokowanie dni"
                        : "Zapytania"}
                  </strong>

                  <span>
                    {profile.bookingMode === "calendar"
                      ? "Klienci mogą wybierać konkretne godziny."
                      : profile.bookingMode === "request-blocking"
                        ? "Możesz blokować dni i obsługiwać zapytania."
                        : "Klienci kontaktują się przez formularz wiadomości."}
                  </span>
                </div>
              )}
            </div>

            {/* USTAWIENIA REZERWACJI */}
            <div className={`${styles.offerPanel} ${styles.bookingSettingsPanel}`}>
              <div className={styles.offerPanelHead}>
                <div className={styles.offerIcon}>
                  <FaClock />
                </div>

                <div>
                  <strong>Ustawienia rezerwacji</strong>
                  <span>
                    Skonfiguruj przerwę między usługami, automatyczne potwierdzanie oraz działanie zespołu.
                  </span>
                </div>
              </div>

              <div className={styles.bookingSettingsGrid}>
                {/* BUFFER */}
                <div className={styles.bookingSettingCard}>
                  <div className={styles.bookingSettingTop}>
                    <strong>Przerwa między usługami</strong>
                    <span>Buffer po zakończonej rezerwacji.</span>
                  </div>

                  {isEditing ? (
                    <>
                      <select
                        className={styles.formInput}
                        value={Number(editData.bookingBufferMin ?? 0)}
                        disabled={!canUseBooking}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            bookingBufferMin: Number(e.target.value),
                          }))
                        }
                      >
                        <option value={0}>Brak dodatkowej przerwy</option>
                        <option value={5}>5 minut</option>
                        <option value={10}>10 minut</option>
                        <option value={15}>15 minut</option>
                      </select>

                      {!canUseBooking && (
                        <div className={styles.infoMuted}>
                          Przerwa między usługami jest dostępna w planie Premium.
                        </div>
                      )}

                      {formErrors.bookingBufferMin && (
                        <small className={styles.error}>{formErrors.bookingBufferMin}</small>
                      )}
                    </>
                  ) : (
                    <div className={styles.settingViewBox}>
                      <strong>
                        {canUseBooking ? `${profile.bookingBufferMin || 0} min` : "Niedostępne"}
                      </strong>
                      <span>
                        {canUseBooking
                          ? "Dodatkowa przerwa doliczana po rezerwacji."
                          : "Funkcja dostępna w planie Premium."}
                      </span>
                    </div>
                  )}
                </div>

                {/* AUTO ACCEPT */}
                <div className={styles.bookingSettingCard}>
                  <div className={styles.bookingSettingTop}>
                    <strong>Automatyczne potwierdzanie</strong>
                    <span>Nowe rezerwacje mogą od razu dostać status zaakceptowane.</span>
                  </div>

                  {isEditing ? (
                    <>
                      <label
                        className={`${styles.featuredSwitch} ${!canUseAutoAccept ? styles.disabledOption : ""
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={canUseAutoAccept ? !!editData.autoAcceptReservations : false}
                          disabled={!canUseAutoAccept}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              autoAcceptReservations: e.target.checked,
                            }))
                          }
                        />

                        <span>
                          <strong>Automatycznie akceptuj rezerwacje</strong>
                          <small>
                            Usługodawca nie będzie musiał ręcznie potwierdzać terminu.
                          </small>
                        </span>
                      </label>

                      {!canUseAutoAccept && (
                        <div className={styles.infoMuted}>
                          W obecnym planie rezerwacje wymagają ręcznego potwierdzenia.
                        </div>
                      )}

                      {formErrors.autoAcceptReservations && (
                        <small className={styles.error}>
                          {formErrors.autoAcceptReservations}
                        </small>
                      )}
                    </>
                  ) : (
                    <div className={styles.settingViewBox}>
                      <strong>
                        {canUseAutoAccept && profile?.autoAcceptReservations
                          ? "Włączone"
                          : "Wyłączone"}
                      </strong>
                      <span>
                        {canUseAutoAccept && profile?.autoAcceptReservations
                          ? "Nowe rezerwacje będą automatycznie potwierdzane."
                          : "Nowe rezerwacje będą wymagały ręcznej akceptacji."}
                      </span>
                    </div>
                  )}
                </div>

                {/* TEAM SETTINGS */}
                <div className={`${styles.bookingSettingCard} ${styles.teamBookingCard}`}>
                  <div className={styles.bookingSettingTop}>
                    <strong>Zespół — ustawienia rezerwacji</strong>
                    <span>Włącz wybór pracownika albo automatyczny przydział.</span>
                  </div>

                  {isEditing ? (
                    <>
                      <label
                        className={`${styles.featuredSwitch} ${!canUseTeam ? styles.disabledOption : ""
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={canUseTeam ? !!editData.team?.enabled : false}
                          disabled={!canUseTeam}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              team: {
                                ...(prev.team || {}),
                                enabled: e.target.checked,
                                assignmentMode: prev.team?.assignmentMode || "user-pick",
                              },
                            }))
                          }
                        />

                        <span>
                          <strong>Włącz obsługę zespołu</strong>
                          <small>Klient będzie mógł wybrać pracownika albo system przydzieli go automatycznie.</small>
                        </span>
                      </label>

                      {!canUseTeam && (
                        <div className={styles.upgradeNotice}>
                          <strong>Zespół jest dostępny tylko w planie Premium.</strong>
                          <span>
                            W planie Starter i Standard nie możesz włączyć obsługi pracowników ani przydziału do rezerwacji.
                          </span>
                        </div>
                      )}

                      <label className={styles.modernField}>
                        <span>Tryb przydziału</span>

                        <select
                          className={styles.formInput}
                          disabled={!canUseTeam || !editData.team?.enabled}
                          value={editData.team?.assignmentMode || "user-pick"}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              team: {
                                ...(prev.team || {}),
                                assignmentMode: e.target.value,
                              },
                            }))
                          }
                        >
                          <option value="user-pick">Klient wybiera pracownika</option>
                          <option value="auto-assign">Automatyczny przydział</option>
                        </select>
                      </label>

                      {canUseTeam && !editData.team?.enabled && (
                        <div className={styles.infoMuted}>
                          Wyłączone — wybór pracownika nie będzie pokazywany w rezerwacji.
                        </div>
                      )}

                      {formErrors.team && (
                        <small className={styles.error}>{formErrors.team}</small>
                      )}
                    </>
                  ) : (
                    <div className={styles.settingViewBox}>
                      <strong>
                        {canUseTeam && profile.team?.enabled ? "Włączony" : "Wyłączony"}
                      </strong>

                      <span>
                        {canUseTeam && profile.team?.enabled
                          ? profile.team?.assignmentMode === "user-pick"
                            ? "Klient wybiera pracownika podczas rezerwacji."
                            : "System automatycznie przydziela pracownika."
                          : "Obsługa zespołu nie jest aktywna."}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* GODZINY PRACY */}
            <div className={styles.offerPanel}>
              <div className={styles.offerPanelHead}>
                <div className={styles.offerIcon}>
                  <FaClock />
                </div>

                <div>
                  <strong>Godziny pracy</strong>
                  <span>Zakres godzin wykorzystywany przy dostępności.</span>
                </div>
              </div>

              {isEditing ? (
                <div className={styles.timeGrid}>
                  <label className={styles.modernField}>
                    <span>Od</span>
                    <input
                      type="time"
                      className={styles.formInput}
                      value={editData.workingHours?.from || ""}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          workingHours: {
                            ...(prev.workingHours || {}),
                            from: e.target.value,
                          },
                        }))
                      }
                    />
                  </label>

                  <label className={styles.modernField}>
                    <span>Do</span>
                    <input
                      type="time"
                      className={styles.formInput}
                      value={editData.workingHours?.to || ""}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          workingHours: {
                            ...(prev.workingHours || {}),
                            to: e.target.value,
                          },
                        }))
                      }
                    />
                  </label>
                </div>
              ) : (
                <div className={styles.timeView}>
                  <div>
                    <span>od</span>
                    <strong>{profile.workingHours?.from || "—"}</strong>
                  </div>

                  <div>
                    <span>do</span>
                    <strong>{profile.workingHours?.to || "—"}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* DNI PRACY */}
            <div className={styles.offerPanel}>
              <div className={styles.offerPanelHead}>
                <div className={styles.offerIcon}>
                  <FaCalendarAlt />
                </div>

                <div>
                  <strong>Dni pracy</strong>
                  <span>Wybierz dni, w których zwykle przyjmujesz klientów.</span>
                </div>
              </div>

              {isEditing ? (
                <div className={styles.daysModernGrid}>
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                    const checked = editData.workingDays?.includes(d) ?? false;
                    const label = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"][d];

                    return (
                      <button
                        type="button"
                        key={d}
                        className={`${styles.dayModernBtn} ${checked ? styles.dayModernActive : ""
                          }`}
                        onClick={() =>
                          setEditData((prev) => {
                            const current = prev.workingDays || [];
                            const days = current.includes(d)
                              ? current.filter((x) => x !== d)
                              : [...current, d];

                            return {
                              ...prev,
                              workingDays: days,
                            };
                          })
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.daysModernView}>
                  {profile.workingDays?.length ? (
                    profile.workingDays
                      .slice()
                      .sort((a, b) => a - b)
                      .map((d) => (
                        <span key={d}>
                          {["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"][d]}
                        </span>
                      ))
                  ) : (
                    <p>Brak danych</p>
                  )}
                </div>
              )}
            </div>

            {/* USŁUGI */}
            <div className={`${styles.offerPanel} ${styles.servicesPanel}`}>
              <div className={styles.offerPanelHead}>
                <div className={styles.offerIcon}>
                  <FaTools />
                </div>

                <div>
                  <strong>Usługi</strong>
                  <span>
                    Dodaj konkretne usługi, ich czas trwania i sposób wyceny.
                  </span>
                </div>
              </div>

              {isEditing ? (
                <>
                  <div className={styles.servicesEditList}>
                    {(editData.services || []).length ? (
                      (editData.services || []).map((s, i) => (
                        <div key={s._id || i} className={styles.serviceModernEdit}>
                          <div className={styles.serviceModernTop}>
                            <div>
                              <span>Usługa #{i + 1}</span>
                              <strong>{s.name || "Nowa usługa"}</strong>
                            </div>

                            <button
                              type="button"
                              className={styles.serviceRemoveBtn}
                              onClick={() =>
                                setEditData((prev) => ({
                                  ...prev,
                                  services: (prev.services || []).filter(
                                    (_, idx) => idx !== i
                                  ),
                                }))
                              }
                            >
                              <FaTrash />
                            </button>
                          </div>

                          <div className={styles.serviceImageEditor}>
                            <div className={styles.serviceImagePreview}>
                              {getServiceImageUrl(s) ? (
                                <img src={getServiceImageUrl(s)} alt={s.name || "Zdjęcie usługi"} />
                              ) : (
                                <div className={styles.serviceImageEmpty}>
                                  <FaTools />
                                  <span>Brak zdjęcia</span>
                                </div>
                              )}

                              {s.featured && (
                                <span className={styles.serviceImageBadge}>Wyróżniona</span>
                              )}
                            </div>

                            <div className={styles.serviceImageActions}>
                              {s._id ? (
                                <>
                                  <label className={styles.fileBtn}>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      disabled={serviceImageUploadingIds.includes(s._id)}
                                      onChange={(e) => handleServiceImageChange(e, s._id)}
                                    />

                                    {serviceImageUploadingIds.includes(s._id)
                                      ? "Wgrywanie..."
                                      : getServiceImageUrl(s)
                                        ? "Zmień zdjęcie"
                                        : "Dodaj zdjęcie"}
                                  </label>

                                  {getServiceImageUrl(s) && (
                                    <button
                                      type="button"
                                      className={styles.danger}
                                      disabled={serviceImageUploadingIds.includes(s._id)}
                                      onClick={() => handleRemoveServiceImage(s._id)}
                                    >
                                      Usuń zdjęcie
                                    </button>
                                  )}
                                </>
                              ) : (
                                <div className={styles.infoMuted}>
                                  Zdjęcie będzie można dodać po zapisaniu tej nowej usługi.
                                </div>
                              )}
                            </div>
                          </div>

                          <div className={styles.serviceEditGrid}>
                            <label className={styles.modernField}>
                              <span>Nazwa usługi</span>

                              <input
                                type="text"
                                className={styles.formInput}
                                value={s.name || ""}
                                maxLength={SERVICE_NAME_MAX_LENGTH}
                                onChange={(e) =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    services: (prev.services || []).map((item, idx) =>
                                      idx === i
                                        ? {
                                          ...item,
                                          name: cleanServiceText(e.target.value, SERVICE_NAME_MAX_LENGTH),
                                        }
                                        : item
                                    ),
                                  }))
                                }
                                placeholder="Np. Strzyżenie męskie"
                              />

                              <small className={styles.fieldCounter}>
                                {(s.name || "").length}/{SERVICE_NAME_MAX_LENGTH}
                              </small>
                            </label>

                            <label className={styles.modernField}>
                              <span>Krótki opis</span>

                              <textarea
                                className={styles.formTextarea}
                                value={s.shortDescription || ""}
                                maxLength={SERVICE_SHORT_DESCRIPTION_MAX_LENGTH}
                                onChange={(e) =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    services: (prev.services || []).map((item, idx) =>
                                      idx === i
                                        ? {
                                          ...item,
                                          shortDescription: cleanServiceText(
                                            e.target.value,
                                            SERVICE_SHORT_DESCRIPTION_MAX_LENGTH
                                          ),
                                        }
                                        : item
                                    ),
                                  }))
                                }
                                placeholder="Np. szybka rozmowa i wycena"
                              />

                              <small className={styles.fieldCounter}>
                                {(s.shortDescription || "").length}/{SERVICE_SHORT_DESCRIPTION_MAX_LENGTH}
                              </small>
                            </label>

                            <label className={styles.modernField}>
                              <span>Kategoria</span>
                              <select
                                className={styles.formInput}
                                value={s.category || "service"}
                                onChange={(e) =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    services: (prev.services || []).map((item, idx) =>
                                      idx === i
                                        ? { ...item, category: e.target.value }
                                        : item
                                    ),
                                  }))
                                }
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
                            </label>

                            <label className={styles.featuredSwitch}>
                              <input
                                type="checkbox"
                                checked={!!s.featured}
                                onChange={(e) =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    services: (prev.services || []).map((item, idx) =>
                                      idx === i
                                        ? { ...item, featured: e.target.checked }
                                        : item
                                    ),
                                  }))
                                }
                              />

                              <span>
                                <strong>Wyróżniona</strong>
                                <small>Mocniej pokazana na profilu.</small>
                              </span>
                            </label>

                            <label className={styles.featuredSwitch}>
                              <input
                                type="checkbox"
                                checked={s.isActive !== false}
                                onChange={(e) =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    services: (prev.services || []).map((item, idx) =>
                                      idx === i
                                        ? { ...item, isActive: e.target.checked }
                                        : item
                                    ),
                                  }))
                                }
                              />

                              <span>
                                <strong>Aktywna</strong>
                                <small>Widoczna publicznie.</small>
                              </span>
                            </label>

                            <label className={styles.modernField}>
                              <span>Czas</span>

                              <input
                                type="number"
                                className={styles.formInput}
                                value={s.duration?.value ?? ""}
                                inputMode="numeric"
                                min={SERVICE_DURATION_LIMITS[s.duration?.unit || "minutes"]?.min || 1}
                                max={SERVICE_DURATION_LIMITS[s.duration?.unit || "minutes"]?.max || 999}
                                onChange={(e) =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    services: (prev.services || []).map((item, idx) =>
                                      idx === i
                                        ? {
                                          ...item,
                                          duration: {
                                            ...(item.duration || {}),
                                            value: cleanIntegerInput(e.target.value, 4),
                                          },
                                        }
                                        : item
                                    ),
                                  }))
                                }
                                placeholder="Np. 60"
                              />

                              <small className={styles.fieldCounter}>
                                Dostępny zakres: {getDurationLimitText(s.duration?.unit || "minutes")}
                              </small>
                            </label>

                            <label className={styles.modernField}>
                              <span>Jednostka</span>
                              <select
                                className={styles.formInput}
                                value={s.duration?.unit || "minutes"}
                                onChange={(e) =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    services: (prev.services || []).map((item, idx) =>
                                      idx === i
                                        ? {
                                          ...item,
                                          duration: {
                                            ...(item.duration || {}),
                                            unit: e.target.value,
                                          },
                                        }
                                        : item
                                    ),
                                  }))
                                }
                              >
                                <option value="minutes">minuty</option>
                                <option value="hours">godziny</option>
                                <option value="days">dni</option>
                                <option value="weeks">tygodnie</option>
                              </select>
                            </label>

                            <label className={styles.modernField}>
                              <span>Typ ceny</span>
                              <select
                                className={styles.formInput}
                                value={s.price?.mode || "contact"}
                                onChange={(e) =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    services: (prev.services || []).map((item, idx) =>
                                      idx === i
                                        ? {
                                          ...item,
                                          price: {
                                            ...(item.price || {}),
                                            mode: e.target.value,
                                          },
                                        }
                                        : item
                                    ),
                                  }))
                                }
                              >
                                <option value="contact">Wycena indywidualna</option>
                                <option value="fixed">Cena stała</option>
                                <option value="from">Cena od</option>
                                <option value="range">Zakres cen</option>
                                <option value="free">Darmowe</option>
                              </select>
                            </label>

                            {s.price?.mode === "fixed" && (
                              <label className={styles.modernField}>
                                <span>Kwota</span>
                                <input
                                  type="number"
                                  className={styles.formInput}
                                  value={s.price?.amount ?? ""}
                                  onChange={(e) =>
                                    setEditData((prev) => ({
                                      ...prev,
                                      services: (prev.services || []).map((item, idx) =>
                                        idx === i
                                          ? {
                                            ...item,
                                            price: {
                                              ...(item.price || {}),
                                              amount: e.target.value,
                                            },
                                          }
                                          : item
                                      ),
                                    }))
                                  }
                                  placeholder="Np. 200"
                                />
                              </label>
                            )}

                            {s.price?.mode === "from" && (
                              <label className={styles.modernField}>
                                <span>Cena od</span>
                                <input
                                  type="number"
                                  className={styles.formInput}
                                  value={s.price?.from ?? ""}
                                  onChange={(e) =>
                                    setEditData((prev) => ({
                                      ...prev,
                                      services: (prev.services || []).map((item, idx) =>
                                        idx === i
                                          ? {
                                            ...item,
                                            price: {
                                              ...(item.price || {}),
                                              from: e.target.value,
                                            },
                                          }
                                          : item
                                      ),
                                    }))
                                  }
                                  placeholder="Np. 150"
                                />
                              </label>
                            )}

                            {s.price?.mode === "range" && (
                              <>
                                <label className={styles.modernField}>
                                  <span>Cena od</span>
                                  <input
                                    type="number"
                                    className={styles.formInput}
                                    value={s.price?.from ?? ""}
                                    onChange={(e) =>
                                      setEditData((prev) => ({
                                        ...prev,
                                        services: (prev.services || []).map((item, idx) =>
                                          idx === i
                                            ? {
                                              ...item,
                                              price: {
                                                ...(item.price || {}),
                                                from: e.target.value,
                                              },
                                            }
                                            : item
                                        ),
                                      }))
                                    }
                                    placeholder="Np. 150"
                                  />
                                </label>

                                <label className={styles.modernField}>
                                  <span>Cena do</span>
                                  <input
                                    type="number"
                                    className={styles.formInput}
                                    value={s.price?.to ?? ""}
                                    onChange={(e) =>
                                      setEditData((prev) => ({
                                        ...prev,
                                        services: (prev.services || []).map((item, idx) =>
                                          idx === i
                                            ? {
                                              ...item,
                                              price: {
                                                ...(item.price || {}),
                                                to: e.target.value,
                                              },
                                            }
                                            : item
                                        ),
                                      }))
                                    }
                                    placeholder="Np. 500"
                                  />
                                </label>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={styles.offerEmpty}>
                        <FaTools />
                        <strong>Nie masz jeszcze dodanych usług</strong>
                        <span>
                          Dodaj pierwszą usługę, żeby klient od razu widział, co oferujesz.
                        </span>
                      </div>
                    )}
                  </div>

                  {formErrors.services && (
                    <small className={styles.error}>{formErrors.services}</small>
                  )}

                  <div className={styles.addServicePanel}>
                    <div className={styles.addServiceHead}>
                      <strong>Dodaj nową usługę</strong>
                      <span>
                        {editData.services?.length || 0}/{MAX_SERVICES} usług w obecnym planie
                      </span>
                    </div>

                    <div className={styles.addServiceGrid}>
                      <label className={styles.modernField}>
                        <span>Nazwa usługi</span>
                        <input
                          type="text"
                          className={styles.formInput}
                          value={newService.name}
                          maxLength={SERVICE_NAME_MAX_LENGTH}
                          onChange={(e) =>
                            setNewService((prev) => ({
                              ...prev,
                              name: cleanServiceText(e.target.value, SERVICE_NAME_MAX_LENGTH),
                            }))
                          }
                          placeholder="Np. Strzyżenie męskie"
                        />

                        <small className={styles.counter}>
                          {newService.name.length}/{SERVICE_NAME_MAX_LENGTH}
                        </small>
                      </label>

                      <label className={styles.modernField}>
                        <span>Krótki opis</span>
                        <textarea
                          className={styles.formTextarea}
                          value={newService.shortDescription}
                          maxLength={SERVICE_SHORT_DESCRIPTION_MAX_LENGTH}
                          onChange={(e) =>
                            setNewService((prev) => ({
                              ...prev,
                              shortDescription: cleanServiceText(
                                e.target.value,
                                SERVICE_SHORT_DESCRIPTION_MAX_LENGTH
                              ),
                            }))
                          }
                          placeholder="Np. szybka rozmowa i wycena"
                        />

                        <small className={styles.counter}>
                          {newService.shortDescription.length}/{SERVICE_SHORT_DESCRIPTION_MAX_LENGTH}
                        </small>
                      </label>

                      <label className={styles.modernField}>
                        <span>Kategoria</span>
                        <select
                          className={styles.formInput}
                          value={newService.category}
                          onChange={(e) =>
                            setNewService((prev) => ({
                              ...prev,
                              category: e.target.value,
                            }))
                          }
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
                      </label>

                      <label className={styles.modernField}>
                        <span>Czas</span>
                        <input
                          type="number"
                          className={styles.formInput}
                          value={newService.durationValue}
                          inputMode="numeric"
                          min={SERVICE_DURATION_LIMITS[newService.durationUnit]?.min || 1}
                          max={SERVICE_DURATION_LIMITS[newService.durationUnit]?.max || 999}
                          onChange={(e) =>
                            setNewService((prev) => ({
                              ...prev,
                              durationValue: cleanIntegerInput(e.target.value, 4),
                            }))
                          }
                          placeholder="Np. 60"
                        />
                      </label>

                      <label className={styles.modernField}>
                        <span>Jednostka czasu</span>
                        <select
                          className={styles.formInput}
                          value={newService.durationUnit}
                          onChange={(e) =>
                            setNewService((prev) => ({
                              ...prev,
                              durationUnit: e.target.value,
                            }))
                          }
                        >
                          <option value="minutes">minuty</option>
                          <option value="hours">godziny</option>
                          <option value="days">dni</option>
                          <option value="weeks">tygodnie</option>
                        </select>
                      </label>

                      <label className={styles.modernField}>
                        <span>Typ ceny</span>
                        <select
                          className={styles.formInput}
                          value={newService.priceMode}
                          onChange={(e) =>
                            setNewService((prev) => ({
                              ...prev,
                              priceMode: e.target.value,
                              priceValue: '',
                              priceFrom: '',
                              priceTo: '',
                            }))
                          }
                        >
                          <option value="contact">Wycena indywidualna</option>
                          <option value="fixed">Cena stała</option>
                          <option value="from">Cena od</option>
                          <option value="range">Zakres cen</option>
                          <option value="free">Darmowe</option>
                        </select>
                      </label>

                      {['fixed', 'from'].includes(newService.priceMode) && (
                        <label className={styles.modernField}>
                          <span>
                            {newService.priceMode === 'fixed' ? 'Cena stała' : 'Cena od'}
                          </span>

                          <input
                            type="number"
                            className={styles.formInput}
                            value={newService.priceValue}
                            inputMode="numeric"
                            min="0"
                            max={SERVICE_PRICE_MAX}
                            onChange={(e) =>
                              setNewService((prev) => ({
                                ...prev,
                                priceValue: cleanIntegerInput(e.target.value, 7),
                              }))
                            }
                            placeholder="Np. 150"
                          />

                          <small className={styles.fieldCounter}>
                            Dostępny zakres: 0–{SERVICE_PRICE_MAX} zł
                          </small>
                        </label>
                      )}
                      {newService.priceMode === 'range' && (
                        <>
                          <label className={styles.modernField}>
                            <span>Cena od</span>

                            <input
                              type="number"
                              className={styles.formInput}
                              value={newService.priceFrom}
                              inputMode="numeric"
                              min="0"
                              max={SERVICE_PRICE_MAX}
                              onChange={(e) =>
                                setNewService((prev) => ({
                                  ...prev,
                                  priceFrom: cleanIntegerInput(e.target.value, 7),
                                }))
                              }
                              placeholder="Od"
                            />

                            <small className={styles.fieldCounter}>
                              Dostępny zakres: 0–{SERVICE_PRICE_MAX} zł
                            </small>
                          </label>

                          <label className={styles.modernField}>
                            <span>Cena do</span>

                            <input
                              type="number"
                              className={styles.formInput}
                              value={newService.priceTo}
                              inputMode="numeric"
                              min="0"
                              max={SERVICE_PRICE_MAX}
                              onChange={(e) =>
                                setNewService((prev) => ({
                                  ...prev,
                                  priceTo: cleanIntegerInput(e.target.value, 7),
                                }))
                              }
                              placeholder="Do"
                            />

                            <small className={styles.fieldCounter}>
                              Dostępny zakres: 0–{SERVICE_PRICE_MAX} zł
                            </small>
                          </label>
                        </>
                      )}

                      <label className={styles.featuredSwitch}>
                        <input
                          type="checkbox"
                          checked={!!newService.featured}
                          onChange={(e) =>
                            setNewService((prev) => ({
                              ...prev,
                              featured: e.target.checked,
                            }))
                          }
                        />

                        <span>
                          <strong>Wyróżniona usługa</strong>
                          <small>Będzie mocniej zaakcentowana na profilu.</small>
                        </span>
                      </label>

                      <label className={styles.featuredSwitch}>
                        <input
                          type="checkbox"
                          checked={!!newService.isActive}
                          onChange={(e) =>
                            setNewService((prev) => ({
                              ...prev,
                              isActive: e.target.checked,
                            }))
                          }
                        />

                        <span>
                          <strong>Aktywna</strong>
                          <small>Usługa będzie widoczna publicznie.</small>
                        </span>
                      </label>
                    </div>

                    <button
                      type="button"
                      className={styles.primary}
                      onClick={handleAddEditableService}
                      disabled={(editData.services || []).length >= MAX_SERVICES}
                    >
                      <FaPlus /> Dodaj usługę
                    </button>
                  </div>
                </>
              ) : (
                <div className={styles.servicesViewGrid}>
                  {profile.services?.length ? (
                    profile.services.map((service, index) => (
                      <article
                        key={service._id || index}
                        className={`${styles.serviceModernView} ${service.featured ? styles.serviceModernFeatured : ""
                          }`}
                      >
                        <div className={styles.serviceModernMedia}>
                          {getServiceImageUrl(service) ? (
                            <img src={getServiceImageUrl(service)} alt={service.name || "Usługa"} />
                          ) : (
                            <FaTools />
                          )}
                        </div>

                        <div>
                          <div className={styles.serviceBadges}>
                            <span>{mapServiceCategory(service.category)}</span>

                            {service.featured && (
                              <span className={styles.featuredBadge}>Wyróżniona</span>
                            )}

                            {service.isActive === false && (
                              <span className={styles.inactiveBadge}>Ukryta</span>
                            )}
                          </div>

                          <strong>{service.name}</strong>

                          {service.shortDescription && (
                            <p>{service.shortDescription}</p>
                          )}

                          <div className={styles.serviceMetaRow}>
                            <span>
                              {service.duration?.value
                                ? `${service.duration.value} ${mapUnit(service.duration.unit)}`
                                : "czas do ustalenia"}
                            </span>

                            <span>{formatServicePrice(service)}</span>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className={styles.offerEmpty}>
                      <FaTools />
                      <strong>Brak usług</strong>
                      <span>Nie dodano jeszcze usług do profilu.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* TERMINY DOSTĘPNOŚCI */}
            <div className={`${styles.offerPanel} ${styles.datesPanel}`}>
              <div className={styles.offerPanelHead}>
                <div className={styles.offerIcon}>
                  <FaCalendarAlt />
                </div>

                <div>
                  <strong>Terminy dostępności</strong>
                  <span>Ręczne terminy, które możesz pokazać na profilu.</span>
                </div>
              </div>

              {isEditing ? (
                <>
                  <label className={styles.switchRow}>
                    <input
                      type="checkbox"
                      checked={!!editData.showAvailableDates}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          showAvailableDates: e.target.checked,
                        })
                      }
                    />

                    <span>
                      <strong>Pokazuj dostępne dni i terminy w profilu</strong>
                      <small>
                        Gdy wyłączone, klienci nadal mogą wysłać wiadomość.
                      </small>
                    </span>
                  </label>

                  {!editData.showAvailableDates ? (
                    <div className={styles.infoMuted}>
                      Twój profil nie pokazuje dostępnych terminów — klienci mogą tylko
                      napisać wiadomość.
                    </div>
                  ) : (
                    <>
                      <div className={styles.availableDatesForm}>
                        <input
                          type="date"
                          className={styles.formInput}
                          value={newAvailableDate.date}
                          onChange={(e) =>
                            setNewAvailableDate((prev) => ({
                              ...prev,
                              date: e.target.value,
                            }))
                          }
                        />

                        <input
                          type="time"
                          className={styles.formInput}
                          value={newAvailableDate.from}
                          onChange={(e) =>
                            setNewAvailableDate((prev) => ({
                              ...prev,
                              from: e.target.value,
                            }))
                          }
                        />

                        <input
                          type="time"
                          className={styles.formInput}
                          value={newAvailableDate.to}
                          onChange={(e) =>
                            setNewAvailableDate((prev) => ({
                              ...prev,
                              to: e.target.value,
                            }))
                          }
                        />

                        <button
                          type="button"
                          className={styles.primary}
                          onClick={() => {
                            if (!newAvailableDate.date) {
                              showAlert("Wybierz datę terminu.", "warning");
                              return;
                            }

                            setEditData((prev) => ({
                              ...prev,
                              availableDates: [
                                ...(prev.availableDates || []),
                                newAvailableDate,
                              ],
                            }));

                            setNewAvailableDate({ date: "", from: "", to: "" });
                          }}
                        >
                          <FaPlus /> Dodaj termin
                        </button>
                      </div>

                      <div className={styles.datesModernList}>
                        {(editData.availableDates || []).length ? (
                          editData.availableDates.map((dateItem, index) => (
                            <div key={index} className={styles.dateModernItem}>
                              <div>
                                <strong>{dateItem.date}</strong>
                                <span>
                                  {dateItem.from || "—"} - {dateItem.to || "—"}
                                </span>
                              </div>

                              <button
                                type="button"
                                className={styles.serviceRemoveBtn}
                                onClick={() =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    availableDates: (prev.availableDates || []).filter(
                                      (_, i) => i !== index
                                    ),
                                  }))
                                }
                              >
                                <FaTrash />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className={styles.infoMuted}>
                            Nie dodano jeszcze żadnych terminów.
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className={styles.datesModernList}>
                  {profile.showAvailableDates && profile.availableDates?.length ? (
                    profile.availableDates.map((dateItem, index) => (
                      <div key={index} className={styles.dateModernItem}>
                        <div>
                          <strong>{dateItem.date}</strong>
                          <span>
                            {dateItem.from || "—"} - {dateItem.to || "—"}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.infoMuted}>
                      Terminy dostępności nie są obecnie pokazywane.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =========================
  PRACOWNICY
========================= */}
        <section className={`${styles.card} ${styles.staffCard}`} id="staffSection">
          <div className={styles.cardGlow} aria-hidden="true" />

          <div className={styles.sectionTop}>
            <div>
              <span className={styles.sectionKicker}>Zespół</span>

              <h3 className={styles.sectionTitle}>Pracownicy</h3>

              <p className={styles.sectionLead}>
                Dodawaj członków zespołu, przypisuj im usługi i zarządzaj ich dostępnością w rezerwacjach.
              </p>
            </div>

            <div className={styles.sectionBadge}>
              <FaUsers />
              <span>{canUseTeam ? "Premium" : "Zablokowane"}</span>
            </div>
          </div>

          <div className={styles.staffBody}>
            {!canUseTeam && (
              <div className={styles.upgradeNotice}>
                <strong>Pracownicy są dostępni tylko w planie Premium.</strong>
                <span>
                  W planie Starter i Standard możesz prowadzić profil jako jedna osoba.
                  Po przejściu na Premium odblokujesz dodawanie pracowników, przypisywanie usług,
                  pojemność rezerwacji i wybór pracownika przez klienta.
                </span>

                {isEditing && (
                  <button
                    type="button"
                    className={styles.planButton}
                    onClick={() => handleStartSubscription("premium")}
                    disabled={billingActionLoading === "premium"}
                  >
                    {billingActionLoading === "premium"
                      ? "Przekierowanie..."
                      : "Odblokuj w Premium"}
                  </button>
                )}
              </div>
            )}

            <div className={styles.staffStatsGrid}>
              <div className={styles.staffStatCard}>
                <strong>{staff?.length || 0}</strong>
                <span>pracowników</span>
              </div>

              <div className={styles.staffStatCard}>
                <strong>
                  {(staff || []).filter((person) => person.active !== false).length}
                </strong>
                <span>aktywnych</span>
              </div>

              <div className={styles.staffStatCard}>
                <strong>
                  {(staff || []).reduce(
                    (sum, person) => sum + Number(person.capacity || 1),
                    0
                  )}
                </strong>
                <span>łączna pojemność</span>
              </div>
            </div>

            {/* Lista pracowników */}
            {staffLoading ? (
              <div className={styles.staffLoadingBox}>
                Ładowanie pracowników…
              </div>
            ) : staff.length ? (
              <div className={`${styles.staffGrid} ${!canUseTeam ? styles.lockedSection : ""}`}>
                {staff.map((st) => {
                  const edit = staffEdits[st._id] || st;
                  const services = editData.services || [];
                  const selected = new Set((edit?.serviceIds || []).map(String));
                  const initials = String(edit.name || st.name || "P")
                    .trim()
                    .slice(0, 1)
                    .toUpperCase();

                  return (
                    <article key={st._id} className={styles.staffPersonCard}>
                      <div className={styles.staffPersonTop}>
                        <div className={styles.staffAvatar}>
                          <span>{initials}</span>
                        </div>

                        <div className={styles.staffPersonMain}>
                          <span className={styles.staffId}>#{String(st._id).slice(-5)}</span>

                          {isEditing && canUseTeam ? (
                            <input
                              className={styles.formInput}
                              value={edit.name ?? ""}
                              onChange={(e) =>
                                setStaffEdits((prev) => ({
                                  ...prev,
                                  [st._id]: { ...edit, name: e.target.value },
                                }))
                              }
                              placeholder="Imię i nazwisko"
                            />
                          ) : (
                            <strong>{st.name}</strong>
                          )}
                        </div>

                        {!isEditing && (
                          <span
                            className={`${styles.statusPill} ${st.active ? styles.statusActive : styles.statusInactive
                              }`}
                          >
                            {st.active ? "Aktywny" : "Nieaktywny"}
                          </span>
                        )}
                      </div>

                      <div className={styles.staffDetailsGrid}>
                        <div className={styles.staffDetailBox}>
                          <span>Status</span>

                          {isEditing && canUseTeam ? (
                            <label className={styles.staffSwitch}>
                              <input
                                type="checkbox"
                                checked={!!(edit.active ?? true)}
                                onChange={(e) =>
                                  setStaffEdits((prev) => ({
                                    ...prev,
                                    [st._id]: { ...edit, active: e.target.checked },
                                  }))
                                }
                              />
                              <strong>{edit.active !== false ? "Aktywny" : "Nieaktywny"}</strong>
                            </label>
                          ) : (
                            <strong>{st.active ? "Aktywny" : "Nieaktywny"}</strong>
                          )}
                        </div>

                        <div className={styles.staffDetailBox}>
                          <span>Pojemność</span>

                          {isEditing && canUseTeam ? (
                            <input
                              type="number"
                              min={1}
                              className={styles.formInput}
                              value={edit.capacity ?? 1}
                              onChange={(e) =>
                                setStaffEdits((prev) => ({
                                  ...prev,
                                  [st._id]: {
                                    ...edit,
                                    capacity: Math.max(
                                      1,
                                      parseInt(e.target.value || "1", 10)
                                    ),
                                  },
                                }))
                              }
                            />
                          ) : (
                            <strong>{st.capacity || 1}</strong>
                          )}
                        </div>
                      </div>

                      <div className={styles.staffServicesBox}>
                        <div className={styles.staffMiniTitle}>
                          <FaTools />
                          <span>Przypisane usługi</span>
                        </div>

                        {isEditing && canUseTeam ? (
                          services.length ? (
                            <div className={styles.staffServicePicker}>
                              {services.map((service) => {
                                const serviceId = String(service._id);
                                const checked = selected.has(serviceId);

                                return (
                                  <label
                                    key={service._id}
                                    className={`${styles.staffServiceChip} ${checked ? styles.staffServiceChipActive : ""
                                      }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => {
                                        const next = new Set(selected);

                                        if (e.target.checked) {
                                          next.add(serviceId);
                                        } else {
                                          next.delete(serviceId);
                                        }

                                        setStaffEdits((prev) => ({
                                          ...prev,
                                          [st._id]: {
                                            ...edit,
                                            serviceIds: Array.from(next),
                                          },
                                        }));
                                      }}
                                    />

                                    <span>{service.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <div className={styles.infoMuted}>
                              Najpierw dodaj usługi w sekcji wyżej.
                            </div>
                          )
                        ) : (st.serviceIds || []).length ? (
                          <div className={styles.staffServiceTags}>
                            {(st.serviceIds || []).map((id) => {
                              const service = services.find(
                                (s) => String(s._id) === String(id)
                              );

                              return service ? (
                                <span key={id}>{service.name}</span>
                              ) : null;
                            })}
                          </div>
                        ) : (
                          <div className={styles.infoMuted}>
                            Brak przypisanych usług.
                          </div>
                        )}
                      </div>

                      {isEditing && canUseTeam && (
                        <div className={styles.staffActions}>
                          <LoadingButton
                            type="button"
                            isLoading={deletingStaffIds.includes(st._id)}
                            disabled={deletingStaffIds.includes(st._id)}
                            className={styles.danger}
                            onClick={() => deleteStaff(st._id)}
                          >
                            <FaTrash /> Usuń
                          </LoadingButton>

                          {staffEdits[st._id] && (
                            <button
                              type="button"
                              className={styles.secondary}
                              onClick={() =>
                                setStaffEdits((prev) => {
                                  const copy = { ...prev };
                                  delete copy[st._id];
                                  return copy;
                                })
                              }
                            >
                              <FaTimes /> Cofnij zmiany
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={styles.staffEmpty}>
                <div className={styles.emptyIcon}>
                  <FaUsers />
                </div>

                <strong>
                  {canUseTeam
                    ? "Nie dodałeś/aś jeszcze żadnych pracowników"
                    : "Pracownicy są zablokowani w obecnym planie"}
                </strong>

                <p>
                  {canUseTeam
                    ? "Dodaj pierwszą osobę do zespołu i przypisz jej usługi, które może obsługiwać."
                    : "Przejdź na Premium, aby zarządzać zespołem i rezerwacjami dla wielu osób."}
                </p>
              </div>
            )}

            {/* Dodawanie pracownika */}
            {isEditing ? (
              canUseTeam ? (
                <div className={styles.addStaffPanel}>
                  <div className={styles.addStaffHead}>
                    <div>
                      <strong>Dodaj pracownika</strong>
                      <span>
                        Nowa osoba będzie mogła obsługiwać wybrane usługi w systemie rezerwacji.
                      </span>
                    </div>

                    <FaPlus />
                  </div>

                  <div className={styles.addStaffGrid}>
                    <label className={styles.modernField}>
                      <span>Imię i nazwisko</span>
                      <input
                        type="text"
                        className={styles.formInput}
                        placeholder="Np. Anna Kowalska"
                        value={newStaff.name}
                        onChange={(e) =>
                          setNewStaff((prev) => ({ ...prev, name: e.target.value }))
                        }
                      />
                    </label>

                    <label className={styles.modernField}>
                      <span>Pojemność</span>
                      <input
                        type="number"
                        className={styles.formInput}
                        min={1}
                        placeholder="Ile rezerwacji równolegle"
                        value={newStaff.capacity}
                        onChange={(e) =>
                          setNewStaff((prev) => ({
                            ...prev,
                            capacity: Math.max(
                              1,
                              parseInt(e.target.value || "1", 10)
                            ),
                          }))
                        }
                      />
                    </label>

                    <label className={styles.featuredSwitch}>
                      <input
                        type="checkbox"
                        checked={newStaff.active}
                        onChange={(e) =>
                          setNewStaff((prev) => ({
                            ...prev,
                            active: e.target.checked,
                          }))
                        }
                      />

                      <span>
                        <strong>Aktywny</strong>
                        <small>Pracownik będzie dostępny w rezerwacjach.</small>
                      </span>
                    </label>
                  </div>

                  <div className={styles.staffServicesBox}>
                    <div className={styles.staffMiniTitle}>
                      <FaTools />
                      <span>Usługi dla nowego pracownika</span>
                    </div>

                    {(editData.services || []).length ? (
                      <div className={styles.staffServicePicker}>
                        {(editData.services || []).map((service) => {
                          const serviceId = String(service._id);
                          const checked = (newStaff.serviceIds || [])
                            .map(String)
                            .includes(serviceId);

                          return (
                            <label
                              key={service._id}
                              className={`${styles.staffServiceChip} ${checked ? styles.staffServiceChipActive : ""
                                }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) =>
                                  setNewStaff((prev) => {
                                    const current = (prev.serviceIds || []).map(String);

                                    return {
                                      ...prev,
                                      serviceIds: e.target.checked
                                        ? [...new Set([...current, serviceId])]
                                        : current.filter((id) => id !== serviceId),
                                    };
                                  })
                                }
                              />

                              <span>{service.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={styles.infoMuted}>
                        Najpierw dodaj usługi w sekcji wyżej.
                      </div>
                    )}
                  </div>

                  <LoadingButton
                    type="button"
                    isLoading={isCreatingStaff}
                    disabled={isCreatingStaff}
                    className={styles.primary}
                    onClick={createStaff}
                  >
                    <FaPlus /> Dodaj pracownika
                  </LoadingButton>
                </div>
              ) : (
                <div className={styles.lockedFeatureBox}>
                  <div>
                    <strong>Dodawanie pracowników jest zablokowane.</strong>
                    <span>
                      Ta funkcja wymaga planu Premium, ponieważ działa razem z kalendarzem,
                      przypisywaniem usług i obsługą rezerwacji zespołowych.
                    </span>
                  </div>

                  <button
                    type="button"
                    className={styles.planButton}
                    onClick={() => handleStartSubscription("premium")}
                    disabled={billingActionLoading === "premium"}
                  >
                    {billingActionLoading === "premium"
                      ? "Przekierowanie..."
                      : "Odblokuj w Premium"}
                  </button>
                </div>
              )
            ) : (
              <div className={styles.infoMuted}>
                {canUseTeam ? (
                  <>
                    Aby dodać lub edytować pracownika, kliknij <strong>Edytuj profil</strong>.
                  </>
                ) : (
                  <>
                    Sekcja pracowników jest dostępna w planie <strong>Premium</strong>.
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {/* =========================
  Linki i media
========================= */}
        <section className={`${styles.card} ${styles.mediaCard}`}>
          <div className={styles.cardGlow} aria-hidden="true" />

          <div className={styles.sectionTop}>
            <div>
              <span className={styles.sectionKicker}>Widoczność profilu</span>

              <h3 className={styles.sectionTitle}>Linki i media</h3>

              <p className={styles.sectionLead}>
                Dodaj tagi, ważne linki oraz zdjęcia, które najlepiej pokazują Twoją ofertę,
                realizacje lub styl pracy.
              </p>
            </div>

            <div className={styles.sectionBadge}>
              <FaLink />
              <span>Media</span>
            </div>
          </div>

          <div className={styles.mediaBody}>
            {/* TAGI */}
            <div className={styles.mediaPanel}>
              <div className={styles.mediaPanelHead}>
                <div className={styles.mediaIcon}>
                  <FaTags />
                </div>

                <div>
                  <strong>Tagi profilu</strong>
                  <span>Pomagają użytkownikom szybciej zrozumieć, czym się zajmujesz.</span>
                </div>
              </div>

              {isEditing ? (
                <div className={styles.tagEditorGrid}>
                  {[0, 1, 2].map((i) => (
                    <label key={i} className={styles.modernField}>
                      <span>Tag {i + 1}</span>

                      <input
                        type="text"
                        className={styles.formInput}
                        value={editData.tags?.[i] || ""}
                        maxLength={TAG_MAX_LENGTH}
                        placeholder={
                          i === 0
                            ? "Np. grafik"
                            : i === 1
                              ? "Np. logo"
                              : "Np. branding"
                        }
                        onChange={(e) => {
                          const newTags = [...(editData.tags || [])];
                          newTags[i] = cleanTagInput(e.target.value);

                          setEditData((prev) => ({
                            ...prev,
                            tags: newTags.slice(0, TAGS_LIMIT),
                          }));
                        }}
                      />
                      <small className={styles.hint}>
                        {(editData.tags?.[i] || "").length}/{TAG_MAX_LENGTH} znaków
                      </small>
                    </label>
                  ))}

                  {formErrors.tags && (
                    <small className={styles.error}>{formErrors.tags}</small>
                  )}
                </div>
              ) : profile.tags?.length ? (
                <div className={styles.mediaTags}>
                  {profile.tags.map((tag) => (
                    <span key={tag}>{tag.toUpperCase()}</span>
                  ))}
                </div>
              ) : (
                <div className={styles.mediaEmpty}>
                  <FaTags />
                  <strong>Brak tagów</strong>
                  <span>Nie dodałeś/aś jeszcze tagów do profilu.</span>
                </div>
              )}
            </div>

            {/* LINKI */}
            <div className={styles.mediaPanel}>
              <div className={styles.mediaPanelHead}>
                <div className={styles.mediaIcon}>
                  <FaLink />
                </div>

                <div>
                  <strong>Linki zewnętrzne</strong>
                  <span>Dodaj portfolio, stronę www, sklep, kalendarz lub inne ważne miejsce.</span>
                </div>
              </div>

              {isEditing ? (
                <div className={styles.linksEditorGrid}>
                  {Array.from({ length: MAX_LINKS }).map((_, i) => (
                    <label key={i} className={styles.modernField}>
                      <span>Link {i + 1}</span>

                      <input
                        type="text"
                        className={styles.formInput}
                        value={editData.links?.[i] || ""}
                        maxLength={LINK_MAX_LENGTH}
                        placeholder="Np. https://twojastrona.pl"
                        onChange={(e) => {
                          const newLinks = [...(editData.links || [])];
                          newLinks[i] = e.target.value.slice(0, LINK_MAX_LENGTH);

                          setEditData({
                            ...editData,
                            links: newLinks,
                          });
                        }}
                      />
                    </label>
                  ))}

                  {formErrors.links && (
                    <small className={styles.error}>{formErrors.links}</small>
                  )}

                  <small className={styles.hint}>
                    Limit Twojego planu: {MAX_LINKS} linków.
                  </small>
                </div>
              ) : profile.links?.filter(Boolean).length ? (
                <div className={styles.mediaLinksList}>
                  {profile.links.filter(Boolean).map((link, i) => (
                    <a
                      key={i}
                      href={link.startsWith("http") ? link : `https://${link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.mediaLinkCard}
                    >
                      <span className={styles.mediaLinkIcon}>
                        <FaGlobe />
                      </span>

                      <span>
                        <strong>Link {i + 1}</strong>
                        <small>{prettyUrl(link)}</small>
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className={styles.mediaEmpty}>
                  <FaLink />
                  <strong>Brak linków</strong>
                  <span>Nie dodałeś/aś jeszcze żadnego linku.</span>
                </div>
              )}
            </div>

            {/* GALERIA */}
            <div className={`${styles.mediaPanel} ${styles.galleryPanel}`}>
              <div className={styles.mediaPanelHead}>
                <div className={styles.mediaIcon}>
                  <FaBriefcase />
                </div>

                <div>
                  <strong>Galeria zdjęć</strong>
                  <span>
                    Dodaj zdjęcia realizacji, produktów, miejsca pracy albo przykładowych efektów.
                  </span>
                </div>
              </div>

              {!isEditing && (
                <>
                  {(profile?.photos || []).length ? (
                    <div className={styles.mediaGalleryGrid}>
                      {(profile.photos || []).map((p, idx) => (
                        <button
                          key={p.publicId || idx}
                          type="button"
                          className={styles.mediaPhotoItem}
                          onClick={() => openLightbox(getPhotoUrl(p))}
                          aria-label={`Otwórz zdjęcie ${idx + 1}`}
                        >
                          <img src={getPhotoUrl(p)} alt={`Zdjęcie ${idx + 1}`} />
                          <span>Podgląd</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.mediaEmpty}>
                      <FaBriefcase />
                      <strong>Brak zdjęć</strong>
                      <span>Nie dodałeś/aś jeszcze zdjęć w galerii.</span>
                    </div>
                  )}
                </>
              )}

              {isEditing && (
                <div className={styles.mediaGalleryEditor}>
                  <div className={styles.mediaGalleryGrid}>
                    {(editData.photos || []).map((p, idx) => (
                      <div key={p.publicId || idx} className={styles.mediaPhotoItem}>
                        <button
                          type="button"
                          className={styles.mediaPhotoPreview}
                          onClick={() => openLightbox(getPhotoUrl(p))}
                          aria-label={`Otwórz zdjęcie ${idx + 1}`}
                        >
                          <img src={getPhotoUrl(p)} alt={`Zdjęcie ${idx + 1}`} />
                          <span>Podgląd</span>
                        </button>

                        <div className={styles.mediaPhotoActions}>
                          <label className={styles.secondary}>
                            Zamień
                            <input
                              type="file"
                              accept="image/*,.heic,.heif"
                              style={{ display: "none" }}
                              onChange={(e) => handleReplaceSavedPhoto(e, p)}
                            />
                          </label>

                          <button
                            type="button"
                            className={styles.danger}
                            disabled={photosUploading}
                            onClick={() => removeSavedPhoto(p)}
                          >
                            Usuń
                          </button>
                        </div>
                      </div>
                    ))}

                    {newPhotoPreviews.map((url, idx) => (
                      <div key={`pending-${idx}`} className={styles.mediaPhotoItem}>
                        <button
                          type="button"
                          className={styles.mediaPhotoPreview}
                          onClick={() => openLightbox(url)}
                          aria-label={`Otwórz nowe zdjęcie ${idx + 1}`}
                        >
                          <img src={url} alt={`Nowe zdjęcie ${idx + 1}`} />
                          <span>Podgląd</span>
                        </button>

                        <div className={styles.mediaPhotoActions}>
                          <button
                            type="button"
                            className={styles.danger}
                            onClick={() => removePendingPhoto(idx)}
                          >
                            Usuń
                          </button>
                        </div>
                      </div>
                    ))}

                    {(editData.photos?.length || 0) + newPhotoFiles.length < MAX_PHOTOS && (
                      <button
                        type="button"
                        className={styles.addPhotoCard}
                        onClick={openAddPhotoPicker}
                        disabled={
                          (editData.photos?.length || 0) + newPhotoFiles.length >= MAX_PHOTOS
                        }
                      >
                        <FaPlus />
                        <strong>Dodaj zdjęcia</strong>
                        <span>
                          {(editData.photos?.length || 0) + newPhotoFiles.length}/{MAX_PHOTOS}
                        </span>
                      </button>
                    )}
                  </div>

                  <input
                    ref={addPhotoInputRef}
                    type="file"
                    accept="image/*,.heic,.heif"
                    multiple
                    onChange={handleAddPhotosSelect}
                    style={{ display: "none" }}
                  />

                  <div className={styles.mediaGalleryFooter}>
                    <small className={styles.hint}>
                      Limit Twojego planu: {MAX_PHOTOS} zdjęć profilu.
                    </small>

                    {(photosUploading || avatarUploading) && (
                      <span className={styles.uploadInfo}>Trwa upload zdjęć…</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =========================
  Kontakt i social media
========================= */}
        <section className={`${styles.card} ${styles.contactSocialCard}`}>
          <div className={styles.cardGlow} aria-hidden="true" />

          <div className={styles.sectionTop}>
            <div>
              <span className={styles.sectionKicker}>Dane kontaktowe</span>

              <h3 className={styles.sectionTitle}>Kontakt i social media</h3>

              <p className={styles.sectionLead}>
                Uzupełnij dane kontaktowe i miejsca, w których klienci mogą Cię znaleźć
                lub szybko się z Tobą skontaktować.
              </p>
            </div>

            <div className={styles.sectionBadge}>
              <FaEnvelope />
              <span>Kontakt</span>
            </div>
          </div>

          <div className={styles.contactSocialBody}>
            {/* KONTAKT */}
            <div className={styles.contactPanel}>
              <div className={styles.contactPanelHead}>
                <div className={styles.contactIcon}>
                  <FaEnvelope />
                </div>

                <div>
                  <strong>Kontakt</strong>
                  <span>E-mail, telefon oraz adres widoczny na profilu publicznym.</span>
                </div>
              </div>

              {isEditing ? (
                <div className={styles.contactModernGrid}>
                  <label className={styles.modernField}>
                    <span>E-mail</span>

                    <input
                      className={`${styles.formInput} ${formErrors.contactEmail ? styles.inputError : ""
                        }`}
                      value={editData.contact?.email || ""}
                      maxLength={CONTACT_EMAIL_MAX_LENGTH}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          contact: {
                            ...(prev.contact || {}),
                            email: e.target.value.slice(0, CONTACT_EMAIL_MAX_LENGTH),
                          },
                        }))
                      }
                      placeholder="np. kontakt@twojadomena.pl"
                    />

                    {formErrors.contactEmail && (
                      <small className={styles.error}>{formErrors.contactEmail}</small>
                    )}
                  </label>

                  <label className={styles.modernField}>
                    <span>Telefon</span>

                    <input
                      className={`${styles.formInput} ${formErrors.contactPhone ? styles.inputError : ""
                        }`}
                      value={editData.contact?.phone || ""}
                      maxLength={CONTACT_PHONE_MAX_LENGTH}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          contact: {
                            ...(prev.contact || {}),
                            phone: e.target.value.slice(0, CONTACT_PHONE_MAX_LENGTH),
                          },
                        }))
                      }
                      placeholder="np. +48 123 456 789"
                    />

                    {formErrors.contactPhone && (
                      <small className={styles.error}>{formErrors.contactPhone}</small>
                    )}
                  </label>

                  <label className={styles.modernField}>
                    <span>Miejscowość</span>

                    <input
                      className={styles.formInput}
                      value={editData.location || ""}
                      disabled
                      title="Miejscowość edytujesz w sekcji Dane podstawowe"
                    />

                    <small className={styles.hint}>
                      Miejscowość ustawiasz w sekcji „Dane podstawowe”.
                    </small>
                  </label>

                  <label className={styles.modernField}>
                    <span>Kod pocztowy</span>

                    <input
                      className={`${styles.formInput} ${formErrors.contactPostcode ? styles.inputError : ""
                        }`}
                      value={editData.contact?.postcode || ""}
                      maxLength={CONTACT_POSTCODE_MAX_LENGTH}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          contact: {
                            ...(prev.contact || {}),
                            postcode: e.target.value.slice(0, CONTACT_POSTCODE_MAX_LENGTH),
                          },
                        }))
                      }
                      placeholder="np. 64-761"
                    />

                    {formErrors.contactPostcode && (
                      <small className={styles.error}>{formErrors.contactPostcode}</small>
                    )}
                  </label>

                  <label className={`${styles.modernField} ${styles.contactWideField}`}>
                    <span>Ulica / adres</span>

                    <input
                      className={`${styles.formInput} ${formErrors.contactStreet ? styles.inputError : ""
                        }`}
                      value={editData.contact?.street || ""}
                      maxLength={CONTACT_STREET_MAX_LENGTH}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          contact: {
                            ...(prev.contact || {}),
                            street: e.target.value.slice(0, CONTACT_STREET_MAX_LENGTH),
                          },
                        }))
                      }
                      placeholder="np. ul. Kwiatowa 12"
                    />

                    {formErrors.contactStreet && (
                      <small className={styles.error}>{formErrors.contactStreet}</small>
                    )}
                  </label>
                </div>
              ) : (
                <div className={styles.contactViewGrid}>
                  <div className={styles.contactInfoCard}>
                    <FaEnvelope />
                    <span>E-mail</span>
                    <strong>{profile.contact?.email || "—"}</strong>
                  </div>

                  <div className={styles.contactInfoCard}>
                    <FaPhone />
                    <span>Telefon</span>
                    <strong>{profile.contact?.phone || "—"}</strong>
                  </div>

                  <div className={`${styles.contactInfoCard} ${styles.contactAddressCard}`}>
                    <FaMapMarkerAlt />
                    <span>Adres</span>
                    <strong>
                      {profile.contact?.addressFull ||
                        [profile.location, profile.contact?.postcode, profile.contact?.street]
                          .filter(Boolean)
                          .join(", ") ||
                        "—"}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* SOCIAL MEDIA */}
            <div className={styles.contactPanel}>
              <div className={styles.contactPanelHead}>
                <div className={styles.contactIcon}>
                  <FaGlobe />
                </div>

                <div>
                  <strong>Social media</strong>
                  <span>Dodaj miejsca, w których pokazujesz swoje realizacje lub ofertę.</span>
                </div>
              </div>

              {!canUseSocialMedia && isEditing && (
                <div className={styles.upgradeNotice}>
                  <strong>Social media są dostępne w planie Standard i Premium.</strong>
                  <span>
                    W planie Starter możesz uzupełnić podstawowy kontakt, ale linki social
                    media są zablokowane.
                  </span>
                </div>
              )}

              {isEditing ? (
                <div
                  className={`${styles.socialEditorGrid} ${!canUseSocialMedia ? styles.disabledOption : ""
                    }`}
                >
                  <label className={styles.modernField}>
                    <span>Strona www</span>

                    <input
                      className={`${styles.formInput} ${formErrors.social_website ? styles.inputError : ""
                        }`}
                      value={editData.socials?.website || ""}
                      maxLength={SOCIAL_LINK_MAX_LENGTH}
                      disabled={!canUseSocialMedia}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          socials: {
                            ...(prev.socials || {}),
                            website: e.target.value.slice(0, SOCIAL_LINK_MAX_LENGTH),
                          },
                        }))
                      }
                      placeholder="np. twojastrona.pl"
                    />

                    {formErrors.social_website && (
                      <small className={styles.error}>{formErrors.social_website}</small>
                    )}
                  </label>

                  <label className={styles.modernField}>
                    <span>Facebook</span>

                    <input
                      className={`${styles.formInput} ${formErrors.social_facebook ? styles.inputError : ""
                        }`}
                      value={editData.socials?.facebook || ""}
                      maxLength={SOCIAL_LINK_MAX_LENGTH}
                      disabled={!canUseSocialMedia}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          socials: {
                            ...(prev.socials || {}),
                            facebook: e.target.value.slice(0, SOCIAL_LINK_MAX_LENGTH),
                          },
                        }))
                      }
                      placeholder="np. facebook.com/twojprofil"
                    />

                    {formErrors.social_facebook && (
                      <small className={styles.error}>{formErrors.social_facebook}</small>
                    )}
                  </label>

                  <label className={styles.modernField}>
                    <span>Instagram</span>

                    <input
                      className={`${styles.formInput} ${formErrors.social_instagram ? styles.inputError : ""
                        }`}
                      value={editData.socials?.instagram || ""}
                      maxLength={SOCIAL_LINK_MAX_LENGTH}
                      disabled={!canUseSocialMedia}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          socials: {
                            ...(prev.socials || {}),
                            instagram: e.target.value.slice(0, SOCIAL_LINK_MAX_LENGTH),
                          },
                        }))
                      }
                      placeholder="np. instagram.com/twojprofil"
                    />

                    {formErrors.social_instagram && (
                      <small className={styles.error}>{formErrors.social_instagram}</small>
                    )}
                  </label>

                  <label className={styles.modernField}>
                    <span>YouTube</span>

                    <input
                      className={`${styles.formInput} ${formErrors.social_youtube ? styles.inputError : ""
                        }`}
                      value={editData.socials?.youtube || ""}
                      maxLength={SOCIAL_LINK_MAX_LENGTH}
                      disabled={!canUseSocialMedia}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          socials: {
                            ...(prev.socials || {}),
                            youtube: e.target.value.slice(0, SOCIAL_LINK_MAX_LENGTH),
                          },
                        }))
                      }
                      placeholder="np. youtube.com/@twojkanal"
                    />

                    {formErrors.social_youtube && (
                      <small className={styles.error}>{formErrors.social_youtube}</small>
                    )}
                  </label>

                  <label className={styles.modernField}>
                    <span>TikTok</span>

                    <input
                      className={`${styles.formInput} ${formErrors.social_tiktok ? styles.inputError : ""
                        }`}
                      value={editData.socials?.tiktok || ""}
                      maxLength={SOCIAL_LINK_MAX_LENGTH}
                      disabled={!canUseSocialMedia}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          socials: {
                            ...(prev.socials || {}),
                            tiktok: e.target.value.slice(0, SOCIAL_LINK_MAX_LENGTH),
                          },
                        }))
                      }
                      placeholder="np. tiktok.com/@twojprofil"
                    />

                    {formErrors.social_tiktok && (
                      <small className={styles.error}>{formErrors.social_tiktok}</small>
                    )}
                  </label>
                </div>
              ) : (
                <>
                  {[
                    {
                      key: "website",
                      label: "Strona www",
                      icon: <FaGlobe />,
                      value: profile.socials?.website,
                    },
                    {
                      key: "facebook",
                      label: "Facebook",
                      icon: <FaFacebook />,
                      value: profile.socials?.facebook,
                    },
                    {
                      key: "instagram",
                      label: "Instagram",
                      icon: <FaInstagram />,
                      value: profile.socials?.instagram,
                    },
                    {
                      key: "youtube",
                      label: "YouTube",
                      icon: <FaYoutube />,
                      value: profile.socials?.youtube,
                    },
                    {
                      key: "tiktok",
                      label: "TikTok",
                      icon: <FaTiktok />,
                      value: profile.socials?.tiktok,
                    },
                  ].some((item) => item.value) ? (
                    <div className={styles.socialLinksGrid}>
                      {[
                        {
                          key: "website",
                          label: "Strona www",
                          icon: <FaGlobe />,
                          value: profile.socials?.website,
                        },
                        {
                          key: "facebook",
                          label: "Facebook",
                          icon: <FaFacebook />,
                          value: profile.socials?.facebook,
                        },
                        {
                          key: "instagram",
                          label: "Instagram",
                          icon: <FaInstagram />,
                          value: profile.socials?.instagram,
                        },
                        {
                          key: "youtube",
                          label: "YouTube",
                          icon: <FaYoutube />,
                          value: profile.socials?.youtube,
                        },
                        {
                          key: "tiktok",
                          label: "TikTok",
                          icon: <FaTiktok />,
                          value: profile.socials?.tiktok,
                        },
                      ]
                        .filter((item) => item.value)
                        .map((item) => (
                          <a
                            key={item.key}
                            href={
                              item.value.startsWith("http")
                                ? item.value
                                : `https://${item.value}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.socialLinkCard}
                          >
                            <span>{item.icon}</span>

                            <div>
                              <strong>{item.label}</strong>
                              <small>{prettyUrl(item.value)}</small>
                            </div>
                          </a>
                        ))}
                    </div>
                  ) : (
                    <div className={styles.mediaEmpty}>
                      <FaGlobe />
                      <strong>Nie dodałeś/aś jeszcze social mediów</strong>
                      <span>
                        Dodaj linki do miejsc, w których pokazujesz swoje realizacje lub
                        kontaktujesz się z klientami.
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* =========================
  Informacje dodatkowe
========================= */}
        <section className={`${styles.card} ${styles.extraCard}`}>
          <div className={styles.cardGlow} aria-hidden="true" />

          <div className={styles.sectionTop}>
            <div>
              <span className={styles.sectionKicker}>Finalne ustawienia</span>

              <h3 className={styles.sectionTitle}>Informacje dodatkowe</h3>

              <p className={styles.sectionLead}>
                Uzupełnij dane biznesowe, szybkie odpowiedzi oraz sprawdź podsumowanie
                widoczności Twojego profilu.
              </p>
            </div>

            <div className={styles.sectionBadge}>
              <FaIdBadge />
              <span>Final</span>
            </div>
          </div>

          <div className={styles.extraBody}>
            {/* DANE BIZNESOWE */}
            <div className={styles.extraPanel}>
              <div className={styles.extraPanelHead}>
                <div className={styles.extraIcon}>
                  <FaBriefcase />
                </div>

                <div>
                  <strong>Dane biznesowe</strong>
                  <span>Określ, czy działasz jako firma i podaj NIP, jeśli chcesz.</span>
                </div>
              </div>

              {isEditing ? (
                <div className={styles.businessEditor}>
                  <label className={styles.featuredSwitch}>
                    <input
                      type="checkbox"
                      checked={!!editData.hasBusiness}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          hasBusiness: e.target.checked,
                          nip: e.target.checked ? prev.nip || "" : "",
                        }))
                      }
                    />

                    <span>
                      <strong>Posiadam działalność gospodarczą</strong>
                      <small>
                        Ta informacja może zwiększyć wiarygodność profilu.
                      </small>
                    </span>
                  </label>

                  {editData.hasBusiness && (
                    <label className={styles.modernField}>
                      <span>NIP</span>

                      <input
                        type="text"
                        className={styles.formInput}
                        value={editData.nip || ""}
                        maxLength={20}
                        placeholder="Np. 1234567890"
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            nip: e.target.value,
                          }))
                        }
                      />
                    </label>
                  )}
                </div>
              ) : (
                <div className={styles.businessView}>
                  <div className={styles.businessStatus}>
                    <span
                      className={`${styles.extraBadge} ${profile.hasBusiness ? styles.extraBadgeSuccess : styles.extraBadgeMuted
                        }`}
                    >
                      {profile.hasBusiness ? "Firma" : "Osoba prywatna"}
                    </span>

                    <strong>
                      {profile.hasBusiness
                        ? "Działalność gospodarcza"
                        : "Brak działalności gospodarczej"}
                    </strong>

                    <small>
                      {profile.hasBusiness
                        ? `NIP: ${profile.nip || "nie podano"}`
                        : "Profil działa bez podanego NIP-u."}
                    </small>
                  </div>
                </div>
              )}
            </div>

            {/* PODSUMOWANIE */}
            <div className={styles.extraPanel}>
              <div className={styles.extraPanelHead}>
                <div className={styles.extraIcon}>
                  <FaStar />
                </div>

                <div>
                  <strong>Podsumowanie profilu</strong>
                  <span>Najważniejsze dane widoczne po stronie profilu publicznego.</span>
                </div>
              </div>

              <div className={styles.extraStatsGrid}>
                <div className={styles.extraStatItem}>
                  <span>Ocena</span>
                  <strong>{profile.rating || 0} ★</strong>
                </div>

                <div className={styles.extraStatItem}>
                  <span>Opinie</span>
                  <strong>{profile.reviews || 0}</strong>
                </div>

                <div className={styles.extraStatItem}>
                  <span>Odwiedziny</span>
                  <strong>{profile.visits || 0}</strong>
                </div>

                <div className={styles.extraStatItem}>
                  <span>Status</span>
                  <strong>{profile.isVisible ? "Widoczny" : "Ukryty"}</strong>
                </div>
              </div>

              <div className={styles.profileMetaBox}>
                <div>
                  <span>Typ profilu</span>
                  <strong>{profile.profileType || "Nie podano"}</strong>
                </div>

                <div>
                  <span>Widoczny do</span>
                  <strong>
                    {profile.visibleUntil
                      ? new Date(profile.visibleUntil).toLocaleDateString("pl-PL")
                      : "Brak daty"}
                  </strong>
                </div>
              </div>
            </div>

            {/* SZYBKIE ODPOWIEDZI */}
            <div className={`${styles.extraPanel} ${styles.quickAnswersPanel}`}>
              <div className={styles.extraPanelHead}>
                <div className={styles.extraIcon}>
                  <FaEnvelope />
                </div>

                <div>
                  <strong>Szybkie odpowiedzi</strong>
                  <span>
                    Krótkie odpowiedzi widoczne przy formularzu wiadomości. Pomagają klientowi
                    szybciej znaleźć podstawowe informacje.
                  </span>
                </div>
              </div>

              {isEditing ? (
                <div className={styles.quickAnswersEditor}>
                  {Array.from({ length: MAX_QUICK_ANSWERS }).map((_, i) => {
                    const qa = editData.quickAnswers?.[i] || { title: "", answer: "" };

                    return (
                      <div key={i} className={styles.quickAnswerEditCard}>
                        <div className={styles.quickAnswerTop}>
                          <span>Szybka odpowiedź #{i + 1}</span>

                          {(qa.title || qa.answer) && (
                            <button
                              type="button"
                              className={styles.quickClearBtn}
                              onClick={() =>
                                setEditData((prev) => {
                                  const next = [...(prev.quickAnswers || [])];
                                  next[i] = { title: "", answer: "" };

                                  return {
                                    ...prev,
                                    quickAnswers: next,
                                  };
                                })
                              }
                            >
                              <FaTimes /> Wyczyść
                            </button>
                          )}
                        </div>

                        <div className={styles.quickAnswerGrid}>
                          <label className={styles.modernField}>
                            <span>Tytuł</span>

                            <input
                              type="text"
                              className={styles.formInput}
                              value={qa.title || ""}
                              maxLength={10}
                              placeholder="Np. Cena"
                              onChange={(e) =>
                                setEditData((prev) => {
                                  const next = [...(prev.quickAnswers || [])];
                                  next[i] = {
                                    ...(next[i] || {}),
                                    title: e.target.value,
                                  };

                                  return {
                                    ...prev,
                                    quickAnswers: next,
                                  };
                                })
                              }
                            />

                            <small className={styles.hint}>
                              {(qa.title || "").length}/10 znaków
                            </small>
                          </label>

                          <label className={styles.modernField}>
                            <span>Odpowiedź</span>

                            <input
                              type="text"
                              className={styles.formInput}
                              value={qa.answer || ""}
                              maxLength={64}
                              placeholder="Np. Wycena indywidualna"
                              onChange={(e) =>
                                setEditData((prev) => {
                                  const next = [...(prev.quickAnswers || [])];
                                  next[i] = {
                                    ...(next[i] || {}),
                                    answer: e.target.value,
                                  };

                                  return {
                                    ...prev,
                                    quickAnswers: next,
                                  };
                                })
                              }
                            />

                            <small className={styles.hint}>
                              {(qa.answer || "").length}/64 znaki
                            </small>
                          </label>
                        </div>
                      </div>
                    );
                  })}

                  {formErrors.quickAnswers && (
                    <small className={styles.error}>{formErrors.quickAnswers}</small>
                  )}

                  <div className={styles.infoMuted}>
                    Limit Twojego planu: {MAX_QUICK_ANSWERS} szybkich odpowiedzi.
                  </div>
                </div>
              ) : profile.quickAnswers?.filter((qa) => qa?.title || qa?.answer).length ? (
                <div className={styles.quickAnswersView}>
                  {profile.quickAnswers
                    .filter((qa) => qa?.title || qa?.answer)
                    .map((qa, i) => (
                      <div key={i} className={styles.quickAnswerViewCard}>
                        <span>{qa.title}</span>
                        <strong>{qa.answer}</strong>
                      </div>
                    ))}
                </div>
              ) : (
                <div className={styles.mediaEmpty}>
                  <FaEnvelope />
                  <strong>Brak szybkich odpowiedzi</strong>
                  <span>Nie dodałeś/aś jeszcze mini FAQ do swojego profilu.</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Pasek zapisu edycji */}
        {isEditing && (
          <div className={styles.editBar} role="region" aria-label="Akcje edycji profilu">
            <div className={styles.editBarInner}>
              <span className={styles.editHint}>Masz niezapisane zmiany</span>
              <div className={styles.editBarBtns}>
                <LoadingButton
                  type="button"
                  isLoading={isSaving}
                  disabled={isSaving}
                  className={styles.primary}
                  onClick={handleSaveChanges}
                >
                  Zapisz zmiany profilu
                </LoadingButton>

                <button
                  type="button"
                  className={styles.ghost}
                  disabled={isSaving}
                  onClick={() => {
                    setEditData(initialEditData || editData);
                    setStaffEdits({});
                    setFormErrors({});
                    setIsEditing(false);
                  }}
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        )}

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
                aria-label="Zamknij podgląd"
              >
                ✕
              </button>

              <img
                src={fullscreenImage}
                alt=""
                onClick={(e) => e.stopPropagation()}
              />
            </div>,
            document.body
          )}

      </div>
    </div>
  );
};

export default YourProfile;