import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
const setup = (uid, threads, hasProfile = false) => {
  auth.currentUser.uid = uid;
  axios.get.mockImplementation(async url => {
    if (url.includes('/conversations/by-uid/')) return { data: threads };
    return { data: url.endsWith('/provider') ? { _id: 'profile', name: 'DJ Studio' } : hasProfile ? { _id: 'mine', name: 'Mój profil' } : null };
  });
  const setUnreadCount = jest.fn();
  render(<Notifications user={{ uid }} setUnreadCount={setUnreadCount} />);
  return setUnreadCount;
};
beforeEach(() => axios.get.mockReset());

test.each([
  ['account_to_profile', 'owner', 'owner', 'Ty:'],
  ['account_to_profile', 'owner', 'provider', 'DJ Studio:'],
  ['account_to_profile', 'provider', 'provider', 'Konto DJ:'],
  ['profile_to_account', 'provider', 'provider', 'DJ Studio:'],
  ['profile_to_account', 'owner', 'provider', 'Konto DJ:'],
  ['system', 'SYSTEM', 'SYSTEM', 'Showly.me:'],
])('last message identifies its sender for %s, started by %s and sent by %s', async (channel, firstFromUid, fromUid, label) => {
  setup('owner', [{ ...announcementThread, channel, firstFromUid,
    lastMessage: { ...announcementThread.lastMessage, fromUid },
  }], true);
  expect(await screen.findByText(label)).toBeInTheDocument();
  const preview = screen.getByText('Chętnie poprowadzę Wasze wydarzenie.');
  expect(preview).toHaveTextContent(`${label} Chętnie poprowadzę Wasze wydarzenie.`);
});

test('an author without a provider profile sees announcement conversations and their unread count', async () => {
  const setUnreadCount = setup('owner', [announcementThread]);
  const group = await screen.findByRole('group', { name: 'Rozmowy z ogłoszeń' });
  expect(within(group).getByText('Szukam DJ-a na wesele')).toBeInTheDocument();
  expect(await within(group).findByText('DJ Studio')).toBeInTheDocument();
  expect(within(group).getByText(/Twoje ogłoszenie · zgłoszenie od/)).toBeInTheDocument();
  expect(within(group).getByRole('link')).toHaveAttribute('href', '/konwersacja/application-thread');
  expect(setUnreadCount).toHaveBeenLastCalledWith(2);
  expect(within(screen.getByRole('group', { name: 'Twoja skrzynka w liczbach' })).getAllByText('2')).toHaveLength(1);
  expect(screen.getByText('Nie masz jeszcze utworzonego profilu')).toBeInTheDocument();
});

test('a stale deleted-announcement entry cannot open the removed conversation', async () => {
  setup('provider', [{ ...announcementThread, withUid: 'owner', withDisplayName: 'Anna', announcement: { ...announcementThread.announcement, deleted: true } }]);
  const group = await screen.findByRole('group', { name: 'Rozmowy z ogłoszeń' });
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
  const group = await screen.findByRole('group', { name: 'Rozmowy z innymi profilami' });
  expect(within(group).getByText(title)).toBeInTheDocument();
  expect(within(group).queryByRole('link')).not.toBeInTheDocument();
});

test('profile enquiries remain separate and the announcements section has its own empty state', async () => {
  setup('owner', [{ ...announcementThread, _id: 'profile-thread', channel: 'account_to_profile', firstFromUid: 'owner' }]);
  const announcements = await screen.findByRole('group', { name: 'Rozmowy z ogłoszeń' });
  expect(within(announcements).getByText('Brak rozmów z ogłoszeń')).toBeInTheDocument();
  expect(within(announcements).getByRole('link', { name: 'Poznaj profile Showly' })).toHaveAttribute('href', '/profile');
  expect(within(screen.getByRole('group', { name: 'Rozmowy z innymi profilami' })).getByRole('link')).toHaveAttribute('href', '/konwersacja/profile-thread');
});

