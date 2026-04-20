
/**
 * @fileOverview Service Worker for Express Phone Pro Backup System.
 * Manages a persistent timer to trigger data backups across sessions.
 */

let backupInterval = null;

// Force activation
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Message Listener
self.addEventListener('message', (event) => {
  if (event.data.type === 'START_BACKUP') {
    if (!backupInterval) {
      console.log('[Backup Worker] Timer initialized (5 min)');
      backupInterval = setInterval(() => {
        triggerBackupRequest();
      }, 5 * 60 * 1000); // 5 Minutes
    }
  }

  if (event.data.type === 'MANUAL_BACKUP') {
    console.log('[Backup Worker] Manual trigger received');
    triggerBackupRequest();
  }
});

/**
 * Pings all active browser tabs to perform the actual backup operation.
 */
async function triggerBackupRequest() {
  const allClients = await clients.matchAll({ type: 'window' });
  for (const client of allClients) {
    client.postMessage({ type: 'REQUEST_BACKUP_DATA' });
  }
}
