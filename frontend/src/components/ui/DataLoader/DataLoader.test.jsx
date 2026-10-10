import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DataLoader from './DataLoader';

test('announces the pending data while keeping decorative placeholders hidden', () => {
  const { container } = render(<DataLoader label="Ładujemy ogłoszenia…" layout="cards" />);
  expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  expect(screen.getByText('Ładujemy ogłoszenia…')).toBeVisible();
  expect(container.querySelector('[data-skeleton]').closest('[aria-hidden]')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});
test('compact states can be embedded in text without adding a skeleton or block element', () => {
  const { container } = render(<p><DataLoader label="Ładujemy konto…" compact /></p>);
  expect(screen.getByRole('status').tagName).toBe('SPAN');
  expect(container.querySelector('[data-skeleton]')).toBeNull();
});
