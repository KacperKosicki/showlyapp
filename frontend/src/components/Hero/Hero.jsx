import { useEffect } from "react";
import styles from "./Hero.module.scss";
import Navbar from "../Navbar/Navbar";
import SearchBar from "../SearchBar/SearchBar";
import LoadingLink from "../ui/LoadingLink/LoadingLink";

const Hero = ({
  user,
  loadingUser,
  setUser,
  refreshTrigger,
  unreadCount,
  setUnreadCount,
  pendingReservationsCount,
  setAlert,
}) => {
  useEffect(() => {
    document.body.classList.add("hero-page");
    document.documentElement.classList.add("hero-page-html");

    return () => {
      document.body.classList.remove("hero-page");
      document.documentElement.classList.remove("hero-page-html");
    };
  }, []);

  return (
    <section className={styles.hero} id="hero">
      <Navbar
        user={user}
        loadingUser={loadingUser}
        setUser={setUser}
        refreshTrigger={refreshTrigger}
        unreadCount={unreadCount}
        setUnreadCount={setUnreadCount}
        pendingReservationsCount={pendingReservationsCount}
        setAlert={setAlert}
      />

      <div className={styles.bg} aria-hidden="true">
        <span className={styles.aurora} />
        <span className={styles.aurora2} />
        <span className={styles.grid} />
        <span className={styles.vignette} />
        <span className={styles.grain} />
      </div>

      <div className={styles.wrap}>
        <div className={styles.left}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Showly</span>
            <span className={styles.labelDot} />
            <span className={styles.labelDesc}>Profil w jednym linku</span>
            <span className={styles.labelLine} />
            <span className={styles.pill}>Mobile-first</span>
          </div>

          <h1 className={styles.h1}>
            Zrób wrażenie
            <br />
            <span className={styles.h1Accent}>jednym profilem.</span>
          </h1>

          <p className={styles.p}>
            Usługi, cennik, galeria i kontakt — ułożone w gotowy układ, który wygląda profesjonalnie na telefonie i
            desktopie.
          </p>

          <div className={styles.actions}>
            <div className={styles.searchBlock}>
              <div className={styles.searchTop}>
                <div className={styles.searchTitle}>Szukaj profili</div>
                <div className={styles.searchKicker}>po usługach, roli i lokalizacji</div>
              </div>

              <SearchBar variant="hero" />

              <div className={styles.searchHint}>
                Tip: wpisz np. <b>“DJ Poznań”</b> albo <b>“fryzjer Piła”</b>.
              </div>
            </div>

            <div className={styles.buttons}>
              {user ? (
                <LoadingLink
                  to="/profil"
                  state={{ scrollToId: "scrollToId" }}
                  className={styles.primaryBtn}
                  aria-label="Przejdź do edycji profilu"
                >
                  <span className={styles.btnGlow} aria-hidden="true" />
                  Edytuj profil <span aria-hidden="true">→</span>
                </LoadingLink>
              ) : (
                <LoadingLink
                  to="/register"
                  state={{ scrollToId: "registerContainer" }}
                  className={styles.primaryBtn}
                  aria-label="Załóż konto"
                >
                  <span className={styles.btnGlow} aria-hidden="true" />
                  Załóż konto <span aria-hidden="true">→</span>
                </LoadingLink>
              )}

              <a href="#how" className={styles.secondaryBtn}>
                Zobacz jak działa
              </a>
            </div>

            <div className={styles.quick}>
              <span className={styles.quickItem}>
                <span className={styles.tick} aria-hidden="true" />
                bez kodowania
              </span>
              <span className={styles.quickItem}>
                <span className={styles.tick} aria-hidden="true" />
                jeden link
              </span>
              <span className={styles.quickItem}>
                <span className={styles.tick} aria-hidden="true" />
                wygląda premium
              </span>
            </div>
          </div>
        </div>

        <aside className={styles.right} aria-label="Podgląd profilu">
          <div className={styles.browser}>
            <div className={styles.browserTop}>
              <div className={styles.dots} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>

              <div className={styles.url}>
                showly.app/<span className={styles.urlAccent}>twoj-profil</span>
              </div>

              <div className={styles.badge}>PREVIEW</div>
            </div>

            <div className={styles.browserBody}>
              <div className={styles.previewHeader}>
                <div className={styles.avatar} />
                <div className={styles.headText}>
                  <div className={styles.name}>Twoja Nazwa / Firma</div>
                  <div className={styles.sub}>DJ • Piła • dostępność: szybka</div>

                  <div className={styles.chips}>
                    <span className={styles.chip}>Rezerwacje</span>
                    <span className={styles.chip}>Opinie</span>
                    <span className={styles.chip}>Galeria</span>
                  </div>
                </div>
              </div>

              <div className={styles.previewGrid}>
                <div className={styles.tile}>
                  <div className={styles.tileKey}>USŁUGI</div>
                  <div className={styles.tileVal}>czytelna lista</div>
                </div>
                <div className={styles.tile}>
                  <div className={styles.tileKey}>CENNIK</div>
                  <div className={styles.tileVal}>od–do / pakiety</div>
                </div>
                <div className={styles.tile}>
                  <div className={styles.tileKey}>GALERIA</div>
                  <div className={styles.tileVal}>realizacje</div>
                </div>
                <div className={styles.tile}>
                  <div className={styles.tileKey}>KONTAKT</div>
                  <div className={styles.tileVal}>tel / linki</div>
                </div>
              </div>

              <div className={styles.previewBar}>
                <div className={styles.barLine} />
                <div className={styles.barText}>Układ gotowy do wysłania klientowi.</div>
              </div>
            </div>
          </div>

          <div className={styles.sideFacts}>
            <div className={styles.fact}>
              <span className={styles.factIcon} aria-hidden="true">
                ⚡
              </span>
              Minimalny wysiłek, maksymalny efekt wizualny.
            </div>
            <div className={styles.fact}>
              <span className={styles.factIcon} aria-hidden="true">
                📱
              </span>
              Stabilne na mobile — bez “rozjeżdżania” sekcji.
            </div>
            <div className={styles.fact}>
              <span className={styles.factIcon} aria-hidden="true">
                🔗
              </span>
              Jeden link do wszystkiego — jak nowoczesna wizytówka.
            </div>
          </div>
        </aside>
      </div>

      <div className={styles.wave}>
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path
            fill="#fff"
            d="M0,160L40,149.3C80,139,160,117,240,133.3C320,149,400,203,480,229.3C560,256,640,256,720,218.7C800,181,880,107,960,90.7C1040,75,1120,117,1200,154.7C1280,192,1360,224,1400,240L1440,256L1440,320L0,320Z"
          />
        </svg>
      </div>
    </section>
  );
};

export default Hero;