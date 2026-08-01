// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from "react-router-dom";
import { lazy, Suspense, useState, useEffect, useMemo, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

// Elementy potrzebne od razu na stronie głównej pozostają w głównym bundle.
import Navbar from "./components/Navbar/Navbar";
import Hero from "./components/Hero/Hero";
import UserCardList from "./components/UserCardList/UserCardList";
import WhyUs from "./components/WhyUs/WhyUs";
import AllUsersList from "./components/AllUsersList/AllUsersList";
import Footer from "./components/Footer/Footer";
import AboutApp from "./components/AboutApp/AboutApp";
import ScrollToTop from "./components/ScrollToTop/ScrollToTop";
import PartnersShowcase from "./components/PartnersShowcase/PartnersShowcase";
import PromotedProfiles from "./components/PromotedProfiles/PromotedProfiles";
import HowShowlyWorks from "./components/HowShowlyWorks/HowShowlyWorks";
import DiscoverShowly from "./components/DiscoverShowly/DiscoverShowly";
import AlertBox from "./components/AlertBox/AlertBox";
import CookieBanner from "./components/CookieBanner/CookieBanner";
import AppLoader from "./components/AppLoader/AppLoader";
import AdminRoute from "./components/auth/AdminRoute";

// Widoki tras pobieramy dopiero wtedy, gdy użytkownik faktycznie na nie wejdzie.
const Register = lazy(() => import("./components/Register/Register"));
const Login = lazy(() => import("./components/Login/Login"));
const VerifySuccess = lazy(() => import("./components/VerifySuccess/VerifySuccess"));
const CreateProfile = lazy(() => import("./components/CreateProfile/CreateProfile"));
const YourProfile = lazy(() => import("./components/YourProfile/YourProfile"));
const PublicProfile = lazy(() => import("./components/PublicProfile/PublicProfile"));
const MessageForm = lazy(() => import("./components/MessageForm/MessageForm"));
const Notifications = lazy(() => import("./components/Notifications/Notifications"));
const ThreadView = lazy(() => import("./components/ThreadView/ThreadView"));
const BookingForm = lazy(() => import("./components/BookingForm/BookingForm"));
const ReservationList = lazy(() => import("./components/ReservationList/ReservationList"));
const AccountSettings = lazy(() => import("./components/AccountSettings/AccountSettings"));
const Favorites = lazy(() => import("./components/Favorites/Favorites"));
const BillingSuccess = lazy(() => import("./components/BillingSuccess/BillingSuccess"));
const BillingCancel = lazy(() => import("./components/BillingCancel/BillingCancel"));
const SearchResults = lazy(() => import("./components/SearchResults/SearchResults"));
const Contact = lazy(() => import("./components/Contact/Contact"));
const Regulations = lazy(() => import("./components/Regulations/Regulations"));
const CookiesPolicy = lazy(() => import("./components/CookiesPolicy/CookiesPolicy"));
const ShowlyJourney = lazy(() => import("./components/ShowlyJourney/ShowlyJourney"));
const ProfilesHub = lazy(() => import("./components/ProfilesHub/ProfilesHub"));
const AdminPanel = lazy(() => import("./components/AdminPanel/AdminPanel"));

const API = process.env.REACT_APP_API_URL;

function LegacyProfileRedirect() {
  const { slug } = useParams();

  return <Navigate to={`/${slug || ""}`} replace />;
}

function AuthRoute({ user, loading, children }) {
  if (loading) return <AppLoader />;

  return user ? children : <Navigate to="/login" replace />;
}

function GuestOnlyRoute({ user, loading, isAuthFlow, children }) {
  if (loading) return <AppLoader />;

  return user && !isAuthFlow ? <Navigate to="/" replace /> : children;
}

function AdminAccessRoute({ user, role, loading, children }) {
  if (loading) return <AppLoader />;

  return (
    <AdminRoute user={user} role={role}>
      {children}
    </AdminRoute>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [token, setToken] = useState(null);
  const [loadingToken, setLoadingToken] = useState(true);

  const [userRole, setUserRole] = useState("user");
  const [loadingRole, setLoadingRole] = useState(true);

  const [refreshTrigger, setRefreshTrigger] = useState(Date.now());
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingReservationsCount, setPendingReservationsCount] = useState(0);

  const [alert, setAlert] = useState(null);

  const [hasProfile, setHasProfile] = useState(false);
  const [loadingProfileStatus, setLoadingProfileStatus] = useState(false);

  const resetPendingReservationsCount = () => setPendingReservationsCount(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(Date.now());
  }, []);

  const safeUser = useMemo(() => {
    if (!user?.uid) return null;
    return { uid: user.uid, email: user.email || "" };
  }, [user?.uid, user?.email]);

  const authFetch = useCallback(
    (url, options = {}) => {
      const headers = {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      return fetch(url, { ...options, headers });
    },
    [token]
  );

  useEffect(() => {
    if (!safeUser?.uid || !token) {
      setHasProfile(false);
      setLoadingProfileStatus(false);
      return;
    }

    const controller = new AbortController();

    const checkProfile = async () => {
      try {
        setLoadingProfileStatus(true);

        const res = await authFetch(`${API}/api/profiles/by-user/${safeUser.uid}`, {
          signal: controller.signal,
        });

        if (res.status === 404) {
          setHasProfile(false);
          return;
        }

        if (!res.ok) {
          setHasProfile(false);
          return;
        }

        const data = await res.json();

        setHasProfile(Boolean(data));
      } catch (err) {
        if (err?.name === "AbortError") return;

        console.error("❌ Błąd sprawdzania profilu:", err);
        setHasProfile(false);
      } finally {
        setLoadingProfileStatus(false);
      }
    };

    checkProfile();

    return () => controller.abort();
  }, [safeUser?.uid, token, refreshTrigger, authFetch]);

  useEffect(() => {
    let cancelled = false;
    let idleId = null;
    let timeoutId = null;

    const startPushListener = async () => {
      try {
        const { initForegroundPushListener } = await import(
          "./services/pushNotifications"
        );

        if (!cancelled) {
          initForegroundPushListener();
        }
      } catch (err) {
        console.error("❌ Błąd uruchamiania powiadomień push:", err);
      }
    };

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(startPushListener, { timeout: 3000 });
    } else {
      timeoutId = window.setTimeout(startPushListener, 1200);
    }

    return () => {
      cancelled = true;

      if (idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  const isAuthFlow = sessionStorage.getItem("authFlow") === "1";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setLoadingUser(true);
        setLoadingToken(true);
        setLoadingRole(true);

        if (firebaseUser) {
          const safe = {
            email: firebaseUser.email,
            uid: firebaseUser.uid,
          };

          setUser(safe);

          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
        } else {
          setUser(null);
          setToken(null);
          setUserRole("user");
          setLoadingRole(false);
        }
      } catch (e) {
        console.error("❌ onAuthStateChanged error:", e);

        setUser(null);
        setToken(null);
        setUserRole("user");
        setLoadingRole(false);
      } finally {
        setLoadingUser(false);
        setLoadingToken(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!safeUser?.uid || !token) {
      setUserRole("user");
      setLoadingRole(false);
      return;
    }

    const controller = new AbortController();

    const fetchRole = async () => {
      try {
        setLoadingRole(true);

        let res = await authFetch(`${API}/api/users/me`, {
          signal: controller.signal,
        });

        if (res.status === 404 || res.status === 405) {
          res = await authFetch(`${API}/api/users/${safeUser.uid}`, {
            signal: controller.signal,
          });
        }

        if (!res.ok) {
          setUserRole("user");
          return;
        }

        const dbUser = await res.json();
        setUserRole(dbUser?.role || "user");
      } catch (err) {
        if (err?.name === "AbortError") return;

        console.error("❌ Błąd pobierania roli:", err);
        setUserRole("user");
      } finally {
        setLoadingRole(false);
      }
    };

    fetchRole();

    return () => controller.abort();
  }, [safeUser?.uid, token, authFetch]);

  useEffect(() => {
    if (!safeUser?.uid || !token) {
      setPendingReservationsCount(0);
      return;
    }

    const controller = new AbortController();

    const fetchPendingReservations = async () => {
      try {
        const res = await authFetch(
          `${API}/api/reservations/by-provider/${safeUser.uid}`,
          { signal: controller.signal }
        );

        if (!res.ok) return;

        const data = await res.json();

        const pending = Array.isArray(data)
          ? data.filter((r) => r?.status === "oczekująca").length
          : 0;

        setPendingReservationsCount(pending);
      } catch (err) {
        if (err?.name === "AbortError") return;

        console.error("❌ Błąd pobierania liczby rezerwacji:", err);
      }
    };

    fetchPendingReservations();

    return () => controller.abort();
  }, [safeUser?.uid, token, refreshTrigger, authFetch]);

  useEffect(() => {
    if (!safeUser?.uid || !token) {
      setUnreadCount(0);
      return;
    }

    const controller = new AbortController();

    const fetchUnreadCount = async () => {
      try {
        const res = await authFetch(
          `${API}/api/conversations/by-uid/${safeUser.uid}`,
          { signal: controller.signal }
        );

        if (!res.ok) return;

        const data = await res.json();

        const totalUnread = Array.isArray(data)
          ? data.reduce((acc, convo) => acc + Number(convo?.unreadCount || 0), 0)
          : 0;

        setUnreadCount(totalUnread);
      } catch (err) {
        if (err?.name === "AbortError") return;

        console.error(
          "❌ Błąd globalnego pobierania liczby nieprzeczytanych wiadomości:",
          err
        );
      }
    };

    fetchUnreadCount();

    return () => controller.abort();
  }, [safeUser?.uid, token, refreshTrigger, authFetch]);

  const heroProps = {
    user: safeUser,
    loadingUser,
    setUser,
    refreshTrigger,
    setRefreshTrigger,
    unreadCount,
    setUnreadCount,
    pendingReservationsCount,
    userRole,
    setAlert,
    hasProfile,
    loadingProfileStatus,
  };

  const footerProps = {
    user: safeUser,
    hasProfile,
    loadingProfileStatus,
  };

  return (
    <Router>
      <ScrollToTop />

      <Navbar
        user={safeUser}
        loadingUser={loadingUser}
        refreshTrigger={refreshTrigger}
        unreadCount={unreadCount}
        setUnreadCount={setUnreadCount}
        pendingReservationsCount={pendingReservationsCount}
        setAlert={setAlert}
      />

      <CookieBanner />

      {alert?.message && (
        <AlertBox
          type={alert.type || "info"}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <Suspense fallback={<AppLoader />}>
        <Routes>
          <Route
            path="/"
          element={
            <>
              <Hero {...heroProps} />
              <AboutApp
                user={safeUser}
                hasProfile={hasProfile}
                loadingProfileStatus={loadingProfileStatus}
              />
              <PartnersShowcase currentUser={safeUser} setAlert={setAlert} />
              <HowShowlyWorks />
              <PromotedProfiles currentUser={safeUser} setAlert={setAlert} />
              <DiscoverShowly />
              <UserCardList currentUser={safeUser} setAlert={setAlert} />
              <WhyUs />
              <AllUsersList currentUser={safeUser} setAlert={setAlert} />
              <Footer {...footerProps} />
            </>
          }
        />

          <Route
            path="/login"
            element={
              <GuestOnlyRoute
                user={safeUser}
                loading={loadingUser || loadingToken}
                isAuthFlow={isAuthFlow}
              >
                <Login setUser={setUser} setRefreshTrigger={setRefreshTrigger} />
              </GuestOnlyRoute>
            }
          />

          <Route
            path="/register"
            element={
              <GuestOnlyRoute
                user={safeUser}
                loading={loadingUser || loadingToken}
                isAuthFlow={isAuthFlow}
              >
                <Register
                  user={safeUser}
                  setUser={setUser}
                  setRefreshTrigger={setRefreshTrigger}
                />
              </GuestOnlyRoute>
            }
          />

          <Route path="/verify-success" element={<VerifySuccess />} />

        <Route
          path="/szukaj"
          element={
            <>
              <Hero {...heroProps} />
              <SearchResults currentUser={safeUser} />
              <Footer {...footerProps} />
            </>
          }
        />

        <Route
          path="/billing/success"
          element={
            <>
              <Hero {...heroProps} />
              <BillingSuccess triggerRefresh={triggerRefresh} />
              <Footer {...footerProps} />
            </>
          }
        />

        <Route
          path="/billing/cancel"
          element={
            <>
              <Hero {...heroProps} />
              <BillingCancel triggerRefresh={triggerRefresh} />
              <Footer {...footerProps} />
            </>
          }
        />

          <Route
            path="/admin"
            element={
              <AdminAccessRoute
                user={safeUser}
                role={userRole}
                loading={loadingUser || loadingToken || loadingRole}
              >
                <>
                  <Hero {...heroProps} />
                  <AdminPanel />
                  <Footer {...footerProps} />
                </>
              </AdminAccessRoute>
            }
          />

        <Route
          path="/stworz-profil"
          element={
            <>
              <Hero {...heroProps} />
              {safeUser && loadingProfileStatus ? (
                <p style={{ padding: "2rem", textAlign: "center" }}>
                  Sprawdzanie profilu...
                </p>
              ) : safeUser && hasProfile ? (
                <Navigate
                  to="/profil"
                  replace
                  state={{ scrollToId: "profileWrapper" }}
                />
              ) : (
                <CreateProfile user={safeUser} setRefreshTrigger={setRefreshTrigger} />
              )}
              <Footer {...footerProps} />
            </>
          }
        />

        <Route
          path="/profil"
          element={
            <>
              <Hero {...heroProps} />
              <YourProfile user={safeUser} setRefreshTrigger={setRefreshTrigger} />
              <Footer {...footerProps} />
            </>
          }
        />

        <Route
          path="/profil/:slug"
          element={<LegacyProfileRedirect />}
        />

          <Route
            path="/wiadomosc/:recipientId"
            element={
              <AuthRoute user={safeUser} loading={loadingUser || loadingToken}>
                <>
                  <Hero {...heroProps} />
                  <MessageForm user={safeUser} />
                  <Footer {...footerProps} />
                </>
              </AuthRoute>
            }
          />

          <Route
            path="/powiadomienia"
            element={
              <AuthRoute user={safeUser} loading={loadingUser || loadingToken}>
                <>
                  <Hero {...heroProps} />
                  <Notifications user={safeUser} setUnreadCount={setUnreadCount} />
                  <Footer {...footerProps} />
                </>
              </AuthRoute>
            }
          />

          <Route
            path="/ulubione"
            element={
              <AuthRoute user={safeUser} loading={loadingUser || loadingToken}>
                <>
                  <Hero {...heroProps} />
                  <Favorites currentUser={safeUser} />
                  <Footer {...footerProps} />
                </>
              </AuthRoute>
            }
          />

          <Route
            path="/konwersacja/:threadId"
            element={
              <AuthRoute user={safeUser} loading={loadingUser || loadingToken}>
                <>
                  <Hero {...heroProps} />
                  <ThreadView
                    user={safeUser}
                    setUnreadCount={setUnreadCount}
                    triggerRefresh={triggerRefresh}
                  />
                  <Footer {...footerProps} />
                </>
              </AuthRoute>
            }
          />

          <Route
            path="/rezerwacja/:slug"
            element={
              <AuthRoute user={safeUser} loading={loadingUser || loadingToken}>
                <>
                  <Hero {...heroProps} />
                  <BookingForm user={safeUser} />
                  <Footer {...footerProps} />
                </>
              </AuthRoute>
            }
          />

          <Route
            path="/konto"
            element={
              <AuthRoute user={safeUser} loading={loadingUser || loadingToken}>
                <>
                  <Hero {...heroProps} />
                  <AccountSettings />
                  <Footer {...footerProps} />
                </>
              </AuthRoute>
            }
          />

          <Route
            path="/rezerwacje"
            element={
              <AuthRoute user={safeUser} loading={loadingUser || loadingToken}>
                <>
                  <Hero {...heroProps} />
                  <ReservationList
                    user={safeUser}
                    resetPendingReservationsCount={resetPendingReservationsCount}
                  />
                  <Footer {...footerProps} />
                </>
              </AuthRoute>
            }
          />

        <Route
          path="/kontakt"
          element={
            <>
              <Hero {...heroProps} />
              <Contact />
              <Footer {...footerProps} />
            </>
          }
        />

        <Route
          path="/profile"
          element={
            <>
              <Hero {...heroProps} />
              <ProfilesHub currentUser={safeUser} setAlert={setAlert} />
              <Footer {...footerProps} />
            </>
          }
        />

        <Route
          path="/jak-to-dziala"
          element={
            <>
              <Hero {...heroProps} />
              <ShowlyJourney />
              <Footer {...footerProps} />
            </>
          }
        />

        <Route
          path="/regulamin"
          element={
            <>
              <Hero {...heroProps} />
              <Regulations />
              <Footer {...footerProps} />
            </>
          }
        />

        <Route
          path="/polityka-cookies"
          element={
            <>
              <Hero {...heroProps} />
              <CookiesPolicy />
              <Footer {...footerProps} />
            </>
          }
        />

        <Route
          path="/:slug"
          element={
            <>
              <Hero {...heroProps} />
              <PublicProfile />
              <Footer {...footerProps} />
            </>
          }
        />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
