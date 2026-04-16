"use client"

import * as React from "react"
import { 
  TrendingUp, 
  Package, 
  Users, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  Search,
  ChevronLeft,
  Loader2
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell
} from "recharts"

import { DashboardSidebar } from "@/components/layout/dashboard-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
]

export default function Dashboard() {
  const db = useFirestore()
  
  const productsRef = useMemoFirebase(() => collection(db, "products"), [db])
  const customersRef = useMemoFirebase(() => collection(db, "customers"), [db])
  const invoicesRef = useMemoFirebase(() => collection(db, "invoices"), [db])
  
  const { data: products } = useCollection(productsRef)
  const { data: customers } = useCollection(customersRef)
  const { data: recentInvoices } = useCollection(useMemoFirebase(() => query(invoicesRef, orderBy("createdAt", "desc"), limit(5)), [invoicesRef]))

  const totalSales = recentInvoices?.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0) || 0
  const lowStockCount = products?.filter(p => p.quantity <= 5).length || 0

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-6 bg-white sticky top-0 z-10 no-print">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-xl font-bold tracking-tight">لوحة التحكم</h1>
          </div>
          <div className="flex items-center gap-4 w-1/3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="ابحث سريعا..." 
                className="pl-10 h-10 bg-background/50 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
               KD
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 space-y-6">
          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-none shadow-sm bg-primary text-primary-foreground">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium opacity-90">إجمالي المبيعات (مؤخراً)</CardTitle>
                <TrendingUp className="h-4 w-4 opacity-90" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{totalSales.toLocaleString()} دج</div>
                <p className="text-xs mt-1 flex items-center opacity-80">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  بناءً على آخر الفواتير
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">المنتجات بالمخزون</CardTitle>
                <Package className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{products?.length || 0}</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center">
                  {lowStockCount > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1 h-4 ml-1">{lowStockCount} منخفضة</Badge>
                  )}
                  <span className="mr-1">منتج مسجل</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">العملاء</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{customers?.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">قاعدة بيانات العملاء النشطة</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm border-r-4 border-orange-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">حالة المخزون</CardTitle>
                <Wallet className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600 tabular-nums">
                  {lowStockCount > 0 ? "يحتاج توريد" : "مستقر"}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center">
                  تنبيهات المخزون النشطة
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            {/* Sales Chart */}
            <Card className="col-span-4 border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-white/50 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">إحصائيات المبيعات والأرباح</CardTitle>
                    <CardDescription>نظرة عامة على الأداء المالي</CardDescription>
                  </div>
                  <Badge variant="outline" className="tabular-nums">تقديري</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `${value} دج`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '8px', 
                          border: 'none', 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          textAlign: 'right'
                        }}
                      />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 5 ? '#3960AC' : '#3960AC80'} />
                        ))}
                      </Bar>
                      <Bar dataKey="profit" fill="#3CC2DD" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="col-span-3 border-none shadow-sm">
              <CardHeader className="bg-white/50 border-b">
                <div className="flex items-center justify-between">
                   <CardTitle className="text-lg">آخر العمليات</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {!recentInvoices ? (
                    <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto opacity-20" /></div>
                  ) : recentInvoices.length === 0 ? (
                    <div className="p-10 text-center text-muted-foreground text-sm">لا توجد عمليات مؤخراً</div>
                  ) : recentInvoices.map((inv) => (
                    <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center bg-green-100 text-green-700`}>
                          <ArrowUpRight className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">فاتورة #{inv.id.slice(0, 6)}</p>
                          <p className="text-xs text-muted-foreground">{inv.customerName}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold tabular-nums">{inv.totalAmount.toLocaleString()} دج</p>
                        <Badge variant="secondary" className="text-[10px] py-0">مدفوع</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-8 flex justify-center text-muted-foreground/50 text-xs gap-2 items-center italic">
            <span>تم التطوير بواسطة خالد دراغة</span>
            <span>•</span>
            <span>حقوق الملكية by Khaled_Deragha</span>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
