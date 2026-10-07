import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import useScrollReveal from './useScrollReveal';

function Fixture() {
  const ref = useScrollReveal();
  return <section ref={ref}><div data-reveal>Treść sekcji</div></section>;
}

const originalObserver = global.IntersectionObserver;
const originalMatchMedia = window.matchMedia;
afterEach(() => {
  global.IntersectionObserver = originalObserver;
  window.matchMedia = originalMatchMedia;
});

test('reveals each intersecting block once and disconnects on unmount', () => {
  let notify;
  const observer = { observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() };
  global.IntersectionObserver = jest.fn(callback => { notify = callback; return observer; });
  const { unmount } = render(<Fixture />);
  const block = screen.getByText('Treść sekcji');
  expect(block).toHaveAttribute('data-reveal-state', 'pending');
  notify([{ target: block, isIntersecting: false }]);
  expect(block).toHaveAttribute('data-reveal-state', 'pending');
  notify([{ target: block, isIntersecting: true }]);
  expect(block).toHaveAttribute('data-reveal-state', 'visible');
  expect(observer.unobserve).toHaveBeenCalledWith(block);
  unmount();
  expect(observer.disconnect).toHaveBeenCalledTimes(1);
});

test('keeps content visible when IntersectionObserver is unavailable', () => {
  global.IntersectionObserver = undefined;
  render(<Fixture />);
  expect(screen.getByText('Treść sekcji')).not.toHaveAttribute('data-reveal-state');
});

test('does not hide content or observe when reduced motion is enabled', () => {
  window.matchMedia = () => ({ matches: true });
  global.IntersectionObserver = jest.fn();
  render(<Fixture />);
  expect(screen.getByText('Treść sekcji')).not.toHaveAttribute('data-reveal-state');
  expect(global.IntersectionObserver).not.toHaveBeenCalled();
});
