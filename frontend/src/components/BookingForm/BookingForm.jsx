import DataLoader from '../ui/DataLoader/DataLoader';
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import styles from "./BookingForm.module.scss";
import AlertBox from "../AlertBox/AlertBox";
import BookingModeCalendar from "./BookingModeCalendar";
import BookingModeDay from "./BookingModeDay";
import BookingModeOpen from "./BookingModeOpen";
import PanelBackdrop from "../PanelBackdrop/PanelBackdrop";

import {
  FaMapMarkerAlt,
  FaArrowLeft,
  FaRegCalendarAlt,
  FaRegCommentDots,
} from "react-icons/fa";

import { dayBookingCopy } from "../../utils/dayBooking";

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

const modeLabel = (mode) => {
  const m = String(mode || "off").toLowerCase();

  if (m === "calendar") return "Wybierz termin wizyty";
  if (m === "request-blocking") return "Wybierz termin realizacji";
  if (m === "request-open") return "Zapytaj o usługę";

  return "Rezerwacje niedostępne";
};

export default function BookingForm({ user }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [provider, setProvider] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [alert, setAlert] = useState({
    show: false,
    type: "",
    message: "",
  });

  const preselectedServiceId = location.state?.serviceId || "";
  const preselectedServiceName = location.state?.serviceName || "";

  useEffect(() => {
    let alive = true;
    setLoadError(false);
    setProvider(null);

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
                dayBookingMode: meta.dayBookingMode || finalProvider.dayBookingMode || "exclusive-day",
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

        setLoadError(true);
      }
    };

    loadProvider();

    return () => {
      alive = false;
    };
  }, [slug, reloadKey]);

  useEffect(() => {
    const mode = String(provider?.bookingMode || "off").toLowerCase();

    if (mode === "calendar" && provider?.showAvailableDates === false) {
      navigate("/", { replace: true });
    }
  }, [provider, navigate]);

  const mode = String(provider?.bookingMode || "off").toLowerCase();
  const avatarSrc = normalizeAvatar(provider?.avatar) || DEFAULT_AVATAR;

  if (!provider) {
    return (
      <section className={styles.pageWrap} id="booking-form">
        <PanelBackdrop word="REZERWACJE" />
        <div className={styles.inner}>
          <>
          {!loadError ? <DataLoader label="Ładujemy formularz rezerwacji…" detail="Sprawdzamy usługi i dostępność tego profilu." layout="form" /> : <div className={styles.loadingCard}>
            <strong>Nie udało się wczytać formularza</strong>
            <p>Spróbuj ponownie. Twój wybór usługi został zachowany.</p>
            {loadError && <button type="button" className={styles.backButton} onClick={() => setReloadKey(value => value + 1)}>Spróbuj ponownie</button>}
          </div>}
          </>
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

      <section className={styles.pageWrap} id="booking-form">
        <PanelBackdrop word="REZERWACJE" />
        <div className={styles.inner}>
          <article className={styles.layout}>
            <header className={styles.pageHeader}>
              <div className={styles.titleBlock}>
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={() => navigate(`/${provider.slug || slug}`, { state: { scrollToId: "profileWrapper" } })}
                >
                  <FaArrowLeft />
                  <span>Wróć do profilu</span>
                </button>
                <h1 className={styles.heading}>{mode === "request-open" ? <>Zapytaj o <span>usługę.</span></> : <>Zrób miejsce na <span>coś dobrego.</span></>}</h1>
                <p>{mode === "request-open" ? "Ustal szczegóły z usługodawcą." : mode === "request-blocking" && provider.dayBookingMode === "order" ? "Wybierz ofertę i datę realizacji. Usługodawca potwierdzi Twoje zamówienie." : "Wybierz usługę, termin i potwierdź rezerwację."}</p>
              </div>
              {mode === "request-open" ? <FaRegCommentDots className={styles.headerIcon} aria-hidden="true" /> : <FaRegCalendarAlt className={styles.headerIcon} aria-hidden="true" />}
            </header>
            <aside className={styles.side}>
              <div className={styles.providerCard}>
                <span className={styles.providerPin}>{mode === "request-blocking" && provider.dayBookingMode === "order" ? "Zamawiasz u" : "Rezerwujesz u"}</span>
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

                    <strong className={styles.providerName}>
                      {provider.name || "Profil Showly"}
                    </strong>

                    {!!provider.role && (
                      <p className={styles.providerRole}>{provider.role}</p>
                    )}
                  </div>
                </div>

                {provider.location && <p className={styles.location}><FaMapMarkerAlt aria-hidden="true" />{provider.location}</p>}
                <p className={styles.confirmation}>{mode === "request-open" ? "Odpowiedź znajdziesz w wiadomościach." : provider.autoAcceptReservations ? "Automatyczne potwierdzenie terminu" : "Termin potwierdza usługodawca"}</p>
              </div>
            </aside>

            <main className={styles.content}>
              <h2 className={styles.formHeading}>{mode === "request-blocking" ? dayBookingCopy(provider).title : modeLabel(mode)}</h2>
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
