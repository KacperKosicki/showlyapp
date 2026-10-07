import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ShowlyJourney from './ShowlyJourney';
jest.mock('react-router-dom', () => ({ useLocation: () => ({ state: null }), Link: ({ to, state, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });

test('moving through stages builds the preview and going back removes later features', () => {
    render(<ShowlyJourney />);
    const preview = screen.getByLabelText('Przykładowa wizytówka');
    expect(screen.getByRole('button', { name: 'Poprzedni etap' })).toBeDisabled();
    expect(within(preview).queryByText('Adres do udostępnienia')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Następny etap/ }));
    expect(within(preview).getByText('Twoja oferta')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Następny etap/ }));
    expect(within(preview).getByText('showly.me/twoja-nazwa')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Poprzedni etap' }));
    expect(within(preview).queryByText('Adres do udostępnienia')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Oferta/ })).toHaveAttribute('aria-pressed', 'true');
});
test('any stage can be selected directly and the final action opens profile creation', () => {
    render(<ShowlyJourney />);
    fireEvent.click(screen.getByRole('button', { name: /Rozmowa/ }));
    expect(screen.getByRole('heading', { name: 'Teraz kolej na kontakt.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Teraz Twój profil' })).toHaveAttribute('href', '/stworz-profil');
    fireEvent.click(screen.getByRole('button', { name: /01.*Profil/ }));
    expect(screen.getByRole('button', { name: /Następny etap/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Poprzedni etap' })).toBeDisabled();
});
