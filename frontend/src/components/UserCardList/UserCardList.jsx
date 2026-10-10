import DataLoader from '../ui/DataLoader/DataLoader';
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  FiArrowLeft,
  FiArrowRight,
  FiAward,
  FiMessageCircle,
  FiStar,
  FiArrowUpRight,
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
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? "auto" : "smooth",
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

          <div className={styles.loadingIntro}><DataLoader label="Ładujemy najlepiej oceniane profile…" layout="none" /><span className={styles.loadingPill} aria-hidden="true" /><span className={styles.loadingTitle} aria-hidden="true" /><span className={styles.loadingTitleShort} aria-hidden="true" /><span className={styles.loadingText} aria-hidden="true" /></div>
        </div>
      </section>
    );
  }

  if (!profiles.length) {
    return null;
  }

  return (
    <section ref={sectionRef} className={styles.section} id="showly-ranking" aria-labelledby="showly-ranking-title">
      <div className={styles.backdrop} aria-hidden="true">
        <span className={styles.backdropWord}>DOBRE OPINIE</span>
        <span className={styles.backdropShape} />
      </div>
      <div className={styles.frame}>
        <header className={`${styles.intro} ${styles.reveal}`}>
          <div className={styles.introTop}>
            <h2 id="showly-ranking-title">Dobra robota.<br /><span>Dobre opinie.</span></h2>
            <p className={styles.introCopy}>Najlepszą rekomendację piszą ludzie. Poznaj profile, które zbierają najwyższe oceny — i znajdź kogoś do swojego następnego pomysłu.</p>
          </div>
          <div className={styles.rankingTicket} aria-label={`Ranking obejmuje maksymalnie ${TOP_RATED_LIMIT} profili`}>
            <span className={styles.ticketTop}><FiAward aria-hidden="true" />Wybór społeczności</span>
            <strong>TOP <span>{TOP_RATED_LIMIT}</span></strong>
            <span className={styles.ticketBottom}>Dobre słowo ma znaczenie.</span>
          </div>
        </header>

        <div className={`${styles.criteria} ${styles.reveal}`} style={{ "--reveal-delay": "60ms" }} aria-label="Jak ustalamy kolejność rankingu">
          <div><span className={styles.criteriaIcon}><FiStar aria-hidden="true" /></span><p><strong>Najpierw ocena</strong><span>Wyższa średnia, wyższa pozycja.</span></p></div>
          <div><span className={styles.criteriaIcon}><FiMessageCircle aria-hidden="true" /></span><p><strong>Potem liczba opinii</strong><span>Więcej głosów rozstrzyga remis.</span></p></div>
          <span className={styles.criteriaNote}>Wasze oceny. Wasz ranking.<FiArrowUpRight aria-hidden="true" /></span>
        </div>

        <div className={`${styles.gallery} ${styles.reveal}`} style={{ "--reveal-delay": "100ms" }}>
          <header className={styles.galleryHeader}>
            <div className={styles.galleryHeading}>
              <span className={styles.galleryLabel}>Ludzie / doświadczenia / rekomendacje</span>
              <h3>Wysoko oceniani. Warci poznania.</h3>
            </div>
            <div className={styles.controls} role="group" aria-label="Nawigacja rankingu profili">
              <button type="button" className={styles.controlButton} onClick={() => scrollByCard(-1)} disabled={!canScrollLeft} aria-label="Poprzedni profil"><FiArrowLeft aria-hidden="true" /></button>
              <button type="button" className={styles.controlButton} onClick={() => scrollByCard(1)} disabled={!canScrollRight} aria-label="Następny profil"><FiArrowRight aria-hidden="true" /></button>
            </div>
          </header>
          <div className={styles.carousel}>
            <div ref={scrollerRef} className={styles.track} role="list" tabIndex={0} aria-label="Najlepiej oceniane profile Showly">
              {profiles.map((profile, index) => {
                const position = index + 1;
                const reviewCount = getReviewsCount(profile);
                return (
                  <div className={styles.cardWrap} key={profile._id || profile.userId || index} role="listitem">
                    <div className={styles.cardCaption}>
                      <span className={`${styles.rankBadge} ${position === 1 ? styles.rankLeader : ""} ${position <= 3 ? styles.rankPodium : ""}`} aria-label={`Pozycja ${position} w rankingu`}>
                        {position === 1 && <FiAward aria-hidden="true" />}<strong>#{String(position).padStart(2, "0")}</strong>
                      </span>
                      <span className={styles.ratingSummary} aria-label={`Ocena ${getRating(profile).toFixed(1)}, liczba opinii: ${reviewCount}`}>
                        <FiStar aria-hidden="true" /><strong>{getRating(profile).toFixed(1)}</strong><span>({reviewCount})</span>
                      </span>
                    </div>
                    <UserCard user={profile} currentUser={currentUser} setAlert={setAlert} />
                  </div>
                );
              })}
            </div>
            <div className={styles.mobileHint} aria-hidden="true"><FiArrowLeft /><span>Przesuń i poznaj kolejne osoby</span><FiArrowRight /></div>
          </div>
        </div>
        <footer className={styles.sectionFooter}>
          <span>Każda współpraca zaczyna się od poznania.</span>
          <Link to="/profile">Znajdź kogoś dla siebie<FiArrowUpRight aria-hidden="true" /></Link>
        </footer>
      </div>
    </section>
  );
};

export default UserCardList;
