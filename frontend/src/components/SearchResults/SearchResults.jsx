import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import styles from "./SearchResults.module.scss";
import UserCard from "../UserCard/UserCard";
import { FaSearch } from "react-icons/fa";

const API = process.env.REACT_APP_API_URL;

const SearchResults = ({ currentUser }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const activeQuery = useMemo(() => (searchParams.get("q") || "").trim(), [searchParams]);

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
    <section className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <h1 className={styles.title}>Wyszukiwarka Showly</h1>
          <p className={styles.subtitle}>
            Szukaj po nazwie, usłudze, lokalizacji, tagach i opisie.
          </p>

          <form className={styles.searchForm} onSubmit={handleSubmit}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Np. DJ, torty, fryzjer Piła, logo, korepetycje…"
              className={styles.input}
            />
            <button type="submit" className={styles.button} aria-label="Szukaj">
              <FaSearch />
            </button>
          </form>
        </div>

        {activeQuery ? (
          <div className={styles.infoBar}>
            <span>
              Wyniki dla: <strong>„{activeQuery}”</strong>
            </span>
            {!loading && <span>{results.length} znalezionych profili</span>}
          </div>
        ) : null}

        {loading ? (
          <div className={styles.empty}>Szukam najlepszych dopasowań…</div>
        ) : !activeQuery ? (
          <div className={styles.empty}>
            Wpisz frazę, aby wyszukać profile i usługi.
          </div>
        ) : results.length === 0 ? (
          <div className={styles.empty}>
            Nie znaleziono wyników dla „{activeQuery}”.
          </div>
        ) : (
          <div className={styles.grid}>
            {results.map((user, index) => (
              <div
                className={styles.cardWrap}
                key={user._id || user.userId || user.slug || index}
              >
                <UserCard user={user} currentUser={currentUser} />

                {Array.isArray(user.matchedServices) &&
                user.matchedServices.length > 0 ? (
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
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default SearchResults;