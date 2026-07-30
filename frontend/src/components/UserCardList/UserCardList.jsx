import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { auth } from "../../firebase";

import styles from "./UserCardList.module.scss";
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

const UserCardList = ({ currentUser, setAlert }) => {
  const sectionRef = useRef(null);
  const scrollerRef = useRef(null);
  const rafRef = useRef(null);

  const [topRatedUsers, setTopRatedUsers] = useState([]);
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

        let sorted = [...safeProfiles]
          .sort((a, b) => {
            const ratingDiff =
              Number(b?.rating || 0) -
              Number(a?.rating || 0);

            if (ratingDiff !== 0) {
              return ratingDiff;
            }

            return (
              Number(b?.reviews || 0) -
              Number(a?.reviews || 0)
            );
          })
          .slice(0, 10);

        if (currentUser?.uid && auth.currentUser) {
          const authHeader = await getAuthHeader();

          const { data: favProfiles } = await axios.get(
            `${API}/api/favorites/my`,
            {
              headers: {
                ...authHeader,
              },
            }
          );

          const favoriteIds = new Set(
            (
              Array.isArray(favProfiles)
                ? favProfiles
                : []
            )
              .map(
                (profile) =>
                  profile?.userId ||
                  profile?.profileUserId
              )
              .filter(Boolean)
          );

          sorted = sorted.map((profile) => ({
            ...profile,
            isFavorite: favoriteIds.has(profile.userId),
          }));
        }

        if (isMounted) {
          setTopRatedUsers(sorted);
        }
      } catch (error) {
        console.error(
          "Błąd pobierania najlepiej ocenianych profili:",
          error
        );

        if (isMounted) {
          setTopRatedUsers([]);
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

    run();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid, setAlert]);

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
  }, [loading, topRatedUsers.length]);

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
  }, [topRatedUsers.length, updateArrows]);

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
  }, [topRatedUsers.length, updateArrows]);

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
              Showly Ranking
            </span>

            <strong>
              Ładowanie najlepiej ocenianych profili…
            </strong>

            <p>
              Sprawdzamy oceny, opinie i profile, które
              wyróżniają się zaufaniem użytkowników.
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

  if (!topRatedUsers.length) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="showly-ranking"
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
              Showly Ranking
            </span>

            <h2>
              Najlepiej oceniani{" "}
              <span>eksperci w Showly.</span>
            </h2>
          </div>

          <div
            className={`${styles.headerSide} ${styles.reveal} ${styles.fromRight}`}
            style={{
              "--reveal-delay": "120ms",
            }}
          >
            <p>
              Poznaj profile, które zdobyły najwyższe oceny
              użytkowników i wyróżniają się jakością usług,
              aktywnością oraz zaufaniem budowanym przez
              realne opinie.
            </p>

            <div className={styles.stats}>
              <div className={styles.stat}>
                <strong>
                  TOP {topRatedUsers.length}
                </strong>

                <span>najlepszych profili</span>
              </div>

              <div className={styles.stat}>
                <strong>4★+</strong>

                <span>wysokie średnie ocen</span>
              </div>

              <div className={styles.stat}>
                <strong>03</strong>

                <span>ranking Showly</span>
              </div>
            </div>
          </div>
        </header>

        <section className={styles.showcase}>
          <span
            className={styles.watermark}
            aria-hidden="true"
          >
            NAJLEPIEJ OCENIANI
          </span>

          <div
            className={`${styles.showcaseHead} ${styles.reveal} ${styles.fromTop}`}
          >
            <div className={styles.showcaseIntro}>
              <span className={styles.showcaseIndex}>
                03
              </span>

              <div>
                <span className={styles.eyebrow}>
                  Najwyżej oceniane profile
                </span>

                <h3>
                  Przesuwaj ranking i porównuj najlepsze
                  wizytówki.
                </h3>
              </div>
            </div>

            <div className={styles.controls}>
              <button
                type="button"
                className={styles.controlButton}
                onClick={() => scrollByCard(-1)}
                disabled={!canLeft}
                aria-label="Przewiń ranking w lewo"
              >
                <FaChevronLeft aria-hidden="true" />
              </button>

              <button
                type="button"
                className={styles.controlButton}
                onClick={() => scrollByCard(1)}
                disabled={!canRight}
                aria-label="Przewiń ranking w prawo"
              >
                <FaChevronRight aria-hidden="true" />
              </button>
            </div>
          </div>

          <div
            className={`${styles.carousel} ${styles.reveal} ${styles.fromBottom}`}
            style={{
              "--reveal-delay": "100ms",
            }}
          >
            <div
              ref={scrollerRef}
              className={styles.list}
              role="list"
              aria-label="Lista najlepiej ocenianych profili Showly"
            >
              {topRatedUsers.map((user, index) => (
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
                      index * 70,
                      350
                    )}ms`,
                  }}
                >
                  <span className={styles.rankBadge}>
                    #{String(index + 1).padStart(2, "0")}
                  </span>

                  <UserCard
                    user={user}
                    currentUser={currentUser}
                    setAlert={setAlert}
                  />
                </div>
              ))}
            </div>

            <div className={styles.mobileHint}>
              <FaChevronLeft aria-hidden="true" />

              <span>
                Przesuń, aby zobaczyć więcej profili
              </span>

              <FaChevronRight aria-hidden="true" />
            </div>
          </div>
        </section>
      </div>
    </section>
  );
};

export default UserCardList;
