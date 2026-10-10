import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BetaPremiumControl from './BetaPremiumControl';
import { adminApi } from '../../api/adminApi';
jest.mock('../../api/adminApi', () => ({ adminApi: { betaPremium: jest.fn(), setBetaPremium: jest.fn() } }));

beforeEach(() => { adminApi.betaPremium.mockResolvedValue({ data: { enabled: false } }); });
test('enables free Premium and confirms before ending it', async () => {
  adminApi.setBetaPremium.mockImplementation(enabled => Promise.resolve({ data: { enabled } }));
  render(<BetaPremiumControl />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Włącz testowe Premium' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Włącz testowe Premium' }));
  await screen.findByText('Włączone · bezpłatne Premium');
  expect(adminApi.setBetaPremium).toHaveBeenCalledWith(true);
  fireEvent.click(screen.getByRole('button', { name: 'Wyłącz testowe Premium' }));
  expect(adminApi.setBetaPremium).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Zakończ testowe Premium' }));
  await screen.findByText('Wyłączone · standardowe plany');
  expect(adminApi.setBetaPremium).toHaveBeenLastCalledWith(false);
});
test('a failed save does not pretend Premium was enabled', async () => {
  adminApi.setBetaPremium.mockRejectedValue(new Error('offline'));
  render(<BetaPremiumControl />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Włącz testowe Premium' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Włącz testowe Premium' }));
  await screen.findByRole('alert');
  expect(screen.getByText('Wyłączone · standardowe plany')).toBeInTheDocument();
});

test('does not keep announcing loading after a failed settings request', async () => {
  adminApi.betaPremium.mockRejectedValueOnce(new Error('offline'));
  render(<BetaPremiumControl />);
  await screen.findByRole('alert');
  expect(screen.queryByText('Ładujemy ustawienia testów…')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Włącz testowe Premium' })).toBeDisabled();
});
