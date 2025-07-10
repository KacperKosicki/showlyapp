// YourProfile.jsx (zmieniony JSX z nowym układem)
import { useEffect, useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import styles from './YourProfile.module.scss';
import AlertBox from '../AlertBox/AlertBox'; // ✅ dodaj
import {
  FaMapMarkerAlt,
  FaTags,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaStar,
  FaUserTie,
  FaLink,
  FaIdBadge,
  FaInfoCircle,
  FaBriefcase
} from 'react-icons/fa';
import { useLocation } from 'react-router-dom'; // ⬅ dodaj to

const YourProfile = ({ user, setRefreshTrigger }) => {
  const [qaErrors, setQaErrors] = useState([
    { title: '', answer: '', touched: false },
    { title: '', answer: '', touched: false },
    { title: '', answer: '', touched: false },
  ]);

  const [profile, setProfile] = useState(null);
  const [editData, setEditData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [alert, setAlert] = useState(null); // ✅ nowy stan
  const fileInputRef = useRef(null);
  const location = useLocation(); // ⬅ dodaj to pod useState

  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  useEffect(() => {
    const scrollTo = location.state?.scrollToId;
    if (!scrollTo || loading) return;

    const tryScroll = () => {
      const el = document.getElementById(scrollTo);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState({}, document.title, location.pathname);
      } else {
        requestAnimationFrame(tryScroll);
      }
    };

    requestAnimationFrame(tryScroll);
  }, [location.state, loading]);


  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/profiles/by-user/${user.uid}`);
      const profile = res.data;
      const now = new Date();
      const until = new Date(profile.visibleUntil);
      if (until < now) profile.isVisible = false;
      setProfile(profile);
      setEditData(profile);
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
      else console.error('Błąd podczas pobierania profilu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.uid) return;
    fetchProfile();
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData({ ...editData, avatar: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoChange = (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showAlert('Nieprawidłowy format pliku. Wybierz obraz.', 'warning');
      return;
    }

    if (file.size > 3 * 1024 * 1024) { // 3 MB limit
      showAlert('Zdjęcie jest za duże (maks. 3MB).', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const updatedPhotos = [...(editData.photos || [])];
      updatedPhotos[index] = reader.result;
      setEditData({ ...editData, photos: updatedPhotos });
    };
    reader.readAsDataURL(file);
  };

  const handleAddPhoto = () => {
    if ((editData.photos || []).length >= 5) {
      showAlert('Można dodać maksymalnie 5 zdjęć.', 'warning');
      return;
    }
    setEditData({ ...editData, photos: [...(editData.photos || []), ''] });
  };

  const handleRemovePhoto = (index) => {
    const updatedPhotos = [...(editData.photos || [])];
    updatedPhotos.splice(index, 1);
    setEditData({ ...editData, photos: updatedPhotos });
  };

  const validateEditData = (data) => {
    const errors = {};
    if (!data.name?.trim() || data.name.length > 30) errors.name = 'Podaj nazwę (maks. 30 znaków)';
    if (!data.role?.trim() || data.role.length > 40) errors.role = 'Podaj rolę (maks. 40 znaków)';
    if (!data.location?.trim() || data.location.length > 30) errors.location = 'Podaj lokalizację (maks. 30 znaków)';
    const nonEmptyTags = (data.tags || []).filter(tag => tag.trim() !== '');
    if (nonEmptyTags.length === 0) errors.tags = 'Podaj przynajmniej 1 tag';
    if (data.description?.length > 500) errors.description = 'Opis nie może przekraczać 500 znaków';
    if (!data.profileType) errors.profileType = 'Wybierz typ profilu';
    const priceFrom = Number(data.priceFrom);
    const priceTo = Number(data.priceTo);
    if (!priceFrom || priceFrom < 1 || priceFrom > 100000) errors.priceFrom = 'Cena od musi być w zakresie 1–100 000';
    if (!priceTo || priceTo < priceFrom || priceTo > 1000000) errors.priceTo = 'Cena do musi być większa niż "od" i nie większa niż 1 000 000';
    const quickAnswers = editData.quickAnswers || [];
    const invalidQA = quickAnswers.some(qa => {
      const titleLength = qa.title?.trim().length || 0;
      const answerLength = qa.answer?.trim().length || 0;

      const hasTitle = titleLength > 0;
      const hasAnswer = answerLength > 0;

      return (
        (hasTitle && !hasAnswer) ||
        (!hasTitle && hasAnswer) ||
        (hasTitle && titleLength > 10) ||      // ✅ zmienione z "titleWords"
        (hasAnswer && answerLength > 64)
      );
    });

    if (invalidQA) {
      errors.quickAnswers = 'Każda szybka odpowiedź musi zawierać oba pola. Tytuł max. 10 znaków, odpowiedź max. 64 znaki.';
    }
    return errors;
  };

  const handleExtendVisibility = async () => {
    try {
      await axios.patch(`${process.env.REACT_APP_API_URL}/api/profiles/extend/${user.uid}`);
      await fetchProfile();
      setRefreshTrigger(Date.now()); // 👈 DODAĆ TO
    } catch (err) {
      console.error('❌ Błąd przedłużania widoczności:', err);
      showAlert('Nie udało się przedłużyć widoczności.', 'error'); // ✅
    }
  };

  const handleSaveChanges = async () => {
    const errors = validateEditData(editData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      showAlert('Uzupełnij poprawnie wszystkie wymagane pola.', 'warning'); // ✅
      return;
    }
    try {
      await axios.patch(`${process.env.REACT_APP_API_URL}/api/profiles/update/${user.uid}`, {
        ...editData,
        tags: (editData.tags || []).filter(tag => tag.trim() !== ''),
        quickAnswers: (editData.quickAnswers || []).filter(qa => qa.title.trim() || qa.answer.trim()),
      });
      await fetchProfile();
      setIsEditing(false);
      showAlert('Zapisano zmiany!', 'success'); // ✅
    } catch (err) {
      console.error('❌ Błąd zapisu profilu:', err);
      showAlert('Wystąpił błąd podczas zapisywania.', 'error'); // ✅
    }
  };

  if (!user) return <Navigate to="/login" replace />;
  if (loading) return <p className={styles.loading}>⏳ Ładowanie profilu...</p>;
  if (notFound) {
    return (
      <div className={styles.noProfile}>
        <p>Nie masz jeszcze wizytówki.</p>
        <a href="/create-profile" className={styles.createLink}>Stwórz swoją wizytówkę</a>
      </div>
    );
  }

  return (
    <div className={styles.profile} id="scrollToId">
      {alert && <AlertBox message={alert.message} type={alert.type} onClose={() => setAlert(null)} />}
      <h2>Twoja wizytówka</h2>

      {!profile.isVisible && (
        <div className={styles.expiredNotice}>
          <p>🔒 Twoja wizytówka jest <strong>niewidoczna</strong>.</p>
          <p>Wygasła: <strong>{new Date(profile.visibleUntil).toLocaleDateString()}</strong></p>
          <button onClick={handleExtendVisibility}>Przedłuż widoczność</button>
        </div>
      )}

      <div className={styles.card}>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className={styles.editTopRight}>
            ✏️ Edytuj profil
          </button>
        )}
        <div className={styles.avatarTop}>
          <div
            className={styles.avatarWrapper}
            onClick={() => isEditing && fileInputRef.current.click()}
            style={{ cursor: isEditing ? 'pointer' : 'default' }}
          >
            <img
              src={isEditing ? editData.avatar : profile.avatar || '/images/default-avatar.png'}
              alt="Avatar"
              className={styles.avatar}
            />
            {isEditing && <div className={styles.avatarOverlay}>Kliknij zdjęcie, aby zmienić</div>}
          </div>
          {isEditing && (
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
          )}
        </div>

        <div className={styles.right}>
          <h3>{profile.name}</h3>

          <h4 className={styles.sectionTitle}>1. Dane podstawowe</h4>

          <div className={styles.inputBlock}>
            <label><FaUserTie /> <strong>Rola:</strong></label>
            <p>{profile.role}</p>
          </div>

          <div className={styles.inputBlock}>
            <label><FaIdBadge /> <strong>Typ profilu:</strong></label>
            {isEditing ? (
              <>
                <select
                  className={styles.formInput}
                  value={editData.profileType || ''}
                  onChange={(e) => setEditData({ ...editData, profileType: e.target.value })}
                >
                  <option value="hobbystyczny">Hobby</option>
                  <option value="zawodowy">Zawód</option>
                  <option value="serwis">Serwis</option>
                  <option value="społeczność">Społeczność</option>
                </select>
                {formErrors.profileType && <small className={styles.error}>{formErrors.profileType}</small>}
              </>
            ) : (
              <p>{profile.profileType}</p>
            )}
          </div>

          <div className={styles.inputBlock}>
            <label><FaMapMarkerAlt /> <strong>Lokalizacja:</strong></label>
            {isEditing ? (
              <>
                <input
                  type="text"
                  className={styles.formInput}
                  value={editData.location || ''}
                  onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                />
                {formErrors.location && <small className={styles.error}>{formErrors.location}</small>}
              </>
            ) : (
              <p>{profile.location}</p>
            )}
          </div>

          <h4 className={styles.sectionTitle}>2. Wygląd i opis</h4>
          <div className={styles.descriptionBlock}>
            <div className={styles.descriptionHeader}>
              <FaInfoCircle />
              <strong>Opis:</strong>
            </div>
            {isEditing ? (
              <>
                <textarea
                  value={editData.description || ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={4}
                  className={styles.formTextarea}
                  maxLength={500}
                />
                <small>{editData.description?.length || 0}/500 znaków</small>
                {formErrors.description && <small className={styles.error}>{formErrors.description}</small>}
              </>
            ) : profile.description ? (
              <p className={styles.descriptionText}>{profile.description}</p>
            ) : (
              <p className={styles.noInfo}><span className={styles.icon}>❔</span> Nie dodałeś/aś jeszcze opisu.</p>
            )}

          </div>

          <h4 className={styles.sectionTitle}>3. Dostępność i usługi</h4>
          <div className={styles.pricingBlock}>
            <p><FaMoneyBillWave /> <strong>Cennik:</strong></p>
            {isEditing ? (
              <>
                <label>
                  od:
                  <input type="number" className={styles.formInput} value={editData.priceFrom || ''} onChange={(e) => setEditData({ ...editData, priceFrom: e.target.value })} />
                  {formErrors.priceFrom && <small className={styles.error}>{formErrors.priceFrom}</small>}
                </label>
                <label>
                  do:
                  <input type="number" className={styles.formInput} value={editData.priceTo || ''} onChange={(e) => setEditData({ ...editData, priceTo: e.target.value })} />
                  {formErrors.priceTo && <small className={styles.error}>{formErrors.priceTo}</small>}
                </label>
              </>
            ) : (
              <>
                <p><strong>od:</strong> {profile.priceFrom} zł</p>
                <p><strong>do:</strong> {profile.priceTo} zł</p>
              </>
            )}
          </div>

          <div className={styles.inputBlock}>
            <label><FaCalendarAlt /> <strong>Data dostępności:</strong></label>
            {isEditing ? (
              <input
                type="date"
                className={styles.formInput}
                value={editData.availabilityDate?.slice(0, 10) || ''}
                onChange={(e) => setEditData({ ...editData, availabilityDate: e.target.value })}
              />
            ) : (
              <p>
                {profile.availabilityDate ? (
                  profile.availabilityDate
                ) : (
                  <p className={styles.noInfo}><span className={styles.icon}>❔</span> Nie ustawiłeś/aś jeszcze daty dostępności.</p>
                )}
              </p>
            )}
          </div>

          <h4 className={styles.sectionTitle}>4. Linki i media</h4>

          <div className={styles.inputBlock}>
            <label><FaTags /> <strong>Tagi:</strong></label>
            {isEditing ? (
              <div className={styles.tagsWrapper}>
                {[0, 1, 2].map(i => (
                  <input key={i} type="text" className={styles.formInput} value={editData.tags?.[i] || ''} placeholder={`Tag ${i + 1}`} onChange={(e) => {
                    const newTags = [...(editData.tags || [])];
                    newTags[i] = e.target.value;
                    setEditData({ ...editData, tags: newTags });
                  }} />
                ))}
                {formErrors.tags && <small className={styles.error}>{formErrors.tags}</small>}
              </div>
            ) : (
              <span className={styles.tags}>
                {profile.tags.map(tag => (
                  <span key={tag}>{tag.toUpperCase()}</span>
                ))}
              </span>
            )}
          </div>

          <div className={styles.inputBlock}>
            <label><FaLink /> <strong>Linki:</strong></label>
            {isEditing ? (
              <div className={styles.linksWrapper}>
                {[0, 1, 2].map(i => (
                  <input
                    key={i}
                    type="text"
                    className={styles.formInput}
                    value={editData.links?.[i] || ''}
                    placeholder={`Link ${i + 1}`}
                    onChange={(e) => {
                      const newLinks = [...(editData.links || [])];
                      newLinks[i] = e.target.value;
                      setEditData({ ...editData, links: newLinks });
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.linkSection}>
                <div className={styles.links}>
                  {profile.links?.filter(l => l)?.length > 0 ? (
                    profile.links.filter(l => l).map((link, i) => (
                      <a key={i} href={link} target="_blank" rel="noopener noreferrer">{link}</a>
                    ))
                  ) : (
                    <p className={styles.noInfo}><span className={styles.icon}>❔</span> Nie dodałeś/aś jeszcze linków.</p>
                  )}
                </div>
              </div>
            )}
          </div>


          <h4 className={styles.sectionTitle}>5. Galeria zdjęć</h4>
          <div className={styles.galleryEditor}>
            {isEditing ? (
              <>
                {(editData.photos || []).map((photo, index) => (
                  <div key={index} className={styles.photoItem}>
                    <img src={photo} alt={`Zdjęcie ${index + 1}`} />
                    <div className={styles.photoButtons}>
                      <button onClick={() => handleRemovePhoto(index)}>🗑️ Usuń</button>
                      <label className={styles.replaceLabel}>
                        🔄 Zamień
                        <input type="file" accept="image/*" onChange={(e) => handlePhotoChange(e, index)} />
                      </label>
                    </div>
                  </div>
                ))}
                {editData.photos?.length < 5 && (
                  <button className={styles.addPhotoBtn} onClick={handleAddPhoto}>➕ Dodaj zdjęcie</button>
                )}
              </>
            ) : (
              <div className={styles.galleryView}>
                {profile.photos?.length > 0 ? (
                  profile.photos.map((photo, i) => (
                    <img key={i} src={photo} alt={`Zdjęcie ${i + 1}`} />
                  ))
                ) : (
                  <p className={styles.noInfo}><span className={styles.icon}>❔</span> Nie dodałeś/aś jeszcze zdjęcia.</p>
                )}
              </div>
            )}
          </div>

          <h4 className={styles.sectionTitle}>6. Informacje dodatkowe</h4>
          {profile.hasBusiness && (
            <p><FaBriefcase /> <strong>Działalność gospodarcza:</strong> Tak (NIP: {profile.nip || 'brak'})</p>
          )}
          <p><FaStar /> <strong>Ocena:</strong> {profile.rating} ⭐ ({profile.reviews} opinii)</p>

          <h4 className={styles.sectionTitle}>7. Szybkie odpowiedzi (FAQ)</h4>
          {isEditing ? (
            <div className={styles.quickAnswers}>
              {[0, 1, 2].map(i => {
                const qaArray = editData.quickAnswers?.length === 3
                  ? [...editData.quickAnswers]
                  : [{}, {}, {}].map((_, idx) => editData.quickAnswers?.[idx] || { title: '', answer: '' });

                const title = qaArray[i].title || '';
                const answer = qaArray[i].answer || '';

                return (
                  <div key={i} className={styles.qaRow}>
                    <input
                      type="text"
                      className={`${styles.formInput} ${qaErrors[i]?.title ? styles.inputError : ''}`}
                      placeholder={`Tytuł #${i + 1}`}
                      value={title}
                      maxLength={80} // zabezpieczenie
                      onChange={(e) => {
                        let value = e.target.value;

                        if (value.length > 10) {
                          value = value.slice(0, 10); // ✅ przycinanie do 10 znaków
                        }

                        const newQA = [...qaArray];
                        newQA[i].title = value;

                        const newErrors = [...qaErrors];
                        newErrors[i].touched = true;

                        if (!value.trim()) newErrors[i].title = 'Tytuł jest wymagany';
                        else if (value.length > 10) newErrors[i].title = 'Tytuł max. 10 znaków';
                        else newErrors[i].title = '';

                        setEditData({ ...editData, quickAnswers: newQA });
                        setQaErrors(newErrors);
                      }}
                    />
                    <input
                      type="text"
                      className={`${styles.formInput} ${qaErrors[i]?.answer ? styles.inputError : ''}`}
                      placeholder={`Odpowiedź #${i + 1}`}
                      value={answer}
                      maxLength={64}
                      onChange={(e) => {
                        let value = e.target.value;

                        if (value.length > 64) {
                          value = value.slice(0, 64); // utnij do 64 znaków
                        }

                        const newQA = [...qaArray];
                        newQA[i].answer = value;

                        const newErrors = [...qaErrors];
                        newErrors[i].touched = true;

                        if (!value.trim()) newErrors[i].answer = 'Odpowiedź jest wymagana';
                        else if (value.length > 64) newErrors[i].answer = 'Maks. 64 znaki';
                        else newErrors[i].answer = '';

                        setEditData({ ...editData, quickAnswers: newQA });
                        setQaErrors(newErrors);
                      }}


                    />
                    {qaErrors[i]?.touched && qaErrors[i]?.title && <small className={styles.error}>{qaErrors[i].title}</small>}
                    {qaErrors[i]?.touched && qaErrors[i]?.answer && (
                      <small className={styles.error}>{qaErrors[i].answer}</small>
                    )}

                  </div>
                );
              })}

            </div>
          ) : (
            <>
              {profile.quickAnswers?.length > 0 ? (
                <ul className={styles.quickAnswersView}>
                  {profile.quickAnswers.map((qa, i) => (
                    <li key={i}>
                      <strong>{qa.title}:</strong> {qa.answer}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.noInfo}><span className={styles.icon}>❔</span> Nie dodałeś/aś jeszcze szybkiej odpowiedzi.</p>
              )}
            </>
          )}
          {formErrors.quickAnswers && <small className={styles.error}>{formErrors.quickAnswers}</small>}

          {isEditing && (
            <div className={styles.editButtons}>
              <button onClick={handleSaveChanges}>💾 Zapisz</button>
              <button onClick={() => setIsEditing(false)}>❌ Anuluj</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default YourProfile;
