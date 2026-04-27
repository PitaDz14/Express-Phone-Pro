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
  ArrowDown,
  Wrench,
  CheckCircle2,
  LayoutGrid,
  List,
  Grid2X2,
  EyeOff,
  Eye,
  ShieldAlert,
  Ghost,
  History,
  Info,
  Star,
  Trash2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, useUser } from "@/firebase"
import { collection, query, limit, orderBy, doc, serverTimestamp, where } from "firebase/firestore"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { QRScannerDialog } from "@/components/qr-scanner-dialog"
import { useRouter } from "next/navigation"
import { SyncReconnectButton } from "@/components/sync-reconnect-button"

// --- Helper Functions ---

const getCategoryAndDescendants = (selectedId: string, allCats: any[]) => {
  const result = new Set<string>([selectedId]);
  const stack = [selectedId];
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
    const router = useRouter();
    return (
      <button onClick={() => router.push(href)} className="glass rounded-[2.5rem] hover:bg-white/40 transition-all border-none hover:shadow-lg w-full">
        {content}
      </button>
    )
  }

  return (
    <button onClick={onClick} className="glass rounded-[2.5rem] hover:bg-white/40 transition-all border-none hover:shadow-lg text-right w-full">
      {content}
    </button>
  )
})
QuickActionButton.displayName = "QuickActionButton"

