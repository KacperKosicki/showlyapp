import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppearanceSection from './AppearanceSection';
import { normalizeProfileDesign } from '../../../utils/profileDesign';
const Profile = { name:'Kacper Kosicki', slug:'kacper-kosicki-junior-fullstack-developer' };
function Editor({allowed=true, editing=true}) {
  const [editData,setEditData]=useState({theme:normalizeProfileDesign()});
  return <><AppearanceSection profile={Profile} editData={editData} isEditing={editing} canUsePremiumThemes={allowed} onEditDataChange={setEditData}/><output data-testid="design">{JSON.stringify(editData.theme)}</output></>;
}
const current = () => JSON.parse(screen.getByTestId('design').textContent);
test('changes colors, content, visibility and order in the editable design', () => {
  render(<Editor/>);
  fireEvent.change(screen.getByLabelText('Akcent główny'),{target:{value:'#123456'}});
  fireEvent.change(screen.getByLabelText('Krótki tekst na wizytówce'),{target:{value:'Nowy pomysł'}});
  fireEvent.click(screen.getByLabelText('Galeria zdjęć'));
  fireEvent.click(screen.getByRole('button',{name:'Przesuń wyżej: Oferta'}));
  expect(current().primary).toBe('#123456');expect(current().tagline).toBe('Nowy pomysł');
  expect(current().sections.gallery).toBe(false);expect(current().sectionOrder[0]).toBe('services');
  expect(screen.getByLabelText('Podgląd wyglądu wizytówki').textContent).toContain('Nowy pomysł');
});
test('presets change style without removing personalized content', () => {
  render(<Editor/>);
  fireEvent.change(screen.getByLabelText('Tekst przycisku wiadomości'),{target:{value:'Porozmawiajmy'}});
  fireEvent.click(screen.getByRole('button',{name:'Pracownia'}));
  expect(current().headingFont).toBe('serif');expect(current().ctaLabel).toBe('Porozmawiajmy');
});
test('requires both edit mode and eligible plan', () => {
  const {rerender}=render(<Editor allowed={false}/>);
  expect(screen.getByLabelText('Czcionka nagłówków').closest('fieldset').disabled).toBe(true);
  rerender(<Editor editing={false}/>);
  expect(screen.getByLabelText('Czcionka nagłówków').closest('fieldset').disabled).toBe(true);
});

test('keeps spaces while typing both texts and changing other design settings', () => {
  render(<Editor/>);
  const tagline = screen.getByLabelText('Krótki tekst na wizytówce');
  const cta = screen.getByLabelText('Tekst przycisku wiadomości');
  userEvent.type(tagline, 'Moja nowa marka ');
  userEvent.type(cta, 'Napisz do mnie ');
  fireEvent.change(screen.getByLabelText('Czcionka nagłówków'), {target:{value:'serif'}});
  expect(tagline.value).toBe('Moja nowa marka ');
  expect(cta.value).toBe('Napisz do mnie ');
  expect(normalizeProfileDesign(current()).ctaLabel).toBe('Napisz do mnie');
});

test('color palettes preserve layout, fonts and draft content', () => {
  render(<Editor/>);
  fireEvent.change(screen.getByLabelText('Układ wizytówki'), {target:{value:'stacked'}});
  userEvent.type(screen.getByLabelText('Krótki tekst na wizytówce'), 'Moja marka ');
  fireEvent.click(screen.getByRole('button', {name:'Paleta Ocean'}));
  expect(current().primary).toBe('#20566b');
  expect(current().layout).toBe('stacked');
  expect(current().headingFont).toBe('poppins');
  expect(current().tagline).toBe('Moja marka ');
});

test('preview width is local and does not change the saved design', () => {
  render(<Editor/>);
  const before = current();
  fireEvent.click(screen.getByRole('button', {name:'Telefon'}));
  expect(screen.getByRole('button', {name:'Telefon'}).getAttribute('aria-pressed')).toBe('true');
  expect(current()).toEqual(before);
  fireEvent.click(screen.getByRole('button', {name:'Szeroki'}));
  expect(screen.getByRole('button', {name:'Szeroki'}).getAttribute('aria-pressed')).toBe('true');
});
test('edits new appearance settings and applies them to the preview', () => {
  render(<Editor/>);
  fireEvent.change(screen.getByLabelText('Kształt zdjęcia profilowego'),{target:{value:'circle'}});
  fireEvent.change(screen.getByLabelText('Rodzaj obramowania'),{target:{value:'dashed'}});
  fireEvent.change(screen.getByLabelText('Przyciemnienie bannera'),{target:{value:'75'}});
  fireEvent.change(screen.getByLabelText('Wyrównanie danych na bannerze'),{target:{value:'left'}});
  fireEvent.change(screen.getByLabelText('Styl przycisków'),{target:{value:'outline'}});
  expect(current()).toMatchObject({avatarShape:'circle',borderStyle:'dashed',bannerOverlay:75,heroAlignment:'left',buttonStyle:'outline'});
  const preview=screen.getByLabelText('Podgląd wyglądu wizytówki').querySelector('[data-design]');
  expect(preview.getAttribute('data-alignment')).toBe('left');
  expect(preview.style.getPropertyValue('--pd-avatar-radius')).toBe('50%');
  expect(preview.style.getPropertyValue('--pd-banner-overlay')).toBe('0.75');
});
