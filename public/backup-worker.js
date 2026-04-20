
/**
 * Express Phone Pro - Background Backup Worker
 * This worker manages the persistent timer for system-wide backups.
 */

let backupInterval = null;
const FIVE_MINUTES = 5 * 60 * 1000;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('[Backup Worker] Installed');
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
  console.log('[Backup Worker] Activated');
});

self.addEventListener('message', (event) => {
  const { type } = event.data;

  if (type === 'START_BACKUP') {
    if (!backupInterval) {
      console.log('[Backup Worker] Starting 5-minute cycle...');
      backupInterval = setInterval(() => {
        triggerBackup();
      }, FIVE_MINUTES);
      // Initial trigger
      triggerBackup();
    }
  }

  if (type === 'MANUAL_BACKUP') {
    console.log('[Backup Worker] Manual trigger received');
    triggerBackup();
  }
});

async function triggerBackup() {
  const allClients = await clients.matchAll({ type: 'window' });
  if (allClients.length > 0) {
    // Ping only the first available client to perform the data fetch and write
    // This prevents multiple tabs from fighting over the file handle
    allClients[0].postMessage({ type: 'REQUEST_BACKUP_DATA' });
    console.log('[Backup Worker] Backup request sent to client');
  } else {
    console.log('[Backup Worker] No active windows found to perform backup');
  }
}
