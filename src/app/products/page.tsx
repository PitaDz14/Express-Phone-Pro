
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
  X,
  ChevronLeft,
  Eye,
  Settings2,
  Image as ImageIcon,
  Link as LinkIcon,
  Upload,
  Maximize2,
  Layers
} from "lucide-react"
import { Card } from "@/components/ui/card"
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
import { Separator } from "@/components/ui/separator"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import Link from "next/link"

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc' | null;
}

const ProductRow = React.memo(({ p, onEdit, onDelete, onPrint, onZoomQR, onZoomImage }: { p: any, onEdit: any, onDelete: any, onPrint: any, onZoomQR: any, onZoomImage: any }) => (
  <TableRow className="group border-white/5 hover:bg-muted/30 transition-colors duration-200">
    <TableCell>
       <div className="flex items-center gap-3 min-w-[150px]">
          <div 
            className="h-10 w-10 rounded-lg bg-card border border-border flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:scale-110 transition-transform"
            onClick={() => p.imageUrl && onZoomImage(p.imageUrl, p.name)}
          >
            {p.imageUrl ? (
              <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xs md:text-sm text-foreground">{p.name}</span>
            <span className="text-[9px] md:text-[10px] text-muted-foreground font-bold">#{p.productCode}</span>
          </div>
       </div>
    </TableCell>
    <TableCell className="text-center">
      <div 
        className="h-8 w-8 md:h-10 md:w-10 mx-auto bg-white p-1 rounded-lg md:rounded-xl shadow-inner group-hover:scale-105 transition-transform cursor-pointer relative group/qr"
        onClick={() => onZoomQR(p.productCode, p.name)}
      >
        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${p.productCode}`} className="h-full w-full" alt="QR" />
        <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover/qr:opacity-100 transition-opacity">
           <Maximize2 className="h-3 w-3 text-white" />
        </div>
      </div>
    </TableCell>
    <TableCell className="text-center">
      <Badge variant="outline" className="px-2 md:px-3 rounded-lg border-primary/20 bg-primary/5 text-primary font-bold text-[8px] md:text-[10px]">
        {p.categoryPath || p.categoryName || "بدون تصنيف"}
      </Badge>
    </TableCell>
    <TableCell className="text-center">
      <Badge className={cn("px-2 md:px-4 rounded-lg font-black tabular-nums border-none text-[10px] md:text-xs", p.quantity <= (p.minStockQuantity || 1) ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600')}>
        {p.quantity}
      </Badge>
    </TableCell>
    <TableCell className="text-left">
      <div className="flex flex-col items-end min-w-[80px]">
         <span className="font-black text-xs md:text-sm text-primary tabular-nums">{p.salePrice?.toLocaleString()} دج</span>
         <span className="text-[8px] md:text-[9px] text-muted-foreground font-bold">تصليح: {p.repairPrice?.toLocaleString()}</span>
      </div>
    </TableCell>
    <TableCell className="text-center">
      <div className="flex items-center justify-center gap-1 md:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
        <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-primary/10 text-primary" onClick={() => onPrint(p)}><Printer className="h-3 w-3 md:h-4 md:w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-orange-500/10 text-orange-600" onClick={() => onEdit(p)}><Edit3 className="h-3 w-3 md:h-4 md:w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-destructive/10 text-destructive" onClick={() => onDelete(p)}><Trash2 className="h-3 w-3 md:h-4 md:w-4" /></Button>
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
  const [zoomQR, setZoomQR] = React.useState<{ code: string, name: string } | null>(null)
  const [zoomImage, setZoomImage] = React.useState<{ url: string, name: string } | null>(null)
  const [editingProduct, setEditingProduct] = React.useState<any>(null)
  const [printingProduct, setPrintingProduct] = React.useState<any>(null)
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: 'name', direction: 'asc' })
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

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'desc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'desc') direction = 'asc';
      else if (sortConfig.direction === 'asc') direction = 'desc';
    } else {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  }

  const sortedProducts = React.useMemo(() => {
    if (!products) return [];
    const term = searchTerm.toLowerCase()
    let items = products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.productCode && p.productCode.toLowerCase().includes(term)) ||
      (p.categoryPath && p.categoryPath.toLowerCase().includes(term))
    );

    if (sortConfig.key && sortConfig.direction) {
      items.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? "";
        const bValue = b[sortConfig.key] ?? "";
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImageUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
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
      imageUrl: imageUrl,
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
    setProductName(""); setProductCode(""); setImageUrl(""); setQuantity(0); setSalePrice(0); setRepairPrice(0); setEditingProduct(null); setMinStock(1); setPurchasePrice(0); setCategoryId("")
  }, [])

  const handleOpenPrint = React.useCallback((p: any) => {
    setPrintingProduct(p); setPrintName(p.name); setPrintPrice(p.salePrice); setShowPrice(false); setCopies(1); setPrintDialogOpen(true);
  }, [])

  const handleEdit = React.useCallback((p: any) => {
    setEditingProduct(p); setProductName(p.name); setProductCode(p.productCode || ""); setImageUrl(p.imageUrl || ""); setSalePrice(p.salePrice); setRepairPrice(p.repairPrice || 0); setQuantity(p.quantity); setMinStock(p.minStockQuantity || 1); setPurchasePrice(p.purchasePrice); setCategoryId(p.categoryId || ""); setOpen(true);
  }, [])

  const handleDelete = React.useCallback((p: any) => {
    if(confirm("هل أنت متأكد من حذف المنتج؟")) deleteDocumentNonBlocking(doc(db, "products", p.id))
  }, [])

  const executePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const labelsHtml = Array(copies).fill(0).map(() => `
      <div class="label-container">
        <div class="product-name">${printName}</div>
        ${showPrice ? `<div class="product-price">${printPrice.toLocaleString()} دج</div>` : ''}
        <div class="qr-code">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${printingProduct.productCode}" />
        </div>
        <div class="product-code">#${printingProduct.productCode}</div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>طباعة ملصقات - ${printName}</title>
          <style>
            @page { margin: 0; }
            body { margin: 0; padding: 0; font-family: sans-serif; }
            .label-container { 
              width: ${labelWidth}mm; 
              height: ${labelHeight}mm; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              overflow: hidden; 
              box-sizing: border-box; 
              padding: 2mm; 
              page-break-after: always; 
              text-align: center; 
              background: white;
            }
            .product-name { font-size: 10pt; font-weight: bold; margin-bottom: 1mm; line-height: 1.1; }
            .product-price { font-size: 12pt; font-weight: 800; color: #000; margin-bottom: 1mm; }
            .qr-code img { width: ${labelHeight * 0.45}mm; height: ${labelHeight * 0.45}mm; }
            .product-code { font-size: 8pt; color: #000; margin-top: 1mm; font-weight: 600; }
          </style>
        </head>
        <body onload="window.print(); window.close();">${labelsHtml}</body>
      </html>
    `);
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

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="h-3 w-3 text-primary" />;
    if (sortConfig.direction === 'desc') return <ArrowDown className="h-3 w-3 text-primary" />;
    return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 pb-32 overflow-x-hidden">
      <header className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col text-center md:text-right">
          <h1 className="text-2xl md:text-4xl font-black text-gradient-premium tracking-tighter">إدارة المخزون</h1>
          <p className="text-[9px] md:text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1">تتبع دقيق وتصنيفات هرمية</p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <Button asChild variant="outline" className="w-full md:w-auto h-12 md:h-14 px-6 rounded-2xl glass border-white/20 gap-2 font-black">
            <Link href="/categories">
              <Layers className="h-5 w-5 text-primary" /> إدارة التصنيفات
            </Link>
          </Button>
          <Button onClick={() => { resetForm(); setOpen(true); }} className="w-full md:w-auto h-12 md:h-14 px-6 md:px-10 rounded-2xl bg-primary text-white shadow-xl gap-2 font-black">
            <Plus className="h-5 w-5 md:h-7 md:w-7" /> إضافة منتج جديد
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="بحث عن منتج..." 
            className="pl-12 h-12 md:h-14 glass rounded-2xl border-none shadow-sm font-bold text-sm" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none glass rounded-[2rem] overflow-hidden shadow-xl">
        <div className="table-container">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/10">
                <TableHead className="font-black text-foreground cursor-pointer group" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-2">المنتج <SortIcon column="name" /></div>
                </TableHead>
                <TableHead className="text-center font-black text-foreground">باركود</TableHead>
                <TableHead className="text-center font-black text-foreground cursor-pointer" onClick={() => handleSort('categoryName')}>
                  <div className="flex items-center justify-center gap-2">التصنيف <SortIcon column="categoryName" /></div>
                </TableHead>
                <TableHead className="text-center font-black text-foreground cursor-pointer" onClick={() => handleSort('quantity')}>
                  <div className="flex items-center justify-center gap-2">كمية <SortIcon column="quantity" /></div>
                </TableHead>
                <TableHead className="text-left font-black text-foreground cursor-pointer" onClick={() => handleSort('salePrice')}>
                  <div className="flex items-center justify-end gap-2">السعر <SortIcon column="salePrice" /></div>
                </TableHead>
                <TableHead className="text-center font-black text-foreground">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : sortedProducts.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20 opacity-30 italic font-black">لا توجد منتجات مسجلة</TableCell></TableRow>
              ) : sortedProducts.map((p) => (
                <ProductRow 
                  key={p.id} p={p} 
                  onEdit={handleEdit} 
                  onDelete={handleDelete} 
                  onPrint={handleOpenPrint} 
                  onZoomQR={(code: string, name: string) => setZoomQR({ code, name })}
                  onZoomImage={(url: string, name: string) => setZoomImage({ url, name })}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="glass border-none rounded-[2rem] md:rounded-[2.5rem] shadow-2xl max-w-2xl z-[310] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl md:text-3xl font-black text-gradient-premium">{editingProduct ? 'تحديث المنتج' : 'إضافة منتج جديد'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:gap-6 py-4">
            <div className="flex items-center gap-6 p-4 glass rounded-2xl border-primary/10">
               <div className="h-24 w-24 rounded-2xl bg-card border border-border flex items-center justify-center overflow-hidden shrink-0 relative group">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                  )}
                  <Label htmlFor="image-upload" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Upload className="h-6 w-6 text-white" />
                  </Label>
                  <Input id="image-upload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
               </div>
               <div className="flex-1 space-y-2">
                  <Label className="font-black text-[10px] text-primary">رابط الصورة (اختياري)</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="https://example.com/image.jpg" 
                      value={imageUrl} 
                      onChange={(e) => setImageUrl(e.target.value)} 
                      className="pl-9 h-10 glass border-none rounded-xl font-bold text-xs" 
                    />
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="font-black text-[10px] text-primary">اسم المنتج</Label>
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} className="rounded-xl h-10 md:h-12 glass border-none font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="font-black text-[10px] text-primary">كود المنتج (QR)</Label>
                <Input value={productCode} onChange={(e) => setProductCode(e.target.value)} className="rounded-xl h-10 md:h-12 glass border-none font-bold" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="font-black text-[10px] text-primary">التصنيف الهرمي</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-10 md:h-12 rounded-xl glass border-none font-bold">
                  <SelectValue placeholder="اختر التصنيف..." />
                </SelectTrigger>
                <SelectContent className="glass border-none rounded-xl z-[320] max-h-[300px]">
                  {categories && renderCategoryOptions(categories)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="font-black text-[10px] text-primary">سعر الشراء (دج)</Label>
                <Input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(Number(e.target.value))} className="rounded-xl h-10 md:h-12 glass border-none font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="font-black text-[10px] text-primary">سعر البيع (دج)</Label>
                <Input type="number" value={salePrice} onChange={(e) => setSalePrice(Number(e.target.value))} className="rounded-xl h-10 md:h-12 glass border-none font-bold text-emerald-600" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div className="space-y-1">
                <Label className="font-black text-[10px] text-primary">سعر التصليح</Label>
                <Input type="number" value={repairPrice} onChange={(e) => setRepairPrice(Number(e.target.value))} className="rounded-xl h-10 glass border-none font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="font-black text-[10px] text-primary">الكمية</Label>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="rounded-xl h-10 glass border-none font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="font-black text-[10px] text-primary">حد التنبيه</Label>
                <Input type="number" value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} className="rounded-xl h-10 glass border-none font-bold" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveProduct} className="w-full h-12 md:h-14 rounded-2xl font-black bg-primary text-white shadow-xl">حفظ بيانات المنتج</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Zoom Dialog */}
      <Dialog open={!!zoomQR} onOpenChange={() => setZoomQR(null)}>
        <DialogContent dir="rtl" className="glass border-none rounded-[3rem] shadow-2xl p-0 overflow-hidden z-[400] max-w-sm">
           <DialogHeader className="p-6 bg-primary/5 border-b border-white/5">
              <DialogTitle className="text-xl font-black text-center">{zoomQR?.name}</DialogTitle>
           </DialogHeader>
           <div className="p-10 flex flex-col items-center gap-6 bg-white">
              <div className="p-4 bg-white rounded-3xl shadow-2xl border border-black/5">
                 <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${zoomQR?.code}`} className="h-64 w-64" alt="Enlarged QR" />
              </div>
              <div className="flex flex-col items-center">
                 <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">كود المنتج</p>
                 <p className="text-2xl font-mono font-black text-primary">#{zoomQR?.code}</p>
              </div>
           </div>
           <div className="p-6 bg-black/5 flex justify-center">
              <Button onClick={() => setZoomQR(null)} className="rounded-2xl px-12 h-12 font-black shadow-lg">إغلاق</Button>
           </div>
        </DialogContent>
      </Dialog>

      {/* Image Zoom Dialog */}
      <Dialog open={!!zoomImage} onOpenChange={() => setZoomImage(null)}>
        <DialogContent dir="rtl" className="glass border-none rounded-[3rem] shadow-2xl p-0 overflow-hidden z-[410] max-w-2xl">
           <DialogHeader className="p-6 bg-primary/5 border-b border-white/5">
              <DialogTitle className="text-xl font-black text-center">{zoomImage?.name}</DialogTitle>
           </DialogHeader>
           <div className="p-4 bg-white flex items-center justify-center">
              <img src={zoomImage?.url} className="max-h-[70vh] w-auto object-contain rounded-2xl" alt="Zoomed Product" />
           </div>
           <div className="p-6 bg-black/5 flex justify-center">
              <Button onClick={() => setZoomImage(null)} className="rounded-2xl px-12 h-12 font-black shadow-lg">إغلاق المعاينة</Button>
           </div>
        </DialogContent>
      </Dialog>

      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent dir="rtl" className="glass border-none rounded-[2rem] max-w-4xl shadow-2xl z-[310] flex flex-col md:flex-row p-0 overflow-hidden">
          <div className="flex-1 p-6 md:p-8 space-y-6 bg-primary/5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-primary flex items-center gap-2">
                <Settings2 className="h-5 w-5" /> إعدادات طباعة الملصق
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
               <div className="space-y-1">
                 <Label className="text-[10px] font-black uppercase opacity-50 px-1">الاسم المعروض على الملصق</Label>
                 <Input value={printName} onChange={(e) => setPrintName(e.target.value)} className="rounded-xl border-none shadow-sm font-bold glass" />
               </div>
               
               <div className="flex items-center justify-between p-3 glass rounded-xl">
                 <Label className="font-black text-xs">عرض السعر على الملصق</Label>
                 <Switch checked={showPrice} onCheckedChange={setShowPrice} />
               </div>

               {showPrice && (
                 <div className="grid grid-cols-2 gap-2">
                    <Button variant={printPrice === printingProduct?.salePrice ? "default" : "outline"} className="text-[10px] h-9 rounded-lg" onClick={() => setPrintPrice(printingProduct?.salePrice || 0)}>سعر البيع</Button>
                    <Button variant={printPrice === printingProduct?.repairPrice ? "default" : "outline"} className="text-[10px] h-9 rounded-lg" onClick={() => setPrintPrice(printingProduct?.repairPrice || 0)}>سعر التصليح</Button>
                 </div>
               )}

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase opacity-50 px-1">عدد النسخ</Label>
                    <Input type="number" value={copies} onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))} className="rounded-xl border-none glass" />
                 </div>
                 <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase opacity-50 px-1">العرض (مم)</Label>
                    <Input type="number" value={labelWidth} onChange={(e) => setLabelWidth(Number(e.target.value))} className="rounded-xl border-none glass" />
                 </div>
               </div>
            </div>

            <Separator className="bg-white/10" />

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setPrintDialogOpen(false)} className="flex-1 rounded-xl h-12 font-bold glass border-white/20">إلغاء</Button>
              <Button onClick={executePrint} className="flex-1 rounded-xl bg-primary text-white h-12 font-black shadow-lg">طباعة النسخ</Button>
            </div>
          </div>

          <div className="flex-1 bg-muted/30 p-8 flex flex-col items-center justify-center border-r border-white/10 relative">
             <div className="absolute top-4 right-6 flex items-center gap-2 text-muted-foreground opacity-50">
               <Eye className="h-4 w-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">معاينة مباشرة</span>
             </div>

             {/* Live Label Preview */}
             <div 
               className="bg-white shadow-2xl rounded-sm flex flex-col items-center justify-center p-4 transition-all duration-300"
               style={{ 
                 width: `${labelWidth * 4}px`, // Scaled up for screen display
                 height: `${labelHeight * 4}px`,
                 color: 'black'
               }}
             >
                <p className="text-center font-bold mb-1 leading-none w-full truncate" style={{ fontSize: '12px' }}>{printName}</p>
                {showPrice && <p className="text-center font-black mb-1" style={{ fontSize: '16px' }}>{printPrice.toLocaleString()} دج</p>}
                <div className="flex-1 flex items-center justify-center overflow-hidden">
                   <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${printingProduct?.productCode}`} 
                    className="object-contain"
                    style={{ height: '70%' }}
                    alt="QR Preview" 
                   />
                </div>
                <p className="text-center font-semibold mt-1 opacity-80" style={{ fontSize: '10px' }}>#{printingProduct?.productCode}</p>
             </div>

             <div className="mt-8 text-center max-w-[200px]">
                <p className="text-[9px] text-muted-foreground font-bold">هذه المعاينة توضح شكل الملصق النهائي قبل إرساله للطابعة.</p>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
