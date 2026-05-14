import { useState } from "react";
import styles from "./Contact.module.scss";
import AlertBox from "../AlertBox/AlertBox";
import {
  FiMail,
  FiPhone,
  FiMapPin,
  FiSend,
  FiMessageSquare,
  FiUser,
  FiBriefcase,
} from "react-icons/fi";
import { FaFacebookF, FaInstagram, FaXTwitter, FaLinkedinIn } from "react-icons/fa6";

const Contact = () => {
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
    <section className={styles.section}>
      <div className={styles.sectionBackground} aria-hidden="true" />

      <div className={styles.bg} aria-hidden="true">
        <span className={styles.blur1} />
        <span className={styles.blur2} />
        <span className={styles.vignette} />
      </div>

      <div className={styles.inner}>
        {alert && (
          <AlertBox
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        <div className={styles.head}>
          <div className={styles.labelRow}>
            <span className={styles.labelBadge}>Kontakt</span>
            <span className={styles.labelDot} />
            <span className={styles.labelDesc}>Porozmawiajmy o Twoim profilu i koncie</span>
            <span className={styles.labelLine} />
            <span className={styles.pill}>Showly • Wsparcie • Profil • Rezerwacje</span>
          </div>

          <h2 className={styles.heading}>
            Porozmawiajmy o <span className={styles.headingAccent}>Twoim profilu</span> w Showly
          </h2>

          <p className={styles.description}>
            Masz pytanie o działanie aplikacji, wizytówki, rezerwacje albo wdrożenie
            konta? Napisz do nas — odpowiemy konkretnie i bez zbędnego zamieszania.
          </p>
        </div>

        <div className={styles.gridWrap}>
          <div className={styles.infoColumn}>
            <div className={styles.infoCard}>
              <h3 className={styles.cardTitle}>Dane kontaktowe</h3>

              <div className={styles.infoList}>
                <div className={styles.infoRow}>
                  <span className={styles.icon}>
                    <FiMail />
                  </span>
                  <div>
                    <span className={styles.infoLabel}>E-mail</span>
                    <a className={styles.valueLink} href="mailto:kontakt@showly.me">
                      kontakt@showly.me
                    </a>
                  </div>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.icon}>
                    <FiPhone />
                  </span>
                  <div>
                    <span className={styles.infoLabel}>Telefon</span>
                    <a className={styles.valueLink} href="tel:+48123456789">
                      +48 123 456 789
                    </a>
                  </div>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.icon}>
                    <FiMapPin />
                  </span>
                  <div>
                    <span className={styles.infoLabel}>Obszar działania</span>
                    <span className={styles.valueText}>Polska • działamy online</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.infoCard}>
              <h3 className={styles.cardTitle}>W czym pomagamy?</h3>

              <div className={styles.featureList}>
                <div className={styles.featureItem}>
                  <span className={styles.featureIcon}>
                    <FiUser />
                  </span>
                  <div>
                    <strong>Konfiguracja profilu</strong>
                    <p>Pomagamy w ustawieniu wizytówki, galerii, usług i danych kontaktowych.</p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <span className={styles.featureIcon}>
                    <FiBriefcase />
                  </span>
                  <div>
                    <strong>Wdrożenie dla usługodawców</strong>
                    <p>Doradzimy, jak najlepiej pokazać ofertę i uprościć kontakt z klientem.</p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <span className={styles.featureIcon}>
                    <FiMessageSquare />
                  </span>
                  <div>
                    <strong>Wsparcie i feedback</strong>
                    <p>Zbieramy uwagi użytkowników i stale rozwijamy UX całej aplikacji.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.infoCard}>
              <h3 className={styles.cardTitle}>Social media</h3>

              <div className={styles.socials}>
                <button type="button" className={styles.socialBtn} disabled title="Wkrótce">
                  <FaFacebookF />
                </button>
                <button type="button" className={styles.socialBtn} disabled title="Wkrótce">
                  <FaInstagram />
                </button>
                <button type="button" className={styles.socialBtn} disabled title="Wkrótce">
                  <FaXTwitter />
                </button>
                <button type="button" className={styles.socialBtn} disabled title="Wkrótce">
                  <FaLinkedinIn />
                </button>
              </div>

              <p className={styles.socialNote}>
                Profile społecznościowe uruchomimy wkrótce — teraz skupiamy się na dopięciu produktu.
              </p>
            </div>
          </div>

          <div className={styles.formCard}>
            <h3 className={styles.cardTitle}>Napisz wiadomość</h3>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="name">Imię i nazwisko</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Np. Jan Kowalski"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="email">Adres e-mail</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Np. jan@email.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="company">Firma / marka</label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    placeholder="Np. Studio Fryzur Glamour"
                    value={form.company}
                    onChange={handleChange}
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="subject">Temat</label>
                  <input
                    id="subject"
                    name="subject"
                    type="text"
                    placeholder="Np. Pytanie o profil premium"
                    value={form.subject}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="message">Wiadomość</label>
                <textarea
                  id="message"
                  name="message"
                  rows="7"
                  placeholder="Opisz, w czym możemy pomóc..."
                  value={form.message}
                  onChange={handleChange}
                  required
                />
              </div>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={status.loading}
              >
                <FiSend />
                {status.loading ? "Wysyłanie..." : "Wyślij wiadomość"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;