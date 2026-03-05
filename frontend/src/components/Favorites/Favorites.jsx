import { useEffect, useState, useMemo } from "react";
import styles from "./Favorites.module.scss";
import UserCard from "../UserCard/UserCard";
import { FiHeart } from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";
import { api } from "../../api/api";

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
        const { data } = await api.get("/api/favorites/my");
        if (!alive) return;

        const list = Array.isArray(data) ? data : [];

        // ✅ Normalizacja (na wypadek nested profile / theme jako string)
        const normalized = list.map((it) => {
          const p = it?.profile || it?.profileData || it?.profileDoc || it;

          // theme może być obiektem albo JSON string
          const rawTheme = p?.theme ?? it?.theme ?? it?.profileTheme ?? it?.themeConfig;
          let theme = rawTheme;

          if (typeof rawTheme === "string") {
            try {
              theme = JSON.parse(rawTheme);
            } catch {
              theme = undefined;
            }
          }

          // userId powinien już przyjść z backendu, ale zostawiam fallbacki
          const userId =
            p?.userId ||
            it?.userId ||
            it?.profileUserId ||
            it?.profileId ||
            p?._id ||
            it?._id;

          return {
            ...p,
            ...(theme ? { theme } : {}),
            ...(userId ? { userId } : {}),
          };
        });

        setProfiles(normalized);
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
            <Link
              className={styles.cta}
              to="/"
              state={{ scrollToId: "scrollToId" }}
            >
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
            <UserCard
              key={p.userId || p._id}
              user={p}
              currentUser={currentUser}
            />
          ))}
        </div>
      </div>
    </section>
  );
}