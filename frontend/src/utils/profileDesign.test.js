import { normalizeProfileDesign, getProfileDesignVars, getProfileDesignAttributes, getProfileBookingPresentation, DESIGN_PRESETS, contrastInk } from './profileDesign';
test('keeps edited settings and repairs section order', () => {
  const theme = normalizeProfileDesign({ headingFont: 'serif', layout: 'stacked', sections: { gallery: false }, sectionOrder: ['reviews', 'reviews', 'bogus'] });
  expect(theme.sectionOrder).toEqual(['reviews', 'overview', 'services', 'gallery']);
  expect(normalizeProfileDesign(JSON.parse(JSON.stringify(theme)))).toEqual(theme);
  expect(theme.sections.gallery).toBe(false);
});
test('rejects unsafe CSS values and unsupported options', () => {
  const theme = normalizeProfileDesign({ primary: 'url(evil)', headingFont: 'bad', gradientAngle: 1000 });
  expect(theme.primary).toBe('#6557ef'); expect(theme.headingFont).toBe('poppins'); expect(theme.gradientAngle).toBe(360);
});
test('all presets produce matching public design variables', () => {
  DESIGN_PRESETS.forEach(({ theme }) => { const vars = getProfileDesignVars(theme); expect(vars['--pp-primary']).toBe(theme.primary); expect(vars['--pp-lime']).toBe(theme.secondary); });
  expect(getProfileDesignVars(DESIGN_PRESETS[2].theme)['--pp-page']).toBe('#1c1f1b');
});
test('legacy color variants are preserved', () => { expect(normalizeProfileDesign('blue').primary).toBe('#2563eb'); });

test('restores the side panel for old presets without resetting other choices', () => {
  expect(normalizeProfileDesign({ layout: 'stacked', headingFont: 'serif', primary: '#123456' })).toMatchObject({ layout: 'split', headingFont: 'serif', primary: '#123456', layoutVersion: 2 });
  expect(normalizeProfileDesign({ layout: 'stacked', layoutVersion: 2 }).layout).toBe('stacked');
});
test('new presentation choices survive save normalization and produce shared variables', () => {
  const theme = normalizeProfileDesign({ layoutVersion: 2, avatarShape: 'circle', borderStyle: 'dashed', borderWidth: 3, border: '#abc', heroAlignment: 'left', titleSize: 'large', bannerPosition: 'top', bannerOverlay: 75, showBanner: false, buttonStyle: 'outline', serviceLayout: 'list', heroText: '#fed' });
  expect(normalizeProfileDesign(JSON.parse(JSON.stringify(theme)))).toEqual(theme);
  expect(getProfileDesignVars(theme)).toMatchObject({ '--pd-avatar-radius': '50%', '--pd-border-width': '3px', '--pd-border-style': 'dashed', '--pp-border': '#abc', '--pd-banner-overlay': .75, '--pd-hero-text': '#fed' });
  expect(getProfileDesignAttributes(theme)).toMatchObject({ 'data-alignment': 'left', 'data-buttons': 'outline', 'data-services': 'list' });
});
test('clamps banner and border values, and keeps text readable on accent colors', () => {
  expect(normalizeProfileDesign({ borderWidth: 200, bannerOverlay: -20, heroText: 'url(evil)' })).toMatchObject({ borderWidth: 3, bannerOverlay: 0, heroText: '#ffffff' });
  expect(contrastInk('#fff')).toBe('#171917'); expect(contrastInk('#000')).toBe('#ffffff');
});
test('preview and public profile use the same booking button rules', () => {
  expect(getProfileBookingPresentation({ bookingMode: 'calendar', billingPublic: { features: { booking: false, requestBlocking: true } } }).allowBookingUI).toBe(false);
  expect(getProfileBookingPresentation({ bookingMode: 'calendar' })).toMatchObject({ isCalendar: true, allowBookingUI: true, bookBtnLabel: 'Zarezerwuj termin' });
  expect(getProfileBookingPresentation({ bookingMode: 'request-open', showAvailableDates: false }).allowBookingUI).toBe(false);
  expect(getProfileBookingPresentation({}).allowBookingUI).toBe(false);
});
