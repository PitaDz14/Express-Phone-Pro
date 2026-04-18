"use client"

import * as React from "react"
import { useUser, useAuth } from "@/firebase"
import { ShieldCheck, AlertCircle, LogOut } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { signOut } from "firebase/auth"

/**
 * AuthGate component handles session management and Protected Routes.
 * Enhanced to prevent "Activation Screen" flashing and redundant fetches.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading, role, isRoleLoading } = useUser()
  const auth = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isLoginPage = pathname === "/login"

  React.useEffect(() => {
    if (!isUserLoading) {
      if (!user && !isLoginPage) {
        router.push("/login")
      } else if (user && isLoginPage) {
        router.push("/")
      }
    }
  }, [user, isUserLoading, isLoginPage, router])

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/login")
  }

  // Show generic loading state while user OR role is loading
  if (isUserLoading || (user && isRoleLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center animate-bounce">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse font-black uppercase tracking-widest">جاري التحقق من الصلاحيات...</p>
      </div>
    )
  }

  // Not logged in and not on login page: wait for redirect
  if (!user) {
    return isLoginPage ? <>{children}</> : null
  }

  // If role is missing after full loading: show a clean "No Access" state
  if (!role && !isRoleLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8 text-center" dir="rtl">
        <div className="h-20 w-20 rounded-[2rem] bg-destructive/10 flex items-center justify-center text-destructive mb-6">
          <AlertCircle className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-black mb-2">وصول محدود</h2>
        <p className="text-muted-foreground font-bold mb-8 max-w-md">
          حسابك مسجل في النظام ولكن لم يتم تعيين صلاحيات لك بعد. يرجى التواصل مع المدير لتفعيل حسابك.
        </p>
        
        <Button onClick={handleLogout} variant="outline" className="rounded-2xl font-black px-10 h-12 gap-2">
          <LogOut className="h-4 w-4" /> العودة لتسجيل الدخول
        </Button>
      </div>
    )
  }

  return <>{children}</>
}
