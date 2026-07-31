import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import axios from "axios";

import {
  FaChevronLeft,
  FaChevronRight,
  FaSearch,
} from "react-icons/fa";

import { auth } from "../../firebase";

import styles from "./AllUsersList.module.scss";
import UserCard from "../UserCard/UserCard";

const API = process.env.REACT_APP_API_URL;

async function getAuthHeader() {
  const user = auth.currentUser;

  if (!user) {
    return {};
  }

  const token = await user.getIdToken();

  return {
    Authorization: `Bearer ${token}`,
  };
}

const AllUsersList = ({ currentUser, setAlert }) => {
  const sectionRef = useRef(null);
  const scrollerRef = useRef(null);
  const rafRef = useRef(null);

  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        setLoading(true);

        const { data: profiles } = await axios.get(
          `${API}/api/profiles`
        );

        const safeProfiles = Array.isArray(profiles)
          ? profiles
          : [];

        if (currentUser?.uid && auth.currentUser) {
          const authHeader = await getAuthHeader();

          const { data: favoriteProfiles } = await axios.get(
            `${API}/api/favorites/my`,
            {
              headers: {
                ...authHeader,
              },
            }
          );

          const favoriteIds = new Set(
            (
              Array.isArray(favoriteProfiles)
                ? favoriteProfiles
                : []
            )
              .map(
                (profile) =>
                  profile?.userId ||
                  profile?.profileUserId
              )
              .filter(Boolean)
          );

          const mergedProfiles = safeProfiles.map(
            (profile) => ({
              ...profile,
              isFavorite: favoriteIds.has(profile.userId),
            })
          );

          if (isMounted) {
            setUsers(mergedProfiles);
          }

          return;
        }

        if (isMounted) {
          setUsers(safeProfiles);
        }
      } catch (error) {
        console.error(
          "Błąd pobierania użytkowników:",
          error
        );

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

  const filteredUsers = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) {
      return users;
    }

    return users.filter((user) => {
      return (
        (user.name || "")
          .toLowerCase()
          .includes(query) ||
        (user.role || "")
          .toLowerCase()
          .includes(query) ||
        (user.location || "")
          .toLowerCase()
          .includes(query) ||
        (user.category?.label || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [users, search]);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return undefined;
    }

    const animatedElements = section.querySelectorAll(
      `.${styles.reveal}`
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(
              styles.revealVisible
            );
          } else {
            entry.target.classList.remove(
              styles.revealVisible
            );
          }
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -7% 0px",
      }
    );

    animatedElements.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [loading, filteredUsers.length]);

  const updateArrows = useCallback(() => {
    const element = scrollerRef.current;

    if (!element) {
      return;
    }

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const maxScroll = Math.max(
        0,
        element.scrollWidth - element.clientWidth
      );

      const currentScroll = Math.max(
        0,
        element.scrollLeft
      );

      setCanLeft(currentScroll > 4);

      setCanRight(
        maxScroll > 4 &&
          currentScroll < maxScroll - 4
      );
    });
  }, []);

  useEffect(() => {
    const element = scrollerRef.current;

    if (!element) {
      return undefined;
    }

    updateArrows();

    const handleScroll = () => {
      updateArrows();
    };

    element.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    window.addEventListener("resize", handleScroll);

    let resizeObserver;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(handleScroll);
      resizeObserver.observe(element);
    }

    return () => {
      element.removeEventListener(
        "scroll",
        handleScroll
      );

      window.removeEventListener(
        "resize",
        handleScroll
      );

      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [filteredUsers.length, updateArrows]);

  useEffect(() => {
    const element = scrollerRef.current;

    if (!element) {
      return undefined;
    }

    const frame = requestAnimationFrame(() => {
      element.scrollTo({
        left: 0,
        behavior: "auto",
      });

      updateArrows();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [search, filteredUsers.length, updateArrows]);

  const scrollByCard = (direction = 1) => {
    const element = scrollerRef.current;

    if (!element) {
      return;
    }

    const firstCard = element.querySelector(
      `.${styles.cardWrap}`
    );

    const cardWidth =
      firstCard?.getBoundingClientRect().width || 420;

    const computedStyles = getComputedStyle(element);

    const gap =
      parseFloat(
        computedStyles.columnGap ||
          computedStyles.gap ||
          "0"
      ) || 24;

    const scrollStep = cardWidth + gap;

    const maxScroll = Math.max(
      0,
      element.scrollWidth - element.clientWidth
    );

    const nextScroll = Math.min(
      Math.max(
        element.scrollLeft +
          direction * scrollStep,
        0
      ),
      maxScroll
    );

    element.scrollTo({
      left: nextScroll <= 8 ? 0 : nextScroll,
      behavior: "smooth",
    });

    window.setTimeout(updateArrows, 320);
  };

  if (loading) {
    return (
      <section
        ref={sectionRef}
        className={styles.section}
      >
        <div
          className={styles.decor}
          aria-hidden="true"
        >
          <span className={styles.orbOne} />
          <span className={styles.orbTwo} />
          <span className={styles.waveOne} />
          <span className={styles.waveTwo} />
        </div>

        <div className={styles.inner}>
          <div className={styles.loading}>
            <span className={styles.eyebrow}>
              Showly Directory
            </span>

            <strong>Ładowanie profili…</strong>

            <p>
              Sprawdzamy dostępnych specjalistów,
              twórców i usługodawców.
            </p>

            <div
              className={styles.loadingLine}
              aria-hidden="true"
            >
              <span />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="showly-directory"
    >
      <div
        className={styles.decor}
        aria-hidden="true"
      >
        <span className={styles.orbOne} />
        <span className={styles.orbTwo} />
        <span className={styles.waveOne} />
        <span className={styles.waveTwo} />
        <span className={styles.lineOne} />
        <span className={styles.lineTwo} />
      </div>

      <div className={styles.inner}>
        <header className={styles.header}>
          <div
            className={`${styles.headingBlock} ${styles.reveal} ${styles.fromLeft}`}
          >
            <span className={styles.eyebrow}>
              Profile Showly
            </span>

            <h2>
              Wszyscy specjaliści{" "}
              <span>w jednym miejscu.</span>
            </h2>
          </div>

          <div
            className={`${styles.headerSide} ${styles.reveal} ${styles.fromRight}`}
            style={{
              "--reveal-delay": "120ms",
            }}
          >
            <p>
              Przeglądaj profile usługodawców, twórców
              i specjalistów dostępnych w Showly. Szukaj
              po nazwie, roli lub lokalizacji i znajdź
              osobę najlepiej dopasowaną do swoich potrzeb.
            </p>

            <div className={styles.stats}>
              <div className={styles.stat}>
                <strong>{users.length}</strong>
                <span>wszystkich profili</span>
              </div>

              <div className={styles.stat}>
                <strong>{filteredUsers.length}</strong>
                <span>wyników</span>
              </div>

              <div className={styles.stat}>
                <strong>04</strong>
                <span>katalog Showly</span>
              </div>
            </div>
          </div>
        </header>

        <section className={styles.showcase}>
          <span
            className={styles.watermark}
            aria-hidden="true"
          >
            PROFILE SHOWLY
          </span>

          <div
            className={`${styles.showcaseHead} ${styles.reveal} ${styles.fromTop}`}
          >
            <div className={styles.showcaseIntro}>
              <span className={styles.showcaseIndex}>
                04
              </span>

              <div>
                <span className={styles.eyebrow}>
                  Katalog profili
                </span>

                <h3>
                  Szukaj, przesuwaj i porównuj profile.
                </h3>
              </div>
            </div>

            <div className={styles.controls}>
              <button
                type="button"
                className={styles.controlButton}
                onClick={() => scrollByCard(-1)}
                disabled={!canLeft}
                aria-label="Przewiń katalog w lewo"
              >
                <FaChevronLeft aria-hidden="true" />
              </button>

              <button
                type="button"
                className={styles.controlButton}
                onClick={() => scrollByCard(1)}
                disabled={!canRight}
                aria-label="Przewiń katalog w prawo"
              >
                <FaChevronRight aria-hidden="true" />
              </button>
            </div>
          </div>

          <div
            className={`${styles.searchArea} ${styles.reveal} ${styles.fromBottom}`}
            style={{
              "--reveal-delay": "80ms",
            }}
          >
            <label
              className={styles.searchLabel}
              htmlFor="showly-search"
            >
              Szukaj profilu
            </label>

            <div className={styles.searchField}>
              <FaSearch aria-hidden="true" />

              <input
                id="showly-search"
                type="text"
                placeholder="Nazwa, rola, kategoria albo lokalizacja…"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                className={styles.search}
              />

              <span className={styles.resultCount}>
                {filteredUsers.length}
              </span>
            </div>
          </div>

          <div
            className={`${styles.carousel} ${styles.reveal} ${styles.fromBottom}`}
            style={{
              "--reveal-delay": "130ms",
            }}
          >
            <div
              ref={scrollerRef}
              className={`${styles.grid} ${
                filteredUsers.length === 0
                  ? styles.gridEmpty
                  : ""
              }`}
              role="list"
              aria-label="Lista profili Showly"
            >
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user, index) => (
                  <div
                    className={styles.cardWrap}
                    key={
                      user._id ||
                      user.userId ||
                      index
                    }
                    role="listitem"
                    style={{
                      "--card-delay": `${Math.min(
                        index * 60,
                        300
                      )}ms`,
                    }}
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
                  <span className={styles.emptyIndex}>
                    00
                  </span>

                  <div>
                    <strong>Brak wyników</strong>

                    <p>
                      Nie znaleźliśmy profilu pasującego
                      do wpisanej frazy. Spróbuj użyć innej
                      nazwy, roli, kategorii albo miasta.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {filteredUsers.length > 0 && (
              <div className={styles.mobileHint}>
                <FaChevronLeft aria-hidden="true" />

                <span>
                  Przesuń, aby zobaczyć więcej profili
                </span>

                <FaChevronRight aria-hidden="true" />
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
};

export default AllUsersList;
