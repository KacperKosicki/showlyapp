import { useEffect, useState } from 'react';
import { FiAward, FiRefreshCw } from 'react-icons/fi';
import { adminApi } from '../../api/adminApi';
import { AchievementBadge } from '../ProfileAchievements/ProfileAchievements';
import badgeStyles from '../ProfileAchievements/ProfileAchievements.module.scss';
import DataLoader from '../ui/DataLoader/DataLoader';
import styles from './AdminAchievements.module.scss';

const tiers = [
  ['common', 'Podstawowe'],
  ['rare', 'Rzadkie'],
  ['exclusive', 'Ekskluzywne'],
];

export default function AdminAchievements() {
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    adminApi.achievements(controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) setCatalog(data); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });

    return () => controller.abort();
  }, [attempt]);

  return (
    <section className={styles.catalog} aria-labelledby="admin-achievements-title">
      <header className={styles.header}>
        <span className={styles.icon}><FiAward aria-hidden="true" /></span>
        <div>
          <h2 id="admin-achievements-title">Katalog odznak Showly</h2>
          <p>Podgląd medali oraz warunki ich zdobycia. Na publicznej wizytówce medale przejmują kolory jej motywu.</p>
        </div>
        {catalog && <span className={styles.count}>{catalog.badges.length} odznak</span>}
      </header>

      {!catalog && !error && <DataLoader label="Ładujemy katalog odznak…" compact />}
      {error && (
        <div className={styles.error} role="alert">
          <p>Nie udało się pobrać katalogu odznak.</p>
          <button type="button" onClick={() => { setError(false); setAttempt(value => value + 1); }}>
            <FiRefreshCw aria-hidden="true" /> Spróbuj ponownie
          </button>
        </div>
      )}

      {catalog && (
        <>
          <details className={styles.rules} open>
            <summary>Jak działa przyznawanie i wyświetlanie odznak</summary>
            <ul>
              {catalog.rules.map(rule => <li key={rule}>{rule}</li>)}
              <li>W trybie edycji wizytówki użytkownik może wybrać do {catalog.maxFeatured} odznak do pokazania publicznie.</li>
            </ul>
          </details>
          {tiers.map(([tier, label]) => {
            const badges = catalog.badges.filter(badge => badge.tier === tier);
            if (!badges.length) return null;

            return (
              <section key={tier} className={styles.group} aria-labelledby={`admin-badge-tier-${tier}`}>
                <div className={styles.groupHeading}>
                  <h3 id={`admin-badge-tier-${tier}`}>{label}</h3>
                  <span className={styles.count}>{badges.length}</span>
                </div>
                <ul className={badgeStyles.grid}>
                  {badges.map(badge => (
                    <AchievementBadge key={badge.id} badge={badge}>
                      <code className={styles.badgeId}>{badge.id}</code>
                    </AchievementBadge>
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </section>
  );
}
