import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Pricing from './Pricing';

jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

test('choosing a need updates the preview and matching card without changing prices', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ betaPremiumEnabled: true }) });
  render(<Pricing />);
  await screen.findByRole('heading', { name: 'Premium dla każdego. Za 0 zł.' });
  const premium = screen.getByRole('button', { name: 'Przyjmować rezerwacje' });
  fireEvent.click(premium);
  expect(premium).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('article', { name: 'Premium' })).toHaveAttribute('data-preview', 'selected');
  expect(screen.getByText('15 zdjęć')).toBeInTheDocument();
  expect(screen.getByText('59,99')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Pokazać ofertę' }));
  expect(premium).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('article', { name: 'Starter' })).toHaveAttribute('data-preview', 'selected');
  expect(screen.getByText('3 zdjęcia')).toBeInTheDocument();
});

test('active beta clearly separates free Premium from regular prices without checkout', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ betaPremiumEnabled: true }) });
  render(<Pricing />);
  expect(await screen.findByRole('heading', { name: 'Premium dla każdego. Za 0 zł.' })).toBeInTheDocument();
  expect(screen.getByText(/Po testach wraca dotychczasowy plan/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Korzystaj z testowego Premium' })).toHaveAttribute('href', '/register');
  const table = screen.getByRole('table');
  expect(within(table).getByRole('row', { name: 'Zdjęcia profilu 3 6 15' })).toBeInTheDocument();
  expect(within(table).getByRole('row', { name: 'Rezerwacje i kalendarz dostępności Nie Nie Tak' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /kup|zapłać/i })).not.toBeInTheDocument();
});

test('unavailable platform status does not promise a free plan and keeps pricing readable', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('Offline'));
  render(<Pricing user={{ uid: 'owner' }} hasProfile />);
  expect(await screen.findByText(/Nie udało się potwierdzić statusu bezpłatnych testów/)).toBeInTheDocument();
  expect(screen.queryByText('Premium dla każdego. Za 0 zł.')).not.toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'Przejdź do swojego profilu' })[0]).toHaveAttribute('href', '/profil');
  expect(screen.getByText('29,99')).toBeInTheDocument();
  expect(screen.getByText('59,99')).toBeInTheDocument();
});

test('beta updates when platform settings change and logged-in users can create a profile', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ betaPremiumEnabled: true }) }).mockResolvedValue({ ok: true, json: async () => ({ betaPremiumEnabled: false }) });
  render(<Pricing user={{ uid: 'new-user' }} />);
  expect(await screen.findByRole('link', { name: 'Korzystaj z testowego Premium' })).toHaveAttribute('href', '/stworz-profil');
  window.dispatchEvent(new Event('showly:beta-premium-changed'));
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Premium dla każdego. Za 0 zł.' })).not.toBeInTheDocument());
});
