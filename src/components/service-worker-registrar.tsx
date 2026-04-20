
'use client';

import * as React from 'react';

/**
 * ServiceWorkerRegistrar
 * Handles the registration of the background backup worker and listens for system-wide sync requests.
 */
export function ServiceWorkerRegistrar() {
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/backup-worker.js', { scope: '/' })
        .then((registration) => {
          console.log('[Service Worker] Registered with scope:', registration.scope);
          
          // Start the background timer
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'START_BACKUP' });
          }
        })
        .catch((err) => {
          console.error('[Service Worker] Registration failed:', err);
        });

      // Global Listener for Worker Pings
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'REQUEST_BACKUP_DATA') {
          console.log('[System] Background backup trigger received');
          // Dispatch a custom event that any component (like Settings or AutoBackup) can listen to
          window.dispatchEvent(new CustomEvent('perform-system-backup'));
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
    }
  }, []);

  return null;
}
