
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
    ).sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
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
      toast({ title: "تمت الإضافة", description: "تم تسجيل العميل الجديد في النظام" })
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
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-4xl font-black text-gradient-premium tracking-tighter">العملاء والديون</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.3em] mt-1">قاعدة بيانات الزبائن وتتبع السجلات المالية</p>
        </div>
        <Button onClick={() => { setEditingCustomer(null); setCustomerName(""); setCustomerPhone(""); setOpenAdd(true); }} className="h-14 px-8 rounded-2xl bg-primary text-white shadow-2xl hover:scale-105 transition-transform gap-2 font-black">
          <Plus className="h-6 w-6" /> إضافة عميل جديد
        </Button>
      </header>

      <div className="max-w-md relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input 
          placeholder="ابحث بالاسم أو رقم الهاتف..." 
          className="pl-12 h-14 glass rounded-2xl border-none shadow-sm font-bold" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="border-none glass rounded-[2.5rem] overflow-hidden shadow-xl">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="font-black text-foreground">الاسم الكامل</TableHead>
              <TableHead className="font-black text-foreground">رقم الهاتف</TableHead>
              <TableHead className="text-left font-black text-foreground">إجمالي الدين</TableHead>
              <TableHead className="text-center font-black text-foreground">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : sortedCustomers.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-20 opacity-30 italic font-black">لا يوجد عملاء مسجلين حالياً</TableCell></TableRow>
            ) : sortedCustomers.map((c) => (
              <TableRow key={c.id} className="group border-white/5 hover:bg-white/40 transition-all">
                <TableCell className="font-bold text-lg">{c.name}</TableCell>
                <TableCell className="font-bold tabular-nums flex items-center gap-2">
                   <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                      <Phone className="h-4 w-4" />
                   </div>
                   {c.phone}
                </TableCell>
                <TableCell className={`text-left font-black text-lg tabular-nums ${c.debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {c.debt.toLocaleString()} دج
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                    <Button 
                      variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white"
                      onClick={() => fetchHistory(c)}
                      title="سجل العمليات"
                    >
                      <History className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white"
                      onClick={() => openEdit(c)}
                      title="تعديل"
                    >
                      <Edit3 className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white"
                      onClick={() => { if(confirm("هل أنت متأكد من حذف العميل؟")) deleteDocumentNonBlocking(doc(db, "customers", c.id)) }}
                      title="حذف"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent dir="rtl" className="glass border-none rounded-[2.5rem] shadow-2xl p-8 z-[300]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gradient-premium">
              {editingCustomer ? "تعديل بيانات العميل" : "إضافة عميل جديد للنظام"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <Label className="font-black text-xs text-primary px-1">الاسم الكامل</Label>
              <Input 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)} 
                className="rounded-2xl h-14 glass border-none font-bold text-lg" 
                placeholder="مثال: خالد دراغة" 
              />
            </div>
            <div className="space-y-2">
              <Label className="font-black text-xs text-primary px-1">رقم الهاتف</Label>
              <Input 
                value={customerPhone} 
                onChange={(e) => setCustomerPhone(e.target.value)} 
                className="rounded-2xl h-14 glass border-none font-bold text-lg" 
                placeholder="06XXXXXXXX" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddOrUpdate} className="w-full h-14 rounded-2xl font-black bg-primary text-white text-lg shadow-xl">
              تأكيد وحفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!selectedHistoryCustomer} onOpenChange={() => setSelectedHistoryCustomer(null)}>
        <DialogContent dir="rtl" className="max-w-5xl glass border-none rounded-[3rem] shadow-2xl p-0 overflow-hidden z-[310] h-[90vh] flex flex-col">
          <div className="p-8 bg-primary/5 border-b border-white/10 flex items-center justify-between shrink-0">
             <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                   <History className="h-8 w-8" />
                </div>
                <div>
                   <h2 className="text-2xl font-black text-gradient-premium">سجل عمليات العميل</h2>
                   <p className="text-sm font-bold text-muted-foreground">{selectedHistoryCustomer?.name}</p>
                </div>
             </div>
             <Badge variant={selectedHistoryCustomer?.debt > 0 ? "destructive" : "success"} className="h-10 px-6 rounded-xl font-black text-lg tabular-nums">
                {selectedHistoryCustomer?.debt > 0 ? `المستحقات: ${selectedHistoryCustomer.debt.toLocaleString()} دج` : "الحساب مسوى"}
             </Badge>
          </div>

          <div className="p-6 bg-card/40 border-b border-white/5 flex flex-col md:flex-row gap-4 shrink-0">
             <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="بحث في سجل الفواتير برقم المعرف..." 
                  className="pl-10 h-11 glass border-none rounded-xl font-bold text-xs" 
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
             </div>
             <div className="flex items-center gap-3">
                <Select value={historyFilter} onValueChange={setHistoryFilter}>
                  <SelectTrigger className="w-40 h-11 glass border-none rounded-xl font-bold text-xs">
                    <div className="flex items-center gap-2"><Filter className="h-3 w-3" /><SelectValue placeholder="الحالة" /></div>
                  </SelectTrigger>
                  <SelectContent className="glass border-none rounded-xl z-[350]">
                     <SelectItem value="all">كل الحالات</SelectItem>
                     <SelectItem value="Paid">مدفوعة</SelectItem>
                     <SelectItem value="Debt">ديون (غير مكتملة)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={historySort} onValueChange={setHistorySort}>
                  <SelectTrigger className="w-40 h-11 glass border-none rounded-xl font-bold text-xs">
                    <div className="flex items-center gap-2"><ArrowUpDown className="h-3 w-3" /><SelectValue placeholder="الترتيب" /></div>
                  </SelectTrigger>
                  <SelectContent className="glass border-none rounded-xl z-[350]">
                     <SelectItem value="desc">من الأحدث</SelectItem>
                     <SelectItem value="asc">من الأقدم</SelectItem>
                  </SelectContent>
                </Select>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
            {isHistoryLoading ? (
              <div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-20 text-center opacity-30 italic font-black text-foreground">لا توجد عمليات تطابق البحث حالياً</div>
            ) : filteredHistory.map((inv) => (
              <div key={inv.id} className="p-6 rounded-[2rem] glass border-white/5 flex flex-col md:flex-row md:items-center justify-between group hover:bg-card/60 transition-all gap-4">
                <div className="flex items-center gap-6">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">رقم الفاتورة</span>
                      <span className="font-black text-foreground tabular-nums">#{inv.id.slice(0, 8)}</span>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">التاريخ</span>
                      <span className="font-bold text-xs text-foreground">
                        {inv.createdAt?.toDate ? format(inv.createdAt.toDate(), "yyyy/MM/dd HH:mm", { locale: ar }) : "---"}
                      </span>
                   </div>
                   <div className="hidden md:block h-10 w-px bg-border" />
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
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
                         <span className={cn("font-black tabular-nums", (inv.totalAmount - inv.paidAmount) > 0 ? "text-red-600" : "text-emerald-600")}>
                           {(inv.totalAmount - inv.paidAmount).toLocaleString()} دج
                         </span>
                      </div>
                   </div>
                </div>
                
                <div className="flex items-center gap-2">
                   <Badge variant={inv.status === "Paid" ? "success" : "destructive"} className="h-9 px-4 rounded-xl font-black">
                      {inv.status === "Paid" ? "مدفوعة كاملة" : "دين متبقي"}
                   </Badge>
                   <Button 
                    variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white"
                    onClick={() => fetchInvItems(inv)}
                   >
                     <Eye className="h-5 w-5" />
                   </Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-6 bg-black/5 text-center shrink-0">
             <Button className="rounded-2xl px-12 h-12 font-black" onClick={() => setSelectedHistoryCustomer(null)}>إغلاق السجل</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Details Preview */}
      <Dialog open={!!selectedInvPreview} onOpenChange={() => setSelectedInvPreview(null)}>
        <DialogContent dir="rtl" className="max-w-2xl glass border-none rounded-[2.5rem] shadow-2xl p-0 overflow-hidden z-[350]">
           <div className="p-6 md:p-8 bg-accent/5 border-b border-border flex justify-between items-center">
              <DialogTitle className="text-xl font-black text-gradient-premium flex items-center gap-3">
                 <FileText className="h-6 w-6 text-primary" /> تفاصيل الفاتورة #{selectedInvPreview?.id.slice(0, 8)}
              </DialogTitle>
           </div>
           <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4 glass p-4 rounded-2xl border-white/5">
                 <div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase">الحالة</span>
                    <div className="flex items-center gap-2 mt-1">
                       {selectedInvPreview?.status === "Paid" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
                       <span className="font-bold text-sm">{selectedInvPreview?.status === "Paid" ? "مكتملة" : "غير مكتملة الدفع"}</span>
                    </div>
                 </div>
                 <div className="text-left">
                    <span className="text-[10px] font-black text-muted-foreground uppercase">المجموع النهائي</span>
                    <p className="font-black text-xl text-primary tabular-nums">{selectedInvPreview?.totalAmount.toLocaleString()} دج</p>
                 </div>
              </div>

              <div className="space-y-3">
                 <p className="font-black text-sm text-primary px-1">المنتجات / الخدمات في الفاتورة</p>
                 <div className="space-y-2">
                    {isPreviewLoading ? (
                      <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
                    ) : previewItems.map((item) => (
                      <div key={item.id} className="p-4 rounded-2xl glass border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                               <FileText className="h-5 w-5" />
                            </div>
                            <div>
                               <p className="font-bold text-sm">{item.productName}</p>
                               <p className="text-[10px] text-muted-foreground font-bold tabular-nums">{item.quantity} قطعة × {item.unitPrice.toLocaleString()} دج</p>
                            </div>
                         </div>
                         <span className="font-black text-sm tabular-nums text-primary">{item.itemTotal.toLocaleString()} دج</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
           <div className="p-6 bg-black/5 text-center">
              <Button variant="outline" className="rounded-xl px-12 h-11 font-black" onClick={() => setSelectedInvPreview(null)}>إغلاق المعاينة</Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
