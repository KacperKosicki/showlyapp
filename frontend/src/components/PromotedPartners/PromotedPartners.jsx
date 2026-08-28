import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiArrowLeft,
  FiArrowRight,
  FiAward,
  FiShield,
  FiZap,
} from "react-icons/fi";

import axios from "axios";

import { auth } from "../../firebase";
import UserCard from "../UserCard/UserCard";

import styles from "./PromotedPartners.module.scss";

const API = process.env.REACT_APP_API_URL;

const planWeight = {
  premium: 40,
  standard: 20,
};

const partnerTierWeight = {
  owner: 60,
  "founding-partner": 50,
  ambassador: 40,
  verified: 30,
  partner: 20,
  none: 0,
};

const softActiveStatuses = new Set([
  "active",
  "trialing",
  "past_due",
]);

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

const getPlanKey = (profile = {}) => {
  const billing = profile?.billingPublic || profile?.billing || {};
  const effectivePlan = String(
    billing?.effectivePlan || ""
  ).toLowerCase();

  if (effectivePlan === "standard" || effectivePlan === "premium") {
    return effectivePlan;
  }

  const plan = String(billing?.plan || "").toLowerCase();
  const status = String(billing?.status || "").toLowerCase();

  if (
    (plan === "standard" || plan === "premium") &&
    softActiveStatuses.has(status)
  ) {
    return plan;
  }

  return "";
};

const getPartnerTier = (profile = {}) => {
  if (profile?.partnership?.isPartner !== true) {
    return "";
  }

  return String(profile?.partnership?.tier || "partner").toLowerCase();
};

const getPromotionScore = (profile = {}) =>
  (planWeight[getPlanKey(profile)] || 0) +
  (partnerTierWeight[getPartnerTier(profile)] || 0);

const isPromotedOrPartner = (profile = {}) =>
  Boolean(getPlanKey(profile) || getPartnerTier(profile));

const selectProfiles = (profiles = []) => {
  const uniqueProfiles = new Map();

  profiles.forEach((profile, index) => {
    if (!isPromotedOrPartner(profile)) {
      return;
    }

    const key =
      profile?.userId ||
      profile?.profileUserId ||
      profile?._id ||
      profile?.slug ||
      `profile-${index}`;

    uniqueProfiles.set(String(key), profile);
  });

  return [...uniqueProfiles.values()].sort((a, b) => {
    const priorityDifference =
      Number(b?.partnership?.priority || 0) -
      Number(a?.partnership?.priority || 0);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    const promotionDifference =
      getPromotionScore(b) - getPromotionScore(a);

    if (promotionDifference !== 0) {
      return promotionDifference;
    }

    const ratingDifference =
      Number(b?.rating || 0) - Number(a?.rating || 0);

    if (ratingDifference !== 0) {
      return ratingDifference;
    }

    const reviewsDifference =
      Number(b?.reviews || 0) - Number(a?.reviews || 0);

    if (reviewsDifference !== 0) {
      return reviewsDifference;
    }

    return Number(b?.visits || 0) - Number(a?.visits || 0);
  });
};

const getPromotionReason = (profile = {}) => {
  const plan = getPlanKey(profile);
  const isPartner = Boolean(getPartnerTier(profile));

  if (plan && isPartner) {
    return {
      label: `${plan === "premium" ? "Premium" : "Standard"} + Partner`,
      className: "combinedReason",
      icon: FiAward,
    };
  }

  if (plan === "premium") {
    return {
      label: "Plan Premium",
      className: "premiumReason",
      icon: FiZap,
    };
  }

  if (plan === "standard") {
    return {
      label: "Plan Standard",
      className: "standardReason",
      icon: FiZap,
    };
  }

  return {
    label: "Partner Showly",
    className: "partnerReason",
    icon: FiShield,
  };
};

const getProfilesLabel = (count) => {
  if (count === 1) {
    return "wyróżniony profil";
  }

  if (count % 10 >= 2 && count % 10 <= 4 && !(count % 100 >= 12 && count % 100 <= 14)) {
    return "wyróżnione profile";
  }

  return "wyróżnionych profili";
};

