"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { 
  INCOME_CATEGORIES, 
  EXPENSE_CATEGORIES, 
  getCategoryLabel 
} from "@/lib/finance-categories";
import { 
  Loader2, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar as CalendarIcon, 
  FileText, 
  Link as LinkIcon, 
  Trash2, 
  X as CloseIcon, 
  Sparkles, 
  Repeat, 
  Eye, 
  Search,
  Filter,
  Paperclip,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText as DocIcon,
  Edit2,
  AlertTriangle,
  Package,
  Activity,
  Server
} from "lucide-react";
import { toast } from "sonner";
import { deduplicateIncomingFiles } from "@/lib/file-utils";
import { formatCurrencyCents } from "@/lib/currency";

export default function FinancePage() {
  const params = useParams();
  const slug = params.workspaceSlug as string;

  // Convex Queries
  const workspace = useQuery(api.workspaces.getBySlug, { slug });

  const currencyCode = workspace?.settings?.currency || "PHP";
  
  const transactions = useQuery(
    api.transactions.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  const clients = useQuery(
    api.clients.list,
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  const socialPages = useQuery(
    api.socialPages.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  const posts = useQuery(
    api.posts.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  const projects = useQuery(
    api.projects.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  const netSummary = useQuery(
    api.clientAssets.getClientNetSummary,
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  // Mutations
  const createTx = useMutation(api.transactions.create);
  const updateTx = useMutation(api.transactions.update);
  const deleteTx = useMutation(api.transactions.deleteTransaction);
  const generateReceiptUrl = useMutation(api.transactions.generateReceiptUploadUrl);

  // Filter States
  const [selectedClientFilter, setSelectedClientFilter] = useState("all");
  const [selectedPageFilter, setSelectedPageFilter] = useState("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Form State
  const [activeModal, setActiveModal] = useState<null | "create" | "edit" | "delete">(null);
  const [selectedTx, setSelectedTx] = useState<any>(null);

  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [txClientId, setTxClientId] = useState<string>("all");
  const [txPageId, setTxPageId] = useState("");
  const [txPostId, setTxPostId] = useState("");
  const [txCategory, setTxCategory] = useState("");
  const [txAmount, setTxAmount] = useState(""); // input string (e.g. "12.50")
  const [txCurrency, setTxCurrency] = useState("USD");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [txDescription, setTxDescription] = useState("");
  const [txRecurring, setTxRecurring] = useState(false);
  const [txInterval, setTxInterval] = useState<"weekly" | "monthly" | "yearly">("monthly");
  
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [existingReceipts, setExistingReceipts] = useState<{ storageId: string; url: string }[]>([]);
  const [isDraggingReceiptDropzone, setIsDraggingReceiptDropzone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const availableModalPages = socialPages?.filter(p => txClientId === "all" || p.clientId === txClientId) || [];

  const openCreateModal = () => {
    setSelectedTx(null);
    setTxType("income");
    const initialClientId = selectedClientFilter !== "all" ? selectedClientFilter : "all";
    setTxClientId(initialClientId);
    const matchingPages = socialPages?.filter(p => initialClientId === "all" || p.clientId === initialClientId) || [];
    setTxPageId(matchingPages[0]?._id || socialPages?.[0]?._id || "");
    setTxPostId("");
    setTxCategory(INCOME_CATEGORIES[0]?.id || "");
    setTxAmount("");
    setTxCurrency("USD");
    setTxDate(new Date().toISOString().split("T")[0]);
    setTxDescription("");
    setTxRecurring(false);
    setTxInterval("monthly");
    setExistingReceipts([]);
    setReceiptFiles([]);
    setActiveModal("create");
  };

  const openEditModal = (t: any) => {
    setSelectedTx(t);
    setTxType(t.type);
    const currentPage = socialPages?.find(p => p._id === t.pageId);
    setTxClientId(currentPage?.clientId || "all");
    setTxPageId(t.pageId);
    setTxPostId(t.postId || "");
    setTxCategory(t.category);
    setTxAmount((t.amount / 100).toString());
    setTxCurrency(t.currency || "USD");
    setTxDate(new Date(t.date).toISOString().split("T")[0]);
    setTxDescription(t.description || "");
    setTxRecurring(!!t.recurring);
    setTxInterval(t.recurrenceInterval || "monthly");
    
    // Parse existing receipt attachments
    const receipts: { storageId: string; url: string }[] = [];
    if (t.receiptStorageIds && t.receiptUrls && t.receiptStorageIds.length === t.receiptUrls.length) {
      for (let i = 0; i < t.receiptStorageIds.length; i++) {
        if (t.receiptUrls[i]) {
          receipts.push({ storageId: t.receiptStorageIds[i], url: t.receiptUrls[i] });
        }
      }
    } else if (t.receiptStorageId && t.receiptUrl) {
      receipts.push({ storageId: t.receiptStorageId, url: t.receiptUrl });
    }
    setExistingReceipts(receipts);
    setReceiptFiles([]);
    setActiveModal("edit");
  };

  const openDeleteModal = (t: any) => {
    setSelectedTx(t);
    setActiveModal("delete");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (workspace === undefined || transactions === undefined || clients === undefined || socialPages === undefined || posts === undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm font-medium">Fetching workspace accounts ledger & balances...</p>
      </div>
    );
  }

  if (!workspace) return null;

  // Filter lists based on selected parameters
  const filteredSocialPages = socialPages.filter(p => {
    if (selectedClientFilter === "all") return true;
    return p.clientId === selectedClientFilter;
  });

  // Main filtered transactions list
  const filteredTransactions = (transactions || []).filter((t) => {
    const page = t.pageId ? socialPages.find(p => p._id === t.pageId) : null;
    const client = t.clientId 
      ? clients.find(c => c._id === t.clientId)
      : (page ? clients.find(c => c._id === page.clientId) : null);

    // Filter by client
    if (selectedClientFilter !== "all" && client?._id !== selectedClientFilter) return false;
    
    // Filter by page
    if (selectedPageFilter !== "all" && t.pageId !== selectedPageFilter) return false;

    // Filter by type
    if (selectedTypeFilter !== "all" && t.type !== selectedTypeFilter) return false;

    // Filter by text search
    const matchesSearch = 
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      getCategoryLabel(t.category).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (page && page.handle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (client && client.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
    return matchesSearch;
  });

  // Calculate Rollup totals for the filtered subset
  const rollups: Record<string, { income: number; expense: number; net: number }> = {};
  for (const t of filteredTransactions) {
    const cur = t.currency || "USD";
    if (!rollups[cur]) {
      rollups[cur] = { income: 0, expense: 0, net: 0 };
    }
    if (t.type === "income") {
      rollups[cur].income += t.amount;
      rollups[cur].net += t.amount;
    } else {
      rollups[cur].expense += t.amount;
      rollups[cur].net -= t.amount;
    }
  }

  // Categories based on selected type
  const availableCategories = txType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Handle Form Submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txCategory || !txAmount || !txCurrency || !txDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (!txPageId && (!txClientId || txClientId === "all")) {
      toast.error("Please select a target client or social channel.");
      return;
    }

    const floatAmount = parseFloat(txAmount);
    if (isNaN(floatAmount) || floatAmount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    setSubmitting(true);
    try {
      const receiptStorageIds: string[] = [];

      // Handle batch receipt uploads
      if (receiptFiles.length > 0) {
        toast.info(`Uploading ${receiptFiles.length} receipt/attachment(s)...`);
        for (const file of receiptFiles) {
          const uploadUrl = await generateReceiptUrl({ 
            workspaceId: workspace?._id, 
            pageId: (txPageId as any) || undefined 
          });
          const res = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!res.ok) throw new Error(`Receipt upload failed for ${file.name}`);
          const json = await res.json();
          receiptStorageIds.push(json.storageId);
        }
      }

      const resolvedClientId = txClientId !== "all" 
        ? (txClientId as any) 
        : (txPageId ? socialPages.find(p => p._id === txPageId)?.clientId : undefined);

      await createTx({
        pageId: txPageId ? (txPageId as any) : undefined,
        clientId: resolvedClientId,
        workspaceId: workspace?._id,
        postId: txPostId ? (txPostId as any) : undefined,
        type: txType,
        category: txCategory,
        amount: Math.round(floatAmount * 100), // convert to cents
        currency: txCurrency,
        date: new Date(txDate).getTime(),
        description: txDescription.trim() || undefined,
        recurring: txRecurring,
        recurrenceInterval: txRecurring ? txInterval : undefined,
        billingFrequency: txRecurring ? (txInterval === "yearly" ? "yearly" : "monthly") : "one_time",
        receiptStorageId: receiptStorageIds[0] as any,
        receiptStorageIds: receiptStorageIds as any,
      });

      toast.success("Transaction recorded successfully.");
      
      // Reset State
      setTxPageId("");
      setTxPostId("");
      setTxCategory("");
      setTxAmount("");
      setTxDescription("");
      setTxRecurring(false);
      setReceiptFiles([]);
      setActiveModal(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to record transaction");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx || !txCategory || !txAmount || !txCurrency || !txDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const floatAmount = parseFloat(txAmount);
    if (isNaN(floatAmount) || floatAmount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    setSubmitting(true);
    try {
      const newStorageIds: string[] = [];

      if (receiptFiles.length > 0) {
        toast.info(`Uploading ${receiptFiles.length} new receipt attachment(s)...`);
        for (const file of receiptFiles) {
          const uploadUrl = await generateReceiptUrl({ 
            workspaceId: workspace?._id, 
            pageId: (txPageId as any) || undefined 
          });
          const res = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!res.ok) throw new Error(`Receipt upload failed for ${file.name}`);
          const json = await res.json();
          newStorageIds.push(json.storageId);
        }
      }

      const finalStorageIds = [
        ...existingReceipts.map(r => r.storageId),
        ...newStorageIds,
      ];

      const resolvedClientId = txClientId !== "all" 
        ? (txClientId as any) 
        : (txPageId ? socialPages.find(p => p._id === txPageId)?.clientId : undefined);

      await updateTx({
        transactionId: selectedTx._id,
        clientId: resolvedClientId,
        postId: txPostId ? (txPostId as any) : undefined,
        category: txCategory,
        amount: Math.round(floatAmount * 100), // convert to cents integer
        currency: txCurrency,
        date: new Date(txDate).getTime(),
        description: txDescription.trim() || undefined,
        recurring: txRecurring,
        recurrenceInterval: txRecurring ? txInterval : undefined,
        billingFrequency: txRecurring ? (txInterval === "yearly" ? "yearly" : "monthly") : "one_time",
        receiptStorageId: finalStorageIds[0] as any,
        receiptStorageIds: finalStorageIds as any,
      });

      toast.success("Transaction entry updated successfully.");
      setActiveModal(null);
      setSelectedTx(null);
      setExistingReceipts([]);
      setReceiptFiles([]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update transaction");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTx) return;
    setDeletingId(selectedTx._id);
    try {
      await deleteTx({ transactionId: selectedTx._id });
      toast.success("Transaction entry removed successfully.");
      setActiveModal(null);
      setSelectedTx(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete transaction");
    } finally {
      setDeletingId(null);
    }
  };

  // Currencies list for display
  const currencyKeys = Object.keys(rollups);

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in font-sans">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-indigo-500 dark:text-indigo-400" /> Financial ledger & P&L
          </h2>
          <p className="text-sm text-zinc-650 dark:text-zinc-400">
            Track cents-accurate revenues, content investments, sponsorships, and platform P&L details.
          </p>
        </div>
        
        {socialPages.length > 0 && (
          <Button 
            onClick={openCreateModal}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 text-xs font-semibold"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Log Transaction
          </Button>
        )}
      </div>

      {/* P&L Balances / Rollups */}
      {currencyKeys.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currencyKeys.map((cur) => {
            const totals = rollups[cur]!;
            const isProfit = totals.net >= 0;
            const margin = totals.income > 0 ? ((totals.net / totals.income) * 100).toFixed(1) : "0.0";
            
            return (
              <div 
                key={cur}
                className="p-5 rounded-2xl border border-border bg-gradient-to-br from-zinc-50 to-indigo-50/5 dark:from-zinc-900/60 dark:to-indigo-950/5 flex flex-col gap-4 relative overflow-hidden group shadow-lg"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-indigo-500/10 transition-all" />
                
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-650 dark:text-zinc-500">Summary ({cur})</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isProfit 
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25" 
                      : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/25"
                  }`}>
                    {margin}% Margin
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white font-mono">
                    {isProfit ? "" : "-"}{cur} {(Math.abs(totals.net) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10.5px] font-medium text-zinc-650 dark:text-zinc-500">Net operating balance</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border text-xs">
                  <div className="flex flex-col gap-0.5 text-left">
                    <span className="text-zinc-550 dark:text-zinc-500 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> Revenue
                    </span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                      +{(totals.income / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-left">
                    <span className="text-zinc-550 dark:text-zinc-500 flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" /> Expenses
                    </span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono text-left">
                      -{(totals.expense / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 rounded-xl border border-border bg-card text-center text-xs text-zinc-555 italic">
          No transaction entries logged yet. Setup your first ledger line below.
        </div>
      )}

      {/* Agency Normalized Recurring Run-Rate & Server Overhead Card */}
      {netSummary?.workspaceTotals && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-[#05ffc4]/25 bg-gradient-to-br from-[#05ffc4]/10 via-[#00d9f5]/5 to-card flex flex-col gap-3 text-left shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#05ffc4]/15 border border-[#05ffc4]/30 flex items-center justify-center text-[#05ffc4] shrink-0">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black uppercase tracking-wider text-[#05ffc4] font-mono">
                    Agency Recurring MRR & Daily Run Rate
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Accrual / normalized daily recognition of annual retainers and monthly contracts.
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/80 font-mono">
              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase font-bold text-muted-foreground">Agency MRR</span>
                <span className="text-base font-extrabold text-[#05ffc4]">
                  {formatCurrencyCents(netSummary.workspaceTotals.monthlyRecurringRevenue, currencyCode)}/mo
                </span>
                <span className="text-[9px] text-muted-foreground">
                  ARR: {formatCurrencyCents(netSummary.workspaceTotals.annualRunRate, currencyCode)}
                </span>
              </div>

              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase font-bold text-muted-foreground">Daily Recognized Pace</span>
                <span className="text-base font-extrabold text-emerald-400">
                  {formatCurrencyCents(netSummary.workspaceTotals.dailyRecognizedIncome, currencyCode)}/day
                </span>
                <span className="text-[9px] text-muted-foreground">
                  (Prorated 1/365 & 1/30)
                </span>
              </div>

              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase font-bold text-muted-foreground">Net Daily Margin</span>
                <span className={`text-base font-extrabold ${netSummary.workspaceTotals.dailyNetRunRate >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {netSummary.workspaceTotals.dailyNetRunRate >= 0 ? "+" : ""}
                  {formatCurrencyCents(netSummary.workspaceTotals.dailyNetRunRate, currencyCode)}/day
                </span>
                <span className="text-[9px] text-muted-foreground">
                  after server burn
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-card flex flex-col gap-3 text-left shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Package className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-400 font-mono">
                    Cloud Infrastructure & Net Valuation
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Hetzner VPS, domains, SaaS subscriptions, plus total recorded physical/digital assets.
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/80 font-mono">
              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase font-bold text-muted-foreground">Cloud/VPS Burn</span>
                <span className="text-base font-extrabold text-amber-400">
                  {formatCurrencyCents(netSummary.workspaceTotals.monthlyInfrastructureExpense, currencyCode)}/mo
                </span>
                <span className="text-[9px] text-muted-foreground">
                  {formatCurrencyCents(netSummary.workspaceTotals.dailyExpenseBurn, currencyCode)}/day
                </span>
              </div>

              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase font-bold text-muted-foreground">Asset Valuation</span>
                <span className="text-base font-extrabold text-indigo-400">
                  {formatCurrencyCents(netSummary.workspaceTotals.assetValuation, currencyCode)}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  hardware & inventory
                </span>
              </div>

              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase font-bold text-muted-foreground">Total Client Net Worth</span>
                <span className={`text-base font-extrabold ${netSummary.workspaceTotals.totalClientNetWorth >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {formatCurrencyCents(netSummary.workspaceTotals.totalClientNetWorth, currencyCode)}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  cash + assets
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Control bar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-card p-4 rounded-xl border border-border">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          
          {/* Text Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Search description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Client Filter */}
          <select
            value={selectedClientFilter}
            onChange={(e) => {
              setSelectedClientFilter(e.target.value);
              setSelectedPageFilter("all"); // Reset page filter on client change
            }}
            className="px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600 min-w-[150px]"
          >
            <option value="all">All Clients</option>
            {clients.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>

          {/* Page Filter */}
          <select
            value={selectedPageFilter}
            onChange={(e) => setSelectedPageFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600 min-w-[160px]"
          >
            <option value="all">All Channels</option>
            {filteredSocialPages.map(p => (
              <option key={p._id} value={p._id}>@{p.handle} ({p.platform})</option>
            ))}
          </select>
        </div>

        {/* Type Filter Tabs */}
        <div className="flex bg-muted p-1 rounded-lg border border-border shrink-0 self-start lg:self-center">
          {(["all", "income", "expense"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedTypeFilter(type)}
              className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                selectedTypeFilter === type
                  ? "bg-background text-foreground shadow-sm"
                  : "text-zinc-550 hover:text-foreground"
              }`}
            >
              {type === "all" ? "All Entries" : `${type}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted text-[10px] uppercase font-bold text-zinc-550 dark:text-zinc-400 tracking-wider">
                <th className="p-4">Date</th>
                <th className="p-4">Channel / Client</th>
                <th className="p-4">Category</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-left">Linked Post</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-center">Receipt</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-550 italic">
                    No matching transactions found in the ledger.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => {
                  const page = t.pageId ? socialPages.find(p => p._id === t.pageId) : null;
                  const client = t.clientId 
                    ? clients.find(c => c._id === t.clientId)
                    : (page ? clients.find(c => c._id === page.clientId) : null);
                  const post = t.postId ? posts.find(p => p._id === t.postId) : null;
                  
                  // Calculate normalized MRR proration badge for annual or recurring items
                  let prorationBadge = null;
                  if (t.recurring || t.billingFrequency) {
                    const freq = t.billingFrequency || t.recurrenceInterval || "monthly";
                    if (freq === "yearly") {
                      const mrr = Math.round(t.amount / 12);
                      const daily = Math.round(t.amount / 365);
                      prorationBadge = (
                        <span className="text-[9px] font-mono font-bold text-[#05ffc4] bg-[#05ffc4]/10 border border-[#05ffc4]/20 px-1.5 py-0.5 rounded" title="Annual contract recognized in MRR and daily run rate">
                          MRR: +{formatCurrencyCents(mrr, t.currency)}/mo ({formatCurrencyCents(daily, t.currency)}/d)
                        </span>
                      );
                    } else if (freq === "weekly") {
                      const daily = Math.round(t.amount / 7);
                      prorationBadge = (
                        <span className="text-[9px] font-mono text-zinc-400 bg-muted px-1.5 py-0.5 rounded border border-border">
                          Weekly ({formatCurrencyCents(daily, t.currency)}/d)
                        </span>
                      );
                    }
                  }

                  return (
                    <tr 
                      key={t._id}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <td className="p-4 text-zinc-500 dark:text-zinc-400 font-mono">
                        {new Date(t.date).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">
                            {page ? `@${page.handle}` : (client ? `${client.name} (Direct Retainer/Expense)` : "Workspace Overhead")}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {client && (
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wide">{client.name}</span>
                            )}
                            {prorationBadge}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          t.type === "income" 
                            ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/10" 
                            : "bg-red-500/5 text-red-400 border-red-500/10"
                        }`}>
                          {getCategoryLabel(t.category)}
                        </span>
                      </td>
                      <td className="p-4 text-foreground max-w-[200px] truncate" title={t.description}>
                        <div className="flex items-center gap-1.5">
                          {t.recurring && (
                            <span title={`Recurring ${t.recurrenceInterval || "monthly"}`} className="shrink-0 flex items-center">
                              <Repeat className="h-3 w-3 text-indigo-400" />
                            </span>
                          )}
                          <span className="truncate">{t.description || "—"}</span>
                        </div>
                      </td>
                      <td className="p-4 text-zinc-400 max-w-[150px] truncate">
                        {post ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-indigo-400">
                            <LinkIcon className="h-3 w-3" />
                            {post.caption.substring(0, 20)}...
                          </span>
                        ) : "—"}
                      </td>
                      <td className={`p-4 text-right font-bold font-mono ${
                        t.type === "income" ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {t.type === "income" ? "+" : "-"}{t.currency} {(t.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center">
                        {(t as any).receiptUrls && (t as any).receiptUrls.length > 0 ? (
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {(t as any).receiptUrls.map((url: string, idx: number) => (
                              <a 
                                key={idx}
                                href={url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-muted border border-border text-zinc-500 hover:text-indigo-400 transition-colors"
                                title={`View Attachment #${idx + 1}`}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </a>
                            ))}
                          </div>
                        ) : t.receiptUrl ? (
                          <a 
                            href={t.receiptUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-muted border border-border text-zinc-500 hover:text-indigo-400 transition-colors"
                            title="View Receipt"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </a>
                        ) : "—"}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditModal(t)}
                            className="h-7 w-7 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                            title="Edit Transaction"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={deletingId === t._id}
                            onClick={() => openDeleteModal(t)}
                            className="h-7 w-7 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete Transaction"
                          >
                            {deletingId === t._id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALS OVERLAYS --- */}

      {/* 1. Log / Edit Transaction Modal */}
      {(activeModal === "create" || activeModal === "edit") && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" /> {activeModal === "edit" ? "Edit Campaign Transaction" : "Log Campaign Transaction"}
              </h3>
              <button onClick={() => { setActiveModal(null); setSelectedTx(null); setExistingReceipts([]); setReceiptFiles([]); }} className="text-zinc-500 hover:text-zinc-350 transition-colors">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={activeModal === "edit" ? handleEditSubmit : handleCreateSubmit} className="p-6 flex flex-col gap-5 max-h-[85vh] overflow-y-auto">
              
              {/* Type Switcher (Full Width) */}
              <div className="flex bg-muted p-1 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => {
                    setTxType("income");
                    setTxCategory(INCOME_CATEGORIES[0]?.id || "");
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    txType === "income"
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                      : "text-zinc-500 hover:text-foreground"
                  }`}
                >
                  Income / Revenue
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxType("expense");
                    setTxCategory(EXPENSE_CATEGORIES[0]?.id || "");
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    txType === "expense"
                      ? "bg-red-550 text-white shadow-md shadow-red-550/20"
                      : "text-zinc-500 hover:text-foreground"
                  }`}
                >
                  Expense / Investment
                </button>
              </div>

              {/* Two Column Grid on Desktop, Single Column on Mobile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                
                {/* Left Column: Classification & Financial Details */}
                <div className="flex flex-col gap-4 text-left">
                  {/* Target Client */}
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400">Target Client *</label>
                    <select 
                      value={txClientId} 
                      onChange={(e) => {
                        const newClientId = e.target.value;
                        setTxClientId(newClientId);
                        const filtered = socialPages?.filter(p => newClientId === "all" || p.clientId === newClientId) || [];
                        setTxPageId(filtered[0]?._id || "");
                        setTxPostId(""); // Reset post association
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600 cursor-pointer"
                      required
                    >
                      <option value="all">All Clients (Show all channels)</option>
                      {clients?.map(c => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Channel */}
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400">Target Channel or Operating Entity</label>
                    <select 
                      value={txPageId} 
                      onChange={(e) => {
                        setTxPageId(e.target.value);
                        setTxPostId(""); // Reset post association
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600 cursor-pointer"
                    >
                      <option value="">Direct Client Retainer / VPS & Tool Operating Expense (No Channel)</option>
                      {availableModalPages.map(page => {
                        const client = clients?.find(c => c._id === page.clientId);
                        return (
                          <option key={page._id} value={page._id}>
                            @{page.handle} ({page.platform}){client && txClientId === "all" ? ` — ${client.name}` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Category */}
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400">Classification Category *</label>
                    <select 
                      value={txCategory} 
                      onChange={(e) => setTxCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600 cursor-pointer"
                      required
                    >
                      {availableCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Amount & Currency */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5 text-left col-span-2">
                      <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400">Amount *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-zinc-500 text-sm font-semibold select-none">$</span>
                        <input 
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={txAmount}
                          onChange={(e) => setTxAmount(e.target.value)}
                          className="w-full pl-7 pr-3.5 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600 font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400">Currency *</label>
                      <select 
                        value={txCurrency} 
                        onChange={(e) => setTxCurrency(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600 font-mono cursor-pointer"
                        required
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="PHP">PHP (₱)</option>
                      </select>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400">Transaction Date *</label>
                    <input 
                      type="date"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600"
                      required
                    />
                  </div>

                  {/* Optional Post Connection */}
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400">Link to Content Post (Optional)</label>
                    <select 
                      value={txPostId} 
                      onChange={(e) => setTxPostId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600 disabled:opacity-50 cursor-pointer"
                      disabled={!txPageId}
                    >
                      <option value="">Do not link to post</option>
                      {(() => {
                        const activePage = socialPages.find(p => p._id === txPageId);
                        if (!activePage) return null;
                        return posts
                          .filter(post => {
                            const postProj = projects?.find(proj => proj._id === post.projectId);
                            return !!(postProj && postProj.clientId === activePage.clientId);
                          })
                          .map(post => (
                            <option key={post._id} value={post._id}>
                              {post.caption.substring(0, 40)}{post.caption.length > 40 ? "..." : ""} ({post.status})
                            </option>
                          ));
                      })()}
                    </select>
                  </div>
                </div>

                {/* Right Column: Memo, Automation & Attachments */}
                <div className="flex flex-col gap-4 text-left">
                  {/* Description */}
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400">Memo / Description</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Meta Q3 Ads Payment or retainer fee" 
                      value={txDescription}
                      onChange={(e) => setTxDescription(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  {/* Recurrence Toggle */}
                  <div className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-muted/40 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Repeat className="h-3.5 w-3.5 text-indigo-400 animate-spin-slow" /> Recurring Transaction
                        </span>
                        <span className="text-[10px] text-zinc-500 mt-0.5">Automate logging at schedule intervals</span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={txRecurring}
                        onChange={(e) => setTxRecurring(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-border text-indigo-600 bg-muted focus:ring-indigo-600 cursor-pointer"
                      />
                    </div>

                    {txRecurring && (
                      <div className="flex flex-col gap-2 mt-2 border-t border-border pt-2">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-semibold text-zinc-555 dark:text-zinc-400">Recurrence / Billing Interval</label>
                          <select
                            value={txInterval}
                            onChange={(e: any) => setTxInterval(e.target.value)}
                            className="px-3.5 py-1.5 rounded bg-muted border border-border text-xs text-foreground focus:outline-none focus:border-indigo-600 cursor-pointer"
                          >
                            <option value="monthly">Every Month (Standard Recurring)</option>
                            <option value="yearly">Every Year / Annual Contract (Prorated Daily & Monthly)</option>
                            <option value="weekly">Every Week</option>
                          </select>
                        </div>

                        {txAmount && parseFloat(txAmount) > 0 && (
                          <div className="p-2.5 rounded-lg bg-[#05ffc4]/10 border border-[#05ffc4]/20 text-xs flex flex-col gap-1 text-left font-mono">
                            <span className="text-[10px] font-bold text-[#05ffc4] uppercase">Run-Rate Recognition Preview:</span>
                            {txInterval === "yearly" ? (
                              <>
                                <div className="flex justify-between text-foreground text-[11px]">
                                  <span>Monthly MRR Recognition:</span>
                                  <span className="font-bold text-[#05ffc4]">+{txCurrency} {(parseFloat(txAmount) / 12).toFixed(2)}/mo</span>
                                </div>
                                <div className="flex justify-between text-foreground text-[11px]">
                                  <span>Daily Recognized Run Rate:</span>
                                  <span className="font-bold text-emerald-400">+{txCurrency} {(parseFloat(txAmount) / 365).toFixed(2)}/day</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex justify-between text-foreground text-[11px]">
                                  <span>Monthly MRR Recognition:</span>
                                  <span className="font-bold text-[#05ffc4]">+{txCurrency} {parseFloat(txAmount).toFixed(2)}/mo</span>
                                </div>
                                <div className="flex justify-between text-foreground text-[11px]">
                                  <span>Daily Recognized Run Rate:</span>
                                  <span className="font-bold text-emerald-400">+{txCurrency} {(parseFloat(txAmount) / 30).toFixed(2)}/day</span>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Multi-File Receipt Attachment Dropzone */}
                  <div className="flex flex-col gap-2 text-left">
                    
                    {/* Previously Attached Receipts (Visible & Editable) */}
                    {existingReceipts.length > 0 && (
                      <div className="flex flex-col gap-1.5 mb-1">
                        <span className="text-xs font-semibold text-zinc-555 dark:text-zinc-400">
                          Currently Attached Proofs ({existingReceipts.length})
                        </span>
                        <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                          {existingReceipts.map((r, idx) => (
                            <div
                              key={r.storageId || idx}
                              className="relative group border border-border bg-card rounded-lg p-2 flex items-center justify-between gap-2 overflow-hidden shadow-sm"
                            >
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity"
                                title="View receipt"
                              >
                                <DocIcon className="h-7 w-7 text-indigo-400 p-1 bg-indigo-500/10 rounded shrink-0" />
                                <span className="text-[11px] font-medium text-foreground truncate">
                                  Proof #{idx + 1}
                                </span>
                              </a>
                              <div className="flex items-center gap-1 shrink-0">
                                <a
                                  href={r.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 text-zinc-400 hover:text-indigo-400 rounded-full hover:bg-indigo-500/10 transition-colors"
                                  title="View Full File"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setExistingReceipts(prev => prev.filter((_, i) => i !== idx))}
                                  className="p-1 text-zinc-400 hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors"
                                  title="Remove Attachment"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400">
                        {existingReceipts.length > 0 ? "Upload Additional Attachments" : "Receipt / Invoice Attachments (Multiple)"}
                      </label>
                      {receiptFiles.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setReceiptFiles([])}
                          className="text-[10px] text-zinc-500 hover:text-red-500 font-semibold transition-colors"
                        >
                          Clear new ({receiptFiles.length})
                        </button>
                      )}
                    </div>

                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingReceiptDropzone(true);
                      }}
                      onDragLeave={() => setIsDraggingReceiptDropzone(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingReceiptDropzone(false);
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          const validFiles = deduplicateIncomingFiles(e.dataTransfer.files, {
                            existingFiles: receiptFiles,
                          });
                          if (validFiles.length > 0) {
                            setReceiptFiles((prev) => [...prev, ...validFiles]);
                          }
                        }
                      }}
                      className={`p-3.5 rounded-xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        isDraggingReceiptDropzone
                          ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]"
                          : "border-border hover:border-zinc-400 dark:hover:border-zinc-700 bg-muted/30 hover:bg-muted/50"
                      }`}
                    >
                      <input 
                        type="file" 
                        id="tx-receipt-picker"
                        className="hidden" 
                        multiple
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            const validFiles = deduplicateIncomingFiles(e.target.files, {
                              existingFiles: receiptFiles,
                            });
                            if (validFiles.length > 0) {
                              setReceiptFiles((prev) => [...prev, ...validFiles]);
                            }
                            e.target.value = "";
                          }
                        }}
                      />
                      <label htmlFor="tx-receipt-picker" className="cursor-pointer flex flex-col items-center gap-1 w-full">
                        <div className="h-7 w-7 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                          <Paperclip className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <span className="font-semibold text-indigo-500 dark:text-indigo-400">Click to upload receipts</span>
                          <span className="text-zinc-500">or drag & drop</span>
                        </div>
                        <p className="text-[10px] text-zinc-500">
                          Upload PDF invoices, images, or document proofs
                        </p>
                      </label>
                    </div>

                    {/* Selected File Previews Grid */}
                    {receiptFiles.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mt-1 max-h-36 overflow-y-auto pr-1">
                        {receiptFiles.map((file, idx) => {
                          const isImage = file.type.startsWith("image/");
                          const isVideo = file.type.startsWith("video/");

                          return (
                            <div
                              key={`${file.name}-${idx}`}
                              className="relative group border border-border bg-card rounded-lg p-1.5 flex items-center gap-2 overflow-hidden shadow-sm text-left"
                            >
                              {isImage ? (
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={file.name}
                                  className="h-8 w-8 object-cover rounded shrink-0 border border-border"
                                />
                              ) : isVideo ? (
                                <VideoIcon className="h-8 w-8 text-indigo-400 p-1.5 bg-indigo-500/10 rounded shrink-0" />
                              ) : (
                                <DocIcon className="h-8 w-8 text-amber-500 p-1.5 bg-amber-500/10 rounded shrink-0" />
                              )}
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-[10.5px] font-medium text-foreground truncate">{file.name}</span>
                                <span className="text-[9px] text-zinc-500 font-mono">{formatFileSize(file.size)}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setReceiptFiles(prev => prev.filter((_, i) => i !== idx))}
                                className="text-zinc-400 hover:text-red-500 p-1 rounded-full hover:bg-red-500/10 transition-colors shrink-0"
                                title="Remove file"
                              >
                                <CloseIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Submit Buttons (Full Width) */}
              <div className="flex gap-2 justify-end pt-4 border-t border-border mt-1">
                <Button type="button" variant="ghost" onClick={() => { setActiveModal(null); setSelectedTx(null); setExistingReceipts([]); setReceiptFiles([]); }} className="text-zinc-500 text-xs">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5"
                >
                  {submitting && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  {submitting ? "Saving..." : activeModal === "edit" ? "Update Record" : "Save Record"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Delete Confirmation Security Modal */}
      {activeModal === "delete" && selectedTx && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-red-500/10">
              <h3 className="font-bold text-red-500 text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" /> Delete Transaction Entry?
              </h3>
              <button onClick={() => { setActiveModal(null); setSelectedTx(null); }} className="text-zinc-500 hover:text-zinc-350">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 text-left">
              <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed">
                Are you sure you want to delete this transaction record? This action cannot be undone and will permanently remove this entry and all attached receipt proofs from the financial ledger.
              </p>

              <div className="p-3.5 rounded-xl border border-border bg-muted/50 flex flex-col gap-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-sans">Date:</span>
                  <span className="text-foreground">{new Date(selectedTx.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-sans">Category:</span>
                  <span className="text-foreground">{getCategoryLabel(selectedTx.category)}</span>
                </div>
                {selectedTx.description && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500 font-sans">Description:</span>
                    <span className="text-foreground truncate max-w-[180px]">{selectedTx.description}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 font-bold">
                  <span className="text-zinc-500 font-sans">Amount:</span>
                  <span className={selectedTx.type === "income" ? "text-emerald-400" : "text-red-400"}>
                    {selectedTx.type === "income" ? "+" : "-"}{selectedTx.currency} {(selectedTx.amount / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-border mt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setActiveModal(null); setSelectedTx(null); }}
                  className="text-zinc-400 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deletingId === selectedTx._id}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4"
                >
                  {deletingId === selectedTx._id && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  Confirm Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
