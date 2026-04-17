
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Smartphone, Lock, Mail, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useAuth, useUser } from "@/firebase"
import { signInWithEmailAndPassword } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const auth = useAuth()
  const { user, isUserLoading } = useUser()
  
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Redirect if already logged in
  React.useEffect(() => {
    if (!isUserLoading && user) {
      router.push("/")
    }
  }, [user, isUserLoading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "مرحباً بك مجدداً في نظام Express Phone Pro",
      })
      router.push("/")
    } catch (err: any) {
      let message = "فشل تسجيل الدخول. يرجى التأكد من البيانات."
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        message = "البريد الإلكتروني أو كلمة المرور غير صحيحة."
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-8" dir="rtl">
      <div className="w-full max-w-[450px] space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <div className="mx-auto h-16 w-16 rounded-[2rem] bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-2xl shadow-primary/20 rotate-3">
            <Smartphone className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-black text-gradient-premium tracking-tighter mt-4">EXPRESS PHONE PRO</h1>
          <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">نظام الإدارة الآمن</p>
        </div>

        <Card className="border-none glass-premium rounded-[2.5rem] shadow-2xl overflow-hidden">
          <CardHeader className="p-8 pb-0 text-center">
            <CardTitle className="text-2xl font-black">تسجيل الدخول</CardTitle>
            <CardDescription className="font-bold">أدخل بياناتك للوصول إلى لوحة التحكم</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="rounded-2xl border-none bg-destructive/10 text-destructive animate-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="font-black">خطأ في الدخول</AlertTitle>
                  <AlertDescription className="text-xs font-bold">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label className="font-black text-xs text-primary px-1 uppercase tracking-widest">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="email" 
                    placeholder="example@express.com" 
                    className="h-14 pr-12 glass border-none rounded-2xl font-bold" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-black text-xs text-primary px-1 uppercase tracking-widest">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    className="h-14 pr-12 glass border-none rounded-2xl font-bold" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl bg-primary text-white font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "دخول النظام"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <footer className="text-center opacity-30 text-[10px] font-black uppercase tracking-widest">
          Express Phone Pro &copy; Khaled_Deragha • 2026
        </footer>
      </div>
    </div>
  )
}
