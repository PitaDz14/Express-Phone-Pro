
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
  Trash2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useFirestore, useUser, setDocumentNonBlocking } from "@/firebase"
import { collection, getDocs, doc, serverTimestamp, writeBatch } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const [isExporting, setIsExporting] = React.useState(false)
  const [isImporting, setIsImporting] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const collections = ["categories", "products", "customers", "invoices", "user_roles", "repairs"]
      const fullBackup: any = {}

      for (const colName of collections) {
        const snapshot = await getDocs(collection(db, colName))
        fullBackup[colName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        
        // Handle subcollections for invoices
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

  const handleImportLegacy = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    setIsImporting(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const legacyData = JSON.parse(e.target?.result as string)
        
        // 1. Map Clients -> Customers
        for (const client of legacyData.clients || []) {
           const customerRef = doc(db, "customers", client.id)
           setDocumentNonBlocking(customerRef, {
              name: client.name,
              phone: client.phone,
              debt: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
           }, { merge: true })
        }

        // 2. Map Inventory -> Categories & Products
        const categoryMap = new Map() // name -> id
        for (const item of legacyData.inventory || []) {
           let catId = categoryMap.get(item.category)
           if (!catId) {
              const newCatRef = doc(collection(db, "categories"))
              catId = newCatRef.id
              setDocumentNonBlocking(newCatRef, {
                 name: item.category,
                 parentId: null,
                 level: 0,
                 path: `/${item.category}`,
                 createdAt: serverTimestamp(),
                 updatedAt: serverTimestamp()
              }, { merge: true })
              categoryMap.set(item.category, catId)
           }

           const productRef = doc(db, "products", item.id)
           setDocumentNonBlocking(productRef, {
              name: item.name,
              productCode: item.qrCode || item.id,
              categoryId: catId,
              categoryName: item.category,
              quantity: Number(item.quantity),
              purchasePrice: Number(item.originalPrice || 0),
              salePrice: Number(item.sellingPrice || 0),
              repairPrice: 0,
              minStockQuantity: Number(item.lowStockThreshold || 5),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
           }, { merge: true })
        }

        // 3. Map Bills -> Invoices
        for (const bill of legacyData.bills || []) {
           const invRef = doc(db, "invoices", bill.id)
           setDocumentNonBlocking(invRef, {
              customerId: bill.clientId || "walk-in",
              customerName: bill.clientName || "عميل عام",
              totalAmount: Number(bill.totalAmount),
              paidAmount: Number(bill.amountPaid || bill.totalAmount),
              status: "Paid",
              generatedByUserId: user.uid,
              createdAt: bill.date ? new Date(bill.date) : serverTimestamp(),
              updatedAt: serverTimestamp()
           }, { merge: true })

           // Sub-items
           for (const item of bill.items || []) {
              const itemRef = doc(collection(db, "invoices", bill.id, "items"))
              setDocumentNonBlocking(itemRef, {
                 invoiceId: bill.id,
                 productId: item.itemId,
                 productName: item.itemName,
                 quantity: Number(item.quantity),
                 unitPrice: Number(item.unitPrice),
                 itemTotal: Number(item.totalPrice),
                 createdAt: serverTimestamp()
              }, { merge: true })
           }
        }

        // 4. Map serviceRequests -> repairs
        for (const req of legacyData.serviceRequests || []) {
           const repairRef = doc(db, "repairs", req.id)
           setDocumentNonBlocking(repairRef, {
              clientName: req.clientName,
              phoneType: req.phoneType,
              status: req.status,
              finalCost: Number(req.finalCost || 0),
              receivedDate: req.receivedDate ? new Date(req.receivedDate) : serverTimestamp(),
              createdAt: serverTimestamp()
           }, { merge: true })
        }

        toast({ title: "اكتمل الاستيراد", description: "تم دمج بيانات الموقع القديم مع النظام الجديد بنجاح" })
      } catch (err) {
        console.error(err)
        toast({ variant: "destructive", title: "خطأ في الاستيراد", description: "تأكد من صحة تنسيق ملف JSON" })
      } finally {
        setIsImporting(false)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10 pb-32">
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-4xl font-black text-gradient-premium tracking-tighter">إدارة النظام والبيانات</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.3em] mt-1">تزامن، نسخ احتياطي، ومزامنة By Khaled_Deragha</p>
        </div>
        <div className="h-14 w-14 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
           <Database className="h-7 w-7" />
        </div>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
         <Card className="border-none glass-premium rounded-[3rem] overflow-hidden card-3d">
            <CardHeader className="p-8 bg-primary/5 border-b border-white/10">
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                     <Download className="h-6 w-6" />
                  </div>
                  <div>
                     <CardTitle className="text-xl font-black">تصدير البيانات</CardTitle>
                     <CardDescription className="text-[10px] font-bold">حفظ نسخة كاملة من النظام بصيغة JSON</CardDescription>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
               <p className="text-sm text-muted-foreground leading-relaxed">
                  يُنصح بتصدير نسخة احتياطية بشكل أسبوعي لضمان سلامة بياناتك. يشمل التصدير: المخزون، العملاء، الفواتير، والتصنيفات.
               </p>
               <Button 
                onClick={handleExport} 
                disabled={isExporting}
                className="w-full h-14 rounded-2xl bg-primary text-white font-black shadow-xl shadow-primary/20 gap-3"
               >
                  {isExporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Database className="h-5 w-5" />}
                  بدء التصدير الشامل
               </Button>
            </CardContent>
         </Card>

         <Card className="border-none glass-premium rounded-[3rem] overflow-hidden card-3d">
            <CardHeader className="p-8 bg-accent/5 border-b border-white/10">
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                     <Upload className="h-6 w-6" />
                  </div>
                  <div>
                     <CardTitle className="text-xl font-black">استيراد من الموقع القديم</CardTitle>
                     <CardDescription className="text-[10px] font-bold">دعم النسخ الاحتياطية السابقة</CardDescription>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
               <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-orange-800 font-bold leading-relaxed">
                     سيقوم النظام بمطابقة بيانات موقعك القديم وتحويلها تلقائياً. تأكد من أن الملف هو النسخة الاحتياطية بصيغة .json المستخرجة من النظام السابق.
                  </p>
               </div>
               <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportLegacy} 
                accept=".json" 
                className="hidden" 
               />
               <Button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isImporting}
                variant="outline"
                className="w-full h-14 rounded-2xl glass border-white/20 font-black gap-3 text-accent"
               >
                  {isImporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                  رفع واستيراد البيانات
               </Button>
            </CardContent>
         </Card>

         <Card className="md:col-span-2 border-none bg-gradient-to-br from-[#3960AC] to-[#2a4580] text-white rounded-[3rem] p-4">
            <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
               <div className="space-y-4">
                  <div className="flex items-center gap-3">
                     <ShieldCheck className="h-8 w-8 text-emerald-400" />
                     <h2 className="text-2xl font-black">حماية البيانات والخصوصية</h2>
                  </div>
                  <p className="text-sm text-white/70 max-w-2xl leading-relaxed font-medium">
                     نظام Express Phone Pro مبني على سحابة Google Firebase المشفرة. بياناتك لا تغادر متصفحك إلا إلى خوادم آمنة جداً. يمكنك حذف كافة البيانات محلياً أو من السحابة في أي وقت.
                  </p>
               </div>
               <div className="flex gap-4 w-full md:w-auto">
                  <Button variant="ghost" className="h-14 px-8 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold border border-white/10">
                     شروط الاستخدام
                  </Button>
                  <Button variant="destructive" className="h-14 px-8 rounded-2xl font-black shadow-2xl">
                     مسح شامل للنظام
                  </Button>
               </div>
            </CardContent>
         </Card>
      </div>

      <footer className="text-center py-10 opacity-30 text-[10px] font-black uppercase tracking-[0.5em]">
         System Security Verified • Khaled_Deragha © 2024
      </footer>
    </div>
  )
}
