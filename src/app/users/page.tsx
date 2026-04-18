
"use client"

import * as React from "react"
import { 
  UserCog, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  Trash2, 
  Edit3, 
  Loader2, 
  ExternalLink,
  Copy,
  Info,
  CheckCircle2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function UsersManagementPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user: currentUser } = useUser()
  
  const [openAdd, setOpenAdd] = React.useState(false)
  const [newUserUid, setNewUserUid] = React.useState("")
  const [newUserRole, setNewUserRole] = React.useState("Worker")
  const [newUserName, setNewUserName] = React.useState("")
  
  const rolesRef = useMemoFirebase(() => collection(db, "user_roles"), [db])
  const { data: staff, isLoading } = useCollection(rolesRef)

  const handleAddStaff = () => {
    if (!newUserUid || !newUserName) {
      toast({ title: "خطأ", description: "يرجى إدخال اسم الموظف والمعرف الفريد UID", variant: "destructive" })
      return
    }

    const userRoleData = {
      userId: newUserUid,
      username: newUserName,
      role: newUserRole,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      addedBy: currentUser?.email
    }

    setDocumentNonBlocking(doc(db, "user_roles", newUserUid), userRoleData, { merge: true })
    
    toast({ 
      title: "تمت الإضافة", 
      description: `تم تعيين ${newUserName} كـ ${newUserRole === 'Admin' ? 'مدير' : 'موظف'}` 
    })
    
    setOpenAdd(false)
    setNewUserUid("")
    setNewUserName("")
  }

  const handleDeleteRole = (staffMember: any) => {
    if (staffMember.userId === currentUser?.uid) {
      toast({ title: "تنبيه", description: "لا يمكنك حذف صلاحياتك الخاصة", variant: "destructive" })
      return
    }

    if (confirm(`هل أنت متأكد من سحب صلاحيات ${staffMember.username}؟ لن يتمكن من دخول النظام.`)) {
      deleteDocumentNonBlocking(doc(db, "user_roles", staffMember.userId))
      toast({ title: "تم الحذف", description: "تمت إزالة صلاحيات المستخدم بنجاح" })
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-32">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col">
          <h1 className="text-2xl md:text-4xl font-black text-gradient-premium tracking-tighter">إدارة طاقم العمل</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.3em] mt-1">التحكم في الموظفين وصلاحيات الدخول</p>
        </div>
        <Button onClick={() => setOpenAdd(true)} className="h-12 md:h-14 px-8 rounded-2xl bg-primary text-white shadow-xl gap-2 font-black">
          <UserPlus className="h-5 w-5" /> إضافة عضو جديد
        </Button>
      </header>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></div>
        ) : staff?.length === 0 ? (
          <Card className="border-none glass p-20 text-center rounded-[3rem]">
            <UserCog className="h-16 w-16 mx-auto text-muted-foreground/20" />
            <p className="mt-4 font-black text-muted-foreground/40 italic">لا يوجد مستخدمين مضافين حالياً</p>
          </Card>
        ) : (
          staff?.map((member) => (
            <Card key={member.id} className="border-none glass rounded-[2rem] overflow-hidden group hover:bg-white/40 transition-all">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg",
                    member.role === 'Admin' ? 'bg-primary' : 'bg-accent'
                  )}>
                    {member.role === 'Admin' ? <ShieldCheck className="h-6 w-6" /> : <UserCog className="h-6 w-6" />}
                  </div>
                  <div>
                    <h3 className="font-black text-lg leading-none">{member.username}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={member.role === 'Admin' ? 'default' : 'secondary'} className="rounded-lg text-[9px] px-2 font-black uppercase">
                        {member.role === 'Admin' ? 'مدير نظام' : 'موظف مبيعات'}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">UID: {member.userId.slice(0, 12)}...</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                   {member.userId !== currentUser?.uid && (
                     <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white"
                      onClick={() => handleDeleteRole(member)}
                     >
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Instructions Card */}
      <Card className="border-none bg-primary/5 border border-primary/10 rounded-[2.5rem] p-8 space-y-4">
        <div className="flex items-center gap-3">
          <Info className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-black text-primary">كيف تضيف مستخدم جديد؟</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
          <div className="space-y-4">
            <p className="font-bold text-muted-foreground leading-relaxed">
              تتم عملية الإضافة على خطوتين لضمان الأمان الكامل:
            </p>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0">1</span>
                <span>أنشئ حساب المستخدم (Email/Password) في <b>Firebase Console</b> تحت قسم Authentication.</span>
              </li>
              <li className="flex gap-3">
                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0">2</span>
                <span>انسخ الـ <b>User UID</b> الخاص به من هناك.</span>
              </li>
              <li className="flex gap-3">
                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0">3</span>
                <span>استخدم زر <b>"إضافة عضو"</b> هنا لربط هذا الـ UID باسم وصلاحية داخل التطبيق.</span>
              </li>
            </ul>
          </div>
          <div className="glass p-6 rounded-3xl border-dashed border-2 border-primary/20 flex flex-col items-center justify-center text-center gap-4">
             <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <ExternalLink className="h-6 w-6" />
             </div>
             <p className="font-black text-xs">رابط سريع للوحة التحكم</p>
             <Button asChild variant="outline" className="rounded-xl font-black border-primary/20 hover:bg-primary hover:text-white">
                <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">افتح Firebase Console</a>
             </Button>
          </div>
        </div>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent dir="rtl" className="glass border-none rounded-[2.5rem] shadow-2xl p-8 z-[400] max-w-lg w-[95%]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gradient-premium">تعيين صلاحيات مستخدم</DialogTitle>
            <DialogDescription className="font-bold text-xs">يرجى إدخال بيانات المستخدم الذي قمت بإنشائه في Firebase</DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <Label className="font-black text-[10px] text-primary uppercase px-1">اسم الموظف / المستخدم</Label>
              <Input 
                value={newUserName} 
                onChange={(e) => setNewUserName(e.target.value)} 
                className="h-12 glass border-none rounded-xl font-bold" 
                placeholder="مثال: أحمد محمد"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-black text-[10px] text-primary uppercase px-1">المعرف الفريد (User UID)</Label>
              <Input 
                value={newUserUid} 
                onChange={(e) => setNewUserUid(e.target.value)} 
                className="h-12 glass border-none rounded-xl font-mono text-[10px]" 
                placeholder="ألصق الـ UID هنا..."
              />
            </div>

            <div className="space-y-2">
              <Label className="font-black text-[10px] text-primary uppercase px-1">نوع الصلاحية</Label>
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger className="h-12 glass border-none rounded-xl font-bold">
                  <SelectValue placeholder="اختر الصلاحية..." />
                </SelectTrigger>
                <SelectContent className="glass border-none rounded-xl z-[450]">
                  <SelectItem value="Worker">موظف (POS ومخزون فقط)</SelectItem>
                  <SelectItem value="Admin">مدير (وصول كامل لكل النظام)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleAddStaff} className="w-full h-14 rounded-2xl bg-primary text-white font-black shadow-xl">
              تأكيد وحفظ الصلاحيات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
