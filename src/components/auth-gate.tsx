
"use client"

import * as React from "react"
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from "@/firebase"
import { doc, serverTimestamp } from "firebase/firestore"
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"

/**
 * AuthGate component handles session management and Protected Routes.
 * It ensures only authenticated users can access the system.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const router = useRouter()
  const pathname = usePathname()

  // Define unprotected routes
  const isLoginPage = pathname === "/login"

  // Check if user has a role document
  const roleRef = useMemoFirebase(() => {
    if (!user) return null
    return doc(db, "user_roles", user.uid)
  }, [db, user])

  const { data: roleDoc, isLoading: isRoleLoading } = useDoc(roleRef)

  // Navigation Logic
  React.useEffect(() => {
    if (!isUserLoading) {
      if (!user && !isLoginPage) {
        router.push("/login")
      } else if (user && isLoginPage) {
        router.push("/")
      }
    }
  }, [user, isUserLoading, isLoginPage, router])

  // If loading session, show splash screen
  if (isUserLoading || (user && isRoleLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center animate-bounce">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse font-black uppercase tracking-widest">جاري التحقق من الجلسة الآمنة...</p>
      </div>
    )
  }

  // Handle Unauthenticated State
  if (!user) {
    return isLoginPage ? <>{children}</> : null
  }

  // Handle Unauthorized (No Role) State
  // Note: For the first user ever, we might want to auto-assign Admin or handle error
  if (!roleDoc && !isRoleLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8 text-center" dir="rtl">
        <div className="h-20 w-20 rounded-[2rem] bg-destructive/10 flex items-center justify-center text-destructive mb-6">
          <AlertTriangle className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-black mb-2">خطأ في الصلاحيات</h2>
        <p className="text-muted-foreground font-bold mb-8 max-w-sm">
          حسابك مسجل ولكن لم يتم تعيين دور وظيفي لك بعد. يرجى التواصل مع المدير لتفعيل حسابك.
        </p>
        <Button onClick={() => window.location.href = "/login"} variant="outline" className="rounded-2xl font-black px-12">
          العودة لتسجيل الدخول
        </Button>
      </div>
    )
  }

  // Enforce Worker role restrictions if needed on sensitive paths
  // Admin has access to everything. Worker might be restricted from /settings or /reports
  const isAdmin = roleDoc?.role === "Admin"
  const isWorker = roleDoc?.role === "Worker"

  if (isWorker && (pathname === "/settings" || pathname === "/reports")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8 text-center" dir="rtl">
         <h2 className="text-xl font-black mb-4">عذراً، لا تملك صلاحية الوصول لهذه الصفحة</h2>
         <Button onClick={() => router.push("/")} className="rounded-2xl font-black">العودة للرئيسية</Button>
      </div>
    )
  }

  return <>{children}</>
}
