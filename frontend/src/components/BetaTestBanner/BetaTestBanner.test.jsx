import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import BetaTestBanner from './BetaTestBanner';
jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
const originalFetch = global.fetch;
const status = (enabled, id = 'first-round') => ({ ok: true, json: async () => ({ betaPremiumEnabled: enabled, betaCampaignId: id }) });
beforeEach(() => { sessionStorage.clear(); global.fetch = jest.fn().mockResolvedValue(status(true)); });
afterEach(() => { global.fetch = originalFetch; jest.useRealTimers(); });

test('appears only during beta and reserves space above navigation', async () => {
  const { unmount } = render(<BetaTestBanner />);
  await screen.findByRole('complementary', { name: 'Bezpłatne testy Showly' });
  expect(screen.getByRole('link', { name: 'Dołącz za darmo' })).toHaveAttribute('href', '/register');
  expect(document.documentElement.style.getPropertyValue('--beta-banner-height')).toBe('40px');
  global.fetch.mockResolvedValue(status(false));
  fireEvent(window, new Event('showly:beta-premium-changed'));
  await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument());
  expect(document.documentElement.style.getPropertyValue('--beta-banner-height')).toBe('0px');
  unmount();
  expect(document.documentElement.style.getPropertyValue('--beta-banner-height')).toBe('');
});

test('closing is remembered across pages and reloads in this session; a new round appears again', async () => {
  const { unmount } = render(<BetaTestBanner />);
  fireEvent.click(await screen.findByRole('button', { name: 'Zamknij informację o testach' }));
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  expect(document.documentElement.style.getPropertyValue('--beta-banner-height')).toBe('0px');
  unmount();
  render(<BetaTestBanner user={{ uid: 'owner' }} />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  global.fetch.mockResolvedValue(status(true, 'second-round'));
  fireEvent(window, new Event('showly:beta-premium-changed'));
  expect(await screen.findByRole('link', { name: 'Sprawdź Premium' })).toHaveAttribute('href', '/profil');
});

test('can pause motion and rechecks status without reloading the page', async () => {
  jest.useFakeTimers();
  render(<BetaTestBanner />);
  fireEvent.click(await screen.findByRole('button', { name: 'Wstrzymaj przesuwanie komunikatu' }));
  expect(screen.getByRole('button', { name: 'Wznów przesuwanie komunikatu' })).toHaveAttribute('aria-pressed', 'true');
  global.fetch.mockResolvedValue(status(false));
  await act(async () => { jest.advanceTimersByTime(60000); });
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
});

test('does not advertise free Premium if status cannot be verified', async () => {
  global.fetch.mockResolvedValue({ ok: false });
  render(<BetaTestBanner />);
  await waitFor(() => expect(document.documentElement.style.getPropertyValue('--beta-banner-height')).toBe('0px'));
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
});

test('on iPhone, closing the banner also clears its system theme tint', async () => {
  const original = navigator.userAgent;
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla iPhone' });
  try {
    render(<BetaTestBanner />);
    const close = await screen.findByRole('button', { name: 'Zamknij informację o testach' });
    expect(document.querySelector('meta[name="theme-color"]').content).toBe('#d8ff72');
    fireEvent.click(close);
    expect(document.querySelector('meta[name="theme-color"]')).toBeNull();
    expect(document.documentElement.getAttribute('data-beta-banner-visible')).toBe('false');
  } finally {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: original });
  }
});
