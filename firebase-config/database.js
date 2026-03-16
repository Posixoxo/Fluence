// firebase-config/database.js
// Updated version WITHOUT Firebase Storage requirement
// Uses base64 images stored directly in Firestore

import { db } from './firebase-config.js';
import {
  doc, collection, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, addDoc, query, where, orderBy, limit,
  increment, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ============================================================
// USER PROFILES
// ============================================================

export async function createUserProfile(userId, data) {
  try {
    const ref = doc(db, 'users', userId);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      console.log('✅ Profile already exists');
      return { success: true };
    }

    await setDoc(ref, {
      uid: userId,
      email: data.email,
      displayName: data.displayName || '',
      photoURL: data.photoURL || '',
      bannerURL: '',
      bannerText: '',
      bio: '',
      isPublic: true,
      createdAt: serverTimestamp(),
      stats: { totalPlaylists: 0, totalPlays: 0, profileViews: 0 }
    });
    
    console.log('✅ User profile created:', userId);
    return { success: true };
  } catch (e) {
    console.error('❌ createUserProfile error:', e);
    return { success: false, error: e.message };
  }
}

export async function getUserProfile(userId) {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) {
      console.log('❌ Profile not found:', userId);
      return { success: false, error: 'Not found' };
    }
    return { success: true, data: snap.data() };
  } catch (e) {
    console.error('❌ getUserProfile error:', e);
    return { success: false, error: e.message };
  }
}

export async function updateUserProfile(userId, updates) {
  try {
    await updateDoc(doc(db, 'users', userId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    console.log('✅ Profile updated:', userId);
    return { success: true };
  } catch (e) {
    console.error('❌ updateUserProfile error:', e);
    return { success: false, error: e.message };
  }
}

// ============================================================
// ✅ REMOVED: Firebase Storage upload functions
// Images now stored as base64 in coverURL field
// ============================================================

// ============================================================
// PLAYLISTS
// ============================================================

export async function addPlaylist(userId, playlistData) {
  try {
    console.log('📝 Adding playlist for user:', userId);
    console.log('📝 Playlist data:', playlistData);
    
    const colRef = collection(db, 'playlists');
    const docRef = await addDoc(colRef, {
      userId,
      title: playlistData.title || 'Untitled',
      description: playlistData.description || '',
      genre: playlistData.genre || '',
      mood: playlistData.mood || '',
      coverURL: playlistData.coverURL || '', // Can be base64 or URL
      sourceURL: playlistData.sourceURL || '',
      platform: playlistData.platform || 'other',
      embedHTML: playlistData.embedHTML || '',
      isPublic: true,
      playCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('✅ Playlist document created with ID:', docRef.id);

    // Update user stats
    try {
      await updateDoc(doc(db, 'users', userId), {
        'stats.totalPlaylists': increment(1)
      });
      console.log('✅ User stats updated');
    } catch (statsErr) {
      console.warn('⚠️ Could not update stats:', statsErr);
    }

    return { success: true, id: docRef.id };
  } catch (e) {
    console.error('❌ addPlaylist error:', e);
    console.error('Error details:', {
      code: e.code,
      message: e.message,
      stack: e.stack
    });
    return { success: false, error: e.message };
  }
}

export async function updatePlaylist(playlistId, updates) {
  try {
    await updateDoc(doc(db, 'playlists', playlistId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    console.log('✅ Playlist updated:', playlistId);
    return { success: true };
  } catch (e) {
    console.error('❌ updatePlaylist error:', e);
    return { success: false, error: e.message };
  }
}

export async function deletePlaylist(userId, playlistId) {
  try {
    await deleteDoc(doc(db, 'playlists', playlistId));
    
    try {
      await updateDoc(doc(db, 'users', userId), {
        'stats.totalPlaylists': increment(-1)
      });
    } catch (statsErr) {
      console.warn('⚠️ Could not update stats on delete');
    }

    console.log('✅ Playlist deleted:', playlistId);
    return { success: true };
  } catch (e) {
    console.error('❌ deletePlaylist error:', e);
    return { success: false, error: e.message };
  }
}

export async function getUserPlaylists(userId) {
  try {
    console.log('📥 Fetching playlists for user:', userId);
    
    const q = query(
      collection(db, 'playlists'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snap = await getDocs(q);
    const playlists = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    console.log('✅ Found', playlists.length, 'playlists');
    console.log('Playlists:', playlists);
    
    return { success: true, playlists };
  } catch (e) {
    console.error('❌ getUserPlaylists error:', e);
    console.error('Error code:', e.code);
    console.error('Error message:', e.message);
    
    // If index error, provide helpful message
    if (e.code === 'failed-precondition') {
      console.error('🔴 FIRESTORE INDEX REQUIRED!');
      console.error('Go to Firebase Console → Firestore → Indexes');
      console.error('Create composite index: userId (Ascending) + createdAt (Descending)');
    }
    
    return { success: false, error: e.message, playlists: [] };
  }
}

// ============================================================
// COMMUNITY BROWSE
// ============================================================

export async function getCommunityPlaylists(options = {}) {
  try {
    const { genreFilter, limitCount = 40 } = options;
    
    console.log('📥 Fetching community playlists...');

    let q;
    if (genreFilter && genreFilter !== 'all') {
      q = query(
        collection(db, 'playlists'),
        where('isPublic', '==', true),
        where('genre', '==', genreFilter),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    } else {
      q = query(
        collection(db, 'playlists'),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }

    const snap = await getDocs(q);
    const playlists = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    console.log('✅ Found', playlists.length, 'community playlists');
    
    return { success: true, playlists };
  } catch (e) {
    console.error('❌ getCommunityPlaylists error:', e);
    
    if (e.code === 'failed-precondition') {
      console.error('🔴 FIRESTORE INDEX REQUIRED!');
      console.error('Go to Firebase Console → Firestore → Indexes');
      console.error('Create composite index: isPublic (Ascending) + createdAt (Descending)');
    }
    
    return { success: false, error: e.message, playlists: [] };
  }
}

export async function getMostPlayedPlaylists(limitCount = 20) {
  try {
    const q = query(
      collection(db, 'playlists'),
      where('isPublic', '==', true),
      orderBy('playCount', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const playlists = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    console.log('✅ Found', playlists.length, 'most played playlists');
    
    return { success: true, playlists };
  } catch (e) {
    console.error('❌ getMostPlayedPlaylists error:', e);
    return { success: false, error: e.message, playlists: [] };
  }
}

// ============================================================
// ANALYTICS
// ============================================================

export async function recordPlay(playlistId, userId = null) {
  try {
    await updateDoc(doc(db, 'playlists', playlistId), {
      playCount: increment(1)
    });

    await addDoc(collection(db, 'plays'), {
      playlistId,
      userId,
      playedAt: serverTimestamp()
    });

    const playlistSnap = await getDoc(doc(db, 'playlists', playlistId));
    if (playlistSnap.exists()) {
      const ownerId = playlistSnap.data().userId;
      await updateDoc(doc(db, 'users', ownerId), {
        'stats.totalPlays': increment(1)
      });
    }

    return { success: true };
  } catch (e) {
    console.warn('⚠️ recordPlay error (non-critical):', e);
    return { success: false, error: e.message };
  }
}

export async function incrementProfileViews(userId) {
  try {
    await updateDoc(doc(db, 'users', userId), {
      'stats.profileViews': increment(1)
    });
  } catch (e) {
    console.warn('⚠️ incrementProfileViews error (non-critical)');
  }
}