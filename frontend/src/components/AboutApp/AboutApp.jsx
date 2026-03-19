import React from "react";
import styles from "./AboutApp.module.scss";
import LoadingLink from "../ui/LoadingLink/LoadingLink";
import {
  FiCheckCircle,
  FiGlobe,
  FiSmartphone,
  FiUsers,
} from "react-icons/fi";

const AboutApp = ({ user }) => {
  return (
    <section className={styles.about} id="about-app">
      <div className={styles.bg} aria-hidden="true">
        <span className={styles.glowOne} />
        <span className={styles.glowTwo} />
        <span className={styles.grid} />
        <span className={styles.noise} />
      </div>

      <div className={styles.wrap}>
        <header className={styles.head}>
          <div className={styles.kickerRow}>
            <span className={styles.kicker}>Showly</span>
            <span className={styles.dot} />
            <span className={styles.kickerText}>Nowoczesna wizytówka online</span>
          </div>

          <h2 className={styles.title}>
            Pokaż się w sieci <span>prosto, estetycznie i skutecznie</span>
          </h2>

          <p className={styles.subtitle}>
            Showly pomaga tworzyć nowoczesne profile usług i wizytówki online —
            bez kodowania, bez własnej strony i bez zbędnego kombinowania.
          </p>
        </header>

        {/* BLOK 1 */}
        <div className={`${styles.block} ${styles.reverse}`}>
          <div className={styles.visualCard}>
            <div className={styles.visualGlow} />
            <img src="/images/logos/aboutapp-1.png" alt="Tworzenie profilu Showly" />
          </div>

          <div className={styles.contentCard}>
            <span className={styles.eyebrow}>Start bez komplikacji</span>
            <h3>Showly — Twoja wizytówka online w kilka minut</h3>
            <p>
              Stwórz profil nawet wtedy, gdy dopiero zaczynasz. Pokaż swoje usługi,
              zakres działania, zdjęcia, ceny i terminy bez potrzeby budowania własnej strony.
            </p>

            <div className={styles.stats}>
              <div className={styles.statItem}>
                <strong>85+</strong>
                <span>aktywnych wizytówek</span>
              </div>
              <div className={styles.statItem}>
                <strong>4.9</strong>
                <span>średnia ocen</span>
              </div>
              <div className={styles.statItem}>
                <strong>30 dni</strong>
                <span>na start za darmo</span>
              </div>
            </div>
          </div>
        </div>

        {/* BLOK 2 */}
        <div className={styles.block}>
          <div className={styles.visualCard}>
            <div className={styles.visualGlow} />
            <img src="/images/logos/aboutapp-2.png" alt="Profil Showly i link do wizytówki" />
          </div>

          <div className={styles.contentCard}>
            <span className={styles.eyebrow}>Dla wielu branż</span>
            <h3>Dla kogo jest Showly?</h3>

            <ul className={styles.benefits}>
              <li>
                <span className={styles.benefitIcon}>
                  <FiUsers />
                </span>
                <div>
                  <strong>Dla osób, które chcą zacząć działać</strong>
                  <p>
                    Korepetytorzy, studenci, uczniowie, freelancerzy i osoby rozwijające
                    swoje pierwsze usługi lokalnie.
                  </p>
                </div>
              </li>

              <li>
                <span className={styles.benefitIcon}>
                  <FiCheckCircle />
                </span>
                <div>
                  <strong>Dla pasjonatów i usługodawców</strong>
                  <p>
                    DJ, fotograf, fryzjer, stylista, trener lub twórca — nie musisz
                    mieć działalności, by wyglądać profesjonalnie.
                  </p>
                </div>
              </li>

              <li>
                <span className={styles.benefitIcon}>
                  <FiGlobe />
                </span>
                <div>
                  <strong>Jeden link, który możesz wrzucić wszędzie</strong>
                  <p>
                    Udostępniaj swój profil w CV, bio na TikToku, Instagramie,
                    ogłoszeniach, wiadomościach i social mediach.
                  </p>
                  <code>https://showly.app/profil/twoja-nazwa</code>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* BLOK 3 */}
        <div className={`${styles.block} ${styles.reverse}`}>
          <div className={styles.visualCard}>
            <div className={styles.visualGlow} />
            <img src="/images/logos/aboutapp-3.png" alt="Prezentacja profilu użytkownika Showly" />
          </div>

          <div className={styles.contentCard}>
            <span className={styles.eyebrow}>Widoczność i wygoda</span>
            <h3>Zbuduj swoją obecność online bez własnej strony</h3>
            <p>
              Showly działa jak Twoja mini-strona internetowa. Dodajesz opis, zdjęcia,
              cennik, dostępność i formy kontaktu — a całość wygląda dobrze zarówno
              na telefonie, jak i na komputerze.
            </p>

            <div className={styles.featureStrip}>
              <div className={styles.featureMini}>
                <FiSmartphone />
                <span>mobile first</span>
              </div>
              <div className={styles.featureMini}>
                <FiGlobe />
                <span>publiczny link</span>
              </div>
              <div className={styles.featureMini}>
                <FiCheckCircle />
                <span>gotowe w kilka minut</span>
              </div>
            </div>

            <div className={styles.buttons}>
              <LoadingLink to="/wizytowki" className={styles.primary}>
                Zobacz wizytówki
              </LoadingLink>

              {user ? (
                <LoadingLink
                  to="/profil"
                  state={{ scrollToId: "scrollToId" }}
                  className={styles.secondary}
                >
                  Przejdź do edycji profilu
                </LoadingLink>
              ) : (
                <LoadingLink
                  to="/register"
                  state={{ scrollToId: "registerContainer" }}
                  className={styles.secondary}
                >
                  Załóż swoją wizytówkę
                </LoadingLink>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutApp;