// YourProfile.jsx
import { useEffect, useState, useRef } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
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
  FaHome,
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaGlobe,
  FaTiktok,
  FaClock,
} from 'react-icons/fa';
import AlertBox from "../AlertBox/AlertBox";

const YourProfile = ({ user, setRefreshTrigger }) => {
  // =========================
  // Lokalne stany
  // =========================
  const [qaErrors, setQaErrors] = useState([
    { title: '', answer: '', touched: false },
    { title: '', answer: '', touched: false },
    { title: '', answer: '', touched: false },
  ]);

  const [newService, setNewService] = useState({
    name: '',
    shortDescription: '',
    category: 'service',
    priceMode: 'fixed',
    priceValue: '',
    durationValue: '',
    durationUnit: 'minutes',
    isActive: true,
    featured: false,
  });

  const MAX_PHOTOS = 6;

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

      const photos = p.photos || [];
      const photoHashes = await Promise.all(photos.map(ph => hashString(ph)));

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
        photoHashes,
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
        bookingBufferMin: Number.isFinite(p.bookingBufferMin) ? p.bookingBufferMin : 0,
      });

      setInitialEditData({
        ...p,
        services: (p.services || []).map((s, index) => normalizeServiceForEdit(s, index)),
        photos,
        photoHashes,
        quickAnswers: p.quickAnswers || [{ title: '', answer: '' }, { title: '', answer: '' }, { title: '', answer: '' }],
        theme: normalizedTheme,
        contact: normalizedContact,
        socials: normalizedSocials,

        bookingMode: p.bookingMode || 'request-open',
        workingHours: p.workingHours || { from: '08:00', to: '20:00' },
        workingDays: p.workingDays || [1, 2, 3, 4, 5],
        team: p.team || { enabled: false, assignmentMode: 'user-pick' },
        bookingBufferMin: Number.isFinite(p.bookingBufferMin) ? p.bookingBufferMin : 0,
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

    const nonEmptyTags = (data.tags || []).filter(tag => tag.trim() !== '');
    if (nonEmptyTags.length === 0) errors.tags = 'Podaj przynajmniej 1 tag';

    if (data.description?.length > 500) errors.description = 'Opis nie może przekraczać 500 znaków';

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
    if (![0, 5, 10, 15].includes(buf)) {
      errors.bookingBufferMin = 'Buffer musi mieć wartość: 0, 5, 10 lub 15 minut.';
    }

    // Kontakt
    const email = data.contact?.email?.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.contactEmail = 'Nieprawidłowy e-mail';
    }

    const phone = data.contact?.phone?.trim();
    if (phone && phone.length > 20) {
      errors.contactPhone = 'Telefon max. 20 znaków';
    }

    const street = data.contact?.street?.trim();
    if (street && street.length > 80) errors.contactStreet = 'Ulica max. 80 znaków';

    const postcode = data.contact?.postcode?.trim();
    if (postcode && postcode.length > 12) errors.contactPostcode = 'Kod max. 12 znaków';


    // Social linki (opcjonalnie lekko pilnujemy URL)
    const isUrlish = (v) => {
      if (!v) return true;
      try { new URL(v.startsWith('http') ? v : `https://${v}`); return true; } catch { return false; }
    };

    const socials = data.socials || {};
    ['website', 'facebook', 'instagram', 'youtube', 'tiktok'].forEach((k) => {
      const v = socials[k]?.trim();
      if (v && !isUrlish(v)) errors[`social_${k}`] = 'Nieprawidłowy link';
    });

    const invalidServices = (data.services || []).some((s) => {
      const nameOk = !!s.name?.trim();
      const shortOk = !s.shortDescription || s.shortDescription.trim().length <= 160;

      const value = Number(s?.duration?.value);
      const unit = s?.duration?.unit;

      const durationOk =
        Number.isFinite(value) &&
        (
          (unit === 'minutes' && value >= 15) ||
          (unit === 'hours' && value >= 1) ||
          (unit === 'days' && value >= 1) ||
          (unit === 'weeks' && value >= 1)
        );

      const priceMode = s?.price?.mode || 'contact';

      let priceOk = true;
      if (priceMode === 'fixed') {
        priceOk = Number.isFinite(Number(s?.price?.amount)) && Number(s.price.amount) >= 0;
      }
      if (priceMode === 'from') {
        priceOk = Number.isFinite(Number(s?.price?.from)) && Number(s.price.from) >= 0;
      }
      if (priceMode === 'range') {
        priceOk =
          Number.isFinite(Number(s?.price?.from)) &&
          Number.isFinite(Number(s?.price?.to)) &&
          Number(s.price.to) >= Number(s.price.from);
      }

      return !nameOk || !shortOk || !durationOk || !priceOk;
    });

    if (invalidServices) {
      errors.services = 'Każda usługa musi mieć nazwę, poprawny czas i poprawnie ustawioną cenę.';
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

  const removeSavedPhoto = async (publicId) => {
    try {
      setPhotosUploading(true);
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/profiles/${user.uid}/photos`,
        {
          data: { publicId },
          headers: await authHeaders({ "Content-Type": "application/json" }),
        }
      );
      await fetchProfile();
      setRefreshTrigger(Date.now());
      showAlert("Usunięto zdjęcie.", "success");
    } catch (e) {
      console.error(e);
      showAlert("Nie udało się usunąć zdjęcia.", "error");
    } finally {
      setPhotosUploading(false);
    }
  };

  const handleReplaceSavedPhoto = async (e, publicId) => {
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

    try {
      setPhotosUploading(true);

      // 1) usuń stare z backendu (Cloud + DB)
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/profiles/${user.uid}/photos`,
        {
          data: { publicId },
          headers: await authHeaders({ "Content-Type": "application/json" }),
        }
      );

      // 2) wrzuć nowe
      const fd = new FormData();
      fd.append("files", file);

      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/profiles/${user.uid}/photos`,
        fd,
        { headers: await authHeaders({ "Content-Type": "multipart/form-data" }) }
      );

      // 3) odśwież
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
      const { data } = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/billing/checkout-extension`,
        { uid: user.uid },
        { headers: await authHeaders({ "Content-Type": "application/json" }) }
      );

      if (!data?.url) {
        showAlert("Nie udało się rozpocząć płatności (brak URL).", "error");
        return;
      }

      // przekierowanie do Stripe Checkout
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

      // 1) Zapis profilu
      const c = payload.contact || {};
      const builtAddressFull = [payload.location, c.postcode, c.street].filter(Boolean).join(", ").trim();

      await axios.patch(
        `${process.env.REACT_APP_API_URL}/api/profiles/update/${user.uid}`,
        {
          ...payload,
          bookingBufferMin: Number(payload.bookingBufferMin ?? 0), // ✅ DODAJ
          theme: mappedTheme,
          contact: {
            email: c.email || "",
            phone: c.phone || "",
            street: c.street || "",
            postcode: c.postcode || "",
            addressFull: builtAddressFull,
          },
          socials: payload.socials || {
            website: "",
            facebook: "",
            instagram: "",
            youtube: "",
            tiktok: "",
          },
          showAvailableDates: !!payload.showAvailableDates,
          tags: (payload.tags || []).filter((tag) => String(tag).trim() !== ""),
          quickAnswers: (payload.quickAnswers || []).filter(
            (qa) => qa.title?.trim() || qa.answer?.trim()
          ),
          team: payload.team || { enabled: false, assignmentMode: "user-pick" },
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
  const until = profile?.visibleUntil ? new Date(profile.visibleUntil) : new Date(0);

  const daysLeft = Math.ceil((until.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const canExtend = daysLeft <= 999; // zgodnie z backendem
  const isExpired = until < now || !profile.isVisible;

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

        {(isExpired || canExtend) && (
          <div className={`${styles.card} ${styles.noticeCard}`}>
            <div className={styles.noticeContent}>
              {isExpired ? (
                <>
                  <p className={styles.noticeTitle}>
                    🔒 Twój profil jest <strong>niewidoczny</strong>
                  </p>
                  <p className={styles.noticeText}>
                    Wygasł: <strong>{new Date(profile.visibleUntil).toLocaleDateString()}</strong>
                  </p>
                </>
              ) : (
                <>
                  <p className={styles.noticeTitle}>
                    ⏳ Twoja wizytówka wkrótce wygaśnie
                  </p>
                  <p className={styles.noticeText}>
                    Pozostało: <strong>{daysLeft} dni</strong> (do:{" "}
                    <strong>{new Date(profile.visibleUntil).toLocaleDateString()}</strong>)
                  </p>
                </>
              )}
            </div>

            <LoadingButton
              type="button"
              isLoading={isExtending}
              disabled={isExtending}
              className={styles.secondary}
              onClick={handleExtendVisibility}
            >
              Przedłuż widoczność (Stripe)
            </LoadingButton>
          </div>
        )}

        {/* =========================
          Dane podstawowe
      ========================= */}
        <section className={styles.card}>
          <div className={styles.sectionTop}>
            <div>
              <h3 className={styles.sectionTitle}>Dane podstawowe</h3>
              <p className={styles.sectionLead}>
                Najważniejsze informacje o Twojej wizytówce i tym, jak widzą ją użytkownicy.
              </p>
            </div>
          </div>

          <div className={styles.basicInfoRow}>
            <div className={styles.avatarColumn}>
              <img
                src={getAvatarUrl(isEditing ? editData : profile)}
                alt="Avatar"
                className={styles.avatar}
              />

              {isEditing && (
                <div className={styles.controls}>
                  <label className={styles.fileBtn}>
                    <input
                      type="file"
                      accept="image/*,.heic,.heif"
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
                    Kwadratowe najlepiej wygląda. Max ok. 2–3 MB.
                  </small>
                </div>
              )}
            </div>

            <div className={styles.basicInfoCol}>
              <div className={styles.inputBlock}>
                <label><FaUserTie /> Rola</label>
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      className={`${styles.formInput} ${formErrors.role ? styles.inputError : ''}`}
                      value={editData.role || ''}
                      maxLength={40}
                      onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                      aria-invalid={!!formErrors.role}
                    />
                    {formErrors.role && <small className={styles.error}>{formErrors.role}</small>}
                  </>
                ) : (
                  <p>{profile.role}</p>
                )}
              </div>

              <div className={styles.inputBlock}>
                <label><FaIdBadge /> Typ profilu</label>
                {isEditing ? (
                  <>
                    <select
                      className={`${styles.formInput} ${formErrors.profileType ? styles.inputError : ''}`}
                      value={editData.profileType || ''}
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
                  <p>{profile.profileType}</p>
                )}
              </div>

              <div className={styles.inputBlock}>
                <label><FaMapMarkerAlt /> Lokalizacja</label>
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      className={`${styles.formInput} ${formErrors.location ? styles.inputError : ''}`}
                      value={editData.location || ''}
                      maxLength={30}
                      onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                      aria-invalid={!!formErrors.location}
                    />
                    {formErrors.location && <small className={styles.error}>{formErrors.location}</small>}
                  </>
                ) : (
                  <p>{profile.location}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* =========================
          Opis
      ========================= */}
        <section className={styles.card}>
          <div className={styles.sectionTop}>
            <div>
              <h3 className={styles.sectionTitle}>Opis</h3>
              <p className={styles.sectionLead}>
                Krótkie przedstawienie Twojej oferty, stylu pracy i tego, czym się zajmujesz.
              </p>
            </div>
          </div>

          <div className={styles.descriptionBlock}>
            {isEditing ? (
              <>
                <textarea
                  value={editData.description || ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={4}
                  className={styles.formTextarea}
                  maxLength={500}
                />
                <div className={styles.descMeta}>
                  <div className={styles.descLeft}>
                    {formErrors.description && (
                      <small className={styles.error}>{formErrors.description}</small>
                    )}
                  </div>
                  <div className={styles.descRight}>
                    <small className={styles.hint}>
                      {editData.description?.length || 0}/500 znaków
                    </small>
                  </div>
                </div>
              </>
            ) : profile.description ? (
              <p className={styles.descriptionText}>{profile.description}</p>
            ) : (
              <p className={styles.noInfo}>
                <span>❔</span> Nie dodałeś/aś jeszcze opisu.
              </p>
            )}
          </div>
        </section>

        {/* =========================
          Wygląd profilu (Kolory)
        ========================= */}
        <section className={styles.card}>
          <div className={styles.sectionTop}>
            <div>
              <h3 className={styles.sectionTitle}>Wygląd profilu</h3>
              <p className={styles.sectionLead}>
                Ustaw akcenty kolorystyczne i dopasuj wizytówkę do swojego stylu lub marki.
              </p>
            </div>
          </div>

          <div className={styles.inputBlock}>
            {isEditing && (
              <div className={styles.colorPresets}>
                {[
                  { name: 'Systemowy', primary: '#6f4ef2', secondary: '#ff4081', variant: 'system' },
                  { name: 'Pomarańczowy', primary: '#ff5a1f', secondary: '#ffb86b', variant: 'orange' },
                  { name: 'Niebieski', primary: '#2563eb', secondary: '#7c9dff', variant: 'blue' },
                  { name: 'Zielony', primary: '#16a34a', secondary: '#86efac', variant: 'green' },
                  { name: 'Różowy', primary: '#db2777', secondary: '#ff6ea8', variant: 'violet' },
                  { name: 'Ciemny', primary: '#e50914', secondary: '#9aa3af', variant: 'dark' },
                ].map(p => (
                  <button
                    key={p.name}
                    type="button"
                    className={styles.presetBtn}
                    onClick={() =>
                      setEditData(prev => ({
                        ...prev,
                        theme: {
                          ...(prev.theme || {}),
                          variant: p.variant,
                          primary: p.primary,
                          secondary: p.secondary,
                        }
                      }))
                    }
                    title={`Ustaw preset: ${p.name}`}
                  >
                    <span className={styles.presetDot} style={{ background: p.primary }} aria-hidden="true" />
                    <span className={styles.presetDot} style={{ background: p.secondary }} aria-hidden="true" />
                    <span className={styles.presetName}>{p.name}</span>
                  </button>
                ))}
              </div>
            )}

            {isEditing ? (
              <div className={styles.colorGrid}>
                <div className={styles.colorField}>
                  <label className={styles.colorLabel}>Akcent</label>
                  <div className={styles.colorRow}>
                    <input
                      type="color"
                      value={editData.theme?.primary || '#ff5a1f'}
                      onChange={(e) => setEditData(prev => ({
                        ...prev,
                        theme: { ...(prev.theme || {}), primary: e.target.value }
                      }))}
                    />
                    <input
                      className={styles.formInput}
                      value={editData.theme?.primary || '#ff5a1f'}
                      onChange={(e) => setEditData(prev => ({
                        ...prev,
                        theme: { ...(prev.theme || {}), primary: e.target.value }
                      }))}
                      placeholder="#ff5a1f"
                    />
                  </div>
                </div>

                <div className={styles.colorField}>
                  <label className={styles.colorLabel}>Akcent 2</label>
                  <div className={styles.colorRow}>
                    <input
                      type="color"
                      value={editData.theme?.secondary || '#7c9dff'}
                      onChange={(e) => setEditData(prev => ({
                        ...prev,
                        theme: { ...(prev.theme || {}), secondary: e.target.value }
                      }))}
                    />
                    <input
                      className={styles.formInput}
                      value={editData.theme?.secondary || '#7c9dff'}
                      onChange={(e) => setEditData(prev => ({
                        ...prev,
                        theme: { ...(prev.theme || {}), secondary: e.target.value }
                      }))}
                      placeholder="#7c9dff"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.colorPreview}>
                <div
                  className={styles.previewCard}
                  style={{
                    borderColor: profile.theme?.primary || '#6f4ef2'
                  }}
                >
                  <div className={styles.previewTop}>
                    <span
                      className={styles.previewPill}
                      style={{ background: profile.theme?.primary || '#6f4ef2' }}
                    >
                      Akcent
                    </span>
                    <span
                      className={styles.previewPill}
                      style={{ background: profile.theme?.secondary || '#ff4081' }}
                    >
                      Akcent 2
                    </span>
                  </div>
                  <div className={styles.previewLine} />
                  <div className={styles.previewText}>
                    Podgląd kolorów profilu
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* =========================
          Dostępność i usługi
      ========================= */}
        <section className={styles.card}>
          <div className={styles.sectionTop}>
            <div>
              <h3 className={styles.sectionTitle}>Dostępność i usługi</h3>
              <p className={styles.sectionLead}>
                Zarządzaj cennikiem, usługami, trybem rezerwacji, godzinami pracy i dostępnymi terminami.
              </p>
            </div>
          </div>

          {/* CENNIK */}
          <div className={styles.inputBlock}>
            <div className={styles.groupTitle}>
              <FaMoneyBillWave /> Cennik
            </div>

            {isEditing ? (
              <div className={styles.priceFields}>
                <div className={styles.priceField}>
                  <span className={styles.priceLabel}>od:</span>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={editData.priceFrom || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, priceFrom: e.target.value })
                    }
                  />
                  {formErrors.priceFrom && (
                    <small className={styles.error}>{formErrors.priceFrom}</small>
                  )}
                </div>

                <div className={styles.priceField}>
                  <span className={styles.priceLabel}>do:</span>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={editData.priceTo || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, priceTo: e.target.value })
                    }
                  />
                  {formErrors.priceTo && (
                    <small className={styles.error}>{formErrors.priceTo}</small>
                  )}
                </div>
              </div>
            ) : (
              <ul className={styles.priceView}>
                <li className={styles.priceItem}>
                  <span className={styles.priceLabel}>od</span>
                  <span className={styles.priceAmount}>
                    {profile.priceFrom}
                    <span className={styles.priceCurrency}>zł</span>
                  </span>
                </li>
                <li className={styles.priceItem}>
                  <span className={styles.priceLabel}>do</span>
                  <span className={styles.priceAmount}>
                    {profile.priceTo}
                    <span className={styles.priceCurrency}>zł</span>
                  </span>
                </li>
              </ul>
            )}
          </div>

          <div className={styles.subsection}></div>

          {/* USŁUGI */}
          <div className={styles.inputBlock}>
            <div className={styles.groupTitle}>
              <FaTools /> Usługi
            </div>

            {isEditing ? (
              <>
                {(editData.services || []).map((s, i) => (
                  <div key={s._id || i} className={styles.serviceCardEdit}>
                    <div className={styles.serviceCardTop}>
                      <strong>Usługa #{i + 1}</strong>

                      <button
                        type="button"
                        className={styles.ghost}
                        onClick={() =>
                          setEditData((prev) => ({
                            ...prev,
                            services: prev.services.filter((_, idx) => idx !== i),
                          }))
                        }
                      >
                        Usuń
                      </button>
                    </div>

                    <div className={styles.serviceImageEditor}>
                      {getServiceImageUrl(s) ? (
                        <img
                          src={getServiceImageUrl(s)}
                          alt={s.name || `Usługa ${i + 1}`}
                          className={styles.serviceImageThumb}
                        />
                      ) : (
                        <div className={styles.serviceImagePlaceholder}>
                          Brak zdjęcia usługi
                        </div>
                      )}

                      <div className={styles.serviceImageActions}>
                        {s._id ? (
                          <>
                            <label className={styles.fileBtn}>
                              <input
                                type="file"
                                accept="image/*,.heic,.heif"
                                onChange={(e) => handleServiceImageChange(e, s._id)}
                              />
                              {getServiceImageUrl(s) ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}
                            </label>

                            {getServiceImageUrl(s) && (
                              <button
                                type="button"
                                className={styles.ghost}
                                disabled={serviceImageUploadingIds.includes(String(s._id))}
                                onClick={() => handleRemoveServiceImage(s._id)}
                              >
                                Usuń zdjęcie
                              </button>
                            )}

                            {serviceImageUploadingIds.includes(String(s._id)) && (
                              <small className={styles.hint}>Trwa upload zdjęcia…</small>
                            )}
                          </>
                        ) : (
                          <small className={styles.hint}>
                            Najpierw zapisz profil, aby dodać zdjęcie tej usługi.
                          </small>
                        )}
                      </div>
                    </div>

                    <div className={styles.serviceGridEdit}>
                      <input
                        className={styles.formInput}
                        type="text"
                        placeholder="Nazwa usługi"
                        value={s.name || ''}
                        onChange={(e) => {
                          const arr = [...editData.services];
                          arr[i].name = e.target.value;
                          setEditData((prev) => ({ ...prev, services: arr }));
                        }}
                      />

                      <select
                        className={styles.formInput}
                        value={s.category || 'service'}
                        onChange={(e) => {
                          const arr = [...editData.services];
                          arr[i].category = e.target.value;
                          setEditData((prev) => ({ ...prev, services: arr }));
                        }}
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

                      <input
                        className={styles.formInput}
                        type="text"
                        placeholder="Krótki opis"
                        maxLength={160}
                        value={s.shortDescription || ''}
                        onChange={(e) => {
                          const arr = [...editData.services];
                          arr[i].shortDescription = e.target.value;
                          setEditData((prev) => ({ ...prev, services: arr }));
                        }}
                      />

                      <select
                        className={styles.formInput}
                        value={s.price?.mode || 'contact'}
                        onChange={(e) => {
                          const arr = [...editData.services];
                          arr[i].price = {
                            ...(arr[i].price || {}),
                            mode: e.target.value,
                            amount: null,
                            from: null,
                            to: null,
                            currency: 'PLN',
                          };
                          setEditData((prev) => ({ ...prev, services: arr }));
                        }}
                      >
                        <option value="fixed">Cena stała</option>
                        <option value="from">Cena od</option>
                        <option value="range">Przedział cenowy</option>
                        <option value="contact">Wycena indywidualna</option>
                        <option value="free">Darmowe</option>
                      </select>

                      {s.price?.mode === 'fixed' && (
                        <input
                          className={styles.formInput}
                          type="number"
                          min="0"
                          placeholder="Cena"
                          value={s.price?.amount ?? ''}
                          onChange={(e) => {
                            const arr = [...editData.services];
                            arr[i].price.amount = e.target.value === '' ? null : Number(e.target.value);
                            setEditData((prev) => ({ ...prev, services: arr }));
                          }}
                        />
                      )}

                      {s.price?.mode === 'from' && (
                        <input
                          className={styles.formInput}
                          type="number"
                          min="0"
                          placeholder="Cena od"
                          value={s.price?.from ?? ''}
                          onChange={(e) => {
                            const arr = [...editData.services];
                            arr[i].price.from = e.target.value === '' ? null : Number(e.target.value);
                            setEditData((prev) => ({ ...prev, services: arr }));
                          }}
                        />
                      )}

                      {s.price?.mode === 'range' && (
                        <>
                          <input
                            className={styles.formInput}
                            type="number"
                            min="0"
                            placeholder="Cena od"
                            value={s.price?.from ?? ''}
                            onChange={(e) => {
                              const arr = [...editData.services];
                              arr[i].price.from = e.target.value === '' ? null : Number(e.target.value);
                              setEditData((prev) => ({ ...prev, services: arr }));
                            }}
                          />
                          <input
                            className={styles.formInput}
                            type="number"
                            min="0"
                            placeholder="Cena do"
                            value={s.price?.to ?? ''}
                            onChange={(e) => {
                              const arr = [...editData.services];
                              arr[i].price.to = e.target.value === '' ? null : Number(e.target.value);
                              setEditData((prev) => ({ ...prev, services: arr }));
                            }}
                          />
                        </>
                      )}

                      <input
                        className={styles.formInput}
                        type="number"
                        min="1"
                        placeholder="Czas"
                        value={s.duration?.value ?? ''}
                        onChange={(e) => {
                          const arr = [...editData.services];
                          arr[i].duration.value = e.target.value === '' ? '' : Number(e.target.value);
                          setEditData((prev) => ({ ...prev, services: arr }));
                        }}
                      />

                      <select
                        className={styles.formInput}
                        value={s.duration?.unit || 'minutes'}
                        onChange={(e) => {
                          const arr = [...editData.services];
                          arr[i].duration.unit = e.target.value;
                          setEditData((prev) => ({ ...prev, services: arr }));
                        }}
                      >
                        <option value="minutes">minuty</option>
                        <option value="hours">godziny</option>
                        <option value="days">dni</option>
                        <option value="weeks">tygodnie</option>
                      </select>
                    </div>

                    <div className={styles.serviceToggles}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={!!s.isActive}
                          onChange={(e) => {
                            const arr = [...editData.services];
                            arr[i].isActive = e.target.checked;
                            setEditData((prev) => ({ ...prev, services: arr }));
                          }}
                        />
                        Aktywna
                      </label>

                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={!!s.featured}
                          onChange={(e) => {
                            const arr = [...editData.services];
                            arr[i].featured = e.target.checked;
                            setEditData((prev) => ({ ...prev, services: arr }));
                          }}
                        />
                        Wyróżniona
                      </label>
                    </div>
                  </div>
                ))}

                <div className={styles.separator} />

                <div className={styles.serviceCardEdit}>
                  <div className={styles.serviceCardTop}>
                    <strong>Dodaj nową usługę</strong>
                  </div>

                  <div className={styles.serviceGridEdit}>
                    <input
                      className={styles.formInput}
                      type="text"
                      placeholder="Nazwa usługi"
                      value={newService.name}
                      onChange={(e) => setNewService((prev) => ({ ...prev, name: e.target.value }))}
                    />

                    <select
                      className={styles.formInput}
                      value={newService.category}
                      onChange={(e) => setNewService((prev) => ({ ...prev, category: e.target.value }))}
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

                    <input
                      className={styles.formInput}
                      type="text"
                      placeholder="Krótki opis"
                      maxLength={160}
                      value={newService.shortDescription}
                      onChange={(e) => setNewService((prev) => ({ ...prev, shortDescription: e.target.value }))}
                    />

                    <select
                      className={styles.formInput}
                      value={newService.priceMode}
                      onChange={(e) => setNewService((prev) => ({ ...prev, priceMode: e.target.value, priceValue: '' }))}
                    >
                      <option value="fixed">Cena stała</option>
                      <option value="from">Cena od</option>
                      <option value="contact">Wycena indywidualna</option>
                      <option value="free">Darmowe</option>
                    </select>

                    {(newService.priceMode === 'fixed' || newService.priceMode === 'from') && (
                      <input
                        className={styles.formInput}
                        type="number"
                        min="0"
                        placeholder={newService.priceMode === 'fixed' ? 'Cena' : 'Cena od'}
                        value={newService.priceValue}
                        onChange={(e) => setNewService((prev) => ({ ...prev, priceValue: e.target.value }))}
                      />
                    )}

                    <input
                      className={styles.formInput}
                      type="number"
                      min="1"
                      placeholder="Czas"
                      value={newService.durationValue}
                      onChange={(e) => setNewService((prev) => ({ ...prev, durationValue: e.target.value }))}
                    />

                    <select
                      className={styles.formInput}
                      value={newService.durationUnit}
                      onChange={(e) => setNewService((prev) => ({ ...prev, durationUnit: e.target.value }))}
                    >
                      <option value="minutes">minuty</option>
                      <option value="hours">godziny</option>
                      <option value="days">dni</option>
                      <option value="weeks">tygodnie</option>
                    </select>
                  </div>

                  <div className={styles.serviceToggles}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={newService.isActive}
                        onChange={(e) => setNewService((prev) => ({ ...prev, isActive: e.target.checked }))}
                      />
                      Aktywna
                    </label>

                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={newService.featured}
                        onChange={(e) => setNewService((prev) => ({ ...prev, featured: e.target.checked }))}
                      />
                      Wyróżniona
                    </label>
                  </div>

                  <div className={styles.infoMuted} style={{ marginBottom: '0.75rem' }}>
                    Zdjęcie do nowej usługi dodasz po zapisaniu profilu.
                  </div>

                  <button
                    type="button"
                    className={styles.primary}
                    onClick={() => {
                      const value = Number(newService.durationValue);
                      const unit = newService.durationUnit;

                      const durationOk =
                        Number.isFinite(value) &&
                        (
                          (unit === 'minutes' && value >= 15) ||
                          (unit === 'hours' && value >= 1) ||
                          (unit === 'days' && value >= 1) ||
                          (unit === 'weeks' && value >= 1)
                        );

                      if (!newService.name.trim() || !durationOk) {
                        showAlert('Podaj nazwę usługi i poprawny czas.', 'warning');
                        return;
                      }

                      let price = {
                        mode: newService.priceMode,
                        amount: null,
                        from: null,
                        to: null,
                        currency: 'PLN',
                        unitLabel: '',
                        note: '',
                      };

                      if (newService.priceMode === 'fixed') {
                        price.amount = newService.priceValue === '' ? null : Number(newService.priceValue);
                      }

                      if (newService.priceMode === 'from') {
                        price.from = newService.priceValue === '' ? null : Number(newService.priceValue);
                      }

                      setEditData((prev) => ({
                        ...prev,
                        services: [
                          ...(prev.services || []),
                          {
                            name: newService.name.trim(),
                            shortDescription: newService.shortDescription.trim(),
                            description: '',
                            category: newService.category,
                            image: { url: '', publicId: '' },
                            gallery: [],
                            price,
                            duration: {
                              value: Number(newService.durationValue),
                              unit: newService.durationUnit,
                              label:
                                newService.durationUnit === 'minutes' || newService.durationUnit === 'hours'
                                  ? 'czas wizyty'
                                  : 'czas realizacji',
                            },
                            booking: { enabled: false, type: 'none' },
                            delivery: { mode: 'none', turnaroundText: '' },
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
                        priceMode: 'fixed',
                        priceValue: '',
                        durationValue: '',
                        durationUnit: 'minutes',
                        isActive: true,
                        featured: false,
                      });
                    }}
                  >
                    Dodaj usługę
                  </button>
                </div>

                {formErrors.services && <small className={styles.error}>{formErrors.services}</small>}
              </>
            ) : profile.services?.length > 0 ? (
              <div className={styles.servicesViewGrid}>
                {profile.services.map((s, i) => (
                  <div key={s._id || i} className={styles.servicePreviewCard}>
                    {getServiceImageUrl(s) && (
                      <img
                        src={getServiceImageUrl(s)}
                        alt={s.name || `Usługa ${i + 1}`}
                        className={styles.servicePreviewImage}
                      />
                    )}

                    <div className={styles.servicePreviewTop}>
                      <strong>{s.name}</strong>
                      <span className={styles.durationBadge}>
                        {mapServiceCategory(s.category)}
                      </span>
                    </div>

                    {s.shortDescription && (
                      <p className={styles.serviceShortDesc}>{s.shortDescription}</p>
                    )}

                    <div className={styles.servicePreviewMeta}>
                      <span>{formatServicePrice(s)}</span>
                      <span>
                        {s.duration?.value} {mapUnit(s.duration?.unit)}
                      </span>
                    </div>

                    <div className={styles.servicePreviewFlags}>
                      {!s.isActive && <span className={styles.mutedBadge}>Nieaktywna</span>}
                      {s.featured && <span className={styles.featuredBadge}>Wyróżniona</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.noInfo}>
                <span>❔</span> Nie dodałeś/aś jeszcze żadnych usług.
              </p>
            )}
          </div>

          <div className={styles.subsection}></div>

          {/* TRYB REZERWACJI */}
          <div className={styles.inputBlock}>
            <div className={styles.groupTitle}>
              <FaCalendarAlt /> Tryb rezerwacji
            </div>
            {isEditing ? (
              <select
                className={styles.formInput}
                value={editData.bookingMode}
                onChange={e => setEditData({ ...editData, bookingMode: e.target.value })}
              >
                <option value="calendar">Kalendarz godzinowy (np. fryzjer)</option>
                <option value="request-blocking">Rezerwacja dnia (np. DJ, cukiernik)</option>
                <option value="request-open">Zapytanie bez blokowania (np. programista)</option>
              </select>
            ) : (
              <ul className={styles.priceView}>
                <li className={styles.priceItem}>
                  <span className={styles.priceLabel}>Wybrany tryb</span>
                  <span className={styles.priceAmount}>
                    {profile.bookingMode === 'calendar' && 'Kalendarz godzinowy'}
                    {profile.bookingMode === 'request-blocking' && 'Rezerwacja dnia'}
                    {profile.bookingMode === 'request-open' && 'Zapytanie bez blokowania'}
                  </span>
                </li>
              </ul>
            )}
          </div>

          <div className={styles.subsection}></div>

          {/* BUFFER — przerwa między usługami */}
          <div className={styles.inputBlock}>
            <div className={styles.groupTitle}>
              <FaClock /> Przerwa (buffer) między usługami
            </div>

            {isEditing ? (
              <select
                className={styles.formInput}
                value={editData.bookingBufferMin ?? 0}
                onChange={(e) =>
                  setEditData(prev => ({
                    ...prev,
                    bookingBufferMin: parseInt(e.target.value, 10),
                  }))
                }
              >
                <option value={0}>0 min (brak przerwy)</option>
                <option value={5}>5 min</option>
                <option value={10}>10 min</option>
                <option value={15}>15 min</option>
              </select>
            ) : (
              <ul className={styles.priceView}>
                <li className={styles.priceItem}>
                  <span className={styles.priceLabel}>Buffer</span>
                  <span className={styles.priceAmount}>
                    {profile.bookingBufferMin ?? 0} min
                  </span>
                </li>
              </ul>
            )}

            <div className={styles.infoMuted} style={{ marginTop: 8 }}>
              Buffer doliczany jest po każdej usłudze (blokuje kolejne sloty, żebyś miał/a przerwę).
            </div>
          </div>

          <div className={styles.subsection}></div>

          {/* ZESPÓŁ – ustawienia (spójne z resztą sekcji) */}
          <div className={styles.inputBlock}>
            <div className={styles.groupTitle}>
              <FaUsers /> Zespół — ustawienia rezerwacji
            </div>

            {isEditing ? (
              <div className={styles.teamSettingsStack}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={!!editData.team?.enabled}
                    onChange={(e) =>
                      setEditData(prev => ({
                        ...prev,
                        team: { ...(prev.team || {}), enabled: e.target.checked }
                      }))
                    }
                  />
                  Włącz obsługę zespołu (pracowników)
                </label>

                <div className={styles.teamAssignStack}>
                  <span className={styles.teamAssignLabel}>Tryb przydziału:</span>
                  <select
                    className={styles.formInput}
                    disabled={!editData.team?.enabled}
                    value={editData.team?.assignmentMode || 'user-pick'}
                    onChange={(e) =>
                      setEditData(prev => ({
                        ...prev,
                        team: { ...(prev.team || {}), assignmentMode: e.target.value }
                      }))
                    }
                  >
                    <option value="user-pick">Klient wybiera pracownika</option>
                    <option value="auto-assign">Automatyczny przydział</option>
                  </select>
                </div>

                {!editData.team?.enabled && (
                  <div className={styles.infoMuted}>
                    Wyłączone — wybór pracownika nie będzie pokazywany w rezerwacji.
                  </div>
                )}
              </div>
            ) : (
              <ul className={styles.priceView}>
                <li className={styles.priceItem}>
                  <span className={styles.priceLabel}>Zespół</span>
                  <span className={styles.priceAmount}>
                    {profile.team?.enabled ? 'Włączony' : 'Wyłączony'}
                  </span>
                </li>
                {profile.team?.enabled && (
                  <li className={styles.priceItem}>
                    <span className={styles.priceLabel}>Tryb przydziału</span>
                    <span className={styles.priceAmount}>
                      {profile.team?.assignmentMode === 'user-pick'
                        ? 'Klient wybiera'
                        : 'Automatyczny przydział'}
                    </span>
                  </li>
                )}
              </ul>
            )}
          </div>

          <div className={styles.subsection}></div>

          {/* GODZINY / DNI — tylko dla kalendarza */}
          {profile.bookingMode === 'calendar' && (
            <>
              <div className={styles.inputBlock}>
                <div className={styles.groupTitle}>
                  <FaCalendarAlt /> Godziny pracy
                </div>
                {isEditing ? (
                  <div className={styles.priceFields}>
                    <div className={styles.priceField}>
                      <span className={styles.priceLabel}>od:</span>
                      <input
                        type="time"
                        className={`${styles.formInput} ${styles.timeInput}`}
                        value={editData.workingHours?.from ?? ''}
                        onChange={e =>
                          setEditData(d => ({
                            ...d,
                            workingHours: { ...d.workingHours, from: e.target.value }
                          }))
                        }
                      />
                    </div>

                    <div className={styles.priceField}>
                      <span className={styles.priceLabel}>do:</span>
                      <input
                        type="time"
                        className={`${styles.formInput} ${styles.timeInput}`}
                        value={editData.workingHours?.to ?? ''}
                        onChange={e =>
                          setEditData(d => ({
                            ...d,
                            workingHours: { ...d.workingHours, to: e.target.value }
                          }))
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <ul className={styles.priceView}>
                    <li className={styles.priceItem}>
                      <span className={styles.priceLabel}>od</span>
                      <span className={styles.priceAmount}>
                        {profile.workingHours?.from ?? '--'}
                      </span>
                    </li>
                    <li className={styles.priceItem}>
                      <span className={styles.priceLabel}>do</span>
                      <span className={styles.priceAmount}>
                        {profile.workingHours?.to ?? '--'}
                      </span>
                    </li>
                  </ul>
                )}
              </div>

              <div className={styles.subsection}></div>

              {/* DNI PRACY */}
              <div className={styles.inputBlock}>
                <div className={styles.groupTitle}>
                  <FaCalendarAlt /> Dni pracy
                </div>
                {isEditing ? (
                  <fieldset className={styles.fieldset}>
                    {[1, 2, 3, 4, 5, 6, 0].map(d => (
                      <label key={d} className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={editData.workingDays?.includes(d) ?? false}
                          onChange={() => setEditData(prev => {
                            const days = prev.workingDays?.includes(d)
                              ? prev.workingDays.filter(x => x !== d)
                              : [...(prev.workingDays || []), d];
                            return { ...prev, workingDays: days };
                          })}
                        />
                        {['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'][d]}
                      </label>
                    ))}
                  </fieldset>
                ) : (
                  <ul className={styles.daysView}>
                    {profile.workingDays?.length ? (
                      profile.workingDays.sort().map(d => (
                        <li key={d} className={styles.dayItem}>
                          {['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'][d]}
                        </li>
                      ))
                    ) : (
                      <li className={styles.dayItemEmpty}>Brak danych</li>
                    )}
                  </ul>
                )}
                <div className={styles.subsection}></div>
              </div>
            </>
          )}

          {/* TERMINY DOSTĘPNOŚCI (ręczne) */}
          <div className={styles.inputBlock}>
            <div className={styles.groupTitle}>
              <FaCalendarAlt /> Terminy dostępności
            </div>

            {isEditing ? (
              <>
                <label className={styles.inline}>
                  <input
                    type="checkbox"
                    checked={!!editData.showAvailableDates}
                    onChange={e => setEditData({ ...editData, showAvailableDates: e.target.checked })}
                    style={{ marginRight: 8 }}
                  />
                  Pokazuj dostępne dni i terminy w profilu
                </label>

                {!editData.showAvailableDates && (
                  <div className={styles.infoMuted}>
                    Twój profil nie pokazuje dostępnych terminów – klienci mogą tylko napisać wiadomość.
                  </div>
                )}

                {editData.showAvailableDates && (
                  <>
                    <div className={styles.availableDatesForm}>
                      <input
                        type="date"
                        className={styles.formInput}
                        value={newAvailableDate.date}
                        onChange={e => setNewAvailableDate({ ...newAvailableDate, date: e.target.value })}
                      />
                      <input
                        type="time"
                        className={styles.formInput}
                        value={newAvailableDate.from}
                        onChange={e => setNewAvailableDate({ ...newAvailableDate, from: e.target.value })}
                      />
                      <input
                        type="time"
                        className={styles.formInput}
                        value={newAvailableDate.to}
                        onChange={e => setNewAvailableDate({ ...newAvailableDate, to: e.target.value })}
                      />
                      <button
                        type="button"
                        className={styles.primary}
                        onClick={() => {
                          const { date, from, to } = newAvailableDate;
                          if (date && from && to) {
                            setEditData({
                              ...editData,
                              availableDates: [
                                ...(editData.availableDates || []),
                                { date, fromTime: from, toTime: to }
                              ]
                            });
                            setNewAvailableDate({ date: '', from: '', to: '' });
                          }
                        }}
                      >
                        Dodaj termin
                      </button>
                    </div>

                    {(editData.availableDates || []).length > 0 && (
                      <ul className={styles.slotList}>
                        {editData.availableDates.map((slot, index) => (
                          <li key={index} className={styles.slotItem}>
                            <div className={styles.slotLeft}>
                              <span className={styles.slotDate}>{formatPLDate(slot.date)}</span>
                            </div>
                            <div className={styles.slotRight}>
                              <span className={styles.badge}>od {slot.fromTime}</span>
                              <span className={styles.badge}>do {slot.toTime}</span>
                              <button
                                className={`${styles.ghost} ${styles.removeGhost}`}
                                onClick={() => {
                                  const updated = [...editData.availableDates];
                                  updated.splice(index, 1);
                                  setEditData({ ...editData, availableDates: updated });
                                }}
                              >
                                Usuń
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </>
            ) : (
              profile.showAvailableDates ? (
                <>
                  {profile.availableDates?.length > 0 ? (
                    <ul className={styles.slotList}>
                      {profile.availableDates.map((slot, i) => (
                        <li key={i} className={styles.slotItem}>
                          <div className={styles.slotLeft}>
                            <span className={styles.slotDate}>{formatPLDate(slot.date)}</span>
                          </div>
                          <div className={styles.slotRight}>
                            <span className={styles.badge}>od {slot.fromTime}</span>
                            <span className={styles.badge}>do {slot.toTime}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.noInfo}><span>❔</span> Nie dodałeś/aś jeszcze dostępnych terminów.</p>
                  )}
                </>
              ) : (
                <div className={styles.infoMuted}>
                  Twój profil nie pokazuje dostępnych terminów – klienci mogą tylko napisać wiadomość.
                </div>
              )
            )}
          </div>
        </section>

        {/* =========================
          PRACOWNICY
      ========================= */}
        <section className={styles.card} id="staffSection">
          <div className={styles.sectionTop}>
            <div>
              <h3 className={styles.sectionTitle}>Pracownicy</h3>
              <p className={styles.sectionLead}>
                Dodawaj członków zespołu, przypisuj im usługi i zarządzaj ich dostępnością w rezerwacjach.
              </p>
            </div>
          </div>

          {/* Lista pracowników */}
          {staffLoading ? (
            <div>Ładowanie pracowników…</div>
          ) : staff.length ? (
            <ul className={styles.slotList}>
              {staff.map((st) => {
                const edit = staffEdits[st._id] || st;
                const services = editData.services || [];
                const selected = new Set(edit?.serviceIds?.map(String));

                return (
                  <li key={st._id} className={styles.slotItem}>
                    {/* LEWA STRONA: nazwa */}
                    <div className={styles.slotLeft} style={{ gap: '.35rem' }}>
                      <span className={styles.badge}>#{st._id.slice(-5)}</span>

                      {isEditing ? (
                        <input
                          className={styles.formInput}
                          style={{ minWidth: 180 }}
                          value={edit.name ?? ''}
                          onChange={(e) =>
                            setStaffEdits(prev => ({
                              ...prev,
                              [st._id]: { ...edit, name: e.target.value }
                            }))
                          }
                          placeholder="Imię i nazwisko"
                        />
                      ) : (
                        <strong>{st.name}</strong>
                      )}
                    </div>

                    {/* PRAWA STRONA */}
                    <div className={styles.slotRight}>
                      {/* Aktywny */}
                      {isEditing ? (
                        <label className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={!!(edit.active ?? true)}
                            onChange={(e) =>
                              setStaffEdits(prev => ({
                                ...prev,
                                [st._id]: { ...edit, active: e.target.checked }
                              }))
                            }
                          />
                          Aktywny
                        </label>
                      ) : (
                        <span
                          className={`${styles.statusPill} ${st.active ? styles.statusActive : styles.statusInactive}`}
                          title={st.active ? 'Aktywny' : 'Nieaktywny'}
                        >
                          <span className={styles.statusDot} aria-hidden="true" />
                          {st.active ? 'Aktywny' : 'Nieaktywny'}
                        </span>

                      )}

                      {/* Pojemność */}
                      <span className={styles.badge}>pojemność</span>
                      {isEditing ? (
                        <input
                          type="number"
                          min={1}
                          className={styles.formInput}
                          style={{ width: 90, textAlign: 'center' }}
                          value={edit.capacity ?? 1}
                          onChange={(e) =>
                            setStaffEdits(prev => ({
                              ...prev,
                              [st._id]: {
                                ...edit,
                                capacity: Math.max(1, parseInt(e.target.value || '1', 10))
                              }
                            }))
                          }
                        />
                      ) : (
                        <span className={styles.badge}>{st.capacity}</span>
                      )}

                      {/* Usługi */}
                      {isEditing ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
                          {services.map(s => (
                            <label key={s._id} className={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={selected.has(String(s._id))}
                                onChange={(e) => {
                                  const next = new Set(selected);
                                  if (e.target.checked) next.add(String(s._id));
                                  else next.delete(String(s._id));
                                  setStaffEdits(prev => ({
                                    ...prev,
                                    [st._id]: { ...edit, serviceIds: Array.from(next) }
                                  }));
                                }}
                              />
                              {s.name}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className={styles.tags} style={{ gap: '.3rem' }}>
                          {(st.serviceIds || []).map(id => {
                            const svc = services.find(s => String(s._id) === String(id));
                            return svc ? (
                              <span key={id} className={styles.tag}>{svc.name}</span>
                            ) : null;
                          })}
                        </div>
                      )}

                      {/* Akcje – tylko w trybie edycji */}
                      {isEditing && (
                        <>
                          <LoadingButton
                            type="button"
                            isLoading={deletingStaffIds.includes(st._id)}
                            disabled={deletingStaffIds.includes(st._id)}
                            className={styles.ghost}
                            onClick={() => deleteStaff(st._id)}
                          >
                            <FaTrash style={{ transform: 'translateY(1px)' }} /> Usuń
                          </LoadingButton>
                          <button
                            type="button"
                            className={styles.ghost}
                            onClick={() =>
                              setStaffEdits(prev => {
                                const copy = { ...prev };
                                delete copy[st._id];
                                return copy;
                              })
                            }
                            title="Anuluj zmiany"
                          >
                            <FaTimes style={{ transform: 'translateY(1px)' }} /> Anuluj
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}

            </ul>
          ) : (
            <p className={styles.noInfo}>
              <span>❔</span> Nie dodałeś/aś jeszcze żadnych pracowników.
            </p>
          )}

          <div className={styles.subsection}></div>

          {/* Dodawanie pracownika */}
          {/* Dodawanie pracownika — tylko w trybie edycji */}
          {isEditing ? (
            <div className={styles.inputBlock}>
              <div className={styles.groupTitle}><FaPlus /> Dodaj pracownika</div>

              <div className={styles.availableDatesForm}>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Imię i nazwisko"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff(s => ({ ...s, name: e.target.value }))}
                />
                <input
                  type="number"
                  className={styles.formInput}
                  min={1}
                  placeholder="Pojemność (ile równolegle)"
                  value={newStaff.capacity}
                  onChange={(e) =>
                    setNewStaff(s => ({
                      ...s,
                      capacity: Math.max(1, parseInt(e.target.value || '1', 10))
                    }))
                  }
                />
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={newStaff.active}
                    onChange={(e) => setNewStaff(s => ({ ...s, active: e.target.checked }))}
                  />
                  Aktywny
                </label>
              </div>

              {/* Wybór usług dla nowego pracownika */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.45rem', marginTop: '.5rem' }}>
                {(editData.services || []).length ? (
                  editData.services.map(s => {
                    const checked = newStaff.serviceIds.includes(String(s._id));
                    return (
                      <label key={s._id} className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setNewStaff(prev => {
                              const set = new Set(prev.serviceIds.map(String));
                              if (e.target.checked) set.add(String(s._id));
                              else set.delete(String(s._id));
                              return { ...prev, serviceIds: Array.from(set) };
                            });
                          }}
                        />
                        {s.name}
                      </label>
                    );
                  })
                ) : (
                  <span className={styles.infoMuted}>Najpierw dodaj usługi w sekcji wyżej.</span>
                )}
              </div>

              <div style={{ marginTop: '.6rem' }}>
                <LoadingButton
                  type="button"
                  isLoading={isCreatingStaff}
                  disabled={isCreatingStaff}
                  className={styles.primary}
                  onClick={createStaff}
                >
                  <FaPlus style={{ transform: 'translateY(1px)' }} /> Dodaj pracownika
                </LoadingButton>
              </div>
            </div>
          ) : (
            <div className={styles.infoMuted}>
              Aby dodać pracownika, kliknij <strong>Edytuj profil</strong>.
            </div>
          )}
        </section>

        {/* =========================
          Linki i media
      ========================= */}
        <section className={styles.card}>
          <div className={styles.sectionTop}>
            <div>
              <h3 className={styles.sectionTitle}>Linki i media</h3>
              <p className={styles.sectionLead}>
                Uzupełnij tagi, linki i najważniejsze miejsca, gdzie użytkownicy mogą Cię znaleźć.
              </p>
            </div>
          </div>

          {/* Tagi */}
          <div className={styles.inputBlock}>
            <div className={styles.groupTitle}>
              <FaTags /> Tagi
            </div>

            {isEditing ? (
              <div className={styles.tagsWrapper}>
                {[0, 1, 2].map(i => (
                  <input
                    key={i}
                    type="text"
                    className={styles.formInput}
                    value={editData.tags?.[i] || ''}
                    placeholder={`Tag ${i + 1}`}
                    onChange={(e) => {
                      const newTags = [...(editData.tags || [])];
                      newTags[i] = e.target.value;
                      setEditData({ ...editData, tags: newTags });
                    }}
                  />
                ))}
                {formErrors.tags && <small className={styles.error}>{formErrors.tags}</small>}
              </div>
            ) : (
              <>
                {profile.tags?.length ? (
                  <div className={styles.tags}>
                    {profile.tags.map(tag => (
                      <span key={tag} className={styles.tag}>{tag.toUpperCase()}</span>
                    ))}
                  </div>
                ) : (
                  <p className={styles.noInfo}><span>❔</span> Nie dodałeś/aś jeszcze tagów.</p>
                )}
              </>
            )}
          </div>

          <div className={styles.subsection}></div>

          {/* Linki */}
          <div className={styles.inputBlock}>
            <div className={styles.groupTitle}>
              <FaLink /> Linki
            </div>

            {isEditing ? (
              <div className={styles.linksWrapper}>
                {[0, 1, 2].map(i => (
                  <input
                    key={i}
                    type="text"
                    className={styles.formInput}
                    value={editData.links?.[i] || ''}
                    placeholder={`Link ${i + 1}`}
                    onChange={(e) => {
                      const newLinks = [...(editData.links || [])];
                      newLinks[i] = e.target.value;
                      setEditData({ ...editData, links: newLinks });
                    }}
                  />
                ))}
              </div>
            ) : (
              <>
                {profile.links?.filter(Boolean).length ? (
                  <div className={styles.linksList}>
                    {profile.links.filter(Boolean).map((link, i) => (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.linkPill}
                      >
                        {prettyUrl(link)}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className={styles.noInfo}><span>❔</span> Nie dodałeś/aś jeszcze linków.</p>
                )}
              </>
            )}
          </div>
        </section>

        {/* =========================
      Galeria zdjęć
      ========================= */}
        <section className={styles.card}>
          <div className={styles.sectionTop}>
            <div>
              <h3 className={styles.sectionTitle}>Galeria zdjęć</h3>
              <p className={styles.sectionLead}>
                Dodawaj zdjęcia, które najlepiej pokazują Twoją ofertę, realizacje lub styl pracy.
              </p>
            </div>
          </div>

          {/* ======= PODGLĄD (bez edycji) ======= */}
          {!isEditing && (
            <div className={styles.galleryEditor}>
              {(profile?.photos || []).length ? (
                (profile.photos || []).map((p, idx) => (
                  <button
                    key={p.publicId || idx}
                    type="button"
                    className={`${styles.photoItem} ${styles.photoPreviewBtn}`}
                    onClick={() => openLightbox(getPhotoUrl(p))}
                    aria-label={`Otwórz zdjęcie ${idx + 1}`}
                  >
                    <img src={getPhotoUrl(p)} alt={`Zdjęcie ${idx + 1}`} />
                    <span className={styles.photoOverlay}>Podgląd</span>
                  </button>
                ))
              ) : (
                <p className={styles.noInfo}>
                  <span>❔</span> Nie dodałeś/aś jeszcze zdjęć w galerii.
                </p>
              )}
            </div>
          )}

          {/* ======= EDYCJA ======= */}
          {isEditing && (
            <div className={styles.galleryEditor}>
              {/* zapisane w profilu */}
              {(editData.photos || []).map((p, idx) => (
                <div key={p.publicId || idx} className={styles.photoItem}>
                  <button
                    type="button"
                    className={styles.photoPreviewBtn}
                    onClick={() => openLightbox(getPhotoUrl(p))}
                    aria-label={`Otwórz zdjęcie ${idx + 1}`}
                  >
                    <img src={getPhotoUrl(p)} alt={`Zdjęcie ${idx + 1}`} />
                    <span className={styles.photoOverlay}>Podgląd</span>
                  </button>

                  <div className={styles.photoButtons} onClick={(e) => e.stopPropagation()}>
                    {/* ✅ ZAMIEŃ */}
                    <label className={styles.ghost}>
                      Zamień
                      <input
                        type="file"
                        accept="image/*,.heic,.heif"
                        style={{ display: "none" }}
                        onChange={(e) => handleReplaceSavedPhoto(e, p?.publicId)}
                      />
                    </label>

                    {/* ✅ USUŃ */}
                    <button
                      type="button"
                      className={styles.ghost}
                      disabled={photosUploading}
                      onClick={() => removeSavedPhoto(p.publicId)}
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              ))}

              {/* pending (niezapisane) */}
              {newPhotoPreviews.map((url, idx) => (
                <div key={`pending-${idx}`} className={styles.photoItem}>
                  <button
                    type="button"
                    className={styles.photoPreviewBtn}
                    onClick={() => openLightbox(url)}
                    aria-label={`Otwórz nowe zdjęcie ${idx + 1}`}
                  >
                    <img src={url} alt={`Nowe zdjęcie ${idx + 1}`} />
                    <span className={styles.photoOverlay}>Podgląd</span>
                  </button>

                  <div className={styles.photoButtons} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={styles.ghost}
                      onClick={() => removePendingPhoto(idx)}
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              ))}

              {(editData.photos?.length + newPhotoFiles.length) < MAX_PHOTOS && (
                <>
                  <button type="button" className={styles.primary} onClick={openAddPhotoPicker}>
                    Dodaj zdjęcia
                  </button>
                  <input
                    ref={addPhotoInputRef}
                    type="file"
                    accept="image/*,.heic,.heif"
                    multiple
                    onChange={handleAddPhotosSelect}
                    style={{ display: "none" }}
                  />
                </>
              )}

              {(photosUploading || avatarUploading) && (
                <p className={styles.infoMuted}>⏳ Trwa upload zdjęć…</p>
              )}
            </div>
          )}
        </section>

        {/* =========================
          Informacje dodatkowe
      ========================= */}
        <section className={styles.card}>
          <div className={styles.sectionTop}>
            <div>
              <h3 className={styles.sectionTitle}>Informacje dodatkowe</h3>
              <p className={styles.sectionLead}>
                Podsumowanie danych biznesowych, ocen i opinii widocznych na Twojej wizytówce.
              </p>
            </div>
          </div>

          <div className={styles.extraInfo}>
            <div className={styles.statGrid}>
              {/* Działalność gospodarcza */}
              <div className={styles.statCard}>
                <div className={styles.statHead}>
                  <span className={styles.statIcon} aria-hidden="true"><FaBriefcase /></span>
                  <span className={styles.statLabel}>Działalność gospodarcza</span>
                </div>

                {profile.hasBusiness ? (
                  <div className={styles.statBody}>
                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>TAK</span>
                    <div className={styles.subRow}>
                      <span className={styles.subKey}>NIP:</span>
                      <span className={styles.subVal}>{profile.nip || 'brak'}</span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.statBody}>
                    <span className={`${styles.badge} ${styles.badgeMuted}`}>NIE</span>
                    <div className={styles.subRowMuted}>Brak zarejestrowanej działalności</div>
                  </div>
                )}
              </div>

              {/* Ocena i opinie */}
              <div className={styles.statCard}>
                <div className={styles.statHead}>
                  <span className={styles.statIcon} aria-hidden="true"><FaStar /></span>
                  <span className={styles.statLabel}>Ocena i opinie</span>
                </div>

                <div className={styles.statBody}>
                  <div className={styles.ratingRow}>
                    <span className={styles.ratingValue}>{Number(profile.rating || 0).toFixed(1)}</span>
                    <span className={styles.ratingStar} aria-hidden="true">⭐</span>
                  </div>
                  <div className={styles.subRow}>
                    <span className={styles.subKey}>Opinie:</span>
                    <span className={styles.subVal}>{profile.reviews || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
      Kontakt i social media
      ========================= */}
        <section className={styles.card}>
          <div className={styles.sectionTop}>
            <div>
              <h3 className={styles.sectionTitle}>Kontakt i social media</h3>
              <p className={styles.sectionLead}>
                Uzupełnij dane kontaktowe i linki do miejsc, w których klienci mogą się z Tobą skontaktować.
              </p>
            </div>
          </div>

          {/* KONTAKT */}
          <div className={styles.inputBlock}>
            <div className={styles.groupTitle}>
              <FaEnvelope /> Kontakt
            </div>

            {isEditing ? (
              <div className={styles.contactGrid}>
                <div className={styles.contactField}>
                  <label><FaEnvelope /> E-mail</label>
                  <input
                    className={`${styles.formInput} ${formErrors.contactEmail ? styles.inputError : ''}`}
                    value={editData.contact?.email || ''}
                    onChange={(e) =>
                      setEditData(prev => ({
                        ...prev,
                        contact: { ...(prev.contact || {}), email: e.target.value }
                      }))
                    }
                    placeholder="np. kontakt@twojadomena.pl"
                  />
                  {formErrors.contactEmail && <small className={styles.error}>{formErrors.contactEmail}</small>}
                </div>

                <div className={styles.contactField}>
                  <label><FaPhone /> Telefon</label>
                  <input
                    className={`${styles.formInput} ${formErrors.contactPhone ? styles.inputError : ''}`}
                    value={editData.contact?.phone || ''}
                    onChange={(e) =>
                      setEditData(prev => ({
                        ...prev,
                        contact: { ...(prev.contact || {}), phone: e.target.value }
                      }))
                    }
                    placeholder="np. +48 123 456 789"
                  />
                  {formErrors.contactPhone && <small className={styles.error}>{formErrors.contactPhone}</small>}
                </div>

                {/* Miejscowość (z location) */}
                <div className={styles.contactField}>
                  <label><FaMapMarkerAlt /> Miejscowość</label>
                  <input
                    className={styles.formInput}
                    value={editData.location || ''}
                    disabled
                    title="Miejscowość edytujesz w sekcji: Dane podstawowe → Lokalizacja"
                  />
                  <small className={styles.hint}>Miejscowość ustawiasz wyżej w profilu.</small>
                </div>

                {/* Kod pocztowy */}
                <div className={styles.contactField}>
                  <label><FaHome /> Kod pocztowy</label>
                  <input
                    className={`${styles.formInput} ${formErrors.contactPostcode ? styles.inputError : ''}`}
                    value={editData.contact?.postcode || ''}
                    onChange={(e) =>
                      setEditData(prev => ({
                        ...prev,
                        contact: { ...(prev.contact || {}), postcode: e.target.value }
                      }))
                    }
                    placeholder="np. 64-761"
                    maxLength={12}
                  />
                  {formErrors.contactPostcode && <small className={styles.error}>{formErrors.contactPostcode}</small>}
                </div>

                {/* Ulica + numer */}
                <div className={styles.contactField} style={{ gridColumn: '1 / -1' }}>
                  <label><FaHome /> Ulica i numer</label>
                  <input
                    className={`${styles.formInput} ${formErrors.contactStreet ? styles.inputError : ''}`}
                    value={editData.contact?.street || ''}
                    onChange={(e) =>
                      setEditData(prev => ({
                        ...prev,
                        contact: { ...(prev.contact || {}), street: e.target.value }
                      }))
                    }
                    placeholder="np. ul. Przykładowa 12"
                    maxLength={80}
                  />
                  {formErrors.contactStreet && <small className={styles.error}>{formErrors.contactStreet}</small>}
                </div>

                {/* Podgląd złożonego adresu */}
                <div className={styles.contactField} style={{ gridColumn: '1 / -1' }}>
                  <small className={styles.hint}>
                    Podgląd: {[editData.location, editData.contact?.postcode, editData.contact?.street].filter(Boolean).join(', ') || '—'}
                  </small>
                </div>

              </div>
            ) : (
              <ul className={styles.contactView}>
                <li className={styles.contactItem}>
                  <span className={styles.contactLabel}><FaEnvelope /> E-mail</span>
                  <span className={styles.contactValue}>{profile.contact?.email || '—'}</span>
                </li>
                <li className={styles.contactItem}>
                  <span className={styles.contactLabel}><FaPhone /> Telefon</span>
                  <span className={styles.contactValue}>{profile.contact?.phone || '—'}</span>
                </li>
                <li className={styles.contactItem}>
                  <span className={styles.contactLabel}><FaHome /> Adres</span>
                  <span className={styles.contactValue}>
                    {[profile.location, profile.contact?.postcode, profile.contact?.street].filter(Boolean).join(', ') || '—'}
                  </span>
                </li>

              </ul>
            )}
          </div>

          <div className={styles.subsection}></div>

          {/* SOCIALS */}
          <div className={styles.inputBlock}>
            <div className={styles.groupTitle}>
              <FaGlobe /> Social media
            </div>

            {isEditing ? (
              <div className={styles.socialGrid}>
                {[
                  { key: 'website', label: 'Strona', icon: <FaGlobe /> },
                  { key: 'facebook', label: 'Facebook', icon: <FaFacebook /> },
                  { key: 'instagram', label: 'Instagram', icon: <FaInstagram /> },
                  { key: 'youtube', label: 'YouTube', icon: <FaYoutube /> },
                  { key: 'tiktok', label: 'TikTok', icon: <FaTiktok /> },
                ].map((s) => (
                  <div key={s.key} className={styles.socialField}>
                    <label>{s.icon} {s.label}</label>
                    <input
                      className={`${styles.formInput} ${formErrors[`social_${s.key}`] ? styles.inputError : ''}`}
                      value={editData.socials?.[s.key] || ''}
                      onChange={(e) =>
                        setEditData(prev => ({
                          ...prev,
                          socials: { ...(prev.socials || {}), [s.key]: e.target.value }
                        }))
                      }
                      placeholder={`Link do ${s.label}`}
                    />
                    {formErrors[`social_${s.key}`] && (
                      <small className={styles.error}>{formErrors[`social_${s.key}`]}</small>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.socialPills}>
                {[
                  { key: 'website', label: 'WWW', icon: <FaGlobe /> },
                  { key: 'facebook', label: 'Facebook', icon: <FaFacebook /> },
                  { key: 'instagram', label: 'Instagram', icon: <FaInstagram /> },
                  { key: 'youtube', label: 'YouTube', icon: <FaYoutube /> },
                  { key: 'tiktok', label: 'TikTok', icon: <FaTiktok /> },
                ]
                  .filter(s => profile.socials?.[s.key])
                  .map((s) => (
                    <a
                      key={s.key}
                      href={profile.socials[s.key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.linkPill}
                      title={profile.socials[s.key]}
                    >
                      {s.icon} {s.label}
                    </a>
                  ))
                }

                {!Object.values(profile.socials || {}).some(Boolean) && (
                  <p className={styles.noInfo}><span>❔</span> Nie dodałeś/aś linków do social mediów.</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* =========================
          FAQ
        ========================= */}
        <section className={styles.card}>
          <div className={styles.sectionTop}>
            <div>
              <h3 className={styles.sectionTitle}>Szybkie odpowiedzi (FAQ)</h3>
              <p className={styles.sectionLead}>
                Krótkie pytania i odpowiedzi, które pomogą klientom szybciej zrozumieć Twoją ofertę.
              </p>
            </div>
          </div>

          {isEditing ? (
            <div className={styles.faqWrapper}>
              <div className={styles.qaGrid}>
                {[0, 1, 2].map((i) => {
                  const qaArray =
                    editData.quickAnswers?.length === 3
                      ? [...editData.quickAnswers]
                      : [{}, {}, {}].map((_, idx) => editData.quickAnswers?.[idx] || { title: '', answer: '' });

                  const title = qaArray[i].title || '';
                  const answer = qaArray[i].answer || '';

                  const onTitleChange = (e) => {
                    let value = e.target.value.slice(0, 10);
                    const newQA = [...qaArray];
                    newQA[i].title = value;

                    const newErrors = [...qaErrors];
                    newErrors[i].touched = true;
                    if (!value.trim()) newErrors[i].title = 'Tytuł jest wymagany';
                    else if (value.length > 10) newErrors[i].title = 'Tytuł max. 10 znaków';
                    else newErrors[i].title = '';

                    setEditData({ ...editData, quickAnswers: newQA });
                    setQaErrors(newErrors);
                  };

                  const onAnswerChange = (e) => {
                    let value = e.target.value.slice(0, 64);
                    const newQA = [...qaArray];
                    newQA[i].answer = value;

                    const newErrors = [...qaErrors];
                    newErrors[i].touched = true;
                    if (!value.trim()) newErrors[i].answer = 'Odpowiedź jest wymagana';
                    else if (value.length > 64) newErrors[i].answer = 'Maks. 64 znaki';
                    else newErrors[i].answer = '';

                    setEditData({ ...editData, quickAnswers: newQA });
                    setQaErrors(newErrors);
                  };

                  return (
                    <div key={i} className={styles.qaRow}>
                      <div className={styles.qaLabel}>
                        <span className={styles.qaBadge}>#{i + 1}</span>
                        <span className={styles.qaLabelText}>Pozycja FAQ</span>
                      </div>

                      <div className={styles.qaInputs}>
                        <div className={styles.qaField}>
                          <input
                            type="text"
                            className={`${styles.formInput} ${qaErrors[i]?.title ? styles.inputError : ''} ${styles.qaTitleInput}`}
                            placeholder={`Tytuł #${i + 1}`}
                            value={title}
                            maxLength={10}
                            onChange={onTitleChange}
                            aria-invalid={!!qaErrors[i]?.title}
                          />
                          <div className={styles.qaMeta}>
                            {qaErrors[i]?.touched && qaErrors[i]?.title && (
                              <small className={styles.error}>{qaErrors[i].title}</small>
                            )}
                            <small className={styles.counter}>{title.length}/10</small>
                          </div>
                        </div>

                        <div className={styles.qaField}>
                          <input
                            type="text"
                            className={`${styles.formInput} ${qaErrors[i]?.answer ? styles.inputError : ''} ${styles.qaAnswerInput}`}
                            placeholder={`Odpowiedź #${i + 1}`}
                            value={answer}
                            maxLength={64}
                            onChange={onAnswerChange}
                            aria-invalid={!!qaErrors[i]?.answer}
                          />
                          <div className={styles.qaMeta}>
                            {qaErrors[i]?.touched && qaErrors[i]?.answer && (
                              <small className={styles.error}>{qaErrors[i].answer}</small>
                            )}
                            <small className={styles.counter}>{answer.length}/64</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {formErrors.quickAnswers && <small className={styles.error}>{formErrors.quickAnswers}</small>}
            </div>
          ) : (
            <>
              {profile.quickAnswers?.length > 0 ? (
                <ul className={styles.faqList}>
                  {profile.quickAnswers.map((qa, i) => (
                    <li key={i} className={styles.faqItem}>
                      <span className={styles.faqQBadge}>{qa.title}</span>
                      <span className={styles.faqAnswer}>{qa.answer}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.noInfo}><span>❔</span> Nie dodałeś/aś jeszcze szybkich odpowiedzi.</p>
              )}
            </>
          )}
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

        {fullscreenImage && (
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
          </div>
        )}

      </div>
    </div>
  );
};

export default YourProfile;