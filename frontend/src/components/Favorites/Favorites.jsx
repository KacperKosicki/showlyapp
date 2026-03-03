import { useEffect, useState, useMemo } from "react";
import styles from "./Favorites.module.scss";
import UserCard from "../UserCard/UserCard";
import { FiHeart } from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";
import { api } from "../../api/api"; // <-- dopasuj ścieżkę, jeśli masz inną

export default function Favorites({ currentUser }) {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [error, setError] = useState("");
  const location = useLocation();

  useEffect(() => {
    let alive = true;

    const run = async () => {
      setLoading(true);
      setError("");

      try {
        // ✅ token idzie z interceptora (Authorization)
        // opcjonalnie możesz zostawić uid w headerze, jeśli backend nadal tego wymaga:
        // { headers: { uid: currentUser?.uid } }

        const { data } = await api.get("/api/favorites/my");

        if (!alive) return;
        setProfiles(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        setError("Nie udało się pobrać listy ulubionych.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    if (currentUser?.uid) run();
    else {
      // jak user nie zalogowany — nie ładujemy
      setProfiles([]);
      setError("");
      setLoading(false);
    }

    return () => {
      alive = false;
    };
  }, [currentUser?.uid]);

  useEffect(() => {
    const scrollTo = location.state?.scrollToId;
    if (!scrollTo || loading) return;

    const el = document.getElementById(scrollTo);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.state, location.pathname, loading]);

  const count = useMemo(() => profiles.length, [profiles]);

  if (!currentUser?.uid) {
    return (
      <section id="scrollToId" className={styles.section}>
        <div className={styles.wrapper}>
          <div className={styles.headerRow}>
            <div>
              <h2 className={styles.sectionTitle}>Twoje ulubione</h2>
              <p className={styles.subTitle}>
                Zaloguj się, aby zobaczyć i zarządzać zapisanymi profilami.
              </p>
            </div>
          </div>
          <p className={styles.info}>Zaloguj się, aby zobaczyć ulubione.</p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section id="scrollToId" className={styles.section}>
        <div className={styles.wrapper}>
          <div className={styles.headerRow}>
            <div>
              <h2 className={styles.sectionTitle}>Twoje ulubione</h2>
              <p className={styles.subTitle}>
                Zapisane wizytówki specjalistów, do których chcesz szybko wracać.
              </p>
            </div>
            <span className={styles.badge}>—</span>
          </div>
          <p className={styles.info}>Ładowanie…</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="scrollToId" className={styles.section}>
        <div className={styles.wrapper}>
          <div className={styles.headerRow}>
            <div>
              <h2 className={styles.sectionTitle}>Twoje ulubione</h2>
              <p className={styles.subTitle}>
                Zapisane wizytówki specjalistów, do których chcesz szybko wracać.
              </p>
            </div>
            <span className={styles.badge}>—</span>
          </div>
          <p className={styles.error}>{error}</p>
        </div>
      </section>
    );
  }

  if (count === 0) {
    return (
      <section id="scrollToId" className={styles.section}>
        <div className={styles.wrapper}>
          <div className={styles.headerRow}>
            <div>
              <h2 className={styles.sectionTitle}>Twoje ulubione</h2>
              <p className={styles.subTitle}>
                Nie dodałeś/aś jeszcze do <strong>ulubionych</strong> żadnego
                profilu.
              </p>
            </div>
            <span className={styles.badge}>0</span>
          </div>

          <div className={styles.emptyBox}>
            <FiHeart className={styles.emptyIcon} />
            <p>Nic tu jeszcze nie ma.</p>
            <Link className={styles.cta} to="/" state={{ scrollToId: "scrollToId" }}>
              Przeglądaj specjalistów
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="scrollToId" className={styles.section}>
      <div className={styles.wrapper}>
        <div className={styles.headerRow}>
          <div>
            <h2 className={styles.sectionTitle}>Twoje ulubione profile</h2>
            <p className={styles.subTitle}>
              Zapisane wizytówki specjalistów, do których chcesz szybko wracać.
            </p>
          </div>
          <span className={styles.badge}>{count}</span>
        </div>

        <div className={styles.grid}>
          {profiles.map((p) => (
            <UserCard key={p.userId || p._id} user={p} currentUser={currentUser} />
          ))}
        </div>
      </div>
    </section>
  );
}