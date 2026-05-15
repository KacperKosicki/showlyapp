import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import styles from "./ProfilesHub.module.scss";
import UserCard from "../UserCard/UserCard";
import {
    FiSearch,
    FiSliders,
    FiGrid,
    FiStar,
    FiUsers,
    FiClock,
    FiRefreshCw,
} from "react-icons/fi";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

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
    const scrollerRef = useRef(null);

    const [profiles, setProfiles] = useState([]);
    const [activeCategory, setActiveCategory] = useState("Wszystkie");
    const [activeType, setActiveType] = useState("Wszystkie");
    const [activeBooking, setActiveBooking] = useState("Wszystkie");
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState("popular");
    const [loading, setLoading] = useState(true);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(false);

    useEffect(() => {
        const scrollTo = location.state?.scrollToId;
        if (!scrollTo) return;

        const tryScroll = () => {
            const el = document.getElementById(scrollTo);

            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
                window.history.replaceState({}, document.title, location.pathname);
                return;
            }

            requestAnimationFrame(tryScroll);
        };

        requestAnimationFrame(tryScroll);
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

                const res = await fetch(`${API}/api/profiles`, {
                    signal: controller.signal,
                });

                if (!res.ok) {
                    setProfiles([]);
                    return;
                }

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

                console.error("❌ Błąd pobierania profili:", err);
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
    }, [currentUser?.uid, setAlert]);

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

    const filteredProfiles = useMemo(() => {
        const q = query.trim().toLowerCase();

        let list = profiles.filter((profile) => {
            const category = normalizeCategory(profile.category);
            const type = getProfileTypeLabel(profile.profileType);
            const booking = getBookingLabel(profile.bookingMode);

            const matchesCategory =
                activeCategory === "Wszystkie" || category === activeCategory;

            const matchesType = activeType === "Wszystkie" || type === activeType;

            const matchesBooking =
                activeBooking === "Wszystkie" || booking === activeBooking;

            const text = [
                profile.name,
                profile.role,
                profile.location,
                profile.description,
                category,
                type,
                booking,
                ...(Array.isArray(profile.tags) ? profile.tags : []),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return (
                matchesCategory &&
                matchesType &&
                matchesBooking &&
                (!q || text.includes(q))
            );
        });

        if (sort === "rating") {
            list = [...list].sort(
                (a, b) => Number(b.rating || 0) - Number(a.rating || 0)
            );
        }

        if (sort === "newest") {
            list = [...list].sort(
                (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
            );
        }

        if (sort === "popular") {
            list = [...list].sort(
                (a, b) =>
                    Number(b.visits || b.views || 0) - Number(a.visits || a.views || 0)
            );
        }

        return list;
    }, [profiles, activeCategory, activeType, activeBooking, query, sort]);

    const updateArrows = () => {
        const el = scrollerRef.current;
        if (!el) return;

        const max = el.scrollWidth - el.clientWidth;
        const x = el.scrollLeft;

        setCanLeft(x > 2);
        setCanRight(x < max - 2);
    };

    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;

        updateArrows();

        const onScroll = () => updateArrows();
        el.addEventListener("scroll", onScroll, { passive: true });

        const ro = new ResizeObserver(updateArrows);
        ro.observe(el);

        return () => {
            el.removeEventListener("scroll", onScroll);
            ro.disconnect();
        };
    }, [filteredProfiles.length]);

    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;

        el.scrollTo({ left: 0, behavior: "smooth" });

        setTimeout(updateArrows, 250);
    }, [query, activeCategory, activeType, activeBooking, sort]);

    const scrollByCard = (dir = 1) => {
        const el = scrollerRef.current;
        if (!el) return;

        const first = el.querySelector(":scope > *");
        const cardW = first?.getBoundingClientRect().width || 430;
        const gap =
            parseFloat(getComputedStyle(el).columnGap || getComputedStyle(el).gap) || 24;

        el.scrollBy({
            left: dir * (cardW + gap),
            behavior: "smooth",
        });
    };

    const resetFilters = () => {
        setQuery("");
        setActiveCategory("Wszystkie");
        setActiveType("Wszystkie");
        setActiveBooking("Wszystkie");
        setSort("popular");
    };

    return (
        <section className={styles.section} id="profilesHub">
            <div className={styles.bg}>
                <div className={styles.blur1} />
                <div className={styles.blur2} />
                <div className={styles.vignette} />
            </div>

            <div className={styles.inner}>
                <header className={styles.head}>
                    <div className={styles.labelRow}>
                        <span className={styles.label}>Profile Showly</span>
                        <span className={styles.labelDot} />
                        <span className={styles.labelDesc}>Katalog wizytówek online</span>
                        <span className={styles.labelLine} />
                        <span className={styles.pill}>Kategorie • Opinie • Rezerwacje</span>
                    </div>

                    <h2 className={styles.heading}>
                        Odkrywaj profile <span className={styles.headingAccent}>bez chaosu</span>
                    </h2>

                    <p className={styles.description}>
                        Przeglądaj wizytówki usługodawców, twórców i lokalnych marek.
                        Filtruj po branży, typie profilu, trybie rezerwacji albo wyszukuj po
                        mieście, usłudze i tagach.
                    </p>

                    <div className={styles.metaRow}>
                        <div className={styles.metaCard}>
                            <strong>{profiles.length}</strong>
                            <span>aktywnych profili</span>
                        </div>

                        <div className={styles.metaCard}>
                            <strong>{Math.max(categories.length - 1, 0)}</strong>
                            <span>kategorii</span>
                        </div>

                        <div className={styles.metaCard}>
                            <strong>{filteredProfiles.length}</strong>
                            <span>wyników po filtrach</span>
                        </div>
                    </div>
                </header>

                <div className={styles.contentGrid}>
                    <aside className={styles.sideColumn}>
                        <div className={styles.sideCard}>
                            <h3 className={styles.sideTitle}>Szukaj profilu</h3>

                            <div className={styles.searchBox}>
                                <FiSearch />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Np. fryzjer, DJ, Poznań..."
                                />
                            </div>
                        </div>

                        <div className={styles.sideCard}>
                            <h3 className={styles.sideTitle}>Sortowanie</h3>

                            <div className={styles.sortGrid}>
                                <button
                                    type="button"
                                    className={sort === "popular" ? styles.activeFilter : ""}
                                    onClick={() => setSort("popular")}
                                >
                                    <FiUsers />
                                    Popularne
                                </button>

                                <button
                                    type="button"
                                    className={sort === "rating" ? styles.activeFilter : ""}
                                    onClick={() => setSort("rating")}
                                >
                                    <FiStar />
                                    Najlepiej oceniane
                                </button>

                                <button
                                    type="button"
                                    className={sort === "newest" ? styles.activeFilter : ""}
                                    onClick={() => setSort("newest")}
                                >
                                    <FiClock />
                                    Najnowsze
                                </button>
                            </div>
                        </div>

                        <div className={styles.sideCard}>
                            <h3 className={styles.sideTitle}>Kategorie</h3>

                            <div className={styles.filterList}>
                                {categories.map((category) => (
                                    <button
                                        key={category.label}
                                        type="button"
                                        className={
                                            activeCategory === category.label ? styles.activeFilter : ""
                                        }
                                        onClick={() => setActiveCategory(category.label)}
                                    >
                                        <span>{category.label}</span>
                                        <b>{category.count}</b>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.sideCard}>
                            <h3 className={styles.sideTitle}>Typ profilu</h3>

                            <div className={styles.filterList}>
                                {profileTypes.map((type) => (
                                    <button
                                        key={type.label}
                                        type="button"
                                        className={activeType === type.label ? styles.activeFilter : ""}
                                        onClick={() => setActiveType(type.label)}
                                    >
                                        <span>{type.label}</span>
                                        <b>{type.count}</b>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.sideCard}>
                            <h3 className={styles.sideTitle}>Rezerwacje</h3>

                            <div className={styles.filterList}>
                                {bookingModes.map((mode) => (
                                    <button
                                        key={mode.label}
                                        type="button"
                                        className={
                                            activeBooking === mode.label ? styles.activeFilter : ""
                                        }
                                        onClick={() => setActiveBooking(mode.label)}
                                    >
                                        <span>{mode.label}</span>
                                        <b>{mode.count}</b>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button type="button" className={styles.resetButton} onClick={resetFilters}>
                            <FiRefreshCw />
                            Wyczyść filtry
                        </button>
                    </aside>

                    <main className={styles.mainColumn}>
                        <div className={styles.resultsTop}>
                            <div>
                                <span className={styles.resultsLabel}>Wyniki</span>
                                <h3>
                                    {filteredProfiles.length === 1
                                        ? "1 dopasowany profil"
                                        : `${filteredProfiles.length} dopasowanych profili`}
                                </h3>
                            </div>

                            <div className={styles.resultsPill}>
                                <FiGrid />
                                Przewijaj profile
                            </div>
                        </div>

                        {loading ? (
                            <div className={styles.empty}>Ładowanie profili...</div>
                        ) : filteredProfiles.length === 0 ? (
                            <div className={styles.empty}>
                                Nie znaleziono profili dla wybranych filtrów.
                            </div>
                        ) : (
                            <div className={styles.carousel}>
                                <button
                                    type="button"
                                    className={`${styles.navBtn} ${styles.left} ${!canLeft ? styles.disabled : ""
                                        }`}
                                    onClick={() => scrollByCard(-1)}
                                    disabled={!canLeft}
                                    aria-label="Przewiń w lewo"
                                >
                                    <FaChevronLeft />
                                </button>

                                <div className={styles.cardsTrack} ref={scrollerRef}>
                                    {filteredProfiles.map((profile) => (
                                        <div
                                            className={styles.cardShell}
                                            key={profile._id || profile.userId || profile.id}
                                        >
                                            <UserCard
                                                user={profile}
                                                currentUser={currentUser}
                                                setAlert={setAlert}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.mobileHint}>
                                    <span>←</span>
                                    <p>Przesuń, aby zobaczyć więcej profili</p>
                                    <span>→</span>
                                </div>

                                <button
                                    type="button"
                                    className={`${styles.navBtn} ${styles.right} ${!canRight ? styles.disabled : ""
                                        }`}
                                    onClick={() => scrollByCard(1)}
                                    disabled={!canRight}
                                    aria-label="Przewiń w prawo"
                                >
                                    <FaChevronRight />
                                </button>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </section>
    );
};

export default ProfilesHub;