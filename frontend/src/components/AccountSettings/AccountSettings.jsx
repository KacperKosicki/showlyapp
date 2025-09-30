import { useEffect, useState } from 'react';
import styles from './AccountSettings.module.scss';
import { auth } from '../../firebase';
import AlertBox from '../AlertBox/AlertBox';
import {
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';

const API = process.env.REACT_APP_API_URL;

export default function AccountSettings() {
  const [user, setUser] = useState(() => auth.currentUser || null);
  const [displayName, setDisplayName] = useState(auth.currentUser?.displayName || '');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(''); // ustawimy po onAuthStateChanged
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ AlertBox (typ + treść)
  const [alert, setAlert] = useState(null); // { type: 'success'|'error'|'info'|'warning', message: string }
  const showAlert = (type, message) => setAlert({ type, message });

  const fallbackImg = '/images/other/no-image.png';

  // 🔄 wczytaj świeżego usera + dane z backendu
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

        // odśwież auth user (żeby mieć aktualne photoURL z Google, jeśli jest)
        try { await u.reload(); } catch {}

        setUser(auth.currentUser);
        setDisplayName(auth.currentUser?.displayName || '');

        // spróbuj pobrać usera z backendu (po firebaseUid)
        try {
          const res = await fetch(`${API}/api/users/${u.uid}`);
          if (res.ok) {
            const dbUser = await res.json();
            const avatarUrl =
              dbUser?.avatar ||
              auth.currentUser?.photoURL ||
              fallbackImg;
            setPreview(avatarUrl);
          } else {
            // jak nie ma w DB – fallback do Google albo no-image
            setPreview(auth.currentUser?.photoURL || fallbackImg);
          }
        } catch {
          setPreview(auth.currentUser?.photoURL || fallbackImg);
        }
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) return showAlert('warning', 'Wybierz plik graficzny.');
    if (f.size > 2 * 1024 * 1024) return showAlert('warning', 'Maksymalny rozmiar to 2 MB.');
    setFile(f);
    // natychmiastowy podgląd
    setPreview(URL.createObjectURL(f));
  };

  // ⬆️ Upload przez backend (Multer)
  const handleSaveAvatar = async () => {
    if (!user || !file) return;
    try {
      setSaving(true);

      const form = new FormData();
      form.append('file', file);

      const res = await fetch(`${API}/api/users/${user.uid}/avatar`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Błąd uploadu');
      }

      const { url } = await res.json();

      // (opcjonalnie) zaktualizuj photoURL w Firebase Auth
      try {
        await updateProfile(user, { photoURL: url });
        await user.reload();
      } catch {}

      // (opcjonalnie) możesz też PATCHnąć inne dane, ale avatar już jest zapisany przez POST
      setPreview(url);
      setFile(null);
      showAlert('success', 'Zapisano nowy awatar.');
    } catch (e) {
      console.error(e);
      showAlert('error', 'Nie udało się zapisać awataru.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    try {
      setSaving(true);

      const res = await fetch(`${API}/api/users/${user.uid}/avatar`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Błąd usuwania');
      }

      // (opcjonalnie) wyczyść też w Firebase Auth
      try {
        await updateProfile(user, { photoURL: '' });
        await user.reload();
      } catch {}

      setPreview(fallbackImg);
      setFile(null);
      showAlert('success', 'Usunięto awatar.');
    } catch (e) {
      console.error(e);
      showAlert('error', 'Nie udało się usunąć awataru.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDisplayName = async () => {
    if (!user) return;
    try {
      setSaving(true);

      const clean = displayName.trim();
      // 1) Firebase Auth (żeby np. komentarze/opinie mogły brać z auth)
      await updateProfile(user, { displayName: clean });
      await user.reload();

      // 2) Twoje API – trzymaj to samo w Mongo
      await fetch(`${API}/api/users/${user.uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: clean }),
      }).catch(() => {});

      showAlert('success', 'Zaktualizowano nazwę wyświetlaną.');
    } catch (e) {
      console.error(e);
      showAlert('error', 'Nie udało się zapisać nazwy.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return showAlert('warning', 'Brak adresu e-mail.');
    try {
      await sendPasswordResetEmail(auth, user.email);
      showAlert('info', 'Wysłaliśmy link do zmiany hasła.');
    } catch (e) {
      console.error(e);
      showAlert('error', 'Nie udało się wysłać linku do resetu.');
    }
  };

  if (loading) {
    return <div className={styles.wrapper}>⏳ Ładowanie…</div>;
  }

  return (
    <div className={styles.wrapper}>
      {/* ✅ Globalny AlertBox dla tego widoku */}
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
      <section className={styles.card}>
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
              <button
                className={styles.primary}
                onClick={handleSaveAvatar}
                disabled={!file || saving}
              >
                {saving ? 'Zapisywanie…' : 'Zapisz awatar'}
              </button>
              {preview && preview !== fallbackImg && (
                <button
                  className={styles.ghost}
                  onClick={handleRemoveAvatar}
                  disabled={saving}
                >
                  Usuń awatar
                </button>
              )}
            </div>
            <small className={styles.hint}>Obsługiwane obrazy, do 2 MB.</small>
          </div>
        </div>
      </section>

      {/* DISPLAY NAME */}
      <section className={styles.card}>
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
          <button
            className={styles.primary}
            onClick={handleSaveDisplayName}
            disabled={saving}
          >
            Zapisz
          </button>
        </div>
        <small className={styles.hint}>Ta nazwa może pojawiać się przy opiniach, konwersacjach oraz rezerwacjach.</small>
      </section>

      {/* PASSWORD */}
      <section className={styles.card}>
        <h3>Hasło</h3>
        <p className={styles.text}>
          Jeśli logujesz się hasłem, wyślemy Ci e-mail z linkiem do zmiany hasła.
        </p>
        <button className={styles.secondary} onClick={handlePasswordReset}>
          Wyślij link do zmiany hasła
        </button>
      </section>
    </div>
  );
}
