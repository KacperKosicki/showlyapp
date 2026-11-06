import { format, differenceInCalendarDays } from "date-fns";
import { pl } from "date-fns/locale";
import { FiCalendar, FiClock, FiUser } from "react-icons/fi";
import { ServiceImage } from "./BookingServicePicker";
import styles from "./BookingControls.module.scss";

export default function BookingSummary({ service, date, time, duration, staff, inquiry = false, kind, endDate }) {
  return <section className={`${styles.bookingSummary} ${styles.reservationDetails}`} aria-label={inquiry ? "Twoje zapytanie" : kind === "order" ? "Twoje zamówienie" : "Twoja rezerwacja"} aria-live="polite">
    <h3>{inquiry ? "Twoje zapytanie" : kind === "order" ? "Twoje zamówienie" : "Twoja rezerwacja"}</h3>
    {service && <div className={styles.summaryService}><ServiceImage service={service} /><div><span>{kind === "order" ? "Oferta" : "Usługa"}</span><strong>{service.name}</strong>{duration > 0 && <small>{duration} min</small>}</div></div>}
    <dl className={styles.summaryFacts}>
      <div><dt><FiCalendar aria-hidden="true" />{kind === "stay" ? "Przyjazd" : "Data realizacji"}</dt><dd>{format(date, "d MMMM yyyy", { locale: pl })}<small>{format(date, "EEEE", { locale: pl })}</small></dd></div>
      <div><dt><FiClock aria-hidden="true" />{kind === "stay" ? "Wyjazd" : time ? "Godziny" : "Realizacja"}</dt><dd>{kind === "stay" ? endDate ? format(endDate, "d MMMM yyyy", { locale: pl }) : "Wybierz datę wyjazdu" : time || (kind === "order" ? "Na wybraną datę" : "Termin na wyłączność")}</dd></div>
      {staff && <div><dt><FiUser aria-hidden="true" />Pracownik</dt><dd>{staff}</dd></div>}
    </dl>
    {kind === "stay" && endDate && <p className={styles.hint}>Liczba noclegów: {differenceInCalendarDays(endDate, date)}. Dzień wyjazdu kończy pobyt.</p>}
    {inquiry && <p className={styles.hint}>Zapytanie nie blokuje terminu.</p>}
  </section>;
}
