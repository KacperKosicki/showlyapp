import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReservationActionDialog from './ReservationActionDialog';

const defaults = {title: 'Anulować rezerwację?', description: 'Usługodawca zobaczy powód.', label: 'Powód anulowania', confirmText: 'Anuluj rezerwację'};

test('an optional empty reason still requires explicit submission', () => {
  const onComplete = jest.fn();
  render(<ReservationActionDialog {...defaults} onComplete={onComplete} />);
  expect(onComplete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {name: 'Anuluj rezerwację'}));
  expect(onComplete).toHaveBeenCalledWith('');
});

test('keeps a required short message in the dialog and submits a valid trimmed message', () => {
  const onComplete = jest.fn();
  render(<ReservationActionDialog {...defaults} required minLength={5} onComplete={onComplete} />);
  const field = screen.getByLabelText('Powód anulowania');
  fireEvent.change(field, {target: {value: '   hi  '}});
  fireEvent.click(screen.getByRole('button', {name: 'Anuluj rezerwację'}));
  expect(screen.getByRole('alert')).toHaveTextContent('co najmniej 5 znaków');
  expect(onComplete).not.toHaveBeenCalled();
  fireEvent.change(field, {target: {value: '  Będę na czas!  '}});
  fireEvent.click(screen.getByRole('button', {name: 'Anuluj rezerwację'}));
  expect(onComplete).toHaveBeenCalledWith('Będę na czas!');
});

test('Escape cancels, locks background scrolling and restores focus after unmount', () => {
  const button = document.createElement('button');
  document.body.append(button); button.focus();
  const onComplete = jest.fn();
  const {unmount} = render(<ReservationActionDialog {...defaults} onComplete={onComplete} />);
  expect(screen.getByLabelText('Powód anulowania')).toHaveFocus();
  expect(document.body.style.overflow).toBe('hidden');
  fireEvent.keyDown(document, {key: 'Escape'});
  expect(onComplete).toHaveBeenCalledWith(null);
  unmount(); expect(button).toHaveFocus(); expect(document.body.style.overflow).toBe('');
  button.remove();
});

test('wraps keyboard focus inside the dialog', () => {
  render(<ReservationActionDialog {...defaults} onComplete={jest.fn()} />);
  screen.getByRole('button', {name: 'Anuluj rezerwację'}).focus();
  fireEvent.keyDown(document, {key: 'Tab'});
  expect(screen.getByRole('button', {name: 'Zamknij okno'})).toHaveFocus();
  fireEvent.keyDown(document, {key: 'Tab', shiftKey: true});
  expect(screen.getByRole('button', {name: 'Anuluj rezerwację'})).toHaveFocus();
});
