
"use client"

import * as React from "react"
import { 
  Package, 
  Plus, 
  Search, 
  Printer, 
  QrCode, 
  Sparkles,
  Loader2,
  Trash2,
  Edit3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Image as ImageIcon
} from "lucide-react"
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { generateProductDescription } from "@/ai/flows/ai-product-description-generator"
import { Textarea } from "@/components/ui/textarea"
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
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<any>(null)
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: 'name', direction: 'asc' })
  
  const [productName, setProductName] = React.useState("")
  const [productCode, setProductCode] = React.useState("")
  const [category, setCategory] = React.useState("قطع غيار")
  const [quantity, setQuantity] = React.useState(0)
  const [minStock, setMinStock] = React.useState(5)
  const [purchasePrice, setPurchasePrice] = React.useState(0)
  const [salePrice, setSalePrice] = React.useState(0)
  const [keywords, setKeywords] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [imageUrl, setImageUrl] = React.useState("")
  const [searchTerm, setSearchTerm] = React.useState("")

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
    if (!productName || !productCode || salePrice <= 0) {
      toast({ title: "خطأ", description: "يرجى ملء البيانات الأساسية", variant: "destructive" })
      return
    }

    setIsSaving(true)
    const productData = {
      name: productName,
      productCode,
      category,
      quantity: Number(quantity),
      minStockQuantity: Number(minStock),
      purchasePrice: Number(purchasePrice),
      salePrice: Number(salePrice),
      description,
      imageUrl: imageUrl || `https://picsum.photos/seed/${productCode}/200/200`,
      updatedAt: serverTimestamp(),
    }

    if (editingProduct) {
      const docRef = doc(db, "products", editingProduct.id)
      updateDocumentNonBlocking(docRef, productData)
      toast({ title: "تم التحديث", description: "تم تعديل بيانات المنتج بنجاح" })
    } else {
      addDocumentNonBlocking(productsRef, {
        ...productData,
        createdAt: serverTimestamp(),
      })
      toast({ title: "تم الإضافة", description: "تم إضافة المنتج بنجاع للمخزون" })
    }
    
    resetForm()
    setOpen(false)
    setIsSaving(false)
  }

  const resetForm = () => {
    setProductName("")
    setProductCode("")
    setQuantity(0)
    setMinStock(5)
    setPurchasePrice(0)
    setSalePrice(0)
    setKeywords("")
    setDescription("")
    setImageUrl("")
    setEditingProduct(null)
  }

  const handleEdit = (product: any) => {
    setEditingProduct(product)
    setProductName(product.name)
    setProductCode(product.productCode)
    setCategory(product.category)
    setQuantity(product.quantity)
    setMinStock(product.minStockQuantity || 5)
    setPurchasePrice(product.purchasePrice)
    setSalePrice(product.salePrice)
    setDescription(product.description || "")
    setImageUrl(product.imageUrl || "")
    setOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("حذف هذا المنتج من المخزون؟")) {
      const docRef = doc(db, "products", id)
      deleteDocumentNonBlocking(docRef)
      toast({ title: "تم الحذف", description: "تم حذف المنتج من المخزون" })
    }
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
      <SidebarInset className="bg-transparent">
        <header className="flex h-20 shrink-0 items-center justify-between border-b px-8 glass sticky top-0 z-50 no-print">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-gradient">إدارة المخزون الذكي</h1>
              <p className="text-[10px] text-muted-foreground font-bold">تحكم كامل في منتجاتك وملصقاتها</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Dialog open={open} onOpenChange={(val) => { if(!val) resetForm(); setOpen(val); }}>
               <DialogTrigger asChild>
                 <Button className="h-11 px-6 rounded-2xl bg-gradient-to-r from-primary to-accent text-white shadow-lg card-3d gap-2">
                   <Plus className="h-5 w-5" />
                   إضافة منتج جديد
                 </Button>
               </DialogTrigger>
               <DialogContent className="sm:max-w-[700px] glass border-none shadow-2xl overflow-y-auto max-h-[90vh]" dir="rtl">
                 <DialogHeader>
                   <DialogTitle className="text-2xl font-black">{editingProduct ? "تعديل بيانات المنتج" : "إضافة منتج جديد"}</DialogTitle>
                 </DialogHeader>
                 {/* Form Fields... */}
                 <DialogFooter>
                   <Button className="w-full h-12 rounded-2xl bg-primary text-white font-black" onClick={handleSaveProduct} disabled={isSaving}>
                     {isSaving ? "جاري الحفظ..." : "حفظ المنتج"}
                   </Button>
                 </DialogFooter>
               </DialogContent>
             </Dialog>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 space-y-8">
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="relative w-full md:w-[500px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="بحث..." className="pl-12 h-12 glass border-none rounded-2xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <Card className="border-none glass shadow-2xl rounded-[2.5rem] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-center">QR</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-2">المنتج <SortIcon column="name" /></div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer" onClick={() => handleSort('category')}>
                    <div className="flex items-center justify-center gap-2">الفئة <SortIcon column="category" /></div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer" onClick={() => handleSort('quantity')}>
                    <div className="flex items-center justify-center gap-2">المخزون <SortIcon column="quantity" /></div>
                  </TableHead>
                  <TableHead className="text-left cursor-pointer" onClick={() => handleSort('salePrice')}>
                    <div className="flex items-center gap-2 justify-end"><SortIcon column="salePrice" /> السعر</div>
                  </TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProducts.map((p) => (
                  <TableRow key={p.id} className="group border-white/5 hover:bg-white/30">
                    <TableCell className="text-center">
                      <div className="h-10 w-10 mx-auto bg-white p-1 rounded-lg">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${p.productCode}`} className="h-full w-full" />
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">{p.name}</TableCell>
                    <TableCell className="text-center"><Badge variant="outline">{p.category}</Badge></TableCell>
                    <TableCell className="text-center font-black">{p.quantity}</TableCell>
                    <TableCell className="text-left font-black text-primary">{p.salePrice.toLocaleString()} دج</TableCell>
                    <TableCell className="text-center">
                      <Badge className={p.quantity <= (p.minStockQuantity || 5) ? 'bg-red-500' : 'bg-emerald-500'}>
                        {p.quantity === 0 ? 'نفذ' : p.quantity <= (p.minStockQuantity || 5) ? 'منخفض' : 'متوفر'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center opacity-0 group-hover:opacity-100">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}><Edit3 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
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
