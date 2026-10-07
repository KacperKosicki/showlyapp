import { render, screen } from '@testing-library/react';
import PublicProfile from './PublicProfile';
import { normalizeProfileDesign } from '../../utils/profileDesign';
import styles from './PublicProfile.module.scss';

jest.mock('../../firebase', () => ({auth:{currentUser:null}}));
jest.mock('firebase/auth', () => ({onAuthStateChanged:(_auth,callback)=>{callback(null);return ()=>{};}}));
jest.mock('react-router-dom', () => ({useParams:()=>({slug:'test-profile'}),useLocation:()=>({pathname:'/test-profile'}),useNavigate:()=>jest.fn()}), {virtual:true});
jest.mock('../../api/reportApi', () => ({reportApi:{create:jest.fn()}}));
const originalFetch=global.fetch;
afterEach(()=>{global.fetch=originalFetch;});
const load = async (theme) => {
  global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({name:'Testowa marka',role:'Fotografia',userId:'owner',slug:'test-profile',theme,banner:{url:'https://example.com/banner.jpg'},billingPublic:{effectivePlan:'premium'},photos:[],services:[{_id:'service1',name:'Sesja',isActive:true,price:{type:'fixed',amount:100},booking:{enabled:false}}],ratedBy:[],tags:[],links:[],description:'Opis marki'})});
  const result=render(<PublicProfile/>);
  await screen.findByRole('heading',{name:'Testowa marka'});
  return result.container;
};
test('public profile consumes saved design, hides sections and follows their order', async()=>{
  const theme=normalizeProfileDesign({layoutVersion:2,headingFont:'serif',bodyFont:'space',border:'#123456',borderStyle:'dashed',borderWidth:3,avatarShape:'circle',heroAlignment:'left',bannerPosition:'top',bannerOverlay:75,buttonStyle:'outline',serviceLayout:'list',tagline:'Moja nowa marka',ctaLabel:'Napisz do mnie',sections:{gallery:false,price:false},sectionOrder:['reviews','services','overview','gallery']});
  const container=await load(theme);
  const page=container.querySelector('[data-design]');
  expect(page.dataset.layout).toBe('split'); expect(page.dataset.alignment).toBe('left');
  expect(page.dataset.buttons).toBe('outline'); expect(page.dataset.services).toBe('list');
  expect(page.style.getPropertyValue('--pd-heading')).toBe('Georgia, serif');
  expect(page.style.getPropertyValue('--pd-avatar-radius')).toBe('50%');
  expect(page.style.getPropertyValue('--pd-banner-overlay')).toBe('0.75');
  expect(page.style.getPropertyValue('--pp-border')).toBe('#123456');
  expect(screen.getByRole('button',{name:'Napisz do mnie'})).toBeTruthy();
  expect(screen.getByText('Moja nowa marka')).toBeTruthy();
  expect([...container.querySelector('main').children].map(el=>el.id)).toEqual(['reviews','services','overview']);
  expect(screen.getByText('zdjęć').closest(`.${styles.heroStat}`).hidden).toBe(true);
});
test('legacy hero becomes split and disabling a banner keeps a gradient fallback', async()=>{
  const container=await load({layout:'stacked',showBanner:false,primary:'#123456'});
  expect(container.querySelector('[data-design]').dataset.layout).toBe('split');
  expect(container.querySelector(`.${styles.profileHeroWithBanner}`)).toBe(null);
  expect(container.querySelector('[data-design]').style.getPropertyValue('--pp-banner')).toContain('#123456');
});
