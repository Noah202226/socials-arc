"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { 
  X, 
  Loader2, 
  Target, 
  DollarSign, 
  Calendar, 
  User, 
  Building, 
  Share2, 
  Clock, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Trash2,
  Edit,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeadDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: Id<"leads"> | null;
  onEdit: (lead: any) => void;
}

export function LeadDetailsDrawer({
  isOpen,
  onClose,
  leadId,
  onEdit,
}: LeadDetailsDrawerProps) {
  const leadData = useQuery(
    api.leads.getDetails,
    leadId ? { leadId } : "skip"
  );

  const updateStatus = useMutation(api.leads.updateStatus);
  const addActivity = useMutation(api.leads.addActivity);
  const deleteLead = useMutation(api.leads.deleteLead);

  const [noteMessage, setNoteMessage] = useState("");
  const [activityType, setActivityType] = useState<"note" | "response">("note");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen || !leadId) return null;

  if (leadData === undefined) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm flex justify-end">
        <div className="w-full max-w-xl bg-card border-l border-border h-full p-6 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 dark:text-[#05ffc4] mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Loading lead details & activity feed...</p>
        </div>
      </div>
    );
  }

  const { lead, activities, client, page } = leadData;

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus({ leadId: lead._id, newStatus });
      toast.success(`Lead moved to ${newStatus.replace("_", " ")}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteMessage.trim()) return;

    setIsSubmittingNote(true);
    try {
      await addActivity({
        leadId: lead._id,
        type: activityType,
        message: noteMessage.trim(),
      });
      setNoteMessage("");
      toast.success(activityType === "note" ? "Note added!" : "Response logged!");
    } catch (err: any) {
      toast.error(err.message || "Failed to add activity");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteLead({ leadId: lead._id });
      toast.success("Lead deleted");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete lead");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formattedValue = lead.value
    ? `${lead.currency || "USD"} ${(lead.value / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    : "No value set";

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "new":
        return "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/25";
      case "contacted":
        return "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/25";
      case "discussion":
        return "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/25";
      case "proposal_sent":
        return "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/25";
      case "won":
        return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25";
      case "lost":
        return "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/25";
      default:
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-card border-l border-border h-full flex flex-col overflow-hidden shadow-2xl">
        
        {/* Drawer Header */}
        <div className="p-6 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 dark:bg-[#05ffc4]/10 flex items-center justify-center text-indigo-600 dark:text-[#05ffc4] shrink-0 font-bold text-lg">
                {lead.platform === "instagram" ? "📸" : lead.platform === "tiktok" ? "🎵" : lead.platform === "linkedin" ? "💼" : "🎯"}
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  {lead.name}
                  {lead.handle && (
                    <span className="text-xs font-mono font-medium text-muted-foreground">
                      {lead.handle}
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(lead.status)} uppercase tracking-wider`}>
                    {lead.status.replace("_", " ")}
                  </span>
                  <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {formattedValue}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(lead)}
                className="h-8 px-2.5 text-xs"
              >
                <Edit className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick Stage Transitions */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] uppercase font-bold text-muted-foreground shrink-0 mr-1">Move to:</span>
            {["new", "contacted", "discussion", "proposal_sent", "won", "lost"].map((st) => {
              if (st === lead.status) return null;
              return (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-border bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0 capitalize"
                >
                  {st.replace("_", " ")}
                </button>
              );
            })}
          </div>
        </div>

        {/* Drawer Body Scroll */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-border bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Share2 className="h-3 w-3" /> Platform Source
              </span>
              <span className="text-xs font-semibold text-foreground capitalize">
                {lead.platform} {lead.source ? `(${lead.source})` : ""}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-border bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3 text-indigo-500 dark:text-[#05ffc4]" /> Next Follow-Up
              </span>
              <span className="text-xs font-semibold text-foreground">
                {lead.nextFollowUpAt
                  ? new Date(lead.nextFollowUpAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Not scheduled"}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-border bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Contact Details
              </span>
              <span className="text-xs font-semibold text-foreground truncate">
                {lead.contactInfo || "No details specified"}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-border bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Building className="h-3 w-3" /> Linked Client
              </span>
              <span className="text-xs font-semibold text-foreground truncate">
                {client ? client.name : "Unlinked"}
              </span>
            </div>
          </div>

          {/* General Notes */}
          {lead.notes && (
            <div className="p-4 rounded-xl border border-border bg-indigo-500/5 flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-[#05ffc4]">
                Internal Notes & Requirements
              </span>
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                {lead.notes}
              </p>
            </div>
          )}

          {/* Activity History & Notes Feed */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-indigo-500 dark:text-[#05ffc4]" /> Activity Timeline ({activities.length})
              </h3>
            </div>

            {/* Post Activity Input */}
            <form onSubmit={handleAddActivity} className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-background">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Type:</span>
                <button
                  type="button"
                  onClick={() => setActivityType("note")}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    activityType === "note"
                      ? "bg-indigo-650 text-white dark:bg-[#05ffc4] dark:text-[#0b0c0e]"
                      : "bg-zinc-100 dark:bg-zinc-800 text-muted-foreground"
                  }`}
                >
                  Internal Note
                </button>
                <button
                  type="button"
                  onClick={() => setActivityType("response")}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    activityType === "response"
                      ? "bg-indigo-650 text-white dark:bg-[#05ffc4] dark:text-[#0b0c0e]"
                      : "bg-zinc-100 dark:bg-zinc-800 text-muted-foreground"
                  }`}
                >
                  Client Response
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={
                    activityType === "note"
                      ? "Log internal note or call summary..."
                      : "Record client message or email response..."
                  }
                  value={noteMessage}
                  onChange={(e) => setNoteMessage(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#05ffc4]"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingNote || !noteMessage.trim()}
                  className="h-8 bg-indigo-650 dark:bg-[#05ffc4] dark:text-[#0b0c0e] font-bold text-xs"
                >
                  {isSubmittingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </form>

            {/* Timeline Item List */}
            {activities.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                No activity records yet. Add a note above to start logging communications.
              </div>
            ) : (
              <div className="flex flex-col gap-3 pl-3 border-l-2 border-indigo-500/20 dark:border-[#05ffc4]/20 ml-2">
                {activities.map((act) => (
                  <div key={act._id} className="flex flex-col gap-1 relative pl-4">
                    {/* Timeline bullet icon */}
                    <div className="absolute -left-[21px] top-0.5 h-3 w-3 rounded-full bg-indigo-500 dark:bg-[#05ffc4] border-2 border-background" />

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-foreground">{act.authorName}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(act._creationTime).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {act.message}
                    </p>

                    {act.type === "status_change" && act.previousStatus && act.newStatus && (
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {act.previousStatus.replace("_", " ")}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-[#05ffc4]">
                          {act.newStatus.replace("_", " ")}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danger Zone: Delete Lead */}
          <div className="pt-4 border-t border-border flex flex-col gap-2">
            {showDeleteConfirm ? (
              <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/5 flex flex-col gap-2">
                <span className="text-xs font-bold text-red-600 dark:text-red-400">
                  Are you sure you want to delete this lead?
                </span>
                <p className="text-[11px] text-muted-foreground">
                  This action is permanent and deletes all associated activity records.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="h-7 text-xs font-bold"
                  >
                    {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm Delete"}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs font-semibold text-red-500 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1.5 self-start py-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Lead Profile
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
