
'use client';

import * as React from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Camera, X, Loader2 } from "lucide-react"

interface QRScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScan: (code: string) => void
}

export function QRScannerDialog({ open, onOpenChange, onScan }: QRScannerDialogProps) {
  const [error, setError] = React.useState<string | null>(null)
  const [isCameraReady, setIsCameraReady] = React.useState(false)
  const html5QrCodeRef = React.useRef<Html5Qrcode | null>(null)

  React.useEffect(() => {
    if (open) {
      setIsCameraReady(false)
      setError(null)
      
      const startScanner = async () => {
        try {
          // Small delay to ensure the DOM element is rendered
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const container = document.getElementById("qr-reader-container");
          if (!container) {
            setError("عذراً، تعذر العثور على حاوية الكاميرا");
            return;
          }

          const html5QrCode = new Html5Qrcode("qr-reader-container");
          html5QrCodeRef.current = html5QrCode;
          
          const config = { 
            fps: 15, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          };

          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              onScan(decodedText);
              onOpenChange(false);
            },
            () => {} // silent feedback for scan errors during polling
          );
          setIsCameraReady(true);
        } catch (err: any) {
          console.error("Camera access error:", err);
          let msg = "تعذر الوصول إلى الكاميرا.";
          if (err.name === 'NotAllowedError') msg = "يرجى منح إذن الكاميرا للمتصفح للمتابعة.";
          setError(msg);
        }
      };

      startScanner();
      
      return () => {
        if (html5QrCodeRef.current?.isScanning) {
          html5QrCodeRef.current.stop().catch(console.error);
        }
      };
    }
  }, [open, onScan, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="glass border-none rounded-[2.5rem] shadow-2xl p-0 overflow-hidden z-[400] max-w-md mx-auto">
        <DialogHeader className="p-6 bg-primary/5 border-b border-white/5">
          <DialogTitle className="text-xl font-black text-gradient-premium flex items-center gap-3">
            <Camera className="h-6 w-6" /> مسح كود المنتج (QR/Barcode)
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 md:p-8 space-y-6">
          <div 
            id="qr-reader-container" 
            className="w-full aspect-square bg-black/5 rounded-3xl overflow-hidden border-2 border-dashed border-primary/20 flex items-center justify-center relative shadow-inner"
          >
            {!isCameraReady && !error && (
              <div className="text-center flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest animate-pulse">جاري تشغيل الكاميرا...</p>
              </div>
            )}
            {error && (
              <div className="p-6 text-center space-y-4">
                <div className="h-12 w-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
                   <X className="h-6 w-6" />
                </div>
                <p className="text-sm font-black text-destructive leading-relaxed">{error}</p>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="rounded-xl font-bold">تحديث الصفحة</Button>
              </div>
            )}
          </div>
          <div className="p-4 bg-primary/5 rounded-2xl text-center border border-primary/10">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">ضع الكود داخل الإطار للمسح التلقائي</p>
          </div>
        </div>
        <div className="p-6 bg-black/5 text-center">
          <Button variant="ghost" className="rounded-2xl px-12 h-12 font-black text-muted-foreground hover:text-primary transition-colors" onClick={() => onOpenChange(false)}>
            إلغاء العملية
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
