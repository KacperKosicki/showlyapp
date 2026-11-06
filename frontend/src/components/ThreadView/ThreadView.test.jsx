import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import ThreadView from './ThreadView';

const mockNavigate = jest.fn();
jest.mock('axios', () => ({ get: jest.fn(), patch: jest.fn(), post: jest.fn() }));
jest.mock('../../firebase', () => ({ auth: { currentUser: { uid: 'owner', getIdToken: jest.fn().mockResolvedValue('token') } } }));
jest.mock('react-router-dom', () => ({
  useParams: () => ({ threadId: 'removed' }),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/konwersacja/removed', state: null }),
}), { virtual: true });

let consoleError;
beforeEach(() => {
  jest.clearAllMocks();
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => consoleError.mockRestore());

test.each([
  [410, 'announcement_deleted', 'Ogłoszenie zostało usunięte'],
  [409, 'profile_expired', 'Profil wygasł'],
  [404, undefined, 'Rozmowa nie istnieje'],
])('opening an inaccessible thread (%s) explains its state and offers a return to notifications', async (status, code, title) => {
  axios.get.mockRejectedValue({ response: { status, data: { code } } });
  render(<ThreadView user={{ uid: 'owner' }} />);
  expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Wróć do powiadomień' }));
  expect(mockNavigate).toHaveBeenCalledWith('/powiadomienia');
});

test.each(['', 'https://images.example.com/avatar.png'])('thread header and message avatars use Notifications fallback: %s', async avatar => {
  axios.get.mockImplementation(async url => {
    if (url.includes('/api/conversations/')) return { data: { channel: 'account_to_account', firstFromUid: 'anna', participants: [{ uid: 'owner', displayName: 'Ja' }, { uid: 'anna', displayName: 'Anna', avatar }], messages: [{ _id: 'm1', fromUid: 'anna', toUid: 'owner', content: 'Cześć, sprawdzam termin.', read: true, createdAt: '2026-11-06T09:00:00Z' }] } };
    return { data: null };
  });
  render(<ThreadView user={{ uid: 'owner' }} />);
  await screen.findByText('Cześć, sprawdzam termin.');
  const avatars = screen.getAllByAltText('');
  expect(avatars.length).toBeGreaterThanOrEqual(2);
  avatars.forEach(image => {
    if (avatar) fireEvent.error(image);
    expect(image).toHaveAttribute('src', '/images/other/no-image.png');
  });
});
