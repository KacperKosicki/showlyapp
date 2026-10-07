export const DESIGN_OPTIONS = {
  style: [['editorial', 'Showly / wyrazisty'], ['soft', 'Studio / miękki'], ['minimal', 'Minimal / prosty']],
  mode: [['system', 'Według aplikacji'], ['light', 'Jasny'], ['dark', 'Ciemny']],
  headingFont: [['poppins', 'Poppins'], ['space', 'Space Grotesk'], ['outfit', 'Outfit'], ['serif', 'Georgia']],
  bodyFont: [['outfit', 'Outfit'], ['space', 'Space Grotesk'], ['system', 'Systemowa']],
  layout: [['split', 'Wizytówka + panel kontaktu'], ['stacked', 'Szeroka wizytówka']],
  radius: [['rounded', 'Zaokrąglone'], ['sharp', 'Proste'], ['pill', 'Mocno zaokrąglone']],
  shadow: [['hard', 'Przesunięty cień'], ['soft', 'Miękki cień'], ['none', 'Bez cienia']],
  backgroundStyle: [['plain', 'Gładkie'], ['dots', 'Kropki'], ['grid', 'Siatka'], ['gradient', 'Gradient']],
  bannerStyle: [['gradient', 'Gradient'], ['solid', 'Jednolity kolor']],
  density: [['comfortable', 'Przestronnie'], ['compact', 'Kompaktowo']],
  motion: [['reveal', 'Delikatne pojawianie'], ['none', 'Bez animacji']],
  borderStyle: [['solid', 'Linia ciągła'], ['dashed', 'Linia przerywana'], ['none', 'Bez obramowania']],
  avatarShape: [['rounded', 'Zaokrąglony kwadrat'], ['circle', 'Koło'], ['sharp', 'Kwadrat']],
  heroAlignment: [['center', 'Na środku bannera'], ['left', 'Do lewej']],
  titleSize: [['small', 'Mniejsza'], ['normal', 'Standardowa'], ['large', 'Duża']],
  bannerPosition: [['center', 'Środek zdjęcia'], ['top', 'Góra zdjęcia'], ['bottom', 'Dół zdjęcia']],
  buttonStyle: [['filled', 'Wypełnione kolorem'], ['outline', 'Obrys i kolor tekstu']],
  contentWidth: [['wide', 'Szeroki'], ['contained', 'Skupiony na treści']],
  serviceLayout: [['grid', 'Karty obok siebie'], ['list', 'Lista usług']],
};
export const SECTION_LABELS = { overview: 'Opis i kontakt', services: 'Oferta', gallery: 'Galeria', reviews: 'Opinie' };
export const VISIBILITY_LABELS = { description: 'Opis i tagi', contact: 'Kontakt i social media', price: 'Cena orientacyjna', links: 'Linki', services: 'Oferta usług', gallery: 'Galeria zdjęć', reviews: 'Opinie' };
export const DESIGN_DEFAULTS = {
  variant: 'system', primary: '#6557ef', secondary: '#d8ff72',
  style: 'editorial', mode: 'system', headingFont: 'poppins', bodyFont: 'outfit',
  layout: 'split', radius: 'rounded', shadow: 'hard', backgroundStyle: 'plain',
  layoutVersion: 2,
  bannerStyle: 'gradient', gradientAngle: 135, density: 'comfortable', motion: 'reveal',
  decorations: true, background: '', surface: '', text: '', muted: '', ctaLabel: '', tagline: '',
  border: '', heroText: '#ffffff', borderStyle: 'solid', borderWidth: 2,
  avatarShape: 'rounded', heroAlignment: 'center', titleSize: 'normal',
  bannerPosition: 'center', bannerOverlay: 50, showBanner: true,
  buttonStyle: 'filled', contentWidth: 'wide', serviceLayout: 'grid',
  sectionOrder: Object.keys(SECTION_LABELS),
  sections: Object.fromEntries(Object.keys(VISIBILITY_LABELS).map(key => [key, true])),
};
export const DESIGN_PRESETS = [
  { name: 'Showly', theme: { ...DESIGN_DEFAULTS } },
  { name: 'Pracownia', theme: { ...DESIGN_DEFAULTS, variant: 'custom', style: 'soft', primary: '#9b5138', secondary: '#e8d7bb', headingFont: 'serif', shadow: 'soft', background: '#f3efe7', surface: '#fffdf8', text: '#293832', muted: '#626d65', mode: 'light' } },
  { name: 'Nocne studio', theme: { ...DESIGN_DEFAULTS, variant: 'custom', primary: '#b3a4ff', secondary: '#cbe880', mode: 'dark', backgroundStyle: 'grid', headingFont: 'space', shadow: 'none' } },
  { name: 'Ocean', theme: { ...DESIGN_DEFAULTS, variant: 'blue', style: 'soft', primary: '#20566b', secondary: '#83cbd1', shadow: 'soft', mode: 'light', background: '#edf4f3', surface: '#ffffff', text: '#183941', muted: '#566d72' } },
  { name: 'Minimal', theme: { ...DESIGN_DEFAULTS, variant: 'custom', style: 'minimal', primary: '#303830', secondary: '#d4dacd', radius: 'sharp', shadow: 'none', decorations: false, headingFont: 'outfit' } },
];
const HEX = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;
export const profileImageUrl = (image, api = process.env.REACT_APP_API_URL || '') => {
  const value = String(typeof image === 'string' ? image : image?.url || '').trim();
  if (!value) return '';
  if (/^(data:image\/|blob:|https?:\/\/)/i.test(value)) return value;
  if (value.startsWith('/uploads/')) return `${api}${value}`;
  if (value.startsWith('uploads/')) return `${api}/${value}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?]|$)/i.test(value)) return `https://${value}`;
  return value;
};
export const getProfileBookingPresentation = (profile = {}) => {
  const billing = profile.billingPublic || profile.billing || {};
  const features = billing.features || {};
  const hasFeatures = Object.keys(features).length > 0;
  const raw = String(profile.bookingMode || 'off').toLowerCase();
  const bookingMode = raw === 'calendar' && (!hasFeatures || features.booking) ? 'calendar'
    : raw === 'request-blocking' && (!hasFeatures || features.requestBlocking) ? 'request-blocking'
      : raw === 'request-open' ? 'request-open' : 'off';
  return {
    bookingMode, isCalendar: bookingMode === 'calendar',
    allowBookingUI: bookingMode !== 'off' && profile.showAvailableDates !== false,
    bookBtnLabel: bookingMode === 'calendar' ? 'Zarezerwuj termin' : 'Wyślij zapytanie'
  };
};
export const normalizeProfileDesign = (input = {}) => {
  const source = typeof input === 'string' ? { variant: input } : input || {};
  const legacy = { violet: ["#6f4ef2", "#ff4081"], blue: ["#2563eb", "#06b6d4"], green: ["#22c55e", "#a3e635"], orange: ["#f97316", "#facc15"], red: ["#ef4444", "#fb7185"], dark: ["#111827", "#4b5563"] };
  const result = { ...DESIGN_DEFAULTS, ...source };
  for (const [key, options] of Object.entries(DESIGN_OPTIONS)) {
    if (!options.some(([value]) => value === source[key])) result[key] = DESIGN_DEFAULTS[key];
  }
  // Older presets selected the full-width hero implicitly. Restore the side panel;
  // an explicit choice in the revised editor is retained on subsequent saves.
  if (Number(source.layoutVersion || 1) < 2) result.layout = 'split';
  result.layoutVersion = 2;
  for (const key of ['primary', 'secondary', 'background', 'surface', 'text', 'muted', 'border', 'heroText']) {
    result[key] = HEX.test(source[key] || '') ? source[key] : (key === 'primary' ? legacy[source.variant]?.[0] : key === 'secondary' ? legacy[source.variant]?.[1] : '') || DESIGN_DEFAULTS[key];
  }
  result.gradientAngle = Number.isFinite(Number(source.gradientAngle)) ? Math.max(0, Math.min(360, Number(source.gradientAngle))) : 135;
  result.decorations = source.decorations !== false;
  result.showBanner = source.showBanner !== false;
  for (const [key, min, max] of [['borderWidth', 1, 3], ['bannerOverlay', 0, 85]]) {
    result[key] = source[key] !== undefined && source[key] !== null && Number.isFinite(Number(source[key]))
      ? Math.max(min, Math.min(max, Math.round(Number(source[key])))) : DESIGN_DEFAULTS[key];
  }
  result.ctaLabel = String(source.ctaLabel || '').trim().slice(0, 40);
  result.tagline = String(source.tagline || '').trim().slice(0, 120);
  result.sections = Object.fromEntries(Object.keys(VISIBILITY_LABELS).map(key => [key, source.sections?.[key] !== false]));
  result.sectionOrder = [...new Set([...(Array.isArray(source.sectionOrder) ? source.sectionOrder : []), ...Object.keys(SECTION_LABELS)])].filter(key => Object.prototype.hasOwnProperty.call(SECTION_LABELS, key));
  return result;
};
const FONTS = { poppins: 'Poppins, sans-serif', space: '"Space Grotesk", sans-serif', outfit: 'Outfit, sans-serif', serif: 'Georgia, serif', system: 'system-ui, sans-serif' };
export const contrastInk = (hex) => {
  const value = hex.slice(1);
  const expanded = value.length === 3 ? [...value].map(c => c + c).join('') : value;
  const channels = [0, 2, 4].map(i => {
    const c = parseInt(expanded.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 > 0.179 ? '#171917' : '#ffffff';
};
export const getProfileDesignAttributes = (input) => {
  const theme = normalizeProfileDesign(input);
  return Object.fromEntries(Object.entries({
    design: theme.style, layout: theme.layout, motion: theme.motion,
    background: theme.backgroundStyle, decorations: theme.decorations, alignment: theme.heroAlignment,
    buttons: theme.buttonStyle, services: theme.serviceLayout, width: theme.contentWidth,
  }).map(([key, value]) => [`data-${key}`, value]));
};
export const getProfileDesignVars = (input) => {
  const theme = normalizeProfileDesign(input);
  const dark = theme.mode === 'dark';
  const colors = dark ? { background: '#1c1f1b', surface: '#111310', text: '#f5f2e9', muted: '#a9ada4' } : { background: '#f1eee4', surface: '#fffdf8', text: '#171917', muted: '#686c65' };
  const vars = {
    '--pp-primary': theme.primary, '--pp-secondary': theme.secondary, '--pp-lime': theme.secondary,
    '--pp-banner': theme.bannerStyle === 'solid' ? theme.primary : `linear-gradient(${theme.gradientAngle}deg, ${theme.primary}, ${theme.secondary})`,
    '--pd-heading': FONTS[theme.headingFont], '--pd-body': FONTS[theme.bodyFont],
    '--pd-radius': { rounded: '22px', sharp: '4px', pill: '36px' }[theme.radius],
    '--pd-shadow': { hard: '6px 7px 0 var(--pp-shadow)', soft: '0 18px 45px rgba(0,0,0,.12)', none: 'none' }[theme.shadow],
    '--pd-gap': theme.density === 'compact' ? '1rem' : '2rem',
    '--pd-mobile-gap': theme.density === 'compact' ? '.75rem' : '1.25rem',
    '--pd-padding': theme.density === 'compact' ? '1rem' : 'clamp(1.2rem, 2.5vw, 2rem)',
    '--pd-border-style': theme.borderStyle,
    '--pd-border-width': theme.borderStyle === 'none' ? '0px' : `${theme.borderWidth}px`,
    '--pd-avatar-radius': { rounded: '22px', circle: '50%', sharp: '0px' }[theme.avatarShape],
    '--pd-title-scale': { small: 0.8, normal: 1, large: 1.15 }[theme.titleSize],
    '--pd-banner-position': theme.bannerPosition,
    '--pd-banner-overlay': theme.bannerOverlay / 100,
    '--pd-hero-text': theme.heroText,
    '--pd-primary-ink': contrastInk(theme.primary), '--pd-secondary-ink': contrastInk(theme.secondary),
    '--pd-max-width': theme.contentWidth === 'contained' ? '1160px' : '1480px',
  };
  for (const [key, token] of Object.entries({ background: '--pp-page', surface: '--pp-surface', text: '--pp-ink', muted: '--pp-muted' })) {
    if (theme[key] || theme.mode !== 'system') vars[token] = theme[key] || colors[key];
  }
  if (vars['--pp-surface']) vars['--pp-surface-strong'] = vars['--pp-surface'];
  if (theme.mode !== 'system') {
    vars['--pp-border'] = dark ? '#85897e' : '#171917';
    vars['--pp-shadow'] = dark ? '#050605' : '#171917';
    vars['--pp-line'] = dark ? 'rgba(245,242,233,.17)' : 'rgba(23,25,23,.16)';
  }
  if (theme.border) { vars['--pp-border'] = theme.border; vars['--pd-frame'] = theme.border; }
  vars['--pd-hero-accent'] = contrastInk(theme.secondary) === '#ffffff' ? theme.heroText : theme.secondary;
  return vars;
};
