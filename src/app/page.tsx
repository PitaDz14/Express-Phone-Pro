"use client"

import * as React from "react"
import { 
  TrendingUp, 
  Package, 
  Users, 
  Wallet, 
  ArrowUpRight, 
  Loader2,
  CalendarDays,
  Zap,
  LayoutGrid
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  Area,
  AreaChart
} from "recharts"

import { DashboardSidebar } from "@/components/layout/dashboard-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, limit, orderBy } from "firebase/firestore"

const chartData = [
  { name: "السبت", total: 4500, profit: 1200 },
  { name: "الأحد", total: 5200, profit: 1500 },
  { name: "الاثنين", total: 3800, profit: 1000 },
  { name: "الثلاثاء", total: 6100, profit: 1800 },
  { name: "الأربعاء", total: 5900, profit: 1700 },
  { name: "الخميس", total: 7200, profit: 2100 },
  { name: "الجمعة", total: 8500, profit: 2800 },
]

export default function Dashboard() {
  const db = useFirestore()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])
  
  const productsRef = useMemoFirebase(() => collection(db, "products"), [db])
  const customersRef = useMemoFirebase(() => collection(db, "customers"), [db])
  const invoicesRef = useMemoFirebase(() => collection(db, "invoices"), [db])
  
  const { data: products } = useCollection(productsRef)
  const { data: customers } = useCollection(customersRef)
  const { data: recentInvoices, isLoading: isInvoicesLoading } = useCollection(
    useMemoFirebase(() => query(invoicesRef, orderBy("createdAt", "desc"), limit(6)), [invoicesRef])
  )

  const totalSales = recentInvoices?.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0) || 0
  const lowStockCount = products?.filter(p => (p.quantity || 0) <= 5).length || 0

  if (!mounted) return null

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="bg-transparent">
        <header className="flex h-20 shrink-0 items-center justify-between border-b px-8 glass sticky top-0 z-50 no-print">
          <div className="flex items-center gap-6">
            <SidebarTrigger className="-ml-1" />
            <div className="flex flex-col">
               <h1 className="text-2xl font-black tracking-tight text-gradient">إحصائيات الأداء</h1>
               <p className="text-xs text-muted-foreground font-medium">مرحباً بك، Khaled_Deragha</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex flex-col items-end gap-1 text-[10px] text-muted-foreground">
               <Badge variant="success" className="h-5 animate-pulse">متصل بالبث الحي</Badge>
               <span className="font-bold">{new Date().toLocaleDateString('ar-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
             </div>
             <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-accent p-[2px] shadow-lg">
                <div className="h-full w-full rounded-[14px] bg-white flex items-center justify-center font-black text-primary">
                  KD
                </div>
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 space-y-10">
          {/* Hero Stats */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Card className="card-3d border-none glass overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-125 transition-transform">
                <Wallet className="h-20 w-20 text-primary" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
                  <Zap className="h-4 w-4 fill-primary" />
                  مبيعات اليوم
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tabular-nums">{totalSales.toLocaleString()} دج</div>
                <div className="mt-4 flex items-center gap-2">
                   <div className="h-1 flex-1 bg-primary/10 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[70%]" />
                   </div>
                   <span className="text-[10px] font-bold text-primary">+12%</span>
                </div>
              </CardContent>
            </Card>

            <Card className="card-3d border-none glass overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-125 transition-transform">
                <Package className="h-20 w-20 text-accent" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-accent flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 fill-accent" />
                  المخزون الكلي
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tabular-nums">{products?.length || 0}</div>
                <div className="mt-4 flex gap-2">
                  {lowStockCount > 0 ? (
                    <Badge variant="warning" className="text-[10px]">{lowStockCount} بحاجة لتجديد</Badge>
                  ) : (
                    <Badge variant="success" className="text-[10px]">مكتمل</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="card-3d border-none glass overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-125 transition-transform">
                <Users className="h-20 w-20 text-emerald-500" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-emerald-600">العملاء النشطون</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tabular-nums">{customers?.length || 0}</div>
                <p className="text-[10px] text-muted-foreground mt-2 font-bold italic">نظام تتبع الديون مفعل</p>
              </CardContent>
            </Card>

            <Card className="card-3d border-none bg-gradient-to-br from-primary to-accent text-white shadow-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold opacity-80">الحالة العامة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black">أداء ممتاز</div>
                <p className="text-[10px] mt-4 opacity-90 leading-relaxed font-medium">
                  نظام Express Phone Pro يعمل بكفاءة قصوى مع تحديثات لحظية.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
            {/* Sales Chart with Modern Look */}
            <Card className="col-span-4 border-none glass overflow-hidden card-3d">
              <CardHeader className="border-b bg-white/30">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-black">تحليل التدفق المالي</CardTitle>
                    <CardDescription>المبيعات مقابل الأرباح الصافية</CardDescription>
                  </div>
                  <div className="flex gap-2">
                     <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-primary" /> <span className="text-[10px] font-bold">مبيعات</span></div>
                     <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-accent" /> <span className="text-[10px] font-bold">أرباح</span></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', direction: 'rtl' }} 
                      />
                      <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                      <Area type="monotone" dataKey="profit" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorProfit)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Transaction List with Style */}
            <Card className="col-span-3 border-none glass card-3d">
              <CardHeader className="border-b bg-white/30">
                <CardTitle className="text-lg font-black">آخر الحركات</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/30">
                  {isInvoicesLoading ? (
                    <div className="p-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-20" /></div>
                  ) : !recentInvoices?.length ? (
                    <div className="p-20 text-center text-muted-foreground font-bold">لا يوجد بيانات حالية</div>
                  ) : recentInvoices.map((inv, idx) => (
                    <div key={inv.id} className="p-5 flex items-center justify-between hover:bg-white/40 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-white to-primary/10 shadow-sm border border-white group-hover:scale-110 transition-transform`}>
                          <Wallet className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-black"># {inv.id.slice(0, 6)}</p>
                          <p className="text-[10px] text-muted-foreground font-bold">{inv.customerName}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black tabular-nums text-gradient">{(inv.totalAmount || 0).toLocaleString()} دج</p>
                        <Badge variant="outline" className="text-[9px] py-0 mt-1 border-primary/20 text-primary">عملية ناجحة</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="pt-10 flex flex-col items-center justify-center text-muted-foreground/30 text-[10px] gap-2 font-black italic">
            <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <span>EXPRESS PHONE PRO • INTERACTIVE ECOSYSTEM</span>
            <span>Developed by Khaled_Deragha</span>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}