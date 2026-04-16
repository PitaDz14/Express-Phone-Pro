"use client"

import * as React from "react"
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from "@/firebase"
import { initiateAnonymousSignIn } from "@/firebase/non-blocking-login"
import { doc, serverTimestamp } from "firebase/firestore"
import { Loader2, ShieldCheck } from "lucide-react"

/**
 * AuthGate component handles automatic anonymous authentication 
 * and ensures the user has a role assigned in Firestore.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser()
  const auth = useAuth()
  const db = useFirestore()

  // Attempt auto-login if no user is present
  React.useEffect(() => {
    if (!isUserLoading && !user) {
      initiateAnonymousSignIn(auth)
    }
  }, [user, isUserLoading, auth])

  // Check if user has a role document
  const roleRef = useMemoFirebase(() => {
    if (!user) return null
    return doc(db, "user_roles", user.uid)
  }, [db, user])

  const { data: roleDoc, isLoading: isRoleLoading } = useDoc(roleRef)

  // If user is logged in but has no role, create an 'Admin' role for the prototype
  React.useEffect(() => {
    if (user && !isRoleLoading && !roleDoc && roleRef) {
      setDocumentNonBlocking(roleRef, {
        userId: user.uid,
        role: "Admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        id: user.uid
      }, { merge: true })
    }
  }, [user, isRoleLoading, roleDoc, roleRef])

  if (isUserLoading || (user && isRoleLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse font-medium">جاري تجهيز النظام الآمن...</p>
      </div>
    )
  }

  if (!user || (!roleDoc && isRoleLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <ShieldCheck className="h-16 w-16 text-muted-foreground/20 mb-4" />
        <h2 className="text-xl font-bold mb-2">Express Phone Pro</h2>
        <p className="text-muted-foreground text-sm max-w-xs">يرجى الانتظار بينما نقوم بضبط صلاحيات الوصول الخاصة بك.</p>
      </div>
    )
  }

  return <>{children}</>
}
