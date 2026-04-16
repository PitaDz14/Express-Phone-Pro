
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
  LogOut
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const items = [
  { title: "الرئيسية", url: "/", icon: LayoutDashboard },
  { title: "المخزون", url: "/products", icon: Package },
  { title: "العملاء", url: "/customers", icon: Users },
  { title: "نقطة البيع", url: "/invoices", icon: FileText },
  { title: "السجل", url: "/invoices/history", icon: History },
  { title: "التقارير", url: "/reports", icon: BarChart3 },
]

export function NavigationDock() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] no-print">
      <TooltipProvider delayDuration={0}>
        <div className="flex items-center gap-2 p-2 rounded-[2rem] glass-premium border border-white/20 shadow-2xl backdrop-blur-3xl px-4">
          {items.map((item) => {
            const isActive = pathname === item.url
            return (
              <Tooltip key={item.title}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.url}
                    className={cn(
                      "relative group flex items-center justify-center h-14 w-14 rounded-2xl transition-all duration-500 ease-out",
                      isActive 
                        ? "bg-primary text-white scale-110 -translate-y-2 shadow-xl shadow-primary/30" 
                        : "hover:bg-primary/10 text-muted-foreground hover:text-primary hover:-translate-y-1"
                    )}
                  >
                    <item.icon className={cn("h-6 w-6 transition-transform group-hover:scale-110", isActive && "animate-pulse")} />
                    {isActive && (
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_8px_white]" />
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-black/80 text-white border-none rounded-xl px-3 py-1 font-bold text-xs mb-2">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            )
          })}
          
          <div className="w-[1px] h-8 bg-black/5 mx-2" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="h-14 w-14 rounded-2xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-500 hover:-translate-y-1">
                <LogOut className="h-6 w-6 mx-auto" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-destructive text-white border-none rounded-xl px-3 py-1 font-bold text-xs mb-2">
              خروج
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  )
}
