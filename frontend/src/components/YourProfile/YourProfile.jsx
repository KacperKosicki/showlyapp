// YourProfile.jsx
import { useEffect, useState, useRef } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import styles from './YourProfile.module.scss';
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
  FaTimes
} from 'react-icons/fa';

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
    durationValue: '',
    durationUnit: 'minutes'
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
  const DEFAULT_AVATAR = '/images/other/no-image.png';

  // =========================
  // Utils
  // =========================
  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  useEffect(() => {
    const scrollTo = location.state?.scrollToId;
    if (!scrollTo || loading) return;
    const tryScroll = () => {
      const el = document.getElementById(scrollTo);
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
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/profiles/by-user/${user.uid}`);
      const p = res.data;
      const now = new Date();
      const until = new Date(p.visibleUntil);
      if (until < now) p.isVisible = false;

      setProfile(p);

      const photos = p.photos || [];
      const photoHashes = await Promise.all(photos.map(ph => hashString(ph)));

      setEditData({
        ...p,
        services: p.services || [],
        photos,
        photoHashes,
        quickAnswers: p.quickAnswers || [
          { title: '', answer: '' }, { title: '', answer: '' }, { title: '', answer: '' }
        ],
        bookingMode: p.bookingMode || 'request-open',
        workingHours: p.workingHours || { from: '08:00', to: '20:00' },
        workingDays: p.workingDays || [1, 2, 3, 4, 5],
        team: p.team || { enabled: false, assignmentMode: 'user-pick' }, // ⬅️ DODAJ
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
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // =========================
  // Staff: API
  // =========================
  const fetchStaff = async (profileId) => {
    if (!profileId) return;
    try {
      setStaffLoading(true);
      // API: GET /api/staff?profileId=...
      const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/api/staff`, {
        params: { profileId }
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
    if (!profile?._id) return;
    if (!newStaff.name.trim()) {
      showAlert('Podaj imię pracownika.', 'warning');
      return;
    }
    try {
      // API: POST /api/staff
      const payload = {
        profileId: profile._id,
        name: newStaff.name.trim(),
        capacity: Number(newStaff.capacity) || 1,
        active: !!newStaff.active,
        serviceIds: newStaff.serviceIds || []
      };
      await axios.post(`${process.env.REACT_APP_API_URL}/api/staff`, payload);
      setNewStaff({ name: '', capacity: 1, active: true, serviceIds: [] });
      await fetchStaff(profile._id);
      showAlert('Dodano pracownika.', 'success');
    } catch (e) {
      console.error('Błąd dodawania pracownika', e);
      showAlert('Błąd dodawania pracownika.', 'error');
    }
  };

  const deleteStaff = async (id) => {
    // optymistycznie usuń z listy od razu
    setStaff(prev => prev.filter(s => s._id !== id));

    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/staff/${id}`);
      showAlert('Usunięto pracownika.', 'success');
    } catch (e) {
      console.error('Błąd usuwania pracownika', e);
      // przy błędzie przywróć listę z serwera
      await fetchStaff(profile._id);
      showAlert('Błąd usuwania pracownika.', 'error');
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

  const fileToDataUrlAndHash = async (file) => {
    const buf = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    const hashHex = Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    return { dataUrl, hash: hashHex };
  };

  // =========================
  // Handlery obrazów
  // =========================
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showAlert('Nieprawidłowy format. Wybierz obraz.', 'warning');
      e.target.value = '';
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showAlert('Zdjęcie jest za duże (maks. 3MB).', 'warning');
      e.target.value = '';
      return;
    }

    try {
      const { dataUrl } = await fileToDataUrlAndHash(file);
      setEditData(prev => ({ ...prev, avatar: dataUrl }));
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    setEditData(prev => ({ ...prev, avatar: null }));
    fileInputRef.current && (fileInputRef.current.value = '');
    showAlert('Usunięto zdjęcie profilowe. Utrwal zmianę przyciskiem „Zapisz”.', 'info');
  };

  const handlePhotoChange = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) { showAlert('Nieprawidłowy format pliku. Wybierz obraz.', 'warning'); e.target.value = ''; return; }
    if (file.size > 3 * 1024 * 1024) { showAlert('Zdjęcie jest za duże (maks. 3MB).', 'warning'); e.target.value = ''; return; }

    try {
      const { dataUrl, hash } = await fileToDataUrlAndHash(file);

      setEditData(prev => {
        const hashes = prev.photoHashes || [];
        const photos = [...(prev.photos || [])];

        const alreadyIdx = hashes.indexOf(hash);
        if (alreadyIdx !== -1 && alreadyIdx !== index) {
          showAlert('To zdjęcie już jest w galerii.', 'info');
          return prev;
        }

        photos[index] = dataUrl;
        const nextHashes = [...hashes];
        nextHashes[index] = hash;

        return { ...prev, photos, photoHashes: nextHashes };
      });
    } finally {
      e.target.value = '';
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
    return errors;
  };

  const openAddPhotoPicker = () => {
    const current = (editData.photos || []).length;
    if (current >= MAX_PHOTOS) {
      showAlert('Można dodać maksymalnie ${MAX_PHOTOS} zdjęć.', 'warning');
      return;
    }
    addPhotoInputRef.current?.click();
  };

  const handleAddPhotosSelect = async (e) => {
    const filesAll = Array.from(e.target.files || []);
    if (!filesAll.length) return;

    const existing = (editData.photos || []).length;
    const slotsLeft = Math.max(0, MAX_PHOTOS - existing);
    const files = filesAll.slice(0, slotsLeft);

    const accepted = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) { showAlert('Pominięto plik: nie jest obrazem.', 'warning'); continue; }
      if (file.size > 3 * 1024 * 1024) { showAlert('Pominięto plik > 3MB.', 'warning'); continue; }

      try {
        const { dataUrl, hash } = await fileToDataUrlAndHash(file);
        accepted.push({ dataUrl, hash });
      } catch {
        showAlert('Nie udało się wczytać jednego z plików.', 'error');
      }
    }

    if (!accepted.length) { e.target.value = ''; return; }

    setEditData(prev => {
      const existingPhotos = prev.photos || [];
      const existingHashes = prev.photoHashes || [];

      let fresh = accepted.filter(x => !existingHashes.includes(x.hash));
      fresh = fresh.filter(x => !existingPhotos.includes(x.dataUrl));

      if (fresh.length < accepted.length) {
        showAlert('Pominięto duplikaty zdjęć.', 'info');
      }

      const nextPhotos = [...existingPhotos, ...fresh.map(x => x.dataUrl)].slice(0, MAX_PHOTOS);
      const nextHashes = [...existingHashes, ...fresh.map(x => x.hash)].slice(0, MAX_PHOTOS);

      return { ...prev, photos: nextPhotos, photoHashes: nextHashes };
    });

    e.target.value = '';
  };

  const handleRemovePhoto = (index) => {
    setEditData(prev => {
      const p = [...(prev.photos || [])];
      const h = [...(prev.photoHashes || [])];
      p.splice(index, 1);
      h.splice(index, 1);
      return { ...prev, photos: p, photoHashes: h };
    });
  };

  const handleExtendVisibility = async () => {
    try {
      await axios.patch(`${process.env.REACT_APP_API_URL}/api/profiles/extend/${user.uid}`);
      await fetchProfile();
      setRefreshTrigger(Date.now());
    } catch (err) {
      console.error('❌ Błąd przedłużania widoczności:', err);
      showAlert('Nie udało się przedłużyć widoczności.', 'error');
    }
  };

  const handleSaveChanges = async () => {
    const errors = validateEditData(editData);

    // Walidacja czasu usług
    if ((editData.services || []).some(s =>
      (s.duration.unit === 'minutes' && s.duration.value < 15) ||
      (s.duration.unit === 'hours' && s.duration.value < 1) ||
      (s.duration.unit === 'days' && s.duration.value < 1)
    )) {
      errors.services = 'Każda usługa musi mieć minimum 15 minut, 1 godzinę lub 1 dzień!';
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      showAlert('Uzupełnij poprawnie wszystkie wymagane pola.', 'warning');
      return;
    }

    try {
      const { photoHashes, ...payload } = editData;

      // 1) Zapis profilu
      await axios.patch(`${process.env.REACT_APP_API_URL}/api/profiles/update/${user.uid}`, {
        ...payload,
        showAvailableDates: !!payload.showAvailableDates,
        tags: (payload.tags || []).filter(tag => tag.trim() !== ''),
        quickAnswers: (payload.quickAnswers || []).filter(qa => qa.title?.trim() || qa.answer?.trim()),
        team: payload.team || { enabled: false, assignmentMode: 'user-pick' },
      });

      // 2) Zbiorczy zapis zmian pracowników (tylko te, które zmieniono)
      const staffUpdateEntries = Object.entries(staffEdits); // [[id, changes], ...]
      if (staffUpdateEntries.length) {
        await Promise.all(
          staffUpdateEntries.map(([id, changes]) =>
            axios.patch(`${process.env.REACT_APP_API_URL}/api/staff/${id}`, changes)
          )
        );
      }

      // 3) Odśwież dane i posprzątaj lokalny stan edycji
      await fetchProfile();
      setStaffEdits({});          // wyczyść „brudne” zmiany pracowników
      setIsEditing(false);
      setFormErrors({});
      showAlert('Zapisano zmiany!', 'success');
    } catch (err) {
      console.error('❌ Błąd zapisu profilu/pracowników:', err);
      showAlert('Wystąpił błąd podczas zapisywania.', 'error');
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

  // =========================
  // Render
  // =========================
  return (
    <div className={styles.wrapper} id="scrollToId">
      {alert && <div className={styles.toast}>{alert.message}</div>}

      <div className={styles.headerBar}>
        <div className={styles.headerText}>
          <h2>Twój profil</h2>
          <p className={styles.sub}>
            {profile
              ? <>Pomyślnie wczytano Twój profil: <strong>{profile.name}</strong></>
              : 'Ładowanie danych…'}
          </p>
        </div>

        {!isEditing && (
          <div className={styles.headerActions}>
            <button
              onClick={() => setIsEditing(true)}
              className={styles.primary}
              aria-label="Edytuj profil"
            >
              Edytuj profil
            </button>
          </div>
        )}
      </div>

      {!profile.isVisible && (
        <div className={`${styles.card} ${styles.expiredNotice}`}>
          <p>🔒 Twój profil jest <strong>niewidoczny</strong>.</p>
          <p>Wygasł: <strong>{new Date(profile.visibleUntil).toLocaleDateString()}</strong></p>
          <button className={styles.secondary} onClick={handleExtendVisibility}>Przedłuż widoczność</button>
        </div>
      )}

      {/* =========================
          Dane podstawowe
      ========================= */}
      <section className={styles.card}>
        <h3>Dane podstawowe</h3>

        <div className={styles.basicInfoRow}>
          {/* Avatar */}
          <div className={styles.avatarRow}>
            <img
              src={(isEditing ? editData.avatar : profile.avatar) || DEFAULT_AVATAR}
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

                <small className={styles.hint}>Kwadratowe najlepiej wygląda. Max ok. 2–3 MB.</small>
              </div>
            )}
          </div>

          {/* Kolumna z danymi */}
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
                  {formErrors.profileType && <small className={styles.error}>{formErrors.profileType}</small>}
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
        <h3>Opis</h3>
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
          Dostępność i usługi
      ========================= */}
      <section className={styles.card}>
        <h3>Dostępność i usługi</h3>

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
              {editData.services.map((s, i) => (
                <div key={i} className={styles.serviceEditRow}>
                  <input
                    className={styles.formInput}
                    type="text"
                    value={s.name}
                    placeholder="Nazwa usługi"
                    onChange={e => {
                      const arr = [...editData.services];
                      arr[i].name = e.target.value;
                      setEditData(prev => ({ ...prev, services: arr }));
                    }}
                  />
                  <div className={styles.inline}>
                    <input
                      className={styles.formInput}
                      type="number"
                      min="1"
                      value={s.duration.value}
                      placeholder="Czas"
                      onChange={e => {
                        const arr = [...editData.services];
                        arr[i].duration.value = parseInt(e.target.value || '0', 10);
                        setEditData(prev => ({ ...prev, services: arr }));
                      }}
                    />
                    <select
                      className={styles.formInput}
                      value={s.duration.unit}
                      onChange={e => {
                        const arr = [...editData.services];
                        arr[i].duration.unit = e.target.value;
                        setEditData(prev => ({ ...prev, services: arr }));
                      }}
                    >
                      <option value="minutes">minuty</option>
                      <option value="hours">godziny</option>
                      <option value="days">dni</option>
                    </select>
                    <button
                      type="button"
                      className={styles.ghost}
                      onClick={() =>
                        setEditData(prev => ({
                          ...prev,
                          services: prev.services.filter((_, idx) => idx !== i)
                        }))
                      }
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              ))}

              <div className={styles.separator} />

              {/* Nowa usługa */}
              <div className={styles.serviceEditRow}>
                <input
                  className={styles.formInput}
                  type="text"
                  placeholder="Nowa nazwa usługi"
                  value={newService.name}
                  onChange={e => setNewService(prev => ({ ...prev, name: e.target.value }))}
                />
                <div className={styles.inline}>
                  <input
                    className={styles.formInput}
                    type="number"
                    min="1"
                    placeholder="Czas"
                    value={newService.durationValue}
                    onChange={e => setNewService(prev => ({ ...prev, durationValue: e.target.value }))}
                  />
                  <select
                    className={styles.formInput}
                    value={newService.durationUnit}
                    onChange={e => setNewService(prev => ({ ...prev, durationUnit: e.target.value }))}
                  >
                    <option value="minutes">minuty</option>
                    <option value="hours">godziny</option>
                    <option value="days">dni</option>
                  </select>
                  <button
                    type="button"
                    className={styles.primary}
                    onClick={() => {
                      if (newService.name.trim() && Number(newService.durationValue) > 0) {
                        setEditData(prev => ({
                          ...prev,
                          services: [
                            ...prev.services,
                            {
                              name: newService.name.trim(),
                              duration: {
                                value: parseInt(newService.durationValue, 10),
                                unit: newService.durationUnit
                              }
                            }
                          ]
                        }));
                        setNewService({ name: '', durationValue: '', durationUnit: 'minutes' });
                      }
                    }}
                  >
                    Dodaj usługę
                  </button>
                </div>
              </div>

              {formErrors.services && <small className={styles.error}>{formErrors.services}</small>}
            </>
          ) : profile.services?.length > 0 ? (
            <ul className={styles.serviceList}>
              {profile.services.map((s, i) => (
                <li key={i}>
                  <strong>{s.name}</strong>
                  <span className={styles.durationBadge}>
                    {s.duration.value} {mapUnit(s.duration.unit)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.noInfo}><span>❔</span> Nie dodałeś/aś jeszcze żadnych usług.</p>
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

        {/* ZESPÓŁ – ustawienia (spójne z resztą sekcji) */}
        <div className={styles.inputBlock}>
          <div className={styles.groupTitle}>
            <FaUsers /> Zespół — ustawienia rezerwacji
          </div>

          {isEditing ? (
            <>
              <label className={styles.checkboxLabel} style={{ marginBottom: 10 }}>
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

              <div className={styles.inline}>
                <span style={{ fontWeight: 600 }}>Tryb przydziału:</span>
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
                  style={{ maxWidth: 320 }}
                >
                  <option value="user-pick">Klient wybiera pracownika</option>
                  <option value="auto-assign">Automatyczny przydział</option>
                </select>
              </div>

              {!editData.team?.enabled && (
                <div className={styles.infoMuted} style={{ marginTop: 8 }}>
                  Wyłączone — wybór pracownika nie będzie pokazywany w rezerwacji.
                </div>
              )}
            </>
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
        <h3>Pracownicy</h3>

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
                        <button
                          type="button"
                          className={styles.ghost}
                          onClick={() => deleteStaff(st._id)}
                          title="Usuń"
                        >
                          <FaTrash style={{ transform: 'translateY(1px)' }} /> Usuń
                        </button>
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
              <button type="button" className={styles.primary} onClick={createStaff}>
                <FaPlus style={{ transform: 'translateY(1px)' }} /> Dodaj pracownika
              </button>
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
        <h3>Linki i media</h3>

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
        <h3>Galeria zdjęć</h3>
        <div className={styles.galleryEditor}>
          {isEditing ? (
            <>
              {(editData.photos || []).map((photo, index) => (
                <div key={index} className={styles.photoItem}>
                  <img src={photo} alt={`Zdjęcie ${index + 1}`} />
                  <div className={styles.photoButtons}>
                    <button className={styles.ghost} onClick={() => handleRemovePhoto(index)}>Usuń</button>
                    <label className={styles.fileBtn}>
                      Zamień
                      <input type="file" accept="image/*,.heic,.heif" onChange={(e) => handlePhotoChange(e, index)} />
                    </label>
                  </div>
                </div>
              ))}
              {editData.photos?.length < MAX_PHOTOS && (
                <>
                  <button
                    type="button"
                    className={styles.primary}
                    onClick={openAddPhotoPicker}
                  >
                    Dodaj zdjęcie
                  </button>
                  <input
                    ref={addPhotoInputRef}
                    type="file"
                    accept="image/*,.heic,.heif"
                    multiple
                    onChange={handleAddPhotosSelect}
                    style={{ display: 'none' }}
                  />
                </>
              )}
            </>
          ) : (
            <div className={styles.galleryView}>
              {profile.photos?.length > 0 ? (
                profile.photos.map((photo, i) => (
                  <img key={i} src={photo} alt={`Zdjęcie ${i + 1}`} />
                ))
              ) : (
                <p className={styles.noInfo}><span>❔</span> Nie dodałeś/aś jeszcze zdjęć.</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* =========================
          Informacje dodatkowe
      ========================= */}
      <section className={styles.card}>
        <h3>Informacje dodatkowe</h3>

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
          FAQ
      ========================= */}
      <section className={styles.card}>
        <h3>Szybkie odpowiedzi (FAQ)</h3>

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
              <button
                type="button"
                className={styles.primary}
                onClick={handleSaveChanges}
              >
                Zapisz zmiany profilu
              </button>

              <button
                type="button"
                className={styles.ghost}
                onClick={() => {
                  setEditData(profile);
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

    </div>
  );
};

export default YourProfile;
