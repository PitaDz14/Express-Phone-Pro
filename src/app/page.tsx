
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
  Sparkles
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
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, limit, orderBy, doc } from "firebase/firestore"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

const chartData = [
  { name: "السبت", total: 45000 },
  { name: "الأحد", total: 52000 },
  { name: "الاثنين", total: 38000 },
  { name: "الثلاثاء", total: 61000 },
  { name: "الأربعاء", total: 59000 },
  { name: "الخميس", total: 72000 },
  { name: "الجمعة", total: 85000 },
]

// مكون فرعي لكل منتج في نافذة التعديل السريع لضمان عمل الأزرار والحقول بدقة
function QuickEditItem({ product, db }: { product: any, db: any }) {
  const [localQty, setLocalQty] = React.useState(product.quantity)
  const [localSalePrice, setLocalSalePrice] = React.useState(product.salePrice)
  const [localRepairPrice, setLocalRepairPrice] = React.useState(product.repairPrice || 0)

  // مزامنة الحالة المحلية مع قاعدة البيانات عند حدوث تحديث خارجي
  React.useEffect(() => {
    setLocalQty(product.quantity)
    setLocalSalePrice(product.salePrice)
    setLocalRepairPrice(product.repairPrice || 0)
  }, [product.quantity, product.salePrice, product.repairPrice])

  const handleUpdate = (field: string, value: number) => {
    const productRef = doc(db, "products", product.id)
    updateDocumentNonBlocking(productRef, { [field]: value })
  }

  return (
    <div className="p-6 rounded-[2rem] glass border-white/20 flex flex-col md:flex-row items-center gap-6 group hover:bg-white/50 transition-all">
       <div className="flex-1 min-w-[200px]">
          <p className="font-black text-base">{product.name}</p>
          <p className="text-[10px] text-muted-foreground font-bold tabular-nums">#{product.productCode} | متاح حالياً: {product.quantity}</p>
       </div>
       
       <div className="grid grid-cols-3 gap-4 w-full md:w-auto">
          <div className="space-y-1">
             <Label className="text-[9px] font-black text-primary uppercase px-1">الكمية</Label>
             <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" size="icon" 
                  className="h-9 w-9 rounded-xl bg-primary/10 hover:bg-primary hover:text-white transition-colors"
                  onClick={() => {
                    const newQty = Number(localQty) - 1
                    setLocalQty(newQty)
                    handleUpdate('quantity', newQty)
                  }}
                >
                  <Minus className="h-4 w-4"/>
                </Button>
                <Input 
                  type="number" 
                  className="h-10 w-16 text-center glass border-none font-black tabular-nums p-0" 
                  value={localQty}
                  onChange={(e) => setLocalQty(e.target.value)}
                  onBlur={(e) => handleUpdate('quantity', Number(e.target.value))} 
                />
                <Button 
                  variant="ghost" size="icon" 
                  className="h-9 w-9 rounded-xl bg-primary/10 hover:bg-primary hover:text-white transition-colors"
                  onClick={() => {
                    const newQty = Number(localQty) + 1
                    setLocalQty(newQty)
                    handleUpdate('quantity', newQty)
                  }}
                >
                  <Plus className="h-4 w-4"/>
                </Button>
             </div>
          </div>
          
          <div className="space-y-1">
             <Label className="text-[9px] font-black text-emerald-600 uppercase px-1">سعر البيع</Label>
             <Input 
               type="number" 
               className="h-10 w-28 glass border-none font-black tabular-nums text-emerald-700" 
               value={localSalePrice}
               onChange={(e) => setLocalSalePrice(e.target.value)}
               onBlur={(e) => handleUpdate('salePrice', Number(e.target.value))} 
             />
          </div>

          <div className="space-y-1">
             <Label className="text-[9px] font-black text-accent uppercase px-1">سعر التصليح</Label>
             <Input 
               type="number" 
               className="h-10 w-28 glass border-none font-black tabular-nums text-primary" 
               value={localRepairPrice}
               onChange={(e) => setLocalRepairPrice(e.target.value)}
               onBlur={(e) => handleUpdate('repairPrice', Number(e.target.value))} 
             />
          </div>
       </div>
    </div>
  )
}

