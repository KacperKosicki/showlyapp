import { isAppleMobileBrowser, updateBrowserTheme } from './browserTheme';
const originalAgent = navigator.userAgent;
const originalTouchPoints = navigator.maxTouchPoints;
afterEach(() => {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: originalAgent });
  Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: originalTouchPoints });
  document.documentElement.removeAttribute('data-beta-banner-visible');
  document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.remove());
});

test('recognizes iPhone and iPad desktop mode without treating every Mac as iOS', () => {
  expect(isAppleMobileBrowser({ userAgent: 'Mozilla iPhone', maxTouchPoints: 5 })).toBe(true);
  expect(isAppleMobileBrowser({ userAgent: 'Mozilla Macintosh', maxTouchPoints: 5 })).toBe(true);
  expect(isAppleMobileBrowser({ userAgent: 'Mozilla Macintosh', maxTouchPoints: 0 })).toBe(false);
  expect(isAppleMobileBrowser({ userAgent: 'Android', maxTouchPoints: 5 })).toBe(false);
});

test('iPhone uses lime only while the banner is visible and removes tint immediately on dismissal', () => {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla iPhone' });
  document.documentElement.setAttribute('data-beta-banner-visible', 'true');
  for (const color of ['#fffdf7', '#1c1f1b']) {
    updateBrowserTheme(color);
    expect(document.querySelector('meta[name="theme-color"]').content).toBe('#d8ff72');
  }
  document.documentElement.setAttribute('data-beta-banner-visible', 'false');
  for (const color of ['#fffdf7', '#1c1f1b']) {
    updateBrowserTheme(color);
    expect(document.querySelector('meta[name="theme-color"]')).toBeNull();
  }
});

test('other browsers retain navigation theme colors', () => {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla Android' });
  updateBrowserTheme('#fffdf7'); updateBrowserTheme('#1c1f1b');
  expect(document.querySelectorAll('meta[name="theme-color"]').length).toBe(1);
  expect(document.querySelector('meta[name="theme-color"]').content).toBe('#1c1f1b');
});
