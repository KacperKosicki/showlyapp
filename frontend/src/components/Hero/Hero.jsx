import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./Hero.module.scss";
import SearchBar from "../SearchBar/SearchBar";
import LoadingLink from "../ui/LoadingLink/LoadingLink";

const Hero = ({ user }) => {
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
        <span className={styles.orbOne} />
        <span className={styles.orbTwo} />
        <span className={styles.noise} />
      </div>

      <div className={styles.wrap}>
        <div className={styles.content}>
          <div className={styles.eyebrow}>
            <span>Showly.me</span>
            <b>profil online w jednym linku</b>
          </div>

          <h1>
            Twoja oferta.
            <br />
            Jeden link.
            <br />
            <span>Zero chaosu.</span>
          </h1>

          <p className={styles.lead}>
            Stwórz nowoczesną wizytówkę z usługami, galerią, cennikiem,
            opiniami i kontaktem — gotową do wysłania klientowi.
          </p>

          <div className={styles.searchCard}>
            <div className={styles.searchHeader}>
              <span>Szukaj profili</span>
              <small>rola, usługa, miasto</small>
            </div>

            <SearchBar variant="hero" />

            <p className={styles.hint}>
              Spróbuj: <b>DJ Poznań</b>, <b>fryzjer Piła</b>, <b>cukiernia</b>
            </p>
          </div>

          <div className={styles.actions}>
            {user ? (
              <LoadingLink
                to="/profil"
                state={{ scrollToId: "scrollToId" }}
                className={styles.primaryBtn}
              >
                Edytuj profil
              </LoadingLink>
            ) : (
              <LoadingLink
                to="/register"
                state={{ scrollToId: "registerContainer" }}
                className={styles.primaryBtn}
              >
                Załóż darmowy profil
              </LoadingLink>
            )}

            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => handleNavigate("/jak-to-dziala", "showlyJourney")}
            >
              Zobacz jak działa Showly
            </button>
          </div>

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

        <div className={styles.visual}>
          <div className={styles.phone}>
            <div className={styles.phoneTop}>
              <span />
            </div>

            <div className={styles.profileCard}>
              <div className={styles.profileCover} />

              <div className={styles.profileMain}>
                <div className={styles.avatar}>
                  <img src="/images/other/logo-showly.png" alt="Showly" />
                </div>

                <div>
                  <h3>Twoja marka</h3>
                  <p>Usługi lokalne • Cała Polska</p>
                </div>
              </div>

              <div className={styles.tags}>
                <span>Rezerwacje</span>
                <span>Opinie</span>
                <span>Galeria</span>
              </div>

              <div className={styles.list}>
                <div>
                  <span>Usługi</span>
                  <b>od 150 zł</b>
                </div>
                <div>
                  <span>Dostępność</span>
                  <b>dzisiaj</b>
                </div>
                <div>
                  <span>Ocena</span>
                  <b>4.9 ★</b>
                </div>
              </div>

              <button type="button">Zadaj pytanie</button>
            </div>
          </div>

          <div className={styles.floatingCard}>
            <strong>+ szybki kontakt</strong>
            <span>klient widzi wszystko od razu</span>
          </div>
        </div>
      </div>

      <div className={styles.wave}>
        <svg viewBox="0 0 1440 220" preserveAspectRatio="none">
          <path
            fill="#fff"
            d="M0,96L80,106.7C160,117,320,139,480,128C640,117,800,75,960,80C1120,85,1280,139,1360,165.3L1440,192L1440,220L0,220Z"
          />
        </svg>
      </div>
    </section>
  );
};

export default Hero;