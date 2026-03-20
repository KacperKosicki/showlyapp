import { useEffect, useState, useMemo } from "react";
import styles from "./Favorites.module.scss";
import UserCard from "../UserCard/UserCard";
import { FiHeart } from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";
import { api } from "../../api/api";

export default function Favorites({ currentUser, setAlert }) {
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

          const rawPartnership =
            p?.partnership ??
            it?.partnership ??
            it?.partnerData ??
            it?.profilePartnership;

          let parsedPartnership = rawPartnership;
          if (typeof rawPartnership === "string") {
            try {
              parsedPartnership = JSON.parse(rawPartnership);
            } catch {
              parsedPartnership = undefined;
            }
          }

          const derivedIsPartner =
            parsedPartnership?.isPartner ??
            p?.isPartner ??
            it?.isPartner ??
            p?.partner ??
            it?.partner ??
            false;

          const derivedTier =
            parsedPartnership?.tier ??
            p?.partnerTier ??
            it?.partnerTier ??
            p?.tier ??
            it?.tier ??
            "partner";

          const derivedBadgeText =
            parsedPartnership?.badgeText ??
            parsedPartnership?.label ??
            p?.partnerLabel ??
            it?.partnerLabel ??
            p?.badgeText ??
            it?.badgeText ??
            "PARTNER SHOWLY";

          const derivedColor =
            parsedPartnership?.color ??
            p?.partnerColor ??
            it?.partnerColor ??
            p?.color ??
            it?.color ??
            "";

          const partnership = derivedIsPartner
            ? {
              isPartner: true,
              tier: String(derivedTier || "partner").toLowerCase(),
              badgeText: String(derivedBadgeText || "PARTNER SHOWLY"),
              ...(derivedColor ? { color: derivedColor } : {}),
            }
            : parsedPartnership || {};

          const userId =
            p?.userId ||
            it?.userId ||
            it?.profileUserId ||
            it?.profileId ||
            p?._id ||
            it?._id;

          return {
            ...it,
            ...p,
            ...(theme ? { theme } : {}),
            partnership,
            ...(userId ? { userId } : {}),
            isFavorite: true,
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
      <section id="scrollToId" className={styles.section}>
        <div className={styles.sectionBackground} aria-hidden="true" />

        <div className={styles.inner}>
          <div className={styles.head}>
            <div className={styles.labelRow}>
              <span className={styles.label}>Showly Favorites</span>
              <span className={styles.labelDot} />
              <span className={styles.labelDesc}>Twoja prywatna lista</span>
              <span className={styles.labelLine} />
              <span className={styles.pill}>Zapisuj • Wracaj • Wybieraj</span>
            </div>

            <h2 className={styles.heading}>
              Twoje <span className={styles.headingAccent}>ulubione</span> profile ❤️
            </h2>

            <p className={styles.description}>
              Zapisane wizytówki specjalistów, do których chcesz szybko wracać.
            </p>

            <div className={styles.metaRow}>
              <div className={styles.metaCard}>
                <strong>Gość</strong>
                <span>zaloguj się, aby zobaczyć zapisane profile</span>
              </div>
              <div className={styles.metaCard}>
                <strong>0</strong>
                <span>zapisanych wizytówek</span>
              </div>
              <div className={styles.metaCard}>
                <strong>Showly</strong>
                <span>Twoja osobista lista ulubionych</span>
              </div>
            </div>
          </div>

          <div className={styles.contentBox}>
            <div className={styles.contentHeader}>
              <h3 className={styles.contentTitle}>Dostęp do ulubionych</h3>
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
      <section id="scrollToId" className={styles.section}>
        <div className={styles.sectionBackground} aria-hidden="true" />

        <div className={styles.inner}>
          <div className={styles.head}>
            <div className={styles.labelRow}>
              <span className={styles.label}>Showly Favorites</span>
              <span className={styles.labelDot} />
              <span className={styles.labelDesc}>Zapisane profile</span>
              <span className={styles.labelLine} />
              <span className={styles.pill}>Lista • Powroty • Wygoda</span>
            </div>

            <h2 className={styles.heading}>
              Twoje <span className={styles.headingAccent}>ulubione</span> profile ❤️
            </h2>

            <p className={styles.description}>
              Zapisane wizytówki specjalistów, do których chcesz szybko wracać.
            </p>

            <div className={styles.metaRow}>
              <div className={styles.metaCard}>
                <strong>Ładowanie</strong>
                <span>trwa pobieranie listy</span>
              </div>
              <div className={styles.metaCard}>
                <strong>—</strong>
                <span>zapisanych wizytówek</span>
              </div>
              <div className={styles.metaCard}>
                <strong>Showly</strong>
                <span>Twoja prywatna lista ulubionych</span>
              </div>
            </div>
          </div>

          <div className={styles.contentBox}>
            <div className={styles.contentHeader}>
              <h3 className={styles.contentTitle}>Lista zapisanych profili</h3>
              <span className={styles.badge}>—</span>
            </div>

            <div className={styles.list}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div className={styles.cardWrap} key={i}>
                  <SkeletonCard />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="scrollToId" className={styles.section}>
        <div className={styles.sectionBackground} aria-hidden="true" />

        <div className={styles.inner}>
          <div className={styles.head}>
            <div className={styles.labelRow}>
              <span className={styles.label}>Showly Favorites</span>
              <span className={styles.labelDot} />
              <span className={styles.labelDesc}>Błąd pobierania</span>
              <span className={styles.labelLine} />
              <span className={styles.pill}>Ulubione • Problem • Spróbuj ponownie</span>
            </div>

            <h2 className={styles.heading}>
              Twoje <span className={styles.headingAccent}>ulubione</span> profile ❤️
            </h2>

            <p className={styles.description}>
              Zapisane wizytówki specjalistów, do których chcesz szybko wracać.
            </p>

            <div className={styles.metaRow}>
              <div className={styles.metaCard}>
                <strong>Błąd</strong>
                <span>nie udało się pobrać danych</span>
              </div>
              <div className={styles.metaCard}>
                <strong>—</strong>
                <span>zapisanych wizytówek</span>
              </div>
              <div className={styles.metaCard}>
                <strong>Showly</strong>
                <span>Twoja prywatna lista ulubionych</span>
              </div>
            </div>
          </div>

          <div className={styles.contentBox}>
            <div className={styles.contentHeader}>
              <h3 className={styles.contentTitle}>Błąd pobierania danych</h3>
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
      <section id="scrollToId" className={styles.section}>
        <div className={styles.sectionBackground} aria-hidden="true" />

        <div className={styles.inner}>
          <div className={styles.head}>
            <div className={styles.labelRow}>
              <span className={styles.label}>Showly Favorites</span>
              <span className={styles.labelDot} />
              <span className={styles.labelDesc}>Twoja prywatna lista</span>
              <span className={styles.labelLine} />
              <span className={styles.pill}>Zapisuj • Wracaj • Wybieraj</span>
            </div>

            <h2 className={styles.heading}>
              Twoje <span className={styles.headingAccent}>ulubione</span> profile ❤️
            </h2>

            <p className={styles.description}>
              Nie dodałeś/aś jeszcze do ulubionych żadnego profilu.
            </p>

            <div className={styles.metaRow}>
              <div className={styles.metaCard}>
                <strong>0</strong>
                <span>zapisanych wizytówek</span>
              </div>
              <div className={styles.metaCard}>
                <strong>Gotowe</strong>
                <span>czas odkrywać specjalistów</span>
              </div>
              <div className={styles.metaCard}>
                <strong>Showly</strong>
                <span>Twoja prywatna lista ulubionych</span>
              </div>
            </div>
          </div>

          <div className={styles.contentBox}>
            <div className={styles.contentHeader}>
              <h3 className={styles.contentTitle}>Twoja lista jest jeszcze pusta</h3>
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
    <section id="scrollToId" className={styles.section}>
      <div className={styles.sectionBackground} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.head}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Showly Favorites</span>
            <span className={styles.labelDot} />
            <span className={styles.labelDesc}>Twoja prywatna lista</span>
            <span className={styles.labelLine} />
            <span className={styles.pill}>Zapisane • Szybki powrót • Wybór</span>
          </div>

          <h2 className={styles.heading}>
            Twoje <span className={styles.headingAccent}>ulubione</span> profile ❤️
          </h2>

          <p className={styles.description}>
            Zapisane wizytówki specjalistów, do których chcesz szybko wracać.
          </p>

          <div className={styles.metaRow}>
            <div className={styles.metaCard}>
              <strong>{count}</strong>
              <span>zapisanych wizytówek</span>
            </div>
            <div className={styles.metaCard}>
              <strong>Prywatne</strong>
              <span>tylko dla Twojego konta</span>
            </div>
            <div className={styles.metaCard}>
              <strong>Showly</strong>
              <span>szybki dostęp do najlepszych profili</span>
            </div>
          </div>
        </div>

        <div className={styles.contentBox}>
          <div className={styles.contentHeader}>
            <h3 className={styles.contentTitle}>Wszystkie zapisane wizytówki</h3>
            <span className={styles.badge}>{count}</span>
          </div>

          <div className={styles.list}>
            {profiles.map((p, index) => (
              <div className={styles.cardWrap} key={p.userId || p._id || index}>
                <UserCard
                  user={p}
                  currentUser={currentUser}
                  setAlert={setAlert}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}