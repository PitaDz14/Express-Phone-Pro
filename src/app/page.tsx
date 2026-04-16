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
  ChevronLeft
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

const data = [
  { name: "السبت", total: 4500, profit: 1200 },
  { name: "الأحد", total: 5200, profit: 1500 },
  { name: "الاثنين", total: 3800, profit: 1000 },
  { name: "الثلاثاء", total: 6100, profit: 1800 },
  { name: "الأربعاء", total: 5900, profit: 1700 },
  { name: "الخميس", total: 7200, profit: 2100 },
]

export default function Dashboard() {
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
                placeholder="ابحث عن فاتورة، منتج أو عميل..." 
                className="pl-10 h-10 bg-background/50 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2">
               <Plus className="h-4 w-4" />
               إضافة سريعة
             </Button>
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
                <CardTitle className="text-sm font-medium opacity-90">إجمالي المبيعات</CardTitle>
                <TrendingUp className="h-4 w-4 opacity-90" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">128,450 دج</div>
                <p className="text-xs mt-1 flex items-center opacity-80">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +12% عن الشهر الماضي
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">المنتجات المتوفرة</CardTitle>
                <Package className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">1,240</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <Badge variant="secondary" className="text-[10px] px-1 h-4">تنبيه</Badge>
                  <span className="mr-1">3 منتجات منخفضة</span>
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">العملاء النشطون</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">482</div>
                <p className="text-xs text-muted-foreground mt-1">12 عميل جديد هذا الأسبوع</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm border-r-4 border-orange-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">الديون المستحقة</CardTitle>
                <Wallet className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600 tabular-nums">34,500 دج</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <ArrowDownRight className="h-3 w-3 mr-1 text-orange-500" />
                  تحتاج لمتابعة فورية
                </p>
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
                    <CardDescription>نظرة عامة على الأداء المالي للأسبوع الحالي</CardDescription>
                  </div>
                  <Badge variant="outline" className="tabular-nums">7 أيام</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
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
                        {data.map((entry, index) => (
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
                   <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/5">عرض الكل</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {[
                    { id: 1, type: "sale", item: "iPhone 13 Screen", price: "12,500 دج", status: "Paid", time: "قبل 10 دقائق" },
                    { id: 2, type: "debt", item: "Battery Replacement", price: "3,200 دج", status: "Partial", time: "قبل ساعة" },
                    { id: 3, type: "sale", item: "Samsung S22 Ultra Case", price: "2,500 دج", status: "Paid", time: "قبل ساعتين" },
                    { id: 4, type: "return", item: "USB-C Cable", price: "800 دج", status: "Returned", time: "أمس" },
                  ].map((activity) => (
                    <div key={activity.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          activity.type === 'sale' ? 'bg-green-100 text-green-700' : 
                          activity.type === 'debt' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {activity.type === 'sale' ? <ArrowUpRight className="h-5 w-5" /> : 
                           activity.type === 'debt' ? <Wallet className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{activity.item}</p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold tabular-nums">{activity.price}</p>
                        <Badge variant={activity.status === 'Paid' ? 'secondary' : 'outline'} className="text-[10px] py-0">
                          {activity.status === 'Paid' ? 'مدفوع' : activity.status === 'Partial' ? 'جزئي' : 'مرتجع'}
                        </Badge>
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
