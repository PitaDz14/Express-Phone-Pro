
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
  AlertCircle,
  ShoppingBag,
  FileText
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
import { cn } from "@/lib/utils"

export default function DebtsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null)
  const [customerInvoices, setCustomerInvoices] = React.useState<any[]>([])
  const [isLoadingInvoices, setIsLoadingInvoices] = React.useState(false)
  const [sortConfig, setSortConfig] = React.useState({ key: 'debt', direction: 'desc' })

  // States for Invoice Preview
  const [selectedInvoiceForItems, setSelectedInvoiceForItems] = React.useState<any>(null)
  const [invoiceItems, setInvoiceItems] = React.useState<any[]>([])
  const [isLoadingItems, setIsLoadingItems] = React.useState(false)

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

  const fetchInvoiceItems = async (invoice: any) => {
    setSelectedInvoiceForItems(invoice)
    setIsLoadingItems(true)
    try {
      const itemsRef = collection(db, "invoices", invoice.id, "items")
      const snapshot = await getDocs(itemsRef)
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setInvoiceItems(items)
    } catch (error) {
      console.error("Error fetching items:", error)
      toast({ variant: "destructive", title: "خطأ", description: "فشل استرجاع عناصر الفاتورة" })
    } finally {
      setIsLoadingItems(false)
    }
  }

  const handleDeleteDebtInvoice = async (invoice: any) => {
    if (confirm("هل تريد حذف هذه الفاتورة؟ سيتم إعادة المنتجات للمخزون وخصم المبلغ من دين العميل.")) {
      try {
        const itemsSnap = await getDocs(collection(db, "invoices", invoice.id, "items"))
        itemsSnap.docs.forEach(itemDoc => {
          const item = itemDoc.data()
          if (item.productId) {
            updateDocumentNonBlocking(doc(db, "products", item.productId), {
              quantity: increment(item.quantity)
            })
          }
        })

        const unpaidAmount = invoice.totalAmount - invoice.paidAmount
        updateDocumentNonBlocking(doc(db, "customers", invoice.customerId), {
          debt: increment(-unpaidAmount)
        })

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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 pb-32">
      <header className="flex flex-col md:flex-row md:h-20 shrink-0 md:items-center justify-between glass p-6 md:px-8 rounded-[2rem] gap-4">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg">
              <Wallet className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg md:text-xl font-black text-gradient-premium uppercase tracking-tighter leading-tight">إدارة الديون</h1>
              <p className="text-[8px] md:text-[10px] text-muted-foreground font-bold uppercase tracking-widest">تتبع المستحقات</p>
            </div>
          </div>
          <div className="h-8 w-px bg-border mx-1 md:mx-2" />
          <div className="flex flex-col">
             <span className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase">إجمالي ديون السوق</span>
             <span className="text-sm md:text-xl font-black text-red-600 tabular-nums">{totalGlobalDebt.toLocaleString()} دج</span>
          </div>
        </div>

        <div className="relative w-full md:w-72 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="بحث عن عميل..." 
            className="pl-10 h-11 md:h-12 glass border-none rounded-xl font-bold text-xs" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <Card className="border-none glass rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-xl">
        <div className="table-container">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-black text-foreground">العميل</TableHead>
                <TableHead className="font-black text-foreground text-center">رقم الهاتف</TableHead>
                <TableHead 
                  className="text-left font-black text-foreground cursor-pointer group"
                  onClick={() => setSortConfig({ key: 'debt', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                >
                  <div className="flex items-center gap-2 justify-end">
                    الدين <ArrowUpDown className="h-3 w-3 opacity-30" />
                  </div>
                </TableHead>
                <TableHead className="text-center font-black text-foreground">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isCustomersLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : indebtedCustomers.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20 opacity-30 italic font-black">لا يوجد ديون حالياً</TableCell></TableRow>
              ) : indebtedCustomers.map((c) => (
                <TableRow key={c.id} className="group border-border hover:bg-muted/30 transition-all">
                  <TableCell>
                    <div className="flex items-center gap-3">
                       <div className="hidden sm:flex h-9 w-9 rounded-xl bg-primary/10 items-center justify-center text-primary">
                          <User className="h-5 w-5" />
                       </div>
                       <span className="font-bold text-foreground text-xs md:text-sm">{c.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-muted-foreground tabular-nums text-center text-[10px] md:text-xs">{c.phone}</TableCell>
                  <TableCell className="text-left font-black text-red-600 text-sm md:text-lg tabular-nums">
                    {c.debt.toLocaleString()} دج
                  </TableCell>
                  <TableCell className="text-center">
                    <Button 
                      variant="ghost" 
                      className="h-9 md:h-10 px-3 md:px-4 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white font-black text-[10px] md:text-xs gap-1 md:gap-2 transition-all"
                      onClick={() => fetchCustomerInvoices(c)}
                    >
                      <span className="hidden sm:inline">عرض الفواتير</span>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Customer Invoices List Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent dir="rtl" className="max-w-4xl w-[95%] glass border-none rounded-[2.5rem] md:rounded-[3rem] shadow-2xl p-0 overflow-hidden z-[210] max-h-[90vh] flex flex-col">
          <DialogHeader className="p-6 md:p-8 bg-primary/5 border-b border-border shrink-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div className="flex items-center gap-3">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-[1.2rem] bg-primary/10 flex items-center justify-center text-primary">
                    <History className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col">
                    <DialogTitle className="text-lg md:text-2xl font-black text-gradient-premium leading-tight">فواتير العميل: {selectedCustomer?.name}</DialogTitle>
                    <p className="text-[10px] font-bold text-muted-foreground">قائمة المستحقات المتبقية</p>
                  </div>
               </div>
               <Badge variant="destructive" className="px-4 py-2 rounded-xl font-black text-xs md:text-sm shadow-lg shadow-destructive/10">
                 إجمالي المتبقي: {selectedCustomer?.debt.toLocaleString()} دج
               </Badge>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 custom-scrollbar">
            {isLoadingInvoices ? (
              <div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></div>
            ) : customerInvoices.length === 0 ? (
              <div className="py-20 text-center opacity-30 italic font-black text-foreground">لا توجد فواتير مديونية</div>
            ) : (
              <div className="space-y-4">
                {customerInvoices.map((inv) => (
                  <div key={inv.id} className="p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] glass border-white/10 flex flex-col sm:flex-row sm:items-center justify-between group hover:bg-white/40 transition-all gap-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:gap-8 flex-1">
                       <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                             <span className="text-[8px] md:text-[10px] font-black text-primary uppercase">رقم الفاتورة</span>
                             <span className="font-black text-foreground text-xs md:text-sm">#{inv.id.slice(0, 8)}</span>
                          </div>
                          <div className="h-8 w-px bg-border mx-2 hidden sm:block" />
                          <div className="flex flex-col">
                             <span className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase">التاريخ</span>
                             <span className="font-bold text-[10px] md:text-xs text-foreground">
                               {inv.createdAt?.toDate ? format(inv.createdAt.toDate(), "yyyy/MM/dd", { locale: ar }) : "---"}
                             </span>
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 md:gap-8 bg-black/5 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                          <div className="flex flex-col">
                             <span className="text-[8px] md:text-[9px] font-black text-muted-foreground uppercase">الإجمالي</span>
                             <span className="font-black text-foreground tabular-nums text-xs md:text-sm">{inv.totalAmount.toLocaleString()} دج</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[8px] md:text-[9px] font-black text-emerald-500 uppercase">المدفوع</span>
                             <span className="font-black text-emerald-600 tabular-nums text-xs md:text-sm">{inv.paidAmount.toLocaleString()} دج</span>
                          </div>
                          <div className="flex flex-col col-span-2 sm:col-span-1 border-t sm:border-none border-white/10 pt-2 sm:pt-0">
                             <span className="text-[8px] md:text-[9px] font-black text-red-500 uppercase">المتبقي (الدين)</span>
                             <span className="font-black text-red-600 tabular-nums text-sm md:text-lg">{(inv.totalAmount - inv.paidAmount).toLocaleString()} دج</span>
                          </div>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-2 justify-end border-t sm:border-none border-white/5 pt-3 sm:pt-0">
                       <Button 
                        variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-primary/10 text-primary"
                        onClick={() => fetchInvoiceItems(inv)}
                        title="معاينة"
                       >
                         <Eye className="h-4 w-4" />
                       </Button>
                       <Button 
                        variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-orange-500/10 text-orange-600"
                        onClick={() => handleUpdatePayment(inv)}
                        title="تحديث"
                       >
                         <Edit3 className="h-4 w-4" />
                       </Button>
                       <Button 
                        variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive"
                        onClick={() => handleDeleteDebtInvoice(inv)}
                        title="حذف"
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-6 bg-black/5 text-center shrink-0">
             <Button className="rounded-2xl px-12 h-12 font-black shadow-lg" onClick={() => setSelectedCustomer(null)}>إغلاق السجل</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Items Details Dialog */}
      <Dialog open={!!selectedInvoiceForItems} onOpenChange={() => setSelectedInvoiceForItems(null)}>
        <DialogContent dir="rtl" className="max-w-2xl w-[90%] glass border-none rounded-[2.5rem] shadow-2xl p-0 overflow-hidden z-[220]">
          <DialogHeader className="p-6 md:p-8 bg-accent/5 border-b border-border">
            <DialogTitle className="text-xl md:text-2xl font-black text-gradient-premium flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              محتويات الفاتورة #{selectedInvoiceForItems?.id.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 md:p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 gap-4 glass p-4 rounded-2xl border-white/10">
                <div>
                   <p className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest">العميل</p>
                   <p className="font-bold text-foreground text-xs md:text-sm">{selectedInvoiceForItems?.customerName}</p>
                </div>
                <div className="text-left">
                   <p className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest">التاريخ</p>
                   <p className="font-bold text-[10px] md:text-xs text-foreground">
                    {selectedInvoiceForItems?.createdAt?.toDate ? format(selectedInvoiceForItems.createdAt.toDate(), "yyyy/MM/dd HH:mm", { locale: ar }) : "---"}
                   </p>
                </div>
             </div>

             <div className="space-y-3">
                <p className="font-black text-xs text-primary px-2 uppercase tracking-widest">المنتجات المشتراة</p>
                <div className="space-y-2">
                   {isLoadingItems ? (
                     <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
                   ) : invoiceItems.length === 0 ? (
                     <div className="py-10 text-center opacity-30 italic font-black text-xs">لا توجد عناصر</div>
                   ) : invoiceItems.map((item) => (
                     <div key={item.id} className="flex items-center justify-between p-4 glass rounded-xl border-white/10">
                        <div className="flex items-center gap-3">
                           <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                              <ShoppingBag className="h-4 w-4" />
                           </div>
                           <div className="flex flex-col">
                              <p className="text-xs font-black text-foreground">{item.productName}</p>
                              <p className="text-[9px] text-muted-foreground font-bold tabular-nums">
                                {item.quantity} قطعة × {item.unitPrice.toLocaleString()} دج
                              </p>
                           </div>
                        </div>
                        <p className="font-black text-xs md:text-sm text-primary tabular-nums">{item.itemTotal.toLocaleString()} دج</p>
                     </div>
                   ))}
                </div>
             </div>

             <div className="pt-6 border-t border-white/10 flex justify-between items-center px-2">
                <span className="text-sm md:text-lg font-black text-foreground">المجموع النهائي:</span>
                <span className="text-lg md:text-2xl font-black text-primary tabular-nums">{selectedInvoiceForItems?.totalAmount.toLocaleString()} دج</span>
             </div>
          </div>

          <div className="p-6 bg-black/5 text-center">
             <Button variant="outline" className="rounded-xl px-12 h-11 font-black" onClick={() => setSelectedInvoiceForItems(null)}>إغلاق المعاينة</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
