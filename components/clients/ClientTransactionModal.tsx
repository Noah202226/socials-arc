"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { 
  X, 
  DollarSign, 
  Plus, 
  Trash2, 
  Loader2, 
  Check, 
  Server, 
  Calendar, 
  Activity, 
  AlertTriangle, 
  Repeat, 
  Paperclip, 
  Tag, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Receipt, 
  FileText,
  Search,
  Filter,
  Copy,
  ExternalLink,
  Info,
  CheckCircle2,
  ChevronRight,
  Download,
  Clock,
  Layers,
  Globe
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrencyCents } from "@/lib/currency";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, getCategoryLabel } from "@/lib/finance-categories";

interface ClientTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: Id<"workspaces">;
  clientId: Id<"clients">;
  clientName: string;
  currencyCode?: string;
}

const TRANSACTION_PRESETS = [
  {
    label: "Hetzner Cloud VPS",
    type: "expense" as const,
    category: "cloud_vps_hosting",
    description: "Hetzner Cloud VPS (CPX21 3 vCPU / 4GB RAM)",
    frequency: "monthly" as const,
    defaultAmount: "1200.00",
    icon: Server,
    badge: "Cloud Server",
  },
  {
    label: "AWS / Cloud Infrastructure",
    type: "expense" as const,
    category: "cloud_vps_hosting",
    description: "AWS Cloud Hosting & Database Services",
    frequency: "monthly" as const,
    defaultAmount: "2500.00",
    icon: Server,
    badge: "Cloud Server",
  },
  {
    label: "Domain & SSL Renewal",
    type: "expense" as const,
    category: "cloud_vps_hosting",
    description: "Annual Domain Registration & Wildcard SSL Certificate",
    frequency: "yearly" as const,
    defaultAmount: "750.00",
    icon: Globe,
    badge: "Domain/SSL",
  },
  {
    label: "Tools & SaaS License",
    type: "expense" as const,
    category: "software_subscriptions",
    description: "Workspace Analytics & Client Automation Software",
    frequency: "monthly" as const,
    defaultAmount: "850.00",
    icon: Tag,
    badge: "SaaS Tools",
  },
  {
    label: "Monthly Client Retainer",
    type: "income" as const,
    category: "retainer_fee",
    description: "Monthly Social Media Management & Dev Retainer",
    frequency: "monthly" as const,
    defaultAmount: "15000.00",
    icon: DollarSign,
    badge: "Retainer",
  },
];

