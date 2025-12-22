import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './AllUsersList.module.scss';
import UserCard from '../UserCard/UserCard';
import axios from 'axios';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const AllUsersList = ({ currentUser }) => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const scrollerRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const { data: profiles } = await axios.get(`${process.env.REACT_APP_API_URL}/api/profiles`);

        if (currentUser?.uid) {
          const { data: favs } = await axios.get(
            `${process.env.REACT_APP_API_URL}/api/favorites/my`,
            { headers: { uid: currentUser.uid } }
          );
          const favSet = new Set(favs.map(f => f.userId));
          const merged = profiles.map(p => ({
            ...p,
            isFavorite: favSet.has(p.userId),
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

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(user =>
      (user.name || '').toLowerCase().includes(q) ||
      (user.role || '').toLowerCase().includes(q) ||
      (user.location || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  // sprawdza, czy można przewijać lewo/prawo (dla strzałek)
  const updateArrows = () => {
    const el = scrollerRef.current;
    if (!el) return;

    const max = el.scrollWidth - el.clientWidth;
    const x = el.scrollLeft;

    setCanLeft(x > 2);
    setCanRight(x < max - 2);
  };

  useEffect(() => {
    updateArrows();

    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => updateArrows();
    el.addEventListener('scroll', onScroll, { passive: true });

    const ro = new ResizeObserver(() => updateArrows());
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [filteredUsers.length]);

  const scrollByCard = (dir = 1) => {
    const el = scrollerRef.current;
    if (!el) return;

    // bierzemy szerokość pierwszej karty + gap
    const first = el.querySelector(':scope > *');
    const cardW = first?.getBoundingClientRect().width || 400;

    // gap: próbujemy wziąć z CSS (zwykle 24px dla 1.5rem), fallback 24
    const gap = parseFloat(getComputedStyle(el).columnGap || getComputedStyle(el).gap) || 24;

    const step = (cardW + gap) * 1.02; // lekko więcej niż 1 karta
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  if (loading) return <section className={styles.section}><p>Ładowanie…</p></section>;

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Wszyscy specjaliści 👀</h2>

      <input
        type="text"
        placeholder="Szukaj po nazwie, roli lub lokalizacji..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={styles.search}
      />

      <div className={styles.carousel}>
        <button
          type="button"
          className={`${styles.navBtn} ${styles.left} ${!canLeft ? styles.disabled : ''}`}
          onClick={() => scrollByCard(-1)}
          disabled={!canLeft}
          aria-label="Przewiń w lewo"
          title="Przewiń w lewo"
        >
          <FaChevronLeft />
        </button>

        <div className={styles.grid} ref={scrollerRef}>
          {filteredUsers.map((user, index) => (
            <div className={styles.cardWrap} key={user._id || user.userId || index}>
              <UserCard user={user} currentUser={currentUser} />
            </div>
          ))}
        </div>

        <button
          type="button"
          className={`${styles.navBtn} ${styles.right} ${!canRight ? styles.disabled : ''}`}
          onClick={() => scrollByCard(1)}
          disabled={!canRight}
          aria-label="Przewiń w prawo"
          title="Przewiń w prawo"
        >
          <FaChevronRight />
        </button>
      </div>
    </section>
  );
};

export default AllUsersList;
