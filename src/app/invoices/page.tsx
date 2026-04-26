
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
  History,
  ShieldCheck,
  UserCog,
  ChevronDown,
  User,
  Star
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
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useUser, setDocumentNonBlocking } from "@/firebase"
import { collection, doc, serverTimestamp, increment, getDoc, getDocs, writeBatch, query, where } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { QRScannerDialog } from "@/components/qr-scanner-dialog"
import { SyncReconnectButton } from "@/components/sync-reconnect-button"
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

  const productsRef = useMemoFirebase(() => collection(db, "products"), [db])
  const customersRef = useMemoFirebase(() => collection(db, "customers"), [db])
  const { data: products } = useCollection(productsRef)
  const { data: customers } = useCollection(customersRef)

  // 1. Initial ID Setup & Edit Mode Loading
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
          
          // Set customer
          if (data.customerId && data.customerId !== 'walk-in') {
            const custDoc = await getDoc(doc(db, "customers", data.customerId));
            if (custDoc.exists()) {
              setSelectedCustomer({ id: custDoc.id, ...custDoc.data() });
            }
          } else {
            setCustomerSearch(data.customerName || "");
          }

          // Load Items
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
          setOriginalCart(JSON.parse(JSON.stringify(items))); // Clone for stock diff tracking
        }
      } catch (err) {
        console.error("Load Invoice Error:", err);
        toast({ title: "خطأ في جلب بيانات الفاتورة", variant: "destructive" });
      } finally {
        setIsLoadingInvoice(false);
      }
    };

    loadInvoiceData();
  }, [editId, db]);

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
      
      // If editing, handle previous state (reverse stock and debt)
      if (editId) {
        const oldInvSnap = await getDoc(targetDocRef);
        if (oldInvSnap.exists()) {
          const oldData = oldInvSnap.data();
          // Reverse old items stock
          const oldItemsSnap = await getDocs(collection(db, "invoices", editId, "items"));
          oldItemsSnap.docs.forEach(d => {
            const item = d.data();
            if (item.productId) {
              batch.update(doc(db, "products", item.productId), { quantity: increment(item.quantity) });
            }
            batch.delete(d.ref); // Delete old items to replace with new ones
          });

          // Reverse old debt
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
      
      // Cleanup
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
    <div className="min-h-screen bg-transparent pb-32">
        <QRScannerDialog open={isQRScannerOpen} onOpenChange={setIsQRScannerOpen} onScan={(c) => {const p = products?.find(x => x.productCode === c); if(p) addToCart(p); else playSystemSound('failure');}} />
        
        <header className="flex h-20 items-center justify-between border-b px-8 glass sticky top-0 z-50">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg">
                <Smartphone className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <h1 className="font-black text-lg tracking-tighter text-primary leading-none">نقطة البيع</h1>
                <span className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest">{editId ? `تعديل فاتورة #${editId.slice(0,8)}` : "فاتورة جديدة"}</span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
             <Button asChild variant="ghost" className="h-10 px-4 rounded-xl font-bold gap-2">
                <Link href="/invoices/history"><History className="h-4 w-4" /> السجل</Link>
             </Button>
             <SyncReconnectButton />
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-6">
              <Card className="border-none glass rounded-[2.5rem] p-6 md:p-8 shadow-xl">
                 <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="flex-1 relative group">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                       <Input 
                          placeholder="ابحث عن منتج بالاسم أو الباركود..." 
                          className="pl-12 h-14 rounded-2xl border-none glass font-bold text-sm shadow-inner" 
                          value={searchTerm} 
                          onChange={e => setSearchTerm(e.target.value)} 
                       />
                       {searchTerm && (
                        <div className="absolute top-full left-0 right-0 mt-3 glass-premium rounded-[1.5rem] shadow-2xl z-50 overflow-hidden border border-white/20">
                          {filteredProducts.length === 0 ? (
                            <div className="p-6 text-center text-muted-foreground font-bold italic">لا توجد نتائج</div>
                          ) : filteredProducts.map(p => (
                            <div key={p.id} className="p-4 hover:bg-primary/5 cursor-pointer border-b last:border-0 border-white/5 flex items-center justify-between group" onClick={() => addToCart(p)}>
                              <div className="flex items-center gap-3">
                                 <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
                                    {p.imageUrl ? <img src={p.imageUrl} className="h-full w-full object-cover rounded-xl" /> : <Package className="h-5 w-5 opacity-20" />}
                                 </div>
                                 <div className="flex flex-col">
                                    <p className="font-black text-sm group-hover:text-primary transition-colors">{p.name} {p.isPriority && <Star className="h-3 w-3 inline fill-yellow-400 text-yellow-400" />}</p>
                                    <p className="text-[10px] text-muted-foreground font-bold">#{p.productCode}</p>
                                 </div>
                              </div>
                              <div className="text-left">
                                 <p className="font-black text-sm text-primary tabular-nums">{p.salePrice.toLocaleString()} دج</p>
                                 <p className="text-[9px] font-bold text-emerald-600">متوفر: {p.quantity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                       )}
                    </div>
                    <Button onClick={() => setIsQRScannerOpen(true)} className="h-14 px-6 rounded-2xl bg-accent text-white shadow-lg gap-2 shrink-0">
                       <Camera className="h-6 w-6" /> <span className="hidden sm:inline">مسح الباركود</span>
                    </Button>
                 </div>

                 <div className="table-container min-h-[400px]">
                    <Table>
                       <TableHeader>
                          <TableRow className="border-white/10 hover:bg-transparent">
                             <TableHead className="font-black text-center">المنتج</TableHead>
                             <TableHead className="font-black text-center">الكمية</TableHead>
                             <TableHead className="font-black text-center">السعر</TableHead>
                             <TableHead className="font-black text-center">المجموع</TableHead>
                             <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                       </TableHeader>
                       <TableBody>
                          {cart.length === 0 ? (
                            <TableRow>
                               <TableCell colSpan={5} className="py-24 text-center">
                                  <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/10 mb-4" />
                                  <p className="text-sm font-black text-muted-foreground/40 italic">سلة المشتريات فارغة، ابدأ بإضافة المنتجات</p>
                               </TableCell>
                            </TableRow>
                          ) : cart.map(item => (
                            <TableRow key={item.productId} className="border-white/5 hover:bg-white/10 transition-colors">
                               <TableCell className="py-4">
                                  <div className="flex flex-col text-center">
                                     <span className="font-black text-xs md:text-sm">{item.name}</span>
                                     <span className="text-[9px] text-muted-foreground font-bold">{item.categoryPath}</span>
                                  </div>
                               </TableCell>
                               <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-2">
                                     <button className="h-7 w-7 rounded-lg bg-black/5 hover:bg-primary hover:text-white transition-colors flex items-center justify-center font-black" onClick={() => {
                                        if(item.qty > 1) setCart(cart.map(i => i.productId === item.productId ? {...i, qty: i.qty - 1} : i))
                                     }}>-</button>
                                     <span className="w-8 font-black tabular-nums text-center">{item.qty}</span>
                                     <button className="h-7 w-7 rounded-lg bg-black/5 hover:bg-primary hover:text-white transition-colors flex items-center justify-center font-black" onClick={() => {
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
                                  <div className="flex items-center justify-center gap-1 group/price">
                                    <Input 
                                      type="number" 
                                      className="h-9 w-24 glass border-none text-center font-black tabular-nums text-primary focus:ring-1 focus:ring-primary transition-all" 
                                      value={item.price} 
                                      onChange={(e) => {
                                        const val = e.target.value === "" ? 0 : Number(e.target.value);
                                        setCart(cart.map(i => i.productId === item.productId ? { ...i, price: val } : i))
                                      }} 
                                    />
                                    <span className="text-[8px] font-black opacity-30 group-hover/price:opacity-100 transition-opacity">دج</span>
                                  </div>
                               </TableCell>
                               <TableCell className="text-center font-black text-primary tabular-nums">{(item.price * item.qty).toLocaleString()} دج</TableCell>
                               <TableCell>
                                  <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => setCart(cart.filter(i => i.productId !== item.productId))}>
                                     <Trash2 className="h-4 w-4" />
                                  </Button>
                               </TableCell>
                            </TableRow>
                          ))}
                       </TableBody>
                    </Table>
                 </div>
              </Card>
           </div>
           
           <div className="lg:col-span-1 space-y-6">
              <Card className="border-none glass rounded-[2.5rem] p-8 shadow-xl">
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <Label className="font-black text-[10px] text-primary uppercase px-1">تحديد العميل</Label>
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                             <Button variant="outline" className="w-full h-12 rounded-xl glass border-none font-bold justify-between px-4">
                                <div className="flex items-center gap-2">
                                   <User className="h-4 w-4 text-primary" />
                                   <span>{selectedCustomer ? selectedCustomer.name : (customerSearch || "عميل عام")}</span>
                                </div>
                                <ChevronDown className="h-4 w-4 opacity-50" />
                             </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[300px] glass border-none rounded-2xl p-2 z-[300]">
                             <div className="p-2">
                                <Input 
                                   placeholder="ابحث عن عميل..." 
                                   className="h-10 mb-2 rounded-lg border-none bg-black/5" 
                                   value={customerSearch} 
                                   onChange={e => setCustomerSearch(e.target.value)} 
                                />
                             </div>
                             <DropdownMenuItem className="rounded-xl font-bold gap-2" onClick={() => setSelectedCustomer(null)}>
                                <UserCog className="h-4 w-4" /> عميل عام (نقدي)
                             </DropdownMenuItem>
                             {customers?.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 5).map(c => (
                               <DropdownMenuItem key={c.id} className="rounded-xl font-bold gap-2" onClick={() => setSelectedCustomer(c)}>
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {c.name}
                               </DropdownMenuItem>
                             ))}
                          </DropdownMenuContent>
                       </DropdownMenu>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <Label className="font-black text-[10px] text-primary uppercase px-1">الخصم (دج)</Label>
                          <Input type="number" className="h-12 glass border-none rounded-xl text-center font-black text-red-600" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
                       </div>
                       <div className="space-y-2">
                          <Label className="font-black text-[10px] text-primary uppercase px-1">المدفوع (دج)</Label>
                          <Input 
                             type="number" 
                             className="h-12 glass border-none rounded-xl text-center font-black text-emerald-600" 
                             placeholder={total.toString()}
                             value={paidAmount} 
                             onChange={e => setPaidAmount(e.target.value === "" ? "" : Number(e.target.value))} 
                          />
                       </div>
                    </div>

                    <Separator className="bg-white/10" />

                    <div className="space-y-3">
                       <div className="flex justify-between items-center px-1">
                          <span className="text-xs font-bold text-muted-foreground uppercase">المجموع الفرعي:</span>
                          <span className="font-black tabular-nums">{subtotal.toLocaleString()} دج</span>
                       </div>
                       {discount > 0 && (
                         <div className="flex justify-between items-center px-1">
                            <span className="text-xs font-bold text-red-500 uppercase">الخصم:</span>
                            <span className="font-black text-red-600 tabular-nums">-{discount.toLocaleString()} دج</span>
                         </div>
                       )}
                       <div className="flex justify-between items-center p-4 bg-primary/5 rounded-2xl border border-primary/10">
                          <span className="font-black text-primary text-sm uppercase">الإجمالي النهائي:</span>
                          <span className="text-2xl font-black text-primary tabular-nums">{total.toLocaleString()} دج</span>
                       </div>
                       
                       {debtAmount > 0 && (
                          <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-red-500" />
                                <span className="text-[10px] font-black text-red-600 uppercase">مبلغ المديونية:</span>
                             </div>
                             <span className="font-black text-red-600 tabular-nums">{debtAmount.toLocaleString()} دج</span>
                          </div>
                       )}
                    </div>

                    <Button 
                       className="w-full h-16 rounded-[1.5rem] bg-primary text-white text-lg font-black shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-transform gap-3"
                       disabled={cart.length === 0}
                       onClick={() => setShowPreview(true)}
                    >
                       <FileText className="h-6 w-6" /> {editId ? "حفظ التعديلات" : "تأكيد وطباعة الفاتورة"}
                    </Button>
                 </div>
              </Card>

              <Card className="border-none glass rounded-[2.5rem] p-6 shadow-lg bg-orange-500/5 border border-orange-500/10">
                 <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600 shrink-0">
                       <Info className="h-4 w-4" />
                    </div>
                    <p className="text-[10px] font-bold text-orange-800 leading-relaxed italic">
                       تأكد من اختيار العميل الصحيح عند تسجيل مبيعات بالدين لضمان دقة السجلات المالية.
                    </p>
                 </div>
              </Card>
           </div>
        </main>

        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent dir="rtl" className="max-w-md glass border-none rounded-[2.5rem] p-8 shadow-3xl z-[350]">
             <DialogHeader>
                <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 shadow-inner">
                   <ShieldCheck className="h-8 w-8" />
                </div>
                <DialogTitle className="text-2xl font-black text-gradient-premium text-center">تأكيد عملية البيع</DialogTitle>
                <DialogDescription className="text-center font-bold text-xs">يرجى مراجعة المبلغ الإجمالي قبل الحفظ النهائي</DialogDescription>
             </DialogHeader>
             
             <div className="py-8 space-y-6">
                <div className="p-6 rounded-[2rem] bg-black/5 text-center space-y-2">
                   <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">المبلغ المطلوب تحصيله</span>
                   <p className="text-4xl font-black text-primary tabular-nums">{total.toLocaleString()} دج</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="text-center p-3 rounded-xl bg-emerald-500/5">
                      <span className="text-[9px] font-black text-emerald-600 uppercase">المدفوع</span>
                      <p className="font-black tabular-nums">{finalPaid.toLocaleString()} دج</p>
                   </div>
                   <div className="text-center p-3 rounded-xl bg-red-500/5">
                      <span className="text-[9px] font-black text-red-600 uppercase">المتبقي</span>
                      <p className="font-black tabular-nums">{debtAmount.toLocaleString()} دج</p>
                   </div>
                </div>
             </div>

             <DialogFooter className="flex flex-col gap-3">
                <Button 
                   onClick={handleProcessInvoice} 
                   disabled={isProcessing} 
                   className="w-full h-14 rounded-2xl bg-primary text-white font-black text-lg shadow-xl shadow-primary/20"
                >
                   {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />}
                   {editId ? "تحديث وحفظ" : "تأكيد وإصدار الفاتورة"}
                </Button>
                <Button variant="ghost" className="w-full h-12 rounded-xl font-bold" onClick={() => setShowPreview(false)}>إلغاء</Button>
             </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}
