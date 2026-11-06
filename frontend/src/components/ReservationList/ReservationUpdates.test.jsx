import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReservationList from './ReservationList';
import { api } from '../../api/api';
jest.mock('../../api/api', () => ({ api: { get: jest.fn(), patch: jest.fn() } }));
jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '/rezerwacje', state: null }), Link: ({ to, state, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
jest.mock('./ReservationCalendar', () => () => null);
test('confirmation stays unread on entry and acknowledging it preserves the active booking', async () => {
  const reservation = { _id: 'r1', userId: 'client', providerUserId: 'provider', providerName: 'Salon', status: 'zaakceptowana', date: '2027-01-01', fromTime: '10:00', toTime: '11:00', clientSeen: false, clientUpdateType: 'accepted', updatedAt: '2026-10-21T10:00:00Z' };
  api.get.mockImplementation(async url => ({ data: url.includes('by-user/') ? [reservation] : url.includes('by-provider/') ? [] : null }));
  api.patch.mockResolvedValue({ data: {} });
  render(<ReservationList user={{ uid: 'client' }} />);
  const read = await screen.findByRole('button', { name: 'Oznacz jako przeczytane' });
  expect(api.patch).not.toHaveBeenCalled();
  expect(screen.getByText('Rezerwacja została potwierdzona.')).toBeInTheDocument();
  fireEvent.click(read);
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Oznacz jako przeczytane' })).not.toBeInTheDocument());
  expect(api.patch).toHaveBeenCalledWith('/api/reservations/r1/seen', { who: 'client', viewedUpdatedAt: reservation.updatedAt });
  expect(screen.getByRole('button', { name: /Anuluj z powodem/ })).toBeInTheDocument();
});

test('status filters show matching bookings and allow returning to all reservations', async () => {
  const base = { userId: 'client', providerUserId: 'provider', date: '2027-01-01', fromTime: '10:00', toTime: '11:00', clientSeen: true };
  const reservations = [
    { ...base, _id: 'confirmed', providerProfileName: 'Salon A', status: 'zaakceptowana' },
    { ...base, _id: 'pending', providerProfileName: 'Salon B', status: 'oczekująca', clientSeen: false, clientUpdateType: 'provider_note' },
    { ...base, _id: 'cancelled', providerProfileName: 'Salon C', status: 'anulowana' },
  ];
  api.get.mockImplementation(async url => ({ data: url.includes('by-user/') ? reservations : url.includes('by-provider/') ? [] : null }));
  render(<ReservationList user={{ uid: 'client' }} />);
  const confirmed = await screen.findByRole('button', { name: /Potwierdzone 1/ });
  fireEvent.click(confirmed);
  expect(confirmed).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText(/Salon A/)).toBeInTheDocument();
  expect(screen.queryByText(/Salon B/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Salon C/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Nowe zmiany 1/ }));
  expect(screen.getByText(/Salon B/)).toBeInTheDocument();
  expect(screen.queryByText(/Salon A/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Wszystkie 3/ }));
  expect(screen.getByText(/Salon A/)).toBeInTheDocument();
  expect(screen.getByText(/Salon C/)).toBeInTheDocument();
});
test('received reservations use the account avatar, share the account lookup and fall back on image error', async () => {
  const booking = { userId: 'anna', userName: 'Anna', providerUserId: 'owner', status: 'oczekująca', date: '2027-01-01', fromTime: '10:00', toTime: '11:00', providerSeen: true };
  const received = [
    { ...booking, _id: 'one' },
    { ...booking, _id: 'two' },
    { ...booking, _id: 'offline', userId: 'offline-client', offline: true, offlineClientName: 'Klient telefoniczny' },
  ];
  api.get.mockImplementation(async url => ({ data:
    url.includes('/meta/') ? { providerProfileId: 'profile', bookingMode: 'request-open' } :
    url.includes('/by-provider/') ? received :
    url === '/api/users/public/anna' ? { displayName: 'Anna', avatar: 'https://images.example.com/anna.jpg' } : [],
  }));
  render(<ReservationList user={{ uid: 'owner' }} />);
  await waitFor(() => expect(screen.getAllByAltText('')).toHaveLength(2));
  const avatars = screen.getAllByAltText('');
  expect(avatars).toHaveLength(2);
  expect(avatars[0]).toHaveAttribute('src', 'https://images.example.com/anna.jpg');
  expect(avatars[0]).toHaveAttribute('referrerpolicy', 'no-referrer');
  expect(api.get.mock.calls.filter(([url]) => url === '/api/users/public/anna')).toHaveLength(1);
  expect(api.get).not.toHaveBeenCalledWith('/api/users/public/offline-client');
  expect(screen.getByText('Klient telefoniczny')).toBeInTheDocument();
  fireEvent.error(avatars[0]);
  expect(avatars[0]).not.toBeInTheDocument();
  expect(avatars[1]).toBeInTheDocument();
});

