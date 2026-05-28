import { useEffect, useRef, useState } from "react";
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

  if ((plan === "standard" || plan === "premium") && softActiveStatuses.has(status)) {
    return plan;
  }

  return "";
};

const sortPromotedProfiles = (profiles = []) =>
  [...profiles].sort((a, b) => {
    const planDiff = (planWeight[getPlanKey(b)] || 0) - (planWeight[getPlanKey(a)] || 0);
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
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await axios.get(`${API}/api/profiles`);

        let promoted = (Array.isArray(data) ? data : [])
          .filter((profile) => ["standard", "premium"].includes(getPlanKey(profile)));

        promoted = sortPromotedProfiles(promoted);

        if (currentUser?.uid && auth.currentUser) {
          const authHeader = await getAuthHeader();

          const { data: favProfiles } = await axios.get(`${API}/api/favorites/my`, {
            headers: { ...authHeader },
          });

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

        setProfiles(promoted);
      } catch (err) {
        console.error("Blad pobierania promowanych profili:", err);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [currentUser?.uid]);

  const updateArrows = () => {
    const el = scrollerRef.current;
    if (!el) return;

    const max = el.scrollWidth - el.clientWidth;
    const x = el.scrollLeft;

    setCanLeft(x > 2);
    setCanRight(x < max - 2);
  };

  useEffect(() => {
    updateArrows();

    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => updateArrows();
    el.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => updateArrows());
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [profiles.length]);

  const scrollByCard = (dir = 1) => {
    const el = scrollerRef.current;
    if (!el) return;

    const first = el.querySelector(":scope > *");
    const cardW = first?.getBoundingClientRect().width || 400;
    const gap =
      parseFloat(getComputedStyle(el).columnGap || getComputedStyle(el).gap) || 24;

    const step = (cardW + gap) * 1.02;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  if (loading) {
    return (
      <section className={styles.section}>
        <p className={styles.loading}>{"\u0141adowanie promowanych profili..."}</p>
      </section>
    );
  }

  if (!profiles.length) return null;

  const premiumCount = profiles.filter((profile) => getPlanKey(profile) === "premium").length;
  const standardCount = profiles.filter((profile) => getPlanKey(profile) === "standard").length;

  return (
    <section className={styles.section}>
      <div className={styles.sectionBackground} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.head}>
          <div className={styles.labelRow}>
            <span className={styles.label}>
              <FaRocket />
              Showly Boost
            </span>
            <span className={styles.labelDot} />
            <span className={styles.labelDesc}>Standard i Premium</span>
            <span className={styles.labelLine} />
            <span className={styles.pill}>Promowane profile</span>
          </div>

          <h2 className={styles.heading}>
            {"Profile z "}
            <span className={styles.headingAccent}>{"lepsz\u0105 widoczno\u015bci\u0105"}</span>
          </h2>

          <p className={styles.description}>
            {"Wyr\u00f3\u017cnione wizyt\u00f3wki os\u00f3b, kt\u00f3re aktywnie rozwijaj\u0105 sw\u00f3j profil w Showly. Pokazujemy je wy\u017cej, bo korzystaj\u0105 z plan\u00f3w Standard lub Premium."}
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
        </div>

        <div className={styles.carousel}>
          <button
            type="button"
            className={`${styles.navBtn} ${styles.left} ${!canLeft ? styles.disabled : ""}`}
            onClick={() => scrollByCard(-1)}
            disabled={!canLeft}
            aria-label={"Przewi\u0144 w lewo"}
            title={"Przewi\u0144 w lewo"}
          >
            <FaChevronLeft />
          </button>

          <div
            className={`${styles.grid} ${profiles.length <= 3 ? styles.centerCards : ""}`}
            ref={scrollerRef}
          >
            {profiles.map((profile, index) => (
              <div className={styles.cardWrap} key={profile._id || profile.userId || index}>
                <span className={`${styles.planBadge} ${styles[getPlanKey(profile)]}`}>
                  <FaAward />
                  {getPlanKey(profile) === "premium" ? "Premium" : "Standard"}
                </span>

                <UserCard
                  user={profile}
                  currentUser={currentUser}
                  setAlert={setAlert}
                />
              </div>
            ))}
          </div>

          <div className={styles.mobileHint}>
            <span>{"\u2190"}</span>
            <p>{"Przesu\u0144, aby zobaczy\u0107 wi\u0119cej profili"}</p>
            <span>{"\u2192"}</span>
          </div>

          <button
            type="button"
            className={`${styles.navBtn} ${styles.right} ${!canRight ? styles.disabled : ""}`}
            onClick={() => scrollByCard(1)}
            disabled={!canRight}
            aria-label={"Przewi\u0144 w prawo"}
            title={"Przewi\u0144 w prawo"}
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
    </section>
  );
};

export default PromotedProfiles;
