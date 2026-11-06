const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
let locks = new Map(), records = [], profile;
const lockModel = {
  async findOneAndUpdate(filter, update) {
    const current = locks.get(filter._id);
    if (current && current.expiresAt > filter.expiresAt.$lte) throw Object.assign(new Error('duplicate'), {code:11000});
    locks.set(filter._id, update.$set); return update.$set;
  },
  async deleteOne(filter) { if (locks.get(filter._id)?.token === filter.token) locks.delete(filter._id); },
};
const query = data => ({ lean: async () => data, then: (yes, no) => Promise.resolve(data).then(yes, no) });
const Reservation = {
  find: () => query(records.filter(r => r.status === 'zaakceptowana')),
  findOne: filter => query(records.find(r => r.userId === filter.userId && r.date === filter.date && r.fromTime === filter.fromTime && r.toTime === filter.toTime && r.bookingKind === filter.bookingKind && r.status === 'oczekująca')),
  findById: async id => { const record = records.find(r => r._id === id); return record ? { ...record } : null; },
  async create(data) { const record = { ...data, _id: 'r' + records.length }; records.push(record); return record; },
  async findOneAndUpdate(filter, update) { const record = records.find(r => r._id === filter._id && r.status === filter.status); if (!record) return null; Object.assign(record, update.$set); return record; },
};
const Profile = { findById: () => query(profile) };
const User = { findOne: () => query({ name:'Klient', role:'user' }) };
let factory, router;
const original = Module._load;
try {
  Module._load = function(name, parent, ...rest) {
    if (name === '../models/BookingWriteLock') return lockModel;
    if (/[\\/]routes[\\/]reservations.js$/.test(parent?.filename || '')) {
      const stubs = { '../models/Reservation':Reservation, '../models/Profile':Profile, '../models/User':User, '../models/Staff':{}, '../middleware/requireAuth':(req,res,next)=>next(), '../utils/sendPushNotification':{sendPushToUserUid:async()=>{}}, '../config/plans':{hasFeature:()=>true,getPublicBilling:()=>({})} };
      if (stubs[name]) return stubs[name];
    }
    return original.call(this,name,parent,...rest);
  };
  factory = require('../utils/dayReservationHandler');
  router = require('../routes/reservations');
} finally { Module._load = original; }
const deps = { Reservation, Profile, User, getReservationPlanAccess:() => ({bookingMode:'request-blocking',autoAcceptReservations:profile.autoAcceptReservations}), ensureServiceIsBookable:(p,id)=>id==='svc'?{ok:true,service:p.services[0]}:{ok:false,status:400,message:'Wybierz usługę'}, calculatePendingExpiresAt:date=>new Date(+date-3600000), sendPushToUserUid:async()=>{}, FRONTEND_URL:'https://example.com' };
const response = () => ({ code:200, status(code){this.code=code;return this;}, json(data){this.body=data;return this;}, send(data){this.body=data;return this;} });
async function create(body={}, offline=false) {const res=response();await factory(deps,offline)({auth:{uid:offline?'provider':'client'},body:{userId:'client',providerUserId:'provider',providerProfileId:'profile',date:'2099-06-10',serviceId:'svc',...body}},res);return res;}
async function accept(id) {const res=response();const route=router.stack.find(r=>r.route?.path==='/:id/status').route;await route.stack.at(-1).handle({auth:{uid:'provider'},params:{id},body:{status:'zaakceptowana'}},res);return res;}
test.beforeEach(()=>{ records=[];locks=new Map();profile={_id:'profile',userId:'provider',name:'Pracownia',dayBookingMode:'order',autoAcceptReservations:true,services:[{_id:'svc',name:'Tort'}],workingDays:[0,1,2,3,4,5,6],workingHours:{from:'08:00',to:'20:00'}}; });
test('orders on one date are independently accepted and keep authoritative service snapshots', async()=>{
  assert.equal((await create({serviceName:'Forged name'})).code,200);
  assert.equal((await create({userId:'client'})).code,200);
  assert.equal(records.length,2);assert.equal(records[0].serviceName,'Tort');assert.equal(records[0].bookingKind,'order');assert.equal(records[0].dateOnly,false);
});
test('parallel hour requests cannot create two accepted overlapping bookings and always release lock',async()=>{
  profile.dayBookingMode='hours';
  const results=await Promise.all([create({fromTime:'10:00',toTime:'12:00'}),create({fromTime:'11:00',toTime:'13:00'})]);
  assert.equal(results.filter(r=>r.code===200).length,1);assert.equal(results.filter(r=>r.code===409).length,1);assert.equal(records.length,1);assert.equal(locks.size,0);
  assert.equal((await create({fromTime:'12:00',toTime:'14:00'})).code,200);
});
test('stay creation checks interior dates and allows a subsequent arrival on checkout',async()=>{
  profile.dayBookingMode='stay';profile.blockedDays=['2099-06-11'];
  assert.equal((await create({endDate:'2099-06-13'})).code,409);assert.equal(locks.size,0);
  profile.blockedDays=[];
  assert.equal((await create({endDate:'2099-06-13'})).code,200);
  assert.equal((await create({date:'2099-06-13',endDate:'2099-06-15'})).code,200);
  assert.equal((await create({date:'2099-06-12',endDate:'2099-06-14'})).code,409);
});
test('pending bookings are rechecked at acceptance so competing requests cannot both be confirmed',async()=>{
  profile.dayBookingMode='hours';profile.autoAcceptReservations=false;
  const first=await create({fromTime:'10:00',toTime:'12:00'});const second=await create({fromTime:'11:00',toTime:'13:00'});
  assert.equal(first.code,200);assert.equal(second.code,200);
  assert.equal((await accept(first.body._id)).code,200);
  assert.equal((await accept(second.body._id)).code,409);
  assert.equal(records.filter(r=>r.status==='zaakceptowana').length,1);assert.equal(locks.size,0);
});
test('offline uses the same modes and validation; authorization cannot be forged',async()=>{
  profile.dayBookingMode='hours';
  assert.equal((await create({offlineClientName:'Gość',fromTime:'10:00',toTime:'12:00'},true)).code,201);
  assert.equal((await create({fromTime:'11:00',toTime:'13:00'})).code,409);
  assert.equal((await create({userId:'other'})).code,403);
});
test('public reservation metadata returns the selected date booking mode',async()=>{
  profile.dayBookingMode='stay';Profile.findOne=()=>query(profile);
  const route=router.stack.find(r=>r.route?.path==='/meta/:providerUid').route;const res=response();
  await route.stack.at(-1).handle({params:{providerUid:'provider'}},res);
  assert.equal(res.code,200);assert.equal(res.body.dayBookingMode,'stay');
});
