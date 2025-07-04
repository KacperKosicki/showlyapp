import { useState } from 'react';
import styles from './CategoryFilter.module.scss';
import {
    FaChalkboardTeacher, FaCut, FaMusic, FaPaintBrush, FaCode,
    FaPalette, FaDumbbell, FaGuitar, FaCamera, FaLaptop,
    FaMicrophone, FaBroom, FaPencilRuler, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';

const categories = [
    { label: 'Korepetycje', icon: <FaChalkboardTeacher />, color: '#3f51b5' },
    { label: 'Fryzjerstwo', icon: <FaCut />, color: '#e91e63' },
    { label: 'DJ', icon: <FaMusic />, color: '#ff9800' },
    { label: 'Grafika', icon: <FaPaintBrush />, color: '#009688' },
    { label: 'Kodowanie', icon: <FaCode />, color: '#4caf50' },
    { label: 'Malarstwo', icon: <FaPalette />, color: '#9c27b0' },
    { label: 'Fitness', icon: <FaDumbbell />, color: '#f44336' },
    { label: 'Muzyka', icon: <FaGuitar />, color: '#3f51b5' },
    { label: 'Foto', icon: <FaCamera />, color: '#795548' },
    { label: 'IT', icon: <FaLaptop />, color: '#607d8b' },
    { label: 'Wokal', icon: <FaMicrophone />, color: '#8bc34a' },
    { label: 'Sprzątanie', icon: <FaBroom />, color: '#ff5722' },
    { label: 'Design', icon: <FaPencilRuler />, color: '#00bcd4' }
];

const CategoryFilter = ({ selected, onSelect }) => {
    const [startIndex, setStartIndex] = useState(0);
    const visibleCount = 4;

    const handlePrev = () => {
        if (startIndex > 0) {
            setStartIndex(prev => prev - 1);
        }
    };

    const handleNext = () => {
        if (startIndex < categories.length - visibleCount) {
            setStartIndex(prev => prev + 1);
        }
    };

    const visible = categories.slice(startIndex, startIndex + visibleCount);

    return (
        <div className={styles.wrapper}>
            <button className={styles.arrow} onClick={handlePrev} disabled={startIndex === 0}>
                <FaChevronLeft />
            </button>

            <div key={startIndex} className={`${styles.categoryList} ${styles.fadeSlide}`}>

                {visible.map(({ label, icon, color }) => (
                    <button
                        key={label}
                        className={`${styles.button} ${selected === label ? styles.active : ''}`}
                        onClick={() => onSelect(label)}
                    >
                        <span className={styles.icon} style={{ color }}>{icon}</span>
                        <span className={styles.label}>{label}</span>
                    </button>
                ))}
            </div>

            <button
                className={styles.arrow}
                onClick={handleNext}
                disabled={startIndex >= categories.length - visibleCount}
            >
                <FaChevronRight />
            </button>
        </div>
    );
};

export default CategoryFilter;
