import { availabilityDay, getAvailabilityPresentation, validateAvailabilityStatus } from './profileAvailabilityStatus';

const now = new Date('2026-10-10T12:00:00Z');
test('legacy and hidden profiles have no availability claim', () => {
  expect(getAvailabilityPresentation(undefined, now)).toBeNull();
  expect(getAvailabilityPresentation({ state: 'hidden', note: 'Not visible' }, now)).toBeNull();
});
test('expiry includes the entire selected day in Poland', () => {
  const status = { state: 'open', until: '2026-10-10', note: '  Zapraszam  ' };
  expect(getAvailabilityPresentation(status, new Date('2026-10-10T21:59:00Z')).note).toBe('Zapraszam');
  expect(getAvailabilityPresentation(status, new Date('2026-10-10T22:00:00Z'))).toBeNull();
  expect(availabilityDay(new Date('2026-10-10T22:00:00Z'))).toBe('2026-10-11');
});
test('dated availability becomes open on the given date', () => {
  const status = { state: 'from-date', availableFrom: '2026-10-12' };
  expect(getAvailabilityPresentation(status, now).label).toBe('Wolne terminy od 12 października 2026');
  expect(getAvailabilityPresentation(status, new Date('2026-10-12T12:00:00Z')).state).toBe('open');
});
test('incomplete, impossible and inconsistent dates are rejected', () => {
  expect(validateAvailabilityStatus({ state: 'from-date' })).toBeTruthy();
  expect(validateAvailabilityStatus({ state: 'from-date', availableFrom: '2026-02-30' })).toBeTruthy();
  expect(validateAvailabilityStatus({ state: 'from-date', availableFrom: '2026-10-12', until: '2026-10-11' })).toBeTruthy();
  expect(validateAvailabilityStatus({ state: 'open', note: 'a'.repeat(121) })).toBeTruthy();
});
