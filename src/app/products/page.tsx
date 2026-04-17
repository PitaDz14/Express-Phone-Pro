
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
  Settings2,
  X,
  Eye,
  Wrench,
  Tag,
  Layers,
  ChevronLeft,
  Sparkles,
  ChevronRight
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
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import Link from "next/link"

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc' | null;
}

const ProductRow = React.memo(({ p, onEdit, onDelete, onPrint }: { p: any, onEdit: any, onDelete: any, onPrint: any }) => (
  <TableRow className="group border-white/5 hover:bg-muted/30 transition-colors duration-200">
    <TableCell>
       <div className="flex flex-col">
          <span className="font-black text-sm text-foreground">{p.name}</span>
          <span className="text-[10px] text-muted-foreground font-bold">#{p.productCode}</span>
       </div>
    </TableCell>
    <TableCell className="text-center">
      <div className="h-10 w-10 mx-auto bg-white p-1 rounded-xl shadow-inner group-hover:scale-105 transition-transform cursor-pointer">
        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${p.productCode}`} className="h-full w-full" alt="QR" />
      </div>
    </TableCell>
    <TableCell className="text-center">
      <div className="flex flex-col items-center gap-1">
        <Badge variant="outline" className="px-3 rounded-lg border-primary/20 bg-primary/5 text-primary font-bold text-[10px]">
          {p.categoryPath || p.categoryName || "بدون تصنيف"}
        </Badge>
      </div>
    </TableCell>
    <TableCell className="text-center">
      <Badge className={cn("px-4 rounded-lg font-black tabular-nums border-none", p.quantity <= (p.minStockQuantity || 1) ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600')}>
        {p.quantity} {p.quantity <= (p.minStockQuantity || 1) && ' (منخفض)'}
      </Badge>
    </TableCell>
    <TableCell className="text-left">
      <div className="flex flex-col items-end">
         <span className="font-black text-sm text-primary tabular-nums">{p.salePrice?.toLocaleString()} دج</span>
         <span className="text-[9px] text-muted-foreground font-bold">تصليح: {p.repairPrice?.toLocaleString()} دج</span>
      </div>
    </TableCell>
    <TableCell className="text-center">
      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white"
          onClick={() => onPrint(p)}
          title="طباعة ملصق"
        >
          <Printer className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-lg bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white"
          onClick={() => onEdit(p)}
          title="تعديل"
        >
          <Edit3 className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white"
          onClick={() => onDelete(p)}
          title="حذف"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </TableCell>
  </TableRow>
))
ProductRow.displayName = "ProductRow"

export default function ProductsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  
  const [open, setOpen] = React.useState(false)
  const [printDialogOpen, setPrintDialogOpen] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<any>(null)
  const [printingProduct, setPrintingProduct] = React.useState<any>(null)
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: 'name', direction: 'asc' })
  const [searchTerm, setSearchTerm] = React.useState("")

  const [productName, setProductName] = React.useState("")
  const [productCode, setProductCode] = React.useState("")
  const [categoryId, setCategoryId] = React.useState("")
  const [quantity, setQuantity] = React.useState(0)
  const [minStock, setMinStock] = React.useState(1)
  const [purchasePrice, setPurchasePrice] = React.useState(0)
  const [salePrice, setSalePrice] = React.useState(0)
  const [repairPrice, setRepairPrice] = React.useState(0)

  const [printName, setPrintName] = React.useState("")
  const [printPrice, setPrintPrice] = React.useState(0)
  const [showPrice, setShowPrice] = React.useState(false)
  const [copies, setCopies] = React.useState(1)
  const [labelWidth, setLabelWidth] = React.useState(50) 
  const [labelHeight, setLabelHeight] = React.useState(30) 

  const productsRef = useMemoFirebase(() => collection(db, "products"), [db])
  const categoriesRef = useMemoFirebase(() => collection(db, "categories"), [db])
  
  const { data: products, isLoading } = useCollection(productsRef)
  const { data: categories } = useCollection(categoriesRef)

  const handleSort = React.useCallback((key: string) => {
    let direction: 'asc' | 'desc' | null = 'desc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'desc') direction = 'asc';
      else if (sortConfig.direction === 'asc') direction = null;
    }
    setSortConfig({ key, direction });
  }, [sortConfig])

  const sortedProducts = React.useMemo(() => {
    if (!products) return [];
    const term = searchTerm.toLowerCase()
    let items = products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.productCode && p.productCode.toLowerCase().includes(term)) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(term)) ||
      (p.categoryPath && p.categoryPath.toLowerCase().includes(term))
    );

    if (sortConfig.key && sortConfig.direction) {
      items.sort((a, b) => {
        const aValue = a[sortConfig.key] || "";
        const bValue = b[sortConfig.key] || "";
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [products, searchTerm, sortConfig]);

  const getFullCategoryPath = (catId: string, allCats: any[]): string => {
    const cat = allCats.find(c => c.id === catId);
    if (!cat) return "";
    if (!cat.parentId) return cat.name;
    return `${getFullCategoryPath(cat.parentId, allCats)} > ${cat.name}`;
  }

  const handleSaveProduct = () => {
    if (!productName || !categoryId || salePrice <= 0) {
      toast({ title: "خطأ", description: "يرجى ملء الحقول الإجبارية واختيار التصنيف", variant: "destructive" })
      return
    }
    
    const finalCode = productCode.trim() || `EP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const selectedCat = categories?.find(c => c.id === categoryId)
    const categoryPath = categories ? getFullCategoryPath(categoryId, categories) : (selectedCat?.name || "بدون تصنيف");

    const productData = {
      name: productName,
      productCode: finalCode,
      categoryId,
      categoryName: selectedCat?.name || "بدون تصنيف",
      categoryPath: categoryPath,
      quantity: Number(quantity),
      minStockQuantity: Number(minStock),
      purchasePrice: Number(purchasePrice),
      salePrice: Number(salePrice),
      repairPrice: Number(repairPrice),
      updatedAt: serverTimestamp()
    }

    if (editingProduct) {
      updateDocumentNonBlocking(doc(db, "products", editingProduct.id), productData)
      toast({ title: "تم التعديل", description: "تم تحديث بيانات المنتج بنجاح" })
    } else {
      addDocumentNonBlocking(productsRef, { ...productData, createdAt: serverTimestamp() })
      toast({ title: "تمت الإضافة", description: `تم إضافة المنتج بالكود: ${finalCode}` })
    }
    
    setOpen(false)
    resetForm()
  }

  const resetForm = React.useCallback(() => {
    setProductName(""); setProductCode(""); setQuantity(0); setSalePrice(0); setRepairPrice(0); setEditingProduct(null); setMinStock(1); setPurchasePrice(0); setCategoryId("")
  }, [])

  const handleOpenPrint = React.useCallback((p: any) => {
    setPrintingProduct(p)
    setPrintName(p.name)
    setPrintPrice(p.salePrice) 
    setShowPrice(false)
    setCopies(1)
    setPrintDialogOpen(true)
  }, [])

  const handleEdit = React.useCallback((p: any) => {
    setEditingProduct(p); setProductName(p.name); setProductCode(p.productCode || ""); setSalePrice(p.salePrice); setRepairPrice(p.repairPrice || 0); setQuantity(p.quantity); setMinStock(p.minStockQuantity || 1); setPurchasePrice(p.purchasePrice); setCategoryId(p.categoryId || ""); setOpen(true);
  }, [])

  const handleDelete = React.useCallback((p: any) => {
    if(confirm("هل أنت متأكد من حذف المنتج؟")) deleteDocumentNonBlocking(doc(db, "products", p.id))
  }, [db])

  const executePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const labelsHtml = Array(copies).fill(0).map(() => `<div class="label-container"><div class="product-name">${printName}</div>${showPrice ? `<div class="product-price">${printPrice.toLocaleString()} دج</div>` : ''}<div class="qr-code"><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${printingProduct.productCode}" /></div><div class="product-code">#${printingProduct.productCode}</div></div>`).join('');
    printWindow.document.write(`<html dir="rtl"><head><title>طباعة ملصقات - ${printName}</title><style>@page { margin: 0; } body { margin: 0; padding: 0; font-family: sans-serif; } .label-container { width: ${labelWidth}mm; height: ${labelHeight}mm; border: 1px dashed #ccc; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; box-sizing: border-box; padding: 2mm; page-break-after: always; text-align: center; } .product-name { font-size: 10pt; font-weight: bold; margin-bottom: 1mm; } .product-price { font-size: 12pt; font-weight: black; color: #000; margin-bottom: 1mm; } .qr-code img { width: ${labelHeight * 0.4}mm; height: ${labelHeight * 0.4}mm; } .product-code { font-size: 8pt; color: #666; margin-top: 1mm; } @media print { .label-container { border: none; } }</style></head><body onload="window.print(); window.close();">${labelsHtml}</body></html>`);
    printWindow.document.close();
    setPrintDialogOpen(false);
  }

  const renderCategoryOptions = (cats: any[], parentId: string | null = null, depth = 0, currentPath = "") => {
    return cats
      .filter(c => c.parentId === parentId)
      .map(cat => {
        const fullPath = currentPath ? `${currentPath} > ${cat.name}` : cat.name;
        return (
          <React.Fragment key={cat.id}>
            <SelectItem value={cat.id} className={cn(depth > 0 && "pr-6 font-medium")}>
              <div className="flex items-center gap-2">
                {depth > 0 && <ChevronLeft className="h-3 w-3 opacity-30" />}
                <span className={cn(depth === 0 ? "font-black" : "text-xs")}>{fullPath}</span>
              </div>
            </SelectItem>
            {renderCategoryOptions(cats, cat.id, depth + 1, fullPath)}
          </React.Fragment>
        )
      })
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32 animate-in fade-in duration-300">
      <header className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col text-center md:text-right">
          <h1 className="text-4xl font-black text-gradient-premium tracking-tighter">إدارة المخزون الذكي</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.3em] mt-1">تتبع دقيق وتصنيفات هرمية | Express Phone Pro</p>
        </div>
        <Button 
          onClick={() => { resetForm(); setOpen(true); }} 
          className="h-14 px-10 rounded-2xl bg-primary text-white shadow-xl hover:scale-105 transition-transform gap-3 font-black text-lg"
        >
          <Plus className="h-7 w-7" /> إضافة منتج جديد
        </Button>
      </header>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="بحث سريع..." 
            className="pl-12 h-14 glass rounded-2xl border-none shadow-sm font-bold text-sm text-foreground" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none glass rounded-[2.5rem] overflow-hidden shadow-xl">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-white/10">
              <TableHead className="cursor-pointer font-black h-16 text-foreground" onClick={() => handleSort('name')}>
                المنتج {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="text-center font-black h-16 text-foreground">باركود</TableHead>
              <TableHead className="text-center font-black h-16 text-foreground">التصنيف الكامل (الهيكل)</TableHead>
              <TableHead className="text-center font-black h-16 text-foreground">الكمية</TableHead>
              <TableHead className="text-left font-black h-16 text-foreground">السعر</TableHead>
              <TableHead className="text-center font-black h-16 w-48 text-foreground">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary opacity-50" /></TableCell></TableRow>
            ) : sortedProducts.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground font-bold italic opacity-30">لا توجد منتجات</TableCell></TableRow>
            ) : sortedProducts.map((p) => (
              <ProductRow key={p.id} p={p} onEdit={handleEdit} onDelete={handleDelete} onPrint={handleOpenPrint} />
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="glass border-none rounded-[2.5rem] shadow-2xl max-w-2xl z-[210]">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black text-gradient-premium mb-4">
              {editingProduct ? 'تحديث المنتج' : 'إضافة منتج جديد'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-black text-xs text-primary px-1">اسم المنتج</Label>
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} className="rounded-2xl h-12 glass border-none font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs text-primary px-1">كود المنتج</Label>
                <Input value={productCode} onChange={(e) => setProductCode(e.target.value)} className="rounded-2xl h-12 glass border-none font-bold" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-black text-xs text-primary px-1">اختيار التصنيف / العلامة التجارية</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-12 rounded-2xl glass border-none font-bold">
                  <SelectValue placeholder="اختر التصنيف أو الماركة..." />
                </SelectTrigger>
                <SelectContent className="glass border-none rounded-2xl z-[220] max-h-[300px]">
                  {categories && renderCategoryOptions(categories)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-black text-xs text-primary px-1">سعر الشراء</Label>
                <Input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(Number(e.target.value))} className="rounded-2xl h-12 glass border-none font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs text-primary px-1">سعر البيع</Label>
                <Input type="number" value={salePrice} onChange={(e) => setSalePrice(Number(e.target.value))} className="rounded-2xl h-12 glass border-none font-bold text-emerald-600" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-black text-xs text-primary px-1">سعر التصليح</Label>
                <Input type="number" value={repairPrice} onChange={(e) => setRepairPrice(Number(e.target.value))} className="rounded-2xl h-12 glass border-none font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs text-primary px-1">الكمية</Label>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="rounded-2xl h-12 glass border-none font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs text-primary px-1">الحد الأدنى</Label>
                <Input type="number" value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} className="rounded-2xl h-12 glass border-none font-bold" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveProduct} className="w-full h-14 rounded-2xl font-black bg-primary text-white shadow-xl text-lg">حفظ البيانات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent dir="rtl" className="glass border-none rounded-[2.5rem] max-w-xl shadow-2xl z-[210]">
          <DialogHeader><DialogTitle className="text-2xl font-black">إعدادات الطباعة</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-4">
             <div className="space-y-4 p-4 glass rounded-2xl bg-card">
               <Label className="text-[10px] font-black uppercase opacity-50">الاسم على الملصق</Label>
               <Input value={printName} onChange={(e) => setPrintName(e.target.value)} className="rounded-xl border-none shadow-sm font-bold" />
               
               <div className="flex items-center justify-between p-2">
                 <Label className="font-black text-xs">إدراج السعر</Label>
                 <Switch checked={showPrice} onCheckedChange={setShowPrice} />
               </div>

               {showPrice && (
                 <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="text-[10px] h-8 rounded-lg" onClick={() => setPrintPrice(printingProduct?.salePrice || 0)}>سعر البيع</Button>
                    <Button variant="outline" className="text-[10px] h-8 rounded-lg" onClick={() => setPrintPrice(printingProduct?.repairPrice || 0)}>سعر التصليح</Button>
                 </div>
               )}
               <Input type="number" value={copies} onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))} className="rounded-xl border-none" placeholder="عدد النسخ" />
             </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)} className="flex-1 rounded-xl">إلغاء</Button>
            <Button onClick={executePrint} className="flex-1 rounded-xl bg-primary text-white">طباعة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
