import { useEffect, useState, useMemo } from "react";
import styles from "./Favorites.module.scss";
import UserCard from "../UserCard/UserCard";
import { FiHeart, FiBookmark, FiSearch, FiUser } from "react-icons/fi";
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

        const normalized = list.map((it) => {
          const p = it?.profile || it?.profileData || it?.profileDoc || it;

          const rawTheme =
            p?.theme ?? it?.theme ?? it?.profileTheme ?? it?.themeConfig;

          let theme = rawTheme;

          if (typeof rawTheme === "string") {
            try {
              theme = JSON.parse(rawTheme);
            } catch {
              theme = undefined;
            }
          }

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

    if (currentUser?.uid) {
      run();
    } else {
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

    const tryScroll = () => {
      const el = document.getElementById(scrollTo);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState({}, document.title, location.pathname);
      } else {
        requestAnimationFrame(tryScroll);
      }
    };

    requestAnimationFrame(tryScroll);
  }, [location.state, location.pathname, loading]);

  const count = useMemo(() => profiles.length, [profiles]);

  const SkeletonCard = () => (
    <div className={`${styles.skeletonCard} ${styles.shimmer}`}>
      <div className={styles.skeletonThumb} />
      <div className={styles.skeletonLineLg} />
      <div className={styles.skeletonLineMd} />
      <div className={styles.skeletonLineSm} />
    </div>
  );

  if (!currentUser?.uid) {
    return (
      <section id="scrollToId" className={styles.page}>
        <div className={styles.bgGlow} aria-hidden="true" />

        <div className={styles.shell}>
          <div className={styles.headerRow}>
            <div>
              <h2 className={styles.sectionTitle}>Twoje ulubione</h2>
              <p className={styles.subTitle}>
                Zapisane wizytówki specjalistów, do których chcesz szybko wracać.
              </p>
            </div>

            <div className={styles.headerPills}>
              <span className={styles.headerPill}>
                <FiUser />
                Status: <strong>gość</strong>
              </span>
              <span className={styles.headerPill}>
                <FiBookmark />
                Zapisane profile: <strong>0</strong>
              </span>
            </div>
          </div>

          <div className={styles.sectionGroup}>
            <div className={styles.groupHeader}>
              <h3 className={styles.groupTitle}>Dostęp do ulubionych</h3>
              <span className={styles.badge}>—</span>
            </div>

            <div className={styles.emptyBox}>
              <div className={styles.emptyIconWrap}>
                <FiHeart className={styles.emptyIcon} />
              </div>
              <p className={styles.emptyTitle}>Zaloguj się, aby zobaczyć ulubione</p>
              <p className={styles.emptyText}>
                Po zalogowaniu zobaczysz tutaj wszystkie zapisane profile i szybko
                wrócisz do interesujących Cię specjalistów.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section id="scrollToId" className={styles.page}>
        <div className={styles.bgGlow} aria-hidden="true" />

        <div className={styles.shell}>
          <div className={styles.headerRow}>
            <div>
              <h2 className={styles.sectionTitle}>Twoje ulubione profile</h2>
              <p className={styles.subTitle}>
                Zapisane wizytówki specjalistów, do których chcesz szybko wracać.
              </p>
            </div>

            <div className={styles.headerPills}>
              <span className={styles.headerPill}>
                <FiHeart />
                Ładowanie: <strong>trwa</strong>
              </span>
              <span className={styles.headerPill}>
                <FiBookmark />
                Zapisane profile: <strong>—</strong>
              </span>
            </div>
          </div>

          <div className={styles.sectionGroup}>
            <div className={styles.groupHeader}>
              <h3 className={styles.groupTitle}>Lista zapisanych profili</h3>
              <span className={styles.badge}>—</span>
            </div>

            <div className={styles.grid}>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="scrollToId" className={styles.page}>
        <div className={styles.bgGlow} aria-hidden="true" />

        <div className={styles.shell}>
          <div className={styles.headerRow}>
            <div>
              <h2 className={styles.sectionTitle}>Twoje ulubione profile</h2>
              <p className={styles.subTitle}>
                Zapisane wizytówki specjalistów, do których chcesz szybko wracać.
              </p>
            </div>

            <div className={styles.headerPills}>
              <span className={styles.headerPill}>
                <FiHeart />
                Zapisane profile: <strong>—</strong>
              </span>
              <span className={styles.headerPill}>
                <FiBookmark />
                Status: <strong>błąd</strong>
              </span>
            </div>
          </div>

          <div className={styles.sectionGroup}>
            <div className={styles.groupHeader}>
              <h3 className={styles.groupTitle}>Błąd pobierania danych</h3>
              <span className={styles.badge}>!</span>
            </div>

            <p className={styles.errorBox}>{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (count === 0) {
    return (
      <section id="scrollToId" className={styles.page}>
        <div className={styles.bgGlow} aria-hidden="true" />

        <div className={styles.shell}>
          <div className={styles.headerRow}>
            <div>
              <h2 className={styles.sectionTitle}>Twoje ulubione profile</h2>
              <p className={styles.subTitle}>
                Nie dodałeś/aś jeszcze do <strong>ulubionych</strong> żadnego
                profilu.
              </p>
            </div>

            <div className={styles.headerPills}>
              <span className={styles.headerPill}>
                <FiHeart />
                Zapisane profile: <strong>0</strong>
              </span>
              <span className={styles.headerPill}>
                <FiSearch />
                Gotowe do odkrywania
              </span>
            </div>
          </div>

          <div className={styles.sectionGroup}>
            <div className={styles.groupHeader}>
              <h3 className={styles.groupTitle}>Twoja lista jest jeszcze pusta</h3>
              <span className={styles.badge}>0</span>
            </div>

            <div className={styles.emptyBox}>
              <div className={styles.emptyIconWrap}>
                <FiHeart className={styles.emptyIcon} />
              </div>

              <p className={styles.emptyTitle}>Nic tu jeszcze nie ma</p>
              <p className={styles.emptyText}>
                Gdy zapiszesz interesujące wizytówki, pojawią się właśnie tutaj.
              </p>

              <Link
                className={styles.cta}
                to="/"
                state={{ scrollToId: "scrollToId" }}
              >
                Przeglądaj specjalistów
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="scrollToId" className={styles.page}>
      <div className={styles.bgGlow} aria-hidden="true" />

      <div className={styles.shell}>
        <div className={styles.headerRow}>
          <div>
            <h2 className={styles.sectionTitle}>Twoje ulubione profile</h2>
            <p className={styles.subTitle}>
              Zapisane wizytówki specjalistów, do których chcesz szybko wracać.
            </p>
          </div>

          <div className={styles.headerPills}>
            <span className={styles.headerPill}>
              <FiHeart />
              Zapisane profile: <strong>{count}</strong>
            </span>
            <span className={styles.headerPill}>
              <FiBookmark />
              Twoja prywatna lista
            </span>
          </div>
        </div>

        <div className={styles.sectionGroup}>
          <div className={styles.groupHeader}>
            <h3 className={styles.groupTitle}>Wszystkie zapisane wizytówki</h3>
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
      </div>
    </section>
  );
}