import React from 'react';
import styles from './AboutApp.module.scss';
import { Link } from 'react-router-dom';

const AboutApp = () => {
  return (
    <section className={styles.about}>
      {/* BLOK 1: obrazek po lewej */}
      <div className={`${styles.block} ${styles.reverse}`}>
        <div className={styles.image}>
          <img src="/images/logos/aboutapp-1.png" alt="Tworzenie profilu" />
        </div>
        <div className={styles.text}>
          <h3>Showly – Twoja wizytówka online</h3>
          <p>
            Stwórz swój profil, nawet jeśli dopiero zaczynasz. Pokaż, co robisz – bez zakładania działalności, bez kosztów, bez kodowania.
          </p>
          <div className={styles.stats}>
            <div><strong>85+</strong><span>aktywnych wizytówek</span></div>
            <div><strong>4.9</strong><span>średnia ocen</span></div>
            <div><strong>30 dni</strong><span>prezentacji za darmo</span></div>
          </div>
        </div>
      </div>

      {/* BLOK 2: obrazek po prawej */}
      <div className={styles.block}>
        <div className={styles.image}>
          <img src="/images/logos/aboutapp-2.png" alt="Link do profilu Showly" />
        </div>
        <div className={styles.text}>
          <h3>Dla kogo jest Showly?</h3>
          <ul className={styles.benefits}>
            <li>Dla korepetytorów, uczniów, studentów – zacznij promować się lokalnie i zdobywaj pierwszych klientów.</li>
            <li>Dla pasjonatów – DJ, fotograf, fryzjer, stylista – nie musisz mieć działalności, by się pokazać.</li>
            <li>Udostępniaj swój link <code>https://showly.app/profil/twoja-nazwa</code> w CV, bio na TikToku, ogłoszeniach, SMS-ach – wszędzie!</li>
          </ul>
        </div>
      </div>

      {/* BLOK 3: obrazek po lewej */}
      <div className={`${styles.block} ${styles.reverse}`}>
        <div className={styles.image}>
          <img src="/images/logos/aboutapp-3.png" alt="Prezentacja profilu" />
        </div>
        <div className={styles.text}>
          <h3>Zbuduj swoją obecność w sieci</h3>
          <p>
            Showly to Twoja własna mini-strona internetowa. Możesz dodać opis, zdjęcia, ceny, dostępne terminy i być gotowy w 5 minut.
            Wszystko działa na telefonie i komputerze.
          </p>
          <div className={styles.buttons}>
            <Link to="/wizytowki" className={styles.primary}>Zobacz innych</Link>
            <Link to="/register" className={styles.secondary}>Załóż swoją wizytówkę</Link>
          </div>
        </div>
      </div>


    </section>

  );
};

export default AboutApp;
