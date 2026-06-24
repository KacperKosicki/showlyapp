import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import styles from "./SearchResults.module.scss";
import UserCard from "../UserCard/UserCard";
import { FaChevronLeft, FaChevronRight, FaSearch } from "react-icons/fa";
import { FiGrid, FiSearch, FiZap, FiUsers } from "react-icons/fi";

const API = process.env.REACT_APP_API_URL;

const SearchResults = ({ currentUser, setAlert }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const activeQuery = useMemo(
    () => (searchParams.get("q") || "").trim(),
    [searchParams]
  );

  const [query, setQuery] = useState(activeQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const scrollerRef = useRef(null);
  const rafRef = useRef(null);

  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    setQuery(activeQuery);
  }, [activeQuery]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!activeQuery || activeQuery.length < 2) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);

        const { data } = await axios.get(
          `${API}/api/profiles/search?q=${encodeURIComponent(activeQuery)}&limit=24`
        );

        setResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Błąd pobierania wyników:", err);
        setResults([]);

        if (typeof setAlert === "function") {
          setAlert({
            type: "error",
            message: "Nie udało się pobrać wyników wyszukiwania.",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [activeQuery, setAlert]);

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
  }, [results.length, activeQuery, loading, updateArrows]);

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
  }, [activeQuery, results.length, updateArrows]);

  const scrollByCard = (dir = 1) => {
    const el = scrollerRef.current;
    if (!el) return;

    const firstCard = el.querySelector(`.${styles.cardWrap}`);
    const cardW = firstCard?.getBoundingClientRect().width || 455;

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

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmed = query.trim();
    if (!trimmed) return;

    navigate(`/szukaj?q=${encodeURIComponent(trimmed)}`);
  };

  const statusLabel = loading
    ? "Szukam"
    : activeQuery
      ? "Aktywne"
      : "Start";

  const resultLabel = loading
    ? "trwa wyszukiwanie"
    : results.length === 1
      ? "znaleziony profil"
      : "znalezionych profili";

  const renderEmptyState = () => {
    if (loading) {
      return (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconWrap}>
            <FiZap className={styles.emptyIcon} />
          </div>

          <strong>Szukam najlepszych dopasowań</strong>

          <p>
            Sprawdzamy profile, tagi, lokalizacje, opis oraz usługi powiązane z
            wpisaną frazą.
          </p>
        </div>
      );
    }

    if (!activeQuery) {
      return (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconWrap}>
            <FiSearch className={styles.emptyIcon} />
          </div>

          <strong>Wpisz frazę, aby rozpocząć</strong>

          <p>
            Możesz szukać po usłudze, nazwie profilu, mieście, tagu albo
            fragmencie opisu.
          </p>
        </div>
      );
    }

    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIconWrap}>
          <FiUsers className={styles.emptyIcon} />
        </div>

        <strong>Brak wyników dla „{activeQuery}”</strong>

        <p>
          Spróbuj wpisać krótszą frazę, inną usługę albo samą lokalizację, np.
          „DJ”, „Piła”, „fotograf” lub „korepetycje”.
        </p>
      </div>
    );
  };

  const hasResults = !loading && activeQuery && results.length > 0;

  return (
    <section className={styles.section} id="searchResults">
      <div className={styles.inner}>
        <div className={styles.layout}>
          <aside className={styles.side}>
            <span className={styles.overline}>Showly Search</span>

            <h1 className={styles.heading}>
              Wyszukiwarka <span>profili</span> i usług.
            </h1>

            <p className={styles.description}>
              Szukaj po nazwie, usłudze, lokalizacji, tagach i opisie. Wpisz,
              czego potrzebujesz, a Showly pokaże pasujące wizytówki.
            </p>

            <div className={styles.metaRow}>
              <div className={styles.metaCard}>
                <strong>{loading ? "..." : results.length}</strong>
                <span>{resultLabel}</span>
              </div>

              <div className={styles.metaCard}>
                <strong>{statusLabel}</strong>
                <span>status wyszukiwania</span>
              </div>

              <div className={styles.metaCard}>
                <strong>24</strong>
                <span>maksymalna liczba wyników</span>
              </div>
            </div>

            <div className={styles.infoBox}>
              <span>Usługi • Miasta • Tagi</span>

              <p>
                Najlepiej wpisywać konkret: typ usługi i miasto, np. „DJ
                Poznań”, „fryzjer Piła”, „cukiernia” albo „logo”.
              </p>
            </div>
          </aside>

          <div className={styles.content}>
            <div className={styles.chapterHead}>
              <div>
                <span className={styles.chapterLabel}>Katalog Showly</span>

                <h2>
                  {activeQuery
                    ? `Wyniki dla „${activeQuery}”.`
                    : "Znajdź profil, usługę albo specjalistę."}
                </h2>
              </div>

              <span className={styles.chapterNumber}>
                {loading ? "..." : results.length}
              </span>
            </div>

            <div className={styles.searchPanel}>
              <form className={styles.searchForm} onSubmit={handleSubmit}>
                <span className={styles.searchIcon}>
                  <FiSearch />
                </span>

                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Np. DJ, torty, fryzjer Piła, logo, korepetycje…"
                  className={styles.input}
                />

                <button type="submit" className={styles.button} aria-label="Szukaj">
                  <FaSearch />
                  <span>Szukaj</span>
                </button>
              </form>

              <div className={styles.quickHints}>
                <span>Spróbuj:</span>

                <button type="button" onClick={() => navigate("/szukaj?q=DJ Poznań")}>
                  DJ Poznań
                </button>

                <button type="button" onClick={() => navigate("/szukaj?q=fryzjer Piła")}>
                  fryzjer Piła
                </button>

                <button type="button" onClick={() => navigate("/szukaj?q=cukiernia")}>
                  cukiernia
                </button>
              </div>
            </div>

            {activeQuery && (
              <div className={styles.resultsBar}>
                <div className={styles.resultsInfo}>
                  <strong>Wyniki dla: „{activeQuery}”</strong>

                  <span>
                    {loading
                      ? "Szukam najlepszych dopasowań…"
                      : `${results.length} ${resultLabel}`}
                  </span>
                </div>

                <div className={styles.resultsBadge}>
                  <FiGrid />
                  Profile Showly
                </div>
              </div>
            )}

            {hasResults ? (
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
                  aria-label="Wyniki wyszukiwania profili Showly"
                >
                  {results.map((user, index) => (
                    <div
                      className={styles.cardWrap}
                      key={user._id || user.userId || user.slug || index}
                      role="listitem"
                    >
                      <UserCard
                        user={user}
                        currentUser={currentUser}
                        setAlert={setAlert}
                      />

                      {Array.isArray(user.matchedServices) &&
                        user.matchedServices.length > 0 && (
                          <div className={styles.matchedBox}>
                            <div className={styles.matchedLabel}>
                              Pasujące usługi:
                            </div>

                            <div className={styles.matchedServices}>
                              {user.matchedServices.map((service) => (
                                <span
                                  key={service._id || service.name}
                                  className={styles.matchedService}
                                >
                                  {service.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  ))}
                </div>

                <div className={styles.mobileHint}>
                  <span>←</span>
                  <p>Przesuń, aby zobaczyć więcej wyników</p>
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
              renderEmptyState()
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SearchResults;