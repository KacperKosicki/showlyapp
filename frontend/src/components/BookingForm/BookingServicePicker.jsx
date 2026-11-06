import { useId, useState, useRef, useEffect, useCallback } from "react";
import { FiCheck, FiClock, FiImage, FiMessageCircle, FiSearch, FiChevronLeft, FiChevronRight, FiTag, FiArrowUp, FiArrowDown } from "react-icons/fi";
import styles from "./BookingControls.module.scss";

const servicePrice = ({ price }) => {
  if (!price) return null;
  const currency = price.currency || "PLN";
  if (price.mode === "fixed" && price.amount != null) return `${price.amount} ${currency}`;
  if (price.mode === "from" && price.from != null) return `od ${price.from} ${currency}`;
  if (price.mode === "range" && price.from != null && price.to != null) return `${price.from}–${price.to} ${currency}`;
  if (price.mode === "free") return "Bezpłatnie";
  if (price.mode === "contact") return "Wycena indywidualna";
  return null;
};
const serviceDuration = ({ duration }) => {
  if (!duration?.value) return null;
  const unit = { minutes: "min", hours: "godz.", days: "dni" }[duration.unit];
  return unit ? `${duration.value} ${unit}` : null;
};

const durationMinutes = service => {
  const value = Number(service.duration?.value);
  const factor = { minutes: 1, hours: 60, days: 1440 }[service.duration?.unit];
  return factor && value > 0 ? value * factor : null;
};
const priceAmount = service => {
  const price = service.price;
  if (price?.mode === "free") return 0;
  const raw = price?.mode === "fixed" ? price.amount : ["from", "range"].includes(price?.mode) ? price.from : null;
  return raw != null && Number.isFinite(Number(raw)) ? Number(raw) : null;
};
const sortOptions = [["default", "Domyślnie"], ["price-asc", "Cena rosnąco"], ["price-desc", "Cena malejąco"], ["duration-asc", "Najkrótsze"], ["duration-desc", "Najdłuższe"]];

const imageUrl = (image) => {
  const raw = typeof image === "string" ? image : image?.url;
  const url = typeof raw === "string" ? raw.trim() : "";
  if (!url) return "";
  if (["https://", "http://", "data:image/", "blob:"].some(prefix => url.toLowerCase().startsWith(prefix))) return url;
  const apiBase = process.env.REACT_APP_API_URL || "";
  const apiUrl = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;
  if (url.startsWith("/uploads/")) return apiUrl + url;
  if (url.startsWith("uploads/")) return apiUrl + "/" + url;
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?]|$)/i.test(url)) return "https://" + url;
  return url;
};

export function ServiceImage({ service }) {
  const [failedUrl, setFailedUrl] = useState("");
  const url = imageUrl(service?.image) || imageUrl(service?.gallery?.[0]);
  return <span className={styles.serviceImage}>
    {url && failedUrl !== url ? <img src={url} alt={service.name} loading="lazy" decoding="async" onError={() => setFailedUrl(url)} /> : <span className={styles.serviceImagePlaceholder} aria-hidden="true">{service ? <FiImage /> : <FiMessageCircle />}</span>}
  </span>;
}

