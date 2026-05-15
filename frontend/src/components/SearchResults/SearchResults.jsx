import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import styles from "./SearchResults.module.scss";
import UserCard from "../UserCard/UserCard";
import { FaSearch } from "react-icons/fa";
import { FiGrid, FiSearch, FiZap, FiUsers } from "react-icons/fi";

const API = process.env.REACT_APP_API_URL;

const SearchResults = ({ currentUser, setAlert }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const activeQuery = useMemo(
    () => (searchParams.get("q") || "").trim(),
    [searchParams]
  );

  const [query, setQuery] = useState(activeQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(activeQuery);
  }, [activeQuery]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!activeQuery || activeQuery.length < 2) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);

        const { data } = await axios.get(
          `${API}/api/profiles/search?q=${encodeURIComponent(activeQuery)}&limit=24`
        );

        setResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Błąd pobierania wyników:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [activeQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmed = query.trim();
    if (!trimmed) return;

    navigate(`/szukaj?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <section className={styles.page} id="searchResults">
      <div className={styles.inner}>
        <div className={styles.hero}>
          <span className={styles.heroGlowA} />
          <span className={styles.heroGlowB} />

          <div className={styles.heroTop}>
            <div className={styles.labelRow}>
              <span className={styles.label}>Showly Search</span>
              <span className={styles.labelDot} />
              <span className={styles.labelDesc}>wyszukiwarka profili</span>
              <span className={styles.pill}>Usługi • Miasta • Tagi</span>
            </div>

            <div className={styles.stats}>
              <div className={styles.statCard}>
                <strong>{results.length}</strong>
                <span>wyników</span>
              </div>

              <div className={styles.statCard}>
                <strong>{activeQuery ? "Aktywne" : "Start"}</strong>
                <span>wyszukiwanie</span>
              </div>
            </div>
          </div>

          <div className={styles.heroContent}>
            <h1 className={styles.heading}>
              Wyszukiwarka <span className={styles.headingAccent}>Showly</span>
            </h1>

            <p className={styles.description}>
              Szukaj po nazwie, usłudze, lokalizacji, tagach i opisie. Wpisz, czego
              potrzebujesz, a Showly pokaże pasujące wizytówki.
            </p>

            <div className={styles.searchWrap}>
              <form className={styles.searchForm} onSubmit={handleSubmit}>
                <span className={styles.searchIcon}>
                  <FiSearch />
                </span>

                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Np. DJ, torty, fryzjer Piła, logo, korepetycje…"
                  className={styles.input}
                />

                <button type="submit" className={styles.button} aria-label="Szukaj">
                  <FaSearch />
                  <span>Szukaj</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        {activeQuery && (
          <div className={styles.resultsBar}>
            <div className={styles.resultsInfo}>
              <strong>Wyniki dla: „{activeQuery}”</strong>
              <span>
                {loading
                  ? "Szukam najlepszych dopasowań…"
                  : `${results.length} znalezionych profili`}
              </span>
            </div>

            <div className={styles.resultsBadge}>
              <FiGrid />
              Profile Showly
            </div>
          </div>
        )}

        {loading ? (
          <div className={styles.empty}>
            <FiZap /> Szukam najlepszych dopasowań…
          </div>
        ) : !activeQuery ? (
          <div className={styles.empty}>
            <FiSearch /> Wpisz frazę, aby wyszukać profile i usługi.
          </div>
        ) : results.length === 0 ? (
          <div className={styles.empty}>
            <FiUsers /> Nie znaleziono wyników dla „{activeQuery}”.
          </div>
        ) : (
          <div className={styles.grid}>
            {results.map((user, index) => (
              <div
                className={styles.cardWrap}
                key={user._id || user.userId || user.slug || index}
              >
                <UserCard
                  user={user}
                  currentUser={currentUser}
                  setAlert={setAlert}
                />

                {Array.isArray(user.matchedServices) &&
                  user.matchedServices.length > 0 && (
                    <div className={styles.matchedBox}>
                      <div className={styles.matchedLabel}>Pasujące usługi:</div>

                      <div className={styles.matchedServices}>
                        {user.matchedServices.map((service) => (
                          <span
                            key={service._id || service.name}
                            className={styles.matchedService}
                          >
                            {service.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default SearchResults;