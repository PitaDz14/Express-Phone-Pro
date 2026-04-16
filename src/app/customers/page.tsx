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
  History,
  Loader2,
  Trash2
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

export default function CustomersPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  // Form State
  const [customerName, setCustomerName] = React.useState("")
  const [customerPhone, setCustomerPhone] = React.useState("")
  const [customerEmail, setCustomerEmail] = React.useState("")
  const [customerAddress, setCustomerAddress] = React.useState("")

  const customersRef = useMemoFirebase(() => collection(db, "customers"), [db])
  const { data: customers, isLoading } = useCollection(customersRef)

  const filteredCustomers = customers?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  ) || []

  const totalDebt = customers?.reduce((acc, c) => acc + (c.debt || 0), 0) || 0
  const customersWithDebt = customers?.filter(c => (c.debt || 0) > 0).length || 0

  const handleSaveCustomer = () => {
    if (!customerName || !customerPhone) {
      toast({ title: "خطأ", description: "يرجى إدخال الاسم ورقم الهاتف", variant: "destructive" })
      return
    }

    setIsSaving(true)
    addDocumentNonBlocking(customersRef, {
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      address: customerAddress,
      debt: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    
    toast({ title: "تم النجاح", description: "تم إضافة العميل بنجاح" })
    resetForm()
    setOpen(false)
    setIsSaving(false)
  }

  const resetForm = () => {
    setCustomerName("")
    setCustomerPhone("")
    setCustomerEmail("")
    setCustomerAddress("")
  }

  const handleDelete = (id: string) => {
    const docRef = doc(db, "customers", id)
    deleteDocumentNonBlocking(docRef)
    toast({ title: "تم الحذف", description: "تم حذف العميل من النظام" })
  }

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
             <Dialog open={open} onOpenChange={setOpen}>
               <DialogTrigger asChild>
                 <Button className="flex items-center gap-2">
                   <Plus className="h-4 w-4" />
                   إضافة عميل جديد
                 </Button>
               </DialogTrigger>
               <DialogContent dir="rtl" className="sm:max-w-[425px]">
                 <DialogHeader>
                   <DialogTitle>إضافة عميل جديد</DialogTitle>
                   <DialogDescription>أدخل بيانات العميل الأساسية هنا لفتح حساب له.</DialogDescription>
                 </DialogHeader>
                 <div className="grid gap-4 py-4">
                   <div className="space-y-2">
                     <Label>الاسم الكامل</Label>
                     <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="محمد بن علي" />
                   </div>
                   <div className="space-y-2">
                     <Label>رقم الهاتف</Label>
                     <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="0550 00 00 00" />
                   </div>
                   <div className="space-y-2">
                     <Label>البريد الإلكتروني (اختياري)</Label>
                     <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="email@example.com" />
                   </div>
                   <div className="space-y-2">
                     <Label>العنوان</Label>
                     <Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="الجزائر العاصمة" />
                   </div>
                 </div>
                 <DialogFooter>
                   <Button onClick={handleSaveCustomer} disabled={isSaving} className="w-full">
                     {isSaving ? "جاري الحفظ..." : "حفظ العميل"}
                   </Button>
                 </DialogFooter>
               </DialogContent>
             </Dialog>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
             <Card className="border-none shadow-sm bg-red-50 border-r-4 border-red-500">
               <CardHeader className="pb-2">
                 <CardTitle className="text-sm font-medium text-red-900">إجمالي الديون المعلقة</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold text-red-600 tabular-nums">{totalDebt.toLocaleString()} دج</div>
                 <p className="text-xs text-red-700 mt-1">يجب تحصيلها من {customersWithDebt} عميلاً</p>
               </CardContent>
             </Card>
             <Card className="border-none shadow-sm bg-green-50 border-r-4 border-green-500">
               <CardHeader className="pb-2">
                 <CardTitle className="text-sm font-medium text-green-900">عدد العملاء</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold text-green-600 tabular-nums">{customers?.length || 0}</div>
                 <p className="text-xs text-green-700 mt-1">عميل مسجل في النظام</p>
               </CardContent>
             </Card>
             <Card className="border-none shadow-sm bg-primary/5 border-r-4 border-primary">
               <CardHeader className="pb-2">
                 <CardTitle className="text-sm font-medium text-primary">أكثر العملاء نشاطاً</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="text-lg font-bold">{customers?.length ? customers[0].name : "---"}</div>
                 <p className="text-xs text-muted-foreground mt-1">إجمالي تعاملات جيدة</p>
               </CardContent>
             </Card>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="بحث بالاسم أو رقم الهاتف..." 
                className="pl-10 h-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Card className="border-none shadow-sm overflow-hidden">
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
                    <TableHead>العنوان</TableHead>
                    <TableHead className="text-left">الدين المستحق</TableHead>
                    <TableHead className="text-left">الحالة</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        لا يوجد عملاء مطابقين للبحث
                      </TableCell>
                    </TableRow>
                  ) : filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-muted/30 transition-colors group">
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
                      <TableCell className="text-muted-foreground">
                        {customer.address || "غير محدد"}
                      </TableCell>
                      <TableCell className={`text-left tabular-nums font-bold ${(customer.debt || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {(customer.debt || 0).toLocaleString()} دج
                      </TableCell>
                      <TableCell className="text-left">
                        <Badge 
                          variant={(customer.debt || 0) === 0 ? 'secondary' : 'outline'}
                          className="text-[10px]"
                        >
                          {(customer.debt || 0) === 0 ? 'خالص' : 'دين نشط'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(customer.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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
