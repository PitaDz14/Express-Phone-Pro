
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
  CheckCircle2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, serverTimestamp, increment } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

interface CartItem {
  id: string
  name: string
  price: number
  qty: number
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
    p.productCode.toLowerCase().includes(searchTerm.toLowerCase())
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
      setCart([...cart, { id: product.id, name: product.name, price: product.salePrice, qty: 1 }])
    }
    setSearchTerm("")
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
            .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, .15); }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #3960AC; padding-bottom: 20px; margin-bottom: 20px; }
            .shop-info h1 { margin: 0; color: #3960AC; font-size: 28px; font-weight: 800; }
            .details { display: grid; grid-cols: 2; gap: 20px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #f8f9fa; border: 1px solid #ddd; padding: 12px; text-align: right; font-weight: 800; }
            td { border: 1px solid #eee; padding: 12px; }
            .summary { margin-top: 30px; border-top: 2px solid #3960AC; padding-top: 20px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: 700; }
            .summary-row.total { font-size: 20px; color: #3960AC; border-top: 1px solid #eee; padding-top: 10px; margin-top: 10px; }
            .debt-box { background: #fff5f5; border: 1px solid #feb2b2; padding: 15px; border-radius: 8px; margin-top: 20px; }
            .footer-msg { text-align: center; margin-top: 50px; font-weight: 800; color: #3960AC; font-size: 18px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="invoice-box">
            <div class="header">
              <div class="shop-info">
                <h1>EXPRESS PHONE</h1>
                <p>إدارة المبيعات والتصليح الاحترافية</p>
              </div>
              <div style="text-align: left">
                <p><strong>رقم الفاتورة:</strong> #${invId.slice(0, 8)}</p>
                <p><strong>التاريخ:</strong> ${format(new Date(), "dd MMMM yyyy HH:mm", { locale: ar })}</p>
              </div>
            </div>

            <div class="details">
              <div>
                <p><strong>العميل:</strong> ${customer?.name || "عميل نقدي عام"}</p>
                <p><strong>الهاتف:</strong> ${customer?.phone || "---"}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th style="text-align: center">الكمية</th>
                  <th style="text-align: center">سعر الوحدة</th>
                  <th style="text-align: left">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${cartItems.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td style="text-align: center">${item.qty}</td>
                    <td style="text-align: center">${item.price.toLocaleString()} دج</td>
                    <td style="text-align: left">${(item.price * item.qty).toLocaleString()} دج</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="summary">
              <div class="summary-row"><span>المجموع الفرعي:</span> <span>${(invoiceData.totalAmount + (discount || 0)).toLocaleString()} دج</span></div>
              <div class="summary-row" style="color: #c53030"><span>الخصم:</span> <span>-${(discount || 0).toLocaleString()} دج</span></div>
              <div class="summary-row" style="color: #2f855a"><span>المبلغ المدفوع:</span> <span>${invoiceData.paidAmount.toLocaleString()} دج</span></div>
              <div class="summary-row total"><span>الإجمالي النهائي:</span> <span>${invoiceData.totalAmount.toLocaleString()} دج</span></div>
            </div>

            ${customer ? `
              <div class="debt-box">
                <div class="summary-row"><span>الدين السابق:</span> <span>${previousDebt.toLocaleString()} دج</span></div>
                <div class="summary-row"><span>دين هذه الفاتورة:</span> <span>${(invoiceData.totalAmount - invoiceData.paidAmount).toLocaleString()} دج</span></div>
                <div class="summary-row" style="font-weight: 800; font-size: 16px; margin-top: 5px; border-top: 1px solid #feb2b2; padding-top: 5px;">
                  <span>إجمالي الحساب المتبقي:</span> <span>${currentTotalDebt.toLocaleString()} دج</span>
                </div>
              </div>
            ` : ''}

            <div class="footer-msg">
              شكراً لثقتكم بنا
            </div>
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
        
        // Print action
        handlePrintInvoice(invRef.id, invoiceData, cart, selectedCustomer)

        setCart([])
        setSelectedCustomer(null)
        setDiscount(0)
        setPaidAmount("")
      }
    } catch (error) {
      toast({ title: "خطأ", description: "حدث خطأ أثناء معالجة الفاتورة", variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-transparent">
        <header className="flex h-20 shrink-0 items-center justify-between border-b px-8 glass sticky top-0 z-50 no-print">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg transform -rotate-3">
                <Smartphone className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-tighter text-primary">EXPRESS</span>
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Phone Pro</span>
              </div>
            </div>
            <div className="h-8 w-px bg-border mx-2" />
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-gradient-premium">نظام المبيعات الذكي (POS)</h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">معالجة فورية وتلقائية للمخزون</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Button asChild variant="outline" className="h-11 px-6 rounded-2xl glass border-white/20 gap-2 font-black">
               <Link href="/debts">
                 <Wallet className="h-4 w-4" />
                 إدارة الديون
               </Link>
             </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="border-none glass shadow-xl rounded-[2.5rem]">
                <CardHeader className="border-b border-border p-8">
                   <CardTitle className="text-xl font-black text-foreground">إضافة منتجات للفاتورة</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="relative">
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input 
                        placeholder="ابحث عن منتج بالاسم أو الكود..." 
                        className="pl-12 h-14 glass border-none shadow-inner rounded-2xl font-bold text-foreground" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    {searchTerm && (
                      <div className="absolute top-full left-0 right-0 mt-3 glass border-border rounded-3xl shadow-2xl z-20 overflow-hidden">
                        {filteredProducts.map(p => (
                          <div key={p.id} className="p-4 hover:bg-muted cursor-pointer flex justify-between items-center border-b border-border transition-colors" onClick={() => addToCart(p)}>
                            <div className="flex items-center gap-3">
                               <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                  <Package className="h-5 w-5" />
                               </div>
                               <div>
                                  <p className="font-black text-sm text-foreground">{p.name}</p>
                                  <p className="text-[10px] text-muted-foreground font-bold">#{p.productCode} • متاح: {p.quantity}</p>
                               </div>
                            </div>
                            <p className="font-black text-primary tabular-nums">{p.salePrice.toLocaleString()} دج</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4 mt-6">
                    {cart.length === 0 ? (
                      <div className="text-center py-20 glass border-2 border-dashed border-border rounded-[2rem]">
                        <Package className="h-16 w-16 mx-auto text-muted-foreground/20" />
                        <p className="text-sm font-black text-muted-foreground/40 mt-4 italic">السلة فارغة، ابدأ بإضافة منتجات</p>
                      </div>
                    ) : cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl glass border-border group animate-in slide-in-from-right-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                             <Package className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-black text-sm text-foreground">{item.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                               <span className="text-[10px] text-muted-foreground font-bold whitespace-nowrap">سعر الوحدة:</span>
                               <Input 
                                 type="number" 
                                 className="h-8 w-28 glass border-none font-black text-sm tabular-nums p-1 text-primary focus:ring-1 focus:ring-primary text-center" 
                                 value={item.price} 
                                 onChange={(e) => updatePrice(item.id, Number(e.target.value))} 
                               />
                               <span className="text-[10px] text-muted-foreground font-bold">دج</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="flex items-center gap-4 glass border-border rounded-xl px-4 py-2">
                             <button onClick={() => updateQty(item.id, -1)} className="text-muted-foreground hover:text-primary font-black text-lg">-</button>
                             <span className="w-8 text-center font-black text-sm tabular-nums text-foreground">{item.qty}</span>
                             <button onClick={() => updateQty(item.id, 1)} className="text-muted-foreground hover:text-primary font-black text-lg">+</button>
                           </div>
                           <p className="font-black text-lg tabular-nums w-32 text-left text-primary">{(item.price * item.qty).toLocaleString()} دج</p>
                           <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white" onClick={() => setCart(cart.filter(i => i.id !== item.id))}>
                             <Trash2 className="h-5 w-5" />
                           </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none glass shadow-xl rounded-[2.5rem]">
                <CardHeader className="border-b border-border p-8">
                   <CardTitle className="text-xl font-black text-foreground">معلومات العميل والمدفوعات</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-3 relative">
                        <Label className="font-black text-primary px-1 uppercase tracking-widest text-[10px]">اختيار العميل (إلزامي للديون)</Label>
                        <div className="flex gap-3">
                           <Input className="h-12 glass border-none rounded-xl font-bold text-foreground" placeholder="ابحث عن عميل..." value={selectedCustomer ? selectedCustomer.name : customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} disabled={!!selectedCustomer} />
                           {selectedCustomer ? (
                             <Button variant="outline" className="h-12 rounded-xl glass border-border" onClick={() => setSelectedCustomer(null)}>تغيير</Button>
                           ) : (
                             <Button variant="outline" size="icon" className="h-12 w-12 glass border-border rounded-xl"><UserPlus className="h-5 w-5" /></Button>
                           )}
                        </div>
                        {customerSearch && !selectedCustomer && (
                          <div className="absolute top-full left-0 right-0 mt-2 glass border-border rounded-2xl shadow-xl z-20 overflow-hidden">
                            {customers?.filter(c => c.name.includes(customerSearch)).map(c => (
                              <div key={c.id} className="p-3 hover:bg-muted cursor-pointer border-b border-border font-bold text-sm text-foreground" onClick={() => { setSelectedCustomer(c); setCustomerSearch(""); }}>
                                {c.name} - <span className="text-xs text-muted-foreground">{c.phone}</span>
                              </div>
                            ))}
                          </div>
                        )}
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <Label className="font-black text-primary px-1 uppercase tracking-widest text-[10px]">الخصم (دج)</Label>
                            <Input type="number" className="h-12 glass border-none rounded-xl font-black text-orange-600 tabular-nums" placeholder="0" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
                        </div>
                        <div className="space-y-3">
                            <Label className="font-black text-emerald-500 px-1 uppercase tracking-widest text-[10px]">المبلغ المدفوع (دج)</Label>
                            <Input type="number" className="h-12 glass border-none rounded-xl font-black text-emerald-600 tabular-nums" placeholder={total.toString()} value={paidAmount} onChange={(e) => setPaidAmount(e.target.value === "" ? "" : Number(e.target.value))} />
                        </div>
                     </div>
                   </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="border-none shadow-2xl sticky top-28 bg-gradient-to-br from-primary to-[#2a4580] text-white rounded-[3rem] p-4 overflow-hidden">
                <CardHeader className="p-8">
                  <CardTitle className="text-2xl font-black">ملخص الفاتورة</CardTitle>
                  <p className="text-xs font-bold text-white/60 uppercase tracking-widest">تحقق من البيانات المالية</p>
                </CardHeader>
                <CardContent className="px-8 space-y-6">
                  <div className="flex justify-between items-center opacity-80">
                    <span className="font-bold">المجموع:</span>
                    <span className="font-black tabular-nums">{subtotal.toLocaleString()} دج</span>
                  </div>
                  <div className="flex justify-between items-center text-orange-200">
                    <span className="font-bold">الخصم:</span>
                    <span className="font-black tabular-nums">-{discount.toLocaleString()} دج</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-200">
                    <span className="font-bold">المدفوع حالياً:</span>
                    <span className="font-black tabular-nums">{finalPaid.toLocaleString()} دج</span>
                  </div>
                  {debtAmount > 0 && (
                    <div className="flex justify-between items-center text-red-200 animate-pulse">
                      <span className="font-bold">متبقي (دين):</span>
                      <span className="font-black tabular-nums">{debtAmount.toLocaleString()} دج</span>
                    </div>
                  )}
                  <Separator className="bg-white/10" />
                  <div className="flex flex-col gap-2 py-4">
                    <span className="text-sm font-black text-white/60 uppercase">الإجمالي النهائي</span>
                    <span className="text-4xl font-black tabular-nums tracking-tighter">{total.toLocaleString()} <span className="text-lg opacity-40">دج</span></span>
                  </div>
                  <Button className="w-full bg-white text-primary font-black hover:bg-white/90 gap-3 h-16 rounded-[1.8rem] text-lg shadow-xl" onClick={handleProcessInvoice} disabled={isProcessing || cart.length === 0}>
                    {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Printer className="h-6 w-6" />} تأكيد وطباعة
                  </Button>
                </CardContent>
                <CardFooter className="flex-col gap-4 p-8 text-center bg-black/10">
                   <div className="glass bg-white/5 border-none px-6 py-3 rounded-2xl w-full">
                      <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">العميل الحالي</p>
                      <p className="text-sm font-black">{selectedCustomer ? selectedCustomer.name : "عميل نقدي عام"}</p>
                   </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        </main>
    </div>
  )
}
