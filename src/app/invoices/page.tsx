
"use client"

import * as React from "react"
import { 
  FileText, 
  Plus, 
  Search, 
  Printer, 
  Trash2,
  UserPlus,
  Package,
  Loader2,
  Smartphone,
  Wallet,
  CheckCircle2,
  Eye,
  X,
  ShoppingBag,
  Info,
  Camera
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
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
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, serverTimestamp, increment } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { QRScannerDialog } from "@/components/qr-scanner-dialog"

interface CartItem {
  id: string
  name: string
  price: number
  qty: number
  categoryPath?: string
}

export default function InvoicesPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const [cart, setCart] = React.useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = React.useState("")
  const [customerSearch, setCustomerSearch] = React.useState("")
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null)
  const [discount, setDiscount] = React.useState(0)
  const [paidAmount, setPaidAmount] = React.useState<number | "">("")
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [showPreview, setShowPreview] = React.useState(false)
  const [isQRScannerOpen, setIsQRScannerOpen] = React.useState(false)

  const productsRef = useMemoFirebase(() => collection(db, "products"), [db])
  const customersRef = useMemoFirebase(() => collection(db, "customers"), [db])
  const invoicesRef = useMemoFirebase(() => collection(db, "invoices"), [db])
  
  const { data: products } = useCollection(productsRef)
  const { data: customers } = useCollection(customersRef)

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
  const total = subtotal - discount
  const finalPaid = paidAmount === "" ? total : Number(paidAmount)
  const debtAmount = total - finalPaid

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.categoryPath && p.categoryPath.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 5) || []

  const addToCart = (product: any) => {
    if (product.quantity <= 0) {
      toast({ title: "خطأ", description: "هذا المنتج غير متوفر في المخزون", variant: "destructive" })
      return
    }
    const existing = cart.find(item => item.id === product.id)
    if (existing) {
      if (existing.qty >= product.quantity) {
        toast({ title: "تنبيه", description: "وصلت للكمية المتاحة في المخزون" })
        return
      }
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item))
    } else {
      setCart([...cart, { 
        id: product.id, 
        name: product.name, 
        price: product.salePrice, 
        qty: 1,
        categoryPath: product.categoryPath || product.categoryName 
      }])
    }
    setSearchTerm("")
    toast({ title: "تم الإضافة", description: `تمت إضافة ${product.name} للسلة` })
  }

  const handleQRScan = (code: string) => {
    const product = products?.find(p => p.productCode === code)
    if (product) {
      addToCart(product)
    } else {
      toast({ title: "منتج غير مسجل", description: `كود المنتج ${code} غير موجود`, variant: "destructive" })
    }
  }

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(item => item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item))
  }

  const updatePrice = (id: string, newPrice: number) => {
    setCart(cart.map(item => item.id === id ? { ...item, price: newPrice } : item))
  }

  const handlePrintInvoice = (invId: string, invoiceData: any, cartItems: CartItem[], customer: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const previousDebt = customer?.debt || 0;
    const currentTotalDebt = previousDebt + (invoiceData.totalAmount - invoiceData.paidAmount);

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>فاتورة - ${invId.slice(0, 8)}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&display=swap');
            body { font-family: 'Almarai', sans-serif; padding: 20px; color: #1a1a1a; line-height: 1.6; }
            .invoice-box { max-width: 800px; margin: auto; padding: 20px; border: 1px solid #eee; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3960AC; padding-bottom: 10px; margin-bottom: 20px; }
            .shop-info h1 { margin: 0; color: #3960AC; font-size: 24px; font-weight: 800; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            th { background: #f8f9fa; border: 1px solid #ddd; padding: 8px; text-align: right; }
            td { border: 1px solid #eee; padding: 8px; }
            .summary { margin-top: 20px; border-top: 2px solid #3960AC; padding-top: 10px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: 700; font-size: 14px; }
            .summary-row.total { font-size: 18px; color: #3960AC; border-top: 1px solid #eee; padding-top: 5px; }
            .debt-box { background: #fff5f5; border: 1px solid #feb2b2; padding: 10px; border-radius: 8px; margin-top: 10px; font-size: 12px; }
            .footer-msg { text-align: center; margin-top: 30px; font-weight: 800; color: #3960AC; }
            @media print { body { padding: 0; } .invoice-box { border: none; box-shadow: none; } }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="invoice-box">
            <div class="header">
              <div class="shop-info">
                <h1>EXPRESS PHONE</h1>
                <p>إدارة المبيعات والتصليح</p>
              </div>
              <div style="text-align: left; font-size: 12px;">
                <p><strong>رقم:</strong> #${invId.slice(0, 8)}</p>
                <p><strong>تاريخ:</strong> ${format(new Date(), "dd-MM-yyyy", { locale: ar })}</p>
              </div>
            </div>

            <div style="margin-bottom: 20px; font-size: 13px;">
              <p><strong>العميل:</strong> ${customer?.name || "عميل عام"}</p>
              <p><strong>الهاتف:</strong> ${customer?.phone || "---"}</p>
            </div>

            <table>
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th style="text-align: center">كمية</th>
                  <th style="text-align: center">سعر</th>
                  <th style="text-align: left">إجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${cartItems.map(item => `
                  <tr>
                    <td style="font-weight: 700">${item.name}</td>
                    <td style="text-align: center">${item.qty}</td>
                    <td style="text-align: center">${item.price.toLocaleString()}</td>
                    <td style="text-align: left">${(item.price * item.qty).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="summary">
              <div class="summary-row"><span>المجموع:</span> <span>${(invoiceData.totalAmount + (discount || 0)).toLocaleString()} دج</span></div>
              <div class="summary-row"><span>الخصم:</span> <span>-${(discount || 0).toLocaleString()} دج</span></div>
              <div class="summary-row" style="color: #2f855a"><span>المدفوع:</span> <span>${invoiceData.paidAmount.toLocaleString()} دج</span></div>
              <div class="summary-row total"><span>الإجمالي:</span> <span>${invoiceData.totalAmount.toLocaleString()} دج</span></div>
            </div>

            ${customer ? `
              <div class="debt-box">
                <div class="summary-row"><span>دين سابق:</span> <span>${previousDebt.toLocaleString()} دج</span></div>
                <div class="summary-row"><span>دين حالي:</span> <span>${(invoiceData.totalAmount - invoiceData.paidAmount).toLocaleString()} دج</span></div>
                <div class="summary-row" style="font-weight: 800; border-top: 1px solid #feb2b2; padding-top: 5px;">
                  <span>المتبقي الكلي:</span> <span>${currentTotalDebt.toLocaleString()} دج</span>
                </div>
              </div>
            ` : ''}

            <div class="footer-msg">شكراً لثقتكم بنا</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  const handleProcessInvoice = async () => {
    if (cart.length === 0) {
      toast({ title: "خطأ", description: "السلة فارغة", variant: "destructive" })
      return
    }

    if (debtAmount > 0 && !selectedCustomer) {
      toast({ title: "تنبيه", description: "يجب تحديد عميل لتسجيل الدين باسمه", variant: "destructive" })
      return
    }

    if (!user) return

    setIsProcessing(true)
    try {
      const invoiceData = {
        customerId: selectedCustomer?.id || "walk-in",
        customerName: selectedCustomer?.name || "عميل عام",
        invoiceDate: serverTimestamp(),
        totalAmount: total,
        paidAmount: finalPaid,
        status: debtAmount > 0 ? "Debt" : "Paid",
        generatedByUserId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      const invRef = await addDocumentNonBlocking(invoicesRef, invoiceData)
      
      if (invRef) {
        const itemsRef = collection(db, "invoices", invRef.id, "items")
        cart.forEach(item => {
          addDocumentNonBlocking(itemsRef, {
            invoiceId: invRef.id,
            productId: item.id,
            productName: item.name,
            categoryPath: item.categoryPath || "",
            quantity: item.qty,
            unitPrice: item.price,
            itemTotal: item.price * item.qty,
            generatedByUserId: user.uid,
            createdAt: serverTimestamp()
          })

          updateDocumentNonBlocking(doc(db, "products", item.id), {
            quantity: increment(-item.qty)
          })
        })

        if (debtAmount > 0 && selectedCustomer) {
          updateDocumentNonBlocking(doc(db, "customers", selectedCustomer.id), {
            debt: increment(debtAmount)
          })
        }

        toast({ title: "تم إصدار الفاتورة", description: `رقم الفاتورة: ${invRef.id.slice(0, 8)}` })
        handlePrintInvoice(invRef.id, invoiceData, cart, selectedCustomer)

        setCart([])
        setSelectedCustomer(null)
        setDiscount(0)
        setPaidAmount("")
        setShowPreview(false)
      }
    } catch (error) {
      toast({ title: "خطأ", description: "حدث خطأ أثناء معالجة الفاتورة", variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-transparent pb-32 overflow-x-hidden">
        <QRScannerDialog open={isQRScannerOpen} onOpenChange={setIsQRScannerOpen} onScan={handleQRScan} />
        
        <header className="flex h-20 shrink-0 items-center justify-between border-b px-4 md:px-8 glass sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm md:text-lg font-black tracking-tighter text-primary">EXPRESS POS</h1>
              <p className="text-[7px] md:text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Smart Point of Sale</p>
            </div>
          </div>
          <Button asChild variant="outline" className="h-10 px-4 rounded-xl glass border-white/20 gap-2 font-black text-xs">
             <Link href="/debts">
               <Wallet className="h-4 w-4" />
               <span className="hidden sm:inline">إدارة الديون</span>
             </Link>
          </Button>
        </header>

        <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-none glass shadow-xl rounded-[2rem]">
                <CardHeader className="p-6 md:p-8 border-b border-border">
                   <div className="flex items-center justify-between">
                     <CardTitle className="text-lg md:text-xl font-black">إضافة المنتجات</CardTitle>
                     <Button variant="ghost" size="sm" className="rounded-xl border border-primary/20 gap-2 font-black text-primary" onClick={() => setIsQRScannerOpen(true)}>
                        <Camera className="h-4 w-4" /> <span className="hidden sm:inline">مسح كود</span>
                     </Button>
                   </div>
                </CardHeader>
                <CardContent className="p-4 md:p-8 space-y-6">
                  <div className="relative">
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="ابحث عن منتج..." 
                        className="pl-12 h-12 glass border-none rounded-2xl font-bold text-sm" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    {searchTerm && (
                      <div className="absolute top-full left-0 right-0 mt-3 glass-premium rounded-3xl shadow-2xl z-20 overflow-hidden max-h-[300px] overflow-y-auto">
                        {filteredProducts.map(p => (
                          <div key={p.id} className="p-4 hover:bg-primary/5 cursor-pointer flex justify-between items-center border-b border-border transition-all" onClick={() => addToCart(p)}>
                            <div className="flex flex-col">
                               <p className="font-black text-sm text-foreground">{p.name}</p>
                               <p className="text-[10px] text-muted-foreground font-bold">{p.categoryPath}</p>
                            </div>
                            <div className="text-left">
                               <span className="text-sm font-black text-primary tabular-nums">{p.repairPrice.toLocaleString()} دج</span>
                               <p className="text-[8px] text-muted-foreground">متوفر: {p.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {cart.length === 0 ? (
                      <div className="text-center py-10 opacity-30 italic font-black text-xs">السلة فارغة</div>
                    ) : cart.map((item) => (
                      <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl glass border-border gap-4">
                        <div className="flex-1">
                          <p className="font-black text-sm text-foreground">{item.name}</p>
                          <div className="flex items-center gap-2 mt-2">
                             <span className="text-[10px] text-muted-foreground font-bold">السعر:</span>
                             <Input 
                               type="number" 
                               className="h-8 w-24 glass border-none font-black text-xs tabular-nums text-primary text-center" 
                               value={item.price} 
                               onChange={(e) => updatePrice(item.id, Number(e.target.value))} 
                             />
                          </div>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-6">
                           <div className="flex items-center gap-3 glass border-border rounded-xl px-3 py-1">
                             <button onClick={() => updateQty(item.id, -1)} className="text-primary font-black">-</button>
                             <span className="w-6 text-center font-black text-xs tabular-nums">{item.qty}</span>
                             <button onClick={() => updateQty(item.id, 1)} className="text-primary font-black">+</button>
                           </div>
                           <p className="font-black text-sm tabular-nums text-primary w-24 text-left">{(item.price * item.qty).toLocaleString()} دج</p>
                           <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => setCart(cart.filter(i => i.id !== item.id))}>
                             <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none glass shadow-xl rounded-[2rem]">
                <CardHeader className="p-6 md:p-8 border-b border-border">
                   <CardTitle className="text-lg md:text-xl font-black">العميل والمدفوعات</CardTitle>
                </CardHeader>
                <CardContent className="p-6 md:p-8 space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2 relative">
                        <Label className="text-[10px] font-black text-primary">العميل</Label>
                        <Input className="h-11 glass border-none rounded-xl font-bold" placeholder="بحث عن عميل..." value={selectedCustomer ? selectedCustomer.name : customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} disabled={!!selectedCustomer} />
                        {selectedCustomer && (
                          <Button variant="ghost" size="icon" className="absolute left-1 top-7 h-9 w-9" onClick={() => setSelectedCustomer(null)}><X className="h-4 w-4" /></Button>
                        )}
                        {customerSearch && !selectedCustomer && (
                          <div className="absolute top-full left-0 right-0 mt-2 glass border-border rounded-2xl shadow-xl z-20 overflow-hidden max-h-[200px] overflow-y-auto">
                            {customers?.filter(c => c.name.includes(customerSearch)).map(c => (
                              <div key={c.id} className="p-3 hover:bg-primary/5 cursor-pointer border-b border-border font-bold text-xs" onClick={() => { setSelectedCustomer(c); setCustomerSearch(""); }}>
                                {c.name} - {c.phone}
                              </div>
                            ))}
                          </div>
                        )}
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-primary">الخصم</Label>
                            <Input type="number" className="h-11 glass border-none rounded-xl font-black text-orange-600" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-emerald-500">المدفوع</Label>
                            <Input type="number" className="h-11 glass border-none rounded-xl font-black text-emerald-600" placeholder={total.toString()} value={paidAmount} onChange={(e) => setPaidAmount(e.target.value === "" ? "" : Number(e.target.value))} />
                        </div>
                     </div>
                   </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="border-none shadow-2xl sticky top-24 bg-gradient-to-br from-primary to-[#2a4580] text-white rounded-[2rem] md:rounded-[3rem] p-6 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xl font-black">ملخص الحساب</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between opacity-80"><span>المجموع:</span> <span className="tabular-nums">{subtotal.toLocaleString()} دج</span></div>
                    <div className="flex justify-between text-orange-200"><span>الخصم:</span> <span className="tabular-nums">-{discount.toLocaleString()} دج</span></div>
                    <div className="flex justify-between text-emerald-200"><span>المدفوع:</span> <span className="tabular-nums">{finalPaid.toLocaleString()} دج</span></div>
                    {debtAmount > 0 && (
                      <div className="flex justify-between text-red-200 font-black"><span>المتبقي (دين):</span> <span className="tabular-nums">{debtAmount.toLocaleString()} دج</span></div>
                    )}
                  </div>
                  <Separator className="bg-white/10" />
                  <div className="pt-2">
                    <span className="text-[10px] font-black opacity-60 uppercase">الإجمالي النهائي</span>
                    <p className="text-3xl font-black tabular-nums">{total.toLocaleString()} دج</p>
                  </div>
                  <Button 
                    className="w-full bg-white text-primary font-black hover:bg-white/90 h-14 rounded-2xl text-lg shadow-xl" 
                    onClick={() => cart.length > 0 && setShowPreview(true)} 
                    disabled={cart.length === 0}
                  >
                    معاينة الفاتورة
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </main>

        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent dir="rtl" className="max-w-2xl glass border-none rounded-[2rem] md:rounded-[3rem] shadow-2xl p-0 overflow-hidden z-[210]">
             <div className="p-6 md:p-8 bg-primary/5 border-b border-border flex justify-between items-center">
                <DialogTitle className="text-xl font-black">معاينة الفاتورة</DialogTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)}><X className="h-4 w-4" /></Button>
             </div>

             <div className="p-6 md:p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="bg-white text-black p-6 md:p-8 rounded-xl border border-black/10 space-y-6 text-sm">
                   <div className="flex justify-between border-b-2 border-primary pb-4">
                      <h2 className="text-xl font-black text-primary">EXPRESS PHONE</h2>
                      <p className="text-xs font-bold">{format(new Date(), "dd MMMM yyyy", { locale: ar })}</p>
                   </div>
                   <div>
                     <p className="font-black">العميل: {selectedCustomer ? selectedCustomer.name : "عميل عام"}</p>
                     <p className="text-xs opacity-70">الهاتف: {selectedCustomer?.phone || "---"}</p>
                   </div>
                   <div className="table-container">
                    <Table>
                        <TableHeader>
                          <TableRow className="border-b-2 border-black/10">
                            <TableHead className="font-black text-black">المنتج</TableHead>
                            <TableHead className="text-center font-black text-black">الكمية</TableHead>
                            <TableHead className="text-left font-black text-black">الإجمالي</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cart.map((item) => (
                            <TableRow key={item.id} className="border-b border-black/5">
                              <TableCell className="font-bold py-3">{item.name}</TableCell>
                              <TableCell className="text-center font-bold">{item.qty}</TableCell>
                              <TableCell className="text-left font-black">{(item.price * item.qty).toLocaleString()} دج</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                    </Table>
                   </div>
                   <div className="pt-4 space-y-2 border-t border-black/10">
                      <div className="flex justify-between font-bold"><span>المجموع:</span> <span>{total.toLocaleString()} دج</span></div>
                      <div className="flex justify-between text-emerald-600"><span>المدفوع:</span> <span>{finalPaid.toLocaleString()} دج</span></div>
                      {debtAmount > 0 && <div className="flex justify-between text-red-600 font-black"><span>الدين:</span> <span>{debtAmount.toLocaleString()} دج</span></div>}
                   </div>
                   {selectedCustomer && (
                     <div className="p-3 bg-red-50 rounded-lg text-xs font-black text-red-800">
                        إجمالي الحساب الجديد: {((selectedCustomer.debt || 0) + debtAmount).toLocaleString()} دج
                     </div>
                   )}
                   <p className="text-center pt-6 font-black text-primary">شكراً لثقتكم بنا</p>
                </div>
             </div>

             <DialogFooter className="p-6 md:p-8 bg-black/5 flex flex-col md:flex-row gap-3">
                <Button variant="outline" className="h-12 rounded-xl font-black md:flex-1" onClick={() => setShowPreview(false)}>تعديل</Button>
                <Button className="h-12 rounded-xl bg-primary text-white font-black md:flex-1 shadow-lg" onClick={handleProcessInvoice} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />} تأكيد وإصدار
                </Button>
             </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}
