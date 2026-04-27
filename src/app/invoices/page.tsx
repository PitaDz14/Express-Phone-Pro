
"use client"

import * as React from "react"
import { 
  FileText, 
  Plus, 
  Search, 
  Printer, 
  Trash2, 
  Package, 
  Loader2, 
  Smartphone, 
  Wallet, 
  CheckCircle2, 
  Camera, 
  History, 
  ShieldCheck, 
  UserCog, 
  ChevronDown, 
  User, 
  Star,
  Info,
  X,
  ShoppingBag,
  UserPlus
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, serverTimestamp, increment, getDoc, getDocs, writeBatch } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { QRScannerDialog } from "@/components/qr-scanner-dialog"
import { playSystemSound } from "@/lib/audio-utils"

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
  const { user, username, role } = useUser()
  const searchParams = useSearchParams()
  const router = useRouter()
  const editId = searchParams.get('editId')

  const [cart, setCart] = React.useState<CartItem[]>([])
  const [originalCart, setOriginalCart] = React.useState<CartItem[]>([]) 
  const [searchTerm, setSearchTerm] = React.useState("")
  const [customerSearch, setCustomerSearch] = React.useState("")
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null)
  const [discount, setDiscount] = React.useState(0)
  const [paidAmount, setPaidAmount] = React.useState<number | "">("")
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [isLoadingInvoice, setIsLoadingInvoice] = React.useState(false)
  const [showPreview, setShowPreview] = React.useState(false)
  const [isQRScannerOpen, setIsQRScannerOpen] = React.useState(false)
  const [pendingId, setPendingId] = React.useState("")

  const productsRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, "products");
  }, [db, user])

  const customersRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, "customers");
  }, [db, user])

  const { data: products } = useCollection(productsRef)
  const { data: customers } = useCollection(customersRef)

  React.useEffect(() => {
    if (!editId) {
      if (!pendingId) setPendingId(doc(collection(db, "invoices")).id);
      return;
    }

    const loadInvoiceData = async () => {
      setIsLoadingInvoice(true);
      try {
        const invDoc = await getDoc(doc(db, "invoices", editId));
        if (invDoc.exists()) {
          const data = invDoc.data();
          setDiscount(data.discount || 0);
          setPaidAmount(data.paidAmount ?? "");
          
          if (data.customerId && data.customerId !== 'walk-in') {
            const custDoc = await getDoc(doc(db, "customers", data.customerId));
            if (custDoc.exists()) {
              setSelectedCustomer({ id: custDoc.id, ...custDoc.data() });
            }
          } else {
            setCustomerSearch(data.customerName || "");
          }

          const itemsSnap = await getDocs(collection(db, "invoices", editId, "items"));
          const items = itemsSnap.docs.map(d => {
            const item = d.data();
            return {
              id: d.id,
              productId: item.productId,
              name: item.productName,
              price: item.unitPrice,
              qty: item.quantity,
              categoryPath: item.categoryPath || ""
            };
          });
          setCart(items);
          setOriginalCart(JSON.parse(JSON.stringify(items)));
        }
      } catch (err) {
        console.error("Load Invoice Error:", err);
        toast({ title: "خطأ في جلب بيانات الفاتورة", variant: "destructive" });
      } finally {
        setIsLoadingInvoice(false);
      }
    };

    loadInvoiceData();
  }, [editId, db, pendingId, toast]);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
  const total = subtotal - discount
  const finalPaid = paidAmount === "" ? total : Number(paidAmount)
  const debtAmount = total - finalPaid

  const filteredProducts = React.useMemo(() => {
    if (!searchTerm || !products) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.productCode?.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5)
  }, [searchTerm, products])

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.productId === product.id)
    const currentQtyInCart = existing ? existing.qty : 0
    const originalQtyInInv = originalCart.find(i => i.productId === product.id)?.qty || 0
    const availableStock = (product.quantity || 0) + originalQtyInInv

    if (currentQtyInCart + 1 > availableStock) {
      toast({ title: "خطأ في المخزون", description: "الكمية المطلوبة تتجاوز المتوفر", variant: "destructive" })
      playSystemSound('failure')
      return
    }

    if (existing) {
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
    playSystemSound('success')
  }

  const handleProcessInvoice = async () => {
    if (cart.length === 0 || !user) return
    const finalCustomerName = selectedCustomer ? selectedCustomer.name : (customerSearch || "عميل عام")
    
    if (debtAmount > 0 && (!selectedCustomer || selectedCustomer.id === 'walk-in')) {
      toast({ title: "يجب تحديد عميل للمديونية", variant: "destructive" })
      playSystemSound('failure')
      return
    }

    setIsProcessing(true)
    const batch = writeBatch(db);
    try {
      const currentInvoiceId = editId || pendingId;
      const targetDocRef = doc(db, "invoices", currentInvoiceId);
      
      if (editId) {
        const oldInvSnap = await getDoc(targetDocRef);
        if (oldInvSnap.exists()) {
          const oldData = oldInvSnap.data();
          const oldItemsSnap = await getDocs(collection(db, "invoices", editId, "items"));
          oldItemsSnap.docs.forEach(d => {
            const item = d.data();
            if (item.productId) {
              batch.update(doc(db, "products", item.productId), { quantity: increment(item.quantity) });
            }
            batch.delete(d.ref);
          });

          if (oldData.status === 'Debt' && oldData.customerId !== 'walk-in') {
            const oldDebt = (oldData.totalAmount || 0) - (oldData.paidAmount || 0);
            batch.update(doc(db, "customers", oldData.customerId), { debt: increment(-oldDebt) });
          }
        }
      }

      const invoiceData: any = { 
        customerId: selectedCustomer?.id || "walk-in", 
        customerName: finalCustomerName, 
        totalAmount: total, 
        paidAmount: finalPaid, 
        discount: discount, 
        status: debtAmount > 0 ? "Debt" : "Paid", 
        generatedByUserId: user.uid, 
        generatedByUserName: username || "غير معرف", 
        updatedAt: serverTimestamp() 
      }
      
      if (!editId) invoiceData.createdAt = serverTimestamp();
      batch.set(targetDocRef, invoiceData, { merge: true });
      
      cart.forEach(item => {
        const newItemRef = doc(collection(db, "invoices", targetDocRef.id, "items"));
        batch.set(newItemRef, { 
          invoiceId: targetDocRef.id, 
          productId: item.productId, 
          productName: item.name, 
          quantity: item.qty, 
          unitPrice: item.price, 
          itemTotal: item.price * item.qty, 
          categoryPath: item.categoryPath || "",
          generatedByUserId: user.uid, 
          createdAt: serverTimestamp() 
        });
        batch.update(doc(db, "products", item.productId), { quantity: increment(-item.qty), updatedAt: serverTimestamp() });
      });

      if (debtAmount > 0 && selectedCustomer && selectedCustomer.id !== 'walk-in') {
        batch.update(doc(db, "customers", selectedCustomer.id), { debt: increment(debtAmount), updatedAt: serverTimestamp() });
      }

      await batch.commit();
      toast({ title: editId ? "تم تحديث الفاتورة بنجاح" : "تم إصدار الفاتورة بنجاح" })
      playSystemSound('success')
      
      setCart([]); 
      setSelectedCustomer(null); 
      setCustomerSearch(""); 
      setShowPreview(false); 
      setPendingId(""); 
      if (editId) router.push('/invoices/history');
      
    } catch (error) {
      console.error("Save Error:", error);
      toast({ title: "خطأ في حفظ العملية", variant: "destructive" })
      playSystemSound('failure')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoadingInvoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
           <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
           <p className="font-black text-muted-foreground">جاري استعادة بيانات الفاتورة...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-32" dir="rtl">
        <QRScannerDialog open={isQRScannerOpen} onOpenChange={setIsQRScannerOpen} onScan={(c) => {const p = products?.find(x => x.productCode === c); if(p) addToCart(p); else playSystemSound('failure');}} />
        
        {/* Professional Header - Dark Theme */}
        <header className="flex h-20 items-center justify-between px-10 bg-[#334155] text-white sticky top-0 z-[100] shadow-2xl">
          <div className="flex items-center gap-6">
             <Button asChild variant="outline" className="h-11 px-6 rounded-xl border-white/20 bg-white/5 hover:bg-white/10 text-white gap-2 font-bold transition-all">
                <Link href="/debts"><Wallet className="h-5 w-5" /> إدارة الديون</Link>
             </Button>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/5">
                <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">بواسطة</span>
                <span className="font-black text-sm">{username || "المدير"}</span>
                <div className="h-6 w-6 rounded-lg bg-blue-500 flex items-center justify-center text-white shadow-lg">
                   <ShieldCheck className="h-4 w-4" />
                </div>
             </div>
             <Button asChild variant="ghost" size="icon" className="h-11 w-11 rounded-xl bg-white/5 hover:bg-white/10 text-white">
                <Link href="/invoices/history" title="سجل الفواتير"><Printer className="h-5 w-5" /></Link>
             </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col text-left items-end">
              <h1 className="font-black text-xl tracking-tighter text-blue-400 leading-none flex items-center gap-3">
                 <span className="text-white opacity-40 text-[10px] font-bold uppercase tracking-widest mt-1">SMART POINT OF SALE</span>
                 EXPRESS نقطة بيع
              </h1>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-xl rotate-3">
              <Smartphone className="h-7 w-7" />
            </div>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto p-6 md:p-10 grid grid-cols-1 lg:grid-cols-4 gap-10">
           
           {/* Account Summary Sidebar - Blue Card */}
           <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-6">
                 <Card className="border-none bg-[#2563eb] text-white rounded-[3rem] p-10 shadow-[0_30px_60px_-15px_rgba(37,99,235,0.4)] relative overflow-hidden h-full flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-12 opacity-5"><Smartphone className="h-48 w-48 rotate-12" /></div>
                    
                    <div className="relative z-10 space-y-8">
                       <div className="flex items-center justify-between border-b border-white/10 pb-4">
                          <h2 className="text-2xl font-black">ملخص الحساب</h2>
                       </div>

                       <div className="space-y-4">
                          <div className="flex justify-between items-center text-white/70">
                             <span className="text-sm font-bold">المجموع الفرعي:</span>
                             <span className="font-black tabular-nums">{subtotal.toLocaleString()} دج</span>
                          </div>
                          <div className="flex justify-between items-center text-white/70">
                             <span className="text-sm font-bold">المبلغ المدفوع:</span>
                             <span className="font-black tabular-nums">{finalPaid.toLocaleString()} دج</span>
                          </div>
                          {discount > 0 && (
                            <div className="flex justify-between items-center text-red-200">
                               <span className="text-sm font-bold">الخصم الممنوح:</span>
                               <span className="font-black tabular-nums">-{discount.toLocaleString()} دج</span>
                            </div>
                          )}
                       </div>

                       <div className="space-y-1 py-4 border-t border-white/10">
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">الموظف الحالي</p>
                          <p className="font-black text-lg">{username || "المدير"}</p>
                       </div>
                    </div>

                    <div className="relative z-10 space-y-8 mt-12">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">الإجمالي النهائي</p>
                          <div className="flex items-baseline gap-2">
                             <span className="text-6xl font-black tabular-nums leading-none">{total.toLocaleString()}</span>
                             <span className="text-xl font-bold opacity-60">دج</span>
                          </div>
                       </div>

                       <Button 
                          onClick={() => setShowPreview(true)}
                          disabled={cart.length === 0}
                          className="w-full h-16 rounded-3xl bg-white/20 backdrop-blur-md text-white border border-white/20 hover:bg-white/30 text-lg font-black shadow-inner gap-3 transition-all"
                       >
                          معاينة الفاتورة للطباعة
                       </Button>
                    </div>
                 </Card>

                 <div className="p-8 rounded-[2.5rem] bg-white shadow-xl flex items-start gap-4 border border-blue-50">
                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                       <Info className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                       <p className="text-xs font-black text-slate-800">نسخة طوارئ: {editId ? editId.slice(0,8) : "جديدة"}</p>
                       <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic">نظام نقطة البيع مجهز للعمل بدون إنترنت وحفظ البيانات محلياً بشكل تلقائي.</p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Main Content Area */}
           <div className="lg:col-span-3 space-y-8">
              
              {/* Product Section */}
              <Card className="border-none bg-white rounded-[2.5rem] shadow-xl overflow-hidden">
                 <div className="p-8 bg-[#475569] text-white flex items-center justify-between">
                    <h3 className="text-xl font-black">إضافة المنتجات للسلة</h3>
                    <Button onClick={() => setIsQRScannerOpen(true)} className="h-11 px-5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 gap-2 font-bold">
                       <Camera className="h-4 w-4" /> مسح QR
                    </Button>
                 </div>

                 <CardContent className="p-8 md:p-10 space-y-8">
                    <div className="relative group">
                       <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                       <Input 
                          placeholder="ابحث بالاسم، الكود، أو الفئة..." 
                          className="pl-14 h-16 rounded-2xl border-none bg-slate-900 text-white placeholder:text-slate-500 font-bold text-lg shadow-2xl focus-visible:ring-2 focus-visible:ring-blue-500" 
                          value={searchTerm} 
                          onChange={e => setSearchTerm(e.target.value)} 
                       />
                       {searchTerm && (
                        <div className="absolute top-full left-0 right-0 mt-4 bg-white rounded-[2rem] shadow-2xl z-50 overflow-hidden border border-slate-100 divide-y divide-slate-50">
                          {filteredProducts.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 font-bold italic">لا توجد نتائج مطابقة</div>
                          ) : filteredProducts.map(p => (
                            <div key={p.id} className="p-5 hover:bg-blue-50 cursor-pointer flex items-center justify-between group transition-all" onClick={() => addToCart(p)}>
                              <div className="flex items-center gap-4">
                                 <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                    {p.imageUrl ? <img src={p.imageUrl} className="h-full w-full object-cover rounded-xl" /> : <Package className="h-6 w-6 opacity-20" />}
                                 </div>
                                 <div className="flex flex-col">
                                    <p className="font-black text-base group-hover:text-blue-600 transition-colors">{p.name} {p.isPriority && <Star className="h-3 w-3 inline fill-yellow-400 text-yellow-400" />}</p>
                                    <p className="text-[11px] text-slate-400 font-bold">#{p.productCode} • {p.categoryName}</p>
                                 </div>
                              </div>
                              <div className="text-left">
                                 <p className="font-black text-lg text-blue-600 tabular-nums">{p.salePrice.toLocaleString()} دج</p>
                                 <p className="text-[10px] font-bold text-emerald-600">المخزن: {p.quantity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                       )}
                    </div>

                    <div className="table-container min-h-[300px]">
                      <Table>
                         <TableHeader>
                            <TableRow className="border-slate-100 hover:bg-transparent">
                               <TableHead className="font-black text-slate-500 text-center uppercase tracking-widest text-[10px]">المنتج</TableHead>
                               <TableHead className="font-black text-slate-500 text-center uppercase tracking-widest text-[10px]">الكمية</TableHead>
                               <TableHead className="font-black text-slate-500 text-center uppercase tracking-widest text-[10px]">سعر البيع</TableHead>
                               <TableHead className="font-black text-slate-500 text-center uppercase tracking-widest text-[10px]">المجموع</TableHead>
                               <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                         </TableHeader>
                         <TableBody>
                            {cart.length === 0 ? (
                              <TableRow>
                                 <TableCell colSpan={5} className="py-32 text-center">
                                    <ShoppingBag className="h-16 w-16 mx-auto text-slate-100 mb-4" />
                                    <p className="text-sm font-black text-slate-300 italic uppercase tracking-widest">السلة فارغة حالياً</p>
                                 </TableCell>
                              </TableRow>
                            ) : cart.map(item => (
                              <TableRow key={item.productId} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                 <TableCell className="py-6">
                                    <div className="flex flex-col text-center">
                                       <span className="font-black text-slate-800">{item.name}</span>
                                       <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tight opacity-60">{item.categoryPath}</span>
                                    </div>
                                 </TableCell>
                                 <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-3">
                                       <button className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center font-black" onClick={() => {
                                          if(item.qty > 1) setCart(cart.map(i => i.productId === item.productId ? {...i, qty: i.qty - 1} : i))
                                       }}>-</button>
                                       <span className="w-8 font-black tabular-nums text-lg">{item.qty}</span>
                                       <button className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center font-black" onClick={() => {
                                          const p = products?.find(x => x.id === item.productId);
                                          const originalQty = originalCart.find(o => o.productId === item.productId)?.qty || 0;
                                          if (item.qty + 1 <= (p?.quantity || 0) + originalQty) {
                                             setCart(cart.map(i => i.productId === item.productId ? {...i, qty: i.qty + 1} : i))
                                          } else {
                                             toast({ title: "نفد المخزون", variant: "destructive" });
                                          }
                                       }}>+</button>
                                    </div>
                                 </TableCell>
                                 <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-2 group/price">
                                      <Input 
                                        type="number" 
                                        className="h-10 w-28 bg-slate-50 border-none text-center font-black tabular-nums text-blue-600 focus:ring-1 focus:ring-blue-500 rounded-xl" 
                                        value={item.price} 
                                        onChange={(e) => {
                                          const val = e.target.value === "" ? 0 : Number(e.target.value);
                                          setCart(cart.map(i => i.productId === item.productId ? { ...i, price: val } : i))
                                        }} 
                                      />
                                      <span className="text-[10px] font-black opacity-20 group-hover/price:opacity-100 transition-opacity">دج</span>
                                    </div>
                                 </TableCell>
                                 <TableCell className="text-center font-black text-slate-900 text-lg tabular-nums">{(item.price * item.qty).toLocaleString()} دج</TableCell>
                                 <TableCell>
                                    <Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors" onClick={() => setCart(cart.filter(i => i.productId !== item.productId))}>
                                       <Trash2 className="h-5 w-5" />
                                    </Button>
                                 </TableCell>
                              </TableRow>
                            ))}
                         </TableBody>
                      </Table>
                    </div>
                 </CardContent>
              </Card>

              {/* Customer and Payments Section */}
              <Card className="border-none bg-white rounded-[2.5rem] shadow-xl overflow-hidden">
                 <div className="p-8 bg-[#475569] text-white flex items-center justify-between">
                    <h3 className="text-xl font-black">العميل والمدفوعات</h3>
                 </div>
                 <CardContent className="p-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       <div className="md:col-span-1 space-y-3">
                          <Label className="font-black text-[10px] text-slate-400 uppercase tracking-widest px-2">العميل</Label>
                          <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full h-14 rounded-2xl bg-slate-50 border-none font-black justify-between px-5 text-slate-700">
                                   <div className="flex items-center gap-3">
                                      <User className="h-5 w-5 text-blue-500" />
                                      <span>{selectedCustomer ? selectedCustomer.name : (customerSearch || "ابحث أو اكتب اسم العميل...")}</span>
                                   </div>
                                   <ChevronDown className="h-5 w-5 opacity-30" />
                                </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent className="w-[400px] bg-white rounded-[2rem] p-4 shadow-3xl z-[300] border border-slate-100">
                                <div className="p-2 pb-4">
                                   <Input 
                                      placeholder="اكتب للبحث السريع..." 
                                      className="h-12 mb-2 rounded-xl border-none bg-slate-50 font-bold" 
                                      value={customerSearch} 
                                      onChange={e => setCustomerSearch(e.target.value)} 
                                   />
                                   <p className="text-[9px] font-bold text-slate-400 px-2 mt-2 italic">(يمكنك الكتابة مباشرة للعملاء غير المسجلين)</p>
                                </div>
                                <Separator className="mb-4 opacity-50" />
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                                   <DropdownMenuItem className="rounded-xl font-black h-12 gap-3" onClick={() => setSelectedCustomer(null)}>
                                      <UserCog className="h-5 w-5 text-slate-400" /> عميل عام (نقدي)
                                   </DropdownMenuItem>
                                   
                                   {/* Add New Customer Shortcut */}
                                   <Link href="/customers" className="block">
                                      <DropdownMenuItem className="rounded-xl font-black h-12 gap-3 text-primary bg-primary/5 hover:bg-primary/10 mb-2 cursor-pointer border border-primary/10">
                                         <UserPlus className="h-5 w-5" /> إضافة عميل جديد للنظام
                                      </DropdownMenuItem>
                                   </Link>

                                   {customers?.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                                     <DropdownMenuItem key={c.id} className="rounded-xl font-black h-12 gap-3 text-blue-600 bg-blue-50/30 mb-1" onClick={() => setSelectedCustomer(c)}>
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" /> {c.name}
                                     </DropdownMenuItem>
                                   ))}
                                </div>
                             </DropdownMenuContent>
                          </DropdownMenu>
                       </div>

                       <div className="space-y-3">
                          <Label className="font-black text-[10px] text-blue-500 uppercase tracking-widest px-2">الخصم</Label>
                          <Input 
                             type="number" 
                             className="h-14 bg-slate-50 border-none rounded-2xl text-center font-black text-red-500 text-xl" 
                             value={discount} 
                             onChange={e => setDiscount(Number(e.target.value))} 
                          />
                       </div>

                       <div className="space-y-3">
                          <Label className="font-black text-[10px] text-emerald-600 uppercase tracking-widest px-2">المدفوع</Label>
                          <Input 
                             type="number" 
                             className="h-14 bg-slate-50 border-none rounded-2xl text-center font-black text-emerald-600 text-xl" 
                             placeholder={total.toString()}
                             value={paidAmount} 
                             onChange={e => setPaidAmount(e.target.value === "" ? "" : Number(e.target.value))} 
                          />
                       </div>
                    </div>
                 </CardContent>
              </Card>
           </div>
        </main>

        {/* Confirmation Modal */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent dir="rtl" className="max-w-md bg-white border-none rounded-[3rem] p-10 shadow-3xl z-[350]">
             <DialogHeader>
                <div className="mx-auto h-20 w-20 rounded-[2.5rem] bg-blue-50 flex items-center justify-center text-blue-600 mb-6 shadow-inner">
                   <ShieldCheck className="h-10 w-10" />
                </div>
                <DialogTitle className="text-3xl font-black text-slate-800 text-center">تأكيد العملية</DialogTitle>
                <DialogDescription className="text-center font-bold text-slate-500 mt-2">يرجى التحقق من الحساب قبل الحفظ النهائي</DialogDescription>
             </DialogHeader>
             
             <div className="py-10 space-y-8">
                <div className="p-8 rounded-[2.5rem] bg-slate-50 text-center space-y-3 border border-slate-100 shadow-inner">
                   <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">المبلغ المستحق</span>
                   <p className="text-5xl font-black text-blue-600 tabular-nums leading-none">{total.toLocaleString()} دج</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="text-center p-5 rounded-[1.8rem] bg-emerald-50 border border-emerald-100">
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">المدفوع</span>
                      <p className="font-black text-xl text-emerald-700 tabular-nums">{finalPaid.toLocaleString()}</p>
                   </div>
                   <div className="text-center p-5 rounded-[1.8rem] bg-red-50 border border-red-100">
                      <span className="text-[10px] font-black text-red-600 uppercase tracking-widest block mb-1">المتبقي</span>
                      <p className="font-black text-xl text-red-700 tabular-nums">{debtAmount.toLocaleString()}</p>
                   </div>
                </div>
             </div>

             <DialogFooter className="flex flex-col gap-4">
                <Button 
                   onClick={handleProcessInvoice} 
                   disabled={isProcessing} 
                   className="w-full h-16 rounded-[2rem] bg-blue-600 text-white font-black text-xl shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] hover:bg-blue-700 transition-all gap-3"
                >
                   {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Printer className="h-6 w-6" />}
                   {editId ? "حفظ التعديلات" : "إصدار الفاتورة"}
                </Button>
                <Button variant="ghost" className="w-full h-12 rounded-xl font-bold text-slate-400 hover:text-slate-800" onClick={() => setShowPreview(false)}>إلغاء والعودة</Button>
             </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}
