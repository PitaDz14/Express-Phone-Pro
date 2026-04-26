
'use client';

import * as React from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { ShieldCheck, Loader2 } from 'lucide-react';

const STORE_NAME = 'ep_sync_store';
const KEY_NAME = 'active_file_handle';

/**
 * AutoBackup Component
 * Periodically saves a snapshot of the Firestore collections to LocalStorage and Bound File.
 * Enhanced with a master heartbeat interval to prevent worker termination issues.
 */
export function AutoBackup() {
  const db = useFirestore();
  const { role } = useUser();
  const [lastBackup, setLastBackup] = React.useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = React.useState(false);

  const getHandleFromIDB = (): Promise<any> => {
    return new Promise((resolve) => {
      const request = indexedDB.open(STORE_NAME, 1);
      request.onsuccess = (e: any) => {
        const idb = e.target.result;
        if (!idb.objectStoreNames.contains('handles')) { resolve(null); return; }
        const tx = idb.transaction('handles', 'readonly');
        const store = tx.objectStore('handles');
        const getRequest = store.get(KEY_NAME);
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    });
  };

  const performBackup = React.useCallback(async () => {
    if (isBackingUp || !role) return;
    
    setIsBackingUp(true);
    try {
      const collections = ["categories", "products", "customers", "invoices", "user_roles"];
      const fullBackup: any = {
        timestamp: new Date().toISOString(),
        data: {}
      };

      for (const colName of collections) {
        try {
          const snapshot = await getDocs(collection(db, colName));
          fullBackup.data[colName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (colErr) {
          console.error(`Failed to backup collection: ${colName}`, colErr);
        }
      }

      const backupStr = JSON.stringify(fullBackup, null, 2);
      
      // 1. Save to LocalStorage (Emergency fallback)
      if (backupStr.length < 4.5 * 1024 * 1024) { 
        localStorage.setItem('ep_emergency_backup', backupStr);
      }
      
      // 2. Save to Linked File (Smart Sync)
      try {
        const handle = await getHandleFromIDB();
        if (handle) {
          const permission = await handle.queryPermission({ mode: 'readwrite' });
          if (permission === 'granted') {
            const writable = await handle.createWritable();
            await writable.write(backupStr);
            await writable.close();
            console.log('[AutoBackup] Linked file updated successfully');
          }
        }
      } catch (fileErr) {
        console.warn('[AutoBackup] File sync skipped or failed:', fileErr);
      }

      const time = new Date().toLocaleTimeString('ar-DZ', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      localStorage.setItem('ep_global_last_backup_time', time);
      setLastBackup(time);
      window.dispatchEvent(new CustomEvent('ep-global-backup-updated', { detail: time }));
      
    } catch (error) {
      console.error("AutoBackup Core Error:", error);
    } finally {
      setIsBackingUp(false);
    }
  }, [db, isBackingUp, role]);

  React.useEffect(() => {
    // 1. Master Heartbeat: Force sync every 5 minutes while tab is open
    const intervalId = setInterval(() => {
      console.log('[Heartbeat] Triggering 5-minute backup');
      performBackup();
    }, 5 * 60 * 1000);

    // 2. Global Listener for explicit requests (e.g. from Sync button or Worker)
    const handleSyncRequest = () => performBackup();
    const handleTimestampSync = (e: any) => { if (e.detail) setLastBackup(e.detail); };

    window.addEventListener('perform-system-backup', handleSyncRequest);
    window.addEventListener('ep-global-backup-updated', handleTimestampSync);
    
    const savedTime = localStorage.getItem('ep_global_last_backup_time');
    if (savedTime) setLastBackup(savedTime);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('perform-system-backup', handleSyncRequest);
      window.removeEventListener('ep-global-backup-updated', handleTimestampSync);
    };
  }, [performBackup]);

  return (
    <div className="fixed bottom-4 right-4 z-[200] no-print hidden md:block">
       <div className="glass-premium px-3 py-1.5 rounded-full flex items-center gap-2 border-white/10 shadow-lg">
          {isBackingUp ? (
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
          ) : (
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
          )}
          <span className="text-[8px] font-black uppercase tracking-widest opacity-60">
            {isBackingUp ? "جاري التزامن..." : `نبض النظام: ${lastBackup || "جاري التحضير"}`}
          </span>
       </div>
    </div>
  );
}
