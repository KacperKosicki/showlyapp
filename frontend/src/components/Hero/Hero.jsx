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
}) => {
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
      />

      <div className={styles.bg} aria-hidden="true">
        <span className={styles.aurora} />
        <span className={styles.grid} />
        <span className={styles.vignette} />
      </div>

      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.kicker}>
            <span className={styles.kickerLine} />
            <span className={styles.kickerText}>
              Showly — profil w jednym linku
            </span>
          </div>

          <h1 className={styles.title}>
            Twoja oferta.
            <br />
            <span className={styles.titleAccent}>
              Czytelnie i profesjonalnie.
            </span>
          </h1>

          <p className={styles.subtitle}>
            Zbuduj profil, dodaj usługi i zdjęcia realizacji. Udostępnij link
            do profilu klientom — bez robienia strony od zera.
          </p>

          <div className={styles.actions}>
            <div className={styles.searchWrap}>
              <SearchBar variant="hero" />

              <div className={styles.hint}>
                Wyszukuj profile i usługi w Showly.
              </div>

              <div className={styles.proof}>
                <span className={styles.proofItem}>Profil</span>
                <span className={styles.dot} />
                <span className={styles.proofItem}>Usługi</span>
                <span className={styles.dot} />
                <span className={styles.proofItem}>Zdjęcia</span>
                <span className={styles.dot} />
                <span className={styles.proofItem}>Cennik</span>
              </div>

{user ? (
  <LoadingLink
    to="/profil"
    state={{ scrollToId: "scrollToId" }}
    className={styles.cta}
    aria-label="Przejdź do edycji profilu"
  >
    <span className={styles.ctaText}>Edytuj profil</span>
  </LoadingLink>
) : (
  <LoadingLink
    to="/register"
    state={{ scrollToId: "registerContainer" }}
    className={styles.cta}
    aria-label="Załóż konto"
  >
    <span className={styles.ctaText}>Załóż konto</span>
  </LoadingLink>
)}
            </div>
          </div>
        </div>

        <aside className={styles.side} aria-label="Dlaczego Showly">
          <div className={styles.sideTitle}>Wyglądaj jak marka.</div>

          <div className={styles.sideText}>
            Zamiast wysyłać 20 wiadomości, masz jedno miejsce: opis, oferta,
            realizacje i kontakt.
          </div>

          <div className={styles.sideList}>
            <div className={styles.sideRow}>
              <span className={styles.sideMark} />
              Wszystko w jednym profilu
            </div>

            <div className={styles.sideRow}>
              <span className={styles.sideMark} />
              Czytelna prezentacja usług
            </div>

            <div className={styles.sideRow}>
              <span className={styles.sideMark} />
              Galeria realizacji i zaufanie
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