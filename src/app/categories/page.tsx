
"use client"

import * as React from "react"
import { 
  Layers, 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  Trash2, 
  Edit3, 
  FolderPlus,
  ArrowRight,
  Package,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc, serverTimestamp, query, where, getDocs } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface Category {
  id: string
  name: string
  parentId: string | null
  level: number
  path: string
}

export default function CategoriesPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [open, setOpen] = React.useState(false)
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null)
  const [parentCategory, setParentCategory] = React.useState<Category | null>(null)
  const [categoryName, setCategoryName] = React.useState("")
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set())

  const categoriesRef = useMemoFirebase(() => collection(db, "categories"), [db])
  const { data: allCategories, isLoading } = useCollection(categoriesRef)

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) newExpanded.delete(id)
    else newExpanded.add(id)
    setExpandedIds(newExpanded)
  }

  const buildTree = (cats: Category[], parentId: string | null = null): any[] => {
    return cats
      .filter(c => c.parentId === parentId)
      .map(c => ({
        ...c,
        children: buildTree(cats, c.id)
      }))
  }

  const categoryTree = React.useMemo(() => {
    if (!allCategories) return []
    return buildTree(allCategories as Category[])
  }, [allCategories])

  const handleSave = () => {
    if (!categoryName) return

    const categoryData = {
      name: categoryName,
      parentId: parentCategory ? parentCategory.id : (editingCategory?.parentId || null),
      level: parentCategory ? (parentCategory.level + 1) : (editingCategory?.level || 0),
      updatedAt: serverTimestamp()
    }

    if (editingCategory) {
      updateDocumentNonBlocking(doc(db, "categories", editingCategory.id), categoryData)
      toast({ title: "تم التعديل", description: "تم تحديث التصنيف بنجاح" })
    } else {
      addDocumentNonBlocking(categoriesRef, {
        ...categoryData,
        createdAt: serverTimestamp()
      })
      toast({ title: "تمت الإضافة", description: "تم إضافة التصنيف الجديد للشجرة" })
    }

    setOpen(false)
    setCategoryName("")
    setParentCategory(null)
    setEditingCategory(null)
  }

  const handleDelete = async (category: Category) => {
    // Check if has children
    const hasChildren = allCategories?.some(c => c.parentId === category.id)
    if (hasChildren) {
      toast({ title: "خطأ", description: "لا يمكن حذف تصنيف يحتوي على أقسام فرعية", variant: "destructive" })
      return
    }

    if (confirm(`هل أنت متأكد من حذف تصنيف "${category.name}"؟`)) {
      deleteDocumentNonBlocking(doc(db, "categories", category.id))
      toast({ title: "تم الحذف", description: "تم إزالة التصنيف من النظام" })
    }
  }

  const CategoryItem = ({ node, depth = 0 }: { node: any, depth: number }) => {
    const isExpanded = expandedIds.has(node.id)
    const hasChildren = node.children && node.children.length > 0

    return (
      <div className="space-y-2">
        <div className={cn(
          "flex items-center justify-between p-4 glass rounded-2xl border-white/10 group transition-all",
          isExpanded ? "bg-white/40" : "hover:bg-white/20"
        )}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => toggleExpand(node.id)}
              className={cn("p-1 rounded-lg hover:bg-black/5 transition-colors", !hasChildren && "opacity-20 cursor-default")}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <div className="flex flex-col">
              <span className="font-black text-sm">{node.name}</span>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                {depth === 0 ? "تصنيف أساسي" : `مستوى فرعي ${depth}`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white"
              onClick={() => { setParentCategory(node); setOpen(true); }}
              title="إضافة قسم فرعي"
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white"
              onClick={() => { setEditingCategory(node); setCategoryName(node.name); setOpen(true); }}
              title="تعديل"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white"
              onClick={() => handleDelete(node)}
              title="حذف"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {isExpanded && hasChildren && (
          <div className="mr-8 space-y-2 border-r-2 border-primary/10 pr-4 mt-2">
            {node.children.map((child: any) => (
              <CategoryItem key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 pb-32">
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-4xl font-black text-gradient-premium tracking-tighter">هيكلية التصنيفات</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.3em] mt-1">إدارة الفروع، الأقسام، والتشعبات الذكية</p>
        </div>
        <Button onClick={() => { setParentCategory(null); setEditingCategory(null); setCategoryName(""); setOpen(true); }} className="h-14 px-8 rounded-2xl bg-primary text-white shadow-2xl hover:scale-105 transition-transform gap-2 font-black">
          <Plus className="h-6 w-6" /> إضافة تصنيف أساسي
        </Button>
      </header>

      {isLoading ? (
        <div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></div>
      ) : (
        <div className="space-y-4">
          {categoryTree.length === 0 ? (
            <div className="text-center py-20 glass border-2 border-dashed border-white/20 rounded-[3rem]">
              <Layers className="h-16 w-16 mx-auto text-muted-foreground/20" />
              <p className="text-sm font-black text-muted-foreground/40 mt-4 italic">لم يتم إنشاء أي تصنيفات بعد، ابدأ ببناء شجرتك الخاصة</p>
            </div>
          ) : (
            categoryTree.map(rootNode => (
              <CategoryItem key={rootNode.id} node={rootNode} depth={0} />
            ))
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="glass border-none rounded-[2.5rem] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gradient-premium">
              {editingCategory ? "تعديل تصنيف" : parentCategory ? `إضافة قسم فرعي لـ "${parentCategory.name}"` : "إضافة تصنيف أساسي جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label className="font-black text-xs text-primary px-1">اسم التصنيف</Label>
              <Input 
                value={categoryName} 
                onChange={(e) => setCategoryName(e.target.value)} 
                className="rounded-2xl h-14 glass border-none font-bold text-lg" 
                placeholder="مثال: شاشات، كوابل، بطاريات..." 
              />
            </div>
            {parentCategory && (
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-3">
                 <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Layers className="h-4 w-4 text-primary" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase">سيتبع لـ:</p>
                    <p className="font-black text-sm">{parentCategory.name}</p>
                 </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="w-full h-14 rounded-2xl font-black bg-primary text-white text-lg shadow-xl shadow-primary/20">
              تأكيد الحفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
