import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import styles from "./BookingForm.module.scss";
import AlertBox from "../AlertBox/AlertBox";
import BookingModeCalendar from "./BookingModeCalendar";
import BookingModeDay from "./BookingModeDay";
import BookingModeOpen from "./BookingModeOpen";

import {
  FaMapMarkerAlt,
  FaRegCalendarAlt,
  FaUserCheck,
  FaArrowLeft,
} from "react-icons/fa";

const API = process.env.REACT_APP_API_URL;
const DEFAULT_AVATAR = "/images/other/no-image.png";

const pickUrl = (val) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && typeof val.url === "string") return val.url;
  return "";
};

const normalizeAvatar = (val) => {
  const raw = pickUrl(val);
  const v = String(raw || "").trim();
  if (!v) return "";

  if (v.startsWith("data:image/")) return v;
  if (v.startsWith("blob:")) return v;
  if (/^https?:\/\//i.test(v)) return v;

  if (v.startsWith("/uploads/")) return `${API}${v}`;
  if (v.startsWith("uploads/")) return `${API}/${v}`;

  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?]|$)/i.test(v)) {
    return `https://${v}`;
  }

  return v;
};

const THEME_PRESETS = {
  violet: { primary: "#6f4ef2", secondary: "#ff4081" },
  blue: { primary: "#2563eb", secondary: "#06b6d4" },
  green: { primary: "#22c55e", secondary: "#a3e635" },
  orange: { primary: "#f97316", secondary: "#facc15" },
  red: { primary: "#ef4444", secondary: "#fb7185" },
  dark: { primary: "#111827", secondary: "#4b5563" },
};

const resolveTheme = (theme) => {
  const variant = theme?.variant || "violet";
  const preset = THEME_PRESETS[variant] || THEME_PRESETS.violet;

  const primary =
    (theme?.primary || theme?.accent || "").trim() || preset.primary;

  const secondary =
    (theme?.secondary || theme?.accent2 || "").trim() || preset.secondary;

  return {
    primary,
    secondary,
  };
};

const modeLabel = (mode) => {
  const m = String(mode || "off").toLowerCase();

  if (m === "calendar") return "Rezerwacje z kalendarzem";
  if (m === "request-blocking") return "Zapytanie z blokadą dnia";
  if (m === "request-open") return "Otwarte zapytanie";

  return "Rezerwacje niedostępne";
};

const modeShortLabel = (mode) => {
  const m = String(mode || "off").toLowerCase();

  if (m === "calendar") return "KALENDARZ";
  if (m === "request-blocking") return "BLOKADA DNIA";
  if (m === "request-open") return "ZAPYTANIE";

  return "WYŁĄCZONE";
};

