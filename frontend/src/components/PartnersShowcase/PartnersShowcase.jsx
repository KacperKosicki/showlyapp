import { useEffect, useRef, useState } from "react";
import axios from "axios";
import styles from "./PartnersShowcase.module.scss";
import UserCard from "../UserCard/UserCard";
import { auth } from "../../firebase";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const API = process.env.REACT_APP_API_URL;

async function getAuthHeader() {
    const u = auth.currentUser;
    if (!u) return {};
    const token = await u.getIdToken();
    return { Authorization: `Bearer ${token}` };
}

const tierWeight = {
    owner: 6,
    "founding-partner": 5,
    ambassador: 4,
    verified: 3,
    partner: 2,
    none: 0,
};

const PartnersShowcase = ({ currentUser, setAlert }) => {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);

    const scrollerRef = useRef(null);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(false);

    useEffect(() => {
        const run = async () => {
            try {
                const { data: profiles } = await axios.get(`${API}/api/profiles`);

                let onlyPartners = (Array.isArray(profiles) ? profiles : []).filter(
                    (p) => p?.partnership?.isPartner === true
                );

                onlyPartners = onlyPartners.sort((a, b) => {
                    const priorityDiff =
                        Number(b?.partnership?.priority || 0) -
                        Number(a?.partnership?.priority || 0);
                    if (priorityDiff !== 0) return priorityDiff;

                    const tierDiff =
                        (tierWeight[b?.partnership?.tier] || 0) -
                        (tierWeight[a?.partnership?.tier] || 0);
                    if (tierDiff !== 0) return tierDiff;

                    const ratingDiff = Number(b?.rating || 0) - Number(a?.rating || 0);
                    if (ratingDiff !== 0) return ratingDiff;

                    return Number(b?.reviews || 0) - Number(a?.reviews || 0);
                });

                if (currentUser?.uid && auth.currentUser) {
                    const authHeader = await getAuthHeader();

                    const { data: favProfiles } = await axios.get(`${API}/api/favorites/my`, {
                        headers: { ...authHeader },
                    });

                    const favSet = new Set(
                        (Array.isArray(favProfiles) ? favProfiles : [])
                            .map((p) => p?.userId || p?.profileUserId)
                            .filter(Boolean)
                    );

                    onlyPartners = onlyPartners.map((p) => ({
                        ...p,
                        isFavorite: favSet.has(p.userId),
                    }));
                }

                setPartners(onlyPartners);
            } catch (err) {
                console.error("Błąd pobierania partnerów:", err);
            } finally {
                setLoading(false);
            }
        };

        run();
    }, [currentUser?.uid]);

    const updateArrows = () => {
        const el = scrollerRef.current;
        if (!el) return;

        const max = el.scrollWidth - el.clientWidth;
        const x = el.scrollLeft;

        setCanLeft(x > 2);
        setCanRight(x < max - 2);
    };

    useEffect(() => {
        updateArrows();

        const el = scrollerRef.current;
        if (!el) return;

        const onScroll = () => updateArrows();
        el.addEventListener("scroll", onScroll, { passive: true });

        const ro = new ResizeObserver(() => updateArrows());
        ro.observe(el);

        return () => {
            el.removeEventListener("scroll", onScroll);
            ro.disconnect();
        };
    }, [partners.length]);

    const scrollByCard = (dir = 1) => {
        const el = scrollerRef.current;
        if (!el) return;

        const first = el.querySelector(":scope > *");
        const cardW = first?.getBoundingClientRect().width || 400;
        const gap =
            parseFloat(getComputedStyle(el).columnGap || getComputedStyle(el).gap) || 24;

        const step = (cardW + gap) * 1.02;
        el.scrollBy({ left: dir * step, behavior: "smooth" });
    };

    if (loading) {
        return (
            <section className={styles.section}>
                <p className={styles.loading}>Ładowanie partnerów...</p>
            </section>
        );
    }

    if (!partners.length) return null;

    return (
        <section className={styles.section}>
            <div className={styles.sectionBackground} aria-hidden="true" />

            <div className={styles.inner}>
                <div className={styles.head}>
                    <div className={styles.labelRow}>
                        <span className={styles.label}>Showly Premium</span>
                        <span className={styles.labelDot} />
                        <span className={styles.labelDesc}>Wyróżnione profile</span>
                        <span className={styles.labelLine} />
                        <span className={styles.pill}>Zaufanie • Jakość • Widoczność</span>
                    </div>

                    <h2 className={styles.heading}>
                        Partnerzy <span className={styles.headingAccent}>premium</span> ✨
                    </h2>

                    <p className={styles.description}>
                        Poznaj profile, które aktywnie rozwijają swoją markę w Showly, dbają o
                        jakość prezentacji i budują większe zaufanie użytkowników dzięki swojej
                        widoczności, aktywności i profesjonalnemu wizerunkowi.
                    </p>

                    <div className={styles.metaRow}>
                        <div className={styles.metaCard}>
                            <strong>{partners.length}+</strong>
                            <span>wyróżnionych profili</span>
                        </div>
                        <div className={styles.metaCard}>
                            <strong>Top</strong>
                            <span>najbardziej aktywni partnerzy</span>
                        </div>
                        <div className={styles.metaCard}>
                            <strong>Showly</strong>
                            <span>lepsza widoczność i zaufanie</span>
                        </div>
                    </div>
                </div>

                <div className={styles.carousel}>
                    <button
                        type="button"
                        className={`${styles.navBtn} ${styles.left} ${!canLeft ? styles.disabled : ""}`}
                        onClick={() => scrollByCard(-1)}
                        disabled={!canLeft}
                        aria-label="Przewiń w lewo"
                        title="Przewiń w lewo"
                    >
                        <FaChevronLeft />
                    </button>

                    <div className={styles.grid} ref={scrollerRef}>
                        {partners.map((partner, index) => (
                            <div className={styles.cardWrap} key={partner._id || partner.userId || index}>
                                <UserCard
                                    user={partner}
                                    currentUser={currentUser}
                                    setAlert={setAlert}
                                />
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        className={`${styles.navBtn} ${styles.right} ${!canRight ? styles.disabled : ""}`}
                        onClick={() => scrollByCard(1)}
                        disabled={!canRight}
                        aria-label="Przewiń w prawo"
                        title="Przewiń w prawo"
                    >
                        <FaChevronRight />
                    </button>
                </div>
            </div>
        </section>
    );
};

export default PartnersShowcase;