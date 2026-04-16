
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
  ChevronLeft
} from "lucide-react"
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
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
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, getDocs } from "firebase/firestore"
import Link from "next/link"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

export default function InvoiceHistoryPage() {
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedInvoice, setSelectedInvoice] = React.useState<any>(null)
  const [invoiceItems, setInvoiceItems] = React.useState<any[]>([])
  const [isLoadingItems, setIsLoadingItems] = React.useState(false)

  const invoicesRef = useMemoFirebase(() => query(collection(db, "invoices"), orderBy("createdAt", "desc")), [db])
  const { data: invoices, isLoading } = useCollection(invoicesRef)

  const filteredInvoices = invoices?.filter(inv => 
    inv.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    inv.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const handleViewDetails = async (invoice: any) => {
    setSelectedInvoice(invoice)
    setIsLoadingItems(true)
    try {
      const itemsRef = collection(db, "invoices", invoice.id, "items")
      const snapshot = await getDocs(itemsRef)
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setInvoiceItems(items)
    } catch (error) {
      console.error("Error fetching invoice items:", error)
    } finally {
      setIsLoadingItems(false)
    }
  }

  const handlePrintInvoice = (invoice: any, items: any[]) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>فاتورة - ${invoice.id.slice(0, 8)}</title>
            <style>
              body { font-family: 'Almarai', sans-serif; padding: 40px; }
              .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #3960AC; padding-bottom: 20px; }
              .info { display: flex; justify-content: space-between; margin-bottom: 30px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th, td { border: 1px solid #eee; padding: 12px; text-align: right; }
              th { bg-color: #f8f9fa; }
              .total { text-align: left; font-size: 20px; font-weight: bold; color: #3960AC; }
              .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 20px; }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <div class="header">
              <h1>EXPRESS PHONE PRO</h1>
              <p>نظام إدارة المبيعات الذكي</p>
            </div>
            <div class="info">
              <div>
                <strong>رقم الفاتورة:</strong> ${invoice.id.slice(0, 8)}<br>
                <strong>التاريخ:</strong> ${invoice.createdAt?.toDate ? format(invoice.createdAt.toDate(), "yyyy-MM-dd HH:mm") : "---"}
              </div>
              <div>
                <strong>العميل:</strong> ${invoice.customerName}<br>
                <strong>الحالة:</strong> مدفوعة
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>الكمية</th>
                  <th>سعر الوحدة</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr>
                    <td>${item.productName}</td>
                    <td>${item.quantity}</td>
                    <td>${item.unitPrice.toLocaleString()} دج</td>
                    <td>${item.itemTotal.toLocaleString()} دج</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="total">
              الإجمالي النهائي: ${invoice.totalAmount.toLocaleString()} دج
            </div>
            <div class="footer">
              تم إصدار هذه الفاتورة بواسطة نظام Express Phone Pro الذكي<br>
              شكراً لتعاملكم معنا
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="bg-transparent">
        <header className="flex h-20 shrink-0 items-center justify-between border-b px-8 glass sticky top-0 z-50 no-print">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-1" />
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
                placeholder="ابحث برقم الفاتورة أو اسم العميل..." 
                className="pl-12 h-14 glass border-none shadow-sm rounded-2xl focus:ring-primary font-bold" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Card className="border-none glass shadow-2xl overflow-hidden rounded-[2.5rem] card-3d">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/10 hover:bg-transparent">
                    <TableHead className="font-black">رقم الفاتورة</TableHead>
                    <TableHead className="font-black">العميل</TableHead>
                    <TableHead className="font-black">التاريخ</TableHead>
                    <TableHead className="text-left font-black">المبلغ الإجمالي</TableHead>
                    <TableHead className="text-center font-black">الحالة</TableHead>
                    <TableHead className="w-[120px] font-black text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary opacity-20" />
                        <p className="text-sm font-bold text-muted-foreground mt-4">جاري استرجاع السجلات...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20 text-muted-foreground font-bold italic opacity-30">
                        لا توجد فواتير مسجلة حالياً
                      </TableCell>
                    </TableRow>
                  ) : filteredInvoices.map((inv) => (
                    <TableRow key={inv.id} className="border-b border-white/5 hover:bg-white/30 transition-all duration-300 group">
                      <TableCell className="font-black tabular-nums text-primary">#{inv.id.slice(0, 8)}</TableCell>
                      <TableCell>
                         <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                               <User className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-bold">{inv.customerName}</span>
                         </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-bold text-xs tabular-nums">
                        {inv.createdAt?.toDate ? format(inv.createdAt.toDate(), "dd MMMM yyyy - HH:mm", { locale: ar }) : "---"}
                      </TableCell>
                      <TableCell className="text-left font-black tabular-nums text-lg text-primary">
                        {inv.totalAmount.toLocaleString()} دج
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="success" className="bg-emerald-500/10 text-emerald-600 border-none px-4 rounded-lg">ناجحة</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl bg-white/50 hover:bg-primary hover:text-white"
                            onClick={() => handleViewDetails(inv)}
                           >
                             <Eye className="h-4 w-4" />
                           </Button>
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl bg-white/50 hover:bg-accent hover:text-white"
                            onClick={() => handleViewDetails(inv).then(() => handlePrintInvoice(inv, invoiceItems))}
                           >
                             <Printer className="h-4 w-4" />
                           </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Invoice Details Dialog */}
          <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
            <DialogContent dir="rtl" className="sm:max-w-[600px] glass border-none shadow-2xl rounded-[2.5rem]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black flex items-center gap-3">
                   <FileText className="h-6 w-6 text-primary" />
                   تفاصيل الفاتورة #{selectedInvoice?.id.slice(0, 8)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                 <div className="grid grid-cols-2 gap-4 glass p-4 rounded-2xl border-white/20">
                    <div>
                       <p className="text-[10px] font-black text-muted-foreground uppercase">العميل</p>
                       <p className="font-bold">{selectedInvoice?.customerName}</p>
                    </div>
                    <div className="text-left">
                       <p className="text-[10px] font-black text-muted-foreground uppercase">التاريخ</p>
                       <p className="font-bold text-xs">
                        {selectedInvoice?.createdAt?.toDate ? format(selectedInvoice.createdAt.toDate(), "yyyy-MM-dd HH:mm") : "---"}
                       </p>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <p className="font-black text-sm px-2">المنتجات المباعة</p>
                    <div className="max-h-[300px] overflow-auto space-y-2 pr-2">
                       {isLoadingItems ? (
                         <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
                       ) : invoiceItems.map((item) => (
                         <div key={item.id} className="flex items-center justify-between p-3 glass rounded-xl border-white/10">
                            <div className="flex items-center gap-3">
                               <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center">
                                  <ShoppingBag className="h-4 w-4 text-primary" />
                               </div>
                               <div>
                                  <p className="text-xs font-bold">{item.productName}</p>
                                  <p className="text-[10px] text-muted-foreground font-bold tabular-nums">
                                    {item.quantity} x {item.unitPrice.toLocaleString()} دج
                                  </p>
                               </div>
                            </div>
                            <p className="font-black text-sm tabular-nums">{item.itemTotal.toLocaleString()} دج</p>
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="pt-4 border-t border-white/10 flex justify-between items-center px-2">
                    <span className="text-lg font-black">الإجمالي النهائي:</span>
                    <span className="text-2xl font-black text-primary tabular-nums">{selectedInvoice?.totalAmount.toLocaleString()} دج</span>
                 </div>
              </div>
              <div className="flex gap-3 mt-4">
                 <Button 
                  className="flex-1 h-12 rounded-2xl bg-primary text-white font-black"
                  onClick={() => handlePrintInvoice(selectedInvoice, invoiceItems)}
                 >
                   إعادة طباعة الفاتورة
                 </Button>
                 <Button 
                  variant="outline" 
                  className="flex-1 h-12 rounded-2xl glass border-white/20 font-black"
                  onClick={() => setSelectedInvoice(null)}
                 >
                   إغلاق
                 </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex justify-center text-muted-foreground/30 text-[10px] font-black italic gap-2 py-4">
            <span>EXPRESS PHONE PRO • SECURE AUDIT LOGS</span>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
