import styles from "./DescriptionSection.module.scss";
import { FaBriefcase } from 'react-icons/fa';

const DescriptionSection = ({
  profile,
  editData,
  isEditing,
  formErrors,
  maxDescription,
  onEditDataChange,
}) => {
  const description = editData.description || '';
  const descriptionLength = description.length;
  const progressWidth = Math.min((descriptionLength / maxDescription) * 100, 100);

  return (
    <section className={`${styles.card} ${styles.descriptionCard}`}>
      <div className={styles.cardGlow} aria-hidden="true" />

      <div className={styles.sectionTop}>
        <div>
          <span className={styles.sectionKicker}>O Tobie</span>

          <h3 className={styles.sectionTitle}>Opis profilu</h3>

          <p className={styles.sectionLead}>
            Opowiedz krótko, czym się zajmujesz, dla kogo jest Twoja oferta i dlaczego warto się z Tobą skontaktować.
          </p>
        </div>

        <div className={styles.sectionBadge}>
          <FaBriefcase />
          <span>Oferta</span>
        </div>
      </div>

      <div className={styles.descriptionBlock}>
        {isEditing ? (
          <div className={styles.descriptionEditor}>
            <div className={styles.textareaShell}>
              <textarea
                value={description}
                onChange={(e) =>
                  onEditDataChange({ ...editData, description: e.target.value })
                }
                rows={6}
                className={styles.descriptionTextarea}
                maxLength={maxDescription}
                placeholder="Np. Pomagam klientom stworzyć profesjonalną wizytówkę online, przygotowuję projekty graficzne i dbam o estetykę każdego szczegółu..."
              />

              <div className={styles.textareaDecor} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className={styles.descMeta}>
              <div className={styles.descLeft}>
                {formErrors.description ? (
                  <small className={styles.error}>{formErrors.description}</small>
                ) : (
                  <small className={styles.hint}>
                    Dobry opis ma 2–4 krótkie zdania i jasno pokazuje, co oferujesz.
                  </small>
                )}
              </div>

              <div className={styles.descRight}>
                <span className={styles.counterPill}>
                  {descriptionLength}/{maxDescription}
                </span>
              </div>
            </div>

            <div className={styles.descProgress}>
              <span style={{ width: `${progressWidth}%` }} />
            </div>
          </div>
        ) : profile.description ? (
          <div className={styles.descriptionPreview}>
            <div className={styles.quoteMark}>“</div>

            <p className={styles.descriptionText}>{profile.description}</p>

            <div className={styles.descriptionFooter}>
              <span>Opis publiczny</span>
              <strong>{profile.description.length} znaków</strong>
            </div>
          </div>
        ) : (
          <div className={styles.descriptionEmpty}>
            <div className={styles.emptyIcon}>
              <FaBriefcase />
            </div>

            <div>
              <strong>Nie dodałeś/aś jeszcze opisu</strong>
              <p>
                Dodaj kilka zdań o sobie lub swojej działalności, żeby klient od razu wiedział, czym się zajmujesz.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default DescriptionSection;
