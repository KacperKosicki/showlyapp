import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { api } from '../../api/api';
import AchievementShowcase from './AchievementShowcase';

jest.mock('../../api/api', () => ({ api: { get: jest.fn(), patch: jest.fn() } }));

const first = { id: 'first-profile', tier: 'common', title: 'Pierwszy krok', description: 'Utwórz wizytówkę.', earned: true };
const locked = { id: 'ten-bookings', tier: 'exclusive', title: 'Mistrz kalendarza', description: 'Zaakceptuj dziesięć rezerwacji.', earned: false };
const state = { badges: [first, locked], featured: [], maxFeatured: 3 };

test('only earned badges can be shown and a rejected save leaves the showcase unchanged', async () => {
  api.get.mockResolvedValue({ data: state });
  api.patch
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValueOnce({ data: { ...state, featured: [first.id] } })
    .mockResolvedValueOnce({ data: state });

  const { rerender } = render(<AchievementShowcase />);
  expect(await screen.findByText(first.title)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Pokaż odznakę Pierwszy krok' })).not.toBeInTheDocument();
  rerender(<AchievementShowcase isEditing />);
  const show = await screen.findByRole('button', { name: 'Pokaż odznakę Pierwszy krok' });
  expect(screen.queryByRole('button', { name: /Mistrz kalendarza/ })).not.toBeInTheDocument();

  fireEvent.click(show);
  expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się zapisać gabloty');
  expect(show).toBeEnabled();

  fireEvent.click(show);
  expect(api.patch).toHaveBeenCalledWith('/api/profiles/achievements/me', { featured: [first.id] });
  fireEvent.click(await screen.findByRole('button', { name: 'Ukryj odznakę Pierwszy krok' }));
  await waitFor(() => expect(api.patch).toHaveBeenLastCalledWith('/api/profiles/achievements/me', { featured: [] }));
  expect(await screen.findByRole('button', { name: 'Pokaż odznakę Pierwszy krok' })).toBeEnabled();
});
