import { useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged,
  signOut,
  updateProfile,
  signInWithPopup,
} from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
import styles from './Register.module.scss';
import Hero from '../Hero/Hero';
import Footer from '../Footer/Footer';
import axios from 'axios';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import LoadingButton from '../ui/LoadingButton/LoadingButton';
import { FiUser, FiMail, FiLock, FiArrowRight, FiZap } from 'react-icons/fi';

const Register = ({ user, setUser, setRefreshTrigger }) => {
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const [isRegistering, setIsRegistering] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const scrollTo = location.state?.scrollToId;
    if (!scrollTo) return;

    const timeout = setTimeout(() => {
      const tryScroll = () => {
        const el = document.getElementById(scrollTo);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage('');
        setError('');
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u && !u.emailVerified) {
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

    if (form.password !== form.confirmPassword) {
      setError('Hasła nie są identyczne.');
      return;
    }

    setError('');
    setMessage('');
    setIsRegistering(true);

    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/users/check-email?email=${encodeURIComponent(form.email)}`
      );

      if (res.data.exists) {
        setError(
          `Ten e-mail jest już powiązany z kontem (${res.data.provider === 'google' ? 'Google' : 'e-mail + hasło'}). Zaloguj się tą metodą.`
        );
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const firebaseUser = userCredential.user;

      await updateProfile(firebaseUser, { displayName: form.name || '' });
      await sendEmailVerification(firebaseUser);

      setEmailSent(true);
      setMessage(
        'Na Twój adres e-mail został wysłany link aktywacyjny. Kliknij w niego, aby aktywować konto.'
      );
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Ten e-mail jest już używany w Firebase.');
      } else {
        setError('Błąd podczas rejestracji.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isRegistering || isGoogleLoading) return;

    setError('');
    setMessage('');
    setIsGoogleLoading(true);
    sessionStorage.setItem('authFlow', '1');

    try {
      const provider = googleProvider;
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({ prompt: 'consent' });

      const result = await signInWithPopup(auth, provider);
      const gUser = result.user;

      const email = gUser.email ?? gUser.providerData?.[0]?.email ?? null;
      const uid = gUser.uid;

      if (!email || !uid) {
        setError('Nie udało się pobrać danych użytkownika (brak e-maila lub UID).');
        sessionStorage.removeItem('authFlow');
        return;
      }

      try {
        await axios.post(`${process.env.REACT_APP_API_URL}/api/users`, {
          email,
          name: gUser.displayName || '',
          firebaseUid: uid,
          provider: 'google',
        });
      } catch (err) {
        if (err.response?.status === 409) {
          setError(
            'Ten e-mail jest już przypisany do innego konta. Zaloguj się metodą, którą wcześniej użyłeś.'
          );
          sessionStorage.removeItem('authFlow');
          return;
        }
        throw err;
      }

      localStorage.setItem('showlyUser', JSON.stringify({ email, uid }));
      setUser({ email, uid });
      setRefreshTrigger(Date.now());

      setMessage('Pomyślnie zalogowano przez Google. Przekierowuję…');
      setTimeout(() => {
        sessionStorage.removeItem('authFlow');
        navigate('/', { replace: true });
      }, 1500);
    } catch (err) {
      console.error('❌ Błąd podczas logowania przez Google:', err);
      if (err.code === 'auth/account-exists-with-different-credential') {
        const email = err.customData?.email;
        setError(
          `Konto o adresie ${email} zostało już utworzone inną metodą. Zaloguj się tą metodą.`
        );
      } else {
        setError('Błąd podczas logowania przez Google.');
      }
      sessionStorage.removeItem('authFlow');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const isBusy = isRegistering || isGoogleLoading;

  return (
    <>
      <Hero user={user} setUser={setUser} />

      <section className={styles.authSection}>
        <div id="registerBox" className={styles.registerContainer}>
          <div className={`${styles.glow} ${styles.glowOne}`} />
          <div className={`${styles.glow} ${styles.glowTwo}`} />

          <div className={styles.card}>
            <div className={styles.topBadge}>
              <FiZap />
              <span>Dołącz do Showly</span>
            </div>

            <h2 className={styles.title}>Utwórz swoje konto</h2>

            <p className={styles.subtitle}>
              Załóż konto i zacznij budować swoją wizytówkę online, zbierać opinie,
              wiadomości i rezerwacje w jednym miejscu.
            </p>

            {!emailSent ? (
              <>
                <form onSubmit={handleSubmit} className={styles.form}>
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
                </form>

                <div className={styles.orSeparator}>
                  <span>lub kontynuuj przez</span>
                </div>

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
                    <span className={styles.buttonLabel}>Kontynuuj przez Google</span>
                  </span>
                </LoadingButton>
              </>
            ) : (
              <div className={styles.successLarge}>
                Rejestracja zakończona. Sprawdź swoją skrzynkę i kliknij link
                aktywacyjny, aby aktywować konto. Następnie możesz się zalogować.
              </div>
            )}

            {error && <div className={styles.error}>{error}</div>}
            {message && <div className={styles.success}>{message}</div>}

            <div className={styles.bottomBox}>
              <p className={styles.loginLink}>Masz już konto?</p>

              <Link
                to="/login"
                state={{ scrollToId: 'loginBox' }}
                className={styles.linkButton}
              >
                Przejdź do logowania
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default Register;