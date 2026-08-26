
"use client"

import * as React from "react"
import { 
  FileText, 
  Search, 
  Printer, 
  Eye, 
  ArrowRight,
  Loader2,
  Calendar,
  User,
  ShoppingBag,
  ChevronLeft,
  Trash2,
  Edit3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Smartphone,
  QrCode,
  Maximize2,
  UserCog,
  MessageCircle,
  Download,
  Share2,
  Filter,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, getDocs, doc, increment, getDoc } from "firebase/firestore"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ar, fr } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc' | null;
}

export default function InvoiceHistoryPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedCustomerIdFilter, setSelectedCustomerIdFilter] = React.useState("all")
  const [selectedInvoice, setSelectedInvoice] = React.useState<any>(null)
  const [invoiceItems, setInvoiceItems] = React.useState<any[]>([])
  const [paymentHistory, setPaymentHistory] = React.useState<any[]>([])
  const [isLoadingItems, setIsLoadingItems] = React.useState(false)
  const [isSharingPDF, setIsSharingPDF] = React.useState(false)
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: 'createdAt', direction: 'desc' })
  const [zoomQR, setZoomQR] = React.useState<{ code: string, id: string } | null>(null)

  const invoicesRef = useMemoFirebase(() => query(collection(db, "invoices")), [db])
  const { data: invoices, isLoading } = useCollection(invoicesRef)

  const customersRef = useMemoFirebase(() => collection(db, "customers"), [db])
  const { data: customers } = useCollection(customersRef)

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'desc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'desc') direction = 'asc';
      else if (sortConfig.direction === 'asc') direction = null;
    }
    setSortConfig({ key, direction });
  }

  const sortedInvoices = React.useMemo(() => {
    if (!invoices) return [];
    let items = [...invoices].filter(inv => {
      const matchSearch = inv.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.generatedByUserName && inv.generatedByUserName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchCustomer = selectedCustomerIdFilter === "all" || inv.customerId === selectedCustomerIdFilter;
      
      return matchSearch && matchCustomer;
    });

    if (sortConfig.key && sortConfig.direction) {
      items.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'remainingDebt') {
          aValue = a.totalAmount - a.paidAmount;
          bValue = b.totalAmount - b.paidAmount;
        } else if (sortConfig.key === 'status') {
          // Status order priority
          const statusOrder = { 'Unpaid': 2, 'Partial': 1, 'Paid': 0 };
          aValue = statusOrder[a.status as keyof typeof statusOrder] || 0;
          bValue = statusOrder[b.status as keyof typeof statusOrder] || 0;
        } else {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        }
        
        if (sortConfig.key === 'createdAt') {
           const timeA = aValue?.toDate ? aValue.toDate().getTime() : (aValue instanceof Date ? aValue.getTime() : 0);
           const timeB = bValue?.toDate ? bValue.toDate().getTime() : (bValue instanceof Date ? bValue.getTime() : 0);
           return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [invoices, searchTerm, selectedCustomerIdFilter, sortConfig]);

  const handleDeleteInvoice = async (id: string) => {
    if (confirm("Voulez-vous vraiment supprimer cette facture ? Le stock sera réintégré.")) {
      try {
        const itemsRef = collection(db, "invoices", id, "items")
        const snapshot = await getDocs(itemsRef)
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

        items.forEach((item: any) => {
          if (item.productId && !item.productId.startsWith('manual-')) {
            const productRef = doc(db, "products", item.productId)
            updateDocumentNonBlocking(productRef, {
              quantity: increment(item.quantity)
            })
          }
        })

        const docRef = doc(db, "invoices", id)
        deleteDocumentNonBlocking(docRef)
        
        toast({ 
          title: "Facture supprimée", 
          description: "Le stock a été mis à jour avec succès" 
        })
      } catch (error) {
        console.error("Error deleting invoice:", error)
        toast({ variant: "destructive", title: "Erreur opération" })
      }
    }
  }

  const handleViewDetails = async (invoice: any) => {
    setSelectedInvoice(invoice)
    setIsLoadingItems(true)
    setInvoiceItems([])
    setPaymentHistory([])
    try {
      const itemsRef = collection(db, "invoices", invoice.id, "items")
      const itemsSnap = await getDocs(itemsRef)
      const items = itemsSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          productName: data.productName,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          itemTotal: data.itemTotal || (data.quantity * data.unitPrice),
          ...data
        }
      });
      setInvoiceItems(items)

      const paymentsRef = collection(db, "invoices", invoice.id, "payments")
      const paymentsSnap = await getDocs(paymentsRef)
      const payments = paymentsSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })).sort((a: any, b: any) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tA - tB;
      });
      setPaymentHistory(payments)

      return { items, payments };
    } catch (error) {
      console.error("Error fetching invoice items:", error)
      return { items: [], payments: [] };
    } finally {
      setIsLoadingItems(false)
    }
  }

  const handleSharePDF = async (invoice: any) => {
    setIsSharingPDF(true);
    try {
      // 1. Ensure we have data loaded
      const data = await handleViewDetails(invoice);
      if (!data.items.length) {
        toast({ title: "Données incomplètes", variant: "destructive" });
        return;
      }

      // 2. Wait for UI to render the detailed view fully
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. Find the element to capture (the actual invoice paper UI in the modal)
      const element = document.getElementById("invoice-capture-target");
      if (!element) throw new Error("Capture target not found");

      // 4. Generate canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });

      // 5. Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], `Invoice_${invoice.id.slice(0, 8)}.pdf`, { type: 'application/pdf' });

      // 6. Sharing
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: `Facture #${invoice.id.slice(0, 8)}`,
          text: `Bonjour ${invoice.customerName}, voici votre facture de chez EXPRESS PHONE.`
        });
      } else {
        // Fallback: Download
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Invoice_${invoice.id.slice(0, 8)}.pdf`;
        a.click();
        toast({ title: "PDF généré", description: "Votre navigateur ne supporte pas le partage direct. Le fichier a été téléchargé." });
      }

    } catch (error) {
      console.error("PDF generation failed:", error);
      toast({ title: "Erreur PDF", description: "Échec de génération du fichier.", variant: "destructive" });
    } finally {
      setIsSharingPDF(false);
    }
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="h-3 w-3 text-primary" />;
    if (sortConfig.direction === 'desc') return <ArrowDown className="h-3 w-3 text-primary" />;
    return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  }

  return (
    <div className="min-h-screen bg-transparent">
        <header className="flex h-20 shrink-0 items-center justify-between border-b px-8 glass sticky top-0 z-50 no-print">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#3960AC] to-[#3CC2DD] flex items-center justify-center text-white shadow-lg transform -rotate-3">
                <Smartphone className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-tighter text-[#3960AC]">EXPRESS</span>
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Phone Pro</span>
              </div>
            </Link>
            <div className="h-8 w-px bg-black/5" />
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-gradient">Historique des Ventes</h1>
              <p className="text-[10px] text-muted-foreground font-bold italic uppercase tracking-widest">Suivi complet des opérations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Button asChild variant="outline" className="h-11 px-6 rounded-2xl glass border-white/20 gap-2">
               <Link href="/invoices">
                 <ArrowRight className="h-4 w-4" />
                 Retour aux ventes
               </Link>
             </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 space-y-8">
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="relative w-full md:w-[400px] group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Chercher par facture, client ou employé..." 
                  className="pl-12 h-14 glass border-none shadow-sm rounded-2xl focus:ring-primary font-bold" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="w-full md:w-64">
                <Select value={selectedCustomerIdFilter} onValueChange={setSelectedCustomerIdFilter}>
                  <SelectTrigger className="h-14 glass border-none rounded-2xl font-bold px-6">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-primary" />
                      <SelectValue placeholder="Filtrer par client" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="glass border-none rounded-2xl z-[250]">
                    <SelectItem value="all">Tous les clients</SelectItem>
                    <SelectItem value="walk-in">Client de passage</SelectItem>
                    {customers?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Card className="border-none glass shadow-2xl overflow-hidden rounded-[2.5rem] card-3d">
            <CardContent className="p-0">
              <div className="table-container">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-white/10 hover:bg-transparent">
                      <TableHead className="font-black text-center w-[80px]">QR Code</TableHead>
                      <TableHead className="font-black cursor-pointer select-none group text-center" onClick={() => handleSort('customerName')}>
                        <div className="flex items-center justify-center gap-2">Client <SortIcon column="customerName" /></div>
                      </TableHead>
                      <TableHead className="font-black text-center">Employé</TableHead>
                      <TableHead className="font-black cursor-pointer select-none group text-center" onClick={() => handleSort('createdAt')}>
                        <div className="flex items-center justify-center gap-2">Date <SortIcon column="createdAt" /></div>
                      </TableHead>
                      <TableHead className="font-black cursor-pointer select-none group text-center" onClick={() => handleSort('totalAmount')}>
                        <div className="flex items-center justify-center gap-2"><SortIcon column="totalAmount" /> Montant Total</div>
                      </TableHead>
                      <TableHead className="font-black cursor-pointer select-none group text-center" onClick={() => handleSort('remainingDebt')}>
                        <div className="flex items-center justify-center gap-2">Reste (Dette) <SortIcon column="remainingDebt" /></div>
                      </TableHead>
                      <TableHead className="text-center font-black cursor-pointer select-none group" onClick={() => handleSort('status')}>
                        <div className="flex items-center justify-center gap-2">Statut <SortIcon column="status" /></div>
                      </TableHead>
                      <TableHead className="font-black cursor-pointer select-none group text-center" onClick={() => handleSort('id')}>
                        <div className="flex items-center justify-center gap-2">N° Facture <SortIcon column="id" /></div>
                      </TableHead>
                      <TableHead className="w-[220px] font-black text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && sortedInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-20">
                          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary opacity-20" />
                          <p className="text-sm font-bold text-muted-foreground mt-4">Chargement en cours...</p>
                        </TableCell>
                      </TableRow>
                    ) : sortedInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-20 text-muted-foreground font-bold italic opacity-30">
                          Aucune facture enregistrée
                        </TableCell>
                      </TableRow>
                    ) : sortedInvoices.map((inv) => {
                      const remaining = inv.totalAmount - inv.paidAmount;
                      const status = inv.status || (remaining > 0 ? (inv.paidAmount > 0 ? 'Partial' : 'Unpaid') : 'Paid');
                      
                      return (
                        <TableRow 
                          key={inv.id} 
                          id={`inv-${inv.id}`}
                          className="border-b border-white/5 hover:bg-white/30 transition-all duration-300 group target:bg-primary/10 target:animate-pulse"
                        >
                          <TableCell className="text-center">
                            <div 
                              className="h-10 w-10 mx-auto bg-white p-1 rounded-lg shadow-sm border border-black/5 cursor-pointer hover:scale-110 transition-transform flex items-center justify-center relative group/qr-cell"
                              onClick={() => setZoomQR({ id: inv.id, code: inv.id })}
                            >
                              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${typeof window !== 'undefined' ? window.location.origin : ''}/invoices/history#inv-${inv.id}`} className="w-full h-full" alt="INV QR" />
                              <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover/qr-cell:opacity-100 transition-opacity">
                                 <Maximize2 className="h-3 w-3 text-white" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                             <div className="flex items-center justify-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                   <User className="h-4 w-4 text-primary" />
                                </div>
                                <span className="font-bold">{inv.customerName}</span>
                             </div>
                          </TableCell>
                          <TableCell className="text-center">
                             <div className="flex flex-col items-center justify-center">
                                <span className="text-[10px] font-black text-muted-foreground/60 uppercase">Par</span>
                                <div className="flex items-center gap-1 mt-0.5">
                                   <UserCog className="h-3 w-3 text-muted-foreground" />
                                   <span className="text-[11px] font-black">{inv.generatedByUserName || "Inconnu"}</span>
                                </div>
                             </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground font-bold text-xs tabular-nums text-center">
                            {inv.createdAt?.toDate 
                              ? format(inv.createdAt.toDate(), "dd MMMM yyyy - HH:mm", { locale: fr }) 
                              : (inv.createdAt instanceof Date ? format(inv.createdAt, "dd MMMM yyyy - HH:mm", { locale: fr }) : "---")}
                          </TableCell>
                          <TableCell className="text-center font-black tabular-nums text-lg text-primary">
                            {inv.totalAmount.toLocaleString()} DZD
                          </TableCell>
                          <TableCell className="text-center">
                            {remaining > 0 ? (
                              <span className="font-black text-red-600 tabular-nums">{(remaining).toLocaleString()} DZD</span>
                            ) : (
                              <span className="font-bold text-emerald-600">Payée</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {status === 'Paid' ? (
                              <Badge variant="success" className="bg-emerald-500/10 text-emerald-600 border-none px-4 rounded-lg">Complète</Badge>
                            ) : status === 'Partial' ? (
                              <Badge variant="warning" className="bg-orange-500/10 text-orange-600 border-none px-4 rounded-lg">Partielle</Badge>
                            ) : (
                              <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-none px-4 rounded-lg">Impayée</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-black tabular-nums text-primary text-center">#{inv.id.slice(0, 8)}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2 opacity-100 md:opacity-40 group-hover:opacity-100 transition-opacity">
                               <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 rounded-xl bg-white/50 hover:bg-emerald-500 hover:text-white text-emerald-600"
                                onClick={() => handleSharePDF(inv)}
                                disabled={isSharingPDF && selectedInvoice?.id === inv.id}
                                title="Partager PDF via WhatsApp"
                               >
                                 {isSharingPDF && selectedInvoice?.id === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                               </Button>
                               <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 rounded-xl bg-white/50 hover:bg-primary hover:text-white"
                                onClick={() => handleViewDetails(inv)}
                                title="Détails"
                               >
                                 <Eye className="h-4 w-4" />
                               </Button>
                               <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 rounded-xl bg-white/50 hover:bg-orange-500 hover:text-white"
                                onClick={() => router.push(`/invoices?editId=${inv.id}`)}
                                title="Modifier"
                               >
                                 <Edit3 className="h-4 w-4" />
                               </Button>
                               <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 rounded-xl bg-white/50 hover:bg-destructive hover:text-white"
                                onClick={() => handleDeleteInvoice(inv.id)}
                                title="Supprimer"
                               >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
            <DialogContent dir="rtl" className="max-w-md glass border-none rounded-[2rem] shadow-2xl p-0 overflow-hidden z-[210] flex flex-col h-[90vh]">
               <DialogHeader className="p-4 bg-primary/5 border-b border-border shrink-0">
                  <DialogTitle className="text-xl font-black text-center text-primary">Détails de la Facture</DialogTitle>
               </DialogHeader>

               <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 bg-black/5 custom-scrollbar">
                  <div className="flex flex-col items-center min-h-full py-4">
                    <div id="invoice-capture-target" className="bg-white text-black w-full max-w-[350px] shadow-2xl p-4 sm:p-6 md:p-8 rounded-sm space-y-4 sm:space-y-6 text-[11px] sm:text-[12px] border border-black/10 select-none mx-auto">
                       <div className="text-center space-y-1 border-b-2 border-black pb-4">
                          <h2 className="text-lg sm:text-2xl font-black leading-none">EXPRESS PHONE</h2>
                          <p className="text-[9px] sm:text-[10px] font-bold">Services & Ventes Mobiles</p>
                          <p className="text-[9px] sm:text-[10px] tabular-nums">
                            {selectedInvoice?.createdAt?.toDate 
                              ? format(selectedInvoice.createdAt.toDate(), "dd/MM/yyyy HH:mm", { locale: fr }) 
                              : (selectedInvoice?.createdAt instanceof Date ? format(selectedInvoice.createdAt, "dd/MM/yyyy HH:mm", { locale: fr }) : "---")}
                          </p>
                       </div>

                       <div className="space-y-1">
                          <p className="font-bold">N° Facture: <span className="tabular-nums">#{selectedInvoice?.id.slice(0, 8)}</span></p>
                          <p>Client: {selectedInvoice?.customerName || "Passant"}</p>
                          <p>Employé: {selectedInvoice?.generatedByUserName || "Inconnu"}</p>
                          <p className="flex items-center gap-2">Statut: 
                             <Badge className={cn("px-2 py-0 h-5 text-[9px] font-black border-none", 
                                selectedInvoice?.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 
                                selectedInvoice?.status === 'Partial' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700')}>
                                {selectedInvoice?.status === 'Paid' ? 'Payée' : selectedInvoice?.status === 'Partial' ? 'Partielle' : 'Impayée'}
                             </Badge>
                          </p>
                       </div>

                       <table className="w-full text-left">
                          <thead className="border-b border-black">
                            <tr>
                               <th className="py-2 text-right">Produit</th>
                               <th className="py-2 text-center">Qté</th>
                               <th className="py-2 text-left">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/10">
                            {isLoadingItems ? (
                              <tr><td colSpan={3} className="py-4"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></td></tr>
                            ) : invoiceItems.map((item) => (
                              <tr key={item.id}>
                                 <td className="py-2 text-right font-bold break-words">{item.productName}</td>
                                 <td className="py-2 text-center tabular-nums">{item.quantity}</td>
                                 <td className="py-2 text-left tabular-nums">{item.itemTotal?.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                       </table>

                       <div className="space-y-1 border-t border-black pt-4">
                          <div className="flex justify-between">
                            <span>Sous-total:</span> 
                            <span className="tabular-nums">{(selectedInvoice?.totalAmount + (selectedInvoice?.discount || 0)).toLocaleString()} DZD</span>
                          </div>
                          {selectedInvoice?.discount > 0 && (
                            <div className="flex justify-between">
                              <span>Remise:</span> 
                              <span className="tabular-nums">-{selectedInvoice.discount.toLocaleString()} DZD</span>
                            </div>
                          )}
                          <div className="flex justify-between font-black text-sm sm:text-base border-t-2 border-double border-black pt-2">
                             <span>NET À PAYER:</span> <span className="tabular-nums">{selectedInvoice?.totalAmount.toLocaleString()} DZD</span>
                          </div>
                          <div className="flex justify-between text-[10px] sm:text-[11px]">
                            <span>Cumul Versé:</span> 
                            <span className="tabular-nums">{selectedInvoice?.paidAmount?.toLocaleString()} DZD</span>
                          </div>
                          {(selectedInvoice?.totalAmount - selectedInvoice?.paidAmount) > 0 && (
                            <div className="flex justify-between text-red-600 font-bold">
                              <span>Reste (Dette):</span> 
                              <span className="tabular-nums">{(selectedInvoice.totalAmount - selectedInvoice.paidAmount).toLocaleString()} DZD</span>
                            </div>
                          )}
                       </div>

                       {/* Payment History Section */}
                       {paymentHistory.length > 0 && (
                          <div className="pt-4 border-t border-black space-y-2">
                             <p className="font-black text-[10px] uppercase text-center border-b border-dashed border-black pb-1">Sujet des versements</p>
                             <table className="w-full text-[9px]">
                                <thead>
                                   <tr className="border-b border-black/10">
                                      <th className="py-1 text-right">Date</th>
                                      <th className="py-1 text-center">Montant</th>
                                      <th className="py-1 text-left">Reste</th>
                                   </tr>
                                </thead>
                                <tbody>
                                   {paymentHistory.map((p, idx) => (
                                      <tr key={p.id} className="opacity-80">
                                         <td className="py-1 text-right">{p.createdAt?.toDate ? format(p.createdAt.toDate(), "dd/MM/yy HH:mm", { locale: fr }) : "---"}</td>
                                         <td className="py-1 text-center font-bold">{p.amount.toLocaleString()}</td>
                                         <td className="py-1 text-left">{p.remainingAmount.toLocaleString()}</td>
                                      </tr>
                                   ))}
                                </tbody>
                             </table>
                          </div>
                       )}

                       <div className="flex flex-col items-center pt-6 border-t border-dashed border-black/30">
                          <img 
                            className="w-20 h-20 sm:w-24 sm:h-24" 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${typeof window !== 'undefined' ? window.location.origin : ''}/invoices/history#inv-${selectedInvoice?.id}`} 
                            alt="QR" 
                          />
                          <p className="mt-4 font-black text-xs sm:text-sm">Merci de votre visite</p>
                       </div>
                    </div>
                  </div>
               </div>

               <div className="p-4 bg-white border-t border-border flex flex-col gap-2 shrink-0">
                  <Button 
                    className="w-full h-12 rounded-xl bg-emerald-600 text-white font-black shadow-lg flex gap-2 justify-center" 
                    onClick={() => handleSharePDF(selectedInvoice)}
                    disabled={isSharingPDF}
                  >
                     {isSharingPDF ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />} 
                     Partager Facture PDF (WhatsApp)
                  </Button>
                  <Button variant="outline" className="w-full h-11 rounded-xl font-bold border-white/20" onClick={() => setSelectedInvoice(null)}>Fermer</Button>
               </div>
            </DialogContent>
          </Dialog>

          <Dialog open={!!zoomQR} onOpenChange={() => setZoomQR(null)}>
            <DialogContent dir="rtl" className="glass border-none rounded-[3rem] shadow-2xl p-0 overflow-hidden z-[400] max-w-sm">
               <DialogHeader className="p-6 bg-primary/5 border-b border-white/5">
                  <DialogTitle className="text-xl font-black text-center">QR Code Facture</DialogTitle>
               </DialogHeader>
               <div className="p-10 flex flex-col items-center gap-6 bg-white">
                  <div className="p-4 bg-white rounded-3xl shadow-2xl border border-black/5">
                     <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${typeof window !== 'undefined' ? window.location.origin : ''}/invoices/history#inv-${zoomQR?.id}`} className="h-64 w-64" alt="Enlarged QR" />
                  </div>
                  <div className="flex flex-col items-center">
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Scanneز pour accéder à la facture</p>
                     <p className="text-lg font-mono font-black text-primary mt-2 text-center">#{zoomQR?.id.slice(0, 15)}</p>
                  </div>
               </div>
               <div className="p-6 bg-black/5 flex justify-center">
                  <Button onClick={() => setZoomQR(null)} className="rounded-2xl px-12 h-12 font-black shadow-lg">Fermer</Button>
               </div>
            </DialogContent>
          </Dialog>

          <div className="flex justify-center text-muted-foreground/30 text-[10px] font-black italic gap-2 py-4">
            <span>EXPRESS PHONE PRO • SECURE AUDIT LOGS</span>
          </div>
        </main>
    </div>
  )
}
