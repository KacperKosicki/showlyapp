import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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

function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(Date.now());
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingReservationsCount, setPendingReservationsCount] = useState(0);
  const resetPendingReservationsCount = () => setPendingReservationsCount(0);

  const triggerRefresh = () => setRefreshTrigger(Date.now()); // 🔁

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

  useEffect(() => {
    const fetchPendingReservations = async () => {
      if (!user?.uid) return;
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/reservations/by-provider/${user.uid}`);
        const data = await res.json();
        const pending = data.filter(r => r.status === 'oczekująca').length;
        setPendingReservationsCount(pending);
      } catch (err) {
        console.error('❌ Błąd pobierania liczby rezerwacji:', err);
      }
    };

    fetchPendingReservations();
  }, [user, refreshTrigger]);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user?.uid) return;

      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/conversations/by-uid/${user.uid}`)
        const data = await res.json();
        const totalUnread = data.reduce((acc, convo) => acc + convo.unreadCount, 0);
        setUnreadCount(totalUnread);
      } catch (err) {
        console.error('❌ Błąd globalnego pobierania liczby nieprzeczytanych wiadomości:', err);
      }
    };

    fetchUnreadCount();
  }, [user, refreshTrigger]);

  if (loadingUser) {
    return <p style={{ padding: "2rem", textAlign: "center" }}>⏳ Trwa ładowanie aplikacji...</p>;
  }

  // ✅ Flaga pozwala „ominąć” guard TYLKO podczas trwającego logowania,
  // żeby komunikat na /login mógł się wyświetlić i zrobić swój navigate.
  const isAuthFlow = sessionStorage.getItem('authFlow') === '1';

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Hero user={user} setUser={setUser} refreshTrigger={refreshTrigger} setRefreshTrigger={setRefreshTrigger} unreadCount={unreadCount} setUnreadCount={setUnreadCount} pendingReservationsCount={pendingReservationsCount} />
              <AboutApp user={user} />
              <UserCardList currentUser={user} />
              <WhyUs />
              <CategoryFilter />
              <AllUsersList currentUser={user} />
              <Footer />
            </>
          }
        />

        {/* ✅ Blokada /login dla zalogowanych, ALE nie w trakcie authFlow */}
        <Route
          path="/login"
          element={
            user && !isAuthFlow
              ? <Navigate to="/" replace />
              : <Login setUser={setUser} setRefreshTrigger={setRefreshTrigger} />
          }
        />

        {/* ✅ Blokada /register dla zalogowanych, ALE nie w trakcie authFlow */}
        <Route
          path="/register"
          element={
            user && !isAuthFlow
              ? <Navigate to="/" replace />
              : <Register user={user} setUser={setUser} setRefreshTrigger={setRefreshTrigger} />
          }
        />

        <Route path="/verify-success" element={<VerifySuccess />} />

        <Route
          path="/stworz-profil"
          element={
            <>
              <Hero user={user} setUser={setUser} refreshTrigger={refreshTrigger} setRefreshTrigger={setRefreshTrigger} unreadCount={unreadCount} setUnreadCount={setUnreadCount} pendingReservationsCount={pendingReservationsCount} />
              <CreateProfile user={user} setRefreshTrigger={setRefreshTrigger} />
              <Footer />
            </>
          }
        />

        <Route
          path="/profil"
          element={
            <>
              <Hero user={user} setUser={setUser} refreshTrigger={refreshTrigger} setRefreshTrigger={setRefreshTrigger} unreadCount={unreadCount} setUnreadCount={setUnreadCount} pendingReservationsCount={pendingReservationsCount} />
              <YourProfile user={user} setRefreshTrigger={setRefreshTrigger} />
              <Footer />
            </>
          }
        />

        <Route
          path="/profil/:slug"
          element={
            <>
              <Hero user={user} setUser={setUser} refreshTrigger={refreshTrigger} setRefreshTrigger={setRefreshTrigger} unreadCount={unreadCount} setUnreadCount={setUnreadCount} pendingReservationsCount={pendingReservationsCount} />
              <PublicProfile />
              <Footer />
            </>
          }
        />

        <Route
          path="/wiadomosc/:recipientId"
          element={
            user ? (
              <>
                <Hero user={user} setUser={setUser} refreshTrigger={refreshTrigger} setRefreshTrigger={setRefreshTrigger} unreadCount={unreadCount} setUnreadCount={setUnreadCount} pendingReservationsCount={pendingReservationsCount} />
                <MessageForm user={user} />
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
            user ? (
              <>
                <Hero user={user} setUser={setUser} refreshTrigger={refreshTrigger} setRefreshTrigger={setRefreshTrigger} unreadCount={unreadCount} setUnreadCount={setUnreadCount} pendingReservationsCount={pendingReservationsCount} />
                <Notifications user={user} setUnreadCount={setUnreadCount} />
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
            user ? (
              <>
                <Hero user={user} setUser={setUser} refreshTrigger={refreshTrigger} setRefreshTrigger={setRefreshTrigger} unreadCount={unreadCount} setUnreadCount={setUnreadCount} pendingReservationsCount={pendingReservationsCount} />
                <ThreadView user={user} setUnreadCount={setUnreadCount} triggerRefresh={triggerRefresh} />
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
            user ? (
              <>
                <Hero
                  user={user}
                  setUser={setUser}
                  refreshTrigger={refreshTrigger}
                  setRefreshTrigger={setRefreshTrigger}
                  unreadCount={unreadCount}
                  setUnreadCount={setUnreadCount}
                  pendingReservationsCount={pendingReservationsCount}
                />
                <BookingForm user={user} />
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
            user ? (
              <>
                <Hero
                  user={user}
                  setUser={setUser}
                  refreshTrigger={refreshTrigger}
                  setRefreshTrigger={setRefreshTrigger}
                  unreadCount={unreadCount}
                  setUnreadCount={setUnreadCount}
                  pendingReservationsCount={pendingReservationsCount}
                />
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
            user ? (
              <>
                <Hero
                  user={user}
                  setUser={setUser}
                  refreshTrigger={refreshTrigger}
                  setRefreshTrigger={setRefreshTrigger}
                  unreadCount={unreadCount}
                  setUnreadCount={setUnreadCount}
                  pendingReservationsCount={pendingReservationsCount}
                />
                <ReservationList user={user} resetPendingReservationsCount={resetPendingReservationsCount} />
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
