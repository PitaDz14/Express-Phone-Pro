"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  History,
  BarChart3,
  Settings,
  LogOut,
  Sun,
  Moon,
  Wallet,
  RefreshCw,
  Wifi,
  WifiOff,
  UserCog
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useTheme } from "@/components/theme-provider"
import { useAuth, useSyncStatus, useUser } from "@/firebase"
import { signOut } from "firebase/auth"

const allItems = [
  { title: "الرئيسية", url: "/", icon: LayoutDashboard, roles: ["Admin", "Worker"] },
  { title: "المخزون", url: "/products", icon: Package, roles: ["Admin", "Worker"] },
  { title: "العملاء", url: "/customers", icon: Users, roles: ["Admin", "Worker"] },
  { title: "الديون", url: "/debts", icon: Wallet, roles: ["Admin", "Worker"] },
  { title: "نقطة البيع", url: "/invoices", icon: FileText, roles: ["Admin", "Worker"] },
  { title: "السجل", url: "/invoices/history", icon: History, roles: ["Admin", "Worker"] },
  { title: "التقارير", url: "/reports", icon: BarChart3, roles: ["Admin"] },
  { title: "الطاقم", url: "/users", icon: UserCog, roles: ["Admin"] },
  { title: "النظام", url: "/settings", icon: Settings, roles: ["Admin"] },
]

export function NavigationDock() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const auth = useAuth()
  const { role } = useUser()
  const { isOnline, isSyncing } = useSyncStatus()

  const handleLogout = async () => {
    if (confirm("هل أنت متأكد من تسجيل الخروج؟")) {
      await signOut(auth)
      router.push("/login")
    }
  }

  const filteredItems = React.useMemo(() => {
    return allItems.filter(item => item.roles.includes(role || "Worker"));
  }, [role]);

  if (pathname === "/login") return null

  return (
    <div className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] no-print w-full max-w-[95%] md:max-w-max px-2">
      <TooltipProvider delayDuration={0}>
        <div className="flex items-center gap-1 p-1 md:p-2 pt-3 md:pt-4 rounded-[1.5rem] md:rounded-[2rem] glass-premium border border-white/20 shadow-2xl backdrop-blur-3xl px-4 md:px-6 overflow-x-auto no-scrollbar justify-start md:justify-center">
          
          {/* Connection & Sync Indicator */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl transition-all duration-300 shrink-0",
                isOnline ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 bg-red-500/10"
              )}>
                {isSyncing ? (
                  <RefreshCw className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                ) : isOnline ? (
                  <Wifi className="h-4 w-4 md:h-5 md:w-5" />
                ) : (
                  <WifiOff className="h-4 w-4 md:h-5 md:w-5" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-black text-white font-bold text-xs rounded-xl px-3 py-1">
              {isSyncing ? "جاري مزامنة البيانات..." : isOnline ? "متصل بالسحاب" : "تعمل في وضع الأوفلاين"}
            </TooltipContent>
          </Tooltip>

          <div className="w-[1px] h-6 md:h-8 bg-black/5 mx-1 md:mx-1 shrink-0" />

          {filteredItems.map((item) => {
            const isActive = pathname === item.url
            return (
              <Tooltip key={item.title}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.url}
                    className={cn(
                      "relative group flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl transition-all duration-300 ease-out shrink-0",
                      isActive 
                        ? "bg-primary text-white scale-105 md:scale-110 -translate-y-2 md:-translate-y-3 shadow-xl shadow-primary/30" 
                        : "hover:bg-primary/10 text-muted-foreground hover:text-primary hover:-translate-y-1"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 md:h-5 md:w-5 transition-transform group-hover:scale-110", isActive && "animate-pulse")} />
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_8px_white]" />
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top" className="hidden md:block bg-black/80 text-white border-none rounded-xl px-3 py-1 font-bold text-xs mb-2">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            )
          })}
          
          <div className="w-[1px] h-6 md:h-8 bg-black/5 mx-1 md:mx-2 shrink-0" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300 hover:-translate-y-1 shrink-0"
              >
                {theme === "dark" ? <Sun className="h-4 w-4 md:h-5 md:w-5 mx-auto" /> : <Moon className="h-4 w-4 md:h-5 md:w-5 mx-auto" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="hidden md:block bg-primary text-white border-none rounded-xl px-3 py-1 font-bold text-xs mb-2">
              تغيير المظهر
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={handleLogout}
                className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300 hover:-translate-y-1 shrink-0"
              >
                <LogOut className="h-4 w-4 md:h-5 md:w-5 mx-auto" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="hidden md:block bg-destructive text-white border-none rounded-xl px-3 py-1 font-bold text-xs mb-2">
              خروج
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  )
}
