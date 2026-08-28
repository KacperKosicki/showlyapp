import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import {
  FiArrowLeft,
  FiArrowRight,
  FiChevronDown,
  FiSearch,
  FiSliders,
  FiUsers,
  FiX,
} from "react-icons/fi";

import { auth } from "../../firebase";
import UserCard from "../UserCard/UserCard";

import styles from "./AllUsersList.module.scss";

const API = process.env.REACT_APP_API_URL;

const sortOptions = [
  { value: "default", label: "Domyślna kolejność" },
  { value: "rating", label: "Najwyższa ocena" },
  { value: "reviews", label: "Najwięcej opinii" },
  { value: "name", label: "Nazwa A–Z" },
];

const normalizeText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const getRating = (profile = {}) => {
  const rating = Number(profile?.rating || 0);

  return Number.isFinite(rating) ? rating : 0;
};

const getReviewsCount = (profile = {}) => {
  if (Array.isArray(profile?.reviews)) {
    return profile.reviews.length;
  }

  const count = Number(
    profile?.reviewsCount ??
      profile?.ratingCount ??
      profile?.reviews ??
      0
  );

  return Number.isFinite(count) ? count : 0;
};

const getSearchText = (profile = {}) => {
  const tags = Array.isArray(profile?.tags)
    ? profile.tags
        .map((tag) =>
          typeof tag === "string" ? tag : tag?.label
        )
        .filter(Boolean)
    : [];

  return normalizeText(
    [
      profile?.name,
      profile?.role,
      profile?.location,
      profile?.category?.label,
      ...tags,
    ]
      .filter(Boolean)
      .join(" ")
  );
};

const getResultsLabel = (count) => {
  if (count === 1) {
    return "1 profil";
  }

  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    !(lastTwoDigits >= 12 && lastTwoDigits <= 14)
  ) {
    return `${count} profile`;
  }

  return `${count} profili`;
};

const getAuthHeader = async () => {
  const user = auth.currentUser;

  if (!user) {
    return {};
  }

  const token = await user.getIdToken();

  return {
    Authorization: `Bearer ${token}`,
  };
};

