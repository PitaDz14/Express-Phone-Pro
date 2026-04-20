'use client';

import * as React from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Camera, X, Loader2, RefreshCw, Smartphone, Laptop } from "lucide-react"

interface QRScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScan: (code: string) => void
}

export function QRScannerDialog({ open, onOpenChange, onScan }: QRScannerDialogProps) {
  const [error, setError] = React.useState<string | null>(null)
  const [isCameraReady, setIsCameraReady] = React.useState(false)
  const [cameras, setCameras] = React.useState<{ id: string, label: string }[]>([])
  const [selectedCameraId, setSelectedCameraId] = React.useState<string>("")
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

  const startScanner = React.useCallback(async (deviceId?: string) => {
    setIsCameraReady(false)
    setError(null)
    
    // Small delay to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 500))

    try {
      const container = document.getElementById(scannerId)
      if (!container) return

      // Create new instance if not exists
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerId)
      }

      // If already scanning, stop it first to switch device
      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop()
      }

      const config = { 
        fps: 15, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      }

      // Use specific deviceId if provided, otherwise default to environment
      const request = deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "environment" }

      await html5QrCodeRef.current.start(
        request,
        config,
        (decodedText) => {
          onScan(decodedText)
          onOpenChange(false)
        },
        () => {} // silent ignore frame errors
      )
      setIsCameraReady(true)
    } catch (err: any) {
      console.error("QR Start Error:", err)
      let msg = "تعذر تشغيل الكاميرا المختارة."
      if (err.name === 'NotAllowedError') msg = "يرجى منح إذن الكاميرا للمتصفح لاستخدام هذه الميزة."
      if (err.name === 'NotFoundError') msg = "لم يتم العثور على كاميرا متصلة. يرجى ربط كاميرا USB أو Bluetooth."
      setError(msg)
    }
  }, [onScan, onOpenChange])

  // Get available cameras on open
  React.useEffect(() => {
    if (open) {
      Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length > 0) {
          setCameras(devices.map(d => ({ id: d.id, label: d.label })))
          // Auto-select first camera if none selected
          if (!selectedCameraId) {
            setSelectedCameraId(devices[0].id)
          }
          startScanner(selectedCameraId || devices[0].id)
        } else {
          setError("لا توجد كاميرا مكتشفة. يرجى التأكد من ربط كاميرا بالحاسوب.")
        }
      }).catch(err => {
        console.error("Fetch Cameras Error:", err)
        setError("فشل الوصول لأجهزة الكاميرا. تأكد من ربط الجهاز ومنح الصلاحيات.")
      })
    } else {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
  }, [open, selectedCameraId, startScanner, stopScanner])

  const handleCameraChange = (id: string) => {
    setSelectedCameraId(id)
    startScanner(id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="glass border-none rounded-[2rem] shadow-2xl p-0 overflow-hidden z-[400] max-w-md w-[95%] mx-auto">
        <DialogHeader className="p-6 bg-primary/5 border-b border-white/5">
          <DialogTitle className="text-xl font-black text-gradient-premium flex items-center gap-3">
            <Camera className="h-6 w-6 text-primary" /> مسح كود QR
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-4 md:p-8 space-y-6">
          {/* Camera Selection Dropdown */}
          {cameras.length > 1 && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase px-1">اختر الكاميرا المفضلة</label>
              <Select value={selectedCameraId} onValueChange={handleCameraChange}>
                <SelectTrigger className="h-11 glass border-none rounded-xl font-bold text-xs">
                  <div className="flex items-center gap-2">
                    <Laptop className="h-4 w-4 text-primary" />
                    <SelectValue placeholder="اختر جهاز التصوير" />
                  </div>
                </SelectTrigger>
                <SelectContent className="glass border-none rounded-xl z-[450]">
                   {cameras.map(cam => (
                     <SelectItem key={cam.id} value={cam.id} className="font-bold text-xs">
                        {cam.label || `الكاميرا ${cam.id.slice(0, 5)}`}
                     </SelectItem>
                   ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="relative w-full aspect-square bg-black/10 rounded-2xl overflow-hidden border-2 border-dashed border-primary/20 shadow-inner">
            <div id={scannerId} className="w-full h-full" />
            
            {!isCameraReady && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm gap-4 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest text-center px-4">جاري محاولة الاتصال بالكاميرا...</p>
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 p-6 text-center space-y-4 z-20">
                <div className="h-14 w-14 bg-destructive/10 text-destructive rounded-3xl flex items-center justify-center shadow-inner">
                   <X className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                   <p className="text-sm font-black text-destructive leading-tight">فشل في الاتصال</p>
                   <p className="text-[10px] font-bold text-muted-foreground leading-relaxed px-4">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="rounded-xl font-black h-10 px-6 border-white/20">
                  <RefreshCw className="h-4 w-4 ml-2" /> تحديث الصفحة
                </Button>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-primary/5 rounded-2xl text-center border border-primary/10 flex items-center justify-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
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
