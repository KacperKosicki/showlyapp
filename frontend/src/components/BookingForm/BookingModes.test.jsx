import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { format, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import Calendar from './BookingModeCalendar';
import ServicePicker from './BookingServicePicker';
import Day from './BookingModeDay';
import Open from './BookingModeOpen';
import { api } from '../../api/api';
jest.mock('date-fns/locale', () => ({ pl: jest.requireActual('../../../node_modules/date-fns/locale/pl.cjs').pl }));
jest.mock('../../api/api', () => ({ api: { get: jest.fn(), post: jest.fn() } }));
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });
const service = { _id: 'service-1', name: 'Konsultacja', duration: { value: 30, unit: 'minutes' } };
const provider = { _id: 'profile-1', userId: 'provider-1', name: 'Pracownia', services: [service], workingDays: [0, 1, 2, 3, 4, 5, 6], workingHours: { from: '08:00', to: '10:00' } };
const date = addDays(new Date(), 1);
const dateStr = format(date, 'yyyy-MM-dd');
const props = { provider, user: { uid: 'client-1' }, pushAlert: jest.fn() };
beforeEach(() => { jest.clearAllMocks(); api.get.mockResolvedValue({ data: [] }); api.post.mockResolvedValue({ data: {} }); });
async function pickTomorrow() {
    if (date.getMonth() !== new Date().getMonth()) fireEvent.click(screen.getByRole('button', { name: 'Następny miesiąc' }));
    await waitFor(() => expect(screen.getByRole('button', { name: format(date, 'd MMMM yyyy', { locale: pl }) })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: format(date, 'd MMMM yyyy', { locale: pl }) }));
}
test('calendar filters busy hours, summarizes the selection and preserves reservation payload', async () => {
    api.get.mockResolvedValue({ data: [{ date: dateStr, fromTime: '08:00', toTime: '08:30', status: 'zaakceptowana' }] });
    render(<Calendar {...props} preselectedServiceId="service-1" />);
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Konsultacja' })).toBeChecked());
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
    expect(screen.getByRole('button', { name: 'Rezerwuj termin' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: 'Konsultacja' }));
    await pickTomorrow();
    fireEvent.click(screen.getByRole('button', { name: 'Rezerwuj termin' }));
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

test('calendar keeps time selection disabled while availability is still being fetched', async () => {
    let resolve;
    api.get.mockReturnValue(new Promise(done => { resolve = done; }));
    render(<Calendar {...props} preselectedServiceId="service-1" />);
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Konsultacja' })).toBeChecked());
    await pickTomorrow();
    const slots = await screen.findAllByRole('button', { name: /Godzina .*wolna/ });
    expect(screen.getByText('Sprawdzamy dostępne terminy…')).toBeInTheDocument();
    slots.forEach(slot => expect(slot).toBeDisabled());
    await act(async () => { resolve({ data: [] }); });
    await waitFor(() => expect(slots[0]).toBeEnabled());
    expect(screen.queryByText('Sprawdzamy dostępne terminy…')).not.toBeInTheDocument();
});

test('automatically accepted calendar booking shows the confirmed server status', async () => {
    api.post.mockResolvedValue({ data: { reservation: { status: 'zaakceptowana' } } });
    render(<Calendar {...props} provider={{ ...provider, autoAcceptReservations: true }} preselectedServiceId="service-1" />);
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Konsultacja' })).toBeChecked());
    await pickTomorrow();
    const free = await screen.findAllByRole('button', { name: /Godzina .*wolna/ });
    fireEvent.click(free[0]);
    expect(screen.getByText(/Ten profil automatycznie potwierdza/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rezerwuj termin' }));
    await waitFor(() => expect(JSON.parse(sessionStorage.getItem('flash')).message).toContain('Termin potwierdzony.'));
});
test('time filters put noon in the afternoon and keep the selected hour', async () => {
    render(<Calendar {...props} provider={{ ...provider, workingHours: { from: '11:30', to: '13:00' } }} preselectedServiceId="service-1" />);
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Konsultacja' })).toBeChecked());
    await pickTomorrow();
    fireEvent.click(screen.getByRole('button', { name: 'Przed 12:00' }));
    expect(screen.getByRole('button', { name: 'Godzina 11:30, wolna' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Godzina 12:00, wolna' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Od 12:00' }));
    fireEvent.click(screen.getByRole('button', { name: 'Godzina 12:00, wolna' }));
    expect(screen.queryByRole('button', { name: 'Godzina 11:30, wolna' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Wszystkie' }));
    expect(screen.getByRole('button', { name: 'Godzina 12:00, wolna' })).toHaveAttribute('aria-pressed', 'true');
});

test('nearest appointment skips blocked days and busy hours and selects the actual booking', async () => {
    const dayAfter = addDays(date, 1);
    const nextDate = format(dayAfter, 'yyyy-MM-dd');
    api.get.mockResolvedValue({ data: [{ date: nextDate, fromTime: '08:00', toTime: '08:30', status: 'zaakceptowana' }] });
    render(<Calendar {...props} provider={{ ...provider, availabilityOverrides: [
        { type: 'day', date: format(new Date(), 'yyyy-MM-dd') },
        { type: 'day', date: dateStr },
    ] }} preselectedServiceId="service-1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Najbliższy wolny termin/ }));
    expect(screen.getByRole('button', { name: 'Godzina 08:35, wolna' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Rezerwuj termin' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/reservations', expect.objectContaining({ date: nextDate, fromTime: '08:35' })));
});

test('availability failure blocks booking and offers retry', async () => {
    api.get.mockRejectedValueOnce(new Error('offline'));
    render(<Calendar {...props} preselectedServiceId="service-1" />);
    await screen.findByRole('alert');
    await pickTomorrow();
    expect(screen.getByRole('button', { name: 'Godzina 08:00, wolna' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Najbliższy wolny termin/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Godzina 08:00, wolna' })).toBeEnabled());
});

test('changing a service tile clears the previous appointment selection', async () => {
    const secondService = { ...service, _id: 'service-2', name: 'Dłuższa konsultacja', duration: { value: 60, unit: 'minutes' }, price: { mode: 'fixed', amount: 150, currency: 'PLN' } };
    render(<Calendar {...props} provider={{ ...provider, services: [service, secondService] }} preselectedServiceId="service-1" />);
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Konsultacja' })).toBeChecked());
    await pickTomorrow();
    fireEvent.click(screen.getByRole('button', { name: 'Godzina 08:00, wolna' }));
    expect(screen.getByRole('button', { name: 'Rezerwuj termin' })).toBeEnabled();
    fireEvent.click(screen.getByRole('radio', { name: 'Dłuższa konsultacja' }));
    expect(screen.getByRole('radio', { name: 'Dłuższa konsultacja' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Konsultacja' })).not.toBeChecked();
    expect(screen.queryByRole('button', { name: 'Rezerwuj termin' })).not.toBeInTheDocument();
    expect(screen.getByText('150 PLN')).toBeInTheDocument();
    await pickTomorrow();
    fireEvent.click(screen.getByRole('button', { name: 'Godzina 08:00, wolna' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rezerwuj termin' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/reservations', expect.objectContaining({ serviceId: 'service-2', fromTime: '08:00', toTime: '09:00' })));
});

test('service tiles display profile photos, use the gallery when needed and survive broken images', async () => {
    const photographed = { ...service, image: { url: '/uploads/services/consultation.jpg' } };
    const galleryService = { ...service, _id: 'gallery-service', name: 'Warsztat', gallery: [{ url: 'https://example.com/workshop.jpg' }] };
    render(<Open {...props} provider={{ ...provider, services: [photographed, galleryService] }} />);
    const image = screen.getByRole('img', { name: 'Konsultacja' });
    expect(image.getAttribute('src')).toMatch(/\/uploads\/services\/consultation\.jpg$/);
    expect(screen.getByRole('img', { name: 'Warsztat' })).toHaveAttribute('src', 'https://example.com/workshop.jpg');
    fireEvent.error(image);
    expect(screen.queryByRole('img', { name: 'Konsultacja' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Konsultacja' }));
    expect(screen.getByRole('radio', { name: 'Konsultacja' })).toBeChecked();
    expect(screen.getByRole('textbox', { name: /Temat wiadomości/ })).toHaveValue('Zapytanie o usługę: Konsultacja');
});

test('evening filter starts at 17:00 and preserves the selected appointment', async () => {
    render(<Calendar {...props} provider={{ ...provider, workingHours: { from: '16:30', to: '18:00' } }} preselectedServiceId="service-1" />);
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Konsultacja' })).toBeChecked());
    await pickTomorrow();
    fireEvent.click(screen.getByRole('button', { name: 'Od 17:00' }));
    expect(screen.queryByRole('button', { name: 'Godzina 16:55, wolna' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Godzina 17:00, wolna' }));
    fireEvent.click(screen.getByRole('button', { name: 'Wszystkie' }));
    expect(screen.getByRole('button', { name: 'Godzina 17:00, wolna' })).toHaveAttribute('aria-pressed', 'true');
});

test('service search narrows a long list while keeping the chosen service visible', () => {
    const services = Array.from({ length: 8 }, (_, index) => ({ ...service, _id: `service-${index}`, name: `Usługa ${index}` }));
    render(<Open {...props} provider={{ ...provider, services }} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Usługa 1' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Szukaj usługi' }), { target: { value: 'USŁUGA 7' } });
    expect(screen.getByRole('radio', { name: 'Usługa 1' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Usługa 7' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Usługa 2' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    expect(screen.getByRole('radio', { name: 'Usługa 2' })).toBeInTheDocument();
});

test.each([
    ['08:30', 'Duża dostępność'],
    ['09:00', 'Średnia dostępność'],
    ['09:15', 'Mała dostępność'],
    ['10:00', 'Brak wolnych godzin'],
])('calendar availability reflects busy time ending at %s', async (toTime, status) => {
    api.get.mockResolvedValue({ data: [{ date: dateStr, fromTime: '08:00', toTime, status: 'zaakceptowana' }] });
    render(<Calendar {...props} preselectedServiceId="service-1" />);
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Konsultacja' })).toBeChecked());
    if (date.getMonth() !== new Date().getMonth()) fireEvent.click(screen.getByRole('button', { name: 'Następny miesiąc' }));
    await waitFor(() => expect(screen.getByRole('button', { name: format(date, 'd MMMM yyyy', { locale: pl }) })).toHaveAttribute('title', expect.stringContaining(status)));
});

test('booking summary separates the service, date, time and photo', async () => {
    render(<Calendar {...props} provider={{ ...provider, services: [{ ...service, image: 'https://example.com/service.jpg' }] }} preselectedServiceId="service-1" />);
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Konsultacja' })).toBeChecked());
    await pickTomorrow();
    fireEvent.click(screen.getByRole('button', { name: 'Godzina 08:00, wolna' }));
    const summary = screen.getByRole('region', { name: 'Twoja rezerwacja' });
    expect(summary).toHaveTextContent('Konsultacja');
    expect(summary).toHaveTextContent(format(date, 'd MMMM yyyy', { locale: pl }));
    expect(summary).toHaveTextContent('Godziny08:00');
    expect(within(summary).getByRole('img', { name: 'Konsultacja' })).toHaveAttribute('src', 'https://example.com/service.jpg');
});

test('service sorting handles prices, mixed duration units and missing values without losing selection', () => {
    const services = [
        { ...service, _id: 'short', name: 'Krótka', price: { mode: 'fixed', amount: 100 } },
        { ...service, _id: 'hour', name: 'Godzinna', duration: { value: 1, unit: 'hours' }, price: { mode: 'from', from: 50 } },
        { ...service, _id: 'day', name: 'Dzienna', duration: { value: 1, unit: 'days' }, price: { mode: 'contact' } },
        { ...service, _id: 'free', name: 'Bezpłatna', duration: null, price: { mode: 'free' } },
    ];
    render(<ServicePicker services={services} value={services[1]} onChange={jest.fn()} />);
    const names = () => screen.getAllByRole('radio').map(radio => radio.getAttribute('aria-label'));
    fireEvent.click(screen.getByRole('button', { name: 'Cena rosnąco' }));
    expect(names()).toEqual(['Bezpłatna', 'Godzinna', 'Krótka', 'Dzienna']);
    fireEvent.click(screen.getByRole('button', { name: 'Cena malejąco' }));
    expect(names()).toEqual(['Krótka', 'Godzinna', 'Bezpłatna', 'Dzienna']);
    fireEvent.click(screen.getByRole('button', { name: 'Najkrótsze' }));
    expect(names()).toEqual(['Krótka', 'Godzinna', 'Dzienna', 'Bezpłatna']);
    fireEvent.click(screen.getByRole('button', { name: 'Najdłuższe' }));
    expect(names()).toEqual(['Dzienna', 'Godzinna', 'Krótka', 'Bezpłatna']);
    expect(screen.getByRole('radio', { name: 'Godzinna' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Domyślnie' }));
    expect(names()).toEqual(['Krótka', 'Godzinna', 'Dzienna', 'Bezpłatna']);
});

test('before selecting a date the time panel shows a useful service preview', async () => {
    render(<Calendar {...props} preselectedServiceId="service-1" />);
    await screen.findByText('Jaki dzień Ci odpowiada?');
    expect(screen.getByText('Wybrana usługa')).toBeInTheDocument();
    expect(screen.getByText('Zacznij od wyboru dnia')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Dostępne godziny' })).not.toBeInTheDocument();
    await pickTomorrow();
    expect(screen.queryByText('Jaki dzień Ci odpowiada?')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Dostępne godziny' })).toBeInTheDocument();
});

test('date orders use order wording and submit a date without claiming the whole day', async () => {
    render(<Day {...props} provider={{ ...provider, dayBookingMode: 'order' }} preselectedServiceId="service-1" />);
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Konsultacja' })).toBeChecked());
    await pickTomorrow();
    expect(screen.getByRole('region', { name: 'Twoje zamówienie' })).toHaveTextContent('Na wybraną datę');
    expect(screen.queryByText(/Rezerwujesz cały dzień/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij zamówienie' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/reservations/day', expect.objectContaining({ date: dateStr, serviceId: 'service-1' })));
});

test('date hour bookings require a valid from/to interval and send the chosen hours', async () => {
    render(<Day {...props} provider={{ ...provider, dayBookingMode: 'hours' }} preselectedServiceId="service-1" />);
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Konsultacja' })).toBeChecked());
    await pickTomorrow();
    expect(screen.getByRole('button', { name: 'Rezerwuj termin' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Godzina od'), { target: { value: '08:15' } });
    fireEvent.change(screen.getByLabelText('Godzina do'), { target: { value: '09:45' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rezerwuj termin' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/reservations/day', expect.objectContaining({ fromTime: '08:15', toTime: '09:45', date: dateStr })));
});

test('stay bookings select arrival and departure, include nights, and send both dates', async () => {
    render(<Day {...props} provider={{ ...provider, dayBookingMode: 'stay' }} preselectedServiceId="service-1" />);
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Konsultacja' })).toBeChecked());
    await pickTomorrow();
    const departure = addDays(date, 3);
    fireEvent.change(screen.getByLabelText('Data wyjazdu'), { target: { value: format(departure, 'yyyy-MM-dd') } });
    expect(screen.getByRole('region', { name: 'Twoja rezerwacja' })).toHaveTextContent('Liczba noclegów: 3');
    fireEvent.click(screen.getByRole('button', { name: 'Rezerwuj pobyt' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/reservations/day', expect.objectContaining({ date: dateStr, endDate: format(departure, 'yyyy-MM-dd') })));
});

test('unavailable interior dates prevent stay submission', async () => {
    api.get.mockImplementation(url => Promise.resolve({ data: url.includes('unavailable-days') ? [format(addDays(date, 1), 'yyyy-MM-dd')] : [] }));
    render(<Day {...props} provider={{ ...provider, dayBookingMode: 'stay' }} preselectedServiceId="service-1" />);
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Konsultacja' })).toBeChecked());
    await pickTomorrow();
    fireEvent.change(screen.getByLabelText('Data wyjazdu'), { target: { value: format(addDays(date, 3), 'yyyy-MM-dd') } });
    expect(screen.getByRole('button', { name: 'Rezerwuj pobyt' })).toBeDisabled();
    expect(api.post).not.toHaveBeenCalled();
});
