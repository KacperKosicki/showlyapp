import { occursOn, reservationDates, reservationTimeLabel, dayBookingMode } from './dayBooking';
test('stay spans its nights in provider and client calendars, excluding departure', () => {
  const stay = { bookingKind: 'stay', date: '2027-01-30', endDate: '2027-02-02' };
  expect(reservationDates(stay)).toEqual(['2027-01-30', '2027-01-31', '2027-02-01']);
  expect(occursOn(stay, '2027-01-31')).toBe(true);
  expect(occursOn(stay, '2027-02-02')).toBe(false);
});
test('order and hour labels do not claim the whole day', () => {
  expect(reservationTimeLabel({ bookingKind: 'order' })).toBe('Zamówienie na datę');
  expect(reservationTimeLabel({ bookingKind: 'hours', fromTime: '10:00', toTime: '14:00' })).toBe('10:00 – 14:00');
  expect(dayBookingMode({})).toBe('exclusive-day');
});
