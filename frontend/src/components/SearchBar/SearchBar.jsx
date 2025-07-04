import styles from './SearchBar.module.scss';
import { FaSearch } from 'react-icons/fa';

const SearchBar = () => {
  return (
    <div className={styles.searchContainer}>
      <input
        type="text"
        placeholder="Czego szukasz?"
        className={styles.searchInput}
      />
      <button className={styles.searchButton}>
        <FaSearch />
      </button>
    </div>
  );
};

export default SearchBar;
