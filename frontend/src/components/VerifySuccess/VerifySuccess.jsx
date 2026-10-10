import AppLoader from '../AppLoader/AppLoader';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL;

const VerifySuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const verifyAndRedirect = async () => {
      try {
        await auth.currentUser?.reload();

        const firebaseUser = auth.currentUser;

        if (firebaseUser?.emailVerified && firebaseUser?.email && firebaseUser?.uid) {
          const idToken = await firebaseUser.getIdToken(true);
          const provider = firebaseUser.providerData?.some(
            (p) => p.providerId === 'google.com'
          )
            ? 'google'
            : 'password';

          await axios.post(
            `${API}/api/users`,
            {
              email: firebaseUser.email,
              name: firebaseUser.displayName || '',
              provider,
            },
            {
              headers: {
                Authorization: `Bearer ${idToken}`,
              },
            }
          );
        }
      } catch (err) {
        console.log('Błąd odświeżenia:', err);
      }

      setTimeout(() => {
        navigate('/');
      }, 3000);
    };

    verifyAndRedirect();
  }, [navigate]);

  return (
<AppLoader label="Przygotowujemy Twoje konto…" detail="Za chwilę wrócisz na stronę główną." />
  );
};

export default VerifySuccess;
