import { useEffect, useState } from 'react';
import styles from './AllUsersList.module.scss';
import UserCard from '../UserCard/UserCard';
import axios from 'axios';

const AllUsersList = ({ currentUser }) => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/profiles`)
      .then(res => setUsers(res.data))
      .catch(err => console.error('Błąd pobierania użytkowników:', err));
  }, []);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.role.toLowerCase().includes(search.toLowerCase()) ||
    user.location.toLowerCase().includes(search.toLowerCase())
  );

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
          <UserCard key={user._id || index} user={user} currentUser={currentUser} />
        ))}
      </div>
    </section>
  );
};

export default AllUsersList;
