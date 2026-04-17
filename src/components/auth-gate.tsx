
"use client"

import * as React from "react"
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from "@/firebase"
import { doc } from "firebase/firestore"
import { ShieldCheck, AlertTriangle, LogOut, Copy } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { signOut } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"

/**
 * AuthGate component handles session management and Protected Routes.
 * It ensures only authenticated users can access the system.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const auth = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()

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

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/login")
  }

  const copyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid)
      toast({ title: "تم النسخ", description: "تم نسخ المعرف UID بنجاح" })
    }
  }

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
  if ((!roleDoc || !roleDoc.role) && !isRoleLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8 text-center" dir="rtl">
        <div className="h-20 w-20 rounded-[2rem] bg-destructive/10 flex items-center justify-center text-destructive mb-6">
          <AlertTriangle className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-black mb-2">خطأ في الصلاحيات</h2>
        <p className="text-muted-foreground font-bold mb-4 max-w-sm">
          حسابك مسجل ولكن لم يتم تعيين دور وظيفي لك في قاعدة البيانات.
        </p>
        
        <div className="glass p-6 rounded-2xl border-dashed border-2 border-destructive/20 mb-8 w-full max-w-md">
           <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">المعرف الخاص بك (يجب استخدامه كـ Document ID):</p>
           <div className="flex items-center gap-2 bg-black/5 p-3 rounded-xl">
              <code className="text-xs font-mono break-all flex-1 text-primary">{user.uid}</code>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={copyUid}><Copy className="h-4 w-4" /></Button>
           </div>
           <p className="text-[10px] font-bold text-destructive mt-3 italic">تأكد من إنشاء وثيقة بهذا الاسم في مجموعة user_roles</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => window.location.reload()} className="rounded-2xl font-black px-8 h-12">
            تحديث الصفحة
          </Button>
          <Button onClick={handleLogout} variant="outline" className="rounded-2xl font-black px-8 h-12 gap-2">
            <LogOut className="h-4 w-4" /> تسجيل الخروج
          </Button>
        </div>
      </div>
    )
  }

  // Enforce Worker role restrictions
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
