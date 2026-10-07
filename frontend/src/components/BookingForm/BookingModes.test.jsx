import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { format, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import Calendar from './BookingModeCalendar';
import Day from './BookingModeDay';
import Open from './BookingModeOpen';
import { api } from '../../api/api';
jest.mock('date-fns/locale', () => ({ pl: jest.requireActual('../../../node_modules/date-fns/locale/pl.cjs').pl }));
jest.mock('../../api/api', () => ({ api: { get: jest.fn(), post: jest.fn() } }));
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });
const service = { _id: 'service-1', name: 'Konsultacja', duration: { value: 30, unit: 'minutes' } };
const provider = { _id: 'profile-1', userId: 'provider-1', name: 'Pracownia', services: [service], workingDays: [0,1,2,3,4,5,6], workingHours: { from: '08:00', to: '10:00' } };
const date = addDays(new Date(), 1);
const dateStr = format(date, 'yyyy-MM-dd');
const props = { provider, user: { uid: 'client-1' }, pushAlert: jest.fn() };
beforeEach(() => { jest.clearAllMocks(); api.get.mockResolvedValue({ data: [] }); api.post.mockResolvedValue({ data: {} }); });
async function pickTomorrow() {
 if (date.getMonth() !== new Date().getMonth()) fireEvent.click(screen.getByRole('button', { name: 'Następny miesiąc' }));
 fireEvent.click(screen.getByRole('button', { name: format(date, 'd MMMM yyyy', { locale: pl }) }));
}
test('calendar filters busy hours, summarizes the selection and preserves reservation payload', async () => {
 api.get.mockResolvedValue({ data: [{ date: dateStr, fromTime: '08:00', toTime: '08:30', status: 'zaakceptowana' }] });
 render(<Calendar {...props} preselectedServiceId="service-1" />);
 await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('service-1'));
 await pickTomorrow();
 const free = await screen.findAllByRole('button', { name: /Godzina .*wolna/ });
 expect(screen.queryByRole('button', { name: 'Godzina 08:00, zajęta' })).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('checkbox', { name: /Pokaż także/ }));
 expect(screen.getByRole('button', { name: 'Godzina 08:00, zajęta' })).toBeDisabled();
 fireEvent.click(free[0]);
 expect(screen.getByText('Twoja rezerwacja')).toBeInTheDocument();
 const selectedTime = free[0].textContent;
 fireEvent.click(screen.getByRole('button', { name: 'Rezerwuj termin' }));
 await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/reservations', expect.objectContaining({ date: dateStr, fromTime: selectedTime, serviceId: 'service-1', userId: 'client-1' })));
});
test('day booking unlocks after service and date selection', async () => {
 render(<Day {...props} />);
 expect(screen.getByRole('button', { name: 'Rezerwuj dzień' })).toBeDisabled();
 fireEvent.change(screen.getByRole('combobox'), { target: { value: 'service-1' } });
 await pickTomorrow();
 fireEvent.click(screen.getByRole('button', { name: 'Rezerwuj dzień' }));
 await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/reservations/day', expect.objectContaining({ date: dateStr, serviceId: 'service-1' })));
});
test('open inquiry requires a message and preview includes optional details', () => {
 render(<Open {...props} />);
 expect(screen.getByRole('button', { name: 'Wyślij zapytanie' })).toBeDisabled();
 fireEvent.change(screen.getByRole('textbox', { name: /Wiadomość/ }), { target: { value: 'Proszę o wycenę strony' } });
 fireEvent.change(screen.getByRole('textbox', { name: /Telefon/ }), { target: { value: '500 600 700' } });
 expect(screen.getByRole('button', { name: 'Wyślij zapytanie' })).toBeEnabled();
 fireEvent.click(screen.getByText('Co zostanie wysłane?'));
 expect(screen.getByText(/Telefon: 500 600 700/)).toHaveTextContent('Proszę o wycenę strony');
});
