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
  Filter
} from "lucide-react";
import { toast } from "sonner";

export default function FinancePage() {
  const params = useParams();
  const slug = params.workspaceSlug as string;

  // Convex Queries
  const workspace = useQuery(api.workspaces.getBySlug, { slug });
  
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

  // Mutations
  const createTx = useMutation(api.transactions.create);
  const deleteTx = useMutation(api.transactions.deleteTransaction);
  const generateReceiptUrl = useMutation(api.transactions.generateReceiptUploadUrl);

  // Filter States
  const [selectedClientFilter, setSelectedClientFilter] = useState("all");
  const [selectedPageFilter, setSelectedPageFilter] = useState("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Form State
  const [activeModal, setActiveModal] = useState<null | "create">(null);
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [txPageId, setTxPageId] = useState("");
  const [txPostId, setTxPostId] = useState("");
  const [txCategory, setTxCategory] = useState("");
  const [txAmount, setTxAmount] = useState(""); // input string (e.g. "12.50")
  const [txCurrency, setTxCurrency] = useState("USD");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [txDescription, setTxDescription] = useState("");
  const [txRecurring, setTxRecurring] = useState(false);
  const [txInterval, setTxInterval] = useState<"weekly" | "monthly" | "yearly">("monthly");
  
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
  const filteredTransactions = transactions.filter((t) => {
    const page = socialPages.find(p => p._id === t.pageId);
    if (!page) return false;

    const client = clients.find(c => c._id === page.clientId);
    if (!client) return false;

    // Filter by client
    if (selectedClientFilter !== "all" && page.clientId !== selectedClientFilter) return false;
    
    // Filter by page
    if (selectedPageFilter !== "all" && t.pageId !== selectedPageFilter) return false;

    // Filter by type
    if (selectedTypeFilter !== "all" && t.type !== selectedTypeFilter) return false;

    // Filter by text search
    const matchesSearch = 
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      getCategoryLabel(t.category).toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.handle.toLowerCase().includes(searchQuery.toLowerCase());
      
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
    if (!txPageId || !txCategory || !txAmount || !txCurrency || !txDate) {
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
      let receiptStorageId: string | undefined = undefined;

      // Handle optional receipt upload
      if (receiptFile) {
        toast.info("Uploading receipt file...");
        const uploadUrl = await generateReceiptUrl({ pageId: txPageId as any });
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": receiptFile.type },
          body: receiptFile,
        });
        if (!res.ok) throw new Error("Receipt upload failed.");
        const json = await res.json();
        receiptStorageId = json.storageId;
      }

      await createTx({
        pageId: txPageId as any,
        postId: txPostId ? (txPostId as any) : undefined,
        type: txType,
        category: txCategory,
        amount: Math.round(floatAmount * 100), // convert to cents
        currency: txCurrency,
        date: new Date(txDate).getTime(),
        description: txDescription.trim() || undefined,
        recurring: txRecurring,
        recurrenceInterval: txRecurring ? txInterval : undefined,
        receiptStorageId: receiptStorageId as any,
      });

      toast.success("Transaction recorded successfully.");
      
      // Reset State
      setTxPageId("");
      setTxPostId("");
      setTxCategory("");
      setTxAmount("");
      setTxDescription("");
      setTxRecurring(false);
      setReceiptFile(null);
      setActiveModal(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to record transaction");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: any) => {
    if (!confirm("Are you sure you want to delete this transaction record?")) return;
    setDeletingId(id);
    try {
      await deleteTx({ transactionId: id });
      toast.success("Transaction entry removed.");
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
            onClick={() => {
              setTxPageId(socialPages[0]?._id || "");
              setTxPostId("");
              setTxCategory(INCOME_CATEGORIES[0]?.id || "");
              setTxAmount("");
              setReceiptFile(null);
              setActiveModal("create");
            }}
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
        <div className="p-6 rounded-xl border border-border bg-card text-center text-xs text-zinc-550 italic">
          No transaction entries logged yet. Setup your first ledger line below.
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
                  const page = socialPages.find(p => p._id === t.pageId);
                  const client = page ? clients.find(c => c._id === page.clientId) : null;
                  const post = t.postId ? posts.find(p => p._id === t.postId) : null;
                  
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
                          <span className="font-semibold text-foreground">@{page?.handle || "Unknown"}</span>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wide">{client?.name}</span>
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
                            <span title={`Recurring ${t.recurrenceInterval}`} className="shrink-0 flex items-center">
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
                        {t.receiptUrl ? (
                          <a 
                            href={t.receiptUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-muted border border-border text-zinc-500 hover:text-foreground"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </a>
                        ) : "—"}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={deletingId === t._id}
                          onClick={() => handleDelete(t._id)}
                          className="h-8 w-8 text-zinc-550 hover:text-red-400 hover:bg-red-500/10"
                        >
                          {deletingId === t._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
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

      {/* 1. Log Transaction Modal */}
      {activeModal === "create" && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" /> Log Campaign Transaction
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-zinc-500 hover:text-zinc-350">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
              
              {/* Type Switcher */}
              <div className="flex bg-muted p-1 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => {
                    setTxType("income");
                    setTxCategory(INCOME_CATEGORIES[0]?.id || "");
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    txType === "income"
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/10"
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
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    txType === "expense"
                      ? "bg-red-550 text-white shadow-md shadow-red-550/10"
                      : "text-zinc-500 hover:text-foreground"
                  }`}
                >
                  Expense / Investment
                </button>
              </div>

              {/* Target Channel */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400">Target Social Channel *</label>
                <select 
                  value={txPageId} 
                  onChange={(e) => {
                    setTxPageId(e.target.value);
                    setTxPostId(""); // Reset post association
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600"
                  required
                >
                  {socialPages.map(page => (
                    <option key={page._id} value={page._id}>
                      @{page.handle} ({page.platform})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400">Classification Category *</label>
                <select 
                  value={txCategory} 
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600"
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
                    className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600 font-mono"
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
                  className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600 disabled:opacity-50"
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
                  <div className="flex flex-col gap-1.5 mt-2 border-t border-border pt-2">
                    <label className="text-[10px] font-semibold text-zinc-555 dark:text-zinc-400">Interval</label>
                    <select
                      value={txInterval}
                      onChange={(e: any) => setTxInterval(e.target.value)}
                      className="px-3.5 py-1.5 rounded bg-muted border border-border text-xs text-foreground focus:outline-none focus:border-indigo-600"
                    >
                      <option value="weekly">Every Week</option>
                      <option value="monthly">Every Month</option>
                      <option value="yearly">Every Year</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Optional Receipt Attachment */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400">Receipt Attachment (Optional)</label>
                <div className="border border-dashed border-border bg-muted/40 rounded-xl p-4 text-center flex flex-col items-center gap-2">
                  <input 
                    type="file" 
                    id="tx-receipt-picker"
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setReceiptFile(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs text-zinc-500 truncate max-w-[200px]">
                      {receiptFile ? receiptFile.name : "No receipt attached"}
                    </span>
                    {receiptFile ? (
                      <button 
                        type="button" 
                        onClick={() => setReceiptFile(null)}
                        className="text-zinc-500 hover:text-red-450 text-xs font-bold"
                      >
                        Remove
                      </button>
                    ) : (
                      <label 
                        htmlFor="tx-receipt-picker"
                        className="px-2.5 py-1 bg-muted hover:bg-muted/80 border border-border text-foreground text-[10px] font-semibold rounded cursor-pointer transition-colors"
                      >
                        Upload file
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 justify-end pt-3 border-t border-border mt-2">
                <Button type="button" variant="ghost" onClick={() => setActiveModal(null)} className="text-zinc-500 text-xs">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  {submitting && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  {submitting ? "Saving..." : "Save Record"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
