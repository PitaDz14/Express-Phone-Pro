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
  Calculator
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
import { useFirestore, useUser, setDocumentNonBlocking, useAuth, updateDocumentNonBlocking } from "@/firebase"
import { collection, getDocs, doc, serverTimestamp, writeBatch, deleteDoc } from "firebase/firestore"
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

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
  const [isResyncing, setIsResyncing] = React.useState(false)
  const [showWipeDialog, setShowWipeDialog] = React.useState(false)
  const [password, setPassword] = React.useState("")
  
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Security Redirect for Workers
  React.useEffect(() => {
    if (!isAdmin && role !== null) {
      router.push("/")
    }
  }, [isAdmin, role, router])

  if (!isAdmin) {
    return <div className="p-20 text-center font-black">جاري التحقق من الصلاحيات...</div>
  }

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

  const handleResyncDebts = async () => {
    setIsResyncing(true)
    try {
      const invoicesSnap = await getDocs(collection(db, "invoices"))
      const customersSnap = await getDocs(collection(db, "customers"))
      
      const debtMap: Record<string, number> = {}
      
      invoicesSnap.docs.forEach(d => {
        const inv = d.data()
        if (inv.customerId && inv.customerId !== 'walk-in') {
          const unpaid = (inv.totalAmount || 0) - (inv.paidAmount || 0)
          if (unpaid > 0) {
            debtMap[inv.customerId] = (debtMap[inv.customerId] || 0) + unpaid
          }
        }
      })
      
      const batch = writeBatch(db)
      customersSnap.docs.forEach(d => {
        const currentDebt = debtMap[d.id] || 0
        batch.update(d.ref, { debt: currentDebt, updatedAt: serverTimestamp() })
      })
      
      await batch.commit()
      toast({ title: "اكتملت المزامنة", description: "تمت إعادة حساب مديونيات كافة الزبائن بناءً على سجل الفواتير" })
    } catch (err) {
      console.error(err)
      toast({ variant: "destructive", title: "خطأ", description: "فشلت عملية إعادة المزامنة" })
    } finally {
      setIsResyncing(false)
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
        const customerDebtAcc: Record<string, number> = {}
        
        // 1. Import Clients (Customers)
        for (const client of data.clients || []) {
          setDocumentNonBlocking(doc(db, "customers", client.id), {
            name: client.name,
            phone: client.phone || "",
            debt: 0, // Initialized to 0, will be updated after bills loop
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

        // 4. Import Bills (Invoices) and Calculate Debt
        for (const bill of data.bills || []) {
          const invRef = doc(db, "invoices", bill.id)
          const totalAmount = bill.totalAmount || 0
          const paidAmount = bill.amountPaid || 0
          const debt = totalAmount - paidAmount
          
          if (debt > 0 && bill.clientId && bill.clientId !== 'walk-in') {
            customerDebtAcc[bill.clientId] = (customerDebtAcc[bill.clientId] || 0) + debt
          }

          setDocumentNonBlocking(invRef, {
            customerId: bill.clientId || "walk-in",
            customerName: bill.clientName || "عميل عام",
            totalAmount: totalAmount,
            paidAmount: paidAmount,
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
              createdAt: serverTimestamp(),
              generatedByUserId: user.uid,
              invoiceId: bill.id
            }, { merge: true })
          }
        }

        // 5. Update Customer Debt Fields
        for (const [cid, totalDebt] of Object.entries(customerDebtAcc)) {
           updateDocumentNonBlocking(doc(db, "customers", cid), {
             debt: totalDebt,
             updatedAt: serverTimestamp()
           })
        }

        // 6. Import Service Requests (Repairs)
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

        toast({ title: "اكتمل الاستيراد الشامل", description: "تم دمج البيانات القديمة وحساب الديون بنجاح" })
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
                     سيقوم النظام بمطابقة بياناتك السابقة وحساب ديون الزبائن بناءً على الفواتير المرفقة.
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

         <Card className="border-none glass-premium rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 md:p-8 bg-emerald-500/5 border-b border-white/10">
               <div className="flex items-center gap-4">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                     <Calculator className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <div>
                     <CardTitle className="text-lg md:text-xl font-black">أدوات الصيانة</CardTitle>
                     <CardDescription className="text-[9px] md:text-[10px] font-bold">إصلاح وتدقيق الحسابات</CardDescription>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-6 md:p-8 space-y-4 md:space-y-6">
               <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  استخدم هذه الأداة إذا لاحظت أن ديون الزبائن لا تتطابق مع سجل فواتيرهم (مفيد بعد الاستيراد اليدوي).
               </p>
               <Button 
                onClick={handleResyncDebts} 
                disabled={isResyncing}
                variant="outline"
                className="w-full h-12 md:h-14 rounded-2xl glass border-white/20 font-black gap-3 text-emerald-600 text-sm"
               >
                  {isResyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  إعادة مزامنة ديون الزبائن
               </Button>
            </CardContent>
         </Card>

         <Card className="border-none bg-gradient-to-br from-[#3960AC] to-[#2a4580] text-white rounded-[2.5rem] md:rounded-[3rem] p-2 md:p-4 md:col-span-1">
            <CardContent className="p-6 md:p-8 flex flex-col items-center justify-center gap-6">
               <div className="space-y-3 text-center">
                  <div className="flex items-center justify-center gap-3">
                     <ShieldCheck className="h-6 w-6 md:h-8 md:w-8 text-emerald-400" />
                     <h2 className="text-xl md:text-2xl font-black">أمان البيانات</h2>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed font-medium">
                     نظام Express Phone Pro مبني على سحابة Google Firebase المشفرة. بياناتك آمنة ومحمية.
                  </p>
               </div>
               <Button 
                 variant="destructive" 
                 className="w-full h-12 md:h-14 rounded-2xl font-black shadow-2xl text-xs md:text-sm"
                 onClick={() => setShowWipeDialog(true)}
               >
                  مسح شامل للنظام
               </Button>
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
