import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import AnnouncementAuthor from './AnnouncementAuthor';

test('shows the account avatar and keeps a readable author name when the image fails', () => {
  const { container } = render(<AnnouncementAuthor name="Kacper Kosicki" avatar="https://example.com/account.jpg" />);
  const image = container.querySelector('img');
  expect(image).toHaveAttribute('src', 'https://example.com/account.jpg');
  expect(screen.getByText('Kacper Kosicki')).toBeInTheDocument();
  fireEvent.error(image);
  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('svg')).toBeInTheDocument();
  expect(screen.getByText('Kacper Kosicki')).toBeInTheDocument();
});
