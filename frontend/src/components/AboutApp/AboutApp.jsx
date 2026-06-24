import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./AboutApp.module.scss";

import {
  FiArrowRight,
  FiCheck,
  FiEdit3,
  FiEye,
  FiGlobe,
  FiSmartphone,
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

  const audience = [
    "fryzjerzy",
    "fotografowie",
    "DJ-e",
    "trenerzy",
    "korepetytorzy",
    "freelancerzy",
    "twórcy",
    "małe firmy",
    "lokalne usługi",
    "osoby budujące markę osobistą",
  ];

  const benefits = [
    {
      icon: <FiGlobe />,
      title: "Jeden link",
      text: "Zamiast rozsyłać kilka miejsc, wysyłasz jeden profil z najważniejszymi informacjami.",
    },
    {
      icon: <FiEye />,
      title: "Lepsza prezentacja",
      text: "Klient od razu widzi, czym się zajmujesz, co oferujesz, jakie masz zdjęcia, ceny i opinie.",
    },
    {
      icon: <FiSmartphone />,
      title: "Wygoda na telefonie",
      text: "Profil jest tworzony z myślą o osobach, które otwierają link z Instagrama, Facebooka lub wiadomości.",
    },
    {
      icon: <FiEdit3 />,
      title: "Łatwa edycja",
      text: "Możesz rozwijać profil bez poprawiania całej strony internetowej od zera.",
    },
  ];

  const roadmap = [
    "rozbudowane profile publiczne",
    "system opinii i komentarzy",
    "wiadomości między użytkownikami",
    "rezerwacje terminów",
    "usługi i cenniki",
    "większa personalizacja wyglądu profilu",
  ];

  return (
    <section className={styles.about} id="about-app">
      <div className={styles.wrap}>
        <div className={styles.layout}>
          <aside className={styles.side}>
            <span className={styles.overline}>Showly.me</span>

            <h2>
              Profil online,
              <br />
              który porządkuje Twoją ofertę.
            </h2>

            <p>
              Showly powstało dla osób, które chcą mieć jedno miejsce do
              pokazania swojej działalności — bez budowania dużej strony,
              bez chaosu w wiadomościach i bez rozrzucania informacji po wielu
              linkach.
            </p>

            <div className={styles.quickStats}>
              <div>
                <strong>1</strong>
                <span>link do profilu</span>
              </div>

              <div>
                <strong>24/7</strong>
                <span>dostęp dla klienta</span>
              </div>

              <div>
                <strong>mobile</strong>
                <span>wygodne na telefonie</span>
              </div>
            </div>
          </aside>

          <div className={styles.content}>
            <article className={styles.chapter}>
              <div className={styles.chapterNumber}>01</div>

              <div>
                <span className={styles.chapterLabel}>Dlaczego?</span>

                <h3>
                  Bo sama obecność w social mediach często nie wystarcza.
                </h3>

                <p>
                  Instagram, Facebook czy TikTok są dobre do zasięgu, ale nie
                  zawsze dobrze pokazują pełną ofertę. Klient często musi szukać
                  cennika, opinii, zdjęć, terminów albo sposobu kontaktu.
                  Showly zbiera te informacje w jednym, prostym profilu.
                </p>
              </div>
            </article>

            <article className={styles.chapter}>
              <div className={styles.chapterNumber}>02</div>

              <div>
                <span className={styles.chapterLabel}>Co daje?</span>

                <h3>Jedno miejsce, które możesz wysłać klientowi.</h3>

                <p>
                  Profil Showly może działać jak Twoja mała strona: pokazuje
                  kim jesteś, czym się zajmujesz, jakie masz usługi, zdjęcia,
                  opinie, cennik i kontakt.
                </p>

                <div className={styles.checkList}>
                  <span>
                    <FiCheck /> opis działalności
                  </span>
                  <span>
                    <FiCheck /> zdjęcia i realizacje
                  </span>
                  <span>
                    <FiCheck /> cennik lub zakres cen
                  </span>
                  <span>
                    <FiCheck /> opinie klientów
                  </span>
                  <span>
                    <FiCheck /> kontakt i linki
                  </span>
                  <span>
                    <FiCheck /> dostępność lub rezerwacje
                  </span>
                </div>
              </div>
            </article>

            <article className={styles.chapter}>
              <div className={styles.chapterNumber}>03</div>

              <div>
                <span className={styles.chapterLabel}>Dla kogo?</span>

                <h3>Dla osób, które sprzedają usługę, talent albo czas.</h3>

                <p>
                  Showly nie jest tylko dla jednej branży. Profil może stworzyć
                  lokalna firma, freelancer, twórca, usługodawca albo osoba,
                  która chce mieć bardziej uporządkowane miejsce w internecie.
                </p>

                <div className={styles.tags}>
                  {audience.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </div>

        <div className={styles.benefits}>
          <div className={styles.sectionIntro}>
            <span className={styles.overline}>W praktyce</span>
            <h3>Co zmienia Showly?</h3>
          </div>

          <div className={styles.benefitGrid}>
            {benefits.map((item) => (
              <article className={styles.benefit} key={item.title}>
                <div className={styles.benefitIcon}>{item.icon}</div>
                <h4>{item.title}</h4>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>

        <div className={styles.future}>
          <div className={styles.futureText}>
            <span className={styles.overline}>Co dalej?</span>

            <h3>Showly ma rozwijać się w stronę praktycznego narzędzia dla usług.</h3>

            <p>
              Celem nie jest tylko ładna wizytówka. Showly ma pomagać w
              pokazaniu oferty, zbieraniu opinii, prowadzeniu rozmów z klientami
              i obsłudze rezerwacji tam, gdzie ma to sens.
            </p>
          </div>

          <div className={styles.roadmap}>
            {roadmap.map((item, index) => (
              <div className={styles.roadmapItem} key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.cta}>
          <div className={styles.ctaText}>
            <span className={styles.overline}>Szybki start</span>

            <h3>Stwórz profil, który możesz od razu pokazać klientowi.</h3>

            <p>
              Jeden link do bio, ogłoszenia, wiadomości, CV albo posta.
              Prościej, czytelniej i bardziej profesjonalnie.
            </p>
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
                  onClick={() =>
                    handleNavigate("/stworz-profil", "createProfile")
                  }
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
      <div className={styles.wave} aria-hidden="true">
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

export default AboutApp;