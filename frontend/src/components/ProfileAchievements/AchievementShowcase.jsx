import { useEffect, useState } from 'react';
import { FiAward, FiEye, FiEyeOff, FiRefreshCw } from 'react-icons/fi';
import { api } from '../../api/api';
import LoadingButton from '../ui/LoadingButton/LoadingButton';
import { EditorSectionHeader } from '../YourProfile/sections/EditorGroup';
import { AchievementBadge } from './ProfileAchievements';
import styles from './ProfileAchievements.module.scss';

const endpoint = '/api/profiles/achievements/me';

export default function AchievementShowcase({ profileVersion, isEditing = false }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api.get(endpoint, { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setState(data); })
      .catch(() => { if (!controller.signal.aborted) setError('Nie udało się pobrać odznak.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [profileVersion, retry]);

  const toggleBadge = async (id) => {
    const wasFeatured = state.featured.includes(id);
    const featured = wasFeatured ? state.featured.filter(value => value !== id) : [...state.featured, id];
    setSaving(id);
    setError('');
    setFeedback('');
    try {
      const { data } = await api.patch(endpoint, { featured });
      setState(data);
      setFeedback(wasFeatured ? 'Ukryto odznakę na wizytówce.' : 'Odznaka jest widoczna na wizytówce.');
    } catch (err) {
      setError(err.response?.data?.message || 'Nie udało się zapisać gabloty. Spróbuj ponownie.');
    } finally {
      setSaving('');
    }
  };

  return (
    <section id="achievementsSection" className={styles.showcase} aria-label="Gablota odznak">
      <EditorSectionHeader
        kicker="Osiągnięcia"
        title="Gablota odznak"
        description="Zdobywaj odznaki za korzystanie z Showly. Wybrane możesz pokazać klientom na swojej wizytówce."
        icon={<FiAward aria-hidden="true" />}
      />
      {state && (
        <div className={styles.counts}>
          <span>{state.badges.filter(badge => badge.earned).length} / {state.badges.length} zdobytych</span>
          <span>{state.featured.length} / {state.maxFeatured} publicznych</span>
        </div>
      )}
      {loading && <p role="status">Sprawdzamy Twoje odznaki…</p>}
      {feedback && <p role="status">{feedback}</p>}
      {error && (
        <div className={styles.error} role="alert">
          <span>{error}</span>
          <button type="button" disabled={loading || !!saving} onClick={() => setRetry(value => value + 1)}>
            <FiRefreshCw aria-hidden="true" /> Odśwież odznaki
          </button>
        </div>
      )}
      {isEditing && state && state.featured.length >= state.maxFeatured && <p>Ukryj jedną odznakę, aby pokazać inną.</p>}
      {state && (
        <ul className={styles.grid}>
          {state.badges.map(badge => {
            const featured = state.featured.includes(badge.id);
            return (
              <AchievementBadge key={badge.id} badge={badge} locked={!badge.earned} featured={featured}>
                {isEditing && badge.earned && (
                  <LoadingButton
                    type="button"
                    className={styles.action}
                    isLoading={saving === badge.id}
                    disabled={loading || !!saving || (!featured && state.featured.length >= state.maxFeatured)}
                    onClick={() => toggleBadge(badge.id)}
                    aria-label={(featured ? 'Ukryj odznakę ' : 'Pokaż odznakę ') + badge.title}
                  >
                    {featured ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                    {featured ? 'Ukryj' : 'Pokaż na wizytówce'}
                  </LoadingButton>
                )}
              </AchievementBadge>
            );
          })}
        </ul>
      )}
    </section>
  );
}
