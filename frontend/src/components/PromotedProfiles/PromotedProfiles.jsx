import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { FaAward, FaChevronLeft, FaChevronRight, FaRocket } from "react-icons/fa";
import { auth } from "../../firebase";
import UserCard from "../UserCard/UserCard";
import styles from "./PromotedProfiles.module.scss";

const API = process.env.REACT_APP_API_URL;

async function getAuthHeader() {
  const u = auth.currentUser;
  if (!u) return {};

  const token = await u.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

const planWeight = {
  premium: 2,
  standard: 1,
};

const softActiveStatuses = new Set(["active", "trialing", "past_due"]);

const getPlanKey = (profile = {}) => {
  const billing = profile?.billingPublic || profile?.billing || {};
  const effectivePlan = String(billing?.effectivePlan || "").toLowerCase();

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

const sortPromotedProfiles = (profiles = []) =>
  [...profiles].sort((a, b) => {
    const planDiff =
      (planWeight[getPlanKey(b)] || 0) - (planWeight[getPlanKey(a)] || 0);

    if (planDiff !== 0) return planDiff;

    const ratingDiff = Number(b?.rating || 0) - Number(a?.rating || 0);

    if (ratingDiff !== 0) return ratingDiff;

    const reviewsDiff = Number(b?.reviews || 0) - Number(a?.reviews || 0);

    if (reviewsDiff !== 0) return reviewsDiff;

    return Number(b?.visits || 0) - Number(a?.visits || 0);
  });

const PromotedProfiles = ({ currentUser, setAlert }) => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const scrollerRef = useRef(null);
  const rafRef = useRef(null);

  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        setLoading(true);

        const { data } = await axios.get(`${API}/api/profiles`);
        const safeProfiles = Array.isArray(data) ? data : [];

        let promoted = safeProfiles.filter((profile) =>
          ["standard", "premium"].includes(getPlanKey(profile))
        );

        promoted = sortPromotedProfiles(promoted);

        if (currentUser?.uid && auth.currentUser) {
          const authHeader = await getAuthHeader();

          const { data: favProfiles } = await axios.get(
            `${API}/api/favorites/my`,
            {
              headers: { ...authHeader },
            }
          );

          const favSet = new Set(
            (Array.isArray(favProfiles) ? favProfiles : [])
              .map((p) => p?.userId || p?.profileUserId)
              .filter(Boolean)
          );

          promoted = promoted.map((profile) => ({
            ...profile,
            isFavorite: favSet.has(profile.userId),
          }));
        }

        if (isMounted) {
          setProfiles(promoted);
        }
      } catch (err) {
        console.error("Błąd pobierania promowanych profili:", err);

        if (isMounted) {
          setProfiles([]);
        }

        if (typeof setAlert === "function") {
          setAlert({
            type: "error",
            message: "Nie udało się pobrać promowanych profili.",
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
  }, [profiles.length, updateArrows]);

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
  }, [profiles.length, updateArrows]);

  const scrollByCard = (dir = 1) => {
    const el = scrollerRef.current;
    if (!el) return;

    const firstCard = el.querySelector(`.${styles.cardWrap}`);
    const cardW = firstCard?.getBoundingClientRect().width || 420;

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

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.loadingCard}>
            <span>Showly Boost</span>
            <strong>Ładowanie promowanych profili...</strong>
            <p>
              Sprawdzamy profile z aktywnym planem Standard lub Premium.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!profiles.length) return null;

  const premiumCount = profiles.filter(
    (profile) => getPlanKey(profile) === "premium"
  ).length;

  const standardCount = profiles.filter(
    (profile) => getPlanKey(profile) === "standard"
  ).length;

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.layout}>
          <aside className={styles.side}>
            <span className={styles.overline}>Showly Boost</span>

            <h2 className={styles.heading}>
              Profile z <span>lepszą widocznością.</span>
            </h2>

            <p className={styles.description}>
              Wyróżnione wizytówki osób, które aktywnie rozwijają swój profil w
              Showly. Pokazujemy je wyżej, bo korzystają z planów Standard lub
              Premium i dbają o lepszą prezentację swojej oferty.
            </p>

            <div className={styles.metaRow}>
              <div className={styles.metaCard}>
                <strong>{profiles.length}</strong>
                <span>promowanych profili</span>
              </div>

              <div className={styles.metaCard}>
                <strong>{premiumCount}</strong>
                <span>profili Premium</span>
              </div>

              <div className={styles.metaCard}>
                <strong>{standardCount}</strong>
                <span>profili Standard</span>
              </div>
            </div>

            <div className={styles.infoBox}>
              <span>
                <FaRocket /> Standard i Premium
              </span>

              <p>
                Promowane profile mają większą ekspozycję w Showly i pomagają
                szybciej dotrzeć do osób szukających usługodawcy, twórcy albo
                specjalisty.
              </p>
            </div>
          </aside>

          <div className={styles.content}>
            <div className={styles.chapterHead}>
              <div>
                <span className={styles.chapterLabel}>
                  Promowane profile
                </span>

                <h3>Przesuwaj listę i sprawdzaj wyróżnione wizytówki.</h3>
              </div>

              <span className={styles.chapterNumber}>02</span>
            </div>

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
                aria-label="Lista promowanych profili Showly"
              >
                {profiles.map((profile, index) => {
                  const planKey = getPlanKey(profile);
                  const planLabel = planKey === "premium" ? "Premium" : "Standard";

                  return (
                    <div
                      className={styles.cardWrap}
                      key={profile._id || profile.userId || index}
                      role="listitem"
                    >
                      <span
                        className={`${styles.planBadge} ${planKey ? styles[planKey] : ""
                          }`}
                      >
                        <FaAward />
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
                <span>←</span>
                <p>Przesuń, aby zobaczyć więcej promowanych profili</p>
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
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromotedProfiles;