
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
  X
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { useFirestore, useUser, setDocumentNonBlocking, useAuth } from "@/firebase"
import { collection, getDocs, doc, serverTimestamp, writeBatch, deleteDoc } from "firebase/firestore"
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const auth = useAuth()
  const { user } = useUser()
  
  const [isExporting, setIsExporting] = React.useState(false)
  const [isImporting, setIsImporting] = React.useState(false)
  const [isWiping, setIsWiping] = React.useState(false)
  const [showWipeDialog, setShowWipeDialog] = React.useState(false)
  const [password, setPassword] = React.useState("")
  
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const collections = ["categories", "products", "customers", "invoices", "user_roles", "repairs"]
      const fullBackup: any = {}

      for (const colName of collections) {
        const snapshot = await getDocs(collection(db, colName))
        fullBackup[colName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        
        if (colName === "invoices") {
           for (const inv of fullBackup[colName]) {
              const itemsSnap = await getDocs(collection(db, "invoices", inv.id, "items"))
              inv.items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
           }
        }
      }

      const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ExpressPhonePro_Backup_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      toast({ title: "تم التصدير", description: "تم حفظ النسخة الاحتياطية بنجاح" })
    } catch (error) {
      console.error(error)
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
      console.error(err)
      let msg = "فشل المسح. تأكد من كلمة المرور."
      if (err.code === 'auth/wrong-password') msg = "كلمة المرور غير صحيحة."
      toast({ variant: "destructive", title: "خطأ في التحقق", description: msg })
    } finally {
      setIsWiping(false)
    }
  }

  const handleImportLegacy = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    setIsImporting(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        
        // 1. Import Clients (Customers)
        for (const client of data.clients || []) {
          setDocumentNonBlocking(doc(db, "customers", client.id), {
            name: client.name,
            phone: client.phone || "",
            debt: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            imported: true
          }, { merge: true })
        }

        // 2. Extract and Import Categories
        const categoriesMap = new Map()
        const uniqueCatNames = Array.from(new Set((data.inventory || []).map((i: any) => i.category)))
        
        for (const catName of uniqueCatNames) {
          const catId = `cat-${Math.random().toString(36).substring(7)}`
          const catRef = doc(db, "categories", catId)
          setDocumentNonBlocking(catRef, {
            name: catName,
            parentId: null,
            level: 0,
            path: catName,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true })
          categoriesMap.set(catName, { id: catId, name: catName })
        }

        // 3. Import Inventory (Products)
        for (const item of data.inventory || []) {
          const catInfo = categoriesMap.get(item.category) || { id: "unknown", name: "عام" }
          setDocumentNonBlocking(doc(db, "products", item.id), {
            name: item.name,
            productCode: item.qrCode || item.id,
            imageUrl: item.imageUrl || "",
            categoryId: catInfo.id,
            categoryName: catInfo.name,
            categoryPath: catInfo.name,
            quantity: item.quantity || 0,
            purchasePrice: item.originalPrice || 0,
            salePrice: item.sellingPrice || 0,
            repairPrice: 0,
            minStockQuantity: item.lowStockThreshold || 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdByUserId: user.uid
          }, { merge: true })
        }

        // 4. Import Bills (Invoices)
        for (const bill of data.bills || []) {
          const invRef = doc(db, "invoices", bill.id)
          await setDocumentNonBlocking(invRef, {
            customerId: bill.clientId || "walk-in",
            customerName: bill.clientName || "عميل عام",
            totalAmount: bill.totalAmount || 0,
            paidAmount: bill.amountPaid || 0,
            status: bill.paymentStatus === "paid" ? "Paid" : "Debt",
            createdAt: bill.date ? new Date(bill.date) : serverTimestamp(),
            updatedAt: serverTimestamp(),
            generatedByUserId: user.uid
          }, { merge: true })

          // Import Invoice Items
          const itemsRef = collection(db, "invoices", bill.id, "items")
          for (const item of bill.items || []) {
            const itemDocRef = doc(itemsRef)
            setDocumentNonBlocking(itemDocRef, {
              productId: item.itemId,
              productName: item.itemName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              itemTotal: item.totalPrice,
              createdAt: serverTimestamp()
            }, { merge: true })
          }
        }

        // 5. Import Service Requests (Repairs)
        for (const sr of data.serviceRequests || []) {
          setDocumentNonBlocking(doc(db, "repairs", sr.id), {
            clientName: sr.clientName,
            phoneType: sr.phoneType || "",
            status: sr.status || "Pending",
            finalCost: sr.finalCost || sr.estimatedCost || 0,
            receivedDate: sr.receivedDate ? new Date(sr.receivedDate) : serverTimestamp(),
            problemDescription: sr.problemDescription || "",
            imported: true
          }, { merge: true })
        }

        toast({ title: "اكتمل الاستيراد الشامل", description: "تم دمج البيانات القديمة بنجاح في النظام الجديد" })
      } catch (err) {
        console.error(err)
        toast({ variant: "destructive", title: "خطأ في الاستيراد", description: "تنسيق الملف غير مدعوم أو تالف" })
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
          <p className="text-[9px] md:text-[10px] text-muted-foreground font-bold uppercase tracking-[0.3em] mt-1">تزامن، نسخ احتياطي، ومزامنة</p>
        </div>
        <div className="hidden md:flex h-14 w-14 rounded-3xl bg-primary/10 items-center justify-center text-primary shadow-inner">
           <Database className="h-7 w-7" />
        </div>
      </header>

      <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2">
         <Card className="border-none glass-premium rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 md:p-8 bg-primary/5 border-b border-white/10">
               <div className="flex items-center gap-4">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                     <Download className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <div>
                     <CardTitle className="text-lg md:text-xl font-black">تصدير البيانات</CardTitle>
                     <CardDescription className="text-[9px] md:text-[10px] font-bold">حفظ نسخة كاملة بصيغة JSON</CardDescription>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-6 md:p-8 space-y-4 md:space-y-6">
               <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  يُنصح بتصدير نسخة احتياطية بشكل أسبوعي لضمان سلامة بياناتك.
               </p>
               <Button 
                onClick={handleExport} 
                disabled={isExporting}
                className="w-full h-12 md:h-14 rounded-2xl bg-primary text-white font-black shadow-xl gap-3 text-sm"
               >
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  بدء التصدير الشامل
               </Button>
            </CardContent>
         </Card>

         <Card className="border-none glass-premium rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 md:p-8 bg-accent/5 border-b border-white/10">
               <div className="flex items-center gap-4">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                     <Upload className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <div>
                     <CardTitle className="text-lg md:text-xl font-black">استيراد البيانات</CardTitle>
                     <CardDescription className="text-[9px] md:text-[10px] font-bold">دعم النسخ الاحتياطية السابقة</CardDescription>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-6 md:p-8 space-y-4 md:space-y-6">
               <div className="p-3 md:p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-orange-600 shrink-0 mt-0.5" />
                  <p className="text-[9px] md:text-[10px] text-orange-800 font-bold leading-relaxed">
                     سيقوم النظام بمطابقة بياناتك السابقة. تأكد من أن الملف بصيغة .json الصحيحة.
                  </p>
               </div>
               <input type="file" ref={fileInputRef} onChange={handleImportLegacy} accept=".json" className="hidden" />
               <Button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isImporting}
                variant="outline"
                className="w-full h-12 md:h-14 rounded-2xl glass border-white/20 font-black gap-3 text-accent text-sm"
               >
                  {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  رفع واستيراد البيانات
               </Button>
            </CardContent>
         </Card>

         <Card className="md:col-span-2 border-none bg-gradient-to-br from-[#3960AC] to-[#2a4580] text-white rounded-[2.5rem] md:rounded-[3rem] p-2 md:p-4">
            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
               <div className="space-y-3 md:space-y-4 text-center md:text-right">
                  <div className="flex items-center justify-center md:justify-start gap-3">
                     <ShieldCheck className="h-6 w-6 md:h-8 md:w-8 text-emerald-400" />
                     <h2 className="text-xl md:text-2xl font-black">حماية البيانات والخصوصية</h2>
                  </div>
                  <p className="text-xs md:text-sm text-white/70 max-w-2xl leading-relaxed font-medium">
                     نظام Express Phone Pro مبني على سحابة Google Firebase المشفرة. بياناتك لا تغادر متصفحك إلا إلى خوادم آمنة جداً.
                  </p>
               </div>
               <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full md:w-auto">
                  <Button variant="ghost" className="h-12 md:h-14 px-8 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold border border-white/10 text-xs md:text-sm">
                     شروط الاستخدام
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="h-12 md:h-14 px-8 rounded-2xl font-black shadow-2xl text-xs md:text-sm"
                    onClick={() => setShowWipeDialog(true)}
                  >
                     مسح شامل للنظام
                  </Button>
               </div>
            </CardContent>
         </Card>
      </div>

      <Dialog open={showWipeDialog} onOpenChange={setShowWipeDialog}>
        <DialogContent dir="rtl" className="glass border-none rounded-[2rem] shadow-2xl z-[400] max-w-md w-[95%]">
           <DialogHeader>
              <DialogTitle className="text-xl font-black text-red-600 flex items-center gap-2">
                 <AlertTriangle className="h-6 w-6" /> تأكيد مسح البيانات
              </DialogTitle>
              <DialogDescription className="font-bold text-xs text-muted-foreground mt-2">
                 هذا الإجراء سيقوم بحذف كافة المنتجات، الفواتير، والعملاء بشكل نهائي ولا يمكن التراجع عنه.
              </DialogDescription>
           </DialogHeader>

           <div className="py-6 space-y-4">
              <div className="space-y-2">
                 <Label className="font-black text-xs px-1 flex items-center gap-2">
                    <Lock className="h-3 w-3" /> أدخل كلمة المرور للتأكيد
                 </Label>
                 <Input 
                   type="password" 
                   value={password} 
                   onChange={(e) => setPassword(e.target.value)}
                   className="h-12 glass border-none rounded-xl font-bold"
                   placeholder="كلمة مرور دخول البرنامج"
                 />
              </div>
           </div>

           <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-xl h-11 font-bold flex-1" onClick={() => setShowWipeDialog(false)}>إلغاء</Button>
              <Button 
                variant="destructive" 
                className="rounded-xl h-11 font-black flex-1 shadow-lg"
                disabled={!password || isWiping}
                onClick={handleFullWipe}
              >
                 {isWiping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                 تأكيد الحذف النهائي
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="text-center py-6 opacity-30 text-[8px] md:text-[10px] font-black uppercase tracking-[0.5em]">
         System Security Verified • Khaled_Deragha © 2026
      </footer>
    </div>
  )
}
