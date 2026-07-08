import LoadingButton from '../../ui/LoadingButton/LoadingButton';
import styles from "./EditBar.module.scss";

const EditBar = ({ isSaving, onSave, onCancel }) => {
  return (
    <div className={styles.editBar} role="region" aria-label="Akcje edycji profilu">
      <div className={styles.editBarInner}>
        <span className={styles.editHint}>Masz niezapisane zmiany</span>

        <div className={styles.editBarBtns}>
          <LoadingButton
            type="button"
            isLoading={isSaving}
            disabled={isSaving}
            className={styles.primary}
            onClick={onSave}
          >
            Zapisz zmiany profilu
          </LoadingButton>

          <button
            type="button"
            className={styles.ghost}
            disabled={isSaving}
            onClick={onCancel}
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditBar;
