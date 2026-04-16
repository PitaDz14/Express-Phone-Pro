"use client"

import * as React from "react"
import { 
  Package, 
  Plus, 
  Search, 
  MoreVertical, 
  Printer, 
  QrCode, 
  Sparkles,
  Loader2,
  Trash2
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
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

export default function ProductsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  
  // Form State
  const [productName, setProductName] = React.useState("")
  const [productCode, setProductCode] = React.useState("")
  const [category, setCategory] = React.useState("قطع غيار")
  const [quantity, setQuantity] = React.useState(0)
  const [purchasePrice, setPurchasePrice] = React.useState(0)
  const [salePrice, setSalePrice] = React.useState(0)
  const [keywords, setKeywords] = React.useState("")
  const [description, setDescription] = React.useState("")
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
    const newProduct = {
      name: productName,
      productCode,
      category,
      quantity: Number(quantity),
      purchasePrice: Number(purchasePrice),
      salePrice: Number(salePrice),
      description,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      minStockQuantity: 5
    }

    addDocumentNonBlocking(productsRef, newProduct)
    
    toast({ title: "تم النجاح", description: "تم إضافة المنتج بنجاح" })
    resetForm()
    setOpen(false)
    setIsSaving(false)
  }

  const resetForm = () => {
    setProductName("")
    setProductCode("")
    setQuantity(0)
    setPurchasePrice(0)
    setSalePrice(0)
    setKeywords("")
    setDescription("")
  }

  const handleDelete = (id: string) => {
    const docRef = doc(db, "products", id)
    deleteDocumentNonBlocking(docRef)
    toast({ title: "تم الحذف", description: "تم حذف المنتج من المخزون" })
  }

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.productCode.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-6 bg-white sticky top-0 z-10 no-print">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-xl font-bold tracking-tight">إدارة المخزون والمنتجات</h1>
          </div>
          <div className="flex items-center gap-3">
             <Dialog open={open} onOpenChange={setOpen}>
               <DialogTrigger asChild>
                 <Button className="flex items-center gap-2">
                   <Plus className="h-4 w-4" />
                   إضافة منتج جديد
                 </Button>
               </DialogTrigger>
               <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir="rtl">
                 <DialogHeader>
                   <DialogTitle>إضافة منتج جديد للمخزون</DialogTitle>
                   <DialogDescription>
                     أدخل تفاصيل المنتج الجديد هنا. يمكنك استخدام الذكاء الاصطناعي لتوليد وصف جذاب.
                   </DialogDescription>
                 </DialogHeader>
                 <div className="grid gap-4 py-4">
                   <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="name" className="text-right">اسم المنتج</Label>
                     <Input 
                        id="name" 
                        className="col-span-3" 
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="مثال: شاشة ايفون 13"
                      />
                   </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="code" className="text-right">كود المنتج</Label>
                     <Input 
                        id="code" 
                        className="col-span-3" 
                        value={productCode}
                        onChange={(e) => setProductCode(e.target.value)}
                        placeholder="P-001" 
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="grid gap-2">
                       <Label htmlFor="purchase">سعر الشراء (دج)</Label>
                       <Input 
                        id="purchase" 
                        type="number" 
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(Number(e.target.value))}
                       />
                     </div>
                     <div className="grid gap-2">
                       <Label htmlFor="sale">سعر البيع (دج)</Label>
                       <Input 
                        id="sale" 
                        type="number" 
                        value={salePrice}
                        onChange={(e) => setSalePrice(Number(e.target.value))}
                       />
                     </div>
                   </div>
                   <div className="grid gap-2">
                      <Label htmlFor="qty">الكمية المتوفرة</Label>
                      <Input 
                        id="qty" 
                        type="number" 
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                      />
                   </div>
                   <div className="border-t pt-4 space-y-3">
                     <div className="flex items-center justify-between">
                       <Label>وصف المنتج الذكي</Label>
                       <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-primary gap-1"
                        onClick={handleGenerateDescription}
                        disabled={isGenerating || !productName}
                       >
                         {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                         توليد بالذكاء الاصطناعي
                       </Button>
                     </div>
                     <Input 
                        placeholder="كلمات مفتاحية (مقسمة بفاصلة: أصلي، ضمان، شحن سريع)" 
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                     />
                     <Textarea 
                        placeholder="سيظهر الوصف الجذاب هنا..." 
                        className="h-24"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                     />
                   </div>
                 </div>
                 <DialogFooter>
                   <Button 
                    type="submit" 
                    className="w-full" 
                    onClick={handleSaveProduct}
                    disabled={isSaving}
                   >
                     {isSaving ? "جاري الحفظ..." : "حفظ المنتج"}
                   </Button>
                 </DialogFooter>
               </DialogContent>
             </Dialog>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="بحث برقم الكود أو الاسم..." 
                className="pl-10 h-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Printer className="h-4 w-4" />
                طباعة الملصقات
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <QrCode className="h-4 w-4" />
                مسح QR
              </Button>
            </div>
          </div>

          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[120px]">كود المنتج</TableHead>
                    <TableHead>اسم المنتج</TableHead>
                    <TableHead>الفئة</TableHead>
                    <TableHead className="text-center">الكمية</TableHead>
                    <TableHead className="text-left">سعر البيع</TableHead>
                    <TableHead className="text-left">الحالة</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        <p className="text-sm text-muted-foreground mt-2">جاري تحميل المنتجات...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        لا توجد منتجات مطابقة للبحث
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.map((product) => (
                    <TableRow key={product.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium tabular-nums">{product.productCode}</TableCell>
                      <TableCell className="font-semibold">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{product.quantity}</TableCell>
                      <TableCell className="text-left tabular-nums font-bold">{product.salePrice.toLocaleString()} دج</TableCell>
                      <TableCell className="text-left">
                        <Badge 
                          className={
                            product.quantity <= 5 ? 'bg-orange-100 text-orange-700 hover:bg-orange-100 border-none' : 
                            product.quantity > 5 ? 'bg-green-100 text-green-700 hover:bg-green-100 border-none' : 
                            'bg-red-100 text-red-700 hover:bg-red-100 border-none'
                          }
                        >
                          {product.quantity === 0 ? 'نفذت الكمية' : 
                           product.quantity <= 5 ? 'مخزون منخفض' : 'متوفر'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <div className="mt-8 flex justify-center text-muted-foreground/30 text-[10px] gap-2 items-center">
            <span>© 2024 Express Phone - by Khaled_Deragha</span>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