export default function BookingServicePicker({ services, value, onChange, disabled, optional = false, label = "Wybierz usługę" }) {
  const groupName = useId();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("default");
  const track = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const options = optional ? [null, ...services] : services;
  const visibleOptions = options.filter(service => !service || String(service._id) === String(value?._id) || service.name.toLocaleLowerCase("pl").includes(query.trim().toLocaleLowerCase("pl"))).sort((left, right) => {
    if (sort === "default" || left === right) return 0;
    if (!left) return -1;
    if (!right) return 1;
    const getValue = sort.startsWith("price") ? priceAmount : durationMinutes;
    const a = getValue(left), b = getValue(right);
    if (a == null) return b == null ? 0 : 1;
    if (b == null) return -1;
    return (a - b) * (sort.endsWith("desc") ? -1 : 1);
  });
  const updateEdges = useCallback(() => {
    const element = track.current;
    if (element) setEdges({ start: element.scrollLeft < 4, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    updateEdges();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateEdges);
    if (track.current) observer?.observe(track.current);
    return () => observer?.disconnect();
  }, [updateEdges, query, sort, services.length, optional, value?._id]);
  const move = direction => {
    const element = track.current;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    element?.scrollBy?.({ left: direction * element.clientWidth * .85, behavior: reduced ? "auto" : "smooth" });
  };
  if (!services.length) return null;
  return <fieldset className={styles.servicePicker} disabled={disabled}>
    <legend>{label}{optional ? " (opcjonalnie)" : ""}</legend>
    {services.length > 1 && <div className={styles.serviceFilters}>
      <label className={styles.serviceSearch}><FiSearch aria-hidden="true" /><input type="search" aria-label="Szukaj usługi" placeholder="Szukaj usługi…" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <div className={styles.serviceSort} role="group" aria-label="Sortowanie usług">
        {sortOptions.map(([key, label]) => <button type="button" key={key} aria-pressed={sort === key} onClick={() => { setSort(key); track.current?.scrollTo?.({ left: 0, behavior: "auto" }); }}>
          {key.startsWith("price") ? <FiTag aria-hidden="true" /> : key.startsWith("duration") ? <FiClock aria-hidden="true" /> : null}{label}{key.endsWith("asc") ? <FiArrowUp aria-hidden="true" /> : key.endsWith("desc") ? <FiArrowDown aria-hidden="true" /> : null}
        </button>)}
      </div>
    </div>}
    {visibleOptions.length === 0 && <p className={styles.notice}>Nie znaleziono usługi. <button type="button" onClick={() => setQuery("")}>Wyczyść wyszukiwanie</button></p>}
    <div className={styles.serviceToolbar}>
      <span>{value ? <>Wybrano: <b>{value.name}</b></> : "Znajdź coś dla siebie"}</span>
      {visibleOptions.length > 1 && <div className={styles.carouselNav}>
        <button type="button" aria-label="Poprzednie usługi" aria-controls={groupName} disabled={disabled || edges.start} onClick={() => move(-1)}><FiChevronLeft /></button>
        <button type="button" aria-label="Następne usługi" aria-controls={groupName} disabled={disabled || edges.end} onClick={() => move(1)}><FiChevronRight /></button>
      </div>}
    </div>
    <div className={styles.serviceGrid} id={groupName} ref={track} onScroll={updateEdges} aria-label="Usługi do wyboru">
      {visibleOptions.map(service => {
        const selected = service ? String(value?._id) === String(service._id) : !value;
        const duration = service && serviceDuration(service);
        const price = service && servicePrice(service);
        return <label className={styles.serviceOption} key={service?._id || "no-service"}>
          <input type="radio" name={groupName} aria-label={service?.name || "Ustalę w rozmowie"} value={service?._id || ""} checked={selected} onChange={() => onChange(service)} onFocus={event => event.target.closest("label")?.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "auto" })} />
          <span className={styles.serviceTile}>
            <ServiceImage service={service} />
            <span className={styles.serviceName}>{service?.name || "Ustalę w rozmowie"}</span>
            <span className={styles.serviceCheck} aria-hidden="true">{selected && <FiCheck />}</span>
            <span className={styles.serviceMeta}>
              {duration && <span className={styles.durationBadge}><FiClock aria-hidden="true" /><span><small>Czas trwania</small><strong>{duration}</strong></span></span>}
              {price && <span className={styles.priceBadge}><FiTag aria-hidden="true" /><span><small>Cena</small><strong>{price}</strong></span></span>}
              {!service && <span>Zapytanie bez wyboru usługi</span>}
            </span>
          </span>
        </label>;
      })}
    </div>
  </fieldset>;
}
