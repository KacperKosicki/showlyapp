import { useEffect, useState } from 'react';
import styles from './UserCardList.module.scss';
import UserCard from '../UserCard/UserCard';
import axios from 'axios';

const UserCardList = () => {
  const [topRatedUsers, setTopRatedUsers] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/profiles') // lub /api/profiles
      .then(res => {
        const sorted = res.data.sort((a, b) => b.rating - a.rating).slice(0, 3);
        setTopRatedUsers(sorted);
      })
      .catch(err => console.error('Błąd pobierania profili:', err));
  }, []);

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Najlepiej oceniani</h2>
      <p className={styles.description}>
        Poznaj ekspertów z najwyższymi ocenami. To liderzy w swoich dziedzinach, którym zaufało najwięcej użytkowników.
      </p>

      <div className={styles.list}>
        {topRatedUsers.map((user, index) => (
          <UserCard key={user._id || index} user={user} />
        ))}
      </div>
    </section>
  );
};

export default UserCardList;
