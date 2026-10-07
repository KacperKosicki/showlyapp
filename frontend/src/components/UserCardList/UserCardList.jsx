import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  FiArrowLeft,
  FiArrowRight,
  FiAward,
  FiMessageCircle,
  FiStar,
} from "react-icons/fi";

import { auth } from "../../firebase";
import UserCard from "../UserCard/UserCard";

import styles from "./UserCardList.module.scss";

const API = process.env.REACT_APP_API_URL;
const TOP_RATED_LIMIT = 10;

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

const selectTopRatedProfiles = (profiles = []) =>
  [...profiles]
    .sort((a, b) => {
      const ratingDifference = getRating(b) - getRating(a);

      if (ratingDifference !== 0) {
        return ratingDifference;
      }

      const reviewsDifference =
        getReviewsCount(b) - getReviewsCount(a);

      if (reviewsDifference !== 0) {
        return reviewsDifference;
      }

      return Number(b?.visits || 0) - Number(a?.visits || 0);
    })
    .slice(0, TOP_RATED_LIMIT);

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

const UserCardList = ({ currentUser, setAlert }) => {
  const sectionRef = useRef(null);
  const scrollerRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchTopRatedProfiles = async () => {
      try {
        setLoading(true);

        const { data } = await axios.get(`${API}/api/profiles`);
        const safeProfiles = Array.isArray(data) ? data : [];
        let selectedProfiles = selectTopRatedProfiles(safeProfiles);

        if (currentUser?.uid && auth.currentUser) {
          const authHeader = await getAuthHeader();
          const { data: favoriteProfiles } = await axios.get(
            `${API}/api/favorites/my`,
            {
              headers: authHeader,
            }
          );

          const favoriteIds = new Set(
            (Array.isArray(favoriteProfiles) ? favoriteProfiles : [])
              .map(
                (profile) =>
                  profile?.userId || profile?.profileUserId
              )
              .filter(Boolean)
          );

          selectedProfiles = selectedProfiles.map((profile) => ({
            ...profile,
            isFavorite: favoriteIds.has(
              profile?.userId || profile?.profileUserId
            ),
          }));
        }

        if (isMounted) {
          setProfiles(selectedProfiles);
        }
      } catch (error) {
        console.error(
          "Błąd pobierania najlepiej ocenianych profili:",
          error
        );

        if (isMounted) {
          setProfiles([]);
        }

        if (typeof setAlert === "function") {
          setAlert({
            type: "error",
            message:
              "Nie udało się pobrać najlepiej ocenianych profili.",
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTopRatedProfiles();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid, setAlert]);

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
        threshold: 0.1,
        rootMargin: "0px 0px -5% 0px",
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [loading, profiles.length]);

  const updateCarouselState = useCallback(() => {
    const scroller = scrollerRef.current;

    if (!scroller) {
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
  }, [profiles.length, updateCarouselState]);

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

  if (loading) {
    return (
      <section ref={sectionRef} className={styles.section}>
        <div
          className={`${styles.frame} ${styles.loadingFrame}`}
          aria-live="polite"
          aria-label="Ładowanie najlepiej ocenianych profili"
        >
          <div className={styles.loadingGallery}>
            <div className={styles.loadingGalleryHead}>
              <span />
              <span />
              <span />
            </div>

            <div className={styles.loadingCards}>
              <span />
              <span />
            </div>
          </div>

          <div className={styles.loadingIntro}>
            <span className={styles.loadingPill} />
            <span className={styles.loadingTitle} />
            <span className={styles.loadingTitleShort} />
            <span className={styles.loadingText} />
          </div>
        </div>
      </section>
    );
  }

  if (!profiles.length) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="showly-ranking"
      aria-labelledby="showly-ranking-title"
    >
      <div className={styles.frame}>
        <div
          className={`${styles.gallery} ${styles.reveal} ${styles.fromLeft}`}
        >
          <header className={styles.galleryHeader}>
            <div className={styles.galleryHeading}>
              <span className={styles.galleryLabel}>
                Ranking użytkowników
              </span>

              <h3>Najwyżej oceniane profile w Showly.</h3>

              <p>
                Ranking zaczyna się od najwyższej średniej. Przy tej
                samej ocenie wyżej trafia profil z większą liczbą opinii.
              </p>
            </div>

            <div
              className={styles.controls}
              role="group"
              aria-label="Nawigacja rankingu profili"
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
          </header>

          <div className={styles.carousel}>
            <div
              ref={scrollerRef}
              className={styles.track}
              role="list"
              aria-label="Najlepiej oceniane profile Showly"
            >
              {profiles.map((profile, index) => {
                const position = index + 1;
                const isLeader = position === 1;
                const isPodium = position <= 3;

                return (
                  <div
                    className={styles.cardWrap}
                    key={profile._id || profile.userId || index}
                    role="listitem"
                    style={{
                      "--card-delay": `${Math.min(
                        index * 65,
                        325
                      )}ms`,
                    }}
                  >
                    <span
                      className={`${styles.rankBadge} ${isLeader ? styles.rankLeader : ""
                        } ${isPodium ? styles.rankPodium : ""}`}
                      aria-label={`Pozycja ${position} w rankingu`}
                    >
                      {isLeader && <FiAward aria-hidden="true" />}
                      <strong>
                        #{String(position).padStart(2, "0")}
                      </strong>
                    </span>

                    <UserCard
                      user={profile}
                      currentUser={currentUser}
                      setAlert={setAlert}
                    />
                  </div>
                );
              })}
            </div>

            <div className={styles.mobileHint} aria-hidden="true">
              <FiArrowLeft />
              <span>Przesuń ranking</span>
              <FiArrowRight />
            </div>
          </div>
        </div>

        <aside
          className={`${styles.intro} ${styles.reveal} ${styles.fromRight}`}
          style={{ "--reveal-delay": "90ms" }}
        >
          <span className={styles.introCircle} aria-hidden="true" />
          <span className={styles.introMark} aria-hidden="true">
            ★
          </span>

          <div className={styles.introTop}>
            <span className={styles.kicker}>
              <FiAward aria-hidden="true" />
              Showly / Ranking
            </span>

            <h2 id="showly-ranking-title">
              Dobre opinie mówią więcej niż obietnice.
            </h2>

            <p className={styles.introCopy}>
              Tutaj pokazujemy maksymalnie dziesięć profili z najwyższą
              oceną użytkowników. Bez dodatkowego zgłoszenia i bez
              ręcznego wyróżniania.
            </p>
          </div>

          <div className={styles.introBottom}>
            <div className={styles.criteria}>
              <div>
                <span className={styles.criteriaIcon}>
                  <FiStar aria-hidden="true" />
                </span>

                <p>
                  <strong>Najpierw średnia</strong>
                  <span>wyższa ocena oznacza wyższą pozycję</span>
                </p>
              </div>

              <div>
                <span className={styles.criteriaIcon}>
                  <FiMessageCircle aria-hidden="true" />
                </span>

                <p>
                  <strong>Później opinie</strong>
                  <span>ich liczba rozstrzyga przy remisie</span>
                </p>
              </div>
            </div>

            <div className={styles.rankingTotal}>
              <span>Lista obejmuje</span>
              <strong>TOP {TOP_RATED_LIMIT}</strong>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default UserCardList;
