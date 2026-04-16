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
  Bell
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
  { name: "السبت", total: 45000 },
  { name: "الأحد", total: 52000 },
  { name: "الاثنين", total: 38000 },
  { name: "الثلاثاء", total: 61000 },
  { name: "الأربعاء", total: 59000 },
  { name: "الخميس", total: 72000 },
  { name: "الجمعة", total: 85000 },
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
    useMemoFirebase(() => query(invoicesRef, orderBy("createdAt", "desc"), limit(8)), [invoicesRef])
  )

  const totalSalesMonth = recentInvoices?.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0) || 0
  const lowStockCount = products?.filter(p => (p.quantity || 0) <= (p.minStockQuantity || 5)).length || 0

  if (!mounted) return null

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <header className="flex h-24 shrink-0 items-center justify-between border-b px-10 bg-white/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-6">
            <SidebarTrigger className="h-10 w-10 md:hidden" />
            <div className="flex flex-col">
               <h1 className="text-3xl font-black tracking-tighter text-gradient-premium">نظرة عامة</h1>
               <p className="text-xs text-muted-foreground font-bold opacity-60">مرحباً بك مجدداً في نظامك الذكي</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
             <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl relative">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="absolute top-3 right-3 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white" />
             </Button>
             <div className="flex items-center gap-4 pl-4 border-r pr-6">
                <div className="flex flex-col items-end">
                   <span className="text-sm font-black">Khaled_Deragha</span>
                   <Badge variant="success" className="h-5 text-[9px] font-black px-3 rounded-lg">Admin Pro</Badge>
                </div>
                <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-[#3960AC] to-[#3CC2DD] p-[2px] shadow-lg shadow-primary/10">
                   <div className="h-full w-full rounded-[1.4rem] bg-white flex items-center justify-center font-black text-[#3960AC] text-xl">
                     KD
                   </div>
                </div>
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-10 space-y-12">
          {/* Stats Bento Grid */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Card className="glass-premium card-hover border-none overflow-hidden relative group">
              <CardHeader className="pb-2">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <Wallet className="h-6 w-6" />
                </div>
                <CardTitle className="text-sm font-black text-muted-foreground uppercase tracking-widest">مبيعات الشهر</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black tabular-nums tracking-tighter">{totalSalesMonth.toLocaleString()} <span className="text-lg opacity-40">دج</span></div>
                <div className="mt-6 flex items-center gap-3">
                   <Badge variant="success" className="rounded-xl px-2">+15.4%</Badge>
                   <span className="text-[10px] text-muted-foreground font-bold">مقارنة بالشهر الماضي</span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-premium card-hover border-none overflow-hidden relative group">
              <CardHeader className="pb-2">
                <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-4">
                  <Package className="h-6 w-6" />
                </div>
                <CardTitle className="text-sm font-black text-muted-foreground uppercase tracking-widest">إجمالي المخزون</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black tabular-nums tracking-tighter">{products?.length || 0} <span className="text-lg opacity-40">صنف</span></div>
                <div className="mt-6 flex gap-2">
                  {lowStockCount > 0 ? (
                    <Badge variant="warning" className="rounded-xl px-3">{lowStockCount} يحتاج توريد</Badge>
                  ) : (
                    <Badge variant="success" className="rounded-xl px-3">المخزون مثالي</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-premium card-hover border-none overflow-hidden relative group">
              <CardHeader className="pb-2">
                <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                  <Users className="h-6 w-6" />
                </div>
                <CardTitle className="text-sm font-black text-muted-foreground uppercase tracking-widest">قاعدة العملاء</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black tabular-nums tracking-tighter">{customers?.length || 0} <span className="text-lg opacity-40">عميل</span></div>
                <div className="mt-6 flex items-center gap-2">
                   <div className="h-1.5 flex-1 bg-emerald-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[80%]" />
                   </div>
                   <span className="text-[10px] font-black text-emerald-600">80% نشط</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-gradient-to-br from-[#3960AC] to-[#3CC2DD] text-white shadow-2xl shadow-primary/30 rounded-[2.5rem] p-4 flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-xl font-black leading-tight">جاهز لزيادة<br/>مبيعاتك اليوم؟</CardTitle>
                <CardDescription className="text-white/70 text-xs font-bold mt-2">نظامك يعمل بكفاءة قصوى</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button className="w-full h-12 rounded-2xl bg-white text-primary font-black hover:bg-white/90 group">
                  ابدأ عملية بيع
                  <ShoppingBag className="mr-2 h-4 w-4 transition-transform group-hover:scale-125" />
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-7">
            {/* Elegant Chart */}
            <Card className="col-span-4 border-none glass-premium rounded-[3rem] overflow-hidden card-hover">
              <CardHeader className="p-10 pb-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-black tracking-tight">تحليل المبيعات</CardTitle>
                    <CardDescription className="font-bold">التدفق المالي الأسبوعي للأسبوع الحالي</CardDescription>
                  </div>
                  <Badge variant="outline" className="h-8 px-4 rounded-xl border-[#3960AC]/20 text-[#3960AC] font-black">أخر 7 أيام</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-10 pt-8">
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3960AC" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3960AC" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 800, fill: '#64748b'}} dy={15} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 800, fill: '#64748b'}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', direction: 'rtl', padding: '15px' }} 
                      />
                      <Area type="monotone" dataKey="total" stroke="#3960AC" strokeWidth={5} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Elegant List */}
            <Card className="col-span-3 border-none glass-premium rounded-[3rem] overflow-hidden card-hover">
              <CardHeader className="p-10 border-b border-[#3960AC]/5">
                <CardTitle className="text-2xl font-black tracking-tight">أحدث العمليات</CardTitle>
                <CardDescription className="font-bold">متابعة لحظية لكل ما يحدث</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-[#3960AC]/5">
                  {isInvoicesLoading ? (
                    <div className="p-24 text-center">
                       <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary opacity-20" />
                       <p className="text-xs font-bold text-muted-foreground mt-4">جاري التحديث...</p>
                    </div>
                  ) : !recentInvoices?.length ? (
                    <div className="p-24 text-center text-muted-foreground/40 font-black italic">لا توجد عمليات حالية</div>
                  ) : recentInvoices.map((inv) => (
                    <div key={inv.id} className="p-6 flex items-center justify-between hover:bg-primary/5 transition-all duration-500 group">
                      <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-3xl flex items-center justify-center bg-white shadow-sm border group-hover:scale-110 transition-transform duration-500">
                          <ShoppingBag className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-[#3960AC]"># {inv.id.slice(0, 8)}</p>
                          <p className="text-[10px] text-muted-foreground font-black mt-1 uppercase tracking-widest">{inv.customerName}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-black tabular-nums text-gradient-premium">{(inv.totalAmount || 0).toLocaleString()} <span className="text-[10px]">دج</span></p>
                        <Badge variant="secondary" className="text-[9px] font-black py-0.5 px-3 rounded-lg mt-1 bg-emerald-50 text-emerald-600 border-none">ناجحة</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <div className="p-8 border-t border-[#3960AC]/5 bg-primary/5 text-center">
                 <Button variant="ghost" className="text-[#3960AC] font-black text-sm hover:bg-transparent hover:underline">عرض جميع الفواتير</Button>
              </div>
            </Card>
          </div>
          
          <div className="pt-12 flex flex-col items-center justify-center text-muted-foreground/30 text-[10px] gap-3 font-black tracking-[0.2em]">
            <div className="h-[2px] w-32 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <span>EXPRESS PHONE PRO • THE PREMIUM EXPERIENCE</span>
            <span>DEVELOPED BY KHALED_DERAGHA</span>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}