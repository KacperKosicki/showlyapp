import { FaTools } from 'react-icons/fa';
import styles from "./AppearanceSection.module.scss";

const THEME_PRESETS = [
  { name: "Systemowy", primary: "#6f4ef2", secondary: "#ff4081", variant: "system" },
  { name: "Pomarańczowy", primary: "#ff5a1f", secondary: "#ffb86b", variant: "orange" },
  { name: "Niebieski", primary: "#2563eb", secondary: "#7c9dff", variant: "blue" },
  { name: "Zielony", primary: "#16a34a", secondary: "#86efac", variant: "green" },
  { name: "Różowy", primary: "#db2777", secondary: "#ff6ea8", variant: "violet" },
  { name: "Ciemny", primary: "#e50914", secondary: "#9aa3af", variant: "dark" },
];

const getThemeColor = ({ isEditing, editData, profile, key, fallback }) => {
  return (isEditing ? editData?.theme?.[key] : profile?.theme?.[key]) || fallback;
};

const AppearanceSection = ({
  profile,
  editData,
  isEditing,
  canUsePremiumThemes,
  onEditDataChange,
}) => {
  const primary = getThemeColor({
    isEditing,
    editData,
    profile,
    key: 'primary',
    fallback: '#6f4ef2',
  });

  const secondary = getThemeColor({
    isEditing,
    editData,
    profile,
    key: 'secondary',
    fallback: '#ff4081',
  });

  const gradient = `linear-gradient(135deg, ${primary}, ${secondary})`;

  const updateTheme = (changes) => {
    onEditDataChange((prev) => ({
      ...prev,
      theme: {
        ...(prev.theme || {}),
        ...changes,
      },
    }));
  };

  return (
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
            style={{ background: gradient }}
          />

          <div className={styles.themePreviewContent}>
            <div
              className={styles.themePreviewAvatar}
              style={{ background: gradient }}
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
              style={{ background: gradient }}
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
                {THEME_PRESETS.map((preset) => {
                  const isActive = editData.theme?.variant === preset.variant;

                  return (
                    <button
                      key={preset.variant}
                      type="button"
                      className={`${styles.presetBtn} ${isActive ? styles.presetActive : ""}`}
                      onClick={() =>
                        updateTheme({
                          variant: preset.variant,
                          primary: preset.primary,
                          secondary: preset.secondary,
                        })
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
                        updateTheme({
                          primary: e.target.value,
                          variant: "custom",
                        })
                      }
                    />

                    <input
                      type="text"
                      className={styles.formInput}
                      value={editData.theme?.primary || "#6f4ef2"}
                      onChange={(e) =>
                        updateTheme({
                          primary: e.target.value,
                          variant: "custom",
                        })
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
                        updateTheme({
                          secondary: e.target.value,
                          variant: "custom",
                        })
                      }
                    />

                    <input
                      type="text"
                      className={styles.formInput}
                      value={editData.theme?.secondary || "#ff4081"}
                      onChange={(e) =>
                        updateTheme({
                          secondary: e.target.value,
                          variant: "custom",
                        })
                      }
                    />
                  </div>
                </div>

                <div className={styles.colorField}>
                  <label className={styles.colorLabel}>Aktualny motyw</label>

                  <div className={styles.themeCurrentBox}>
                    <span
                      style={{ background: gradient }}
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
  );
};

export default AppearanceSection;
