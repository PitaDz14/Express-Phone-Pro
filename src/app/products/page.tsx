
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
  Loader2,
  Printer,
  ChevronLeft,
  Settings2,
  Image as ImageIcon,
  Link as LinkIcon,
  Upload,
  Maximize2,
  Layers,
  Filter,
  X,
  AlertCircle,
  Star
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { playSystemSound } from "@/lib/audio-utils"

// Memoized Row
const ProductRow = React.memo(({ p, onEdit, onDelete, onPrint, onZoomQR, onZoomImage, isAdmin }: { p: any, onEdit: any, onDelete: any, onPrint: any, onZoomQR: any, onZoomImage: any, isAdmin: boolean }) => (
  <TableRow className="group border-white/5 hover:bg-muted/30 transition-colors duration-200">
    <TableCell>
       <div className="flex items-center gap-3 min-w-[150px]">
          <div className="h-10 w-10 rounded-lg bg-card border border-border flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:scale-105 transition-transform" onClick={() => p.imageUrl && onZoomImage(p.imageUrl, p.name)}>
            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-muted-foreground/30" />}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
               <span className="font-black text-xs md:text-sm text-foreground">{p.name}</span>
               {p.isPriority && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" title="منتج عالي الأهمية" />}
            </div>
            <span className="text-[9px] md:text-[10px] text-muted-foreground font-bold">#{p.productCode}</span>
          </div>
       </div>
    </TableCell>
    <TableCell className="text-center">
      <Badge className={cn("px-2 md:px-4 rounded-lg font-black tabular-nums border-none text-[10px] md:text-xs", p.quantity <= (p.minStockQuantity || 1) ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600')}>
        {p.quantity}
      </Badge>
    </TableCell>
    <TableCell className="text-left font-black text-xs md:text-sm text-primary tabular-nums">{p.salePrice?.toLocaleString()} دج</TableCell>
    <TableCell className="text-center">
      <div className="flex items-center justify-center gap-1 md:gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-primary/10 text-primary" onClick={() => onPrint(p)}><Printer className="h-3 w-3" /></Button>
        {isAdmin && <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-orange-500/10 text-orange-600" onClick={() => onEdit(p)}><Edit3 className="h-3 w-3" /></Button>}
      </div>
    </TableCell>
  </TableRow>
))
ProductRow.displayName = "ProductRow"

export default function ProductsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user, role } = useUser()
  const isAdmin = role === "Admin"
  
  const [open, setOpen] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<any>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [productName, setProductName] = React.useState("")
  const [productCode, setProductCode] = React.useState("")
  const [imageUrl, setImageUrl] = React.useState("")
  const [categoryId, setCategoryId] = React.useState("")
  const [quantity, setQuantity] = React.useState(0)
  const [minStock, setMinStock] = React.useState(1)
  const [purchasePrice, setPurchasePrice] = React.useState(0)
  const [salePrice, setSalePrice] = React.useState(0)
  const [repairPrice, setRepairPrice] = React.useState(0)
  const [isPriority, setIsPriority] = React.useState(false)

  const productsRef = useMemoFirebase(() => collection(db, "products"), [db])
  const categoriesRef = useMemoFirebase(() => collection(db, "categories"), [db])
  const { data: products, isLoading } = useCollection(productsRef)
  const { data: categories } = useCollection(categoriesRef)

  const filteredProducts = React.useMemo(() => {
    if (!products) return [];
    const term = searchTerm.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(term) || p.productCode?.toLowerCase().includes(term));
  }, [products, searchTerm]);

  const handleSaveProduct = () => {
    if (!isAdmin || !productName || !categoryId || !user) return;
    const finalCode = productCode.trim() || `EP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const selectedCat = categories?.find(c => c.id === categoryId)
    const productData = {
      name: productName,
      productCode: finalCode,
      imageUrl,
      categoryId,
      categoryName: selectedCat?.name || "بدون تصنيف",
      quantity: Number(quantity),
      minStockQuantity: Number(minStock),
      purchasePrice: Number(purchasePrice),
      salePrice: Number(salePrice),
      repairPrice: Number(repairPrice),
      isPriority: isPriority,
      updatedAt: serverTimestamp(),
      updatedByUserId: user.uid
    }
    if (editingProduct) {
      updateDocumentNonBlocking(doc(db, "products", editingProduct.id), productData)
      toast({ title: "تم التعديل" })
      playSystemSound('success')
    } else {
      addDocumentNonBlocking(productsRef, { ...productData, createdAt: serverTimestamp(), createdByUserId: user.uid })
      toast({ title: "تمت الإضافة" })
      playSystemSound('success')
    }
    setOpen(false)
  }

  const handleEdit = React.useCallback((p: any) => {
    setEditingProduct(p); setProductName(p.name); setProductCode(p.productCode || ""); setImageUrl(p.imageUrl || ""); setSalePrice(p.salePrice); setQuantity(p.quantity); setMinStock(p.minStockQuantity || 1); setCategoryId(p.categoryId || ""); setIsPriority(p.isPriority || false); setOpen(true);
  }, [])

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-32">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl md:text-4xl font-black text-gradient-premium">المخزون</h1>
        {isAdmin && <Button onClick={() => { setEditingProduct(null); setProductName(""); setOpen(true); }} className="rounded-2xl bg-primary text-white"><Plus className="ml-2 h-5 w-5" /> منتج جديد</Button>}
      </header>

      <Card className="border-none glass rounded-[2rem] overflow-hidden">
        <Table>
           <TableHeader><TableRow><TableHead>المنتج</TableHead><TableHead className="text-center">المتوفر</TableHead><TableHead>السعر</TableHead><TableHead className="text-center">إجراءات</TableHead></TableRow></TableHeader>
           <TableBody>
              {filteredProducts.map(p => <ProductRow key={p.id} p={p} onEdit={handleEdit} isAdmin={isAdmin} onDelete={()=>{}} onPrint={()=>{}} onZoomImage={()=>{}} onZoomQR={()=>{}} />)}
           </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-2xl glass border-none rounded-[2.5rem] p-8">
           <DialogHeader><DialogTitle className="text-2xl font-black">بيانات المنتج</DialogTitle></DialogHeader>
           <div className="py-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2"><Label className="font-black text-xs">اسم المنتج</Label><Input value={productName} onChange={e => setProductName(e.target.value)} className="rounded-xl border-none glass h-12 font-bold" /></div>
                 <div className="space-y-2"><Label className="font-black text-xs">كود المنتج</Label><Input value={productCode} onChange={e => setProductCode(e.target.value)} className="rounded-xl border-none glass h-12 font-mono" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2"><Label className="font-black text-xs">التصنيف</Label><Select value={categoryId} onValueChange={setCategoryId}><SelectTrigger className="h-12 rounded-xl glass border-none font-bold"><SelectValue placeholder="اختر التصنيف..." /></SelectTrigger><SelectContent className="glass border-none rounded-xl z-[400]">{categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                 <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Star className={cn("h-5 w-5", isPriority ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
                       <Label className="font-black text-xs">منتج عالي الأهمية</Label>
                    </div>
                    <Switch checked={isPriority} onCheckedChange={setIsPriority} />
                 </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                 <div className="space-y-2"><Label className="font-black text-xs">المتوفر</Label><Input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="h-11 rounded-xl glass border-none text-center font-black" /></div>
                 <div className="space-y-2"><Label className="font-black text-xs">سعر البيع</Label><Input type="number" value={salePrice} onChange={e => setSalePrice(Number(e.target.value))} className="h-11 rounded-xl glass border-none text-center font-black text-primary" /></div>
                 <div className="space-y-2"><Label className="font-black text-xs">تنبيه النقص</Label><Input type="number" value={minStock} onChange={e => setMinStock(Number(e.target.value))} className="h-11 rounded-xl glass border-none text-center font-black text-red-600" /></div>
              </div>
           </div>
           <DialogFooter><Button onClick={handleSaveProduct} className="w-full h-14 rounded-2xl bg-primary text-white font-black text-lg">حفظ ومزامنة</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
