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
  Loader2
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

export default function ProductsPage() {
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [productName, setProductName] = React.useState("")
  const [keywords, setKeywords] = React.useState("")
  const [description, setDescription] = React.useState("")

  const handleGenerateDescription = async () => {
    if (!productName) return
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
             <Dialog>
               <DialogTrigger asChild>
                 <Button className="flex items-center gap-2">
                   <Plus className="h-4 w-4" />
                   إضافة منتج جديد
                 </Button>
               </DialogTrigger>
               <DialogContent className="sm:max-w-[600px]" dir="rtl">
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
                      />
                   </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="code" className="text-right">كود المنتج</Label>
                     <Input id="code" className="col-span-3" placeholder="P-001" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="grid gap-2">
                       <Label htmlFor="purchase">سعر الشراء</Label>
                       <Input id="purchase" type="number" placeholder="0 دج" />
                     </div>
                     <div className="grid gap-2">
                       <Label htmlFor="sale">سعر البيع</Label>
                       <Input id="sale" type="number" placeholder="0 دج" />
                     </div>
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
                   <Button type="submit" className="w-full">حفظ المنتج</Button>
                 </DialogFooter>
               </DialogContent>
             </Dialog>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث برقم الكود أو الاسم..." className="pl-10 h-10" />
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
                  {[
                    { id: "P-1024", name: "شاشة iPhone 13 Pro Max أصلي", category: "قطع غيار", qty: 5, price: "18,500 دج", status: "Low Stock" },
                    { id: "P-1025", name: "بطارية Samsung S22 Ultra", category: "قطع غيار", qty: 12, price: "4,500 دج", status: "In Stock" },
                    { id: "P-1026", name: "شاحن Apple 20W Type-C", category: "إكسسوارات", qty: 25, price: "3,800 دج", status: "In Stock" },
                    { id: "P-1027", name: "واقي شاشة نانو سيراميك", category: "إكسسوارات", qty: 50, price: "1,200 دج", status: "In Stock" },
                    { id: "P-1028", name: "كابل بيانات Baseus 100W", category: "إكسسوارات", qty: 2, price: "2,400 دج", status: "Out of Stock" },
                  ].map((product) => (
                    <TableRow key={product.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium tabular-nums">{product.id}</TableCell>
                      <TableCell className="font-semibold">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{product.qty}</TableCell>
                      <TableCell className="text-left tabular-nums font-bold">{product.price}</TableCell>
                      <TableCell className="text-left">
                        <Badge 
                          className={
                            product.status === 'Low Stock' ? 'bg-orange-100 text-orange-700 hover:bg-orange-100 border-none' : 
                            product.status === 'In Stock' ? 'bg-green-100 text-green-700 hover:bg-green-100 border-none' : 
                            'bg-red-100 text-red-700 hover:bg-red-100 border-none'
                          }
                        >
                          {product.status === 'Low Stock' ? 'مخزون منخفض' : 
                           product.status === 'In Stock' ? 'متوفر' : 'نفذت الكمية'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
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
