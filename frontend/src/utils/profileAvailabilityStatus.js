export const AVAILABILITY_OPTIONS = [
  ['hidden', 'Nie pokazuj statusu'],
  ['open', 'Przyjmuję nowe zlecenia'],
  ['limited', 'Ostatnie wolne terminy'],
  ['from-date', 'Wolne terminy od…'],
  ['unavailable', 'Obecnie brak miejsc'],
];
export const normalizeAvailabilityStatus = (value = {}) => ({
  state: AVAILABILITY_OPTIONS.some(([key]) => key === value?.state) ? value.state : 'hidden',
  availableFrom: typeof value?.availableFrom === 'string' ? value.availableFrom : '',
  until: typeof value?.until === 'string' ? value.until : '',
  note: typeof value?.note === 'string' ? value.note : '',
});
export const availabilityDay = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};
export const isAvailabilityDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export const validateAvailabilityStatus = value => {
  const status = normalizeAvailabilityStatus(value);
  if (status.state === 'hidden') return '';
  if (status.note.length > 120) return 'Wiadomość o dostępności może mieć do 120 znaków.';
  if (status.state === 'from-date' && !isAvailabilityDate(status.availableFrom)) return 'Wybierz datę, od której przyjmujesz zlecenia.';
  if (status.until && !isAvailabilityDate(status.until)) return 'Wybierz poprawną datę wygaśnięcia statusu.';
  if (status.state === 'from-date' && status.until && status.availableFrom > status.until) return 'Data wygaśnięcia nie może poprzedzać daty dostępności.';
  return '';
};
export const getAvailabilityPresentation = (value, now = new Date()) => {
  const status = normalizeAvailabilityStatus(value);
  if (status.state === 'hidden' || validateAvailabilityStatus(status)) return null;
  const today = availabilityDay(now);
  if (status.until && status.until < today) return null;
  const state = status.state === 'from-date' && status.availableFrom <= today ? 'open' : status.state;
  const date = state === 'from-date' ? new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${status.availableFrom}T12:00:00Z`)) : '';
  return { state, label: state === 'from-date' ? `Wolne terminy od ${date}` : AVAILABILITY_OPTIONS.find(([key]) => key === state)[1], note: status.note.trim() };
};
