import { useEffect, useState } from 'react';
import styles from './UserCardList.module.scss';
import UserCard from '../UserCard/UserCard';
import axios from 'axios';

const UserCardList = ({ currentUser }) => {
  const [topRatedUsers, setTopRatedUsers] = useState([]);

  useEffect(() => {
    const run = async () => {
      try {
        const { data: profiles } = await axios.get(`${process.env.REACT_APP_API_URL}/api/profiles`);
        const sorted = profiles.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3);

        if (currentUser?.uid) {
          const { data: favs } = await axios.get(
            `${process.env.REACT_APP_API_URL}/api/favorites/my`,
            { headers: { uid: currentUser.uid } }
          );
          const favSet = new Set(favs.map(f => f.userId));
          setTopRatedUsers(sorted.map(p => ({ ...p, isFavorite: favSet.has(p.userId) })));
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
