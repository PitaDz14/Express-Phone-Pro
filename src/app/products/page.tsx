
"use client"

import * as React from "react"
import { 
  Package, 
  Plus, 
  Search, 
  Trash2,
  Edit3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2
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

export default function ProductsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [open, setOpen] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<any>(null)
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: 'name', direction: 'asc' })
  const [searchTerm, setSearchTerm] = React.useState("")

  const [productName, setProductName] = React.useState("")
  const [productCode, setProductCode] = React.useState("")
  const [category, setCategory] = React.useState("قطع غيار")
  const [quantity, setQuantity] = React.useState(0)
  const [minStock, setMinStock] = React.useState(5)
  const [purchasePrice, setPurchasePrice] = React.useState(0)
  const [salePrice, setSalePrice] = React.useState(0)

  const productsRef = useMemoFirebase(() => collection(db, "products"), [db])
  const { data: products, isLoading } = useCollection(productsRef)

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'desc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'desc') direction = 'asc';
      else if (sortConfig.direction === 'asc') direction = null;
    }
    setSortConfig({ key, direction });
  }

  const sortedProducts = React.useMemo(() => {
    if (!products) return [];
    let items = [...products].filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.productCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortConfig.key && sortConfig.direction) {
      items.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [products, searchTerm, sortConfig]);

  const handleSaveProduct = () => {
    if (!productName || !productCode || salePrice <= 0) return;
    
    const productData = {
      name: productName,
      productCode,
      category,
      quantity: Number(quantity),
      minStockQuantity: Number(minStock),
      purchasePrice: Number(purchasePrice),
      salePrice: Number(salePrice),
      updatedAt: serverTimestamp(),
    }

    if (editingProduct) {
      updateDocumentNonBlocking(doc(db, "products", editingProduct.id), productData)
    } else {
      addDocumentNonBlocking(productsRef, { ...productData, createdAt: serverTimestamp() })
    }
    
    setOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setProductName(""); setProductCode(""); setQuantity(0); setSalePrice(0); setEditingProduct(null);
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="h-3 w-3 opacity-20" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gradient-premium">المخزون والمنتجات</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">إدارة شاملة لجميع الأصناف المتاحة</p>
        </div>
        <Button onClick={() => setOpen(true)} className="h-12 px-6 rounded-2xl bg-primary text-white shadow-lg gap-2 font-black">
          <Plus className="h-5 w-5" /> إضافة منتج
        </Button>
      </header>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="بحث بالاسم أو الكود..." 
            className="pl-12 h-14 glass rounded-2xl border-none shadow-sm" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none glass rounded-[2.5rem] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-2">المنتج <SortIcon column="name" /></div>
              </TableHead>
              <TableHead className="text-center">QR</TableHead>
              <TableHead className="text-center cursor-pointer" onClick={() => handleSort('quantity')}>
                <div className="flex items-center justify-center gap-2">الكمية <SortIcon column="quantity" /></div>
              </TableHead>
              <TableHead className="text-left cursor-pointer" onClick={() => handleSort('salePrice')}>
                <div className="flex items-center gap-2 justify-end"><SortIcon column="salePrice" /> السعر</div>
              </TableHead>
              <TableHead className="text-center">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></TableCell></TableRow>
            ) : sortedProducts.map((p) => (
              <TableRow key={p.id} className="group border-black/5 hover:bg-white/40">
                <TableCell className="font-bold">{p.name}</TableCell>
                <TableCell className="text-center">
                  <div className="h-10 w-10 mx-auto bg-white p-1 rounded-lg">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${p.productCode}`} className="h-full w-full" />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={p.quantity <= (p.minStockQuantity || 5) ? 'bg-red-500' : 'bg-emerald-500'}>
                    {p.quantity} {p.quantity <= (p.minStockQuantity || 5) && ' (منخفض)'}
                  </Badge>
                </TableCell>
                <TableCell className="text-left font-black text-primary">{p.salePrice.toLocaleString()} دج</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingProduct(p); setProductName(p.name); setProductCode(p.productCode); setOpen(true); }}><Edit3 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, "products", p.id))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="glass border-none rounded-[2rem]">
          <DialogHeader><DialogTitle className="text-2xl font-black">إضافة / تعديل منتج</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>اسم المنتج</Label>
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>كود المنتج</Label>
                <Input value={productCode} onChange={(e) => setProductCode(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>السعر (دج)</Label>
                <Input type="number" value={salePrice} onChange={(e) => setSalePrice(Number(e.target.value))} className="rounded-xl" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveProduct} className="w-full h-12 rounded-2xl font-black">حفظ البيانات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