export default function Dashboard() {
  const db = useFirestore()
  const { toast } = useToast()
  const [mounted, setMounted] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [showResults, setShowResults] = React.useState(false)
  
  // Quick Edit States
  const [quickEditSearch, setQuickEditSearch] = React.useState("")
  const [isQuickEditOpen, setIsQuickEditOpen] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])
  
  const productsRef = useMemoFirebase(() => collection(db, "products"), [db])
  const customersRef = useMemoFirebase(() => collection(db, "customers"), [db])
  const invoicesRef = useMemoFirebase(() => collection(db, "invoices"), [db])
  
  const { data: products } = useCollection(productsRef)
  const { data: customers } = useCollection(customersRef)
  const { data: recentInvoices, isLoading: isInvoicesLoading } = useCollection(
    useMemoFirebase(() => query(invoicesRef, orderBy("createdAt", "desc"), limit(8)), [invoicesRef])
  )

  const filteredProducts = React.useMemo(() => {
    if (!searchTerm || !products) return []
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.productCode?.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5)
  }, [searchTerm, products])

  const quickEditProducts = React.useMemo(() => {
    if (!quickEditSearch || !products) return products?.slice(0, 8) || []
    return products.filter(p => 
      p.name.toLowerCase().includes(quickEditSearch.toLowerCase()) || 
      p.productCode?.toLowerCase().includes(quickEditSearch.toLowerCase())
    ).slice(0, 15)
  }, [quickEditSearch, products])

  const totalSalesMonth = recentInvoices?.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0) || 0
  const lowStockCount = products?.filter(p => (p.quantity || 0) <= (p.minStockQuantity || 5)).length || 0

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-transparent">
      <header className="flex h-24 shrink-0 items-center justify-between px-10 glass sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-xl rotate-3">
             <Zap className="h-7 w-7" />
          </div>
          <div className="flex flex-col">
             <h1 className="text-2xl font-black tracking-tighter text-gradient-premium uppercase">EXPRESS PHONE PRO</h1>
             <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">نظام الإدارة الذكي By Khaled_Deragha</p>
          </div>
        </div>

        {/* Quick Search Bar */}
        <div className="hidden md:flex flex-1 max-w-xl mx-12 relative">
           <div className="relative w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="بحث سريع عن منتج (الاسم أو الكود)..." 
                className="pl-12 h-14 glass border-none shadow-inner rounded-2xl font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setShowResults(true)
                }}
                onFocus={() => setShowResults(true)}
              />
           </div>

           {showResults && searchTerm && (
              <div className="absolute top-full left-0 right-0 mt-3 glass-premium border-white/20 rounded-[2rem] shadow-2xl z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-black/5 bg-primary/5 flex items-center justify-between">
                   <span className="text-[10px] font-black text-primary uppercase tracking-widest">نتائج البحث</span>
                   <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setShowResults(false)}>
                      <Zap className="h-3 w-3" />
                   </Button>
                </div>
                {filteredProducts.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground font-bold italic text-sm">لا توجد نتائج مطابقة</div>
                ) : filteredProducts.map(p => (
                  <div key={p.id} className="p-5 hover:bg-white/60 transition-colors border-b border-black/5 last:border-0">
                     <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col">
                           <span className="font-black text-base">{p.name}</span>
                           <span className="text-[10px] text-muted-foreground font-bold uppercase">#{p.productCode}</span>
                        </div>
                        <Badge variant={p.quantity <= (p.minStockQuantity || 5) ? "destructive" : "success"} className="rounded-xl px-4 py-1 font-black tabular-nums">
                           {p.quantity} متوفر
                        </Badge>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="glass bg-emerald-500/5 p-3 rounded-2xl flex items-center gap-3">
                           <Tag className="h-4 w-4 text-emerald-600" />
                           <div className="flex flex-col">
                              <span className="text-[8px] font-black text-muted-foreground uppercase">سعر البيع</span>
                              <span className="font-black text-sm text-emerald-700 tabular-nums">{p.salePrice?.toLocaleString()} دج</span>
                           </div>
                        </div>
                        <div className="glass bg-primary/5 p-3 rounded-2xl flex items-center gap-3">
                           <Wrench className="h-4 w-4 text-primary" />
                           <div className="flex flex-col">
                              <span className="text-[8px] font-black text-muted-foreground uppercase">سعر التصليح</span>
                              <span className="font-black text-sm text-primary tabular-nums">{(p.repairPrice || 0)?.toLocaleString()} دج</span>
                           </div>
                        </div>
                     </div>
                  </div>
                ))}
              </div>
           )}
        </div>

        <div className="flex items-center gap-6">
           <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl relative glass">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-3 right-3 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white" />
           </Button>
           <div className="flex items-center gap-4 pl-4 border-r pr-6">
              <div className="flex flex-col items-end">
                 <span className="text-sm font-black">المشرف العام</span>
                 <Badge variant="success" className="h-5 text-[9px] font-black px-3 rounded-lg">Admin Pro</Badge>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-accent p-[2px] shadow-lg">
                 <div className="h-full w-full rounded-[1.2rem] bg-white flex items-center justify-center font-black text-primary text-lg">
                   AD
                 </div>
              </div>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 space-y-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-premium card-hover border-none rounded-[2.5rem]">
            <CardHeader className="pb-2">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                <Wallet className="h-6 w-6" />
              </div>
              <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest">مبيعات الشهر</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black tabular-nums">{totalSalesMonth.toLocaleString()} دج</div>
              <div className="mt-4 flex items-center gap-2">
                 <Badge variant="success" className="rounded-lg px-2 text-[10px]">+12%</Badge>
                 <span className="text-[10px] text-muted-foreground font-bold">مقارنة بالشهر الماضي</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-premium card-hover border-none rounded-[2.5rem]">
            <CardHeader className="pb-2">
              <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-4">
                <Package className="h-6 w-6" />
              </div>
              <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest">أصناف المخزون</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black tabular-nums">{products?.length || 0}</div>
              <div className="mt-4">
                {lowStockCount > 0 ? (
                  <Badge variant="warning" className="rounded-lg px-3 text-[10px]">{lowStockCount} بحاجة لتوريد</Badge>
                ) : (
                  <Badge variant="success" className="rounded-lg px-3 text-[10px]">المخزون مثالي</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-premium card-hover border-none rounded-[2.5rem]">
            <CardHeader className="pb-2">
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                <Users className="h-6 w-6" />
              </div>
              <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest">إجمالي العملاء</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black tabular-nums">{customers?.length || 0}</div>
              <div className="mt-4 flex items-center gap-2">
                 <div className="h-1 flex-1 bg-emerald-100 rounded-full">
                    <div className="h-full bg-emerald-500 w-[75%]" />
                 </div>
              </div>
            </CardContent>
          </Card>

          <Dialog open={isQuickEditOpen} onOpenChange={setIsQuickEditOpen}>
            <DialogTrigger asChild>
              <Card className="border-none bg-gradient-to-br from-[#3960AC] to-[#2a4580] text-white shadow-2xl rounded-[2.5rem] p-4 flex flex-col justify-between cursor-pointer group hover:scale-[1.02] transition-all">
                <CardHeader>
                  <CardTitle className="text-lg font-black leading-tight flex items-center gap-2">
                    <Edit3 className="h-5 w-5" /> التعديل السريع على المخزون
                  </CardTitle>
                  <CardDescription className="text-white/60 text-[10px] font-bold">إضافة أو تعديل كميات وأسعار المنتجات بسرعة.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full h-12 rounded-2xl bg-white text-primary font-black hover:bg-white/90">
                    بدء التعديل السريع
                  </Button>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-4xl glass border-none rounded-[3rem] shadow-2xl p-0 overflow-hidden z-[210]">
              <DialogHeader className="p-8 bg-gradient-to-r from-primary/10 to-accent/10 border-b border-black/5">
                <DialogTitle className="text-2xl font-black text-gradient-premium flex items-center gap-3">
                   <Sparkles className="h-6 w-6" /> نافذة التعديل السريع واللحظي
                </DialogTitle>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">يتم حفظ التعديلات تلقائياً بمجرد تغيير القيم | Khaled_Deragha</p>
              </DialogHeader>
              <div className="p-8 space-y-6">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input 
                    placeholder="ابحث باسم المنتج أو الكود للبدء بالتعديل..." 
                    className="pl-12 h-14 glass border-none shadow-inner rounded-2xl font-bold" 
                    value={quickEditSearch}
                    onChange={(e) => setQuickEditSearch(e.target.value)}
                  />
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {quickEditProducts.length === 0 ? (
                    <div className="py-20 text-center opacity-30 italic font-black">لا توجد منتجات مطابقة للبحث</div>
                  ) : quickEditProducts.map(p => (
                    <QuickEditItem key={p.id} product={p} db={db} />
                  ))}
                </div>
              </div>
              <div className="p-6 bg-black/5 text-center">
                 <Button className="rounded-2xl px-12 h-12 font-black" onClick={() => setIsQuickEditOpen(false)}>إغلاق النافذة</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 border-none glass-premium rounded-[3rem] overflow-hidden">
            <CardHeader className="p-10 pb-0">
              <CardTitle className="text-xl font-black tracking-tight">تحليل المبيعات الأسبوعي</CardTitle>
            </CardHeader>
            <CardContent className="p-10 pt-8">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3960AC" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3960AC" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#64748b'}} />
                    <Area type="monotone" dataKey="total" stroke="#3960AC" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3 border-none glass-premium rounded-[3rem] overflow-hidden">
            <CardHeader className="p-10 border-b border-black/5">
              <CardTitle className="text-xl font-black tracking-tight">آخر العمليات</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-black/5">
                {isInvoicesLoading ? (
                  <div className="p-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
                ) : recentInvoices?.map((inv) => (
                  <div key={inv.id} className="p-6 flex items-center justify-between hover:bg-primary/5 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-white border flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black"># {inv.id.slice(0, 8)}</p>
                        <p className="text-[10px] text-muted-foreground font-bold">{inv.customerName}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-primary">{(inv.totalAmount || 0).toLocaleString()} دج</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <footer className="pt-20 pb-10 text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
                <div className="h-px w-12 bg-primary/10" />
                <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">Express Phone Pro</span>
                <div className="h-px w-12 bg-primary/10" />
            </div>
            <p className="text-[11px] font-bold text-muted-foreground/60">
                جميع الحقوق محفوظة &copy; {new Date().getFullYear()} - تم التطوير بواسطة <span className="text-primary font-black">Khaled_Deragha</span>
            </p>
        </footer>
      </main>
    </div>
  )
}
