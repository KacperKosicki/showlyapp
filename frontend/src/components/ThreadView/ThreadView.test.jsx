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
