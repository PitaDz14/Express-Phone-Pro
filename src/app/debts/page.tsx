
"use client"

import * as React from "react"
import { 
  Wallet, 
  Search, 
  ArrowUpDown, 
  ArrowUp,
  ArrowDown, 
  Loader2, 
  ChevronLeft, 
  Eye, 
  Trash2, 
  Edit3, 
  History,
  User,
  ShoppingBag,
  FileText,
  Plus,
  Coins,
  CheckCircle2,
  MessageCircle
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, where, doc, increment, getDocs, writeBatch, serverTimestamp, getDoc } from "firebase/firestore"
import { format } from "date-fns"
import { ar, fr } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function DebtsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null)
  const [customerInvoices, setCustomerInvoices] = React.useState<any[]>([])
  const [isLoadingInvoices, setIsLoadingInvoices] = React.useState(false)
  const [sortConfig, setSortConfig] = React.useState({ key: 'debt', direction: 'desc' })

  const [isBulkOpen, setIsBulkOpen] = React.useState(false)
  const [bulkAmount, setBulkAmount] = React.useState<number | "">("")
  const [isProcessingBulk, setIsProcessingBulk] = React.useState(false)

  const [selectedInvoiceForItems, setSelectedInvoiceForItems] = React.useState<any>(null)
  const [invoiceItems, setInvoiceItems] = React.useState<any[]>([])
  const [isLoadingItems, setIsLoadingItems] = React.useState(false)
  const [isSendingReport, setIsSendingReport] = React.useState<string | null>(null)

  const customersRef = useMemoFirebase(() => collection(db, "customers"), [db])
  const { data: allCustomers, isLoading: isCustomersLoading } = useCollection(customersRef)

  const indebtedCustomers = React.useMemo(() => {
    if (!allCustomers) return []
    let items = allCustomers
      .filter(c => c.debt > 0 && c.name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    if (sortConfig.key) {
      items.sort((a, b) => {
        const valA = a[sortConfig.key] || 0
        const valB = b[sortConfig.key] || 0
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return items;
  }, [allCustomers, searchTerm, sortConfig])

  const totalGlobalDebt = React.useMemo(() => {
    return allCustomers?.reduce((sum, c) => sum + (c.debt || 0), 0) || 0
  }, [allCustomers])

  const handleSendDebtReport = async (customer: any) => {
    setIsSendingReport(customer.id);
    try {
      const q = query(
        collection(db, "invoices"), 
        where("customerId", "==", customer.id),
        where("status", "==", "Debt")
      );
      const snapshot = await getDocs(q);
      const invoices = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      if (invoices.length === 0) {
        toast({ title: "Aucune facture", description: "Ce client n'a pas de factures impayées actuellement." });
        return;
      }

      let message = `*==========================*\n`;
      message += `*    EXPRESS PHONE PRO     *\n`;
      message += `*  RELEVÉ DE COMPTE DETTES *\n`;
      message += `*==========================*\n`;
      message += `*Client:* ${customer.name}\n`;
      message += `*Date:* ${format(new Date(), "dd/MM/yyyy", { locale: fr })}\n`;
      message += `*Total Dette Actuelle:* ${customer.debt.toLocaleString()} DZD\n`;
      message += `*==========================*\n\n`;
      message += `*Détails par factures:*\n`;

      for (const inv of invoices) {
        const itemsRef = collection(db, "invoices", inv.id, "items");
        const itemsSnap = await getDocs(itemsRef);
        const dateStr = inv.createdAt?.toDate ? format(inv.createdAt.toDate(), "dd/MM/yyyy", { locale: fr }) : "---";
        
        message += `*Facture:* #${inv.id.slice(0, 8)} (${dateStr})\n`;
        
        itemsSnap.docs.forEach(d => {
          const item = d.data();
          message += `- ${item.productName} (${item.quantity} pièce(s))\n`;
        });

        const unpaid = inv.totalAmount - inv.paidAmount;
        message += `*Montant Facture:* ${inv.totalAmount.toLocaleString()} DZD\n`;
        message += `*Payé:* ${inv.paidAmount.toLocaleString()} DZD\n`;
        message += `*Reste à payer:* ${unpaid.toLocaleString()} DZD\n`;
        message += `*--------------------------*\n`;
      }

      message += `\n*Note:* Veuillez passer au magasin pour régulariser votre situation financière.\n`;
      message += `Merci de votre confiance ! ✨\n`;
      message += `*==========================*`;

      const phone = customer.phone || "";
      window.open(`https://wa.me/${phone.startsWith('0') ? '213' + phone.slice(1) : phone}?text=${encodeURIComponent(message)}`, '_blank');
      
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erreur", description: "Échec de génération du rapport WhatsApp." });
    } finally {
      setIsSendingReport(null);
    }
  }

  const fetchCustomerInvoices = async (customer: any) => {
    setSelectedCustomer(customer)
    setIsLoadingInvoices(true)
    try {
      const q = query(collection(db, "invoices"), where("customerId", "==", customer.id))
      const snapshot = await getDocs(q)
      const items = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((inv: any) => inv.totalAmount > inv.paidAmount)
      
      items.sort((a: any, b: any) => {
        const tA = a.createdAt?.seconds || 0
        const tB = b.createdAt?.seconds || 0
        return tB - tA
      })
      
      setCustomerInvoices(items)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoadingInvoices(false)
    }
  }

  const handleProcessBulkPayment = async () => {
    if (!selectedCustomer || !bulkAmount || Number(bulkAmount) <= 0) return
    
    setIsProcessingBulk(true)
    const amountToApply = Number(bulkAmount)
    const batch = writeBatch(db)
    
    try {
      const q = query(
        collection(db, "invoices"), 
        where("customerId", "==", selectedCustomer.id),
        where("status", "==", "Debt")
      )
      const snapshot = await getDocs(q)
      
      const debtInvoices = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .sort((a, b) => {
          const tA = a.createdAt?.seconds || 0
          const tB = b.createdAt?.seconds || 0
          return tB - tA 
        })

      let remaining = amountToApply
      
      for (const inv of debtInvoices) {
        if (remaining <= 0) break
        
        const invUnpaid = inv.totalAmount - inv.paidAmount
        const paymentForThisInv = Math.min(remaining, invUnpaid)
        
        const newPaidAmount = inv.paidAmount + paymentForThisInv
        batch.update(doc(db, "invoices", inv.id), {
          paidAmount: newPaidAmount,
          status: newPaidAmount >= inv.totalAmount ? "Paid" : "Debt",
          updatedAt: serverTimestamp()
        })
        
        remaining -= paymentForThisInv
      }

      batch.update(doc(db, "customers", selectedCustomer.id), {
        debt: increment(-amountToApply),
        updatedAt: serverTimestamp()
      })

      await batch.commit()
      
      toast({ 
        title: "Paiement effectué", 
        description: `Montant de ${amountToApply.toLocaleString()} DZD réparti avec succès.` 
      })
      
      setIsBulkOpen(false)
      setBulkAmount("")
      setSelectedCustomer(null) 
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "Erreur", description: "Échec de traitement du paiement." })
    } finally {
      setIsProcessingBulk(false)
    }
  }

  const fetchInvoiceItems = async (invoice: any) => {
    setSelectedInvoiceForItems(invoice)
    setIsLoadingItems(true)
    setInvoiceItems([])
    try {
      const itemsRef = collection(db, "invoices", invoice.id, "items")
      const snapshot = await getDocs(itemsRef)
      
      const itemsMap: Record<string, any> = {}
      const limit = (invoice.totalAmount || 0) + (invoice.discount || 0);
      let runningSubtotal = 0;

      snapshot.docs.forEach(d => {
        const item = d.data()
        const unitPrice = item.unitPrice || 0;
        const rawQty = item.quantity || 1;

        if (unitPrice <= 0) return;

        const remainingBalance = limit - runningSubtotal;
        const maxPossibleQty = Math.floor((remainingBalance + 0.1) / unitPrice);
        const correctedQty = Math.max(0, Math.min(rawQty, maxPossibleQty));
        const finalQty = (runningSubtotal === 0 && correctedQty === 0) ? 1 : correctedQty;

        if (finalQty <= 0 && runningSubtotal > 0) return;

        const key = `${item.productId}_${unitPrice}`
        if (itemsMap[key]) {
          itemsMap[key].quantity += finalQty
          itemsMap[key].itemTotal = itemsMap[key].quantity * unitPrice
        } else {
          itemsMap[key] = { 
            id: d.id, 
            ...item, 
            quantity: finalQty, 
            itemTotal: finalQty * unitPrice 
          }
        }
        runningSubtotal += (finalQty * unitPrice);
      })
      
      setInvoiceItems(Object.values(itemsMap))
    } catch (error) {
      console.error("Error fetching items:", error)
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de récupérer les articles." })
    } finally {
      setIsLoadingItems(false)
    }
  }

  const handleDeleteDebtInvoice = async (invoice: any) => {
    if (confirm("Supprimer cette facture ? Le stock sera réintégré et la dette client diminuée.")) {
      try {
        const itemsSnap = await getDocs(collection(db, "invoices", invoice.id, "items"))
        itemsSnap.docs.forEach(itemDoc => {
          const item = itemDoc.data()
          if (item.productId) {
            updateDocumentNonBlocking(doc(db, "products", item.productId), {
              quantity: increment(item.quantity)
            })
          }
        })

        const unpaidAmount = invoice.totalAmount - invoice.paidAmount
        updateDocumentNonBlocking(doc(db, "customers", invoice.customerId), {
          debt: increment(-unpaidAmount)
        })

        deleteDocumentNonBlocking(doc(db, "invoices", invoice.id))
        
        toast({ title: "Supprimé", description: "Facture supprimée et stock mis à jour." })
        setCustomerInvoices(prev => prev.filter(inv => inv.id !== invoice.id))
      } catch (error) {
        toast({ variant: "destructive", title: "Erreur", description: "L'opération a échoué." })
      }
    }
  }

  const handleUpdatePayment = (invoice: any) => {
    const newPaid = prompt(`Total Facture: ${invoice.totalAmount}\nVersé actuel: ${invoice.paidAmount}\nNouveau montant versé :`, invoice.paidAmount)
    if (newPaid !== null) {
      const paidNum = Number(newPaid)
      const diff = paidNum - invoice.paidAmount
      
      updateDocumentNonBlocking(doc(db, "invoices", invoice.id), {
        paidAmount: paidNum,
        status: paidNum >= invoice.totalAmount ? "Paid" : "Debt"
      })

      updateDocumentNonBlocking(doc(db, "customers", invoice.customerId), {
        debt: increment(-diff)
      })

      toast({ title: "Mis à jour", description: "Le versement a été actualisé." })
      setCustomerInvoices(prev => prev.map(inv => inv.id === invoice.id ? { ...inv, paidAmount: paidNum } : inv))
    }
  }

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="h-3 w-3 text-primary" />;
    if (sortConfig.direction === 'desc') return <ArrowDown className="h-3 w-3 text-primary" />;
    return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 pb-32">
      <header className="flex flex-col md:flex-row md:h-20 shrink-0 md:items-center justify-between glass p-6 md:px-8 rounded-[2rem] gap-4">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-3">
            <div className="h-10 h-10 md:h-12 md:w-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg">
              <Wallet className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg md:text-xl font-black text-gradient-premium uppercase tracking-tighter leading-tight">Gestion des Dettes</h1>
              <p className="text-[8px] md:text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Suivi des impayés</p>
            </div>
          </div>
          <div className="h-8 w-px bg-border mx-1 md:mx-2" />
          <div className="flex flex-col">
             <span className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase">Dette Totale Marché</span>
             <span className="text-sm md:text-xl font-black text-red-600 tabular-nums">{totalGlobalDebt.toLocaleString()} DZD</span>
          </div>
        </div>

        <div className="relative w-full md:w-72 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Rechercher client..." 
            className="pl-10 h-11 md:h-12 glass border-none rounded-xl font-bold text-xs" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <Card className="border-none glass rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-xl">
        <div className="table-container">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-black text-foreground cursor-pointer text-center" onClick={() => handleSort('name')}>
                  <div className="flex items-center justify-center gap-2">Client <SortIcon column="name" /></div>
                </TableHead>
                <TableHead className="font-black text-foreground text-center">Téléphone</TableHead>
                <TableHead 
                  className="text-center font-black text-foreground cursor-pointer group"
                  onClick={() => handleSort('debt')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Dette <SortIcon column="debt" />
                  </div>
                </TableHead>
                <TableHead className="text-center font-black text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isCustomersLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : indebtedCustomers.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20 opacity-30 italic font-black">Aucune dette en cours</TableCell></TableRow>
              ) : indebtedCustomers.map((c) => (
                <TableRow key={c.id} className="group border-border hover:bg-muted/30 transition-all">
                  <TableCell>
                    <div className="flex items-center justify-center gap-3">
                       <div className="hidden sm:flex h-9 w-9 rounded-xl bg-primary/10 items-center justify-center text-primary">
                          <User className="h-5 w-5" />
                       </div>
                       <span className="font-bold text-foreground text-xs md:sm">{c.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-muted-foreground tabular-nums text-center text-[10px] md:text-xs">{c.phone}</TableCell>
                  <TableCell className="text-center font-black text-red-600 text-sm md:text-lg tabular-nums">
                    {c.debt.toLocaleString()} DZD
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"
                        onClick={() => handleSendDebtReport(c)}
                        disabled={isSendingReport === c.id}
                        title="Envoyer Relevé WhatsApp (FR)"
                      >
                        {isSendingReport === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="h-9 md:h-10 px-3 md:px-4 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white font-black text-[10px] md:text-xs gap-1 md:gap-2 transition-all"
                        onClick={() => fetchCustomerInvoices(c)}
                      >
                        <span className="hidden sm:inline">Détails Factures</span>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent dir="rtl" className="max-w-4xl w-[95%] glass border-none rounded-[2.5rem] md:rounded-[3rem] shadow-2xl p-0 overflow-hidden z-[210] max-h-[90vh] flex flex-col">
          <DialogHeader className="p-6 md:p-8 bg-primary/5 border-b border-border shrink-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div className="flex items-center gap-3">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-[1.2rem] bg-primary/10 flex items-center justify-center text-primary">
                    <History className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col">
                    <DialogTitle className="text-lg md:text-2xl font-black text-gradient-premium leading-tight">Factures de : {selectedCustomer?.name}</DialogTitle>
                    <p className="text-[10px] font-bold text-muted-foreground">Liste des impayés</p>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="px-4 py-2 rounded-xl font-black text-xs md:text-sm shadow-lg shadow-destructive/10">
                    Total Reste: {selectedCustomer?.debt.toLocaleString()} DZD
                  </Badge>
                  <Button onClick={() => setIsBulkOpen(true)} className="h-10 px-4 rounded-xl bg-emerald-600 text-white font-black gap-2 shadow-lg shadow-emerald-500/20">
                     <Coins className="h-4 w-4" /> Paiement Global
                  </Button>
               </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 custom-scrollbar">
            {isLoadingInvoices ? (
              <div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></div>
            ) : customerInvoices.length === 0 ? (
              <div className="py-20 text-center opacity-30 italic font-black text-foreground">Aucun impayé trouvé</div>
            ) : (
              <div className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                   <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Information</p>
                   <p className="text-xs font-bold text-muted-foreground leading-relaxed italic text-center">Les factures sont classées de la plus récente à la plus ancienne.</p>
                </div>
                {customerInvoices.map((inv) => (
                  <div key={inv.id} className="p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] glass border-white/10 flex flex-col sm:flex-row sm:items-center justify-between group hover:bg-white/40 transition-all gap-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:gap-8 flex-1">
                       <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                             <span className="text-[8px] md:text-[10px] font-black text-primary uppercase text-center">N° Facture</span>
                             <span className="font-black text-foreground text-xs md:sm text-center">#{inv.id.slice(0, 8)}</span>
                          </div>
                          <div className="h-8 w-px bg-border mx-2 hidden sm:block" />
                          <div className="flex flex-col">
                             <span className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase text-center">Date</span>
                             <span className="font-bold text-[10px] md:text-xs text-foreground text-center">
                               {inv.createdAt?.toDate ? format(inv.createdAt.toDate(), "dd/MM/yyyy", { locale: fr }) : "---"}
                             </span>
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 md:gap-8 bg-black/5 sm:bg-transparent p-3 sm:p-0 rounded-xl flex-1">
                          <div className="flex flex-col items-center">
                             <span className="text-[8px] md:text-[9px] font-black text-muted-foreground uppercase text-center">Total</span>
                             <span className="font-black text-foreground tabular-nums text-xs md:sm">{inv.totalAmount.toLocaleString()} DZD</span>
                          </div>
                          <div className="flex flex-col items-center">
                             <span className="text-[8px] md:text-[9px] font-black text-emerald-500 uppercase text-center">Payé</span>
                             <span className="font-black text-emerald-600 tabular-nums text-xs md:sm">{inv.paidAmount.toLocaleString()} DZD</span>
                          </div>
                          <div className="flex flex-col items-center col-span-2 sm:col-span-1 border-t sm:border-none border-white/10 pt-2 sm:pt-0">
                             <span className="text-[8px] md:text-[9px] font-black text-red-500 uppercase text-center">Reste (Dette)</span>
                             <span className="font-black text-red-600 tabular-nums text-sm md:text-lg">{(inv.totalAmount - inv.paidAmount).toLocaleString()} DZD</span>
                          </div>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-2 justify-end pt-3 sm:pt-0 border-t sm:border-none border-white/5">
                       <Button 
                        variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-primary/10 text-primary"
                        onClick={() => fetchInvoiceItems(inv)}
                        title="Aperçu"
                       >
                         <Eye className="h-4 w-4" />
                       </Button>
                       <Button 
                        variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-orange-500/10 text-orange-600"
                        onClick={() => handleUpdatePayment(inv)}
                        title="Mettre à jour"
                       >
                         <Edit3 className="h-4 w-4" />
                       </Button>
                       <Button 
                        variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive"
                        onClick={() => handleDeleteDebtInvoice(inv)}
                        title="Supprimer"
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-6 bg-black/5 text-center shrink-0">
             <Button className="rounded-2xl px-12 h-12 font-black shadow-lg" onClick={() => setSelectedCustomer(null)}>Fermer l'Historique</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
         <DialogContent dir="rtl" className="glass border-none rounded-[2.5rem] shadow-2xl z-[300] max-w-md w-[95%]">
            <DialogHeader>
               <DialogTitle className="text-2xl font-black text-gradient-premium flex items-center justify-center gap-3">
                  <Coins className="h-6 w-6 text-emerald-500" /> Versement Global
               </DialogTitle>
               <DialogDescription className="font-bold text-xs mt-2 text-center">
                  Le montant sera réparti automatiquement sur les factures de {selectedCustomer?.name} en commençant par les plus récentes.
               </DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-6">
               <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex justify-between items-center">
                  <span className="text-xs font-black text-emerald-600">Dette totale client :</span>
                  <span className="text-lg font-black text-red-600 tabular-nums">{selectedCustomer?.debt.toLocaleString()} DZD</span>
               </div>

               <div className="space-y-2">
                  <Label className="font-black text-[10px] text-primary uppercase px-1 text-center block">Montant reçu</Label>
                  <Input 
                    type="number" 
                    value={bulkAmount} 
                    onChange={(e) => setBulkAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="h-14 glass border-none rounded-2xl font-black text-2xl text-emerald-600 text-center focus:ring-emerald-500" 
                    placeholder="0.00"
                    autoFocus
                  />
               </div>

               {bulkAmount !== "" && Number(bulkAmount) > 0 && (
                  <div className="p-4 rounded-2xl bg-black/5 space-y-2">
                     <div className="flex justify-between text-[10px] font-bold">
                        <span>Montant à répartir :</span>
                        <span className="tabular-nums">{Number(bulkAmount).toLocaleString()} DZD</span>
                     </div>
                     <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                        <span>Solde final après versement :</span>
                        <span className="tabular-nums">{Math.max(0, (selectedCustomer?.debt || 0) - Number(bulkAmount)).toLocaleString()} DZD</span>
                     </div>
                  </div>
               )}
            </div>

            <DialogFooter className="gap-2">
               <Button variant="outline" className="rounded-xl h-12 font-bold flex-1" onClick={() => setIsBulkOpen(false)}>Annuler</Button>
               <Button 
                onClick={handleProcessBulkPayment} 
                disabled={isProcessingBulk || !bulkAmount || Number(bulkAmount) <= 0}
                className="rounded-xl h-12 font-black bg-emerald-600 text-white flex-1 shadow-lg shadow-emerald-500/20"
               >
                  {isProcessingBulk ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Confirmer le paiement
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      <Dialog open={!!selectedInvoiceForItems} onOpenChange={() => setSelectedInvoiceForItems(null)}>
        <DialogContent dir="rtl" className="max-w-2xl w-[90%] glass border-none rounded-[2.5rem] shadow-2xl p-0 overflow-hidden z-[220]">
          <DialogHeader className="p-6 md:p-8 bg-accent/5 border-b border-border">
            <DialogTitle className="text-xl md:text-2xl font-black text-gradient-premium flex items-center justify-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              Contenu Facture #{selectedInvoiceForItems?.id.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 md:p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 gap-4 glass p-4 rounded-2xl border-white/10">
                <div className="text-center">
                   <p className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Client</p>
                   <p className="font-bold text-foreground text-xs md:sm">{selectedInvoiceForItems?.customerName}</p>
                </div>
                <div className="text-center border-r border-white/10">
                   <p className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Date</p>
                   <p className="font-bold text-[10px] md:text-xs text-foreground">
                    {selectedInvoiceForItems?.createdAt?.toDate ? format(selectedInvoiceForItems.createdAt.toDate(), "dd/MM/yyyy HH:mm", { locale: fr }) : "---"}
                   </p>
                </div>
             </div>

             <div className="space-y-3">
                <p className="font-black text-xs text-primary px-2 uppercase tracking-widest text-center">Produits inclus</p>
                <div className="space-y-2">
                   {isLoadingItems ? (
                     <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
                   ) : invoiceItems.length === 0 ? (
                     <div className="py-10 text-center opacity-30 italic font-black text-xs">Aucun élément</div>
                   ) : invoiceItems.map((item) => (
                     <div key={item.id} className="flex items-center justify-between p-4 glass rounded-xl border-white/10">
                        <div className="flex items-center gap-3">
                           <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                              <ShoppingBag className="h-4 w-4" />
                           </div>
                           <div className="flex flex-col">
                              <p className="text-xs font-black text-foreground">{item.productName}</p>
                              <p className="text-[9px] text-muted-foreground font-bold tabular-nums">
                                {item.quantity} × {item.unitPrice.toLocaleString()} DZD
                              </p>
                           </div>
                        </div>
                        <p className="font-black text-xs md:sm text-primary tabular-nums">{item.itemTotal.toLocaleString()} DZD</p>
                     </div>
                   ))}
                </div>
             </div>

             <div className="pt-6 border-t border-white/10 flex justify-between items-center px-2">
                <span className="text-sm md:text-lg font-black text-foreground">Total Facture :</span>
                <span className="text-lg md:text-2xl font-black text-primary tabular-nums">{selectedInvoiceForItems?.totalAmount.toLocaleString()} DZD</span>
             </div>
          </div>

          <div className="p-6 bg-black/5 text-center">
             <Button variant="outline" className="rounded-xl px-12 h-11 font-black" onClick={() => setSelectedInvoiceForItems(null)}>Fermer l'aperçu</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
