import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./UserCardList.module.scss";
import UserCard from "../UserCard/UserCard";
import axios from "axios";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { auth } from "../../firebase";

const API = process.env.REACT_APP_API_URL;

async function getAuthHeader() {
  const u = auth.currentUser;
  if (!u) return {};

  const token = await u.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

const UserCardList = ({ currentUser, setAlert }) => {
  const [topRatedUsers, setTopRatedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const scrollerRef = useRef(null);
  const rafRef = useRef(null);

  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        setLoading(true);

        const { data: profiles } = await axios.get(`${API}/api/profiles`);
        const safeProfiles = Array.isArray(profiles) ? profiles : [];

        let sorted = safeProfiles
          .sort((a, b) => {
            const ratingDiff = Number(b?.rating || 0) - Number(a?.rating || 0);

            if (ratingDiff !== 0) return ratingDiff;

            return Number(b?.reviews || 0) - Number(a?.reviews || 0);
          })
          .slice(0, 10);

        if (currentUser?.uid && auth.currentUser) {
          const authHeader = await getAuthHeader();

          const { data: favProfiles } = await axios.get(
            `${API}/api/favorites/my`,
            {
              headers: { ...authHeader },
            }
          );

          const favSet = new Set(
            (Array.isArray(favProfiles) ? favProfiles : [])
              .map((p) => p?.userId || p?.profileUserId)
              .filter(Boolean)
          );

          sorted = sorted.map((p) => ({
            ...p,
            isFavorite: favSet.has(p.userId),
          }));
        }

        if (isMounted) {
          setTopRatedUsers(sorted);
        }
      } catch (err) {
        console.error("Błąd pobierania profili:", err);

        if (isMounted) {
          setTopRatedUsers([]);
        }

        if (typeof setAlert === "function") {
          setAlert({
            type: "error",
            message: "Nie udało się pobrać najlepiej ocenianych profili.",
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid, setAlert]);

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
  }, [topRatedUsers.length, updateArrows]);

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
  }, [topRatedUsers.length, updateArrows]);

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

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.loadingCard}>
            <span>Showly Ranking</span>
            <strong>Ładowanie najlepiej ocenianych profili...</strong>
            <p>
              Sprawdzamy oceny, opinie i profile, które wyróżniają się
              zaufaniem użytkowników.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!topRatedUsers.length) return null;

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.layout}>
          <aside className={styles.side}>
            <span className={styles.overline}>Showly Ranking</span>

            <h2 className={styles.heading}>
              Najlepiej oceniani <span>eksperci.</span>
            </h2>

            <p className={styles.description}>
              Poznaj profile, które zdobyły najwyższe oceny użytkowników i
              wyróżniają się jakością usług, aktywnością oraz zaufaniem
              budowanym przez realne opinie.
            </p>

            <div className={styles.metaRow}>
              <div className={styles.metaCard}>
                <strong>TOP {topRatedUsers.length}</strong>
                <span>najlepszych profili</span>
              </div>

              <div className={styles.metaCard}>
                <strong>4★+</strong>
                <span>wysokie średnie ocen</span>
              </div>

              <div className={styles.metaCard}>
                <strong>01</strong>
                <span>ranking Showly</span>
              </div>
            </div>

            <div className={styles.infoBox}>
              <span>Opinie • Jakość • Zaufanie</span>

              <p>
                Ranking pomaga szybciej znaleźć osoby, które mają dobre oceny,
                pozytywne opinie i wyróżniają się na tle innych profili.
              </p>
            </div>
          </aside>

          <div className={styles.content}>
            <div className={styles.chapterHead}>
              <div>
                <span className={styles.chapterLabel}>
                  Najwyżej oceniane profile
                </span>

                <h3>Przesuwaj ranking i porównuj najlepsze wizytówki.</h3>
              </div>

              <span className={styles.chapterNumber}>03</span>
            </div>

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
                className={styles.list}
                ref={scrollerRef}
                role="list"
                aria-label="Lista najlepiej ocenianych profili Showly"
              >
                {topRatedUsers.map((user, index) => (
                  <div
                    className={styles.cardWrap}
                    key={user._id || user.userId || index}
                    role="listitem"
                  >
                    <UserCard
                      user={user}
                      currentUser={currentUser}
                      setAlert={setAlert}
                    />
                  </div>
                ))}
              </div>

              <div className={styles.mobileHint}>
                <span>←</span>
                <p>Przesuń, aby zobaczyć więcej profili</p>
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
          </div>
        </div>
      </div>
    </section>
  );
};

export default UserCardList;