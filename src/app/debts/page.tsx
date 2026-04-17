
"use client"

import * as React from "react"
import { 
  Wallet, 
  Search, 
  ArrowUpDown, 
  Loader2, 
  ChevronLeft, 
  Eye, 
  Trash2, 
  Edit3, 
  History,
  User,
  Smartphone,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, where, doc, increment, getDocs } from "firebase/firestore"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"

export default function DebtsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null)
  const [customerInvoices, setCustomerInvoices] = React.useState<any[]>([])
  const [isLoadingInvoices, setIsLoadingInvoices] = React.useState(false)
  const [sortConfig, setSortConfig] = React.useState({ key: 'debt', direction: 'desc' })

  // 1. Fetch customers with debt > 0
  const customersRef = useMemoFirebase(() => collection(db, "customers"), [db])
  const { data: allCustomers, isLoading: isCustomersLoading } = useCollection(customersRef)

  const indebtedCustomers = React.useMemo(() => {
    if (!allCustomers) return []
    return allCustomers
      .filter(c => c.debt > 0 && c.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        if (sortConfig.direction === 'asc') return a[sortConfig.key] - b[sortConfig.key]
        return b[sortConfig.key] - a[sortConfig.key]
      })
  }, [allCustomers, searchTerm, sortConfig])

  const totalGlobalDebt = React.useMemo(() => {
    return allCustomers?.reduce((sum, c) => sum + (c.debt || 0), 0) || 0
  }, [allCustomers])

  const fetchCustomerInvoices = async (customer: any) => {
    setSelectedCustomer(customer)
    setIsLoadingInvoices(true)
    try {
      const q = query(collection(db, "invoices"), where("customerId", "==", customer.id))
      const snapshot = await getDocs(q)
      const items = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((inv: any) => inv.totalAmount > inv.paidAmount)
      setCustomerInvoices(items)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoadingInvoices(false)
    }
  }

  const handleDeleteDebtInvoice = async (invoice: any) => {
    if (confirm("هل تريد حذف هذه الفاتورة؟ سيتم إعادة المنتجات للمخزون وخصم المبلغ من دين العميل.")) {
      try {
        // 1. Restore Stock
        const itemsSnap = await getDocs(collection(db, "invoices", invoice.id, "items"))
        itemsSnap.docs.forEach(itemDoc => {
          const item = itemDoc.data()
          if (item.productId) {
            updateDocumentNonBlocking(doc(db, "products", item.productId), {
              quantity: increment(item.quantity)
            })
          }
        })

        // 2. Adjust Customer Debt
        const unpaidAmount = invoice.totalAmount - invoice.paidAmount
        updateDocumentNonBlocking(doc(db, "customers", invoice.customerId), {
          debt: increment(-unpaidAmount)
        })

        // 3. Delete Invoice
        deleteDocumentNonBlocking(doc(db, "invoices", invoice.id))
        
        toast({ title: "تم الحذف", description: "تم حذف الفاتورة وتحديث المخزون والدين" })
        setCustomerInvoices(prev => prev.filter(inv => inv.id !== invoice.id))
      } catch (error) {
        toast({ variant: "destructive", title: "خطأ", description: "فشلت العملية" })
      }
    }
  }

  const handleUpdatePayment = (invoice: any) => {
    const newPaid = prompt(`إجمالي الفاتورة: ${invoice.totalAmount}\nالمدفوع حالياً: ${invoice.paidAmount}\nأدخل المبلغ المدفوع الجديد:`, invoice.paidAmount)
    if (newPaid !== null) {
      const paidNum = Number(newPaid)
      const diff = paidNum - invoice.paidAmount
      
      updateDocumentNonBlocking(doc(db, "invoices", invoice.id), {
        paidAmount: paidNum,
        status: paidNum >= invoice.totalAmount ? "Paid" : "Debt"
      })

      updateDocumentNonBlocking(doc(db, "customers", invoice.customerId), {
        debt: increment(-diff)
      })

      toast({ title: "تم التحديث", description: "تم تحديث الدفعة المالية بنجاح" })
      setCustomerInvoices(prev => prev.map(inv => inv.id === invoice.id ? { ...inv, paidAmount: paidNum } : inv))
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">
      <header className="flex h-20 shrink-0 items-center justify-between glass px-8 rounded-[2rem]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg">
              <Wallet className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-gradient-premium uppercase tracking-tighter">إدارة الديون المستحقة</h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">تتبع شامل للمستحقات المالية</p>
            </div>
          </div>
          <div className="h-8 w-px bg-border mx-2" />
          <div className="flex flex-col">
             <span className="text-[10px] font-black text-muted-foreground uppercase">إجمالي ديون السوق</span>
             <span className="text-xl font-black text-red-600 tabular-nums">{totalGlobalDebt.toLocaleString()} دج</span>
          </div>
        </div>

        <div className="relative w-72 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="بحث عن عميل مدين..." 
            className="pl-10 h-11 glass border-none rounded-xl font-bold" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="grid gap-6">
        <Card className="border-none glass rounded-[2.5rem] overflow-hidden shadow-xl">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-black text-foreground">العميل</TableHead>
                <TableHead className="font-black text-foreground">رقم الهاتف</TableHead>
                <TableHead 
                  className="text-left font-black text-foreground cursor-pointer group"
                  onClick={() => setSortConfig({ key: 'debt', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                >
                  <div className="flex items-center gap-2 justify-end">
                    إجمالي الدين <ArrowUpDown className="h-3 w-3 opacity-30" />
                  </div>
                </TableHead>
                <TableHead className="text-center font-black text-foreground">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isCustomersLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : indebtedCustomers.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20 opacity-30 italic font-black">لا يوجد ديون مسجلة حالياً</TableCell></TableRow>
              ) : indebtedCustomers.map((c) => (
                <TableRow key={c.id} className="group border-border hover:bg-muted/50 transition-all">
                  <TableCell>
                    <div className="flex items-center gap-3">
                       <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <User className="h-5 w-5" />
                       </div>
                       <span className="font-bold text-foreground">{c.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-muted-foreground tabular-nums">{c.phone}</TableCell>
                  <TableCell className="text-left font-black text-red-600 text-lg tabular-nums">
                    {c.debt.toLocaleString()} دج
                  </TableCell>
                  <TableCell className="text-center">
                    <Button 
                      variant="ghost" 
                      className="h-10 px-4 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white font-black gap-2 transition-all"
                      onClick={() => fetchCustomerInvoices(c)}
                    >
                      عرض الفواتير <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent dir="rtl" className="max-w-4xl glass border-none rounded-[3rem] shadow-2xl p-0 overflow-hidden z-[210]">
          <DialogHeader className="p-8 bg-primary/5 border-b border-border">
            <div className="flex justify-between items-center">
               <DialogTitle className="text-2xl font-black text-gradient-premium flex items-center gap-3">
                 <History className="h-6 w-6" /> فواتير العميل: {selectedCustomer?.name}
               </DialogTitle>
               <Badge variant="destructive" className="px-4 py-1.5 rounded-xl font-black text-sm">
                 إجمالي متبقي: {selectedCustomer?.debt.toLocaleString()} دج
               </Badge>
            </div>
          </DialogHeader>
          
          <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {isLoadingInvoices ? (
              <div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></div>
            ) : customerInvoices.length === 0 ? (
              <div className="py-20 text-center opacity-30 italic font-black text-foreground">لا توجد فواتير مديونية نشطة</div>
            ) : (
              <div className="space-y-4">
                {customerInvoices.map((inv) => (
                  <div key={inv.id} className="p-6 rounded-[2rem] glass border-white/10 flex items-center justify-between group hover:bg-card transition-all">
                    <div className="flex items-center gap-6">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-primary uppercase">رقم الفاتورة</span>
                          <span className="font-black text-foreground">#{inv.id.slice(0, 8)}</span>
                       </div>
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-muted-foreground uppercase">التاريخ</span>
                          <span className="font-bold text-xs text-foreground">
                            {inv.createdAt?.toDate ? format(inv.createdAt.toDate(), "yyyy/MM/dd", { locale: ar }) : "---"}
                          </span>
                       </div>
                       <div className="h-10 w-px bg-border" />
                       <div className="grid grid-cols-3 gap-8">
                          <div className="flex flex-col">
                             <span className="text-[10px] font-black text-muted-foreground uppercase">الإجمالي</span>
                             <span className="font-black text-foreground tabular-nums">{inv.totalAmount.toLocaleString()} دج</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[10px] font-black text-emerald-500 uppercase">المدفوع</span>
                             <span className="font-black text-emerald-600 tabular-nums">{inv.paidAmount.toLocaleString()} دج</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[10px] font-black text-red-500 uppercase">المتبقي</span>
                             <span className="font-black text-red-600 tabular-nums">{(inv.totalAmount - inv.paidAmount).toLocaleString()} دج</span>
                          </div>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       <Button 
                        variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white"
                        onClick={() => handleUpdatePayment(inv)}
                        title="تعديل الدفعة"
                       >
                         <Edit3 className="h-4 w-4" />
                       </Button>
                       <Button 
                        variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white"
                        onClick={() => handleDeleteDebtInvoice(inv)}
                        title="حذف الفاتورة"
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-6 bg-black/5 text-center">
             <Button className="rounded-2xl px-12 h-12 font-black" onClick={() => setSelectedCustomer(null)}>إغلاق النافذة</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
