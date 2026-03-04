import styles from './SearchBar.module.scss';
import { FaSearch } from 'react-icons/fa';

const SearchBar = () => {
  return (
    <form className={styles.searchContainer} role="search" onSubmit={(e) => e.preventDefault()}>
      <label className={styles.srOnly} htmlFor="searchInput">
        Wyszukaj
      </label>

      <input
        id="searchInput"
        type="text"
        placeholder="Szukaj profili i usług…"
        className={styles.searchInput}
      />

      <button type="submit" className={styles.searchButton} aria-label="Szukaj">
        <FaSearch />
      </button>
    </form>
  );
};

export default SearchBar;