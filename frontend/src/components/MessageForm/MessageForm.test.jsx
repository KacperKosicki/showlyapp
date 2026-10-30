import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessageForm from './MessageForm';
import axios from 'axios';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('../../firebase', () => ({ auth: { currentUser: { uid: 'client', getIdToken: async () => 'test-token' } } }));
jest.mock('react-router-dom', () => ({
  useParams: () => ({ recipientId: 'provider' }),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/napisz/provider', state: null }),
}), { virtual: true });

beforeEach(() => {
  jest.clearAllMocks();
  axios.get.mockImplementation(async url => ({ data: url.includes('/check/') ? { exists: false } : { name: 'Pracownia', avatar: '/images/other/no-image.png' } }));
  axios.post.mockResolvedValue({ data: { id: 'thread' } });
});

test('message starters keep an existing draft, focus the field and do not send until submitted', async () => {
  render(<MessageForm user={{ uid: 'client', displayName: 'Kacper' }} />);
  const input = await screen.findByRole('textbox', { name: 'Twoja wiadomość' });
  fireEvent.change(input, { target: { value: 'Potrzebuję konsultacji.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Wycena usługi' }));
  expect(input).toHaveValue('Potrzebuję konsultacji.\n\nCześć! Proszę o wycenę usługi: ');
  expect(input).toHaveFocus();
  expect(axios.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Wyślij wiadomość' }));
  await waitFor(() => expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/api/conversations/send'), {
    from: 'client', to: 'provider', channel: 'account_to_profile', content: 'Potrzebuję konsultacji.\n\nCześć! Proszę o wycenę usługi:',
  }, expect.any(Object)));
});