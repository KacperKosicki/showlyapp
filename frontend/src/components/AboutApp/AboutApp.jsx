import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiArrowUpRight,
  FiEdit3,
  FiEye,
  FiLink2,
  FiSmartphone,
} from "react-icons/fi";

import styles from "./AboutApp.module.scss";

const benefits = [
  {
    icon: FiLink2,
    number: "01",
    title: "Jedna oferta. Jeden adres.",
    text: "Usługi, ceny, realizacje i kontakt trafiają pod jeden link, który łatwo wysłać klientowi.",
  },
  {
    icon: FiEye,
    number: "02",
    title: "Mniej pytań przed decyzją.",
    text: "Klient od razu widzi, czym się zajmujesz, ile to kosztuje i czy pasujesz do jego potrzeb.",
  },
  {
    icon: FiEdit3,
    number: "03",
    title: "Zmieniasz, kiedy chcesz.",
    text: "Aktualizujesz ofertę samodzielnie — bez czekania na informatyka i przebudowy całej strony.",
  },
];

const industries = [
  { label: "Fotografowie", mark: "FO", tone: "violetAvatar" },
  { label: "DJ-e", mark: "DJ", tone: "orangeAvatar" },
  { label: "Beauty", mark: "BE", tone: "greenAvatar" },
  { label: "Freelancerzy", mark: "FR", tone: "darkAvatar" },
  { label: "Korepetytorzy", mark: "KO", tone: "limeAvatar" },
  { label: "Usługi lokalne", mark: "UL", tone: "paperAvatar" },
];

