import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PortfolioEditor from './PortfolioEditor';
import PortfolioProjects from '../../PublicProfile/PortfolioProjects';
import { projectPhoto, validateProjects } from '../../../utils/profileProjects';

const initial = [{ title: 'Pierwszy projekt' }, { title: 'Drugi projekt' }];
function Editor() {
  const [editData, setEditData] = useState({ projects: initial, photos: [{ publicId: 'photo-1', url: 'https://example.com/photo.jpg' }] });
  return <PortfolioEditor editData={editData} isEditing setEditData={setEditData} />;
}
test('editing, reordering and removing projects updates the draft', () => {
  render(<Editor />);
  fireEvent.change(screen.getAllByPlaceholderText('Np. Identyfikacja wizualna lokalnej kawiarni')[0], { target: { value: 'Nowy tytuł' } });
  fireEvent.click(screen.getByRole('button', { name: 'Przesuń realizację 1 w dół' }));
  expect(screen.getAllByPlaceholderText('Np. Identyfikacja wizualna lokalnej kawiarni')[1].value).toBe('Nowy tytuł');
  fireEvent.click(screen.getByRole('button', { name: 'Usuń realizację 1' }));
  expect(screen.queryByDisplayValue('Drugi projekt')).toBeNull();
  expect(screen.getByDisplayValue('Nowy tytuł')).toBeTruthy();
});
test('six projects disables adding and missing titles prevent saving', () => {
  render(<PortfolioEditor editData={{ projects: Array.from({ length: 6 }, () => ({ title: '' })) }} isEditing setEditData={jest.fn()} />);
  expect(screen.getByRole('button', { name: /Dodaj realizację/ }).disabled).toBe(true);
  expect(validateProjects([{ title: '  ' }])).toContain('tytuł');
  expect(validateProjects([{ title: 'Projekt' }])).toBe('');
});
test('portfolio resolves gallery images only and opens the chosen photo', () => {
  const onOpenPhoto = jest.fn();
  const photos = [{ publicId: 'photo-1', url: 'https://example.com/photo.jpg' }];
  const project = { title: 'Projekt', photoKey: 'photo-1', outcome: 'Nowa identyfikacja', featured: true };
  render(<PortfolioProjects projects={[project]} photos={photos} onOpenPhoto={onOpenPhoto} />);
  fireEvent.click(screen.getByRole('button', { name: 'Otwórz zdjęcie realizacji: Projekt' }));
  expect(onOpenPhoto).toHaveBeenCalledWith(photos[0].url);
  expect(screen.getByText('Nowa identyfikacja')).toBeTruthy();
  expect(projectPhoto({ photoKey: 'javascript:alert(1)' }, photos)).toBeUndefined();
  expect(projectPhoto(project, [])).toBeUndefined();
  expect(projectPhoto({ photoKey: 'https://example.com/old.jpg' }, [{ url: 'https://example.com/old.jpg?v=123' }])).toBeTruthy();
});
