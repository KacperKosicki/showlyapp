import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Login.module.scss';
import Hero from '../Hero/Hero';
import Footer from '../Footer/Footer';
import axios from 'axios';
import LoadingButton from '../ui/LoadingButton/LoadingButton';

const Login = ({ setUser, setRefreshTrigger }) => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // 🔥 loadery
  const [isLoggingEmail, setIsLoggingEmail] = useState(false);
  const [isLoggingGoogle, setIsLoggingGoogle] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    return () => sessionStorage.removeItem('authFlow');
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLoggingEmail || isLoggingGoogle || isResettingPassword) return;

    setError('');
    setMessage('');
    setIsLoggingEmail(true);

    sessionStorage.setItem('authFlow', '1');

    try {
      const methods = await fetchSignInMethodsForEmail(auth, form.email);

      if (methods.includes('google.com')) {
        setError('Ten e-mail jest powiązany z kontem Google. Zaloguj się przez Google.');
        sessionStorage.removeItem('authFlow');
        return;
      }

      await signInWithEmailAndPassword(auth, form.email, form.password);
      await auth.currentUser.reload();

      const refreshedUser = auth.currentUser;

      if (!refreshedUser?.emailVerified) {
        await sendEmailVerification(refreshedUser);
        await signOut(auth);
        setError('Zweryfikuj swój adres e-mail. Wysłaliśmy ponownie link aktywacyjny.');
        sessionStorage.removeItem('authFlow');
        return;
      }

      const email = refreshedUser.email;
      const uid = refreshedUser.uid;

      if (!email || !uid) {
        setError('Nie udało się pobrać danych logowania (e-mail lub UID).');
        sessionStorage.removeItem('authFlow');
        return;
      }

      const idToken = await refreshedUser.getIdToken();

      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/users`,
        {
          email,
          name: refreshedUser.displayName || '',
          firebaseUid: uid,
          provider: 'password',
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      localStorage.setItem('showlyUser', JSON.stringify({ email, uid }));
      setUser({ email, uid });
      setRefreshTrigger(Date.now());

      setMessage('Pomyślnie zalogowano. Przekierowuję…');

      setTimeout(() => {
        sessionStorage.removeItem('authFlow');
        navigate('/', { replace: true });
      }, 1500);
    } catch (err) {
      console.error(err);

      if (err.code === 'auth/user-not-found') {
        setError('Konto o podanym e-mailu nie istnieje.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Nieprawidłowe hasło.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Nieprawidłowy e-mail lub hasło.');
      } else {
        setError('Błąd logowania.');
      }

      sessionStorage.removeItem('authFlow');
    } finally {
      setIsLoggingEmail(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isLoggingEmail || isLoggingGoogle || isResettingPassword) return;

    setError('');
    setMessage('');
    setIsLoggingGoogle(true);
    sessionStorage.setItem('authFlow', '1');

    try {
      const provider = googleProvider;
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({ prompt: 'consent' });

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const email = user.email ?? user.providerData?.[0]?.email ?? null;
      const uid = user.uid;

      if (!email || !uid) {
        setError('Nie udało się pobrać danych użytkownika (brak e-maila lub UID).');
        sessionStorage.removeItem('authFlow');
        return;
      }

      const idToken = await user.getIdToken();

      try {
        await axios.post(
          `${process.env.REACT_APP_API_URL}/api/users`,
          {
            email,
            name: user.displayName || '',
            firebaseUid: uid,
            provider: 'google',
          },
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );
      } catch (err) {
        if (err.response?.status === 409) {
          setError('Ten e-mail jest już przypisany do innego konta. Zaloguj się metodą, której wcześniej użyłeś.');
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
        setError(`Konto o adresie ${email} zostało już utworzone inną metodą. Zaloguj się tą metodą.`);
      } else {
        setError('Błąd podczas logowania przez Google.');
      }

      sessionStorage.removeItem('authFlow');
    } finally {
      setIsLoggingGoogle(false);
    }
  };

  const handlePasswordReset = async () => {
    if (isLoggingEmail || isLoggingGoogle || isResettingPassword) return;

    setError('');
    setMessage('');

    const email = form.email.trim();

    if (!email) {
      setError('Najpierw wpisz swój adres e-mail, aby odzyskać hasło.');
      return;
    }

    setIsResettingPassword(true);

    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);

      if (methods.includes('google.com') && !methods.includes('password')) {
        setError('Ten e-mail jest powiązany wyłącznie z logowaniem przez Google. Użyj przycisku logowania przez Google.');
        return;
      }

      await sendPasswordResetEmail(auth, email);

      setMessage('Wysłaliśmy link do resetu hasła na podany adres e-mail.');
    } catch (err) {
      console.error('❌ Błąd resetu hasła:', err);

      if (err.code === 'auth/user-not-found') {
        setError('Nie znaleziono konta przypisanego do tego adresu e-mail.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Podany adres e-mail jest nieprawidłowy.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Wykonano zbyt wiele prób. Spróbuj ponownie za chwilę.');
      } else {
        setError('Nie udało się wysłać wiadomości resetującej hasło.');
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  const isBusy = isLoggingEmail || isLoggingGoogle || isResettingPassword;

  return (
    <>
      <Hero />

      <div className={styles.container}>
        <h2 className={styles.loginTitle}>Zaloguj się</h2>

        <form onSubmit={handleSubmit}>
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            value={form.email}
            onChange={handleChange}
            disabled={isBusy}
          />

          <input
            name="password"
            type="password"
            placeholder="Hasło"
            required
            value={form.password}
            onChange={handleChange}
            disabled={isBusy}
          />

          <div className={styles.actionsRow}>
            <button
              type="button"
              className={styles.forgotPassword}
              onClick={handlePasswordReset}
              disabled={isBusy}
            >
              {isResettingPassword ? 'Wysyłanie linku...' : 'Nie pamiętasz hasła?'}
            </button>
          </div>

          <LoadingButton
            type="submit"
            isLoading={isLoggingEmail}
            disabled={isBusy}
          >
            Zaloguj
          </LoadingButton>
        </form>

        {error && <div className={styles.error}>{error}</div>}
        {message && <div className={styles.success}>{message}</div>}

        <div className={styles.orSeparator}>lub</div>

        <LoadingButton
          type="button"
          onClick={handleGoogleLogin}
          isLoading={isLoggingGoogle}
          disabled={isBusy}
          className={styles.googleButton}
        >
          <img src="/images/icons/google.png" alt="Google" />
          Kontynuuj przez Google
        </LoadingButton>

        <p className={styles.registerLink}>
          Nie masz konta?{' '}
          <Link to="/register" className={styles.linkButton}>
            Załóż je tutaj
          </Link>
        </p>
      </div>

      <Footer />
    </>
  );
};

export default Login;