"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Settings,
  LogOut,
  AlertTriangle,
  History,
  TrendingUp,
  Cpu
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
  {
    title: "لوحة القيادة",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "المخزون والمنتجات",
    url: "/products",
    icon: Package,
  },
  {
    title: "العملاء والديون",
    url: "/customers",
    icon: Users,
  },
  {
    title: "الفواتير والمبيعات",
    url: "/invoices",
    icon: FileText,
  },
  {
    title: "تقارير الأداء",
    url: "/analytics",
    icon: TrendingUp,
  },
]

const adminItems = [
  {
    title: "سجل العمليات",
    url: "/audit-logs",
    icon: History,
  },
  {
    title: "الإعدادات",
    url: "/settings",
    icon: Settings,
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar side="right">
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Cpu className="h-5 w-5" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="font-bold text-lg tracking-tight">Express Phone</span>
            <span className="text-xs text-muted-foreground">نظام الإدارة المتكامل</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            القائمة الرئيسية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200"
                  >
                    <Link href={item.url}>
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarSeparator className="mx-4 my-2 opacity-50" />
        
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            الإدارة
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200"
                  >
                    <Link href={item.url}>
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4">
          <div className="rounded-xl bg-orange-50 p-4 border border-orange-100 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-900">تنبيه المخزون</p>
              <p className="text-xs text-orange-700">هناك 3 منتجات شارفت على النفاذ.</p>
            </div>
          </div>
        </div>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 flex items-center gap-3 px-4 py-2 rounded-lg transition-all">
              <LogOut className="h-5 w-5" />
              <span className="font-medium">تسجيل الخروج</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="mt-4 text-center">
          <p className="text-[10px] text-muted-foreground">Express Phone Pro v1.0</p>
          <p className="text-[10px] text-muted-foreground font-medium">by Khaled_Deragha</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
