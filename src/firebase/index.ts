'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore,
  initializeFirestore, 
  enableMultiTabIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  let firebaseApp: FirebaseApp;
  
  if (!getApps().length) {
    try {
      firebaseApp = initializeApp();
    } catch (e) {
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }
    
    // Initial setup for the first time the app is created
    const sdks = getSdks(firebaseApp);
    
    // Enable Multi-Tab IndexedDB Persistence for robust Offline-First capability
    if (typeof window !== "undefined") {
      enableMultiTabIndexedDbPersistence(sdks.firestore).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('Persistence failed: Multiple tabs open.');
        } else if (err.code === 'unimplemented') {
          console.warn('Persistence is not supported by this browser.');
        }
      });
    }
    
    return sdks;
  }

  firebaseApp = getApp();
  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  let firestore;
  try {
    // Attempt to retrieve the existing firestore instance
    firestore = getFirestore(firebaseApp);
  } catch (e) {
    // If not initialized yet, initialize with specific settings for stable connectivity and robust offline
    firestore = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      // Optimized for robust local storage
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  }

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: firestore
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
