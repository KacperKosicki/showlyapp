import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

import Hero from './components/Hero/Hero';
import UserCardList from './components/UserCardList/UserCardList';
import WhyUs from './components/WhyUs/WhyUs';
import CategoryFilter from './components/CategoryFilter/CategoryFilter';
import AllUsersList from './components/AllUsersList/AllUsersList';
import Footer from './components/Footer/Footer';
import Register from './components/Register/Register';
import Login from './components/Login/Login';
import VerifySuccess from './components/VerifySuccess/VerifySuccess';
import AboutApp from './components/AboutApp/AboutApp';
import CreateProfile from './components/CreateProfile/CreateProfile';
import YourProfile from './components/YourProfile/YourProfile';
import PublicProfile from './components/PublicProfile/PublicProfile';
import MessageForm from './components/MessageForm/MessageForm';
import Notifications from './components/Notifications/Notifications';
import ThreadView from './components/ThreadView/ThreadView';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';
import BookingForm from './components/BookingForm/BookingForm';
import ReservationList from './components/ReservationList/ReservationList';
import AccountSettings from './components/AccountSettings/AccountSettings';
import Favorites from './components/Favorites/Favorites';
import BillingSuccess from './components/BillingSuccess/BillingSuccess';
import BillingCancel from './components/BillingCancel/BillingCancel';

const API = process.env.REACT_APP_API_URL;

function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // ✅ token do backendu (Firebase ID Token)
  const [token, setToken] = useState(null);
  const [loadingToken, setLoadingToken] = useState(true);

  const [refreshTrigger, setRefreshTrigger] = useState(Date.now());
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingReservationsCount, setPendingReservationsCount] = useState(0);

  const resetPendingReservationsCount = () => setPendingReservationsCount(0);
  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(Date.now());
  }, []);

  // ✅ stabilne user object (żeby nie powodować zbędnych re-renderów)
  const safeUser = useMemo(() => {
    if (!user?.uid) return null;
    return { uid: user.uid, email: user.email || '' };
  }, [user?.uid, user?.email]);

  // ✅ helper: fetch z tokenem
  const authFetch = useCallback(
    (url, options = {}) => {
      const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      };

      return fetch(url, { ...options, headers });
    },
    [token]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setLoadingUser(true);
        setLoadingToken(true);

        if (firebaseUser) {
          setUser({
            email: firebaseUser.email,
            uid: firebaseUser.uid,
          });

          // ✅ pobierz token do backendu
          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
        } else {
          setUser(null);
          setToken(null);
        }
      } catch (e) {
        console.error('❌ onAuthStateChanged error:', e);
        setUser(null);
        setToken(null);
      } finally {
        setLoadingUser(false);
        setLoadingToken(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // ✅ rezerwacje – AbortController + token required
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
          ? data.filter(r => r?.status === 'oczekująca').length
          : 0;

        setPendingReservationsCount(pending);
      } catch (err) {
        if (err?.name === 'AbortError') return;
        console.error('❌ Błąd pobierania liczby rezerwacji:', err);
      }
    };

    fetchPendingReservations();

    return () => controller.abort();
  }, [safeUser?.uid, token, refreshTrigger, authFetch]);

  // ✅ unread – AbortController + token required
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
        if (err?.name === 'AbortError') return;
        console.error('❌ Błąd globalnego pobierania liczby nieprzeczytanych wiadomości:', err);
      }
    };

    fetchUnreadCount();

    return () => controller.abort();
  }, [safeUser?.uid, token, refreshTrigger, authFetch]);

  // ✅ blokuj UI dopóki nie mamy usera i tokena (żeby nie było 401 na starcie)
  if (loadingUser || loadingToken) {
    return <p style={{ padding: "2rem", textAlign: "center" }}>⏳ Trwa ładowanie aplikacji...</p>;
  }

  const isAuthFlow = sessionStorage.getItem('authFlow') === '1';

  const heroProps = {
    user: safeUser,
    loadingUser,
    setUser,
    refreshTrigger,
    setRefreshTrigger,
    unreadCount,
    setUnreadCount,
    pendingReservationsCount,
  };

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Hero {...heroProps} />
              <AboutApp user={safeUser} />
              <UserCardList currentUser={safeUser} />
              <WhyUs />
              <CategoryFilter />
              <AllUsersList currentUser={safeUser} />
              <Footer />
            </>
          }
        />

        <Route
          path="/login"
          element={
            safeUser && !isAuthFlow
              ? <Navigate to="/" replace />
              : <Login setUser={setUser} setRefreshTrigger={setRefreshTrigger} />
          }
        />

        <Route
          path="/register"
          element={
            safeUser && !isAuthFlow
              ? <Navigate to="/" replace />
              : <Register user={safeUser} setUser={setUser} setRefreshTrigger={setRefreshTrigger} />
          }
        />

        <Route path="/verify-success" element={<VerifySuccess />} />

        <Route
          path="/billing/success"
          element={
            <>
              <Hero {...heroProps} />
              <BillingSuccess triggerRefresh={triggerRefresh} />
              <Footer />
            </>
          }
        />

        <Route
          path="/billing/cancel"
          element={
            <>
              <Hero {...heroProps} />
              <BillingCancel triggerRefresh={triggerRefresh} />
              <Footer />
            </>
          }
        />

        <Route
          path="/stworz-profil"
          element={
            <>
              <Hero {...heroProps} />
              <CreateProfile user={safeUser} setRefreshTrigger={setRefreshTrigger} />
              <Footer />
            </>
          }
        />

        <Route
          path="/profil"
          element={
            <>
              <Hero {...heroProps} />
              <YourProfile user={safeUser} setRefreshTrigger={setRefreshTrigger} />
              <Footer />
            </>
          }
        />

        <Route
          path="/profil/:slug"
          element={
            <>
              <Hero {...heroProps} />
              <PublicProfile />
              <Footer />
            </>
          }
        />

        <Route
          path="/wiadomosc/:recipientId"
          element={
            safeUser ? (
              <>
                <Hero {...heroProps} />
                <MessageForm user={safeUser} />
                <Footer />
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
                <Footer />
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
                <Footer />
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
                <ThreadView user={safeUser} setUnreadCount={setUnreadCount} triggerRefresh={triggerRefresh} />
                <Footer />
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
                <Footer />
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
                <Footer />
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
                <ReservationList user={safeUser} resetPendingReservationsCount={resetPendingReservationsCount} />
                <Footer />
              </>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;