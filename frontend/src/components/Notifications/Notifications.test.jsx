import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { auth } from '../../firebase';
import Notifications from './Notifications';

jest.mock('axios', () => ({ get: jest.fn() }));
jest.mock('../../firebase', () => ({ auth: { currentUser: { uid: 'owner', getIdToken: jest.fn().mockResolvedValue('token') } } }));
jest.mock('react-router-dom', () => ({
  Link: ({ to, state, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({ pathname: '/powiadomienia', state: null }),
}), { virtual: true });

const announcementThread = {
  _id: 'application-thread', channel: 'profile_to_account', firstFromUid: 'provider',
  withUid: 'provider', withDisplayName: 'Konto DJ', unreadCount: 2,
  announcement: { id: 'listing', title: 'Szukam DJ-a na wesele', deleted: false },
  lastMessage: { content: 'Chętnie poprowadzę Wasze wydarzenie.', createdAt: '2026-10-08T12:00:00Z' },
};
const setup = (uid, threads) => {
  auth.currentUser.uid = uid;
  axios.get.mockImplementation(async url => {
    if (url.includes('/conversations/by-uid/')) return { data: threads };
    return { data: url.endsWith('/provider') ? { _id: 'profile', name: 'DJ Studio' } : null };
  });
  const setUnreadCount = jest.fn();
  render(<Notifications user={{ uid }} setUnreadCount={setUnreadCount} />);
  return setUnreadCount;
};
beforeEach(() => axios.get.mockReset());

test('an author without a provider profile sees announcement conversations and their unread count', async () => {
  const setUnreadCount = setup('owner', [announcementThread]);
  const group = await screen.findByRole('group', { name: '04 / Rozmowy z ogłoszeń' });
  expect(within(group).getByText('Szukam DJ-a na wesele')).toBeInTheDocument();
  expect(await within(group).findByText('DJ Studio')).toBeInTheDocument();
  expect(within(group).getByText(/Twoje ogłoszenie · zgłoszenie od/)).toBeInTheDocument();
  expect(within(group).getByRole('link')).toHaveAttribute('href', '/konwersacja/application-thread');
  expect(setUnreadCount).toHaveBeenLastCalledWith(2);
  expect(within(screen.getByRole('group', { name: '01 / Twoja skrzynka w liczbach' })).getAllByText('2')).toHaveLength(1);
  expect(screen.getByText('Nie masz jeszcze utworzonego profilu')).toBeInTheDocument();
});

test('a stale deleted-announcement entry cannot open the removed conversation', async () => {
  setup('provider', [{ ...announcementThread, withUid: 'owner', withDisplayName: 'Anna', announcement: { ...announcementThread.announcement, deleted: true } }]);
  const group = await screen.findByRole('group', { name: '04 / Rozmowy z ogłoszeń' });
  expect(within(group).getByText(/Twoje zgłoszenie · rozmowa z/)).toBeInTheDocument();
  expect(within(group).getByText('Anna')).toBeInTheDocument();
  expect(within(group).getByText('Ogłoszenie · usunięte')).toBeInTheDocument();
  expect(within(group).queryByRole('link')).not.toBeInTheDocument();
  expect(within(group).getByText('Rozmowa niedostępna')).toBeInTheDocument();
});

test.each([
  ['profile_expired', 'Profil wygasł'], ['profile_missing', 'Profil został usunięty'],
  ['account_disabled', 'Konto jest zablokowane'], ['account_missing', 'Konto zostało usunięte'],
])('unavailable outgoing threads show %s and do not link to the conversation', async (reason, title) => {
  setup('owner', [{ ...announcementThread, _id: 'enquiry', channel: 'account_to_profile', firstFromUid: 'owner',
    announcement: null, availability: { canOpen: false, reason } }]);
  const group = await screen.findByRole('group', { name: '03 / Rozmowy z innymi profilami' });
  expect(within(group).getByText(title)).toBeInTheDocument();
  expect(within(group).queryByRole('link')).not.toBeInTheDocument();
});

test('profile enquiries remain separate and the announcements section has its own empty state', async () => {
  setup('owner', [{ ...announcementThread, _id: 'profile-thread', channel: 'account_to_profile', firstFromUid: 'owner' }]);
  const announcements = await screen.findByRole('group', { name: '04 / Rozmowy z ogłoszeń' });
  expect(within(announcements).getByText('Brak rozmów z ogłoszeń')).toBeInTheDocument();
  expect(within(announcements).queryByRole('link')).not.toBeInTheDocument();
  expect(within(screen.getByRole('group', { name: '03 / Rozmowy z innymi profilami' })).getByRole('link')).toHaveAttribute('href', '/konwersacja/profile-thread');
});
