// BookingForm.jsx (kontroler trybu) — layout jak UserCard (glass + gradient)
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./BookingForm.module.scss";
import AlertBox from "../AlertBox/AlertBox";
import BookingModeCalendar from "./BookingModeCalendar";
import BookingModeDay from "./BookingModeDay";
import BookingModeOpen from "./BookingModeOpen";

import { FaMapMarkerAlt, FaRegCalendarAlt } from "react-icons/fa";

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

  // domena bez protokołu
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?]|$)/i.test(v)) return `https://${v}`;

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

  const primary = (theme?.primary || theme?.accent || "").trim() || preset.primary;
  const secondary = (theme?.secondary || theme?.accent2 || "").trim() || preset.secondary;

  return {
    primary,
    secondary,
    banner: `linear-gradient(135deg, ${primary}, ${secondary})`,
  };
};

const modeLabel = (mode) => {
  const m = String(mode || "off").toLowerCase();
  if (m === "calendar") return "REZERWACJE (KALENDARZ)";
  if (m === "request-blocking") return "ZAPYTANIE + BLOKADA DNIA";
  if (m === "request-open") return "ZAPYTANIE (OTWARTE)";
  return "REZERWACJE";
};

export default function BookingForm({ user }) {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: "", message: "" });

  // 1) Załaduj profil
  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_API_URL}/api/profiles/slug/${slug}`)
      .then(({ data }) => {
        data.workingDays = (data.workingDays || []).map(Number);
        setProvider(data);
      })
      .catch(() => {
        setAlert({ show: true, type: "error", message: "Nie udało się załadować profilu." });
      });
  }, [slug]);

  // 2) Redirect gdy ukryte (tylko calendar)
  useEffect(() => {
    const mode = String(provider?.bookingMode || "off").toLowerCase();
    if (mode === "calendar" && provider?.showAvailableDates === false) {
      navigate("/", { replace: true });
    }
  }, [provider, navigate]);

// ✅ BEZPIECZNIE: provider może być null
const mode = String(provider?.bookingMode || "off").toLowerCase();
const avatarSrc = normalizeAvatar(provider?.avatar) || DEFAULT_AVATAR;

// ✅ useMemo OK — provider?.theme też OK
const t = useMemo(() => resolveTheme(provider?.theme), [provider?.theme]);

// ✅ dopiero teraz return, bo wcześniej nie dotykasz provider.bookingMode bez ?
if (!provider) return <div className={styles.loading}>🔄 Ładowanie…</div>;

  const cssVars = {
    "--bf-primary": t.primary,
    "--bf-secondary": t.secondary,
    "--bf-banner": t.banner,
    "--bf-p-06": `color-mix(in srgb, ${t.primary} 6%, transparent)`,
    "--bf-p-10": `color-mix(in srgb, ${t.primary} 10%, transparent)`,
    "--bf-p-22": `color-mix(in srgb, ${t.primary} 22%, transparent)`,
    "--bf-s-10": `color-mix(in srgb, ${t.secondary} 10%, transparent)`,
  };

  return (
    <>
      {alert.show && (
        <AlertBox
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ ...alert, show: false })}
        />
      )}

      <div className={styles.pageWrap}>
        <article className={styles.card} style={cssVars}>
          {/* ===== HERO ===== */}
          <header className={styles.hero}>
            <div className={styles.heroFade} aria-hidden="true" />

            <div className={styles.heroTop}>
              <span className={styles.locPill} title={provider.location || "Brak lokalizacji"}>
                <FaMapMarkerAlt />
                <span className={styles.locText}>{provider.location || "Brak lokalizacji"}</span>
              </span>

              <span className={styles.modePill} title={modeLabel(mode)}>
                <FaRegCalendarAlt />
                <span className={styles.modeText}>{modeLabel(mode)}</span>
              </span>
            </div>

            <div className={styles.heroInner}>
              <div className={styles.avatarWrap}>
                <img
                  src={avatarSrc}
                  alt={provider.name}
                  className={styles.avatar}
                  decoding="async"
                  onError={(e) => {
                    if (!e.currentTarget.dataset.fallback) {
                      e.currentTarget.dataset.fallback = "1";
                      e.currentTarget.src = DEFAULT_AVATAR;
                    }
                  }}
                />
                <div className={styles.avatarRing} aria-hidden="true" />
              </div>

              <div className={styles.heroInfo}>
                <div className={styles.titleRow}>
                  <h2 className={styles.title}>
                    Zarezerwuj u <span className={styles.providerName}>{provider.name}</span>
                  </h2>

                  {!!provider.role && <p className={styles.role}>{provider.role}</p>}
                </div>
              </div>
            </div>
          </header>

          {/* ===== BODY ===== */}
          <section className={styles.body}>
            {mode === "calendar" && (
              <BookingModeCalendar user={user} provider={provider} pushAlert={setAlert} />
            )}

            {mode === "request-blocking" && (
              <BookingModeDay user={user} provider={provider} pushAlert={setAlert} />
            )}

            {mode === "request-open" && (
              <BookingModeOpen user={user} provider={provider} pushAlert={setAlert} />
            )}
          </section>
        </article>
      </div>
    </>
  );
}