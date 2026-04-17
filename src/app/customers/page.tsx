
"use client"

import * as React from "react"
import { 
  Users, 
  Plus, 
  Search, 
  Trash2,
  Edit3,
  History,
  Phone,
  Loader2,
  FileText,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  X,
  Eye,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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
  DialogFooter
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc, serverTimestamp, query, where, getDocs, orderBy } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"

export default function CustomersPage() {
  const { toast } = useToast()
  const db = useFirestore()
  
  // States for Customers List
  const [searchTerm, setSearchTerm] = React.useState("")
  const [openAdd, setOpenAdd] = React.useState(false)
  const [editingCustomer, setEditingCustomer] = React.useState<any>(null)
  const [customerName, setCustomerName] = React.useState("")
  const [customerPhone, setCustomerPhone] = React.useState("")
  
  // States for History Dialog
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = React.useState<any>(null)
  const [historyInvoices, setHistoryInvoices] = React.useState<any[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = React.useState(false)
  const [historySearch, setHistorySearch] = React.useState("")
  const [historyFilter, setHistoryFilter] = React.useState("all")
  const [historySort, setHistorySort] = React.useState("desc")

  // States for Invoice Details Preview
  const [selectedInvPreview, setSelectedInvPreview] = React.useState<any>(null)
  const [previewItems, setPreviewItems] = React.useState<any[]>([])
  const [isPreviewLoading, setIsPreviewLoading] = React.useState(false)

  const customersRef = useMemoFirebase(() => collection(db, "customers"), [db])
  const { data: customers, isLoading } = useCollection(customersRef)

  const sortedCustomers = React.useMemo(() => {
    if (!customers) return [];
    return [...customers].filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
    ).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
  }, [customers, searchTerm])

  const handleAddOrUpdate = () => {
    if (!customerName || !customerPhone) {
      toast({ title: "خطأ", description: "يرجى ملء كافة البيانات", variant: "destructive" })
      return
    }

    const customerData = {
      name: customerName,
      phone: customerPhone,
      updatedAt: serverTimestamp()
    }

    if (editingCustomer) {
      updateDocumentNonBlocking(doc(db, "customers", editingCustomer.id), customerData)
      toast({ title: "تم التعديل", description: "تم تحديث بيانات العميل بنجاح" })
    } else {
      addDocumentNonBlocking(customersRef, {
        ...customerData,
        debt: 0,
        createdAt: serverTimestamp()
      })
      toast({ title: "تمت الإضافة", description: "تم تسجيل العميل الجديد" })
    }

    setOpenAdd(false)
    setEditingCustomer(null)
    setCustomerName("")
    setCustomerPhone("")
  }

  const openEdit = (customer: any) => {
    setEditingCustomer(customer)
    setCustomerName(customer.name)
    setCustomerPhone(customer.phone)
    setOpenAdd(true)
  }

  const fetchHistory = async (customer: any) => {
    setSelectedHistoryCustomer(customer)
    setIsHistoryLoading(true)
    try {
      const q = query(collection(db, "invoices"), where("customerId", "==", customer.id))
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      setHistoryInvoices(data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsHistoryLoading(false)
    }
  }

  const filteredHistory = React.useMemo(() => {
    let items = historyInvoices.filter(inv => 
      inv.id.toLowerCase().includes(historySearch.toLowerCase())
    )

    if (historyFilter !== "all") {
      items = items.filter(inv => inv.status === historyFilter)
    }

    items.sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0
      const dateB = b.createdAt?.seconds || 0
      return historySort === "desc" ? dateB - dateA : dateA - dateB
    })

    return items
  }, [historyInvoices, historySearch, historyFilter, historySort])

  const fetchInvItems = async (inv: any) => {
    setSelectedInvPreview(inv)
    setIsPreviewLoading(true)
    try {
      const itemsRef = collection(db, "invoices", inv.id, "items")
      const snapshot = await getDocs(itemsRef)
      setPreviewItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) {
      console.error(e)
    } finally {
      setIsPreviewLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 pb-32">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col">
          <h1 className="text-2xl md:text-4xl font-black text-gradient-premium tracking-tighter">قاعدة العملاء</h1>
          <p className="text-[9px] md:text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1">تتبع السجلات المالية والديون</p>
        </div>
        <Button onClick={() => { setEditingCustomer(null); setCustomerName(""); setCustomerPhone(""); setOpenAdd(true); }} className="w-full md:w-auto h-12 md:h-14 px-8 rounded-2xl bg-primary text-white shadow-xl gap-2 font-black">
          <Plus className="h-5 w-5" /> إضافة عميل جديد
        </Button>
      </header>

      <div className="max-w-md relative group w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input 
          placeholder="ابحث بالاسم أو رقم الهاتف..." 
          className="pl-12 h-12 md:h-14 glass rounded-2xl border-none shadow-sm font-bold text-sm" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="border-none glass rounded-[2rem] overflow-hidden shadow-xl">
        <div className="table-container">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="font-black text-foreground">الاسم الكامل</TableHead>
                <TableHead className="font-black text-foreground text-center">رقم الهاتف</TableHead>
                <TableHead className="text-left font-black text-foreground">إجمالي الدين</TableHead>
                <TableHead className="text-center font-black text-foreground">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : sortedCustomers.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20 opacity-30 italic font-black">لا يوجد عملاء</TableCell></TableRow>
              ) : sortedCustomers.map((c) => (
                <TableRow key={c.id} className="group border-white/5 hover:bg-white/40 transition-all">
                  <TableCell className="font-bold text-xs md:text-lg">{c.name}</TableCell>
                  <TableCell className="font-bold tabular-nums text-center text-[10px] md:text-sm">
                    <div className="flex items-center justify-center gap-2">
                       <Phone className="h-3 w-3 text-primary opacity-50 hidden sm:block" />
                       {c.phone}
                    </div>
                  </TableCell>
                  <TableCell className={`text-left font-black text-xs md:text-lg tabular-nums ${c.debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {c.debt.toLocaleString()} دج
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 md:gap-2">
                      <Button 
                        variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-primary/10 text-primary"
                        onClick={() => fetchHistory(c)}
                        title="السجل"
                      >
                        <History className="h-4 w-4 md:h-5 md:w-5" />
                      </Button>
                      <Button 
                        variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-orange-500/10 text-orange-600"
                        onClick={() => openEdit(c)}
                        title="تعديل"
                      >
                        <Edit3 className="h-4 w-4 md:h-5 md:w-5" />
                      </Button>
                      <Button 
                        variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-destructive/10 text-destructive"
                        onClick={() => { if(confirm("هل أنت متأكد من حذف العميل؟")) deleteDocumentNonBlocking(doc(db, "customers", c.id)) }}
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent dir="rtl" className="w-[90%] glass border-none rounded-[2rem] md:rounded-[2.5rem] shadow-2xl p-6 md:p-8 z-[300]">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl font-black text-gradient-premium">
              {editingCustomer ? "تعديل بيانات العميل" : "إضافة عميل جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <Label className="font-black text-[10px] md:text-xs text-primary px-1">الاسم الكامل</Label>
              <Input 
                value={customerName} 
                onChange={(e) => setcustomerName(e.target.value)} 
                className="rounded-xl md:rounded-2xl h-11 md:h-14 glass border-none font-bold text-sm md:text-lg" 
                placeholder="اسم العميل" 
              />
            </div>
            <div className="space-y-2">
              <Label className="font-black text-[10px] md:text-xs text-primary px-1">رقم الهاتف</Label>
              <Input 
                value={customerPhone} 
                onChange={(e) => setcustomerPhone(e.target.value)} 
                className="rounded-xl md:rounded-2xl h-11 md:h-14 glass border-none font-bold text-sm md:text-lg" 
                placeholder="06XXXXXXXX" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddOrUpdate} className="w-full h-12 md:h-14 rounded-xl md:rounded-2xl font-black bg-primary text-white text-md md:text-lg shadow-xl">
              تأكيد وحفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!selectedHistoryCustomer} onOpenChange={() => setSelectedHistoryCustomer(null)}>
        <DialogContent dir="rtl" className="max-w-5xl w-[95%] glass border-none rounded-[2.5rem] md:rounded-[3rem] shadow-2xl p-0 overflow-hidden z-[310] h-[90vh] flex flex-col">
          <DialogHeader className="p-6 md:p-8 bg-primary/5 border-b border-white/10 shrink-0">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div className="flex items-center gap-3">
                  <div className="h-10 w-10 md:h-14 md:w-14 rounded-[1.2rem] md:rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary">
                     <History className="h-6 w-6 md:h-8 md:w-8" />
                  </div>
                  <div>
                     <DialogTitle className="text-lg md:text-2xl font-black text-gradient-premium leading-tight">سجل عمليات العميل</DialogTitle>
                     <p className="text-[10px] md:text-sm font-bold text-muted-foreground">{selectedHistoryCustomer?.name}</p>
                  </div>
               </div>
               <Badge variant={selectedHistoryCustomer?.debt > 0 ? "destructive" : "success"} className="h-9 md:h-10 px-4 md:px-6 rounded-xl font-black text-xs md:text-lg tabular-nums self-start md:self-center">
                  {selectedHistoryCustomer?.debt > 0 ? `المستحقات: ${selectedHistoryCustomer.debt.toLocaleString()} دج` : "الحساب مسوى"}
               </Badge>
             </div>
          </DialogHeader>

          <div className="p-4 md:p-6 bg-card/40 border-b border-white/5 flex flex-col md:flex-row gap-3 shrink-0">
             <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="بحث برقم الفاتورة..." 
                  className="pl-10 h-10 md:h-11 glass border-none rounded-xl font-bold text-xs" 
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
             </div>
             <div className="flex items-center gap-2">
                <Select value={historyFilter} onValueChange={setHistoryFilter}>
                  <SelectTrigger className="flex-1 md:w-40 h-10 md:h-11 glass border-none rounded-xl font-bold text-xs">
                    <div className="flex items-center gap-2"><Filter className="h-3 w-3" /><SelectValue placeholder="الحالة" /></div>
                  </SelectTrigger>
                  <SelectContent className="glass border-none rounded-xl z-[350]">
                     <SelectItem value="all">الكل</SelectItem>
                     <SelectItem value="Paid">مدفوعة</SelectItem>
                     <SelectItem value="Debt">ديون</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={historySort} onValueChange={setHistorySort}>
                  <SelectTrigger className="flex-1 md:w-40 h-10 md:h-11 glass border-none rounded-xl font-bold text-xs">
                    <div className="flex items-center gap-2"><ArrowUpDown className="h-3 w-3" /><SelectValue placeholder="الترتيب" /></div>
                  </SelectTrigger>
                  <SelectContent className="glass border-none rounded-xl z-[350]">
                     <SelectItem value="desc">الأحدث</SelectItem>
                     <SelectItem value="asc">الأقدم</SelectItem>
                  </SelectContent>
                </Select>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 custom-scrollbar">
            {isHistoryLoading ? (
              <div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-20 text-center opacity-30 italic font-black text-xs md:text-sm">لا توجد سجلات حالياً</div>
            ) : filteredHistory.map((inv) => (
              <div key={inv.id} className="p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] glass border-white/5 flex flex-col md:flex-row md:items-center justify-between group hover:bg-card/60 transition-all gap-4 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 flex-1">
                   <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[8px] md:text-[10px] font-black text-primary uppercase">رقم الفاتورة</span>
                        <span className="font-black text-foreground text-xs md:text-sm tabular-nums">#{inv.id.slice(0, 8)}</span>
                      </div>
                      <div className="h-8 w-px bg-border mx-1 md:mx-2" />
                      <div className="flex flex-col">
                        <span className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase">التاريخ</span>
                        <span className="font-bold text-[10px] md:text-xs text-foreground">
                          {inv.createdAt?.toDate ? format(inv.createdAt.toDate(), "yyyy/MM/dd", { locale: ar }) : "---"}
                        </span>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 md:gap-8 p-3 md:p-0 bg-black/5 md:bg-transparent rounded-xl">
                      <div className="flex flex-col">
                         <span className="text-[8px] md:text-[9px] font-black text-muted-foreground uppercase">الإجمالي</span>
                         <span className="font-black text-foreground tabular-nums text-xs md:text-sm">{inv.totalAmount.toLocaleString()} دج</span>
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[8px] md:text-[9px] font-black text-emerald-500 uppercase">المدفوع</span>
                         <span className="font-black text-emerald-600 tabular-nums text-xs md:text-sm">{inv.paidAmount.toLocaleString()} دج</span>
                      </div>
                      <div className="flex flex-col col-span-2 md:col-span-1 pt-2 md:pt-0 border-t md:border-none border-white/10">
                         <span className="text-[8px] md:text-[9px] font-black text-red-500 uppercase">المتبقي</span>
                         <span className={cn("font-black tabular-nums text-sm md:text-lg", (inv.totalAmount - inv.paidAmount) > 0 ? "text-red-600" : "text-emerald-600")}>
                           {(inv.totalAmount - inv.paidAmount).toLocaleString()} دج
                         </span>
                      </div>
                   </div>
                </div>
                
                <div className="flex items-center gap-2 justify-end pt-3 md:pt-0 border-t md:border-none border-white/5">
                   <Badge variant={inv.status === "Paid" ? "success" : "destructive"} className="h-8 px-3 rounded-lg font-black text-[9px] md:text-xs">
                      {inv.status === "Paid" ? "مدفوعة" : "دين"}
                   </Badge>
                   <Button 
                    variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-primary/10 text-primary"
                    onClick={() => fetchInvItems(inv)}
                   >
                     <Eye className="h-4 w-4" />
                   </Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 md:p-6 bg-black/5 text-center shrink-0">
             <Button className="rounded-2xl px-12 h-12 font-black shadow-lg" onClick={() => setSelectedHistoryCustomer(null)}>إغلاق</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Details Preview */}
      <Dialog open={!!selectedInvPreview} onOpenChange={() => setSelectedInvPreview(null)}>
        <DialogContent dir="rtl" className="max-w-2xl w-[90%] glass border-none rounded-[2rem] shadow-2xl p-0 overflow-hidden z-[350]">
           <DialogHeader className="p-6 md:p-8 bg-accent/5 border-b border-border">
              <DialogTitle className="text-lg md:text-xl font-black text-gradient-premium flex items-center gap-3">
                 <FileText className="h-6 w-6 text-primary" /> تفاصيل الفاتورة #{selectedInvPreview?.id.slice(0, 8)}
              </DialogTitle>
           </DialogHeader>
           <div className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4 glass p-4 rounded-xl border-white/5">
                 <div>
                    <span className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase">الحالة</span>
                    <div className="flex items-center gap-2 mt-1">
                       {selectedInvPreview?.status === "Paid" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
                       <span className="font-bold text-[10px] md:text-sm">{selectedInvPreview?.status === "Paid" ? "مكتملة" : "دين متبقي"}</span>
                    </div>
                 </div>
                 <div className="text-left">
                    <span className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase">المجموع</span>
                    <p className="font-black text-sm md:text-xl text-primary tabular-nums">{selectedInvPreview?.totalAmount.toLocaleString()} دج</p>
                 </div>
              </div>

              <div className="space-y-3">
                 <p className="font-black text-xs text-primary px-1">المنتجات المباعة</p>
                 <div className="space-y-2">
                    {isPreviewLoading ? (
                      <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
                    ) : previewItems.map((item) => (
                      <div key={item.id} className="p-3 md:p-4 rounded-xl md:rounded-2xl glass border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                               <FileText className="h-4 w-4 md:h-5 md:w-5" />
                            </div>
                            <div className="flex flex-col">
                               <p className="font-black text-xs md:text-sm">{item.productName}</p>
                               <p className="text-[8px] md:text-[10px] text-muted-foreground font-bold tabular-nums">{item.quantity} قطعة × {item.unitPrice.toLocaleString()} دج</p>
                            </div>
                         </div>
                         <span className="font-black text-[10px] md:text-sm tabular-nums text-primary">{item.itemTotal.toLocaleString()} دج</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
           <div className="p-6 bg-black/5 text-center">
              <Button variant="outline" className="rounded-xl px-12 h-11 font-black" onClick={() => setSelectedInvPreview(null)}>إغلاق</Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
