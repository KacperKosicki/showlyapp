import { useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged,
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth } from '../../firebase';
import styles from './Register.module.scss';
import Hero from '../Hero/Hero';
import Footer from '../Footer/Footer';
import axios from 'axios';

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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !user.emailVerified) {
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
      // 🔎 Sprawdzenie w MongoDB
      const res = await axios.get(`http://localhost:5000/api/users/check-email?email=${form.email}`);
      if (res.data.exists) {
        setError(`Ten e-mail jest już powiązany z kontem (${res.data.provider === 'google' ? 'Google' : 'e-mail + hasło'}). Zaloguj się tą metodą.`);
        return;
      }

      // 🔐 Rejestracja w Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const firebaseUser = userCredential.user;

      // 🧾 Ustawienie imienia i nazwiska (displayName)
      await updateProfile(firebaseUser, {
        displayName: form.name || ''
      });

      // 📧 Wysłanie maila weryfikacyjnego
      await sendEmailVerification(firebaseUser);

      // 🔓 Nie zapisujemy do MongoDB – dopiero po kliknięciu linku aktywacyjnego
      setEmailSent(true);
      setMessage('Na Twój adres e-mail został wysłany link aktywacyjny. Kliknij w niego, aby aktywować konto.');

    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Ten e-mail jest już używany w Firebase.');
      } else {
        setError('Błąd podczas rejestracji.');
      }
    }
  };

  return (
    <>
      <Hero user={user} setUser={setUser} refreshTrigger={Date.now()} />
      <div className={styles.registerContainer}>
        <h2>Utwórz konto</h2>

        {!emailSent ? (
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
