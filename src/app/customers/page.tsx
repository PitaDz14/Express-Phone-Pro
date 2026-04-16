"use client"

import * as React from "react"
import { 
  Users, 
  Plus, 
  Search, 
  Phone,
  Wallet,
  Calendar,
  ChevronRight,
  MoreVertical,
  History
} from "lucide-react"
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function CustomersPage() {
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-6 bg-white sticky top-0 z-10 no-print">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-xl font-bold tracking-tight">العملاء والديون</h1>
          </div>
          <div className="flex items-center gap-3">
             <Button className="flex items-center gap-2">
               <Plus className="h-4 w-4" />
               إضافة عميل جديد
             </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
             <Card className="border-none shadow-sm bg-red-50 border-r-4 border-red-500">
               <CardHeader className="pb-2">
                 <CardTitle className="text-sm font-medium text-red-900">إجمالي الديون المعلقة</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold text-red-600 tabular-nums">84,200 دج</div>
                 <p className="text-xs text-red-700 mt-1">يجب تحصيلها من 15 عميلاً</p>
               </CardContent>
             </Card>
             <Card className="border-none shadow-sm bg-green-50 border-r-4 border-green-500">
               <CardHeader className="pb-2">
                 <CardTitle className="text-sm font-medium text-green-900">تحصيلات اليوم</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold text-green-600 tabular-nums">12,500 دج</div>
                 <p className="text-xs text-green-700 mt-1">من 4 دفعات جزئية</p>
               </CardContent>
             </Card>
             <Card className="border-none shadow-sm bg-primary/5 border-r-4 border-primary">
               <CardHeader className="pb-2">
                 <CardTitle className="text-sm font-medium text-primary">أكثر العملاء وفاءً</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="text-lg font-bold">أحمد بوزيد</div>
                 <p className="text-xs text-muted-foreground mt-1">بإجمالي مشتريات 45,000 دج</p>
               </CardContent>
             </Card>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث بالاسم أو رقم الهاتف..." className="pl-10 h-10" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <History className="h-4 w-4" />
                سجل الدفعات
              </Button>
            </div>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-white/50">
               <CardTitle className="text-lg">قائمة العملاء</CardTitle>
               <CardDescription>إدارة بيانات العملاء ومتابعة ديونهم</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>اسم العميل</TableHead>
                    <TableHead>رقم الهاتف</TableHead>
                    <TableHead>تاريخ آخر زيارة</TableHead>
                    <TableHead className="text-left">الدين المستحق</TableHead>
                    <TableHead className="text-left">الحالة</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { name: "ياسين بن علي", phone: "0550 12 34 56", lastVisit: "2024-03-25", debt: 12500, status: "Late" },
                    { name: "محمد أمين", phone: "0661 45 67 89", lastVisit: "2024-03-22", debt: 0, status: "Clear" },
                    { name: "سمير جبار", phone: "0772 98 76 54", lastVisit: "2024-03-20", debt: 3400, status: "Pending" },
                    { name: "عبد القادر رابحي", phone: "0554 11 22 33", lastVisit: "2024-03-18", debt: 25000, status: "Late" },
                    { name: "كمال سعيدي", phone: "0660 33 44 55", lastVisit: "2024-03-15", debt: 1200, status: "Pending" },
                  ].map((customer, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/30 transition-colors group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                           <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                             {customer.name.charAt(0)}
                           </div>
                           <span className="font-semibold">{customer.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {customer.lastVisit}
                        </div>
                      </TableCell>
                      <TableCell className={`text-left tabular-nums font-bold ${customer.debt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {customer.debt.toLocaleString()} دج
                      </TableCell>
                      <TableCell className="text-left">
                        <Badge 
                          variant={customer.status === 'Clear' ? 'secondary' : customer.status === 'Late' ? 'destructive' : 'outline'}
                          className="text-[10px]"
                        >
                          {customer.status === 'Clear' ? 'خالص' : customer.status === 'Late' ? 'متأخر جداً' : 'دين نشط'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <div className="mt-8 flex justify-center text-muted-foreground/30 text-[10px] gap-2 items-center">
            <span>By Khaled_Deragha - Express Phone Pro</span>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
