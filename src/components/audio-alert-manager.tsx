'use client';

import * as React from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import { playSystemSound } from '@/lib/audio-utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShieldAlert, PackageSearch } from 'lucide-react';

/**
 * AudioAlertManager Component
 * Checks for critical priority products that are low on stock and triggers audio alerts on load.
 * Mounted in layout.tsx to ensure it only runs once per app session and survives navigation.
 */
export function AudioAlertManager() {
  const { user, role } = useUser();
  const db = useFirestore();
  
  // CRITICAL FIX: Only create reference if user and role are available to avoid permission errors
  const productsRef = useMemoFirebase(() => {
    if (!user || !role) return null;
    return collection(db, "products");
  }, [db, user, role]);

  const { data: products } = useCollection(productsRef);
  
  const [criticalItems, setCriticalItems] = React.useState<any[]>([]);
  const [showWarning, setShowWarning] = React.useState(false);
  const [hasAlerted, setHasAlerted] = React.useState(false);

  React.useEffect(() => {
    // Only fire if we have data and haven't alerted in this component lifetime
    if (products && products.length > 0 && !hasAlerted) {
      const critical = products.filter(p => 
        p.isPriority === true && 
        Number(p.quantity) <= (Number(p.minStockQuantity) || 1)
      );

      if (critical.length > 0) {
        setCriticalItems(critical);
        setShowWarning(true);
        playSystemSound('alert');
        setHasAlerted(true);
      }
    }
  }, [products, hasAlerted]);

  return (
    <Dialog open={showWarning} onOpenChange={setShowWarning}>
      <DialogContent dir="rtl" className="glass border-none rounded-[2.5rem] shadow-2xl z-[600] max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-8 bg-red-600 text-white relative">
           <div className="absolute top-0 right-0 p-8 opacity-10"><ShieldAlert className="h-24 w-24" /></div>
           <div className="flex items-center gap-4 relative z-10">
              <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20 animate-pulse">
                 <AlertTriangle className="h-8 w-8 text-white" />
              </div>
              <div>
                 <DialogTitle className="text-2xl font-black">تنبيه مخزون حرج!</DialogTitle>
                 <p className="text-xs font-bold text-white/70 uppercase tracking-widest mt-1">توجد منتجات بالغة الأهمية على وشك النفاد</p>
              </div>
           </div>
        </DialogHeader>
        
        <div className="p-8 space-y-6">
           <div className="space-y-3">
              <p className="font-black text-sm text-red-600">القائمة المستهدفة:</p>
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                 {criticalItems.map(item => (
                   <div key={item.id} className="p-4 rounded-2xl bg-red-50 border border-red-100 flex justify-between items-center group hover:bg-red-100 transition-all">
                      <div className="flex items-center gap-3">
                         <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                            <PackageSearch className="h-5 w-5 text-red-600" />
                         </div>
                         <div className="flex flex-col">
                            <span className="font-black text-xs text-slate-800">{item.name}</span>
                            <span className="text-[10px] text-red-600 font-bold uppercase tracking-widest">#{item.productCode}</span>
                         </div>
                      </div>
                      <div className="flex flex-col items-end">
                         <span className="font-black text-lg text-red-700 tabular-nums leading-none">{item.quantity}</span>
                         <span className="text-[9px] font-bold text-red-400">قطعة متبقية</span>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 shrink-0"><ShieldAlert className="h-4 w-4" /></div>
              <p className="text-[10px] font-bold text-orange-800 leading-relaxed italic">
                 ملاحظة: تظهر هذه القائمة فقط للمنتجات التي حددتها أنت كـ "بالغة الأهمية" في إعدادات المخزون.
              </p>
           </div>
        </div>

        <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100">
           <Button onClick={() => setShowWarning(false)} className="w-full h-14 rounded-2xl bg-red-600 text-white font-black text-lg shadow-xl shadow-red-500/20 hover:bg-red-700 transition-all">
              أدركت ذلك، سأقوم بالتوريد فوراً
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
