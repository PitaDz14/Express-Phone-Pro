
"use client"

import * as React from "react"
import { 
  Plus, 
  Search, 
  ShoppingBag, 
  UserPlus, 
  QrCode, 
  Wallet, 
  AlertTriangle, 
  Package, 
  TrendingUp, 
  Zap, 
  Loader2,
  Edit3,
  Minus,
  Sparkles,
  Camera,
  Smartphone,
  Image as ImageIcon,
  Settings2,
  Upload,
  Layers,
  ShieldCheck,
  UserCog,
  X,
  FileText,
  Download,
  Printer,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, useUser } from "@/firebase"
import { collection, query, limit, orderBy, doc, serverTimestamp } from "firebase/firestore"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { QRScannerDialog } from "@/components/qr-scanner-dialog"
import { useRouter } from "next/navigation"

// --- Memoized Sub-components for Speed ---

const StatCard = React.memo(({ title, value, icon: Icon, color, subValue, onClick }: any) => (
  <Card 
    className={cn(
      "border-none glass rounded-[2.5rem] shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.01] group",
      onClick && "cursor-pointer active:scale-95"
    )}
    onClick={onClick}
  >
    <CardContent className="p-6 flex items-center gap-4">
      <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg", color)}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{title}</span>
        <span className="text-xl font-black tabular-nums text-foreground">{value}</span>
        {subValue && <span className="text-[9px] font-bold text-muted-foreground mt-1">{subValue}</span>}
      </div>
    </CardContent>
  </Card>
))
StatCard.displayName = "StatCard"

const QuickActionButton = React.memo(({ href, icon: Icon, label, color, onClick }: any) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3 p-4 md:p-6 h-full group">
      <div className={cn("h-12 w-12 md:h-14 md:w-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105", color)}>
        <Icon className="h-6 w-6 md:h-7 md:w-7" />
      </div>
      <span className="font-black text-xs md:text-sm text-foreground group-hover:text-primary text-center leading-tight transition-colors">{label}</span>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="glass rounded-[2.5rem] hover:bg-white/40 transition-all border-none hover:shadow-lg">
        {content}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className="glass rounded-[2.5rem] hover:bg-white/40 transition-all border-none hover:shadow-lg text-right w-full">
      {content}
    </button>
  )
})
QuickActionButton.displayName = "QuickActionButton"

const QuickEditItem = React.memo(({ product, db, showPurchase, showRepair, userId, isAdmin }: { product: any, db: any, showPurchase: boolean, showRepair: boolean, userId: string, isAdmin: boolean }) => {
  const [localQty, setLocalQty] = React.useState(product.quantity)
  const [localSalePrice, setLocalSalePrice] = React.useState(product.salePrice)
  const [localPurchasePrice, setLocalPurchasePrice] = React.useState(product.purchasePrice || 0)
  const [localRepairPrice, setLocalRepairPrice] = React.useState(product.repairPrice || 0)

  React.useEffect(() => {
    setLocalQty(product.quantity);
    setLocalSalePrice(product.salePrice);
    setLocalPurchasePrice(product.purchasePrice || 0);
    setLocalRepairPrice(product.repairPrice || 0);
  }, [product]);

  const handleUpdate = React.useCallback((field: string, value: number) => {
    if (!isAdmin) return;
    const productRef = doc(db, "products", product.id)
    updateDocumentNonBlocking(productRef, { 
      [field]: value,
      updatedAt: serverTimestamp(),
      updatedByUserId: userId 
    })
  }, [db, product.id, userId, isAdmin])

  return (
    <div className="p-4 rounded-2xl glass border-white/10 flex flex-col gap-4 hover:bg-white/20 transition-all duration-200">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 overflow-hidden">
            <div className="h-10 w-10 rounded-lg bg-card border border-border flex items-center justify-center overflow-hidden shrink-0">
               {product.imageUrl ? (
                 <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
               ) : (
                 <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
               )}
            </div>
            <div className="overflow-hidden">
               <p className="font-black text-sm text-foreground truncate">{product.name}</p>
               <p className="text-[9px] text-primary font-bold truncate">{product.categoryPath || product.categoryName}</p>
            </div>
          </div>
          {isAdmin ? (
            <div className="flex items-center gap-1.5 bg-black/5 p-1 rounded-xl shrink-0">
              <button className="h-7 w-7 md:h-8 md:w-8 flex items-center justify-center rounded-lg hover:bg-black/10 transition-colors" onClick={() => { const v = Math.max(0, localQty - 1); setLocalQty(v); handleUpdate('quantity', v); }}><Minus className="h-3 w-3 md:h-4 md:w-4"/></button>
              <span className="w-6 md:w-8 text-center text-xs md:text-sm font-black tabular-nums">{localQty}</span>
              <button className="h-7 w-7 md:h-8 md:w-8 flex items-center justify-center rounded-lg hover:bg-black/10 transition-colors" onClick={() => { const v = localQty + 1; setLocalQty(v); handleUpdate('quantity', v); }}><Plus className="h-3 w-3 md:h-4 md:w-4"/></button>
            </div>
          ) : (
             <Badge variant="outline" className="h-8 rounded-xl font-black text-xs px-4">متوفر: {localQty}</Badge>
          )}
       </div>

       <div className={cn("grid gap-3", (showPurchase && showRepair && isAdmin) ? "grid-cols-2 md:grid-cols-3" : (showPurchase || showRepair) ? "grid-cols-2" : "grid-cols-1")}>
          <div className="space-y-1">
             <Label className="text-[8px] font-black uppercase text-primary px-1">سعر البيع</Label>
             <Input 
                type="number" 
                className="h-8 md:h-9 glass border-none rounded-xl text-[10px] md:text-xs font-black tabular-nums text-primary focus:ring-1 focus:ring-primary"
                value={localSalePrice}
                readOnly={!isAdmin}
                onChange={(e) => { const v = Number(e.target.value); setLocalSalePrice(v); handleUpdate('salePrice', v); }}
             />
          </div>
          {showRepair && (
            <div className="space-y-1">
              <Label className="text-[8px] font-black uppercase text-muted-foreground px-1">سعر التصليح</Label>
              <Input 
                  type="number" 
                  className="h-8 md:h-9 glass border-none rounded-xl text-[10px] md:text-xs font-black tabular-nums focus:ring-1 focus:ring-primary"
                  value={localRepairPrice}
                  readOnly={!isAdmin}
                  onChange={(e) => { const v = Number(e.target.value); setLocalRepairPrice(v); handleUpdate('repairPrice', v); }}
              />
            </div>
          )}
          {showPurchase && isAdmin && (
            <div className="space-y-1">
               <Label className="text-[8px] font-black uppercase text-orange-600 px-1">سعر الشراء</Label>
               <Input 
                  type="number" 
                  className="h-8 md:h-9 glass border-none rounded-xl text-[10px] md:text-xs font-black tabular-nums text-orange-600 focus:ring-1 focus:ring-orange-600"
                  value={localPurchasePrice}
                  onChange={(e) => { const v = Number(e.target.value); setLocalPurchasePrice(v); handleUpdate('purchasePrice', v); }}
               />
            </div>
          )}
       </div>
    </div>
  )
})
QuickEditItem.displayName = "QuickEditItem"

