import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import styles from "./AccountSettings.module.scss";
import { auth } from "../../firebase";
import AlertBox from "../AlertBox/AlertBox";
import {
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "firebase/auth";
import { FiImage, FiSave, FiTrash2, FiLock, FiUser, FiShield } from "react-icons/fi";

const API = process.env.REACT_APP_API_URL;

async function authHeaders(extra = {}) {
  const u = auth.currentUser;
  if (!u) return { ...extra };
  const token = await u.getIdToken();
  return { Authorization: `Bearer ${token}`, ...extra };
}

const isLocalhostUrl = (u = "") =>
  /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(u);

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

const LoadingDots = ({ active }) => (
  <span
    className={`${styles.loadingDots} ${active ? styles.loadingDotsActive : ""}`}
    aria-hidden="true"
  >
    <span />
    <span />
    <span />
  </span>
);

const ButtonContent = ({ icon, children, isLoading }) => (
  <span
    className={styles.btnContent}
    data-loading={isLoading ? "true" : "false"}
  >
    <span className={styles.btnNormalContent}>
      <span className={styles.btnIcon}>{icon}</span>
      <span className={styles.btnLabel}>{children}</span>
    </span>

    {typeof isLoading === "boolean" && <LoadingDots active={isLoading} />}
  </span>
);

const ActionButton = ({
  isLoading = false,
  disabled = false,
  onClick,
  className = "",
  icon,
  children,
}) => (
  <button
    type="button"
    className={`${styles.btn} ${className}`}
    disabled={disabled || isLoading}
    onClick={onClick}
    aria-busy={isLoading ? "true" : "false"}
    data-loading={isLoading ? "true" : "false"}
  >
    <ButtonContent icon={icon} isLoading={isLoading}>
      {children}
    </ButtonContent>
  </button>
);

export default function AccountSettings() {
  const location = useLocation();

  const [user, setUser] = useState(() => auth.currentUser || null);
  const [displayName, setDisplayName] = useState(
    auth.currentUser?.displayName || ""
  );
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loadingAction, setLoadingAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const fallbackImg = "/images/other/no-image.png";

  const showAlert = (type, message) => {
    setAlert({ type, message });
  };

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
        } catch { }

        const freshUser = auth.currentUser;

        setUser(freshUser);
        setDisplayName(freshUser?.displayName || "");

        try {
          const headers = await authHeaders({ Accept: "application/json" });
          const res = await fetch(`${API}/api/users/${u.uid}`, { headers });

          if (res.ok) {
            const dbUser = await res.json();
            const avatarUrl =
              dbUser?.avatar || freshUser?.photoURL || fallbackImg;

            setPreview(normalizeAvatar(avatarUrl));
          } else {
            setPreview(normalizeAvatar(freshUser?.photoURL) || fallbackImg);
          }
        } catch {
          setPreview(normalizeAvatar(freshUser?.photoURL) || fallbackImg);
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
          window.history.replaceState(
            {},
            document.title,
            location.pathname + window.location.hash
          );
        }

        return;
      }

      requestAnimationFrame(tryScroll);
    };

    requestAnimationFrame(tryScroll);
  }, [location.state, loading, location.pathname]);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!/^image\//.test(f.type)) {
      e.target.value = "";
      return showAlert("warning", "Wybierz plik graficzny.");
    }

    if (f.size > 2 * 1024 * 1024) {
      e.target.value = "";
      return showAlert("warning", "Maksymalny rozmiar to 2 MB.");
    }

    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
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

      const headers = await authHeaders({
        "Content-Type": "application/json",
      });

      await fetch(`${API}/api/users/${user.uid}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ displayName: clean }),
      }).catch(() => { });

      setUser(auth.currentUser);
      showAlert("success", "Zaktualizowano nazwę wyświetlaną.");
    } catch (e) {
      console.error(e);
      showAlert("error", "Nie udało się zapisać nazwy.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      return showAlert("warning", "Brak adresu e-mail.");
    }

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
        <div className={styles.inner}>
          <div className={styles.loadingCard}>Ładowanie ustawień konta…</div>
        </div>
      </section>
    );
  }

  const hasAvatar = Boolean(preview && preview !== fallbackImg);
  const hasDisplayName = Boolean(displayName.trim());

  return (
    <section id="scrollToId" className={styles.section}>
      <div className={styles.inner}>
        {alert && (
          <div className={styles.alertSlot}>
            <AlertBox
              type={alert.type}
              message={alert.message}
              onClose={() => setAlert(null)}
            />
          </div>
        )}

        <div className={styles.layout}>
          <aside className={styles.side}>
            <h2 className={styles.heading}>
              Ustawienia <span>konta</span>
            </h2>

            <p className={styles.description}>
              Zarządzaj danymi widocznymi w Showly, zdjęciem konta oraz
              bezpieczeństwem logowania.
            </p>

            <div className={styles.metaRow}>
              <div className={styles.metaCard}>
                <strong>{user?.email ? "OK" : "—"}</strong>
                <span>adres e-mail konta</span>
              </div>

              <div className={styles.metaCard}>
                <strong>{hasAvatar ? "Tak" : "Nie"}</strong>
                <span>ustawiony awatar</span>
              </div>

              <div className={styles.metaCard}>
                <strong>{hasDisplayName ? "Tak" : "Nie"}</strong>
                <span>nazwa wyświetlana</span>
              </div>
            </div>

            <div className={styles.infoBox}>
              <span>Profil • Konto • Bezpieczeństwo</span>
              <p>
                Zmiany zapisujesz osobno w każdej sekcji. Dzięki temu masz
                pełną kontrolę nad tym, co aktualizujesz.
              </p>
            </div>
          </aside>

          <div className={styles.content}>
            <div className={styles.chapterHeadMain}>
              <div>
                <span className={styles.chapterLabel}>Centrum ustawień</span>
                <h3>Twoje dane i dostęp w jednym miejscu.</h3>
              </div>

              <span className={styles.chapterNumber}>03</span>
            </div>

            <div className={styles.settingsStack}>
              <section className={styles.settingGroup}>
                <div className={styles.groupHeader}>
                  <div>
                    <span className={styles.groupLabel}>Zdjęcie konta</span>
                    <h4>Awatar użytkownika</h4>
                  </div>

                  <span className={styles.groupBadge}>
                    {file ? "do zapisu" : hasAvatar ? "ustawiony" : "brak"}
                  </span>
                </div>

                <div className={styles.groupBody}>
                  <div className={styles.avatarRow}>
                    <div className={styles.avatarPreview}>
                      <img
                        src={preview || fallbackImg}
                        alt="Avatar użytkownika"
                        className={styles.avatar}
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = fallbackImg;
                        }}
                      />
                    </div>

                    <div className={styles.controls}>
                      <div className={styles.sectionIconRow}>
                        <span className={styles.sectionIcon}><FiImage /></span>
                        <p>
                          Wybierz zdjęcie, które będzie reprezentować Twoje konto
                          w wiadomościach, rezerwacjach i aktywności w Showly.
                        </p>
                      </div>

                      <label className={styles.fileBtn}>
                        <input type="file" accept="image/*" onChange={onFileChange} />
                        <ButtonContent icon={<FiImage />}>Wybierz plik</ButtonContent>
                      </label>

                      <div className={styles.actionsRow}>
                        <ActionButton
                          isLoading={loadingAction === "saveAvatar"}
                          disabled={!file || loadingAction !== null}
                          onClick={handleSaveAvatar}
                          className={styles.primary}
                          icon={<FiSave />}
                        >
                          Zapisz awatar
                        </ActionButton>

                        {hasAvatar && (
                          <ActionButton
                            isLoading={loadingAction === "removeAvatar"}
                            disabled={loadingAction !== null}
                            onClick={handleRemoveAvatar}
                            className={styles.ghost}
                            icon={<FiTrash2 />}
                          >
                            Usuń awatar
                          </ActionButton>
                        )}
                      </div>

                      <small className={styles.hint}>
                        Obsługiwane są pliki graficzne do 2 MB.
                      </small>
                    </div>
                  </div>
                </div>
              </section>

              <section className={styles.settingGroup}>
                <div className={styles.groupHeader}>
                  <div>
                    <span className={styles.groupLabel}>Dane publiczne</span>
                    <h4>Nazwa wyświetlana</h4>
                  </div>

                  <span className={styles.groupBadge}>
                    {hasDisplayName ? "ustawiona" : "brak"}
                  </span>
                </div>

                <div className={styles.groupBody}>
                  <div className={styles.sectionIconRow}>
                    <span className={styles.sectionIcon}><FiUser /></span>
                    <p>
                      Ta nazwa może pojawiać się przy opiniach, wiadomościach,
                      konwersacjach oraz rezerwacjach.
                    </p>
                  </div>

                  <div className={styles.inline}>
                    <input
                      className={styles.input}
                      type="text"
                      placeholder="Twoja nazwa"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={40}
                    />

                    <ActionButton
                      isLoading={loadingAction === "saveName"}
                      disabled={loadingAction !== null}
                      onClick={handleSaveDisplayName}
                      className={styles.primary}
                      icon={<FiSave />}
                    >
                      Zapisz nazwę
                    </ActionButton>
                  </div>
                </div>
              </section>

              <section className={styles.settingGroup}>
                <div className={styles.groupHeader}>
                  <div>
                    <span className={styles.groupLabel}>Bezpieczeństwo</span>
                    <h4>Zmiana hasła</h4>
                  </div>

                  <span className={styles.groupBadge}>e-mail</span>
                </div>

                <div className={styles.groupBody}>
                  <div className={styles.sectionIconRow}>
                    <span className={styles.sectionIcon}><FiShield /></span>
                    <p>
                      Wyślemy link do zmiany hasła na adres przypisany do
                      Twojego konta: <strong>{user?.email || "brak adresu"}</strong>.
                    </p>
                  </div>

                  <ActionButton
                    isLoading={loadingAction === "resetPass"}
                    disabled={loadingAction !== null}
                    onClick={handlePasswordReset}
                    className={styles.secondary}
                    icon={<FiLock />}
                  >
                    Wyślij link do zmiany hasła
                  </ActionButton>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
