const test=require('node:test');
const assert=require('node:assert/strict');
const {claimBillingEvent}=require('../utils/billingEvents');
const event={id:'evt_paid',type:'invoice.paid',data:{object:{id:'invoice1'}}};
const duplicate=async()=>{const err=new Error('duplicate');err.code=11000;throw err;};
test('failed webhook can be claimed again for Stripe retry', async()=>{
  let claimQuery;
  const Model={create:duplicate,findOneAndUpdate:async(q)=>{claimQuery=q;return {status:'processing'};}};
  assert.equal(await claimBillingEvent(Model,event),true);
  assert.ok(claimQuery.$or.some(rule=>rule.status==='failed'));
  assert.ok(claimQuery.$or.some(rule=>rule.status==='processing'&&rule.leaseUntil.$lt instanceof Date));
});
test('completed duplicate is acknowledged without applying payment again',async()=>{
  const Model={create:duplicate,findOneAndUpdate:async()=>null,findOne:async()=>({status:'processed'})};
  assert.equal(await claimBillingEvent(Model,event),false);
});
test('in-progress duplicate requests retry without taking ownership',async()=>{
  const Model={create:duplicate,findOneAndUpdate:async()=>null,findOne:async()=>({status:'processing'})};
  await assert.rejects(()=>claimBillingEvent(Model,event),error=>error.billingBusy===true);
});
