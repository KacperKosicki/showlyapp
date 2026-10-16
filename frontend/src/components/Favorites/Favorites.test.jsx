import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axios from 'axios';
import { auth } from '../../firebase';
import Favorites from './Favorites';
import { api } from '../../api/api';
import { filterFavorites, normalizeFavoriteProfile } from './favoriteProfiles';
jest.mock('../../api/api', () => ({ api: { get: jest.fn() } }));
jest.mock('axios', () => ({ post: jest.fn(), patch: jest.fn() }));
jest.mock('../../firebase', () => ({ auth: { currentUser: { uid: 'owner', getIdToken: jest.fn() } } }));
jest.mock('react-router-dom', () => ({ useLocation: () => ({ state: null }), useNavigate: () => jest.fn(), Link: ({ children, to, state, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
const profiles = [
  { userId: 'a', name: 'Anna Nowak', role: 'Fotografia', location: 'Poznań', slug: 'anna', rating: 4.5, reviews: 2, availabilityStatus: { state: 'open' } },
  { userId: 'b', name: 'Bartek Kowalski', role: 'Trener', location: 'Łódź', slug: 'bartek', rating: 5, reviews: 4, availabilityStatus: { state: 'unavailable' } },
];
beforeEach(() => { jest.clearAllMocks(); api.get.mockResolvedValue({ data: profiles }); axios.patch.mockResolvedValue({ data: { visits: 1 } }); auth.currentUser.getIdToken.mockResolvedValue('test-token'); });
test('search, availability filter and layout switch work on saved profiles', async () => {
  render(<Favorites currentUser={{ uid: 'owner' }} />);
  await screen.findByRole('heading', { name: 'Anna Nowak' });
  expect(screen.getByRole('list').dataset.layout).toBe('grid');
  fireEvent.click(screen.getByRole('button', { name: 'Widok listy' }));
  expect(screen.getByRole('list').dataset.layout).toBe('list');
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'lodz' } });
  expect(screen.queryByRole('heading', { name: 'Anna Nowak' })).toBeNull();
  expect(screen.getByRole('heading', { name: 'Bartek Kowalski' })).toBeTruthy();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: /Przyjmują zlecenia/ }));
  expect(screen.queryByRole('heading', { name: 'Bartek Kowalski' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Widok kart' }));
  expect(screen.getByRole('list').dataset.layout).toBe('grid');
  expect(screen.getByRole('button', { name: 'Zadaj pytanie' })).toBeTruthy();
});
test('removal disables repeated requests and updates the displayed list after confirmation', async () => {
  let resolve;
  axios.post.mockReturnValue(new Promise(done => { resolve = done; }));
  render(<Favorites currentUser={{ uid: 'owner' }} />);
  const heading = await screen.findByRole('heading', { name: 'Anna Nowak' });
  const button = within(heading.closest('article')).getByRole('button', { name: 'Usuń profil z ulubionych' });
  fireEvent.click(button); fireEvent.click(button);
  await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
  expect(button.disabled).toBe(true);
  await act(async () => resolve({ data: { isFav: false, count: 0 } }));
  expect(screen.queryByRole('heading', { name: 'Anna Nowak' })).toBeNull();
  const alert = screen.getByRole('alert');
  expect(within(alert).getByText('Profil został usunięty z ulubionych.')).toBeTruthy();
  expect(alert.closest('#scrollToId')).toBeNull();
  fireEvent.click(within(alert).getByRole('button', { name: 'Zamknij komunikat' }));
  expect(screen.queryByRole('alert')).toBeNull();
});
test('failed removal keeps the saved profile', async () => {
  axios.post.mockRejectedValue(new Error('network'));
  render(<Favorites currentUser={{ uid: 'owner' }} />);
  const heading = await screen.findByRole('heading', { name: 'Anna Nowak' });
  fireEvent.click(within(heading.closest('article')).getByRole('button', { name: 'Usuń profil z ulubionych' }));
  expect(within(await screen.findByRole('alert')).getByText('Nie udało się zaktualizować ulubionych.')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Anna Nowak' })).toBeTruthy();
  expect(within(heading.closest('article')).getByRole('button', { name: 'Usuń profil z ulubionych' }).disabled).toBe(false);
});
test('load errors can be retried and guests do not fetch private favorites', async () => {
  api.get.mockRejectedValueOnce(new Error('network'));
  const { unmount } = render(<Favorites currentUser={{ uid: 'owner' }} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Wczytaj ponownie' }));
  await screen.findByRole('heading', { name: 'Anna Nowak' });
  unmount(); api.get.mockClear();
  render(<Favorites />);
  await screen.findByRole('link', { name: 'Przejdź do logowania' });
  expect(api.get).not.toHaveBeenCalled();
});
test('loading uses the shared loader and empty searches can be cleared', async () => {
  api.get.mockReturnValueOnce(new Promise(() => {}));
  const { unmount } = render(<Favorites currentUser={{ uid: 'owner' }} />);
  expect(screen.getByText('Ładujemy ulubione profile…')).toBeTruthy(); unmount();
  render(<Favorites currentUser={{ uid: 'owner' }} />);
  await screen.findByRole('heading', { name: 'Anna Nowak' });
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'none' } });
  fireEvent.click(screen.getByRole('button', { name: 'Wyczyść filtry' }));
  await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
});
test('legacy shapes normalize and sorting does not mutate the saved order', () => {
  expect(normalizeFavoriteProfile({ profileData: { userId: 'a', theme: '{"primary":"#123456"}' } }).theme.primary).toBe('#123456');
  expect(filterFavorites(profiles, { sort: 'rating' })[0].userId).toBe('b');
  expect(profiles[0].userId).toBe('a');
  expect(filterFavorites([{ ...profiles[0], availabilityStatus: { state: 'open', until: '2020-01-01' } }], { filter: 'available' })).toHaveLength(0);
  expect(filterFavorites([{ ...profiles[0], services: [{ name: 'Sesja portretowa', isActive: true }] }], { query: 'portretowa' })).toHaveLength(1);
});
test('profile links count visits and disabled bookings have no reservation action', async () => {
  api.get.mockResolvedValue({ data: [{ ...profiles[0], bookingMode: 'off' }, { ...profiles[1], bookingMode: 'request-open' }] });
  render(<Favorites currentUser={{ uid: 'owner' }} />);
  const anna = (await screen.findByRole('heading', { name: 'Anna Nowak' })).closest('article');
  const bartek = screen.getByRole('heading', { name: 'Bartek Kowalski' }).closest('article');
  fireEvent.click(within(anna).getByRole('button', { name: 'Zobacz profil' }));
  await waitFor(() => expect(axios.patch).toHaveBeenCalledWith(expect.stringContaining('/api/profiles/a/visit'), null, expect.any(Object)));
  expect(within(anna).queryByRole('button', { name: 'Wyślij zapytanie' })).toBeNull();
  expect(within(bartek).getByRole('button', { name: 'Wyślij zapytanie' })).toBeTruthy();
});

test('removing the final saved profile keeps its AlertBox visible over the empty collection', async () => {
  api.get.mockResolvedValue({ data: [profiles[0]] });
  axios.post.mockResolvedValue({ data: { isFav: false, count: 0 } });
  render(<Favorites currentUser={{ uid: 'owner' }} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Usuń profil z ulubionych' }));
  await screen.findByRole('heading', { name: 'Tu zaczyna się Twoja lista.' });
  expect(within(screen.getByRole('alert')).getByText('Profil został usunięty z ulubionych.')).toBeTruthy();
});
