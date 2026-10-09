import { useState, useEffect, useCallback } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "../../firebase";
import { useNavigate, Link, useLocation } from "react-router-dom";
import styles from "./Login.module.scss";
import Footer from "../Footer/Footer";
import AlertBox from "../AlertBox/AlertBox";
import axios from "axios";
import LoadingButton from "../ui/LoadingButton/LoadingButton";
import useScrollReveal from "../../utils/useScrollReveal";
import {
  FiMail,
  FiLock,
  FiArrowRight,
  FiMessageCircle,
  FiCalendar,
  FiUserPlus,
  FiCheckCircle,
} from "react-icons/fi";

const Login = ({ setUser, setRefreshTrigger }) => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [isLoggingEmail, setIsLoggingEmail] = useState(false);
  const [isLoggingGoogle, setIsLoggingGoogle] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const revealRef = useScrollReveal();

  useEffect(() => {
    return () => sessionStorage.removeItem("authFlow");
  }, []);

  useEffect(() => {
    const scrollToId = location.state?.scrollToId;
    if (!scrollToId) return;

    const timeout = setTimeout(() => {
      const el = document.getElementById(scrollToId);

      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 120);

    return () => clearTimeout(timeout);
  }, [location]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLoggingEmail || isLoggingGoogle || isResettingPassword) return;

    setError("");
    setMessage("");
    setIsLoggingEmail(true);

    sessionStorage.setItem("authFlow", "1");

    try {
      const methods = await fetchSignInMethodsForEmail(auth, form.email);

      if (methods.includes("google.com")) {
        setError(
          "Ten e-mail jest powiązany z kontem Google. Zaloguj się przez Google."
        );
        sessionStorage.removeItem("authFlow");
        return;
      }

      await signInWithEmailAndPassword(auth, form.email, form.password);
      await auth.currentUser.reload();

      const refreshedUser = auth.currentUser;

      if (!refreshedUser?.emailVerified) {
        await sendEmailVerification(refreshedUser);
        await signOut(auth);
        setError(
          "Zweryfikuj swój adres e-mail. Wysłaliśmy ponownie link aktywacyjny."
        );
        sessionStorage.removeItem("authFlow");
        return;
      }

      const email = refreshedUser.email;
      const uid = refreshedUser.uid;

      if (!email || !uid) {
        setError("Nie udało się pobrać danych logowania (e-mail lub UID).");
        sessionStorage.removeItem("authFlow");
        return;
      }

      const idToken = await refreshedUser.getIdToken();

      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/users`,
        {
          email,
          name: refreshedUser.displayName || "",
          firebaseUid: uid,
          provider: "password",
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      localStorage.setItem("showlyUser", JSON.stringify({ email, uid }));
      setUser({ email, uid });
      setRefreshTrigger(Date.now());

      setMessage("Pomyślnie zalogowano. Przekierowuję…");

      setTimeout(() => {
        sessionStorage.removeItem("authFlow");
        navigate("/", { replace: true });
      }, 1500);
    } catch (err) {
      console.error(err);

      if (err.code === "auth/user-not-found") {
        setError("Konto o podanym e-mailu nie istnieje.");
      } else if (err.code === "auth/wrong-password") {
        setError("Nieprawidłowe hasło.");
      } else if (err.code === "auth/invalid-credential") {
        setError("Nieprawidłowy e-mail lub hasło.");
      } else {
        setError("Błąd logowania.");
      }

      sessionStorage.removeItem("authFlow");
    } finally {
      setIsLoggingEmail(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isLoggingEmail || isLoggingGoogle || isResettingPassword) return;

    setError("");
    setMessage("");
    setIsLoggingGoogle(true);
    sessionStorage.setItem("authFlow", "1");

    try {
      const provider = googleProvider;
      provider.addScope("email");
      provider.addScope("profile");
      provider.setCustomParameters({ prompt: "consent" });

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const email = user.email ?? user.providerData?.[0]?.email ?? null;
      const uid = user.uid;

      if (!email || !uid) {
        setError("Nie udało się pobrać danych użytkownika (brak e-maila lub UID).");
        sessionStorage.removeItem("authFlow");
        return;
      }

      const idToken = await user.getIdToken();

      try {
        await axios.post(
          `${process.env.REACT_APP_API_URL}/api/users`,
          {
            email,
            name: user.displayName || "",
            firebaseUid: uid,
            provider: "google",
          },
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );
      } catch (err) {
        if (err.response?.status === 409) {
          setError(
            "Ten e-mail jest już przypisany do innego konta. Zaloguj się metodą, której wcześniej użyłeś."
          );
          sessionStorage.removeItem("authFlow");
          return;
        }

        throw err;
      }

      localStorage.setItem("showlyUser", JSON.stringify({ email, uid }));
      setUser({ email, uid });
      setRefreshTrigger(Date.now());

      setMessage("Pomyślnie zalogowano przez Google. Przekierowuję…");

      setTimeout(() => {
        sessionStorage.removeItem("authFlow");
        navigate("/", { replace: true });
      }, 1500);
    } catch (err) {
      console.error("❌ Błąd podczas logowania przez Google:", err);

      if (err.code === "auth/account-exists-with-different-credential") {
        const email = err.customData?.email;
        setError(
          `Konto o adresie ${email} zostało już utworzone inną metodą. Zaloguj się tą metodą.`
        );
      } else {
        setError("Błąd podczas logowania przez Google.");
      }

      sessionStorage.removeItem("authFlow");
    } finally {
      setIsLoggingGoogle(false);
    }
  };

  const handlePasswordReset = async () => {
    if (isLoggingEmail || isLoggingGoogle || isResettingPassword) return;

    setError("");
    setMessage("");

    const email = form.email.trim();

    if (!email) {
      setError("Najpierw wpisz swój adres e-mail, aby odzyskać hasło.");
      return;
    }

    setIsResettingPassword(true);

    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);

      if (methods.includes("google.com") && !methods.includes("password")) {
        setError(
          "Ten e-mail jest powiązany wyłącznie z logowaniem przez Google. Użyj przycisku logowania przez Google."
        );
        return;
      }

      await sendPasswordResetEmail(auth, email);

      setMessage("Wysłaliśmy link do resetu hasła na podany adres e-mail.");
    } catch (err) {
      console.error("❌ Błąd resetu hasła:", err);

      if (err.code === "auth/user-not-found") {
        setError("Nie znaleziono konta przypisanego do tego adresu e-mail.");
      } else if (err.code === "auth/invalid-email") {
        setError("Podany adres e-mail jest nieprawidłowy.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Wykonano zbyt wiele prób. Spróbuj ponownie za chwilę.");
      } else {
        setError("Nie udało się wysłać wiadomości resetującej hasło.");
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  const isBusy = isLoggingEmail || isLoggingGoogle || isResettingPassword;
  const dismissAlert = useCallback(() => {
    setError("");
    setMessage("");
  }, []);
  const notice = error ? { type: "error", message: error }
    : message ? { type: "success", message }
      : isBusy ? { type: "info", message: isResettingPassword
        ? "Wysyłamy link do resetu hasła…"
        : isLoggingGoogle ? "Dokończ logowanie w oknie Google…" : "Logujemy Cię do Showly…" }
        : null;

  return (
    <>

      <section className={styles.section} aria-labelledby="login-heading" ref={revealRef}>
        <div className={styles.background} aria-hidden="true"><span>WRACAJ.</span></div>
        <div className={styles.inner} id="loginBox">
          <div className={styles.layout}>
            <div className={styles.side} data-reveal>
              <h1 className={styles.heading} id="login-heading">Dobrze Cię<br /><span>widzieć.</span></h1>
              <p className={styles.description}>Twoje pomysły, ludzie i plany czekają. Zaloguj się i wróć do tego, co dla Ciebie ważne.</p>
              <aside className={styles.workspaceCard} aria-labelledby="login-workspace-title">
                <h2 id="login-workspace-title">Jedno konto. Twój świat.</h2>
                <div className={styles.featureList}>
                  <article className={styles.featureTile}><span className={styles.tileNumber} aria-hidden="true">01</span><span className={styles.featureArt} aria-hidden="true"><FiCheckCircle /></span><p><strong>Profil i ogłoszenia</strong><span>Twoja oferta. Twój pomysł. Twoje miejsce.</span></p></article>
                  <article className={styles.featureTile}><span className={styles.tileNumber} aria-hidden="true">02</span><span className={styles.featureArt} aria-hidden="true"><FiMessageCircle /></span><p><strong>Twoje rozmowy</strong><span>Dobre rzeczy zaczynają się od „cześć”.</span></p></article>
                  <article className={styles.featureTile}><span className={styles.tileNumber} aria-hidden="true">03</span><span className={styles.featureArt} aria-hidden="true"><FiCalendar /></span><p><strong>Plany i terminy</strong><span>Zrób miejsce na kolejne możliwości.</span></p></article>
                </div>
              </aside>
            </div>
            <div className={styles.content} data-reveal>
              <div className={styles.chapterHead}>
                <h2 className={styles.loginTitle}>Zaloguj się.</h2>
                <p className={styles.subtitle}>Wpisz dane swojego konta lub kontynuuj przez Google.</p>
              </div>

              <div className={styles.loginPanel}>
                <form onSubmit={handleSubmit} className={styles.form}>
                  <div className={styles.formGrid}>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel} htmlFor="login-email">Adres e-mail</label>

                      <div className={styles.inputWrap}>
                        <FiMail className={styles.inputIcon} />

                        <input
                          id="login-email"
                          name="email"
                          autoComplete="email"
                          type="email"
                          placeholder="twoj@email.com"
                          required
                          value={form.email}
                          onChange={handleChange}
                          disabled={isBusy}
                        />
                      </div>
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel} htmlFor="login-password">Hasło</label>

                      <div className={styles.inputWrap}>
                        <FiLock className={styles.inputIcon} />

                        <input
                          id="login-password"
                          name="password"
                          autoComplete="current-password"
                          type="password"
                          placeholder="Wpisz swoje hasło"
                          required
                          value={form.password}
                          onChange={handleChange}
                          disabled={isBusy}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.actionsRow}>
                    <button
                      type="button"
                      className={styles.forgotPassword}
                      onClick={handlePasswordReset}
                      disabled={isBusy}
                    >
                      {isResettingPassword
                        ? "Wysyłanie linku..."
                        : "Nie pamiętasz hasła?"}
                    </button>
                  </div>

                  <div className={styles.buttonGrid}>
                    <LoadingButton
                      type="submit"
                      isLoading={isLoggingEmail}
                      disabled={isBusy}
                      className={styles.submitButton}
                    >
                      <span className={styles.buttonInner}>
                        <span className={styles.buttonLabel}>Zaloguj się</span>

                        {!isLoggingEmail && (
                          <span className={styles.buttonIcon}>
                            <FiArrowRight />
                          </span>
                        )}
                      </span>
                    </LoadingButton>

                    <div className={styles.divider}><span>lub</span></div>

                    <LoadingButton
                      type="button"
                      onClick={handleGoogleLogin}
                      isLoading={isLoggingGoogle}
                      disabled={isBusy}
                      className={styles.googleButton}
                    >
                      <span className={styles.buttonInner}>
                        <span className={styles.googleIconWrap}>
                          <img src="/images/icons/google.png" alt="" />
                        </span>

                        <span className={styles.buttonLabel}>Kontynuuj przez Google</span>
                      </span>
                    </LoadingButton>
                  </div>
                </form>

                <div className={styles.bottomBox}>
                  <div>
                    <p className={styles.registerLink}>Nie masz jeszcze konta?</p>

                    <span className={styles.registerHint}>
                      Dołącz do Showly i znajdź swoje możliwości.
                    </span>
                  </div>

                  <Link
                    to="/register"
                    state={{ scrollToId: "registerBox" }}
                    className={styles.linkButton}
                  >
                    <FiUserPlus />
                    Załóż konto
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {notice && <AlertBox type={notice.type} message={notice.message} onClose={isBusy ? undefined : dismissAlert} />}
      <Footer />
    </>
  );
};

export default Login;
