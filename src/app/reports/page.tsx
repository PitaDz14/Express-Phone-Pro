
"use client"

import * as React from "react"
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Printer,
  Loader2,
  Package,
  Wallet,
  Target,
  AlertTriangle,
  Layers,
  Smartphone,
  Sparkles,
  Zap,
  ShoppingBag,
  BarChartHorizontal,
  Clock,
  History,
  ChevronDown,
  Filter,
  Search,
  ArrowRightLeft,
  Lightbulb,
  Check
} from "lucide-react"
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell,
  Line,
  LineChart,
  CartesianGrid,
  Area,
  AreaChart,
  Legend
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
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
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { format, subDays, startOfDay, endOfDay, isWithinInterval, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"

export default function ReportsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { role } = useUser()
  const router = useRouter()
  const isAdmin = role === "Admin"

  const [timePreset, setTimePreset] = React.useState("monthly")
  const [startDate, setStartDate] = React.useState(format(subDays(new Date(), 30), "yyyy-MM-dd"))
  const [endDate, setEndDate] = React.useState(format(new Date(), "yyyy-MM-dd"))
  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<string[]>([])
  const [isDataProcessing, setIsDataDataProcessing] = React.useState(false)

  const [processedInvoices, setProcessedInvoices] = React.useState<any[]>([])
  const [bestSellers, setBestSellers] = React.useState<any[]>([])
  const [stagnantProducts, setStagnantProducts] = React.useState<any[]>([])
  const [insights, setInsights] = React.useState<any[]>([])
  const [totals, setTotals] = React.useState({ revenue: 0, profit: 0 });

  const invoicesRef = useMemoFirebase(() => collection(db, "invoices"), [db])
  const productsRef = useMemoFirebase(() => collection(db, "products"), [db])
  const categoriesRef = useMemoFirebase(() => collection(db, "categories"), [db])
  
  const { data: allInvoices } = useCollection(invoicesRef)
  const { data: allProducts } = useCollection(productsRef)
  const { data: categories } = useCollection(categoriesRef)

  const [isMounted, setIsMounted] = React.useState(false)
  React.useEffect(() => { setIsMounted(true) }, [])

  React.useEffect(() => {
    if (isMounted && !isAdmin && role !== null) {
      router.push("/")
    }
  }, [isAdmin, role, router, isMounted])

  React.useEffect(() => {
    if (!allInvoices || !allProducts || !isMounted) return;

    const runAnalysis = async () => {
      setIsDataDataProcessing(true);
      
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));

      const productSalesMap: Record<string, any> = {};
      let totalRev = 0;
      let totalProf = 0;

      // 1. Filter Invoices by Date
      const filteredInvoices = allInvoices.filter(inv => {
        const date = inv.createdAt?.toDate ? inv.createdAt.toDate() : (inv.createdAt instanceof Date ? inv.createdAt : null);
        return date && isWithinInterval(date, { start, end });
      });

      // 2. Parallel Processing of Items (Fixed Speed & Accuracy)
      const batchSize = 10;
      for (let i = 0; i < filteredInvoices.length; i += batchSize) {
        const batch = filteredInvoices.slice(i, i + batchSize);
        const itemSnaps = await Promise.all(
          batch.map(inv => getDocs(collection(db, "invoices", inv.id, "items")))
        );

        itemSnaps.forEach((itemsSnap, snapIdx) => {
          itemsSnap.docs.forEach(d => {
            const item = d.data();
            const product = allProducts.find(p => p.id === item.productId);
            
            // Apply Category Filter
            if (selectedCategoryIds.length > 0 && product && !selectedCategoryIds.includes(product.categoryId)) {
              return;
            }

            const itemValue = item.itemTotal || (item.quantity * item.unitPrice) || 0;

            if (!productSalesMap[item.productId]) {
              productSalesMap[item.productId] = {
                id: item.productId,
                name: item.productName,
                categoryPath: item.categoryPath || "عام",
                categoryId: product?.categoryId || "unknown",
                quantitySold: 0,
                revenue: 0,
                purchaseCost: 0
              };
            }
            productSalesMap[item.productId].quantitySold += item.quantity;
            productSalesMap[item.productId].revenue += itemValue;
            
            const cost = (product?.purchasePrice || 0) * item.quantity;
            productSalesMap[item.productId].purchaseCost += cost;
            
            totalRev += itemValue;
            totalProf += (itemValue - cost);
          });
        });
      }

      setTotals({ revenue: totalRev, profit: totalProf });

      const sortedSellers = Object.values(productSalesMap).sort((a: any, b: any) => b.quantitySold - a.quantitySold);
      setBestSellers(sortedSellers);

      const soldIds = new Set(Object.keys(productSalesMap));
      let stagnant = allProducts.filter(p => !soldIds.has(p.id));
      if (selectedCategoryIds.length > 0) {
        stagnant = stagnant.filter(p => selectedCategoryIds.includes(p.categoryId));
      }
      setStagnantProducts(stagnant.slice(0, 10));

      const newInsights = [];
      const hoursMap: Record<number, number> = {};
      filteredInvoices.forEach(inv => {
        const date = inv.createdAt?.toDate ? inv.createdAt.toDate() : (inv.createdAt instanceof Date ? inv.createdAt : null);
        if (date) {
          const hour = date.getHours();
          hoursMap[hour] = (hoursMap[hour] || 0) + 1;
        }
      });
      const peakHour = Object.entries(hoursMap).sort((a, b) => b[1] - a[1])[0];
      
      if (peakHour) {
        newInsights.push({
          type: "peak",
          title: "أوقات ذروة المبيعات",
          text: `ساعة الذروة هي حوالي الساعة ${peakHour[0]}:00. ننصح بتجهيز الطاقم في هذا الوقت.`,
          icon: Clock,
          color: "text-blue-500 bg-blue-500/10"
        });
      }

      if (sortedSellers[0]) {
        newInsights.push({
          type: "demand",
          title: "منتج مطلوب بشدة",
          text: `المنتج "${sortedSellers[0].name}" هو الأكثر طلباً بـ ${sortedSellers[0].quantitySold} قطعة.`,
          icon: ShoppingBag,
          color: "text-emerald-500 bg-emerald-500/10"
        });
      }

      if (stagnant.length > 0) {
        newInsights.push({
          type: "stagnant",
          title: "نصيحة للمخزون",
          text: `لديك ${stagnant.length} منتجات راكدة. ننصح بعمل تخفيضات لتنشيط حركتها.`,
          icon: Lightbulb,
          color: "text-orange-500 bg-orange-500/10"
        });
      }

      setInsights(newInsights);
      setProcessedInvoices(filteredInvoices);
      setIsDataDataProcessing(false);
    };

    runAnalysis();
  }, [allInvoices, allProducts, startDate, endDate, selectedCategoryIds, isMounted, db]);

  const handleTimePresetChange = (val: string) => {
    setTimePreset(val);
    const today = new Date();
    let start = subDays(today, 30);
    if (val === "weekly") start = subDays(today, 7);
    else if (val === "monthly") start = subDays(today, 30);
    else if (val === "six_months") start = subMonths(today, 6);
    else if (val === "yearly") start = subMonths(today, 12);
    else return;
    setStartDate(format(start, "yyyy-MM-dd"));
    setEndDate(format(today, "yyyy-MM-dd"));
  };

  const handleCategoryToggle = (id: string) => {
    setSelectedCategoryIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePrint = () => window.print();

  if (!isAdmin) return <div className="p-20 text-center font-black">جاري التحقق من الصلاحيات...</div>

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-32">
        <header className="flex flex-col md:flex-row md:h-20 shrink-0 items-center justify-between border-b px-4 md:px-8 glass sticky top-0 z-50 no-print rounded-[2rem] gap-4">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg transform -rotate-3">
                <Smartphone className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-sm md:text-lg tracking-tighter text-primary">EXPRESS</span>
                <span className="text-[7px] md:text-[8px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Analytics Pro</span>
              </div>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div className="flex flex-col hidden sm:flex">
              <h1 className="text-lg md:text-xl font-black text-gradient-premium">مركز الذكاء المالي</h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Khaled_Deragha © 2026</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" className="flex-1 md:flex-none glass h-11 rounded-2xl px-5 font-bold gap-2 border-white/20">
              <Download className="h-4 w-4" /> تصدير
            </Button>
            <Button className="flex-1 md:flex-none h-11 rounded-2xl px-5 bg-primary text-white shadow-lg font-black gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> طباعة
            </Button>
          </div>
        </header>

        <section className="glass p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border-white/10 shadow-xl space-y-6">
           <div className="flex flex-col xl:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                 <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                    <Filter className="h-5 w-5 text-primary" /> تحديد معايير التحليل
                 </h2>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase">تحليل زمني وحسب الأصناف المتوفرة</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                 <Popover>
                    <PopoverTrigger asChild>
                       <Button variant="outline" className="h-12 glass border-none rounded-2xl px-6 font-black text-xs gap-2 relative">
                          <Layers className="h-4 w-4 text-primary" />
                          <span>تصفية حسب الأصناف</span>
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
                             <p className="font-black text-xs text-primary uppercase">الأصناف المتوفرة</p>
                             <button onClick={() => setSelectedCategoryIds([])} className="text-[10px] font-black text-muted-foreground hover:text-primary">مسح الكل</button>
                          </div>
                          <Separator className="bg-white/10" />
                          <div className="max-h-[300px] overflow-y-auto space-y-3 custom-scrollbar pr-1">
                             <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setSelectedCategoryIds([])}>
                                <Checkbox checked={selectedCategoryIds.length === 0} className="rounded-md" />
                                <Label className="text-sm font-bold cursor-pointer group-hover:text-primary transition-colors">عرض الكل (شامل)</Label>
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

                 <div className="h-8 w-px bg-border hidden md:block" />

                 <Select value={timePreset} onValueChange={handleTimePresetChange}>
                    <SelectTrigger className="w-full md:w-48 h-12 glass border-none rounded-2xl font-black text-xs">
                       <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /><SelectValue placeholder="الفترة الزمنية" /></div>
                    </SelectTrigger>
                    <SelectContent className="glass border-none rounded-2xl z-[250]">
                       <SelectItem value="weekly">أسبوعي (آخر 7 أيام)</SelectItem>
                       <SelectItem value="monthly">شهري (آخر 30 يوماً)</SelectItem>
                       <SelectItem value="six_months">نصف سنوي (6 أشهر)</SelectItem>
                       <SelectItem value="yearly">سنوي (12 شهراً)</SelectItem>
                       <SelectItem value="custom">فترة يدوية مخصصة</SelectItem>
                    </SelectContent>
                 </Select>
                 
                 <div className="flex items-center gap-2 bg-black/5 p-1.5 rounded-2xl">
                    <div className="space-y-1 px-2">
                       <Label className="text-[8px] font-black uppercase opacity-50">من</Label>
                       <Input type="date" className="h-8 border-none bg-transparent font-black text-xs p-0 focus-visible:ring-0" value={startDate} onChange={(e) => { setStartDate(e.target.value); setTimePreset("custom"); }} />
                    </div>
                    <ArrowRightLeft className="h-3 w-3 opacity-20" />
                    <div className="space-y-1 px-2">
                       <Label className="text-[8px] font-black uppercase opacity-50">إلى</Label>
                       <Input type="date" className="h-8 border-none bg-transparent font-black text-xs p-0 focus-visible:ring-0" value={endDate} onChange={(e) => { setEndDate(e.target.value); setTimePreset("custom"); }} />
                    </div>
                 </div>
              </div>
           </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="border-none glass-premium rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-all">
             <div className="absolute top-0 right-0 p-4 opacity-5"><Wallet className="h-20 w-20" /></div>
             <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">إيرادات الفلتر</CardTitle></CardHeader>
             <CardContent>
                <p className="text-2xl md:text-3xl font-black tabular-nums text-primary">{totals.revenue.toLocaleString()} دج</p>
                <Badge variant="success" className="mt-2 rounded-lg font-black text-[9px]">مبيعات محققة</Badge>
             </CardContent>
          </Card>

          <Card className="border-none glass-premium rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-all">
             <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp className="h-20 w-20" /></div>
             <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">أرباح الفلتر</CardTitle></CardHeader>
             <CardContent>
                <p className="text-2xl md:text-3xl font-black tabular-nums text-emerald-600">{totals.profit.toLocaleString()} دج</p>
                <p className="text-[9px] font-bold text-muted-foreground mt-2 italic">الربح = المبيعات - الشراء</p>
             </CardContent>
          </Card>

          <Card className="border-none glass-premium rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-all">
             <div className="absolute top-0 right-0 p-4 opacity-5"><ShoppingBag className="h-20 w-20" /></div>
             <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">تنوع المنتجات</CardTitle></CardHeader>
             <CardContent>
                <p className="text-2xl md:text-3xl font-black tabular-nums">{bestSellers.length}</p>
                <p className="text-[9px] font-bold text-muted-foreground mt-2">منتج فريد تم بيعه</p>
             </CardContent>
          </Card>

          <Card className="border-none bg-gradient-to-br from-primary to-accent text-white rounded-[2rem] shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10"><Zap className="h-20 w-20" /></div>
             <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black opacity-60 uppercase tracking-widest">تحليل النطاق</CardTitle></CardHeader>
             <CardContent>
                <p className="text-xl md:text-2xl font-black">
                   {selectedCategoryIds.length === 0 ? "كامل المخزون" : `${selectedCategoryIds.length} أصناف`}
                </p>
                <p className="text-[9px] font-bold opacity-80 mt-2 uppercase tracking-widest">نطاق التحليل الحالي</p>
             </CardContent>
          </Card>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
           <div className="lg:col-span-2 space-y-6 md:space-y-8">
              <Card className="border-none glass rounded-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-xl">
                 <CardHeader className="p-8 border-b border-white/5 bg-primary/5">
                    <div className="flex items-center justify-between">
                       <div>
                          <CardTitle className="text-xl font-black flex items-center gap-3">
                             <Target className="h-6 w-6 text-primary" /> الأكثر مبيعاً حسب الفلتر
                          </CardTitle>
                          <CardDescription className="text-[10px] font-bold mt-1">تحديد المنتجات القائدة لكل صنف</CardDescription>
                       </div>
                    </div>
                 </CardHeader>
                 <CardContent className="p-0">
                    <div className="table-container">
                       <table className="w-full text-right">
                          <thead className="bg-black/5 text-[10px] font-black text-muted-foreground">
                             <tr>
                                <th className="p-6">المنتج</th>
                                <th className="p-6 text-center">الكمية</th>
                                <th className="p-6 text-left">الإيراد</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                             {isDataProcessing ? (
                               <tr><td colSpan={3} className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary opacity-20" /></td></tr>
                             ) : bestSellers.length === 0 ? (
                               <tr><td colSpan={3} className="py-20 text-center opacity-30 italic font-black">لا توجد مبيعات تطابق هذه الأصناف</td></tr>
                             ) : bestSellers.map((item, i) => (
                               <tr key={item.id} className="group hover:bg-white/40 transition-colors">
                                  <td className="p-6">
                                     <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-2xl bg-card border border-border flex items-center justify-center font-black text-primary shadow-sm">{i + 1}</div>
                                        <div className="flex flex-col">
                                           <span className="font-black text-xs md:text-sm">{item.name}</span>
                                           <span className="text-[9px] text-muted-foreground font-bold">{item.categoryPath}</span>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="p-6 text-center">
                                     <Badge variant="outline" className="h-8 px-4 rounded-xl border-primary/20 bg-primary/5 text-primary font-black tabular-nums text-xs">
                                        {item.quantitySold} قطعة
                                     </Badge>
                                  </td>
                                  <td className="p-6 text-left">
                                     <span className="font-black text-sm md:text-lg tabular-nums text-foreground">{item.revenue.toLocaleString()} دج</span>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </CardContent>
              </Card>

              <Card className="border-none glass rounded-[2.5rem] md:rounded-[3rem] p-8 shadow-xl">
                 <CardHeader className="p-0 mb-8">
                    <CardTitle className="text-xl font-black">مقارنة الإيرادات والتكاليف</CardTitle>
                    <CardDescription className="text-xs font-bold">تحليل بصري للهوامش الربحية للأصناف والمنتجات المختارة</CardDescription>
                 </CardHeader>
                 <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={bestSellers.slice(0, 10)}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3960AC" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#3960AC" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" hide />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: 'hsl(var(--muted-foreground))'}} />
                          <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', direction: 'rtl' }} />
                          <Area type="monotone" dataKey="revenue" name="الإيراد" stroke="#3960AC" strokeWidth={4} fill="url(#colorRev)" />
                          <Area type="monotone" dataKey="purchaseCost" name="التكاليف" stroke="#f43f5e" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </Card>
           </div>

           <div className="space-y-6 md:space-y-8">
              <Card className="border-none glass-premium rounded-[2.5rem] shadow-2xl relative overflow-hidden bg-gradient-to-br from-primary/5 to-accent/5">
                 <div className="absolute -top-10 -left-10 opacity-5"><Lightbulb className="h-40 w-40 rotate-12 text-primary" /></div>
                 <CardHeader className="p-8 relative z-10">
                    <CardTitle className="text-xl font-black flex items-center gap-3">
                       <Sparkles className="h-6 w-6 text-primary" /> الذكاء التحليلي
                    </CardTitle>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1">نصائح مخصصة بناءً على الفلتر الحالي</p>
                 </CardHeader>
                 <CardContent className="p-8 pt-0 space-y-4 relative z-10">
                    {isDataProcessing ? (
                       <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary opacity-30" /></div>
                    ) : insights.length === 0 ? (
                      <p className="text-center py-6 text-xs font-bold opacity-30 italic">لا توجد نصائح كافية لهذا النطاق</p>
                    ) : insights.map((insight, idx) => (
                      <div key={idx} className="p-4 md:p-6 rounded-[1.8rem] glass-premium border-white/20 flex gap-4 group hover:bg-white/60 transition-all">
                         <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", insight.color)}>
                            <insight.icon className="h-6 w-6" />
                         </div>
                         <div className="flex flex-col">
                            <h4 className="font-black text-xs md:text-sm text-foreground">{insight.title}</h4>
                            <p className="text-[10px] md:text-xs text-muted-foreground font-bold mt-1 leading-relaxed">{insight.text}</p>
                         </div>
                      </div>
                    ))}
                 </CardContent>
              </Card>

              <Card className="border-none glass rounded-[2.5rem] shadow-xl overflow-hidden">
                 <CardHeader className="p-8 border-b border-white/5 bg-orange-500/5">
                    <CardTitle className="text-lg font-black flex items-center gap-2 text-orange-700">
                       <AlertTriangle className="h-5 w-5" /> منتجات راكدة (بالأصناف المختارة)
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-6 space-y-3">
                    {isDataProcessing ? (
                       <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-orange-500 opacity-30" /></div>
                    ) : stagnantProducts.length === 0 ? (
                      <p className="text-center py-6 text-[10px] font-black opacity-30 italic">كافة المنتجات تتحرك بشكل جيد في هذا النطاق</p>
                    ) : stagnantProducts.map(p => (
                      <div key={p.id} className="p-3 rounded-2xl glass border-white/5 flex items-center justify-between group hover:bg-white/40 transition-all">
                         <div className="flex items-center gap-3 overflow-hidden">
                            <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
                               {p.imageUrl ? <img src={p.imageUrl} className="h-full w-full object-cover rounded-xl" /> : <Package className="h-5 w-5 opacity-10" />}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                               <span className="font-bold text-xs truncate">{p.name}</span>
                               <span className="text-[8px] font-black opacity-50">مخزون: {p.quantity}</span>
                            </div>
                         </div>
                         <Badge variant="destructive" className="h-6 rounded-lg text-[8px] font-black shrink-0">0 مبيعات</Badge>
                      </div>
                    ))}
                 </CardContent>
              </Card>
           </div>
        </div>

        <footer className="text-center py-10 opacity-40 no-print">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground">Express Phone Pro Intelligent Hub • Khaled_Deragha</p>
        </footer>
    </div>
  )
}
