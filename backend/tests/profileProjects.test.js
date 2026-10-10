const test = require('node:test');
const assert = require('node:assert/strict');
const Profile = require('../models/Profile');
const makeProfile = projects => new Profile({ userId: 'test-user', slug: 'test-profile', visibleUntil: new Date(), projects });

test('legacy profiles default to an empty portfolio', () => {
  assert.equal(makeProfile(undefined).projects.length, 0);
});
test('portfolio persists fields and validates title, lengths and project count', () => {
  const profile = makeProfile([{ title: ' Projekt ', outcome: 'Efekt', photoKey: 'gallery/photo', featured: true }]);
  assert.equal(profile.validateSync(), undefined);
  assert.equal(profile.toObject().projects[0].title, 'Projekt');
  assert.equal(profile.toObject().projects[0].featured, true);
  assert.ok(makeProfile([{ title: ' ' }]).validateSync());
  assert.ok(makeProfile([{ title: 'Projekt', outcome: 'a'.repeat(241) }]).validateSync());
  assert.ok(makeProfile(Array.from({ length: 7 }, () => ({ title: 'Projekt' }))).validateSync());
});
