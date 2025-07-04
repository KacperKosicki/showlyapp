import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';

const VerifySuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const verifyAndRedirect = async () => {
      try {
        await auth.currentUser?.reload();
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
    <div className="verify-success">
      <h2>✅ E-mail został zweryfikowany!</h2>
      <p>Za chwilę zostaniesz przekierowany na stronę główną...</p>
    </div>
  );
};

export default VerifySuccess;
