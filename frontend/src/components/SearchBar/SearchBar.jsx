import DataLoader from '../ui/DataLoader/DataLoader';
import { useEffect, useId, useRef, useState } from "react";
import {
  FiArrowUpRight,
  FiMapPin,
  FiSearch,
  FiStar,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import styles from "./SearchBar.module.scss";

const API = process.env.REACT_APP_API_URL;

const THEME_PRESETS = {
  violet: { primary: "#6557ef", secondary: "#d8ff72" },
  blue: { primary: "#2563eb", secondary: "#7dd3fc" },
  green: { primary: "#4f9b79", secondary: "#d8ff72" },
  orange: { primary: "#f97316", secondary: "#ffba7a" },
  red: { primary: "#e84f62", secondary: "#ff9a82" },
  dark: { primary: "#171917", secondary: "#686c65" },
};

const resolveTheme = (theme) => {
  const variant = theme?.variant || "violet";
  const preset = THEME_PRESETS[variant] || THEME_PRESETS.violet;

  return {
    primary: String(theme?.primary || "").trim() || preset.primary,
    secondary: String(theme?.secondary || "").trim() || preset.secondary,
  };
};

const getAvatarUrl = (avatar) => {
  if (typeof avatar === "string") {
    return avatar.trim();
  }

  if (avatar && typeof avatar.url === "string") {
    return avatar.url.trim();
  }

  return "";
};

const getResultCountLabel = (count) => {
  const value = Number(count) || 0;
  const lastDigit = value % 10;
  const lastTwoDigits = value % 100;

  if (value === 1) {
    return "1 wynik";
  }

  if (
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    (lastTwoDigits < 12 || lastTwoDigits > 14)
  ) {
    return `${value} wyniki`;
  }

  return `${value} wyników`;
};

const SearchBar = ({ variant = "default" }) => {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const generatedId = useId();

  const inputId = `showly-search-${generatedId.replace(/:/g, "")}`;
  const listboxId = `${inputId}-results`;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const trimmedQuery = query.trim();
  const canSearch = trimmedQuery.length >= 2;

  const wrapperClassName = [
    styles.wrapper,
    variant === "hero" ? styles.heroVariant : "",
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(trimmedQuery);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [trimmedQuery]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchResults = async () => {
      if (debouncedQuery.length < 2) {
        setResults([]);
        setLoading(false);
        setOpen(false);
        setActiveIndex(-1);
        return;
      }

      try {
        setLoading(true);
        setOpen(true);
        setActiveIndex(-1);

        const { data } = await axios.get(`${API}/api/profiles/search`, {
          params: { q: debouncedQuery, limit: 6 },
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setResults(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (
          error?.name === "CanceledError" ||
          error?.code === "ERR_CANCELED"
        ) {
          return;
        }

        console.error("Błąd live search:", error);
        setResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchResults();
    return () => controller.abort();
  }, [debouncedQuery]);

  const handleGoToProfile = (slug) => {
    if (!slug) {
      return;
    }

    setOpen(false);
    setActiveIndex(-1);
    navigate(`/${slug}`, { state: { scrollToId: "profileWrapper" } });
  };

  const goToProfilesHub = () => {
    const value = query.trim();

    if (!value) {
      inputRef.current?.focus();
      return;
    }

    setOpen(false);
    setActiveIndex(-1);
    navigate(`/profile?q=${encodeURIComponent(value)}`, { state: { scrollToId: "profilesHub" } });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (open && activeIndex >= 0 && results[activeIndex]?.slug) {
      handleGoToProfile(results[activeIndex].slug);
      return;
    }

    goToProfilesHub();
  };

  const handleInputChange = (event) => {
    const nextValue = event.target.value;

    setQuery(nextValue);
    setActiveIndex(-1);

    if (nextValue.trim().length >= 2) {
      setOpen(true);
    } else {
      setOpen(false);
      setResults([]);
    }
  };

  const handleInputFocus = () => {
    if (canSearch) {
      setOpen(true);
    }
  };

  const handleInputKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!canSearch || results.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((currentIndex) =>
        currentIndex >= results.length - 1 ? 0 : currentIndex + 1
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((currentIndex) =>
        currentIndex <= 0 ? results.length - 1 : currentIndex - 1
      );
    }
  };

  return (
    <div className={wrapperClassName} ref={wrapperRef}>
      <form
        className={styles.searchContainer}
        role="search"
        onSubmit={handleSubmit}
      >
        <label className={styles.srOnly} htmlFor={inputId}>
          Wyszukaj profile, usługi lub lokalizacje
        </label>

        <div className={styles.inputArea}>
          <FiSearch className={styles.inputIcon} aria-hidden="true" />

          <input
            ref={inputRef}
            id={inputId}
            type="search"
            className={styles.searchInput}
            placeholder="Fotograf, DJ, fryzjer, miasto…"
            value={query}
            autoComplete="off"
            spellCheck="false"
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={open && canSearch}
            aria-activedescendant={
              activeIndex >= 0
                ? `${inputId}-option-${activeIndex}`
                : undefined
            }
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleInputKeyDown}
          />
        </div>

        <button
          type="submit"
          className={styles.searchButton}
          aria-label="Przejdź do wyników wyszukiwania"
        >
          <span className={styles.buttonLabel}>Szukaj</span>
          <FiArrowUpRight aria-hidden="true" />
        </button>
      </form>

      {open && canSearch && (
        <div
          className={styles.dropdown}
          aria-label="Podpowiedzi wyszukiwania"
          onWheel={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
        >
          <header className={styles.dropdownHeader}>
            <div className={styles.dropdownHeading}>
              <span className={styles.dropdownDot} aria-hidden="true" />
              <div>
                <span className={styles.dropdownLabel}>Wyszukiwarka profili Showly</span>
                <strong aria-live="polite">
                  {loading
                    ? "Szukam pasujących profili…"
                    : getResultCountLabel(results.length)}
                </strong>
              </div>
            </div>

            <span className={styles.queryTerm} title={trimmedQuery}>
              {trimmedQuery}
            </span>
          </header>

          {loading ? (
            <div className={styles.dropdownState}><DataLoader label="Szukamy pasujących profili…" compact /></div>
          ) : results.length === 0 ? (
            <div className={styles.dropdownState} role="status">
              <span className={styles.stateMark} aria-hidden="true">
                0
              </span>
              <div>
                <strong>Brak pasujących profili</strong>
                <span>Spróbuj wpisać inną usługę, branżę lub miasto.</span>
              </div>
            </div>
          ) : (
            <>
              <div
                id={listboxId}
                className={styles.dropdownList}
                role="listbox"
                aria-label="Profile pasujące do wyszukiwania"
              >
                {results.map((item, index) => {
                  const resolvedTheme = resolveTheme(item.theme);
                  const avatarUrl = getAvatarUrl(item.avatar);
                  const resultId = `${inputId}-option-${index}`;
                  const isActive = index === activeIndex;

                  const cssVariables = {
                    "--result-primary": resolvedTheme.primary,
                    "--result-secondary": resolvedTheme.secondary,
                  };

                  return (
                    <button
                      id={resultId}
                      key={item._id || item.slug || `${item.name}-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={[
                        styles.resultItem,
                        isActive ? styles.activeResult : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={cssVariables}
                      disabled={!item.slug}
                      onMouseEnter={() => setActiveIndex(index)}
                      onFocus={() => setActiveIndex(index)}
                      onClick={() => handleGoToProfile(item.slug)}
                    >
                      <span className={styles.resultAvatar} aria-hidden="true">
                        <span className={styles.avatarFallback}>
                          {(item?.name || "?").charAt(0).toUpperCase()}
                        </span>

                        {avatarUrl && (
                          <img
                            src={avatarUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                      </span>

                      <span className={styles.resultContent}>
                        <span className={styles.resultTop}>
                          <strong>{item.name || "Profil bez nazwy"}</strong>

                          {item.role && (
                            <span className={styles.resultRole}>
                              {item.role}
                            </span>
                          )}
                        </span>

                        <span className={styles.resultMeta}>
                          {item.location && (
                            <span className={styles.resultMetaItem}>
                              <FiMapPin aria-hidden="true" />
                              <span>{item.location}</span>
                            </span>
                          )}

                          {Number(item.rating) > 0 && (
                            <span className={styles.resultMetaItem}>
                              <FiStar aria-hidden="true" />
                              <span>
                                {Number(item.rating).toFixed(1)} ·{" "}
                                {Number(item.reviews || 0)} opinii
                              </span>
                            </span>
                          )}
                        </span>

                        {Array.isArray(item.matchedServices) &&
                          item.matchedServices.length > 0 && (
                            <span className={styles.serviceHits}>
                              {item.matchedServices
                                .slice(0, 2)
                                .map((service, serviceIndex) => (
                                  <span
                                    key={
                                      service._id ||
                                      `${service.name}-${serviceIndex}`
                                    }
                                    className={styles.serviceBadge}
                                  >
                                    {service.name}
                                  </span>
                                ))}
                            </span>
                          )}
                      </span>

                      <span className={styles.openResult} aria-hidden="true">
                        <span>Otwórz</span>
                        <FiArrowUpRight />
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className={styles.showAllButton}
                onClick={goToProfilesHub}
              >
                <span className={styles.showAllCopy}>
                  <small>Pełna lista</small>
                  <strong>Wszystkie wyniki dla „{trimmedQuery}”</strong>
                </span>

                <span className={styles.showAllIcon} aria-hidden="true">
                  <FiArrowUpRight />
                </span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;