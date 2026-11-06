const DAY_MS = 86400000;
const MODES = ['exclusive-day', 'order', 'hours', 'stay'];
const modeOf = profile => MODES.includes(profile?.dayBookingMode) ? profile.dayBookingMode : 'exclusive-day';
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
const nextDate = date => new Date(Date.parse(date) + DAY_MS).toISOString().slice(0, 10);
function occupiedDates(booking) {
  const end = booking.bookingKind === 'stay' ? booking.endDate : nextDate(booking.date);
  const dates = [];
  for (let day = booking.date; day < end && dates.length <= 366; day = nextDate(day)) dates.push(day);
  return dates;
}
const todayPL = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(new Date());
function warsawTime(date, time) {
  const wall = Date.parse(`${date}T${time}:00Z`);
  let utc = wall;
  for (let i = 0; i < 3; i++) {
    const offset = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Warsaw', timeZoneName: 'longOffset' }).formatToParts(new Date(utc)).find(p => p.type === 'timeZoneName').value;
    const match = offset.match(/GMT([+-])(\d{2}):(\d{2})/);
    const minutes = match ? (Number(match[2]) * 60 + Number(match[3])) * (match[1] === '+' ? 1 : -1) : 0;
    utc = wall - minutes * 60000;
  }
  const parts = Object.fromEntries(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(utc)).map(p => [p.type, p.value]));
  if (`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}` !== `${date}T${time}`) throw fail('Ta godzina nie istnieje z powodu zmiany czasu. Wybierz inną godzinę.');
  return new Date(utc);
}
function buildDayBooking(profile, body, { validate = true } = {}) {
  const bookingKind = modeOf(profile);
  const date = body.date;
  if (!validDate(date) || (validate && date < todayPL())) throw fail('Wybierz poprawną datę, która jeszcze nie minęła.');
  let endDate = date, fromTime = '00:00', toTime = '23:59';
  if (bookingKind === 'hours') {
    fromTime = body.fromTime; toTime = body.toTime;
    const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    if (!validTime(fromTime) || !validTime(toTime) || toTime <= fromTime) throw fail('Podaj godziny od–do w tym samym dniu. Godzina końcowa musi być późniejsza.');
    const from = profile.workingHours?.from || '08:00', to = profile.workingHours?.to || '20:00';
    if (fromTime < from || toTime > to) throw fail(`Wybierz godziny w przedziale ${from}–${to}.`);
  }
  if (bookingKind === 'stay') {
    endDate = body.endDate;
    if (!validDate(endDate) || endDate <= date || Date.parse(endDate) - Date.parse(date) > 366 * DAY_MS) throw fail('Wybierz datę wyjazdu po przyjeździe, maksymalnie 366 nocy później.');
  }
  if (bookingKind !== 'stay' && profile.workingDays?.length && !profile.workingDays.map(Number).includes(new Date(date).getUTCDay())) throw fail('Ten dzień jest poza harmonogramem.');
  const booking = { bookingKind, date, endDate, dateOnly: bookingKind === 'exclusive-day', fromTime, toTime };
  const startAt = warsawTime(date, bookingKind === 'hours' ? fromTime : '00:00');
  const endAt = warsawTime(bookingKind === 'stay' ? endDate : bookingKind === 'hours' ? date : nextDate(date), bookingKind === 'hours' ? toTime : '00:00');
  if (validate && endAt <= new Date()) throw fail('Ten termin już minął.');
  if (validate && bookingKind === 'hours' && startAt <= new Date()) throw fail('Wybierz przyszłą godzinę rozpoczęcia.');
  return { ...booking, startAt, endAt, duration: bookingKind === 'hours' ? (endAt - startAt) / 60000 : null };
}
function interval(booking) {
  if (booking.bookingKind === 'stay') return [Date.parse(booking.date), Date.parse(booking.endDate)];
  if (booking.dateOnly || booking.bookingKind === 'order' || (booking.fromTime === '00:00' && booking.toTime === '23:59')) return [Date.parse(booking.date), Date.parse(nextDate(booking.date))];
  return [Date.parse(`${booking.date}T${booking.fromTime}:00Z`), Date.parse(`${booking.date}T${booking.toTime}:00Z`)];
}
function conflicts(left, right) {
  if (left.bookingKind === 'order' || right.bookingKind === 'order') return false;
  const [a, b] = interval(left), [c, d] = interval(right);
  return a < d && b > c;
}
function scheduleError(profile, booking) {
  for (const date of occupiedDates(booking)) {
    if (profile.blockedDays?.includes(date)) return 'Wybrany termin obejmuje zablokowany dzień.';
    for (const item of profile.availabilityOverrides || []) {
      if (item.date !== date) continue;
      if (item.type === 'day') return 'Wybrany termin obejmuje niedostępny dzień.';
      if (item.type === 'slot' && booking.bookingKind !== 'order' && (booking.bookingKind !== 'hours' || (booking.fromTime < item.toTime && booking.toTime > item.fromTime))) return 'Wybrany termin obejmuje niedostępne godziny.';
    }
  }
  return null;
}
function busySlots(records) {
  return records.filter(record => record.bookingKind !== 'order').flatMap(record => record.bookingKind === 'stay' ? occupiedDates(record).map(date => ({ ...record, date, dateOnly: true, fromTime: '00:00', toTime: '23:59' })) : [record]);
}
module.exports = { busySlots, MODES, modeOf, fail, validDate, nextDate, todayPL, warsawTime, occupiedDates, buildDayBooking, conflicts, scheduleError };
