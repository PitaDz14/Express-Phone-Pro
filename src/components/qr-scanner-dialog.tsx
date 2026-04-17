
'use client';

import * as React from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Camera, X } from "lucide-react"

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
          const html5QrCode = new Html5Qrcode("qr-reader-container")
          html5QrCodeRef.current = html5QrCode
          
          const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 250 } 
          }

          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              onScan(decodedText)
              onOpenChange(false)
            },
            () => {} // silent feedback for scan errors
          )
          setIsCameraReady(true)
        } catch (err) {
          console.error("Camera access error:", err)
          setError("تعذر الوصول إلى الكاميرا. يرجى التأكد من منح الأذونات اللازمة للمتصفح.")
        }
      }

      // Small timeout to ensure the element is in the DOM
      const timer = setTimeout(startScanner, 100)
      return () => {
        clearTimeout(timer)
        if (html5QrCodeRef.current?.isScanning) {
          html5QrCodeRef.current.stop().catch(console.error)
        }
      }
    }
  }, [open, onScan, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="glass border-none rounded-[2.5rem] shadow-2xl p-0 overflow-hidden z-[300]">
        <DialogHeader className="p-8 bg-primary/5 border-b border-white/5">
          <DialogTitle className="text-xl font-black text-gradient-premium flex items-center gap-3">
            <Camera className="h-6 w-6" /> مسح كود المنتج (QR/Barcode)
          </DialogTitle>
        </DialogHeader>
        <div className="p-8 space-y-4">
          <div 
            id="qr-reader-container" 
            className="w-full aspect-square bg-black/10 rounded-3xl overflow-hidden border-2 border-dashed border-primary/20 flex items-center justify-center relative"
          >
            {!isCameraReady && !error && (
              <div className="text-center animate-pulse">
                <p className="text-xs font-bold text-muted-foreground">جاري تشغيل الكاميرا...</p>
              </div>
            )}
            {error && (
              <div className="p-6 text-center">
                <p className="text-sm font-black text-destructive">{error}</p>
              </div>
            )}
          </div>
          <div className="p-4 bg-primary/5 rounded-2xl text-center">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest">ضع الكود داخل المربع للمسح التلقائي</p>
          </div>
        </div>
        <div className="p-6 bg-black/5 text-center">
          <Button variant="outline" className="rounded-2xl px-12 h-12 font-black border-white/20" onClick={() => onOpenChange(false)}>
            إلغاء المسح
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