test.each(['no-photo', 'lookup-error'])('received reservations remain usable without an avatar: %s', async scenario => {
  const booking = { _id: 'one', userId: 'anna', userName: 'Anna', providerUserId: 'owner', status: 'oczekująca', date: '2027-01-01', fromTime: '10:00', toTime: '11:00', providerSeen: true };
  api.get.mockImplementation(async url => {
    if (url === '/api/users/public/anna') {
      if (scenario === 'lookup-error') throw new Error('Not found');
      return { data: { displayName: 'Anna', avatar: '' } };
    }
    return { data: url.includes('/meta/') ? { providerProfileId: 'profile', bookingMode: 'request-open' } : url.includes('/by-provider/') ? [booking] : [] };
  });
  render(<ReservationList user={{ uid: 'owner' }} />);
  expect(await screen.findByText('Anna')).toBeInTheDocument();
  expect(screen.queryByAltText('')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Potwierdź' })).toBeEnabled();
});
test('sent reservations show the destination profile avatar and share one lookup per provider', async () => {
  const booking = { userId: 'client', providerUserId: 'salon-owner', providerProfileId: 'salon-profile', providerProfileName: 'Salon', status: 'zaakceptowana', date: '2027-01-01', fromTime: '10:00', toTime: '11:00', clientSeen: true };
  api.get.mockImplementation(async url => ({ data:
    url === '/api/profiles/by-user/salon-owner' ? { _id: 'salon-profile', avatar: { url: 'https://images.example.com/profile.jpg', publicId: 'salon-avatar' } } :
    url === '/api/reservations/by-user/client' ? [{ ...booking, _id: 'one' }, { ...booking, _id: 'two' }] :
    url.includes('/by-provider/') ? [] : null,
  }));
  render(<ReservationList user={{ uid: 'client' }} />);
  await waitFor(() => expect(screen.getAllByAltText('')).toHaveLength(2));
  const avatars = screen.getAllByAltText('');
  avatars.forEach(avatar => expect(avatar).toHaveAttribute('src', 'https://images.example.com/profile.jpg'));
  expect(api.get.mock.calls.filter(([url]) => url === '/api/profiles/by-user/salon-owner')).toHaveLength(1);
  expect(api.get).not.toHaveBeenCalledWith('/api/users/public/salon-owner');
  fireEvent.error(avatars[0]);
  expect(avatars[0]).not.toBeInTheDocument();
  expect(avatars[1]).toBeInTheDocument();
});

test.each(['missing-avatar', 'deleted-profile', 'different-profile', 'lookup-error'])('sent reservations keep the fallback when the original profile photo is unavailable: %s', async scenario => {
  const booking = { _id: 'one', userId: 'client', providerUserId: 'owner', providerProfileId: 'original', providerProfileName: 'Salon', status: 'zaakceptowana', date: '2027-01-01', fromTime: '10:00', toTime: '11:00', clientSeen: true };
  api.get.mockImplementation(async url => {
    if (url === '/api/profiles/by-user/owner') {
      if (scenario === 'lookup-error') throw new Error('Offline');
      return { data: scenario === 'deleted-profile' ? null : { _id: scenario === 'different-profile' ? 'new-profile' : 'original', avatar: scenario === 'missing-avatar' ? '' : 'https://images.example.com/new-profile.jpg' } };
    }
    return { data: url === '/api/reservations/by-user/client' ? [booking] : url.includes('/by-provider/') ? [] : null };
  });
  render(<ReservationList user={{ uid: 'client' }} />);
  await screen.findByText('Salon');
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/profiles/by-user/owner'));
  expect(screen.queryByAltText('')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Anuluj z powodem/ })).toBeEnabled();
});
test('reservation search composes with status filters and clearing the field restores matching cards', async () => {
  const base = { userId: 'client', providerUserId: 'provider', date: '2027-01-01', fromTime: '10:00', toTime: '11:00', clientSeen: true };
  const reservations = [
    { ...base, _id: 'one', providerProfileName: 'Studio Anna', serviceName: 'Konsultacja', status: 'zaakceptowana' },
    { ...base, _id: 'two', providerProfileName: 'Salon Marta', serviceName: 'Strzyżenie', status: 'oczekująca' },
  ];
  api.get.mockImplementation(async url => ({ data: url === '/api/reservations/by-user/client' ? reservations : url.includes('/by-provider/') ? [] : null }));
  render(<ReservationList user={{ uid: 'client' }} />);
  const search = await screen.findByRole('searchbox', { name: 'Szukaj rezerwacji' });
  fireEvent.change(search, { target: { value: 'konsultacja' } });
  expect(screen.getByText('Studio Anna')).toBeInTheDocument();
  expect(screen.queryByText('Salon Marta')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Oczekujące 1/ }));
  expect(screen.queryByText('Studio Anna')).not.toBeInTheDocument();
  expect(screen.getByText('Brak rezerwacji w tym filtrze')).toBeInTheDocument();
  fireEvent.change(search, { target: { value: '' } });
  expect(screen.getByText('Salon Marta')).toBeInTheDocument();
  expect(screen.queryByText('Studio Anna')).not.toBeInTheDocument();
});
test('bulk read acknowledges only unread sent updates and keeps active reservations', async () => {
  const base = { userId: 'client', providerUserId: 'owner', date: '2027-01-01', fromTime: '10:00', toTime: '11:00', updatedAt: '2026-10-21T10:00:00Z' };
  const bookings = [
    { ...base, _id: 'new', providerProfileName: 'Salon A', status: 'zaakceptowana', clientSeen: false },
    { ...base, _id: 'closed', providerProfileName: 'Salon B', status: 'anulowana', clientSeen: false },
    { ...base, _id: 'read', providerProfileName: 'Salon C', status: 'zaakceptowana', clientSeen: true },
  ];
  api.get.mockImplementation(async url => ({ data: url.includes('by-user/') ? bookings : url.includes('by-provider/') ? [] : null }));
  api.patch.mockClear(); api.patch.mockResolvedValue({ data: {} });
  render(<ReservationList user={{ uid: 'client' }} />);
  fireEvent.click(await screen.findByRole('button', { name: /Odczytaj wszystkie/ }));
  await waitFor(() => expect(screen.queryByRole('button', { name: /Odczytaj wszystkie/ })).not.toBeInTheDocument());
  expect(api.patch).toHaveBeenCalledTimes(2);
  expect(api.patch).toHaveBeenCalledWith('/api/reservations/new/seen', { who: 'client', viewedUpdatedAt: base.updatedAt });
  expect(api.patch).toHaveBeenCalledWith('/api/reservations/closed/seen', { who: 'client', viewedUpdatedAt: base.updatedAt });
  expect(screen.getByText('Salon A')).toBeInTheDocument();
  expect(screen.queryByText('Salon B')).not.toBeInTheDocument();
});

