// auth.js - FINAL FIXED VERSION
import { auth } from './firebase-config/firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getUserProfile } from './firebase-config/database.js';

let currentUser = null;

export function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    console.log('Auth state:', user ? `Logged in: ${user.email}` : 'Not logged in');
    await updateUI(user);
  });
}

// ✅ FIXED: Prioritizes dashboard photos over Google photos
async function updateUI(user) {
  const authRequired = document.querySelectorAll('[data-auth-required]');
  const noAuth = document.querySelectorAll('[data-no-auth]');

  if (user) {
    authRequired.forEach(el => {
      el.classList.remove('hidden');
      if (el.classList.contains('playlist-btn')) {
        el.classList.add('visible');
      }
      if (!el.classList.contains('playlist-btn')) {
        el.style.display = 'block';
      }
    });
    
    noAuth.forEach(el => {
      el.classList.add('hidden');
      if (el.classList.contains('playlist-btn')) {
        el.classList.remove('visible');
      }
      if (!el.classList.contains('playlist-btn')) {
        el.style.display = 'none';
      }
    });
  } else {
    authRequired.forEach(el => {
      el.classList.add('hidden');
      if (el.classList.contains('playlist-btn')) {
        el.classList.remove('visible');
      }
      if (!el.classList.contains('playlist-btn')) {
        el.style.display = 'none';
      }
    });
    
    noAuth.forEach(el => {
      el.classList.remove('hidden');
      if (el.classList.contains('playlist-btn')) {
        el.classList.add('visible');
      }
      if (!el.classList.contains('playlist-btn')) {
        el.style.display = 'block';
      }
    });
  }

  if (user) {
    // ✅ Get user profile from database for manually uploaded photos
    let userProfile = null;
    try {
      const profileResult = await getUserProfile(user.uid);
      if (profileResult.success) {
        userProfile = profileResult.data;
      }
    } catch (err) {
      console.warn('Could not fetch user profile:', err);
    }

    // Priority: database > auth > email
    const displayName = userProfile?.displayName 
      || user.displayName
      || user.email.split('@')[0];

    const email = user.email;

    document.querySelectorAll('[data-user-name]').forEach(el => {
      el.textContent = displayName;
    });

    document.querySelectorAll('[data-user-email]').forEach(el => {
      el.textContent = email;
    });

    // ✅ Prioritize dashboard photo > Google photo > default
    document.querySelectorAll('[data-user-photo]').forEach(el => {
      const photoURL = userProfile?.photoURL || user.photoURL;
      
      if (photoURL) {
        el.src = photoURL;
        el.onerror = () => {
          el.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23333" width="100" height="100"/%3E%3Ctext fill="%23ccc" font-size="40" x="50%25" y="50%25" text-anchor="middle" dy=".35em"%3E👤%3C/text%3E%3C/svg%3E';
        };
      } else {
        el.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23333" width="100" height="100"/%3E%3Ctext fill="%23ccc" font-size="40" x="50%25" y="50%25" text-anchor="middle" dy=".35em"%3E👤%3C/text%3E%3C/svg%3E';
      }
    });
  }

  // ✅ Update greeting using global window function (not import)
  if (typeof window.updateDynamicGreeting === 'function') {
    window.updateDynamicGreeting(user);
  }
}

export async function signUp(email, password, displayName) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }
    console.log('✅ Account created:', result.user.email);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('❌ Sign up error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function signIn(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Signed in:', result.user.email);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('❌ Sign in error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// ✅ Better error handling for production
const googleProvider = new GoogleAuthProvider();
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log('✅ Google sign in:', result.user.email);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('❌ Google sign in error:', error);
    
    if (error.code === 'auth/popup-blocked') {
      return { success: false, error: 'Popup blocked. Please allow popups for this site.' };
    }
    if (error.code === 'auth/unauthorized-domain') {
      return { success: false, error: 'This domain is not authorized. Please contact support.' };
    }
    if (error.code === 'auth/popup-closed-by-user') {
      return { success: false, error: 'Sign-in cancelled.' };
    }
    
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
    console.log('✅ Signed out');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log('✅ Reset email sent');
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export function getCurrentUser() { return currentUser; }
export function isLoggedIn() { return currentUser !== null; }

export function openAuthModal(tab = 'signin') {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.style.display = 'flex';
    if (window.switchAuthTab) window.switchAuthTab(tab);
  }
}

export function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.style.display = 'none';
}

function getErrorMessage(error) {
  const messages = {
    'auth/email-already-in-use': 'Email already registered. Try signing in.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/weak-password': 'Password too weak (min 6 characters).',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/popup-closed-by-user': 'Sign-in cancelled.',
    'auth/popup-blocked': 'Popup blocked by browser.',
    'auth/unauthorized-domain': 'Domain not authorized for Google sign-in.',
    'auth/too-many-requests': 'Too many attempts. Try again later.'
  };
  return messages[error.code] || error.message;
}

window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.signOutUser = signOutUser;
window.toggleUserMenu = () => {
  const dropdown = document.getElementById('user-dropdown');
  if (dropdown) {
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}