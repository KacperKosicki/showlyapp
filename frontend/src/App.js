import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
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

const API = process.env.REACT_APP_API_URL;

function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [refreshTrigger, setRefreshTrigger] = useState(Date.now());
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingReservationsCount, setPendingReservationsCount] = useState(0);

  const resetPendingReservationsCount = () => setPendingReservationsCount(0);
  const triggerRefresh = () => setRefreshTrigger(Date.now());

  // ✅ stabilne user object (żeby nie powodować zbędnych re-renderów)
  const safeUser = useMemo(() => {
    if (!user?.uid) return null;
    return { uid: user.uid, email: user.email || '' };
  }, [user?.uid, user?.email]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          email: firebaseUser.email,
          uid: firebaseUser.uid,
        });
      } else {
        setUser(null);
      }
      setLoadingUser(false);
    });

    return () => unsubscribe();
  }, []);

  // ✅ rezerwacje – AbortController + nie licz jak brak uid
  useEffect(() => {
    if (!safeUser?.uid) {
      setPendingReservationsCount(0);
      return;
    }

    const controller = new AbortController();

    const fetchPendingReservations = async () => {
      try {
        const res = await fetch(
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
  }, [safeUser?.uid, refreshTrigger]);

  // ✅ unread – AbortController
  useEffect(() => {
    if (!safeUser?.uid) {
      setUnreadCount(0);
      return;
    }

    const controller = new AbortController();

    const fetchUnreadCount = async () => {
      try {
        const res = await fetch(
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
  }, [safeUser?.uid, refreshTrigger]);

  if (loadingUser) {
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