test('avatars follow account/profile roles in direct and announcement conversations and recover from broken images', async () => {
  auth.currentUser.uid = 'owner';
  const base = { ...announcementThread, withDisplayName: 'Konto usługodawcy', withAvatar: 'https://images.example.com/account.jpg', announcement: null };
  const threads = [
    { ...base, _id: 'incoming', channel: 'account_to_profile', firstFromUid: 'provider' },
    { ...base, _id: 'outgoing', channel: 'account_to_profile', firstFromUid: 'owner' },
    { ...base, _id: 'application-incoming', channel: 'profile_to_account', announcement: announcementThread.announcement },
    { ...base, _id: 'application-sent', channel: 'profile_to_account', firstFromUid: 'owner', withUid: 'listing-owner', withAvatar: 'https://images.example.com/listing-owner.jpg', announcement: announcementThread.announcement },
  ];
  axios.get.mockImplementation(async url => ({ data:
    url.includes('/conversations/by-uid/') ? threads :
    url.endsWith('/owner') ? { _id: 'mine', name: 'Moje studio' } :
    url.endsWith('/provider') ? { _id: 'profile', name: 'DJ Studio', avatar: { url: 'https://images.example.com/profile.jpg' } } : null,
  }));
  render(<Notifications user={{ uid: 'owner' }} />);
  const inbox = await screen.findByRole('group', { name: /Wiadomości do profilu/ });
  expect(within(inbox).getByAltText('')).toHaveAttribute('src', 'https://images.example.com/account.jpg');
  expect(within(inbox).getByText('Konto usługodawcy')).toBeInTheDocument();
  const outbox = screen.getByRole('group', { name: 'Rozmowy z innymi profilami' });
  await waitFor(() => expect(within(outbox).getByAltText('')).toHaveAttribute('src', 'https://images.example.com/profile.jpg'));
  const announcements = screen.getByRole('group', { name: 'Rozmowy z ogłoszeń' });
  expect(within(announcements).getAllByAltText('').map(img => img.getAttribute('src'))).toEqual(['https://images.example.com/profile.jpg', 'https://images.example.com/listing-owner.jpg']);
  expect(axios.get.mock.calls.filter(([url]) => url.endsWith('/profiles/by-user/provider'))).toHaveLength(1);
  expect(axios.get).not.toHaveBeenCalledWith(expect.stringContaining('/profiles/by-user/listing-owner'));
  const image = within(outbox).getByAltText('');
  fireEvent.error(image);
  expect(image).toHaveAttribute('src', '/images/other/no-image.png');
  fireEvent.error(image);
  expect(image).toHaveAttribute('src', '/images/other/no-image.png');
});

test.each([null, { _id: 'profile', name: 'DJ Studio', avatar: { url: '' } }])('missing profile photos use no-image instead of the account avatar or an endless skeleton: %p', async profile => {
  auth.currentUser.uid = 'owner';
  axios.get.mockImplementation(async url => ({ data: url.includes('/conversations/by-uid/') ? [{ ...announcementThread, _id: 'outgoing', channel: 'account_to_profile', firstFromUid: 'owner', withAvatar: 'https://images.example.com/account.jpg', announcement: null }] : url.endsWith('/provider') ? profile : null }));
  render(<Notifications user={{ uid: 'owner' }} />);
  const outbox = await screen.findByRole('group', { name: 'Rozmowy z innymi profilami' });
  expect(within(outbox).getByAltText('')).toHaveAttribute('src', '/images/other/no-image.png');
  expect(within(outbox).getByRole('link')).toHaveAttribute('href', '/konwersacja/outgoing');
});

test('category, unread and search filters compose without marking messages read and can be cleared', async () => {
  const setUnreadCount = setup('owner', [announcementThread, { ...announcementThread, _id: 'profile-thread', channel: 'account_to_profile', firstFromUid: 'owner', unreadCount: 0, announcement: null }]);
  const nav = await screen.findByRole('navigation', { name: 'Rodzaj rozmów' });
  await screen.findAllByText('DJ Studio');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Tylko nieprzeczytane' }));
  expect(screen.queryByRole('group', { name: 'Rozmowy z innymi profilami' })).not.toBeInTheDocument();
  fireEvent.click(within(nav).getByRole('button', { name: /Z profilami/ }));
  expect(screen.getByText('Nie znaleźliśmy rozmów')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Tylko nieprzeczytane' }));
  expect(screen.getByRole('link')).toHaveAttribute('href', '/konwersacja/profile-thread');
  fireEvent.change(screen.getByRole('searchbox', { name: 'Szukaj rozmowy' }), { target: { value: 'nieistniejąca rozmowa' } });
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Pokaż wszystkie rozmowy' }));
  expect(screen.getAllByRole('link').filter(link => link.getAttribute('href').startsWith('/konwersacja/'))).toHaveLength(2);
  expect(screen.getByRole('searchbox')).toHaveValue('');
  expect(setUnreadCount).toHaveBeenLastCalledWith(2);
});
test('empty conversations share a discovery link to the profile search', async () => {
  setup('owner', []);
  const outbox = await screen.findByRole('group', { name: 'Rozmowy z innymi profilami' });
  expect(within(outbox).getByRole('heading', { name: 'Brak rozmów z innymi profilami' })).toBeInTheDocument();
  expect(within(outbox).getByRole('link', { name: 'Poznaj profile Showly' })).toHaveAttribute('href', '/profile');
});
