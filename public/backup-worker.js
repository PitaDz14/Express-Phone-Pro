/* eslint-disable no-restricted-globals */

/**
 * Express Phone Pro - Background Backup Worker
 * يدير هذا الملف العداد الزمني للنسخ الاحتياطي في الخلفية لضمان استمراريته 
 * حتى عند التنقل بين الصفحات أو تحديث الموقع.
 */

const BACKUP_INTERVAL = 5 * 60 * 1000; // 5 دقائق
let backupTimer = null;

// تثبيت الـ Worker وتفعيله فوراً
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

/**
 * إرسال إشارة لكافة التبويبات المفتوحة لبدء عملية الحفظ
 */
function requestBackupFromClients() {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: 'REQUEST_BACKUP_DATA' });
    });
  });
}

// الاستماع للرسائل القادمة من التطبيق الرئيسي
self.addEventListener('message', (event) => {
  if (event.data.type === 'START_BACKUP') {
    if (!backupTimer) {
      console.log('[Worker] بدأ عداد المزامنة التلقائية (كل 5 دقائق)');
      backupTimer = setInterval(requestBackupFromClients, BACKUP_INTERVAL);
    }
  }
  
  if (event.data.type === 'MANUAL_BACKUP') {
    console.log('[Worker] تم طلب مزامنة يدوية فورية');
    requestBackupFromClients();
  }
});
