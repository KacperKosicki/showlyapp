import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  fetchSignInMethodsForEmail,
  signOut
} from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Login.module.scss';
import Hero from '../Hero/Hero';
import Footer from '../Footer/Footer';
import axios from 'axios';

const Login = ({ setUser, setRefreshTrigger }) => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const methods = await fetchSignInMethodsForEmail(auth, form.email);
      if (methods.includes('google.com')) {
        setError('Ten e-mail jest powiązany z kontem Google. Zaloguj się przez Google.');
        return;
      }

      const userCredential = await signInWithEmailAndPassword(auth, form.email, form.password);
      await auth.currentUser.reload();
      const refreshedUser = auth.currentUser;

      if (!refreshedUser.emailVerified) {
        await sendEmailVerification(refreshedUser);
        await signOut(auth);
        setError('Zweryfikuj swój adres e-mail. Wysłaliśmy ponownie link aktywacyjny.');
        return;
      }

      const email = refreshedUser.email;
      const uid = refreshedUser.uid;

      if (!email || !uid) {
        setError('Nie udało się pobrać danych logowania (e-mail lub UID).');
        return;
      }

      await axios.post(`${process.env.REACT_APP_API_URL}/api/users`, {
        email,
        name: refreshedUser.displayName || '',
        firebaseUid: uid,
        provider: 'password'
      });

      localStorage.setItem('showlyUser', JSON.stringify({ email, uid }));
      setUser({ email, uid });
      setRefreshTrigger(Date.now());
      navigate('/');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('Konto o podanym e-mailu nie istnieje.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Nieprawidłowe hasło.');
      } else {
        setError('Błąd logowania.');
      }
    }
  };

  const handleGoogleLogin = async () => {
    setError('');

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
        return;
      }

      try {
        await axios.post(`${process.env.REACT_APP_API_URL}/api/users`, {
          email,
          name: user.displayName || '',
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
      navigate('/');
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
      <Hero />
      <div className={styles.container}>
        <h2>Zaloguj się</h2>
        <form onSubmit={handleSubmit}>
          <input name="email" type="email" placeholder="Email" required onChange={handleChange} />
          <input name="password" type="password" placeholder="Hasło" required onChange={handleChange} />
          <button type="submit">Zaloguj</button>
        </form>
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.orSeparator}>lub</div>
        <button onClick={handleGoogleLogin} className={styles.googleButton}>
          <img src="/images/icons/google.png" alt="Google" />
          Kontynuuj przez Google
        </button>
        <p className={styles.registerLink}>
          Nie masz konta? <Link to="/register" className={styles.linkButton}>Załóż je tutaj</Link>
        </p>
      </div>
      <Footer />
    </>
  );
};

export default Login;
