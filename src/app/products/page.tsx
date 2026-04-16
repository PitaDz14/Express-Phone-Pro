
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
  Eye,
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
import Image from "next/image"

export default function ProductsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<any>(null)
  
  // Form State
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

  const handleGenerateDescription = async () => {
    if (!productName) {
      toast({ title: "خطأ", description: "يرجى إدخال اسم المنتج أولاً", variant: "destructive" })
      return
    }
    setIsGenerating(true)
    try {
      const result = await generateProductDescription({
        productName,
        keywords: keywords.split(",").map(k => k.trim()).filter(k => k)
      })
      setDescription(result.description)
    } catch (error) {
      console.error("Failed to generate description", error)
    } finally {
      setIsGenerating(false)
    }
  }

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
    const docRef = doc(db, "products", id)
    deleteDocumentNonBlocking(docRef)
    toast({ title: "تم الحذف", description: "تم حذف المنتج من المخزون" })
  }

  const handlePrintLabel = (product: any) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>طباعة ملصق - ${product.name}</title>
            <style>
              body { font-family: 'Almarai', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .label { border: 2px solid #000; padding: 20px; text-align: center; width: 300px; border-radius: 10px; }
              .name { font-weight: bold; font-size: 20px; margin-bottom: 10px; }
              .code { font-family: monospace; font-size: 16px; margin-bottom: 10px; }
              .price { font-size: 24px; font-weight: black; color: #2563eb; }
              .qr { margin-top: 15px; }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <div class="label">
              <div class="name">${product.name}</div>
              <div class="code">${product.productCode}</div>
              <div class="price">${product.salePrice.toLocaleString()} دج</div>
              <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${product.productCode}" />
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.productCode.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

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
                   <DialogDescription className="font-bold">أدخل تفاصيل المنتج بدقة لضمان تتبع المخزون.</DialogDescription>
                 </DialogHeader>
                 <div className="grid gap-6 py-6">
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label className="font-bold">اسم المنتج</Label>
                        <Input 
                          className="h-11 glass border-white/20" 
                          value={productName}
                          onChange={(e) => setProductName(e.target.value)}
                          placeholder="مثال: شاشة ايفون 13 برو"
                        />
                     </div>
                     <div className="space-y-2">
                        <Label className="font-bold">كود المنتج (Barcode)</Label>
                        <Input 
                          className="h-11 glass border-white/20 tabular-nums" 
                          value={productCode}
                          onChange={(e) => setProductCode(e.target.value)}
                          placeholder="P-XXXX"
                        />
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-3 gap-4">
                     <div className="space-y-2">
                        <Label className="font-bold">سعر الشراء (دج)</Label>
                        <Input 
                          type="number" 
                          className="h-11 glass border-white/20 tabular-nums" 
                          value={purchasePrice}
                          onChange={(e) => setPurchasePrice(Number(e.target.value))}
                        />
                     </div>
                     <div className="space-y-2">
                        <Label className="font-bold">سعر البيع (دج)</Label>
                        <Input 
                          type="number" 
                          className="h-11 glass border-white/20 tabular-nums font-black text-primary" 
                          value={salePrice}
                          onChange={(e) => setSalePrice(Number(e.target.value))}
                        />
                     </div>
                     <div className="space-y-2">
                        <Label className="font-bold">الفئة</Label>
                        <Input 
                          className="h-11 glass border-white/20" 
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                        />
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label className="font-bold">الكمية الحالية</Label>
                        <Input 
                          type="number" 
                          className="h-11 glass border-white/20 tabular-nums" 
                          value={quantity}
                          onChange={(e) => setQuantity(Number(e.target.value))}
                        />
                     </div>
                     <div className="space-y-2">
                        <Label className="font-bold text-orange-600 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          الحد الأدنى للتنبيه
                        </Label>
                        <Input 
                          type="number" 
                          className="h-11 glass border-white/20 tabular-nums" 
                          value={minStock}
                          onChange={(e) => setMinStock(Number(e.target.value))}
                        />
                     </div>
                   </div>

                   <div className="space-y-2">
                      <Label className="font-bold">رابط صورة المنتج (اختياري)</Label>
                      <div className="flex gap-2">
                        <Input 
                          className="h-11 glass border-white/20" 
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="https://..."
                        />
                        <div className="h-11 w-11 rounded-xl bg-white/50 flex items-center justify-center border border-white/20">
                           <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                   </div>

                   <div className="space-y-3 glass p-4 rounded-3xl border-white/20">
                     <div className="flex items-center justify-between">
                       <Label className="font-black text-primary">الوصف التسويقي الذكي</Label>
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-accent gap-2 font-black hover:bg-accent/10"
                        onClick={handleGenerateDescription}
                        disabled={isGenerating || !productName}
                       >
                         {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                         توليد بالذكاء الاصطناعي
                       </Button>
                     </div>
                     <Input 
                        placeholder="أدخل كلمات مفتاحية (أصلي، ضمان، جودة عالية...)" 
                        className="glass border-white/10 text-xs"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                     />
                     <Textarea 
                        placeholder="سيظهر الوصف المقترح هنا..." 
                        className="h-24 glass border-white/10 resize-none text-xs font-medium"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                     />
                   </div>
                 </div>
                 <DialogFooter>
                   <Button 
                    className="w-full h-12 rounded-2xl bg-primary text-white font-black text-lg shadow-xl" 
                    onClick={handleSaveProduct}
                    disabled={isSaving}
                   >
                     {isSaving ? <Loader2 className="h-6 w-6 animate-spin" /> : (editingProduct ? "تحديث المنتج" : "حفظ المنتج في المخزون")}
                   </Button>
                 </DialogFooter>
               </DialogContent>
             </Dialog>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 space-y-8">
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="relative w-full md:w-[500px] group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="ابحث عن منتج بالاسم أو الكود..." 
                className="pl-12 h-12 glass border-none shadow-sm rounded-2xl focus:ring-primary" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="glass h-12 rounded-2xl px-6 font-bold gap-2 border-white/20">
                <Printer className="h-5 w-5" />
                طباعة الكل
              </Button>
            </div>
          </div>

          <Card className="border-none glass shadow-2xl overflow-hidden rounded-[2.5rem]">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/10 hover:bg-transparent">
                    <TableHead className="w-[100px] font-black text-center">QR</TableHead>
                    <TableHead className="font-black text-center">المنتج</TableHead>
                    <TableHead className="font-black text-center">الفئة</TableHead>
                    <TableHead className="text-center font-black">المخزون</TableHead>
                    <TableHead className="text-left font-black">السعر</TableHead>
                    <TableHead className="text-center font-black">الحالة</TableHead>
                    <TableHead className="w-[150px] font-black text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary opacity-20" />
                        <p className="text-sm font-bold text-muted-foreground mt-4 animate-pulse">جاري فحص المستودع...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20">
                        <Package className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
                        <p className="text-lg font-black text-muted-foreground/40">لا توجد منتجات مسجلة حالياً</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.map((product) => (
                    <TableRow key={product.id} className="border-b border-white/5 hover:bg-white/30 transition-all duration-300 group">
                      <TableCell className="text-center py-6">
                        <div className="h-12 w-12 mx-auto rounded-xl bg-white p-1 shadow-sm group-hover:scale-125 transition-transform cursor-pointer">
                           <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${product.productCode}`} 
                            alt="QR"
                            className="h-full w-full"
                           />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-4">
                           <div className="h-12 w-12 rounded-2xl overflow-hidden shadow-md border-2 border-white group-hover:rotate-6 transition-transform">
                              <img src={product.imageUrl || `https://picsum.photos/seed/${product.productCode}/100/100`} alt="" className="object-cover h-full w-full" />
                           </div>
                           <div className="flex flex-col">
                              <span className="font-black text-sm text-primary">{product.name}</span>
                              <span className="text-[10px] font-bold text-muted-foreground tabular-nums opacity-60">#{product.productCode}</span>
                           </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-white/50 text-[10px] rounded-lg border-white/20">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                         <div className="flex flex-col items-center">
                            <span className="font-black tabular-nums text-lg">{product.quantity}</span>
                            <span className="text-[9px] font-bold text-muted-foreground opacity-50">الحد: {product.minStockQuantity || 5}</span>
                         </div>
                      </TableCell>
                      <TableCell className="text-left font-black tabular-nums text-primary text-lg">
                        {product.salePrice.toLocaleString()} دج
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          className={`rounded-full px-4 font-black text-[9px] shadow-sm ${
                            product.quantity <= (product.minStockQuantity || 5) 
                              ? 'bg-red-500 text-white animate-pulse' 
                              : 'bg-emerald-500 text-white'
                          }`}
                        >
                          {product.quantity === 0 ? 'نفذت' : 
                           product.quantity <= (product.minStockQuantity || 5) ? 'منخفض' : 'متوفر'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl bg-white/50 hover:bg-primary hover:text-white"
                            onClick={() => handleEdit(product)}
                           >
                             <Edit3 className="h-4 w-4" />
                           </Button>
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl bg-white/50 hover:bg-accent hover:text-white"
                            onClick={() => handlePrintLabel(product)}
                           >
                             <Printer className="h-4 w-4" />
                           </Button>
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl bg-white/50 hover:bg-destructive hover:text-white"
                            onClick={() => handleDelete(product.id)}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <div className="flex justify-center text-muted-foreground/30 text-[10px] font-black italic gap-2 py-4">
            <span>EXPRESS PHONE PRO • SECURE INVENTORY MANAGEMENT</span>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
