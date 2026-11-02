import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { adminApi } from '../../api/adminApi';
import AdminAchievements from './AdminAchievements';

jest.mock('../../api/adminApi', () => ({ adminApi: { achievements: jest.fn() } }));

test('retries a failed request and groups the server catalog by rarity', async () => {
  adminApi.achievements
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValueOnce({
      data: {
        badges: [
          { id: 'first-profile', tier: 'common', title: 'Pierwszy krok', description: 'Utwórz wizytówkę.' },
          { id: 'profile-365-days', tier: 'exclusive', title: 'Weteran Showly', description: 'Miej wizytówkę od 365 dni.' },
        ],
        maxFeatured: 3,
        rules: ['Showly przyznaje odznaki automatycznie.'],
      },
    });
  render(<AdminAchievements />);
  fireEvent.click(await screen.findByRole('button', { name: 'Spróbuj ponownie' }));

  const exclusive = await screen.findByRole('region', { name: 'Ekskluzywne' });
  expect(within(exclusive).getByText('Weteran Showly')).toBeInTheDocument();
  expect(within(exclusive).getByText('Miej wizytówkę od 365 dni.')).toBeInTheDocument();
  expect(within(exclusive).getByText('profile-365-days')).toBeInTheDocument();
  expect(screen.getByText(/do 3 odznak/)).toBeInTheDocument();
});
