import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import HowShowlyWorks from './HowShowlyWorks';

jest.mock('react-router-dom', () => ({
  Link: ({ to, state, children, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });

test('journey tabs support keyboard selection, focus and wrapping', () => {
  render(<HowShowlyWorks />);
  const tabs = screen.getAllByRole('tab');
  expect(tabs).toHaveLength(2);
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
  expect(tabs[1]).toHaveFocus();
  expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', tabs[1].id);
  expect(screen.getByRole('heading', { name: 'Konto to początek. Profil pokazuje Twoją ofertę.' })).toBeInTheDocument();
  fireEvent.keyDown(tabs[1], { key: 'ArrowRight' });
  expect(tabs[0]).toHaveFocus();
  expect(screen.getByRole('heading', { name: 'Wpisz, czego szukasz. Dodaj miasto.' })).toBeInTheDocument();
});

test('step navigation supports arrows, Home and End', () => {
  render(<HowShowlyWorks />);
  const steps = within(screen.getByRole('list', { name: 'Cztery kroki wybranej ścieżki' })).getAllByRole('button');
  fireEvent.keyDown(steps[0], { key: 'ArrowRight' });
  expect(steps[1]).toHaveFocus();
  expect(steps[1]).toHaveAttribute('aria-current', 'step');
  expect(screen.getByRole('heading', { name: 'Sprawdź pracę, ofertę i sposób kontaktu.' })).toBeInTheDocument();
  fireEvent.keyDown(steps[1], { key: 'End' });
  expect(steps[3]).toHaveFocus();
  fireEvent.keyDown(steps[3], { key: 'ArrowRight' });
  expect(steps[0]).toHaveFocus();
  fireEvent.keyDown(steps[0], { key: 'End' });
  fireEvent.keyDown(steps[3], { key: 'Home' });
  expect(steps[0]).toHaveAttribute('aria-current', 'step');
});

test('client flow explains contact, booking acceptance and announcements with real destinations', () => {
  render(<HowShowlyWorks />);
  expect(screen.getByRole('link', { name: 'Przeglądaj profile' })).toHaveAttribute('href', '/profile');
  fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
  expect(screen.getByText(/Do zapisywania ulubionych potrzebujesz konta/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
  expect(screen.getByText(/Wysłanie zapytania nie oznacza automatycznego potwierdzenia/)).toBeInTheDocument();
  expect(screen.getByText('Oczekuje na odpowiedź')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
  expect(screen.getByRole('link', { name: 'Zobacz ogłoszenia' })).toHaveAttribute('href', '/ogloszenia');
  expect(screen.getByText(/Do opublikowania ogłoszenia wystarczy konto/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Dalej' })).toBeNull();
  expect(screen.getByText('Ilustracja funkcji · dane przykładowe')).toBeInTheDocument();
});

test('provider flow covers portfolio, design, availability and account management', () => {
  render(<HowShowlyWorks user={{ uid: 'owner' }} hasProfile />);
  fireEvent.click(screen.getByRole('tab', { name: 'Oferuję usługi' }));
  expect(screen.getByRole('link', { name: 'Edytuj swój profil' })).toHaveAttribute('href', '/profil');
  fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
  expect(screen.getByText(/W portfolio możesz opowiedzieć o projekcie/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
  expect(screen.getByText(/Rezerwacje i godziny pracy ustawiasz osobno/)).toBeInTheDocument();
  expect(screen.getByText('Przyjmuję nowe zlecenia')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
  expect(screen.getByRole('link', { name: 'Otwórz powiadomienia' })).toHaveAttribute('href', '/powiadomienia');
  fireEvent.click(screen.getByRole('tab', { name: 'Szukam usługi' }));
  expect(screen.getByRole('heading', { name: 'Wpisz, czego szukasz. Dodaj miasto.' })).toBeInTheDocument();
});

test('profile CTA adapts to guests, accounts without a profile and existing providers', () => {
  const { rerender } = render(<HowShowlyWorks />);
  fireEvent.click(screen.getByRole('tab', { name: 'Oferuję usługi' }));
  expect(screen.getByRole('link', { name: 'Załóż konto i zacznij' })).toHaveAttribute('href', '/register');
  rerender(<HowShowlyWorks user={{ uid: 'owner' }} />);
  expect(screen.getByRole('link', { name: 'Stwórz swój profil' })).toHaveAttribute('href', '/stworz-profil');
  rerender(<HowShowlyWorks user={{ uid: 'owner' }} hasProfile />);
  expect(screen.getByRole('link', { name: 'Edytuj swój profil' })).toHaveAttribute('href', '/profil');
});

test('account shortcuts lead guests to login and members to their own sections', () => {
  const { rerender } = render(<HowShowlyWorks />);
  expect(screen.getByRole('link', { name: /Ulubione Wracaj/ })).toHaveAttribute('href', '/login');
  rerender(<HowShowlyWorks user={{ uid: 'owner' }} />);
  expect(screen.getByRole('link', { name: /Ulubione Wracaj/ })).toHaveAttribute('href', '/ulubione');
  expect(screen.getByRole('link', { name: /Rezerwacje Sprawdzaj/ })).toHaveAttribute('href', '/rezerwacje');
  expect(screen.getByRole('link', { name: /Twoje ogłoszenia Ogarniaj/ })).toHaveAttribute('href', '/twoje-ogloszenia');
});
