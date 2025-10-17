import { useEffect, useState } from 'react';
import styles from './AllUsersList.module.scss';
import UserCard from '../UserCard/UserCard';
import axios from 'axios';

const AllUsersList = ({ currentUser }) => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        // 1) profile
        const { data: profiles } = await axios.get(`${process.env.REACT_APP_API_URL}/api/profiles`);

        // 2) jeśli zalogowany – pobierz moje ulubione i zmerguj
        if (currentUser?.uid) {
          const { data: favs } = await axios.get(
            `${process.env.REACT_APP_API_URL}/api/favorites/my`,
            { headers: { uid: currentUser.uid } }
          );
          const favSet = new Set(favs.map(f => f.userId)); // userId właściciela profilu
          const merged = profiles.map(p => ({
            ...p,
            isFavorite: favSet.has(p.userId)
          }));
          setUsers(merged);
        } else {
          setUsers(profiles);
        }
      } catch (err) {
        console.error('Błąd pobierania użytkowników:', err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [currentUser?.uid]);

  const filteredUsers = users.filter(user =>
    (user.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (user.role || '').toLowerCase().includes(search.toLowerCase()) ||
    (user.location || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <section className={styles.section}><p>Ładowanie…</p></section>;

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Wszyscy specjaliści</h2>
      <input
        type="text"
        placeholder="Szukaj po imieniu, roli lub lokalizacji..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={styles.search}
      />

      <div className={styles.grid}>
        {filteredUsers.map((user, index) => (
          <UserCard key={user._id || user.userId || index} user={user} currentUser={currentUser} />
        ))}
      </div>
    </section>
  );
};

export default AllUsersList;
