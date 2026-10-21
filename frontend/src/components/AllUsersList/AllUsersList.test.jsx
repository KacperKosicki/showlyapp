import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import AllUsersList from './AllUsersList';

jest.mock('axios', () => ({ get: jest.fn() }));
jest.mock('../../firebase', () => ({ auth: { currentUser: null } }));
jest.mock('../UserCard/UserCard', () => ({ user }) => <article><a href={`/u/${user.userId}`}>{user.name}</a></article>);
jest.mock('../ui/DataLoader/DataLoader', () => () => <span>Ładowanie</span>);

const profiles = ['Anna', 'Bartek', 'Celina', 'Damian'].map((name, index) => ({ userId: String(index), name, role: index === 0 ? 'Fotograf' : 'Trener' }));
const originalRect = HTMLElement.prototype.getBoundingClientRect;
const originalScrollBy = HTMLElement.prototype.scrollBy;
const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
const originalScrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
let viewportWidth;

beforeEach(() => {
  viewportWidth = 900;
  axios.get.mockResolvedValue({ data: profiles });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return this.id === 'showly-profile-track' ? viewportWidth : 0; } });
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get() { return this.id === 'showly-profile-track' ? this.children.length * 300 : 0; } });
  HTMLElement.prototype.getBoundingClientRect = function () {
    if (this.id === 'showly-profile-track') return { left: 0, right: viewportWidth, width: viewportWidth };
    if (this.parentElement?.id === 'showly-profile-track') {
      const left = Array.from(this.parentElement.children).indexOf(this) * 300 - this.parentElement.scrollLeft;
      return { left, right: left + 300, width: 300 };
    }
    return originalRect.call(this);
  };
  HTMLElement.prototype.scrollBy = jest.fn(function ({ left }) {
    this.scrollLeft = Math.max(0, Math.min(this.scrollWidth - this.clientWidth, this.scrollLeft + left));
    fireEvent.scroll(this);
  });
});

afterEach(() => {
  HTMLElement.prototype.getBoundingClientRect = originalRect;
  HTMLElement.prototype.scrollBy = originalScrollBy;
  for (const [key, descriptor] of [['clientWidth', originalClientWidth], ['scrollWidth', originalScrollWidth]]) {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, key, descriptor);
    else delete HTMLElement.prototype[key];
  }
});

const showCatalog = async () => {
  render(<AllUsersList />);
  return screen.findByRole('list', { name: 'Wszystkie profile Showly' });
};

test('desktop controls move the list and disable at either end', async () => {
  const track = await showCatalog();
  const previous = screen.getByRole('button', { name: 'Poprzednie profile' });
  const next = screen.getByRole('button', { name: 'Następne profile' });
  expect(previous).toBeDisabled();
  await waitFor(() => expect(next).toBeEnabled());
  fireEvent.click(next);
  expect(track.scrollLeft).toBe(300);
  expect(next).toBeDisabled();
  expect(previous).toBeEnabled();
  expect(screen.getByText('2–4')).toBeInTheDocument();
  fireEvent.click(previous);
  expect(track.scrollLeft).toBe(0);
  expect(previous).toBeDisabled();
});

test('keyboard scrolling preserves card controls and filtering resets the list', async () => {
  const track = await showCatalog();
  fireEvent.keyDown(within(track).getByRole('link', { name: 'Anna' }), { key: 'ArrowRight' });
  expect(HTMLElement.prototype.scrollBy).not.toHaveBeenCalled();
  fireEvent.keyDown(track, { key: 'ArrowRight' });
  expect(track.scrollLeft).toBe(300);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Fotograf' } });
  expect(within(track).getAllByRole('listitem')).toHaveLength(1);
  expect(track.scrollLeft).toBe(0);
  expect(screen.getByRole('button', { name: 'Następne profile' })).toBeDisabled();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'brak wyników' } });
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Pokaż wszystkie profile' }));
  expect(await screen.findByRole('list')).toBeInTheDocument();
});

test('native touch scrolling and resizing update the visible range', async () => {
  viewportWidth = 300;
  const track = await showCatalog();
  track.scrollLeft = 600;
  fireEvent.scroll(track);
  expect(screen.getByText('3', { selector: 'strong' })).toBeInTheDocument();
  viewportWidth = 600;
  fireEvent(window, new Event('resize'));
  await waitFor(() => expect(screen.getByText('3–4')).toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Następne profile' })).toBeDisabled();
});
