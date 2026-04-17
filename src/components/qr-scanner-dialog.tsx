'use client';

import * as React from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Camera, X, Loader2, RefreshCw } from "lucide-react"

interface QRScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScan: (code: string) => void
}

export function QRScannerDialog({ open, onOpenChange, onScan }: QRScannerDialogProps) {
  const [error, setError] = React.useState<string | null>(null)
  const [isCameraReady, setIsCameraReady] = React.useState(false)
  const html5QrCodeRef = React.useRef<Html5Qrcode | null>(null)
  const scannerId = "qr-reader-target-container"

  const stopScanner = React.useCallback(async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current.clear()
      } catch (err) {
        console.warn("Failed to stop scanner cleanly:", err)
      }
    }
  }, [])

  React.useEffect(() => {
    if (open) {
      setIsCameraReady(false)
      setError(null)
      
      const startScanner = async () => {
        // Wait a bit to ensure the Dialog DOM is fully stable
        await new Promise(resolve => setTimeout(resolve, 600));
        
        try {
          const container = document.getElementById(scannerId);
          if (!container) return;

          const html5QrCode = new Html5Qrcode(scannerId);
          html5QrCodeRef.current = html5QrCode;
          
          const config = { 
            fps: 10, 
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0
          };

          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              onScan(decodedText);
              onOpenChange(false);
            },
            () => {} 
          );
          setIsCameraReady(true);
        } catch (err: any) {
          console.error("QR Start Error:", err);
          let msg = "تعذر تشغيل الكاميرا.";
          if (err.name === 'NotAllowedError') msg = "يرجى منح إذن الكاميرا للمتصفح.";
          setError(msg);
        }
      };

      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [open, onScan, onOpenChange, stopScanner]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="glass border-none rounded-[2rem] shadow-2xl p-0 overflow-hidden z-[400] max-w-md w-[95%] mx-auto">
        <DialogHeader className="p-6 bg-primary/5 border-b border-white/5">
          <DialogTitle className="text-xl font-black text-gradient-premium flex items-center gap-3">
            <Camera className="h-6 w-6 text-primary" /> مسح كود QR
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-4 md:p-8 space-y-6">
          <div className="relative w-full aspect-square bg-black/10 rounded-2xl overflow-hidden border-2 border-dashed border-primary/20 shadow-inner">
            {/* 
                Important: The scanner target div MUST NOT have React-managed children 
                while scanning to prevent hydration/DOM update conflicts.
            */}
            <div id={scannerId} className="w-full h-full" />
            
            {!isCameraReady && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm gap-4 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">جاري تهيئة الكاميرا...</p>
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 p-6 text-center space-y-4 z-20">
                <div className="h-12 w-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center">
                   <X className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-destructive leading-tight">{error}</p>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="rounded-xl font-bold h-9">
                  <RefreshCw className="h-3 w-3 ml-2" /> تحديث الصفحة
                </Button>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-primary/5 rounded-2xl text-center border border-primary/10">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">ضع الكود داخل المربع للمسح</p>
          </div>
        </div>

        <div className="p-6 bg-black/5 flex justify-center">
          <Button variant="ghost" className="rounded-2xl px-10 h-12 font-black text-muted-foreground hover:text-primary" onClick={() => onOpenChange(false)}>
            إلغاء وإغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
