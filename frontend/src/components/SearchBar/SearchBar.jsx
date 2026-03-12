import { useEffect, useRef, useState } from "react";
import styles from "./SearchBar.module.scss";
import { FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;

const THEME_PRESETS = {
  violet: { primary: "#6f4ef2", secondary: "#ff4081" },
  blue: { primary: "#2563eb", secondary: "#06b6d4" },
  green: { primary: "#22c55e", secondary: "#a3e635" },
  orange: { primary: "#f97316", secondary: "#facc15" },
  red: { primary: "#ef4444", secondary: "#fb7185" },
  dark: { primary: "#111827", secondary: "#4b5563" },
};

const resolveTheme = (theme) => {
  const variant = theme?.variant || "violet";
  const preset = THEME_PRESETS[variant] || THEME_PRESETS.violet;

  const primary = (theme?.primary || "").trim() || preset.primary;
  const secondary = (theme?.secondary || "").trim() || preset.secondary;

  return {
    primary,
    secondary,
    gradient: `linear-gradient(135deg, ${primary}, ${secondary})`,
  };
};

const SearchBar = () => {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!wrapperRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (debouncedQuery.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data } = await axios.get(
          `${API}/api/profiles/search?q=${encodeURIComponent(debouncedQuery)}&limit=6`
        );
        setResults(Array.isArray(data) ? data : []);
        setOpen(true);
      } catch (err) {
        console.error("Błąd live search:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmed = query.trim();
    if (!trimmed) return;

    setOpen(false);
    navigate(`/szukaj?q=${encodeURIComponent(trimmed)}`);
  };

  const handleGoToProfile = (slug) => {
    setOpen(false);
    navigate(`/profil/${slug}`, {
      state: { scrollToId: "profileWrapper" },
    });
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <form
        className={styles.searchContainer}
        role="search"
        onSubmit={handleSubmit}
      >
        <label className={styles.srOnly} htmlFor="searchInput">
          Wyszukaj
        </label>

        <input
          id="searchInput"
          type="text"
          placeholder="Szukaj profili i usług…"
          className={styles.searchInput}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0 || query.trim().length >= 2) setOpen(true);
          }}
        />

        <button
          type="submit"
          className={styles.searchButton}
          aria-label="Szukaj"
        >
          <FaSearch />
        </button>
      </form>

      {open && query.trim().length >= 2 && (
        <div className={styles.dropdown}>
          {loading ? (
            <div className={styles.dropdownState}>Szukam…</div>
          ) : results.length === 0 ? (
            <div className={styles.dropdownState}>Brak wyników</div>
          ) : (
            <>
              <div className={styles.dropdownList}>
                {results.map((item) => {
                  const t = resolveTheme(item.theme);

                  const cssVars = {
                    "--sb-primary": t.primary,
                    "--sb-secondary": t.secondary,
                    "--sb-gradient": t.gradient,
                  };

                  return (
                    <button
                      key={item._id || item.slug}
                      type="button"
                      className={styles.resultItem}
                      style={cssVars}
                      onClick={() => handleGoToProfile(item.slug)}
                    >
                      <div className={styles.resultAvatar}>
                        {item?.avatar?.url ? (
                          <img src={item.avatar.url} alt={item.name || "Profil"} />
                        ) : (
                          <span>{(item?.name || "?").charAt(0).toUpperCase()}</span>
                        )}
                      </div>

                      <div className={styles.resultContent}>
                        <div className={styles.resultTop}>
                          <strong>{item.name || "Bez nazwy"}</strong>
                          {item.role ? <span>{item.role}</span> : null}
                        </div>

                        <div className={styles.resultMeta}>
                          {item.location ? <span>📍 {item.location}</span> : null}
                          {item.rating ? (
                            <span>
                              ⭐ {Number(item.rating).toFixed(1)} ({item.reviews || 0})
                            </span>
                          ) : null}
                        </div>

                        {Array.isArray(item.matchedServices) &&
                        item.matchedServices.length > 0 ? (
                          <div className={styles.serviceHits}>
                            {item.matchedServices.slice(0, 2).map((service) => (
                              <span
                                key={service._id || service.name}
                                className={styles.serviceBadge}
                              >
                                {service.name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className={styles.showAllButton}
                onClick={handleSubmit}
              >
                Zobacz wszystkie wyniki dla „{query.trim()}”
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;