const PromotedPartners = ({ currentUser, setAlert }) => {
  const sectionRef = useRef(null);
  const scrollerRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [profiles, setProfiles] = useState([]);
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
        let selectedProfiles = selectProfiles(safeProfiles);

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
                (profile) => profile?.userId || profile?.profileUserId
              )
              .filter(Boolean)
          );

          selectedProfiles = selectedProfiles.map((profile) => ({
            ...profile,
            isFavorite: favoriteIds.has(profile.userId),
          }));
        }

        if (isMounted) {
          setProfiles(selectedProfiles);
        }
      } catch (error) {
        console.error("Błąd pobierania wyróżnionych profili:", error);

        if (isMounted) {
          setProfiles([]);
        }

        if (typeof setAlert === "function") {
          setAlert({
            type: "error",
            message: "Nie udało się pobrać wyróżnionych profili.",
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
      parseFloat(scrollerStyles.columnGap || scrollerStyles.gap || "0") ||
      18;
    const maxScroll = Math.max(
      0,
      scroller.scrollWidth - scroller.clientWidth
    );
    const target = Math.min(
      Math.max(scroller.scrollLeft + direction * (cardWidth + gap), 0),
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
        <div className={styles.frame} aria-live="polite">
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

  if (!profiles.length) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="promoted-partners"
      aria-labelledby="promoted-partners-title"
    >
      <div className={styles.frame}>
        <div
          className={`${styles.intro} ${styles.reveal} ${styles.fromLeft}`}
        >
          <span className={styles.introCircle} aria-hidden="true" />

          <div className={styles.introTop}>
            <span className={styles.kicker}>
              <span aria-hidden="true" />
              Showly / Wyróżnione
            </span>

            <h2 id="promoted-partners-title">
              Jedna lista. Profile warte uwagi.
            </h2>

            <p className={styles.introCopy}>
              Łączymy aktywne plany Standard i Premium ze statusami
              partnerskimi Showly. Bez powtarzania tych samych profili
              w osobnych sekcjach.
            </p>
          </div>

          <div className={styles.introBottom}>
            <div className={styles.legend}>
              <div>
                <span className={styles.legendIcon}>
                  <FiZap aria-hidden="true" />
                </span>

                <p>
                  <strong>Plan profilu</strong>
                  <span>Standard albo Premium</span>
                </p>
              </div>

              <div>
                <span className={styles.legendIcon}>
                  <FiShield aria-hidden="true" />
                </span>

                <p>
                  <strong>Status Showly</strong>
                  <span>Partner, zweryfikowany, ambasador lub founder</span>
                </p>
              </div>
            </div>

            <div className={styles.profileTotal}>
              <strong>{String(profiles.length).padStart(2, "0")}</strong>
              <span>{getProfilesLabel(profiles.length)}</span>
            </div>
          </div>
        </div>

        <div
          className={`${styles.gallery} ${styles.reveal} ${styles.fromRight}`}
          style={{ "--reveal-delay": "90ms" }}
        >
          <header className={styles.galleryHeader}>
            <div className={styles.galleryHeading}>
              <span className={styles.galleryLabel}>
                Promowane i partnerskie
              </span>
              <h3>Sprawdź, kto wyróżnia się w Showly.</h3>
              <p>
                Powód wyróżnienia widzisz przy każdej wizytówce.
                Szczegóły oferty pozostają bezpośrednio na karcie profilu.
              </p>
            </div>

            <div
              className={styles.controls}
              role="group"
              aria-label="Nawigacja wyróżnionych profili"
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
              aria-label="Promowane i partnerskie profile Showly"
            >
              {profiles.map((profile, index) => {
                const reason = getPromotionReason(profile);
                const ReasonIcon = reason.icon;

                return (
                  <article
                    className={styles.cardWrap}
                    key={profile._id || profile.userId || index}
                    role="listitem"
                    style={{
                      "--card-delay": `${Math.min(index * 65, 325)}ms`,
                    }}
                  >
                    <span
                      className={`${styles.reasonBadge} ${styles[reason.className]}`}
                    >
                      <ReasonIcon aria-hidden="true" />
                      {reason.label}
                    </span>

                    <UserCard
                      user={profile}
                      currentUser={currentUser}
                      setAlert={setAlert}
                    />
                  </article>
                );
              })}
            </div>

            <div className={styles.mobileHint} aria-hidden="true">
              <FiArrowLeft />
              <span>Przesuń karty</span>
              <FiArrowRight />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromotedPartners;
