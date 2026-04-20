
'use client';

import * as React from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { ShieldCheck, Loader2 } from 'lucide-react';

/**
 * AutoBackup Component
 * Periodically saves a snapshot of the Firestore collections to LocalStorage.
 * Listens to global 'perform-system-backup' events from the Service Worker.
 */
export function AutoBackup() {
  const db = useFirestore();
  const { role } = useUser();
  const [lastBackup, setLastBackup] = React.useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = React.useState(false);

  const performBackup = React.useCallback(async () => {
    if (isBackingUp || !role) return;
    
    setIsBackingUp(true);
    try {
      const collections = ["categories", "products", "customers", "invoices"];
      if (role === 'Admin') collections.push("user_roles");

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

      const backupStr = JSON.stringify(fullBackup);
      if (backupStr.length < 4.5 * 1024 * 1024) { 
        localStorage.setItem('ep_emergency_backup', backupStr);
      }
      
      const time = new Date().toLocaleTimeString('ar-DZ');
      setLastBackup(time);
      localStorage.setItem('last_backup_time', time);
    } catch (error) {
      console.error("AutoBackup Core Error:", error);
    } finally {
      setIsBackingUp(false);
    }
  }, [db, isBackingUp, role]);

  React.useEffect(() => {
    // Respond to Service Worker requests
    const handleSyncRequest = () => {
      console.log('[AutoBackup] Responding to background trigger');
      performBackup();
    };

    window.addEventListener('perform-system-backup', handleSyncRequest);
    
    // Initial sync
    const initialTimer = setTimeout(() => performBackup(), 5000);
    
    // Load last time from storage
    const savedTime = localStorage.getItem('last_backup_time');
    if (savedTime) setLastBackup(savedTime);

    return () => {
      window.removeEventListener('perform-system-backup', handleSyncRequest);
      clearTimeout(initialTimer);
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
            {isBackingUp ? "جاري التزامن المحلي..." : `نسخة طوارئ: ${lastBackup || "جاري التحضير"}`}
          </span>
       </div>
    </div>
  );
}
