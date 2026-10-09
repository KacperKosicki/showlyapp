import EditorGroup, { EditorSectionHeader } from './EditorGroup';
import { FaEnvelope, FaIdBadge, FaTimes } from 'react-icons/fa';
import styles from "./AdditionalInfoSection.module.scss";

const AdditionalInfoSection = ({
  profile,
  editData,
  isEditing,
  formErrors,
  setEditData,
  maxQuickAnswers,
}) => {
  return (
    <>
      {/* =========================
  Informacje dodatkowe
========================= */}
      <section className={`${styles.card} ${styles.extraCard}`}>
        <div className={styles.cardGlow} aria-hidden="true" />

        <EditorSectionHeader kicker={<>Finalne ustawienia</>} title={<>Informacje dodatkowe</>} description={<>
          Uzupełnij dane biznesowe, szybkie odpowiedzi oraz sprawdź podsumowanie
          widoczności Twojego profilu.
        </>} icon={<FaIdBadge />} />

        <div className={styles.extraBody}>
          {/* DANE BIZNESOWE */}
          <EditorGroup title={<>01 / Dane biznesowe</>} description={<>Określ, czy działasz jako firma i podaj NIP, jeśli chcesz.</>}>


            {isEditing ? (
              <div className={styles.businessEditor}>
                <label className={styles.featuredSwitch}>
                  <input
                    type="checkbox"
                    checked={!!editData.hasBusiness}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        hasBusiness: e.target.checked,
                        nip: e.target.checked ? prev.nip || "" : "",
                      }))
                    }
                  />

                  <span>
                    <strong>Posiadam działalność gospodarczą</strong>
                    <small>
                      Ta informacja może zwiększyć wiarygodność profilu.
                    </small>
                  </span>
                </label>

                {editData.hasBusiness && (
                  <label className={styles.modernField}>
                    <span>NIP</span>

                    <input
                      type="text"
                      className={styles.formInput}
                      value={editData.nip || ""}
                      maxLength={20}
                      placeholder="Np. 1234567890"
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          nip: e.target.value,
                        }))
                      }
                    />
                  </label>
                )}
              </div>
            ) : (
              <div className={styles.businessView}>
                <div className={styles.businessStatus}>
                  <span
                    className={`${styles.extraBadge} ${profile.hasBusiness ? styles.extraBadgeSuccess : styles.extraBadgeMuted
                      }`}
                  >
                    {profile.hasBusiness ? "Firma" : "Osoba prywatna"}
                  </span>

                  <strong>
                    {profile.hasBusiness
                      ? "Działalność gospodarcza"
                      : "Brak działalności gospodarczej"}
                  </strong>

                  <small>
                    {profile.hasBusiness
                      ? `NIP: ${profile.nip || "nie podano"}`
                      : "Profil działa bez podanego NIP-u."}
                  </small>
                </div>
              </div>
            )}
          </EditorGroup>

          {/* PODSUMOWANIE */}
          <EditorGroup title={<>02 / Podsumowanie profilu</>} description={<>Najważniejsze dane widoczne po stronie profilu publicznego.</>}>


            <div className={styles.extraStatsGrid}>
              <div className={styles.extraStatItem}>
                <span>Ocena</span>
                <strong>{profile.rating || 0} ★</strong>
              </div>

              <div className={styles.extraStatItem}>
                <span>Opinie</span>
                <strong>{profile.reviews || 0}</strong>
              </div>

              <div className={styles.extraStatItem}>
                <span>Odwiedziny</span>
                <strong>{profile.visits || 0}</strong>
              </div>

              <div className={styles.extraStatItem}>
                <span>Status</span>
                <strong>{profile.isVisible ? "Widoczny" : "Ukryty"}</strong>
              </div>
            </div>

            <div className={styles.profileMetaBox}>
              <div>
                <span>Typ profilu</span>
                <strong>{profile.profileType || "Nie podano"}</strong>
              </div>

              <div>
                <span>Widoczny do</span>
                <strong>
                  {profile.billingPublic?.betaPremiumEnabled ? 'Przez cały okres testów' : profile.visibleUntil
                    ? new Date(profile.visibleUntil).toLocaleDateString("pl-PL")
                    : "Brak daty"}
                </strong>
              </div>
            </div>
          </EditorGroup>

          {/* SZYBKIE ODPOWIEDZI */}
          <EditorGroup title={<>03 / Szybkie odpowiedzi</>} description={<>
            Krótkie odpowiedzi widoczne przy formularzu wiadomości. Pomagają klientowi
            szybciej znaleźć podstawowe informacje.
          </>}>


            {isEditing ? (
              <div className={styles.quickAnswersEditor}>
                {Array.from({ length: maxQuickAnswers }).map((_, i) => {
                  const qa = editData.quickAnswers?.[i] || { title: "", answer: "" };

                  return (
                    <div key={i} className={styles.quickAnswerEditCard}>
                      <div className={styles.quickAnswerTop}>
                        <span>Szybka odpowiedź #{i + 1}</span>

                        {(qa.title || qa.answer) && (
                          <button
                            type="button"
                            className={styles.quickClearBtn}
                            onClick={() =>
                              setEditData((prev) => {
                                const next = [...(prev.quickAnswers || [])];
                                next[i] = { title: "", answer: "" };

                                return {
                                  ...prev,
                                  quickAnswers: next,
                                };
                              })
                            }
                          >
                            <FaTimes /> Wyczyść
                          </button>
                        )}
                      </div>

                      <div className={styles.quickAnswerGrid}>
                        <label className={styles.modernField}>
                          <span>Tytuł</span>

                          <input
                            type="text"
                            className={styles.formInput}
                            value={qa.title || ""}
                            maxLength={10}
                            placeholder="Np. Cena"
                            onChange={(e) =>
                              setEditData((prev) => {
                                const next = [...(prev.quickAnswers || [])];
                                next[i] = {
                                  ...(next[i] || {}),
                                  title: e.target.value,
                                };

                                return {
                                  ...prev,
                                  quickAnswers: next,
                                };
                              })
                            }
                          />

                          <small className={styles.hint}>
                            {(qa.title || "").length}/10 znaków
                          </small>
                        </label>

                        <label className={styles.modernField}>
                          <span>Odpowiedź</span>

                          <input
                            type="text"
                            className={styles.formInput}
                            value={qa.answer || ""}
                            maxLength={64}
                            placeholder="Np. Wycena indywidualna"
                            onChange={(e) =>
                              setEditData((prev) => {
                                const next = [...(prev.quickAnswers || [])];
                                next[i] = {
                                  ...(next[i] || {}),
                                  answer: e.target.value,
                                };

                                return {
                                  ...prev,
                                  quickAnswers: next,
                                };
                              })
                            }
                          />

                          <small className={styles.hint}>
                            {(qa.answer || "").length}/64 znaki
                          </small>
                        </label>
                      </div>
                    </div>
                  );
                })}

                {formErrors.quickAnswers && (
                  <small className={styles.error}>{formErrors.quickAnswers}</small>
                )}

                <div className={styles.infoMuted}>
                  Limit Twojego planu: {maxQuickAnswers} szybkich odpowiedzi.
                </div>
              </div>
            ) : profile.quickAnswers?.filter((qa) => qa?.title || qa?.answer).length ? (
              <div className={styles.quickAnswersView}>
                {profile.quickAnswers
                  .filter((qa) => qa?.title || qa?.answer)
                  .map((qa, i) => (
                    <div key={i} className={styles.quickAnswerViewCard}>
                      <span>{qa.title}</span>
                      <strong>{qa.answer}</strong>
                    </div>
                  ))}
              </div>
            ) : (
              <div className={styles.mediaEmpty}>
                <FaEnvelope />
                <strong>Brak szybkich odpowiedzi</strong>
                <span>Nie dodałeś/aś jeszcze mini FAQ do swojego profilu.</span>
              </div>
            )}
          </EditorGroup>
        </div>
      </section>
    </>
  );
};

export default AdditionalInfoSection;
