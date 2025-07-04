import { useState, useRef } from 'react';
import styles from './CreateProfile.module.scss';
import axios from 'axios';
import { useNavigate, Navigate } from 'react-router-dom';
import UserCard from '../UserCard/UserCard';

const CreateProfile = ({ user, setRefreshTrigger }) => {
    const [form, setForm] = useState({
        name: '',
        avatar: '/images/other/no-image.png',
        role: '',
        location: '',
        priceFrom: '',
        priceTo: '',
        availabilityDate: '',
        available: true,
        profileType: 'zawodowy',
        description: '',
        links: ['', '', ''],
        tags: ['', '', ''],
        hasBusiness: false,
        nip: '',
    });

    const fileInputRef = useRef(null);
    const [formErrors, setFormErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    if (!user) return <Navigate to="/login" replace />;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        let newValue = value;

        if (name === 'priceFrom') {
            const numeric = parseInt(value, 10);
            if (numeric > 100000) newValue = 100000;
            else if (numeric < 1) newValue = 1;
        }

        if (name === 'priceTo') {
            const numeric = parseInt(value, 10);
            if (numeric > 1000000) newValue = 1000000;
            // NIE blokujemy wpisywania mniejszych niż priceFrom!
        }


        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : newValue,
        }));
    };


    const handleLinkChange = (index, value) => {
        const updatedLinks = [...form.links];
        updatedLinks[index] = value;
        setForm((prev) => ({ ...prev, links: updatedLinks }));
    };

    const handleTagChange = (index, value) => {
        const updatedTags = [...form.tags];
        updatedTags[index] = value;
        setForm((prev) => ({ ...prev, tags: updatedTags }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setForm((prev) => ({
                ...prev,
                avatar: reader.result,
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errors = {};

        if (!form.name.trim() || form.name.length > 30) {
            errors.name = 'Podaj nazwę (maks. 30 znaków)';
        }

        if (!form.role.trim() || form.role.length > 40) {
            errors.role = 'Podaj rolę (maks. 40 znaków)';
        }

        if (!form.location.trim() || form.location.length > 30) {
            errors.location = 'Podaj lokalizację (maks. 30 znaków)';
        }

        const nonEmptyTags = form.tags.filter(tag => tag.trim() !== '');
        if (nonEmptyTags.length === 0) {
            errors.tags = 'Podaj przynajmniej 1 tag';
        }

        if (form.description.length > 500) {
            errors.description = 'Opis nie może przekraczać 500 znaków';
        }

        if (!form.profileType) {
            errors.profileType = 'Wybierz typ profilu';
        }

        if (!form.priceFrom || form.priceFrom < 1 || form.priceFrom > 100000) {
            errors.priceFrom = 'Cena od musi być w zakresie 1–100 000';
        }

        if (!form.priceTo || form.priceTo < form.priceFrom || form.priceTo > 1000000) {
            errors.priceTo = 'Cena do musi być większa niż "od" i nie większa niż 1 000 000';
        }

        setFormErrors(errors);

        if (Object.keys(errors).length > 0) return;

        setLoading(true);

        const payload = {
            ...form,
            rating: 0,
            reviews: 0,
            tags: nonEmptyTags.map(tag => tag.trim()),
            availableDates: [],
            userId: user.uid || user.localId || user.email,
            visibleUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        };

        try {
            await axios.post('/api/profiles', payload);
            setRefreshTrigger(Date.now());
            setTimeout(() => navigate('/your-profile'), 300);
        } catch (err) {
            setFormErrors({
                general: err.response?.data?.message || 'Wystąpił błąd podczas tworzenia wizytówki',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <h2>Stwórz swoją wizytówkę</h2>
            <div className={styles.wrapper}>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <h3 className={styles.sectionTitle}>1. Dane podstawowe</h3>

                    <label>
                        Imię i nazwisko / Nazwa:
                        <input type="text" name="name" value={form.name} onChange={handleChange} maxLength={30} />
                        {formErrors.name && <small className={styles.error}>{formErrors.name}</small>}
                    </label>

                    <label>
                        Rola / Zawód / Tematyka:
                        <input type="text" name="role" value={form.role} onChange={handleChange} maxLength={40} />
                        {formErrors.role && <small className={styles.error}>{formErrors.role}</small>}
                    </label>

                    <label>
                        Typ profilu:
                        <select name="profileType" value={form.profileType} onChange={handleChange}>
                            <option value="" disabled>-- Wybierz typ profilu --</option>
                            <option value="zawodowy">Zawodowy</option>
                            <option value="hobbystyczny">Hobbystyczny</option>
                            <option value="serwis">Serwis</option>
                            <option value="społeczność">Społeczność / serwer / blog</option>
                        </select>
                        {formErrors.profileType && <small className={styles.error}>{formErrors.profileType}</small>}
                    </label>

                    <label>
                        Lokalizacja (miasto):
                        <input type="text" name="location" value={form.location} onChange={handleChange} maxLength={30} />
                        {formErrors.location && <small className={styles.error}>{formErrors.location}</small>}
                    </label>

                    <h3 className={styles.sectionTitle}>2. Wygląd i opis</h3>

                    <label>
                        Avatar (z pliku):
                        <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} />
                    </label>
                    <button
                        type="button"
                        className={styles.resetAvatar}
                        onClick={() => {
                            setForm((prev) => ({ ...prev, avatar: '/images/other/no-image.png' }));
                            if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                            }
                        }}
                    >
                        Przywróć domyślny avatar
                    </button>

                    <label>
                        Opis działalności / O mnie:
                        <textarea name="description" value={form.description} onChange={handleChange} maxLength={500} />
                        <small>{form.description.length}/500 znaków</small>
                        {formErrors.description && <small className={styles.error}>{formErrors.description}</small>}
                    </label>

                    <label>
                        Tagi (maksymalnie 3):
                        {form.tags.map((tag, index) => (
                            <div key={index} className={styles.tagInputWrapper}>
                                <input
                                    type="text"
                                    placeholder={`Tag ${index + 1}`}
                                    value={tag}
                                    maxLength={20}
                                    onChange={(e) => handleTagChange(index, e.target.value)}
                                />
                            </div>
                        ))}
                        {formErrors.tags && <small className={styles.error}>{formErrors.tags}</small>}
                    </label>

                    <h3 className={styles.sectionTitle}>3. Dostępność i usługi</h3>

                    <label>
                        Cennik od:
                        <input
                            type="number"
                            name="priceFrom"
                            value={form.priceFrom}
                            onChange={handleChange}
                            min={1}
                            max={100000}
                        />
                        {formErrors.priceFrom && <small className={styles.error}>{formErrors.priceFrom}</small>}
                    </label>

                    <label>
                        Cennik do:
                        <input
                            type="number"
                            name="priceTo"
                            value={form.priceTo}
                            onChange={handleChange}
                            min={form.priceFrom || 1}
                            max={1000000}
                        />
                        {formErrors.priceTo && <small className={styles.error}>{formErrors.priceTo}</small>}
                    </label>

                    <label>
                        Data dostępności:
                        <input type="date" name="availabilityDate" value={form.availabilityDate} onChange={handleChange} />
                    </label>

                    <h3 className={styles.sectionTitle}>4. Linki i media</h3>
                    <label>
                        Linki zewnętrzne:
                        {form.links.map((link, index) => (
                            <input
                                key={index}
                                type="url"
                                placeholder={`Link ${index + 1}`}
                                value={link}
                                onChange={(e) => handleLinkChange(index, e.target.value)}
                            />
                        ))}
                    </label>

                    <h3 className={styles.sectionTitle}>5. Informacje dodatkowe</h3>

                    <label className={styles.checkbox}>
                        <input type="checkbox" name="hasBusiness" checked={form.hasBusiness} onChange={handleChange} />
                        Posiadam działalność gospodarczą
                    </label>

                    {form.hasBusiness && (
                        <label>
                            NIP (opcjonalnie):
                            <input type="text" name="nip" value={form.nip} onChange={handleChange} />
                        </label>
                    )}

                    <button type="submit" disabled={loading}>
                        {loading ? 'Tworzenie...' : 'Utwórz wizytówkę'}
                    </button>
                    {formErrors.general && <p className={styles.error}>{formErrors.general}</p>}
                </form>

                <div className={styles.preview}>
                    <h3 className={styles.previewTitle}>Podgląd wizytówki</h3>
                    <UserCard
                        user={{
                            ...form,
                            tags: form.tags.filter(tag => tag.trim() !== '' && tag.length <= 20),
                            rating: 0,
                            reviews: 0,
                            availableDates: [],
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default CreateProfile;
