
"use client"

import * as React from "react"
import { 
  Plus, 
  Search, 
  ShoppingBag, 
  UserPlus, 
  QrCode, 
  Smartphone, 
  Wallet, 
  AlertTriangle, 
  Package, 
  TrendingUp, 
  ChevronLeft, 
  Zap, 
  Loader2,
  Edit3,
  Eye,
  EyeOff,
  Minus,
  Sparkles,
  Wrench,
  CheckCircle2,
  X,
  Camera
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase"
import { collection, query, limit, orderBy, doc, serverTimestamp } from "firebase/firestore"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { QRScannerDialog } from "@/components/qr-scanner-dialog"

// --- Components ---

const StatCard = ({ title, value, icon: Icon, color, subValue }: any) => (
  <Card className="border-none glass rounded-[2.5rem] shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] group">
    <CardContent className="p-6 flex items-center gap-4">
      <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-12", color)}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{title}</span>
        <span className="text-xl font-black tabular-nums text-foreground">{value}</span>
        {subValue && <span className="text-[9px] font-bold text-muted-foreground mt-1">{subValue}</span>}
      </div>
    </CardContent>
  </Card>
)

const QuickActionButton = ({ href, icon: Icon, label, color, onClick }: any) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3 p-6 h-full transition-all group">
      <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-xl transform group-hover:scale-110 group-hover:rotate-6 transition-transform", color)}>
        <Icon className="h-7 w-7" />
      </div>
      <span className="font-black text-sm text-foreground transition-colors group-hover:text-primary">{label}</span>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="glass rounded-[2.5rem] hover:bg-white/40 transition-all border-none hover:shadow-xl hover:-translate-y-1">
        {content}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className="glass rounded-[2.5rem] hover:bg-white/40 transition-all border-none hover:shadow-xl hover:-translate-y-1 text-right w-full">
      {content}
    </button>
  )
}

const QuickEditItem = React.memo(({ product, db, showPurchase }: { product: any, db: any, showPurchase: boolean }) => {
  const [localQty, setLocalQty] = React.useState(product.quantity)
  const [localSalePrice, setLocalSalePrice] = React.useState(product.salePrice)
  const [localPurchasePrice, setLocalPurchasePrice] = React.useState(product.purchasePrice || 0)
  const [localRepairPrice, setLocalRepairPrice] = React.useState(product.repairPrice || 0)

  // Update local states when product changes
  React.useEffect(() => {
    setLocalQty(product.quantity);
    setLocalSalePrice(product.salePrice);
    setLocalPurchasePrice(product.purchasePrice || 0);
    setLocalRepairPrice(product.repairPrice || 0);
  }, [product]);

  const handleUpdate = React.useCallback((field: string, value: number) => {
    const productRef = doc(db, "products", product.id)
    updateDocumentNonBlocking(productRef, { [field]: value })
  }, [db, product.id])

  return (
    <div className="p-4 rounded-2xl glass border-white/10 flex flex-col gap-4 hover:bg-white/20 transition-all animate-in fade-in zoom-in duration-300">
       <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-black text-sm text-foreground truncate">{product.name}</p>
            <p className="text-[9px] text-primary font-bold">{product.categoryPath || product.categoryName}</p>
          </div>
          <div className="flex items-center gap-1.5 bg-black/5 p-1 rounded-xl">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { const v = Math.max(0, localQty - 1); setLocalQty(v); handleUpdate('quantity', v); }}><Minus className="h-4 w-4"/></Button>
            <span className="w-8 text-center text-sm font-black tabular-nums">{localQty}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { const v = localQty + 1; setLocalQty(v); handleUpdate('quantity', v); }}><Plus className="h-4 w-4"/></Button>
          </div>
       </div>

       <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1">
             <Label className="text-[8px] font-black uppercase text-primary px-1">البيع</Label>
             <Input 
                type="number" 
                className="h-9 glass border-none rounded-xl text-xs font-black tabular-nums text-primary focus:ring-1 focus:ring-primary"
                value={localSalePrice}
                onChange={(e) => { const v = Number(e.target.value); setLocalSalePrice(v); handleUpdate('salePrice', v); }}
             />
          </div>
          <div className="space-y-1">
             <Label className="text-[8px] font-black uppercase text-muted-foreground px-1">التصليح</Label>
             <Input 
                type="number" 
                className="h-9 glass border-none rounded-xl text-xs font-black tabular-nums focus:ring-1 focus:ring-primary"
                value={localRepairPrice}
                onChange={(e) => { const v = Number(e.target.value); setLocalRepairPrice(v); handleUpdate('repairPrice', v); }}
             />
          </div>
          {showPurchase && (
            <div className="space-y-1 col-span-2 md:col-span-1">
               <Label className="text-[8px] font-black uppercase text-orange-600 px-1">الشراء</Label>
               <Input 
                  type="number" 
                  className="h-9 glass border-none rounded-xl text-xs font-black tabular-nums text-orange-600 focus:ring-1 focus:ring-orange-600"
                  value={localPurchasePrice}
                  onChange={(e) => { const v = Number(e.target.value); setLocalPurchasePrice(v); handleUpdate('purchasePrice', v); }}
               />
            </div>
          )}
       </div>
    </div>
  )
})
QuickEditItem.displayName = "QuickEditItem"