export default function Dashboard() {
  const db = useFirestore()
  const { user, role, username } = useUser()
  const isAdmin = role === "Admin"
  const { toast } = useToast()
  const router = useRouter()
  
  // Hydration safety
  const [isMounted, setIsMounted] = React.useState(false)
  React.useEffect(() => { setIsMounted(true) }, [])

  const [searchTerm, setSearchTerm] = React.useState("")
  const [quickEditSearch, setQuickEditSearch] = React.useState("")
  const [showPurchaseInEdit, setShowPurchaseInEdit] = React.useState(false)
  const [showRepairInEdit, setShowRepairInEdit] = React.useState(true)
  const [showRepairInSearch, setShowRepairInSearch] = React.useState(false)
  const [isQuickEditOpen, setIsQuickEditOpen] = React.useState(false)
  const [isAddProductOpen, setIsAddProductOpen] = React.useState(false)
  const [isQRScannerOpen, setIsQRScannerOpen] = React.useState(false)
  const [isLowStockOpen, setIsLowStockOpen] = React.useState(false)
  const [lowStockFilter, setLowStockFilter] = React.useState("all")
  const [lowStockSortConfig, setLowStockSortConfig] = React.useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'quantity', direction: 'asc' })

  // Full Add Product States
  const [qaName, setQaName] = React.useState("")
  const [qaCode, setQaCode] = React.useState("")
  const [qaCat, setQaCat] = React.useState("")
  const [qaImageUrl, setQaImageUrl] = React.useState("")
  const [qaQty, setQaQty] = React.useState(0)
  const [qaPurchase, setQaPurchase] = React.useState(0)
  const [qaSale, setQaSale] = React.useState(0)
  const [qaRepair, setQaRepair] = React.useState(0)
  const [qaMinStock, setQaMinStock] = React.useState(1)
  const [isAdding, setIsAdding] = React.useState(false)

  const productsRef = useMemoFirebase(() => collection(db, "products"), [db])
  const customersRef = useMemoFirebase(() => collection(db, "customers"), [db])
  const invoicesRef = useMemoFirebase(() => collection(db, "invoices"), [db])
  const categoriesRef = useMemoFirebase(() => collection(db, "categories"), [db])
  
  const { data: products, isLoading: isProductsLoading } = useCollection(productsRef)
  const { data: customers } = useCollection(customersRef)
  const { data: categories } = useCollection(categoriesRef)
  
  const recentInvoicesQuery = useMemoFirebase(() => query(invoicesRef, orderBy("createdAt", "desc"), limit(5)), [invoicesRef])
  const { data: recentInvoices, isLoading: isInvoicesLoading } = useCollection(recentInvoicesQuery)

  const lowStockItems = React.useMemo(() => {
    if (!isMounted || !products) return [];
    let filtered = products.filter(p => Number(p.quantity) <= (Number(p.minStockQuantity) || 1));
    
    if (lowStockFilter && lowStockFilter !== "all") {
      filtered = filtered.filter(p => p.categoryId === lowStockFilter);
    }
    
    if (lowStockSortConfig.key) {
      filtered.sort((a, b) => {
        let valA = a[lowStockSortConfig.key];
        let valB = b[lowStockSortConfig.key];
        
        if (typeof valA === 'number' && typeof valB === 'number') {
           return lowStockSortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        
        valA = String(valA || "").toLowerCase();
        valB = String(valB || "").toLowerCase();
        if (valA < valB) return lowStockSortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return lowStockSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [products, lowStockFilter, lowStockSortConfig, isMounted]);

  const handleExportLowStock = (format: 'excel' | 'txt' | 'print') => {
    if (lowStockItems.length === 0) return;

    if (format === 'excel') {
      // Excel/CSV Export
      const headers = ["اسم المنتج", "الكود", "التصنيف", "المتوفر", "الحد الأدنى", "سعر البيع"];
      const rows = lowStockItems.map(p => [
        p.name,
        p.productCode,
        p.categoryPath || p.categoryName,
        p.quantity,
        p.minStockQuantity || 1,
        p.salePrice
      ]);

      const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `نواقص_المخزون_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast({ title: "تم التصدير", description: "تم تحميل ملف Excel بنجاح" });
    } else if (format === 'txt') {
      // TXT Export
      let content = `قائمة نواقص المخزون - EXPRESS PHONE PRO\n`;
      content += `التاريخ: ${new Date().toLocaleDateString('ar-DZ')}\n`;
      content += `-------------------------------------------\n\n`;
      lowStockItems.forEach((p, i) => {
        content += `${i + 1}. ${p.name}\n   الكود: ${p.productCode}\n   المتوفر: ${p.quantity} (الحد الأدنى: ${p.minStockQuantity || 1})\n   التصنيف: ${p.categoryPath || p.categoryName}\n\n`;
      });

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `قائمة_النواقص_${new Date().toISOString().split('T')[0]}.txt`;
      link.click();
      toast({ title: "تم التصدير", description: "تم تحميل ملف القائمة النصية" });
    } else if (format === 'print') {
      // Print/Invoice style Report
      const printContent = `
        <html dir="rtl">
          <head>
            <title>قائمة نواقص المخزون</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&display=swap');
              body { font-family: 'Almarai', sans-serif; padding: 10mm; color: #000; background: #fff; line-height: 1.4; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
              .header h1 { font-size: 24px; font-weight: 800; margin: 0; }
              .info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; font-weight: 700; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
              th, td { border: 1px solid #000; padding: 8px; text-align: right; }
              th { background-color: #f0f0f0; }
              .footer { text-align: center; font-size: 10px; margin-top: 30px; opacity: 0.5; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>EXPRESS PHONE PRO</h1>
              <p style="font-weight: 800;">تقرير نواقص المخزون وحاجيات التوريد</p>
            </div>
            <div class="info">
              <div>التاريخ: ${new Date().toLocaleDateString('ar-DZ')}</div>
              <div>عدد المنتجات الناقصة: ${lowStockItems.length}</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 40%">المنتج</th>
                  <th style="text-align: center">الكود</th>
                  <th style="text-align: center">المتوفر</th>
                  <th style="text-align: center">الحد الأدنى</th>
                  <th style="text-align: center">سعر البيع</th>
                </tr>
              </thead>
              <tbody>
                ${lowStockItems.map(p => `
                  <tr>
                    <td><strong>${p.name}</strong><br><small>${p.categoryPath || p.categoryName}</small></td>
                    <td style="text-align: center">${p.productCode}</td>
                    <td style="text-align: center; color: red; font-weight: 800">${p.quantity}</td>
                    <td style="text-align: center">${p.minStockQuantity || 1}</td>
                    <td style="text-align: center">${p.salePrice.toLocaleString()} دج</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="footer">توليد تلقائي بواسطة نظام إكسبريس فون - تم التطوير بواسطة Khaled_Deragha</div>
          </body>
        </html>
      `;

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
  }

  const stats = React.useMemo(() => {
    if (!isMounted || !products) return {
      todaySales: 0,
      productCount: 0,
      lowStock: 0,
      totalDebt: 0,
      screensCount: 0,
      screensSaleVal: 0,
      screensPurchaseVal: 0
    };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todaySales = recentInvoices?.filter(inv => {
      const date = inv.createdAt?.toDate ? inv.createdAt.toDate() : (inv.createdAt instanceof Date ? inv.createdAt : null);
      return date && date >= todayStart && date <= todayEnd;
    }).reduce((acc, inv) => acc + (inv.totalAmount || 0), 0) || 0;

    const screens = products?.filter(p => {
      const name = (p.name || "").toLowerCase()
      const path = (p.categoryPath || "").toLowerCase()
      return name.includes("lcd") || name.includes("screen") || name.includes("شاشة") || name.includes("afficheur") || path.includes("شاشات")
    }) || []

    return {
      todaySales,
      productCount: products?.length || 0,
      lowStock: products?.filter(p => Number(p.quantity) <= (Number(p.minStockQuantity) || 1)).length || 0,
      totalDebt: customers?.reduce((acc, c) => acc + (c.debt || 0), 0) || 0,
      screensCount: screens.reduce((acc, p) => acc + (p.quantity || 0), 0),
      screensSaleVal: screens.reduce((acc, p) => acc + (p.salePrice * (p.quantity || 0)), 0),
      screensPurchaseVal: screens.reduce((acc, p) => acc + ((p.purchasePrice || 0) * (p.quantity || 0)), 0)
    }
  }, [recentInvoices, products, customers, isMounted])

  const filteredProducts = React.useMemo(() => {
    if (!searchTerm || !products) return []
    const term = searchTerm.toLowerCase()
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || p.productCode?.toLowerCase().includes(term)
    ).slice(0, 5)
  }, [searchTerm, products])

  const quickEditProducts = React.useMemo(() => {
    if (!products) return []
    const term = quickEditSearch.toLowerCase()
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || p.productCode?.toLowerCase().includes(term)
    ).slice(0, 10) 
  }, [quickEditSearch, products])

  const getFullCategoryPath = (catId: string, allCats: any[]): string => {
    const cat = allCats.find(c => c.id === catId);
    if (!cat) return "";
    if (!cat.parentId) return cat.name;
    return `${getFullCategoryPath(cat.parentId, allCats)} > ${cat.name}`;
  }

  const handleFullAdd = async () => {
    if (!isAdmin) return;
    if (!qaName || !qaCat || qaSale <= 0 || !user) {
      toast({ title: "خطأ", description: "يرجى ملء الاسم، التصنيف، وسعر البيع على الأقل", variant: "destructive" })
      return
    }

    setIsAdding(true)
    const selectedCat = categories?.find(c => c.id === qaCat)
    const finalCode = qaCode.trim() || `EP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    const categoryPath = categories ? getFullCategoryPath(qaCat, categories) : (selectedCat?.name || "بدون تصنيف");

    try {
      await addDocumentNonBlocking(productsRef, {
        name: qaName,
        productCode: finalCode,
        imageUrl: qaImageUrl,
        categoryId: qaCat,
        categoryName: selectedCat?.name || "بدون تصنيف",
        categoryPath: categoryPath,
        quantity: Number(qaQty),
        purchasePrice: Number(qaPurchase),
        salePrice: Number(qaSale),
        repairPrice: Number(qaRepair),
        minStockQuantity: Number(qaMinStock),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdByUserId: user.uid
      })

      toast({ title: "تمت الإضافة", description: `تم إضافة ${qaName} بنجاح` })
      resetQaForm()
      setIsAddProductOpen(false)
    } catch (e) {
      console.error(e)
    } finally {
      setIsAdding(false)
    }
  }

  const resetQaForm = () => {
    setQaName(""); setQaCode(""); setQaCat(""); setQaImageUrl(""); setQaQty(0); setQaPurchase(0); setQaSale(0); setQaRepair(0); setQaMinStock(1);
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setQaImageUrl(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleQRScan = (code: string) => {
    if (code.includes("/invoices/history")) {
      const hash = code.split('#')[1];
      router.push(`/invoices/history${hash ? `#${hash}` : ''}`);
      return;
    }

    const product = products?.find(p => p.productCode === code)
    if (product) {
      setQuickEditSearch(code)
      setIsQuickEditOpen(true)
    } else {
      toast({ title: "منتج غير معروف", description: `كود ${code} غير موجود في النظام`, variant: "destructive" })
    }
  }

  const handleLowStockSort = (key: string) => {
    setLowStockSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-transparent pb-32 overflow-x-hidden">
      <QRScannerDialog 
        open={isQRScannerOpen} 
        onOpenChange={setIsQRScannerOpen} 
        onScan={handleQRScan} 
      />

      <header className="flex flex-col md:flex-row h-auto md:h-20 shrink-0 items-center justify-between p-4 md:px-10 glass sticky top-0 z-50 gap-4">
        <div className="flex w-full md:w-auto items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 md:gap-3 group">
            <div className="h-10 h-10 md:h-12 md:w-12 rounded-xl bg-white flex items-center justify-center shadow-md border border-primary/10 text-primary">
               <Smartphone className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm md:text-lg font-black tracking-tighter text-gradient-premium leading-none">EXPRESS PHONE</h1>
              <span className="text-[7px] md:text-[8px] font-black text-muted-foreground uppercase tracking-widest">Pro System</span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
             {isAdmin && (
               <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9 md:hidden rounded-xl glass border-primary/10 bg-white/20" 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQuickEditSearch(""); setIsQuickEditOpen(true); }}
               >
                 <Edit3 className="h-4 w-4 text-primary" />
               </Button>
             )}
             
             <div className="flex flex-col items-end mr-1 text-right">
                <span className="text-[7px] md:text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none">الحساب الحالي</span>
                <span className={cn(
                  "text-[10px] md:text-xs font-black truncate max-w-[80px] md:max-w-[150px]",
                  isAdmin ? "text-primary" : "text-emerald-600"
                )}>
                  {username || "..."}
                </span>
             </div>
             
             <div className={cn(
               "h-9 w-9 md:h-11 md:w-11 rounded-xl flex items-center justify-center text-white shadow border border-white/20",
               isAdmin ? "bg-gradient-to-br from-primary to-[#2a4580]" : "bg-gradient-to-br from-emerald-500 to-teal-700"
             )}>
               {isAdmin ? <ShieldCheck className="h-5 w-5 md:h-6 md:w-6" /> : <UserCog className="h-5 w-5 md:h-6 md:w-6" />}
             </div>
          </div>
        </div>

        <div className="flex flex-1 w-full md:max-w-xl md:mx-8 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors" />
          <Input 
            placeholder="ابحث سريعا عن منتج أو كود..." 
            className="pl-12 h-11 md:h-12 w-full glass border-none rounded-2xl font-bold text-xs md:text-sm" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
             {isAdmin && (
               <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10 hidden md:flex" 
                onClick={() => { setQuickEditSearch(""); setIsQuickEditOpen(true); }}
                title="تعديل سريع"
               >
                 <Edit3 className="h-4 w-4" />
               </Button>
             )}
             <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="glass border-none rounded-2xl w-56 p-4 z-[100]">
                   <div className="space-y-4">
                      <p className="text-[10px] font-black text-primary uppercase text-right">إعدادات البحث</p>
                      <div className="flex items-center justify-between" dir="rtl">
                         <Label className="text-xs font-bold">إظهار سعر التصليح</Label>
                         <Switch checked={showRepairInSearch} onCheckedChange={setShowRepairInSearch} />
                      </div>
                   </div>
                </PopoverContent>
             </Popover>
          </div>
          
          {searchTerm && (
            <div className="absolute top-full left-0 right-0 mt-3 glass-premium rounded-[1.5rem] shadow-2xl z-50 overflow-hidden border-white/20 max-h-[60vh] overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground font-bold italic text-xs">لا توجد نتائج</div>
              ) : (
                <>
                  {filteredProducts.map(p => (
                    <div key={p.id} className="p-4 md:p-5 hover:bg-primary/5 border-b last:border-0 border-white/5 flex items-center justify-between group cursor-pointer" onClick={() => { setSearchTerm(""); setQuickEditSearch(p.productCode); setIsQuickEditOpen(true); }}>
                       <div className="flex items-center gap-3 md:gap-4">
                          <div className="h-12 w-12 rounded-xl bg-card border border-border flex items-center justify-center hidden sm:flex overflow-hidden shrink-0">
                            {p.imageUrl ? (
                               <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                               <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                            )}
                          </div>
                          <div className="flex flex-col">
                             <span className="font-black text-xs md:text-base text-foreground group-hover:text-primary transition-colors">{p.name}</span>
                             <span className="text-[8px] md:text-[10px] text-primary font-bold uppercase tracking-widest mt-1">{p.categoryPath || p.categoryName}</span>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end">
                            <span className="text-sm md:text-lg font-black text-primary tabular-nums">
                              {p.salePrice.toLocaleString()} <span className="text-[10px] md:text-xs opacity-60 font-bold">دج</span>
                            </span>
                            <span className="text-[10px] text-emerald-600 font-black">متوفر: {p.quantity}</span>
                          </div>
                       </div>
                    </div>
                  ))}
                  <Link href="/products" className="block p-3 text-center bg-primary/5 text-[10px] font-black text-primary uppercase tracking-widest">مشاهدة كافة المنتجات</Link>
                </>
              )}
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center gap-4">
           {isAdmin && (
             <Button 
               variant="outline" 
               className="h-11 px-4 rounded-2xl glass border-primary/20 gap-2 font-black" 
               onClick={() => { setQuickEditSearch(""); setIsQuickEditOpen(true); }}
             >
               <Edit3 className="h-4 w-4 text-primary" /> التعديل السريع
             </Button>
           )}
           <div className="flex flex-col text-right">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">أهلاً بك</span>
              <span className="text-sm font-black text-primary truncate max-w-[120px]">{username || "..."}</span>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 md:space-y-10">
        
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          <QuickActionButton href="/invoices" icon={ShoppingBag} label="إنشاء فاتورة" color="bg-primary" />
          {isAdmin && <QuickActionButton onClick={() => { resetQaForm(); setIsAddProductOpen(true); }} icon={Plus} label="إضافة منتج" color="bg-accent" />}
          <QuickActionButton href="/customers" icon={UserPlus} label="إضافة عميل" color="bg-emerald-500" />
          <QuickActionButton icon={QrCode} label="مسح QR" color="bg-orange-500" onClick={() => setIsQRScannerOpen(true)} />
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {isAdmin && <StatCard title="مبيعات اليوم" value={`${stats.todaySales.toLocaleString()} دج`} icon={TrendingUp} color="bg-emerald-500" />}
          <StatCard title="إجمالي المنتجات" value={stats.productCount} icon={Package} color="bg-primary" />
          <StatCard title="مخزون منخفض" value={stats.lowStock} icon={AlertTriangle} color="bg-orange-500" onClick={() => setIsLowStockOpen(true)} />
          {isAdmin && <StatCard title="إجمالي الديون" value={`${stats.totalDebt.toLocaleString()} دج`} icon={Wallet} color="bg-red-500" />}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          
          <div className="lg:col-span-2 flex flex-col gap-6 md:gap-8">
             {isAdmin && (
               <Card className="border-none bg-gradient-to-br from-[#1e293b] to-[#0f172a] text-white rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl relative">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Smartphone className="h-48 w-48 rotate-12" />
                  </div>
                  <CardHeader className="p-6 md:p-8 relative z-10">
                     <div className="flex items-center gap-3 mb-2">
                        <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                           <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
                        </div>
                        <CardTitle className="text-lg md:text-xl font-black">إحصائيات الشاشات</CardTitle>
                     </div>
                  </CardHeader>
                  <CardContent className="px-6 md:px-8 pb-6 md:pb-8 relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                     <div className="glass bg-white/5 p-4 rounded-2xl">
                        <span className="text-[8px] md:text-[9px] font-black uppercase text-emerald-400">إجمالي القطع</span>
                        <p className="text-2xl md:text-3xl font-black tabular-nums">{stats.screensCount}</p>
                     </div>
                     <div className="glass bg-white/5 p-4 rounded-2xl">
                        <span className="text-[8px] md:text-[9px] font-black uppercase text-primary">قيمة البيع</span>
                        <p className="text-xl md:text-2xl font-black tabular-nums">{stats.screensSaleVal.toLocaleString()} دج</p>
                     </div>
                     <div className="glass bg-white/5 p-4 rounded-2xl">
                        <span className="text-[8px] md:text-[9px] font-black uppercase text-orange-400">قيمة الشراء</span>
                        <p className="text-xl md:text-2xl font-black tabular-nums">{stats.screensPurchaseVal.toLocaleString()} دج</p>
                     </div>
                  </CardContent>
               </Card>
             )}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <Card className="border-none glass rounded-[2rem] p-4 md:p-6">
                   <h3 className="font-black text-xs md:text-sm mb-2">تنبيه المخزون</h3>
                   <p className="text-[10px] md:text-xs text-muted-foreground font-medium leading-relaxed">
                      {stats.lowStock > 0 
                        ? `لديك ${stats.lowStock} منتجات اقتربت من النفاد. يرجى توريد كميات جديدة.`
                        : "مستوى المخزون لديك مستقر اليوم."
                      }
                   </p>
                </Card>
                {isAdmin && (
                  <Card className="border-none bg-primary/10 rounded-[2rem] p-4 md:p-6 border border-primary/20">
                    <h3 className="font-black text-xs md:text-sm text-primary mb-2">إدارة المستحقات</h3>
                    <p className="text-[10px] md:text-xs text-primary/80 font-bold leading-relaxed">
                        إجمالي مبالغ الديون في السوق حالياً هو {stats.totalDebt.toLocaleString()} دج.
                    </p>
                  </Card>
                )}
             </div>
          </div>

          <Card className="lg:col-span-1 border-none glass rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-xl flex flex-col">
            <CardHeader className="p-6 md:p-8 border-b border-white/5 bg-primary/5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base md:text-lg font-black">أحدث العمليات</CardTitle>
                <Button asChild variant="ghost" size="sm" className="text-[9px] md:text-[10px] font-black text-primary">
                   <Link href="/invoices/history">الكل</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="divide-y divide-white/5">
                {isInvoicesLoading ? (
                  <div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-20" /></div>
                ) : recentInvoices?.length === 0 ? (
                  <div className="p-10 text-center opacity-30 italic font-black text-[10px]">لا توجد مبيعات</div>
                ) : recentInvoices?.map((inv) => (
                  <div key={inv.id} className="p-4 md:p-5 flex items-center justify-between hover:bg-white/30 transition-all duration-200">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="h-8 h-8 md:h-10 md:w-10 rounded-xl bg-card border border-white/10 flex items-center justify-center text-primary shrink-0">
                        <ShoppingBag className="h-4 w-4 md:h-5 md:w-5" />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase">#{inv.id.slice(0, 6)}</span>
                        <span className="font-black text-[10px] md:text-xs truncate max-w-[100px]">{inv.customerName}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                       <span className="font-black text-primary text-xs md:text-sm tabular-nums">{inv.totalAmount.toLocaleString()} دج</span>
                       {inv.status === "Debt" && <Badge className="text-[7px] md:text-[8px] h-3 md:h-4 bg-red-500/10 text-red-600 border-none">دين</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Low Stock Dialog - Enhanced with Sorting & Export */}
      <Dialog open={isLowStockOpen} onOpenChange={setIsLowStockOpen}>
        <DialogContent dir="rtl" className="max-w-5xl w-[95%] glass border-none rounded-[2.5rem] shadow-2xl p-0 overflow-hidden z-[300] max-h-[90vh] flex flex-col">
           <DialogHeader className="p-6 md:p-8 bg-orange-500/5 border-b border-orange-500/10 shrink-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                   <div className="h-12 w-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600 shadow-inner">
                      <AlertTriangle className="h-7 w-7" />
                   </div>
                   <div>
                      <DialogTitle className="text-xl md:text-2xl font-black text-orange-700">قائمة النواقص الاحترافية</DialogTitle>
                      <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-1">تحديد حاجيات التوريد والمشتريات</p>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                         <Button className="h-10 px-6 rounded-xl bg-orange-600 text-white font-black gap-2 shadow-lg shadow-orange-500/20">
                            <Download className="h-4 w-4" /> تصدير القائمة <ChevronDown className="h-3 w-3" />
                         </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="glass border-none rounded-xl z-[350]">
                         <DropdownMenuItem className="font-bold flex items-center gap-2" onClick={() => handleExportLowStock('print')}>
                            <Printer className="h-4 w-4" /> طباعة كشف توريد
                         </DropdownMenuItem>
                         <DropdownMenuItem className="font-bold flex items-center gap-2" onClick={() => handleExportLowStock('excel')}>
                            <FileText className="h-4 w-4" /> تصدير ملف Excel
                         </DropdownMenuItem>
                         <DropdownMenuItem className="font-bold flex items-center gap-2" onClick={() => handleExportLowStock('txt')}>
                            <X className="h-4 w-4 rotate-45" /> تصدير قائمة نصية TXT
                         </DropdownMenuItem>
                      </DropdownMenuContent>
                   </DropdownMenu>
                </div>
              </div>
           </DialogHeader>

           <div className="p-4 md:px-8 bg-card/40 border-b border-white/5 flex flex-col md:flex-row gap-3 shrink-0">
              <div className="flex-1 flex flex-col md:flex-row items-center gap-2">
                 <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">فلترة:</Label>
                 <Select value={lowStockFilter} onValueChange={setLowStockFilter}>
                    <SelectTrigger className="h-10 glass border-none rounded-xl font-bold text-xs md:w-56">
                       <SelectValue placeholder="حسب التصنيف" />
                    </SelectTrigger>
                    <SelectContent className="glass border-none rounded-xl z-[350]">
                       <SelectItem value="all">كافة التصنيفات</SelectItem>
                       {categories?.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                 </Select>
                 
                 <div className="h-6 w-px bg-border mx-2 hidden md:block" />
                 
                 <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">ترتيب:</Label>
                 <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={cn("h-9 rounded-xl gap-2 font-bold text-xs", lowStockSortConfig.key === 'name' ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}
                      onClick={() => handleLowStockSort('name')}
                    >
                       الاسم {lowStockSortConfig.key === 'name' && (lowStockSortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={cn("h-9 rounded-xl gap-2 font-bold text-xs", lowStockSortConfig.key === 'quantity' ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}
                      onClick={() => handleLowStockSort('quantity')}
                    >
                       الكمية {lowStockSortConfig.key === 'quantity' && (lowStockSortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </Button>
                 </div>
              </div>
              <Badge variant="destructive" className="h-10 px-4 rounded-xl font-black text-xs self-center">
                 {lowStockItems.length} منتجات ناقصة
              </Badge>
           </div>

           <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 custom-scrollbar">
              {lowStockItems.length === 0 ? (
                <div className="py-20 text-center opacity-30 italic font-black">لا توجد منتجات مطابقة لهذا الفرز</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {lowStockItems.map((p) => (
                     <div key={p.id} className="p-4 rounded-2xl glass border-orange-500/10 flex items-center justify-between group hover:bg-orange-500/5 transition-all shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                           <div className="h-14 w-14 rounded-xl bg-card border border-border flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                              {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <Package className="h-6 w-6 text-muted-foreground/10" />}
                           </div>
                           <div className="flex flex-col overflow-hidden">
                              <span className="font-black text-xs text-foreground truncate">{p.name}</span>
                              <span className="text-[8px] text-muted-foreground font-black tabular-nums mt-0.5">#{p.productCode}</span>
                              <span className="text-[9px] text-primary font-bold mt-1 bg-primary/5 px-2 py-0.5 rounded-lg w-fit">{p.categoryName}</span>
                           </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 pl-2">
                           <div className="flex items-center gap-1">
                              <span className="text-xl font-black text-red-600 tabular-nums">{p.quantity}</span>
                              <span className="text-[10px] text-muted-foreground font-bold">متوفر</span>
                           </div>
                           <span className="text-[8px] font-black text-muted-foreground uppercase mt-1">الحد الأدنى: {p.minStockQuantity || 1}</span>
                        </div>
                     </div>
                   ))}
                </div>
              )}
           </div>

           <div className="p-6 bg-black/5 flex justify-center shrink-0">
              <Button onClick={() => setIsLowStockOpen(false)} className="rounded-2xl px-12 h-12 font-black shadow-lg">إغلاق نافذة النواقص</Button>
           </div>
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <DialogContent dir="rtl" className="max-w-2xl w-[95%] glass border-none rounded-[2.5rem] shadow-2xl p-8 z-[310] max-h-[90vh] overflow-y-auto custom-scrollbar">
           <DialogHeader>
              <DialogTitle className="text-2xl font-black text-gradient-premium">إضافة منتج جديد للمخزون</DialogTitle>
           </DialogHeader>
           
           <div className="py-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label className="font-black text-[10px] text-primary uppercase px-1">اسم المنتج</Label>
                    <Input value={qaName} onChange={(e) => setQaName(e.target.value)} className="h-12 glass border-none rounded-xl font-bold" placeholder="مثال: شاشة iPhone 13 Original" />
                 </div>
                 <div className="space-y-2">
                    <Label className="font-black text-[10px] text-primary uppercase px-1">كود المنتج (اختياري)</Label>
                    <Input value={qaCode} onChange={(e) => setQaCode(e.target.value)} className="h-12 glass border-none rounded-xl font-mono" placeholder="سيتولد تلقائياً إذا تركت فارغاً" />
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label className="font-black text-[10px] text-primary uppercase px-1">التصنيف</Label>
                    <Select value={qaCat} onValueChange={setQaCat}>
                       <SelectTrigger className="h-12 glass border-none rounded-xl font-bold"><SelectValue placeholder="اختر التصنيف..." /></SelectTrigger>
                       <SelectContent className="glass border-none rounded-xl z-[400]">
                          {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                       </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label className="font-black text-[10px] text-primary uppercase px-1">صورة المنتج</Label>
                    <div className="flex gap-2">
                       <Input value={qaImageUrl} onChange={(e) => setQaImageUrl(e.target.value)} className="h-12 glass border-none rounded-xl font-bold text-xs" placeholder="رابط الصورة أو ارفع ملفاً" />
                       <label className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary cursor-pointer hover:bg-primary hover:text-white transition-colors">
                          <Upload className="h-5 w-5" /><input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                       </label>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div className="space-y-2">
                    <Label className="font-black text-[10px] text-primary uppercase px-1">الكمية</Label>
                    <Input type="number" value={qaQty} onChange={(e) => setQaQty(Number(e.target.value))} className="h-12 glass border-none rounded-xl font-black text-center" />
                 </div>
                 <div className="space-y-2">
                    <Label className="font-black text-[10px] text-orange-600 uppercase px-1">سعر الشراء</Label>
                    <Input type="number" value={qaPurchase} onChange={(e) => setQaPurchase(Number(e.target.value))} className="h-12 glass border-none rounded-xl font-black text-center text-orange-600" />
                 </div>
                 <div className="space-y-2">
                    <Label className="font-black text-[10px] text-emerald-600 uppercase px-1">سعر البيع</Label>
                    <Input type="number" value={qaSale} onChange={(e) => setQaSale(Number(e.target.value))} className="h-12 glass border-none rounded-xl font-black text-center text-emerald-600" />
                 </div>
                 <div className="space-y-2">
                    <Label className="font-black text-[10px] text-muted-foreground uppercase px-1">سعر التصليح</Label>
                    <Input type="number" value={qaRepair} onChange={(e) => setQaRepair(Number(e.target.value))} className="h-12 glass border-none rounded-xl font-black text-center" />
                 </div>
              </div>
           </div>

           <DialogFooter>
              <Button onClick={handleFullAdd} disabled={isAdding} className="w-full h-14 rounded-2xl bg-primary text-white font-black text-lg shadow-xl hover:scale-[1.02] transition-transform">
                 {isAdding ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />} تأكيد الإضافة والمزامنة
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Edit Dialog */}
      <Dialog open={isQuickEditOpen} onOpenChange={setIsQuickEditOpen}>
        <DialogContent dir="rtl" className="max-w-2xl w-[95%] glass border-none rounded-[2.5rem] shadow-2xl p-0 overflow-hidden z-[320] flex flex-col h-[80vh]">
           <DialogHeader className="p-6 md:p-8 bg-primary/5 border-b border-white/10 shrink-0">
              <DialogTitle className="text-xl font-black text-primary flex items-center gap-3">
                 <Edit3 className="h-6 w-6" /> التعديل السريع للمخزون
              </DialogTitle>
           </DialogHeader>

           <div className="p-4 md:p-6 bg-card/40 border-b border-white/5 shrink-0">
              <div className="relative group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                 <Input 
                   placeholder="ابحث عن المنتج لتعديله..." 
                   className="pl-12 h-12 glass border-none rounded-2xl font-bold" 
                   value={quickEditSearch}
                   onChange={(e) => setQuickEditSearch(e.target.value)}
                   autoFocus
                 />
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
              <div className="flex items-center justify-end gap-4 mb-4">
                 <div className="flex items-center gap-2">
                    <Label className="text-[10px] font-black">إظهار الشراء</Label>
                    <Switch checked={showPurchaseInEdit} onCheckedChange={setShowPurchaseInEdit} />
                 </div>
                 <div className="flex items-center gap-2">
                    <Label className="text-[10px] font-black">إظهار التصليح</Label>
                    <Switch checked={showRepairInEdit} onCheckedChange={setShowRepairInEdit} />
                 </div>
              </div>

              {quickEditProducts.length === 0 ? (
                <div className="py-20 text-center opacity-30 italic font-black">لا توجد منتجات مطابقة</div>
              ) : (
                <div className="space-y-4">
                   {quickEditProducts.map(p => (
                     <QuickEditItem 
                       key={p.id} 
                       product={p} 
                       db={db} 
                       showPurchase={showPurchaseInEdit} 
                       showRepair={showRepairInEdit} 
                       userId={user?.uid || ""} 
                       isAdmin={isAdmin}
                     />
                   ))}
                </div>
              )}
           </div>

           <div className="p-6 bg-black/5 text-center shrink-0">
              <Button onClick={() => setIsQuickEditOpen(false)} className="rounded-2xl px-12 h-12 font-black shadow-lg">إغلاق النافذة</Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
