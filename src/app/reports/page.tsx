
"use client"

import * as React from "react"
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Printer,
  Loader2,
  Package,
  Wallet,
  Target,
  AlertTriangle,
  Layers,
  Smartphone
} from "lucide-react"
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell,
  Line,
  LineChart,
  CartesianGrid,
  Area,
  AreaChart
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"

export default function ReportsPage() {
  const db = useFirestore()
  const invoicesRef = useMemoFirebase(() => collection(db, "invoices"), [db])
  const productsRef = useMemoFirebase(() => collection(db, "products"), [db])
  const categoriesRef = useMemoFirebase(() => collection(db, "categories"), [db])
  
  const { data: invoices, isLoading: isInvoicesLoading } = useCollection(invoicesRef)
  const { data: products } = useCollection(productsRef)
  const { data: categories } = useCollection(categoriesRef)

  const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0) || 0
  const totalSalesCount = invoices?.length || 0
  const lowStockCount = products?.filter(p => (p.quantity || 0) <= (p.minStockQuantity || 5)).length || 0

  const categoryStats = React.useMemo(() => {
    if (!products || !categories) return []
    return categories.map(cat => {
      const count = products.filter(p => p.categoryId === cat.id).length
      const value = products.filter(p => p.categoryId === cat.id).reduce((sum, p) => sum + (p.salePrice * p.quantity), 0)
      return { ...cat, count, value }
    }).filter(s => s.count > 0).sort((a, b) => b.value - a.value)
  }, [products, categories])

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 pb-32">
        <header className="flex h-20 shrink-0 items-center justify-between border-b px-8 glass sticky top-0 z-50 no-print rounded-[2rem]">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#3960AC] to-[#3CC2DD] flex items-center justify-center text-white shadow-lg transform -rotate-3">
                <Smartphone className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-tighter text-[#3960AC]">EXPRESS</span>
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Phone Pro</span>
              </div>
            </div>
            <div className="h-8 w-px bg-black/5" />
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-gradient">مركز التقارير والذكاء المالي</h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">بواسطة المطور Khaled_Deragha</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="glass h-11 rounded-2xl px-5 font-bold gap-2">
              <Download className="h-4 w-4" /> تصدير
            </Button>
            <Button className="h-11 rounded-2xl px-5 bg-primary text-white shadow-lg font-black gap-2">
              <Printer className="h-4 w-4" /> طباعة
            </Button>
          </div>
        </header>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Card className="card-3d border-none glass overflow-hidden relative group">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black text-primary flex items-center gap-2 uppercase tracking-tighter">
                  <Wallet className="h-4 w-4" /> إجمالي الإيرادات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tabular-nums">{(totalRevenue || 0).toLocaleString()} دج</div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-2">
                   <ArrowUpRight className="h-3 w-3" /> +14.5% نمو
                </div>
              </CardContent>
            </Card>

            <Card className="card-3d border-none glass overflow-hidden relative group">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black text-accent flex items-center gap-2 uppercase tracking-tighter">
                  <Layers className="h-4 w-4" /> التصنيفات النشطة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tabular-nums">{categories?.length || 0}</div>
                <div className="mt-2 h-1 bg-accent/10 rounded-full overflow-hidden">
                   <div className="h-full bg-accent w-[60%]" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-3d border-none glass overflow-hidden relative group">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black text-orange-600 flex items-center gap-2 uppercase tracking-tighter">
                  <Package className="h-4 w-4" /> تنبيهات المخزون
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tabular-nums text-orange-600">{lowStockCount}</div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-orange-500 mt-2">
                   <AlertTriangle className="h-3 w-3" /> بحاجة لتوريد
                </div>
              </CardContent>
            </Card>

            <Card className="card-3d border-none bg-gradient-to-br from-primary to-accent text-white shadow-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black opacity-80 uppercase tracking-tighter">التقييم العام</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black">أداء مالي مستقر</div>
                <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
                   <div className="h-full bg-white w-[85%]" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
             <Card className="col-span-4 border-none glass overflow-hidden card-3d rounded-[2.5rem]">
                <CardHeader className="p-10 pb-0">
                  <CardTitle className="text-xl font-black">توزيع القيمة حسب التصنيف</CardTitle>
                  <CardDescription>قيمة المخزون الإجمالية لكل قسم وفروعه</CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={categoryStats}>
                          <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3960AC" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3960AC" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                          <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', direction: 'rtl' }} />
                          <Area type="monotone" dataKey="value" stroke="#3960AC" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                       </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
             </Card>

             <Card className="col-span-3 border-none glass overflow-hidden card-3d rounded-[2.5rem]">
                <CardHeader className="p-10 border-b border-black/5">
                  <CardTitle className="text-xl font-black">إحصاءات الأقسام الفرعية</CardTitle>
                  <CardDescription>عدد المنتجات الموزعة في الهيكل الهرمي</CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                   <div className="space-y-6">
                      {categoryStats.slice(0, 6).map((s, i) => (
                        <div key={s.id} className="flex items-center justify-between group">
                           <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center font-black text-primary group-hover:bg-primary group-hover:text-white transition-all transform group-hover:rotate-6">
                                {s.count}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-black text-sm">{s.name}</span>
                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest tabular-nums">
                                   قيمة المخزون: {s.value.toLocaleString()} دج
                                </span>
                              </div>
                           </div>
                           <Badge variant="outline" className="rounded-lg border-primary/20 bg-primary/5 font-black text-[10px] tabular-nums">
                              {Math.round((s.value / (totalRevenue || 1)) * 100)}%
                           </Badge>
                        </div>
                      ))}
                   </div>
                </CardContent>
             </Card>
          </div>

          <footer className="text-center py-10 opacity-40">
              <p className="text-[10px] font-black uppercase tracking-[0.4em]">Express Phone Pro &copy; Khaled_Deragha</p>
          </footer>
    </div>
  )
}
