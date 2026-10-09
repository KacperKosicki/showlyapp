const test = require('node:test');
const assert = require('node:assert/strict');
const { createAvailabilityResolver } = require('../utils/conversationAvailability');
const { runWithSettings } = require('../utils/betaAccess');
const query = value => ({ select() { return this; }, populate() { return this; }, lean: async () => value });
const thread = { _id: 'enquiry', channel: 'account_to_profile', firstFromUid: 'client', participants: [{ uid: 'client' }, { uid: 'provider' }] };
function resolver({ profile, firebaseUsers, fail = false, application = null } = {}) {
  return createAvailabilityResolver({
    User: { find: () => query([{ firebaseUid: 'client' }, { firebaseUid: 'provider' }]) },
    Profile: { find: () => query(profile ? [profile] : []) },
    Application: { find: () => query(application ? [application] : []) },
    admin: { auth: () => ({ getUsers: async () => {
      if (fail) throw Object.assign(new Error('Unavailable'), { code: 'auth/internal-error' });
      return { users: firebaseUsers || [{ uid: 'client' }, { uid: 'provider' }] };
    } }) },
  });
}

test('profile visibility and expiration never erase history and resume when restored', async () => {
  for (const [profile, reason] of [
    [null, 'profile_missing'],
    [{ userId: 'provider', visibleUntil: new Date(0) }, 'profile_expired'],
    [{ userId: 'provider', isVisible: false }, 'profile_hidden'],
    [{ userId: 'provider', visibilityBlockedByAdmin: true }, 'profile_blocked'],
    [{ userId: 'provider', isVisible: true, visibleUntil: new Date(Date.now() + 86400000) }, 'active'],
  ]) {
    const state = (await resolver({ profile })([thread])).get('enquiry');
    assert.equal(state.reason, reason);
    assert.equal(state.canOpen, reason === 'active');
  }
});

test('a missing Firebase account is recognized even when its Mongo account still exists', async () => {
  const state = (await resolver({ firebaseUsers: [{ uid: 'client' }] })([thread])).get('enquiry');
  assert.equal(state.reason, 'account_missing');
});

test('beta reopens expired profiles, while moderation and deleted announcements remain unavailable', async () => {
  await runWithSettings({ betaPremiumEnabled: true }, async () => {
    const expired = { userId: 'provider', isVisible: false, visibleUntil: new Date(0), visibilityBlockedByAdmin: false };
    assert.equal((await resolver({ profile: expired })([thread])).get('enquiry').canOpen, true);
    assert.equal((await resolver({ profile: { ...expired, visibilityBlockedByAdmin: true } })([thread])).get('enquiry').canOpen, false);
    const state = await resolver({ profile: expired, application: { _id: 'enquiry', announcementId: null } })([{ ...thread, channel: 'profile_to_account' }]);
    assert.equal(state.get('enquiry').reason, 'announcement_deleted');
  });
});

test('Firebase failure is temporary unavailability rather than deletion or a ban', async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const state = (await resolver({ fail: true })([thread])).get('enquiry');
    assert.equal(state.reason, 'unavailable');
    assert.equal(state.canOpen, false);
  } finally { console.error = originalError; }
});

test('system messages need neither a provider profile nor a Firebase SYSTEM account', async () => {
  const state = (await resolver({})([{ ...thread, channel: 'system' }])).get('enquiry');
  assert.equal(state.canOpen, true);
});

test('a removed announcement reference makes its dedicated thread inaccessible', async () => {
  const state = (await resolver({ application: { _id: 'enquiry', announcementId: null } })([{ ...thread, channel: 'profile_to_account' }])).get('enquiry');
  assert.equal(state.reason, 'announcement_deleted');
});
