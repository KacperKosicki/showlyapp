import {
  getMessaging,
  getToken,
  deleteToken,
  onMessage,
  isSupported,
} from "firebase/messaging";
import { auth, app } from "../firebase";

const API = process.env.REACT_APP_API_URL;
const VAPID_KEY =
  "BF4lpMmvvJ8qgRyp7zOQSnlrJ1JRUfgxj4vpKOjokBar3PvxJnL5Y7d6iNMvXGE_D64DF1Ljl70FpOvM3ZzMnoA";

let messagingInstance = null;
let foregroundBound = false;

async function getAuthHeader() {
  const u = auth.currentUser;
  if (!u) return {};

  const token = await u.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function getMessagingSafe() {
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;

  if (!messagingInstance) {
    messagingInstance = getMessaging(app);
  }

  return messagingInstance;
}

export async function registerPushServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.log("❌ Browser nie obsługuje service worker");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    await navigator.serviceWorker.ready;

    console.log("✅ Service Worker zarejestrowany:", registration);
    return registration;
  } catch (error) {
    console.error("❌ Błąd rejestracji service workera:", error);
    return null;
  }
}

export const enablePushNotifications = async (uid) => {
  try {
    if (!uid) {
      console.log("❌ Brak uid użytkownika");
      return { success: false, reason: "no-uid" };
    }

    if (!("Notification" in window)) {
      console.log("❌ Ta przeglądarka nie obsługuje powiadomień");
      return { success: false, reason: "unsupported" };
    }

    const messaging = await getMessagingSafe();
    if (!messaging) {
      console.log("❌ Firebase Messaging nie jest wspierany w tej przeglądarce");
      return { success: false, reason: "unsupported" };
    }

    let permission = Notification.permission;

    if (permission !== "granted") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      console.log("❌ Brak zgody na powiadomienia");
      return { success: false, reason: "denied" };
    }

    const registration = await registerPushServiceWorker();
    if (!registration) {
      return { success: false, reason: "sw-register-failed" };
    }

    const fcmToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!fcmToken) {
      console.log("❌ Nie udało się pobrać tokenu FCM");
      return { success: false, reason: "no-token" };
    }

    const authHeader = await getAuthHeader();

    const res = await fetch(`${API}/api/users/save-push-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify({ uid, token: fcmToken }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("❌ save-push-token response:", data);
      return {
        success: false,
        reason: "save-token-failed",
        error: data,
      };
    }

    console.log("✅ FCM token zapisany:", fcmToken);
    console.log("✅ save-push-token response:", data);

    return { success: true, token: fcmToken };
  } catch (error) {
    console.error("❌ Błąd włączania powiadomień:", error);
    return { success: false, reason: "error", error };
  }
};

export const disablePushNotifications = async (uid) => {
  try {
    if (!uid) {
      return { success: false, reason: "no-uid" };
    }

    const messaging = await getMessagingSafe();
    if (!messaging) {
      return { success: false, reason: "unsupported" };
    }

    const registration = await registerPushServiceWorker();
    if (!registration) {
      return { success: false, reason: "sw-register-failed" };
    }

    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!currentToken) {
      return { success: false, reason: "no-token" };
    }

    const authHeader = await getAuthHeader();

    const res = await fetch(`${API}/api/users/remove-push-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify({ uid, token: currentToken }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("❌ remove-push-token response:", data);
      return {
        success: false,
        reason: "remove-token-failed",
        error: data,
      };
    }

    await deleteToken(messaging).catch((err) => {
      console.warn("⚠️ deleteToken warning:", err);
    });

    console.log("✅ Push wyłączony dla urządzenia:", currentToken);
    console.log("✅ remove-push-token response:", data);

    return { success: true };
  } catch (error) {
    console.error("❌ Błąd wyłączania powiadomień:", error);
    return { success: false, reason: "error", error };
  }
};

export async function initForegroundPushListener() {
  try {
    if (foregroundBound) return;

    const messaging = await getMessagingSafe();
    if (!messaging) return;

    onMessage(messaging, (payload) => {
      console.log("📩 Foreground message:", payload);

      const title = payload?.data?.title || "Nowe powiadomienie";
      const body = payload?.data?.body || "Masz nowe zdarzenie";
      const url = payload?.data?.url || "/";

      if (Notification.permission === "granted") {
        const n = new Notification(title, {
          body,
          icon: "/logo192.png",
        });

        n.onclick = () => {
          window.focus();
          window.location.href = url;
        };
      }
    });

    foregroundBound = true;
    console.log("✅ Foreground listener aktywny");
  } catch (error) {
    console.error("❌ initForegroundPushListener error:", error);
  }
}

export const getBrowserNotificationState = () => {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission; // default | granted | denied
};