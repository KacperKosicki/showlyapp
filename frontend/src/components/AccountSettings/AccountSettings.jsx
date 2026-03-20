import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import styles from "./AccountSettings.module.scss";
import { auth } from "../../firebase";
import AlertBox from "../AlertBox/AlertBox";
import LoadingButton from "../ui/LoadingButton/LoadingButton";
import {
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "firebase/auth";
import {
  FiUser,
  FiImage,
  FiSave,
  FiTrash2,
  FiLock,
  FiMail,
} from "react-icons/fi";

const API = process.env.REACT_APP_API_URL;

/** =========================
 * auth helpers (Bearer token)
 * ========================= */
async function authHeaders(extra = {}) {
  const u = auth.currentUser;
  if (!u) return { ...extra };
  const token = await u.getIdToken();
  return { Authorization: `Bearer ${token}`, ...extra };
}

const isLocalhostUrl = (u = "") => /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(u);

const normalizeAvatar = (val = "") => {
  if (!val) return "";

  if (/^https?:\/\//i.test(val)) {
    if (isLocalhostUrl(val)) return val;
    return val.replace(/^http:\/\//i, "https://");
  }

  if (val.startsWith("/uploads/")) return `${API}${val}`;
  if (val.startsWith("uploads/")) return `${API}/${val}`;

  return val;
};

export default function AccountSettings() {
  const location = useLocation();

  const [user, setUser] = useState(() => auth.currentUser || null);
  const [displayName, setDisplayName] = useState(auth.currentUser?.displayName || "");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loadingAction, setLoadingAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const fallbackImg = "/images/other/no-image.png";
  const showAlert = (type, message) => setAlert({ type, message });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        setLoading(true);

        if (!u) {
          setUser(null);
          setDisplayName("");
          setPreview(fallbackImg);
          return;
        }

        try {
          await u.reload();
        } catch {}

        setUser(auth.currentUser);
        setDisplayName(auth.currentUser?.displayName || "");

        try {
          const headers = await authHeaders({ Accept: "application/json" });
          const res = await fetch(`${API}/api/users/${u.uid}`, { headers });

          if (res.ok) {
            const dbUser = await res.json();
            const avatarUrl = dbUser?.avatar || auth.currentUser?.photoURL || fallbackImg;
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

  useEffect(() => {
    if (loading) return;

    let targetId = location.state?.scrollToId;

    if (!targetId && typeof window !== "undefined" && window.location.hash) {
      targetId = window.location.hash.replace("#", "").trim();
    }
    if (!targetId) return;

    const tryScroll = () => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
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
    if (!/^image\//.test(f.type)) {
      return showAlert("warning", "Wybierz plik graficzny.");
    }
    if (f.size > 2 * 1024 * 1024) {
      return showAlert("warning", "Maksymalny rozmiar to 2 MB.");
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSaveAvatar = async () => {
    if (!user || !file) return;

    try {
      setLoadingAction("saveAvatar");

      const form = new FormData();
      form.append("file", file);

      const headers = await authHeaders();

      const res = await fetch(`${API}/api/users/${user.uid}/avatar`, {
        method: "POST",
        headers,
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
      } catch {}

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

      const headers = await authHeaders();

      const res = await fetch(`${API}/api/users/${user.uid}/avatar`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Błąd usuwania");
      }

      try {
        await updateProfile(user, { photoURL: "" });
        await user.reload();
      } catch {}

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

      const headers = await authHeaders({ "Content-Type": "application/json" });

      await fetch(`${API}/api/users/${user.uid}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ displayName: clean }),
      }).catch(() => {});

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
    return (
      <section className={styles.section}>
        <div className={styles.sectionBackground} aria-hidden="true" />
        <div className={styles.inner}>
          <div className={styles.contentBox}>
            <div className={styles.loadingCard}>⏳ Ładowanie ustawień konta…</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="scrollToId" className={styles.section}>
      <div className={styles.sectionBackground} aria-hidden="true" />

      <div className={styles.inner}>
        {alert && (
          <div className={styles.alertWrap}>
            <AlertBox type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
          </div>
        )}

        <div className={styles.head}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Showly Account</span>
            <span className={styles.labelDot} />
            <span className={styles.labelDesc}>Ustawienia konta i profilu</span>
            <span className={styles.labelLine} />
            <span className={styles.pill}>Awatar • Nazwa • Hasło</span>
          </div>

          <h2 className={styles.heading}>
            Twoje <span className={styles.headingAccent}>konto</span> ⚙️
          </h2>

          <p className={styles.description}>
            Tutaj możesz zarządzać swoim <strong className={styles.inlineStrong}>awataren</strong>,
            nazwą wyświetlaną oraz bezpieczeństwem konta powiązanego z adresem{" "}
            <strong className={styles.inlineStrong}>{user?.email || "—"}</strong>.
          </p>

          <div className={styles.metaRow}>
            <div className={styles.metaCard}>
              <strong>{user?.email ? "OK" : "—"}</strong>
              <span>adres e-mail konta</span>
            </div>

            <div className={styles.metaCard}>
              <strong>{preview && preview !== fallbackImg ? "Tak" : "Nie"}</strong>
              <span>ustawiony awatar</span>
            </div>

            <div className={styles.metaCard}>
              <strong>{(displayName || "").trim() ? "Tak" : "Nie"}</strong>
              <span>ustawiona nazwa</span>
            </div>
          </div>
        </div>

        <div className={styles.contentBox}>
          <div className={styles.contentHeader}>
            <h3 className={styles.contentTitle}>Awatar konta</h3>
            <span className={styles.badge}>{file ? "do zapisu" : "OK"}</span>
          </div>

          <div className={styles.card}>
            <div className={styles.avatarRow}>
              <div className={styles.avatarWrap}>
                <img
                  src={preview || fallbackImg}
                  alt="avatar"
                  className={styles.avatar}
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = fallbackImg;
                  }}
                />
              </div>

              <div className={styles.controls}>
                <label className={styles.fileBtn}>
                  <input type="file" accept="image/*" onChange={onFileChange} />
                  <span className={styles.btnInner}>
                    <FiImage className={styles.btnIcon} />
                    <span>Wybierz plik</span>
                  </span>
                </label>

                <div className={styles.actionsRow}>
                  <LoadingButton
                    isLoading={loadingAction === "saveAvatar"}
                    disabled={!file || loadingAction !== null}
                    onClick={handleSaveAvatar}
                    className={styles.primary}
                  >
                    <span className={styles.btnInner}>
                      <FiSave className={styles.btnIcon} />
                      <span>Zapisz awatar</span>
                    </span>
                  </LoadingButton>

                  {preview && preview !== fallbackImg && (
                    <LoadingButton
                      isLoading={loadingAction === "removeAvatar"}
                      disabled={loadingAction !== null}
                      onClick={handleRemoveAvatar}
                      className={styles.ghost}
                    >
                      <span className={styles.btnInner}>
                        <FiTrash2 className={styles.btnIcon} />
                        <span>Usuń awatar</span>
                      </span>
                    </LoadingButton>
                  )}
                </div>

                <small className={styles.hint}>Obsługiwane obrazy, maksymalnie 2 MB.</small>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.contentBox}>
          <div className={styles.contentHeader}>
            <h3 className={styles.contentTitle}>Nazwa wyświetlana</h3>
            <span className={styles.badge}>{(displayName || "").trim() ? "OK" : "brak"}</span>
          </div>

          <div className={styles.card}>
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
                <span className={styles.btnInner}>
                  <FiSave className={styles.btnIcon} />
                  <span>Zapisz</span>
                </span>
              </LoadingButton>
            </div>

            <small className={styles.hint}>
              Ta nazwa może pojawiać się przy opiniach, konwersacjach, wiadomościach oraz
              rezerwacjach.
            </small>
          </div>
        </div>

        <div className={styles.contentBox}>
          <div className={styles.contentHeader}>
            <h3 className={styles.contentTitle}>Bezpieczeństwo hasła</h3>
            <span className={styles.badge}>reset</span>
          </div>

          <div className={styles.card}>
            <p className={styles.text}>
              Jeśli logujesz się hasłem, możesz wysłać na swój adres e-mail link do zmiany
              hasła i zaktualizować dostęp do konta.
            </p>

            <LoadingButton
              isLoading={loadingAction === "resetPass"}
              disabled={loadingAction !== null}
              onClick={handlePasswordReset}
              className={styles.secondary}
            >
              <span className={styles.btnInner}>
                <FiLock className={styles.btnIcon} />
                <span>Wyślij link do zmiany hasła</span>
              </span>
            </LoadingButton>
          </div>
        </div>
      </div>
    </section>
  );
}