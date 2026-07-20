"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { X, Loader2, Target, DollarSign, Calendar, User, Building, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: Id<"workspaces">;
  leadToEdit?: {
    _id: Id<"leads">;
    name: string;
    handle?: string;
    platform: "instagram" | "facebook" | "tiktok" | "x" | "linkedin" | "website" | "other";
    status: string;
    contactInfo?: string;
    source?: string;
    value?: number; // integer cents
    currency?: string;
    assigneeId?: string;
    clientId?: Id<"clients">;
    pageId?: Id<"socialPages">;
    notes?: string;
    nextFollowUpAt?: number;
  } | null;
}

export function LeadFormModal({
  isOpen,
  onClose,
  workspaceId,
  leadToEdit,
}: LeadFormModalProps) {
  const createLead = useMutation(api.leads.create);
  const updateLeadDetails = useMutation(api.leads.updateDetails);

  const clients = useQuery(api.clients.list, { workspaceId });
  const members = useQuery(api.members.listActiveMembers, { workspaceId });
  const workspacePages = useQuery(api.socialPages.listByWorkspace, { workspaceId });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState<"instagram" | "facebook" | "tiktok" | "x" | "linkedin" | "website" | "other">("instagram");
  const [status, setStatus] = useState<string>("new");
  const [valueDollars, setValueDollars] = useState<string>("");
  const [currency, setCurrency] = useState("USD");
  const [clientId, setClientId] = useState<string>("");
  const [pageId, setPageId] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [contactInfo, setContactInfo] = useState("");
  const [source, setSource] = useState("Inbound DM");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (leadToEdit) {
      setName(leadToEdit.name || "");
      setHandle(leadToEdit.handle || "");
      setPlatform(leadToEdit.platform || "instagram");
      setStatus(leadToEdit.status || "new");
      setValueDollars(leadToEdit.value ? (leadToEdit.value / 100).toString() : "");
      setCurrency(leadToEdit.currency || "USD");
      setClientId(leadToEdit.clientId || "");
      setPageId(leadToEdit.pageId || "");
      setAssigneeId(leadToEdit.assigneeId || "");
      setContactInfo(leadToEdit.contactInfo || "");
      setSource(leadToEdit.source || "Inbound DM");
      setNotes(leadToEdit.notes || "");

      if (leadToEdit.nextFollowUpAt) {
        const dateStr = new Date(leadToEdit.nextFollowUpAt).toISOString().split("T")[0];
        setNextFollowUpDate(dateStr);
      } else {
        setNextFollowUpDate("");
      }
    } else {
      // Reset defaults for create mode
      setName("");
      setHandle("");
      setPlatform("instagram");
      setStatus("new");
      setValueDollars("");
      setCurrency("USD");
      setClientId("");
      setPageId("");
      setAssigneeId("");
      setContactInfo("");
      setSource("Inbound DM");
      setNextFollowUpDate("");
      setNotes("");
    }
  }, [leadToEdit, isOpen]);

  if (!isOpen) return null;

  // Filter pages matching selected client (if client selected)
  const availablePages = workspacePages
    ? workspacePages.filter((p) => !clientId || p.clientId === clientId)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Lead or Business Name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      // Currency conversion rule: convert input dollars to integer cents
      let valCents: number | undefined = undefined;
      if (valueDollars.trim() !== "") {
        const parsed = parseFloat(valueDollars);
        if (!isNaN(parsed) && parsed >= 0) {
          valCents = Math.round(parsed * 100);
        }
      }

      let followUpTimestamp: number | undefined = undefined;
      if (nextFollowUpDate) {
        followUpTimestamp = new Date(nextFollowUpDate).getTime();
      }

      const formattedHandle = handle.trim().startsWith("@") ? handle.trim() : handle.trim() ? `@${handle.trim()}` : undefined;

      if (leadToEdit) {
        await updateLeadDetails({
          leadId: leadToEdit._id,
          name: name.trim(),
          handle: formattedHandle,
          platform,
          status,
          value: valCents,
          currency,
          clientId: clientId ? (clientId as Id<"clients">) : undefined,
          pageId: pageId ? (pageId as Id<"socialPages">) : undefined,
          assigneeId: assigneeId || undefined,
          contactInfo: contactInfo.trim() || undefined,
          source: source.trim() || undefined,
          nextFollowUpAt: followUpTimestamp,
          notes: notes.trim() || undefined,
        });
        toast.success("Lead updated successfully!");
      } else {
        await createLead({
          workspaceId,
          name: name.trim(),
          handle: formattedHandle,
          platform,
          status,
          value: valCents,
          currency,
          clientId: clientId ? (clientId as Id<"clients">) : undefined,
          pageId: pageId ? (pageId as Id<"socialPages">) : undefined,
          assigneeId: assigneeId || undefined,
          contactInfo: contactInfo.trim() || undefined,
          source: source.trim() || undefined,
          nextFollowUpAt: followUpTimestamp,
          notes: notes.trim() || undefined,
        });
        toast.success("Lead created successfully!");
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save lead");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 dark:bg-[#05ffc4]/10 flex items-center justify-center text-indigo-600 dark:text-[#05ffc4]">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {leadToEdit ? "Edit Lead Profile" : "Create New Lead"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {leadToEdit ? "Update lead details, deal value, and pipeline status." : "Add a prospect to track discussion stage, deal size, and follow-up timing."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto">
          
          {/* Grid 1: Basic Lead Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Lead Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-indigo-500 dark:text-[#05ffc4]" />
                Lead / Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Acme Studio or Sarah Jenkins"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#05ffc4]"
              />
            </div>

            {/* Social Handle */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5 text-indigo-500 dark:text-[#05ffc4]" />
                Social Handle (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. @acmestudio"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#05ffc4]"
              />
            </div>

            {/* Platform Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">Platform Source</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as any)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#05ffc4]"
              >
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="x">X (Twitter)</option>
                <option value="linkedin">LinkedIn</option>
                <option value="website">Website</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Status Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">Pipeline Stage</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#05ffc4]"
              >
                <option value="new">🆕 New Lead</option>
                <option value="contacted">💬 Contacted</option>
                <option value="discussion">🤝 In Discussion</option>
                <option value="proposal_sent">📄 Proposal Sent</option>
                <option value="won">🎉 Won / Closed</option>
                <option value="lost">❌ Lost</option>
              </select>
            </div>
          </div>

          {/* Grid 2: Deal Size & Currency */}
          <div className="p-4 rounded-xl border border-border bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-emerald-500" /> Estimated Deal Value
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Deal Amount ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 1500.00"
                    value={valueDollars}
                    onChange={(e) => setValueDollars(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-border bg-background font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#05ffc4]"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">Stored as integer cents ($1,500.00 = 150000 cents).</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#05ffc4]"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="PHP">PHP (₱)</option>
                  <option value="AUD">AUD ($)</option>
                  <option value="CAD">CAD ($)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Grid 3: Assignment & Client Linking */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Team Assignee */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#05ffc4]"
              >
                <option value="">Unassigned</option>
                {members?.map((m) => (
                  <option key={m._id} value={m.userId}>
                    {m.invitedEmail || m.userId} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Linked Client */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Building className="h-3.5 w-3.5 text-muted-foreground" /> Client (Optional)
              </label>
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setPageId(""); // reset page selection if client changes
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#05ffc4]"
              >
                <option value="">No Client Linked</option>
                {clients?.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Linked Social Page */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">Social Page (Optional)</label>
              <select
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#05ffc4]"
              >
                <option value="">No Social Page Linked</option>
                {availablePages.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.platform}: @{p.handle}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid 4: Contact Info, Source, & Follow-up */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">Contact Details</label>
              <input
                type="text"
                placeholder="e.g. email@brand.com or +1 555-0192"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#05ffc4]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">Acquisition Source</label>
              <input
                type="text"
                placeholder="e.g. Inbound DM, Ad Campaign, Referral"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#05ffc4]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-500 dark:text-[#05ffc4]" /> Next Follow-Up Date
              </label>
              <input
                type="date"
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#05ffc4]"
              />
            </div>
          </div>

          {/* General Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Internal Notes & Scope</label>
            <textarea
              rows={3}
              placeholder="Outline project requirements, client budget expectations, or discussion summary..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#05ffc4] resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-650 hover:bg-indigo-700 dark:bg-[#05ffc4] dark:hover:bg-[#00e5b0] text-white dark:text-[#0b0c0e] font-bold shadow-lg shadow-indigo-500/20 dark:shadow-[#05ffc4]/20"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {leadToEdit ? "Save Changes" : "Create Lead"}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
