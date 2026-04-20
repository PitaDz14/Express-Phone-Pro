'use client';

import * as React from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { ShieldCheck, Loader2 } from 'lucide-react';

/**
 * AutoBackup Component
 * Periodically saves a snapshot of the Firestore collections to LocalStorage
 * Fixed: Only backups user_roles if the user is an Admin to prevent permission errors.
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
      // Base collections that everyone (Admin/Worker) can read
      const collections = ["categories", "products", "customers", "invoices"];
      
      // Sensitive collections only Admins can read
      if (role === 'Admin') {
        collections.push("user_roles");
      }

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
      } else {
        console.warn("Backup too large for LocalStorage, please use Manual Export.");
      }

      setLastBackup(new Date().toLocaleTimeString('ar-DZ'));
    } catch (error) {
      console.error("AutoBackup Core Error:", error);
    } finally {
      setIsBackingUp(false);
    }
  }, [db, isBackingUp, role]);

  React.useEffect(() => {
    const initialTimer = setTimeout(() => performBackup(), 30000);
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
