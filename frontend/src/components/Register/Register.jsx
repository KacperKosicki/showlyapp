import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged,
  signOut,
  updateProfile,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "../../firebase";
import styles from "./Register.module.scss";
import Hero from "../Hero/Hero";
import Footer from "../Footer/Footer";
import axios from "axios";
import { useLocation, useNavigate, Link } from "react-router-dom";
import LoadingButton from "../ui/LoadingButton/LoadingButton";
import {
  FiUser,
  FiMail,
  FiLock,
  FiArrowRight,
  FiZap,
  FiCheckCircle,
} from "react-icons/fi";

const API = process.env.REACT_APP_API_URL;

const Register = ({ user, setUser, setRefreshTrigger }) => {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const [isRegistering, setIsRegistering] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const syncUserWithMongo = async (firebaseUser, provider) => {
    if (!firebaseUser?.email || !firebaseUser?.uid) {
      throw new Error("Brak danych użytkownika Firebase.");
    }

    const idToken = await firebaseUser.getIdToken(true);

    return axios.post(
      `${API}/api/users`,
      {
        email: firebaseUser.email,
        name: firebaseUser.displayName || "",
        provider,
      },
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }
    );
  };

  useEffect(() => {
    const scrollTo = location.state?.scrollToId;
    if (!scrollTo) return;

    const timeout = setTimeout(() => {
      const tryScroll = () => {
        const el = document.getElementById(scrollTo);

        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          window.history.replaceState({}, document.title, location.pathname);
        } else {
          requestAnimationFrame(tryScroll);
        }
      };

      requestAnimationFrame(tryScroll);
    }, 100);

    return () => clearTimeout(timeout);
  }, [location.state, location.pathname]);

  useEffect(() => {
    if (!message && !error) return;

    const timer = setTimeout(() => {
      setMessage("");
      setError("");
    }, 6000);

    return () => clearTimeout(timer);
  }, [message, error]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      const authFlow = sessionStorage.getItem("authFlow");

      if (authFlow) return;

      if (
        u &&
        !u.emailVerified &&
        !u.providerData?.some((p) => p.providerId === "google.com")
      ) {
        await signOut(auth);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isRegistering || isGoogleLoading) return;

    const email = form.email.trim().toLowerCase();
    const name = form.name.trim();

    if (form.password !== form.confirmPassword) {
      setError("Hasła nie są identyczne.");
      return;
    }

    setError("");
    setMessage("");
    setIsRegistering(true);
    sessionStorage.setItem("authFlow", "1");

    try {
      const res = await axios.get(
        `${API}/api/users/check-email?email=${encodeURIComponent(email)}`
      );

      if (res.data.exists) {
        setError(
          `Ten e-mail jest już powiązany z kontem ${res.data.provider === "google" ? "Google" : "e-mail + hasło"
          }. Zaloguj się tą metodą.`
        );
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        form.password
      );

      const firebaseUser = userCredential.user;

      await updateProfile(firebaseUser, { displayName: name || "" });
      await firebaseUser.reload();

      const refreshedUser = auth.currentUser || firebaseUser;

      await sendEmailVerification(refreshedUser);
      await syncUserWithMongo(refreshedUser, "password");

      await signOut(auth);

      setEmailSent(true);
      setMessage(
        "Na Twój adres e-mail został wysłany link aktywacyjny. Kliknij w niego, aby aktywować konto. Następnie możesz się zalogować."
      );
    } catch (err) {
      console.error("❌ Błąd rejestracji:", err);

      if (err.code === "auth/email-already-in-use") {
        setError("Ten e-mail jest już używany w Firebase.");
      } else if (err.code === "auth/invalid-email") {
        setError("Podany adres e-mail jest nieprawidłowy.");
      } else if (err.code === "auth/weak-password") {
        setError("Hasło jest zbyt słabe. Użyj minimum 6 znaków.");
      } else if (err.response?.status === 409) {
        setError("Ten e-mail jest już przypisany do innego konta.");
      } else {
        setError(err.response?.data?.message || "Błąd podczas rejestracji.");
      }
    } finally {
      sessionStorage.removeItem("authFlow");
      setIsRegistering(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isRegistering || isGoogleLoading) return;

    setError("");
    setMessage("");
    setIsGoogleLoading(true);
    sessionStorage.setItem("authFlow", "1");

    try {
      const provider = googleProvider;
      provider.addScope("email");
      provider.addScope("profile");
      provider.setCustomParameters({ prompt: "consent" });

      const result = await signInWithPopup(auth, provider);
      const gUser = result.user;

      const email = gUser.email ?? gUser.providerData?.[0]?.email ?? null;
      const uid = gUser.uid;

      if (!email || !uid) {
        setError("Nie udało się pobrać danych użytkownika (brak e-maila lub UID).");
        return;
      }

      try {
        await syncUserWithMongo(gUser, "google");
      } catch (err) {
        if (err.response?.status === 409) {
          setError(
            "Ten e-mail jest już przypisany do innego konta. Zaloguj się metodą, którą wcześniej użyłeś."
          );
          await signOut(auth);
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
      }, 1200);
    } catch (err) {
      console.error("❌ Błąd podczas logowania przez Google:", err);

      if (err.code === "auth/account-exists-with-different-credential") {
        const email = err.customData?.email;
        setError(
          `Konto o adresie ${email} zostało już utworzone inną metodą. Zaloguj się tą metodą.`
        );
      } else if (err.code === "auth/popup-closed-by-user") {
        setError("Okno logowania zostało zamknięte.");
      } else {
        setError(err.response?.data?.message || "Błąd podczas logowania przez Google.");
      }
    } finally {
      sessionStorage.removeItem("authFlow");
      setIsGoogleLoading(false);
    }
  };

  const isBusy = isRegistering || isGoogleLoading;

  return (
    <>
      <Hero user={user} setUser={setUser} />

      <section className={styles.section} aria-labelledby="register-heading">
        <div id="registerBox" className={styles.inner}>
          <header className={styles.intro}>
            <h1 id="register-heading" className={styles.heading}>
              Twoja oferta.<br /><span>Twój dobry start.</span>
            </h1>
            <p className={styles.description}>
              Zacznij od konta. Potem dodaj ofertę, zdjęcia i pokaż klientom swój profil.
            </p>
          </header>

          <div className={styles.card}>
            {emailSent ? (
              <div className={styles.activation} role="status">
                <span className={styles.activationIcon}><FiCheckCircle aria-hidden="true" /></span>
                <span className={styles.eyebrow}>Jeszcze jeden krok</span>
                <h2>Sprawdź swoją skrzynkę</h2>
                <p>Link aktywacyjny wysłaliśmy na <strong>{form.email.trim().toLowerCase()}</strong>.</p>
                <ol className={styles.nextSteps}>
                  <li>Otwórz wiadomość od Showly i kliknij link aktywacyjny.</li>
                  <li>Zaloguj się i zacznij tworzyć swój profil.</li>
                </ol>
                <p className={styles.hint}>Nie widzisz wiadomości? Sprawdź folder spam.</p>
                <Link to="/login" state={{ scrollToId: "loginBox" }} className={styles.primaryLink}>
                  Przejdź do logowania <FiArrowRight aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <>
                <div className={styles.cardHeader}>
                  <div>
                    <span className={styles.eyebrow}>Konto w Showly</span>
                    <h2>Stwórz swoje konto</h2>
                  </div>
                  <span className={styles.headerIcon} aria-hidden="true"><FiUser /></span>
                </div>

                <div className={styles.cardBody}>
                  <LoadingButton
                    type="button"
                    onClick={handleGoogleLogin}
                    isLoading={isGoogleLoading}
                    disabled={isBusy}
                    className={styles.googleButton}
                  >
                    <span className={styles.googleIcon}><img src="/images/icons/google.png" alt="" /></span>
                    Kontynuuj przez Google
                  </LoadingButton>

                  <div className={styles.divider}><span>lub użyj adresu e-mail</span></div>

                  <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGrid}>
                      <div className={styles.inputGroup}>
                        <label htmlFor="register-name">Imię i nazwisko</label>
                        <div className={styles.inputWrap}>
                          <FiUser aria-hidden="true" />
                          <input id="register-name" type="text" name="name" autoComplete="name"
                            placeholder="Jan Kowalski" value={form.name} onChange={handleChange}
                            required disabled={isBusy} />
                        </div>
                      </div>
                      <div className={styles.inputGroup}>
                        <label htmlFor="register-email">Adres e-mail</label>
                        <div className={styles.inputWrap}>
                          <FiMail aria-hidden="true" />
                          <input id="register-email" type="email" name="email" autoComplete="email"
                            placeholder="twoj@email.com" value={form.email} onChange={handleChange}
                            required disabled={isBusy} />
                        </div>
                      </div>
                      <div className={styles.inputGroup}>
                        <label htmlFor="register-password">Hasło</label>
                        <div className={styles.inputWrap}>
                          <FiLock aria-hidden="true" />
                          <input id="register-password" type="password" name="password" autoComplete="new-password"
                            placeholder="Utwórz hasło" value={form.password} onChange={handleChange}
                            minLength={6} aria-describedby="register-password-hint" required disabled={isBusy} />
                        </div>
                        <p id="register-password-hint" className={styles.fieldHint}>Co najmniej 6 znaków.</p>
                      </div>
                      <div className={styles.inputGroup}>
                        <label htmlFor="register-confirm-password">Powtórz hasło</label>
                        <div className={styles.inputWrap}>
                          <FiLock aria-hidden="true" />
                          <input id="register-confirm-password" type="password" name="confirmPassword" autoComplete="new-password"
                            placeholder="Wpisz hasło ponownie" value={form.confirmPassword} onChange={handleChange}
                            minLength={6} required disabled={isBusy} />
                        </div>
                      </div>
                    </div>

                    {(error || message) && (
                      <div className={styles.statusStack}>
                        {error && <div className={styles.error} role="alert">{error}</div>}
                        {message && <div className={styles.success} role="status">{message}</div>}
                      </div>
                    )}

                    <LoadingButton type="submit" isLoading={isRegistering} disabled={isBusy} className={styles.submitButton}>
                      <span className={styles.buttonInner}>Utwórz konto <FiArrowRight aria-hidden="true" /></span>
                    </LoadingButton>
                    <p className={styles.hint}>Wyślemy Ci e-mail z linkiem do aktywacji konta.</p>
                  </form>
                </div>

                <div className={styles.cardFooter}>
                  <span>Masz już konto?</span>
                  <Link to="/login" state={{ scrollToId: "loginBox" }}>
                    Zaloguj się <FiArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default Register;
