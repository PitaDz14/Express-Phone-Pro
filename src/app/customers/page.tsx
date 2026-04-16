
"use client"

import * as React from "react"
import { 
  Users, 
  Plus, 
  Search, 
  Trash2,
  Edit3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Phone
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

export default function CustomersPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [customerName, setCustomerName] = React.useState("")
  const [customerPhone, setCustomerPhone] = React.useState("")
  const [sortConfig, setSortConfig] = React.useState({ key: 'name', direction: 'asc' })

  const customersRef = useMemoFirebase(() => collection(db, "customers"), [db])
  const { data: customers, isLoading } = useCollection(customersRef)

  const handleSort = (key: string) => {
    let direction = sortConfig.direction === 'desc' ? 'asc' : 'desc'
    setSortConfig({ key, direction })
  }

  const sortedCustomers = React.useMemo(() => {
    if (!customers) return [];
    let items = [...customers].filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
    if (sortConfig.direction) {
      items.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return items
  }, [customers, searchTerm, sortConfig])

  const handleAdd = () => {
    if (!customerName || !customerPhone) return;
    addDocumentNonBlocking(customersRef, {
      name: customerName,
      phone: customerPhone,
      debt: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    setOpen(false); setCustomerName(""); setCustomerPhone("");
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gradient-premium">العملاء والديون</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">تتبع مستحقاتك وعلاقاتك مع الزبائن</p>
        </div>
        <Button onClick={() => setOpen(true)} className="h-12 px-6 rounded-2xl bg-primary text-white shadow-lg gap-2 font-black">
          <Plus className="h-5 w-5" /> إضافة عميل
        </Button>
      </header>

      <div className="max-w-md">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="بحث عن عميل..." 
            className="pl-12 h-14 glass rounded-2xl border-none shadow-sm" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none glass rounded-[2.5rem] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => handleSort('name')} className="cursor-pointer">الاسم</TableHead>
              <TableHead>الهاتف</TableHead>
              <TableHead onClick={() => handleSort('debt')} className="text-left cursor-pointer">الدين</TableHead>
              <TableHead className="text-center">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></TableCell></TableRow>
            ) : sortedCustomers.map((c) => (
              <TableRow key={c.id} className="group hover:bg-white/40 border-black/5">
                <TableCell className="font-bold">{c.name}</TableCell>
                <TableCell className="flex items-center gap-2"><Phone className="h-3 w-3 text-muted-foreground" /> {c.phone}</TableCell>
                <TableCell className={`text-left font-black ${c.debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{c.debt.toLocaleString()} دج</TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteDocumentNonBlocking(doc(db, "customers", c.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="glass border-none rounded-[2rem]">
          <DialogHeader><DialogTitle className="text-2xl font-black">إضافة عميل جديد</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAdd} className="w-full h-12 rounded-2xl font-black">إضافة العميل</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
