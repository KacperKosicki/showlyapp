import { useEffect, useState } from "react";
import styles from "./UserCardList.module.scss";
import UserCard from "../UserCard/UserCard";
import axios from "axios";
import { auth } from "../../firebase";

const API = process.env.REACT_APP_API_URL;

async function getAuthHeader() {
  const u = auth.currentUser;
  if (!u) return {};
  const token = await u.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

const UserCardList = ({ currentUser, setAlert }) => {
  const [topRatedUsers, setTopRatedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const { data: profiles } = await axios.get(`${API}/api/profiles`);

        let sorted = (Array.isArray(profiles) ? profiles : [])
          .sort((a, b) => {
            const ratingDiff = Number(b?.rating || 0) - Number(a?.rating || 0);
            if (ratingDiff !== 0) return ratingDiff;

            return Number(b?.reviews || 0) - Number(a?.reviews || 0);
          })
          .slice(0, 3);

        if (currentUser?.uid && auth.currentUser) {
          const authHeader = await getAuthHeader();

          const { data: favProfiles } = await axios.get(`${API}/api/favorites/my`, {
            headers: { ...authHeader },
          });

          const favSet = new Set(
            (Array.isArray(favProfiles) ? favProfiles : [])
              .map((p) => p?.userId || p?.profileUserId)
              .filter(Boolean)
          );

          sorted = sorted.map((p) => ({
            ...p,
            isFavorite: favSet.has(p.userId),
          }));
        }

        setTopRatedUsers(sorted);
      } catch (err) {
        console.error("Błąd pobierania profili:", err);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [currentUser?.uid]);

  if (loading) {
    return (
      <section className={styles.section}>
        <p className={styles.loading}>Ładowanie najlepiej ocenianych profili...</p>
      </section>
    );
  }

  if (!topRatedUsers.length) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionBackground} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.head}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Showly Ranking</span>
            <span className={styles.labelDot} />
            <span className={styles.labelDesc}>Najwyżej oceniane profile</span>
            <span className={styles.labelLine} />
            <span className={styles.pill}>Opinie • Jakość • Zaufanie</span>
          </div>

          <h2 className={styles.heading}>
            Najlepiej oceniani <span className={styles.headingAccent}>eksperci</span> 🔥
          </h2>

          <p className={styles.description}>
            Poznaj profile, które zdobyły najwyższe oceny użytkowników i wyróżniają się
            jakością usług, aktywnością oraz zaufaniem budowanym przez realne opinie.
          </p>

          <div className={styles.metaRow}>
            <div className={styles.metaCard}>
              <strong>{topRatedUsers.length}</strong>
              <span>topowych profili</span>
            </div>
            <div className={styles.metaCard}>
              <strong>4★+</strong>
              <span>wysokie średnie ocen</span>
            </div>
            <div className={styles.metaCard}>
              <strong>Showly</strong>
              <span>liderzy w swoich kategoriach</span>
            </div>
          </div>
        </div>

        <div className={styles.list}>
          {topRatedUsers.map((user, index) => (
            <div className={styles.cardWrap} key={user._id || user.userId || index}>
              <UserCard
                user={user}
                currentUser={currentUser}
                setAlert={setAlert}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UserCardList;