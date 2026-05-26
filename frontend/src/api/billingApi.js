import axios from "axios";
import { auth } from "../firebase";

const API_URL = process.env.REACT_APP_API_URL;

const getAuthHeaders = async () => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Brak zalogowanego użytkownika.");
  }

  const token = await user.getIdToken();

  return {
    Authorization: `Bearer ${token}`,
  };
};

// Pobranie aktualnego statusu billingu / planu
export const getBillingStatus = async () => {
  const headers = await getAuthHeaders();

  const res = await axios.get(`${API_URL}/api/billing/status`, {
    headers,
  });

  return res.data;
};

// Checkout dla subskrypcji Standard / Premium
export const startSubscriptionCheckout = async (plan) => {
  const headers = await getAuthHeaders();

  const res = await axios.post(
    `${API_URL}/api/billing/checkout-subscription`,
    { plan },
    { headers }
  );

  return res.data;
};

// Stripe Billing Portal — zarządzanie subskrypcją
export const openBillingPortal = async () => {
  const headers = await getAuthHeaders();

  const res = await axios.post(
    `${API_URL}/api/billing/portal`,
    {},
    { headers }
  );

  return res.data;
};

// Jednorazowe przedłużenie widoczności profilu o 30 dni
export const startExtensionCheckout = async () => {
  const headers = await getAuthHeaders();

  const res = await axios.post(
    `${API_URL}/api/billing/checkout-extension`,
    {},
    { headers }
  );

  return res.data;
};