import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import styles from "./PartnersShowcase.module.scss";
import UserCard from "../UserCard/UserCard";
import { auth } from "../../firebase";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const API = process.env.REACT_APP_API_URL;

async function getAuthHeader() {
  const u = auth.currentUser;
  if (!u) return {};

  const token = await u.getIdToken();
  return { Authorization: `Bearer ${token}` };
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
  const [partners, setPartners] = useState([]);
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

        const { data: profiles } = await axios.get(`${API}/api/profiles`);
        const safeProfiles = Array.isArray(profiles) ? profiles : [];

        let onlyPartners = safeProfiles.filter(
          (p) => p?.partnership?.isPartner === true
        );

        onlyPartners = onlyPartners.sort((a, b) => {
          const priorityDiff =
            Number(b?.partnership?.priority || 0) -
            Number(a?.partnership?.priority || 0);

          if (priorityDiff !== 0) return priorityDiff;

          const tierDiff =
            (tierWeight[b?.partnership?.tier] || 0) -
            (tierWeight[a?.partnership?.tier] || 0);

          if (tierDiff !== 0) return tierDiff;

          const ratingDiff = Number(b?.rating || 0) - Number(a?.rating || 0);

          if (ratingDiff !== 0) return ratingDiff;

          return Number(b?.reviews || 0) - Number(a?.reviews || 0);
        });

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

          onlyPartners = onlyPartners.map((p) => ({
            ...p,
            isFavorite: favSet.has(p.userId),
          }));
        }

        if (isMounted) {
          setPartners(onlyPartners);
        }
      } catch (err) {
        console.error("Błąd pobierania partnerów:", err);

        if (isMounted) {
          setPartners([]);
        }

        if (typeof setAlert === "function") {
          setAlert({
            type: "error",
            message: "Nie udało się pobrać partnerów Showly.",
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
  }, [partners.length, updateArrows]);

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
  }, [partners.length, updateArrows]);

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
            <span>Showly Premium</span>
            <strong>Ładowanie partnerów...</strong>
            <p>
              Sprawdzamy wyróżnione profile, aktywność i kolejność prezentacji.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!partners.length) return null;

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.layout}>
          <aside className={styles.side}>
            <span className={styles.overline}>Showly Premium</span>

            <h2 className={styles.heading}>
              Partnerzy <span>premium</span> Showly.
            </h2>

            <p className={styles.description}>
              Poznaj profile, które aktywnie rozwijają swoją markę w Showly,
              dbają o jakość prezentacji i budują większe zaufanie dzięki
              widoczności, aktywności oraz profesjonalnemu wizerunkowi.
            </p>

            <div className={styles.metaRow}>
              <div className={styles.metaCard}>
                <strong>{partners.length}+</strong>
                <span>wyróżnionych profili</span>
              </div>

              <div className={styles.metaCard}>
                <strong>Top</strong>
                <span>najbardziej aktywni partnerzy</span>
              </div>

              <div className={styles.metaCard}>
                <strong>01</strong>
                <span>sekcja premium</span>
              </div>
            </div>

            <div className={styles.infoBox}>
              <span>Zaufanie • Jakość • Widoczność</span>
              <p>
                Profile partnerów są wyświetlane wyżej, mają większą ekspozycję
                i lepiej wyróżniają się w katalogu Showly.
              </p>
            </div>
          </aside>

          <div className={styles.content}>
            <div className={styles.chapterHead}>
              <div>
                <span className={styles.chapterLabel}>
                  Wyróżnione profile
                </span>

                <h3>Przesuwaj listę i poznaj partnerów Showly.</h3>
              </div>

              <span className={styles.chapterNumber}>01</span>
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
                aria-label="Lista partnerów Showly"
              >
                {partners.map((partner, index) => (
                  <div
                    className={styles.cardWrap}
                    key={partner._id || partner.userId || index}
                    role="listitem"
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
                <span>←</span>
                <p>Przesuń, aby zobaczyć więcej partnerów</p>
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

export default PartnersShowcase;