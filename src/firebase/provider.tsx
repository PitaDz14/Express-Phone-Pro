
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, onSnapshotsInSync, doc, onSnapshot } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: User | null;
  role: string | null;
  username: string | null;
  isUserLoading: boolean;
  isRoleLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  role: string | null;
  username: string | null;
  isUserLoading: boolean;
  isRoleLoading: boolean;
  userError: Error | null;
  isOnline: boolean;
  isSyncing: boolean;
}

export interface FirebaseServicesAndUser extends FirebaseContextState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    role: null,
    username: null,
    isUserLoading: true,
    isRoleLoading: true,
    userError: null,
  });

  // Hydration-safe initial state for online status
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Set actual online status only after mount to avoid hydration mismatch
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribeSync = onSnapshotsInSync(firestore, () => {
      setIsSyncing(false);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeSync();
    };
  }, [firestore]);

  useEffect(() => {
    if (!auth) {
      setUserAuthState(prev => ({ ...prev, user: null, isUserLoading: false, userError: new Error("Auth service not provided.") }));
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Fetch role and username
        const roleRef = doc(firestore, "user_roles", firebaseUser.uid);
        const unsubscribeRole = onSnapshot(roleRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            setUserAuthState(prev => ({ 
              ...prev, 
              user: firebaseUser, 
              role: data.role || null,
              username: data.username || null,
              isUserLoading: false, 
              isRoleLoading: false 
            }));
          } else {
            setUserAuthState(prev => ({ 
              ...prev, 
              user: firebaseUser, 
              role: null,
              username: null,
              isUserLoading: false, 
              isRoleLoading: false 
            }));
          }
        }, (err) => {
           setUserAuthState(prev => ({ ...prev, user: firebaseUser, isUserLoading: false, isRoleLoading: false }));
        });
        return () => unsubscribeRole();
      } else {
        setUserAuthState(prev => ({ ...prev, user: null, role: null, username: null, isUserLoading: false, isRoleLoading: false }));
      }
    });
    return () => unsubscribe();
  }, [auth, firestore]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      role: userAuthState.role,
      username: userAuthState.username,
      isUserLoading: userAuthState.isUserLoading,
      isRoleLoading: userAuthState.isRoleLoading,
      userError: userAuthState.userError,
      isOnline,
      isSyncing,
    };
  }, [firebaseApp, firestore, auth, userAuthState, isOnline, isSyncing]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available.');
  }
  return context as FirebaseServicesAndUser;
};

export const useAuth = (): Auth => useFirebase().auth;
export const useFirestore = (): Firestore => useFirebase().firestore;
export const useFirebaseApp = (): FirebaseApp => useFirebase().firebaseApp;

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  const memoized = useMemo(factory, deps);
  if(typeof memoized === 'object' && memoized !== null) {
    (memoized as any).__memo = true;
  }
  return memoized;
}

export const useUser = () => {
  const { user, role, username, isUserLoading, isRoleLoading, userError } = useFirebase();
  return { user, role, username, isUserLoading, isRoleLoading, userError };
};

export const useSyncStatus = () => {
  const { isOnline, isSyncing } = useFirebase();
  return { isOnline, isSyncing };
};
