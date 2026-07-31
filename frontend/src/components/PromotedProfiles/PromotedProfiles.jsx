import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import axios from "axios";

import {
  FaAward,
  FaChevronLeft,
  FaChevronRight,
  FaRocket,
} from "react-icons/fa";

import { auth } from "../../firebase";
import UserCard from "../UserCard/UserCard";
import styles from "./PromotedProfiles.module.scss";

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

const planWeight = {
  premium: 2,
  standard: 1,
};

const softActiveStatuses = new Set([
  "active",
  "trialing",
  "past_due",
]);

const getPlanKey = (profile = {}) => {
  const billing =
    profile?.billingPublic || profile?.billing || {};

  const effectivePlan = String(
    billing?.effectivePlan || ""
  ).toLowerCase();

  if (
    effectivePlan === "standard" ||
    effectivePlan === "premium"
  ) {
    return effectivePlan;
  }

  const plan = String(billing?.plan || "").toLowerCase();
  const status = String(
    billing?.status || ""
  ).toLowerCase();

  if (
    (plan === "standard" || plan === "premium") &&
    softActiveStatuses.has(status)
  ) {
    return plan;
  }

  return "";
};

const sortPromotedProfiles = (profiles = []) =>
  [...profiles].sort((a, b) => {
    const planDifference =
      (planWeight[getPlanKey(b)] || 0) -
      (planWeight[getPlanKey(a)] || 0);

    if (planDifference !== 0) {
      return planDifference;
    }

    const ratingDifference =
      Number(b?.rating || 0) - Number(a?.rating || 0);

    if (ratingDifference !== 0) {
      return ratingDifference;
    }

    const reviewsDifference =
      Number(b?.reviews || 0) -
      Number(a?.reviews || 0);

    if (reviewsDifference !== 0) {
      return reviewsDifference;
    }

    return (
      Number(b?.visits || 0) -
      Number(a?.visits || 0)
    );
  });

