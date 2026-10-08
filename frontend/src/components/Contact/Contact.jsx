import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import styles from "./Contact.module.scss";
import useScrollReveal from "../../utils/useScrollReveal";
import AlertBox from "../AlertBox/AlertBox";
import {
  FiMail,
  FiMapPin,
  FiSend,
  FiMessageSquare,
  FiUser,
  FiBriefcase,
  FiArrowUpRight,
} from "react-icons/fi";


const Contact = () => {
  const sectionRef = useScrollReveal();
  const location = useLocation();

  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    subject: "",
    message: "",
  });

  const [status, setStatus] = useState({
    loading: false,
  });

  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const scrollTo = location.state?.scrollToId;

    if (!scrollTo) return;

    const tryScroll = () => {
      const el = document.getElementById(scrollTo);

      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        window.history.replaceState({}, document.title, location.pathname);
        return;
      }

      requestAnimationFrame(tryScroll);
    };

    requestAnimationFrame(tryScroll);
  }, [location.state, location.pathname]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setStatus({
      loading: true,
    });

    setAlert(null);

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Błąd wysyłania wiadomości.");
      }

      setAlert({
        type: "success",
        message:
          "Wiadomość została wysłana. Odezwiemy się do Ciebie możliwie szybko.",
      });

      setForm({
        name: "",
        email: "",
        company: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      setAlert({
        type: "error",
        message:
          error.message ||
          "Nie udało się wysłać wiadomości. Spróbuj ponownie za chwilę.",
      });
    } finally {
      setStatus({
        loading: false,
      });
    }
  };

  return (
    <section ref={sectionRef} id="scrollToId" className={styles.section} aria-labelledby="contact-title">
      <div className={styles.backdrop} aria-hidden="true"><span className={styles.backdropWord}>POROZMAWIAJMY</span><span className={styles.backdropShape} /></div>
      <div className={styles.inner}>
        <header className={styles.header} data-reveal>
          <div>
            <h1 id="contact-title">Dobry kontakt.<br /><span>Zaczyna się tutaj.</span></h1>
            <p className={styles.description}>Pytanie, pomysł albo coś, co nie działa? Napisz do nas. Po drugiej stronie jest zespół, który tworzy Showly.</p>
          </div>
          <div className={styles.helloNote} aria-hidden="true"><FiMail /><span>Mała wiadomość.</span><strong>Początek<br />dobrej rozmowy.</strong><span className={styles.noteSign}>Do zespołu Showly<FiArrowUpRight /></span></div>
        </header>

        {alert && <AlertBox type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

        <div className={styles.layout}>
          <aside className={styles.side} data-reveal>
            <div className={styles.mailCard}>
              <span className={styles.cardLabel}><FiMail aria-hidden="true" />Bezpośrednio do nas</span>
              <h2>Wolisz po swojemu?</h2>
              <p>Możesz też napisać ze swojej skrzynki.</p>
              <a href="mailto:kontakt@showly.me">kontakt@showly.me<FiArrowUpRight aria-hidden="true" /></a>
              <span className={styles.mailFoot}><FiMapPin aria-hidden="true" />Polska / działamy online</span>
            </div>
            <div className={styles.helpCard}>
              <span className={styles.blockLabel}>W czym możemy pomóc?</span>
              <div className={styles.featureItem}><FiUser aria-hidden="true" /><div><strong>Twój profil</strong><p>Wygląd wizytówki, galeria, usługi i dane kontaktowe.</p></div></div>
              <div className={styles.featureItem}><FiBriefcase aria-hidden="true" /><div><strong>Twoja oferta</strong><p>Jak pokazać to, co robisz, i ułatwić kontakt z klientem.</p></div></div>
              <div className={styles.featureItem}><FiMessageSquare aria-hidden="true" /><div><strong>Twój pomysł</strong><p>Uwagi, pytania i pomysły na rozwój Showly.</p></div></div>
            </div>
          </aside>

          <div className={styles.content} data-reveal style={{ "--reveal-delay": "100ms" }}>
            <div className={styles.chapterHead}><div><span className={styles.chapterLabel}>Twoja wiadomość</span><h2>Zacznijmy od „cześć”.</h2><p>Opowiedz, w czym możemy Ci pomóc.</p></div><span className={styles.formStamp} aria-hidden="true"><FiSend /></span></div>
            <form className={styles.form} onSubmit={handleSubmit} aria-label="Formularz kontaktowy">
              <div className={styles.row}>
                <div className={styles.field}><label htmlFor="name">Imię i nazwisko <span>*</span></label><input id="name" name="name" type="text" autoComplete="name" placeholder="Jak się do Ciebie zwracać?" value={form.name} onChange={handleChange} required /></div>
                <div className={styles.field}><label htmlFor="email">Adres e-mail <span>*</span></label><input id="email" name="email" type="email" autoComplete="email" placeholder="Gdzie możemy odpisać?" value={form.email} onChange={handleChange} required /></div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}><label htmlFor="company">Firma / marka <small>opcjonalnie</small></label><input id="company" name="company" type="text" autoComplete="organization" placeholder="Nazwa Twojej marki" value={form.company} onChange={handleChange} /></div>
                <div className={styles.field}><label htmlFor="subject">Temat <span>*</span></label><input id="subject" name="subject" type="text" placeholder="O czym porozmawiamy?" value={form.subject} onChange={handleChange} required /></div>
              </div>
              <div className={styles.field}><label htmlFor="message">Wiadomość <span>*</span></label><textarea id="message" name="message" rows="6" placeholder="Cześć! Piszę w sprawie…" value={form.message} onChange={handleChange} required /></div>
              <div className={styles.formFooter}><span>* Pola wymagane.<br />Odpowiemy na podany adres e-mail.</span><button type="submit" className={styles.submitButton} disabled={status.loading}><span>{status.loading ? "Wysyłanie…" : "Wyślij wiadomość"}</span><FiArrowUpRight aria-hidden="true" /></button></div>
            </form>
          </div>
        </div>
        <div className={styles.closing}><span>Showly powstaje dzięki ludziom.</span><strong>Twój głos też ma znaczenie.</strong><FiMessageSquare aria-hidden="true" /></div>
      </div>
    </section>
  );
};

export default Contact;
