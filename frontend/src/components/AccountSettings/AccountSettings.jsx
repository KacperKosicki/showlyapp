import DataLoader from '../ui/DataLoader/DataLoader';
import PanelBackdrop from '../PanelBackdrop/PanelBackdrop';
import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import {
  FiImage,
  FiLock,
  FiSave,
  FiShield,
  FiTrash2,
  FiUser,
} from "react-icons/fi";
import { useLocation } from "react-router-dom";

import { auth } from "../../firebase";
import AlertBox from "../AlertBox/AlertBox";
import styles from "./AccountSettings.module.scss";

const API = process.env.REACT_APP_API_URL;

async function authHeaders(extra = {}) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    return { ...extra };
  }

  const token = await currentUser.getIdToken();

  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

const isLocalhostUrl = (url = "") =>
  /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(url);

const normalizeAvatar = (value = "") => {
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    if (isLocalhostUrl(value)) {
      return value;
    }

    return value.replace(/^http:\/\//i, "https://");
  }

  if (value.startsWith("/uploads/")) {
    return `${API}${value}`;
  }

  if (value.startsWith("uploads/")) {
    return `${API}/${value}`;
  }

  return value;
};

const LoadingDots = ({ active }) => (
  <span
    className={`${styles.loadingDots} ${active ? styles.loadingDotsActive : ""
      }`}
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

    {typeof isLoading === "boolean" && (
      <LoadingDots active={isLoading} />
    )}
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
    className={`${styles.button} ${className}`}
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

const AccountSettings = () => {
  const location = useLocation();
  const fallbackImg = "/images/other/no-image.png";

  const [user, setUser] = useState(() => auth.currentUser || null);
  const [displayName, setDisplayName] = useState(
    auth.currentUser?.displayName || ""
  );
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loadingAction, setLoadingAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const showAlert = (type, message) => {
    setAlert({ type, message });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      try {
        setLoading(true);

        if (!authUser) {
          setUser(null);
          setDisplayName("");
          setPreview(fallbackImg);
          return;
        }

        try {
          await authUser.reload();
        } catch {
          // Dane z bieżącej sesji nadal mogą zostać użyte.
        }

        const freshUser = auth.currentUser;

        setUser(freshUser);
        setDisplayName(freshUser?.displayName || "");

        try {
          const headers = await authHeaders({ Accept: "application/json" });
          const response = await fetch(`${API}/api/users/${authUser.uid}`, {
            headers,
          });

          if (response.ok) {
            const databaseUser = await response.json();
            const avatarUrl =
              databaseUser?.avatar || freshUser?.photoURL || fallbackImg;

            setPreview(normalizeAvatar(avatarUrl));
          } else {
            setPreview(
              normalizeAvatar(freshUser?.photoURL) || fallbackImg
            );
          }
        } catch {
          setPreview(normalizeAvatar(freshUser?.photoURL) || fallbackImg);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    let targetId = location.state?.scrollToId;

    if (!targetId && typeof window !== "undefined" && window.location.hash) {
      targetId = window.location.hash.replace("#", "").trim();
    }

    if (!targetId) {
      return;
    }

    const tryScroll = () => {
      const element = document.getElementById(targetId);

      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });

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
  }, [location.pathname, location.state, loading]);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const onFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (!/^image\//.test(selectedFile.type)) {
      event.target.value = "";
      showAlert("warning", "Wybierz plik graficzny.");
      return;
    }

    if (selectedFile.size > 2 * 1024 * 1024) {
      event.target.value = "";
      showAlert("warning", "Maksymalny rozmiar to 2 MB.");
      return;
    }

    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const handleSaveAvatar = async () => {
    if (!user || !file) {
      return;
    }

    try {
      setLoadingAction("saveAvatar");

      const form = new FormData();
      form.append("file", file);

      const headers = await authHeaders();
      const response = await fetch(`${API}/api/users/${user.uid}/avatar`, {
        method: "POST",
        headers,
        body: form,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message || "Błąd uploadu");
      }

      const { url } = await response.json();

      try {
        await updateProfile(user, { photoURL: url });
        await user.reload();
      } catch {
        // Awatar w bazie został zapisany poprawnie.
      }

      setPreview(normalizeAvatar(url));
      setFile(null);
      showAlert("success", "Zapisano nowy awatar.");
    } catch (error) {
      console.error(error);
      showAlert("error", "Nie udało się zapisać awataru.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) {
      return;
    }

    try {
      setLoadingAction("removeAvatar");

      const headers = await authHeaders();
      const response = await fetch(`${API}/api/users/${user.uid}/avatar`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message || "Błąd usuwania");
      }

      try {
        await updateProfile(user, { photoURL: "" });
        await user.reload();
      } catch {
        // Awatar w bazie został usunięty poprawnie.
      }

      setPreview(fallbackImg);
      setFile(null);
      showAlert("success", "Usunięto awatar.");
    } catch (error) {
      console.error(error);
      showAlert("error", "Nie udało się usunąć awataru.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSaveDisplayName = async () => {
    if (!user) {
      return;
    }

    try {
      setLoadingAction("saveName");

      const cleanDisplayName = displayName.trim();

      await updateProfile(user, { displayName: cleanDisplayName });
      await user.reload();

      const headers = await authHeaders({
        "Content-Type": "application/json",
      });

      await fetch(`${API}/api/users/${user.uid}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ displayName: cleanDisplayName }),
      }).catch(() => { });

      setUser(auth.currentUser);
      showAlert("success", "Zaktualizowano nazwę wyświetlaną.");
    } catch (error) {
      console.error(error);
      showAlert("error", "Nie udało się zapisać nazwy.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      showAlert("warning", "Brak adresu e-mail.");
      return;
    }

    try {
      setLoadingAction("resetPass");
      await sendPasswordResetEmail(auth, user.email);
      showAlert("info", "Wysłaliśmy link do zmiany hasła.");
    } catch (error) {
      console.error(error);
      showAlert("error", "Nie udało się wysłać linku do resetu.");
    } finally {
      setLoadingAction(null);
    }
  };

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.inner}>
<DataLoader label="Ładujemy ustawienia konta…" detail="Przygotowujemy Twoje dane i ustawienia." layout="form" />
        </div>
      </section>
    );
  }

  return (
    <AccountSettingsView
      user={user}
      displayName={displayName}
      preview={preview}
      file={file}
      loadingAction={loadingAction}
      alert={alert}
      setAlert={setAlert}
      setDisplayName={setDisplayName}
      onFileChange={onFileChange}
      handleSaveAvatar={handleSaveAvatar}
      handleRemoveAvatar={handleRemoveAvatar}
      handleSaveDisplayName={handleSaveDisplayName}
      handlePasswordReset={handlePasswordReset}
    />
  );
};

export const AccountSettingsView = ({
  user,
  displayName,
  preview,
  file,
  loadingAction,
  alert,
  setAlert,
  setDisplayName,
  onFileChange,
  handleSaveAvatar,
  handleRemoveAvatar,
  handleSaveDisplayName,
  handlePasswordReset,
}) => {
  const fallbackImg = '/images/other/no-image.png';
  const hasAvatar = Boolean(preview && preview !== fallbackImg);
  const hasDisplayName = Boolean(displayName.trim());

  return (
    <section id="scrollToId" className={styles.section}>
      <PanelBackdrop word="TWOJE KONTO" />
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

        <main className={styles.panel}>
          <header className={styles.panelHeader}>
            <div className={styles.titleBlock}>
              <span className={styles.kicker}>Konto Showly</span>
              <h1>Ustawienia konta</h1>
              <p>Zadbaj o zdjęcie, nazwę i bezpieczeństwo swojego konta.</p>
            </div>

            <div className={styles.accountIdentity}>
              <span className={styles.identityIcon} aria-hidden="true">
                <FiUser />
              </span>

              <span className={styles.identityCopy}>
                <small>Twoje konto</small>
                <strong>
                  {user?.displayName || displayName.trim() || "Użytkownik Showly"}
                </strong>
                <span>{user?.email || "Brak adresu e-mail"}</span>
              </span>
            </div>
          </header>

          <div className={styles.settingsBody}>
            <fieldset className={styles.setting}>
              <legend>01 / Zdjęcie konta</legend>
              <header className={styles.settingHeader}>
                <div className={styles.settingTitle}>
                  <span className={styles.settingIcon} aria-hidden="true">
                    <FiImage />
                  </span>

                  <div>
                    <h2>Zdjęcie profilowe</h2>
                  </div>
                </div>

                <span className={styles.statusBadge}>
                  {file ? "Gotowy do zapisu" : hasAvatar ? "Ustawiony" : "Brak"}
                </span>
              </header>

              <div className={styles.avatarContent}>
                <div className={styles.avatarFrame}>
                  <img
                    src={preview || fallbackImg}
                    alt="Awatar użytkownika"
                    className={styles.avatar}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={(event) => {
                      event.currentTarget.src = fallbackImg;
                    }}
                  />

                  <span className={styles.avatarTag} aria-hidden="true">
                    <FiImage />
                  </span>
                </div>

                <div className={styles.avatarControls}>
                  <p>
                    To zdjęcie pojawia się przy wiadomościach, rezerwacjach
                    i pozostałej aktywności na Showly.
                  </p>

                  <div className={styles.fileRow}>
                    <label className={styles.fileButton}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={onFileChange}
                      />
                      <ButtonContent icon={<FiImage />}>
                        Wybierz zdjęcie
                      </ButtonContent>
                    </label>

                    <span>JPG, PNG lub WEBP · maks. 2 MB</span>
                  </div>

                  <div className={styles.actionsRow}>
                    <ActionButton
                      isLoading={loadingAction === "saveAvatar"}
                      disabled={!file || loadingAction !== null}
                      onClick={handleSaveAvatar}
                      className={styles.primaryButton}
                      icon={<FiSave />}
                    >
                      Zapisz awatar
                    </ActionButton>

                    {hasAvatar && (
                      <ActionButton
                        isLoading={loadingAction === "removeAvatar"}
                        disabled={loadingAction !== null}
                        onClick={handleRemoveAvatar}
                        className={styles.dangerButton}
                        icon={<FiTrash2 />}
                      >
                        Usuń awatar
                      </ActionButton>
                    )}
                  </div>
                </div>
              </div>
            </fieldset>

            <div className={styles.secondaryGrid}>
              <fieldset className={styles.setting}>
                <legend>02 / Nazwa wyświetlana</legend>
                <header className={styles.settingHeader}>
                  <div className={styles.settingTitle}>
                    <span className={styles.settingIcon} aria-hidden="true">
                      <FiUser />
                    </span>

                    <div>
                      <h2>Nazwa wyświetlana</h2>
                    </div>
                  </div>

                  <span className={styles.statusBadge}>
                    {hasDisplayName ? "Ustawiona" : "Brak"}
                  </span>
                </header>

                <div className={styles.settingContent}>
                  <p>
                    Widoczna przy opiniach, wiadomościach, rozmowach
                    i rezerwacjach.
                  </p>

                  <label className={styles.field}>
                    <span>Nazwa</span>
                    <input
                      className={styles.input}
                      type="text"
                      placeholder="Twoja nazwa"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      maxLength={40}
                    />
                  </label>

                  <ActionButton
                    isLoading={loadingAction === "saveName"}
                    disabled={loadingAction !== null}
                    onClick={handleSaveDisplayName}
                    className={styles.primaryButton}
                    icon={<FiSave />}
                  >
                    Zapisz nazwę
                  </ActionButton>
                </div>
              </fieldset>

              <fieldset className={`${styles.setting} ${styles.securitySetting}`}>
                <legend>03 / Bezpieczeństwo</legend>
                <header className={styles.settingHeader}>
                  <div className={styles.settingTitle}>
                    <span className={styles.settingIcon} aria-hidden="true">
                      <FiShield />
                    </span>

                    <div>
                      <h2>Zmiana hasła</h2>
                    </div>
                  </div>

                  <span className={styles.statusBadge}>E-mail</span>
                </header>

                <div className={styles.settingContent}>
                  <p>
                    Link do ustawienia nowego hasła wyślemy na przypisany
                    do konta adres.
                  </p>

                  <div className={styles.emailBox}>
                    <span>Adres odbiorcy</span>
                    <strong>{user?.email || "Brak adresu e-mail"}</strong>
                  </div>

                  <ActionButton
                    isLoading={loadingAction === "resetPass"}
                    disabled={loadingAction !== null}
                    onClick={handlePasswordReset}
                    className={styles.secondaryButton}
                    icon={<FiLock />}
                  >
                    Wyślij link
                  </ActionButton>
                </div>
              </fieldset>
            </div>
          </div>

          <footer className={styles.panelFooter}>
            <FiShield aria-hidden="true" />
            <span>Zmiany zapisujesz osobno w każdej sekcji.</span>
          </footer>
        </main>
      </div>
    </section>
  );
};

export default AccountSettings;
