
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
  Camera,
  ArrowRight,
  History
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
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useUser, setDocumentNonBlocking } from "@/firebase"
import { collection, doc, serverTimestamp, increment, getDoc, getDocs, deleteDoc, writeBatch } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { QRScannerDialog } from "@/components/qr-scanner-dialog"

interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  qty: number
  categoryPath?: string
}

export default function InvoicesPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const router = useRouter()
  const editId = searchParams.get('editId')

  const [cart, setCart] = React.useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = React.useState("")
  const [customerSearch, setCustomerSearch] = React.useState("")
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null)
  const [discount, setDiscount] = React.useState(0)
  const [paidAmount, setPaidAmount] = React.useState<number | "">("")
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [isLoadingInvoice, setIsLoadingInvoice] = React.useState(false)
  const [showPreview, setShowPreview] = React.useState(false)
  const [isQRScannerOpen, setIsQRScannerOpen] = React.useState(false)

  const productsRef = useMemoFirebase(() => collection(db, "products"), [db])
  const customersRef = useMemoFirebase(() => collection(db, "customers"), [db])
  const invoicesRef = useMemoFirebase(() => collection(db, "invoices"), [db])
  
  const { data: products } = useCollection(productsRef)
  const { data: customers } = useCollection(customersRef)

  // Load Invoice for Editing
  React.useEffect(() => {
    if (editId && products) {
      const loadInvoice = async () => {
        setIsLoadingInvoice(true)
        try {
          const invDoc = await getDoc(doc(db, "invoices", editId))
          if (invDoc.exists()) {
            const data = invDoc.data()
            setSelectedCustomer({ id: data.customerId, name: data.customerName, debt: 0 }) 
            setDiscount(data.discount || 0)
            setPaidAmount(data.paidAmount)
            
            const itemsSnap = await getDocs(collection(db, "invoices", editId, "items"))
            const items = itemsSnap.docs.map(d => {
              const itemData = d.data()
              return {
                id: d.id,
                productId: itemData.productId,
                name: itemData.productName,
                price: itemData.unitPrice,
                qty: itemData.quantity,
                categoryPath: itemData.categoryPath
              }
            })
            setCart(items)
          }
        } catch (e) {
          toast({ variant: "destructive", title: "خطأ", description: "فشل تحميل الفاتورة للتعديل" })
        } finally {
          setIsLoadingInvoice(false)
        }
      }
      loadInvoice()
    }
  }, [editId, products, db, toast])

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
    const existing = cart.find(item => item.productId === product.id)
    if (existing) {
      if (existing.qty >= product.quantity) {
        toast({ title: "تنبيه", description: "وصلت للكمية المتاحة في المخزون" })
        return
      }
      setCart(cart.map(item => item.productId === product.id ? { ...item, qty: item.qty + 1 } : item))
    } else {
      setCart([...cart, { 
        id: Math.random().toString(36).substring(7),
        productId: product.id,
        name: product.name, 
        price: product.salePrice, 
        qty: 1,
        categoryPath: product.categoryPath || product.categoryName 
      }])
    }
    setSearchTerm("")
  }

  const handleQRScan = (code: string) => {
    const product = products?.find(p => p.productCode === code)
    if (product) addToCart(product)
    else toast({ title: "منتج غير مسجل", description: `كود ${code} غير موجود`, variant: "destructive" })
  }

  const updateQty = (productId: string, delta: number) => {
    setCart(cart.map(item => item.productId === productId ? { ...item, qty: Math.max(1, item.qty + delta) } : item))
  }

  const updatePrice = (productId: string, newPrice: number) => {
    setCart(cart.map(item => item.productId === productId ? { ...item, price: newPrice } : item))
  }

  const handlePrintInvoice = (invId: string, invoiceData: any, cartItems: CartItem[], customer: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const hasDiscount = (invoiceData.discount || 0) > 0;

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>فاتورة - ${invId}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&display=swap');
            @page { margin: 5mm; }
            body { font-family: 'Almarai', sans-serif; color: #000; background: #fff; line-height: 1.2; padding: 0; margin: 0; }
            .invoice-box { width: 100%; max-width: 80mm; margin: 0 auto; padding: 5px; }
            .header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
            .header h1 { margin: 0; font-size: 18px; font-weight: 800; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px; }
            th { border-bottom: 1px solid #000; padding: 4px; text-align: right; }
            td { padding: 4px; border-bottom: 1px dotted #ccc; }
            .summary { border-top: 1px solid #000; padding-top: 5px; font-size: 12px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 2px; font-weight: 700; }
            .total { font-size: 14px; border-top: 1px solid #000; padding-top: 4px; font-weight: 800; }
            .qr-footer { display: flex; flex-direction: column; align-items: center; margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px; }
            .qr-img { width: 100px; height: 100px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="invoice-box">
            <div class="header">
              <h1>EXPRESS PHONE</h1>
              <p style="font-size: 10px; font-weight: 800;">فاتورة مبيعات</p>
              <p style="font-size: 9px;">#${invId.slice(0, 15)}</p>
              <p style="font-size: 9px;">التاريخ: ${format(new Date(), "yyyy/MM/dd HH:mm", { locale: ar })}</p>
            </div>

            <div style="font-size: 10px; margin-bottom: 10px;">
              <p><strong>العميل:</strong> ${customer?.name || "عميل عام"}</p>
              <p><strong>الهاتف:</strong> ${customer?.id === 'walk-in' || !customer?.phone ? "لا يوجد" : customer.phone}</p>
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
                ${cartItems.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td style="text-align: center">${item.qty}</td>
                    <td style="text-align: left">${(item.price * item.qty).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="summary">
              <div class="summary-row"><span>المجموع:</span> <span>${(subtotal).toLocaleString()} دج</span></div>
              ${hasDiscount ? `<div class="summary-row"><span>الخصم:</span> <span>-${(invoiceData.discount || 0).toLocaleString()} دج</span></div>` : ''}
              <div class="summary-row"><span>المدفوع:</span> <span>${invoiceData.paidAmount.toLocaleString()} دج</span></div>
              <div class="summary-row total"><span>الإجمالي النهائي:</span> <span>${invoiceData.totalAmount.toLocaleString()} دج</span></div>
            </div>

            <div class="qr-footer">
              <img class="qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=INV-${invId}" alt="QR" />
              <p style="font-weight: 800; font-size: 11px; margin-top: 5px;">شكراً لتعاملكم معنا</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  const handleProcessInvoice = async () => {
    if (cart.length === 0 || !user) return
    if (debtAmount > 0 && !selectedCustomer) {
      toast({ title: "تنبيه", description: "يجب تحديد عميل لتسجيل الدين باسمه", variant: "destructive" })
      return
    }

    setIsProcessing(true)
    const batch = writeBatch(db);

    try {
      if (editId) {
        const oldInvSnap = await getDoc(doc(db, "invoices", editId));
        if (oldInvSnap.exists()) {
          const oldData = oldInvSnap.data();
          
          // Revert old debt
          const oldDebt = oldData.totalAmount - oldData.paidAmount;
          if (oldDebt > 0 && oldData.customerId && oldData.customerId !== 'walk-in') {
            batch.update(doc(db, "customers", oldData.customerId), {
              debt: increment(-oldDebt)
            });
          }

          // Revert old items and delete them
          const oldItemsSnap = await getDocs(collection(db, "invoices", editId, "items"));
          for (const d of oldItemsSnap.docs) {
            const item = d.data();
            if (item.productId) {
              batch.update(doc(db, "products", item.productId), {
                quantity: increment(item.quantity)
              });
            }
            batch.delete(d.ref);
          }
        }
      }

      const invoiceData: any = {
        customerId: selectedCustomer?.id || "walk-in",
        customerName: selectedCustomer?.name || "عميل عام",
        totalAmount: total,
        paidAmount: finalPaid,
        discount: discount,
        status: debtAmount > 0 ? "Debt" : "Paid",
        generatedByUserId: user.uid,
        updatedAt: serverTimestamp()
      }

      if (!editId) {
        invoiceData.createdAt = serverTimestamp();
      }

      const targetDocRef = editId ? doc(db, "invoices", editId) : doc(collection(db, "invoices"));
      batch.set(targetDocRef, invoiceData, { merge: true });
      
      const itemsRef = collection(db, "invoices", targetDocRef.id, "items")
      cart.forEach(item => {
        const newItemRef = doc(itemsRef);
        batch.set(newItemRef, {
          invoiceId: targetDocRef.id,
          productId: item.productId,
          productName: item.name,
          categoryPath: item.categoryPath || "",
          quantity: item.qty,
          unitPrice: item.price,
          itemTotal: item.price * item.qty,
          generatedByUserId: user.uid,
          createdAt: serverTimestamp()
        });

        batch.update(doc(db, "products", item.productId), {
          quantity: increment(-item.qty)
        });
      });

      if (debtAmount > 0 && selectedCustomer && selectedCustomer.id !== 'walk-in') {
        batch.update(doc(db, "customers", selectedCustomer.id), {
          debt: increment(debtAmount)
        });
      }

      await batch.commit();

      toast({ title: editId ? "تم تحديث الفاتورة" : "تم إصدار الفاتورة", description: `رقم العملية: ${targetDocRef.id.slice(0, 8)}` })
      handlePrintInvoice(targetDocRef.id, invoiceData, cart, selectedCustomer)

      setCart([])
      setSelectedCustomer(null)
      setDiscount(0)
      setPaidAmount("")
      setShowPreview(false)
      if (editId) router.push('/invoices/history')
    } catch (error) {
      console.error("Save Error:", error);
      toast({ title: "خطأ", description: "حدث خطأ أثناء معالجة البيانات، يرجى المحاولة لاحقاً", variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoadingInvoice) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
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
              <h1 className="text-sm md:text-lg font-black tracking-tighter text-primary">
                {editId ? `تعديل فاتورة #${editId.slice(0,8)}` : "نقطة بيع EXPRESS"}
              </h1>
              <p className="text-[7px] md:text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Smart Point of Sale</p>
            </div>
          </div>
          <div className="flex gap-2">
            {editId && (
              <Button asChild variant="ghost" className="h-10 px-4 rounded-xl font-black text-xs gap-2">
                 <Link href="/invoices/history"><History className="h-4 w-4" /> إلغاء التعديل</Link>
              </Button>
            )}
            <Button asChild variant="outline" className="h-10 px-4 rounded-xl glass border-white/20 gap-2 font-black text-xs">
               <Link href="/debts"><Wallet className="h-4 w-4" /> <span className="hidden sm:inline">إدارة الديون</span></Link>
            </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-none glass shadow-xl rounded-[2rem]">
                <CardHeader className="p-6 md:p-8 border-b border-border">
                   <div className="flex items-center justify-between">
                     <CardTitle className="text-lg md:text-xl font-black">إضافة المنتجات للسلة</CardTitle>
                     <Button variant="ghost" size="sm" className="rounded-xl border border-primary/20 gap-2 font-black text-primary" onClick={() => setIsQRScannerOpen(true)}>
                        <Camera className="h-4 w-4" /> <span className="hidden sm:inline">مسح QR</span>
                     </Button>
                   </div>
                </CardHeader>
                <CardContent className="p-4 md:p-8 space-y-6">
                  <div className="relative">
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="ابحث بالاسم، الكود، أو الفئة..." 
                        className="pl-12 h-12 glass border-none rounded-2xl font-bold text-sm" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    {searchTerm && (
                      <div className="absolute top-full left-0 right-0 mt-3 glass-premium rounded-3xl shadow-2xl z-20 overflow-hidden max-h-[300px] overflow-y-auto border border-white/20">
                        {filteredProducts.map(p => (
                          <div key={p.id} className="p-4 hover:bg-primary/5 cursor-pointer flex justify-between items-center border-b border-border transition-all" onClick={() => addToCart(p)}>
                            <div className="flex flex-col">
                               <p className="font-black text-sm text-foreground">{p.name}</p>
                               <p className="text-[10px] text-muted-foreground font-bold">{p.categoryPath}</p>
                            </div>
                            <div className="text-left">
                               <span className="text-sm font-black text-primary tabular-nums">{p.salePrice.toLocaleString()} دج</span>
                               <p className="text-[8px] text-muted-foreground font-black">المتوفر: {p.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {cart.length === 0 ? (
                      <div className="text-center py-10 opacity-30 italic font-black text-xs">السلة فارغة حالياً</div>
                    ) : (
                      <div className="table-container">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b border-white/10 hover:bg-transparent">
                              <TableHead className="font-black text-foreground">المنتج / السعر</TableHead>
                              <TableHead className="text-center font-black text-foreground">الكمية</TableHead>
                              <TableHead className="text-left font-black text-foreground">الإجمالي</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cart.map((item) => (
                              <TableRow key={item.productId} className="border-b border-white/5 hover:bg-white/10 transition-colors">
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    <span className="font-black text-sm">{item.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-muted-foreground font-bold">سعر الوحدة:</span>
                                      <Input 
                                        type="number" 
                                        className="h-7 w-20 glass border-none font-black text-[11px] tabular-nums text-primary text-center" 
                                        value={item.price} 
                                        onChange={(e) => updatePrice(item.productId, Number(e.target.value))} 
                                      />
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-2 glass border-border rounded-xl px-2 py-1 mx-auto max-w-fit">
                                    <button onClick={() => updateQty(item.productId, -1)} className="text-primary font-black hover:scale-125 transition-transform">-</button>
                                    <span className="w-6 text-center font-black text-xs tabular-nums">{item.qty}</span>
                                    <button onClick={() => updateQty(item.productId, 1)} className="text-primary font-black hover:scale-125 transition-transform">+</button>
                                  </div>
                                </TableCell>
                                <TableCell className="text-left font-black text-sm tabular-nums text-primary">
                                  {(item.price * item.qty).toLocaleString()} دج
                                </TableCell>
                                <TableCell>
                                  <button className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg flex items-center justify-center" onClick={() => setCart(cart.filter(i => i.productId !== item.productId))}>
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
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
                        <Label className="text-[10px] font-black text-primary uppercase">العميل</Label>
                        <div className="relative group">
                          <Input className="h-11 glass border-none rounded-xl font-bold" placeholder="بحث عن عميل مسجل..." value={selectedCustomer ? selectedCustomer.name : customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} disabled={!!selectedCustomer} />
                          {selectedCustomer && (
                            <Button variant="ghost" size="icon" className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setSelectedCustomer(null)}><X className="h-4 w-4" /></Button>
                          )}
                        </div>
                        {customerSearch && !selectedCustomer && (
                          <div className="absolute top-full left-0 right-0 mt-2 glass border-border rounded-2xl shadow-xl z-20 overflow-hidden max-h-[200px] overflow-y-auto border border-white/10">
                            {customers?.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                              <div key={c.id} className="p-3 hover:bg-primary/5 cursor-pointer border-b border-border font-bold text-xs" onClick={() => { setSelectedCustomer(c); setCustomerSearch(""); }}>
                                {c.name} - {c.phone}
                              </div>
                            ))}
                          </div>
                        )}
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-primary uppercase">الخصم</Label>
                            <Input type="number" className="h-11 glass border-none rounded-xl font-black text-orange-600" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-emerald-500 uppercase">المدفوع</Label>
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
                    <div className="flex justify-between opacity-80"><span>المجموع الفرعي:</span> <span className="tabular-nums">{subtotal.toLocaleString()} دج</span></div>
                    {discount > 0 && <div className="flex justify-between text-orange-200"><span>الخصم الممنوح:</span> <span className="tabular-nums">-{discount.toLocaleString()} دج</span></div>}
                    <div className="flex justify-between text-emerald-200"><span>المبلغ المدفوع:</span> <span className="tabular-nums">{finalPaid.toLocaleString()} دج</span></div>
                    {debtAmount > 0 && (
                      <div className="flex justify-between text-red-200 font-black"><span>المتبقي (دين):</span> <span className="tabular-nums">{debtAmount.toLocaleString()} دج</span></div>
                    )}
                  </div>
                  <Separator className="bg-white/10" />
                  <div className="pt-2">
                    <span className="text-[10px] font-black opacity-60 uppercase tracking-widest">الإجمالي النهائي</span>
                    <p className="text-4xl font-black tabular-nums">{total.toLocaleString()} دج</p>
                  </div>
                  <Button 
                    className="w-full bg-white text-primary font-black hover:bg-white/90 h-14 rounded-2xl text-lg shadow-xl hover:scale-105 transition-transform" 
                    onClick={() => cart.length > 0 && setShowPreview(true)} 
                    disabled={cart.length === 0}
                  >
                    {editId ? "حفظ التعديلات والمعاينة" : "معاينة الفاتورة للطباعة"}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </main>

        {/* Professional Preview Dialog (Thermal Simulated) */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent dir="rtl" className="max-w-md glass border-none rounded-[2rem] shadow-2xl p-0 overflow-hidden z-[210] flex flex-col h-[90vh]">
             <DialogHeader className="p-4 bg-primary/5 border-b border-border shrink-0">
                <DialogTitle className="text-xl font-black text-center text-primary">معاينة الفاتورة النهائية</DialogTitle>
             </DialogHeader>

             <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-black/5 custom-scrollbar">
                <div className="flex flex-col items-center min-h-full py-4">
                  {/* Simulated Paper */}
                  <div className="bg-white text-black w-full max-w-[350px] shadow-2xl p-6 md:p-8 rounded-sm space-y-6 text-[12px] border border-black/10 select-none">
                     <div className="text-center space-y-1 border-b-2 border-black pb-4">
                        <h2 className="text-2xl font-black leading-none">EXPRESS PHONE</h2>
                        <p className="text-[10px] font-bold">خدمات تصليح وبيع الهواتف</p>
                        <p className="text-[10px] tabular-nums">{format(new Date(), "yyyy/MM/dd HH:mm", { locale: ar })}</p>
                     </div>

                     <div className="space-y-1">
                        <p className="font-bold">رقم الفاتورة: <span className="tabular-nums">#{editId || "رقم_جديد"}</span></p>
                        <p>العميل: {selectedCustomer?.name || "عميل عام"}</p>
                        <p>الهاتف: {selectedCustomer?.id === 'walk-in' || !selectedCustomer?.phone ? "لا يوجد" : selectedCustomer.phone}</p>
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
                          {cart.map((item) => (
                            <tr key={item.productId}>
                               <td className="py-2 text-right font-bold">{item.name}</td>
                               <td className="py-2 text-center tabular-nums">{item.qty}</td>
                               <td className="py-2 text-left tabular-nums">{(item.price * item.qty).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                     </table>

                     <div className="space-y-1 border-t border-black pt-4">
                        <div className="flex justify-between"><span>المجموع:</span> <span className="tabular-nums">{(subtotal).toLocaleString()} دج</span></div>
                        {discount > 0 && <div className="flex justify-between"><span>الخصم:</span> <span className="tabular-nums">-${discount.toLocaleString()} دج</span></div>}
                        <div className="flex justify-between font-black text-base border-t-2 border-double border-black pt-2">
                           <span>الإجمالي النهائي:</span> <span className="tabular-nums">{total.toLocaleString()} دج</span>
                        </div>
                        <div className="flex justify-between text-[11px]"><span>المدفوع:</span> <span className="tabular-nums">{finalPaid.toLocaleString()} دج</span></div>
                        {debtAmount > 0 && <div className="flex justify-between text-red-600 font-bold"><span>المتبقي (دين):</span> <span className="tabular-nums">{debtAmount.toLocaleString()} دج</span></div>}
                     </div>

                     <div className="flex flex-col items-center pt-6 border-t border-dashed border-black/30">
                        <img className="w-24 h-24" src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=INV-${editId || "NEW"}`} alt="QR" />
                        <p className="mt-4 font-black text-sm">شكراً لزيارتكم</p>
                     </div>
                  </div>
                </div>
             </div>

             <div className="p-4 bg-white border-t border-border flex flex-col gap-2 shrink-0">
                <Button className="w-full h-12 rounded-xl bg-primary text-white font-black shadow-lg flex gap-2" onClick={handleProcessInvoice} disabled={isProcessing}>
                   {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />} {editId ? "حفظ التعديلات النهائية" : "تأكيد وتنفيذ الطباعة"}
                </Button>
                <Button variant="outline" className="w-full h-11 rounded-xl font-bold border-white/20" onClick={() => setShowPreview(false)}>تراجع للتعديل</Button>
             </div>
          </DialogContent>
        </Dialog>
    </div>
  )
}