const AllUsersList = ({ currentUser, setAlert }) => {
  const sectionRef = useRef(null);
  const scrollerRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("default");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchProfiles = async () => {
      try {
        setLoading(true);

        const { data } = await axios.get(`${API}/api/profiles`);
        const safeProfiles = Array.isArray(data) ? data : [];
        let preparedProfiles = safeProfiles;

        if (currentUser?.uid && auth.currentUser) {
          const authHeader = await getAuthHeader();
          const { data: favoriteProfiles } = await axios.get(
            `${API}/api/favorites/my`,
            {
              headers: authHeader,
            }
          );

          const favoriteIds = new Set(
            (Array.isArray(favoriteProfiles)
              ? favoriteProfiles
              : []
            )
              .map(
                (profile) =>
                  profile?.userId || profile?.profileUserId
              )
              .filter(Boolean)
          );

          preparedProfiles = safeProfiles.map((profile) => ({
            ...profile,
            isFavorite: favoriteIds.has(
              profile?.userId || profile?.profileUserId
            ),
          }));
        }

        if (isMounted) {
          setUsers(preparedProfiles);
        }
      } catch (error) {
        console.error("Błąd pobierania użytkowników:", error);

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

    fetchProfiles();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid, setAlert]);

  const visibleUsers = useMemo(() => {
    const query = normalizeText(search);
    const filtered = query
      ? users.filter((user) => getSearchText(user).includes(query))
      : [...users];

    if (sortMode === "rating") {
      return filtered.sort((a, b) => {
        const ratingDifference = getRating(b) - getRating(a);

        return ratingDifference !== 0
          ? ratingDifference
          : getReviewsCount(b) - getReviewsCount(a);
      });
    }

    if (sortMode === "reviews") {
      return filtered.sort((a, b) => {
        const reviewsDifference =
          getReviewsCount(b) - getReviewsCount(a);

        return reviewsDifference !== 0
          ? reviewsDifference
          : getRating(b) - getRating(a);
      });
    }

    if (sortMode === "name") {
      return filtered.sort((a, b) =>
        String(a?.name || "").localeCompare(
          String(b?.name || ""),
          "pl",
          { sensitivity: "base" }
        )
      );
    }

    return filtered;
  }, [users, search, sortMode]);

  const hasSearchQuery = Boolean(normalizeText(search));

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return undefined;
    }

    const elements = section.querySelectorAll(`.${styles.reveal}`);

    if (typeof IntersectionObserver === "undefined") {
      elements.forEach((element) => {
        element.classList.add(styles.revealVisible);
      });

      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealVisible);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -4% 0px",
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [loading]);

  const updateCarouselState = useCallback(() => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const maxScroll = Math.max(
        0,
        scroller.scrollWidth - scroller.clientWidth
      );
      const currentScroll = Math.max(0, scroller.scrollLeft);

      setCanScrollLeft(currentScroll > 4);
      setCanScrollRight(
        maxScroll > 4 && currentScroll < maxScroll - 4
      );
    });
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return undefined;
    }

    const handleLayoutChange = () => updateCarouselState();

    scroller.addEventListener("scroll", handleLayoutChange, {
      passive: true,
    });
    window.addEventListener("resize", handleLayoutChange);

    let resizeObserver;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(handleLayoutChange);
      resizeObserver.observe(scroller);
    }

    const frame = requestAnimationFrame(() => {
      scroller.scrollTo({ left: 0, behavior: "auto" });
      updateCarouselState();
    });

    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", handleLayoutChange);
      window.removeEventListener("resize", handleLayoutChange);
      resizeObserver?.disconnect();

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [visibleUsers, updateCarouselState]);

  const scrollByCard = (direction) => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    const firstCard = scroller.querySelector(`.${styles.cardWrap}`);
    const cardWidth = firstCard?.getBoundingClientRect().width || 410;
    const scrollerStyles = getComputedStyle(scroller);
    const gap =
      parseFloat(
        scrollerStyles.columnGap || scrollerStyles.gap || "0"
      ) || 18;
    const maxScroll = Math.max(
      0,
      scroller.scrollWidth - scroller.clientWidth
    );
    const target = Math.min(
      Math.max(
        scroller.scrollLeft + direction * (cardWidth + gap),
        0
      ),
      maxScroll
    );

    scroller.scrollTo({
      left: target <= 6 ? 0 : target,
      behavior: "smooth",
    });
  };

  const clearSearch = () => {
    setSearch("");
  };

  if (loading) {
    return (
      <section
        ref={sectionRef}
        className={styles.section}
        aria-label="Ładowanie katalogu profili"
      >
        <div
          className={`${styles.frame} ${styles.loadingFrame}`}
          aria-live="polite"
        >
          <div className={styles.loadingIntro}>
            <span className={styles.loadingPill} />
            <span className={styles.loadingTitle} />
            <span className={styles.loadingTitleShort} />
            <span className={styles.loadingText} />
          </div>

          <div className={styles.loadingGallery}>
            <div className={styles.loadingGalleryHead}>
              <span />
              <span />
              <span />
            </div>

            <div className={styles.loadingFilters}>
              <span />
              <span />
            </div>

            <div className={styles.loadingCards}>
              <span />
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
      aria-labelledby="showly-directory-title"
    >
      <div className={styles.frame}>
        <aside
          className={`${styles.intro} ${styles.reveal} ${styles.fromLeft}`}
        >
          <span className={styles.introCircle} aria-hidden="true" />

          <div className={styles.introTop}>
            <span className={styles.kicker}>
              <FiUsers aria-hidden="true" />
              Showly / Katalog
            </span>

            <h2 id="showly-directory-title">
              Wszystkie profile. Jedno miejsce do szukania.
            </h2>

            <p className={styles.introCopy}>
              Przeglądaj publiczne profile usługodawców, twórców i
              specjalistów. Szukaj po nazwie, branży, roli, tagach lub
              lokalizacji.
            </p>
          </div>

          <div className={styles.profileTotal}>
            <strong>{String(users.length).padStart(2, "0")}</strong>
            <div>
              <span>publicznych profili</span>
              <small>aktualnie dostępnych w Showly</small>
            </div>
          </div>
        </aside>

        <div
          className={`${styles.gallery} ${styles.reveal} ${styles.fromRight}`}
          style={{ "--reveal-delay": "90ms" }}
        >
          <header className={styles.galleryHeader}>
            <div className={styles.galleryHeading}>
              <span className={styles.galleryLabel}>Katalog Showly</span>

              <h3>Znajdź profil dopasowany do swoich potrzeb.</h3>

              <p>
                Wyniki aktualizują się od razu podczas wpisywania.
              </p>
            </div>

            <div className={styles.headerTools}>
              <div className={styles.resultSummary} aria-live="polite">
                <span>Wyniki</span>
                <strong>{getResultsLabel(visibleUsers.length)}</strong>
              </div>

              <div
                className={styles.controls}
                role="group"
                aria-label="Nawigacja po profilach"
              >
                <button
                  type="button"
                  className={styles.controlButton}
                  onClick={() => scrollByCard(-1)}
                  disabled={!canScrollLeft}
                  aria-label="Poprzedni profil"
                >
                  <FiArrowLeft aria-hidden="true" />
                </button>

                <button
                  type="button"
                  className={styles.controlButton}
                  onClick={() => scrollByCard(1)}
                  disabled={!canScrollRight}
                  aria-label="Następny profil"
                >
                  <FiArrowRight aria-hidden="true" />
                </button>
              </div>
            </div>
          </header>

          <div className={styles.filters}>
            <label className={styles.searchField} htmlFor="showly-search">
              <FiSearch aria-hidden="true" />
              <span className={styles.srOnly}>Szukaj profilu</span>

              <input
                id="showly-search"
                type="search"
                placeholder="Nazwa, branża, rola albo lokalizacja…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                autoComplete="off"
              />

              {search && (
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={clearSearch}
                  aria-label="Wyczyść wyszukiwanie"
                >
                  <FiX aria-hidden="true" />
                </button>
              )}
            </label>

            <label className={styles.sortField} htmlFor="showly-sort">
              <FiSliders aria-hidden="true" />
              <span className={styles.srOnly}>Sortuj profile</span>

              <select
                id="showly-sort"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value)}
              >
                {sortOptions.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <FiChevronDown
                className={styles.selectArrow}
                aria-hidden="true"
              />
            </label>
          </div>

          <div className={styles.carousel}>
            {visibleUsers.length > 0 ? (
              <div
                ref={scrollerRef}
                className={styles.track}
                role="list"
                aria-label="Wszystkie profile Showly"
              >
                {visibleUsers.map((user, index) => (
                  <div
                    className={styles.cardWrap}
                    key={user._id || user.userId || index}
                    role="listitem"
                    style={{
                      "--card-delay": `${Math.min(
                        index * 55,
                        330
                      )}ms`,
                    }}
                  >
                    <UserCard
                      user={user}
                      currentUser={currentUser}
                      setAlert={setAlert}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState} role="status">
                <span className={styles.emptyIcon}>
                  <FiSearch aria-hidden="true" />
                </span>

                <div>
                  <span>
                    {hasSearchQuery ? "Brak dopasowania" : "Brak profili"}
                  </span>
                  <h3>
                    {hasSearchQuery
                      ? "Nie znaleźliśmy takiego profilu."
                      : "Katalog jest obecnie pusty."}
                  </h3>
                  <p>
                    {hasSearchQuery
                      ? "Spróbuj wpisać krótszą nazwę, inną branżę, rolę albo miejscowość."
                      : "Gdy pojawią się publiczne wizytówki, zobaczysz je właśnie w tym miejscu."}
                  </p>
                </div>

                {hasSearchQuery && (
                  <button type="button" onClick={clearSearch}>
                    Wyczyść wyszukiwanie
                  </button>
                )}
              </div>
            )}

            {visibleUsers.length > 1 && (
              <div className={styles.mobileHint} aria-hidden="true">
                <FiArrowLeft />
                <span>Przesuń katalog</span>
                <FiArrowRight />
              </div>
            )}
          </div>

          <div className={styles.directoryNote}>
            <FiUsers aria-hidden="true" />

            <p>
              <strong>Wszystkie publiczne wizytówki w jednym miejscu.</strong>
              <span>Katalog aktualizuje się razem z profilami Showly.</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AllUsersList;
