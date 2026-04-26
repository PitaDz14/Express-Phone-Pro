
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
  Star,
  QrCode,
  FolderTree
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
  DialogDescription
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
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, serverTimestamp, query, orderBy } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { playSystemSound } from "@/lib/audio-utils"
import Link from "next/link"

// --- Helper Functions ---

const getCategoryAndDescendantsSet = (selectedIds: string[], allCats: any[]) => {
  const result = new Set<string>(selectedIds);
  const stack = [...selectedIds];
  while (stack.length > 0) {
    const parentId = stack.pop();
    allCats.filter(c => c.parentId === parentId).forEach(child => {
      if (!result.has(child.id)) {
        result.add(child.id);
        stack.push(child.id);
      }
    });
  }
  return result;
};

const ProductRow = React.memo(({ p, onEdit, onDelete, onPrint, onZoomQR, onZoomImage, isAdmin }: { p: any, onEdit: any, onDelete: any, onPrint: any, onZoomQR: any, onZoomImage: any, isAdmin: boolean }) => (
  <TableRow className="group border-white/5 hover:bg-muted/30 transition-colors duration-200">
    <TableCell>
       <div className="flex items-center gap-3 min-w-[150px]">
          <div 
            className="h-10 w-10 rounded-lg bg-card border border-border flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:scale-105 transition-transform" 
            onClick={() => p.imageUrl && onZoomImage(p.imageUrl, p.name)}
          >
            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-muted-foreground/30" />}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
               <span className="font-black text-xs md:text-sm text-foreground">{p.name}</span>
               {p.isPriority && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" title="منتج عالي الأهمية" />}
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[9px] md:text-[10px] text-muted-foreground font-bold">#{p.productCode}</span>
               <button onClick={() => onZoomQR(p.productCode)} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <QrCode className="h-3 w-3" />
               </button>
            </div>
          </div>
       </div>
    </TableCell>
    <TableCell className="hidden md:table-cell text-center">
       <span className="text-[10px] font-bold text-muted-foreground">{p.categoryPath || p.categoryName || "عام"}</span>
    </TableCell>
    <TableCell className="text-center">
      <Badge className={cn("px-2 md:px-4 rounded-lg font-black tabular-nums border-none text-[10px] md:text-xs", p.quantity <= (p.minStockQuantity || 1) ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600')}>
        {p.quantity}
      </Badge>
    </TableCell>
    <TableCell className="text-left">
       <div className="flex flex-col items-end">
          <span className="font-black text-xs md:text-sm text-primary tabular-nums">{Number(p.salePrice).toLocaleString()} دج</span>
          {isAdmin && p.purchasePrice > 0 && <span className="text-[8px] text-orange-600 font-bold opacity-60">شراء: {Number(p.purchasePrice).toLocaleString()}</span>}
       </div>
    </TableCell>
    <TableCell className="text-center">
      <div className="flex items-center justify-center gap-1 md:gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-white" onClick={() => onPrint(p)} title="طباعة">
           <Printer className="h-4 w-4" />
        </Button>
        {isAdmin && (
          <>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white" onClick={() => onEdit(p)} title="تعديل">
               <Edit3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white" onClick={() => onDelete(p)} title="حذف">
               <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </TableCell>
  </TableRow>
))
ProductRow.displayName = "ProductRow"

// --- Main Page ---

export default function ProductsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user, role } = useUser()
  const isAdmin = role === "Admin"
  
  const [open, setOpen] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<any>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<string[]>([])
  const [sortConfig, setSortConfig] = React.useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' })
  
  // Form States
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

  // View States
  const [zoomImg, setZoomImg] = React.useState<{ url: string, name: string } | null>(null)
  const [zoomQR, setZoomQR] = React.useState<string | null>(null)

  const productsRef = useMemoFirebase(() => collection(db, "products"), [db])
  const categoriesRef = useMemoFirebase(() => collection(db, "categories"), [db])
  const { data: products, isLoading } = useCollection(productsRef)
  const { data: categories } = useCollection(categoriesRef)

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleCategoryToggle = (id: string) => {
    setSelectedCategoryIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredProducts = React.useMemo(() => {
    if (!products) return [];
    const term = searchTerm.toLowerCase();
    
    // 1. Filter by Hierarchical Categories
    let items = products;
    if (selectedCategoryIds.length > 0 && categories) {
      const allowedSet = getCategoryAndDescendantsSet(selectedCategoryIds, categories);
      items = items.filter(p => allowedSet.has(p.categoryId));
    }

    // 2. Filter by Search Term
    items = items.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.productCode && p.productCode.toLowerCase().includes(term))
    );

    // 3. Sorting
    if (sortConfig.key) {
      items.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }

        valA = String(valA || "").toLowerCase();
        valB = String(valB || "").toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return items;
  }, [products, searchTerm, sortConfig, selectedCategoryIds, categories]);

  const handleSaveProduct = () => {
    if (!isAdmin || !productName || !categoryId || !user) return;
    
    const selectedCat = categories?.find(c => c.id === categoryId)
    const finalCode = productCode.trim() || `EP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const productData = {
      name: productName,
      productCode: finalCode,
      imageUrl,
      categoryId,
      categoryName: selectedCat?.name || "بدون تصنيف",
      categoryPath: selectedCat?.path || selectedCat?.name || "بدون تصنيف",
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
      toast({ title: "تم التعديل", description: "تم تحديث بيانات المنتج بنجاح" })
      playSystemSound('success')
    } else {
      addDocumentNonBlocking(collection(db, "products"), { 
        ...productData, 
        createdAt: serverTimestamp(), 
        createdByUserId: user.uid,
        excludeFromLowStock: false 
      })
      toast({ title: "تمت الإضافة", description: "تم إضافة المنتج الجديد للمخزون" })
      playSystemSound('success')
    }
    setOpen(false)
  }

  const handleDelete = React.useCallback((p: any) => {
    if (confirm(`هل أنت متأكد من حذف المنتج "${p.name}" نهائياً من المخزون؟`)) {
      deleteDocumentNonBlocking(doc(db, "products", p.id))
      toast({ title: "تم الحذف", description: "تم مسح المنتج من قاعدة البيانات" })
      playSystemSound('success')
    }
  }, [db, toast])

  const handleEdit = React.useCallback((p: any) => {
    setEditingProduct(p)
    setProductName(p.name)
    setProductCode(p.productCode || "")
    setImageUrl(p.imageUrl || "")
    setCategoryId(p.categoryId || "")
    setQuantity(p.quantity || 0)
    setMinStock(p.minStockQuantity || 1)
    setPurchasePrice(p.purchasePrice || 0)
    setSalePrice(p.salePrice || 0)
    setRepairPrice(p.repairPrice || 0)
    setIsPriority(p.isPriority || false)
    setOpen(true)
  }, [])

  const handlePrint = (p: any) => {
    const printContent = `
      <div style="font-family: sans-serif; text-align: center; padding: 20px; border: 1px solid #eee; width: 300px; margin: auto;">
        <h2 style="margin: 0 0 10px 0;">Express Phone</h2>
        <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">${p.name}</div>
        <div style="font-size: 12px; margin-bottom: 10px;">CODE: ${p.productCode}</div>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${p.productCode}" width="120" height="120" />
        <div style="font-size: 18px; font-weight: 900; margin-top: 10px;">${p.salePrice} DZD</div>
      </div>
    `;
    const win = window.open('', '_blank');
    win?.document.write(`<html><head><title>Print Label</title></head><body>${printContent}</body></html>`);
    win?.document.close();
    setTimeout(() => win?.print(), 500);
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="h-3 w-3 text-primary" />;
    if (sortConfig.direction === 'desc') return <ArrowDown className="h-3 w-3 text-primary" />;
    return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col">
          <h1 className="text-3xl md:text-4xl font-black text-gradient-premium tracking-tighter">إدارة المخزون</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">تتبع القطع، الأسعار، وحركات التوريد</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <>
              <Button asChild variant="outline" className="h-12 md:h-14 px-6 rounded-2xl glass border-white/20 gap-2 font-black">
                <Link href="/categories">
                   <FolderTree className="h-5 w-5 text-primary" /> إدارة التصنيفات
                </Link>
              </Button>
              <Button onClick={() => { setEditingProduct(null); setProductName(""); setProductCode(""); setImageUrl(""); setOpen(true); }} className="h-12 md:h-14 px-8 rounded-2xl bg-primary text-white shadow-xl gap-2 font-black">
                <Plus className="h-5 w-5" /> إضافة منتج جديد
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 relative group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="ابحث بالاسم أو الباركود..." 
            className="pl-12 h-12 md:h-14 glass rounded-2xl border-none shadow-sm font-bold text-sm" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-12 md:h-14 glass border-none rounded-2xl px-6 font-black text-xs gap-2 relative min-w-[180px]">
              <Layers className="h-5 w-5 text-primary" />
              <span>تصفية الأصناف</span>
              {selectedCategoryIds.length > 0 && (
                <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center bg-primary text-white shadow-lg">
                  {selectedCategoryIds.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 glass border-none rounded-[2rem] shadow-2xl p-6 z-[250]" dir="rtl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-black text-xs text-primary uppercase">الأصناف (فرز هرمي)</p>
                <button onClick={() => setSelectedCategoryIds([])} className="text-[10px] font-black text-muted-foreground hover:text-primary">مسح الكل</button>
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-3 custom-scrollbar pr-1">
                <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setSelectedCategoryIds([])}>
                  <Checkbox checked={selectedCategoryIds.length === 0} className="rounded-md" />
                  <Label className="text-sm font-bold cursor-pointer group-hover:text-primary transition-colors">عرض الكل</Label>
                </div>
                {categories?.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-3 group cursor-pointer" onClick={() => handleCategoryToggle(cat.id)}>
                    <Checkbox checked={selectedCategoryIds.includes(cat.id)} className="rounded-md" />
                    <Label className="text-sm font-bold cursor-pointer group-hover:text-primary transition-colors">{cat.name}</Label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Card className="border-none glass rounded-[2.5rem] overflow-hidden shadow-xl">
        <div className="table-container">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="font-black text-foreground cursor-pointer text-center" onClick={() => handleSort('name')}>
                   <div className="flex items-center justify-center gap-2">المنتج <SortIcon column="name" /></div>
                </TableHead>
                <TableHead className="font-black text-foreground hidden md:table-cell cursor-pointer text-center" onClick={() => handleSort('categoryName')}>
                   <div className="flex items-center justify-center gap-2">التصنيف <SortIcon column="categoryName" /></div>
                </TableHead>
                <TableHead className="font-black text-foreground text-center cursor-pointer" onClick={() => handleSort('quantity')}>
                   <div className="flex items-center justify-center gap-2">المتوفر <SortIcon column="quantity" /></div>
                </TableHead>
                <TableHead className="font-black text-foreground text-center cursor-pointer" onClick={() => handleSort('salePrice')}>
                   <div className="flex items-center justify-center gap-2"><SortIcon column="salePrice" /> سعر البيع</div>
                </TableHead>
                <TableHead className="font-black text-foreground text-center">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20 opacity-30 italic font-black">لا توجد منتجات تطابق بحثك</TableCell></TableRow>
              ) : filteredProducts.map(p => (
                <ProductRow 
                  key={p.id} 
                  p={p} 
                  onEdit={handleEdit} 
                  onDelete={handleDelete} 
                  onPrint={handlePrint}
                  onZoomImage={(url: string, name: string) => setZoomImg({ url, name })}
                  onZoomQR={(code: string) => setZoomQR(code)}
                  isAdmin={isAdmin}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-2xl glass border-none rounded-[2.5rem] shadow-2xl p-6 md:p-10 z-[300] max-h-[90vh] overflow-y-auto custom-scrollbar">
           <DialogHeader>
              <DialogTitle className="text-2xl font-black text-gradient-premium">
                 {editingProduct ? "تعديل بيانات المنتج" : "إضافة منتج جديد للمخزن"}
              </DialogTitle>
              <DialogDescription className="font-bold text-xs">تأكد من دقة البيانات لضمان صحة التقارير المالية</DialogDescription>
           </DialogHeader>
           
           <div className="py-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label className="font-black text-xs text-primary px-1">اسم المنتج</Label>
                    <Input value={productName} onChange={e => setProductName(e.target.value)} className="rounded-xl border-none glass h-12 font-bold" placeholder="مثال: شاشة Samsung A51" />
                 </div>
                 <div className="space-y-2">
                    <Label className="font-black text-xs text-primary px-1">كود المنتج (الباركود)</Label>
                    <Input value={productCode} onChange={e => setProductCode(e.target.value)} className="rounded-xl border-none glass h-12 font-mono" placeholder="اتركه فارغاً للتوليد التلقائي" />
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label className="font-black text-xs text-primary px-1">التصنيف</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                       <SelectTrigger className="h-12 rounded-xl glass border-none font-bold">
                          <SelectValue placeholder="اختر التصنيف..." />
                       </SelectTrigger>
                       <SelectContent className="glass border-none rounded-xl z-[400]">
                          {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                       </SelectContent>
                    </Select>
                 </div>
                 <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Star className={cn("h-5 w-5", isPriority ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
                       <div className="flex flex-col">
                          <Label className="font-black text-xs">منتج عالي الأهمية</Label>
                          <span className="text-[8px] font-bold opacity-60">تفعيل التنبيه الصوتي لهذا المنتج</span>
                       </div>
                    </div>
                    <Switch checked={isPriority} onCheckedChange={setIsPriority} />
                 </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                 <div className="space-y-2">
                    <Label className="font-black text-[10px] text-primary px-1">الكمية المتوفرة</Label>
                    <Input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="h-11 rounded-xl glass border-none text-center font-black" />
                 </div>
                 <div className="space-y-2">
                    <Label className="font-black text-[10px] text-primary px-1">تنبيه عند نقص</Label>
                    <Input type="number" value={minStock} onChange={e => setMinStock(Number(e.target.value))} className="h-11 rounded-xl glass border-none text-center font-black text-red-600" />
                 </div>
                 <div className="space-y-2">
                    <Label className="font-black text-[10px] text-primary px-1 text-center block">رابط الصورة</Label>
                    <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="h-11 rounded-xl glass border-none text-xs" placeholder="URL اختياري" />
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-black/5">
                 <div className="space-y-1">
                    <Label className="font-black text-[10px] text-orange-600 px-1 uppercase">سعر الشراء</Label>
                    <Input type="number" value={purchasePrice} onChange={e => setPurchasePrice(Number(e.target.value))} className="h-11 rounded-xl glass border-none text-center font-black text-orange-600" />
                 </div>
                 <div className="space-y-1">
                    <Label className="font-black text-[10px] text-primary px-1 uppercase">سعر البيع</Label>
                    <Input type="number" value={salePrice} onChange={e => setSalePrice(Number(e.target.value))} className="h-11 rounded-xl glass border-none text-center font-black text-primary" />
                 </div>
                 <div className="space-y-1">
                    <Label className="font-black text-[10px] text-muted-foreground px-1 uppercase">سعر التصليح</Label>
                    <Input type="number" value={repairPrice} onChange={e => setRepairPrice(Number(e.target.value))} className="h-11 rounded-xl glass border-none text-center font-bold" />
                 </div>
              </div>
           </div>

           <DialogFooter>
              <Button onClick={handleSaveProduct} className="w-full h-14 rounded-2xl bg-primary text-white font-black text-lg shadow-xl shadow-primary/20">
                حفظ التغييرات والمزامنة
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Zoom Dialog */}
      <Dialog open={!!zoomImg} onOpenChange={() => setZoomImg(null)}>
        <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-2xl z-[500]">
           <div className="relative group">
              <img src={zoomImg?.url} alt={zoomImg?.name} className="w-full h-auto rounded-3xl shadow-2xl" />
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass px-6 py-2 rounded-full font-black text-sm">{zoomImg?.name}</div>
           </div>
        </DialogContent>
      </Dialog>

      {/* QR Zoom Dialog */}
      <Dialog open={!!zoomQR} onOpenChange={() => setZoomQR(null)}>
        <DialogContent className="glass border-none rounded-[3rem] p-10 max-w-sm z-[500] text-center" dir="rtl">
           <DialogHeader><DialogTitle className="text-xl font-black mb-4">كود المنتج QR</DialogTitle></DialogHeader>
           <div className="bg-white p-4 rounded-3xl shadow-inner mx-auto mb-6 inline-block">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${zoomQR}`} alt="QR" className="h-48 w-48" />
           </div>
           <p className="font-mono font-black text-primary tracking-widest">{zoomQR}</p>
           <Button onClick={() => setZoomQR(null)} className="mt-8 rounded-2xl px-10 font-black">إغلاق</Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
