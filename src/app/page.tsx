
"use client"

import * as React from "react"
import { 
  TrendingUp, 
  Package, 
  Users, 
  Wallet, 
  ArrowUpRight, 
  Loader2,
  Zap,
  LayoutGrid,
  ShoppingBag,
  Bell,
  ArrowDownRight,
  Search,
  Wrench,
  Tag,
  Edit3,
  Plus,
  Minus,
  Sparkles,
  PlusCircle,
  Smartphone,
  Info
} from "lucide-react"
import {
  ResponsiveContainer,
  Tooltip,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase"
import { collection, query, limit, orderBy, doc, serverTimestamp } from "firebase/firestore"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const chartData = [
  { name: "السبت", total: 45000 },
  { name: "الأحد", total: 52000 },
  { name: "الاثنين", total: 38000 },
  { name: "الثلاثاء", total: 61000 },
  { name: "الأربعاء", total: 59000 },
  { name: "الخميس", total: 72000 },
  { name: "الجمعة", total: 85000 },
]

const QuickEditItem = React.memo(({ product, db }: { product: any, db: any }) => {
  const [localQty, setLocalQty] = React.useState(product.quantity)
  const [localSalePrice, setLocalSalePrice] = React.useState(product.salePrice)
  const [localRepairPrice, setLocalRepairPrice] = React.useState(product.repairPrice || 0)

  React.useEffect(() => {
    setLocalQty(product.quantity)
    setLocalSalePrice(product.salePrice)
    setLocalRepairPrice(product.repairPrice || 0)
  }, [product.quantity, product.salePrice, product.repairPrice])

  const handleUpdate = React.useCallback((field: string, value: number) => {
    const productRef = doc(db, "products", product.id)
    updateDocumentNonBlocking(productRef, { [field]: value })
  }, [db, product.id])

  return (
    <div className="p-5 rounded-[2rem] glass border-white/10 flex flex-col md:flex-row items-center gap-4 group transition-colors duration-200">
       <div className="flex-1 min-w-[150px]">
          <p className="font-black text-sm text-foreground">{product.name}</p>
          <p className="text-[10px] text-primary font-black uppercase">{product.categoryPath || product.categoryName}</p>
          <p className="text-[10px] text-muted-foreground font-bold tabular-nums">#{product.productCode}</p>
       </div>
       
       <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
          <div className="space-y-1">
             <Label className="text-[8px] font-black text-primary uppercase">الكمية</Label>
             <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-primary/10" onClick={() => { const v = Number(localQty) - 1; setLocalQty(v); handleUpdate('quantity', v); }}><Minus className="h-3 w-3"/></Button>
                <Input type="number" className="h-8 w-12 text-center glass border-none font-bold p-0 text-xs" value={localQty} onChange={(e) => setLocalQty(e.target.value)} onBlur={(e) => handleUpdate('quantity', Number(e.target.value))} />
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-primary/10" onClick={() => { const v = Number(localQty) + 1; setLocalQty(v); handleUpdate('quantity', v); }}><Plus className="h-3 w-3"/></Button>
             </div>
          </div>
          <div className="space-y-1">
             <Label className="text-[8px] font-black text-emerald-500 uppercase">البيع</Label>
             <Input type="number" className="h-8 w-20 glass border-none font-bold text-xs" value={localSalePrice} onChange={(e) => setLocalSalePrice(e.target.value)} onBlur={(e) => handleUpdate('salePrice', Number(e.target.value))} />
          </div>
          <div className="space-y-1">
             <Label className="text-[8px] font-black text-accent uppercase">التصليح</Label>
             <Input type="number" className="h-8 w-20 glass border-none font-bold text-xs" value={localRepairPrice} onChange={(e) => setLocalRepairPrice(e.target.value)} onBlur={(e) => handleUpdate('repairPrice', Number(e.target.value))} />
          </div>
       </div>
    </div>
  )
})
QuickEditItem.displayName = "QuickEditItem"

const StatCard = React.memo(({ title, value, icon: Icon, color, badge, sub }: any) => (
  <Card className="glass-premium card-hover border-none rounded-[2.5rem]">
    <CardHeader className="pb-2">
      <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center mb-3 shadow-sm", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-black tabular-nums text-foreground">{value}</div>
      {(badge || sub) && (
        <div className="mt-2 flex items-center gap-2">
           {badge && <Badge variant="success" className="rounded-lg px-2 text-[9px]">{badge}</Badge>}
           {sub && <span className="text-[9px] text-muted-foreground font-bold">{sub}</span>}
        </div>
      )}
    </CardContent>
  </Card>
))
StatCard.displayName = "StatCard"

export default function Dashboard() {
  const db = useFirestore()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [showResults, setShowResults] = React.useState(false)
  const [quickEditSearch, setQuickEditSearch] = React.useState("")
  const [isQuickEditOpen, setIsQuickEditOpen] = React.useState(false)

  const [newName, setNewName] = React.useState("")
  const [newQty, setNewQty] = React.useState(0)
  const [newSalePrice, setNewSalePrice] = React.useState(0)
  const [newRepairPrice, setNewRepairPrice] = React.useState(0)
  const [isAdding, setIsAdding] = React.useState(false)

  const productsRef = useMemoFirebase(() => collection(db, "products"), [db])
  const customersRef = useMemoFirebase(() => collection(db, "customers"), [db])
  const invoicesRef = useMemoFirebase(() => collection(db, "invoices"), [db])
  
  const { data: products } = useCollection(productsRef)
  const { data: customers } = useCollection(customersRef)
  
  const recentInvoicesQuery = useMemoFirebase(() => query(invoicesRef, orderBy("createdAt", "desc"), limit(6)), [invoicesRef])
  const { data: recentInvoices, isLoading: isInvoicesLoading } = useCollection(recentInvoicesQuery)

  const filteredProducts = React.useMemo(() => {
    if (!searchTerm || !products) return []
    const term = searchTerm.toLowerCase()
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.productCode?.toLowerCase().includes(term) ||
      (p.categoryPath && p.categoryPath.toLowerCase().includes(term))
    ).slice(0, 5)
  }, [searchTerm, products])

  const quickEditProducts = React.useMemo(() => {
    if (!products) return []
    const term = quickEditSearch.toLowerCase()
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.productCode?.toLowerCase().includes(term) ||
      (p.categoryPath && p.categoryPath.toLowerCase().includes(term))
    ).slice(0, 10)
  }, [quickEditSearch, products])

  const stats = React.useMemo(() => ({
    totalSales: recentInvoices?.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0) || 0,
    lowStock: products?.filter(p => (p.quantity || 0) <= (p.minStockQuantity || 1)).length || 0,
    productCount: products?.length || 0,
    customerCount: customers?.length || 0
  }), [recentInvoices, products, customers])

  const handleQuickAdd = async () => {
    if (!newName || newSalePrice <= 0) { toast({ title: "خطأ", description: "بيانات ناقصة", variant: "destructive" }); return; }
    setIsAdding(true)
    try {
      await addDocumentNonBlocking(productsRef, { name: newName, productCode: `EP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`, quantity: Number(newQty), salePrice: Number(newSalePrice), repairPrice: Number(newRepairPrice), minStockQuantity: 1, categoryId: "quick", categoryName: "إضافة سريعة", categoryPath: "إضافة سريعة", createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      toast({ title: "تمت الإضافة" }); setNewName(""); setNewQty(0); setNewSalePrice(0); setNewRepairPrice(0)
    } finally { setIsAdding(false) }
  }

  return (
    <div className="min-h-screen bg-transparent animate-in fade-in duration-500">
      <header className="flex h-20 shrink-0 items-center justify-between px-10 glass sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg rotate-3">
             <Zap className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-black tracking-tighter text-gradient-premium uppercase">EXPRESS PHONE PRO</h1>
        </div>

        <div className="hidden md:flex flex-1 max-w-lg mx-8 relative">
           <div className="relative w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث عن منتج، ماركة، أو قسم..." className="pl-10 h-11 glass border-none rounded-xl font-bold text-xs" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setShowResults(true); }} onFocus={() => setShowResults(true)} />
           </div>
           {showResults && searchTerm && (
              <div className="absolute top-full left-0 right-0 mt-2 glass-premium border-white/10 rounded-2xl shadow-xl z-[60] overflow-hidden max-h-[400px] overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="p-8 text-center opacity-30 italic font-black text-xs">لا توجد نتائج مطابقة</div>
                ) : filteredProducts.map(p => (
                  <div key={p.id} className="p-4 hover:bg-primary/5 transition-all border-b border-black/5 last:border-0 flex items-center justify-between group">
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
                           <div className="flex flex-col gap-0.5 mt-1">
                              <span className="text-[9px] text-primary font-black uppercase tracking-tighter">{p.categoryPath || p.categoryName}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">#{p.productCode}</span>
                                <Badge variant={p.quantity <= 1 ? "destructive" : "success"} className="text-[8px] px-1.5 h-4 font-black">
                                  {p.quantity} متوفر
                                </Badge>
                              </div>
                           </div>
                        </div>
                     </div>
                     <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5">
                           <span className="text-[8px] font-black text-muted-foreground uppercase">بيع:</span>
                           <span className="text-sm font-black text-emerald-600 tabular-nums">{p.salePrice.toLocaleString()} دج</span>
                        </div>
                        {p.repairPrice > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-black text-muted-foreground uppercase">تصليح:</span>
                            <span className="text-[10px] font-black text-accent tabular-nums">{p.repairPrice.toLocaleString()} دج</span>
                          </div>
                        )}
                     </div>
                  </div>
                ))}
                {filteredProducts.length > 0 && (
                  <Link href="/products" className="block p-3 text-center bg-muted/30 hover:bg-muted text-[10px] font-black text-primary uppercase tracking-widest transition-colors">
                    عرض كافة المنتجات
                  </Link>
                )}
              </div>
           )}
        </div>

        <div className="flex items-center gap-4">
           <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl glass"><Bell className="h-4 w-4 text-muted-foreground" /></Button>
           <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent p-[1px] shadow-sm">
              <div className="h-full w-full rounded-[0.6rem] bg-card flex items-center justify-center font-black text-primary text-sm">AD</div>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 space-y-10">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="مبيعات الشهر" value={`${stats.totalSales.toLocaleString()} دج`} icon={Wallet} color="bg-primary/10 text-primary" badge="+12%" sub="مقارنة بالشهر الماضي" />
          <StatCard title="المخزون" value={stats.productCount} icon={Package} color="bg-accent/10 text-accent" badge={stats.lowStock > 0 ? `${stats.lowStock} تنبيه` : "مثالي"} />
          <StatCard title="العملاء" value={stats.customerCount} icon={Users} color="bg-emerald-500/10 text-emerald-600" />
          <Dialog open={isQuickEditOpen} onOpenChange={setIsQuickEditOpen}>
            <DialogTrigger asChild>
              <Card className="border-none bg-gradient-to-br from-[#3960AC] to-[#2a4580] text-white shadow-lg rounded-[2.5rem] p-4 cursor-pointer hover:scale-[1.01] transition-transform">
                <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-black flex items-center gap-2"><Edit3 className="h-4 w-4" /> تعديل سريع</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0 text-[10px] opacity-70">إدارة الكميات والأسعار لحظياً</CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-4xl glass border-none rounded-[3rem] shadow-2xl p-0 overflow-hidden z-[210]">
              <DialogHeader className="p-6 border-b border-black/5"><DialogTitle className="text-xl font-black text-gradient-premium">نافذة التعديل السريع</DialogTitle></DialogHeader>
              <div className="p-6 space-y-6">
                <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="md:col-span-2"><Label className="text-[10px] font-black mb-1 block">اسم المنتج</Label><Input placeholder="مثال: شاشة سامسونج A10..." className="h-10 text-xs" value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
                  <div><Label className="text-[10px] font-black mb-1 block">الكمية</Label><Input type="number" className="h-10 text-xs text-center" value={newQty} onChange={(e) => setNewQty(Number(e.target.value))} /></div>
                  <Button className="h-10 bg-primary text-white text-xs font-black" onClick={handleQuickAdd} disabled={isAdding}>{isAdding ? "جاري..." : "إضافة"}</Button>
                  <div className="md:col-span-2"><Label className="text-[10px] font-black mb-1 block">سعر البيع</Label><Input type="number" placeholder="0" className="h-10 text-xs" value={newSalePrice} onChange={(e) => setNewSalePrice(Number(e.target.value))} /></div>
                  <div className="md:col-span-2"><Label className="text-[10px] font-black mb-1 block">سعر التصليح</Label><Input type="number" placeholder="0" className="h-10 text-xs" value={newRepairPrice} onChange={(e) => setNewRepairPrice(Number(e.target.value))} /></div>
                </div>
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="ابحث لتعديل الموجود..." className="pl-10 h-12 text-sm" value={quickEditSearch} onChange={(e) => setQuickEditSearch(e.target.value)} /></div>
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                  {quickEditProducts.map(p => <QuickEditItem key={p.id} product={p} db={db} />)}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 border-none glass rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 pb-0"><CardTitle className="text-lg font-black">التحليل الأسبوعي</CardTitle></CardHeader>
            <CardContent className="p-8 pt-4">
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3960AC" stopOpacity={0.1}/><stop offset="95%" stopColor="#3960AC" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800}} />
                    <Area type="monotone" dataKey="total" stroke="#3960AC" strokeWidth={3} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3 border-none glass rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 border-b border-border"><CardTitle className="text-lg font-black">آخر العمليات</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentInvoices?.map((inv) => (
                  <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-card border border-border flex items-center justify-center text-primary"><ShoppingBag className="h-4 w-4" /></div>
                      <div><p className="text-[10px] font-black">#{inv.id.slice(0, 6)}</p><p className="text-[9px] text-muted-foreground font-bold">{inv.customerName}</p></div>
                    </div>
                    <p className="text-xs font-black text-primary">{inv.totalAmount.toLocaleString()} دج</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
