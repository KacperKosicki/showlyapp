import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import BillingSection from './BillingSection';
const props = { billingLimits: { photos: 15, services: 20, staff: 3 }, billingLabel: 'Premium — testy', billingPlan: 'premium' };
test('beta explains free access and removes purchase and payment recovery actions', () => {
  render(<BillingSection {...props} betaPremiumEnabled />);
  expect(screen.getByText('Premium dla każdego. Na czas testów.')).toBeInTheDocument();
  expect(screen.getByText('Bezpłatny dostęp testowy')).toBeInTheDocument();
  expect(screen.queryByText('02 / Wybierz plan dla siebie')).not.toBeInTheDocument();
  expect(screen.queryByText('Sprawdź płatność i przywróć profil')).not.toBeInTheDocument();
  expect(screen.queryByText('Zarządzaj subskrypcją')).not.toBeInTheDocument();
});
test('beta hides the entire portal section even when the API allows managing a subscription', () => {
  render(<BillingSection {...props} betaPremiumEnabled canManageSubscription />);
  expect(screen.queryByRole('button', { name: 'Zarządzaj subskrypcją' })).not.toBeInTheDocument();
  expect(screen.queryByText(/Subskrypcją możesz zarządzać/)).not.toBeInTheDocument();
});
test('an existing subscription is manageable after beta ends', () => {
  render(<BillingSection {...props} canManageSubscription />);
  expect(screen.getByRole('button', { name: 'Zarządzaj subskrypcją' })).toBeEnabled();
});
