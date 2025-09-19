import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage'; // 👈

const firebaseConfig = {
  apiKey: 'AIzaSyCKjo-Fg_beokDYsLEHnXjF-WCOAvCg0pE',
  authDomain: 'showly-firebase.firebaseapp.com',
  projectId: 'showly-firebase',
  storageBucket: 'showly-firebase.appspot.com',
  messagingSenderId: '88982263213',
  appId: '1:88982263213:web:09b6bf6788c94eb35dfd24',
  measurementId: 'G-Q1SCLJ7LYD'
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app); // 👈 dodane
