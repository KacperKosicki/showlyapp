import { useEffect, useRef, useState } from "react";
import styles from "./UserCardList.module.scss";
import UserCard from "../UserCard/UserCard";
import axios from "axios";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { auth } from "../../firebase";

const API = process.env.REACT_APP_API_URL;

async function getAuthHeader() {
  const u = auth.currentUser;
  if (!u) return {};
  const token = await u.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

const UserCardList = ({ currentUser, setAlert }) => {
  const [topRatedUsers, setTopRatedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const scrollerRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const { data: profiles } = await axios.get(`${API}/api/profiles`);

        let sorted = (Array.isArray(profiles) ? profiles : [])
          .sort((a, b) => {
            const ratingDiff = Number(b?.rating || 0) - Number(a?.rating || 0);
            if (ratingDiff !== 0) return ratingDiff;

            return Number(b?.reviews || 0) - Number(a?.reviews || 0);
          })
          .slice(0, 10);

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

          sorted = sorted.map((p) => ({
            ...p,
            isFavorite: favSet.has(p.userId),
          }));
        }

        setTopRatedUsers(sorted);
      } catch (err) {
        console.error("Błąd pobierania profili:", err);
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
  }, [topRatedUsers.length]);

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
        <p className={styles.loading}>Ładowanie najlepiej ocenianych profili...</p>
      </section>
    );
  }

  if (!topRatedUsers.length) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionBackground} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.head}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Showly Ranking</span>
            <span className={styles.labelDot} />
            <span className={styles.labelDesc}>Najwyżej oceniane profile</span>
            <span className={styles.labelLine} />
            <span className={styles.pill}>Opinie • Jakość • Zaufanie</span>
          </div>

          <h2 className={styles.heading}>
            Najlepiej oceniani <span className={styles.headingAccent}>eksperci</span> 🔥
          </h2>

          <p className={styles.description}>
            Poznaj profile, które zdobyły najwyższe oceny użytkowników i wyróżniają się
            jakością usług, aktywnością oraz zaufaniem budowanym przez realne opinie.
          </p>

          <div className={styles.metaRow}>
            <div className={styles.metaCard}>
              <strong>TOP {topRatedUsers.length}</strong>
              <span>najlepszych profili</span>
            </div>
            <div className={styles.metaCard}>
              <strong>4★+</strong>
              <span>wysokie średnie ocen</span>
            </div>
            <div className={styles.metaCard}>
              <strong>Showly</strong>
              <span>liderzy w swoich kategoriach</span>
            </div>
          </div>
        </div>

        <div className={styles.carousel}>
          <button
            type="button"
            className={`${styles.navBtn} ${styles.left} ${!canLeft ? styles.disabled : ""}`}
            onClick={() => scrollByCard(-1)}
            disabled={!canLeft}
            aria-label="Przewiń w lewo"
            title="Przewiń w lewo"
          >
            <FaChevronLeft />
          </button>

          <div
            className={`${styles.list} ${topRatedUsers.length <= 3 ? styles.centerCards : ""}`}
            ref={scrollerRef}
          >
            {topRatedUsers.map((user, index) => (
              <div className={styles.cardWrap} key={user._id || user.userId || index}>
                <UserCard
                  user={user}
                  currentUser={currentUser}
                  setAlert={setAlert}
                />
              </div>
            ))}
          </div>

          <div className={styles.mobileHint}>
            <span>←</span>
            <p>Przesuń, aby zobaczyć więcej profili</p>
            <span>→</span>
          </div>

          <button
            type="button"
            className={`${styles.navBtn} ${styles.right} ${!canRight ? styles.disabled : ""}`}
            onClick={() => scrollByCard(1)}
            disabled={!canRight}
            aria-label="Przewiń w prawo"
            title="Przewiń w prawo"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
    </section>
  );
};

export default UserCardList;