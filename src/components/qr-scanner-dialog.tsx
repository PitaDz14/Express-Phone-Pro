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
import { Camera, X, Loader2, RefreshCw, Laptop } from "lucide-react"

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

  const startScanner = React.useCallback(async (deviceId: string) => {
    if (!deviceId) return;
    
    setIsCameraReady(false)
    setError(null)
    
    // Ensure the DOM is fully rendered for the target container
    await new Promise(resolve => setTimeout(resolve, 300))

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerId)
      }

      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop()
      }

      const config = { 
        fps: 20, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      }

      await html5QrCodeRef.current.start(
        { deviceId: { exact: deviceId } },
        config,
        (decodedText) => {
          onScan(decodedText)
          onOpenChange(false)
        },
        () => {} // frame error handler
      )
      setIsCameraReady(true)
    } catch (err: any) {
      console.error("QR Start Error:", err)
      let msg = "تعذر تشغيل الكاميرا المختارة."
      if (err.name === 'NotAllowedError') msg = "يرجى منح إذن الكاميرا للمتصفح لاستخدام هذه الميزة."
      setError(msg)
    }
  }, [onScan, onOpenChange])

  // Intelligent Camera Detection & Persistence
  React.useEffect(() => {
    if (open) {
      Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length > 0) {
          const mappedDevices = devices.map(d => ({ id: d.id, label: d.label }))
          setCameras(mappedDevices)
          
          // Persistence: Check for previously saved camera
          const savedCameraId = localStorage.getItem("preferred_camera_id");
          let targetId = "";

          if (savedCameraId && devices.some(d => d.id === savedCameraId)) {
            targetId = savedCameraId;
          } else {
            // Smart Heuristics for Back Camera Priority
            const backCamera = devices.find(d => 
              /back|rear|environment|خلفية/i.test(d.label.toLowerCase())
            );
            
            // On mobile, the last camera in the list is often the primary back camera
            targetId = backCamera ? backCamera.id : devices[devices.length - 1].id;
          }

          setSelectedCameraId(targetId)
          startScanner(targetId)
        } else {
          setError("لا توجد كاميرا مكتشفة. يرجى التأكد من ربط كاميرا بالحاسوب أو الهاتف.")
        }
      }).catch(err => {
        console.error("Fetch Cameras Error:", err)
        setError("فشل الوصول لأجهزة الكاميرا. يرجى تفعيل الإذن من إعدادات المتصفح.")
      })
    } else {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
  }, [open, startScanner, stopScanner])

  const handleCameraChange = (id: string) => {
    setSelectedCameraId(id)
    localStorage.setItem("preferred_camera_id", id);
    startScanner(id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="glass border-none rounded-[2rem] shadow-2xl p-0 overflow-hidden z-[400] max-w-md w-[95%] mx-auto">
        <DialogHeader className="p-6 bg-primary/5 border-b border-white/5">
          <DialogTitle className="text-xl font-black text-gradient-premium flex items-center gap-3">
            <Camera className="h-6 w-6 text-primary" /> مسح كود QR الذكي
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-4 md:p-8 space-y-6">
          {/* Pro Camera Selection */}
          {cameras.length > 1 && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-primary uppercase px-2 tracking-widest">تحديد جهاز المسح</label>
              <Select value={selectedCameraId} onValueChange={handleCameraChange}>
                <SelectTrigger className="h-12 glass border-none rounded-2xl font-bold text-xs shadow-sm hover:bg-white/40 transition-all">
                  <div className="flex items-center gap-2">
                    <Laptop className="h-4 w-4 text-primary opacity-50" />
                    <SelectValue placeholder="اختر الكاميرا..." />
                  </div>
                </SelectTrigger>
                <SelectContent className="glass border-none rounded-2xl z-[450] shadow-2xl">
                   {cameras.map(cam => (
                     <SelectItem key={cam.id} value={cam.id} className="font-bold text-xs py-3">
                        {cam.label || `الكاميرا ${cam.id.slice(0, 8)}`}
                     </SelectItem>
                   ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="relative w-full aspect-square bg-black/10 rounded-[2.5rem] overflow-hidden border-2 border-dashed border-primary/20 shadow-inner group">
            <div id={scannerId} className="w-full h-full" />
            
            {/* Visual Guide Overlays */}
            <div className="absolute inset-0 pointer-events-none border-[30px] border-black/30 md:border-[50px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-56 md:h-56 border-2 border-primary rounded-3xl shadow-[0_0_0_1000px_rgba(0,0,0,0.2)]" />
            
            {/* Corner Indicators */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-56 md:h-56">
               <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl" />
               <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl" />
               <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl" />
               <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl" />
            </div>

            {!isCameraReady && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md gap-4 z-10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-xs font-black text-primary uppercase tracking-widest text-center px-4 animate-pulse">جاري جلب عدسة المسح...</p>
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 p-6 text-center space-y-4 z-20">
                <div className="h-16 w-16 bg-destructive/10 text-destructive rounded-[2rem] flex items-center justify-center shadow-inner">
                   <X className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                   <p className="text-md font-black text-destructive leading-tight">عذراً، الكاميرا لا تستجيب</p>
                   <p className="text-[10px] font-bold text-muted-foreground leading-relaxed px-4">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="rounded-xl font-black h-11 px-8 border-white/20 hover:bg-primary/5">
                  <RefreshCw className="h-4 w-4 ml-2" /> إعادة المحاولة
                </Button>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-primary/5 rounded-2xl text-center border border-primary/10 flex items-center justify-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">ضع كود المنتج داخل المربع بوضوح</p>
          </div>
        </div>

        <div className="p-6 bg-black/5 flex justify-center">
          <Button variant="ghost" className="rounded-2xl px-12 h-12 font-black text-muted-foreground hover:text-primary transition-colors" onClick={() => onOpenChange(false)}>
            إلغاء العملية
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
