// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { initForegroundPushListener } from "./services/pushNotifications";

import Navbar from "./components/Navbar/Navbar";
import Hero from "./components/Hero/Hero";
import UserCardList from "./components/UserCardList/UserCardList";
import WhyUs from "./components/WhyUs/WhyUs";
import AllUsersList from "./components/AllUsersList/AllUsersList";
import Footer from "./components/Footer/Footer";
import Register from "./components/Register/Register";
import Login from "./components/Login/Login";
import VerifySuccess from "./components/VerifySuccess/VerifySuccess";
import AboutApp from "./components/AboutApp/AboutApp";
import CreateProfile from "./components/CreateProfile/CreateProfile";
import YourProfile from "./components/YourProfile/YourProfile";
import PublicProfile from "./components/PublicProfile/PublicProfile";
import MessageForm from "./components/MessageForm/MessageForm";
import Notifications from "./components/Notifications/Notifications";
import ThreadView from "./components/ThreadView/ThreadView";
import ScrollToTop from "./components/ScrollToTop/ScrollToTop";
import BookingForm from "./components/BookingForm/BookingForm";
import ReservationList from "./components/ReservationList/ReservationList";
import AccountSettings from "./components/AccountSettings/AccountSettings";
import Favorites from "./components/Favorites/Favorites";
import BillingSuccess from "./components/BillingSuccess/BillingSuccess";
import BillingCancel from "./components/BillingCancel/BillingCancel";
import SearchResults from "./components/SearchResults/SearchResults";
import PartnersShowcase from "./components/PartnersShowcase/PartnersShowcase";
import PromotedProfiles from "./components/PromotedProfiles/PromotedProfiles";
import HowShowlyWorks from "./components/HowShowlyWorks/HowShowlyWorks";
import DiscoverShowly from "./components/DiscoverShowly/DiscoverShowly";
import AlertBox from "./components/AlertBox/AlertBox";
import Contact from "./components/Contact/Contact";
import Regulations from "./components/Regulations/Regulations";
import CookieBanner from "./components/CookieBanner/CookieBanner";
import CookiesPolicy from "./components/CookiesPolicy/CookiesPolicy";
import ShowlyJourney from "./components/ShowlyJourney/ShowlyJourney";
import ProfilesHub from "./components/ProfilesHub/ProfilesHub";

import AdminPanel from "./components/AdminPanel/AdminPanel";
import AdminRoute from "./components/auth/AdminRoute";

const API = process.env.REACT_APP_API_URL;

function LegacyProfileRedirect() {
  const { slug } = useParams();

  return <Navigate to={`/${slug || ""}`} replace />;
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
    initForegroundPushListener();
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

  if (!isAuthFlow && (loadingUser || loadingToken || loadingRole)) {
    return (
      <p style={{ padding: "2rem", textAlign: "center" }}>
        ⏳ Trwa ładowanie aplikacji...
      </p>
    );
  }

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
            safeUser && !isAuthFlow ? (
              <Navigate to="/" replace />
            ) : (
              <Login setUser={setUser} setRefreshTrigger={setRefreshTrigger} />
            )
          }
        />

        <Route
          path="/register"
          element={
            safeUser && !isAuthFlow ? (
              <Navigate to="/" replace />
            ) : (
              <Register
                user={safeUser}
                setUser={setUser}
                setRefreshTrigger={setRefreshTrigger}
              />
            )
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
            <AdminRoute user={safeUser} role={userRole}>
              <>
                <Hero {...heroProps} />
                <AdminPanel />
                <Footer {...footerProps} />
              </>
            </AdminRoute>
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
            safeUser ? (
              <>
                <Hero {...heroProps} />
                <MessageForm user={safeUser} />
                <Footer {...footerProps} />
              </>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/powiadomienia"
          element={
            safeUser ? (
              <>
                <Hero {...heroProps} />
                <Notifications user={safeUser} setUnreadCount={setUnreadCount} />
                <Footer {...footerProps} />
              </>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/ulubione"
          element={
            safeUser ? (
              <>
                <Hero {...heroProps} />
                <Favorites currentUser={safeUser} />
                <Footer {...footerProps} />
              </>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/konwersacja/:threadId"
          element={
            safeUser ? (
              <>
                <Hero {...heroProps} />
                <ThreadView
                  user={safeUser}
                  setUnreadCount={setUnreadCount}
                  triggerRefresh={triggerRefresh}
                />
                <Footer {...footerProps} />
              </>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/rezerwacja/:slug"
          element={
            safeUser ? (
              <>
                <Hero {...heroProps} />
                <BookingForm user={safeUser} />
                <Footer {...footerProps} />
              </>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/konto"
          element={
            safeUser ? (
              <>
                <Hero {...heroProps} />
                <AccountSettings />
                <Footer {...footerProps} />
              </>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/rezerwacje"
          element={
            safeUser ? (
              <>
                <Hero {...heroProps} />
                <ReservationList
                  user={safeUser}
                  resetPendingReservationsCount={resetPendingReservationsCount}
                />
                <Footer {...footerProps} />
              </>
            ) : (
              <Navigate to="/login" replace />
            )
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
    </Router>
  );
}

export default App;