const AboutApp = ({ user, hasProfile, loadingProfileStatus }) => {
  const sectionRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return undefined;
    }

    const animatedElements = section.querySelectorAll(`.${styles.reveal}`);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealVisible);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -5% 0px",
      }
    );

    animatedElements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const handleNavigate = (path, scrollToId = null) => {
    if (location.pathname === path && scrollToId) {
      const element = document.getElementById(scrollToId);

      if (element) {
        window.setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }

      return;
    }

    navigate(path, { state: { scrollToId } });
  };

  const profileAction = (() => {
    if (!user) {
      return {
        label: "Załóż darmowy profil",
        path: "/register",
        scrollToId: "registerBox",
        disabled: false,
      };
    }

    if (loadingProfileStatus) {
      return {
        label: "Sprawdzanie profilu...",
        path: null,
        scrollToId: null,
        disabled: true,
      };
    }

    if (hasProfile) {
      return {
        label: "Edytuj swój profil",
        path: "/profil",
        scrollToId: "profileWrapper",
        disabled: false,
      };
    }

    return {
      label: "Stwórz swój profil",
      path: "/stworz-profil",
      scrollToId: "createProfile",
      disabled: false,
    };
  })();

  return (
    <section ref={sectionRef} className={styles.section} id="about-app">
      <div className={styles.background} aria-hidden="true">
        <span className={styles.bigWord}>O APLIKACJI</span>
        <span className={styles.dotField} />
        <span className={styles.cornerArrow}>↘</span>
      </div>

      <div className={styles.inner}>
        <header className={styles.manifest}>
          <div
            className={`${styles.manifestCopy} ${styles.reveal} ${styles.fromLeft}`}
          >
            <h2>
              Dobra oferta nie powinna
              <span className={styles.highlight}>ginąć w wiadomościach.</span>
            </h2>

            <p>
              Showly porządkuje to, co dziś wysyłasz osobno: ofertę, ceny,
              realizacje i kontakt. Klient dostaje jeden konkretny profil — Ty
              przestajesz tłumaczyć wszystko od początku.
            </p>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => handleNavigate("/profile", "profilesHub")}
              >
                <span>Zobacz profile</span>
                <FiArrowUpRight aria-hidden="true" />
              </button>

              <button
                type="button"
                className={styles.secondaryButton}
                disabled={profileAction.disabled}
                onClick={() =>
                  profileAction.path &&
                  handleNavigate(profileAction.path, profileAction.scrollToId)
                }
              >
                <span>{profileAction.label}</span>
                {!profileAction.disabled && (
                  <FiArrowRight aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <aside
            className={`${styles.linkCard} ${styles.reveal} ${styles.fromRight}`}
            style={{ "--reveal-delay": "100ms" }}
            aria-label="Przykładowa zawartość profilu Showly"
          >
            <div className={styles.linkCardTop}>
              <span className={styles.brandMark}>s.</span>
              <span>showly.me/twoja-nazwa</span>
              <FiArrowUpRight aria-hidden="true" />
            </div>

            <div className={styles.linkCardBody}>
              <span className={styles.cardLabel}>Twój profil</span>
              <h3>Wszystko, co klient chce wiedzieć. Od razu.</h3>

              <div className={styles.profileRows}>
                <div>
                  <span>Oferta</span>
                  <strong>Usługi i ceny</strong>
                  <b>01</b>
                </div>
                <div>
                  <span>Dowód</span>
                  <strong>Zdjęcia i opinie</strong>
                  <b>02</b>
                </div>
                <div>
                  <span>Kontakt</span>
                  <strong>Wiadomość lub rezerwacja</strong>
                  <b>03</b>
                </div>
              </div>
            </div>

            <span className={styles.readySticker} aria-hidden="true">
              GOTOWE
              <br />
              DO WYSŁANIA
            </span>
          </aside>
        </header>

        <section className={styles.valueSection}>
          <header
            className={`${styles.sectionHeading} ${styles.reveal} ${styles.fromTop}`}
          >

            <h3>Jeden profil robi
              <span className={styles.highlight}>porządek za Ciebie.</span></h3>
          </header>

          <div className={styles.benefits}>
            {benefits.map((item, index) => {
              const Icon = item.icon;

              return (
                <article
                  className={`${styles.benefit} ${styles.reveal} ${styles.fromBottom}`}
                  style={{ "--reveal-delay": `${index * 80}ms` }}
                  key={item.number}
                >
                  <div className={styles.benefitTop}>
                    <span>{item.number}</span>
                    <span className={styles.benefitIcon}>
                      <Icon aria-hidden="true" />
                    </span>
                  </div>

                  <h4>{item.title}</h4>
                  <p>{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.audienceSection}>
          <div
            className={`${styles.audienceCopy} ${styles.reveal} ${styles.fromLeft}`}
          >

            <h3>Nie musisz pasować do
              <span className={styles.highlight}>jednej branży.</span></h3>

            <p>
              Jeśli pokazujesz swoją pracę, sprzedajesz usługę albo przyjmujesz
              zapytania od klientów — Showly daje Ci na to jedno czytelne
              miejsce.
            </p>

            <div className={styles.shareNote}>
              <span className={styles.phoneIcon}>
                <FiSmartphone aria-hidden="true" />
              </span>

              <div>
                <small>Jeden link</small>
                <strong>Bio, post, ogłoszenie lub wiadomość.</strong>
              </div>

              <FiArrowUpRight aria-hidden="true" />
            </div>
          </div>

          <div
            className={`${styles.audienceList} ${styles.reveal} ${styles.fromRight}`}
            style={{ "--reveal-delay": "100ms" }}
          >
            {industries.map((industry) => (
              <article className={styles.industry} key={industry.label}>
                <span
                  className={`${styles.industryAvatar} ${styles[industry.tone]}`}
                  aria-hidden="true"
                >
                  {industry.mark}
                </span>
                <strong>{industry.label}</strong>
                <FiArrowUpRight aria-hidden="true" />
              </article>
            ))}
          </div>
        </section>

        <div
          className={`${styles.closingStrip} ${styles.reveal} ${styles.fromBottom}`}
        >
          <span>Twoja oferta już istnieje.</span>
          <strong>Showly daje jej dobry adres.</strong>
          <FiArrowRight aria-hidden="true" />
        </div>

        <section className={`${styles.announcementIntro} ${styles.reveal} ${styles.fromBottom}`}>
          <div><span>Nowość w Showly / Ogłoszenia</span><h3>Nie tylko pokazujesz ofertę.<br />Możesz też powiedzieć, czego szukasz.</h3><p>Wystaw ogłoszenie ze swojego konta: opisz pomysł, termin, miejsce i budżet. Usługodawcy odpowiedzą ze swoimi profilami, a Ty poznasz ich propozycje w jednym panelu.</p></div>
          <button className={styles.primaryButton} onClick={() => handleNavigate('/ogloszenia', 'announcements')}><span>Odkryj ogłoszenia</span><FiArrowUpRight aria-hidden="true" /></button>
        </section>
      </div>
    </section>
  );
};

export default AboutApp;
