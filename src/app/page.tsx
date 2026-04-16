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
  Loader2,
  CalendarDays
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
  const { data: recentInvoices, isLoading: isInvoicesLoading } = useCollection(
    useMemoFirebase(() => query(invoicesRef, orderBy("createdAt", "desc"), limit(5)), [invoicesRef])
  )

  const totalSales = recentInvoices?.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0) || 0
  const lowStockCount = products?.filter(p => (p.quantity || 0) <= 5).length || 0

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-6 bg-white sticky top-0 z-10 no-print">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-xl font-bold tracking-tight">لوحة التحكم</h1>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden md:flex flex-col items-end gap-0.5 text-xs text-muted-foreground mr-2">
               <span className="font-bold text-foreground">الوضع: متصل</span>
               <span>{new Date().toLocaleDateString('ar-DZ')}</span>
             </div>
             <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border-2 border-primary/20">
               KD
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 space-y-6 bg-[#F8FAFC]">
          {/* Stats Overview */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-none shadow-sm bg-primary text-primary-foreground overflow-hidden relative group">
              <div className="absolute -right-4 -top-4 bg-white/10 h-24 w-24 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium opacity-90">إجمالي المبيعات (مؤخراً)</CardTitle>
                <TrendingUp className="h-4 w-4 opacity-90" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tabular-nums">{totalSales.toLocaleString()} دج</div>
                <div className="text-xs mt-2 flex items-center opacity-80">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  بناءً على مبيعات اليوم
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm hover:md-shadow-2 transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">المنتجات بالمخزون</CardTitle>
                <Package className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tabular-nums">{products?.length || 0}</div>
                <div className="text-xs text-muted-foreground mt-2 flex items-center flex-wrap gap-2">
                  {lowStockCount > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-2 h-5 animate-pulse">
                      {lowStockCount} منخفضة
                    </Badge>
                  )}
                  <span className="mr-1">منتج مسجل</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm hover:md-shadow-2 transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">العملاء النشطون</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tabular-nums">{customers?.length || 0}</div>
                <div className="text-xs text-muted-foreground mt-2">قاعدة بيانات العملاء المتكاملة</div>
              </CardContent>
            </Card>
            <Card className={`border-none shadow-sm border-r-4 ${lowStockCount > 0 ? 'border-orange-500' : 'border-green-500'}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">حالة المخزون</CardTitle>
                <CalendarDays className={`h-4 w-4 ${lowStockCount > 0 ? 'text-orange-500' : 'text-green-500'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-black ${lowStockCount > 0 ? 'text-orange-600' : 'text-green-600'} tabular-nums`}>
                  {lowStockCount > 0 ? "يحتاج توريد" : "مخزون ممتاز"}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  تحديث تلقائي في الوقت الفعلي
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            {/* Sales Chart */}
            <Card className="col-span-4 border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-white border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">إحصائيات المبيعات والأرباح</CardTitle>
                    <CardDescription>الأداء المالي خلال الأسبوع الحالي</CardDescription>
                  </div>
                  <Badge variant="secondary" className="tabular-nums">مباشر</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#64748B" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="#64748B" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                          textAlign: 'right',
                          direction: 'rtl'
                        }}
                      />
                      <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={24}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 5 ? '#3960AC' : '#3960AC40'} />
                        ))}
                      </Bar>
                      <Bar dataKey="profit" fill="#3CC2DD" radius={[6, 6, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="col-span-3 border-none shadow-sm">
              <CardHeader className="bg-white border-b">
                <div className="flex items-center justify-between">
                   <CardTitle className="text-lg">أحدث المبيعات</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {isInvoicesLoading ? (
                    <div className="p-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-30" />
                      <p className="text-xs text-muted-foreground mt-2">جاري التحديث...</p>
                    </div>
                  ) : !recentInvoices || recentInvoices.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 opacity-20" />
                      لا توجد عمليات مبيعات مسجلة
                    </div>
                  ) : recentInvoices.map((inv) => (
                    <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100`}>
                          <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">فاتورة #{inv.id.slice(0, 6)}</p>
                          <p className="text-xs text-muted-foreground">{inv.customerName}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black tabular-nums">{(inv.totalAmount || 0).toLocaleString()} دج</p>
                        <Badge variant="outline" className="text-[10px] py-0 border-green-200 text-green-700 bg-green-50">مؤكدة</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-8 flex justify-center text-muted-foreground/40 text-[10px] gap-2 items-center italic">
            <span>By Khaled_Deragha - Express Phone Pro</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40"></span>
            <span>نظام إدارة المحلات v1.2</span>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
