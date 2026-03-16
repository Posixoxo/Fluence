// firebase-config/firebase-config.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

const firebaseConfig = {
  apiKey: "AIzaSyD_upF_8xrVSsTDYH8VtWG_S_kdrRpcwP8",
  authDomain: "mood-playlist-3dd0f.firebaseapp.com",
  projectId: "mood-playlist-3dd0f",
  storageBucket: "mood-playlist-3dd0f.firebasestorage.app",
  messagingSenderId: "825153786325",
  appId: "1:825153786325:web:69e347b9ccfe4a9ac5ad5c",
  measurementId: "G-EHH083LT72"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

console.log('✅ Firebase initialized successfully');
console.log('🔐 Project ID:', firebaseConfig.projectId);

export { app, auth, db, storage };