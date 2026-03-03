import axios from "axios";
import { auth } from "../firebase";

const API_URL = process.env.REACT_APP_API_URL;

export const api = axios.create({
  baseURL: API_URL,
});

// helper: czeka chwilę aż Firebase wystawi currentUser po starcie
function waitForAuthUser(timeoutMs = 1500) {
  return new Promise((resolve) => {
    const started = Date.now();
    const unsub = auth.onAuthStateChanged((user) => {
      unsub();
      resolve(user);
    });

    setTimeout(() => {
      // fallback – nie blokujemy w nieskończoność
      try { unsub(); } catch {}
      resolve(auth.currentUser || null);
    }, timeoutMs);

    // jeśli user już jest od razu
    if (auth.currentUser) {
      try { unsub(); } catch {}
      resolve(auth.currentUser);
    }

    // dodatkowe zabezpieczenie
    if (Date.now() - started > timeoutMs) resolve(auth.currentUser || null);
  });
}

api.interceptors.request.use(async (config) => {
  let user = auth.currentUser;

  if (!user) {
    user = await waitForAuthUser();
  }

  if (user) {
    const token = await user.getIdToken();
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});