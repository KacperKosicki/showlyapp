const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDayBooking, occupiedDates, conflicts, scheduleError, warsawTime, modeOf } = require('../utils/dayBooking');
const date = '2099-06-10';
const profile = { workingDays: [0,1,2,3,4,5,6], workingHours: { from: '08:00', to: '23:00' } };
const make = (kind, body) => buildDayBooking({ ...profile, dayBookingMode: kind }, { date, ...body });
test('orders share a date and preserve date-only intent without the legacy exclusive unique index', () => {
  const order = make('order');
  assert.equal(order.dateOnly, false);
  assert.equal(conflicts(order, make('exclusive-day')), false);
  assert.equal(conflicts(order, order), false);
  assert.equal(modeOf({}), 'exclusive-day');
});
test('hours validate schedules and allow adjacent intervals, never overlapping ones', () => {
  const first = make('hours', { fromTime:'10:00', toTime:'12:00' });
  assert.equal(conflicts(first, make('hours', { fromTime:'12:00', toTime:'14:00' })), false);
  assert.equal(conflicts(first, make('hours', { fromTime:'11:59', toTime:'14:00' })), true);
  for (const hours of [['12:00','12:00'], ['23:00','08:00'], ['bad','12:00'], ['07:00','09:00']]) assert.throws(() => make('hours', { fromTime: hours[0], toTime:hours[1] }));
});
test('stays reserve nights, exclude checkout and detect blocked interior days', () => {
  const stay = make('stay', { endDate:'2099-06-13' });
  assert.deepEqual(occupiedDates(stay), ['2099-06-10','2099-06-11','2099-06-12']);
  assert.equal(conflicts(stay, make('stay', { date:'2099-06-13', endDate:'2099-06-15' })), false);
  assert.equal(conflicts(stay, make('stay', { date:'2099-06-12', endDate:'2099-06-15' })), true);
  assert.ok(scheduleError({ blockedDays:['2099-06-11'] }, stay));
  assert.equal(scheduleError({ blockedDays:['2099-06-13'] }, stay), null);
  assert.throws(() => make('stay', { endDate:date }));
  assert.throws(() => make('stay', { endDate:'2101-01-01' }));
});
test('date validation rejects impossible, missing and past dates', () => {
  for (const invalid of ['2099-02-30','2099-13-01','bad','2020-01-01',null,{}]) assert.throws(() => make('order', { date:invalid }));
});
test('slot exceptions affect hour bookings, not date orders; day exceptions affect both', () => {
  const exceptions = { availabilityOverrides:[{type:'slot',date,fromTime:'10:00',toTime:'11:00'}] };
  assert.ok(scheduleError(exceptions, make('hours',{fromTime:'10:30',toTime:'12:00'})));
  assert.equal(scheduleError(exceptions, make('hours',{fromTime:'11:00',toTime:'12:00'})), null);
  assert.equal(scheduleError(exceptions, make('order')), null);
  assert.ok(scheduleError({ availabilityOverrides:[{type:'day',date}] }, make('order')));
});
test('hour timestamps use Warsaw time in winter and summer, rejecting nonexistent DST times', () => {
  assert.equal(warsawTime('2027-01-01','12:00').toISOString(), '2027-01-01T11:00:00.000Z');
  assert.equal(warsawTime('2027-07-01','12:00').toISOString(), '2027-07-01T10:00:00.000Z');
  assert.throws(() => warsawTime('2027-03-28','02:30'));
});

test('slot availability expands existing stays and omits non-exclusive orders after a mode change', () => {
  const { busySlots } = require('../utils/dayBooking');
  const result = busySlots([{ date:'2099-06-10', endDate:'2099-06-12', bookingKind:'stay' }, { date:'2099-06-10', bookingKind:'order' }]);
  assert.deepEqual(result.map(item => item.date), ['2099-06-10','2099-06-11']);
  assert.ok(result.every(item => item.dateOnly && item.fromTime === '00:00' && item.toTime === '23:59'));
});
