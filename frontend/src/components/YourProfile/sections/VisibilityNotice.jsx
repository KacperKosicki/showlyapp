import LoadingButton from '../../ui/LoadingButton/LoadingButton';
import styles from '../YourProfile.module.scss';

const VisibilityNotice = ({
  isAdminHidden,
  isExpired,
  until,
  daysLeft,
  isExtending,
  canExtend,
  onExtendVisibility,
}) => {
  return (
    <div className={`${styles.card} ${styles.noticeCard}`}>
      <div className={styles.noticeContent}>
        {isAdminHidden ? (
          <>
            <p className={styles.noticeTitle}>
              ⛔ Twój profil został <strong>wyłączony przez administrację</strong>
            </p>

            <p className={styles.noticeText}>
              Profil jest obecnie niewidoczny mimo ważnej daty widoczności do:{' '}
              <strong>{until ? until.toLocaleDateString('pl-PL') : '—'}</strong>.
            </p>

            <p className={styles.noticeText}>
              Nie możesz samodzielnie przedłużyć ani przywrócić widoczności, dopóki sprawa nie
              zostanie wyjaśniona lub poprawiona.
            </p>
          </>
        ) : isExpired ? (
          <>
            <p className={styles.noticeTitle}>
              🔒 Twój profil jest <strong>niewidoczny</strong>
            </p>

            <p className={styles.noticeText}>
              Widoczność wygasła:{' '}
              <strong>{until ? until.toLocaleDateString('pl-PL') : '—'}</strong>
            </p>

            <p className={styles.noticeText}>
              Aby ponownie aktywować wizytówkę, przedłuż widoczność.
            </p>
          </>
        ) : (
          <>
            <p className={styles.noticeTitle}>⏳ Twoja wizytówka wkrótce wygaśnie</p>

            <p className={styles.noticeText}>
              Pozostało: <strong>{daysLeft} dni</strong> (do:{' '}
              <strong>{until ? until.toLocaleDateString('pl-PL') : '—'}</strong>)
            </p>
          </>
        )}
      </div>

      {!isAdminHidden && (
        <LoadingButton
          type="button"
          isLoading={isExtending}
          disabled={isExtending || !canExtend}
          className={styles.secondary}
          onClick={onExtendVisibility}
        >
          Przedłuż widoczność (Stripe)
        </LoadingButton>
      )}
    </div>
  );
};

export default VisibilityNotice;
