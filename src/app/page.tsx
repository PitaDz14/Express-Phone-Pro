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
  Eye,
  EyeOff,
  Minus,
  Sparkles,
  X,
  Camera,
  Smartphone,
  Image as ImageIcon,
  Link as LinkIcon,
  User,
  Settings2,
  Settings,
  Upload,
  Layers,
  ChevronLeft,
  FileDown,
  Download,
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
  DialogTrigger,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, useUser } from "@/firebase"
import { collection, query, limit, orderBy, doc, serverTimestamp } from "firebase/firestore"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { QRScannerDialog } from "@/components/qr-scanner-dialog"
import { useRouter } from "next/navigation"

// --- Components ---

const StatCard = ({ title, value, icon: Icon, color, subValue, onClick }: any) => (
  <Card 
    className={cn(
      "border-none glass rounded-[2.5rem] shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] group",
      onClick && "cursor-pointer active:scale-95"
    )}
    onClick={onClick}
  >
    <CardContent className="p-6 flex items-center gap-4">
      <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-12", color)}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{title}</span>
        <span className="text-xl font-black tabular-nums text-foreground">{value}</span>
        {subValue && <span className="text-[9px] font-bold text-muted-foreground mt-1">{subValue}</span>}
      </div>
    </CardContent>
  </Card>
)

