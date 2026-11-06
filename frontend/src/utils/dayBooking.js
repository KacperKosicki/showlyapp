export const DAY_BOOKING_OPTIONS = [
  { value: 'order', title: 'Zamówienie na datę', text: 'Np. tort, catering lub produkt na odbiór. Możesz przyjąć wiele zamówień na tę samą datę.', action: 'Wyślij zamówienie' },
  { value: 'hours', title: 'Rezerwacja od–do', text: 'Np. DJ, fotograf lub wynajem sprzętu. Klient wybiera datę i godziny, a potwierdzone terminy nie mogą się nakładać.', action: 'Rezerwuj termin' },
  { value: 'stay', title: 'Pobyt / zakres dat', text: 'Np. apartament. Klient wybiera przyjazd i wyjazd. Rezerwujesz noce; dzień wyjazdu może być dniem kolejnego przyjazdu.', action: 'Rezerwuj pobyt' },
  { value: 'exclusive-day', title: 'Termin na wyłączność', text: 'Jedna potwierdzona rezerwacja na wybraną datę. Dla usług lub wynajmu, które zajmują cały dzień.', action: 'Rezerwuj termin' },
];
export const dayBookingMode = profile => DAY_BOOKING_OPTIONS.some(option => option.value === profile?.dayBookingMode) ? profile.dayBookingMode : 'exclusive-day';
export const dayBookingCopy = profile => DAY_BOOKING_OPTIONS.find(option => option.value === dayBookingMode(profile));
export function reservationDates(reservation) {
  if (reservation.bookingKind !== 'stay' || !reservation.endDate) return [reservation.date];
  const result = [];
  for (let day = reservation.date; day < reservation.endDate && result.length < 366; ) {
    result.push(day);
    const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 1); day = date.toISOString().slice(0, 10);
  }
  return result;
}
export const occursOn = (reservation, date) => reservation.bookingKind === 'stay' ? reservation.date <= date && date < reservation.endDate : reservation.date === date;
export function reservationTimeLabel(reservation) {
  if (reservation.bookingKind === 'order') return 'Zamówienie na datę';
  if (reservation.bookingKind === 'stay') return 'Pobyt · ' + Math.round((Date.parse(reservation.endDate) - Date.parse(reservation.date)) / 86400000) + ' noclegów';
  if (reservation.bookingKind === 'hours') return `${reservation.fromTime} – ${reservation.toTime}`;
  return reservation.dateOnly || (reservation.fromTime === '00:00' && reservation.toTime === '23:59') ? 'Termin na wyłączność' : `${reservation.fromTime} – ${reservation.toTime}`;
}