export default function ClientTransactionModal({
  isOpen,
  onClose,
  workspaceId,
  clientId,
  clientName,
  currencyCode = "PHP",
}: ClientTransactionModalProps) {
  // Query transactions for this client (direct & social pages)
  const clientTxs = useQuery(
    api.transactions.listByClient,
    isOpen && clientId ? { clientId } : "skip"
  );

  const createTx = useMutation(api.transactions.create);
  const deleteTx = useMutation(api.transactions.deleteTransaction);
  const generateReceiptUrl = useMutation(api.transactions.generateReceiptUploadUrl);

  const [activeTab, setActiveTab] = useState<"history" | "new">("history");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmTx, setDeleteConfirmTx] = useState<{ id: Id<"transactions">; description?: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Selected Transaction State for Deep Inspector
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  // Filter & Search State for History Tab
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "cloud" | "expense" | "income">("all");

  // Form State for Log Tab
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("cloud_vps_hosting");
  const [amountInput, setAmountInput] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<"one_time" | "monthly" | "yearly">("monthly");
  const [dateStr, setDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-select first transaction if available and none currently selected
  useEffect(() => {
    if (clientTxs && clientTxs.length > 0) {
      if (!selectedTxId || !clientTxs.some((t) => t._id === selectedTxId)) {
        setSelectedTxId(clientTxs[0]._id);
      }
    } else {
      setSelectedTxId(null);
    }
  }, [clientTxs, selectedTxId]);

  const resetForm = () => {
    setType("expense");
    setCategory("cloud_vps_hosting");
    setAmountInput("");
    setDescription("");
    setFrequency("monthly");
    setDateStr(new Date().toISOString().split("T")[0]);
    setReceiptFiles([]);
    setErrors({});
  };

  const applyPreset = (preset: typeof TRANSACTION_PRESETS[0]) => {
    setType(preset.type);
    setCategory(preset.category);
    setDescription(preset.description);
    setFrequency(preset.frequency);
    if (preset.defaultAmount) {
      setAmountInput(preset.defaultAmount);
    }
    setErrors({});
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setReceiptFiles((prev) => [...prev, ...selected]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      newErrors.description = "Please enter a transaction description";
    }

    const trimmedAmount = amountInput.trim();
    if (!trimmedAmount) {
      newErrors.amount = "Amount is required";
    } else {
      const parsedAmount = parseFloat(trimmedAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        newErrors.amount = "Amount must be a positive number";
      }
    }

    if (!category) {
      newErrors.category = "Please select a category";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const first = Object.values(newErrors)[0];
      toast.error(first);
      return;
    }

    setLoading(true);
    try {
      const amountCents = Math.round(parseFloat(trimmedAmount) * 100);
      const isRecurring = frequency === "monthly" || frequency === "yearly";

      // Upload receipts if attached
      const storageIds: Id<"_storage">[] = [];
      for (const file of receiptFiles) {
        const uploadUrl = await generateReceiptUrl({ workspaceId });
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!res.ok) throw new Error("Failed to upload receipt attachment");
        const json = await res.json();
        storageIds.push(json.storageId);
      }

      const txDate = new Date(dateStr).getTime() || Date.now();

      const createdId = await createTx({
        workspaceId,
        clientId,
        type,
        category,
        amount: amountCents,
        currency: currencyCode,
        date: txDate,
        description: trimmedDesc,
        recurring: isRecurring,
        recurrenceInterval: isRecurring ? frequency : undefined,
        billingFrequency: frequency,
        receiptStorageId: storageIds[0] || undefined,
        receiptStorageIds: storageIds.length > 0 ? storageIds : undefined,
      });

      toast.success(`Recorded ${formatCurrencyCents(amountCents, currencyCode)} ${type} for ${clientName}!`);
      resetForm();
      if (createdId && createdId._id) {
        setSelectedTxId(createdId._id);
      }
      setActiveTab("history");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to record transaction");
    } finally {
      setLoading(false);
    }
  };

  const executeDeleteTx = async (txId: Id<"transactions">) => {
    setDeletingId(txId);
    try {
      await deleteTx({ transactionId: txId });
      setDeleteConfirmTx(null);
      toast.success("Transaction removed", {
        description: "Client financial ledger and card metrics updated.",
      });
      if (selectedTxId === txId) {
        setSelectedTxId(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete transaction");
    } finally {
      setDeletingId(null);
    }
  };

  const promptDeleteTx = (txId: Id<"transactions">, txDesc?: string) => {
    setDeleteConfirmTx({ id: txId, description: txDesc });
  };

  const handleDuplicateToForm = (tx: any) => {
    setType(tx.type);
    setCategory(tx.category);
    setDescription(tx.description || "");
    setAmountInput((tx.amount / 100).toFixed(2));
    setFrequency(tx.billingFrequency || (tx.recurring ? (tx.recurrenceInterval || "monthly") : "one_time"));
    setDateStr(new Date().toISOString().split("T")[0]);
    setActiveTab("new");
    toast.info("Pre-filled form with transaction details.");
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  const availableCategories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Compute live client metrics from list
  const totalExpense = (clientTxs || [])
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + t.amount, 0);

  const totalIncome = (clientTxs || [])
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + t.amount, 0);

  const totalCloudSpent = (clientTxs || [])
    .filter(
      (t) =>
        t.category === "cloud_vps_hosting" ||
        t.category === "hosting_services" ||
        t.description?.toLowerCase().includes("hetzner") ||
        t.description?.toLowerCase().includes("vps") ||
        t.description?.toLowerCase().includes("server")
    )
    .reduce((acc, t) => acc + t.amount, 0);

  const netCashflow = totalIncome - totalExpense;

  // Filter transactions for list
  const filteredTxs = (clientTxs || []).filter((tx) => {
    const isCloud =
      tx.category === "cloud_vps_hosting" ||
      tx.category === "hosting_services" ||
      tx.description?.toLowerCase().includes("hetzner") ||
      tx.description?.toLowerCase().includes("vps") ||
      tx.description?.toLowerCase().includes("server");

    if (categoryFilter === "cloud" && !isCloud) return false;
    if (categoryFilter === "expense" && tx.type !== "expense") return false;
    if (categoryFilter === "income" && tx.type !== "income") return false;

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchDesc = tx.description?.toLowerCase().includes(q);
      const matchCat = tx.category.toLowerCase().includes(q) || getCategoryLabel(tx.category).toLowerCase().includes(q);
      const matchAmount = (tx.amount / 100).toString().includes(q);
      if (!matchDesc && !matchCat && !matchAmount) return false;
    }

    return true;
  });

  const selectedTx = (clientTxs || []).find((t) => t._id === selectedTxId) || null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl w-full max-w-5xl xl:max-w-6xl shadow-2xl flex flex-col h-[90vh] max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 relative">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-xs">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-foreground">
                  {clientName}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider">
                  Ledger & Server Billing Hub
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage Hetzner VPS payments, cloud infrastructure costs, retainers, and view in-depth billing analytics.
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Close dialog (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live Client Financial Snapshot Ribbon */}
        <div className="px-6 py-3 bg-card/60 border-b border-border grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0 text-left font-mono">
          <div className="flex flex-col border-r border-border/50 pr-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Income</span>
            <span className="text-sm sm:text-base font-extrabold text-emerald-400">
              +{formatCurrencyCents(totalIncome, currencyCode)}
            </span>
            <span className="text-[9px] text-muted-foreground">From retainers & invoices</span>
          </div>

          <div className="flex flex-col border-r border-border/50 pr-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Expenses</span>
            <span className="text-sm sm:text-base font-extrabold text-rose-400">
              -{formatCurrencyCents(totalExpense, currencyCode)}
            </span>
            <span className="text-[9px] text-muted-foreground">All logged operating bills</span>
          </div>

          <div className="flex flex-col border-r border-border/50 pr-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Server className="h-3 w-3 text-cyan-400" /> Hetzner & Cloud
            </span>
            <span className="text-sm sm:text-base font-extrabold text-cyan-400">
              {formatCurrencyCents(totalCloudSpent, currencyCode)}
            </span>
            <span className="text-[9px] text-muted-foreground">VPS & server subscriptions</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Net Cash Flow</span>
            <span className={`text-sm sm:text-base font-extrabold ${netCashflow >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {netCashflow >= 0 ? "+" : ""}{formatCurrencyCents(netCashflow, currencyCode)}
            </span>
            <span className="text-[9px] text-muted-foreground">Income minus expenses</span>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="px-6 pt-2.5 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === "history"
                  ? "border-[#05ffc4] text-[#05ffc4] bg-card shadow-xs"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Receipt className="h-4 w-4" /> 
              Transactions Ledger ({clientTxs?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("new")}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === "new"
                  ? "border-emerald-500 text-emerald-400 bg-card shadow-xs"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Plus className="h-4 w-4" /> 
              Log New Transaction
            </button>
          </div>

          {activeTab === "history" && (
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground pb-2">
              <span>Select any transaction to inspect detailed cost breakdown & receipts</span>
            </div>
          )}
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          
          {/* TAB 1: HISTORY & MASTER-DETAIL TRANSACTION INSPECTOR */}
          {activeTab === "history" && (
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              
              {/* LEFT COLUMN: Transaction List & Filtering (40-42% Width) */}
              <div className="w-full md:w-[42%] lg:w-[38%] border-r border-border flex flex-col bg-muted/10 h-full overflow-hidden shrink-0">
                
                {/* Search & Category Filter Header */}
                <div className="p-3.5 border-b border-border flex flex-col gap-2.5 shrink-0 bg-card/40">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Search description, amount, category..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-muted/40 text-foreground text-xs focus:outline-hidden focus:border-[#05ffc4]"
                    />
                    {searchFilter && (
                      <button
                        onClick={() => setSearchFilter("")}
                        className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setCategoryFilter("all")}
                      className={`px-2.5 py-1 rounded-md font-bold transition-colors whitespace-nowrap ${
                        categoryFilter === "all"
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:text-foreground border border-border"
                      }`}
                    >
                      All ({clientTxs?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryFilter("cloud")}
                      className={`px-2.5 py-1 rounded-md font-bold transition-colors flex items-center gap-1 whitespace-nowrap ${
                        categoryFilter === "cloud"
                          ? "bg-cyan-500 text-black"
                          : "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20"
                      }`}
                    >
                      <Server className="h-2.5 w-2.5" /> Hetzner/Cloud
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryFilter("expense")}
                      className={`px-2.5 py-1 rounded-md font-bold transition-colors whitespace-nowrap ${
                        categoryFilter === "expense"
                          ? "bg-rose-500 text-white"
                          : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20"
                      }`}
                    >
                      Expenses
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryFilter("income")}
                      className={`px-2.5 py-1 rounded-md font-bold transition-colors whitespace-nowrap ${
                        categoryFilter === "income"
                          ? "bg-emerald-500 text-black"
                          : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                      }`}
                    >
                      Income
                    </button>
                  </div>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                  {clientTxs === undefined ? (
                    <div className="py-16 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                      <span>Loading client ledger...</span>
                    </div>
                  ) : filteredTxs.length === 0 ? (
                    <div className="py-16 px-4 text-center flex flex-col items-center justify-center text-muted-foreground text-xs">
                      <Server className="h-9 w-9 text-muted-foreground/30 mb-2" />
                      <p className="font-bold text-foreground">No matching transactions</p>
                      <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                        {searchFilter ? "Try changing your search keywords." : "No transactions logged under this filter."}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setActiveTab("new")}
                        className="mt-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Log Transaction
                      </Button>
                    </div>
                  ) : (
                    filteredTxs.map((tx) => {
                      const isIncome = tx.type === "income";
                      const isCloud =
                        tx.category === "cloud_vps_hosting" ||
                        tx.category === "hosting_services" ||
                        tx.description?.toLowerCase().includes("hetzner") ||
                        tx.description?.toLowerCase().includes("vps") ||
                        tx.description?.toLowerCase().includes("server");
                      
                      const isSelected = selectedTxId === tx._id;

                      return (
                        <div
                          key={tx._id}
                          onClick={() => setSelectedTxId(tx._id)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-2 relative ${
                            isSelected
                              ? "bg-card border-[#05ffc4] shadow-md shadow-[#05ffc4]/5 ring-1 ring-[#05ffc4]/30"
                              : "bg-card/70 hover:bg-card border-border/80 hover:border-border"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border ${
                                isIncome
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : isCloud
                                    ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              }`}>
                                {isIncome ? <ArrowUpRight className="h-3.5 w-3.5" /> : isCloud ? <Server className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                              </div>

                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-foreground truncate">
                                  {tx.description || getCategoryLabel(tx.category)}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {new Date(tx.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-xs font-bold font-mono ${isIncome ? "text-emerald-400" : "text-rose-400"}`}>
                                {isIncome ? "+" : "-"}{formatCurrencyCents(tx.amount, currencyCode)}
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  promptDeleteTx(tx._id, tx.description);
                                }}
                                className="p-1 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Delete this transaction"
                              >
                                {deletingId === tx._id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-400" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-1 flex-wrap pt-0.5">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/70">
                                {getCategoryLabel(tx.category)}
                              </span>

                              {isCloud && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                  Cloud VPS
                                </span>
                              )}

                              {tx.billingFrequency && tx.billingFrequency !== "one_time" && (
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-0.5">
                                  <Repeat className="h-2 w-2" /> {tx.billingFrequency}
                                </span>
                              )}
                            </div>

                            {((tx.receiptUrls && tx.receiptUrls.length > 0) || tx.receiptUrl) && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5" title="Has receipt file attached">
                                <Paperclip className="h-2.5 w-2.5 text-emerald-400" />
                              </span>
                            )}
                          </div>

                          {isSelected && (
                            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#05ffc4] rounded-r-full" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Deep Transaction Inspector (58-62% Width) */}
              <div className="w-full md:w-[58%] lg:w-[62%] h-full overflow-y-auto p-5 sm:p-7 flex flex-col gap-6 text-left bg-card/30">
                {selectedTx ? (
                  <div className="flex flex-col gap-6">
                    
                    {/* Selected Transaction Top Banner */}
                    <div className="flex items-start justify-between gap-4 pb-5 border-b border-border flex-wrap">
                      <div className="flex flex-col gap-2 min-w-0 max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border ${
                            selectedTx.type === "income"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          }`}>
                            {selectedTx.type === "income" ? "Client Income / Retainer" : "Operational Expense"}
                          </span>

                          <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md bg-muted text-foreground border border-border">
                            {getCategoryLabel(selectedTx.category)}
                          </span>

                          {selectedTx.billingFrequency && selectedTx.billingFrequency !== "one_time" ? (
                            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                              <Repeat className="h-3 w-3" /> Recurring ({selectedTx.billingFrequency})
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                              One-Time Payment
                            </span>
                          )}
                        </div>

                        <h2 className="text-lg sm:text-xl font-black text-foreground break-words">
                          {selectedTx.description || getCategoryLabel(selectedTx.category)}
                        </h2>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {new Date(selectedTx.date).toLocaleDateString(undefined, {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Main Big Amount Box & Header Actions */}
                      <div className="flex flex-col items-end gap-2.5 shrink-0">
                        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col items-end min-w-[170px] shadow-xs">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                            Recorded Amount
                          </span>
                          <span className={`text-2xl font-black font-mono ${
                            selectedTx.type === "income" ? "text-emerald-400" : "text-rose-400"
                          }`}>
                            {selectedTx.type === "income" ? "+" : "-"}{formatCurrencyCents(selectedTx.amount, currencyCode)}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {currencyCode} ({selectedTx.amount} raw cents)
                          </span>
                        </div>

                        {/* Top Prominent Action Bar */}
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDuplicateToForm(selectedTx)}
                            className="text-[11px] h-7 px-2.5 text-foreground font-semibold"
                            title="Duplicate into form"
                          >
                            <Plus className="h-3 w-3 mr-1 text-emerald-400" /> Duplicate
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            disabled={deletingId === selectedTx._id}
                            onClick={() => promptDeleteTx(selectedTx._id, selectedTx.description)}
                            className="text-[11px] h-7 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold"
                            title="Delete this transaction"
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Financial Metrics & Proration Analysis Card */}
                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/80 flex flex-col gap-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-[#05ffc4]" /> Prorated Impact on Client Card
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                        <div className="p-3 rounded-xl bg-card border border-border/60 flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Monthly Pace (MRR/Burn)</span>
                          <span className={`text-sm font-extrabold ${selectedTx.type === "income" ? "text-emerald-400" : "text-amber-400"}`}>
                            {selectedTx.billingFrequency === "one_time"
                              ? "₱0.00/mo (One-Time)"
                              : selectedTx.billingFrequency === "yearly"
                                ? `${formatCurrencyCents(Math.round(selectedTx.amount / 12), currencyCode)}/mo`
                                : `${formatCurrencyCents(selectedTx.amount, currencyCode)}/mo`}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {selectedTx.billingFrequency === "one_time" ? "Non-recurring entry" : "Computed into card burn"}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-card border border-border/60 flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Daily Run Rate</span>
                          <span className={`text-sm font-extrabold ${selectedTx.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                            {selectedTx.billingFrequency === "one_time"
                              ? "₱0.00/day"
                              : selectedTx.billingFrequency === "yearly"
                                ? `${formatCurrencyCents(Math.round(selectedTx.amount / 365), currencyCode)}/day`
                                : `${formatCurrencyCents(Math.round(selectedTx.amount / 30), currencyCode)}/day`}
                          </span>
                          <span className="text-[9px] text-muted-foreground">Paced net recognition</span>
                        </div>

                        <div className="p-3 rounded-xl bg-card border border-border/60 flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Annualized Total</span>
                          <span className="text-sm font-extrabold text-foreground">
                            {selectedTx.billingFrequency === "one_time"
                              ? formatCurrencyCents(selectedTx.amount, currencyCode)
                              : selectedTx.billingFrequency === "yearly"
                                ? formatCurrencyCents(selectedTx.amount, currencyCode)
                                : formatCurrencyCents(selectedTx.amount * 12, currencyCode)}
                          </span>
                          <span className="text-[9px] text-muted-foreground">12-month run rate</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-muted-foreground bg-card/60 p-2.5 rounded-lg border border-border/60 flex items-start gap-2">
                        <Info className="h-4 w-4 text-[#05ffc4] shrink-0 mt-0.5" />
                        <span>
                          {selectedTx.category === "cloud_vps_hosting" || selectedTx.description?.toLowerCase().includes("hetzner")
                            ? "This transaction is automatically tagged as Hetzner & Cloud infrastructure. It increments the Hetzner pill badge on ArcTech Solutions' client card and is subtracted from the client's Daily Net Pace."
                            : selectedTx.type === "income"
                              ? "This revenue transaction contributes directly to the client's monthly recurring revenue (MRR) and boosts net cash flow."
                              : "This operating expense is recognized in the client's P&L and updates the client card's total expense ledger."}
                        </span>
                      </div>
                    </div>

                    {/* Technical & Association Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-card border border-border flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Target Client Account
                        </span>
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          {clientName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ID: {clientId}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-card border border-border flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Channel / Social Page
                        </span>
                        {selectedTx.socialPage ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground">{selectedTx.socialPage.handle}</span>
                            <span className="text-[10px] text-muted-foreground font-mono uppercase px-1 py-0.5 rounded bg-muted border border-border">
                              {selectedTx.socialPage.platform}
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-muted-foreground flex items-center gap-1.5">
                            <Server className="h-3 w-3 text-cyan-400" /> Direct Client Cloud & Server Infrastructure
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {selectedTx.socialPage ? "Tied to specific channel account" : "Client workspace-level infrastructure"}
                        </span>
                      </div>
                    </div>

                    {/* Invoices & Receipts Attachments */}
                    <div className="p-4 rounded-2xl bg-card border border-border flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Paperclip className="h-3.5 w-3.5 text-emerald-400" /> Invoice & Receipt Files
                        </h4>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {(selectedTx.receiptUrls && selectedTx.receiptUrls.length > 0) || selectedTx.receiptUrl
                            ? `${selectedTx.receiptUrls?.length || 1} file(s) attached`
                            : "0 files"}
                        </span>
                      </div>

                      {((selectedTx.receiptUrls && selectedTx.receiptUrls.length > 0) || selectedTx.receiptUrl) ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {((selectedTx.receiptUrls && selectedTx.receiptUrls.length > 0) 
                            ? selectedTx.receiptUrls 
                            : [selectedTx.receiptUrl]
                          ).map((url, i) => (
                            <div key={i} className="p-3 rounded-xl border border-border bg-muted/20 flex flex-col gap-2.5 group">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                                  <span className="text-xs font-bold text-foreground truncate">
                                    Receipt Document #{i + 1}
                                  </span>
                                </div>
                                <a
                                  href={url || undefined}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-bold px-2 py-1 rounded bg-muted hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 transition-colors"
                                >
                                  <ExternalLink className="h-2.5 w-2.5" /> View Full
                                </a>
                              </div>

                              {/* Image Preview thumbnail if image format */}
                              {url && (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative h-28 w-full rounded-lg overflow-hidden border border-border/80 bg-black/40 flex items-center justify-center cursor-pointer group-hover:border-emerald-500/40 transition-colors"
                                >
                                  <img
                                    src={url}
                                    alt="Invoice Receipt"
                                    className="object-contain w-full h-full p-1"
                                    onError={(e) => {
                                      // If not an image (e.g. PDF), hide img and show generic icon
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                  <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                                    Click to inspect invoice
                                  </span>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/10 text-center flex flex-col items-center justify-center gap-1 text-muted-foreground text-xs">
                          <FileText className="h-5 w-5 text-muted-foreground/30" />
                          <span>No invoice or receipt attached to this transaction.</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Sticky Action Footer */}
                    <div className="sticky bottom-0 bg-card/95 backdrop-blur-xs py-3 border-t border-border -mx-5 px-5 sm:-mx-7 sm:px-7 flex items-center justify-between gap-3 flex-wrap mt-auto shadow-lg z-10">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(selectedTx._id, selectedTx._id)}
                          className="text-xs text-muted-foreground hover:text-foreground font-mono"
                        >
                          {copiedId === selectedTx._id ? (
                            <>
                              <Check className="h-3 w-3 mr-1 text-emerald-400" /> Copied ID
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" /> Copy ID
                            </>
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateToForm(selectedTx)}
                          className="text-xs text-foreground font-semibold"
                        >
                          <Plus className="h-3 w-3 mr-1 text-emerald-400" /> Duplicate / Log Another
                        </Button>
                      </div>

                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={deletingId === selectedTx._id}
                        onClick={() => promptDeleteTx(selectedTx._id, selectedTx.description)}
                        className="text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Transaction
                      </Button>
                    </div>

                  </div>
                ) : (
                  <div className="py-24 text-center flex flex-col items-center justify-center text-muted-foreground text-xs">
                    <Server className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="font-bold text-foreground text-sm">Select a transaction from the list</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      Choose any recorded payment on the left to view comprehensive server billing details, proration calculations, and invoices.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: LOG NEW TRANSACTION (2-COLUMN WIDE LAYOUT) */}
          {activeTab === "new" && (
            <div className="flex-1 overflow-y-auto p-5 sm:p-7">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                
                {/* Left Form Controls (7 Columns) */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  
                  {/* Presets Grid */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-amber-400" /> Quick Server & Payment Presets
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {TRANSACTION_PRESETS.map((preset, idx) => {
                        const Icon = preset.icon;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => applyPreset(preset)}
                            className="p-2.5 rounded-xl border border-border hover:border-emerald-500/50 bg-card hover:bg-muted/40 transition-colors flex flex-col items-start gap-1 group text-left"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="p-1 rounded bg-muted group-hover:bg-emerald-500/10 text-muted-foreground group-hover:text-emerald-400 transition-colors">
                                <Icon className="h-3.5 w-3.5" />
                              </span>
                              <span className="text-[9px] font-bold font-mono text-emerald-400">
                                ₱{preset.defaultAmount}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-foreground line-clamp-1">{preset.label}</span>
                            <span className="text-[9px] text-muted-foreground uppercase">{preset.badge}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Transaction Type Toggle & Frequency */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Transaction Type
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-muted/40 border border-border">
                        <button
                          type="button"
                          onClick={() => {
                            setType("expense");
                            if (category === "retainer_fee" || category === "one_off_project") {
                              setCategory("cloud_vps_hosting");
                            }
                          }}
                          className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            type === "expense"
                              ? "bg-rose-600 text-white shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <ArrowDownLeft className="h-3.5 w-3.5" /> Expense / Bill
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setType("income");
                            setCategory("retainer_fee");
                          }}
                          className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            type === "income"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" /> Income / Retainer
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Billing Recurrence
                      </label>
                      <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs focus:outline-hidden focus:border-[#05ffc4]"
                      >
                        <option value="monthly">Monthly Recurring (Adds to Monthly MRR/Burn)</option>
                        <option value="yearly">Yearly Recurring (Prorated Monthly & Daily)</option>
                        <option value="one_time">One-Time Payment (Immediate Entry)</option>
                      </select>
                    </div>
                  </div>

                  {/* Description Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Description *
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Hetzner Cloud VPS CPX21, AWS Production Cluster, Monthly Retainer..."
                      className={`w-full px-3.5 py-2 rounded-xl border bg-card text-foreground text-xs focus:outline-hidden ${
                        errors.description ? "border-rose-500 focus:border-rose-500" : "border-border focus:border-[#05ffc4]"
                      }`}
                      required
                    />
                    {errors.description && (
                      <span className="text-[10px] text-rose-400 font-bold">{errors.description}</span>
                    )}
                  </div>

                  {/* Category, Amount & Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs focus:outline-hidden focus:border-[#05ffc4]"
                      >
                        {availableCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Amount ({currencyCode}) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-muted-foreground font-mono text-xs">
                          {currencyCode === "PHP" ? "₱" : "$"}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={amountInput}
                          onChange={(e) => setAmountInput(e.target.value)}
                          placeholder="e.g. 1200.00"
                          className={`w-full pl-7 pr-3 py-2 rounded-xl border bg-card text-foreground text-xs font-mono focus:outline-hidden ${
                            errors.amount ? "border-rose-500 focus:border-rose-500" : "border-border focus:border-[#05ffc4]"
                          }`}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Transaction Date
                      </label>
                      <input
                        type="date"
                        value={dateStr}
                        onChange={(e) => setDateStr(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-mono focus:outline-hidden focus:border-[#05ffc4]"
                        required
                      />
                    </div>
                  </div>

                  {/* Receipt Upload */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Paperclip className="h-3 w-3" /> Invoice / Receipt File Attachment (Optional)
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={handleFileSelect}
                      className="text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-border file:text-xs file:font-semibold file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
                    />
                    {receiptFiles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {receiptFiles.map((f, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border flex items-center gap-1"
                          >
                            <FileText className="h-2.5 w-2.5 text-emerald-400" />
                            {f.name} ({(f.size / 1024).toFixed(0)} KB)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Form Action Buttons */}
                  <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                    <Button type="button" variant="ghost" onClick={resetForm} className="text-xs">
                      Reset
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading} 
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Recording...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1.5" /> Save Transaction & Update Client Card
                        </>
                      )}
                    </Button>
                  </div>

                </div>

                {/* Right Information & Live Impact Panel (5 Columns) */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  <div className="p-5 rounded-2xl bg-card border border-border flex flex-col gap-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-[#05ffc4]" /> Live Impact Preview
                    </h4>

                    <div className="p-4 rounded-xl bg-muted/20 border border-border/80 flex flex-col gap-2 font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Transaction Value:</span>
                        <span className={`text-base font-black ${type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                          {amountInput ? `${type === "income" ? "+" : "-"}${currencyCode === "PHP" ? "₱" : "$"}${parseFloat(amountInput || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "₱0.00"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                        <span className="text-muted-foreground">Monthly Recognition:</span>
                        <span className="font-bold text-foreground">
                          {frequency === "one_time" 
                            ? "₱0.00/mo (Immediate)"
                            : frequency === "yearly"
                              ? `₱${((parseFloat(amountInput || "0") || 0) / 12).toFixed(2)}/mo`
                              : `₱${(parseFloat(amountInput || "0") || 0).toFixed(2)}/mo`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Daily Run Rate:</span>
                        <span className="font-bold text-foreground">
                          {frequency === "one_time" 
                            ? "₱0.00/day"
                            : frequency === "yearly"
                              ? `₱${((parseFloat(amountInput || "0") || 0) / 365).toFixed(2)}/day`
                              : `₱${((parseFloat(amountInput || "0") || 0) / 30).toFixed(2)}/day`}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5 text-xs text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <Server className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-foreground">Hetzner & VPS Tracking:</strong> Marking category as <span className="text-cyan-400 font-semibold">Cloud & VPS Hosting</span> or typing "Hetzner" in the description automatically aggregates this spend into the client card's Cloud & Servers summary badge.
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <Repeat className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-foreground">Proration Engine:</strong> Recurring expenses calculate monthly burn and daily net pace without altering one-time capital invoices.
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-foreground">Real-Time Sync:</strong> As soon as you save, ArcTech Solutions' client card on your dashboard will immediately update with the new burn and Hetzner totals.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </form>
            </div>
          )}

        </div>

        {/* In-Modal Delete Confirmation Toast */}
        {deleteConfirmTx && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 bg-card/95 backdrop-blur-md border border-rose-500/50 rounded-2xl shadow-2xl p-4 flex items-center gap-4 text-xs animate-in slide-in-from-bottom-5 fade-in duration-200 w-[94%] sm:w-auto max-w-xl">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-xs">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-left min-w-0 flex-1">
              <span className="font-bold text-foreground truncate">
                Delete "{deleteConfirmTx.description || "this transaction"}"?
              </span>
              <span className="text-[11px] text-muted-foreground">
                Permanently erase this record and recalculate client metrics.
              </span>
            </div>
            <div className="flex items-center gap-2 pl-3 border-l border-border shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConfirmTx(null)}
                className="text-xs text-muted-foreground hover:text-foreground h-8 px-3"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={deletingId === deleteConfirmTx.id}
                onClick={() => executeDeleteTx(deleteConfirmTx.id)}
                className="text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white h-8 px-3.5 shadow-xs"
              >
                {deletingId === deleteConfirmTx.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                )}
                Confirm Delete
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
