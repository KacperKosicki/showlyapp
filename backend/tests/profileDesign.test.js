const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Theme = mongoose.model('ProfileDesignTest', new mongoose.Schema({theme:{type:require('../models/ProfileDesign')}}));
test('custom design survives persistence serialization', () => {
  const doc = new Theme({theme:{variant:'custom', headingFont:'serif', primary:'#123456', background:'#fff', layout:'stacked', motion:'none', sections:{gallery:false}, sectionOrder:['reviews','services','overview','gallery']}});
  assert.equal(doc.validateSync(),undefined);
  const copy = new Theme(JSON.parse(JSON.stringify(doc)));
  assert.equal(copy.theme.headingFont,'serif'); assert.equal(copy.theme.sections.gallery,false);
  assert.deepEqual([...copy.theme.sectionOrder],['reviews','services','overview','gallery']);
});
test('rejects CSS injection, arbitrary fonts and incomplete ordering', () => {
  const doc = new Theme({theme:{primary:'url(evil)',headingFont:'bad',sectionOrder:['gallery']}});
  const errors = doc.validateSync().errors;
  assert.ok(errors['theme.primary']); assert.ok(errors['theme.headingFont']); assert.ok(errors['theme.sectionOrder']);
});
test('persists all new banner, border and layout settings', () => {
  const settings={layoutVersion:2,layout:'split',border:'#123456',heroText:'#abcdef',borderStyle:'dashed',borderWidth:3,avatarShape:'circle',heroAlignment:'left',titleSize:'large',bannerPosition:'top',bannerOverlay:75,showBanner:false,buttonStyle:'outline',contentWidth:'contained',serviceLayout:'list'};
  const doc=new Theme({theme:settings});
  assert.equal(doc.validateSync(),undefined);
  const copy=new Theme(JSON.parse(JSON.stringify(doc)));
  for(const [key,value] of Object.entries(settings)) assert.equal(copy.theme[key],value,key);
});
test('rejects unsupported presentation values', () => {
  const errors=new Theme({theme:{borderWidth:100,bannerOverlay:100,avatarShape:'triangle',border:'url(evil)'}}).validateSync().errors;
  for(const key of ['borderWidth','bannerOverlay','avatarShape','border']) assert.ok(errors[`theme.${key}`]);
});
