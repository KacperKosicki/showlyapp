import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileTour from './ProfileTour';

beforeEach(() => window.localStorage.clear());

test('moves the highlight between sections and remembers dismissal per account', () => {
  const { unmount } = render(
    <>
      <ProfileTour userId="first" />
      <section id="basicInfoSection" aria-label="Dane" />
      <section id="descriptionSection" aria-label="Opis wizytówki" />
    </>
  );

  const basic = screen.getByRole('region', { name: 'Dane' });
  const description = screen.getByRole('region', { name: 'Opis wizytówki' });
  basic.scrollIntoView = jest.fn();
  description.scrollIntoView = jest.fn();

  fireEvent.click(screen.getByRole('button', { name: 'Rozpocznij samouczek' }));
  expect(screen.getByRole('complementary', { name: 'Samouczek wizytówki' }).parentElement).toBe(document.body);
  expect(basic).toHaveClass('tourTarget');
  expect(basic.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });

  fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
  expect(basic).not.toHaveClass('tourTarget');
  expect(description).toHaveClass('tourTarget');

  fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
  expect(basic).toHaveClass('tourTarget');

  fireEvent.click(screen.getByRole('button', { name: 'Zamknij' }));
  expect(basic).not.toHaveClass('tourTarget');
  expect(screen.getByRole('button', { name: 'Pokaż samouczek' })).toHaveFocus();

  unmount();
  const { rerender } = render(<ProfileTour key="first" userId="first" />);
  expect(screen.getByRole('button', { name: 'Pokaż samouczek' })).toBeInTheDocument();
  rerender(<ProfileTour key="second" userId="second" />);
  expect(screen.getByRole('button', { name: 'Rozpocznij samouczek' })).toBeInTheDocument();
});