test('bulk read in received reservations does not acknowledge sent updates', async () => {
  const base = { date: '2027-01-01', fromTime: '10:00', toTime: '11:00', status: 'oczekująca', updatedAt: '2026-10-21T10:00:00Z' };
  const received = { ...base, _id: 'received', userId: 'anna', userName: 'Anna', providerUserId: 'owner', providerSeen: false };
  const sent = { ...base, _id: 'sent', userId: 'owner', providerUserId: 'other', providerProfileName: 'Inny profil', clientSeen: false };
  api.get.mockImplementation(async url => ({ data: url.includes('/meta/') ? { providerProfileId: 'profile', bookingMode: 'request-open' } : url.includes('by-user/') ? [sent] : url.includes('by-provider/') ? [received] : [] }));
  api.patch.mockClear(); api.patch.mockResolvedValue({ data: {} });
  render(<ReservationList user={{ uid: 'owner' }} />);
  const group = await screen.findByRole('group', { name: 'Otrzymane rezerwacje' });
  fireEvent.click(within(group).getByRole('button', { name: /Odczytaj wszystkie/ }));
  await waitFor(() => expect(within(group).queryByRole('button', { name: /Odczytaj wszystkie/ })).not.toBeInTheDocument());
  expect(api.patch).toHaveBeenCalledTimes(1);
  expect(api.patch).toHaveBeenCalledWith('/api/reservations/received/seen', { who: 'provider', viewedUpdatedAt: base.updatedAt });
  expect(screen.getByRole('button', { name: /Odczytaj wszystkie/ })).toBeInTheDocument();
});

