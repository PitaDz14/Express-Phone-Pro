"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Settings,
  LogOut,
  History,
  TrendingUp,
  Cpu,
  Zap
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
  SidebarSeparator,
} from "@/components/ui/sidebar"

const items = [
  { title: "لوحة التحكم", url: "/", icon: LayoutDashboard },
  { title: "المخزون", url: "/products", icon: Package },
  { title: "العملاء", url: "/customers", icon: Users },
  { title: "المبيعات", url: "/invoices", icon: FileText },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar side="right" className="border-none bg-transparent m-4 h-[calc(100vh-2rem)]">
      <div className="h-full glass rounded-[2.5rem] overflow-hidden flex flex-col border-none">
        <SidebarHeader className="px-8 py-10 border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-xl rotate-3">
              <Cpu className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tighter text-gradient">EXPRESS</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Phone Pro</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-4 pt-6">
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">
              العمليات
            </SidebarGroupLabel>
            <SidebarGroupContent className="mt-4">
              <SidebarMenu className="gap-2">
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      className={`h-14 px-6 rounded-2xl transition-all duration-300 ${
                        pathname === item.url 
                          ? 'bg-primary text-white shadow-lg scale-105' 
                          : 'hover:bg-white/50 text-muted-foreground hover:text-primary'
                      }`}
                    >
                      <Link href={item.url}>
                        <item.icon className={`h-5 w-5 ${pathname === item.url ? 'fill-white/20' : ''}`} />
                        <span className="font-bold text-sm mr-2">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          
          <div className="mt-auto px-4 pb-8">
            <div className="rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 p-6 border border-white shadow-sm">
               <Zap className="h-8 w-8 text-primary mb-3 fill-primary/20" />
               <p className="text-xs font-black text-primary uppercase">تحديث المخزون</p>
               <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">تأكد من مراجعة المنتجات منخفضة الكمية لتجنب التوقف.</p>
            </div>
          </div>
        </SidebarContent>

        <SidebarFooter className="p-6 border-t border-white/20">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="h-14 w-full text-destructive font-black hover:bg-destructive/10 rounded-2xl transition-all gap-3 px-6">
                <LogOut className="h-5 w-5" />
                <span className="text-sm">تسجيل الخروج</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className="mt-4 text-center">
            <p className="text-[10px] text-muted-foreground font-black opacity-30">V1.5 PREMIUM EDITION</p>
          </div>
        </SidebarFooter>
      </div>
    </Sidebar>
  )
}