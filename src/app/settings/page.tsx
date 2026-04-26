
"use client"

import * as React from "react"
import { 
  Settings, 
  Download, 
  Upload, 
  Database, 
  ShieldCheck, 
  Smartphone, 
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Trash2,
  Lock,
  X,
  RefreshCw,
  HardDrive,
  FileJson,
  Volume2,
  VolumeX,
  BellRing
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { useFirestore, useUser, setDocumentNonBlocking, useAuth, updateDocumentNonBlocking } from "@/firebase"
import { collection, getDocs, doc, serverTimestamp, writeBatch } from "firebase/firestore"
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { playSystemSound } from "@/lib/audio-utils"

const STORE_NAME = 'ep_sync_store';
const KEY_NAME = 'active_file_handle';

export default function SettingsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const auth = useAuth()
  const { user, role } = useUser()
  const router = useRouter()
  const isAdmin = role === "Admin"
  
  const [isExporting, setIsExporting] = React.useState(false)
  const [isImporting, setIsImporting] = React.useState(false)
  const [isWiping, setIsWiping] = React.useState(false)
  const [showWipeDialog, setShowWipeDialog] = React.useState(false)
  const [password, setPassword] = React.useState("")
  
  const [isSyncActive, setIsSyncActive] = React.useState(false)
  const [lastSyncTime, setLastSyncTime] = React.useState<string | null>(null)
  const [fileHandle, setFileHandle] = React.useState<any>(null)
  const [isHandleRestored, setIsHandleRestored] = React.useState(false)

  // Sound Settings
  const [isSoundEnabled, setIsSoundEnabled] = React.useState(true)
  
  const isApiSupported = typeof window !== 'undefined' && 'showSaveFilePicker' in window;
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!isAdmin && role !== null) {
      router.push("/")
    }
  }, [isAdmin, role, router])

  React.useEffect(() => {
    const savedSound = localStorage.getItem('setting_system_sounds');
    if (savedSound !== null) setIsSoundEnabled(savedSound === 'true');
  }, []);

  const handleToggleSounds = (val: boolean) => {
    setIsSoundEnabled(val);
    localStorage.setItem('setting_system_sounds', String(val));
    if (val) playSystemSound('success');
  };

  const saveHandleToIDB = async (handle: any) => {
    const request = indexedDB.open(STORE_NAME, 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('handles')) {
        db.createObjectStore('handles');
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(handle, KEY_NAME);
    };
  };

  const getHandleFromIDB = (): Promise<any> => {
    return new Promise((resolve) => {
      const request = indexedDB.open(STORE_NAME, 1);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles');
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

  React.useEffect(() => {
    const handleGlobalUpdate = (e: any) => {
      if (e.detail) setLastSyncTime(e.detail);
    };
    window.addEventListener('ep-global-backup-updated', handleGlobalUpdate);
    const savedTime = localStorage.getItem('ep_global_last_backup_time');
    if (savedTime) setLastSyncTime(savedTime);
    return () => window.removeEventListener('ep-global-backup-updated', handleGlobalUpdate);
  }, []);

  React.useEffect(() => {
    if (!isApiSupported) return;
    const restore = async () => {
      const savedHandle = await getHandleFromIDB();
      if (savedHandle) {
        setFileHandle(savedHandle);
        setIsHandleRestored(true);
        try {
          if (await savedHandle.queryPermission({ mode: 'readwrite' }) === 'granted') {
            setIsSyncActive(true);
            setIsHandleRestored(false);
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({ type: 'START_BACKUP' });
            }
          }
        } catch (e) {}
      }
    };
    restore();
  }, [isApiSupported]);

  const handleSetupDeviceSync = async () => {
    try {
      // @ts-ignore
      const handle = await window.showSaveFilePicker({
        suggestedName: `ExpressPhonePro_Sync_${new Date().toISOString().split('T')[0]}.json`,
        types: [{
          description: 'JSON Data File',
          accept: { 'application/json': ['.json'] },
        }],
      });
      await saveHandleToIDB(handle);
      setFileHandle(handle);
      setIsSyncActive(true);
      setIsHandleRestored(false);
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'START_BACKUP' });
      }
      toast({ title: "تم تفعيل المزامنة", description: "تم ربط ملف التخزين بنجاح وسيتحدث كل 5 دقائق." });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast({ variant: "destructive", title: "خطأ في الوصول", description: "لا يدعم جهازك ميزة المزامنة المباشرة للملفات حالياً." });
      }
    }
  }

  const handleResumeSync = async () => {
    if (!fileHandle) return;
    try {
      if (await fileHandle.requestPermission({ mode: 'readwrite' }) === 'granted') {
        setIsSyncActive(true);
        setIsHandleRestored(false);
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'START_BACKUP' });
        }
        toast({ title: "تمت استعادة الاتصال", description: "النظام سيتابع تحديث الملف المختار تلقائياً." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "فشلت الاستعادة", description: "يرجى اختيار ملف جديد للمزامنة." });
    }
  }

  const handleManualMobileExport = async () => {
    setIsExporting(true);
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
      a.download = `ExpressPhone_Mobile_QuickBackup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      toast({ title: "تم الحفظ", description: "تم تحميل نسخة احتياطية فورية على هاتفك." });
    } catch (err) {
      toast({ variant: "destructive", title: "فشل الحفظ", description: "حدث خطأ أثناء جمع البيانات." });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const collections = ["categories", "products", "customers", "invoices", "user_roles", "repairs"]
      const fullBackup: any = {}
      for (const colName of collections) {
        const snapshot = await getDocs(collection(db, colName))
        fullBackup[colName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        if (colName === "invoices") {
           await Promise.all(fullBackup[colName].map(async (inv: any) => {
             const itemsSnap = await getDocs(collection(db, "invoices", inv.id, "items"));
             inv.items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
           }));
        }
      }
      const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ExpressPhonePro_FullBackup_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      toast({ title: "تم التصدير بنجاح", description: "تم معالجة كافة البيانات وحفظها محلياً" })
    } catch (error) {
      toast({ variant: "destructive", title: "فشل التصدير", description: "حدث خطأ أثناء جمع البيانات" })
    } finally {
      setIsExporting(false)
    }
  }

  const handleFullWipe = async () => {
    if (!password || !user?.email) return
    setIsWiping(true)
    try {
      const credential = EmailAuthProvider.credential(user.email, password)
      await reauthenticateWithCredential(user, credential)
      const collections = ["categories", "products", "customers", "invoices", "repairs"]
      for (const colName of collections) {
        const snapshot = await getDocs(collection(db, colName))
        const batch = writeBatch(db)
        snapshot.docs.forEach(doc => batch.delete(doc.ref))
        await batch.commit()
      }
      toast({ title: "تم المسح الشامل", description: "تم حذف كافة بيانات النظام بنجاح" })
      setShowWipeDialog(false)
      setPassword("")
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ في التحقق", description: "فشل المسح. تأكد من كلمة المرور." })
    } finally {
      setIsWiping(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return
    setIsImporting(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        const actualData = data.data ? data.data : data;
        if (actualData) {
          for (const cat of actualData.categories || []) setDocumentNonBlocking(doc(db, "categories", cat.id), { ...cat, updatedAt: serverTimestamp() }, { merge: true })
          for (const prod of actualData.products || []) setDocumentNonBlocking(doc(db, "products", prod.id), { ...prod, updatedAt: serverTimestamp() }, { merge: true })
          for (const cust of actualData.customers || []) setDocumentNonBlocking(doc(db, "customers", cust.id), { ...cust, updatedAt: serverTimestamp() }, { merge: true })
          for (const inv of actualData.invoices || []) {
            const { items, ...invData } = inv;
            setDocumentNonBlocking(doc(db, "invoices", inv.id), { ...invData, updatedAt: serverTimestamp() }, { merge: true })
            if (items && Array.isArray(items)) {
              for (const item of items) setDocumentNonBlocking(doc(db, "invoices", inv.id, "items", item.id || Math.random().toString(36).substring(7)), { ...item, createdAt: serverTimestamp() }, { merge: true })
            }
          }
        }
        toast({ title: "اكتمل الاستيراد", description: "تمت معالجة الملف وتحديث قاعدة البيانات بنجاح" })
      } catch (err) {
        toast({ variant: "destructive", title: "خطأ في الاستيراد", description: "تنسيق الملف غير مدعوم" })
      } finally {
        setIsImporting(false)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 md:space-y-10 pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl md:text-4xl font-black text-gradient-premium tracking-tighter">إدارة النظام والبيانات</h1>
          <p className="text-[9px] md:text-[10px] text-muted-foreground font-bold uppercase tracking-[0.3em] mt-1">المزامنة والنسخ الاحتياطي المستمر</p>
        </div>
        <div className="hidden md:flex h-14 w-14 rounded-3xl bg-primary/10 items-center justify-center text-primary">
           <Database className="h-7 w-7" />
        </div>
      </header>

      {/* Audio Control Card */}
      <Card className="border-none glass rounded-[2.5rem] overflow-hidden shadow-xl border border-white/10">
         <CardHeader className="p-8 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-white/10">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                     <Volume2 className="h-6 w-6" />
                  </div>
                  <div>
                     <CardTitle className="text-xl font-black">مركز التحكم الصوتي</CardTitle>
                     <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1">إدارة التنبيهات والفعاليات الصوتية</CardDescription>
                  </div>
               </div>
               <Switch checked={isSoundEnabled} onCheckedChange={handleToggleSounds} />
            </div>
         </CardHeader>
         <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="p-4 rounded-2xl bg-black/5 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <BellRing className="h-4 w-4 text-red-600" />
                        <span className="text-xs font-black">تنبيهات المخزون الحرجة</span>
                     </div>
                     <Badge variant="success" className="h-5 px-2 rounded-lg font-black text-[8px]">دائم</Badge>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground leading-relaxed">
                     سيتم إطلاق صوت تحذيري "خطر" عند اكتشاف منتجات بالغة الأهمية منخفضة المخزون عند بدء تشغيل البرنامج.
                  </p>
               </div>
               <div className="p-4 rounded-2xl bg-black/5 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-black">أصوات العمليات</span>
                     </div>
                     <Badge variant="outline" className="h-5 px-2 rounded-lg font-black text-[8px] border-primary/20">تفاعلي</Badge>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground leading-relaxed">
                     صدور صوت "نجاح" عند إتمام المبيعات أو "فشل" عند حدوث أخطاء برمجية أو تقنية.
                  </p>
               </div>
            </div>
         </CardContent>
      </Card>

      <Card className="border-none bg-gradient-to-br from-[#1e293b] to-[#0f172a] text-white rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden shadow-2xl relative border border-white/5">
        <div className="absolute top-0 left-0 p-8 opacity-5">
           <HardDrive className="h-48 w-48 -rotate-12" />
        </div>
        <CardHeader className="p-8 md:p-10 relative z-10">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                 <div className={cn(
                   "h-16 w-16 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all duration-500",
                   isSyncActive ? "bg-emerald-500 text-white animate-pulse" : isHandleRestored ? "bg-orange-500 text-white" : "bg-white/10 text-white/50"
                 )}>
                    <RefreshCw className={cn("h-8 w-8", isSyncActive && "animate-spin")} />
                 </div>
                 <div>
                    <CardTitle className="text-2xl md:text-3xl font-black tracking-tight">المزامنة المحلية الذكية</CardTitle>
                    <p className="text-xs font-bold text-white/50 uppercase tracking-widest mt-1">Persistent File Storage</p>
                 </div>
              </div>
           </div>
        </CardHeader>
        <CardContent className="p-8 md:p-10 pt-0 relative z-10 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <p className="text-sm md:text-base text-white/70 leading-relaxed font-medium">
                    {isApiSupported 
                      ? "يقوم هذا النظام بربط البرنامج بملف حقيقي على جهازك. يتم تحديث الملف تلقائياً كل 5 دقائق في الخلفية لضمان أمان بياناتك."
                      : "نظراً للقيود الأمنية في متصفحات الهاتف، لا يمكن الربط المباشر بملف، ولكن يمكنك تحميل نسخة احتياطية كاملة لجهازك بنقرة واحدة سريعة."
                    }
                 </p>
              </div>
              
              <div className="glass bg-white/5 rounded-[2rem] p-6 border-white/10 flex flex-col justify-between gap-6">
                 {isSyncActive ? (
                   <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">حالة الاتصال</span>
                         <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                            <span className="text-xs font-black text-emerald-400">مزامنة نشطة</span>
                         </div>
                      </div>
                      <div className="p-4 bg-black/20 rounded-2xl flex items-center justify-between">
                         <div className="flex items-center gap-3 overflow-hidden">
                            <FileJson className="h-5 w-5 text-primary shrink-0" />
                            <span className="text-xs font-mono font-bold text-white/80 truncate">{(fileHandle?.name) || "ExpressBackup.json"}</span>
                         </div>
                         <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-red-500/10" onClick={() => { setIsSyncActive(false); localStorage.removeItem(KEY_NAME); }}>
                            <X className="h-4 w-4" />
                         </Button>
                      </div>
                      <div className="flex flex-col gap-2 pt-2">
                         <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-white/30">آخر مزامنة حقيقية:</span>
                            <span className="text-[10px] font-black text-white/60 tabular-nums">{lastSyncTime || "الآن..."}</span>
                         </div>
                      </div>
                   </div>
                 ) : isHandleRestored ? (
                    <div className="flex flex-col items-center justify-center text-center gap-4 py-4">
                       <div className="h-14 w-14 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 animate-pulse">
                          <Lock className="h-6 w-6" />
                       </div>
                       <Button onClick={handleResumeSync} className="w-full h-12 rounded-2xl bg-orange-500 text-white font-black hover:bg-orange-600 shadow-xl transition-all">تفعيل المزامنة المباشرة</Button>
                    </div>
                 ) : !isApiSupported ? (
                    <div className="flex flex-col items-center justify-center text-center gap-4 py-4">
                       <Button onClick={handleManualMobileExport} disabled={isExporting} className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 shadow-2xl transition-all">حفظ نسخة في الهاتف الآن</Button>
                    </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center text-center gap-6 py-4">
                      <Button onClick={handleSetupDeviceSync} className="w-full h-12 rounded-2xl bg-white text-slate-900 font-black hover:bg-white/90 shadow-2xl transition-all">اختيار موقع الملف والبدء</Button>
                   </div>
                 )}
              </div>
           </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2">
         <Card className="border-none glass-premium rounded-[2.5rem] overflow-hidden shadow-xl">
            <CardHeader className="p-6 md:p-8 bg-primary/5 border-b border-white/10">
               <div className="flex items-center gap-4">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><Download className="h-5 w-5 md:h-6 md:w-6" /></div>
                  <CardTitle className="text-lg md:text-xl font-black">تصدير قاعدة البيانات</CardTitle>
               </div>
            </CardHeader>
            <CardContent className="p-6 md:p-8 space-y-4 md:space-y-6">
               <Button onClick={handleExport} disabled={isExporting} className="w-full h-12 md:h-14 rounded-2xl bg-primary text-white font-black shadow-xl gap-3">تصدير نسخة فورية الآن</Button>
            </CardContent>
         </Card>

         <Card className="border-none glass-premium rounded-[2.5rem] overflow-hidden shadow-xl">
            <CardHeader className="p-6 md:p-8 bg-accent/5 border-b border-white/10">
               <div className="flex items-center gap-4">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent"><Upload className="h-5 w-5 md:h-6 md:w-6" /></div>
                  <CardTitle className="text-lg md:text-xl font-black">استعادة البيانات</CardTitle>
               </div>
            </CardHeader>
            <CardContent className="p-6 md:p-8 space-y-4 md:space-y-6">
               <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
               <Button onClick={() => fileInputRef.current?.click()} disabled={isImporting} variant="outline" className="w-full h-12 md:h-14 rounded-2xl glass border-white/20 font-black gap-3 text-accent">رفع واستعادة من ملف JSON</Button>
            </CardContent>
         </Card>
      </div>

      <Card className="border-none bg-gradient-to-br from-[#3960AC] to-[#2a4580] text-white rounded-[2.5rem] md:rounded-[3.5rem] p-6 md:p-10 shadow-2xl">
         <CardContent className="p-0 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 space-y-4 text-center md:text-right">
               <div className="flex items-center justify-center md:justify-start gap-3">
                  <ShieldCheck className="h-6 w-6 md:h-8 md:w-8 text-emerald-400" />
                  <h2 className="text-2xl md:text-3xl font-black">حماية البيانات المتكاملة</h2>
               </div>
            </div>
            <div className="flex flex-col gap-3 w-full md:w-72">
               <Button variant="destructive" className="h-12 rounded-xl font-black shadow-2xl text-xs" onClick={() => setShowWipeDialog(true)}>مسح كافة البيانات نهائياً</Button>
            </div>
         </CardContent>
      </Card>

      <Dialog open={showWipeDialog} onOpenChange={setShowWipeDialog}>
        <DialogContent dir="rtl" className="glass border-none rounded-[2rem] shadow-2xl z-[400] max-w-md w-[95%]">
           <DialogHeader>
              <DialogTitle className="text-xl font-black text-gradient-premium flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-red-600" /> تأكيد مسح البيانات</DialogTitle>
           </DialogHeader>
           <div className="py-6 space-y-4">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 glass border-none rounded-xl font-bold" placeholder="كلمة مرور الدخول" />
           </div>
           <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-xl h-11 font-bold flex-1" onClick={() => setShowWipeDialog(false)}>إلغاء</Button>
              <Button variant="destructive" className="rounded-xl h-11 font-black flex-1 shadow-lg" disabled={!password || isWiping} onClick={handleFullWipe}>تأكيد الحذف</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
