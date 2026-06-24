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
  FiShield,
  FiLink,
  FiMessageCircle,
  FiCalendar,
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

      <section className={styles.authSection}>
        <div id="registerBox" className={styles.registerContainer}>
          <div className={styles.authLayout}>
            <aside className={styles.side}>
              <span className={styles.overline}>Showly Account</span>

              <h1 className={styles.heading}>
                Stwórz konto i pokaż ofertę <span>w jednym linku.</span>
              </h1>

              <p className={styles.description}>
                Załóż konto, utwórz wizytówkę i zbierz w jednym miejscu opis,
                zdjęcia, cennik, opinie, wiadomości oraz rezerwacje.
              </p>

              <div className={styles.metaRow}>
                <div className={styles.metaCard}>
                  <strong>1</strong>
                  <span>konto do profilu i kontaktu</span>
                </div>

                <div className={styles.metaCard}>
                  <strong>0 zł</strong>
                  <span>start bez opłat</span>
                </div>

                <div className={styles.metaCard}>
                  <strong>mobile</strong>
                  <span>profil gotowy na telefon</span>
                </div>
              </div>

              <div className={styles.infoBox}>
                <span>Po rejestracji możesz:</span>

                <div className={styles.featureList}>
                  <p>
                    <FiCheckCircle />
                    utworzyć publiczną wizytówkę Showly,
                  </p>

                  <p>
                    <FiLink />
                    udostępniać jeden link klientom,
                  </p>

                  <p>
                    <FiMessageCircle />
                    odbierać wiadomości i zapytania,
                  </p>

                  <p>
                    <FiCalendar />
                    korzystać z rezerwacji lub zapytań,
                  </p>

                  <p>
                    <FiShield />
                    zarządzać kontem i bezpieczeństwem.
                  </p>
                </div>
              </div>
            </aside>

            <div className={styles.card}>
              <div className={styles.topBadge}>
                <FiZap />
                <span>Dołącz do Showly</span>
              </div>

              <div className={styles.cardHeader}>
                <h2 className={styles.title}>Utwórz konto w Showly</h2>

                <p className={styles.subtitle}>
                  Wypełnij dane albo kontynuuj przez Google. Konto pozwoli Ci
                  stworzyć profil, zarządzać ofertą i odbierać kontakt od klientów.
                </p>
              </div>

              {!emailSent ? (
                <>
                  <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGrid}>
                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Imię i nazwisko</label>

                        <div className={styles.inputWrap}>
                          <FiUser className={styles.inputIcon} />

                          <input
                            type="text"
                            name="name"
                            placeholder="Np. Jan Kowalski"
                            value={form.name}
                            onChange={handleChange}
                            required
                            disabled={isBusy}
                          />
                        </div>
                      </div>

                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Adres e-mail</label>

                        <div className={styles.inputWrap}>
                          <FiMail className={styles.inputIcon} />

                          <input
                            type="email"
                            name="email"
                            placeholder="twoj@email.com"
                            value={form.email}
                            onChange={handleChange}
                            required
                            disabled={isBusy}
                          />
                        </div>
                      </div>

                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Hasło</label>

                        <div className={styles.inputWrap}>
                          <FiLock className={styles.inputIcon} />

                          <input
                            type="password"
                            name="password"
                            placeholder="Ustaw swoje hasło"
                            value={form.password}
                            onChange={handleChange}
                            required
                            disabled={isBusy}
                          />
                        </div>
                      </div>

                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Powtórz hasło</label>

                        <div className={styles.inputWrap}>
                          <FiLock className={styles.inputIcon} />

                          <input
                            type="password"
                            name="confirmPassword"
                            placeholder="Powtórz hasło"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            required
                            disabled={isBusy}
                          />
                        </div>
                      </div>
                    </div>

                    <div className={styles.buttonGrid}>
                      <LoadingButton
                        type="submit"
                        isLoading={isRegistering}
                        disabled={isBusy}
                        className={styles.submitButton}
                      >
                        <span className={styles.buttonInner}>
                          <span className={styles.buttonLabel}>Zarejestruj się</span>

                          {!isRegistering && (
                            <span className={styles.buttonIcon}>
                              <FiArrowRight />
                            </span>
                          )}
                        </span>
                      </LoadingButton>

                      <LoadingButton
                        type="button"
                        onClick={handleGoogleLogin}
                        isLoading={isGoogleLoading}
                        disabled={isBusy}
                        className={styles.googleButton}
                      >
                        <span className={styles.buttonInner}>
                          <span className={styles.googleIconWrap}>
                            <img src="/images/icons/google.png" alt="Google" />
                          </span>

                          <span className={styles.buttonLabel}>KONTYNUUJ PRZEZ GOOGLE</span>
                        </span>
                      </LoadingButton>
                    </div>
                  </form>
                </>
              ) : (
                <div className={styles.successLarge}>
                  <strong>Sprawdź skrzynkę e-mail</strong>

                  <p>
                    Rejestracja zakończona. Kliknij link aktywacyjny, aby
                    aktywować konto. Następnie możesz przejść do logowania.
                  </p>
                </div>
              )}

              {(error || (message && !emailSent)) && (
                <div className={styles.statusStack}>
                  {error && <div className={styles.error}>{error}</div>}
                  {message && !emailSent && (
                    <div className={styles.success}>{message}</div>
                  )}
                </div>
              )}

              <div className={styles.bottomBox}>
                <div>
                  <p className={styles.loginLink}>Masz już konto?</p>

                  <span className={styles.loginHint}>
                    Zaloguj się i wróć do swojego profilu Showly.
                  </span>
                </div>

                <Link
                  to="/login"
                  state={{ scrollToId: "loginBox" }}
                  className={styles.linkButton}
                >
                  <FiArrowRight />
                  Przejdź do logowania
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default Register;