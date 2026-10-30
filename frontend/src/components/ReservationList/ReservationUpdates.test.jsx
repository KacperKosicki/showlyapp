import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReservationList from './ReservationList';
import { api } from '../../api/api';
jest.mock('../../api/api', () => ({ api: { get: jest.fn(), patch: jest.fn() } }));
jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '/rezerwacje', state: null }) }), { virtual: true });
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