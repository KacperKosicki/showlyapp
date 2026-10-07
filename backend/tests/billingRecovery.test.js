const test = require('node:test');
const assert = require('node:assert/strict');
const { getSubscriptionPeriod, getInvoiceSubscriptionId, buildSubscriptionUpdate, applySubscriptionToProfile } = require('../utils/billingRecovery');
const now = new Date('2026-10-06T12:00:00Z');
const end = new Date('2026-11-06T12:00:00Z');
const profile = () => ({ _id: 'profile1', userId: 'owner', isVisible: false, visibleUntil: new Date('2026-09-06'), billing: { stripeCustomerId: 'cus_owner' } });
const subscription = () => ({ id: 'sub1', customer: 'cus_owner', metadata: { uid: 'owner', profileId: 'profile1', plan: 'premium' }, status: 'active', items: { data: [{ price: { id: 'price_premium' }, current_period_end: end.getTime()/1000 }] } });
test('supports new item periods and legacy subscription periods', () => {
  assert.equal(getSubscriptionPeriod(subscription()).end.toISOString(), end.toISOString());
  assert.equal(getSubscriptionPeriod({current_period_end: end.getTime()/1000}).end.toISOString(), end.toISOString());
  assert.equal(getInvoiceSubscriptionId({parent:{subscription_details:{subscription:{id:'sub1'}}}}), 'sub1');
});
test('expired Premium can restore immediately using Stripe period', () => {
  const result = buildSubscriptionUpdate(profile(), subscription(), {}, now);
  assert.equal(result.canRestore, true);
  assert.equal(result.plan, 'premium');
  assert.equal(result.entitledUntil.toISOString(), end.toISOString());
});
test('does not fabricate a period or accept a different owner/customer', () => {
  assert.throws(() => buildSubscriptionUpdate(profile(), {...subscription(), items:{data:[]}}, {}, now));
  assert.throws(() => buildSubscriptionUpdate(profile(), {...subscription(), customer:'other'}, {}, now));
  assert.throws(() => buildSubscriptionUpdate(profile(), {...subscription(), metadata:{uid:'other',plan:'premium'}}, {}, now));
});
test('moderation blocks are preserved including legacy future-dated blocks', () => {
  assert.equal(buildSubscriptionUpdate({...profile(), visibilityBlockedByAdmin:true}, subscription(), {}, now).canRestore, false);
  assert.equal(buildSubscriptionUpdate({...profile(), visibleUntil:end}, subscription(), {}, now).canRestore, false);
  assert.equal(buildSubscriptionUpdate({...profile(), visibleUntil:end, visibilityBlockedByAdmin:false}, subscription(), {}, now).canRestore, true);
});
test('past-due and canceled subscriptions do not create a paid month', () => {
  for (const status of ['past_due','canceled','unpaid']) assert.equal(buildSubscriptionUpdate(profile(), {...subscription(),status}, {}, now).canRestore, false);
});
test('reconciliation repeated twice retains paid date instead of adding days', async () => {
  let record = profile(); const calls = [];
  const model = { findOne:async()=>record, findById:async()=>record, updateOne:async(filter,update)=> {
    calls.push(update);
    if (update.$max) {record.isVisible=true;record.visibleUntil=update.$max.visibleUntil;}
    else for(const [key,value] of Object.entries(update.$set)) record.billing[key.split('.')[1]]=value;
  }};
  await applySubscriptionToProfile(model, subscription());
  await applySubscriptionToProfile(model, subscription());
  assert.equal(record.visibleUntil.toISOString(),end.toISOString());
  assert.equal(calls.filter(call=>call.$max).length,2);
});
