import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import styles from "./ProfilesHub.module.scss";
import UserCard from "../UserCard/UserCard";
import {
    FiSearch,
    FiGrid,
    FiStar,
    FiUsers,
    FiRefreshCw,
} from "react-icons/fi";
import { FiMapPin, FiSliders, FiX, FiArrowDown, FiHeart, FiArrowLeft, FiArrowRight, FiArrowUpRight } from "react-icons/fi";
import { discoverProfiles } from "./profileDiscovery";

const API = process.env.REACT_APP_API_URL;

const normalizeCategory = (category) => {
    if (!category) return "Inne";
    if (typeof category === "string") return category;
    return category.label || "Inne";
};

const getProfileTypeLabel = (type) => {
    if (type === "zawodowy") return "Zawodowe";
    if (type === "hobbystyczny") return "Hobby";
    if (type === "serwis") return "Serwis";
    if (type === "społeczność") return "Społeczność";
    return "Inne";
};

const getBookingLabel = (mode) => {
    if (mode === "calendar") return "Kalendarz";
    if (mode === "request-open") return "Zapytania";
    if (mode === "request-blocking") return "Blokowanie dni";
    return "Bez rezerwacji";
};

const ProfilesHub = ({ currentUser, setAlert }) => {
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get("q") || "";
    const setQuery = value => setSearchParams(previous => {
        const next = new URLSearchParams(previous);
        if (value.trim()) next.set("q", value); else next.delete("q");
        return next;
    }, { replace: true });
    const trackRef = useRef(null);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(false);


    const [profiles, setProfiles] = useState([]);
    const [activeCategory, setActiveCategory] = useState("Wszystkie");
    const [activeType, setActiveType] = useState("Wszystkie");
    const [activeBooking, setActiveBooking] = useState("Wszystkie");
    const [sort, setSort] = useState("popular");
    const [loading, setLoading] = useState(true);
    const [place, setPlace] = useState('');
    const [ratedOnly, setRatedOnly] = useState(false);
    const [favoritesOnly, setFavoritesOnly] = useState(false);
    const [visibleCount, setVisibleCount] = useState(12);
    const [fetchError, setFetchError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [filtersOpen, setFiltersOpen] = useState(() => window.matchMedia?.('(min-width: 1000px)').matches ?? true);

    useEffect(() => {
        const media = window.matchMedia?.('(min-width: 1000px)');
        if (!media) return undefined;
        const update = event => setFiltersOpen(event.matches);
        media.addEventListener?.('change', update);
        return () => media.removeEventListener?.('change', update);
    }, []);

    useEffect(() => {
        const scrollTo = location.state?.scrollToId;
        if (!scrollTo) return;

        const frame = requestAnimationFrame(() => {
            document.getElementById(scrollTo)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        return () => cancelAnimationFrame(frame);
    }, [location.state, location.pathname]);

    useEffect(() => {
        const controller = new AbortController();

        const getAuthHeader = async () => {
            try {
                const { auth } = await import("../../firebase");
                const u = auth.currentUser;

                if (!u) return {};

                const token = await u.getIdToken();

                return {
                    Authorization: `Bearer ${token}`,
                };
            } catch {
                return {};
            }
        };

        const fetchProfiles = async () => {
            try {
                setLoading(true);
                setFetchError(false);

                const res = await fetch(`${API}/api/profiles`, {
                    signal: controller.signal,
                });

                if (!res.ok) throw new Error("Nie udało się pobrać profili");

                const data = await res.json();
                const baseProfiles = Array.isArray(data) ? data : [];

                if (!currentUser?.uid) {
                    setProfiles(baseProfiles);
                    return;
                }

                const authHeader = await getAuthHeader();

                if (!authHeader.Authorization) {
                    setProfiles(baseProfiles);
                    return;
                }

                try {
                    const favRes = await fetch(`${API}/api/favorites/my`, {
                        headers: {
                            ...authHeader,
                        },
                        signal: controller.signal,
                    });

                    if (!favRes.ok) {
                        setProfiles(baseProfiles);
                        return;
                    }

                    const favData = await favRes.json();

                    const favSet = new Set(
                        (Array.isArray(favData) ? favData : [])
                            .map((p) => p?.userId || p?.profileUserId)
                            .filter(Boolean)
                    );

                    const mergedProfiles = baseProfiles.map((profile) => ({
                        ...profile,
                        isFavorite: favSet.has(profile.userId),
                    }));

                    setProfiles(mergedProfiles);
                } catch (err) {
                    if (err?.name === "AbortError") return;

                    setProfiles(baseProfiles);
                }
            } catch (err) {
                if (err?.name === "AbortError") return;

                setFetchError(true);
                setProfiles([]);

                if (typeof setAlert === "function") {
                    setAlert({
                        type: "error",
                        message: "Nie udało się pobrać profili.",
                    });
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProfiles();

        return () => controller.abort();
    }, [currentUser?.uid, setAlert, reloadKey]);

    useEffect(() => {
        const onFavoritesUpdated = (event) => {
            const { profileUserId, isFav, count } = event.detail || {};

            if (!profileUserId) return;

            setProfiles((prev) =>
                prev.map((profile) => {
                    if (profile.userId !== profileUserId) return profile;

                    return {
                        ...profile,
                        isFavorite: isFav,
                        favoritesCount:
                            typeof count === "number" ? count : profile.favoritesCount,
                    };
                })
            );
        };

        window.addEventListener("showly:favorites-updated", onFavoritesUpdated);

        return () => {
            window.removeEventListener("showly:favorites-updated", onFavoritesUpdated);
        };
    }, []);

    const categories = useMemo(() => {
        const map = new Map();

        profiles.forEach((profile) => {
            const category = normalizeCategory(profile.category);
            map.set(category, (map.get(category) || 0) + 1);
        });

        return [
            { label: "Wszystkie", count: profiles.length },
            ...Array.from(map.entries()).map(([label, count]) => ({ label, count })),
        ];
    }, [profiles]);

    const profileTypes = useMemo(() => {
        const map = new Map();

        profiles.forEach((profile) => {
            const label = getProfileTypeLabel(profile.profileType);
            map.set(label, (map.get(label) || 0) + 1);
        });

        return [
            { label: "Wszystkie", count: profiles.length },
            ...Array.from(map.entries()).map(([label, count]) => ({ label, count })),
        ];
    }, [profiles]);

    const bookingModes = useMemo(() => {
        const map = new Map();

        profiles.forEach((profile) => {
            const label = getBookingLabel(profile.bookingMode);
            map.set(label, (map.get(label) || 0) + 1);
        });

        return [
            { label: "Wszystkie", count: profiles.length },
            ...Array.from(map.entries()).map(([label, count]) => ({ label, count })),
        ];
    }, [profiles]);

    const places = useMemo(() => [...new Set(profiles.map(profile => profile.location).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'pl')), [profiles]);

    const quickSuggestions = useMemo(() => {
        const branches = categories.filter(category => category.label !== 'Wszystkie' && category.label !== 'Inne');
        if (branches.length) return branches.slice(0, 5).map(category => ({ label: category.label, kind: 'category' }));
        const counts = new Map();
        profiles.forEach(profile => (Array.isArray(profile.tags) ? profile.tags : []).forEach(tag => {
            if (typeof tag === 'string' && tag.trim()) counts.set(tag, (counts.get(tag) || 0) + 1);
        }));
        return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label]) => ({ label, kind: 'query' }));
    }, [categories, profiles]);

    const filteredProfiles = useMemo(() => discoverProfiles(profiles, {
        query, place, category: activeCategory, type: activeType, booking: activeBooking,
        sort, ratedOnly, favoritesOnly: Boolean(currentUser?.uid) && favoritesOnly,
    }, { category: normalizeCategory, type: getProfileTypeLabel, booking: getBookingLabel }),
    [profiles, query, place, activeCategory, activeType, activeBooking, sort, ratedOnly, favoritesOnly, currentUser?.uid]);

    useEffect(() => { setVisibleCount(12); }, [query, place, activeCategory, activeType, activeBooking, sort, ratedOnly, favoritesOnly]);

    const updateCarousel = useCallback(() => {
        const track = trackRef.current;
        if (!track) return;
        setCanLeft(track.scrollLeft > 4);
        setCanRight(track.scrollWidth - track.clientWidth - track.scrollLeft > 4);
    }, []);

    useEffect(() => {
        const track = trackRef.current;
        if (!track) return undefined;
        updateCarousel();
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateCarousel) : null;
        observer?.observe(track);
        window.addEventListener('resize', updateCarousel);
        return () => { observer?.disconnect(); window.removeEventListener('resize', updateCarousel); };
    }, [loading, filteredProfiles.length, visibleCount, updateCarousel]);

    useEffect(() => {
        trackRef.current?.scrollTo?.({ left: 0, behavior: 'auto' });
        updateCarousel();
    }, [query, place, activeCategory, activeType, activeBooking, sort, ratedOnly, favoritesOnly, updateCarousel]);

    const scrollProfiles = direction => {
        const track = trackRef.current;
        if (!track) return;
        const width = track.querySelector('[role="listitem"]')?.getBoundingClientRect().width || 360;
        const gap = parseFloat(getComputedStyle(track).gap) || 20;
        track.scrollTo({ left: Math.max(0, Math.min(track.scrollLeft + direction * (width + gap), track.scrollWidth - track.clientWidth)),
            behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };

    const resetFilters = () => {
        setQuery("");
        setActiveCategory("Wszystkie");
        setActiveType("Wszystkie");
        setActiveBooking("Wszystkie");
        setSort("popular");
        setPlace("");
        setRatedOnly(false);
        setFavoritesOnly(false);
    };

    const chips = [
        query.trim() && { label: 'Szukasz: ' + query.trim(), clear: () => setQuery('') },
        place.trim() && { label: 'Miejsce: ' + place.trim(), clear: () => setPlace('') },
        activeCategory !== 'Wszystkie' && { label: activeCategory, clear: () => setActiveCategory('Wszystkie') },
        activeType !== 'Wszystkie' && { label: activeType, clear: () => setActiveType('Wszystkie') },
        activeBooking !== 'Wszystkie' && { label: activeBooking, clear: () => setActiveBooking('Wszystkie') },
        ratedOnly && { label: 'Ocena 4+', clear: () => setRatedOnly(false) },
        currentUser?.uid && favoritesOnly && { label: 'Ulubione', clear: () => setFavoritesOnly(false) },
    ].filter(Boolean);

    return (
        <section className={styles.section} id="profilesHub" aria-labelledby="profiles-hub-title">
            <div className={styles.background} aria-hidden="true"><span className={styles.bigWord}>ZNAJDŹ SWÓJ KLIMAT</span><span className={styles.dotField} /></div>
            <div className={styles.inner}>
                <header className={styles.header}>
                    <div><h2 id="profiles-hub-title">Dobra oferta.<br /><span>Właściwy człowiek.</span></h2><p>Znajdź usługę, poznaj styl i wybierz kogoś, kto pasuje do Twojego pomysłu.</p></div>
                    <div className={styles.directoryNote}><FiUsers aria-hidden="true" /><strong>{loading ? '…' : profiles.length}</strong><span>profili do odkrycia</span><small>Lokalnie i online · Twój wybór</small></div>
                </header>
                <div className={styles.searchPanel}><header className={styles.searchPanelHeading}><h3>Zacznij od swojego pomysłu.</h3><FiSearch aria-hidden="true" /></header>
                    <div className={styles.searchFields}>
                        <label className={styles.searchBox}><FiSearch aria-hidden="true" /><span><span>Co lub kogo szukasz?</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Usługa, nazwa, zainteresowanie…" /></span></label>
                        <label className={styles.searchBox}><FiMapPin aria-hidden="true" /><span><span>Gdzie?</span><input type="search" list="profiles-hub-places" value={place} onChange={e => setPlace(e.target.value)} placeholder="Miasto lub miejscowość" /></span></label>
                    </div>
                    <datalist id="profiles-hub-places">{places.map(city => <option key={city} value={city} />)}</datalist>
                    {quickSuggestions.length > 0 && <div className={styles.quickCategories}><span>Na dobry początek</span>{quickSuggestions.map(suggestion => <button key={suggestion.label} type="button" aria-pressed={suggestion.kind === 'category' ? activeCategory === suggestion.label : query === suggestion.label} onClick={() => suggestion.kind === 'category' ? setActiveCategory(activeCategory === suggestion.label ? 'Wszystkie' : suggestion.label) : setQuery(query === suggestion.label ? '' : suggestion.label)}><FiArrowUpRight aria-hidden="true" />{suggestion.label}</button>)}</div>}
                    <p className={styles.searchHint}>Wyniki zmieniają się podczas pisania. Możesz łączyć kilka słów, np. „fotograf portret”.</p>
                </div>
                <div className={styles.layout}>
                    <details className={styles.filtersPanel} open={filtersOpen} onToggle={event => setFiltersOpen(event.currentTarget.open)}>
                        <summary><span><FiSliders aria-hidden="true" /> Dopasuj wyniki {chips.length > 0 && <b>{chips.length}</b>}</span><span className={styles.filterIndicator}>+</span></summary>
                        <div className={styles.filterBody}>
                            <fieldset><legend>01 / Branża</legend><div className={styles.filterList}>{categories.map(category => <button key={category.label} type="button" aria-pressed={activeCategory === category.label} onClick={() => setActiveCategory(category.label)}><span>{category.label}</span><b>{category.count}</b></button>)}</div></fieldset>
                            <fieldset><legend>02 / Charakter profilu</legend><div className={styles.filterList}>{profileTypes.map(type => <button key={type.label} type="button" aria-pressed={activeType === type.label} onClick={() => setActiveType(type.label)}><span>{type.label}</span><b>{type.count}</b></button>)}</div></fieldset>
                            <fieldset><legend>03 / Umawianie usług</legend><div className={styles.filterList}>{bookingModes.map(mode => <button key={mode.label} type="button" aria-pressed={activeBooking === mode.label} onClick={() => setActiveBooking(mode.label)}><span>{mode.label}</span><b>{mode.count}</b></button>)}</div></fieldset>
                            <fieldset><legend>04 / Jeszcze bliżej celu</legend><label className={styles.checkbox}><input type="checkbox" checked={ratedOnly} onChange={e => setRatedOnly(e.target.checked)} /><FiStar aria-hidden="true" /> Ocena co najmniej 4/5</label>{currentUser?.uid && <label className={styles.checkbox}><input type="checkbox" checked={favoritesOnly} onChange={e => setFavoritesOnly(e.target.checked)} /><FiHeart aria-hidden="true" /> Tylko moje ulubione</label>}</fieldset>
                            <button type="button" className={styles.resetButton} onClick={resetFilters}><FiRefreshCw /> Wyczyść filtry</button>
                        </div>
                    </details>
                    <div className={styles.content}>
                        <div className={styles.resultsTop}>
                            <div aria-live="polite" aria-atomic="true"><span className={styles.resultsLabel}><FiGrid aria-hidden="true" /> Twoje odkrycia</span><h3>{loading ? 'Szukamy profili…' : fetchError ? 'Katalog chwilowo niedostępny' : filteredProfiles.length + ' ' + (filteredProfiles.length === 1 ? 'dopasowany profil' : 'dopasowanych profili')}</h3></div>
                            <label className={styles.sortLabel}>Pokaż najpierw<select value={sort} onChange={e => setSort(e.target.value)}><option value="popular">Najczęściej odwiedzane</option><option value="rating">Najlepiej oceniane</option><option value="newest">Najnowsze</option></select></label>
                        </div>
                        {chips.length > 0 && <div className={styles.activeFilters} aria-label="Aktywne filtry">{chips.map(chip => <button key={chip.label} type="button" onClick={chip.clear} aria-label={'Usuń filtr: ' + chip.label}>{chip.label}<FiX aria-hidden="true" /></button>)}<button type="button" onClick={resetFilters}>Wyczyść wszystkie</button></div>}
                        {loading ? <div className={styles.skeletons} aria-label="Ładowanie profili" aria-busy="true">{[0,1,2].map(i => <div key={i} />)}</div> : fetchError ? <div className={styles.empty}><FiRefreshCw aria-hidden="true" /><h3>Spróbujmy jeszcze raz.</h3><p>Nie udało się wczytać katalogu. Odśwież wyniki za chwilę.</p><button type="button" onClick={() => setReloadKey(key => key + 1)}>Wczytaj ponownie</button></div> : filteredProfiles.length === 0 ? <div className={styles.empty}><FiSearch aria-hidden="true" /><h3>Poszukajmy trochę szerzej.</h3><p>Spróbuj krótszej nazwy, innej miejscowości lub usuń jeden z filtrów.</p><button type="button" onClick={resetFilters}>Pokaż wszystkie profile</button></div> : <>
                            <div className={styles.carouselTop}><p>Przesuwaj karty lub użyj strzałek, żeby odkrywać kolejne profile.</p><div className={styles.carouselControls}><button type="button" aria-label="Poprzedni profil" disabled={!canLeft} onClick={() => scrollProfiles(-1)}><FiArrowLeft aria-hidden="true" /></button><button type="button" aria-label="Następny profil" disabled={!canRight} onClick={() => scrollProfiles(1)}><FiArrowRight aria-hidden="true" /></button></div></div>
                            <div className={styles.cardsTrack} ref={trackRef} onScroll={updateCarousel} role="list" aria-label="Lista profili Showly" tabIndex={0} onKeyDown={event => { if (event.target !== event.currentTarget) return; if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); scrollProfiles(event.key === 'ArrowRight' ? 1 : -1); } }}>{filteredProfiles.slice(0, visibleCount).map(profile => <div className={styles.cardShell} key={profile._id || profile.userId || profile.id} role="listitem"><UserCard user={profile} currentUser={currentUser} setAlert={setAlert} /></div>)}</div>
                            <div className={styles.resultsFooter}><span>Widzisz {Math.min(visibleCount, filteredProfiles.length)} z {filteredProfiles.length} profili</span>{visibleCount < filteredProfiles.length && <button type="button" onClick={() => setVisibleCount(count => count + 12)}>Odkryj kolejne profile <FiArrowDown aria-hidden="true" /></button>}</div>
                        </>}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProfilesHub;
