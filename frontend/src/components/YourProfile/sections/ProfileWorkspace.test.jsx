import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileWorkspace, { getProfileMilestones } from './ProfileWorkspace';

test('tracks actual content, excludes inactive services and blank contact', () => {
  const steps = getProfileMilestones({ role: 'Fotograf', location: 'Poznań', description: ' ', theme: {}, services: [{ isActive: false }], photos: [], links: [], contact: { email: ' ' } });
  expect(steps.filter(step => step.ready).map(step => step.id)).toEqual(['basicInfoSection']);
});
test('navigation and progress update from the draft only while editing', () => {
  const profile = { role: 'Fotograf', location: 'Poznań' };
  const editData = { ...profile, description: 'Moja historia', services: [{ name: 'Sesja' }], contact: { email: 'kontakt@example.com' } };
  const { rerender } = render(<ProfileWorkspace profile={profile} editData={editData} isEditing={false} />);
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  expect(screen.getByRole('link', { name: /02 Historia/ })).toHaveAttribute('href', '#descriptionSection');
  rerender(<ProfileWorkspace profile={profile} editData={editData} isEditing />);
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '4');
  expect(screen.getByRole('link', { name: 'Wygląd', exact: true })).toHaveAttribute('href', '#appearanceSection');
});
