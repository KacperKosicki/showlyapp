import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./CategoryFilter.module.scss";
import {
  FaChalkboardTeacher,
  FaCut,
  FaMusic,
  FaPaintBrush,
  FaCode,
  FaPalette,
  FaDumbbell,
  FaGuitar,
  FaCamera,
  FaLaptop,
  FaMicrophone,
  FaBroom,
  FaPencilRuler,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

const categories = [
  { label: "Korepetycje", icon: <FaChalkboardTeacher />, color: "#3f51b5" },
  { label: "Fryzjerstwo", icon: <FaCut />, color: "#e91e63" },
  { label: "DJ", icon: <FaMusic />, color: "#ff9800" },
  { label: "Grafika", icon: <FaPaintBrush />, color: "#009688" },
  { label: "Kodowanie", icon: <FaCode />, color: "#4caf50" },
  { label: "Malarstwo", icon: <FaPalette />, color: "#9c27b0" },
  { label: "Fitness", icon: <FaDumbbell />, color: "#f44336" },
  { label: "Muzyka", icon: <FaGuitar />, color: "#3f51b5" },
  { label: "Foto", icon: <FaCamera />, color: "#795548" },
  { label: "IT", icon: <FaLaptop />, color: "#607d8b" },
  { label: "Wokal", icon: <FaMicrophone />, color: "#8bc34a" },
  { label: "Sprzątanie", icon: <FaBroom />, color: "#ff5722" },
  { label: "Design", icon: <FaPencilRuler />, color: "#00bcd4" },
];

const CategoryFilter = ({ selected, onSelect }) => {
  const scrollerRef = useRef(null);
  const rafRef = useRef(null);

  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      const x = Math.max(0, el.scrollLeft);

      setCanLeft(x > 4);
      setCanRight(max > 4 && x < max - 4);
    });
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    updateArrows();

    const handleScroll = () => updateArrows();

    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    let resizeObserver;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(handleScroll);
      resizeObserver.observe(el);
    }

    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);

      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [updateArrows]);

  const scrollByCategory = (dir = 1) => {
    const el = scrollerRef.current;
    if (!el) return;

    const firstCard = el.querySelector(`.${styles.button}`);
    const cardW = firstCard?.getBoundingClientRect().width || 180;

    const computed = getComputedStyle(el);
    const gap = parseFloat(computed.columnGap || computed.gap || "0") || 14;

    const step = (cardW + gap) * 2;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const next = Math.min(Math.max(el.scrollLeft + dir * step, 0), max);

    el.scrollTo({
      left: next <= 8 ? 0 : next,
      behavior: "smooth",
    });

    window.setTimeout(updateArrows, 320);
  };

  return (
    <section className={styles.wrapper} aria-label="Filtr kategorii">
      <div className={styles.inner}>
        <div className={styles.header}>
          <div>
            <span className={styles.overline}>Kategorie</span>
            <h2 className={styles.heading}>Znajdź profil po typie usługi.</h2>
          </div>

          <span className={styles.number}>03</span>
        </div>

        <div className={styles.carousel}>
          <button
            type="button"
            className={`${styles.arrow} ${!canLeft ? styles.disabled : ""}`}
            onClick={() => scrollByCategory(-1)}
            disabled={!canLeft}
            aria-label="Przewiń kategorie w lewo"
            title="Przewiń w lewo"
          >
            <FaChevronLeft />
          </button>

          <div
            className={styles.categoryList}
            ref={scrollerRef}
            role="list"
            aria-label="Lista kategorii"
          >
            {categories.map(({ label, icon, color }) => {
              const active = selected === label;

              return (
                <button
                  key={label}
                  type="button"
                  role="listitem"
                  aria-pressed={active}
                  className={`${styles.button} ${active ? styles.active : ""
                    }`}
                  style={{ "--cat-color": color }}
                  onClick={() => onSelect?.(label)}
                >
                  <span className={styles.icon}>{icon}</span>
                  <span className={styles.label}>{label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className={`${styles.arrow} ${!canRight ? styles.disabled : ""}`}
            onClick={() => scrollByCategory(1)}
            disabled={!canRight}
            aria-label="Przewiń kategorie w prawo"
            title="Przewiń w prawo"
          >
            <FaChevronRight />
          </button>
        </div>

        <div className={styles.mobileHint}>
          <span>←</span>
          <p>Przesuń, aby zobaczyć więcej kategorii</p>
          <span>→</span>
        </div>
      </div>
    </section>
  );
};

export default CategoryFilter;