import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import WhyUs from './WhyUs';
jest.mock('react-router-dom', () => ({ Link: ({ to, state, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
test('switches perspective with keyboard and shows the creator action', () => {
  render(<WhyUs />);
  const tabs = screen.getAllByRole('tab');
  fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
  expect(tabs[1]).toHaveFocus();
  expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'why-tab-creating');
  expect(screen.getByRole('heading', { name: 'Ten profil jest Twój.' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Zaprojektuj swój profil' })).toHaveAttribute('href', '/stworz-profil');
});
test('selected benefit changes the preview and resets when the audience changes', () => {
  render(<WhyUs />);
  fireEvent.click(screen.getByRole('button', { name: /Dobry profil prowadzi dalej/ }));
  expect(screen.getByRole('heading', { name: 'Od pomysłu do rozmowy.' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Tworzę swój profil' }));
  const preview = screen.getByLabelText('Co daje Ci Showly');
  expect(within(preview).getByText('Ten profil jest Twój.')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Od pomysłu do rozmowy.' })).not.toBeInTheDocument();
});
