
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
  X
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
import { Separator } from "@/components/ui/separator"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import Link from "next/link"

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc' | null;
}

// Memoized Row for High Speed Scrolling
const ProductRow = React.memo(({ p, onEdit, onDelete, onPrint, onZoomQR, onZoomImage, isAdmin }: { p: any, onEdit: any, onDelete: any, onPrint: any, onZoomQR: any, onZoomImage: any, isAdmin: boolean }) => (
  <TableRow className="group border-white/5 hover:bg-muted/30 transition-colors duration-200">
    <TableCell>
       <div className="flex items-center gap-3 min-w-[150px]">
          <div 
            className="h-10 w-10 rounded-lg bg-card border border-border flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:scale-105 transition-transform"
            onClick={() => p.imageUrl && onZoomImage(p.imageUrl, p.name)}
          >
            {p.imageUrl ? (
              <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
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
        className="h-8 w-8 md:h-10 md:w-10 mx-auto bg-white p-1 rounded-lg shadow-inner cursor-pointer relative group/qr"
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
      <div className="flex items-center justify-center gap-1 md:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-primary/10 text-primary" onClick={() => onPrint(p)}><Printer className="h-3 w-3 md:h-4 md:w-4" /></Button>
        {isAdmin && (
          <>
            <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-orange-500/10 text-orange-600" onClick={() => onEdit(p)}><Edit3 className="h-3 w-3 md:h-4 md:w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-destructive/10 text-destructive" onClick={() => onDelete(p)}><Trash2 className="h-3 w-3 md:h-4 md:w-4" /></Button>
          </>
        )}
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
  const [printDialogOpen, setPrintDialogOpen] = React.useState(false)
  const [zoomQR, setZoomQR] = React.useState<{ code: string, name: string } | null>(null)
  const [zoomImage, setZoomImage] = React.useState<{ url: string, name: string } | null>(null)
  const [editingProduct, setEditingProduct] = React.useState<any>(null)
  const [printingProduct, setPrintingProduct] = React.useState<any>(null)
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: 'name', direction: 'asc' })
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<string[]>([])

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
    let items = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(term) || 
        (p.productCode && p.productCode.toLowerCase().includes(term)) ||
        (p.categoryPath && p.categoryPath.toLowerCase().includes(term));
      const matchesCategory = selectedCategoryIds.length === 0 || selectedCategoryIds.includes(p.categoryId);
      return matchesSearch && matchesCategory;
    });

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
  }, [products, searchTerm, sortConfig, selectedCategoryIds]);

  const handleSaveProduct = () => {
    if (!isAdmin || !productName || !categoryId || !user) return;
    
    const finalCode = productCode.trim() || `EP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const selectedCat = categories?.find(c => c.id === categoryId)
    const categoryPath = categories ? getFullCategoryPath(categoryId, categories) : (selectedCat?.name || "بدون تصنيف");

    const productData = {
      name: productName,
      productCode: finalCode,
      imageUrl,
      categoryId,
      categoryName: selectedCat?.name || "بدون تصنيف",
      categoryPath,
      quantity: Number(quantity),
      minStockQuantity: Number(minStock),
      purchasePrice: Number(purchasePrice),
      salePrice: Number(salePrice),
      repairPrice: Number(repairPrice),
      updatedAt: serverTimestamp(),
      updatedByUserId: user.uid
    }

    if (editingProduct) {
      updateDocumentNonBlocking(doc(db, "products", editingProduct.id), productData)
    } else {
      addDocumentNonBlocking(productsRef, { ...productData, createdAt: serverTimestamp(), createdByUserId: user.uid })
    }
    
    setOpen(false)
    resetForm()
  }

  const resetForm = React.useCallback(() => {
    setProductName(""); setProductCode(""); setImageUrl(""); setQuantity(0); setSalePrice(0); setRepairPrice(0); setEditingProduct(null); setMinStock(1); setPurchasePrice(0); setCategoryId("")
  }, [])

  const getFullCategoryPath = (catId: string, allCats: any[]): string => {
    const cat = allCats.find(c => c.id === catId);
    if (!cat) return "";
    if (!cat.parentId) return cat.name;
    return `${getFullCategoryPath(cat.parentId, allCats)} > ${cat.name}`;
  }

  const handleOpenPrint = React.useCallback((p: any) => {
    setPrintingProduct(p); setPrintName(p.name); setPrintPrice(p.salePrice); setShowPrice(false); setCopies(1); setPrintDialogOpen(true);
  }, [])

  const handleEdit = React.useCallback((p: any) => {
    if (!isAdmin) return;
    setEditingProduct(p); setProductName(p.name); setProductCode(p.productCode || ""); setImageUrl(p.imageUrl || ""); setSalePrice(p.salePrice); setRepairPrice(p.repairPrice || 0); setQuantity(p.quantity); setMinStock(p.minStockQuantity || 1); setPurchasePrice(p.purchasePrice); setCategoryId(p.categoryId || ""); setOpen(true);
  }, [isAdmin])

  const handleDelete = React.useCallback((p: any) => {
    if (!isAdmin) return;
    if(confirm("هل أنت متأكد من حذف المنتج؟")) deleteDocumentNonBlocking(doc(db, "products", p.id))
  }, [isAdmin])

  const handlePrintLabels = () => {
    const printContent = `
      <html dir="rtl">
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@700;800&display=swap');
            body { margin: 0; padding: 0; font-family: 'Almarai', sans-serif; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, ${labelWidth}mm); gap: 2mm; padding: 2mm; }
            .label { 
              width: ${labelWidth}mm; 
              height: ${labelHeight}mm; 
              border: 0.1mm solid #eee; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              overflow: hidden;
              text-align: center;
              padding: 1mm;
              box-sizing: border-box;
            }
            .name { font-size: 8pt; font-weight: 800; margin-bottom: 1mm; white-space: nowrap; overflow: hidden; width: 100%; }
            .qr { width: 15mm; height: 15mm; }
            .price { font-size: 10pt; font-weight: 800; margin-top: 1mm; color: #000; }
            @media print { .label { border: none; } }
          </style>
        </head>
        <body>
          <div class="grid">
            ${Array(copies).fill(0).map(() => `
              <div class="label">
                <div class="name">${printName}</div>
                <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${printingProduct.productCode}" />
                ${showPrice ? `<div class="price">${printPrice.toLocaleString()} دج</div>` : ''}
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `;

    // Professional Mobile-Safe Printing via hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(printContent);
      iframeDoc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    }
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="h-3 w-3 text-primary" />;
    if (sortConfig.direction === 'desc') return <ArrowDown className="h-3 w-3 text-primary" />;
    return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-32 overflow-x-hidden">
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
          {isAdmin && (
            <Button onClick={() => { resetForm(); setOpen(true); }} className="w-full md:w-auto h-12 md:h-14 px-6 md:px-10 rounded-2xl bg-primary text-white shadow-xl gap-2 font-black">
              <Plus className="h-5 w-5 md:h-7 md:w-7" /> إضافة منتج
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="بحث عن منتج..." 
            className="pl-12 h-12 md:h-14 glass border-none rounded-2xl font-bold text-sm" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-12 md:h-14 px-6 rounded-2xl glass border-white/20 gap-2 font-black relative">
              <Filter className="h-5 w-5" /> 
              <span>تصفية</span>
              {selectedCategoryIds.length > 0 && (
                <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center bg-primary text-white">
                  {selectedCategoryIds.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 glass border-none rounded-[1.5rem] shadow-2xl p-4 z-[250]" dir="rtl">
             <div className="space-y-4">
                <p className="font-black text-xs text-primary uppercase">اختر التصنيفات</p>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {categories?.map((cat: any) => (
                    <div key={cat.id} className="flex items-center space-x-3 space-x-reverse group cursor-pointer" onClick={() => setSelectedCategoryIds(prev => prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id])}>
                      <Checkbox checked={selectedCategoryIds.includes(cat.id)} className="rounded-md" />
                      <Label className="text-sm font-bold cursor-pointer group-hover:text-primary transition-colors">
                        {cat.name}
                      </Label>
                    </div>
                  ))}
                </div>
             </div>
          </PopoverContent>
        </Popover>
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
                <TableHead className="text-center font-black text-foreground">التصنيف</TableHead>
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
                <TableRow><TableCell colSpan={6} className="text-center py-20 opacity-30 italic font-black">لا توجد منتجات</TableCell></TableRow>
              ) : sortedProducts.map((p) => (
                <ProductRow 
                  key={p.id} p={p} 
                  onEdit={handleEdit} 
                  onDelete={handleDelete} 
                  onPrint={handleOpenPrint} 
                  onZoomQR={(code: string, name: string) => setZoomQR({ code, name })}
                  onZoomImage={(url: string, name: string) => setZoomImage({ url, name })}
                  isAdmin={isAdmin}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit/Add Product Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-2xl w-[95%] glass border-none rounded-[2.5rem] shadow-2xl p-8 z-[300] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gradient-premium">{editingProduct ? "تعديل بيانات المنتج" : "إضافة منتج جديد"}</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-black text-[10px] text-primary uppercase">اسم المنتج</Label>
                  <Input value={productName} onChange={(e) => setProductName(e.target.value)} className="h-12 glass border-none rounded-xl font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-[10px] text-primary uppercase">كود المنتج / الباركود</Label>
                  <Input value={productCode} onChange={(e) => setProductCode(e.target.value)} className="h-12 glass border-none rounded-xl font-mono" />
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-black text-[10px] text-primary uppercase">التصنيف</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="h-12 glass border-none rounded-xl font-bold"><SelectValue placeholder="اختر التصنيف..." /></SelectTrigger>
                    <SelectContent className="glass border-none rounded-xl z-[400]">
                      {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                   <Label className="font-black text-[10px] text-primary uppercase">رابط الصورة</Label>
                   <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="h-12 glass border-none rounded-xl font-bold" />
                </div>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="font-black text-[10px] text-primary uppercase">الكمية</Label>
                  <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="h-12 glass border-none rounded-xl font-black text-center" />
                </div>
                <div className="space-y-2">
                   <Label className="font-black text-[10px] text-orange-600 uppercase">سعر الشراء</Label>
                   <Input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(Number(e.target.value))} className="h-12 glass border-none rounded-xl font-black text-center text-orange-600" />
                </div>
                <div className="space-y-2">
                   <Label className="font-black text-[10px] text-emerald-600 uppercase">سعر البيع</Label>
                   <Input type="number" value={salePrice} onChange={(e) => setSalePrice(Number(e.target.value))} className="h-12 glass border-none rounded-xl font-black text-center text-emerald-600" />
                </div>
                <div className="space-y-2">
                   <Label className="font-black text-[10px] text-muted-foreground uppercase">سعر التصليح</Label>
                   <Input type="number" value={repairPrice} onChange={(e) => setRepairPrice(Number(e.target.value))} className="h-12 glass border-none rounded-xl font-black text-center" />
                </div>
             </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveProduct} className="w-full h-14 rounded-2xl bg-primary text-white font-black text-lg shadow-xl shadow-primary/20">حفظ التغييرات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Label Dialog */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md w-[95%] glass border-none rounded-[2.5rem] shadow-2xl p-8 z-[300]">
           <DialogHeader>
              <DialogTitle className="text-2xl font-black">طباعة ملصقات QR</DialogTitle>
           </DialogHeader>
           <div className="py-6 space-y-6">
              <div className="space-y-2">
                 <Label className="font-black text-xs text-primary uppercase">اسم المنتج على الملصق</Label>
                 <Input value={printName} onChange={(e) => setPrintName(e.target.value)} className="h-12 glass border-none rounded-xl font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label className="font-black text-xs text-primary uppercase">عدد النسخ</Label>
                    <Input type="number" value={copies} onChange={(e) => setCopies(Number(e.target.value))} className="h-12 glass border-none rounded-xl font-black text-center" />
                 </div>
                 <div className="space-y-4 pt-8">
                    <div className="flex items-center gap-2">
                       <Switch checked={showPrice} onCheckedChange={setShowPrice} />
                       <Label className="font-black text-xs">إظهار السعر</Label>
                    </div>
                 </div>
              </div>
              <div className="space-y-2">
                 <Label className="font-black text-xs text-primary uppercase">أبعاد الملصق (ملم)</Label>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2"><span className="text-[10px] font-bold">عرض:</span><Input type="number" value={labelWidth} onChange={(e) => setLabelWidth(Number(e.target.value))} className="h-10 glass border-none rounded-xl font-black text-center" /></div>
                    <div className="flex items-center gap-2"><span className="text-[10px] font-bold">طول:</span><Input type="number" value={labelHeight} onChange={(e) => setLabelHeight(Number(e.target.value))} className="h-10 glass border-none rounded-xl font-black text-center" /></div>
                 </div>
              </div>
           </div>
           <DialogFooter>
              <Button onClick={handlePrintLabels} className="w-full h-14 rounded-2xl bg-primary text-white font-black text-lg shadow-xl gap-2"><Printer className="h-5 w-5" /> بدء الطباعة</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Zoom Dialog */}
      <Dialog open={!!zoomQR} onOpenChange={() => setZoomQR(null)}>
        <DialogContent dir="rtl" className="max-w-sm glass border-none rounded-[3rem] shadow-2xl p-10 z-[400] text-center">
           <DialogHeader><DialogTitle className="text-xl font-black mb-6">{zoomQR?.name}</DialogTitle></DialogHeader>
           <div className="bg-white p-6 rounded-3xl shadow-inner mx-auto max-w-fit">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${zoomQR?.code}`} className="h-48 w-48" />
           </div>
           <p className="mt-6 font-mono font-black text-primary tracking-widest">{zoomQR?.code}</p>
           <Button onClick={() => setZoomQR(null)} variant="ghost" className="mt-6 rounded-xl font-bold">إغلاق</Button>
        </DialogContent>
      </Dialog>

      {/* Image Zoom Dialog */}
      <Dialog open={!!zoomImage} onOpenChange={() => setZoomImage(null)}>
        <DialogContent dir="rtl" className="max-w-2xl glass border-none rounded-[2rem] shadow-2xl p-0 overflow-hidden z-[400]">
           <div className="relative group">
              <img src={zoomImage?.url} className="w-full h-auto max-h-[80vh] object-contain" />
              <button onClick={() => setZoomImage(null)} className="absolute top-4 left-4 h-10 w-10 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-md"><X className="h-5 w-5" /></button>
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
                 <p className="font-black text-lg">{zoomImage?.name}</p>
              </div>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
