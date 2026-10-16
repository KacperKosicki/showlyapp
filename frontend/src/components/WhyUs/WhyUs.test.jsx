import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WhyUs from './WhyUs';
jest.mock('react-router-dom', () => ({
  Link: ({ to, state, children, ...props }) => <a href={to} data-scroll-to={state?.scrollToId} {...props}>{children}</a>,
}), { virtual: true });

const originalFetch = global.fetch;
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ betaPremiumEnabled: false }) });
});
afterEach(() => { global.fetch = originalFetch; });

test('comparison has meaningful row and column headings and plan conditions', async () => {
  render(<WhyUs />);
  await act(async () => {});
  const table = screen.getByRole('table');
  expect(within(table).getAllByRole('row')).toHaveLength(6);
  expect(within(table).getByRole('columnheader', { name: 'Sam kontakt w bio' })).toBeInTheDocument();
  expect(within(table).getByRole('columnheader', { name: 'Twój profil Showly' })).toBeInTheDocument();
  expect(within(table).getByRole('rowheader', { name: 'Efekty Twojej pracy' })).toBeInTheDocument();
  expect(screen.getByText(/Opcje wyglądu, rezerwacje i limity zależą od planu/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Zobacz różnicę' })).toHaveAttribute('href', '#why-comparison');
});

test('guest and new-profile CTAs point to account creation and profile creation', async () => {
  const { rerender } = render(<WhyUs />);
  await act(async () => {});
  expect(screen.getByRole('link', { name: 'Stwórz swoją wizytówkę' })).toHaveAttribute('href', '/register');
  rerender(<WhyUs user={{ uid: 'owner' }} />);
  expect(screen.getByRole('link', { name: 'Stwórz swój profil' })).toHaveAttribute('href', '/stworz-profil');
  expect(screen.getByRole('link', { name: 'Najpierw zobacz profile' })).toHaveAttribute('href', '/profile');
});

test('existing profiles are sent to their plan section when tests are off', async () => {
  render(<WhyUs user={{ uid: 'owner' }} hasProfile />);
  await act(async () => {});
  const link = screen.getByRole('link', { name: 'Sprawdź dostępne plany' });
  expect(link).toHaveAttribute('href', '/profil');
  expect(link).toHaveAttribute('data-scroll-to', 'billingSection');
  expect(screen.queryByText(/Na czas testów: 0 zł/)).not.toBeInTheDocument();
});

test('free Premium is advertised only after the server confirms test mode and responds to changes', async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ betaPremiumEnabled: true }) });
  render(<WhyUs user={{ uid: 'owner' }} hasProfile />);
  await screen.findByText('Na czas testów: 0 zł.');
  expect(screen.getByText(/Bez karty i bez automatycznego uruchamiania płatnej subskrypcji/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Dopracuj swój profil' })).toHaveAttribute('data-scroll-to', 'appearanceSection');
  act(() => window.dispatchEvent(new Event('showly:beta-premium-changed')));
  await waitFor(() => expect(screen.queryByText('Na czas testów: 0 zł.')).not.toBeInTheDocument());
  expect(screen.getByRole('link', { name: 'Sprawdź dostępne plany' })).toHaveAttribute('data-scroll-to', 'billingSection');
});

test('failed status requests do not claim free Premium', async () => {
  global.fetch.mockRejectedValue(new Error('network'));
  render(<WhyUs />);
  await act(async () => {});
  expect(screen.queryByText('Na czas testów: 0 zł.')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Stwórz swoją wizytówkę' })).toHaveAttribute('href', '/register');
});

test('a late outdated test-mode response cannot restore the free Premium offer', async () => {
  let resolveOldRequest;
  global.fetch.mockReturnValueOnce(new Promise(resolve => { resolveOldRequest = resolve; }));
  render(<WhyUs />);
  act(() => window.dispatchEvent(new Event('showly:beta-premium-changed')));
  await act(async () => {});
  await act(async () => resolveOldRequest({ ok: true, json: async () => ({ betaPremiumEnabled: true }) }));
  expect(screen.queryByText('Na czas testów: 0 zł.')).not.toBeInTheDocument();
});

test('possibility tabs switch concrete examples and support keyboard navigation', async () => {
  render(<WhyUs />);
  await act(async () => {});
  const tabs = screen.getAllByRole('tab');
  const panel = screen.getByRole('tabpanel');
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  expect(within(panel).getByText('Niech Twoje prace mówią za Ciebie.')).toBeInTheDocument();
  fireEvent.click(tabs[1]);
  expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  expect(panel).toHaveAttribute('aria-labelledby', tabs[1].id);
  expect(within(panel).getByText('Dobra oferta odpowiada na pytania.')).toBeInTheDocument();
  expect(within(panel).getByText('Podaj warunki swojej usługi')).toBeInTheDocument();
  expect(within(panel).queryByText('Wybrana realizacja')).not.toBeInTheDocument();
  fireEvent.keyDown(tabs[1], { key: 'End' });
  expect(tabs[2]).toHaveFocus();
  expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
  expect(within(panel).getByText('Rezerwacje oraz lista i kalendarz terminów w odpowiednim planie.')).toBeInTheDocument();
  fireEvent.keyDown(tabs[2], { key: 'ArrowRight' });
  expect(tabs[0]).toHaveFocus();
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
  expect(tabs[2]).toHaveFocus();
  fireEvent.keyDown(tabs[2], { key: 'Home' });
  expect(tabs[0]).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Poprzednia możliwość' }));
  expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Następna możliwość' }));
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
});
