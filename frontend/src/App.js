import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import PublicProfile from './components/PublicProfile/PublicProfile'; // Upewnij się, że ścieżka jest poprawna

function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(Date.now());

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

  if (loadingUser) {
    return <p style={{ padding: "2rem", textAlign: "center" }}>⏳ Trwa ładowanie aplikacji...</p>;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Hero user={user} setUser={setUser} refreshTrigger={refreshTrigger} setRefreshTrigger={setRefreshTrigger} />
              <AboutApp />
              <UserCardList />
              <WhyUs />
              <CategoryFilter />
              <AllUsersList />
              <Footer />
            </>
          }
        />
        <Route
          path="/register"
          element={
            <Register
              user={user}
              setUser={setUser}
              setRefreshTrigger={setRefreshTrigger}
            />
          }
        />
        <Route path="/login" element={<Login setUser={setUser} setRefreshTrigger={setRefreshTrigger} />} />
        <Route path="/verify-success" element={<VerifySuccess />} />
        <Route
          path="/create-profile"
          element={
            <>
              <Hero user={user} setUser={setUser} refreshTrigger={refreshTrigger} setRefreshTrigger={setRefreshTrigger} />
              <CreateProfile user={user} setRefreshTrigger={setRefreshTrigger} />
              <Footer />
            </>
          }
        />
        <Route
          path="/your-profile"
          element={
            <>
              <Hero user={user} setUser={setUser} refreshTrigger={refreshTrigger} setRefreshTrigger={setRefreshTrigger} />
              <YourProfile user={user} />
              <Footer />
            </>
          }
        />
        <Route
          path="/profil/:slug"
          element={
            <>
              <Hero user={user} setUser={setUser} refreshTrigger={refreshTrigger} setRefreshTrigger={setRefreshTrigger} />
              <PublicProfile />
              <Footer />
            </>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
