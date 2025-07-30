import { useState, useRef, useEffect } from 'react';
import styles from './CreateProfile.module.scss';
import axios from 'axios';
import { useNavigate, Navigate } from 'react-router-dom';
import UserCard from '../UserCard/UserCard';
import { useLocation } from 'react-router-dom';

const CreateProfile = ({ user, setRefreshTrigger }) => {
    const [form, setForm] = useState({
        name: '',
        avatar: '/images/other/no-image.png',
        role: '',
        location: '',
        priceFrom: '',
        priceTo: '',
        availabilityDate: '',
        services: [],
        available: true,
        profileType: 'zawodowy',
        description: '',
        links: ['', '', ''],
        tags: ['', '', ''],
        hasBusiness: false,
        nip: '',
        bookingMode: 'request-open',
        workingHours: { from: '08:00', to: '20:00' },
        workingDays: [1, 2, 3, 4, 5],
    });

    const [newService, setNewService] = useState({
        name: '',
        durationValue: '',
        durationUnit: 'minutes'
    });
    const location = useLocation();
    const fileInputRef = useRef(null);
    const [formErrors, setFormErrors] = useState({});
    const [serviceError, setServiceError] = useState('');

    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const scrollTo = location.state?.scrollToId;
        if (!scrollTo) return;

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
    }, [location.state]);

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

        // WALIDACJA USŁUG!
        if ((form.services || []).some(s =>
            (s.duration.unit === 'minutes' && s.duration.value < 15) ||
            (s.duration.unit === 'hours' && s.duration.value < 1) ||
            (s.duration.unit === 'days' && s.duration.value < 1)
        )) {
            errors.services = 'Każda usługa musi mieć minimum 15 minut, 1 godzinę lub 1 dzień!';
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
            services: form.services,
            userId: user.uid || user.localId || user.email,
            visibleUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        };

        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/api/profiles`, payload);
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

    const mapUnit = (unit) => {
        switch (unit) {
            case 'minutes': return 'min';
            case 'hours': return 'h';
            case 'days': return 'dni';
            default: return '';
        }
    };


    return (
        <div id="scrollToId" className={styles.container}>
            <h2 className={styles.formMainHeading}>Stwórz swoją wizytówkę</h2>
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

                    {form.services.length > 0 && (
                        <ul className={styles.serviceList}>
                            {form.services.map((s, i) => (
                                <li key={i}>
                                    <strong>{s.name}</strong> – {s.duration.value} {mapUnit(s.duration.unit)}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setForm((prev) => ({
                                                ...prev,
                                                services: prev.services.filter((_, idx) => idx !== i)
                                            }))
                                        }
                                    >
                                        Usuń
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}


                    <label>
                        Dodaj usługę:
                        <div className={styles.serviceForm}>
                            <input
                                type="text"
                                placeholder="Nazwa usługi (np. Strzyżenie)"
                                value={newService.name}
                                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                            />
                            <input
                                type="number"
                                placeholder="Czas"
                                min="1"
                                value={newService.durationValue}
                                onChange={(e) =>
                                    setNewService({ ...newService, durationValue: e.target.value })
                                }
                            />
                            <select
                                value={newService.durationUnit}
                                onChange={(e) =>
                                    setNewService({ ...newService, durationUnit: e.target.value })
                                }
                            >
                                <option value="minutes">minuty</option>
                                <option value="hours">godziny</option>
                                <option value="days">dni</option>
                            </select>

                            <button
                                type="button"
                                onClick={() => {
                                    if (
                                        newService.name.trim() &&
                                        (
                                            (newService.durationUnit === 'minutes' && newService.durationValue >= 15) ||
                                            (newService.durationUnit === 'hours' && newService.durationValue >= 1) ||
                                            (newService.durationUnit === 'days' && newService.durationValue >= 1)
                                        ) &&
                                        ['minutes', 'hours', 'days'].includes(newService.durationUnit)
                                    ) {
                                        setForm((prev) => ({
                                            ...prev,
                                            services: [
                                                ...prev.services,
                                                {
                                                    name: newService.name.trim(),
                                                    duration: {
                                                        value: parseInt(newService.durationValue, 10),
                                                        unit: newService.durationUnit
                                                    }
                                                }
                                            ]
                                        }));
                                        setNewService({ name: '', durationValue: '', durationUnit: 'minutes' });
                                        setServiceError('');
                                    } else {
                                        setServiceError('Podaj nazwę usługi oraz czas: minimum 15 minut, 1 godzinę lub 1 dzień!');
                                    }
                                }}
                            >
                                Dodaj
                            </button>
                        </div>
                        {serviceError && <small className={styles.error}>{serviceError}</small>}
                    </label>


                    <label>
                        Tryb działania rezerwacji:
                        <select name="bookingMode" value={form.bookingMode} onChange={handleChange}>
                            <option value="calendar">Kalendarz godzinowy (np. fryzjer, korepetytor)</option>
                            <option value="request-blocking">Zablokuj dzień (np. DJ, cukiernik)</option>
                            <option value="request-open">Zapytanie bez blokowania (np. programista)</option>
                        </select>
                    </label>

                    {form.bookingMode === 'calendar' && (
                        <>
                            <h4 className={styles.sectionTitle}>Godziny pracy</h4>
                            <label className={styles.inputBlock}>
                                Od:
                                <input
                                    type="time"
                                    name="workingHours.from"
                                    value={form.workingHours.from}
                                    onChange={e => {
                                        const from = e.target.value;
                                        setForm(f => ({
                                            ...f,
                                            workingHours: { ...f.workingHours, from }
                                        }));
                                    }}
                                />
                            </label>
                            <label className={styles.inputBlock}>
                                Do:
                                <input
                                    type="time"
                                    name="workingHours.to"
                                    value={form.workingHours.to}
                                    onChange={e => {
                                        const to = e.target.value;
                                        setForm(f => ({
                                            ...f,
                                            workingHours: { ...f.workingHours, to }
                                        }));
                                    }}
                                />
                            </label>

                            <h4 className={styles.sectionTitle}>Dni pracy</h4>
                            <fieldset className={styles.fieldset}>
                                {[1, 2, 3, 4, 5, 6, 0].map(d => (
                                    <label key={d} className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            value={d}
                                            checked={form.workingDays.includes(d)}
                                            onChange={e => {
                                                const day = Number(e.target.value);
                                                setForm(f => {
                                                    const days = f.workingDays.includes(day)
                                                        ? f.workingDays.filter(x => x !== day)
                                                        : [...f.workingDays, day];
                                                    return { ...f, workingDays: days };
                                                });
                                            }}
                                        />
                                        {['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'][d]}
                                    </label>
                                ))}
                            </fieldset>
                        </>
                    )}
                    {formErrors.services && <small className={styles.error}>{formErrors.services}</small>}

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
