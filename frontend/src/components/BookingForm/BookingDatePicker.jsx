import { addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, format, isSameDay, isBefore } from "date-fns";
import { pl } from "date-fns/locale";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import styles from "./BookingControls.module.scss";

export default function BookingDatePicker({ month, onMonthChange, value, onChange, isDisabled, disabled, availability, endValue }) {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  return <section className={styles.calendarCard} aria-label="Wybierz dzień">
    <h3>Wybierz dzień</h3>
    <div className={styles.monthNav}>
      <button type="button" aria-label="Poprzedni miesiąc" disabled={disabled || !isBefore(startOfMonth(new Date()), startOfMonth(month))} onClick={() => onMonthChange(subMonths(month, 1))}><FiChevronLeft /></button>
      <strong>{format(month, "LLLL yyyy", { locale: pl })}</strong>
      <button type="button" aria-label="Następny miesiąc" disabled={disabled} onClick={() => onMonthChange(addMonths(month, 1))}><FiChevronRight /></button>
    </div>
    <div className={styles.calendarGrid}>
      {["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"].map(day => <span className={styles.weekday} key={day}>{day}</span>)}
      {Array.from({ length: (getDay(startOfMonth(month)) + 6) % 7 }, (_, i) => <span key={`empty-${i}`} />)}
      {days.map(day => {
        const info = availability?.[format(day, "yyyy-MM-dd")];
        const status = info ? !info.free ? "Brak wolnych godzin" : info.level === "high" ? "Duża dostępność" : info.level === "medium" ? "Średnia dostępność" : "Mała dostępność" : "";
        const description = info ? status + " · " + Math.round(info.ratio * 100) + "% wolnych godzin rozpoczęcia" : undefined;
        return <button type="button" key={day.toISOString()} disabled={disabled || isDisabled(day)} aria-label={format(day, "d MMMM yyyy", { locale: pl })} title={description} aria-current={isSameDay(day, new Date()) ? "date" : undefined} data-in-range={Boolean(value && endValue && !isSameDay(day, value) && !isSameDay(day, endValue) && day > value && day < endValue)} aria-pressed={Boolean((value && isSameDay(day, value)) || (endValue && isSameDay(day, endValue)))} onClick={() => onChange(day)}>
          {format(day, "d")}
          {info && <span className={styles.availabilityDot} data-level={info.level} role="img" aria-label={description} />}
        </button>;
      })}
    </div>
    {availability && <div className={styles.availabilityLegend} aria-label="Dostępność godzin">
      <span><i data-level="high" />Duża</span><span><i data-level="medium" />Średnia</span><span><i data-level="low" />Mała / brak</span>
      <p>Udział wolnych godzin rozpoczęcia wizyty: ponad 50%, 20–50%, poniżej 20%.</p>
    </div>}
  </section>;
}
