
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
  UserPlus,
  AlertCircle,
  Save,
  Minus
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
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
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
  const [customerSearch, setCustomerSearch] = React.useState("") // For typed walk-in name
  const [listFilter, setListFilter] = React.useState("") // Dedicated for dropdown filtering
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
            setSelectedCustomer(null);
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

  const handleUpdateQty = (productId: string, newQty: number) => {
    const p = products?.find(x => x.id === productId);
    const originalQty = originalCart.find(o => o.productId === productId)?.qty || 0;
    const availableStock = (p?.quantity || 0) + originalQty;

    if (newQty > availableStock) {
      toast({ title: "خطأ في المخزون", description: "الكمية المطلوبة تتجاوز المتوفر", variant: "destructive" });
      return;
    }
    
    if (newQty < 1) return;

    setCart(cart.map(i => i.productId === productId ? { ...i, qty: newQty } : i));
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
      setListFilter("");
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
    <div className="min-h-screen bg-[#f8fafc] pb-32" dir="rtl">
        <QRScannerDialog open={isQRScannerOpen} onOpenChange={setIsQRScannerOpen} onScan={(c) => {const p = products?.find(x => x.productCode === c); if(p) addToCart(p); else playSystemSound('failure');}} />
        
        <header className="flex h-20 items-center justify-between px-6 md:px-10 bg-[#1e293b] text-white sticky top-0 z-[100] shadow-xl">
          <div className="flex items-center gap-4">
             {editId ? (
                <div className="bg-orange-500/20 border border-orange-500/30 text-orange-400 px-4 py-2 rounded-xl flex items-center gap-2 animate-pulse">
                   <Save className="h-4 w-4" />
                   <span className="text-xs font-black">وضع التعديل: #{editId.slice(0,8)}</span>
                </div>
             ) : (
                <Button asChild variant="outline" className="h-11 px-6 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white gap-2 font-bold transition-all">
                  <Link href="/debts"><Wallet className="h-4 w-4" /> إدارة الديون</Link>
                </Button>
             )}
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest">المسؤول</span>
                <span className="font-black text-sm text-blue-400">{username || "المدير"}</span>
                <div className="h-6 w-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                   <ShieldCheck className="h-4 w-4" />
                </div>
             </div>
             <Button asChild variant="ghost" size="icon" className="h-11 w-11 rounded-xl bg-white/5 hover:bg-white/10 text-white">
                <Link href="/invoices/history" title="سجل الفواتير"><History className="h-5 w-5" /></Link>
             </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col text-left items-end">
              <h1 className="font-black text-lg md:text-xl tracking-tighter text-blue-400 leading-none flex items-center gap-2 md:gap-3">
                 <span className="text-white opacity-40 text-[9px] font-bold uppercase tracking-widest mt-1 hidden sm:inline">SMART POINT OF SALE</span>
                 EXPRESS نقطة بيع
              </h1>
            </div>
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl rotate-3">
              <Smartphone className="h-6 w-6 md:h-7 md:w-7" />
            </div>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto p-4 md:p-10 grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-10">
           
           <div className="lg:col-span-3 space-y-8 order-1">
              
              <Card className="border-none bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
                 <div className="p-6 md:p-8 bg-[#334155] text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Package className="h-5 w-5 text-blue-400" />
                       <h3 className="text-lg md:text-xl font-black">إضافة المنتجات للسلة</h3>
                    </div>
                    <Button onClick={() => setIsQRScannerOpen(true)} className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 gap-2 font-bold text-xs transition-all">
                       <Camera className="h-4 w-4" /> مسح QR
                    </Button>
                 </div>

                 <CardContent className="p-6 md:p-10 space-y-8">
                    <div className="relative group">
                       <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                       <Input 
                          placeholder="ابحث بالاسم، الكود، أو الفئة..." 
                          className="pl-14 h-14 md:h-16 rounded-2xl border-none bg-slate-100 text-slate-900 placeholder:text-slate-400 font-bold text-base md:text-lg shadow-inner focus-visible:ring-2 focus-visible:ring-blue-500" 
                          value={searchTerm} 
                          onChange={e => setSearchTerm(e.target.value)} 
                       />
                       {searchTerm && (
                        <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-slate-100 divide-y divide-slate-50">
                          {filteredProducts.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 font-bold italic">لا توجد نتائج مطابقة</div>
                          ) : filteredProducts.map(p => (
                            <div key={p.id} className="p-4 md:p-5 hover:bg-blue-50 cursor-pointer flex items-center justify-between group transition-all" onClick={() => addToCart(p)}>
                              <div className="flex items-center gap-4">
                                 <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                    {p.imageUrl ? <img src={p.imageUrl} className="h-full w-full object-cover rounded-xl" /> : <Package className="h-6 w-6 opacity-20" />}
                                 </div>
                                 <div className="flex flex-col text-right">
                                    <p className="font-black text-sm md:text-base group-hover:text-blue-600 transition-colors">{p.name} {p.isPriority && <Star className="h-3 w-3 inline fill-yellow-400 text-yellow-400" />}</p>
                                    <p className="text-[10px] text-slate-400 font-bold">#{p.productCode} • {p.categoryName}</p>
                                 </div>
                              </div>
                              <div className="text-left">
                                 <p className="font-black text-base md:text-lg text-blue-600 tabular-nums">{Number(p.salePrice).toLocaleString()} دج</p>
                                 <p className={cn("text-[9px] font-black px-2 py-0.5 rounded-lg inline-block mt-1", p.quantity > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>المخزن: {p.quantity}</p>
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
                               <TableHead className="font-black text-slate-500 text-center uppercase tracking-widest text-[9px] md:text-[10px]">المنتج</TableHead>
                               <TableHead className="font-black text-slate-500 text-center uppercase tracking-widest text-[9px] md:text-[10px]">الكمية</TableHead>
                               <TableHead className="font-black text-slate-500 text-center uppercase tracking-widest text-[9px] md:text-[10px]">سعر البيع المخصص</TableHead>
                               <TableHead className="font-black text-slate-500 text-center uppercase tracking-widest text-[9px] md:text-[10px]">المجموع</TableHead>
                               <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                         </TableHeader>
                         <TableBody>
                            {cart.length === 0 ? (
                              <TableRow>
                                 <TableCell colSpan={5} className="py-32 text-center">
                                    <ShoppingBag className="h-16 w-16 mx-auto text-slate-100 mb-4" />
                                    <p className="text-sm font-black text-slate-300 italic uppercase tracking-widest">السلة فارغة، ابدأ بإضافة المنتجات</p>
                                 </TableCell>
                              </TableRow>
                            ) : cart.map(item => (
                              <TableRow key={item.productId} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                 <TableCell className="py-5">
                                    <div className="flex flex-col text-center">
                                       <span className="font-black text-sm text-slate-800">{item.name}</span>
                                       <span className="text-[9px] text-blue-500 font-bold uppercase tracking-tight opacity-60">{item.categoryPath}</span>
                                    </div>
                                 </TableCell>
                                 <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                                       <button className="h-7 w-7 rounded-lg bg-white shadow-sm hover:bg-red-500 hover:text-white transition-all flex items-center justify-center font-black" onClick={() => handleUpdateQty(item.productId, item.qty - 1)}><Minus className="h-3 w-3" /></button>
                                       <Input 
                                          type="number" 
                                          className="h-7 w-12 border-none bg-transparent text-center font-black text-sm tabular-nums p-0 focus-visible:ring-0"
                                          value={item.qty}
                                          onChange={(e) => handleUpdateQty(item.productId, Number(e.target.value))}
                                       />
                                       <button className="h-7 w-7 rounded-lg bg-white shadow-sm hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center font-black" onClick={() => handleUpdateQty(item.productId, item.qty + 1)}><Plus className="h-3 w-3" /></button>
                                    </div>
                                 </TableCell>
                                 <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-2 group/price">
                                      <Input 
                                        type="number" 
                                        className="h-9 w-24 bg-slate-50 border-none text-center font-black tabular-nums text-blue-600 focus:ring-1 focus:ring-blue-500 rounded-xl" 
                                        value={item.price} 
                                        onChange={(e) => {
                                          const val = e.target.value === "" ? 0 : Number(e.target.value);
                                          setCart(cart.map(i => i.productId === item.productId ? { ...i, price: val } : i))
                                        }} 
                                      />
                                      <span className="text-[10px] font-black opacity-20 group-hover/price:opacity-100 transition-opacity">دج</span>
                                    </div>
                                 </TableCell>
                                 <TableCell className="text-center font-black text-slate-900 text-base md:text-lg tabular-nums">{(item.price * item.qty).toLocaleString()} دج</TableCell>
                                 <TableCell>
                                    <Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors" onClick={() => setCart(cart.filter(i => i.productId !== item.productId))}>
                                       <Trash2 className="h-4 w-4" />
                                    </Button>
                                 </TableCell>
                              </TableRow>
                            ))}
                         </TableBody>
                      </Table>
                    </div>
                 </CardContent>
              </Card>

              <Card className="border-none bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
                 <div className="p-6 md:p-8 bg-[#334155] text-white">
                    <div className="flex items-center gap-3">
                       <User className="h-5 w-5 text-blue-400" />
                       <h3 className="text-lg md:text-xl font-black">العميل والمدفوعات</h3>
                    </div>
                 </div>
                 <CardContent className="p-8 md:p-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                       <div className="md:col-span-1 space-y-3">
                          <Label className="font-black text-[10px] text-slate-400 uppercase tracking-widest px-2">اختيار العميل</Label>
                          <DropdownMenu onOpenChange={(open) => { if(open) setListFilter(""); }}>
                             <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full h-14 rounded-2xl bg-slate-50 border-none font-black justify-between px-5 text-slate-700 shadow-inner group">
                                   <div className="flex items-center gap-3">
                                      <User className="h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform" />
                                      <span className="truncate max-w-[200px]">{selectedCustomer ? selectedCustomer.name : (customerSearch || "عميل عام (نقدي)")}</span>
                                   </div>
                                   <ChevronDown className="h-4 w-4 opacity-30" />
                                </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end" className="w-[300px] md:w-[400px] bg-white rounded-2xl p-4 shadow-3xl z-[300] border border-slate-100">
                                <div className="p-2 pb-4">
                                   <Input 
                                      placeholder="ابحث عن اسم العميل في القائمة..." 
                                      className="h-12 mb-2 rounded-xl border-none bg-slate-100 font-bold focus:ring-2 focus:ring-blue-500" 
                                      value={listFilter} 
                                      onChange={e => setListFilter(e.target.value)} 
                                   />
                                   <p className="text-[9px] font-bold text-slate-400 px-2 mt-2 italic">(استخدم البحث للعثور على العملاء المسجلين)</p>
                                </div>
                                <Separator className="mb-4 opacity-50" />
                                
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                                   <DropdownMenuItem className="rounded-xl font-black h-12 gap-3 cursor-pointer hover:bg-slate-50" onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }}>
                                      <UserCog className="h-5 w-5 text-slate-400" /> عميل عام (نقدي)
                                   </DropdownMenuItem>
                                   
                                   <Link href="/customers" className="block">
                                      <DropdownMenuItem className="rounded-xl font-black h-12 gap-3 text-primary bg-primary/5 hover:bg-primary/10 mb-2 cursor-pointer border border-primary/10 transition-all">
                                         <UserPlus className="h-5 w-5" /> إضافة عميل جديد للنظام
                                      </DropdownMenuItem>
                                   </Link>

                                   <Separator className="my-2 opacity-30" />

                                   {(customers || [])
                                     .filter(c => c.name.toLowerCase().includes(listFilter.toLowerCase()))
                                     .map(c => (
                                       <DropdownMenuItem 
                                          key={c.id} 
                                          className={cn(
                                            "rounded-xl font-black h-12 gap-3 mb-1 cursor-pointer transition-colors", 
                                            selectedCustomer?.id === c.id ? "bg-blue-600 text-white" : "text-blue-600 bg-blue-50/30 hover:bg-blue-100"
                                          )} 
                                          onClick={() => { setSelectedCustomer(c); setCustomerSearch(""); }}
                                       >
                                          <CheckCircle2 className={cn("h-5 w-5", selectedCustomer?.id === c.id ? "text-white" : "text-emerald-500")} /> 
                                          <span className="truncate">{c.name}</span>
                                       </DropdownMenuItem>
                                   ))}

                                   {(customers || []).length === 0 && (
                                      <div className="py-10 text-center opacity-30 italic font-black text-xs">لا يوجد عملاء مسجلين</div>
                                   )}
                                </div>
                                
                                <div className="p-3 mt-2 bg-slate-50 rounded-xl border border-slate-100">
                                   <Label className="text-[8px] font-black uppercase text-slate-400 mb-2 block">أو اكتب اسماً يدوياً للفاتورة:</Label>
                                   <Input 
                                      placeholder="اسم العميل اليدوي..." 
                                      className="h-10 rounded-lg border-none bg-white font-bold text-xs" 
                                      value={customerSearch} 
                                      onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null); }} 
                                   />
                                </div>
                             </DropdownMenuContent>
                          </DropdownMenu>
                       </div>

                       <div className="space-y-3">
                          <Label className="font-black text-[10px] text-blue-500 uppercase tracking-widest px-2">قيمة الخصم (دج)</Label>
                          <Input 
                             type="number" 
                             className="h-14 bg-slate-50 border-none rounded-2xl text-center font-black text-red-500 text-xl shadow-inner focus:ring-2 focus:ring-red-500" 
                             value={discount} 
                             onChange={e => setDiscount(Number(e.target.value))} 
                          />
                       </div>

                       <div className="space-y-3">
                          <Label className="font-black text-[10px] text-emerald-600 uppercase tracking-widest px-2">المبلغ المدفوع حالياً</Label>
                          <Input 
                             type="number" 
                             className="h-14 bg-slate-100 border-none rounded-2xl text-center font-black text-emerald-600 text-xl shadow-inner focus:ring-2 focus:ring-emerald-500" 
                             placeholder={total.toString()}
                             value={paidAmount} 
                             onChange={e => setPaidAmount(e.target.value === "" ? "" : Number(e.target.value))} 
                          />
                       </div>
                    </div>
                 </CardContent>
              </Card>
           </div>

           <div className="lg:col-span-1 order-2">
              <div className="lg:sticky lg:top-28 space-y-6">
                 <Card className="border-none bg-gradient-to-br from-[#2563eb] to-[#1e40af] text-white rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 shadow-2xl relative overflow-hidden h-full flex flex-col justify-between">
                    <div className="absolute -top-10 -right-10 opacity-5"><Smartphone className="h-64 w-64 rotate-12" /></div>
                    
                    <div className="relative z-10 space-y-8">
                       <div className="flex items-center justify-between border-b border-white/10 pb-4">
                          <h2 className="text-xl md:text-2xl font-black">الحساب النهائي</h2>
                          <Badge className="bg-white/20 text-white border-none font-black text-[10px]">REAL-TIME</Badge>
                       </div>

                       <div className="space-y-5">
                          <div className="flex justify-between items-center text-white/80">
                             <span className="text-xs md:text-sm font-bold">المجموع الفرعي:</span>
                             <span className="font-black tabular-nums">{subtotal.toLocaleString()} دج</span>
                          </div>
                          <div className="flex justify-between items-center text-white/80">
                             <span className="text-xs md:text-sm font-bold">المبلغ المدفوع:</span>
                             <span className="font-black tabular-nums">{finalPaid.toLocaleString()} دج</span>
                          </div>
                          {discount > 0 && (
                            <div className="flex justify-between items-center text-red-200">
                               <span className="text-xs md:text-sm font-bold">الخصم الممنوح:</span>
                               <span className="font-black tabular-nums">-{discount.toLocaleString()} دج</span>
                            </div>
                          )}
                          <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                             <span className="text-xs font-bold text-white/60">الموظف:</span>
                             <span className="font-black text-sm">{username || "غير معرف"}</span>
                          </div>
                       </div>
                    </div>

                    <div className="relative z-10 space-y-8 mt-12">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">الإجمالي المطلوب</p>
                          <div className="flex items-baseline gap-2">
                             <span className="text-5xl md:text-6xl font-black tabular-nums leading-none">{total.toLocaleString()}</span>
                             <span className="text-lg md:text-xl font-bold opacity-60">دج</span>
                          </div>
                       </div>

                       <Button 
                          onClick={() => setShowPreview(true)}
                          disabled={cart.length === 0}
                          className="w-full h-14 md:h-16 rounded-[1.5rem] md:rounded-3xl bg-white/20 backdrop-blur-md text-white border border-white/20 hover:bg-white/30 text-base md:text-lg font-black shadow-inner gap-3 transition-all"
                       >
                          معاينة وتأكيد الحفظ
                       </Button>
                    </div>
                 </Card>

                 <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-white shadow-xl flex items-start gap-4 border border-slate-100">
                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                       <Info className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">إرشادات</p>
                       <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic">يمكنك تعديل أسعار بيع القطع يدوياً في السلة لكل فاتورة على حدة دون تغيير السعر الأصلي.</p>
                    </div>
                 </div>
              </div>
           </div>
        </main>

        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent dir="rtl" className="max-w-md bg-white border-none rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 shadow-3xl z-[350]">
             <DialogHeader>
                <div className="mx-auto h-20 w-20 rounded-[2rem] bg-blue-50 flex items-center justify-center text-blue-600 mb-6 shadow-inner animate-in zoom-in duration-500">
                   {editId ? <Save className="h-10 w-10" /> : <ShieldCheck className="h-10 w-10" />}
                </div>
                <DialogTitle className="text-2xl md:text-3xl font-black text-slate-800 text-center">
                   {editId ? "حفظ التعديلات النهائية" : "تأكيد إصدار الفاتورة"}
                </DialogTitle>
                <DialogDescription className="text-center font-bold text-slate-500 mt-2">
                   يرجى مراجعة الحسابات بدقة قبل الحفظ في السجل.
                </DialogDescription>
             </DialogHeader>
             
             <div className="py-8 space-y-6">
                <div className="p-6 md:p-8 rounded-[2rem] bg-slate-50 text-center space-y-2 border border-slate-100 shadow-inner">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">المبلغ الصافي المستحق</span>
                   <p className="text-4xl md:text-5xl font-black text-blue-600 tabular-nums leading-none">{total.toLocaleString()} دج</p>
                </div>

                <div className="grid grid-cols-2 gap-4 md:gap-6">
                   <div className="text-center p-4 rounded-[1.5rem] bg-emerald-50 border border-emerald-100">
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-1">المدفوع</span>
                      <p className="font-black text-lg md:text-xl text-emerald-700 tabular-nums">{finalPaid.toLocaleString()}</p>
                   </div>
                   <div className="text-center p-4 rounded-[1.5rem] bg-red-50 border border-red-100">
                      <span className="text-[9px] font-black text-red-600 uppercase tracking-widest block mb-1">المتبقي (دين)</span>
                      <p className="font-black text-lg md:text-xl text-red-700 tabular-nums">{debtAmount.toLocaleString()}</p>
                   </div>
                </div>

                {debtAmount > 0 && selectedCustomer && (
                   <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-600 shrink-0" />
                      <p className="text-[10px] font-bold text-orange-800 leading-tight">سيتم إضافة مبلغ {debtAmount.toLocaleString()} دج إلى دين العميل {selectedCustomer.name}.</p>
                   </div>
                )}
             </div>

             <DialogFooter className="flex flex-col gap-4">
                <Button 
                   onClick={handleProcessInvoice} 
                   disabled={isProcessing} 
                   className="w-full h-14 md:h-16 rounded-[1.5rem] md:rounded-[2rem] bg-blue-600 text-white font-black text-lg md:text-xl shadow-[0_15px_30px_-10px_rgba(37,99,235,0.4)] hover:bg-blue-700 transition-all gap-3 active:scale-95"
                >
                   {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Printer className="h-6 w-6" />}
                   {editId ? "تحديث وحفظ التعديلات" : "تأكيد وطباعة الفاتورة"}
                </Button>
                <Button variant="ghost" className="w-full h-12 rounded-xl font-bold text-slate-400 hover:text-slate-800" onClick={() => setShowPreview(false)}>إلغاء والعودة للسلة</Button>
             </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}
