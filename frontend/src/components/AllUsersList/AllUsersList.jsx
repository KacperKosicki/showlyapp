import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./AllUsersList.module.scss";
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

const AllUsersList = ({ currentUser, setAlert }) => {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
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

          const merged = safeProfiles.map((p) => ({
            ...p,
            isFavorite: favSet.has(p.userId),
          }));

          if (isMounted) setUsers(merged);
          return;
        }

        if (isMounted) setUsers(safeProfiles);
      } catch (err) {
        console.error("Błąd pobierania użytkowników:", err);

        if (isMounted) {
          setUsers([]);
        }

        if (typeof setAlert === "function") {
          setAlert({
            type: "error",
            message: "Nie udało się pobrać profili.",
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid, setAlert]);

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) return users;

    return users.filter((user) => {
      return (
        (user.name || "").toLowerCase().includes(q) ||
        (user.role || "").toLowerCase().includes(q) ||
        (user.location || "").toLowerCase().includes(q) ||
        (user.category?.label || "").toLowerCase().includes(q)
      );
    });
  }, [users, search]);

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
  }, [filteredUsers.length, updateArrows]);

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
  }, [search, filteredUsers.length, updateArrows]);

  const scrollByCard = (dir = 1) => {
    const el = scrollerRef.current;
    if (!el) return;

    const firstCard = el.querySelector(`.${styles.cardWrap}`);
    const cardW = firstCard?.getBoundingClientRect().width || 420;

    const computed = getComputedStyle(el);
    const gap =
      parseFloat(computed.columnGap || computed.gap || "0") || 24;

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
            <span>Showly Directory</span>
            <strong>Ładowanie profili...</strong>
            <p>
              Sprawdzamy dostępnych specjalistów, twórców i usługodawców.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.layout}>
          <aside className={styles.side}>
            <span className={styles.overline}>Showly Directory</span>

            <h2 className={styles.heading}>
              Wszyscy specjaliści w jednym miejscu.
            </h2>

            <p className={styles.description}>
              Przeglądaj profile usługodawców, twórców i specjalistów dostępnych
              w Showly. Szukaj po nazwie, roli lub lokalizacji i znajdź osobę
              najlepiej dopasowaną do swoich potrzeb.
            </p>

            <div className={styles.metaRow}>
              <div className={styles.metaCard}>
                <strong>{users.length}</strong>
                <span>wszystkich profili</span>
              </div>

              <div className={styles.metaCard}>
                <strong>{filteredUsers.length}</strong>
                <span>wyników</span>
              </div>

              <div className={styles.metaCard}>
                <strong>01</strong>
                <span>katalog Showly</span>
              </div>
            </div>

            <div className={styles.searchWrap}>
              <label className={styles.searchLabel} htmlFor="showly-search">
                Szukaj profilu
              </label>

              <input
                id="showly-search"
                type="text"
                placeholder="Nazwa, rola albo lokalizacja..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.search}
              />
            </div>
          </aside>

          <div className={styles.content}>
            <div className={styles.chapterHead}>
              <div>
                <span className={styles.chapterLabel}>Lista profili</span>
                <h3>Przesuwaj katalog i porównuj profile.</h3>
              </div>

              <span className={styles.chapterNumber}>04</span>
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
                className={`${styles.grid} ${filteredUsers.length === 0 ? styles.gridEmpty : ""
                  }`}
                ref={scrollerRef}
                role="list"
                aria-label="Lista profili Showly"
              >
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user, index) => (
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
                  ))
                ) : (
                  <div className={styles.emptyState}>
                    <strong>Brak wyników</strong>
                    <p>
                      Nie znaleźliśmy profilu pasującego do wpisanej frazy.
                      Spróbuj użyć innej nazwy, roli albo miasta.
                    </p>
                  </div>
                )}
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

export default AllUsersList;