import { useEffect, useState } from 'react';
import styles from './UserCardList.module.scss';
import UserCard from '../UserCard/UserCard';
import axios from 'axios';
import { auth } from '../../firebase';

const API = process.env.REACT_APP_API_URL;

// ✅ Bearer token header
async function getAuthHeader() {
  const u = auth.currentUser;
  if (!u) return {};
  const token = await u.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

const UserCardList = ({ currentUser }) => {
  const [topRatedUsers, setTopRatedUsers] = useState([]);

  useEffect(() => {
    const run = async () => {
      try {
        // publiczne – może być bez tokena (jeśli backend pozwala)
        const { data: profiles } = await axios.get(`${API}/api/profiles`);
        const sorted = (Array.isArray(profiles) ? profiles : [])
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 3);

        // jeśli user zalogowany -> pobieramy ulubione Z TOKENEM
        if (currentUser?.uid && auth.currentUser) {
          const authHeader = await getAuthHeader();

          const { data: favProfiles } = await axios.get(`${API}/api/favorites/my`, {
            headers: { ...authHeader },
          });

          // /favorites/my zwraca listę PROFILI z isFavorite:true (u Ciebie w backendzie)
          // ale w razie gdyby zwróciło same id – robimy fallback
          const favSet = new Set(
            (Array.isArray(favProfiles) ? favProfiles : []).map((p) => p?.userId || p?.profileUserId).filter(Boolean)
          );

          setTopRatedUsers(sorted.map((p) => ({ ...p, isFavorite: favSet.has(p.userId) })));
        } else {
          setTopRatedUsers(sorted);
        }
      } catch (err) {
        console.error('Błąd pobierania profili:', err);
      }
    };

    run();
  }, [currentUser?.uid]);

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Najlepiej oceniani 🔥</h2>
      <p className={styles.description}>
        Poznaj ekspertów z najwyższymi ocenami. To liderzy w swoich dziedzinach, którym zaufało najwięcej użytkowników.
      </p>

      <div className={styles.list}>
        {topRatedUsers.map((user, index) => (
          <UserCard key={user._id || user.userId || index} user={user} currentUser={currentUser} />
        ))}
      </div>
    </section>
  );
};

export default UserCardList;