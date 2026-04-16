
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
  X
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
  
  // UI States
  const [open, setOpen] = React.useState(false)
  const [printDialogOpen, setPrintDialogOpen] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<any>(null)
  const [printingProduct, setPrintingProduct] = React.useState<any>(null)
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: 'name', direction: 'asc' })
  const [searchTerm, setSearchTerm] = React.useState("")

  // Form States
  const [productName, setProductName] = React.useState("")
  const [productCode, setProductCode] = React.useState("")
  const [category, setCategory] = React.useState("قطع غيار")
  const [quantity, setQuantity] = React.useState(0)
  const [minStock, setMinStock] = React.useState(5)
  const [purchasePrice, setPurchasePrice] = React.useState(0)
  const [salePrice, setSalePrice] = React.useState(0)

  // Print Config States
  const [printName, setPrintName] = React.useState("")
  const [printPrice, setPrintPrice] = React.useState(0)
  const [copies, setCopies] = React.useState(1)
  const [labelWidth, setLabelWidth] = React.useState(50) // mm
  const [labelHeight, setLabelHeight] = React.useState(30) // mm

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
      toast({ title: "تم التعديل", description: "تم تحديث بيانات المنتج بنجاح" })
    } else {
      addDocumentNonBlocking(productsRef, { ...productData, createdAt: serverTimestamp() })
      toast({ title: "تمت الإضافة", description: "تم إضافة المنتج الجديد للمخزون" })
    }
    
    setOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setProductName(""); setProductCode(""); setQuantity(0); setSalePrice(0); setEditingProduct(null); setMinStock(5); setPurchasePrice(0);
  }

  const handleOpenPrint = (p: any) => {
    setPrintingProduct(p)
    setPrintName(p.name)
    setPrintPrice(p.salePrice)
    setCopies(1)
    setPrintDialogOpen(true)
  }

  const executePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const labelsHtml = Array(copies).fill(0).map(() => `
      <div class="label-container">
        <div class="product-name">${printName}</div>
        <div class="product-price">${printPrice.toLocaleString()} دج</div>
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
              border: 1px dashed #ccc;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              box-sizing: border-box;
              padding: 2mm;
              page-break-after: always;
              text-align: center;
            }
            .product-name { font-size: 10pt; font-weight: bold; margin-bottom: 1mm; }
            .product-price { font-size: 12pt; font-weight: black; color: #000; margin-bottom: 1mm; }
            .qr-code img { width: ${labelHeight * 0.4}mm; height: ${labelHeight * 0.4}mm; }
            .product-code { font-size: 8pt; color: #666; margin-top: 1mm; }
            @media print {
              .label-container { border: none; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${labelsHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    setPrintDialogOpen(false);
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="h-3 w-3 opacity-20" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-4xl font-black text-gradient-premium tracking-tighter">إدارة المخزون الذكي</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.3em] mt-1">تتبع دقيق وتوليد تلقائي للملصقات</p>
        </div>
        <Button onClick={() => { resetForm(); setOpen(true); }} className="h-14 px-8 rounded-2xl bg-primary text-white shadow-2xl hover:scale-105 transition-transform gap-2 font-black">
          <Plus className="h-6 w-6" /> إضافة صنف جديد
        </Button>
      </header>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="ابحث بالاسم، الكود، أو الصنف..." 
            className="pl-12 h-14 glass rounded-2xl border-none shadow-sm font-bold text-sm" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none glass rounded-[2.5rem] overflow-hidden shadow-2xl card-3d">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-white/10">
              <TableHead className="cursor-pointer font-black h-16" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-2">المنتج <SortIcon column="name" /></div>
              </TableHead>
              <TableHead className="text-center font-black h-16">باركود QR</TableHead>
              <TableHead className="text-center cursor-pointer font-black h-16" onClick={() => handleSort('quantity')}>
                <div className="flex items-center justify-center gap-2">الكمية <SortIcon column="quantity" /></div>
              </TableHead>
              <TableHead className="text-left cursor-pointer font-black h-16" onClick={() => handleSort('salePrice')}>
                <div className="flex items-center gap-2 justify-end"><SortIcon column="salePrice" /> السعر النهائي</div>
              </TableHead>
              <TableHead className="text-center font-black h-16 w-48">إجراءات ذكية</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : sortedProducts.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground font-bold italic opacity-30">لا توجد منتجات مطابقة للبحث</TableCell></TableRow>
            ) : sortedProducts.map((p) => (
              <TableRow key={p.id} className="group border-white/5 hover:bg-white/40 transition-all duration-300">
                <TableCell>
                   <div className="flex flex-col">
                      <span className="font-black text-sm">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground font-bold">#{p.productCode} • {p.category}</span>
                   </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="h-12 w-12 mx-auto bg-white p-1.5 rounded-xl shadow-inner group-hover:scale-110 transition-transform cursor-pointer">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${p.productCode}`} className="h-full w-full" alt="QR" />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={cn("px-4 rounded-lg font-black tabular-nums border-none", p.quantity <= (p.minStockQuantity || 5) ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600')}>
                    {p.quantity} {p.quantity <= (p.minStockQuantity || 5) && ' (منخفض)'}
                  </Badge>
                </TableCell>
                <TableCell className="text-left font-black text-lg text-primary tabular-nums">
                  {p.salePrice.toLocaleString()} <span className="text-[10px] opacity-40">دج</span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white"
                      onClick={() => handleOpenPrint(p)}
                      title="طباعة ملصق"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white"
                      onClick={() => { setEditingProduct(p); setProductName(p.name); setProductCode(p.productCode); setSalePrice(p.salePrice); setQuantity(p.quantity); setMinStock(p.minStockQuantity || 5); setPurchasePrice(p.purchasePrice); setCategory(p.category); setOpen(true); }}
                      title="تعديل"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white"
                      onClick={() => { if(confirm("هل أنت متأكد من حذف المنتج؟")) deleteDocumentNonBlocking(doc(db, "products", p.id)) }}
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="glass border-none rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black text-gradient-premium mb-4">
              {editingProduct ? 'تحديث بيانات المنتج' : 'إضافة منتج جديد للمخزون'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-black text-xs text-primary px-1">اسم الصنف</Label>
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} className="rounded-2xl h-12 glass border-none font-bold" placeholder="مثال: شاشة iPhone 13 Pro" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs text-primary px-1">كود المنتج (Barcode)</Label>
                <Input value={productCode} onChange={(e) => setProductCode(e.target.value)} className="rounded-2xl h-12 glass border-none font-bold" placeholder="مثال: SCR-I13P" />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="font-black text-xs text-primary px-1">سعر الشراء</Label>
                <Input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(Number(e.target.value))} className="rounded-2xl h-12 glass border-none font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs text-primary px-1">سعر البيع</Label>
                <Input type="number" value={salePrice} onChange={(e) => setSalePrice(Number(e.target.value))} className="rounded-2xl h-12 glass border-none font-bold text-emerald-600" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs text-primary px-1">التصنيف</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-2xl h-12 glass border-none font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-black text-xs text-primary px-1">الكمية الحالية</Label>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="rounded-2xl h-12 glass border-none font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs text-primary px-1">تنبيه عند نفاذ (الحد الأدنى)</Label>
                <Input type="number" value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} className="rounded-2xl h-12 glass border-none font-bold text-red-500" />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={handleSaveProduct} className="w-full h-14 rounded-2xl font-black bg-primary text-white shadow-xl text-lg">
              {editingProduct ? 'حفظ التغييرات' : 'تأكيد الإضافة للمخزون'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Label Dialog */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent dir="rtl" className="glass border-none rounded-[2.5rem] max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <Printer className="h-6 w-6 text-primary" />
              إعدادات طباعة الملصق
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-4 p-4 glass rounded-2xl border-white/10 bg-white/30">
              <div className="space-y-2">
                <Label className="font-black text-[10px] text-muted-foreground uppercase">الاسم على الملصق</Label>
                <Input value={printName} onChange={(e) => setPrintName(e.target.value)} className="rounded-xl h-11 border-none shadow-sm font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-black text-[10px] text-muted-foreground uppercase">السعر (دج)</Label>
                  <Input type="number" value={printPrice} onChange={(e) => setPrintPrice(Number(e.target.value))} className="rounded-xl h-11 border-none shadow-sm font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-[10px] text-muted-foreground uppercase">عدد النسخ</Label>
                  <Input type="number" value={copies} onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))} className="rounded-xl h-11 border-none shadow-sm font-bold" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
               <div className="flex items-center gap-2 px-1">
                  <Settings2 className="h-4 w-4 text-primary" />
                  <span className="text-xs font-black">أبعاد الملصق (ملم)</span>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 glass p-3 rounded-xl">
                     <span className="text-[10px] font-bold opacity-40">العرض:</span>
                     <Input type="number" value={labelWidth} onChange={(e) => setLabelWidth(Number(e.target.value))} className="h-8 border-none bg-transparent font-black p-0" />
                  </div>
                  <div className="flex items-center gap-3 glass p-3 rounded-xl">
                     <span className="text-[10px] font-bold opacity-40">الطول:</span>
                     <Input type="number" value={labelHeight} onChange={(e) => setLabelHeight(Number(e.target.value))} className="h-8 border-none bg-transparent font-black p-0" />
                  </div>
               </div>
            </div>
            
            {/* Visual Preview */}
            <div className="flex justify-center py-4">
               <div 
                className="glass border-2 border-dashed border-primary/20 flex flex-col items-center justify-center p-2 overflow-hidden shadow-inner"
                style={{ width: `${labelWidth * 2}px`, height: `${labelHeight * 2}px`, transition: 'all 0.3s' }}
               >
                  <span className="text-[8px] font-black truncate w-full text-center">{printName}</span>
                  <span className="text-[10px] font-black text-primary">{printPrice.toLocaleString()} دج</span>
                  <div className="h-1/2 aspect-square bg-white p-1 rounded-md mt-1">
                     <img src={`https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${printingProduct?.productCode}`} className="h-full w-full opacity-50" />
                  </div>
               </div>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)} className="flex-1 h-12 rounded-2xl font-black glass border-white/20">إلغاء</Button>
            <Button onClick={executePrint} className="flex-1 h-12 rounded-2xl font-black bg-primary text-white shadow-lg">بدء الطباعة الآن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
