
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
  Lightbulb
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

  // Filter States
  const [timePreset, setTimePreset] = React.useState("monthly") // weekly, monthly, six_months, yearly, custom
  const [startDate, setStartDate] = React.useState(format(subDays(new Date(), 30), "yyyy-MM-dd"))
  const [endDate, setEndDate] = React.useState(format(new Date(), "yyyy-MM-dd"))
  const [isDataProcessing, setIsDataDataProcessing] = React.useState(false)

  // Data Aggregates
  const [processedInvoices, setProcessedInvoices] = React.useState<any[]>([])
  const [soldItems, setSoldItems] = React.useState<any[]>([])
  const [bestSellers, setBestSellers] = React.useState<any[]>([])
  const [stagnantProducts, setStagnantProducts] = React.useState<any[]>([])
  const [insights, setInsights] = React.useState<any[]>([])

  const invoicesRef = useMemoFirebase(() => collection(db, "invoices"), [db])
  const productsRef = useMemoFirebase(() => collection(db, "products"), [db])
  const categoriesRef = useMemoFirebase(() => collection(db, "categories"), [db])
  
  const { data: allInvoices, isLoading: isInvoicesLoading } = useCollection(invoicesRef)
  const { data: allProducts } = useCollection(productsRef)
  const { data: categories } = useCollection(categoriesRef)

  // Hydration safety
  const [isMounted, setIsMounted] = React.useState(false)
  React.useEffect(() => { setIsMounted(true) }, [])

  // Security Redirect for Workers
  React.useEffect(() => {
    if (isMounted && !isAdmin && role !== null) {
      router.push("/")
    }
  }, [isAdmin, role, router, isMounted])

  // Data Processing Logic
  React.useEffect(() => {
    if (!allInvoices || !allProducts || !isMounted) return;

    const runAnalysis = async () => {
      setIsDataDataProcessing(true);
      
      // 1. Filter Invoices by Date
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));

      const filteredInvoices = allInvoices.filter(inv => {
        const date = inv.createdAt?.toDate ? inv.createdAt.toDate() : (inv.createdAt instanceof Date ? inv.createdAt : null);
        return date && isWithinInterval(date, { start, end });
      });

      setProcessedInvoices(filteredInvoices);

      // 2. Fetch all sold items for these invoices
      // Note: In a production app, we would query the items subcollection directly.
      // For this prototype, we'll fetch them iteratively (batch optimization is recommended for huge data).
      const allSoldItems: any[] = [];
      const productSalesMap: Record<string, any> = {};

      for (const inv of filteredInvoices) {
        const itemsSnap = await getDocs(collection(db, "invoices", inv.id, "items"));
        itemsSnap.docs.forEach(d => {
          const item = d.data();
          allSoldItems.push(item);

          if (!productSalesMap[item.productId]) {
            productSalesMap[item.productId] = {
              id: item.productId,
              name: item.productName,
              categoryPath: item.categoryPath || "عام",
              quantitySold: 0,
              revenue: 0,
              purchaseCost: 0
            };
          }
          productSalesMap[item.productId].quantitySold += item.quantity;
          productSalesMap[item.productId].revenue += item.itemTotal;
          // Estimate cost based on CURRENT purchase price if not in invoice (historical limitation)
          const currentProd = allProducts.find(p => p.id === item.productId);
          productSalesMap[item.productId].purchaseCost += (currentProd?.purchasePrice || 0) * item.quantity;
        });
      }

      setSoldItems(allSoldItems);

      // 3. Best Sellers Sorting
      const sortedSellers = Object.values(productSalesMap).sort((a: any, b: any) => b.quantitySold - a.quantitySold);
      setBestSellers(sortedSellers);

      // 4. Stagnant Products
      const soldIds = new Set(Object.keys(productSalesMap));
      const stagnant = allProducts.filter(p => !soldIds.has(p.id)).slice(0, 10);
      setStagnantProducts(stagnant);

      // 5. Generate Smart Insights
      const newInsights = [];

      // Peak Hours Logic
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
          text: `ساعة الذروة هي حوالي الساعة ${peakHour[0]}:00. ننصح بتجهيز الطاقم أو إطلاق العروض في هذا الوقت.`,
          icon: Clock,
          color: "text-blue-500 bg-blue-500/10"
        });
      }

      // Demand alert
      if (sortedSellers[0]) {
        newInsights.push({
          type: "demand",
          title: "منتج مطلوب بشدة",
          text: `المنتج "${sortedSellers[0].name}" هو الأكثر طلباً حالياً بـ ${sortedSellers[0].quantitySold} قطعة. تأكد من توفر المخزون دائماً.`,
          icon: ShoppingBag,
          color: "text-emerald-500 bg-emerald-500/10"
        });
      }

      // Inventory warning
      if (stagnant.length > 0) {
        newInsights.push({
          type: "stagnant",
          title: "سلع راكدة",
          text: `لديك ${stagnant.length} منتجات لم تُبع خلال الفترة المحددة. ننصح بعمل تخفيضات لتصفية هذا المخزون.`,
          icon: AlertTriangle,
          color: "text-orange-500 bg-orange-500/10"
        });
      }

      setInsights(newInsights);
      setIsDataDataProcessing(false);
    };

    runAnalysis();
  }, [allInvoices, allProducts, startDate, endDate, isMounted, db]);

  const handleTimePresetChange = (val: string) => {
    setTimePreset(val);
    const today = new Date();
    let start = subDays(today, 30);

    if (val === "weekly") start = subDays(today, 7);
    else if (val === "monthly") start = subDays(today, 30);
    else if (val === "six_months") start = subMonths(today, 6);
    else if (val === "yearly") start = subMonths(today, 12);
    else return; // custom logic handled via inputs

    setStartDate(format(start, "yyyy-MM-dd"));
    setEndDate(format(today, "yyyy-MM-dd"));
  };

  if (!isAdmin) {
    return <div className="p-20 text-center font-black">جاري التحقق من الصلاحيات...</div>
  }

  const totalRevenue = processedInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const totalProfit = bestSellers.reduce((sum, item) => sum + (item.revenue - item.purchaseCost), 0);

  const handlePrint = () => window.print();

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
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">بواسطة المطور Khaled_Deragha</p>
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

        {/* Smart Filters Section */}
        <section className="glass p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border-white/10 shadow-xl space-y-6">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                 <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                    <Filter className="h-5 w-5 text-primary" /> تحديد فترة التحليل
                 </h2>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase">اختر فترة زمنية جاهزة أو حدد نطاقاً يدوياً</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                 <Select value={timePreset} onValueChange={handleTimePresetChange}>
                    <SelectTrigger className="w-full md:w-48 h-12 glass border-none rounded-2xl font-black text-xs">
                       <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><SelectValue placeholder="الفترة الزمنية" /></div>
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
                       <Label className="text-[8px] font-black uppercase opacity-50">من تاريخ</Label>
                       <Input 
                        type="date" 
                        className="h-8 border-none bg-transparent font-black text-xs p-0 focus-visible:ring-0" 
                        value={startDate} 
                        onChange={(e) => { setStartDate(e.target.value); setTimePreset("custom"); }}
                       />
                    </div>
                    <ArrowRightLeft className="h-3 w-3 opacity-20" />
                    <div className="space-y-1 px-2">
                       <Label className="text-[8px] font-black uppercase opacity-50">إلى تاريخ</Label>
                       <Input 
                        type="date" 
                        className="h-8 border-none bg-transparent font-black text-xs p-0 focus-visible:ring-0" 
                        value={endDate} 
                        onChange={(e) => { setEndDate(e.target.value); setTimePreset("custom"); }}
                       />
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* Main Stats Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="border-none glass-premium rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden group hover:scale-[1.02] transition-all">
             <div className="absolute top-0 right-0 p-4 opacity-5"><Wallet className="h-20 w-20" /></div>
             <CardHeader className="pb-2"><CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest">إجمالي الإيرادات</CardTitle></CardHeader>
             <CardContent>
                <p className="text-2xl md:text-3xl font-black tabular-nums text-primary">{(totalRevenue || 0).toLocaleString()} دج</p>
                <Badge variant="success" className="mt-2 rounded-lg font-black text-[9px]">الفترة المحددة</Badge>
             </CardContent>
          </Card>

          <Card className="border-none glass-premium rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden group hover:scale-[1.02] transition-all">
             <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp className="h-20 w-20" /></div>
             <CardHeader className="pb-2"><CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest">صافي الأرباح (تقديري)</CardTitle></CardHeader>
             <CardContent>
                <p className="text-2xl md:text-3xl font-black tabular-nums text-emerald-600">{(totalProfit || 0).toLocaleString()} دج</p>
                <p className="text-[9px] font-bold text-muted-foreground mt-2 italic">الربح = المبيعات - سعر الشراء</p>
             </CardContent>
          </Card>

          <Card className="border-none glass-premium rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden group hover:scale-[1.02] transition-all">
             <div className="absolute top-0 right-0 p-4 opacity-5"><ShoppingBag className="h-20 w-20" /></div>
             <CardHeader className="pb-2"><CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest">عدد العمليات</CardTitle></CardHeader>
             <CardContent>
                <p className="text-2xl md:text-3xl font-black tabular-nums">{processedInvoices.length}</p>
                <p className="text-[9px] font-bold text-muted-foreground mt-2">فاتورة ناجحة</p>
             </CardContent>
          </Card>

          <Card className="border-none bg-gradient-to-br from-primary to-accent text-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10"><Zap className="h-20 w-20" /></div>
             <CardHeader className="pb-2"><CardTitle className="text-xs font-black opacity-60 uppercase tracking-widest">معدل الفاتورة</CardTitle></CardHeader>
             <CardContent>
                <p className="text-2xl md:text-3xl font-black tabular-nums">
                   {processedInvoices.length > 0 ? Math.round(totalRevenue / processedInvoices.length).toLocaleString() : 0} دج
                </p>
                <p className="text-[9px] font-bold opacity-80 mt-2">متوسط قيمة العملية الواحدة</p>
             </CardContent>
          </Card>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
           
           {/* Best Selling Products Section */}
           <div className="lg:col-span-2 space-y-6 md:space-y-8">
              <Card className="border-none glass rounded-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-xl">
                 <CardHeader className="p-8 md:p-10 border-b border-white/5 bg-primary/5">
                    <div className="flex items-center justify-between">
                       <div>
                          <CardTitle className="text-xl md:text-2xl font-black flex items-center gap-3">
                             <Target className="h-6 w-6 text-primary" /> قائمة الأكثر مبيعاً
                          </CardTitle>
                          <CardDescription className="text-[10px] md:text-xs font-bold mt-1">ترتيب تنازلي حسب الكميات المباعة في الفترة المحددة</CardDescription>
                       </div>
                       <Badge className="h-8 rounded-xl font-black bg-primary text-white shadow-lg">{bestSellers.length} منتج</Badge>
                    </div>
                 </CardHeader>
                 <CardContent className="p-0">
                    <div className="table-container">
                       <table className="w-full text-right">
                          <thead className="bg-black/5 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground">
                             <tr>
                                <th className="p-6">المنتج / التصنيف</th>
                                <th className="p-6 text-center">الكمية المباعة</th>
                                <th className="p-6 text-left">الإيراد المحقق</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                             {isDataProcessing ? (
                               <tr><td colSpan={3} className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary opacity-20" /></td></tr>
                             ) : bestSellers.length === 0 ? (
                               <tr><td colSpan={3} className="py-20 text-center opacity-30 italic font-black">لا توجد بيانات بيع لهذه الفترة</td></tr>
                             ) : bestSellers.map((item, i) => (
                               <tr key={item.id} className="group hover:bg-white/40 transition-colors">
                                  <td className="p-6">
                                     <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-card border border-border flex items-center justify-center font-black text-primary shadow-sm">
                                           {i + 1}
                                        </div>
                                        <div className="flex flex-col">
                                           <span className="font-black text-xs md:text-sm">{item.name}</span>
                                           <span className="text-[9px] md:text-[10px] text-muted-foreground font-bold">{item.categoryPath}</span>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="p-6 text-center">
                                     <Badge variant="outline" className="h-8 md:h-9 px-4 rounded-xl border-primary/20 bg-primary/5 text-primary font-black tabular-nums text-xs md:text-sm">
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

              {/* Profit Chart */}
              <Card className="border-none glass rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 shadow-xl overflow-hidden">
                 <CardHeader className="p-0 mb-8">
                    <CardTitle className="text-xl md:text-2xl font-black">تطور الأرباح والمبيعات</CardTitle>
                    <CardDescription className="text-xs font-bold">مقارنة بصرية للأداء المالي خلال الفترة</CardDescription>
                 </CardHeader>
                 <div className="h-[350px] md:h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={bestSellers.slice(0, 8)}>
                          <defs>
                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" hide />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: 'hsl(var(--muted-foreground))'}} />
                          <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', direction: 'rtl' }} />
                          <Area type="monotone" dataKey="revenue" name="الإيراد" stroke="#3960AC" strokeWidth={4} fill="transparent" />
                          <Area type="monotone" dataKey="purchaseCost" name="التكاليف" stroke="#f43f5e" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </Card>
           </div>

           {/* Sidebar: Smart Insights & Stagnant Products */}
           <div className="space-y-6 md:space-y-8">
              {/* Smart Insights Panel */}
              <Card className="border-none glass-premium rounded-[2.5rem] md:rounded-[3rem] shadow-2xl relative overflow-hidden bg-gradient-to-br from-primary/5 to-accent/5">
                 <div className="absolute -top-10 -left-10 opacity-5"><Lightbulb className="h-40 w-40 rotate-12 text-primary" /></div>
                 <CardHeader className="p-8 md:p-10 relative z-10">
                    <CardTitle className="text-xl md:text-2xl font-black flex items-center gap-3">
                       <Sparkles className="h-6 w-6 text-primary" /> نظام النصائح الذكية
                    </CardTitle>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1">تحليل آلي مبني على نشاط المحل</p>
                 </CardHeader>
                 <CardContent className="p-8 pt-0 space-y-4 relative z-10">
                    {insights.length === 0 ? (
                      <div className="p-8 text-center bg-white/40 rounded-3xl border border-dashed border-primary/20">
                         <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary opacity-30" />
                         <p className="text-xs font-bold mt-4 opacity-50">جاري استنباط النصائح...</p>
                      </div>
                    ) : insights.map((insight, idx) => (
                      <div key={idx} className="p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.2rem] glass-premium border-white/20 flex gap-4 md:gap-5 group hover:bg-white/60 transition-all">
                         <div className={cn("h-12 w-12 md:h-14 md:w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", insight.color)}>
                            <insight.icon className="h-6 w-6 md:h-7 md:w-7" />
                         </div>
                         <div className="flex flex-col">
                            <h4 className="font-black text-xs md:text-sm text-foreground">{insight.title}</h4>
                            <p className="text-[10px] md:text-xs text-muted-foreground font-bold mt-1 leading-relaxed">{insight.text}</p>
                         </div>
                      </div>
                    ))}
                 </CardContent>
              </Card>

              {/* Stagnant Products */}
              <Card className="border-none glass rounded-[2.5rem] shadow-xl overflow-hidden">
                 <CardHeader className="p-8 border-b border-white/5 bg-orange-500/5">
                    <CardTitle className="text-lg font-black flex items-center gap-2 text-orange-700">
                       <AlertTriangle className="h-5 w-5" /> منتجات راكدة (لم تُبع)
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-6 space-y-3">
                    {stagnantProducts.length === 0 ? (
                      <p className="text-center py-6 text-[10px] font-black opacity-30 italic">كافة المنتجات تتحرك بشكل جيد</p>
                    ) : stagnantProducts.map(p => (
                      <div key={p.id} className="p-3 md:p-4 rounded-2xl glass border-white/5 flex items-center justify-between group hover:bg-white/40 transition-all">
                         <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center">
                               {p.imageUrl ? <img src={p.imageUrl} className="h-full w-full object-cover rounded-xl" /> : <Package className="h-5 w-5 opacity-10" />}
                            </div>
                            <div className="flex flex-col">
                               <span className="font-bold text-xs">{p.name}</span>
                               <span className="text-[8px] font-black opacity-50 uppercase">المخزون: {p.quantity} قطع</span>
                            </div>
                         </div>
                         <Badge variant="destructive" className="h-6 rounded-lg text-[8px] font-black">0 مبيعات</Badge>
                      </div>
                    ))}
                 </CardContent>
              </Card>
           </div>
        </div>

        <footer className="text-center py-10 opacity-40 no-print">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground">Express Phone Pro Intelligent Hub &copy; Khaled_Deragha</p>
        </footer>
    </div>
  )
}
