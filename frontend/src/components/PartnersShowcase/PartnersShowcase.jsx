import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import axios from "axios";

import styles from "./PartnersShowcase.module.scss";

import UserCard from "../UserCard/UserCard";

import { auth } from "../../firebase";

import {
  FiArrowLeft,
  FiArrowRight,
} from "react-icons/fi";

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

const tierWeight = {
  owner: 6,
  "founding-partner": 5,
  ambassador: 4,
  verified: 3,
  partner: 2,
  none: 0,
};

const PartnersShowcase = ({ currentUser, setAlert }) => {
  const sectionRef = useRef(null);
  const scrollerRef = useRef(null);
  const rafRef = useRef(null);

  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchPartners = async () => {
      try {
        setLoading(true);

        const { data: profiles } = await axios.get(
          `${API}/api/profiles`
        );

        const safeProfiles = Array.isArray(profiles)
          ? profiles
          : [];

        let onlyPartners = safeProfiles.filter(
          (profile) =>
            profile?.partnership?.isPartner === true
        );

        onlyPartners = onlyPartners.sort((a, b) => {
          const priorityDifference =
            Number(b?.partnership?.priority || 0) -
            Number(a?.partnership?.priority || 0);

          if (priorityDifference !== 0) {
            return priorityDifference;
          }

          const tierDifference =
            (tierWeight[b?.partnership?.tier] || 0) -
            (tierWeight[a?.partnership?.tier] || 0);

          if (tierDifference !== 0) {
            return tierDifference;
          }

          const ratingDifference =
            Number(b?.rating || 0) -
            Number(a?.rating || 0);

          if (ratingDifference !== 0) {
            return ratingDifference;
          }

          return (
            Number(b?.reviews || 0) -
            Number(a?.reviews || 0)
          );
        });

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

          onlyPartners = onlyPartners.map((profile) => ({
            ...profile,
            isFavorite: favoriteIds.has(profile.userId),
          }));
        }

        if (isMounted) {
          setPartners(onlyPartners);
        }
      } catch (error) {
        console.error(
          "Błąd pobierania partnerów:",
          error
        );

        if (isMounted) {
          setPartners([]);
        }

        if (typeof setAlert === "function") {
          setAlert({
            type: "error",
            message:
              "Nie udało się pobrać partnerów Showly.",
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPartners();

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
  }, [loading, partners.length]);

  const updateCarouselState = useCallback(() => {
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

    updateCarouselState();

    const handleScroll = () => {
      updateCarouselState();
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
  }, [partners.length, updateCarouselState]);

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

      updateCarouselState();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [partners.length, updateCarouselState]);

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

    window.setTimeout(updateCarouselState, 350);
  };

  if (loading) {
    return (
      <section
        ref={sectionRef}
        className={styles.section}
      >
        <div className={styles.decor} aria-hidden="true">
          <span className={styles.orbOne} />
          <span className={styles.orbTwo} />
        </div>

        <div className={styles.inner}>
          <div className={styles.loading}>
            <span className={styles.eyebrow}>
              Partnerzy Showly
            </span>

            <strong>Ładowanie wyróżnionych profili…</strong>

            <p>
              Sprawdzamy aktywność, poziom partnerstwa
              i kolejność prezentacji.
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

  if (!partners.length) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="partners-showcase"
    >
      <div className={styles.decor} aria-hidden="true">
        <span className={styles.orbOne} />
        <span className={styles.orbTwo} />
        <span className={styles.lineOne} />
        <span className={styles.lineTwo} />
      </div>

      <div className={styles.inner}>
        <header className={styles.header}>
          <div
            className={`${styles.headingBlock} ${styles.reveal} ${styles.fromLeft}`}
          >
            <span className={styles.eyebrow}>
              Partnerzy premium
            </span>

            <h2>
              Profile, które aktywnie budują{" "}
              <span>swoją markę w Showly.</span>
            </h2>
          </div>

          <div
            className={`${styles.headerSide} ${styles.reveal} ${styles.fromRight}`}
            style={{
              "--reveal-delay": "120ms",
            }}
          >
            <p>
              Poznaj usługodawców i twórców, którzy dbają
              o jakość prezentacji, aktywność i profesjonalny
              wizerunek swojej działalności.
            </p>

            <div className={styles.partnerCount}>
              <strong>
                {String(partners.length).padStart(2, "0")}
              </strong>

              <div>
                <span>wyróżnionych profili</span>
                <small>
                  prezentowanych według aktywności i poziomu
                  partnerstwa
                </small>
              </div>
            </div>
          </div>
        </header>

        <section className={styles.showcase}>
          <span className={styles.showcaseWatermark} aria-hidden="true">
            PARTNERZY SHOWLY
          </span>

          <div
            className={`${styles.showcaseHead} ${styles.reveal} ${styles.fromTop}`}
          >
            <div className={styles.showcaseIntro}>
              <span className={styles.showcaseIndex}>
                01
              </span>

              <div>
                <span className={styles.eyebrow}>
                  Wyróżnione profile
                </span>

                <h3>
                  Przesuwaj wystawę i poznaj partnerów
                  Showly.
                </h3>
              </div>
            </div>

            <div className={styles.controls}>
              <button
                type="button"
                className={styles.controlButton}
                onClick={() => scrollByCard(-1)}
                disabled={!canLeft}
                aria-label="Przewiń partnerów w lewo"
              >
                <FiArrowLeft aria-hidden="true" />
              </button>

              <button
                type="button"
                className={styles.controlButton}
                onClick={() => scrollByCard(1)}
                disabled={!canRight}
                aria-label="Przewiń partnerów w prawo"
              >
                <FiArrowRight aria-hidden="true" />
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
              className={styles.track}
              role="list"
              aria-label="Lista partnerów Showly"
            >
              {partners.map((partner, index) => (
                <div
                  className={styles.cardWrap}
                  key={
                    partner._id ||
                    partner.userId ||
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
                  <UserCard
                    user={partner}
                    currentUser={currentUser}
                    setAlert={setAlert}
                  />
                </div>
              ))}
            </div>

            <div className={styles.mobileHint}>
              <FiArrowLeft aria-hidden="true" />
              <span>Przesuń, aby zobaczyć więcej</span>
              <FiArrowRight aria-hidden="true" />
            </div>
          </div>
        </section>
      </div>
    </section>
  );
};

export default PartnersShowcase;