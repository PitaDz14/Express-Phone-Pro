
"use client"

import * as React from "react"
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from "@/firebase"
import { doc } from "firebase/firestore"
import { ShieldCheck, AlertTriangle, LogOut, Copy, ExternalLink } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { signOut } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"

/**
 * AuthGate component handles session management and Protected Routes.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const auth = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()

  const isLoginPage = pathname === "/login"

  const roleRef = useMemoFirebase(() => {
    if (!user) return null
    return doc(db, "user_roles", user.uid)
  }, [db, user])

  const { data: roleDoc, isLoading: isRoleLoading } = useDoc(roleRef)

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

  if (!user) {
    return isLoginPage ? <>{children}</> : null
  }

  if ((!roleDoc || !roleDoc.role) && !isRoleLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8 text-center" dir="rtl">
        <div className="h-20 w-20 rounded-[2rem] bg-destructive/10 flex items-center justify-center text-destructive mb-6">
          <AlertTriangle className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-black mb-2">تفعيل حساب المدير</h2>
        <p className="text-muted-foreground font-bold mb-4 max-w-md">
          أنت الآن مسجل في النظام، ولكن يجب عليك إضافة صلاحية <span className="text-primary">Admin</span> لهذا المعرف في <span className="underline">Firestore Database</span> وليس في IAM.
        </p>
        
        <div className="glass p-6 rounded-[2rem] border-dashed border-2 border-primary/20 mb-8 w-full max-w-lg text-right">
           <p className="text-[10px] font-black uppercase text-primary mb-4 text-center">خطوات التفعيل (قم بها في Firebase Console):</p>
           
           <ol className="text-xs space-y-3 font-bold text-muted-foreground">
             <li className="flex gap-2"><span>1.</span> اذهب إلى قسم <span className="text-foreground">Firestore Database</span>.</li>
             <li className="flex gap-2"><span>2.</span> افتح مجموعة <span className="text-foreground">user_roles</span>.</li>
             <li className="flex gap-2"><span>3.</span> أنشئ وثيقة جديدة (Add Document).</li>
             <li className="flex flex-col gap-2">
                <span>4. الصق هذا المعرف في خانة <span className="text-foreground">Document ID</span>:</span>
                <div className="flex items-center gap-2 bg-black/5 p-3 rounded-xl border border-primary/20">
                  <code className="text-[10px] font-mono break-all flex-1 text-primary">{user.uid}</code>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={copyUid}><Copy className="h-4 w-4" /></Button>
                </div>
             </li>
             <li className="flex gap-2"><span>5.</span> أضف حقلاً (Field) باسم <span className="text-foreground">role</span> وقيمته <span className="text-foreground">Admin</span>.</li>
           </ol>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => window.location.reload()} className="rounded-2xl font-black px-8 h-12 shadow-lg shadow-primary/20">
            لقد أضفت البيانات، تحديث الآن
          </Button>
          <Button onClick={handleLogout} variant="outline" className="rounded-2xl font-black px-8 h-12 gap-2">
            <LogOut className="h-4 w-4" /> خروج
          </Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
