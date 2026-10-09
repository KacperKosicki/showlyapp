import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';
import Register from './Register';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(), useLocation: () => ({ state: null }),
  Link: ({ to, state, children, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });
jest.mock('../../firebase', () => ({
  auth: { currentUser: null }, googleProvider: { addScope: jest.fn(), setCustomParameters: jest.fn() },
}));
jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(), sendEmailVerification: jest.fn(),
  onAuthStateChanged: jest.fn(() => jest.fn()), signOut: jest.fn(), updateProfile: jest.fn(), signInWithPopup: jest.fn(),
}));
jest.mock('axios', () => ({ get: jest.fn().mockResolvedValue({ data: { exists: false } }), post: jest.fn().mockResolvedValue({}) }));
jest.mock('../Footer/Footer', () => () => null);

beforeEach(() => {
  jest.clearAllMocks();
  onAuthStateChanged.mockReturnValue(jest.fn());
  axios.get.mockResolvedValue({ data: { exists: false } });
  axios.post.mockResolvedValue({});
  createUserWithEmailAndPassword.mockResolvedValue({ user: { email: 'test@example.com', uid: 'test-user', reload: jest.fn(), getIdToken: jest.fn().mockResolvedValue('test-token') } });
});
afterEach(() => { localStorage.clear(); sessionStorage.clear(); });
const renderRegister = () => render(<Register user={null} setUser={jest.fn()} setRefreshTrigger={jest.fn()} />);
const fillForm = (confirm = 'test-password') => {
  fireEvent.change(screen.getByLabelText('Imię i nazwisko'), { target: { value: 'Test User' } });
  fireEvent.change(screen.getByLabelText('Adres e-mail'), { target: { value: 'test@example.com' } });
  fireEvent.change(screen.getByLabelText('Hasło', { exact: true }), { target: { value: 'test-password' } });
  fireEvent.change(screen.getByLabelText('Powtórz hasło'), { target: { value: confirm } });
};

test('different passwords show a dismissible AlertBox before account creation', () => {
  const { container } = renderRegister(); fillForm('different-password');
  fireEvent.click(screen.getByRole('button', { name: 'Utwórz konto' }));
  const alert = screen.getByRole('alert');
  expect(alert).toHaveTextContent('Hasła nie są identyczne.');
  expect(container).not.toContainElement(alert);
  expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Zamknij komunikat' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('successful email registration keeps activation instructions visible after dismissing AlertBox', async () => {
  renderRegister(); fillForm();
  fireEvent.click(screen.getByRole('button', { name: 'Utwórz konto' }));
  await screen.findByRole('heading', { name: 'Sprawdź swoją skrzynkę' });
  expect(sendEmailVerification).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('alert')).toHaveTextContent('link aktywacyjny');
  fireEvent.click(screen.getByRole('button', { name: 'Zamknij komunikat' }));
  expect(screen.getByRole('heading', { name: 'Sprawdź swoją skrzynkę' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Przejdź do logowania' })).toHaveAttribute('href', '/login');
  expect(screen.queryByRole('button', { name: 'Utwórz konto' })).not.toBeInTheDocument();
});

test('closed Google popup shows its error and unlocks registration', async () => {
  signInWithPopup.mockRejectedValue({ code: 'auth/popup-closed-by-user' });
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  renderRegister();
  fireEvent.click(screen.getByRole('button', { name: 'Kontynuuj przez Google' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Okno logowania zostało zamknięte.'));
  expect(screen.getByRole('button', { name: 'Utwórz konto' })).toBeEnabled();
  expect(sessionStorage.getItem('authFlow')).toBeNull();
  log.mockRestore();
});
