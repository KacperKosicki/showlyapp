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
import { useLocation, useNavigate } from 'react-router-dom'; // 👈 dodano useNavigate

const Register = ({ user, setUser, setRefreshTrigger }) => {
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const location = useLocation();
  const navigate = useNavigate(); // 👈 init

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

    if (form.password !== form.confirmPassword) {
      setError('Hasła nie są identyczne.');
      return;
    }

    setError('');
    setMessage('');

    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/check-email?email=${encodeURIComponent(form.email)}`);
      if (res.data.exists) {
        setError(`Ten e-mail jest już powiązany z kontem (${res.data.provider === 'google' ? 'Google' : 'e-mail + hasło'}). Zaloguj się tą metodą.`);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const firebaseUser = userCredential.user;

      await updateProfile(firebaseUser, { displayName: form.name || '' });
      await sendEmailVerification(firebaseUser);

      setEmailSent(true);
      setMessage('Na Twój adres e-mail został wysłany link aktywacyjny. Kliknij w niego, aby aktywować konto.');
      // (opcjonalnie) przekierowanie na stronę główną po np. 3 s:
      // setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Ten e-mail jest już używany w Firebase.');
      } else {
        setError('Błąd podczas rejestracji.');
      }
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setMessage('');

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
        return;
      }

      try {
        await axios.post(`${process.env.REACT_APP_API_URL}/api/users`, {
          email,
          name: gUser.displayName || '',
          firebaseUid: uid,
          provider: 'google'
        });
      } catch (err) {
        if (err.response?.status === 409) {
          setError('Ten e-mail jest już przypisany do innego konta. Zaloguj się metodą, którą wcześniej użyłeś.');
          return;
        }
        throw err;
      }

      localStorage.setItem('showlyUser', JSON.stringify({ email, uid }));
      setUser({ email, uid });
      setRefreshTrigger(Date.now());

      setMessage('Pomyślnie zalogowano przez Google. Przekierowuję…');
      setTimeout(() => navigate('/'), 1500); // 👈 opóźnione przekierowanie jak chciałeś
    } catch (err) {
      console.error('❌ Błąd podczas logowania przez Google:', err);
      if (err.code === 'auth/account-exists-with-different-credential') {
        const email = err.customData?.email;
        setError(`Konto o adresie ${email} zostało już utworzone inną metodą. Zaloguj się tą metodą.`);
      } else {
        setError('Błąd podczas logowania przez Google.');
      }
    }
  };

  return (
    <>
      <Hero user={user} setUser={setUser} refreshTrigger={Date.now()} />
      <div id="registerContainer" className={styles.registerContainer}>
        <h2>Utwórz konto</h2>

        {!emailSent ? (
          <>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="name"
                placeholder="Imię i nazwisko"
                onChange={handleChange}
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Adres email"
                onChange={handleChange}
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Hasło"
                onChange={handleChange}
                required
              />
              <input
                type="password"
                name="confirmPassword"
                placeholder="Powtórz hasło"
                onChange={handleChange}
                required
              />
              <button type="submit">Zarejestruj się</button>
            </form>

            <div className={styles.orSeparator}>lub</div>
            <button onClick={handleGoogleLogin} className={styles.googleButton}>
              <img src="/images/icons/google.png" alt="Google" />
              Kontynuuj przez Google
            </button>
          </>
        ) : (
          <div className={styles.success}>
            Rejestracja zakończona. Sprawdź swoją skrzynkę i kliknij link aktywacyjny, aby aktywować konto. Następnie możesz się zalogować.
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}
        {message && <div className={styles.success}>{message}</div>}
      </div>
      <Footer />
    </>
  );
};

export default Register;
