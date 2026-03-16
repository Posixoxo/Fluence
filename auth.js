// auth.js 
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
import { updateDynamicGreeting } from './greeting.js';

let currentUser = null;

export function initAuth() {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    console.log('Auth state:', user ? `Logged in: ${user.email}` : 'Not logged in');
    updateUI(user);
  });
}

// ✅ UPDATED: Uses CSS classes instead of inline styles
function updateUI(user) {
  const authRequired = document.querySelectorAll('[data-auth-required]');
  const noAuth = document.querySelectorAll('[data-no-auth]');

  if (user) {
    // Logged in - show auth-required elements
    authRequired.forEach(el => {
      el.classList.remove('hidden');
      // Add visible class for playlist buttons to maintain flex layout
      if (el.classList.contains('playlist-btn')) {
        el.classList.add('visible');
      }
      // Fallback for elements that don't have special classes
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
    // Logged out - hide auth-required elements
    authRequired.forEach(el => {
      el.classList.add('hidden');
      if (el.classList.contains('playlist-btn')) {
        el.classList.remove('visible');
      }
      if (!el.classList.contains('playlist-btn')) {
        el.style.display = 'none';

        updateDynamicGreeting(null);
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

  // Update user info displays
  if (user) {
    // Name: displayName if exists, otherwise derive from email prefix
    const displayName = user.displayName
      ? user.displayName
      : user.email.split('@')[0];

      updateDynamicGreeting(user);

    // Email: ALWAYS user.email — never displayName
    const email = user.email;

    document.querySelectorAll('[data-user-name]').forEach(el => {
      el.textContent = displayName;
    });

    // ✅ Shows the actual email address
    document.querySelectorAll('[data-user-email]').forEach(el => {
      el.textContent = email;
    });

    // Photo: Google provides one, default to inline SVG
    document.querySelectorAll('[data-user-photo]').forEach(el => {
      if (user.photoURL) {
        el.src = user.photoURL;
        el.onerror = () => {
          el.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23333" width="100" height="100"/%3E%3Ctext fill="%23ccc" font-size="40" x="50%25" y="50%25" text-anchor="middle" dy=".35em"%3E👤%3C/text%3E%3C/svg%3E';
        };
      } else {
        el.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23333" width="100" height="100"/%3E%3Ctext fill="%23ccc" font-size="40" x="50%25" y="50%25" text-anchor="middle" dy=".35em"%3E👤%3C/text%3E%3C/svg%3E';
      }
    });
  }
}

// Sign Up
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

// Sign In
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

// Google Sign In
const googleProvider = new GoogleAuthProvider();
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log('✅ Google sign in:', result.user.email);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('❌ Google sign in error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// Sign Out
export async function signOutUser() {
  try {
    await signOut(auth);
    console.log('✅ Signed out');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Password Reset
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
    'auth/too-many-requests': 'Too many attempts. Try again later.'
  };
  return messages[error.code] || error.message;
}

// Expose as globals for onclick handlers
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