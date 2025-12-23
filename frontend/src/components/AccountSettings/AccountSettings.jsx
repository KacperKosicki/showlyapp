import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './AccountSettings.module.scss';
import { auth } from '../../firebase';
import AlertBox from '../AlertBox/AlertBox';
import LoadingButton from "../ui/LoadingButton/LoadingButton"; // dopasuj ścieżkę
import {
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';

const API = process.env.REACT_APP_API_URL;

const isLocalhostUrl = (u = '') =>
  /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(u);

const normalizeAvatar = (val = '') => {
  if (!val) return '';

  // 1️⃣ absolutny URL
  if (/^https?:\/\//i.test(val)) {
    // ✅ localhost → zostaw jak jest
    if (isLocalhostUrl(val)) return val;

    // 🌍 produkcja → wymuś https
    return val.replace(/^http:\/\//i, 'https://');
  }

  // 2️⃣ uploady z backendu → zbuduj pełny URL z API
  if (val.startsWith('/uploads/')) return `${API}${val}`;
  if (val.startsWith('uploads/')) return `${API}/${val}`;

  return val;
};

export default function AccountSettings() {
  const location = useLocation();

  const [user, setUser] = useState(() => auth.currentUser || null);
  const [displayName, setDisplayName] = useState(auth.currentUser?.displayName || '');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [loadingAction, setLoadingAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const showAlert = (type, message) => setAlert({ type, message });
  const fallbackImg = '/images/other/no-image.png';

  // 🔄 Wczytaj świeżego usera + dane z backendu
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        setLoading(true);
        if (!u) {
          setUser(null);
          setDisplayName('');
          setPreview(fallbackImg);
          return;
        }
        try { await u.reload(); } catch { }
        setUser(auth.currentUser);
        setDisplayName(auth.currentUser?.displayName || '');

        try {
          const res = await fetch(`${API}/api/users/${u.uid}`);
          if (res.ok) {
            const dbUser = await res.json();
            const avatarUrl =
              dbUser?.avatar ||
              auth.currentUser?.photoURL ||
              fallbackImg;
            setPreview(normalizeAvatar(avatarUrl));
          } else {
            setPreview(normalizeAvatar(auth.currentUser?.photoURL) || fallbackImg);
          }
        } catch {
          setPreview(normalizeAvatar(auth.currentUser?.photoURL) || fallbackImg);
        }
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // 🧭 Scrollowanie po wejściu na stronę (z route state lub #hash)
  useEffect(() => {
    if (loading) return;
    let targetId = location.state?.scrollToId;

    if (!targetId && typeof window !== 'undefined' && window.location.hash) {
      targetId = window.location.hash.replace('#', '').trim();
    }

    if (!targetId) return;

    const tryScroll = () => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (location.state?.scrollToId) {
          window.history.replaceState({}, document.title, location.pathname + window.location.hash);
        }
      } else {
        requestAnimationFrame(tryScroll);
      }
    };
    requestAnimationFrame(tryScroll);
  }, [location.state, loading, location.pathname]);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) return showAlert('warning', 'Wybierz plik graficzny.');
    if (f.size > 2 * 1024 * 1024) return showAlert('warning', 'Maksymalny rozmiar to 2 MB.');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSaveAvatar = async () => {
    if (!user || !file) return;
    try {
      setLoadingAction("saveAvatar");

      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${API}/api/users/${user.uid}/avatar`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Błąd uploadu");
      }

      const { url } = await res.json();
      try {
        await updateProfile(user, { photoURL: url });
        await user.reload();
      } catch { }

      setPreview(normalizeAvatar(url));
      setFile(null);
      showAlert("success", "Zapisano nowy awatar.");
    } catch (e) {
      console.error(e);
      showAlert("error", "Nie udało się zapisać awataru.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    try {
      setLoadingAction("removeAvatar");

      const res = await fetch(`${API}/api/users/${user.uid}/avatar`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Błąd usuwania");
      }

      try {
        await updateProfile(user, { photoURL: "" });
        await user.reload();
      } catch { }

      setPreview(fallbackImg);
      setFile(null);
      showAlert("success", "Usunięto awatar.");
    } catch (e) {
      console.error(e);
      showAlert("error", "Nie udało się usunąć awataru.");
    } finally {
      setLoadingAction(null);
    }
  };


  const handleSaveDisplayName = async () => {
    if (!user) return;
    try {
      setLoadingAction("saveName");

      const clean = displayName.trim();
      await updateProfile(user, { displayName: clean });
      await user.reload();

      await fetch(`${API}/api/users/${user.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: clean }),
      }).catch(() => { });

      showAlert("success", "Zaktualizowano nazwę wyświetlaną.");
    } catch (e) {
      console.error(e);
      showAlert("error", "Nie udało się zapisać nazwy.");
    } finally {
      setLoadingAction(null);
    }
  };


  const handlePasswordReset = async () => {
    if (!user?.email) return showAlert("warning", "Brak adresu e-mail.");
    try {
      setLoadingAction("resetPass");
      await sendPasswordResetEmail(auth, user.email);
      showAlert("info", "Wysłaliśmy link do zmiany hasła.");
    } catch (e) {
      console.error(e);
      showAlert("error", "Nie udało się wysłać linku do resetu.");
    } finally {
      setLoadingAction(null);
    }
  };


  if (loading) {
    return <div className={styles.wrapper}>⏳ Ładowanie…</div>;
  }

  return (
    <div id="scrollToId" className={styles.wrapper}>
      {alert && (
        <AlertBox
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <h2>Twoje konto</h2>
      <p className={styles.sub}>
        Pomyślnie zalogowano jako: <strong>{user?.email || '—'}</strong>
      </p>

      {/* AVATAR */}
      <section id="avatarSection" className={styles.card}>
        <h3>Awatar</h3>
        <div className={styles.avatarRow}>
          <img
            src={preview || fallbackImg}
            alt="avatar"
            className={styles.avatar}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => { e.currentTarget.src = fallbackImg; }}
          />
          <div className={styles.controls}>
            <label className={styles.fileBtn}>
              <input type="file" accept="image/*" onChange={onFileChange} />
              Wybierz plik
            </label>
            <div className={styles.row}>
              <LoadingButton
                isLoading={loadingAction === "saveAvatar"}
                disabled={!file || loadingAction !== null}
                onClick={handleSaveAvatar}
                className={styles.primary}
              >
                Zapisz awatar
              </LoadingButton>

              {preview && preview !== fallbackImg && (
                <LoadingButton
                  isLoading={loadingAction === "removeAvatar"}
                  disabled={loadingAction !== null}
                  onClick={handleRemoveAvatar}
                  className={styles.ghost}
                >
                  Usuń awatar
                </LoadingButton>
              )}
            </div>
            <small className={styles.hint}>Obsługiwane obrazy, do 2 MB.</small>
          </div>
        </div>
      </section>

      {/* DISPLAY NAME */}
      <section id="nameSection" className={styles.card}>
        <h3>Nazwa wyświetlana</h3>
        <div className={styles.inline}>
          <input
            className={styles.input}
            type="text"
            placeholder="Twoja nazwa"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
          />
          <LoadingButton
            isLoading={loadingAction === "saveName"}
            disabled={loadingAction !== null}
            onClick={handleSaveDisplayName}
            className={styles.primary}
          >
            Zapisz
          </LoadingButton>
        </div>
        <small className={styles.hint}>
          Ta nazwa może pojawiać się przy opiniach, konwersacjach oraz rezerwacjach.
        </small>
      </section>

      {/* PASSWORD */}
      <section id="passwordSection" className={styles.card}>
        <h3>Hasło</h3>
        <p className={styles.text}>
          Jeśli logujesz się hasłem, wyślemy Ci e-mail z linkiem do zmiany hasła.
        </p>
        <LoadingButton
          isLoading={loadingAction === "resetPass"}
          disabled={loadingAction !== null}
          onClick={handlePasswordReset}
          className={styles.secondary}
        >
          Wyślij link do zmiany hasła
        </LoadingButton>
      </section>
    </div>
  );
}
