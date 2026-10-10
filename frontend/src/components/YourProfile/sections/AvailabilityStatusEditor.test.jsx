import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import AvailabilityStatusEditor from './AvailabilityStatusEditor';
import AvailabilityBadge from '../../ui/AvailabilityBadge/AvailabilityBadge';

function Editor() {
  const [data, onChange] = useState({});
  return <AvailabilityStatusEditor data={data} onChange={onChange} isEditing />;
}
test('choosing a status and writing a note updates its live preview', () => {
  render(<Editor />);
  fireEvent.click(screen.getByRole('button', { name: 'Przyjmuję nowe zlecenia' }));
  fireEvent.change(screen.getByPlaceholderText('Np. Zapraszam do współpracy przy nowych projektach'), { target: { value: 'Zapraszam do kontaktu' } });
  expect(screen.getByText('Zapraszam do kontaktu')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Nie pokazuj statusu' }));
  expect(screen.queryByText('Zapraszam do kontaktu')).toBeNull();
  expect(screen.getByText('Status dostępności jest ukryty.')).toBeTruthy();
});
test('date-specific status requires a start date and renders it once chosen', () => {
  render(<Editor />);
  fireEvent.click(screen.getByRole('button', { name: 'Wolne terminy od…' }));
  expect(screen.getByText('Uzupełnij dane statusu, aby pokazać go na profilu.')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Wolne terminy od'), { target: { value: '2099-10-12' } });
  expect(screen.getByText('Wolne terminy od 12 października 2099')).toBeTruthy();
});
test('an already open page hides an expired status without reloading', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-10T21:59:30Z'));
  const { unmount } = render(<AvailabilityBadge value={{ state: 'open', until: '2026-10-10' }} />);
  expect(screen.getByText('Przyjmuję nowe zlecenia')).toBeTruthy();
  act(() => jest.advanceTimersByTime(60000));
  expect(screen.queryByText('Przyjmuję nowe zlecenia')).toBeNull();
  unmount();
  jest.useRealTimers();
});