const PromotedProfiles = ({ currentUser, setAlert }) => {
  const sectionRef = useRef(null);
  const scrollerRef = useRef(null);
  const rafRef = useRef(null);

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchPromotedProfiles = async () => {
      try {
        setLoading(true);

        const { data } = await axios.get(
          `${API}/api/profiles`
        );

        const safeProfiles = Array.isArray(data)
          ? data
          : [];

        let promotedProfiles = safeProfiles.filter(
          (profile) =>
            ["standard", "premium"].includes(
              getPlanKey(profile)
            )
        );

        promotedProfiles = sortPromotedProfiles(
          promotedProfiles
        );

        if (currentUser?.uid && auth.currentUser) {
          const authHeader = await getAuthHeader();

          const { data: favoriteProfiles } =
            await axios.get(`${API}/api/favorites/my`, {
              headers: {
                ...authHeader,
              },
            });

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

          promotedProfiles = promotedProfiles.map(
            (profile) => ({
              ...profile,
              isFavorite: favoriteIds.has(
                profile.userId
              ),
            })
          );
        }

        if (isMounted) {
          setProfiles(promotedProfiles);
        }
      } catch (error) {
        console.error(
          "Błąd pobierania promowanych profili:",
          error
        );

        if (isMounted) {
          setProfiles([]);
        }

        if (typeof setAlert === "function") {
          setAlert({
            type: "error",
            message:
              "Nie udało się pobrać promowanych profili.",
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPromotedProfiles();

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

    if (!animatedElements.length) {
      return undefined;
    }

    const revealElement = (element) => {
      element.classList.add(styles.revealVisible);
    };

    if (typeof IntersectionObserver === "undefined") {
      animatedElements.forEach(revealElement);

      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            revealElement(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    animatedElements.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [loading, profiles.length]);

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
  }, [profiles.length, updateArrows]);

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
  }, [profiles.length, updateArrows]);

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
        <div className={styles.decor} aria-hidden="true">
          <span className={styles.orbOne} />
          <span className={styles.orbTwo} />
          <span className={styles.waveOne} />
        </div>

        <div className={styles.inner}>
          <div className={styles.loadingBlock}>
            <span className={styles.eyebrow}>
              Showly Boost
            </span>

            <strong>
              Ładowanie promowanych profili…
            </strong>

            <p>
              Sprawdzamy profile z aktywnym planem
              Standard lub Premium.
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

  if (!profiles.length) {
    return null;
  }

  const premiumCount = profiles.filter(
    (profile) => getPlanKey(profile) === "premium"
  ).length;

  const standardCount = profiles.filter(
    (profile) => getPlanKey(profile) === "standard"
  ).length;

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="promoted-profiles"
    >
      <div className={styles.decor} aria-hidden="true">
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
              Showly Boost
            </span>

            <h2>
              Profile z{" "}
              <span>lepszą widocznością.</span>
            </h2>
          </div>

          <div
            className={`${styles.headerSide} ${styles.reveal} ${styles.fromRight}`}
            style={{
              "--reveal-delay": "120ms",
            }}
          >
            <p>
              Wyróżnione wizytówki osób, które aktywnie
              rozwijają swój profil w Showly. Plany
              Standard i Premium pomagają ich ofercie
              dotrzeć wyżej i szybciej.
            </p>

            <div className={styles.planNote}>
              <FaRocket aria-hidden="true" />

              <span>
                Większa ekspozycja dla aktywnych profili
              </span>
            </div>
          </div>
        </header>

        <div
          className={`${styles.statsStrip} ${styles.reveal} ${styles.fromBottom}`}
          style={{
            "--reveal-delay": "90ms",
          }}
        >
          <div className={styles.statItem}>
            <strong>
              {String(profiles.length).padStart(2, "0")}
            </strong>
            <span>promowanych profili</span>
          </div>

          <div className={styles.statItem}>
            <strong>
              {String(premiumCount).padStart(2, "0")}
            </strong>
            <span>profili Premium</span>
          </div>

          <div className={styles.statItem}>
            <strong>
              {String(standardCount).padStart(2, "0")}
            </strong>
            <span>profili Standard</span>
          </div>
        </div>

        <section className={styles.showcase}>
          <span
            className={styles.showcaseWatermark}
            aria-hidden="true"
          >
            SHOWLY BOOST
          </span>

          <div
            className={`${styles.showcaseHead} ${styles.reveal} ${styles.fromTop}`}
          >
            <div className={styles.showcaseIntro}>
              <span className={styles.showcaseIndex}>
                02
              </span>

              <div>
                <span className={styles.eyebrow}>
                  Promowane profile
                </span>

                <h3>
                  Przesuwaj listę i sprawdzaj wyróżnione
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
                aria-label="Przewiń promowane profile w lewo"
              >
                <FaChevronLeft aria-hidden="true" />
              </button>

              <button
                type="button"
                className={styles.controlButton}
                onClick={() => scrollByCard(1)}
                disabled={!canRight}
                aria-label="Przewiń promowane profile w prawo"
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
              className={styles.track}
              role="list"
              aria-label="Lista promowanych profili Showly"
            >
              {profiles.map((profile, index) => {
                const planKey = getPlanKey(profile);
                const planLabel =
                  planKey === "premium"
                    ? "Premium"
                    : "Standard";

                return (
                  <div
                    className={styles.cardWrap}
                    key={
                      profile._id ||
                      profile.userId ||
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
                    <span
                      className={`${styles.planBadge} ${planKey ? styles[planKey] : ""
                        }`}
                    >
                      <FaAward aria-hidden="true" />
                      {planLabel}
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

            <div className={styles.mobileHint}>
              <FaChevronLeft aria-hidden="true" />
              <span>
                Przesuń, aby zobaczyć więcej
              </span>
              <FaChevronRight aria-hidden="true" />
            </div>
          </div>
        </section>
      </div>
    </section>
  );
};

export default PromotedProfiles;