export default function BookingForm({ user }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [provider, setProvider] = useState(null);
  const [alert, setAlert] = useState({
    show: false,
    type: "",
    message: "",
  });

  const preselectedServiceId = location.state?.serviceId || "";
  const preselectedServiceName = location.state?.serviceName || "";

  useEffect(() => {
    let alive = true;

    const loadProvider = async () => {
      try {
        const { data } = await axios.get(`${API}/api/profiles/slug/${slug}`);

        let finalProvider = {
          ...data,
          workingDays: (data.workingDays || []).map(Number),
          availabilityOverrides: Array.isArray(data.availabilityOverrides)
            ? data.availabilityOverrides
            : [],
        };

        if (data?.userId) {
          try {
            const { data: meta } = await axios.get(
              `${API}/api/reservations/meta/${data.userId}`
            );

            if (meta) {
              finalProvider = {
                ...finalProvider,

                _id: meta.providerProfileId || finalProvider._id,
                name: finalProvider.name || meta.providerProfileName,
                role: finalProvider.role || meta.providerProfileRole,

                bookingMode: meta.bookingMode || finalProvider.bookingMode,
                team: meta.team || finalProvider.team,

                services: Array.isArray(meta.services)
                  ? meta.services
                  : finalProvider.services || [],

                bookingBufferMin: Number.isFinite(Number(meta.bookingBufferMin))
                  ? Number(meta.bookingBufferMin)
                  : Number(finalProvider.bookingBufferMin || 0),

                autoAcceptReservations: !!meta.autoAcceptReservations,

                workingHours: meta.workingHours || finalProvider.workingHours,

                workingDays: Array.isArray(meta.workingDays)
                  ? meta.workingDays.map(Number)
                  : finalProvider.workingDays,

                blockedDays: Array.isArray(meta.blockedDays)
                  ? meta.blockedDays
                  : [],

                availabilityOverrides: Array.isArray(meta.availabilityOverrides)
                  ? meta.availabilityOverrides
                  : [],
              };
            }
          } catch (metaErr) {
            console.warn("Nie udało się pobrać meta rezerwacji:", metaErr);
          }
        }

        if (!alive) return;
        setProvider(finalProvider);
      } catch (err) {
        console.error("Nie udało się załadować profilu:", err);

        if (!alive) return;

        setAlert({
          show: true,
          type: "error",
          message: "Nie udało się załadować profilu.",
        });
      }
    };

    loadProvider();

    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    const mode = String(provider?.bookingMode || "off").toLowerCase();

    if (mode === "calendar" && provider?.showAvailableDates === false) {
      navigate("/", { replace: true });
    }
  }, [provider, navigate]);

  const mode = String(provider?.bookingMode || "off").toLowerCase();
  const avatarSrc = normalizeAvatar(provider?.avatar) || DEFAULT_AVATAR;

  const t = useMemo(() => resolveTheme(provider?.theme), [provider?.theme]);

  const cssVars = {
    "--bf-primary": t.primary,
    "--bf-secondary": t.secondary,
    "--bf-primary-soft": `color-mix(in srgb, ${t.primary} 8%, transparent)`,
    "--bf-primary-line": `color-mix(in srgb, ${t.primary} 34%, transparent)`,
  };

  if (!provider) {
    return (
      <section className={styles.pageWrap}>
        <div className={styles.inner}>
          <div className={styles.loadingCard}>
            <span>Showly Booking</span>
            <strong>Ładowanie formularza...</strong>
            <p>Sprawdzamy profil, usługi i dostępne ustawienia rezerwacji.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {alert.show && (
        <AlertBox
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ ...alert, show: false })}
        />
      )}

      <section className={styles.pageWrap}>
        <div className={styles.inner}>
          <article className={styles.layout} style={cssVars}>
            <aside className={styles.side}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => navigate(-1)}
              >
                <FaArrowLeft />
                <span>Wróć</span>
              </button>

              <span className={styles.overline}>Showly Booking</span>

              <h1 className={styles.heading}>
                Zarezerwuj termin bez zbędnego chaosu.
              </h1>

              <p className={styles.description}>
                Wybierz usługę, termin albo wyślij zapytanie. Formularz został
                dopasowany do sposobu pracy tego profilu.
              </p>

              <div className={styles.providerBox}>
                <div className={styles.avatarBox}>
                  <img
                    src={avatarSrc}
                    alt={provider.name || "Profil Showly"}
                    className={styles.avatar}
                    decoding="async"
                    onError={(e) => {
                      if (!e.currentTarget.dataset.fallback) {
                        e.currentTarget.dataset.fallback = "1";
                        e.currentTarget.src = DEFAULT_AVATAR;
                      }
                    }}
                  />
                </div>

                <div className={styles.providerInfo}>
                  <span className={styles.providerLabel}>Rezerwujesz u</span>

                  <strong className={styles.providerName}>
                    {provider.name || "Profil Showly"}
                  </strong>

                  {!!provider.role && (
                    <p className={styles.providerRole}>{provider.role}</p>
                  )}
                </div>
              </div>

              <div className={styles.metaList}>
                <div className={styles.metaItem}>
                  <span className={styles.metaIcon}>
                    <FaMapMarkerAlt />
                  </span>

                  <div>
                    <strong>Lokalizacja</strong>
                    <p>{provider.location || "Brak lokalizacji"}</p>
                  </div>
                </div>

                <div className={styles.metaItem}>
                  <span className={styles.metaIcon}>
                    <FaRegCalendarAlt />
                  </span>

                  <div>
                    <strong>Tryb rezerwacji</strong>
                    <p>{modeLabel(mode)}</p>
                  </div>
                </div>

                <div className={styles.metaItem}>
                  <span className={styles.metaIcon}>
                    <FaUserCheck />
                  </span>

                  <div>
                    <strong>Wybrana usługa</strong>
                    <p>{preselectedServiceName || "Do wyboru w formularzu"}</p>
                  </div>
                </div>
              </div>
            </aside>

            <main className={styles.content}>
              <div className={styles.chapterHead}>
                <div>
                  <span className={styles.chapterLabel}>
                    {modeShortLabel(mode)}
                  </span>

                  <h2>{modeLabel(mode)}</h2>
                </div>

                <span className={styles.chapterNumber}>02</span>
              </div>

              <section className={styles.body}>
                {mode === "calendar" && (
                  <BookingModeCalendar
                    user={user}
                    provider={provider}
                    pushAlert={setAlert}
                    preselectedServiceId={preselectedServiceId}
                    preselectedServiceName={preselectedServiceName}
                  />
                )}

                {mode === "request-blocking" && (
                  <BookingModeDay
                    user={user}
                    provider={provider}
                    pushAlert={setAlert}
                    preselectedServiceId={preselectedServiceId}
                    preselectedServiceName={preselectedServiceName}
                  />
                )}

                {mode === "request-open" && (
                  <BookingModeOpen
                    user={user}
                    provider={provider}
                    pushAlert={setAlert}
                    preselectedServiceId={preselectedServiceId}
                    preselectedServiceName={preselectedServiceName}
                  />
                )}

                {!["calendar", "request-blocking", "request-open"].includes(
                  mode
                ) && (
                    <div className={styles.unavailableBox}>
                      <strong>Rezerwacje są wyłączone</strong>
                      <p>
                        Ten profil nie ma aktualnie aktywnego formularza
                        rezerwacji. Możesz wrócić do profilu i skorzystać z
                        dostępnych form kontaktu.
                      </p>
                    </div>
                  )}
              </section>
            </main>
          </article>
        </div>
      </section>
    </>
  );
}