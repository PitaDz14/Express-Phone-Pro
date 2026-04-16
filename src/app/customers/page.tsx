
"use client"

import * as React from "react"
import { 
  Users, 
  Plus, 
  Search, 
  Phone,
  Trash2,
  Edit3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc' | null;
}

export default function CustomersPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: 'name', direction: 'asc' })

  const [customerName, setCustomerName] = React.useState("")
  const [customerPhone, setCustomerPhone] = React.useState("")
  const [customerEmail, setCustomerEmail] = React.useState("")
  const [customerAddress, setCustomerAddress] = React.useState("")

  const customersRef = useMemoFirebase(() => collection(db, "customers"), [db])
  const { data: customers, isLoading } = useCollection(customersRef)

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'desc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'desc') direction = 'asc';
      else if (sortConfig.direction === 'asc') direction = null;
    }
    setSortConfig({ key, direction });
  }

  const sortedCustomers = React.useMemo(() => {
    if (!customers) return [];
    let items = [...customers].filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
    );

    if (sortConfig.key && sortConfig.direction) {
      items.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [customers, searchTerm, sortConfig]);

  const handleSaveCustomer = () => {
    if (!customerName || !customerPhone) return;
    addDocumentNonBlocking(customersRef, {
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      address: customerAddress,
      debt: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    setOpen(false)
    toast({ title: "تم النجاح", description: "تم إضافة العميل بنجاح" })
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="h-3 w-3 text-primary" />;
    if (sortConfig.direction === 'desc') return <ArrowDown className="h-3 w-3 text-primary" />;
    return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  }

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <header className="flex h-16 items-center justify-between border-b px-6 bg-white sticky top-0 z-10">
          <h1 className="text-xl font-bold">العملاء والديون</h1>
          <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> إضافة عميل</Button>
        </header>

        <main className="p-6 space-y-6">
          <Input placeholder="بحث..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-md h-12 rounded-2xl" />
          
          <Card className="border-none glass rounded-[2.5rem] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-2">اسم العميل <SortIcon column="name" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('phone')}>
                    <div className="flex items-center gap-2">الهاتف <SortIcon column="phone" /></div>
                  </TableHead>
                  <TableHead className="text-left cursor-pointer" onClick={() => handleSort('debt')}>
                    <div className="flex items-center gap-2 justify-end"><SortIcon column="debt" /> الدين المستحق</div>
                  </TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCustomers.map((c) => (
                  <TableRow key={c.id} className="group hover:bg-white/30">
                    <TableCell className="font-bold">{c.name}</TableCell>
                    <TableCell className="tabular-nums">{c.phone}</TableCell>
                    <TableCell className={`text-left font-black ${c.debt > 0 ? 'text-red-600' : 'text-green-600'}`}>{c.debt.toLocaleString()} دج</TableCell>
                    <TableCell className="text-center opacity-0 group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, "customers", c.id))}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
