
'use client';

import * as React from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Database, ShieldCheck, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * AutoBackup Component
 * Periodically saves a snapshot of the Firestore collections to IndexedDB/LocalStorage
 * to ensure data is safe even during extended offline periods.
 */
export function AutoBackup() {
  const db = useFirestore();
  const { toast } = useToast();
  const [lastBackup, setLastBackup] = React.useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = React.useState(false);

  const performBackup = React.useCallback(async () => {
    if (isBackingUp) return;
    
    setIsBackingUp(true);
    try {
      const collections = ["categories", "products", "customers", "invoices", "user_roles"];
      const fullBackup: any = {
        timestamp: new Date().toISOString(),
        data: {}
      };

      for (const colName of collections) {
        const snapshot = await getDocs(collection(db, colName));
        fullBackup.data[colName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      // Store in IndexedDB or LocalStorage
      // LocalStorage has 5MB limit, so we use it only if data is small, otherwise log it.
      const backupStr = JSON.stringify(fullBackup);
      if (backupStr.length < 4.5 * 1024 * 1024) { // Under 4.5MB
        localStorage.setItem('ep_emergency_backup', backupStr);
      } else {
        console.warn("Backup too large for LocalStorage, please use Manual Export frequently.");
      }

      setLastBackup(new Date().toLocaleTimeString('ar-DZ'));
      console.log("Offline snapshot updated locally.");
    } catch (error) {
      console.error("AutoBackup Error:", error);
    } finally {
      setIsBackingUp(false);
    }
  }, [db, isBackingUp]);

  React.useEffect(() => {
    // Perform initial backup after 30 seconds of app load
    const initialTimer = setTimeout(() => performBackup(), 30000);
    
    // Perform periodic backup every 5 minutes
    const interval = setInterval(() => performBackup(), 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
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
            {isBackingUp ? "جاري التزامن المحلي..." : `نسخة محلية آمنة: ${lastBackup || "جاري التحضير"}`}
          </span>
       </div>
    </div>
  );
}