const QuickActionButton = ({ href, icon: Icon, label, color, onClick }: any) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3 p-4 md:p-6 h-full transition-all group">
      <div className={cn("h-12 w-12 md:h-14 md:w-14 rounded-2xl flex items-center justify-center text-white shadow-xl transform group-hover:scale-110 group-hover:rotate-6 transition-transform", color)}>
        <Icon className="h-6 w-6 md:h-7 md:w-7" />
      </div>
      <span className="font-black text-xs md:text-sm text-foreground transition-colors group-hover:text-primary text-center leading-tight">{label}</span>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="glass rounded-[2.5rem] hover:bg-white/40 transition-all border-none hover:shadow-xl hover:-translate-y-1">
        {content}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className="glass rounded-[2.5rem] hover:bg-white/40 transition-all border-none hover:shadow-xl hover:-translate-y-1 text-right w-full">
      {content}
    </button>
  )
}

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
    if (!isAdmin) return; // Prevent Workers from manual editing
    const productRef = doc(db, "products", product.id)
    updateDocumentNonBlocking(productRef, { 
      [field]: value,
      updatedAt: serverTimestamp(),
      updatedByUserId: userId 
    })
  }, [db, product.id, userId, isAdmin])

  return (
    <div className="p-4 rounded-2xl glass border-white/10 flex flex-col gap-4 hover:bg-white/20 transition-all animate-in fade-in zoom-in duration-300">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 overflow-hidden">
            <div className="h-10 w-10 rounded-lg bg-card border border-border flex items-center justify-center overflow-hidden shrink-0">
               {product.imageUrl ? (
                 <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
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
  const { user, role } = useUser()
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
    
    // Sort logic
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

    const today = new Date().setHours(0, 0, 0, 0)
    const todaySales = recentInvoices?.filter(inv => {
      const date = inv.createdAt?.toDate ? inv.createdAt.toDate().setHours(0,0,0,0) : null
      return date === today
    }).reduce((acc, inv) => acc + (inv.totalAmount || 0), 0) || 0

    const screens = products?.filter(p => {
      const name = p.name.toLowerCase()
      const path = (p.categoryPath || "").toLowerCase()
      return name.includes("lcd") || name.includes("screen") || name.includes("شاشة") || name.includes("afficheur") || path.includes("شاشات")
    }) || []

    return {
      todaySales,
      productCount: products?.length || 0,
      lowStock: products?.filter(p => Number(p.quantity) <= (Number(p.minStockQuantity) || 1)).length || 0,
      totalDebt: customers?.reduce((acc, c) => acc + (c.debt || 0), 0) || 0,
      screensCount: screens.reduce((acc, p) => acc + (p.quantity || 0), 0),
      screensSaleVal: screens.reduce((acc, p) => acc + (p.salePrice * p.quantity), 0),
      screensPurchaseVal: screens.reduce((acc, p) => acc + ((p.purchasePrice || 0) * p.quantity), 0)
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
    ).slice(0, 15)
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
      toast({ title: "توجيه ذكي", description: "جاري الانتقال لصفحة سجل الفواتير" });
      return;
    }

    const product = products?.find(p => p.productCode === code)
    if (product) {
      setQuickEditSearch(code)
      setIsQuickEditOpen(true)
      toast({ title: "تم العثور على المنتج", description: product.name })
    } else {
      toast({ title: "منتج غير معروف", description: `كود ${code} غير موجود في النظام`, variant: "destructive" })
    }
  }

  const exportLowStock = (format: 'csv' | 'txt') => {
    if (lowStockItems.length === 0) return;
    
    let content = "";
    const date = new Date().toLocaleDateString('ar-DZ');

    if (format === 'csv') {
      const headers = ["المنتج", "التصنيف", "الكمية الحالية", "الحد الأدنى"];
      content = headers.join(",") + "\n";
      content += lowStockItems.map(p => 
        `"${p.name}","${p.categoryPath || p.categoryName}","${p.quantity}","${p.minStockQuantity}"`
      ).join("\n");
    } else {
      content = `قائمة نواقص المخزن - ${date}\n`;
      content += `====================================\n\n`;
      content += lowStockItems.map(p => 
        `- ${p.name} (${p.categoryName})\n  الكمية: ${p.quantity} (الحد: ${p.minStockQuantity})`
      ).join("\n\n");
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `نواقص_المخزن_${date}.${format === 'csv' ? 'csv' : 'txt'}`;
    link.click();
    toast({ title: "تم التصدير", description: "تم تحميل القائمة بنجاح" });
  };

  const renderCategoryOptions = (cats: any[], parentId: string | null = null, depth = 0, currentPath = "") => {
    return cats
      .filter(c => c.parentId === parentId)
      .map(cat => {
        const fullPath = currentPath ? `${currentPath} > ${cat.name}` : cat.name;
        return (
          <React.Fragment key={cat.id}>
            <SelectItem value={cat.id} className={cn(depth > 0 && "pr-6")}>
              {fullPath}
            </SelectItem>
            {renderCategoryOptions(cats, cat.id, depth + 1, fullPath)}
          </React.Fragment>
        )
      })
  }

  const handleLowStockSort = (key: string) => {
    setLowStockSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const LowStockSortIcon = ({ column }: { column: string }) => {
    if (lowStockSortConfig.key !== column) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    if (lowStockSortConfig.direction === 'asc') return <ArrowUp className="h-3 w-3 text-primary" />;
    if (lowStockSortConfig.direction === 'desc') return <ArrowDown className="h-3 w-3 text-primary" />;
    return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  }

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-transparent pb-32 animate-in fade-in duration-700 overflow-x-hidden">
      <QRScannerDialog 
        open={isQRScannerOpen} 
        onOpenChange={setIsQRScannerOpen} 
        onScan={handleQRScan} 
      />

      <header className="flex flex-col md:flex-row h-auto md:h-20 shrink-0 items-center justify-between p-4 md:px-10 glass sticky top-0 z-50 gap-4">
        <div className="flex w-full md:w-auto items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 md:gap-3 group">
            <div className="h-10 h-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-white flex items-center justify-center shadow-lg rotate-3 border border-primary/10 transition-transform group-hover:rotate-0 text-primary">
               <Smartphone className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm md:text-lg font-black tracking-tighter text-gradient-premium leading-none">EXPRESS PHONE</h1>
              <span className="text-[7px] md:text-[8px] font-black text-muted-foreground uppercase tracking-widest">Pro System</span>
            </div>
          </Link>

          <div className="flex md:hidden items-center gap-2">
             <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl glass" onClick={() => { setIsQuickEditOpen(true); setQuickEditSearch(""); }}>
               <Edit3 className="h-4 w-4 text-primary" />
             </Button>

             <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg overflow-hidden border border-white/20">
               <User className="h-6 w-6" />
             </div>
          </div>
        </div>

        <div className="flex flex-1 w-full md:max-w-xl md:mx-8 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="ابحث سريعا عن منتج أو كود..." 
            className="pl-12 h-11 md:h-12 w-full glass border-none rounded-2xl font-bold text-xs md:text-sm focus:ring-2 focus:ring-primary/20 transition-all" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
             <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary">
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
            <div className="absolute top-full left-0 right-0 mt-3 glass-premium rounded-[1.5rem] md:rounded-3xl shadow-2xl z-50 overflow-hidden border-white/20 animate-in slide-in-from-top-2 max-h-[70vh] overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground font-bold italic text-xs">لا توجد نتائج مطابقة</div>
              ) : (
                <>
                  {filteredProducts.map(p => (
                    <div key={p.id} className="p-4 md:p-5 hover:bg-primary/5 border-b last:border-0 border-white/5 flex items-center justify-between group transition-all cursor-pointer" onClick={() => { setSearchTerm(p.productCode); setQuickEditSearch(p.productCode); setIsQuickEditOpen(true); setSearchTerm(""); }}>
                       <div className="flex items-center gap-3 md:gap-4">
                          <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-card border border-border flex items-center justify-center hidden sm:flex items-center justify-center overflow-hidden shrink-0">
                            {p.imageUrl ? (
                               <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                               <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                            )}
                          </div>
                          <div className="flex flex-col">
                             <span className="font-black text-xs md:text-base text-foreground group-hover:text-primary transition-colors">{p.name}</span>
                             <span className="text-[8px] md:text-[10px] text-primary font-bold uppercase tracking-widest leading-none mt-1">{p.categoryPath || p.categoryName}</span>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end">
                            <span className="text-sm md:text-xl font-black text-primary tabular-nums">
                              {p.salePrice.toLocaleString()} <span className="text-[10px] md:text-xs opacity-60 font-bold">دج</span>
                            </span>
                            {showRepairInSearch && (
                               <span className="text-[9px] font-bold text-muted-foreground">التصليح: {p.repairPrice?.toLocaleString()} دج</span>
                            )}
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] text-emerald-600 font-black">متوفر: {p.quantity}</span>
                            </div>
                          </div>
                       </div>
                    </div>
                  ))}
                  <Link href="/products" className="block p-4 text-center bg-primary/5 text-[10px] font-black text-primary uppercase tracking-[0.2em] hover:bg-primary/10 transition-colors">مشاهدة كافة المنتجات</Link>
                </>
              )}
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center gap-4">
           <Button variant="outline" size="icon" className="h-11 w-11 rounded-2xl glass hover:scale-105 transition-transform" onClick={() => { setIsQuickEditOpen(true); setQuickEditSearch(""); }}>
             <Edit3 className="h-5 w-5 text-primary" />
           </Button>

           <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg overflow-hidden border border-white/20">
             <User className="h-6 w-6" />
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
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Smartphone className="h-48 w-48 rotate-12" />
                  </div>
                  <CardHeader className="p-6 md:p-8 relative z-10">
                     <div className="flex items-center gap-3 mb-2">
                        <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                           <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
                        </div>
                        <CardTitle className="text-lg md:text-xl font-black">إحصائيات الشاشات الحصرية</CardTitle>
                     </div>
                  </CardHeader>
                  <CardContent className="px-6 md:px-8 pb-6 md:pb-8 relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                     <div className="glass bg-white/5 p-4 rounded-2xl">
                        <span className="text-[8px] md:text-[9px] font-black uppercase text-emerald-400">إجمالي القطع</span>
                        <p className="text-2xl md:text-3xl font-black tabular-nums">{stats.screensCount} <span className="text-sm opacity-40">قطعة</span></p>
                     </div>
                     <div className="glass bg-white/5 p-4 rounded-2xl">
                        <span className="text-[8px] md:text-[9px] font-black uppercase text-primary">قيمة البيع الإجمالية</span>
                        <p className="text-xl md:text-2xl font-black tabular-nums">{stats.screensSaleVal.toLocaleString()} <span className="text-xs opacity-40">دج</span></p>
                     </div>
                     <div className="glass bg-white/5 p-4 rounded-2xl">
                        <span className="text-[8px] md:text-[9px] font-black uppercase text-orange-400">قيمة الشراء الإجمالية</span>
                        <p className="text-xl md:text-2xl font-black tabular-nums">{stats.screensPurchaseVal.toLocaleString()} <span className="text-xs opacity-40">دج</span></p>
                     </div>
                  </CardContent>
               </Card>
             )}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <Card className="border-none glass rounded-[2rem] p-4 md:p-6">
                   <h3 className="font-black text-xs md:text-sm mb-2">نصيحة اليوم الذكية</h3>
                   <p className="text-[10px] md:text-xs text-muted-foreground font-medium leading-relaxed">
                      {stats.lowStock > 0 
                        ? `لديك ${stats.lowStock} منتجات اقتربت من النفاد. ننصح بتوريد كميات جديدة لضمان استمرارية المبيعات.`
                        : "مستوى المخزون لديك ممتاز اليوم. ركز على ترويج المنتجات الأكثر ربحية مثل الشاشات الأصلية."
                      }
                   </p>
                </Card>
                {isAdmin && (
                  <Card className="border-none bg-primary/10 rounded-[2rem] p-4 md:p-6 border border-primary/20">
                    <h3 className="font-black text-xs md:text-sm text-primary mb-2">حالة الديون</h3>
                    <p className="text-[10px] md:text-xs text-primary/80 font-bold leading-relaxed">
                        إجمالي مبالغ الديون في السوق حالياً هو {stats.totalDebt.toLocaleString()} دج. تواصل مع العملاء لتسوية الحسابات.
                    </p>
                  </Card>
                )}
             </div>
          </div>

          <Card className="lg:col-span-1 border-none glass rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-xl flex flex-col">
            <CardHeader className="p-6 md:p-8 border-b border-white/5 bg-primary/5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base md:text-lg font-black">آخر المبيعات</CardTitle>
                <Button asChild variant="ghost" size="sm" className="text-[9px] md:text-[10px] font-black text-primary hover:bg-primary/5">
                   <Link href="/invoices/history">عرض الكل</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="divide-y divide-white/5">
                {isInvoicesLoading ? (
                  <div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-20" /></div>
                ) : recentInvoices?.length === 0 ? (
                  <div className="p-10 text-center opacity-30 italic font-black text-[10px]">لا توجد مبيعات مؤخراً</div>
                ) : recentInvoices?.map((inv, idx) => (
                  <div key={inv.id} className="p-4 md:p-6 flex items-center justify-between hover:bg-white/30 transition-all">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="h-8 h-8 md:h-10 md:w-10 rounded-xl bg-card border border-white/10 flex items-center justify-center text-primary overflow-hidden">
                        <ShoppingBag className="h-4 w-4 md:h-5 md:w-5" />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase">#{inv.id.slice(0, 6)}</span>
                        <span className="font-black text-[10px] md:text-xs truncate max-w-[100px] md:max-w-[120px]">{inv.customerName}</span>
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
            <div className="p-4 bg-black/5 text-center">
               <p className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">Express Phone Pro &copy; 2026</p>
            </div>
          </Card>
        </div>
      </main>

      {/* Low Stock Dialog */}
      <Dialog open={isLowStockOpen} onOpenChange={setIsLowStockOpen}>
        <DialogContent dir="rtl" className="max-w-4xl w-[95%] glass border-none rounded-[2rem] md:rounded-[3rem] shadow-2xl p-0 overflow-hidden flex flex-col h-[90vh] z-[300]">
           <DialogHeader className="p-6 md:p-8 border-b border-white/5 bg-orange-500/5 shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col">
                    <DialogTitle className="text-lg md:text-xl font-black">نواقص المخزن</DialogTitle>
                    <p className="text-[10px] font-bold text-muted-foreground">قائمة السلع المطلوب توريدها عاجلاً</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <Button onClick={() => exportLowStock('csv')} size="sm" variant="outline" className="rounded-xl gap-2 font-bold h-10">
                     <FileDown className="h-4 w-4" /> <span className="hidden sm:inline">Excel</span>
                   </Button>
                   <Button onClick={() => exportLowStock('txt')} size="sm" variant="outline" className="rounded-xl gap-2 font-bold h-10">
                     <Download className="h-4 w-4" /> <span className="hidden sm:inline">نص (TXT)</span>
                   </Button>
                </div>
              </div>
           </DialogHeader>

           <div className="p-4 md:p-6 bg-white/5 border-b border-white/5 flex items-center gap-4">
              <div className="flex-1">
                 <Label className="text-[10px] font-black text-primary uppercase mr-1">تصفية حسب التصنيف</Label>
                 <Select value={lowStockFilter} onValueChange={setLowStockFilter}>
                    <SelectTrigger className="h-11 glass border-none rounded-xl font-bold text-right">
                       <SelectValue placeholder="الكل" />
                    </SelectTrigger>
                    <SelectContent className="glass border-none rounded-xl z-[350]">
                       <SelectItem value="all">كل الأقسام</SelectItem>
                       {categories?.map((cat: any) => (
                         <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                       ))}
                    </SelectContent>
                 </Select>
              </div>
              <div className="flex flex-col items-end">
                 <span className="text-[10px] font-black text-muted-foreground uppercase">إجمالي العناصر</span>
                 <span className="text-xl font-black tabular-nums">{lowStockItems.length}</span>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
              <div className="table-container">
                 <Table>
                    <TableHeader>
                       <TableRow className="border-white/10">
                          <TableHead className="font-black text-foreground text-right cursor-pointer group" onClick={() => handleLowStockSort('name')}>
                             <div className="flex items-center gap-2">المنتج <LowStockSortIcon column="name" /></div>
                          </TableHead>
                          <TableHead className="font-black text-foreground text-center cursor-pointer group" onClick={() => handleLowStockSort('categoryName')}>
                             <div className="flex items-center justify-center gap-2">التصنيف <LowStockSortIcon column="categoryName" /></div>
                          </TableHead>
                          <TableHead className="font-black text-foreground text-center cursor-pointer group" onClick={() => handleLowStockSort('quantity')}>
                             <div className="flex items-center justify-center gap-2">المتوفر <LowStockSortIcon column="quantity" /></div>
                          </TableHead>
                          <TableHead className="font-black text-foreground text-left">الحالة</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       {isProductsLoading ? (
                         <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                       ) : lowStockItems.length === 0 ? (
                         <TableRow><TableCell colSpan={4} className="text-center py-20 opacity-30 italic font-black">لا توجد نواقص في هذا القسم</TableCell></TableRow>
                       ) : lowStockItems.map(p => (
                         <TableRow key={p.id} className="border-white/5">
                            <TableCell className="font-bold text-xs">{p.name}</TableCell>
                            <TableCell className="text-center text-[10px] text-muted-foreground font-bold">{p.categoryName}</TableCell>
                            <TableCell className="text-center font-black tabular-nums text-red-600">{p.quantity}</TableCell>
                            <TableCell className="text-left">
                               <Badge variant={p.quantity === 0 ? "destructive" : "warning"} className="rounded-lg text-[9px]">
                                  {p.quantity === 0 ? "نافد" : "منخفض"}
                               </Badge>
                            </TableCell>
                         </TableRow>
                       ))}
                    </TableBody>
                 </Table>
              </div>
           </div>
           
           <div className="p-4 md:p-6 bg-black/5 text-center shrink-0">
              <Button onClick={() => setIsLowStockOpen(false)} className="rounded-2xl px-12 h-12 font-black shadow-lg">إغلاق القائمة</Button>
           </div>
        </DialogContent>
      </Dialog>

      {/* Quick Edit Dialog */}
      <Dialog open={isQuickEditOpen} onOpenChange={setIsQuickEditOpen}>
        <DialogContent dir="rtl" className="max-w-4xl w-[95%] glass border-none rounded-[2rem] md:rounded-[3rem] shadow-2xl p-0 overflow-hidden flex flex-col h-[90vh] z-[300]">
           <DialogHeader className="p-6 md:p-8 border-b border-white/5 bg-primary/5 shrink-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg md:text-xl font-black text-gradient-premium">
                   {isAdmin ? "الإدارة السريعة للمخزون" : "دليل الأسعار السريع"}
                </DialogTitle>
                {isAdmin && (
                  <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" className="rounded-xl gap-2 font-bold text-[10px] md:text-xs">
                          <Settings2 className="h-4 w-4" /> <span className="hidden sm:inline">إعدادات العرض</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="glass border-none rounded-2xl w-64 p-5 z-[350]">
                        <div className="space-y-5">
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest text-right">تخصيص أعمدة الإدارة</p>
                          <div className="flex items-center justify-between" dir="rtl">
                              <div className="flex flex-col">
                                <Label className="text-xs font-black">سعر الشراء</Label>
                                <span className="text-[9px] text-muted-foreground">عرض حقل التكلفة</span>
                              </div>
                              <Switch checked={showPurchaseInEdit} onCheckedChange={setShowPurchaseInEdit} />
                          </div>
                          <div className="flex items-center justify-between" dir="rtl">
                              <div className="flex flex-col">
                                <Label className="text-xs font-black">سعر التصليح</Label>
                                <span className="text-[9px] text-muted-foreground">عرض حقل الصيانة</span>
                              </div>
                              <Switch checked={showRepairInEdit} onCheckedChange={setShowRepairInEdit} />
                          </div>
                        </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
           </DialogHeader>

           <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="p-4 md:p-6 bg-white/5 border-b border-white/5 sticky top-0 z-10 backdrop-blur-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="بحث سريع في القائمة..." className="pl-10 h-11 md:h-12 glass border-none rounded-xl font-bold text-xs" value={quickEditSearch} onChange={(e) => setQuickEditSearch(e.target.value)} />
                </div>
              </div>

              {isAdmin && (
                <div className="p-6 md:p-8 border-b border-white/5 bg-primary/5 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-1 bg-primary rounded-full" />
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">إضافة منتج جديد فورياً</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[8px] font-black text-muted-foreground uppercase mr-1">الاسم</Label>
                        <Input placeholder="اسم المنتج" value={qaName} onChange={e => setQaName(e.target.value)} className="h-10 glass border-none rounded-xl font-bold text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[8px] font-black text-muted-foreground uppercase mr-1">التصنيف</Label>
                        <Select value={qaCat} onValueChange={setQaCat}>
                          <SelectTrigger className="h-10 glass border-none rounded-xl font-bold text-right text-xs">
                            <SelectValue placeholder="اختر الفئة..." />
                          </SelectTrigger>
                          <SelectContent className="glass border-none rounded-xl z-[350]">
                              {categories && renderCategoryOptions(categories)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[8px] font-black text-muted-foreground uppercase mr-1">الكمية</Label>
                        <Input type="number" placeholder="0" value={qaQty} onChange={e => setQaQty(Number(e.target.value))} className="h-10 glass border-none rounded-xl font-bold text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[8px] font-black text-emerald-600 uppercase mr-1">البيع</Label>
                        <Input type="number" placeholder="0" value={qaSale} onChange={e => setQaSale(Number(e.target.value))} className="h-10 glass border-none rounded-xl font-bold text-emerald-600 text-xs" />
                      </div>
                      {showPurchaseInEdit && (
                        <div className="space-y-1">
                          <Label className="text-[8px] font-black text-orange-600 uppercase mr-1">الشراء</Label>
                          <Input type="number" placeholder="0" value={qaPurchase} onChange={e => setQaPurchase(Number(e.target.value))} className="h-10 glass border-none rounded-xl font-bold text-orange-600 text-xs" />
                        </div>
                      )}
                      {showRepairInEdit && (
                        <div className="space-y-1">
                          <Label className="text-[8px] font-black text-primary uppercase mr-1">التصليح</Label>
                          <Input type="number" placeholder="0" value={qaRepair} onChange={e => setQaRepair(Number(e.target.value))} className="h-10 glass border-none rounded-xl font-bold text-primary text-xs" />
                        </div>
                      )}
                      <div className="sm:col-span-2 lg:col-span-1 pt-4">
                        <Button onClick={handleFullAdd} disabled={isAdding} className="w-full h-10 rounded-xl bg-primary text-white font-black shadow-lg gap-2 text-xs">
                          {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} إضافة
                        </Button>
                      </div>
                    </div>
                </div>
              )}

              <div className="p-4 md:p-8 space-y-4">
                {quickEditProducts.length === 0 ? (
                  <div className="py-20 text-center opacity-30 italic font-black text-xs">لا توجد نتائج بحث</div>
                ) : (
                  quickEditProducts.map(p => <QuickEditItem key={p.id} product={p} db={db} showPurchase={isAdmin ? showPurchaseInEdit : false} showRepair={showRepairInEdit} userId={user?.uid || ""} isAdmin={isAdmin} />)
                )}
              </div>
           </div>

           <div className="p-4 md:p-6 bg-black/5 text-center shrink-0 border-t border-white/5">
              <Button onClick={() => setIsQuickEditOpen(false)} className="rounded-2xl px-12 h-12 font-black shadow-lg">إغلاق النافذة</Button>
           </div>
        </DialogContent>
      </Dialog>

      {/* Dedicated Add Product Dialog */}
      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <DialogContent dir="rtl" className="glass border-none rounded-[2rem] md:rounded-[2.5rem] shadow-2xl max-w-2xl z-[310] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl md:text-3xl font-black text-gradient-premium">إضافة منتج جديد للمخزن</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:gap-6 py-4">
            <div className="flex items-center gap-6 p-4 glass rounded-2xl border-primary/10">
               <div className="h-24 w-24 rounded-2xl bg-card border border-border flex items-center justify-center overflow-hidden shrink-0 relative group">
                  {qaImageUrl ? (
                    <img src={qaImageUrl} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                  )}
                  <Label htmlFor="qa-image-upload" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Upload className="h-6 w-6 text-white" />
                  </Label>
                  <Input id="qa-image-upload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
               </div>
               <div className="flex-1 space-y-2">
                  <Label className="font-black text-[10px] text-primary">رابط الصورة (اختياري)</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="https://example.com/image.jpg" 
                      value={qaImageUrl} 
                      onChange={(e) => setQaImageUrl(e.target.value)} 
                      className="pl-9 h-10 glass border-none rounded-xl font-bold text-xs" 
                    />
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="font-black text-[10px] text-primary">اسم المنتج</Label>
                <Input value={qaName} onChange={(e) => setQaName(e.target.value)} className="rounded-xl h-10 md:h-12 glass border-none font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="font-black text-[10px] text-primary">كود المنتج (QR)</Label>
                <Input value={qaCode} onChange={(e) => setQaCode(e.target.value)} className="rounded-xl h-10 md:h-12 glass border-none font-bold" placeholder="اتركه فارغاً للتوليد التلقائي" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="font-black text-[10px] text-primary">التصنيف الهرمي</Label>
              <Select value={qaCat} onValueChange={setQaCat}>
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
                <Input type="number" value={qaPurchase} onChange={(e) => setQaPurchase(Number(e.target.value))} className="rounded-xl h-10 md:h-12 glass border-none font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="font-black text-[10px] text-primary">سعر البيع (دج)</Label>
                <Input type="number" value={qaSale} onChange={(e) => setQaSale(Number(e.target.value))} className="rounded-xl h-10 md:h-12 glass border-none font-bold text-emerald-600" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div className="space-y-1">
                <Label className="font-black text-[10px] text-primary">سعر التصليح</Label>
                <Input type="number" value={qaRepair} onChange={(e) => setQaRepair(Number(e.target.value))} className="rounded-xl h-10 glass border-none font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="font-black text-[10px] text-primary">الكمية</Label>
                <Input type="number" value={qaQty} onChange={(e) => setQaQty(Number(e.target.value))} className="rounded-xl h-10 glass border-none font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="font-black text-[10px] text-primary">حد التنبيه</Label>
                <Input type="number" value={qaMinStock} onChange={(e) => setMinStock(Number(e.target.value))} className="rounded-xl h-10 glass border-none font-bold" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleFullAdd} disabled={isAdding} className="w-full h-12 md:h-14 rounded-2xl font-black bg-primary text-white shadow-xl">
               {isAdding ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />} حفظ بيانات المنتج
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
