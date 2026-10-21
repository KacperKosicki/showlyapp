import DataLoader from '../ui/DataLoader/DataLoader';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import {
  FiChevronDown,
  FiArrowLeft,
  FiArrowRight,
  FiSearch,
  FiSliders,
  FiUsers,
  FiArrowUpRight,
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
  const trackRef = useRef(null);
  const [scrollState, setScrollState] = useState({ previous: false, next: false, first: 1, last: 1 });

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("default");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const bounds = track.getBoundingClientRect();
    const visible = Array.from(track.children).reduce((indices, card, index) => {
      const rect = card.getBoundingClientRect();
      // Count cards that are mostly visible, leaving the next-card preview out.
      const overlap = Math.min(rect.right, bounds.right) - Math.max(rect.left, bounds.left);
      if (overlap >= rect.width * 0.5) indices.push(index + 1);
      return indices;
    }, []);
    setScrollState({
      previous: track.scrollLeft > 2,
      next: track.scrollWidth - track.clientWidth - track.scrollLeft > 2,
      first: visible[0] || 1,
      last: visible[visible.length - 1] || 1,
    });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    track.scrollLeft = 0;
    updateScrollState();
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateScrollState)
      : null;
    observer?.observe(track);
    window.addEventListener('resize', updateScrollState);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateScrollState);
    };
  }, [visibleUsers, loading, updateScrollState]);

  const scrollProfiles = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    track.scrollBy({ left: direction * track.clientWidth, behavior: reducedMotion ? 'instant' : 'smooth' });
  };

  const handleTrackKeyDown = (event) => {
    // Leave keyboard events inside links and card controls to UserCard.
    if (event.target !== event.currentTarget) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      scrollProfiles(event.key === 'ArrowLeft' ? -1 : 1);
    }
  };

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return undefined;
    }

    const elements = section.querySelectorAll(`.${styles.reveal}`);

    if (typeof IntersectionObserver === "undefined" || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
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
          <div className={styles.loadingIntro}><DataLoader label="Ładujemy katalog profili…" layout="none" /><span className={styles.loadingPill} aria-hidden="true" /><span className={styles.loadingTitle} aria-hidden="true" /><span className={styles.loadingTitleShort} aria-hidden="true" /><span className={styles.loadingText} aria-hidden="true" /></div>

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
    <section ref={sectionRef} className={styles.section} id="showly-directory" aria-labelledby="showly-directory-title">
      <div className={styles.backdrop} aria-hidden="true"><span className={styles.backdropWord}>ODKRYWAJ</span><span className={styles.backdropShape} /></div>
      <div className={styles.frame}>
        <header className={`${styles.intro} ${styles.reveal}`}>
          <div className={styles.introTop}>
            <h2 id="showly-directory-title">Twój pomysł.<br /><span>Ich możliwości.</span></h2>
            <p className={styles.introCopy}>Różne historie, branże i talenty. Przejrzyj wizytówki, poznaj ofertę i znajdź osobę, z którą zrobisz coś dobrego.</p>
          </div>
          <div className={styles.directoryFolder}>
            <span className={styles.folderTab}>Ludzie do Twoich pomysłów</span>
            <div className={styles.folderBody}>
              <span className={styles.folderLabel}>Katalog Showly<FiArrowUpRight aria-hidden="true" /></span>
              <strong>{String(users.length).padStart(2, "0")}</strong>
              <span className={styles.folderCaption}>{getResultsLabel(users.length)} do odkrycia</span>
              <div className={styles.folderFooter}><span>Każda branża.<br />Własny charakter.</span><FiUsers aria-hidden="true" /></div>
            </div>
          </div>
        </header>

        <div className={styles.gallery}>
          <div className={`${styles.searchPanel} ${styles.reveal}`} style={{ "--reveal-delay": "100ms" }}>
            <div className={styles.searchIntro}><FiSearch aria-hidden="true" /><div><h3>Od czego zaczynamy?</h3><p>Wpisz nazwę, usługę lub miejscowość.</p></div></div>
            <div className={styles.filters}>
              <label className={styles.searchField} htmlFor="showly-search">
                <span className={styles.srOnly}>Szukaj profilu</span><FiSearch aria-hidden="true" />
                <input id="showly-search" type="search" aria-label="Szukaj profilu" placeholder="Kogo szukasz?" value={search} onChange={event => setSearch(event.target.value)} autoComplete="off" />
                {search && <button type="button" className={styles.clearButton} onClick={clearSearch} aria-label="Wyczyść wyszukiwanie"><FiX aria-hidden="true" /></button>}
              </label>
              <label className={styles.sortField} htmlFor="showly-sort">
                <FiSliders aria-hidden="true" /><span className={styles.srOnly}>Sortuj profile</span>
                <select id="showly-sort" value={sortMode} onChange={event => setSortMode(event.target.value)}>{sortOptions.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select>
                <FiChevronDown className={styles.selectArrow} aria-hidden="true" />
              </label>
            </div>
          </div>
          <header className={`${styles.galleryHeader} ${styles.reveal}`}>
            <div className={styles.galleryHeading}><span className={styles.galleryLabel}>Wszystkie talenty w jednym miejscu</span><h3>{hasSearchQuery ? "Pasują do Twojego pomysłu." : "Poznaj ludzi. Zobacz możliwości."}</h3></div>
            <div className={styles.resultSummary} aria-live="polite" aria-atomic="true"><span>Znaleziono</span><strong>{getResultsLabel(visibleUsers.length)}</strong></div>
          </header>
          {visibleUsers.length > 0 ? (
            <div className={styles.catalog}>
              <div className={styles.trackToolbar}>
                <p id="showly-directory-scroll-hint"><span className={styles.catalogDot} aria-hidden="true" />Przeglądaj profile<span className={styles.scrollHint}>Przesuń listę, by odkryć więcej</span></p>
                <div className={styles.trackControls}>
                  <button type="button" onClick={() => scrollProfiles(-1)} disabled={!scrollState.previous} aria-label="Poprzednie profile" aria-controls="showly-profile-track"><FiArrowLeft aria-hidden="true" /></button>
                  <button type="button" onClick={() => scrollProfiles(1)} disabled={!scrollState.next} aria-label="Następne profile" aria-controls="showly-profile-track"><FiArrowRight aria-hidden="true" /></button>
                </div>
              </div>
            <div ref={trackRef} id="showly-profile-track" className={styles.track} role="list" tabIndex={0} aria-label="Wszystkie profile Showly" aria-describedby="showly-directory-scroll-hint" onScroll={updateScrollState} onKeyDown={handleTrackKeyDown}>
              {visibleUsers.map((user, index) => (
                <div className={styles.cardWrap} key={user._id || user.userId || index} role="listitem">
                  <div className={styles.cardCaption} aria-hidden="true"><span>Profil / {String(index + 1).padStart(2, "0")}</span><i /><FiArrowUpRight /></div>
                  <UserCard user={user} currentUser={currentUser} setAlert={setAlert} />
                </div>
              ))}
            </div>
              <div className={styles.trackFooter}><span>Widoczne <strong>{scrollState.first === scrollState.last ? scrollState.first : `${scrollState.first}–${scrollState.last}`}</strong> z {visibleUsers.length}</span><span>Kolejny profil, nowe możliwości.<FiArrowUpRight aria-hidden="true" /></span></div>
            </div>
          ) : (
            <div className={styles.emptyState} role="status">
              <span className={styles.emptyIcon}><FiSearch aria-hidden="true" /></span>
              <div><h3>{hasSearchQuery ? "Jeszcze nie znaleźliśmy tej osoby." : "Tutaj zacznie się coś dobrego."}</h3><p>{hasSearchQuery ? "Spróbuj innej nazwy, branży lub miejscowości." : "Pierwsze publiczne wizytówki pojawią się właśnie tutaj."}</p></div>
              {hasSearchQuery && <button type="button" onClick={clearSearch}>Pokaż wszystkie profile<FiArrowUpRight aria-hidden="true" /></button>}
            </div>
          )}
          <footer className={styles.directoryNote}><FiUsers aria-hidden="true" /><p><strong>Dobry pomysł potrzebuje właściwych ludzi.</strong><span>Katalog aktualizuje się razem z profilami Showly.</span></p><span className={styles.noteSign} aria-hidden="true">Zacznij od poznania.<FiArrowUpRight /></span></footer>
        </div>
      </div>
    </section>
  );
};

export default AllUsersList;
