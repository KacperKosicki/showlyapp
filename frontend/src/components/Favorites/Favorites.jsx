import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./Favorites.module.scss";
import UserCard from "../UserCard/UserCard";
import { FiAlertCircle, FiArrowUpRight, FiHeart, FiLock } from "react-icons/fi";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import { api } from "../../api/api";

const Favorites = ({ currentUser, setAlert }) => {
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

  const viewCopy = {
    guest: {
      title: "Profile, które chcesz mieć pod ręką.",
      text: "Zaloguj się, aby zobaczyć własną listę zapisanych wizytówek.",
      listTitle: "Twoja lista czeka na zalogowanie",
    },
    loading: {
      title: "Twoje ulubione w jednym miejscu.",
      text: "Pobieramy profile zapisane na Twoim koncie.",
      listTitle: "Ładujemy zapisane profile",
    },
    error: {
      title: "Twoje ulubione w jednym miejscu.",
      text: "Lista jest chwilowo niedostępna. Twoje zapisane profile nie zostały usunięte.",
      listTitle: "Nie udało się pobrać listy",
    },
    empty: {
      title: "Zapisuj profile na później.",
      text: "Kliknij serce przy wybranej wizytówce, a znajdziesz ją później właśnie tutaj.",
      listTitle: "Brak zapisanych profili",
    },
    ready: {
      title: "Profile, które chcesz mieć pod ręką.",
      text: "Wracaj do zapisanych wizytówek, porównuj oferty i wybieraj bez ponownego szukania.",
      listTitle: "Zapisane profile",
    },
  };

  const currentCopy = viewCopy[viewStatus];

  const SkeletonCard = () => (
    <div className={`${styles.skeletonCard} ${styles.shimmer}`}>
      <div className={styles.skeletonHero}>
        <span className={styles.skeletonBadge} />
        <span className={styles.skeletonAvatar} />
      </div>

      <div className={styles.skeletonBody}>
        <div className={styles.skeletonLineLg} />
        <div className={styles.skeletonLineMd} />
        <div className={styles.skeletonLineSm} />
      </div>
    </div>
  );

  const renderStateBox = () => {
    if (viewStatus === "guest") {
      return (
        <div className={styles.emptyState}>
          <span className={styles.emptyIconWrap}>
            <FiLock aria-hidden="true" />
          </span>

          <div className={styles.emptyCopy}>
            <strong>Zaloguj się, aby zobaczyć ulubione</strong>
            <p>Zapisane wizytówki są przypisane do Twojego konta.</p>
          </div>

          <Link
            className={styles.cta}
            to="/login"
            state={{ scrollToId: "loginBox" }}
          >
            <span>Przejdź do logowania</span>
            <FiArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      );
    }

    if (viewStatus === "error") {
      return (
        <div className={`${styles.emptyState} ${styles.errorState}`}>
          <span className={styles.emptyIconWrap}>
            <FiAlertCircle aria-hidden="true" />
          </span>

          <div className={styles.emptyCopy}>
            <strong>Błąd pobierania danych</strong>
            <p>{error}</p>
          </div>
        </div>
      );
    }

    if (viewStatus === "empty") {
      return (
        <div className={styles.emptyState}>
          <span className={styles.emptyIconWrap}>
            <FiHeart aria-hidden="true" />
          </span>

          <div className={styles.emptyCopy}>
            <strong>Nic tu jeszcze nie ma</strong>
            <p>Dodaj pierwszy profil do swojej prywatnej kolekcji.</p>
          </div>

          <Link
            className={styles.cta}
            to="/profile"
            state={{ scrollToId: "profilesHub" }}
          >
            <span>Przeglądaj profile</span>
            <FiArrowUpRight aria-hidden="true" />
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
        <div className={styles.collection}>
          <header className={styles.hero}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>
                <FiHeart aria-hidden="true" />
                Twoja kolekcja
              </span>

              <h1>{currentCopy.title}</h1>
              <p>{currentCopy.text}</p>
            </div>

            <div className={styles.summary} aria-live="polite">
              <span className={styles.summaryIcon} aria-hidden="true">
                <FiHeart />
              </span>

              <strong>
                {viewStatus === "ready"
                  ? String(count).padStart(2, "0")
                  : viewStatus === "loading"
                    ? "—"
                    : viewStatus === "error"
                      ? "!"
                      : "00"}
              </strong>

              <small>
                {count === 1 ? "zapisany profil" : "zapisanych profili"}
              </small>
            </div>
          </header>

          <div className={styles.content}>
            <div className={styles.listBar}>
              <div className={styles.listHeading}>
                <span>Ulubione</span>
                <h2>{currentCopy.listTitle}</h2>
              </div>

              {showCarousel && (
                <div className={styles.controls} aria-label="Sterowanie listą">
                  <button
                    type="button"
                    className={`${styles.navBtn} ${!canLeft ? styles.disabled : ""}`}
                    onClick={() => scrollByCard(-1)}
                    disabled={!canLeft}
                    aria-label="Przewiń w lewo"
                    title="Przewiń w lewo"
                  >
                    <FaChevronLeft aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    className={`${styles.navBtn} ${!canRight ? styles.disabled : ""}`}
                    onClick={() => scrollByCard(1)}
                    disabled={!canRight}
                    aria-label="Przewiń w prawo"
                    title="Przewiń w prawo"
                  >
                    <FaChevronRight aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>

            {showCarousel ? (
              <div className={styles.carousel}>
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
                  <p>Przesuń, aby zobaczyć więcej</p>
                  <span>→</span>
                </div>
              </div>
            ) : (
              renderStateBox()
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Favorites;
