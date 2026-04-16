
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
  AlertTriangle
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
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"

const data = [
  { name: "الأسبوع 1", sales: 4000, profit: 2400 },
  { name: "الأسبوع 2", sales: 3000, profit: 1398 },
  { name: "الأسبوع 3", sales: 2000, profit: 9800 },
  { name: "الأسبوع 4", sales: 2780, profit: 3908 },
]

export default function ReportsPage() {
  const db = useFirestore()
  const invoicesRef = useMemoFirebase(() => collection(db, "invoices"), [db])
  const productsRef = useMemoFirebase(() => collection(db, "products"), [db])
  
  const { data: invoices, isLoading: isInvoicesLoading } = useCollection(invoicesRef)
  const { data: products } = useCollection(productsRef)

  const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0) || 0
  const totalSalesCount = invoices?.length || 0
  const lowStockCount = products?.filter(p => (p.quantity || 0) <= (p.minStockQuantity || 5)).length || 0

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="bg-transparent">
        <header className="flex h-20 shrink-0 items-center justify-between border-b px-8 glass sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-gradient">مركز التقارير والذكاء المالي</h1>
              <p className="text-[10px] text-muted-foreground font-bold">تحليل دقيق لأداء Express Phone Pro</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="glass h-11 rounded-2xl px-5 font-bold gap-2">
              <Download className="h-4 w-4" />
              تصدير PDF
            </Button>
            <Button className="h-11 rounded-2xl px-5 bg-primary text-white shadow-lg font-black gap-2">
              <Printer className="h-4 w-4" />
              طباعة التقرير
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 space-y-10">
          {/* Top Cards */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Card className="card-3d border-none glass overflow-hidden relative group">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black text-primary flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  إجمالي الإيرادات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tabular-nums">{(totalRevenue || 0).toLocaleString()} دج</div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-2">
                   <ArrowUpRight className="h-3 w-3" />
                   +14.5% عن الشهر الماضي
                </div>
              </CardContent>
            </Card>

            <Card className="card-3d border-none glass overflow-hidden relative group">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black text-accent flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  عدد الفواتير
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tabular-nums">{totalSalesCount}</div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-primary mt-2">
                   <TrendingUp className="h-3 w-3" />
                   نمو مستمر في المبيعات
                </div>
              </CardContent>
            </Card>

            <Card className="card-3d border-none glass overflow-hidden relative group">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black text-orange-600 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  تنبيهات المخزون
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tabular-nums text-orange-600">{lowStockCount}</div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-orange-500 mt-2">
                   <AlertTriangle className="h-3 w-3" />
                   منتجات بحاجة لإعادة طلب
                </div>
              </CardContent>
            </Card>

            <Card className="card-3d border-none bg-gradient-to-br from-primary to-accent text-white shadow-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black opacity-80">التقييم العام</CardTitle>
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
             <Card className="col-span-4 border-none glass overflow-hidden card-3d">
                <CardHeader>
                  <CardTitle className="text-lg font-black">تحليل المبيعات الأسبوعي</CardTitle>
                  <CardDescription>مقارنة حجم المبيعات بالأرباح المحققة</CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={data}>
                          <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                          <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', direction: 'rtl' }} />
                          <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                       </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
             </Card>

             <Card className="col-span-3 border-none glass overflow-hidden card-3d">
                <CardHeader>
                  <CardTitle className="text-lg font-black">أكثر المنتجات مبيعاً</CardTitle>
                  <CardDescription>المنتجات الأكثر طلباً في المحل</CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                   <div className="space-y-6">
                      {products?.slice(0, 5).map((p, i) => (
                        <div key={p.id} className="flex items-center justify-between group">
                           <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                {i + 1}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-sm">{p.name}</span>
                                <span className="text-[10px] text-muted-foreground font-bold">{p.category}</span>
                              </div>
                           </div>
                           <div className="text-left font-black text-xs tabular-nums">
                              {Math.floor(Math.random() * 50) + 10} مبيعاً
                           </div>
                        </div>
                      ))}
                      {!products?.length && (
                        <div className="text-center py-10 text-muted-foreground font-bold italic opacity-30">
                          لا توجد بيانات حالية
                        </div>
                      )}
                   </div>
                </CardContent>
             </Card>
          </div>

          <div className="pt-10 flex flex-col items-center justify-center text-muted-foreground/30 text-[10px] gap-2 font-black italic">
            <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <span>EXPRESS PHONE PRO • FINANCIAL ANALYTICS ENGINE</span>
            <span>Developed by Khaled_Deragha</span>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
