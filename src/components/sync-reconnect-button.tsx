
'use client';

import * as React from "react"
import { RefreshCw, Lock, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const STORE_NAME = 'ep_sync_store';
const KEY_NAME = 'active_file_handle';

export function SyncReconnectButton() {
  const { toast } = useToast()
  const [needsAction, setNeedsAction] = React.useState(false)
  const [fileHandle, setFileHandle] = React.useState<any>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)

  const getHandleFromIDB = (): Promise<any> => {
    return new Promise((resolve) => {
      const request = indexedDB.open(STORE_NAME, 1);
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
    const savedHandle = await getHandleFromIDB();
    if (savedHandle) {
      setFileHandle(savedHandle);
      try {
        const permission = await savedHandle.queryPermission({ mode: 'readwrite' });
        setNeedsAction(permission !== 'granted');
      } catch (e) {
        setNeedsAction(true);
      }
    } else {
      setNeedsAction(false);
    }
  }, []);

  React.useEffect(() => {
    checkStatus();
    // Check again when window gets focus (user comes back to tab)
    window.addEventListener('focus', checkStatus);
    return () => window.removeEventListener('focus', checkStatus);
  }, [checkStatus]);

  const handleReconnect = async () => {
    if (!fileHandle || isProcessing) return;
    setIsProcessing(true);
    try {
      if (await fileHandle.requestPermission({ mode: 'readwrite' }) === 'granted') {
        setNeedsAction(false);
        // Trigger global backup event
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'START_BACKUP' });
        }
        window.dispatchEvent(new CustomEvent('perform-system-backup'));
        
        toast({ 
          title: "تمت استعادة المزامنة", 
          description: "تم ربط الملف المحلي بنجاح، بياناتك الآن في أمان.",
        });
      }
    } catch (err) {
      console.error("Reconnect failed", err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!needsAction) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            onClick={handleReconnect}
            variant="ghost" 
            size="icon"
            className={cn(
              "h-9 w-9 md:h-11 md:w-11 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500 hover:text-white transition-all duration-500 shadow-lg shadow-orange-500/10",
              !isProcessing && "animate-pulse"
            )}
          >
            {isProcessing ? (
              <RefreshCw className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
            ) : (
              <ShieldAlert className="h-4 w-4 md:h-5 md:w-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-orange-600 text-white border-none rounded-xl font-black text-[10px] px-3 py-1.5">
          بانتظار تفعيل المزامنة المباشرة
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
