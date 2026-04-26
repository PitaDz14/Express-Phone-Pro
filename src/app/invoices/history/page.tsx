
"use client"

import * as React from "react"
import { 
  FileText, 
  Search, 
  Printer, 
  Eye, 
  ArrowRight,
  Loader2,
  Calendar,
  User,
  ShoppingBag,
  ChevronLeft,
  Trash2,
  Edit3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Smartphone,
  QrCode,
  Maximize2,
  UserCog
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { collection, query, orderBy, getDocs, doc, increment } from "firebase/firestore"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc' | null;
}

export default function InvoiceHistoryPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedInvoice, setSelectedInvoice] = React.useState<any>(null)
  const [invoiceItems, setInvoiceItems] = React.useState<any[]>([])
  const [isLoadingItems, setIsLoadingItems] = React.useState(false)
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: 'createdAt', direction: 'desc' })
  const [zoomQR, setZoomQR] = React.useState<{ code: string, id: string } | null>(null)

  const invoicesRef = useMemoFirebase(() => query(collection(db, "invoices")), [db])
  const { data: invoices, isLoading } = useCollection(invoicesRef)

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'desc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'desc') direction = 'asc';
      else if (sortConfig.direction === 'asc') direction = null;
    }
    setSortConfig({ key, direction });
  }

  const sortedInvoices = React.useMemo(() => {
    if (!invoices) return [];
    let items = [...invoices].filter(inv => 
      inv.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.generatedByUserName && inv.generatedByUserName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (sortConfig.key && sortConfig.direction) {
      items.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'remainingDebt') {
          aValue = a.totalAmount - a.paidAmount;
          bValue = b.totalAmount - b.paidAmount;
        } else if (sortConfig.key === 'status') {
          aValue = (a.totalAmount - a.paidAmount > 0) ? 1 : 0;
          bValue = (b.totalAmount - b.paidAmount > 0) ? 1 : 0;
        } else {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        }
        
        if (sortConfig.key === 'createdAt') {
           const timeA = aValue?.toDate ? aValue.toDate().getTime() : (aValue instanceof Date ? aValue.getTime() : 0);
           const timeB = bValue?.toDate ? bValue.toDate().getTime() : (bValue instanceof Date ? bValue.getTime() : 0);
           return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [invoices, searchTerm, sortConfig]);

  const handleDeleteInvoice = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذه الفاتورة؟ سيتم إعادة المنتجات للمخزون ومسح السجل.")) {
      try {
        const itemsRef = collection(db, "invoices", id, "items")
        const snapshot = await getDocs(itemsRef)
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

        items.forEach((item: any) => {
          if (item.productId) {
            const productRef = doc(db, "products", item.productId)
            updateDocumentNonBlocking(productRef, {
              quantity: increment(item.quantity)
            })
          }
        })

        const docRef = doc(db, "invoices", id)
        deleteDocumentNonBlocking(docRef)
        
        toast({ 
          title: "تم الحذف والاسترجاع", 
          description: "تم حذف الفاتورة بنجاح وإعادة المنتجات للمخزون" 
        })
      } catch (error) {
        console.error("Error deleting invoice:", error)
        toast({ 
          variant: "destructive", 
          title: "خطأ في العملية", 
          description: "لم نتمكن من إتمام عملية الحذف، يرجى المحاولة لاحقاً" 
        })
      }
    }
  }

  const handleViewDetails = async (invoice: any) => {
    setSelectedInvoice(invoice)
    setIsLoadingItems(true)
    setInvoiceItems([])
    try {
      const itemsRef = collection(db, "invoices", invoice.id, "items")
      const snapshot = await getDocs(itemsRef)
      
      const itemsMap: Record<string, any> = {}
      // Legacy Fix: Use subtotal (total + discount) as a limit for validation
      const limit = (invoice.totalAmount || 0) + (invoice.discount || 0);
      let runningSubtotal = 0;

      snapshot.docs.forEach(d => {
        const item = d.data()
        const unitPrice = item.unitPrice || 0;
        const rawQty = item.quantity || 1;

        if (unitPrice <= 0) return;

        // Validation against Grand Total
        const remainingBalance = limit - runningSubtotal;
        const maxPossibleQty = Math.floor((remainingBalance + 0.1) / unitPrice);
        const correctedQty = Math.max(0, Math.min(rawQty, maxPossibleQty));
        const finalQty = (runningSubtotal === 0 && correctedQty === 0) ? 1 : correctedQty;

        if (finalQty <= 0 && runningSubtotal > 0) return;

        const key = `${item.productId}_${unitPrice}`
        if (itemsMap[key]) {
          itemsMap[key].quantity += finalQty
          itemsMap[key].itemTotal = itemsMap[key].quantity * unitPrice
        } else {
          itemsMap[key] = { 
            id: d.id, 
            ...item, 
            quantity: finalQty, 
            itemTotal: finalQty * unitPrice 
          }
        }
        runningSubtotal += (finalQty * unitPrice);
      })
      
      const items = Object.values(itemsMap)
      setInvoiceItems(items)
      return items;
    } catch (error) {
      console.error("Error fetching invoice items:", error)
      return [];
    } finally {
      setIsLoadingItems(false)
    }
  }

  const handlePrintInvoice = (invoice: any, items: any[]) => {
    const hasDiscount = (invoice.discount || 0) > 0;
    const invoiceDate = invoice.createdAt?.toDate ? invoice.createdAt.toDate() : (invoice.createdAt instanceof Date ? invoice.createdAt : new Date());

    const printContent = `
      <html dir="rtl">
        <head>
          <title>فاتورة - ${invoice.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&display=swap');
            body { font-family: 'Almarai', sans-serif; padding: 10mm; color: #000; background: #fff; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .header h1 { font-size: 24px; font-weight: 800; margin: 0; }
            .info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            th, td { border-bottom: 1px solid #000; padding: 8px; text-align: right; }
            th { background-color: #f0f0f0; }
            .summary { border-top: 2px solid #000; padding-top: 10px; font-size: 14px; }
            .summary-row { display: flex; justify-content: space-between; font-weight: 700; }
            .total { font-size: 18px; border-top: 1px solid #000; padding-top: 5px; font-weight: 800; }
            .qr-footer { display: flex; flex-direction: column; align-items: center; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>EXPRESS PHONE</h1>
            <p style="font-weight: 800;">فاتورة مبيعات</p>
          </div>
          <div class="info">
            <div>
              <strong>رقم الفاتورة:</strong> ${invoice.id}<br>
              <strong>التاريخ:</strong> ${format(invoiceDate, "yyyy/MM/dd", { locale: ar })}<br>
              <strong>الموظف:</strong> ${invoice.generatedByUserName || "غير معرف"}
            </div>
            <div style="text-align: left;">
              <strong>العميل:</strong> ${invoice.customerName}<br>
              <strong>الحالة:</strong> ${invoice.status === 'Paid' ? 'مدفوعة' : 'دين'}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th style="text-align: center">كمية</th>
                <th style="text-align: left">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item.productName}</td>
                  <td style="text-align: center">${item.quantity}</td>
                  <td style="text-align: left">${item.itemTotal.toLocaleString()} دج</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="summary">
             <div class="summary-row"><span>المجموع:</span> <span>${(invoice.totalAmount + (invoice.discount || 0)).toLocaleString()} دج</span></div>
             ${hasDiscount ? `<div class="summary-row"><span>الخصم:</span> <span>-${invoice.discount.toLocaleString()} دج</span></div>` : ''}
             <div class="summary-row"><span>المدفوع:</span> <span>${invoice.paidAmount.toLocaleString()} دج</span></div>
             <div class="summary-row total">الإجمالي النهائي: ${invoice.totalAmount.toLocaleString()} دج</div>
          </div>

          <div class="qr-footer">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${window.location.origin}/invoices/history#inv-${invoice.id}" width="120" />
            <p style="font-weight: 800; margin-top: 10px;">شكراً لتعاملكم معنا</p>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(printContent);
      iframeDoc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    }
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="h-3 w-3 text-primary" />;
    if (sortConfig.direction === 'desc') return <ArrowDown className="h-3 w-3 text-primary" />;
    return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  }

  return (
    <div className="min-h-screen bg-transparent">
        <header className="flex h-20 shrink-0 items-center justify-between border-b px-8 glass sticky top-0 z-50 no-print">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#3960AC] to-[#3CC2DD] flex items-center justify-center text-white shadow-lg transform -rotate-3">
                <Smartphone className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-tighter text-[#3960AC]">EXPRESS</span>
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Phone Pro</span>
              </div>
            </Link>
            <div className="h-8 w-px bg-black/5" />
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-gradient">سجل الفواتير والمبيعات</h1>
              <p className="text-[10px] text-muted-foreground font-bold italic uppercase tracking-widest">تتبع شامل لجميع العمليات التاريخية</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Button asChild variant="outline" className="h-11 px-6 rounded-2xl glass border-white/20 gap-2">
               <Link href="/invoices">
                 <ArrowRight className="h-4 w-4" />
                 العودة لنقطة البيع
               </Link>
             </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 space-y-8">
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="relative w-full md:w-[500px] group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="ابحث برقم الفاتورة، العميل، أو الموظف..." 
                className="pl-12 h-14 glass border-none shadow-sm rounded-2xl focus:ring-primary font-bold" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Card className="border-none glass shadow-2xl overflow-hidden rounded-[2.5rem] card-3d">
            <CardContent className="p-0">
              <div className="table-container">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-white/10 hover:bg-transparent">
                      <TableHead className="font-black text-center w-[80px]">كود QR</TableHead>
                      <TableHead className="font-black cursor-pointer select-none group text-center" onClick={() => handleSort('customerName')}>
                        <div className="flex items-center justify-center gap-2">العميل <SortIcon column="customerName" /></div>
                      </TableHead>
                      <TableHead className="font-black text-center">الموظف</TableHead>
                      <TableHead className="font-black cursor-pointer select-none group text-center" onClick={() => handleSort('createdAt')}>
                        <div className="flex items-center justify-center gap-2">التاريخ <SortIcon column="createdAt" /></div>
                      </TableHead>
                      <TableHead className="font-black cursor-pointer select-none group text-center" onClick={() => handleSort('totalAmount')}>
                        <div className="flex items-center justify-center gap-2"><SortIcon column="totalAmount" /> المبلغ الإجمالي</div>
                      </TableHead>
                      <TableHead className="font-black cursor-pointer select-none group text-center" onClick={() => handleSort('remainingDebt')}>
                        <div className="flex items-center justify-center gap-2">المتبقي (الدين) <SortIcon column="remainingDebt" /></div>
                      </TableHead>
                      <TableHead className="text-center font-black cursor-pointer select-none group" onClick={() => handleSort('status')}>
                        <div className="flex items-center justify-center gap-2 justify-center">الحالة <SortIcon column="status" /></div>
                      </TableHead>
                      <TableHead className="font-black cursor-pointer select-none group text-center" onClick={() => handleSort('id')}>
                        <div className="flex items-center justify-center gap-2">رقم الفاتورة <SortIcon column="id" /></div>
                      </TableHead>
                      <TableHead className="w-[180px] font-black text-center">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && sortedInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-20">
                          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary opacity-20" />
                          <p className="text-sm font-bold text-muted-foreground mt-4">جاري استرجاع السجلات...</p>
                        </TableCell>
                      </TableRow>
                    ) : sortedInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-20 text-muted-foreground font-bold italic opacity-30">
                          لا توجد فواتير مسجلة حالياً
                        </TableCell>
                      </TableRow>
                    ) : sortedInvoices.map((inv) => (
                      <TableRow 
                        key={inv.id} 
                        id={`inv-${inv.id}`}
                        className="border-b border-white/5 hover:bg-white/30 transition-all duration-300 group target:bg-primary/10 target:animate-pulse"
                      >
                        <TableCell className="text-center">
                          <div 
                            className="h-10 w-10 mx-auto bg-white p-1 rounded-lg shadow-sm border border-black/5 cursor-pointer hover:scale-110 transition-transform flex items-center justify-center relative group/qr-cell"
                            onClick={() => setZoomQR({ id: inv.id, code: inv.id })}
                          >
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${typeof window !== 'undefined' ? window.location.origin : ''}/invoices/history#inv-${inv.id}`} className="w-full h-full" alt="INV QR" />
                            <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover/qr-cell:opacity-100 transition-opacity">
                               <Maximize2 className="h-3 w-3 text-white" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                           <div className="flex items-center justify-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                 <User className="h-4 w-4 text-primary" />
                              </div>
                              <span className="font-bold">{inv.customerName}</span>
                           </div>
                        </TableCell>
                        <TableCell className="text-center">
                           <div className="flex flex-col items-center justify-center">
                              <span className="text-[10px] font-black text-muted-foreground/60 uppercase">بواسطة</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                 <UserCog className="h-3 w-3 text-muted-foreground" />
                                 <span className="text-[11px] font-black">{inv.generatedByUserName || "غير معرف"}</span>
                              </div>
                           </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-bold text-xs tabular-nums text-center">
                          {inv.createdAt?.toDate 
                            ? format(inv.createdAt.toDate(), "dd MMMM yyyy - HH:mm", { locale: ar }) 
                            : (inv.createdAt instanceof Date ? format(inv.createdAt, "dd MMMM yyyy - HH:mm", { locale: ar }) : "---")}
                        </TableCell>
                        <TableCell className="text-center font-black tabular-nums text-lg text-primary">
                          {inv.totalAmount.toLocaleString()} دج
                        </TableCell>
                        <TableCell className="text-center">
                          {inv.totalAmount - inv.paidAmount > 0 ? (
                            <span className="font-black text-red-600 tabular-nums">{(inv.totalAmount - inv.paidAmount).toLocaleString()} دج</span>
                          ) : (
                            <span className="font-bold text-emerald-600">مدفوعة</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {inv.totalAmount - inv.paidAmount > 0 ? (
                            <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-none px-4 rounded-lg">دين</Badge>
                          ) : (
                            <Badge variant="success" className="bg-emerald-500/10 text-emerald-600 border-none px-4 rounded-lg">كاملة</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-black tabular-nums text-primary text-center">#{inv.id.slice(0, 8)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2 opacity-100 md:opacity-40 group-hover:opacity-100 transition-opacity">
                             <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 rounded-xl bg-white/50 hover:bg-primary hover:text-white"
                              onClick={() => handleViewDetails(inv)}
                              title="عرض التفاصيل"
                             >
                               <Eye className="h-4 w-4" />
                             </Button>
                             <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 rounded-xl bg-white/50 hover:bg-accent hover:text-white"
                              onClick={() => handleViewDetails(inv).then((items) => handlePrintInvoice(inv, items))}
                              title="طباعة"
                             >
                               <Printer className="h-4 w-4" />
                             </Button>
                             <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 rounded-xl bg-white/50 hover:bg-orange-500 hover:text-white"
                              onClick={() => router.push(`/invoices?editId=${inv.id}`)}
                              title="تعديل الفاتورة في نقطة البيع"
                             >
                               <Edit3 className="h-4 w-4" />
                             </Button>
                             <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 rounded-xl bg-white/50 hover:bg-destructive hover:text-white"
                              onClick={() => handleDeleteInvoice(inv.id)}
                              title="حذف الفاتورة واسترجاع المخزون"
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
            <DialogContent dir="rtl" className="max-w-md glass border-none rounded-[2rem] shadow-2xl p-0 overflow-hidden z-[210] flex flex-col h-[90vh]">
               <DialogHeader className="p-4 bg-primary/5 border-b border-border shrink-0">
                  <DialogTitle className="text-xl font-black text-center text-primary">معاينة الفاتورة الأصلية</DialogTitle>
               </DialogHeader>

               <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 bg-black/5 custom-scrollbar">
                  <div className="flex flex-col items-center min-h-full py-4">
                    <div className="bg-white text-black w-full max-w-[290px] sm:max-w-[350px] shadow-2xl p-4 sm:p-6 md:p-8 rounded-sm space-y-4 sm:space-y-6 text-[11px] sm:text-[12px] border border-black/10 select-none mx-auto">
                       <div className="text-center space-y-1 border-b-2 border-black pb-4">
                          <h2 className="text-lg sm:text-2xl font-black leading-none">EXPRESS PHONE</h2>
                          <p className="text-[9px] sm:text-[10px] font-bold">خدمات تصليح وبيع الهواتف</p>
                          <p className="text-[9px] sm:text-[10px] tabular-nums">
                            {selectedInvoice?.createdAt?.toDate 
                              ? format(selectedInvoice.createdAt.toDate(), "yyyy/MM/dd HH:mm", { locale: ar }) 
                              : (selectedInvoice?.createdAt instanceof Date ? format(selectedInvoice.createdAt, "yyyy/MM/dd HH:mm", { locale: ar }) : "---")}
                          </p>
                       </div>

                       <div className="space-y-1">
                          <p className="font-bold">رقم الفاتورة: <span className="tabular-nums">#{selectedInvoice?.id}</span></p>
                          <p>العميل: {selectedInvoice?.customerName || "عميل عام"}</p>
                          <p>الموظف: {selectedInvoice?.generatedByUserName || "غير معرف"}</p>
                          <p>الحالة: {selectedInvoice?.status === 'Paid' ? 'مدفوعة' : 'دين متبقي'}</p>
                       </div>

                       <table className="w-full text-left">
                          <thead className="border-b border-black">
                            <tr>
                               <th className="py-2 text-right">المنتج</th>
                               <th className="py-2 text-center">كمية</th>
                               <th className="py-2 text-left">المجموع</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/10">
                            {isLoadingItems ? (
                              <tr><td colSpan={3} className="text-center py-4"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></td></tr>
                            ) : invoiceItems.map((item) => (
                              <tr key={item.id}>
                                 <td className="py-2 text-right font-bold break-words">{item.productName}</td>
                                 <td className="py-2 text-center tabular-nums">{item.quantity}</td>
                                 <td className="py-2 text-left tabular-nums">{item.itemTotal?.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                       </table>

                       <div className="space-y-1 border-t border-black pt-4">
                          <div className="flex justify-between">
                            <span>المجموع:</span> 
                            <span className="tabular-nums">{(selectedInvoice?.totalAmount + (selectedInvoice?.discount || 0)).toLocaleString()} دج</span>
                          </div>
                          {selectedInvoice?.discount > 0 && (
                            <div className="flex justify-between">
                              <span>الخصم:</span> 
                              <span className="tabular-nums">-{selectedInvoice.discount.toLocaleString()} دج</span>
                            </div>
                          )}
                          <div className="flex justify-between font-black text-sm sm:text-base border-t-2 border-double border-black pt-2">
                             <span>الإجمالي النهائي:</span> <span className="tabular-nums">{selectedInvoice?.totalAmount.toLocaleString()} دج</span>
                          </div>
                          <div className="flex justify-between text-[10px] sm:text-[11px]">
                            <span>المدفوع:</span> 
                            <span className="tabular-nums">{selectedInvoice?.paidAmount?.toLocaleString()} دج</span>
                          </div>
                          {(selectedInvoice?.totalAmount - selectedInvoice?.paidAmount) > 0 && (
                            <div className="flex justify-between text-red-600 font-bold">
                              <span>المتبقي (دين):</span> 
                              <span className="tabular-nums">{(selectedInvoice.totalAmount - selectedInvoice.paidAmount).toLocaleString()} دج</span>
                            </div>
                          )}
                       </div>

                       <div className="flex flex-col items-center pt-6 border-t border-dashed border-black/30">
                          <img 
                            className="w-20 h-20 sm:w-24 sm:h-24" 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${typeof window !== 'undefined' ? window.location.origin : ''}/invoices/history#inv-${selectedInvoice?.id}`} 
                            alt="QR" 
                          />
                          <p className="mt-4 font-black text-xs sm:text-sm">شكراً لتعاملكم معنا</p>
                       </div>
                    </div>
                  </div>
               </div>

               <div className="p-4 bg-white border-t border-border flex flex-col gap-2 shrink-0">
                  <Button 
                    className="w-full h-12 rounded-xl bg-primary text-white font-black shadow-lg flex gap-2" 
                    onClick={() => handlePrintInvoice(selectedInvoice, invoiceItems)}
                  >
                     <Printer className="h-5 w-5" /> إعادة طباعة الفاتورة
                  </Button>
                  <Button variant="outline" className="w-full h-11 rounded-xl font-bold border-white/20" onClick={() => setSelectedInvoice(null)}>إغلاق</Button>
               </div>
            </DialogContent>
          </Dialog>

          <Dialog open={!!zoomQR} onOpenChange={() => setZoomQR(null)}>
            <DialogContent dir="rtl" className="glass border-none rounded-[3rem] shadow-2xl p-0 overflow-hidden z-[400] max-w-sm">
               <DialogHeader className="p-6 bg-primary/5 border-b border-white/5">
                  <DialogTitle className="text-xl font-black text-center">كود QR للفاتورة</DialogTitle>
               </DialogHeader>
               <div className="p-10 flex flex-col items-center gap-6 bg-white">
                  <div className="p-4 bg-white rounded-3xl shadow-2xl border border-black/5">
                     <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${typeof window !== 'undefined' ? window.location.origin : ''}/invoices/history#inv-${zoomQR?.id}`} className="h-64 w-64" alt="Enlarged QR" />
                  </div>
                  <div className="flex flex-col items-center">
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">امسح الكود للانتقال لهذه الفاتورة في السجل</p>
                     <p className="text-lg font-mono font-black text-primary mt-2 text-center">#{zoomQR?.id.slice(0, 15)}</p>
                  </div>
               </div>
               <div className="p-6 bg-black/5 flex justify-center">
                  <Button onClick={() => setZoomQR(null)} className="rounded-2xl px-12 h-12 font-black shadow-lg">إغلاق</Button>
               </div>
            </DialogContent>
          </Dialog>

          <div className="flex justify-center text-muted-foreground/30 text-[10px] font-black italic gap-2 py-4">
            <span>EXPRESS PHONE PRO • SECURE AUDIT LOGS</span>
          </div>
        </main>
    </div>
  )
}
