'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore,
  initializeFirestore, 
  CACHE_SIZE_UNLIMITED,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore'

/**
 * تهيئة Firebase مع ضمان عدم التكرار.
 * تم تحسين هذا الجزء ليعمل بكفاءة في بيئة تطوير Next.js (HMR).
 */
export function initializeFirebase() {
  let firebaseApp: FirebaseApp;
  
  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }

  return getSdks(firebaseApp);
}

/**
 * جلب خدمات Firebase مع تطبيق إعدادات المزامنة والاتصال المتقدمة.
 */
export function getSdks(firebaseApp: FirebaseApp) {
  let firestore;
  try {
    /**
     * محاولة تهيئة Firestore بإعدادات مخصصة:
     * 1. experimentalForceLongPolling: يحل مشاكل الاتصال في بيئات الحماية أو الشبكات الضعيفة.
     * 2. localCache: تفعيل التخزين المحلي المتطور لدعم العمل بدون إنترنت (Offline-First).
     */
    firestore = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (e) {
    /**
     * في حال كانت قاعدة البيانات مهيأة مسبقاً (كما يحدث عند تحديث الكود لحظياً)، 
     * نقوم بجلب النسخة الموجودة بالفعل بدلاً من إعادة التهيئة.
     */
    firestore = getFirestore(firebaseApp);
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
