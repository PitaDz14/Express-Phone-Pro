"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Settings,
  LogOut,
  BarChart3,
  Smartphone,
  ChevronLeft,
  Search
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const items = [
  { title: "الرئيسية", url: "/", icon: LayoutDashboard },
  { title: "المخزون", url: "/products", icon: Package },
  { title: "العملاء", url: "/customers", icon: Users },
  { title: "نقطة البيع", url: "/invoices", icon: FileText },
  { title: "التقارير", url: "/reports", icon: BarChart3 },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar side="right" className="border-none bg-transparent p-4 hidden md:flex">
      <div className="h-full glass-premium rounded-[2.5rem] flex flex-col">
        <SidebarHeader className="px-8 py-12">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-[#3960AC] to-[#3CC2DD] flex items-center justify-center text-white shadow-xl shadow-primary/20 transform -rotate-3 transition-transform hover:rotate-0 duration-500">
              <Smartphone className="h-8 w-8" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-2xl tracking-tighter text-[#3960AC]">EXPRESS</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">Phone Pro</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-4">
          <SidebarGroup>
            <SidebarGroupLabel className="px-6 mb-6 text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
              القائمة الرئيسية
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-3">
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      className={cn(
                        "h-16 px-6 rounded-3xl transition-all duration-500",
                        pathname === item.url 
                          ? 'bg-[#3960AC] text-white shadow-2xl shadow-primary/30 scale-[1.02]' 
                          : 'hover:bg-[#3960AC]/5 text-muted-foreground hover:text-[#3960AC]'
                      )}
                    >
                      <Link href={item.url}>
                        <item.icon className={cn("h-6 w-6", pathname === item.url ? "animate-pulse" : "")} />
                        <span className="font-bold text-base mr-3">{item.title}</span>
                        {pathname === item.url && <ChevronLeft className="mr-auto h-4 w-4 opacity-50" />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-8 mt-auto">
          <div className="rounded-[2rem] bg-gradient-to-br from-primary/5 to-accent/5 p-6 border border-white mb-6">
            <p className="text-xs font-black text-[#3960AC] mb-2">تحتاج مساعدة؟</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">تواصل مع الدعم الفني لترقية نظامك.</p>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="h-14 w-full text-destructive/70 font-bold hover:bg-destructive/5 hover:text-destructive rounded-2xl transition-all gap-3 px-6">
                <LogOut className="h-5 w-5" />
                <span className="text-sm">تسجيل الخروج</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className="mt-4 text-center">
            <p className="text-[9px] text-muted-foreground/30 font-black">PREMIUM SaaS v2.0</p>
          </div>
        </SidebarFooter>
      </div>
    </Sidebar>
  )
}