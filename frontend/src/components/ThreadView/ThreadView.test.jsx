import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

const mockChat = ({ outgoing = false, withFaq = false } = {}) => {
  axios.get.mockImplementation(async url => {
    if (url.includes('/api/conversations/')) return { data: {
      channel: withFaq ? 'account_to_profile' : 'account_to_account',
      firstFromUid: withFaq ? 'owner' : 'anna',
      participants: [{ uid: 'owner', displayName: 'Ja' }, { uid: 'anna', displayName: 'Anna' }],
      messages: [{ _id: 'm1', fromUid: outgoing ? 'owner' : 'anna', toUid: outgoing ? 'anna' : 'owner', content: 'Dzień dobry!', read: true, createdAt: '2026-11-06T09:00:00Z' }],
    } };
    return { data: { name: 'Anna', quickAnswers: [{ title: 'Jak się przygotować?', answer: 'Przyjdź 5 minut wcześniej.' }] } };
  });
};

test('FAQ answers are collapsed until opened and a reply sends the entered content', async () => {
  mockChat({ withFaq: true });
  axios.post.mockResolvedValue({ data: {} });
  render(<ThreadView user={{ uid: 'owner' }} />);
  const question = await screen.findByText('Jak się przygotować?');
  const details = question.closest('details');
  expect(details).not.toHaveAttribute('open');
  fireEvent.click(question);
  expect(details).toHaveAttribute('open');
  expect(screen.getByText('Przyjdź 5 minut wcześniej.')).toBeVisible();
  const send = screen.getByRole('button', { name: 'Wyślij' });
  expect(send).toBeDisabled();
  fireEvent.change(screen.getByRole('textbox', { name: 'Treść wiadomości' }), { target: { value: 'Dziękuję, do zobaczenia!' } });
  fireEvent.click(send);
  await waitFor(() => expect(axios.post).toHaveBeenCalledWith(
    expect.stringContaining('/api/conversations/send'),
    expect.objectContaining({ content: 'Dziękuję, do zobaczenia!', to: 'anna', conversationId: 'removed' }),
    expect.any(Object),
  ));
  expect(screen.queryByText('01 / Historia rozmowy')).not.toBeInTheDocument();
  expect(screen.queryByText('Piszesz jako konto')).not.toBeInTheDocument();
});

test('a sent message keeps the reply restriction visible without displaying a composer', async () => {
  mockChat({ outgoing: true });
  render(<ThreadView user={{ uid: 'owner' }} />);
  expect(await screen.findByText(/Kolejną możesz napisać po odpowiedzi drugiej osoby/)).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
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
