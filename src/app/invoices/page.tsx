"use client"

import * as React from "react"
import { 
  FileText, 
  Plus, 
  Search, 
  Printer, 
  Download,
  Trash2,
  Scan,
  UserPlus
} from "lucide-react"
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export default function InvoicesPage() {
  const [items, setItems] = React.useState([
    { id: 1, name: "شاشة iPhone 13 Pro Max أصلي", qty: 1, price: 18500 },
    { id: 2, name: "واقي شاشة نانو سيراميك", qty: 1, price: 1200 },
  ])

  const total = items.reduce((sum, item) => sum + (item.price * item.qty), 0)

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-6 bg-white sticky top-0 z-10 no-print">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-xl font-bold tracking-tight">الفواتير والمبيعات</h1>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" className="gap-2">
               <FileText className="h-4 w-4" />
               سجل الفواتير
             </Button>
             <Button className="gap-2 bg-primary">
               <Plus className="h-4 w-4" />
               فاتورة جديدة
             </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* POS Interface */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-none shadow-sm">
                <CardHeader className="border-b">
                   <CardTitle className="text-lg">إضافة منتجات للفاتورة</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="بحث بالاسم أو مسح كود QR..." className="pl-10 h-11" />
                    </div>
                    <Button variant="outline" size="icon" className="h-11 w-11">
                      <Scan className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3 mt-6">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                             <Package className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">{item.price} دج للقطعة</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-2 border rounded-md px-2 py-1 bg-white">
                             <button className="text-muted-foreground hover:text-primary">-</button>
                             <span className="w-8 text-center font-bold text-sm tabular-nums">{item.qty}</span>
                             <button className="text-muted-foreground hover:text-primary">+</button>
                           </div>
                           <p className="font-bold text-sm tabular-nums w-24 text-left">{(item.price * item.qty).toLocaleString()} دج</p>
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                             <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader className="border-b">
                   <CardTitle className="text-lg">معلومات العميل والخصم</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label>اختيار عميل</Label>
                        <div className="flex gap-2">
                           <Input placeholder="بحث عن عميل..." />
                           <Button variant="outline" size="icon"><UserPlus className="h-4 w-4" /></Button>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <Label>تطبيق خصم (دج)</Label>
                        <Input type="number" placeholder="0" />
                     </div>
                   </div>
                   <div className="space-y-2">
                      <Label>ملاحظات الفاتورة</Label>
                      <Input placeholder="مثال: الضمان لمدة 3 أشهر، يشمل التركيب..." />
                   </div>
                </CardContent>
              </Card>
            </div>

            {/* Invoice Summary */}
            <div className="lg:col-span-1">
              <Card className="border-none shadow-lg sticky top-24 bg-primary text-primary-foreground">
                <CardHeader>
                  <CardTitle>ملخص الفاتورة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center opacity-90">
                    <span>المجموع الفرعي:</span>
                    <span className="font-bold tabular-nums">{total.toLocaleString()} دج</span>
                  </div>
                  <div className="flex justify-between items-center opacity-90">
                    <span>الخصومات:</span>
                    <span className="font-bold tabular-nums">0 دج</span>
                  </div>
                  <Separator className="bg-white/20" />
                  <div className="flex justify-between items-center py-2">
                    <span className="text-lg font-bold">الإجمالي النهائي:</span>
                    <span className="text-2xl font-black tabular-nums">{total.toLocaleString()} دج</span>
                  </div>
                  
                  <div className="space-y-3 mt-6">
                    <Button className="w-full bg-accent text-accent-foreground font-bold hover:bg-accent/90 gap-2 h-12">
                      <Printer className="h-5 w-5" />
                      تأكيد وطباعة الفاتورة
                    </Button>
                    <Button variant="outline" className="w-full bg-white/10 border-white/20 hover:bg-white/20 text-white gap-2 h-12">
                      <Download className="h-5 w-5" />
                      حفظ كـ PDF
                    </Button>
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-2 pt-0 pb-6 text-center">
                   <p className="text-[10px] opacity-70">رقم الفاتورة التلقائي: INV-2024-0042</p>
                </CardFooter>
              </Card>
            </div>

          </div>
          
          <div className="mt-8 flex justify-center text-muted-foreground/30 text-[10px] gap-2 items-center italic">
            <span>By Khaled_Deragha - Express Phone Pro</span>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function Package(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}
