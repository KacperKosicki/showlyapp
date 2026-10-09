import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { fetchSignInMethodsForEmail, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import Login from './Login';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null }),
  Link: ({ to, state, children, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });
jest.mock('../../firebase', () => ({
  auth: { currentUser: { reload: jest.fn(), emailVerified: true, email: 'test@example.com', uid: 'test-user', getIdToken: jest.fn().mockResolvedValue('test-token') } },
  googleProvider: {},
}));
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(), signInWithPopup: jest.fn(), sendEmailVerification: jest.fn(),
  fetchSignInMethodsForEmail: jest.fn(), sendPasswordResetEmail: jest.fn(), signOut: jest.fn(),
}));
jest.mock('axios', () => ({ post: jest.fn().mockResolvedValue({}) }));
jest.mock('../Footer/Footer', () => () => null);

beforeEach(() => {
  jest.clearAllMocks();
  fetchSignInMethodsForEmail.mockResolvedValue([]);
  signInWithEmailAndPassword.mockResolvedValue({});
  sendPasswordResetEmail.mockResolvedValue();
});
afterEach(() => { jest.useRealTimers(); localStorage.clear(); sessionStorage.clear(); });

const renderLogin = () => render(<Login setUser={jest.fn()} setRefreshTrigger={jest.fn()} />);
const fillCredentials = () => {
  fireEvent.change(screen.getByLabelText('Adres e-mail'), { target: { value: 'test@example.com' } });
  fireEvent.change(screen.getByLabelText('Hasło'), { target: { value: 'test-password' } });
};

test('reset without an email shows a dismissible AlertBox outside the form', () => {
  const { container } = renderLogin();
  fireEvent.click(screen.getByRole('button', { name: 'Nie pamiętasz hasła?' }));
  const alert = screen.getByRole('alert');
  expect(alert).toHaveTextContent('Najpierw wpisz swój adres e-mail');
  expect(container).not.toContainElement(alert);
  expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Zamknij komunikat' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('password reset replaces the progress notice with success and unlocks the form', async () => {
  let resolveReset;
  sendPasswordResetEmail.mockImplementation(() => new Promise(resolve => { resolveReset = resolve; }));
  renderLogin();
  fireEvent.change(screen.getByLabelText('Adres e-mail'), { target: { value: 'test@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Nie pamiętasz hasła?' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Wysyłamy link do resetu hasła');
  expect(screen.getByLabelText('Adres e-mail')).toBeDisabled();
  await waitFor(() => expect(sendPasswordResetEmail).toHaveBeenCalled());
  await act(async () => { resolveReset(); });
  expect(screen.getByRole('alert')).toHaveTextContent('Wysłaliśmy link do resetu hasła');
  expect(screen.getByLabelText('Adres e-mail')).toBeEnabled();
});

test('failed login displays its error in AlertBox and permits another attempt', async () => {
  signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/invalid-credential' });
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  renderLogin(); fillCredentials();
  fireEvent.click(screen.getByRole('button', { name: 'Zaloguj się' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Nieprawidłowy e-mail lub hasło.'));
  expect(screen.getByRole('button', { name: 'Zaloguj się' })).toBeEnabled();
  expect(mockNavigate).not.toHaveBeenCalled();
  log.mockRestore();
});

test('successful verified login shows success before its existing redirect', async () => {
  jest.useFakeTimers();
  renderLogin(); fillCredentials();
  fireEvent.click(screen.getByRole('button', { name: 'Zaloguj się' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Pomyślnie zalogowano. Przekierowuję'));
  expect(mockNavigate).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1500));
  expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
});
