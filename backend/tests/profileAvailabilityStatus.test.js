const test = require('node:test');
const assert = require('node:assert/strict');
const Profile = require('../models/Profile');
const make = availabilityStatus => new Profile({ userId: 'availability-test', slug: 'availability-test', visibleUntil: new Date(), availabilityStatus });

test('existing profiles default to hidden status and new status fields persist', () => {
  assert.equal(make(undefined).availabilityStatus.state, 'hidden');
  const profile = make({ state: 'open', note: ' Zapraszam ', until: '2026-12-01' });
  assert.equal(profile.validateSync(), undefined);
  assert.equal(profile.toObject().availabilityStatus.note, 'Zapraszam');
});
test('status schema rejects unknown states, impossible dates and missing date availability', () => {
  assert.ok(make({ state: 'unknown' }).validateSync());
  assert.ok(make({ state: 'open', until: '2026-02-30' }).validateSync());
  assert.ok(make({ state: 'from-date' }).validateSync());
  assert.ok(make({ state: 'from-date', availableFrom: '2026-12-12', until: '2026-12-01' }).validateSync());
  assert.ok(make({ state: 'open', note: 'a'.repeat(121) }).validateSync());
});
