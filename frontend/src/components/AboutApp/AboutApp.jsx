import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./AboutApp.module.scss";
import LoadingLink from "../ui/LoadingLink/LoadingLink";

import {
  FiArrowRight,
  FiCheckCircle,
  FiGlobe,
  FiSmartphone,
  FiStar,
  FiUsers,
  FiZap,
} from "react-icons/fi";

const AboutApp = ({ user, hasProfile, loadingProfileStatus }) => {
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

  return (
    <section className={styles.about} id="about-app">
      <div className={styles.bg} aria-hidden="true">
        <span className={styles.orbOne} />
        <span className={styles.orbTwo} />
        <span className={styles.orbThree} />
        <span className={styles.noise} />
      </div>

      <div className={styles.wrap}>
        <header className={styles.head}>
          <div className={styles.eyebrow}>
            <span>Showly.me</span>
            <b>profil online w jednym linku</b>
          </div>

          <h2>
            Pokaż się w sieci.
            <br />
            <span>Bez strony. Bez chaosu.</span>
          </h2>

          <p>
            Showly to nowoczesna wizytówka online dla usług, twórców i lokalnych
            marek. Dodajesz opis, zdjęcia, cennik, opinie i kontakt — a klient
            widzi wszystko od razu.
          </p>
        </header>

        <div className={styles.heroCard}>
          <div className={styles.visualPanel}>
            <div className={styles.visualBg} />
            <img
              src="/images/logos/aboutapp-1.png"
              alt="Tworzenie profilu Showly"
            />
          </div>

          <div className={styles.heroContent}>
            <span className={styles.label}>Start bez komplikacji</span>

            <h3>Twoja oferta wygląda profesjonalnie od pierwszego kliknięcia</h3>

            <p>
              Nie musisz budować własnej strony ani kombinować z wieloma linkami.
              W Showly tworzysz jeden czytelny profil, który możesz wysłać
              klientowi, wrzucić do bio albo dodać do ogłoszenia.
            </p>

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
        </div>

        <div className={styles.grid}>
          <article className={styles.textCard}>
            <div className={styles.icon}>
              <FiUsers />
            </div>

            <h3>Dla wielu branż</h3>

            <p>
              Fryzjer, DJ, fotograf, korepetytor, trener, cukiernia, freelancer
              albo twórca — każdy może pokazać swoją ofertę w estetyczny sposób.
            </p>
          </article>

          <article className={`${styles.imageCard} ${styles.tall}`}>
            <img
              src="/images/logos/aboutapp-2.png"
              alt="Profil Showly i link do wizytówki"
            />
          </article>

          <article className={styles.textCard}>
            <div className={styles.icon}>
              <FiGlobe />
            </div>

            <h3>Jeden link wszędzie</h3>

            <p>
              Udostępnij profil w CV, Instagramie, TikToku, wiadomości do
              klienta albo w ogłoszeniu.
            </p>

            <code>showly.me/profil/twoja-nazwa</code>
          </article>

          <article className={styles.textCard}>
            <div className={styles.icon}>
              <FiSmartphone />
            </div>

            <h3>Mobile first</h3>

            <p>
              Profil dobrze wygląda na telefonie, czyli tam, gdzie klient
              najczęściej otwiera link.
            </p>
          </article>

          <article className={styles.textCard}>
            <div className={styles.icon}>
              <FiCheckCircle />
            </div>

            <h3>Bez własnej strony</h3>

            <p>
              Opis, zdjęcia, cennik, dostępność, opinie i kontakt są w jednym
              miejscu — bez projektowania strony od zera.
            </p>
          </article>

          <article className={`${styles.imageCard} ${styles.wide}`}>
            <img
              src="/images/logos/aboutapp-3.png"
              alt="Prezentacja profilu użytkownika Showly"
            />
          </article>
        </div>

        <div className={styles.ctaCard}>
          <div>
            <span className={styles.label}>Widoczność i wygoda</span>

            <h3>Zbuduj swoją obecność online bez zbędnego kombinowania</h3>

            <p>
              Showly działa jak Twoja mini-strona: prosta do udostępnienia,
              wygodna do edycji i czytelna dla klientów.
            </p>

            <div className={styles.pills}>
              <span>
                <FiZap /> szybki start
              </span>
              <span>
                <FiStar /> opinie klientów
              </span>
              <span>
                <FiSmartphone /> mobile first
              </span>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              onClick={() => handleNavigate("/profile", "profilesHub")}
            >
              Zobacz profile <FiArrowRight />
            </button>

            {user ? (
              loadingProfileStatus ? (
                <button type="button" className={styles.secondary} disabled>
                  Sprawdzanie profilu...
                </button>
              ) : hasProfile ? (
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => handleNavigate("/profil", "profileWrapper")}
                >
                  Edytuj swój profil
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => handleNavigate("/stworz-profil", "createProfile")}
                >
                  Stwórz swój profil
                </button>
              )
            ) : (
              <button
                type="button"
                className={styles.secondary}
                onClick={() => handleNavigate("/register", "registerBox")}
              >
                Załóż darmowy profil
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutApp;