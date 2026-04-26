
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
  User
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
import { collection, doc, serverTimestamp, increment, getDoc, getDocs, writeBatch } from "firebase/firestore"
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
  const isAdmin = role === "Admin"
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

  React.useEffect(() => {
    if (!editId && !pendingId) {
      setPendingId(doc(collection(db, "invoices")).id);
    }
  }, [editId, db, pendingId])

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
  const total = subtotal - discount
  const finalPaid = paidAmount === "" ? total : Number(paidAmount)
  const debtAmount = total - finalPaid

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.productCode.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5) || []

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.productId === product.id)
    const currentQtyInCart = existing ? existing.qty : 0
    const originalQtyInInv = originalCart.find(i => i.productId === product.id)?.qty || 0
    const availableStock = product.quantity + originalQtyInInv

    if (currentQtyInCart + 1 > availableStock) {
      toast({ title: "خطأ في المخزون", variant: "destructive" })
      playSystemSound('failure')
      return
    }

    if (existing) {
      setCart(cart.map(item => item.productId === product.id ? { ...item, qty: item.qty + 1 } : item))
    } else {
      setCart([...cart, { id: Math.random().toString(36).substring(7), productId: product.id, name: product.name, price: product.salePrice, qty: 1, categoryPath: product.categoryPath || product.categoryName }])
    }
    setSearchTerm("")
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
      const invoiceData: any = { customerId: selectedCustomer?.id || "walk-in", customerName: finalCustomerName, totalAmount: total, paidAmount: finalPaid, discount: discount, status: debtAmount > 0 ? "Debt" : "Paid", generatedByUserId: user.uid, generatedByUserName: username || "غير معرف", updatedAt: serverTimestamp() }
      if (!editId) invoiceData.createdAt = serverTimestamp();
      batch.set(targetDocRef, invoiceData, { merge: true });
      
      cart.forEach(item => {
        const newItemRef = doc(collection(db, "invoices", targetDocRef.id, "items"));
        batch.set(newItemRef, { invoiceId: targetDocRef.id, productId: item.productId, productName: item.name, quantity: item.qty, unitPrice: item.price, itemTotal: item.price * item.qty, generatedByUserId: user.uid, createdAt: serverTimestamp() });
        batch.update(doc(db, "products", item.productId), { quantity: increment(-item.qty), updatedAt: serverTimestamp() });
      });

      if (debtAmount > 0 && selectedCustomer && selectedCustomer.id !== 'walk-in') {
        batch.update(doc(db, "customers", selectedCustomer.id), { debt: increment(debtAmount), updatedAt: serverTimestamp() });
      }

      await batch.commit();
      toast({ title: "تم إصدار الفاتورة بنجاح" })
      playSystemSound('success')
      setCart([]); setSelectedCustomer(null); setCustomerSearch(""); setShowPreview(false); setPendingId(""); 
    } catch (error) {
      toast({ title: "خطأ في الحفظ", variant: "destructive" })
      playSystemSound('failure')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-transparent pb-32">
        <QRScannerDialog open={isQRScannerOpen} onOpenChange={setIsQRScannerOpen} onScan={(c) => {const p = products?.find(x => x.productCode === c); if(p) addToCart(p); else playSystemSound('failure');}} />
        <header className="flex h-20 items-center justify-between border-b px-8 glass sticky top-0 z-50">
          <Link href="/" className="flex items-center gap-2"><Smartphone className="h-6 w-6 text-primary" /><h1 className="font-black">نقطة البيع</h1></Link>
          <SyncReconnectButton />
        </header>

        <main className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-6">
              <Card className="border-none glass rounded-[2rem] p-8">
                 <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="ابحث عن منتج..." className="pl-12 h-12 rounded-2xl border-none glass font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    {searchTerm && (
                      <div className="absolute top-full left-0 right-0 mt-2 glass-premium rounded-2xl shadow-2xl z-50 overflow-hidden">
                        {filteredProducts.map(p => (
                          <div key={p.id} className="p-4 hover:bg-primary/5 cursor-pointer border-b last:border-0" onClick={() => addToCart(p)}>
                            <p className="font-black text-sm">{p.name} {p.isPriority && <Star className="h-3 w-3 inline fill-yellow-400 text-yellow-400" />}</p>
                            <p className="text-[10px] text-primary font-bold">{p.salePrice} دج - متوفر: {p.quantity}</p>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
                 <Table>
                    <TableBody>
                       {cart.map(item => (
                         <TableRow key={item.productId}>
                            <TableCell className="font-black text-sm">{item.name}</TableCell>
                            <TableCell className="text-center font-black tabular-nums text-primary">{item.qty}</TableCell>
                            <TableCell className="text-left font-black">{(item.price * item.qty).toLocaleString()} دج</TableCell>
                            <TableCell><Button variant="ghost" size="icon" onClick={() => setCart(cart.filter(i => i.productId !== item.productId))}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                         </TableRow>
                       ))}
                    </TableBody>
                 </Table>
              </Card>
           </div>
           
           <div className="lg:col-span-1">
              <Card className="border-none bg-primary text-white rounded-[3rem] p-8 space-y-6 shadow-2xl">
                 <div className="space-y-4">
                    <h3 className="text-xl font-black">الحساب النهائي</h3>
                    <div className="flex justify-between text-4xl font-black tabular-nums">{total.toLocaleString()} دج</div>
                    <Separator className="bg-white/20" />
                    <Button className="w-full h-14 rounded-2xl bg-white text-primary font-black text-lg" onClick={() => cart.length > 0 && setShowPreview(true)} disabled={cart.length === 0}>معاينة وطباعة</Button>
                 </div>
              </Card>
           </div>
        </main>

        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent dir="rtl" className="max-w-md glass border-none rounded-[2.5rem] p-8">
             <DialogHeader><DialogTitle className="text-center font-black">تأكيد العملية</DialogTitle></DialogHeader>
             <div className="py-6 space-y-4">
                <div className="p-6 rounded-2xl bg-black/5 text-center font-black text-3xl tabular-nums">{total.toLocaleString()} دج</div>
             </div>
             <DialogFooter><Button onClick={handleProcessInvoice} disabled={isProcessing} className="w-full h-14 rounded-2xl bg-primary text-white font-black text-lg">تأكيد وحفظ الفاتورة</Button></DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}
