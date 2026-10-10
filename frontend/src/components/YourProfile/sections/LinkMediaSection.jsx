import EditorGroup, { EditorSectionHeader } from './EditorGroup';
import PortfolioEditor from './PortfolioEditor';
import styles from "./LinkMediaSection.module.scss";
import { FaBriefcase, FaGlobe, FaLink, FaPlus, FaTags } from 'react-icons/fa';

const LinkMediaSection = ({
  profile,
  editData,
  isEditing,
  formErrors,
  setEditData,
  tagsLimit,
  tagMaxLength,
  linkMaxLength,
  maxLinks,
  maxPhotos,
  cleanTagInput,
  prettyUrl,
  getPhotoUrl,
  openLightbox,
  handleReplaceSavedPhoto,
  photosUploading,
  removeSavedPhoto,
  newPhotoPreviews,
  removePendingPhoto,
  newPhotoFiles,
  openAddPhotoPicker,
  addPhotoInputRef,
  handleAddPhotosSelect,
  avatarUploading,
}) => {
  return (
    <>
      {/* =========================
  Linki i media
========================= */}
      <section id="mediaSection" className={`${styles.card} ${styles.mediaCard}`}>
        <div className={styles.cardGlow} aria-hidden="true" />

        <EditorSectionHeader kicker={<>Widoczność profilu</>} title={<>Linki i media</>} description={<>
          Dodaj tagi, ważne linki oraz zdjęcia, które najlepiej pokazują Twoją ofertę,
          realizacje lub styl pracy.
        </>} icon={<FaLink />} />

        <div className={styles.mediaBody}>
          {/* TAGI */}
          <EditorGroup title={<>01 / Tagi profilu</>} description={<>Pomagają użytkownikom szybciej zrozumieć, czym się zajmujesz.</>}>


            {isEditing ? (
              <div className={styles.tagEditorGrid}>
                {[0, 1, 2].map((i) => (
                  <label key={i} className={styles.modernField}>
                    <span>Tag {i + 1}</span>

                    <input
                      type="text"
                      className={styles.formInput}
                      value={editData.tags?.[i] || ""}
                      maxLength={tagMaxLength}
                      placeholder={
                        i === 0
                          ? "Np. grafik"
                          : i === 1
                            ? "Np. logo"
                            : "Np. branding"
                      }
                      onChange={(e) => {
                        const newTags = [...(editData.tags || [])];
                        newTags[i] = cleanTagInput(e.target.value);

                        setEditData((prev) => ({
                          ...prev,
                          tags: newTags.slice(0, tagsLimit),
                        }));
                      }}
                    />
                    <small className={styles.hint}>
                      {(editData.tags?.[i] || "").length}/{tagMaxLength} znaków
                    </small>
                  </label>
                ))}

                {formErrors.tags && (
                  <small className={styles.error}>{formErrors.tags}</small>
                )}
              </div>
            ) : profile.tags?.length ? (
              <div className={styles.mediaTags}>
                {profile.tags.map((tag) => (
                  <span key={tag}>{tag.toUpperCase()}</span>
                ))}
              </div>
            ) : (
              <div className={styles.mediaEmpty}>
                <FaTags />
                <strong>Brak tagów</strong>
                <span>Nie dodałeś/aś jeszcze tagów do profilu.</span>
              </div>
            )}
          </EditorGroup>

          {/* LINKI */}
          <EditorGroup unshadedPreview title={<>02 / Linki zewnętrzne</>} description={<>Dodaj portfolio, stronę www, sklep, kalendarz lub inne ważne miejsce.</>}>


            {isEditing ? (
              <div className={styles.linksEditorGrid}>
                {Array.from({ length: maxLinks }).map((_, i) => (
                  <label key={i} className={styles.modernField}>
                    <span>Link {i + 1}</span>

                    <input
                      type="text"
                      className={styles.formInput}
                      value={editData.links?.[i] || ""}
                      maxLength={linkMaxLength}
                      placeholder="Np. https://twojastrona.pl"
                      onChange={(e) => {
                        const newLinks = [...(editData.links || [])];
                        newLinks[i] = e.target.value.slice(0, linkMaxLength);

                        setEditData({
                          ...editData,
                          links: newLinks,
                        });
                      }}
                    />
                  </label>
                ))}

                {formErrors.links && (
                  <small className={styles.error}>{formErrors.links}</small>
                )}

                <small className={styles.hint}>
                  Limit Twojego planu: {maxLinks} linków.
                </small>
              </div>
            ) : profile.links?.filter(Boolean).length ? (
              <div className={styles.mediaLinksList}>
                {profile.links.filter(Boolean).map((link, i) => (
                  <a
                    key={i}
                    href={link.startsWith("http") ? link : `https://${link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.mediaLinkCard}
                  >
                    <span className={styles.mediaLinkIcon}>
                      <FaGlobe />
                    </span>

                    <span>
                      <strong>Link {i + 1}</strong>
                      <small>{prettyUrl(link)}</small>
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <div className={styles.mediaEmpty}>
                <FaLink />
                <strong>Brak linków</strong>
                <span>Nie dodałeś/aś jeszcze żadnego linku.</span>
              </div>
            )}
          </EditorGroup>

          {/* GALERIA */}
          <EditorGroup unshadedPreview title={<>03 / Galeria zdjęć</>} description={<>
            Dodaj zdjęcia realizacji, produktów, miejsca pracy albo przykładowych efektów.
          </>}>


            {!isEditing && (
              <>
                {(profile?.photos || []).length ? (
                  <div className={styles.mediaGalleryGrid}>
                    {(profile.photos || []).map((p, idx) => (
                      <button
                        key={p.publicId || idx}
                        type="button"
                        className={styles.mediaPhotoItem}
                        onClick={() => openLightbox(getPhotoUrl(p))}
                        aria-label={`Otwórz zdjęcie ${idx + 1}`}
                      >
                        <img src={getPhotoUrl(p)} alt={`Zdjęcie ${idx + 1}`} />
                        <span>Podgląd</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={styles.mediaEmpty}>
                    <FaBriefcase />
                    <strong>Brak zdjęć</strong>
                    <span>Nie dodałeś/aś jeszcze zdjęć w galerii.</span>
                  </div>
                )}
              </>
            )}

            {isEditing && (
              <div className={styles.mediaGalleryEditor}>
                <div className={styles.mediaGalleryGrid}>
                  {(editData.photos || []).map((p, idx) => (
                    <div key={p.publicId || idx} className={styles.mediaPhotoItem}>
                      <button
                        type="button"
                        className={styles.mediaPhotoPreview}
                        onClick={() => openLightbox(getPhotoUrl(p))}
                        aria-label={`Otwórz zdjęcie ${idx + 1}`}
                      >
                        <img src={getPhotoUrl(p)} alt={`Zdjęcie ${idx + 1}`} />
                        <span>Podgląd</span>
                      </button>

                      <div className={styles.mediaPhotoActions}>
                        <label className={styles.secondary}>
                          Zamień
                          <input
                            type="file"
                            accept="image/*,.heic,.heif"
                            style={{ display: "none" }}
                            onChange={(e) => handleReplaceSavedPhoto(e, p)}
                          />
                        </label>

                        <button
                          type="button"
                          className={styles.danger}
                          disabled={photosUploading}
                          onClick={() => removeSavedPhoto(p)}
                        >
                          Usuń
                        </button>
                      </div>
                    </div>
                  ))}

                  {newPhotoPreviews.map((url, idx) => (
                    <div key={`pending-${idx}`} className={styles.mediaPhotoItem}>
                      <button
                        type="button"
                        className={styles.mediaPhotoPreview}
                        onClick={() => openLightbox(url)}
                        aria-label={`Otwórz nowe zdjęcie ${idx + 1}`}
                      >
                        <img src={url} alt={`Nowe zdjęcie ${idx + 1}`} />
                        <span>Podgląd</span>
                      </button>

                      <div className={styles.mediaPhotoActions}>
                        <button
                          type="button"
                          className={styles.danger}
                          onClick={() => removePendingPhoto(idx)}
                        >
                          Usuń
                        </button>
                      </div>
                    </div>
                  ))}

                  {(editData.photos?.length || 0) + newPhotoFiles.length < maxPhotos && (
                    <button
                      type="button"
                      className={styles.addPhotoCard}
                      onClick={openAddPhotoPicker}
                      disabled={
                        (editData.photos?.length || 0) + newPhotoFiles.length >= maxPhotos
                      }
                    >
                      <FaPlus />
                      <strong>Dodaj zdjęcia</strong>
                      <span>
                        {(editData.photos?.length || 0) + newPhotoFiles.length}/{maxPhotos}
                      </span>
                    </button>
                  )}
                </div>

                <input
                  ref={addPhotoInputRef}
                  type="file"
                  accept="image/*,.heic,.heif"
                  multiple
                  onChange={handleAddPhotosSelect}
                  style={{ display: "none" }}
                />

                <div className={styles.mediaGalleryFooter}>
                  <small className={styles.hint}>
                    Limit Twojego planu: {maxPhotos} zdjęć profilu.
                  </small>

                  {(photosUploading || avatarUploading) && (
                    <span className={styles.uploadInfo}>Trwa upload zdjęć…</span>
                  )}
                </div>
              </div>
            )}
          </EditorGroup>
          <EditorGroup unshadedPreview title={<>04 / Portfolio realizacji</>}>
            <PortfolioEditor profile={profile} editData={editData} isEditing={isEditing} setEditData={setEditData} error={formErrors.projects} />
          </EditorGroup>
        </div>
      </section>

    </>
  );
};

export default LinkMediaSection;
