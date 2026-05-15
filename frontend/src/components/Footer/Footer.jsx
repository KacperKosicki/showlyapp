import styles from "./Footer.module.scss";
import { FaFacebookF, FaInstagram, FaXTwitter, FaLinkedinIn } from "react-icons/fa6";
import { FiMail, FiPhone, FiMapPin, FiArrowUpRight } from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";

const Footer = () => {
  const year = new Date().getFullYear();
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

  const scrollToTop = () => {
    const html = document.documentElement;
    const body = document.body;

    const previousHtmlBehavior = html.style.scrollBehavior;
    const previousBodyBehavior = body.style.scrollBehavior;

    html.style.scrollBehavior = "smooth";
    body.style.scrollBehavior = "smooth";

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    setTimeout(() => {
      html.scrollTop = 0;
      body.scrollTop = 0;

      html.style.scrollBehavior = previousHtmlBehavior;
      body.style.scrollBehavior = previousBodyBehavior;
    }, 500);
  };

  return (
    <footer className={styles.footer} id="footer">
      <div className={styles.bg} aria-hidden="true">
        <span className={styles.aurora} />
        <span className={styles.aurora2} />
        <span className={styles.grid} />
        <span className={styles.vignette} />
        <span className={styles.grain} />
      </div>

      <div className={styles.wrap}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <div className={styles.brandTop}>
              <div className={styles.logoMark} aria-hidden="true" />
              <h4 className={styles.footerLogo}>
                Showly.me <span className={styles.beta}>BETA</span>
              </h4>
            </div>

            <p className={styles.brandText}>
              Showly.me to nowoczesna wizytówka usług online – profil, cennik,
              galeria i kontakt w jednym miejscu.
            </p>

            <div className={styles.pills}>
              <span className={styles.pill}>Mobile-first</span>
              <span className={styles.pill}>Premium UI</span>
              <span className={styles.pill}>Prosto</span>
            </div>
          </div>

          <nav className={styles.card} aria-label="Nawigacja">
            <h4 className={styles.cardTitle}>Nawigacja</h4>

            <ul className={styles.links}>
              <li>
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => handleNavigate("/")}
                >
                  Strona Główna <FiArrowUpRight />
                </button>
              </li>

              <li>
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => handleNavigate("/")}
                >
                  Dlaczego My? <FiArrowUpRight />
                </button>
              </li>

              <li>
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => handleNavigate("/")}
                >
                  Specjaliści <FiArrowUpRight />
                </button>
              </li>

              <li>
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => handleNavigate("/kontakt", "scrollToId")}
                >
                  Kontakt <FiArrowUpRight />
                </button>
              </li>
            </ul>
          </nav>

          <div className={styles.card}>
            <h4 className={styles.cardTitle}>Kontakt</h4>

            <div className={styles.contact}>
              <div className={styles.contactRow}>
                <span className={styles.contactIcon} aria-hidden="true">
                  <FiMail />
                </span>
                <span className={styles.contactText}>kontakt@showly.me</span>
              </div>

              <div className={styles.contactRow}>
                <span className={styles.contactIcon} aria-hidden="true">
                  <FiPhone />
                </span>
                <span className={styles.contactText}>+48 -</span>
              </div>

              <div className={styles.contactRow}>
                <span className={styles.contactIcon} aria-hidden="true">
                  <FiMapPin />
                </span>
                <span className={styles.contactText}>Polska • działamy online</span>
              </div>
            </div>

            <div className={styles.socials} aria-label="Social media (wkrótce)">
              <button
                type="button"
                className={styles.socialBtn}
                aria-label="Facebook (wkrótce)"
                title="Wkrótce"
                disabled
              >
                <FaFacebookF />
              </button>

              <button
                type="button"
                className={styles.socialBtn}
                aria-label="Instagram (wkrótce)"
                title="Wkrótce"
                disabled
              >
                <FaInstagram />
              </button>

              <button
                type="button"
                className={styles.socialBtn}
                aria-label="X / Twitter (wkrótce)"
                title="Wkrótce"
                disabled
              >
                <FaXTwitter />
              </button>

              <button
                type="button"
                className={styles.socialBtn}
                aria-label="LinkedIn (wkrótce)"
                title="Wkrótce"
                disabled
              >
                <FaLinkedinIn />
              </button>
            </div>

            <div className={styles.note}>
              Sociale odpalimy wkrótce — na razie zbieramy feedback i dopieszczamy UX.
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <div className={styles.bottomLeft}>
            <span className={styles.copy}>
              © {year} Showly.me. Wszelkie prawa zastrzeżone.
            </span>

            <span className={styles.sep} aria-hidden="true" />

            <button
              type="button"
              className={styles.smallLink}
              onClick={() => handleNavigate("/regulamin", "scrollToId")}
            >
              Regulamin
            </button>

            <span className={styles.dot} aria-hidden="true" />

            <button
              type="button"
              className={styles.smallLink}
              onClick={() => handleNavigate("/polityka-prywatnosci", "scrollToId")}
            >
              Polityka prywatności
            </button>

            <span className={styles.dot} aria-hidden="true" />

            <button
              type="button"
              className={styles.smallLink}
              onClick={() => handleNavigate("/polityka-cookies", "scrollToId")}
            >
              Cookies
            </button>
          </div>

          <button
            type="button"
            className={styles.toTop}
            onClick={scrollToTop}
            aria-label="Wróć na górę"
          >
            Do góry <span aria-hidden="true">↑</span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;