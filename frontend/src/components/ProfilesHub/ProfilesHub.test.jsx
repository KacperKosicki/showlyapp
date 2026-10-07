import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfilesHub from './ProfilesHub';
let mockInitialQuery = '';
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/profile' }),
  useSearchParams: () => {
    const [params, setParams] = require('react').useState(() => new URLSearchParams(mockInitialQuery));
    return [params, update => setParams(previous => typeof update === 'function' ? update(previous) : update)];
  },
}), { virtual: true });
beforeEach(() => { mockInitialQuery = ''; });
jest.mock('../UserCard/UserCard', () => ({ user }) => <article>{user.name}</article>);
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
const data = Array.from({ length: 15 }, (_, i) => ({ _id: String(i), name: 'Osoba ' + i, location: i === 0 ? 'Łódź' : 'Poznań', category: 'Fotografia', visits: 15 - i, services: [{ name: 'Portrety' }] }));
test('loads results in batches, filters by city and restores results after removing a chip', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => data });
  render(<ProfilesHub />);
  expect(await screen.findByText('Osoba 0')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(12);
  fireEvent.click(screen.getByRole('button', { name: /Odkryj kolejne/ }));
  expect(screen.getAllByRole('listitem')).toHaveLength(15);
  fireEvent.change(screen.getByLabelText('Gdzie?'), { target: { value: 'lodz' } });
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Usuń filtr: Miejsce: lodz' }));
  expect(screen.getAllByRole('listitem')).toHaveLength(12);
});
test('offers a retry after HTTP failure instead of an empty search state', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValue({ ok: true, json: async () => data });
  render(<ProfilesHub />);
  fireEvent.click(await screen.findByRole('button', { name: 'Wczytaj ponownie' }));
  await waitFor(() => expect(screen.getByText('Osoba 0')).toBeInTheDocument());
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('reads the search phrase from the URL and allows changing or clearing it', async () => {
  mockInitialQuery = 'q=Osoba%200';
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => data });
  render(<ProfilesHub />);
  expect(await screen.findByText('Osoba 0')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  const input = screen.getByLabelText('Co lub kogo szukasz?');
  expect(input).toHaveValue('Osoba 0');
  fireEvent.change(input, { target: { value: 'Osoba 14' } });
  expect(screen.getByText('Osoba 14')).toBeInTheDocument();
  expect(screen.queryByText('Osoba 0')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Usuń filtr: Szukasz: Osoba 14' }));
  expect(input).toHaveValue('');
  expect(screen.getAllByRole('listitem')).toHaveLength(12);
});
