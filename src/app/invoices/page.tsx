
"use client"

import * as React from "react"
import { 
  FileText, 
  Plus, 
  Search, 
  Printer, 
  Download,
  Trash2,
  Scan,
  UserPlus,
  Package,
  Loader2,
  History
} from "lucide-react"
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
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
  const [isProcessing, setIsProcessing] = React.useState(false)

  const productsRef = useMemoFirebase(() => collection(db, "products"), [db])
  const customersRef = useMemoFirebase(() => collection(db, "customers"), [db])
  const invoicesRef = useMemoFirebase(() => collection(db, "invoices"), [db])
  
  const { data: products } = useCollection(productsRef)
  const { data: customers } = useCollection(customersRef)

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

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id))
  }

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta)
        return { ...item, qty: newQty }
      }
      return item
    }))
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
  const total = subtotal - discount

  const handleProcessInvoice = async () => {
    if (cart.length === 0) {
      toast({ title: "خطأ", description: "السلة فارغة", variant: "destructive" })
      return
    }

    if (!user) {
      toast({ title: "خطأ", description: "يجب تسجيل الدخول لإصدار فاتورة", variant: "destructive" })
      return
    }

    setIsProcessing(true)
    try {
      const invoiceData = {
        customerId: selectedCustomer?.id || "walk-in",
        customerName: selectedCustomer?.name || "عميل عام",
        invoiceDate: serverTimestamp(),
        totalAmount: total,
        paidAmount: total,
        status: "Paid",
        generatedByUserId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      const invPromise = addDocumentNonBlocking(invoicesRef, invoiceData)
      const invRef = await invPromise
      
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
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })

          const prodRef = doc(db, "products", item.id)
          updateDocumentNonBlocking(prodRef, {
            quantity: increment(-item.qty)
          })
        })

        toast({ title: "تم إصدار الفاتورة", description: `رقم الفاتورة: ${invRef.id.slice(0, 8)}` })
        setCart([])
        setSelectedCustomer(null)
        setDiscount(0)
      }
    } catch (error) {
      console.error(error)
      toast({ title: "خطأ", description: "حدث خطأ أثناء معالجة الفاتورة", variant: "destructive" })
    } finally {
      setIsProcessing(false)
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
              <h1 className="text-xl font-black text-gradient">نظام المبيعات الذكي (POS)</h1>
              <p className="text-[10px] text-muted-foreground font-bold">معالجة فورية وتلقائية للمخزون</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Button asChild variant="outline" className="h-11 px-6 rounded-2xl glass border-white/20 gap-2 font-black">
               <Link href="/invoices/history">
                 <History className="h-4 w-4" />
                 سجل الفواتير
               </Link>
             </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-2 space-y-8">
              <Card className="border-none glass shadow-xl rounded-[2.5rem] card-3d">
                <CardHeader className="border-b border-white/10 p-8">
                   <CardTitle className="text-xl font-black">إضافة منتجات للفاتورة</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="relative">
                    <div className="flex gap-4">
                      <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                          placeholder="ابحث عن منتج بالاسم أو الكود..." 
                          className="pl-12 h-14 glass border-none shadow-sm rounded-2xl font-bold" 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <Button variant="outline" size="icon" className="h-14 w-14 glass border-white/20 rounded-2xl">
                        <Scan className="h-6 w-6" />
                      </Button>
                    </div>
                    
                    {searchTerm && (
                      <div className="absolute top-full left-0 right-0 mt-3 glass border-white/20 rounded-3xl shadow-2xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {filteredProducts.map(p => (
                          <div 
                            key={p.id} 
                            className="p-4 hover:bg-white/40 cursor-pointer flex justify-between items-center border-b border-white/5 last:border-0 transition-colors"
                            onClick={() => addToCart(p)}
                          >
                            <div className="flex items-center gap-3">
                               <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                  <Package className="h-5 w-5" />
                               </div>
                               <div>
                                  <p className="font-black text-sm">{p.name}</p>
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
                      <div className="text-center py-20 glass border-2 border-dashed border-white/20 rounded-[2rem]">
                        <Package className="h-16 w-16 mx-auto text-muted-foreground/20" />
                        <p className="text-sm font-black text-muted-foreground/40 mt-4">السلة فارغة، ابدأ بإضافة منتجات</p>
                      </div>
                    ) : cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl glass border-white/10 group animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                             <Package className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-black text-sm">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground font-bold tabular-nums">{item.price.toLocaleString()} دج للقطعة</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="flex items-center gap-4 glass border-white/20 rounded-xl px-4 py-2">
                             <button onClick={() => updateQty(item.id, -1)} className="text-muted-foreground hover:text-primary font-black text-lg">-</button>
                             <span className="w-8 text-center font-black text-sm tabular-nums">{item.qty}</span>
                             <button onClick={() => updateQty(item.id, 1)} className="text-muted-foreground hover:text-primary font-black text-lg">+</button>
                           </div>
                           <p className="font-black text-lg tabular-nums w-32 text-left text-gradient">{(item.price * item.qty).toLocaleString()} دج</p>
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all"
                            onClick={() => removeFromCart(item.id)}
                           >
                             <Trash2 className="h-5 w-5" />
                           </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none glass shadow-xl rounded-[2.5rem] card-3d">
                <CardHeader className="border-b border-white/10 p-8">
                   <CardTitle className="text-xl font-black">معلومات العميل والخصم</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-3 relative">
                        <Label className="font-black text-primary px-1 uppercase tracking-widest text-[10px]">اختيار عميل</Label>
                        <div className="flex gap-3">
                           <Input 
                            className="h-12 glass border-none shadow-sm rounded-xl font-bold" 
                            placeholder="ابحث عن عميل بالاسم..." 
                            value={selectedCustomer ? selectedCustomer.name : customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            disabled={!!selectedCustomer}
                           />
                           {selectedCustomer ? (
                             <Button variant="outline" className="h-12 rounded-xl glass border-white/20" onClick={() => setSelectedCustomer(null)}>تغيير</Button>
                           ) : (
                             <Button variant="outline" size="icon" className="h-12 w-12 glass border-white/20 rounded-xl"><UserPlus className="h-5 w-5" /></Button>
                           )}
                        </div>
                        {customerSearch && !selectedCustomer && (
                          <div className="absolute top-full left-0 right-0 mt-2 glass border-white/20 rounded-2xl shadow-xl z-20 overflow-hidden">
                            {customers?.filter(c => c.name.includes(customerSearch)).map(c => (
                              <div 
                                key={c.id} 
                                className="p-3 hover:bg-white/40 cursor-pointer border-b border-white/5 last:border-0 font-bold text-sm"
                                onClick={() => { setSelectedCustomer(c); setCustomerSearch(""); }}
                              >
                                {c.name} - <span className="text-xs text-muted-foreground">{c.phone}</span>
                              </div>
                            ))}
                          </div>
                        )}
                     </div>
                     <div className="space-y-3">
                        <Label className="font-black text-primary px-1 uppercase tracking-widest text-[10px]">تطبيق خصم مباشر (دج)</Label>
                        <Input 
                          type="number" 
                          className="h-12 glass border-none shadow-sm rounded-xl font-black text-orange-600 tabular-nums" 
                          placeholder="0" 
                          value={discount}
                          onChange={(e) => setDiscount(Number(e.target.value))}
                        />
                     </div>
                   </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="border-none shadow-2xl sticky top-28 bg-gradient-to-br from-primary to-[#2a4580] text-white rounded-[3rem] p-4 card-3d">
                <CardHeader className="p-8">
                  <CardTitle className="text-2xl font-black">ملخص الفاتورة</CardTitle>
                  <p className="text-xs font-bold text-white/60">تحقق من البيانات قبل التأكيد</p>
                </CardHeader>
                <CardContent className="px-8 space-y-6">
                  <div className="flex justify-between items-center opacity-80">
                    <span className="font-bold">المجموع الفرعي:</span>
                    <span className="font-black tabular-nums">{subtotal.toLocaleString()} دج</span>
                  </div>
                  <div className="flex justify-between items-center text-orange-200">
                    <span className="font-bold">الخصومات:</span>
                    <span className="font-black tabular-nums">-{discount.toLocaleString()} دج</span>
                  </div>
                  <Separator className="bg-white/10" />
                  <div className="flex flex-col gap-2 py-4">
                    <span className="text-sm font-black text-white/60 uppercase">الإجمالي النهائي</span>
                    <span className="text-4xl font-black tabular-nums tracking-tighter">{total.toLocaleString()} <span className="text-lg opacity-40">دج</span></span>
                  </div>
                  
                  <div className="space-y-4 mt-8">
                    <Button 
                      className="w-full bg-white text-primary font-black hover:bg-white/90 gap-3 h-16 rounded-[1.8rem] text-lg shadow-xl shadow-black/20 group"
                      onClick={handleProcessInvoice}
                      disabled={isProcessing || cart.length === 0}
                    >
                      {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Printer className="h-6 w-6 group-hover:rotate-12 transition-transform" />}
                      تأكيد وطباعة
                    </Button>
                    <Button variant="outline" className="w-full bg-white/10 border-white/10 hover:bg-white/20 text-white gap-3 h-16 rounded-[1.8rem] font-bold">
                      <Download className="h-5 w-5" />
                      حفظ مسودة PDF
                    </Button>
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-4 p-8 text-center">
                   <div className="glass bg-white/5 border-white/5 px-6 py-3 rounded-2xl w-full">
                      <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">العميل الحالي</p>
                      <p className="text-sm font-black">{selectedCustomer ? selectedCustomer.name : "عميل نقدي عام"}</p>
                   </div>
                </CardFooter>
              </Card>
            </div>

          </div>
          
          <div className="mt-12 flex justify-center text-muted-foreground/30 text-[10px] gap-2 items-center italic font-black uppercase tracking-[0.2em]">
            <span>EXPRESS PHONE PRO • PREMIUM POS TERMINAL</span>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