const QuickEditItem = React.memo(({ product, db, showPurchase, showRepair, userId, isAdmin, onNameClick }: { product: any, db: any, showPurchase: boolean, showRepair: boolean, userId: string, isAdmin: boolean, onNameClick: (name: string) => void }) => {
  const [localQty, setLocalQty] = React.useState(product.quantity)
  const [localSalePrice, setLocalSalePrice] = React.useState(product.salePrice)
  const [localPurchasePrice, setLocalPurchasePrice] = React.useState(product.purchasePrice || 0)
  const [localRepairPrice, setLocalRepairPrice] = React.useState(product.repairPrice || 0)
  const [localIsPriority, setLocalIsPriority] = React.useState(product.isPriority || false)

  React.useEffect(() => {
    setLocalQty(product.quantity);
    setLocalSalePrice(product.salePrice);
    setLocalPurchasePrice(product.purchasePrice || 0);
    setLocalRepairPrice(product.repairPrice || 0);
    setLocalIsPriority(product.isPriority || false);
  }, [product]);

  const handleUpdate = React.useCallback((field: string, value: any) => {
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
               <div className="flex items-center gap-2">
                 <p onClick={() => onNameClick(product.name)} className="font-black text-sm text-foreground truncate cursor-pointer hover:text-primary transition-colors">{product.name}</p>
                 {localIsPriority && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />}
               </div>
               <p className="text-[9px] text-primary font-bold truncate">{product.categoryPath || product.categoryName}</p>
            </div>
          </div>
          {isAdmin ? (
            <div className="flex items-center gap-2">
               <div className="flex flex-col items-center mr-2">
                  <Label className="text-[7px] font-black text-primary uppercase">أولوية</Label>
                  <Switch checked={localIsPriority} onCheckedChange={(v) => { setLocalIsPriority(v); handleUpdate('isPriority', v); }} className="scale-75 origin-top" />
               </div>
               <div className="flex items-center gap-1.5 bg-black/5 p-1 rounded-xl shrink-0">
                 <button className="h-7 w-7 md:h-8 md:w-8 flex items-center justify-center rounded-lg hover:bg-black/10 transition-colors" onClick={() => { const v = Math.max(0, localQty - 1); setLocalQty(v); handleUpdate('quantity', v); }}><Minus className="h-3 w-3 md:h-4 md:w-4"/></button>
                 <span className="w-6 md:w-8 text-center text-xs md:text-sm font-black tabular-nums">{localQty}</span>
                 <button className="h-7 w-7 md:h-8 md:w-8 flex items-center justify-center rounded-lg hover:bg-black/10 transition-colors" onClick={() => { const v = localQty + 1; setLocalQty(v); handleUpdate('quantity', v); }}><Plus className="h-3 w-3 md:h-4 md:w-4"/></button>
               </div>
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
  
  // Persistent Settings
  const [showPurchaseInEdit, setShowPurchaseInEdit] = React.useState(false)
  const [showRepairInEdit, setShowRepairInEdit] = React.useState(true)
  const [showRepairInSearch, setShowRepairInSearch] = React.useState(false)
  
  // Low Stock Display Settings
  const [lowStockViewMode, setLowStockViewMode] = React.useState<'grid' | 'compact' | 'list'>('grid')
  const [lowStockLimit, setLowStockLimit] = React.useState<number>(25)

  // Exclusion Search States
  const [exclusionProdSearch, setExclusionProductSearch] = React.useState("")
  const [viewFullName, setViewFullName] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (isMounted) {
      const s1 = localStorage.getItem('setting_showPurchaseInEdit')
      const s2 = localStorage.getItem('setting_showRepairInEdit')
      const s3 = localStorage.getItem('setting_showRepairInSearch')
      const s4 = localStorage.getItem('lowStock_viewMode')
      const s5 = localStorage.getItem('lowStock_limit')
      
      if (s1 !== null) setShowPurchaseInEdit(s1 === 'true')
      if (s2 !== null) setShowRepairInEdit(s2 === 'true')
      if (s3 !== null) setShowRepairInSearch(s3 === 'true')
      if (s4 !== null) setLowStockViewMode(s4 as any)
      if (s5 !== null) setLowStockLimit(Number(s5))
    }
  }, [isMounted])

  const [isQuickEditOpen, setIsQuickEditOpen] = React.useState(false)
  const [isAddProductOpen, setIsAddProductOpen] = React.useState(false)
  const [isQRScannerOpen, setIsQRScannerOpen] = React.useState(false)
  const [isLowStockOpen, setIsLowStockOpen] = React.useState(false)
  const [isExclusionsOpen, setIsExclusionsOpen] = React.useState(false)
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
  const [qaIsPriority, setQaIsPriority] = React.useState(false)
  const [isAdding, setIsAdding] = React.useState(false)

  // CRITICAL FIX: Only run queries when user and role are available
  const productsRef = useMemoFirebase(() => {
    if (!user || !role) return null;
    return collection(db, "products");
  }, [db, user, role]);

  const customersRef = useMemoFirebase(() => {
    if (!user || !role) return null;
    return collection(db, "customers");
  }, [db, user, role]);

  const invoicesRef = useMemoFirebase(() => {
    if (!user || !role) return null;
    return collection(db, "invoices");
  }, [db, user, role]);

  const categoriesRef = useMemoFirebase(() => {
    if (!user || !role) return null;
    return collection(db, "categories");
  }, [db, user, role]);
  
  const { data: products } = useCollection(productsRef)
  const { data: customers } = useCollection(customersRef)
  const { data: categories } = useCollection(categoriesRef)
  
  const recentInvoicesQuery = useMemoFirebase(() => {
    if (!invoicesRef) return null;
    return query(invoicesRef, orderBy("createdAt", "desc"), limit(5));
  }, [invoicesRef])
  const { data: recentInvoices } = useCollection(recentInvoicesQuery)

  const lowStockItems = React.useMemo(() => {
    if (!isMounted || !products || !categories) return [];
    const excludedCategoryIds = new Set(categories.filter(c => c.excludeFromLowStock).map(c => c.id));

    let filtered = products.filter(p => {
      const isLow = Number(p.quantity) <= (Number(p.minStockQuantity) || 1);
      if (!isLow) return false;
      if (p.excludeFromLowStock) return false;
      if (excludedCategoryIds.has(p.categoryId)) return false;
      return true;
    });
    
    if (lowStockFilter && lowStockFilter !== "all") {
      const allowedCategoryIds = getCategoryAndDescendants(lowStockFilter, categories);
      filtered = filtered.filter(p => allowedCategoryIds.has(p.categoryId));
    }
    
    if (lowStockSortConfig.key) {
      filtered.sort((a, b) => {
        let valA = a[lowStockSortConfig.key];
        let valB = b[lowStockSortConfig.key];
        if (typeof valA === 'number' && typeof valB === 'number') return lowStockSortConfig.direction === 'asc' ? valA - valB : valB - valA;
        valA = String(valA || "").toLowerCase();
        valB = String(valB || "").toLowerCase();
        if (valA < valB) return lowStockSortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return lowStockSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [products, categories, lowStockFilter, lowStockSortConfig, isMounted]);

  const stats = React.useMemo(() => {
    if (!isMounted || !products || !categories) return {
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

    const excludedCategoryIds = new Set(categories.filter(c => c.excludeFromLowStock).map(c => c.id));
    const lowStockCount = products.filter(p => {
      const isLow = Number(p.quantity) <= (Number(p.minStockQuantity) || 1);
      return isLow && !p.excludeFromLowStock && !excludedCategoryIds.has(p.categoryId);
    }).length;

    const screens = products?.filter(p => {
      const name = (p.name || "").toLowerCase()
      const path = (p.categoryPath || "").toLowerCase()
      return name.includes("lcd") || name.includes("screen") || name.includes("شاشة") || name.includes("afficheur") || path.includes("شاشات")
    }) || []

    return {
      todaySales,
      productCount: products?.length || 0,
      lowStock: lowStockCount,
      totalDebt: customers?.reduce((acc, c) => acc + (c.debt || 0), 0) || 0,
      screensCount: screens.reduce((acc, p) => acc + (p.quantity || 0), 0),
      screensSaleVal: screens.reduce((acc, p) => acc + (p.salePrice * (p.quantity || 0)), 0),
      screensPurchaseVal: screens.reduce((acc, p) => acc + ((p.purchasePrice || 0) * (p.quantity || 0)), 0)
    }
  }, [recentInvoices, products, customers, categories, isMounted])

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
      await addDocumentNonBlocking(productsRef!, {
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
        isPriority: qaIsPriority,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdByUserId: user.uid,
        excludeFromLowStock: false
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

  const getFullCategoryPath = (catId: string, allCats: any[]): string => {
    const cat = allCats.find(c => c.id === catId);
    if (!cat) return "";
    if (!cat.parentId) return cat.name;
    return `${getFullCategoryPath(cat.parentId, allCats)} > ${cat.name}`;
  }

  const resetQaForm = () => {
    setQaName(""); setQaCode(""); setQaCat(""); setQaImageUrl(""); setQaQty(0); setQaPurchase(0); setQaSale(0); setQaRepair(0); setQaMinStock(1); setQaIsPriority(false);
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

  const toggleProductExclusion = (p: any) => {
    updateDocumentNonBlocking(doc(db, "products", p.id), {
      excludeFromLowStock: !p.excludeFromLowStock,
      updatedAt: serverTimestamp()
    })
    toast({ 
      title: p.excludeFromLowStock ? "تمت الإعادة" : "تم الاستبعاد", 
      description: p.excludeFromLowStock ? "تمت إعادة المنتج لرادار النواقص" : "لن يظهر هذا المنتج في قوائم النواقص بعد الآن"
    })
  }

  const toggleCategoryExclusion = (c: any) => {
    updateDocumentNonBlocking(doc(db, "categories", c.id), {
      excludeFromLowStock: !c.excludeFromLowStock,
      updatedAt: serverTimestamp()
    })
  }

  const exclusionSearchResults = React.useMemo(() => {
    if (exclusionProdSearch.length < 2) return [];
    return products?.filter(p => 
      (p.name.toLowerCase().includes(exclusionProdSearch.toLowerCase()) || 
       p.productCode.toLowerCase().includes(exclusionProdSearch.toLowerCase())) &&
      !p.excludeFromLowStock
    ).slice(0, 5) || [];
  }, [exclusionProdSearch, products]);

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
    <div className="min-h-screen bg-transparent pb-32 overflow-x-hidden">
      <QRScannerDialog open={isQRScannerOpen} onOpenChange={setIsQRScannerOpen} onScan={handleQRScan} />

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
          <div className="flex items-center gap-3">
             {isAdmin && <SyncReconnectButton />}
             <div className={cn("h-9 w-9 md:h-11 md:w-11 rounded-xl flex items-center justify-center text-white shadow border border-white/20", isAdmin ? "bg-gradient-to-br from-primary to-[#2a4580]" : "bg-gradient-to-br from-emerald-500 to-teal-700")}>
               {isAdmin ? <ShieldCheck className="h-5 w-5 md:h-6 md:w-6" /> : <UserCog className="h-5 w-5 md:h-6 md:w-6" />}
             </div>
          </div>
        </div>

        <div className="flex flex-1 w-full md:max-w-xl md:mx-8 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors" />
          <Input placeholder="ابحث سريعا عن منتج أو كود..." className="pl-12 h-11 md:h-12 w-full glass border-none rounded-2xl font-bold text-xs md:sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
             {isAdmin && <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10 flex" onClick={() => { setQuickEditSearch(""); setIsQuickEditOpen(true); }}><Edit3 className="h-4 w-4" /></Button>}
          </div>
          
          {searchTerm && (
            <div className="absolute top-full left-0 right-0 mt-3 glass-premium rounded-[1.5rem] shadow-2xl z-50 overflow-hidden border-white/20 max-h-[60vh] overflow-y-auto">
              {filteredProducts.map(p => (
                <div key={p.id} className="p-4 md:p-5 hover:bg-primary/5 border-b last:border-0 border-white/5 flex items-center justify-between group cursor-pointer" onClick={() => { setSearchTerm(""); setQuickEditSearch(p.productCode); setIsQuickEditOpen(true); }}>
                   <div className="flex items-center gap-3 md:gap-4">
                      <div className="h-12 w-12 rounded-xl bg-card border border-border flex items-center justify-center hidden sm:flex overflow-hidden shrink-0">
                        {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" loading="lazy" /> : <ImageIcon className="h-6 w-6 text-muted-foreground/30" />}
                      </div>
                      <div className="flex flex-col">
                         <div className="flex items-center gap-2">
                           <span onClick={(e) => { e.stopPropagation(); setViewFullName(p.name); }} className="font-black text-xs md:text-base text-foreground group-hover:text-primary transition-colors cursor-pointer">{p.name}</span>
                           {p.isPriority && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                         </div>
                         <span className="text-[8px] md:text-[10px] text-primary font-bold uppercase tracking-widest mt-1">{p.categoryPath || p.categoryName}</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      {isAdmin && (
                        <Button 
                          variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg transition-colors", p.excludeFromLowStock ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 hover:bg-red-50")}
                          onClick={(e) => { e.stopPropagation(); toggleProductExclusion(p); }}
                          title={p.excludeFromLowStock ? "إلغاء الاستبعاد" : "استبعاد من النواقص"}
                        >
                          {p.excludeFromLowStock ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                      )}
                      <div className="flex flex-col items-end">
                        <span className="text-sm md:text-lg font-black text-primary tabular-nums leading-tight">{Number(p.salePrice).toLocaleString()} دج</span>
                        <span className="text-[10px] text-emerald-600 font-black mt-1 bg-emerald-500/5 px-2 py-0.5 rounded-lg">متوفر: {p.quantity}</span>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          )}
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
                  <div className="absolute top-0 right-0 p-8 opacity-5"><Smartphone className="h-48 w-48 rotate-12" /></div>
                  <CardHeader className="p-6 md:p-8 relative z-10">
                     <div className="flex items-center gap-3 mb-2"><CardTitle className="text-lg md:text-xl font-black">إحصائيات الشاشات</CardTitle></div>
                  </CardHeader>
                  <CardContent className="px-6 md:px-8 pb-6 md:pb-8 relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                     <div className="glass bg-white/5 p-4 rounded-2xl"><span className="text-[8px] md:text-[9px] font-black uppercase text-emerald-400">إجمالي القطع</span><p className="text-2xl md:text-3xl font-black tabular-nums">{stats.screensCount}</p></div>
                     <div className="glass bg-white/5 p-4 rounded-2xl"><span className="text-[8px] md:text-[9px] font-black uppercase text-primary">قيمة البيع</span><p className="text-xl md:text-2xl font-black tabular-nums">{stats.screensSaleVal.toLocaleString()} دج</p></div>
                     <div className="glass bg-white/5 p-4 rounded-2xl"><span className="text-[8px] md:text-[9px] font-black uppercase text-orange-400">قيمة الشراء</span><p className="text-xl md:text-2xl font-black tabular-nums">{stats.screensPurchaseVal.toLocaleString()} دج</p></div>
                  </CardContent>
               </Card>
             )}
          </div>

          <Card className="lg:col-span-1 border-none glass rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-xl flex flex-col">
            <CardHeader className="p-6 md:p-8 border-b border-white/5 bg-primary/5"><CardTitle className="text-base md:text-lg font-black">أحدث العمليات</CardTitle></CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="divide-y divide-white/5">
                {recentInvoices?.map((inv) => (
                  <div key={inv.id} className="p-4 md:p-5 flex items-center justify-between hover:bg-white/30 transition-all duration-200">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="h-8 h-8 md:h-10 md:w-10 rounded-xl bg-card border border-white/10 flex items-center justify-center text-primary shrink-0"><ShoppingBag className="h-4 w-4 md:h-5 md:w-5" /></div>
                      <div className="flex flex-col overflow-hidden"><span className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase">#{inv.id.slice(0, 6)}</span><span className="font-black text-[10px] md:text-xs truncate max-w-[100px]">{inv.customerName}</span></div>
                    </div>
                    <div className="flex flex-col items-end shrink-0"><span className="font-black text-primary text-xs md:text-sm tabular-nums">{inv.totalAmount.toLocaleString()} دج</span></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <DialogContent dir="rtl" className="max-w-2xl w-[95%] glass border-none rounded-[2.5rem] shadow-2xl p-6 md:p-8 z-[310] max-h-[90vh] overflow-y-auto custom-scrollbar">
           <DialogHeader><DialogTitle className="text-xl md:text-2xl font-black text-gradient-premium">إضافة منتج جديد للمخزون</DialogTitle></DialogHeader>
           <div className="py-2 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div className="space-y-1.5"><Label className="font-black text-[10px] text-primary uppercase">اسم المنتج</Label><Input value={qaName} onChange={(e) => setQaName(e.target.value)} className="h-11 glass border-none rounded-xl font-bold" /></div>
                 <div className="space-y-1.5"><Label className="font-black text-[10px] text-primary uppercase">كود المنتج</Label><Input value={qaCode} onChange={(e) => setQaCode(e.target.value)} className="h-11 glass border-none rounded-xl font-mono text-xs" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div className="space-y-1.5"><Label className="font-black text-[10px] text-primary uppercase">التصنيف</Label><Select value={qaCat} onValueChange={setQaCat}><SelectTrigger className="h-11 glass border-none rounded-xl font-bold text-xs"><SelectValue placeholder="اختر التصنيف..." /></SelectTrigger><SelectContent className="glass border-none rounded-xl z-[400]">{categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                 <div className="flex flex-col justify-center gap-2 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <div className="flex items-center justify-between">
                       <Label className="font-black text-[10px] text-primary uppercase">منتج عالي الأهمية</Label>
                       <Switch checked={qaIsPriority} onCheckedChange={setQaIsPriority} />
                    </div>
                    <p className="text-[8px] font-bold text-primary/60 italic">تفعيل هذا الخيار سيجعل النظام يطلق تنبيهاً صوتياً عند اقتراب المنتج من النفاد.</p>
                 </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                 <div className="space-y-1.5"><Label className="font-black text-[9px] text-primary">الكمية</Label><Input type="number" value={qaQty} onChange={(e) => setQaQty(Number(e.target.value))} className="h-10 glass border-none rounded-xl font-black text-center" /></div>
                 <div className="space-y-1.5"><Label className="font-black text-[9px] text-emerald-600">سعر البيع</Label><Input type="number" value={qaSale} onChange={(e) => setQaSale(Number(e.target.value))} className="h-10 glass border-none rounded-xl font-black text-center text-emerald-600" /></div>
                 <div className="space-y-1.5"><Label className="font-black text-[9px] text-red-500">تنبيه عند نقص</Label><Input type="number" value={qaMinStock} onChange={(e) => setQaMinStock(Number(e.target.value))} className="h-10 glass border-none rounded-xl font-black text-center text-red-600" /></div>
              </div>
           </div>
           <DialogFooter className="mt-6"><Button onClick={handleFullAdd} disabled={isAdding} className="w-full h-12 rounded-xl bg-primary text-white font-black text-lg">تأكيد الإضافة</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isQuickEditOpen} onOpenChange={setIsQuickEditOpen}>
        <DialogContent dir="rtl" className="max-w-2xl w-[95%] glass border-none rounded-[2.5rem] shadow-2xl p-0 overflow-hidden z-[320] flex flex-col h-[85vh]">
           <DialogHeader className="p-4 md:p-6 bg-primary/5 border-b border-white/10 shrink-0">
             <DialogTitle className="text-xl font-black text-primary flex items-center justify-center gap-3">
               <Edit3 className="h-6 w-6" /> التعديل السريع للمخزون
             </DialogTitle>
           </DialogHeader>

           {/* Controls Section (Search + Toggles) */}
           <div className="p-4 md:p-6 space-y-4 bg-card/20 border-b border-white/5 shrink-0">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="ابحث عن المنتج لتعديله..." 
                  className="pl-12 h-12 md:h-14 glass border-none rounded-2xl font-bold text-sm shadow-inner" 
                  value={quickEditSearch}
                  onChange={(e) => setQuickEditSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-center gap-8">
                 <div className="flex items-center gap-3">
                   <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest cursor-pointer" htmlFor="show-repair">إظهار سعر التصليح</Label>
                   <Switch 
                     id="show-repair"
                     checked={showRepairInEdit} 
                     onCheckedChange={(v) => { setShowRepairInEdit(v); localStorage.setItem('setting_showRepairInEdit', String(v)); }} 
                   />
                 </div>
                 {isAdmin && (
                   <div className="flex items-center gap-3 border-r border-white/10 pr-8">
                     <Label className="text-[10px] font-black text-orange-600 uppercase tracking-widest cursor-pointer" htmlFor="show-purchase">إظهار سعر الشراء</Label>
                     <Switch 
                       id="show-purchase"
                       checked={showPurchaseInEdit} 
                       onCheckedChange={(v) => { setShowPurchaseInEdit(v); localStorage.setItem('setting_showPurchaseInEdit', String(v)); }} 
                     />
                   </div>
                 )}
              </div>
           </div>

           {/* Results List */}
           <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
              {quickEditProducts.length === 0 ? (
                <div className="py-20 text-center opacity-30 italic font-black">لا توجد منتجات تطابق البحث</div>
              ) : quickEditProducts.map(p => (
                <QuickEditItem key={p.id} product={p} db={db} showPurchase={showPurchaseInEdit} showRepair={showRepairInEdit} userId={user?.uid || ""} isAdmin={isAdmin} onNameClick={setViewFullName} />
              ))}
           </div>

           <div className="p-4 bg-black/5 flex justify-center shrink-0">
             <Button className="rounded-2xl px-12 h-12 font-black shadow-lg" onClick={() => setIsQuickEditOpen(false)}>إغلاق النافذة</Button>
           </div>
        </DialogContent>
      </Dialog>

      {/* Low Stock Dialog */}
      <Dialog open={isLowStockOpen} onOpenChange={setIsLowStockOpen}>
        <DialogContent dir="rtl" className="max-w-5xl w-[95%] glass border-none rounded-[2.5rem] md:rounded-[3rem] shadow-2xl p-0 overflow-hidden z-[210] h-[90vh] flex flex-col">
          <DialogHeader className="p-3 md:p-4 bg-orange-500/10 border-b border-white/10 shrink-0">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">
               <div className="flex items-center gap-3">
                  <div className="h-9 w-9 md:h-11 md:w-11 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg">
                     <AlertTriangle className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <div>
                     <DialogTitle className="text-md md:text-lg font-black text-orange-700">قائمة النواقص الاحترافية</DialogTitle>
                     <p className="text-[8px] font-bold text-orange-600/60 uppercase tracking-widest">مراقبة المخزون الحرجة</p>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setIsExclusionsOpen(true)} className="h-8 px-3 rounded-lg glass border-none font-black text-[9px] gap-1">
                     <EyeOff className="h-4 w-4 text-primary" /> إدارة المستثنيات
                  </Button>
                  <Select value={lowStockFilter} onValueChange={setLowStockFilter}>
                     <SelectTrigger className="h-8 w-32 md:w-44 glass border-none rounded-lg font-bold text-[9px]">
                        <SelectValue placeholder="تصفية حسب الصنف" />
                     </SelectTrigger>
                     <SelectContent className="glass border-none rounded-xl z-[450]">
                        <SelectItem value="all">كل الأصناف</SelectItem>
                        {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                     </SelectContent>
                  </Select>
               </div>
             </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
             <div className="table-container flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-center">
                   <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-white/10">
                      <tr className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase">
                         <th className="p-3 md:p-4 cursor-pointer text-center" onClick={() => handleLowStockSort('name')}>
                            <div className="flex items-center justify-center gap-2">المنتج <LowStockSortIcon column="name" /></div>
                         </th>
                         <th className="p-3 md:p-4 hidden md:table-cell cursor-pointer text-center" onClick={() => handleLowStockSort('categoryPath')}>
                            <div className="flex items-center justify-center gap-2">الصنف <LowStockSortIcon column="categoryPath" /></div>
                         </th>
                         <th className="p-3 md:p-4 cursor-pointer text-center" onClick={() => handleLowStockSort('quantity')}>
                            <div className="flex items-center justify-center gap-2">المتوفر <LowStockSortIcon column="quantity" /></div>
                         </th>
                         <th className="p-3 md:p-4 cursor-pointer text-center" onClick={() => handleLowStockSort('minStockQuantity')}>
                            <div className="flex items-center justify-center gap-2">الحد الأدنى <LowStockSortIcon column="minStockQuantity" /></div>
                         </th>
                         <th className="p-3 md:p-4 text-center">الإجراءات</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                      {lowStockItems.length === 0 ? (
                        <tr><td colSpan={5} className="py-20 text-center opacity-30 italic font-black">لا توجد نواقص في هذا النطاق</td></tr>
                      ) : lowStockItems.map(p => (
                        <tr key={p.id} className="group hover:bg-white/40 transition-colors">
                           <td className="p-3 md:p-4">
                              <div className="flex items-center justify-center gap-3">
                                 <div className="h-9 w-9 rounded-lg bg-card border border-border flex items-center justify-center shrink-0 overflow-hidden">
                                    {p.imageUrl ? <img src={p.imageUrl} className="h-full w-full object-cover" /> : <Package className="h-4 w-4 opacity-10" />}
                                 </div>
                                 <div className="flex flex-col text-right">
                                    <span onClick={() => setViewFullName(p.name)} className="font-black text-xs cursor-pointer hover:text-primary transition-colors">{p.name}</span>
                                    <span className="text-[9px] font-bold text-muted-foreground">#{p.productCode}</span>
                                 </div>
                              </div>
                           </td>
                           <td className="p-3 md:p-4 hidden md:table-cell text-[10px] font-bold text-primary">{p.categoryPath || p.categoryName}</td>
                           <td className="p-3 md:p-4"><Badge variant="destructive" className="h-6 rounded-lg font-black tabular-nums">{p.quantity}</Badge></td>
                           <td className="p-3 md:p-4 text-[10px] font-black tabular-nums opacity-60">{p.minStockQuantity || 1}</td>
                           <td className="p-3 md:p-4">
                              <div className="flex items-center justify-center gap-2">
                                <Button 
                                  variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white"
                                  onClick={() => toggleProductExclusion(p)}
                                  title="استبعاد من النواقص"
                                >
                                   <EyeOff className="h-4 w-4" />
                                </Button>
                              </div>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
          <div className="p-3 md:p-4 bg-black/5 text-center shrink-0">
             <Button className="rounded-xl px-12 h-10 font-black shadow-lg" onClick={() => setIsLowStockOpen(false)}>العودة للرئيسية</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exclusions Dialog */}
      <Dialog open={isExclusionsOpen} onOpenChange={setIsExclusionsOpen}>
         <DialogContent dir="rtl" className="max-w-4xl w-[95%] glass border-none rounded-[2.5rem] md:rounded-[3rem] shadow-2xl p-0 overflow-hidden z-[220] h-[85vh] flex flex-col">
            <DialogHeader className="p-3 md:p-4 bg-primary/10 border-b border-white/10 shrink-0">
               <div className="flex items-center gap-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-primary flex items-center justify-center text-white">
                     <Settings2 className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <div>
                     <DialogTitle className="text-md md:text-lg font-black text-primary">مركز إدارة المستثنيات الذكي</DialogTitle>
                     <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">تخصيص رادار النواقص والإحصائيات</p>
                  </div>
               </div>
            </DialogHeader>

            <Tabs defaultValue="products" className="flex-1 flex flex-col overflow-visible">
               <TabsList className="mx-4 mt-2 h-9 rounded-xl bg-black/5 p-1 gap-1 shrink-0">
                  <TabsTrigger value="products" className="flex-1 rounded-lg font-black text-[9px] gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"><Package className="h-3.5 w-3.5" /> المنتجات المستبعدة</TabsTrigger>
                  <TabsTrigger value="categories" className="flex-1 rounded-lg font-black text-[9px] gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"><Layers className="h-3.5 w-3.5" /> الأصناف المستبعدة</TabsTrigger>
               </TabsList>

               <TabsContent value="products" className="flex-1 overflow-visible flex flex-col p-4 md:p-6 space-y-3 md:space-y-4">
                  <div className="space-y-2 shrink-0 relative z-[100]">
                     <p className="text-[9px] font-black text-primary uppercase px-2">إضافة منتج جديد للاستبعاد</p>
                     <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                           placeholder="ابحث عن المنتج بالاسم أو الباركود..." 
                           className="pl-10 h-10 glass border-none rounded-xl font-bold text-xs"
                           value={exclusionProdSearch}
                           onChange={(e) => setExclusionProductSearch(e.target.value)}
                        />
                        {exclusionSearchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-2 glass-premium rounded-2xl shadow-2xl z-[110] border border-white/20 overflow-hidden divide-y divide-white/5 animate-in slide-in-from-top-2">
                             {exclusionSearchResults.map(p => (
                               <div key={p.id} className="p-3 md:p-4 hover:bg-primary/5 flex items-center justify-between group/item transition-colors">
                                  <div className="flex flex-col">
                                     <span onClick={() => setViewFullName(p.name)} className="font-black text-xs cursor-pointer hover:text-primary transition-colors">{p.name}</span>
                                     <span className="text-[8px] font-bold opacity-40">#{p.productCode}</span>
                                  </div>
                                  <Button size="sm" onClick={() => { toggleProductExclusion(p); setExclusionProductSearch(""); }} className="h-8 px-4 rounded-lg bg-primary text-white font-black text-[9px]">إدراج في المستثنيات</Button>
                               </div>
                             ))}
                          </div>
                        )}
                     </div>
                  </div>

                  <Separator className="bg-white/10" />

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                     <p className="text-[9px] font-black text-muted-foreground uppercase px-2 mb-1">قائمة المستثنيات الحالية</p>
                     {products?.filter(p => p.excludeFromLowStock).length === 0 ? (
                       <div className="py-14 text-center opacity-30 italic font-black text-[10px]">لا يوجد منتجات مستبعدة حالياً</div>
                     ) : products?.filter(p => p.excludeFromLowStock).map(p => (
                       <div key={p.id} className="p-2 md:p-3 rounded-xl glass border-white/5 flex items-center justify-between group hover:bg-white/40 transition-all">
                          <div className="flex items-center gap-3 overflow-hidden">
                             <div className="h-8 w-8 rounded-lg bg-card flex items-center justify-center shrink-0">
                                <Package className="h-3.5 w-3.5 opacity-20" />
                             </div>
                             <div className="flex flex-col overflow-hidden text-right">
                                <span onClick={() => setViewFullName(p.name)} className="font-bold text-[11px] truncate cursor-pointer hover:text-primary transition-colors">{p.name}</span>
                                <span className="text-[8px] font-black opacity-40 truncate">{p.categoryPath}</span>
                             </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500 hover:bg-emerald-500/10 shrink-0" onClick={() => toggleProductExclusion(p)}>
                             <Eye className="h-4 w-4" />
                          </Button>
                       </div>
                     ))}
                  </div>
               </TabsContent>

               <TabsContent value="categories" className="flex-1 overflow-visible flex flex-col p-4 md:p-6 space-y-4">
                  <div className="space-y-3 shrink-0">
                     <p className="text-[9px] font-black text-primary uppercase px-2">استبعاد صنف كامل من الإحصائيات</p>
                     <Select onValueChange={(val) => { const c = categories?.find(x => x.id === val); if(c) toggleCategoryExclusion(c); }}>
                        <SelectTrigger className="h-10 glass border-none rounded-xl font-bold text-xs">
                           <SelectValue placeholder="اختر الصنف المراد استبعاده..." />
                        </SelectTrigger>
                        <SelectContent className="glass border-none rounded-xl z-[450]">
                           {categories?.filter(c => !c.excludeFromLowStock).map(c => (
                             <SelectItem key={c.id} value={c.id} className="font-bold text-xs">{c.name}</SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>

                  <Separator className="bg-white/10" />

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                     <p className="text-[9px] font-black text-muted-foreground uppercase px-2 mb-1">الأصناف المستبعدة حالياً</p>
                     {categories?.filter(c => c.excludeFromLowStock).length === 0 ? (
                        <div className="py-14 text-center opacity-30 italic font-black text-[10px]">لا توجد أصناف مستبعدة حالياً</div>
                     ) : categories?.filter(c => c.excludeFromLowStock).map(c => (
                        <div key={c.id} className="p-3 rounded-xl glass border-white/5 flex items-center justify-between group hover:bg-white/40 transition-all">
                           <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                 <Layers className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col text-right">
                                 <span className="font-black text-sm">{c.name}</span>
                                 <span className="text-[8px] font-bold text-red-500 uppercase">مستبعد نهائياً</span>
                              </div>
                           </div>
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10" onClick={() => toggleCategoryExclusion(c)}>
                              <Eye className="h-4 w-4" />
                           </Button>
                        </div>
                     ))}
                  </div>
               </TabsContent>
            </Tabs>
            
            <div className="p-3 md:p-4 bg-black/5 text-center shrink-0">
               <Button variant="outline" className="rounded-xl px-12 h-10 font-black shadow-lg" onClick={() => setIsExclusionsOpen(false)}>إغلاق النافذة</Button>
            </div>
         </DialogContent>
      </Dialog>

      {/* Name Preview Dialog */}
      <Dialog open={!!viewFullName} onOpenChange={() => setViewFullName(null)}>
         <DialogContent dir="rtl" className="glass border-none rounded-3xl shadow-2xl p-6 z-[600] max-w-sm">
            <DialogHeader className="pb-2 border-b border-white/10">
               <DialogTitle className="text-[10px] font-black text-primary uppercase tracking-widest">الاسم الكامل للمنتج</DialogTitle>
            </DialogHeader>
            <div className="py-8">
               <p className="text-xl font-black text-foreground leading-relaxed text-center">{viewFullName}</p>
            </div>
            <DialogFooter>
               <Button onClick={() => setViewFullName(null)} className="w-full h-12 rounded-xl bg-primary font-black shadow-xl">إغلاق المعاينة</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  )
}
