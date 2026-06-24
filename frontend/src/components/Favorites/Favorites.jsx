import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./Favorites.module.scss";
import UserCard from "../UserCard/UserCard";
import { FiHeart } from "react-icons/fi";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import { api } from "../../api/api";

export default function Favorites({ currentUser, setAlert }) {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [error, setError] = useState("");

  const location = useLocation();

  const scrollerRef = useRef(null);
  const rafRef = useRef(null);

  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      setLoading(true);
      setError("");

      try {
        const { data } = await api.get("/api/favorites/my");

        if (!alive) return;

        const list = Array.isArray(data) ? data : [];

        const normalized = list.map((it) => {
          const p = it?.profile || it?.profileData || it?.profileDoc || it;

          const rawTheme =
            p?.theme ?? it?.theme ?? it?.profileTheme ?? it?.themeConfig;

          let theme = rawTheme;

          if (typeof rawTheme === "string") {
            try {
              theme = JSON.parse(rawTheme);
            } catch {
              theme = undefined;
            }
          }

          const rawPartnership =
            p?.partnership ??
            it?.partnership ??
            it?.partnerData ??
            it?.profilePartnership;

          let parsedPartnership = rawPartnership;

          if (typeof rawPartnership === "string") {
            try {
              parsedPartnership = JSON.parse(rawPartnership);
            } catch {
              parsedPartnership = undefined;
            }
          }

          const derivedIsPartner =
            parsedPartnership?.isPartner ??
            p?.isPartner ??
            it?.isPartner ??
            p?.partner ??
            it?.partner ??
            false;

          const derivedTier =
            parsedPartnership?.tier ??
            p?.partnerTier ??
            it?.partnerTier ??
            p?.tier ??
            it?.tier ??
            "partner";

          const derivedBadgeText =
            parsedPartnership?.badgeText ??
            parsedPartnership?.label ??
            p?.partnerLabel ??
            it?.partnerLabel ??
            p?.badgeText ??
            it?.badgeText ??
            "PARTNER SHOWLY";

          const derivedColor =
            parsedPartnership?.color ??
            p?.partnerColor ??
            it?.partnerColor ??
            p?.color ??
            it?.color ??
            "";

          const partnership = derivedIsPartner
            ? {
              isPartner: true,
              tier: String(derivedTier || "partner").toLowerCase(),
              badgeText: String(derivedBadgeText || "PARTNER SHOWLY"),
              ...(derivedColor ? { color: derivedColor } : {}),
            }
            : parsedPartnership || {};

          const userId =
            p?.userId ||
            it?.userId ||
            it?.profileUserId ||
            it?.profileId ||
            p?._id ||
            it?._id;

          return {
            ...it,
            ...p,
            ...(theme ? { theme } : {}),
            partnership,
            ...(userId ? { userId } : {}),
            isFavorite: true,
          };
        });

        setProfiles(normalized);
      } catch (e) {
        if (!alive) return;

        setError("Nie udało się pobrać listy ulubionych.");

        if (typeof setAlert === "function") {
          setAlert({
            type: "error",
            message: "Nie udało się pobrać listy ulubionych.",
          });
        }
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    if (currentUser?.uid) {
      run();
    } else {
      setProfiles([]);
      setError("");
      setLoading(false);
    }

    return () => {
      alive = false;
    };
  }, [currentUser?.uid, setAlert]);

  useEffect(() => {
    const scrollTo = location.state?.scrollToId;

    if (!scrollTo || loading) return;

    const tryScroll = () => {
      const el = document.getElementById(scrollTo);

      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState({}, document.title, location.pathname);
      } else {
        requestAnimationFrame(tryScroll);
      }
    };

    requestAnimationFrame(tryScroll);
  }, [location.state, location.pathname, loading]);

  const count = useMemo(() => profiles.length, [profiles]);

  const viewStatus = !currentUser?.uid
    ? "guest"
    : loading
      ? "loading"
      : error
        ? "error"
        : count === 0
          ? "empty"
          : "ready";

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      const x = Math.max(0, el.scrollLeft);

      setCanLeft(x > 4);
      setCanRight(max > 4 && x < max - 4);
    });
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    updateArrows();

    const handleScroll = () => updateArrows();

    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    let resizeObserver;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(handleScroll);
      resizeObserver.observe(el);
    }

    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);

      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [viewStatus, profiles.length, updateArrows]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const frame = requestAnimationFrame(() => {
      el.scrollTo({
        left: 0,
        behavior: "auto",
      });

      updateArrows();
    });

    return () => cancelAnimationFrame(frame);
  }, [viewStatus, profiles.length, updateArrows]);

  const scrollByCard = (dir = 1) => {
    const el = scrollerRef.current;
    if (!el) return;

    const firstCard = el.querySelector(`.${styles.cardWrap}`);
    const cardW = firstCard?.getBoundingClientRect().width || 420;

    const computed = getComputedStyle(el);
    const gap = parseFloat(computed.columnGap || computed.gap || "0") || 24;

    const step = cardW + gap;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const next = Math.min(Math.max(el.scrollLeft + dir * step, 0), max);

    el.scrollTo({
      left: next <= 8 ? 0 : next,
      behavior: "smooth",
    });

    window.setTimeout(updateArrows, 320);
  };

  const sideData = {
    guest: {
      overline: "Showly Favorites",
      headingStart: "Twoje ",
      headingAccent: "ulubione",
      headingEnd: " profile.",
      description:
        "Zapisane wizytówki specjalistów, do których możesz szybko wracać po zalogowaniu.",
      meta: [
        ["Gość", "zaloguj się, aby zobaczyć listę"],
        ["0", "zapisanych wizytówek"],
        ["Showly", "Twoja prywatna lista profili"],
      ],
      infoTitle: "Zapisuj • Wracaj • Wybieraj",
      infoText:
        "Po zalogowaniu możesz dodawać interesujące profile do ulubionych i wracać do nich w jednym miejscu.",
    },
    loading: {
      overline: "Showly Favorites",
      headingStart: "Ładujemy Twoje ",
      headingAccent: "ulubione",
      headingEnd: ".",
      description:
        "Pobieramy zapisane wizytówki i przygotowujemy Twoją prywatną listę profili.",
      meta: [
        ["Ładowanie", "trwa pobieranie listy"],
        ["—", "zapisanych wizytówek"],
        ["Showly", "Twoja prywatna lista profili"],
      ],
      infoTitle: "Lista • Powroty • Wygoda",
      infoText:
        "Za chwilę zobaczysz profile, które wcześniej zostały dodane do ulubionych.",
    },
    error: {
      overline: "Showly Favorites",
      headingStart: "Coś poszło ",
      headingAccent: "nie tak",
      headingEnd: ".",
      description:
        "Nie udało się pobrać zapisanych profili. Spróbuj odświeżyć stronę albo wrócić za chwilę.",
      meta: [
        ["Błąd", "nie udało się pobrać danych"],
        ["—", "zapisanych wizytówek"],
        ["Showly", "Twoja prywatna lista profili"],
      ],
      infoTitle: "Ulubione • Problem • Spróbuj ponownie",
      infoText:
        "Twoja lista nie została utracona — problem dotyczy pobierania danych.",
    },
    empty: {
      overline: "Showly Favorites",
      headingStart: "Lista ulubionych jest ",
      headingAccent: "pusta",
      headingEnd: ".",
      description:
        "Nie dodałeś/aś jeszcze żadnego profilu do ulubionych. Gdy coś zapiszesz, pojawi się właśnie tutaj.",
      meta: [
        ["0", "zapisanych wizytówek"],
        ["Gotowe", "czas odkrywać specjalistów"],
        ["Showly", "Twoja prywatna lista profili"],
      ],
      infoTitle: "Zapisuj • Wracaj • Wybieraj",
      infoText:
        "Klikaj serduszko przy interesujących profilach, aby zbudować własną listę kontaktów.",
    },
    ready: {
      overline: "Showly Favorites",
      headingStart: "Twoje ",
      headingAccent: "ulubione",
      headingEnd: " profile.",
      description:
        "Zapisane wizytówki specjalistów, do których chcesz szybko wracać.",
      meta: [
        [String(count), "zapisanych wizytówek"],
        ["Prywatne", "tylko dla Twojego konta"],
        ["Showly", "szybki dostęp do profili"],
      ],
      infoTitle: "Zapisane • Szybki powrót • Wybór",
      infoText:
        "To Twoja osobista lista profili, które możesz porównać, sprawdzić ponownie albo wykorzystać później.",
    },
  };

  const currentSide = sideData[viewStatus];

  const SkeletonCard = () => (
    <div className={`${styles.skeletonCard} ${styles.shimmer}`}>
      <div className={styles.skeletonThumb} />
      <div className={styles.skeletonLineLg} />
      <div className={styles.skeletonLineMd} />
      <div className={styles.skeletonLineSm} />
    </div>
  );

  const renderStateBox = () => {
    if (viewStatus === "guest") {
      return (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconWrap}>
            <FiHeart className={styles.emptyIcon} />
          </div>

          <strong>Zaloguj się, aby zobaczyć ulubione</strong>

          <p>
            Po zalogowaniu zobaczysz tutaj wszystkie zapisane profile i szybko
            wrócisz do interesujących Cię specjalistów.
          </p>

          <Link
            className={styles.cta}
            to="/login"
            state={{ scrollToId: "loginBox" }}
          >
            Przejdź do logowania
          </Link>
        </div>
      );
    }

    if (viewStatus === "error") {
      return (
        <div className={`${styles.emptyState} ${styles.errorState}`}>
          <strong>Błąd pobierania danych</strong>
          <p>{error}</p>
        </div>
      );
    }

    if (viewStatus === "empty") {
      return (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconWrap}>
            <FiHeart className={styles.emptyIcon} />
          </div>

          <strong>Nic tu jeszcze nie ma</strong>

          <p>
            Gdy zapiszesz interesujące wizytówki, pojawią się właśnie tutaj.
          </p>

          <Link
            className={styles.cta}
            to="/profile"
            state={{ scrollToId: "profilesHub" }}
          >
            Przeglądaj specjalistów
          </Link>
        </div>
      );
    }

    return null;
  };

  const showCarousel = viewStatus === "ready" || viewStatus === "loading";

  return (
    <section id="scrollToId" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.layout}>
          <aside className={styles.side}>
            <span className={styles.overline}>{currentSide.overline}</span>

            <h2 className={styles.heading}>
              {currentSide.headingStart}
              <span>{currentSide.headingAccent}</span>
              {currentSide.headingEnd}
            </h2>

            <p className={styles.description}>{currentSide.description}</p>

            <div className={styles.metaRow}>
              {currentSide.meta.map(([value, label]) => (
                <div className={styles.metaCard} key={`${value}-${label}`}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <div className={styles.infoBox}>
              <span>{currentSide.infoTitle}</span>
              <p>{currentSide.infoText}</p>
            </div>
          </aside>

          <div className={styles.content}>
            <div className={styles.chapterHead}>
              <div>
                <span className={styles.chapterLabel}>Lista ulubionych</span>

                <h3>
                  {viewStatus === "ready"
                    ? "Przesuwaj listę i wracaj do zapisanych profili."
                    : viewStatus === "loading"
                      ? "Przygotowujemy Twoją listę zapisanych profili."
                      : viewStatus === "error"
                        ? "Nie udało się pobrać zapisanych profili."
                        : "Zapisuj profile i wracaj do nich później."}
                </h3>
              </div>

              <span className={styles.chapterNumber}>
                {viewStatus === "ready"
                  ? count
                  : viewStatus === "error"
                    ? "!"
                    : "0"}
              </span>
            </div>

            {showCarousel ? (
              <div className={styles.carousel}>
                <button
                  type="button"
                  className={`${styles.navBtn} ${styles.left} ${!canLeft ? styles.disabled : ""
                    }`}
                  onClick={() => scrollByCard(-1)}
                  disabled={!canLeft}
                  aria-label="Przewiń w lewo"
                  title="Przewiń w lewo"
                >
                  <FaChevronLeft />
                </button>

                <div
                  className={styles.grid}
                  ref={scrollerRef}
                  role="list"
                  aria-label="Lista ulubionych profili Showly"
                >
                  {viewStatus === "loading"
                    ? Array.from({ length: 4 }).map((_, index) => (
                      <div
                        className={styles.cardWrap}
                        key={index}
                        role="listitem"
                      >
                        <SkeletonCard />
                      </div>
                    ))
                    : profiles.map((profile, index) => (
                      <div
                        className={styles.cardWrap}
                        key={profile.userId || profile._id || index}
                        role="listitem"
                      >
                        <UserCard
                          user={profile}
                          currentUser={currentUser}
                          setAlert={setAlert}
                        />
                      </div>
                    ))}
                </div>

                <div className={styles.mobileHint}>
                  <span>←</span>
                  <p>Przesuń, aby zobaczyć więcej ulubionych profili</p>
                  <span>→</span>
                </div>

                <button
                  type="button"
                  className={`${styles.navBtn} ${styles.right} ${!canRight ? styles.disabled : ""
                    }`}
                  onClick={() => scrollByCard(1)}
                  disabled={!canRight}
                  aria-label="Przewiń w prawo"
                  title="Przewiń w prawo"
                >
                  <FaChevronRight />
                </button>
              </div>
            ) : (
              renderStateBox()
            )}
          </div>
        </div>
      </div>
    </section>
  );
}