test('bulk read keeps a failed or newer update unread and reports partial completion', async () => {
  let bookings = ['one', 'newer'].map(id => ({ _id: id, userId: 'client', providerUserId: 'owner', providerProfileName: 'Salon ' + id, date: '2027-01-01', fromTime: '10:00', toTime: '11:00', status: 'zaakceptowana', clientSeen: false, updatedAt: '2026-10-21T10:00:00Z' }));
  api.get.mockImplementation(async url => ({ data: url.includes('by-user/') ? bookings : url.includes('by-provider/') ? [] : null }));
  api.patch.mockClear();
  api.patch.mockImplementation(async url => {
    if (url.includes('/newer/')) throw Object.assign(new Error('Newer update'), { response: { status: 409 } });
    bookings = bookings.map(item => item._id === 'one' ? { ...item, clientSeen: true } : item);
    return { data: {} };
  });
  render(<ReservationList user={{ uid: 'client' }} />);
  fireEvent.click(await screen.findByRole('button', { name: /Odczytaj wszystkie/ }));
  await screen.findByText(/Część zmian pozostała nieprzeczytana/);
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Oznacz jako przeczytane' })).toHaveLength(1));
  expect(screen.getByRole('button', { name: /Odczytaj wszystkie/ })).toHaveTextContent('1');
});

test('empty received and sent reservations invite discovery through the profile search', async () => {
  api.get.mockImplementation(async url => ({ data: url.includes('/meta/') ? { providerProfileId: 'profile', bookingMode: 'request-open' } : [] }));
  render(<ReservationList user={{ uid: 'owner' }} />);
  const received = await screen.findByRole('group', { name: 'Otrzymane rezerwacje' });
  const sent = screen.getByRole('group', { name: 'Wysłane rezerwacje' });
  expect(within(received).getByRole('heading', { name: 'Brak otrzymanych rezerwacji' })).toBeInTheDocument();
  expect(within(sent).getByRole('heading', { name: 'Brak wysłanych rezerwacji' })).toBeInTheDocument();
  [received, sent].forEach(group => expect(within(group).getByRole('link', { name: 'Poznaj profile Showly' })).toHaveAttribute('href', '/profile'));
});
