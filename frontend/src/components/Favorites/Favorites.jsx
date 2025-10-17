import { useEffect, useState, useMemo } from 'react';
import styles from './Favorites.module.scss';
import axios from 'axios';
import UserCard from '../UserCard/UserCard';
import { FiHeart } from 'react-icons/fi';
import { Link } from 'react-router-dom';

export default function Favorites({ currentUser }) {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/favorites/my`,
          { headers: { uid: currentUser?.uid } }
        );
        setProfiles(Array.isArray(data) ? data : []);
      } catch {
        setError('Nie udało się pobrać listy ulubionych.');
      } finally {
        setLoading(false);
      }
    };
    if (currentUser?.uid) run();
  }, [currentUser?.uid]);

  const count = useMemo(() => profiles.length, [profiles]);

  if (!currentUser?.uid) {
    return (
      <section id="scrollToId" className={styles.section}>
        <div className={styles.wrapper}>
          <div className={styles.headerRow}>
            <div>
              <h2 className={styles.sectionTitle}>Twoje ulubione</h2>
              <p className={styles.subTitle}>
                Zaloguj się, aby zobaczyć i zarządzać zapisanymi profilami.
              </p>
            </div>
          </div>
          <p className={styles.info}>Zaloguj się, aby zobaczyć ulubione.</p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section id="scrollToId" className={styles.section}>
        <div className={styles.wrapper}>
          <div className={styles.headerRow}>
            <div>
              <h2 className={styles.sectionTitle}>Twoje ulubione</h2>
              <p className={styles.subTitle}>
                Zapisane wizytówki specjalistów, do których chcesz szybko wracać.
              </p>
            </div>
            <span className={styles.badge}>—</span>
          </div>
          <p className={styles.info}>Ładowanie…</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="scrollToId" className={styles.section}>
        <div className={styles.wrapper}>
          <div className={styles.headerRow}>
            <div>
              <h2 className={styles.sectionTitle}>Twoje ulubione</h2>
              <p className={styles.subTitle}>
                Zapisane wizytówki specjalistów, do których chcesz szybko wracać.
              </p>
            </div>
            <span className={styles.badge}>—</span>
          </div>
          <p className={styles.error}>{error}</p>
        </div>
      </section>
    );
  }

  if (count === 0) {
    return (
      <section id="scrollToId" className={styles.section}>
        <div className={styles.wrapper}>
          <div className={styles.headerRow}>
            <div>
              <h2 className={styles.sectionTitle}>Twoje ulubione</h2>
              <p className={styles.subTitle}>
                Nie masz jeszcze żadnych ulubionych profili. Dodawaj je klikając
                <strong> serduszko</strong> na karcie specjalisty.
              </p>
            </div>
            <span className={styles.badge}>0</span>
          </div>

          <div className={styles.emptyBox}>
            <FiHeart className={styles.emptyIcon} />
            <p>Nic tu jeszcze nie ma.</p>
            <Link className={styles.cta} to="/" state={{ scrollToId: 'scrollToId' }}>
              Przeglądaj specjalistów
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="scrollToId" className={styles.section}>
      <div className={styles.wrapper}>
        <div className={styles.headerRow}>
          <div>
            <h2 className={styles.sectionTitle}>Twoje ulubione</h2>
            <p className={styles.subTitle}>
              Zapisane wizytówki specjalistów, do których chcesz szybko wracać.
            </p>
          </div>
          <span className={styles.badge}>{count}</span>
        </div>

        <div className={styles.grid}>
          {profiles.map((p) => (
            <UserCard key={p.userId} user={p} currentUser={currentUser} />
          ))}
        </div>
      </div>
    </section>
  );
}
