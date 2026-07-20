"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Target,
  Plus,
  Search,
  LayoutGrid,
  Table as TableIcon,
  DollarSign,
  TrendingUp,
  Award,
  Users,
  Calendar,
  Clock,
  Edit,
  Eye,
  Loader2,
  Building,
  CheckCircle2,
  XCircle,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadFormModal } from "@/components/leads/LeadFormModal";
import { LeadDetailsDrawer } from "@/components/leads/LeadDetailsDrawer";

export default function LeadsPage() {
  const params = useParams();
  const slug = params.workspaceSlug as string;

  const workspace = useQuery(api.workspaces.getBySlug, { slug });
  const workspaceId = workspace?._id;

  const metrics = useQuery(
    api.leads.getMetrics,
    workspaceId ? { workspaceId } : "skip"
  );

  const leads = useQuery(
    api.leads.listByWorkspace,
    workspaceId ? { workspaceId } : "skip"
  );

  const updateStatus = useMutation(api.leads.updateStatus);

  // Filter & View states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatusTab, setActiveStatusTab] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  // Modal & Drawer states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<any | null>(null);
  const [selectedLeadIdForDrawer, setSelectedLeadIdForDrawer] = useState<Id<"leads"> | null>(null);

  if (workspace === undefined || leads === undefined || metrics === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-muted-foreground font-sans">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-650 dark:text-[#05ffc4] mb-4" />
        <p className="text-sm font-medium">Loading Lead Monitoring Dashboard...</p>
      </div>
    );
  }

  if (workspace === null) {
    return (
      <div className="p-8 text-center text-red-500 font-bold">
        Workspace not found.
      </div>
    );
  }

  // Filter leads based on search query, status tab, and platform
  const filteredLeads = leads.filter((lead) => {
    // Search query filter
    const matchesSearch =
      !searchQuery.trim() ||
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.handle && lead.handle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lead.contactInfo && lead.contactInfo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lead.clientName && lead.clientName.toLowerCase().includes(searchQuery.toLowerCase()));

    // Status filter
    const matchesStatus =
      activeStatusTab === "all" || lead.status === activeStatusTab;

    // Platform filter
    const matchesPlatform =
      platformFilter === "all" || lead.platform === platformFilter;

    return matchesSearch && matchesStatus && matchesPlatform;
  });

  const openCreateModal = () => {
    setLeadToEdit(null);
    setIsModalOpen(true);
  };

  const openEditModal = (lead: any) => {
    setLeadToEdit(lead);
    setIsModalOpen(true);
  };

  const openDrawer = (leadId: Id<"leads">) => {
    setSelectedLeadIdForDrawer(leadId);
  };

  const handleQuickStatusChange = async (leadId: Id<"leads">, newStatus: string) => {
    try {
      await updateStatus({ leadId, newStatus });
      toast.success(`Lead status updated to ${newStatus.replace("_", " ")}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const getStatusBadgeClass = (st: string) => {
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

  const kanbanColumns = [
    { id: "new", label: "New Lead", icon: "🆕", color: "border-blue-500/30" },
    { id: "contacted", label: "Contacted", icon: "💬", color: "border-purple-500/30" },
    { id: "discussion", label: "In Discussion", icon: "🤝", color: "border-amber-500/30" },
    { id: "proposal_sent", label: "Proposal Sent", icon: "📄", color: "border-indigo-500/30" },
    { id: "won", label: "Won / Closed", icon: "🎉", color: "border-emerald-500/30" },
    { id: "lost", label: "Lost", icon: "❌", color: "border-red-500/30" },
  ];

  return (
    <div className="p-6 md:p-8 w-full max-w-9xl mx-auto flex flex-col gap-6 font-sans">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Target className="h-7 w-7 text-indigo-650 dark:text-[#05ffc4]" />
            Leads & CRM Pipeline
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Track social media agency leads, deal values, status stages, and conversion metrics.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-indigo-650 hover:bg-indigo-700 dark:bg-[#05ffc4] dark:hover:bg-[#00e5b0] text-white dark:text-[#0b0c0e] font-bold shadow-lg shadow-indigo-500/20 dark:shadow-[#05ffc4]/20 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Add Lead
        </Button>
      </div>

      {/* Metric KPI Cards (4 Cards Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Card 1: Total Leads */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Leads</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 dark:bg-[#05ffc4]/10 flex items-center justify-center text-indigo-600 dark:text-[#05ffc4]">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
              {metrics.totalLeads}
            </span>
            <span className="text-[11px] text-muted-foreground mt-1">
              Active pipeline & historical prospects
            </span>
          </div>
        </div>

        {/* Card 2: Active Pipeline Value */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Pipeline Value</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
              ${(metrics.activePipelineValue / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-muted-foreground mt-1">
              Unclosed deal estimate in cents
            </span>
          </div>
        </div>

        {/* Card 3: Total Won Value */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Won Revenue</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
              ${(metrics.wonValue / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-muted-foreground mt-1">
              {metrics.wonCount} won deals closed
            </span>
          </div>
        </div>

        {/* Card 4: Conversion Rate */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Win Conversion</span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
              {metrics.conversionRate}%
            </span>
            <span className="text-[11px] text-muted-foreground mt-1">
              {metrics.wonCount} won out of {metrics.wonCount + metrics.lostCount} closed
            </span>
          </div>
        </div>

      </div>

      {/* Filter Header Bar */}
      <div className="flex flex-col gap-4 p-4 rounded-2xl border border-border bg-card shadow-sm">

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search leads by name, handle, or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#05ffc4]"
            />
          </div>

          <div className="flex items-center gap-2">

            {/* Platform Filter Dropdown */}
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#05ffc4]"
            >
              <option value="all">All Platforms</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
              <option value="x">X (Twitter)</option>
              <option value="linkedin">LinkedIn</option>
              <option value="website">Website</option>
              <option value="other">Other</option>
            </select>

            {/* View Mode Toggle Button */}
            <div className="flex items-center p-1 rounded-xl border border-border bg-zinc-100 dark:bg-zinc-900">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${viewMode === "table"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <TableIcon className="h-3.5 w-3.5" /> Table
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${viewMode === "kanban"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Pipeline
              </button>
            </div>

          </div>

        </div>

        {/* Status Stage Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none border-t border-border pt-3">
          {[
            { id: "all", label: "All Leads", count: metrics.totalLeads },
            { id: "new", label: "New", count: metrics.statusCounts.new || 0 },
            { id: "contacted", label: "Contacted", count: metrics.statusCounts.contacted || 0 },
            { id: "discussion", label: "In Discussion", count: metrics.statusCounts.discussion || 0 },
            { id: "proposal_sent", label: "Proposal Sent", count: metrics.statusCounts.proposal_sent || 0 },
            { id: "won", label: "Won", count: metrics.statusCounts.won || 0 },
            { id: "lost", label: "Lost", count: metrics.statusCounts.lost || 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveStatusTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${activeStatusTab === tab.id
                ? "bg-indigo-650 text-white dark:bg-[#05ffc4] dark:text-[#0b0c0e] shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${activeStatusTab === tab.id
                ? "bg-white/20 dark:bg-black/20"
                : "bg-zinc-200 dark:bg-zinc-800"
                }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

      </div>

      {/* Main Content Area: Table vs Kanban */}
      {filteredLeads.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card flex flex-col items-center justify-center gap-3">
          <div className="h-12 w-12 rounded-full bg-indigo-500/10 dark:bg-[#05ffc4]/10 flex items-center justify-center text-indigo-600 dark:text-[#05ffc4]">
            <Target className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold text-foreground">No leads found</h3>
            <p className="text-xs text-muted-foreground">
              {searchQuery || activeStatusTab !== "all" || platformFilter !== "all"
                ? "Try adjusting your filters or search terms."
                : "Get started by adding your first agency prospect!"}
            </p>
          </div>
          <Button
            onClick={openCreateModal}
            size="sm"
            className="mt-2 bg-indigo-650 dark:bg-[#05ffc4] dark:text-[#0b0c0e] font-bold text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Lead
          </Button>
        </div>
      ) : viewMode === "table" ? (

        /* TABLE VIEW */
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-border text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Lead / Business</th>
                  <th className="px-4 py-3.5">Platform</th>
                  <th className="px-4 py-3.5">Status Stage</th>
                  <th className="px-4 py-3.5">Deal Value</th>
                  <th className="px-4 py-3.5">Next Follow-Up</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLeads.map((lead) => {
                  const valFormatted = lead.value
                    ? `${lead.currency || "USD"} ${(lead.value / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : "-";

                  return (
                    <tr
                      key={lead._id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors group"
                    >
                      {/* Name & Handle */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-foreground text-sm group-hover:text-indigo-650 dark:group-hover:text-[#05ffc4] transition-colors">
                            {lead.name}
                          </span>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            {lead.handle && <span className="font-mono">{lead.handle}</span>}
                            {lead.clientName && (
                              <span className="flex items-center gap-1 text-indigo-500 dark:text-[#05ffc4]">
                                <Building className="h-3 w-3" /> {lead.clientName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Platform Badge */}
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-foreground capitalize">
                          {lead.platform === "instagram" ? "📸" : lead.platform === "tiktok" ? "🎵" : lead.platform === "linkedin" ? "💼" : "🌐"}
                          {lead.platform}
                        </span>
                      </td>

                      {/* Status Selector Badge */}
                      <td className="px-4 py-4">
                        <select
                          value={lead.status}
                          onChange={(e) => handleQuickStatusChange(lead._id, e.target.value)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none uppercase tracking-wider ${getStatusBadgeClass(
                            lead.status
                          )}`}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="discussion">In Discussion</option>
                          <option value="proposal_sent">Proposal Sent</option>
                          <option value="won">Won</option>
                          <option value="lost">Lost</option>
                        </select>
                      </td>

                      {/* Deal Value */}
                      <td className="px-4 py-4">
                        <span className="font-mono font-bold text-foreground">
                          {valFormatted}
                        </span>
                      </td>

                      {/* Follow-Up Date */}
                      <td className="px-4 py-4 text-muted-foreground">
                        {lead.nextFollowUpAt ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-[#05ffc4]">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(lead.nextFollowUpAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        ) : (
                          <span className="text-[11px] text-zinc-400">None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDrawer(lead._id)}
                            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> View Activity
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(lead)}
                            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      ) : (

        /* KANBAN PIPELINE VIEW */
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
          {kanbanColumns.map((col) => {
            const colLeads = filteredLeads.filter((l) => l.status === col.id);

            return (
              <div
                key={col.id}
                className="w-72 shrink-0 flex flex-col gap-3 p-4 rounded-2xl border border-border bg-card shadow-sm min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span>{col.icon}</span>
                    <span>{col.label}</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground">
                    {colLeads.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                  {colLeads.map((lead) => {
                    const valFormatted = lead.value
                      ? `${lead.currency || "USD"} ${(lead.value / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      : null;

                    return (
                      <div
                        key={lead._id}
                        onClick={() => openDrawer(lead._id)}
                        className={`p-4 rounded-xl border ${col.color} bg-background hover:border-indigo-500/50 dark:hover:border-[#05ffc4]/50 cursor-pointer transition-all shadow-sm flex flex-col gap-2.5 group`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-xs text-foreground group-hover:text-indigo-650 dark:group-hover:text-[#05ffc4] transition-colors">
                            {lead.name}
                          </span>
                          <span className="text-xs">
                            {lead.platform === "instagram" ? "📸" : lead.platform === "tiktok" ? "🎵" : "💼"}
                          </span>
                        </div>

                        {lead.handle && (
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {lead.handle}
                          </span>
                        )}

                        {valFormatted && (
                          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md self-start">
                            {valFormatted}
                          </span>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                          {lead.nextFollowUpAt ? (
                            <span className="flex items-center gap-1 text-indigo-500 dark:text-[#05ffc4]">
                              <Calendar className="h-3 w-3" />
                              {new Date(lead.nextFollowUpAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          ) : (
                            <span>No follow-up</span>
                          )}

                          <span className="group-hover:underline flex items-center gap-0.5">
                            Details <Eye className="h-3 w-3 ml-0.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      )}

      {/* Form Modal */}
      <LeadFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        workspaceId={workspace._id}
        leadToEdit={leadToEdit}
      />

      {/* Details & Activity Feed Drawer */}
      <LeadDetailsDrawer
        isOpen={!!selectedLeadIdForDrawer}
        onClose={() => setSelectedLeadIdForDrawer(null)}
        leadId={selectedLeadIdForDrawer}
        onEdit={(lead) => {
          setSelectedLeadIdForDrawer(null);
          openEditModal(lead);
        }}
      />

    </div>
  );
}
