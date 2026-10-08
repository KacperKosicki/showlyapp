import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navbar from './Navbar';
import axios from 'axios';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/konto' }),
  useNavigate: () => mockNavigate,
  Link: ({ to, state, children, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });
jest.mock('../../firebase', () => ({ auth: { currentUser: null } }));
jest.mock('firebase/auth', () => ({ signOut: jest.fn() }));
jest.mock('axios', () => ({ get: jest.fn().mockResolvedValue({ data: [] }) }));
const originalFetch = global.fetch;
beforeEach(() => {
  mockNavigate.mockClear();
  axios.get.mockResolvedValue({ data: [] });
  global.fetch = jest.fn(async url => ({ ok: !url.includes('by-user'), status: url.includes('by-user') ? 404 : 200, json: async () => ({ role: 'user' }) }));
});
afterEach(() => { global.fetch = originalFetch; });
const openNavigation = () => fireEvent.click(screen.getByRole('button', { name: 'Otwórz menu nawigacji' }));
const showNavbar = async () => {
  render(<Navbar user={{ uid: 'test-user', email: 'test@example.com' }} loadingUser={false} />);
  await screen.findByRole('menuitem', { name: /Stwórz profil/, hidden: true });
};

test('opening either navigation or account menu closes the other', async () => {
  await showNavbar();
  openNavigation();
  expect(screen.getByRole('menu', { name: 'Nawigacja Showly' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Otwórz menu użytkownika' }));
  expect(screen.queryByRole('menu', { name: 'Nawigacja Showly' })).not.toBeInTheDocument();
  expect(screen.getByRole('menu', { name: 'Moje konto' })).toBeInTheDocument();
  openNavigation();
  expect(screen.queryByRole('menu', { name: 'Moje konto' })).not.toBeInTheDocument();
  expect(screen.getByRole('menu', { name: 'Nawigacja Showly' })).toBeInTheDocument();
});

test('navigation supports keyboard selection, Escape and closing after choosing a section', async () => {
  await showNavbar();
  openNavigation();
  const menu = screen.getByRole('menu', { name: 'Nawigacja Showly' });
  expect(within(menu).getByRole('menuitem', { name: 'O Showly' })).toHaveFocus();
  fireEvent.keyDown(menu, { key: 'End' });
  expect(within(menu).getByRole('menuitem', { name: /Ogłoszenia/ })).toHaveFocus();
  fireEvent.keyDown(menu, { key: 'ArrowUp' });
  expect(within(menu).getByRole('menuitem', { name: 'Wszystkie profile' })).toHaveFocus();
  fireEvent.keyDown(menu, { key: 'Escape' });
  expect(screen.getByRole('button', { name: 'Otwórz menu nawigacji' })).toHaveFocus();
  openNavigation();
  fireEvent.click(screen.getByRole('menuitem', { name: 'Jak działa' }));
  expect(mockNavigate).toHaveBeenCalledWith('/', { state: { scrollToId: 'how-showly-works' } });
  expect(screen.queryByRole('menu', { name: 'Nawigacja Showly' })).not.toBeInTheDocument();
});

test('outside touches close both menus and announcement selection closes navigation', async () => {
  await showNavbar();
  openNavigation();
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole('menu', { name: 'Nawigacja Showly' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Otwórz menu użytkownika' }));
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole('menu', { name: 'Moje konto' })).not.toBeInTheDocument();
  openNavigation();
  const link = screen.getByRole('menuitem', { name: /Ogłoszenia/ });
  expect(link).toHaveAttribute('href', '/ogloszenia');
  fireEvent.click(link);
  expect(screen.queryByRole('menu', { name: 'Nawigacja Showly' })).not.toBeInTheDocument();
});
