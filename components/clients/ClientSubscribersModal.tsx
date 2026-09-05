"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { 
  X, 
  Users, 
  Plus, 
  Trash2, 
  Loader2, 
  Check, 
  Calendar, 
  AlertTriangle, 
  Repeat, 
  Paperclip, 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Edit3, 
  Phone, 
  Mail, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrencyCents } from "@/lib/currency";

interface ClientSubscribersModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: Id<"workspaces">;
  clientId: Id<"clients">;
  clientName: string;
  currencyCode?: string;
}

const PLAN_PRESETS = [
  {
    planName: "Annual Clinic Cloud License",
    billingCycle: "annual" as const,
    defaultAmount: "35000.00",
    description: "Full dental clinic ERP & patient records system (1 Year)",
  },
  {
    planName: "Pro Multi-Branch Annual",
    billingCycle: "annual" as const,
    defaultAmount: "65000.00",
    description: "Multi-chair & multi-branch software license (1 Year)",
  },
  {
    planName: "Monthly Clinic Starter",
    billingCycle: "monthly" as const,
    defaultAmount: "3500.00",
    description: "Single-practitioner dental software subscription",
  },
];

export default function ClientSubscribersModal({
  isOpen,
  onClose,
  workspaceId,
  clientId,
  clientName,
  currencyCode = "PHP",
}: ClientSubscribersModalProps) {
  // Query subscribers for this client
  const subscribersData = useQuery(
    api.clientSubscribers.listByClient,
    isOpen && clientId ? { clientId } : "skip"
  );

  const createSubscriber = useMutation(api.clientSubscribers.create);
  const updateSubscriber = useMutation(api.clientSubscribers.update);
  const recordPayment = useMutation(api.clientSubscribers.recordPayment);
  const deleteSubscriber = useMutation(api.clientSubscribers.remove);
  const generateReceiptUrl = useMutation(api.clientSubscribers.generateReceiptUploadUrl);

  const [activeTab, setActiveTab] = useState<"directory" | "new">("directory");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "due_soon" | "overdue" | "annual">("all");

  // Record Payment Quick Modal / State
  const [paymentTargetSub, setPaymentTargetSub] = useState<any | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState("");
  const [paymentDateStr, setPaymentDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [autoAdvanceRenewal, setAutoAdvanceRenewal] = useState(true);
  const [recordInLedger, setRecordInLedger] = useState(true);
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null);

  // Edit Subscriber Modal State
  const [editingSub, setEditingSub] = useState<any | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editContactPerson, setEditContactPerson] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [editPlanName, setEditPlanName] = useState("");
  const [editBillingCycle, setEditBillingCycle] = useState<"annual" | "monthly" | "quarterly">("annual");
  const [editAmountInput, setEditAmountInput] = useState("");
  const [editStartDateStr, setEditStartDateStr] = useState("");
  const [editNextDueDateStr, setEditNextDueDateStr] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "paused" | "canceled">("active");
  const [editPaymentMethod, setEditPaymentMethod] = useState("Bank Transfer");
  const [editNotes, setEditNotes] = useState("");

  // In-Modal Delete Confirmation
  const [deleteConfirmSub, setDeleteConfirmSub] = useState<{ id: Id<"clientSubscribers">; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State for Adding New Subscriber
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newContactPerson, setNewContactPerson] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newPlanName, setNewPlanName] = useState("Annual Clinic Cloud License");
  const [newBillingCycle, setNewBillingCycle] = useState<"annual" | "monthly" | "quarterly">("annual");
  const [newAmountInput, setNewAmountInput] = useState("35000.00");
  const [newStartDateStr, setNewStartDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [newDueDateStr, setNewDueDateStr] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [newIsAlreadyPaid, setNewIsAlreadyPaid] = useState(true);
  const [newRecordInLedger, setNewRecordInLedger] = useState(true);
  const [newPaymentMethod, setNewPaymentMethod] = useState("Bank Transfer");
  const [newNotes, setNewNotes] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const subscribers = subscribersData?.subscribers || [];
  const summary = subscribersData?.summary;

  // Filter subscribers list
  const filteredSubscribers = subscribers.filter((sub) => {
    if (statusFilter === "paid" && sub.computedPaymentStatus !== "paid") return false;
    if (statusFilter === "due_soon" && sub.computedPaymentStatus !== "due_soon") return false;
    if (statusFilter === "overdue" && sub.computedPaymentStatus !== "overdue") return false;
    if (statusFilter === "annual" && sub.billingCycle !== "annual") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = sub.customerName.toLowerCase().includes(q);
      const matchPlan = sub.planName.toLowerCase().includes(q);
      const matchContact = sub.contactPerson?.toLowerCase().includes(q);
      if (!matchName && !matchPlan && !matchContact) return false;
    }

    return true;
  });

  const handleApplyPreset = (preset: typeof PLAN_PRESETS[0]) => {
    setNewPlanName(preset.planName);
    setNewBillingCycle(preset.billingCycle);
    setNewAmountInput(preset.defaultAmount);
    if (preset.billingCycle === "annual") {
      setNewDueDateStr(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    } else {
      setNewDueDateStr(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!newCustomerName.trim()) {
      errors.customerName = "Customer or Clinic Name is required";
    }
    if (!newPlanName.trim()) {
      errors.planName = "Plan Name is required";
    }
    const parsedAmount = parseFloat(newAmountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      errors.amount = "Please enter a valid subscription amount";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }

    setLoading(true);
    try {
      const amountCents = Math.round(parsedAmount * 100);
      const startDate = new Date(newStartDateStr).getTime() || Date.now();
      const nextDueDate = new Date(newDueDateStr).getTime() || startDate;

      await createSubscriber({
        workspaceId,
        clientId,
        customerName: newCustomerName.trim(),
        contactPerson: newContactPerson.trim() || undefined,
        contactEmail: newContactEmail.trim() || undefined,
        contactPhone: newContactPhone.trim() || undefined,
        planName: newPlanName.trim(),
        billingCycle: newBillingCycle,
        amount: amountCents,
        currency: currencyCode,
        startDate,
        nextPaymentDueDate: nextDueDate,
        paymentMethod: newPaymentMethod,
        notes: newNotes.trim() || undefined,
        isAlreadyPaid: newIsAlreadyPaid,
        recordInLedger: newRecordInLedger,
      });

      toast.success(`Added ${newCustomerName} under ${clientName}!`);
      // Reset form
      setNewCustomerName("");
      setNewContactPerson("");
      setNewContactEmail("");
      setNewContactPhone("");
      setNewNotes("");
      setActiveTab("directory");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to add subscriber");
    } finally {
      setLoading(false);
    }
  };

  const openRecordPaymentModal = (sub: any) => {
    setPaymentTargetSub(sub);
    setPaymentAmountInput((sub.amount / 100).toFixed(2));
    setPaymentDateStr(new Date().toISOString().split("T")[0]);
    setPaymentMethod(sub.paymentMethod || "Bank Transfer");
    setAutoAdvanceRenewal(true);
    setRecordInLedger(true);
    setPaymentReceiptFile(null);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTargetSub) return;

    const parsedAmount = parseFloat(paymentAmountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    setLoading(true);
    try {
      let receiptStorageId: Id<"_storage"> | undefined = undefined;
      if (paymentReceiptFile) {
        const uploadUrl = await generateReceiptUrl({ workspaceId });
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": paymentReceiptFile.type },
          body: paymentReceiptFile,
        });
        if (!res.ok) throw new Error("Failed to upload receipt file");
        const json = await res.json();
        receiptStorageId = json.storageId;
      }

      const amountCents = Math.round(parsedAmount * 100);
      const paymentDate = new Date(paymentDateStr).getTime() || Date.now();

      const result = await recordPayment({
        subscriberId: paymentTargetSub._id,
        amount: amountCents,
        paymentDate,
        paymentMethod,
        receiptStorageId,
        autoAdvanceDueDate: autoAdvanceRenewal,
        recordInLedger,
      });

      toast.success(
        `Recorded ${formatCurrencyCents(amountCents, currencyCode)} payment for ${paymentTargetSub.customerName}!`,
        {
          description: autoAdvanceRenewal
            ? `Next renewal advanced to ${new Date(result.nextPaymentDueDate).toLocaleDateString()}`
            : undefined,
        }
      );

      setPaymentTargetSub(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (sub: any) => {
    setEditingSub(sub);
    setEditCustomerName(sub.customerName || "");
    setEditContactPerson(sub.contactPerson || "");
    setEditContactEmail(sub.contactEmail || "");
    setEditContactPhone(sub.contactPhone || "");
    setEditPlanName(sub.planName || "");
    setEditBillingCycle(sub.billingCycle || "annual");
    setEditAmountInput((sub.amount / 100).toFixed(2));
    setEditStartDateStr(
      sub.startDate ? new Date(sub.startDate).toISOString().split("T")[0] : ""
    );
    setEditNextDueDateStr(
      sub.nextPaymentDueDate ? new Date(sub.nextPaymentDueDate).toISOString().split("T")[0] : ""
    );
    setEditStatus(sub.status || "active");
    setEditPaymentMethod(sub.paymentMethod || "Bank Transfer");
    setEditNotes(sub.notes || "");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;

    if (!editCustomerName.trim()) {
      toast.error("Customer or Clinic Name is required");
      return;
    }
    if (!editPlanName.trim()) {
      toast.error("Plan Name is required");
      return;
    }
    const parsedAmount = parseFloat(editAmountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid subscription amount");
      return;
    }

    setLoading(true);
    try {
      const amountCents = Math.round(parsedAmount * 100);
      const startDate = editStartDateStr ? new Date(editStartDateStr).getTime() : editingSub.startDate;
      const nextDueDate = editNextDueDateStr ? new Date(editNextDueDateStr).getTime() : editingSub.nextPaymentDueDate;

      await updateSubscriber({
        subscriberId: editingSub._id,
        customerName: editCustomerName.trim(),
        contactPerson: editContactPerson.trim() || undefined,
        contactEmail: editContactEmail.trim() || undefined,
        contactPhone: editContactPhone.trim() || undefined,
        planName: editPlanName.trim(),
        billingCycle: editBillingCycle,
        amount: amountCents,
        nextPaymentDueDate: nextDueDate,
        status: editStatus,
        paymentMethod: editPaymentMethod,
        notes: editNotes.trim() || undefined,
      });

      toast.success(`Updated subscriber "${editCustomerName}"!`);
      setEditingSub(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update subscriber");
    } finally {
      setLoading(false);
    }
  };

  const executeDeleteSubscriber = async (subscriberId: Id<"clientSubscribers">) => {
    setDeletingId(subscriberId);
    try {
      await deleteSubscriber({ subscriberId });
      toast.success("Subscriber removed.");
      setDeleteConfirmSub(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to remove subscriber");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl w-full max-w-5xl xl:max-w-6xl shadow-2xl flex flex-col h-[90vh] max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 relative">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-xs">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-foreground">
                  {clientName}
                </h3>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold uppercase tracking-wider">
                  Customer Subscribers & Annual Renewals
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track clinic clients who subscribe to {clientName}, monitor annual payments, and automate renewal due dates.
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

        {/* Live KPI Revenue Ribbon */}
        <div className="px-6 py-3 bg-card/60 border-b border-border grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0 text-left font-mono">
          <div className="flex flex-col border-r border-border/50 pr-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Subscribers</span>
            <span className="text-sm sm:text-base font-extrabold text-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-indigo-400" />
              {summary?.totalSubscribers || 0} customer{summary?.totalSubscribers === 1 ? "" : "s"}
            </span>
            <span className="text-[9px] text-muted-foreground">Active client accounts</span>
          </div>

          <div className="flex flex-col border-r border-border/50 pr-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total ARR</span>
            <span className="text-sm sm:text-base font-extrabold text-[#05ffc4]">
              {formatCurrencyCents(summary?.totalARR || 0, currencyCode)}/yr
            </span>
            <span className="text-[9px] text-muted-foreground">Annual run rate</span>
          </div>

          <div className="flex flex-col border-r border-border/50 pr-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Monthly MRR</span>
            <span className="text-sm sm:text-base font-extrabold text-indigo-400">
              {formatCurrencyCents(summary?.totalMRR || 0, currencyCode)}/mo
            </span>
            <span className="text-[9px] text-muted-foreground">Monthly pacing</span>
          </div>

          <div className="flex flex-col border-r border-border/50 pr-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Paid Up</span>
            <span className="text-sm sm:text-base font-extrabold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              {summary?.paidCount || 0} active
            </span>
            <span className="text-[9px] text-muted-foreground">Paid for current cycle</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Renewals Due</span>
            <span className={`text-sm sm:text-base font-extrabold flex items-center gap-1 ${
              (summary?.dueSoonCount || 0) + (summary?.overdueCount || 0) > 0 ? "text-amber-400" : "text-zinc-400"
            }`}>
              <Clock className="h-3.5 w-3.5" />
              {(summary?.dueSoonCount || 0) + (summary?.overdueCount || 0)} due / overdue
            </span>
            <span className="text-[9px] text-muted-foreground">Within next 30 days</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-2.5 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("directory")}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === "directory"
                  ? "border-[#05ffc4] text-[#05ffc4] bg-card shadow-xs"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-4 w-4" /> 
              Subscribers Directory ({subscribers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("new")}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === "new"
                  ? "border-indigo-500 text-indigo-400 bg-card shadow-xs"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Plus className="h-4 w-4" /> 
              + Add New Customer Subscriber
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground pb-2">
            <span className="text-[11px]">One-click "Record Annual Payment" automatically advances next renewal date by 1 year.</span>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          
          {/* TAB 1: SUBSCRIBERS DIRECTORY */}
          {activeTab === "directory" && (
            <div className="flex-1 overflow-hidden flex flex-col p-5 sm:p-6 gap-4">
              
              {/* Search & Filter Bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap shrink-0">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search clinic name, plan, or doctor..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-muted/40 text-foreground text-xs focus:outline-hidden focus:border-[#05ffc4]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto text-[10px]">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={`px-2.5 py-1 rounded-md font-bold transition-colors whitespace-nowrap ${
                      statusFilter === "all"
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:text-foreground border border-border"
                    }`}
                  >
                    All ({subscribers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("annual")}
                    className={`px-2.5 py-1 rounded-md font-bold transition-colors whitespace-nowrap ${
                      statusFilter === "annual"
                        ? "bg-indigo-500 text-white"
                        : "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20"
                    }`}
                  >
                    Annual Plans
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("paid")}
                    className={`px-2.5 py-1 rounded-md font-bold transition-colors whitespace-nowrap ${
                      statusFilter === "paid"
                        ? "bg-emerald-500 text-black"
                        : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                    }`}
                  >
                    🟢 Paid Up ({summary?.paidCount || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("due_soon")}
                    className={`px-2.5 py-1 rounded-md font-bold transition-colors whitespace-nowrap ${
                      statusFilter === "due_soon"
                        ? "bg-amber-500 text-black"
                        : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
                    }`}
                  >
                    🟡 Due Soon ({summary?.dueSoonCount || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("overdue")}
                    className={`px-2.5 py-1 rounded-md font-bold transition-colors whitespace-nowrap ${
                      statusFilter === "overdue"
                        ? "bg-rose-500 text-white"
                        : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20"
                    }`}
                  >
                    🔴 Overdue ({summary?.overdueCount || 0})
                  </button>
                </div>
              </div>

              {/* Subscriber Cards List */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
                {subscribersData === undefined ? (
                  <div className="py-20 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                    <span>Loading customer subscribers...</span>
                  </div>
                ) : filteredSubscribers.length === 0 ? (
                  <div className="py-20 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground text-xs text-center p-6 bg-muted/20">
                    <Users className="h-10 w-10 text-muted-foreground/30 mb-2" />
                    <p className="font-bold text-foreground text-sm">No customer subscribers found</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      {searchQuery
                        ? "No clinic matches your search keywords."
                        : `Add clinic clients who subscribe to ${clientName} to track their annual payments and renewal dates.`}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setActiveTab("new")}
                      className="mt-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add First Subscriber
                    </Button>
                  </div>
                ) : (
                  filteredSubscribers.map((sub) => {
                    const isPaid = sub.computedPaymentStatus === "paid";
                    const isDueSoon = sub.computedPaymentStatus === "due_soon";
                    const isOverdue = sub.computedPaymentStatus === "overdue";

                    return (
                      <div
                        key={sub._id}
                        className="p-4 rounded-2xl border border-border bg-card/80 hover:border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all text-left group shadow-xs"
                      >
                        {/* Clinic Info */}
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border shadow-xs ${
                            isPaid
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                              : isDueSoon
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/25"
                          }`}>
                            <Users className="h-5 w-5" />
                          </div>

                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-black text-foreground truncate">
                                {sub.customerName}
                              </h4>
                              
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-muted text-foreground border border-border">
                                {sub.planName}
                              </span>

                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 flex items-center gap-1">
                                <Repeat className="h-2.5 w-2.5" /> {sub.billingCycle}
                              </span>

                              {/* Status Badge */}
                              {isPaid && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                                  <CheckCircle2 className="h-2.5 w-2.5" /> Paid (Renews in {sub.daysUntilDue} days)
                                </span>
                              )}
                              {isDueSoon && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center gap-1 animate-pulse">
                                  <Clock className="h-2.5 w-2.5" /> Due in {sub.daysUntilDue} days
                                </span>
                              )}
                              {isOverdue && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/25 flex items-center gap-1">
                                  <AlertTriangle className="h-2.5 w-2.5" /> Overdue by {Math.abs(sub.daysUntilDue)} days
                                </span>
                              )}
                            </div>

                            {/* Contact & Timeline Info */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap font-mono">
                              {sub.contactPerson && (
                                <span className="flex items-center gap-1">
                                  <span>👤 {sub.contactPerson}</span>
                                </span>
                              )}
                              {sub.contactPhone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" /> {sub.contactPhone}
                                </span>
                              )}
                              {sub.lastPaymentDate && (
                                <span>
                                  Last Paid: {new Date(sub.lastPaymentDate).toLocaleDateString()}
                                </span>
                              )}
                              <span className="text-foreground font-semibold">
                                Next Due: {new Date(sub.nextPaymentDueDate).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric"
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Amount & Actions */}
                        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                          <div className="flex flex-col items-end pr-2 font-mono">
                            <span className="text-sm font-black text-foreground">
                              {formatCurrencyCents(sub.amount, currencyCode)}/{sub.billingCycle === "annual" ? "yr" : "mo"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {sub.billingCycle === "annual" 
                                ? `~${formatCurrencyCents(Math.round(sub.amount / 12), currencyCode)}/mo MRR`
                                : `${formatCurrencyCents(sub.amount * 12, currencyCode)}/yr ARR`}
                            </span>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => openRecordPaymentModal(sub)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 px-3 rounded-xl shadow-xs flex items-center gap-1.5"
                            title="Record Annual/Monthly Subscription Payment"
                          >
                            <CreditCard className="h-3.5 w-3.5" /> Record Payment
                          </Button>

                          <button
                            type="button"
                            onClick={() => openEditModal(sub)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                            title="Edit subscriber details"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmSub({ id: sub._id, name: sub.customerName })}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete subscriber"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ADD NEW CUSTOMER SUBSCRIBER */}
          {activeTab === "new" && (
            <div className="flex-1 overflow-y-auto p-5 sm:p-7">
              <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                
                {/* Left Form (7 Cols) */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  
                  {/* Presets Grid */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-amber-400" /> Plan Presets for {clientName}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {PLAN_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleApplyPreset(preset)}
                          className="p-2.5 rounded-xl border border-border hover:border-indigo-500/50 bg-card hover:bg-muted/40 transition-colors flex flex-col items-start gap-1 group text-left"
                        >
                          <span className="text-[10px] font-bold font-mono text-indigo-400">
                            ₱{preset.defaultAmount}/{preset.billingCycle === "annual" ? "yr" : "mo"}
                          </span>
                          <span className="text-xs font-bold text-foreground line-clamp-1">{preset.planName}</span>
                          <span className="text-[9px] text-muted-foreground line-clamp-1">{preset.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Customer / Clinic Name & Contact Person */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Customer / Clinic Name *
                      </label>
                      <input
                        type="text"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        placeholder="e.g. Apex Dental Clinic, Dr. Santos Dental"
                        className={`w-full px-3.5 py-2 rounded-xl border bg-card text-foreground text-xs focus:outline-hidden ${
                          formErrors.customerName ? "border-rose-500" : "border-border focus:border-indigo-500"
                        }`}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Doctor / Contact Person
                      </label>
                      <input
                        type="text"
                        value={newContactPerson}
                        onChange={(e) => setNewContactPerson(e.target.value)}
                        placeholder="e.g. Dr. Manuel Santos, DMD"
                        className="w-full px-3.5 py-2 rounded-xl border border-border bg-card text-foreground text-xs focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Contact Email & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        value={newContactEmail}
                        onChange={(e) => setNewContactEmail(e.target.value)}
                        placeholder="e.g. doctor@apexdental.com"
                        className="w-full px-3.5 py-2 rounded-xl border border-border bg-card text-foreground text-xs focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Contact Phone / Mobile
                      </label>
                      <input
                        type="text"
                        value={newContactPhone}
                        onChange={(e) => setNewContactPhone(e.target.value)}
                        placeholder="e.g. +63 917 123 4567"
                        className="w-full px-3.5 py-2 rounded-xl border border-border bg-card text-foreground text-xs focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Plan Name & Billing Cycle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Subscription Plan Name *
                      </label>
                      <input
                        type="text"
                        value={newPlanName}
                        onChange={(e) => setNewPlanName(e.target.value)}
                        placeholder="e.g. Cliniqly Cloud Pro (Annual)"
                        className="w-full px-3.5 py-2 rounded-xl border border-border bg-card text-foreground text-xs focus:outline-hidden focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Billing Cycle
                      </label>
                      <select
                        value={newBillingCycle}
                        onChange={(e) => {
                          const cycle = e.target.value as any;
                          setNewBillingCycle(cycle);
                          if (cycle === "annual") {
                            setNewDueDateStr(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
                          } else {
                            setNewDueDateStr(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs focus:outline-hidden focus:border-indigo-500"
                      >
                        <option value="annual">Annual (Yearly Payment)</option>
                        <option value="monthly">Monthly Subscription</option>
                        <option value="quarterly">Quarterly (Every 3 Months)</option>
                      </select>
                    </div>
                  </div>

                  {/* Amount, Start Date & First Renewal Due Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Subscription Price ({currencyCode}) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-muted-foreground font-mono text-xs">
                          {currencyCode === "PHP" ? "₱" : "$"}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={newAmountInput}
                          onChange={(e) => setNewAmountInput(e.target.value)}
                          placeholder="e.g. 35000.00"
                          className="w-full pl-7 pr-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-mono focus:outline-hidden focus:border-indigo-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Subscription Start Date
                      </label>
                      <input
                        type="date"
                        value={newStartDateStr}
                        onChange={(e) => setNewStartDateStr(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-mono focus:outline-hidden focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        First Renewal Due Date
                      </label>
                      <input
                        type="date"
                        value={newDueDateStr}
                        onChange={(e) => setNewDueDateStr(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-mono focus:outline-hidden focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Already Paid Toggle */}
                  <div className="p-3.5 rounded-xl border border-border bg-muted/20 flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newIsAlreadyPaid}
                        onChange={(e) => setNewIsAlreadyPaid(e.target.checked)}
                        className="rounded border-border text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      <span className="text-xs font-bold text-foreground">
                        Clinic has already paid for the current year (Mark as Paid)
                      </span>
                    </label>

                    {newIsAlreadyPaid && (
                      <div className="pl-6 flex flex-col gap-1.5 text-[11px] text-muted-foreground">
                        <span>
                          Marks status as 🟢 <strong>Paid</strong> and sets the renewal countdown for 1 year from the start date.
                        </span>
                        <label className="flex items-center gap-2 cursor-pointer mt-1">
                          <input
                            type="checkbox"
                            checked={newRecordInLedger}
                            onChange={(e) => setNewRecordInLedger(e.target.checked)}
                            className="rounded border-border text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                          />
                          <span className="text-xs text-foreground">
                            Also record this annual payment into {clientName}'s financial transaction ledger
                          </span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Payment Method & Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Payment Method
                      </label>
                      <select
                        value={newPaymentMethod}
                        onChange={(e) => setNewPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs focus:outline-hidden focus:border-indigo-500"
                      >
                        <option value="Bank Transfer">Bank Transfer (BDO, BPI, UnionBank)</option>
                        <option value="GCash">GCash / Maya</option>
                        <option value="Check">Corporate Check</option>
                        <option value="Credit Card">Credit Card / Online Gateway</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Notes / Clinic Details (Optional)
                      </label>
                      <input
                        type="text"
                        value={newNotes}
                        onChange={(e) => setNewNotes(e.target.value)}
                        placeholder="e.g. Branch location, special agreement, discounts"
                        className="w-full px-3.5 py-2 rounded-xl border border-border bg-card text-foreground text-xs focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                    <Button type="button" variant="ghost" onClick={() => setActiveTab("directory")} className="text-xs">
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1.5" /> Save Customer Subscriber
                        </>
                      )}
                    </Button>
                  </div>

                </div>

                {/* Right Info Box (5 Cols) */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  <div className="p-5 rounded-2xl bg-card border border-border flex flex-col gap-4 text-xs">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-indigo-400" /> Subscription Revenue Projection
                    </h4>

                    <div className="p-4 rounded-xl bg-muted/20 border border-border/80 flex flex-col gap-2 font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Subscription Value:</span>
                        <span className="text-base font-black text-foreground">
                          ₱{parseFloat(newAmountInput || "0").toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-border/60">
                        <span className="text-muted-foreground">Prorated Monthly MRR:</span>
                        <span className="font-bold text-[#05ffc4]">
                          {newBillingCycle === "annual"
                            ? `₱${((parseFloat(newAmountInput || "0") || 0) / 12).toFixed(2)}/mo`
                            : `₱${(parseFloat(newAmountInput || "0") || 0).toFixed(2)}/mo`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Daily Run Rate:</span>
                        <span className="font-bold text-foreground">
                          {newBillingCycle === "annual"
                            ? `₱${((parseFloat(newAmountInput || "0") || 0) / 365).toFixed(2)}/day`
                            : `₱${((parseFloat(newAmountInput || "0") || 0) / 30).toFixed(2)}/day`}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 text-muted-foreground">
                      <p>
                        <strong className="text-foreground">Automated Renewal Management:</strong> When this subscriber's annual renewal date arrives, you can record their renewal in one click to automatically push their due date forward by 1 year.
                      </p>
                      <p>
                        <strong className="text-foreground">Client Card Sync:</strong> All active customer subscribers roll up into {clientName}'s card on the main dashboard, displaying total ARR and upcoming renewal counts.
                      </p>
                    </div>
                  </div>
                </div>

              </form>
            </div>
          )}

        </div>

        {/* QUICK MODAL: RECORD ANNUAL / MONTHLY PAYMENT */}
        {paymentTargetSub && (
          <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6 flex flex-col gap-4 text-left animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-foreground">
                      Record Subscription Payment
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {paymentTargetSub.customerName} ({paymentTargetSub.planName})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentTargetSub(null)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleRecordPaymentSubmit} className="flex flex-col gap-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Amount Paid ({currencyCode}) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={paymentAmountInput}
                      onChange={(e) => setPaymentAmountInput(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-border bg-card text-foreground font-mono font-bold"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Payment Date</label>
                    <input
                      type="date"
                      value={paymentDateStr}
                      onChange={(e) => setPaymentDateStr(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-border bg-card text-foreground font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                  >
                    <option value="Bank Transfer">Bank Transfer (BDO, BPI, UnionBank)</option>
                    <option value="GCash">GCash / Maya</option>
                    <option value="Check">Check</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                {/* Auto Advance Checkbox */}
                <div className="p-3 rounded-xl border border-border bg-muted/20 flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoAdvanceRenewal}
                      onChange={(e) => setAutoAdvanceRenewal(e.target.checked)}
                      className="rounded border-border text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <span className="font-bold text-foreground">
                      Automatically advance renewal due date by +1 {paymentTargetSub.billingCycle === "annual" ? "year" : "month"}
                    </span>
                  </label>
                  <span className="text-[11px] text-muted-foreground pl-6">
                    Next renewal will be set to:{" "}
                    <strong className="text-emerald-400">
                      {new Date(
                        new Date(paymentTargetSub.nextPaymentDueDate).setFullYear(
                          new Date(paymentTargetSub.nextPaymentDueDate).getFullYear() + 1
                        )
                      ).toLocaleDateString()}
                    </strong>
                  </span>
                </div>

                {/* Record in Ledger Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recordInLedger}
                    onChange={(e) => setRecordInLedger(e.target.checked)}
                    className="rounded border-border text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span className="text-foreground">
                    Record this payment into {clientName}'s financial transaction ledger
                  </span>
                </label>

                {/* Receipt Upload */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Receipt / Bank Slip (Optional)</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setPaymentReceiptFile(e.target.files[0]);
                      }
                    }}
                    className="text-xs text-muted-foreground file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border file:border-border file:text-xs file:bg-muted file:text-foreground cursor-pointer"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button type="button" variant="ghost" onClick={() => setPaymentTargetSub(null)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4"
                  >
                    {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Check className="h-3 w-3 mr-1.5" />}
                    Confirm Payment & Advance Due Date
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* QUICK MODAL: EDIT CUSTOMER SUBSCRIBER */}
        {editingSub && (
          <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl p-6 flex flex-col gap-4 text-left animate-in zoom-in-95 duration-150 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                    <Edit3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-foreground">
                      Edit Customer Subscriber
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      Modify details, plan pricing, or renewal due dates
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSub(null)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="flex flex-col gap-3.5 text-xs">
                {/* Clinic / Customer Name & Doctor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Customer / Clinic Name *</label>
                    <input
                      type="text"
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-border bg-card text-foreground font-semibold"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Doctor / Contact Person</label>
                    <input
                      type="text"
                      value={editContactPerson}
                      onChange={(e) => setEditContactPerson(e.target.value)}
                      placeholder="e.g. Dr. Manuel Santos, DMD"
                      className="px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                    />
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Contact Email</label>
                    <input
                      type="email"
                      value={editContactEmail}
                      onChange={(e) => setEditContactEmail(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Contact Phone / Mobile</label>
                    <input
                      type="text"
                      value={editContactPhone}
                      onChange={(e) => setEditContactPhone(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                    />
                  </div>
                </div>

                {/* Plan Name & Billing Cycle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Subscription Plan Name *</label>
                    <input
                      type="text"
                      value={editPlanName}
                      onChange={(e) => setEditPlanName(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-border bg-card text-foreground font-semibold"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Billing Cycle</label>
                    <select
                      value={editBillingCycle}
                      onChange={(e) => setEditBillingCycle(e.target.value as any)}
                      className="px-3 py-2 rounded-xl border border-border bg-card text-foreground font-semibold"
                    >
                      <option value="annual">Annual (Yearly Payment)</option>
                      <option value="monthly">Monthly Subscription</option>
                      <option value="quarterly">Quarterly (Every 3 Months)</option>
                    </select>
                  </div>
                </div>

                {/* Amount & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Subscription Price ({currencyCode}) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-muted-foreground font-mono text-xs">
                        {currencyCode === "PHP" ? "₱" : "$"}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={editAmountInput}
                        onChange={(e) => setEditAmountInput(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 rounded-xl border border-border bg-card text-foreground font-mono font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Account Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="canceled">Canceled</option>
                    </select>
                  </div>
                </div>

                {/* Start Date & Renewal Due Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/20 border border-border">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Original Start Date</label>
                    <input
                      type="date"
                      value={editStartDateStr}
                      disabled
                      readOnly
                      className="px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-muted-foreground font-mono text-xs cursor-not-allowed opacity-75"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-indigo-400 flex items-center justify-between">
                      <span>Next Renewal Due Date *</span>
                      <span className="text-[9px] text-muted-foreground normal-case font-normal">(Change if wrong)</span>
                    </label>
                    <input
                      type="date"
                      value={editNextDueDateStr}
                      onChange={(e) => setEditNextDueDateStr(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-indigo-500/50 bg-card text-foreground font-mono text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Payment Method & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Payment Method</label>
                    <select
                      value={editPaymentMethod}
                      onChange={(e) => setEditPaymentMethod(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                    >
                      <option value="Bank Transfer">Bank Transfer (BDO, BPI, UnionBank)</option>
                      <option value="GCash">GCash / Maya</option>
                      <option value="Check">Check</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Notes / Comments</label>
                    <input
                      type="text"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Notes, branch location, etc."
                      className="px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border mt-1">
                  <Button type="button" variant="ghost" onClick={() => setEditingSub(null)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4"
                  >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* IN-MODAL DELETE CONFIRMATION TOAST */}
        {deleteConfirmSub && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 bg-card/95 backdrop-blur-md border border-rose-500/50 rounded-2xl shadow-2xl p-4 flex items-center gap-4 text-xs animate-in slide-in-from-bottom-5 fade-in duration-200 w-[94%] sm:w-auto max-w-xl">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-xs">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-left min-w-0 flex-1">
              <span className="font-bold text-foreground truncate">
                Delete "{deleteConfirmSub.name}"?
              </span>
              <span className="text-[11px] text-muted-foreground">
                Permanently removes this customer subscriber from {clientName}.
              </span>
            </div>
            <div className="flex items-center gap-2 pl-3 border-l border-border shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConfirmSub(null)}
                className="text-xs text-muted-foreground hover:text-foreground h-8 px-3"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={deletingId === deleteConfirmSub.id}
                onClick={() => executeDeleteSubscriber(deleteConfirmSub.id)}
                className="text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white h-8 px-3.5 shadow-xs"
              >
                {deletingId === deleteConfirmSub.id ? (
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
