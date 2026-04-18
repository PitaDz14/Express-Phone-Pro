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
  Smartphone,
  Sparkles,
  Zap,
  ShoppingBag,
  BarChartHorizontal
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
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export default function ReportsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { role } = useUser()
  const router = useRouter()
  const isAdmin = role === "Admin"

  const invoicesRef = useMemoFirebase(() => collection(db, "invoices"), [db])
  const productsRef = useMemoFirebase(() => collection(db, "products"), [db])
  const categoriesRef = useMemoFirebase(() => collection(db, "categories"), [db])
  
  const { data: invoices, isLoading: isInvoicesLoading } = useCollection(invoicesRef)
  const { data: products } = useCollection(productsRef)
  const { data: categories } = useCollection(categoriesRef)

  // Security Redirect for Workers
  React.useEffect(() => {
    if (!isAdmin && role !== null) {
      router.push("/")
    }
  }, [isAdmin, role, router])

  if (!isAdmin) {
    return <div className="p-20 text-center font-black">جاري التحقق من الصلاحيات...</div>
  }

  const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0) || 0
  const lowStockCount = products?.filter(p => (p.quantity || 0) <= (p.minStockQuantity || 5)).length || 0

  // Exclusive Screen Stats
  const screenStats = React.useMemo(() => {
    if (!products) return { count: 0, totalSale: 0, totalPurchase: 0 }
    const screens = products.filter(p => {
      const name = p.name.toLowerCase()
      return name.includes("lcd") || name.includes("screen") || name.includes("شاشة") || name.includes("afficheur")
    })
    
    return {
      count: screens.reduce((sum, p) => sum + (p.quantity || 0), 0),
      totalSale: screens.reduce((sum, p) => sum + ((p.salePrice || 0) * (p.quantity || 0)), 0),
      totalPurchase: screens.reduce((sum, p) => sum + ((p.purchasePrice || 0) * (p.quantity || 0)), 0)
    }
  }, [products])

  // Global Inventory Stats
  const globalInventoryStats = React.useMemo(() => {
    if (!products) return { count: 0, totalSale: 0, totalPurchase: 0 }
    return {
      count: products.reduce((sum, p) => sum + (p.quantity || 0), 0),
      totalSale: products.reduce((sum, p) => sum + ((p.salePrice || 0) * (p.quantity || 0)), 0),
      totalPurchase: products.reduce((sum, p) => sum + ((p.purchasePrice || 0) * (p.quantity || 0)), 0)
    }
  }, [products])

  const categoryStats = React.useMemo(() => {
    if (!products || !categories) return []
    return categories.map(cat => {
      const count = products.filter(p => p.categoryId === cat.id).length
      const value = products.filter(p => p.categoryId === cat.id).reduce((sum, p) => sum + (p.salePrice * p.quantity), 0)
      return { ...cat, count, value }
    }).filter(s => s.count > 0).sort((a, b) => b.value - a.value)
  }, [products, categories])

  const handlePrint = () => {
    window.print()
  }

  const handleExport = () => {
    const reportData = {
      date: new Date().toISOString(),
      summary: {
        totalRevenue,
        lowStockCount,
        activeCategories: categories?.length || 0,
      },
      screenStats,
      globalInventoryStats,
      categoryStats: categoryStats.map(s => ({ name: s.name, count: s.count, totalValue: s.value }))
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ExpressPhonePro_Report_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    toast({ title: "تم التصدير", description: "تم تحميل ملف التقرير بنجاح" })
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 pb-32">
        <header className="flex h-20 shrink-0 items-center justify-between border-b px-8 glass sticky top-0 z-50 no-print rounded-[2rem]">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg transform -rotate-3">
                <Smartphone className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-tighter text-primary">EXPRESS</span>
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Phone Pro</span>
              </div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-gradient-premium">مركز التقارير والذكاء المالي</h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">بواسطة المطور Khaled_Deragha</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="glass h-11 rounded-2xl px-5 font-bold gap-2 border-white/20"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" /> تصدير
            </Button>
            <Button 
              className="h-11 rounded-2xl px-5 bg-primary text-white shadow-lg font-black gap-2"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" /> طباعة
            </Button>
          </div>
        </header>

          <div className="grid gap-8 grid-cols-1">
            {/* Exclusive Screens Section */}
            <Card className="border-none bg-gradient-to-br from-[#1e293b] to-[#0f172a] text-white rounded-[3rem] overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Smartphone className="h-48 w-48 rotate-12" />
              </div>
              <CardHeader className="p-10 relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-2xl font-black tracking-tight">إحصائيات الشاشات الحصرية</CardTitle>
                  </div>
                  <CardDescription className="text-white/60 font-medium">تحليل دقيق لقطاع الشاشات المتوفرة في المخزون حالياً</CardDescription>
              </CardHeader>
              <CardContent className="px-10 pb-10 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="glass bg-white/5 border-white/5 p-6 rounded-[2rem] space-y-2">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <Zap className="h-4 w-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">إجمالي القطع</span>
                        </div>
                        <div className="text-4xl font-black tabular-nums">{screenStats.count} <span className="text-sm opacity-40">قطعة</span></div>
                    </div>
                    <div className="glass bg-white/5 border-white/5 p-6 rounded-[2rem] space-y-2">
                        <div className="flex items-center gap-2 text-primary">
                          <Wallet className="h-4 w-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">قيمة البيع الإجمالية</span>
                        </div>
                        <div className="text-3xl font-black tabular-nums text-emerald-400">{screenStats.totalSale.toLocaleString()} <span className="text-xs opacity-40">دج</span></div>
                    </div>
                    <div className="glass bg-white/5 border-white/5 p-6 rounded-[2rem] space-y-2">
                        <div className="flex items-center gap-2 text-orange-400">
                          <ShoppingBag className="h-4 w-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">قيمة الشراء الإجمالية</span>
                        </div>
                        <div className="text-3xl font-black tabular-nums text-orange-400">{screenStats.totalPurchase.toLocaleString()} <span className="text-xs opacity-40">دج</span></div>
                    </div>
                  </div>
              </CardContent>
            </Card>

            {/* Global Inventory Section */}
            <Card className="border-none bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/10 rounded-[3rem] overflow-hidden shadow-xl relative group transition-all">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                  <BarChartHorizontal className="h-48 w-48 -rotate-12" />
              </div>
              <CardHeader className="p-10 relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                        <Package className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-2xl font-black tracking-tight text-foreground">إحصائيات المخزون العام</CardTitle>
                  </div>
                  <CardDescription className="text-muted-foreground font-medium">نظرة شاملة على كافة السلع والمنتجات المتوفرة في المتجر</CardDescription>
              </CardHeader>
              <CardContent className="px-10 pb-10 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="glass p-6 rounded-[2rem] space-y-2 border-primary/10">
                        <div className="flex items-center gap-2 text-primary">
                          <Zap className="h-4 w-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">إجمالي السلع</span>
                        </div>
                        <div className="text-4xl font-black tabular-nums text-foreground">{globalInventoryStats.count} <span className="text-sm opacity-40">قطعة</span></div>
                    </div>
                    <div className="glass p-6 rounded-[2rem] space-y-2 border-emerald-500/10">
                        <div className="flex items-center gap-2 text-emerald-600">
                          <Wallet className="h-4 w-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">إجمالي قيمة البيع</span>
                        </div>
                        <div className="text-3xl font-black tabular-nums text-emerald-600">{globalInventoryStats.totalSale.toLocaleString()} <span className="text-xs opacity-40">دج</span></div>
                    </div>
                    <div className="glass p-6 rounded-[2rem] space-y-2 border-orange-500/10">
                        <div className="flex items-center gap-2 text-orange-600">
                          <ShoppingBag className="h-4 w-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">إجمالي قيمة الشراء</span>
                        </div>
                        <div className="text-3xl font-black tabular-nums text-orange-600">{globalInventoryStats.totalPurchase.toLocaleString()} <span className="text-xs opacity-40">دج</span></div>
                    </div>
                  </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-none glass rounded-[2.5rem] overflow-hidden relative group transition-all hover:scale-105">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black text-primary flex items-center gap-2 uppercase tracking-tighter">
                  <Wallet className="h-4 w-4" /> إجمالي الإيرادات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tabular-nums text-foreground">{(totalRevenue || 0).toLocaleString()} دج</div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-2">
                   <ArrowUpRight className="h-3 w-3" /> نمو مالي مستمر
                </div>
              </CardContent>
            </Card>

            <Card className="border-none glass rounded-[2.5rem] overflow-hidden relative group transition-all hover:scale-105">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black text-accent flex items-center gap-2 uppercase tracking-tighter">
                  <Layers className="h-4 w-4" /> التصنيفات النشطة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tabular-nums text-foreground">{categories?.length || 0}</div>
                <div className="mt-2 h-1 bg-accent/10 rounded-full overflow-hidden">
                   <div className="h-full bg-accent w-[60%]" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none glass rounded-[2.5rem] overflow-hidden relative group transition-all hover:scale-105">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black text-orange-600 flex items-center gap-2 uppercase tracking-tighter">
                  <Package className="h-4 w-4" /> تنبيهات المخزون
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tabular-nums text-orange-600">{lowStockCount}</div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-orange-500 mt-2">
                   <AlertTriangle className="h-3 w-3" /> بحاجة لتوريد عاجل
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-gradient-to-br from-primary to-accent text-white shadow-2xl rounded-[2.5rem]">
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
             <Card className="col-span-4 border-none glass overflow-hidden rounded-[2.5rem]">
                <CardHeader className="p-10 pb-0">
                  <CardTitle className="text-xl font-black text-foreground">توزيع القيمة حسب التصنيف</CardTitle>
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
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))'}} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))'}} />
                          <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', direction: 'rtl', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }} />
                          <Area type="monotone" dataKey="value" stroke="#3960AC" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                       </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
             </Card>

             <Card className="col-span-3 border-none glass overflow-hidden rounded-[2.5rem]">
                <CardHeader className="p-10 border-b border-border">
                  <CardTitle className="text-xl font-black text-foreground">إحصاءات الأقسام الفرعية</CardTitle>
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
                                <span className="font-black text-sm text-foreground">{s.name}</span>
                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest tabular-nums">
                                   قيمة المخزون: {s.value.toLocaleString()} دج
                                </span>
                              </div>
                           </div>
                           <Badge variant="outline" className="rounded-lg border-primary/20 bg-primary/5 font-black text-[10px] tabular-nums text-primary">
                              {totalRevenue > 0 ? Math.round((s.value / totalRevenue) * 100) : 0}%
                           </Badge>
                        </div>
                      ))}
                   </div>
                </CardContent>
             </Card>
          </div>

          <footer className="text-center py-10 opacity-40">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground">Express Phone Pro &copy; Khaled_Deragha</p>
          </footer>
    </div>
  )
}
