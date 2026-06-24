import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./Hero.module.scss";
import SearchBar from "../SearchBar/SearchBar";

const Hero = ({ user, hasProfile, loadingProfileStatus }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path, scrollToId = null) => {
    if (location.pathname === path && scrollToId) {
      const el = document.getElementById(scrollToId);

      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }

      return;
    }

    navigate(path, { state: { scrollToId } });
  };

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
      <div className={styles.bg} aria-hidden="true">
        <span className={styles.blurOne} />
        <span className={styles.blurTwo} />
        <span className={styles.blurThree} />
      </div>

      <div className={styles.wrap}>
        <div className={styles.content}>
          <div className={styles.overline}>
            <span>Showly.me</span>
            <b>profil online w jednym linku</b>
          </div>

          <h1 className={styles.title}>
            Twoja oferta.
            <br />
            Jeden link.
            <br />
            <span>Zero chaosu.</span>
          </h1>

          <p className={styles.lead}>
            Stwórz profil z usługami, galerią, cennikiem, opiniami i kontaktem.
            Jedno miejsce, które możesz wysłać klientowi, dodać do bio albo
            wkleić w ogłoszeniu.
          </p>

          <div className={styles.searchBlock}>
            <div className={styles.searchHeader}>
              <div>
                <span>Szukaj profili</span>
                <small>rola, usługa albo miasto</small>
              </div>
            </div>

            <SearchBar variant="hero" />

            <p className={styles.hint}>
              Spróbuj: <b>DJ Poznań</b>, <b>fryzjer Piła</b>, <b>cukiernia</b>
            </p>
          </div>

          <div className={styles.actions}>
            {user ? (
              loadingProfileStatus ? (
                <button type="button" className={styles.primaryBtn} disabled>
                  Sprawdzanie profilu...
                </button>
              ) : hasProfile ? (
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => handleNavigate("/profil", "profileWrapper")}
                >
                  Edytuj profil
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => handleNavigate("/stworz-profil", "scrollToId")}
                >
                  Stwórz profil
                </button>
              )
            ) : (
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => handleNavigate("/register", "registerBox")}
              >
                Załóż darmowy profil
              </button>
            )}

            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => handleNavigate("/jak-to-dziala", "showlyJourney")}
            >
              Zobacz jak działa Showly
            </button>
          </div>
        </div>

        <aside className={styles.side} aria-label="Co możesz pokazać w Showly">
          <div className={styles.sideTop}>
            <span>Profil publiczny</span>
            <b>showly.me/twoja-nazwa</b>
          </div>

          <div className={styles.sideCard}>
            <span>01</span>
            <div>
              <strong>Oferta bez dopytywania</strong>
              <p>Usługi, cennik, opis i zdjęcia w jednym miejscu.</p>
            </div>
          </div>

          <div className={styles.sideCard}>
            <span>02</span>
            <div>
              <strong>Kontakt od razu z profilu</strong>
              <p>Klient może wysłać pytanie, sprawdzić dane albo przejść dalej.</p>
            </div>
          </div>

          <div className={styles.sideCard}>
            <span>03</span>
            <div>
              <strong>Link do bio, posta i ogłoszenia</strong>
              <p>Nie wysyłasz osobno galerii, cen, opinii i sociali.</p>
            </div>
          </div>

          <div className={styles.sideFooter}>
            <div>
              <strong>1 link</strong>
              <span>do całej oferty</span>
            </div>

            <div>
              <strong>mobile</strong>
              <span>gotowe na telefon</span>
            </div>
          </div>
        </aside>

        <div className={styles.stats}>
          <div>
            <strong>1</strong>
            <span>link do wszystkiego</span>
          </div>

          <div>
            <strong>24/7</strong>
            <span>dostęp dla klientów</span>
          </div>

          <div>
            <strong>mobile</strong>
            <span>gotowe na telefon</span>
          </div>
        </div>
      </div>

      <div className={styles.wave}>
        <svg viewBox="0 0 1440 220" preserveAspectRatio="none">
          <path
            fill="#ffffff"
            d="M0,96L80,106.7C160,117,320,139,480,128C640,117,800,75,960,80C1120,85,1280,139,1360,165.3L1440,192L1440,220L0,220Z"
          />
        </svg>
      </div>
    </section>
  );
};

export default Hero;