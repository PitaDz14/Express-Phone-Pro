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
  Loader2
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
        paidAmount: total, // Assuming cash sale for now
        status: "Paid",
        generatedByUserId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      const invPromise = addDocumentNonBlocking(invoicesRef, invoiceData)
      const invRef = await invPromise
      
      if (invRef) {
        // Add Items to invoice subcollection
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

          // Deduct from stock
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
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-6 bg-white sticky top-0 z-10 no-print">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-xl font-bold tracking-tight">الفواتير والمبيعات (نظام POS)</h1>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" className="gap-2">
               <FileText className="h-4 w-4" />
               سجل الفواتير
             </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* POS Interface */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-none shadow-sm">
                <CardHeader className="border-b">
                   <CardTitle className="text-lg">إضافة منتجات للفاتورة</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="بحث بالاسم أو الكود..." 
                          className="pl-10 h-11" 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <Button variant="outline" size="icon" className="h-11 w-11">
                        <Scan className="h-5 w-5" />
                      </Button>
                    </div>
                    
                    {searchTerm && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-xl z-20 overflow-hidden">
                        {filteredProducts.map(p => (
                          <div 
                            key={p.id} 
                            className="p-3 hover:bg-muted cursor-pointer flex justify-between items-center border-b last:border-0"
                            onClick={() => addToCart(p)}
                          >
                            <div>
                              <p className="font-bold text-sm">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.productCode} • متاح: {p.quantity}</p>
                            </div>
                            <p className="font-bold text-primary">{p.salePrice.toLocaleString()} دج</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3 mt-6">
                    {cart.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/20">
                        <Package className="h-10 w-10 mx-auto text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground mt-2">السلة فارغة، ابدأ بإضافة منتجات</p>
                      </div>
                    ) : cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                             <Package className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">{item.price.toLocaleString()} دج للقطعة</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-2 border rounded-md px-2 py-1 bg-white">
                             <button onClick={() => updateQty(item.id, -1)} className="text-muted-foreground hover:text-primary">-</button>
                             <span className="w-8 text-center font-bold text-sm tabular-nums">{item.qty}</span>
                             <button onClick={() => updateQty(item.id, 1)} className="text-muted-foreground hover:text-primary">+</button>
                           </div>
                           <p className="font-bold text-sm tabular-nums w-24 text-left">{(item.price * item.qty).toLocaleString()} دج</p>
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => removeFromCart(item.id)}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader className="border-b">
                   <CardTitle className="text-lg">معلومات العميل والخصم</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2 relative">
                        <Label>اختيار عميل</Label>
                        <div className="flex gap-2">
                           <Input 
                            placeholder="بحث عن عميل..." 
                            value={selectedCustomer ? selectedCustomer.name : customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            disabled={!!selectedCustomer}
                           />
                           {selectedCustomer ? (
                             <Button variant="outline" onClick={() => setSelectedCustomer(null)}>تغيير</Button>
                           ) : (
                             <Button variant="outline" size="icon"><UserPlus className="h-4 w-4" /></Button>
                           )}
                        </div>
                        {customerSearch && !selectedCustomer && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-20">
                            {customers?.filter(c => c.name.includes(customerSearch)).map(c => (
                              <div 
                                key={c.id} 
                                className="p-2 hover:bg-muted cursor-pointer"
                                onClick={() => { setSelectedCustomer(c); setCustomerSearch(""); }}
                              >
                                {c.name} - {c.phone}
                              </div>
                            ))}
                          </div>
                        )}
                     </div>
                     <div className="space-y-2">
                        <Label>تطبيق خصم (دج)</Label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={discount}
                          onChange={(e) => setDiscount(Number(e.target.value))}
                        />
                     </div>
                   </div>
                </CardContent>
              </Card>
            </div>

            {/* Invoice Summary */}
            <div className="lg:col-span-1">
              <Card className="border-none shadow-lg sticky top-24 bg-primary text-primary-foreground">
                <CardHeader>
                  <CardTitle>ملخص الفاتورة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center opacity-90">
                    <span>المجموع الفرعي:</span>
                    <span className="font-bold tabular-nums">{subtotal.toLocaleString()} دج</span>
                  </div>
                  <div className="flex justify-between items-center opacity-90 text-orange-200">
                    <span>الخصومات:</span>
                    <span className="font-bold tabular-nums">-{discount.toLocaleString()} دج</span>
                  </div>
                  <Separator className="bg-white/20" />
                  <div className="flex justify-between items-center py-2">
                    <span className="text-lg font-bold">الإجمالي النهائي:</span>
                    <span className="text-2xl font-black tabular-nums">{total.toLocaleString()} دج</span>
                  </div>
                  
                  <div className="space-y-3 mt-6">
                    <Button 
                      className="w-full bg-accent text-accent-foreground font-bold hover:bg-accent/90 gap-2 h-12"
                      onClick={handleProcessInvoice}
                      disabled={isProcessing || cart.length === 0}
                    >
                      {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />}
                      تأكيد وطباعة الفاتورة
                    </Button>
                    <Button variant="outline" className="w-full bg-white/10 border-white/20 hover:bg-white/20 text-white gap-2 h-12">
                      <Download className="h-5 w-5" />
                      حفظ كـ PDF
                    </Button>
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-2 pt-0 pb-6 text-center">
                   <p className="text-[10px] opacity-70">
                    {selectedCustomer ? `العميل: ${selectedCustomer.name}` : "فاتورة عميل عام"}
                   </p>
                </CardFooter>
              </Card>
            </div>

          </div>
          
          <div className="mt-8 flex justify-center text-muted-foreground/30 text-[10px] gap-2 items-center italic">
            <span>By Khaled_Deragha - Express Phone Pro</span>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
