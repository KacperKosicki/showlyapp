import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Announcements from './Announcements';
import MyAnnouncements from './MyAnnouncements';
import AnnouncementDetail from './AnnouncementDetail';
import AnnouncementStrip from './AnnouncementStrip';
import { announcementApi } from './announcementApi';
import { examples } from './announcementData';

jest.mock('./announcementApi', () => ({ announcementApi: jest.fn() }));
let mockInitialSearch = '';
jest.mock('react-router-dom', () => ({
  MemoryRouter: ({ children }) => <>{children}</>, Routes: ({ children }) => <>{children}</>, Route: ({ element }) => element,
  Link: ({ to, state, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useParams: () => ({ id: '123' }), useNavigate: () => jest.fn(),
  useSearchParams: () => {
    const [search, setSearch] = require('react').useState(() => new URLSearchParams(mockInitialSearch));
    return [search, value => setSearch(new URLSearchParams(value))];
  },
}), { virtual: true });
const mount = (element, route = '/') => { mockInitialSearch = route.split('?')[1] || ''; return render(<MemoryRouter>{element}</MemoryRouter>); };
beforeEach(() => announcementApi.mockReset());
test('search combines category and location and returns real announcement cards', async () => {
  announcementApi.mockResolvedValue({ items: [{ ...examples[0], _id: 'real', authorName: 'Anna' }], total: 1 });
  mount(<Announcements user={{ uid: 'account' }} />);
  await screen.findByText(examples[0].title);
  fireEvent.change(screen.getByLabelText('Miejscowość'), { target: { value: 'Poznań' } });
  fireEvent.click(screen.getByRole('button', { name: 'Muzyka i wydarzenia' }));
  await waitFor(() => expect(announcementApi.mock.calls.some(([path]) => path.includes('location=Pozna') && path.includes('category=music'))).toBe(true));
  expect(screen.getByText('Wystawia: Anna')).toBeInTheDocument();
});
test('creating another listing requires explicit replacement and submits that choice to the API', async () => {
  announcementApi.mockImplementation(async (path, options = {}) => {
    if (path === '/mine') return { items: [{ ...examples[0], _id: 'active', state: 'active' }], applications: [], activeId: 'active' };
    if (path === '' && options.method === 'POST') return { _id: 'new' };
    return { ok: true };
  });
  mount(<MyAnnouncements />);
  const newButton = await screen.findByRole('button', { name: /Nowe ogłoszenie/ });
  await waitFor(() => expect(newButton).not.toBeDisabled());
  fireEvent.click(newButton);
  fireEvent.change(screen.getByLabelText('Kogo lub czego szukasz?'), { target: { value: 'Szukam florysty na wesele' } });
  fireEvent.change(screen.getByLabelText('Opisz swoje potrzeby'), { target: { value: 'Potrzebuję naturalnych dekoracji stołów i bukietu w pastelowych kolorach.' } });
  fireEvent.change(screen.getByLabelText('Miejscowość'), { target: { value: 'Poznań' } });
  const publish = screen.getByRole('button', { name: /Publikuj na 30 dni/ });
  expect(publish).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: /Zastąp moje obecne/ }));
  fireEvent.click(publish);
  await waitFor(() => expect(announcementApi).toHaveBeenCalledWith('/new/publish', expect.objectContaining({ body: { replace: true }, authenticated: true })));
});
test('an account without a provider profile is directed to profile creation instead of an application form', async () => {
  announcementApi.mockResolvedValue({ ...examples[0], state: 'active', profile: null, isOwner: false });
  mount(<Routes><Route path="/ogloszenia/:id" element={<AnnouncementDetail user={{ uid: 'regular' }} />} /></Routes>, '/ogloszenia/123');
  expect(await screen.findByRole('link', { name: 'Stwórz profil usługodawcy' })).toHaveAttribute('href', '/stworz-profil');
  expect(screen.queryByLabelText('Twoja propozycja')).not.toBeInTheDocument();
});
test('a provider sends an application with an optional proposed budget', async () => {
  announcementApi.mockImplementation(async (path, options = {}) => options.method === 'POST' ? { conversationId: 'thread' } : { ...examples[0], state: 'active', profile: { name: 'DJ Studio' }, isOwner: false, canApply: true });
  mount(<Routes><Route path="/ogloszenia/:id" element={<AnnouncementDetail user={{ uid: 'provider' }} />} /></Routes>, '/ogloszenia/123');
  fireEvent.change(await screen.findByLabelText('Twoja propozycja'), { target: { value: 'Mam nagłośnienie i doświadczenie. Chętnie porozmawiam o muzyce na wesele.' } });
  fireEvent.change(screen.getByLabelText('Proponowana kwota (zł, opcjonalnie)'), { target: { value: '3000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Zgłoś się z profilem' }));
  await waitFor(() => expect(announcementApi).toHaveBeenCalledWith('/123/applications', expect.objectContaining({ method: 'POST', body: { message: 'Mam nagłośnienie i doświadczenie. Chętnie porozmawiam o muzyce na wesele.', proposedBudget: '3000' } })));
});
test('a saved draft survives a publication conflict and the owner receives an actionable message', async () => {
  announcementApi.mockImplementation(async (path, options = {}) => {
    if (path === '/mine') return { items: [], applications: [], activeId: null };
    if (path === '' && options.method === 'POST') return { _id: 'saved' };
    throw new Error('Masz już aktywne ogłoszenie.');
  });
  mount(<MyAnnouncements />, '/twoje-ogloszenia?nowe=1');
  fireEvent.change(await screen.findByLabelText('Kogo lub czego szukasz?'), { target: { value: 'Szukam fotografa na sesję' } });
  fireEvent.change(screen.getByLabelText('Opisz swoje potrzeby'), { target: { value: 'Potrzebuję zdjęć dla nowego projektu i kogoś kto pomoże z pomysłem na sesję.' } });
  fireEvent.change(screen.getByLabelText('Miejscowość'), { target: { value: 'Poznań' } });
  fireEvent.click(screen.getByRole('button', { name: /Publikuj na 30 dni/ }));
  expect(await screen.findByText('Szkic został zapisany. Masz już aktywne ogłoszenie.')).toBeInTheDocument();
});
test('the homepage presents three labelled examples and brings the selected idea to the front', () => {
  mount(<AnnouncementStrip />);
  expect(screen.getAllByText('Przykładowe ogłoszenie')).toHaveLength(3);
  const project = screen.getByRole('button', { name: `Pokaż pomysł: ${examples[1].title}` });
  expect(project).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(screen.getByRole('button', { name: /02.*Projekt/ }));
  expect(project).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: `Pokaż pomysł: ${examples[0].title}` })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('link', { name: 'Dodaj swój pomysł' })).toHaveAttribute('href', '/twoje-ogloszenia?nowe=1');
  expect(announcementApi).not.toHaveBeenCalled();
});
