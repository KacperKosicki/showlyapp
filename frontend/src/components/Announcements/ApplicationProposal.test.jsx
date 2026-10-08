import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ApplicationProposal from './ApplicationProposal';

jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
const application = {
  status: 'pending', message: 'Mam doświadczenie i chętnie poprowadzę wydarzenie.', proposedBudget: 3000,
  profileId: { name: 'DJ Studio', slug: 'dj-studio', role: 'DJ na wesele', location: 'Poznań', rating: 4.8, reviews: 12, tags: ['Wesela', 'Nagłośnienie'], banner: { url: 'https://example.com/banner.jpg' }, avatar: { url: 'https://example.com/avatar.jpg' } },
};

test('proposal presents public profile identity and preserves the three response actions', () => {
  const onConversation = jest.fn(), onStatus = jest.fn();
  const { container } = render(<ApplicationProposal application={application} onConversation={onConversation} onStatus={onStatus} />);
  expect(screen.getByRole('link', { name: 'Zobacz profil: DJ Studio' })).toHaveAttribute('href', '/dj-studio');
  expect(screen.getByText('Poznań')).toBeInTheDocument();
  expect(screen.getByText('4.8 · 12 opinii')).toBeInTheDocument();
  expect(container.querySelector('img[src="https://example.com/banner.jpg"]')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Rozmowa' }));
  fireEvent.click(screen.getByRole('button', { name: 'Do dalszej rozmowy' }));
  fireEvent.click(screen.getByRole('button', { name: 'Odrzuć' }));
  expect(onConversation).toHaveBeenCalledTimes(1);
  expect(onStatus.mock.calls).toEqual([['shortlisted'], ['declined']]);
  expect(screen.getAllByRole('button')).toHaveLength(3);
});

test('a withdrawn proposal retains conversation access and handles a removed profile', () => {
  render(<ApplicationProposal application={{ ...application, status: 'withdrawn', profileId: null }} onConversation={jest.fn()} onStatus={jest.fn()} />);
  expect(screen.getByText('Profil niedostępny')).toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Rozmowa' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Odrzuć' })).not.toBeInTheDocument();
});

test('a failed avatar displays the profile initial instead of requesting another missing image', () => {
  const { container } = render(<ApplicationProposal application={application} onConversation={jest.fn()} onStatus={jest.fn()} />);
  fireEvent.error(container.querySelector('img[src="https://example.com/avatar.jpg"]'));
  expect(screen.getByText('D')).toBeInTheDocument();
  expect(container.querySelector('img[src="https://example.com/avatar.jpg"]')).not.toBeInTheDocument();
});
