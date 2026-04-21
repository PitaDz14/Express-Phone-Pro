
'use client';

import * as React from "react"
import { RefreshCw, ShieldAlert, HardDrive, CheckCircle2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import { useUser, useFirestore } from "@/firebase"
import { collection, getDocs } from "firebase/firestore"
import { cn } from "@/lib/utils"

const STORE_NAME = 'ep_sync_store';
const KEY_NAME = 'active_file_handle';

export function SyncReconnectButton() {
  const { toast } = useToast()
  const db = useFirestore()
  const { role } = useUser()
  const isAdmin = role === "Admin"
  
  const [status, setStatus] = React.useState<'none' | 'needs-reconnect' | 'healthy' | 'mobile-fallback'>('none')
  const [fileHandle, setFileHandle] = React.useState<any>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)

  // Detect File System Access API Support
  const isApiSupported = typeof window !== 'undefined' && 'showSaveFilePicker' in window;

  const getHandleFromIDB = (): Promise<any> => {
    return new Promise((resolve) => {
      const request = indexedDB.open(STORE_NAME, 1);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('handles')) {
          db.createObjectStore('handles');
        }
      };
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('handles')) {
          resolve(null);
          return;
        }
        const tx = db.transaction('handles', 'readonly');
        const store = tx.objectStore('handles');
        const getRequest = store.get(KEY_NAME);
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    });
  };

  const checkStatus = React.useCallback(async () => {
    if (!isApiSupported) {
      setStatus('mobile-fallback');
      return;
    }

    const savedHandle = await getHandleFromIDB();
    if (savedHandle) {
      setFileHandle(savedHandle);
      try {
        const permission = await savedHandle.queryPermission({ mode: 'readwrite' });
        if (permission === 'granted') {
          setStatus('healthy');
        } else {
          setStatus('needs-reconnect');
        }
      } catch (e) {
        setStatus('needs-reconnect');
      }
    } else {
      setStatus('none');
    }
  }, [isApiSupported]);

  React.useEffect(() => {
    checkStatus();
    window.addEventListener('focus', checkStatus);
    window.addEventListener('perform-system-backup', checkStatus);
    return () => {
      window.removeEventListener('focus', checkStatus);
      window.removeEventListener('perform-system-backup', checkStatus);
    }
  }, [checkStatus]);

  const performManualExport = async () => {
    setIsProcessing(true);
    try {
      const collections = ["categories", "products", "customers", "invoices", "user_roles"];
      const backup: any = { timestamp: new Date().toISOString(), data: {} };
      for (const col of collections) {
        const snap = await getDocs(collection(db, col));
        backup.data[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ExpressPhone_MobileBackup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      toast({ title: "تم الحفظ بنجاح", description: "تم تحميل النسخة الاحتياطية لجهازك." });
    } catch (err) {
      toast({ variant: "destructive", title: "فشل التحميل", description: "حدث خطأ أثناء جمع البيانات." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAction = async () => {
    if (isProcessing) return;

    if (status === 'mobile-fallback') {
      await performManualExport();
      return;
    }

    setIsProcessing(true);
    try {
      if (status === 'none') {
        // @ts-ignore
        const handle = await window.showSaveFilePicker({
          suggestedName: `ExpressPhonePro_Sync_${new Date().toISOString().split('T')[0]}.json`,
          types: [{ description: 'JSON Data File', accept: { 'application/json': ['.json'] } }],
        });
        
        const request = indexedDB.open(STORE_NAME, 1);
        request.onsuccess = (e: any) => {
          const db = e.target.result;
          const tx = db.transaction('handles', 'readwrite');
          tx.objectStore('handles').put(handle, KEY_NAME);
        };

        setFileHandle(handle);
        setStatus('healthy');
        toast({ title: "تم تفعيل المزامنة", description: "تم ربط ملف الجهاز بنجاح." });
      } else if (status === 'needs-reconnect') {
        if (await fileHandle.requestPermission({ mode: 'readwrite' }) === 'granted') {
          setStatus('healthy');
          toast({ title: "تمت استعادة الاتصال", description: "المزامنة نشطة الآن." });
        }
      }
      
      window.dispatchEvent(new CustomEvent('perform-system-backup'));
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast({ variant: "destructive", title: "خطأ في العملية", description: "تعذر إكمال طلب المزامنة." });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAdmin || status === 'healthy') return null;

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            onClick={handleAction}
            variant="ghost" 
            size="icon"
            className={cn(
              "h-9 w-9 md:h-11 md:w-11 rounded-xl transition-all duration-500 shadow-lg border",
              status === 'needs-reconnect' 
                ? "bg-orange-500/10 text-orange-500 border-orange-500/20 animate-pulse" 
                : status === 'mobile-fallback'
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20",
              isProcessing && "opacity-50"
            )}
          >
            {isProcessing ? (
              <RefreshCw className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
            ) : status === 'needs-reconnect' ? (
              <ShieldAlert className="h-4 w-4 md:h-5 md:w-5" />
            ) : status === 'mobile-fallback' ? (
              <Download className="h-4 w-4 md:h-5 md:w-5" />
            ) : (
              <HardDrive className="h-4 w-4 md:h-5 md:w-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className={cn("text-white border-none rounded-xl font-black text-[10px] px-3 py-1.5", 
          status === 'needs-reconnect' ? "bg-orange-600" : 
          status === 'mobile-fallback' ? "bg-emerald-600" : "bg-primary")}>
          {status === 'needs-reconnect' ? "بانتظار استعادة إذن المزامنة" : 
           status === 'mobile-fallback' ? "تحميل نسخة احتياطية سريعة" : "تأمين البيانات: ربط ملف محلي"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