// --- Main Page ---

export default function Dashboard() {
  const db = useFirestore()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [quickEditSearch, setQuickEditSearch] = React.useState("")
  const [showPurchaseInEdit, setShowPurchaseInEdit] = React.useState(false)
  const [isQuickEditOpen, setIsQuickEditOpen] = React.useState(false)
  const [isQRScannerOpen, setIsQRScannerOpen] = React.useState(false)

  // Quick Add State
  const [qaName, setQaName] = React.useState("")
  const [qaCat, setQaCat] = React.useState("")
  const [qaQty, setQaQty] = React.useState(0)
  const [qaPurchase, setQaPurchase] = React.useState(0)
  const [qaSale, setQaSale] = React.useState(0)
  const [qaRepair, setQaRepair] = React.useState(0)
  const [isAdding, setIsAdding] = React.useState(false)

  // Data refs
  const productsRef = useMemoFirebase(() => collection(db, "products"), [db])
  const customersRef = useMemoFirebase(() => collection(db, "customers"), [db])
  const invoicesRef = useMemoFirebase(() => collection(db, "invoices"), [db])
  const categoriesRef = useMemoFirebase(() => collection(db, "categories"), [db])
  
  const { data: products } = useCollection(productsRef)
  const { data: customers } = useCollection(customersRef)
  const { data: categories } = useCollection(categoriesRef)
  
  const recentInvoicesQuery = useMemoFirebase(() => query(invoicesRef, orderBy("createdAt", "desc"), limit(5)), [invoicesRef])
  const { data: recentInvoices, isLoading: isInvoicesLoading } = useCollection(recentInvoicesQuery)

  // Memoized Stats
  const stats = React.useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0)
    const todaySales = recentInvoices?.filter(inv => {
      const date = inv.createdAt?.toDate ? inv.createdAt.toDate().setHours(0,0,0,0) : null
      return date === today
    }).reduce((acc, inv) => acc + (inv.totalAmount || 0), 0) || 0

    const screens = products?.filter(p => {
      const name = p.name.toLowerCase()
      const path = (p.categoryPath || "").toLowerCase()
      return name.includes("lcd") || name.includes("screen") || name.includes("شاشة") || name.includes("afficheur") || path.includes("شاشات")
    }) || []

    return {
      todaySales,
      productCount: products?.length || 0,
      lowStock: products?.filter(p => p.quantity <= (p.minStockQuantity || 1)).length || 0,
      totalDebt: customers?.reduce((acc, c) => acc + (c.debt || 0), 0) || 0,
      screensCount: screens.reduce((acc, p) => acc + (p.quantity || 0), 0),
      screensSaleVal: screens.reduce((acc, p) => acc + (p.salePrice * p.quantity), 0),
      screensPurchaseVal: screens.reduce((acc, p) => acc + ((p.purchasePrice || 0) * p.quantity), 0)
    }
  }, [recentInvoices, products, customers])

  const filteredProducts = React.useMemo(() => {
    if (!searchTerm || !products) return []
    const term = searchTerm.toLowerCase()
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || p.productCode?.toLowerCase().includes(term)
    ).slice(0, 5)
  }, [searchTerm, products])

  const quickEditProducts = React.useMemo(() => {
    if (!products) return []
    const term = quickEditSearch.toLowerCase()
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || p.productCode?.toLowerCase().includes(term)
    ).slice(0, 8)
  }, [quickEditSearch, products])

  const handleQuickAdd = async () => {
    if (!qaName || !qaCat || qaSale <= 0) {
      toast({ title: "خطأ", description: "يرجى ملء الاسم، التصنيف، وسعر البيع على الأقل", variant: "destructive" })
      return
    }

    setIsAdding(true)
    const selectedCat = categories?.find(c => c.id === qaCat)
    const code = `EP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    try {
      await addDocumentNonBlocking(productsRef, {
        name: qaName,
        productCode: code,
        categoryId: qaCat,
        categoryName: selectedCat?.name || "بدون تصنيف",
        categoryPath: selectedCat?.path?.replace(/\//g, ' > ').substring(1) || selectedCat?.name || "بدون تصنيف",
        quantity: Number(qaQty),
        purchasePrice: Number(qaPurchase),
        salePrice: Number(qaSale),
        repairPrice: Number(qaRepair),
        minStockQuantity: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      toast({ title: "تمت الإضافة", description: `تم إضافة ${qaName} بنجاح` })
      setQaName(""); setQaCat(""); setQaQty(0); setQaPurchase(0); setQaSale(0); setQaRepair(0);
    } catch (e) {
      console.error(e)
    } finally {
      setIsAdding(false)
    }
  }

  const handleQRScan = (code: string) => {
    const product = products?.find(p => p.productCode === code)
    if (product) {
      setQuickEditSearch(code)
      setIsQuickEditOpen(true)
      toast({ title: "تم العثور على المنتج", description: product.name })
    } else {
      toast({ title: "منتج غير معروف", description: `الكود: ${code} غير مسجل في النظام`, variant: "destructive" })
    }
  }

  const renderCategoryOptions = (cats: any[], parentId: string | null = null, depth = 0, currentPath = "") => {
    return cats
      .filter(c => c.parentId === parentId)
      .map(cat => {
        const fullPath = currentPath ? `${currentPath} > ${cat.name}` : cat.name;
        return (
          <React.Fragment key={cat.id}>
            <SelectItem value={cat.id} className={cn(depth > 0 && "pr-6")}>
              {fullPath}
            </SelectItem>
            {renderCategoryOptions(cats, cat.id, depth + 1, fullPath)}
          </React.Fragment>
        )
      })
  }

  return (
    <div className="min-h-screen bg-transparent pb-32 animate-in fade-in duration-700">
      <QRScannerDialog 
        open={isQRScannerOpen} 
        onOpenChange={setIsQRScannerOpen} 
        onScan={handleQRScan} 
      />

      {/* Header with Search */}
      <header className="flex h-20 shrink-0 items-center justify-between px-10 glass sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg rotate-3 transition-transform hover:rotate-0">
             <Smartphone className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-tighter text-gradient-premium leading-none">EXPRESS PHONE</h1>
            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Pro System</span>
          </div>
        </div>

        <div className="hidden md:flex flex-1 max-w-xl mx-8 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="ابحث عن منتج بالاسم أو الكود..." 
            className="pl-12 h-12 glass border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <div className="absolute top-full left-0 right-0 mt-3 glass-premium rounded-3xl shadow-2xl z-50 overflow-hidden border-white/20 animate-in slide-in-from-top-2">
              {filteredProducts.map(p => (
                <div key={p.id} className="p-4 hover:bg-primary/5 border-b last:border-0 border-white/5 flex items-center justify-between group transition-all">
                   <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-card border border-border flex items-center justify-center overflow-hidden">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <Smartphone className="h-6 w-6 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex flex-col">
                         <span className="font-black text-sm text-foreground group-hover:text-primary transition-colors">{p.name}</span>
                         <span className="text-[9px] text-primary font-black uppercase tracking-widest leading-none mt-1">{p.categoryPath || p.categoryName}</span>
                         <span className="text-[8px] text-muted-foreground font-bold mt-0.5">#{p.productCode}</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end gap-1">
                        <Badge 
                          variant={p.quantity <= 0 ? "destructive" : p.quantity <= (p.minStockQuantity || 1) ? "warning" : "success"} 
                          className="text-[9px] h-5 px-3 font-black rounded-lg"
                        >
                          {p.quantity <= 0 ? "غير متوفر" : `متوفر: ${p.quantity}`}
                        </Badge>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-muted-foreground tabular-nums">البيع: {p.salePrice.toLocaleString()} دج</span>
                        <span className="text-lg font-black text-primary tabular-nums leading-none mt-1">
                          {p.repairPrice.toLocaleString()} <span className="text-[10px] opacity-60">دج</span>
                        </span>
                        <span className="text-[8px] font-black text-primary/40 uppercase tracking-tighter">سعر التصليح</span>
                      </div>
                   </div>
                </div>
              ))}
              <Link href="/products" className="block p-3 text-center bg-muted/20 text-[10px] font-black text-primary uppercase hover:bg-muted/40">مشاهدة الكل</Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
           <Dialog open={isQuickEditOpen} onOpenChange={setIsQuickEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-11 w-11 rounded-2xl glass hover:scale-105 transition-transform" onClick={() => setIsQuickEditOpen(true)}>
                <Edit3 className="h-5 w-5 text-primary" />
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-4xl glass border-none rounded-[3rem] shadow-2xl p-0 overflow-hidden flex flex-col h-[90vh]">
               <div className="p-8 border-b border-white/5 flex items-center justify-between bg-primary/5">
                  <h2 className="text-xl font-black text-gradient-premium">الإدارة السريعة للمخزون</h2>
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" className="rounded-xl gap-2 font-bold text-xs" onClick={() => setShowPurchaseInEdit(!showPurchaseInEdit)}>
                      {showPurchaseInEdit ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} سعر الشراء
                    </Button>
                  </div>
               </div>
               
               {/* Quick Add Form Section */}
               <div className="p-8 border-b border-white/5 bg-primary/5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-1 bg-primary rounded-full" />
                    <p className="text-[11px] font-black text-primary uppercase tracking-widest">إضافة منتج جديد فورياً للمخزن</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black mr-2 text-muted-foreground uppercase">اسم المنتج</Label>
                      <Input placeholder="مثال: شاشة سامسونج A51" value={qaName} onChange={e => setQaName(e.target.value)} className="h-11 glass border-none rounded-xl font-bold" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black mr-2 text-muted-foreground uppercase">التصنيف</Label>
                      <Select value={qaCat} onValueChange={setQaCat}>
                        <SelectTrigger className="h-11 glass border-none rounded-xl font-bold text-right">
                          <SelectValue placeholder="اختر الفئة..." />
                        </SelectTrigger>
                        <SelectContent className="glass border-none rounded-xl z-[220]">
                            {categories && renderCategoryOptions(categories)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black mr-2 text-muted-foreground uppercase">الكمية الأولية</Label>
                      <Input type="number" placeholder="0" value={qaQty} onChange={e => setQaQty(Number(e.target.value))} className="h-11 glass border-none rounded-xl font-bold" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black mr-2 text-orange-600 uppercase">سعر الشراء</Label>
                      <Input type="number" placeholder="0" value={qaPurchase} onChange={e => setQaPurchase(Number(e.target.value))} className="h-11 glass border-none rounded-xl font-bold text-orange-600" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black mr-2 text-emerald-600 uppercase">سعر البيع</Label>
                      <Input type="number" placeholder="0" value={qaSale} onChange={e => setQaSale(Number(e.target.value))} className="h-11 glass border-none rounded-xl font-bold text-emerald-600" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black mr-2 text-primary uppercase">سعر التصليح</Label>
                      <Input type="number" placeholder="0" value={qaRepair} onChange={e => setQaRepair(Number(e.target.value))} className="h-11 glass border-none rounded-xl font-bold text-primary" />
                    </div>
                    <Button onClick={handleQuickAdd} disabled={isAdding} className="col-span-full h-12 rounded-xl bg-primary text-white font-black shadow-lg gap-2 hover:scale-[1.01] transition-transform">
                       {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                       حفظ وإضافة للمخزون
                    </Button>
                  </div>
               </div>

               <div className="p-8 flex-1 overflow-hidden flex flex-col gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="بحث سريع في القائمة للتعديل..." className="pl-10 h-12 glass border-none rounded-xl font-bold" value={quickEditSearch} onChange={(e) => setQuickEditSearch(e.target.value)} />
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                    {quickEditProducts.map(p => <QuickEditItem key={p.id} product={p} db={db} showPurchase={showPurchaseInEdit} />)}
                  </div>
               </div>
            </DialogContent>
           </Dialog>
           <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center font-black text-white text-sm shadow-lg animate-pulse">AD</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 space-y-10">
        
        {/* 1. Quick Actions - The Core Buttons */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          <QuickActionButton href="/invoices" icon={ShoppingBag} label="إنشاء فاتورة جديدة" color="bg-primary" />
          <QuickActionButton href="/products" icon={Plus} label="إضافة منتج" color="bg-accent" />
          <QuickActionButton href="/customers" icon={UserPlus} label="إضافة عميل" color="bg-emerald-500" />
          <QuickActionButton icon={QrCode} label="مسح QR" color="bg-orange-500" onClick={() => setIsQRScannerOpen(true)} />
        </section>

        {/* 2. Smart Summary - Daily Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-8 duration-700">
          <StatCard title="مبيعات اليوم" value={`${stats.todaySales.toLocaleString()} دج`} icon={TrendingUp} color="bg-emerald-500" />
          <StatCard title="إجمالي المنتجات" value={stats.productCount} icon={Package} color="bg-primary" />
          <StatCard title="مخزون منخفض" value={stats.lowStock} icon={AlertTriangle} color="bg-orange-500" subValue="بحاجة للتوريد قريباً" />
          <StatCard title="إجمالي الديون" value={`${stats.totalDebt.toLocaleString()} دج`} icon={Wallet} color="bg-red-500" />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 3. Screens Section - The Special Focus */}
          <div className="lg:col-span-2 flex flex-col gap-8 animate-in fade-in duration-1000">
             <Card className="border-none bg-gradient-to-br from-[#1e293b] to-[#0f172a] text-white rounded-[3rem] overflow-hidden shadow-2xl relative group">
                <div className="absolute top-0 right-0 p-8 opacity-5 transition-transform group-hover:scale-125 duration-700">
                   <Smartphone className="h-40 w-40 rotate-12" />
                </div>
                <CardHeader className="p-8 relative z-10">
                   <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 animate-bounce">
                         <Sparkles className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-xl font-black">إحصائيات الشاشات (الأكثر طلباً)</CardTitle>
                   </div>
                </CardHeader>
                <CardContent className="px-8 pb-8 relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="glass bg-white/5 border-white/5 p-5 rounded-3xl hover:bg-white/10 transition-colors">
                      <span className="text-[9px] font-black uppercase text-emerald-400">إجمالي القطع</span>
                      <p className="text-3xl font-black tabular-nums">{stats.screensCount} <span className="text-sm opacity-50">قطعة</span></p>
                   </div>
                   <div className="glass bg-white/5 border-white/5 p-5 rounded-3xl hover:bg-white/10 transition-colors">
                      <span className="text-[9px] font-black uppercase text-primary">قيمة البيع</span>
                      <p className="text-2xl font-black tabular-nums">{stats.screensSaleVal.toLocaleString()} <span className="text-xs opacity-50">دج</span></p>
                   </div>
                   <div className="glass bg-white/5 border-white/5 p-5 rounded-3xl hover:bg-white/10 transition-colors">
                      <span className="text-[9px] font-black uppercase text-orange-400">قيمة الشراء</span>
                      <p className="text-2xl font-black tabular-nums">{stats.screensPurchaseVal.toLocaleString()} <span className="text-xs opacity-50">دج</span></p>
                   </div>
                </CardContent>
             </Card>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none glass rounded-[2.5rem] p-6 hover:shadow-lg transition-all">
                   <div className="flex items-center justify-between mb-4">
                      <h3 className="font-black text-sm">نصيحة اليوم الذكية</h3>
                      <Zap className="h-4 w-4 text-orange-500 animate-pulse" />
                   </div>
                   <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                      {stats.lowStock > 0 
                        ? `لديك ${stats.lowStock} منتجات اقتربت من النفاد. ننصح بتوريد كميات جديدة لضمان استمرارية المبيعات.`
                        : "مستوى المخزون لديك ممتاز اليوم. ركز على ترويج المنتجات الأكثر ربحية مثل الشاشات الأصلية."
                      }
                   </p>
                </Card>
                <Card className="border-none bg-primary/10 rounded-[2.5rem] p-6 border border-primary/20 hover:shadow-lg transition-all">
                   <div className="flex items-center justify-between mb-4">
                      <h3 className="font-black text-sm text-primary">حالة الديون</h3>
                      <Wallet className="h-4 w-4 text-primary" />
                   </div>
                   <p className="text-xs text-primary/80 font-bold leading-relaxed">
                      إجمالي مبالغ الديون في السوق حالياً هو {stats.totalDebt.toLocaleString()} دج. تواصل مع العملاء المدينين لتسوية الحسابات.
                   </p>
                </Card>
             </div>
          </div>

          {/* 4. Recent Activity - Quick List */}
          <Card className="lg:col-span-1 border-none glass rounded-[3rem] overflow-hidden shadow-xl flex flex-col animate-in slide-in-from-right-8 duration-700">
            <CardHeader className="p-8 border-b border-white/5 bg-primary/5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-black">آخر المبيعات</CardTitle>
                <Button asChild variant="ghost" size="sm" className="text-[10px] font-black text-primary hover:bg-primary/5 rounded-xl">
                   <Link href="/invoices/history">عرض الكل</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="divide-y divide-white/5">
                {isInvoicesLoading ? (
                  <div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-20" /></div>
                ) : recentInvoices?.length === 0 ? (
                  <div className="p-10 text-center opacity-30 italic font-black text-xs">لا توجد مبيعات مؤخراً</div>
                ) : recentInvoices?.map((inv, idx) => (
                  <div key={inv.id} className="p-6 flex items-center justify-between hover:bg-white/30 transition-all group animate-in slide-in-from-top-2 duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-card border border-white/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-muted-foreground uppercase">#{inv.id.slice(0, 6)}</span>
                        <span className="font-black text-xs truncate max-w-[120px]">{inv.customerName}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className="font-black text-primary text-sm tabular-nums">{inv.totalAmount.toLocaleString()} دج</span>
                       {inv.status === "Debt" && <Badge className="text-[8px] h-4 bg-red-500/10 text-red-600 border-none">دين</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="p-6 bg-black/5 text-center">
               <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.3em] animate-pulse">Express Phone Pro &copy; 2026</p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
