"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { 
  Plus, 
  Loader2, 
  Users, 
  FolderKanban, 
  Layers, 
  ToggleLeft, 
  ToggleRight, 
  Globe, 
  Instagram, 
  Facebook, 
  Linkedin,
  X as CloseIcon,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Link2,
  Trash2,
  AlertTriangle,
  Package,
  Search,
  CheckSquare,
  ArrowRight,
  Building2,
  UserCheck,
  UserPlus,
  Shield,
  User,
  Activity,
  Server,
  ShoppingCart,
  DollarSign
} from "lucide-react";
import ClientAssetModal from "@/components/clients/ClientAssetModal";
import ClientTransactionModal from "@/components/clients/ClientTransactionModal";
import ClientSubscribersModal from "@/components/clients/ClientSubscribersModal";
import { formatCurrencyCents } from "@/lib/currency";

// Platform helper config
const platforms = [
  { value: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/25 border-pink-200 dark:border-pink-900/30" },
  { value: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/25 border-blue-200 dark:border-blue-900/30" },
  { value: "tiktok", label: "TikTok", icon: Globe, color: "text-teal-600 dark:text-[#05ffc4] bg-teal-50 dark:bg-[#05ffc4]/10 border-teal-200 dark:border-[#05ffc4]/20" },
  { value: "x", label: "X (Twitter)", icon: Globe, color: "text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800" },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/25 border-indigo-200 dark:border-indigo-900/30" },
];

export default function ClientsPage() {
  const params = useParams();
  const slug = params.workspaceSlug as string;

  // Convex State Queries
  const workspace = useQuery(api.workspaces.getBySlug, { slug });
  
  const clients = useQuery(
    api.clients.list,
    workspace ? { workspaceId: workspace._id } : "skip"
  );
  const projects = useQuery(
    api.projects.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip"
  );
  const socialPages = useQuery(
    api.socialPages.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip"
  );
  const tasks = useQuery(
    api.tasks.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip"
  );
  const members = useQuery(
    api.workspaces.listMembers,
    workspace ? { workspaceId: workspace._id } : "skip"
  );
  const netSummary = useQuery(
    api.clientAssets.getClientNetSummary,
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  // Currency Code from Workspace Settings
  const currencyCode = workspace?.settings?.currency || "PHP";

  // Mutations
  const createClient = useMutation(api.clients.create);
  const toggleClientActive = useMutation(api.clients.toggleActive);
  const deleteClient = useMutation(api.clients.remove);
  const updateAssignedMembers = useMutation(api.clients.updateAssignedMembers);

  const createProject = useMutation(api.projects.create);
  const updateProjectStatus = useMutation(api.projects.updateStatus);
  const deleteProject = useMutation(api.projects.remove);
  
  const createSocialPage = useMutation(api.socialPages.create);
  const togglePageActive = useMutation(api.socialPages.toggleActive);
  const deleteSocialPage = useMutation(api.socialPages.remove);

  const updateTaskStatus = useMutation(api.tasks.updateStatus);

  // Asset Inventory Modal state
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetModalClientId, setAssetModalClientId] = useState<any>(null);
  const [assetModalClientName, setAssetModalClientName] = useState("");

  // Client Direct Transactions Modal state (Hetzner, Cloud VPS, Invoices, Retainers)
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txModalClientId, setTxModalClientId] = useState<any>(null);
  const [txModalClientName, setTxModalClientName] = useState("");

  // Customer Subscribers Modal state (Cliniqly Clinic Subscriptions, Annual Renewals)
  const [subscribersModalOpen, setSubscribersModalOpen] = useState(false);
  const [subscribersModalClientId, setSubscribersModalClientId] = useState<any>(null);
  const [subscribersModalClientName, setSubscribersModalClientName] = useState("");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");

  // Component local states (Modals)
  const [activeModal, setActiveModal] = useState<null | "client" | "project" | "page" | "assign_members" | "delete_client" | "delete_project" | "delete_page">(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  // Assign Members Modal State
  const [assignModalClientId, setAssignModalClientId] = useState<string>("");
  const [assignModalClientName, setAssignModalClientName] = useState<string>("");
  const [assignedMembersSelection, setAssignedMembersSelection] = useState<string[]>([]);
  
  // Deletion Target States
  const [deleteTargetClientId, setDeleteTargetClientId] = useState<string>("");
  const [deleteTargetClientName, setDeleteTargetClientName] = useState<string>("");
  const [deleteTargetProjectId, setDeleteTargetProjectId] = useState<string>("");
  const [deleteTargetProjectName, setDeleteTargetProjectName] = useState<string>("");
  const [deleteTargetPageId, setDeleteTargetPageId] = useState<string>("");
  const [deleteTargetPageHandle, setDeleteTargetPageHandle] = useState<string>("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Form States
  const [clientName, setClientName] = useState("");
  const [initialClientMemberIds, setInitialClientMemberIds] = useState<string[]>([]);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [pagePlatform, setPagePlatform] = useState("instagram");
  const [pageHandle, setPageHandle] = useState("");

  const [loadingAction, setLoadingAction] = useState(false);

  // Handlers
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !workspace) return;
    setLoadingAction(true);
    try {
      await createClient({
        workspaceId: workspace._id,
        name: clientName.trim(),
        assignedMemberIds: initialClientMemberIds,
      });
      toast.success(`Client "${clientName.trim()}" created successfully!`);
      setClientName("");
      setInitialClientMemberIds([]);
      setActiveModal(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create client.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !selectedClientId) return;
    setLoadingAction(true);
    try {
      await createProject({
        clientId: selectedClientId as any,
        name: projectName.trim(),
        description: projectDesc.trim() || undefined,
      });
      toast.success(`Campaign "${projectName.trim()}" initialized!`);
      setProjectName("");
      setProjectDesc("");
      setActiveModal(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create project.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateSocialPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageHandle.trim() || !selectedClientId) return;
    setLoadingAction(true);
    try {
      await createSocialPage({
        clientId: selectedClientId as any,
        platform: pagePlatform as any,
        handle: pageHandle.trim().replace(/^@/, ""),
      });
      toast.success(`Channel @${pageHandle.trim().replace(/^@/, "")} linked!`);
      setPageHandle("");
      setActiveModal(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to connect social page.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSaveAssignedMembers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalClientId) return;
    setLoadingAction(true);
    try {
      await updateAssignedMembers({
        clientId: assignModalClientId as any,
        assignedMemberIds: assignedMembersSelection,
      });
      toast.success(`Assigned team updated for "${assignModalClientName}"!`);
      setActiveModal(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update assigned members.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmText.toLowerCase() !== "delete") {
      toast.error("Please type DELETE to confirm");
      return;
    }
    setLoadingAction(true);
    try {
      await deleteClient({ clientId: deleteTargetClientId as any });
      toast.success(`Client profile "${deleteTargetClientName}" deleted successfully.`);
      setActiveModal(null);
      setDeleteConfirmText("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete client.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmText.toLowerCase() !== "delete") {
      toast.error("Please type DELETE to confirm");
      return;
    }
    setLoadingAction(true);
    try {
      await deleteProject({ projectId: deleteTargetProjectId as any });
      toast.success(`Campaign "${deleteTargetProjectName}" deleted successfully.`);
      setActiveModal(null);
      setDeleteConfirmText("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete project.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteSocialPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmText.toLowerCase() !== "disconnect") {
      toast.error("Please type DISCONNECT to confirm");
      return;
    }
    setLoadingAction(true);
    try {
      await deleteSocialPage({ pageId: deleteTargetPageId as any });
      toast.success(`Social page @${deleteTargetPageHandle} disconnected.`);
      setActiveModal(null);
      setDeleteConfirmText("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to disconnect page.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleToggleTask = async (taskId: any, currentStatus: string) => {
    const nextStatus = currentStatus === "done" ? "todo" : "done";
    try {
      await updateTaskStatus({ taskId, status: nextStatus });
      toast.success(nextStatus === "done" ? "Task marked complete!" : "Task reopened.");
    } catch (err: any) {
      toast.error("Failed to update task.");
    }
  };

  // Helper to open assign team modal
  const openAssignMembersModal = (client: any) => {
    setAssignModalClientId(client._id);
    setAssignModalClientName(client.name);
    setAssignedMembersSelection(client.assignedMemberIds || []);
    setActiveModal("assign_members");
  };

  // Filtered clients list
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    return clients.filter((client) => {
      // Status filter
      if (statusFilter === "active" && !client.isActive) return false;
      if (statusFilter === "paused" && client.isActive) return false;

      // Query filter
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      
      const matchesClientName = client.name.toLowerCase().includes(query);
      
      // Match client's projects
      const clientProjectMatches = projects?.some(
        p => p.clientId === client._id && p.name.toLowerCase().includes(query)
      );

      // Match client's social pages
      const clientPageMatches = socialPages?.some(
        p => p.clientId === client._id && p.handle.toLowerCase().includes(query)
      );

      // Match assigned members' names
      const assignedMemberMatches = members?.some(
        m => (client.assignedMemberIds || []).includes(m.userId) && (
          (m.userName && m.userName.toLowerCase().includes(query)) ||
          (m.userEmail && m.userEmail.toLowerCase().includes(query))
        )
      );

      return matchesClientName || clientProjectMatches || clientPageMatches || assignedMemberMatches;
    });
  }, [clients, projects, socialPages, members, searchQuery, statusFilter]);

  // Overall KPI statistics
  const kpiStats = useMemo(() => {
    const totalClientsCount = clients?.length || 0;
    const activeClientsCount = clients?.filter(c => c.isActive).length || 0;
    const totalChannelsCount = socialPages?.length || 0;
    const totalProjectsCount = projects?.length || 0;
    const totalOpenTasksCount = tasks?.filter(t => t.status !== "done").length || 0;
    
    // Total Inventory Valuation across all clients
    let totalValuation = 0;
    if (netSummary?.summariesByClient) {
      Object.values(netSummary.summariesByClient).forEach((s: any) => {
        totalValuation += s.assetValuation || 0;
      });
    }

    return {
      totalClientsCount,
      activeClientsCount,
      totalChannelsCount,
      totalProjectsCount,
      totalOpenTasksCount,
      totalValuation,
    };
  }, [clients, socialPages, projects, tasks, netSummary]);

  if (workspace === undefined || clients === undefined || projects === undefined || socialPages === undefined || tasks === undefined || members === undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin text-[#05ffc4] mb-4" />
        <p className="text-sm font-medium">Fetching clients, team, and campaigns...</p>
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full text-left">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
            <Users className="h-6 w-6 text-[#05ffc4]" /> Clients & Connections
          </h2>
          <p className="text-xs text-zinc-500 max-w-2xl">
            Unified command hub for all client accounts. Monitor assigned team members, campaigns, pending tasks, connected social channels, and inventory valuations.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button 
            onClick={() => {
              setClientName("");
              setInitialClientMemberIds([]);
              setActiveModal("client");
            }} 
            className="bg-gradient-to-r from-[#00f5a0] to-[#00d9f5] hover:opacity-90 text-[#0b0c0e] font-extrabold text-xs shadow-lg shadow-[#05ffc4]/15 border border-[#05ffc4]/20 rounded-lg px-4 py-2"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Client
          </Button>
        </div>
      </div>

      {/* Top Agency KPI Executive Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-3.5 rounded-xl border border-border bg-card/60 backdrop-blur-xs flex flex-col gap-1 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Clients</span>
            <Building2 className="h-3.5 w-3.5 text-[#05ffc4]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-foreground">{kpiStats.totalClientsCount}</span>
            <span className="text-[10px] text-zinc-500 font-semibold">({kpiStats.activeClientsCount} active)</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card/60 backdrop-blur-xs flex flex-col gap-1 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] uppercase font-bold tracking-wider">Agency MRR</span>
            <Layers className="h-3.5 w-3.5 text-[#05ffc4]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-[#05ffc4]">
              {formatCurrencyCents(netSummary?.workspaceTotals?.monthlyRecurringRevenue || 0, currencyCode)}
            </span>
            <span className="text-[10px] text-zinc-500 font-semibold">/mo recurring</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card/60 backdrop-blur-xs flex flex-col gap-1 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] uppercase font-bold tracking-wider">Daily Run Rate</span>
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-400">
              {formatCurrencyCents(netSummary?.workspaceTotals?.dailyRecognizedIncome || 0, currencyCode)}
            </span>
            <span className="text-[10px] text-zinc-500 font-semibold">/day pace</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card/60 backdrop-blur-xs flex flex-col gap-1 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] uppercase font-bold tracking-wider">Cloud & VPS Burn</span>
            <Server className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-amber-400">
              {formatCurrencyCents(netSummary?.workspaceTotals?.monthlyInfrastructureExpense || 0, currencyCode)}
            </span>
            <span className="text-[10px] text-zinc-500 font-semibold">/mo hosting</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card/60 backdrop-blur-xs flex flex-col gap-1 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] uppercase font-bold tracking-wider">Open Tasks</span>
            <CheckSquare className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-purple-400">{kpiStats.totalOpenTasksCount}</span>
            <span className="text-[10px] text-zinc-500 font-semibold">pending</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card/60 backdrop-blur-xs flex flex-col gap-1 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] uppercase font-bold tracking-wider">Inventory & Parts</span>
            <Package className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-indigo-400">
              {formatCurrencyCents(kpiStats.totalValuation, currencyCode)}
            </span>
          </div>
          {(netSummary?.workspaceTotals?.remainingBnplLiability || 0) > 0 && (
            <span className="text-[9px] text-amber-400 font-mono font-bold flex items-center gap-1">
              <ShoppingCart className="h-2.5 w-2.5" /> BNPL Debt: {formatCurrencyCents(netSummary?.workspaceTotals?.remainingBnplLiability || 0, currencyCode)}
            </span>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/40 p-2.5 rounded-xl border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client, campaign, @handle, or member..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-muted/40 border border-border rounded-lg text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-[#05ffc4] transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-foreground"
            >
              <CloseIcon className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Status:</span>
          <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                statusFilter === "all" ? "bg-background text-[#05ffc4] shadow-xs" : "text-zinc-500 hover:text-foreground"
              }`}
            >
              All ({clients.length})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                statusFilter === "active" ? "bg-background text-emerald-400 shadow-xs" : "text-zinc-500 hover:text-foreground"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter("paused")}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                statusFilter === "paused" ? "bg-background text-zinc-300 shadow-xs" : "text-zinc-500 hover:text-foreground"
              }`}
            >
              Paused
            </button>
          </div>
        </div>
      </div>

      {/* Main Client Hub Grid */}
      {filteredClients.length === 0 ? (
        <div className="p-16 rounded-2xl border border-border border-dashed bg-card/30 text-center flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-zinc-500 border border-border">
            <Users className="h-6 w-6 text-zinc-400" />
          </div>
          <div className="flex flex-col gap-1 text-center items-center">
            <h4 className="text-sm font-bold text-foreground">
              {searchQuery ? "No matching clients found" : "No clients configured yet"}
            </h4>
            <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
              {searchQuery 
                ? "Try adjusting your search criteria or clear the query filter." 
                : "Create your first client profile to start linking social media accounts, organizing campaigns, and assigning team members."}
            </p>
          </div>
          {searchQuery ? (
            <Button onClick={() => setSearchQuery("")} className="bg-muted border border-border text-xs font-bold px-4">
              Clear Search Query
            </Button>
          ) : (
            <Button 
              onClick={() => {
                setClientName("");
                setInitialClientMemberIds([]);
                setActiveModal("client");
              }} 
              className="bg-gradient-to-r from-[#00f5a0] to-[#00d9f5] text-[#0b0c0e] font-extrabold text-xs px-4"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Create Client Profile
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredClients.map((client) => {
            const clientProjects = projects.filter(p => p.clientId === client._id);
            const clientPages = socialPages.filter(p => p.clientId === client._id);
            
            // Client tasks: all tasks belonging to this client's projects
            const clientTasks = tasks.filter(t => clientProjects.some(p => p._id === t.projectId));
            const openTasks = clientTasks.filter(t => t.status !== "done");

            // Client Assigned Members resolution
            const assignedIds = client.assignedMemberIds || [];
            const assignedMembersList = members.filter(m => assignedIds.includes(m.userId));
            
            // Active task contributors who aren't explicitly assigned
            const taskAssigneeUserIds = Array.from(new Set(clientTasks.map(t => t.assigneeId).filter(Boolean))) as string[];
            const taskContributorsList = members.filter(m => !assignedIds.includes(m.userId) && taskAssigneeUserIds.includes(m.userId));

            const clientSummary = netSummary?.summariesByClient?.[client._id];
            const assetValuation = clientSummary?.assetValuation || 0;
            const netWorth = clientSummary?.totalClientNetWorth || 0;

            // Generate initials for avatar fallback
            const initials = client.name
              .split(" ")
              .map(word => word[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <div key={client._id} className="relative group/card">
                {/* 3D gradient ambient glow */}
                <div className="absolute -inset-px bg-gradient-to-tr from-[#05ffc4]/20 to-[#00d9f5]/20 rounded-2xl blur-xs opacity-0 group-hover/card:opacity-100 transition duration-500 pointer-events-none" />

                <div className="relative rounded-2xl border border-border bg-card/90 backdrop-blur-md hover:border-[#05ffc4]/40 hover:shadow-xl hover:shadow-[#05ffc4]/5 transition-all duration-300 flex flex-col overflow-hidden">
                  
                  {/* Card Top Header */}
                  <div className="p-5 border-b border-border/80 bg-muted/15 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      
                      {/* Avatar & Title */}
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#00f5a0]/15 to-[#00d9f5]/15 border border-[#05ffc4]/30 flex items-center justify-center font-black text-sm text-[#05ffc4] shadow-xs">
                          {initials || "CL"}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-extrabold text-foreground group-hover/card:text-[#05ffc4] transition-colors">
                              {client.name}
                            </h3>
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-sm border ${
                              client.isActive 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                            }`}>
                              {client.isActive ? "Active" : "Paused"}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">
                            Client Account
                          </span>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => toggleClientActive({ clientId: client._id, isActive: !client.isActive })}
                          className={`p-1.5 rounded-lg transition-colors ${client.isActive ? "text-[#05ffc4] hover:bg-[#05ffc4]/10" : "text-zinc-600 hover:text-zinc-400 hover:bg-muted"}`}
                          title={client.isActive ? "Pause Client" : "Activate Client"}
                        >
                          {client.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                        </button>

                        <button
                          onClick={() => {
                            setDeleteTargetClientId(client._id);
                            setDeleteTargetClientName(client.name);
                            setActiveModal("delete_client");
                          }}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete Client Profile"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Financial Rollup & Normalized Recurring Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-left">
                      <div 
                        onClick={() => {
                          if ((clientSummary?.subscriberCount || 0) > 0) {
                            setSubscribersModalClientId(client._id);
                            setSubscribersModalClientName(client.name);
                            setSubscribersModalOpen(true);
                          }
                        }}
                        className={`bg-card/70 border border-border/80 rounded-lg p-2 flex flex-col ${(clientSummary?.subscriberCount || 0) > 0 ? "cursor-pointer hover:border-indigo-500/40 transition-colors group" : ""}`}
                        title={(clientSummary?.subscriberCount || 0) > 0 ? "Click to view customer subscribers & annual renewals" : undefined}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${(clientSummary?.subscriberCount || 0) > 0 ? "text-zinc-500 group-hover:text-indigo-400" : "text-zinc-500"}`}>
                            Monthly MRR
                          </span>
                          {(clientSummary?.subscriberCount || 0) > 0 && (
                            <Users className="h-2.5 w-2.5 text-indigo-400" />
                          )}
                        </div>
                        <span className="text-xs font-bold font-mono text-[#05ffc4]">
                          {formatCurrencyCents(
                            (clientSummary?.subscribersMRR || 0) > 0
                              ? Math.max(clientSummary?.subscribersMRR || 0, clientSummary?.monthlyRecurringIncome || 0)
                              : (clientSummary?.monthlyRecurringIncome || 0),
                            currencyCode
                          )}/mo
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono truncate">
                          {(clientSummary?.subscribersARR || 0) > 0 ? (
                            <span className="text-indigo-400 font-semibold">
                              ARR: {formatCurrencyCents(clientSummary?.subscribersARR || 0, currencyCode)} ({clientSummary?.subscriberCount} {clientSummary?.subscriberCount === 1 ? "sub" : "subs"})
                            </span>
                          ) : (
                            `${formatCurrencyCents(clientSummary?.dailyRecognizedIncome || 0, currencyCode)}/day pace`
                          )}
                        </span>
                      </div>
                      
                      <div 
                        onClick={() => {
                          setTxModalClientId(client._id);
                          setTxModalClientName(client.name);
                          setTxModalOpen(true);
                        }}
                        className="bg-card/70 border border-border/80 hover:border-amber-500/40 rounded-lg p-2 flex flex-col cursor-pointer transition-colors group"
                        title="Click to log or inspect Hetzner / Cloud Server transactions"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-zinc-500 group-hover:text-amber-400 font-bold uppercase tracking-wider">Cloud & Servers</span>
                          <DollarSign className="h-2.5 w-2.5 text-amber-500/60 group-hover:text-amber-400" />
                        </div>
                        <span className="text-xs font-bold font-mono text-amber-400">
                          {formatCurrencyCents(clientSummary?.monthlyRecurringExpense || 0, currencyCode)}/mo
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono truncate">
                          {(clientSummary?.cloudHostingExpense || 0) > 0 ? (
                            <span className="text-cyan-400 font-semibold">Hetzner: {formatCurrencyCents(clientSummary?.cloudHostingExpense || 0, currencyCode)}</span>
                          ) : (
                            `${formatCurrencyCents(clientSummary?.dailyExpenseBurn || 0, currencyCode)}/day burn`
                          )}
                        </span>
                      </div>

                      <div className="bg-card/70 border border-border/80 rounded-lg p-2 flex flex-col">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Daily Net Pace</span>
                        <span className={`text-xs font-bold font-mono ${(clientSummary?.dailyNetProfit || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {(clientSummary?.dailyNetProfit || 0) >= 0 ? "+" : ""}
                          {formatCurrencyCents(clientSummary?.dailyNetProfit || 0, currencyCode)}/day
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono truncate">
                          Net: {(clientSummary?.financialNet || 0) >= 0 ? "+" : ""}{formatCurrencyCents(clientSummary?.financialNet || 0, currencyCode)}
                        </span>
                      </div>

                      <div className="bg-card/70 border border-border/80 rounded-lg p-2 flex flex-col">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Pending Work</span>
                        <span className={`text-xs font-bold font-mono flex items-center gap-1 ${
                          openTasks.length > 0 ? "text-amber-400" : "text-zinc-400"
                        }`}>
                          {openTasks.length > 0 ? (
                            <>
                              <Clock className="h-3 w-3" /> {openTasks.length} task{openTasks.length > 1 ? "s" : ""}
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" /> All clear
                            </>
                          )}
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono truncate">
                          Net Worth: {formatCurrencyCents(netWorth, currencyCode)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Body: Assigned Team Members Section */}
                  <div className="p-4 border-b border-border/70 bg-card/40 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-[#05ffc4]" /> Assigned Team ({assignedMembersList.length})
                      </h4>
                      <Button
                        size="sm"
                        onClick={() => openAssignMembersModal(client)}
                        className="text-[10px] h-6 px-2 bg-muted/60 hover:bg-muted border border-border text-zinc-300 hover:text-foreground font-bold rounded-md"
                      >
                        <UserPlus className="h-3 w-3 mr-1 text-[#05ffc4]" /> Manage Team
                      </Button>
                    </div>

                    {assignedMembersList.length === 0 && taskContributorsList.length === 0 ? (
                      <div className="p-2.5 rounded-xl border border-dashed border-border/70 bg-muted/10 flex items-center justify-between text-xs text-zinc-500">
                        <span className="italic text-[11px]">No team members assigned yet.</span>
                        <button
                          onClick={() => openAssignMembersModal(client)}
                          className="text-[10px] font-bold text-[#05ffc4] hover:underline flex items-center gap-1"
                        >
                          Assign members <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 items-center">
                        {/* Explicitly Assigned Members */}
                        {assignedMembersList.map((member) => {
                          const mName = member.userName || member.userEmail?.split("@")[0] || "Team Member";
                          const mInitials = mName
                            .split(" ")
                            .map((n: string) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase();

                          return (
                            <div 
                              key={member._id}
                              className="inline-flex items-center gap-2 px-2 py-1 rounded-lg border border-border/90 bg-muted/30 hover:bg-muted/50 transition-colors shadow-2xs"
                              title={`${mName} (${member.role})`}
                            >
                              {member.pictureUrl ? (
                                <img 
                                  src={member.pictureUrl} 
                                  alt={mName} 
                                  className="h-5 w-5 rounded-full object-cover border border-[#05ffc4]/30"
                                />
                              ) : (
                                <div className="h-5 w-5 rounded-full bg-gradient-to-tr from-[#05ffc4]/20 to-[#00d9f5]/20 text-[#05ffc4] border border-[#05ffc4]/30 flex items-center justify-center text-[9px] font-black">
                                  {mInitials}
                                </div>
                              )}
                              <span className="text-[11px] font-bold text-foreground">
                                {mName}
                              </span>
                              <span className="text-[8px] font-extrabold uppercase px-1 py-0.2 rounded bg-muted text-zinc-400 border border-border">
                                {member.role}
                              </span>
                            </div>
                          );
                        })}

                        {/* Task Contributors */}
                        {taskContributorsList.map((contrib) => {
                          const cName = contrib.userName || contrib.userEmail?.split("@")[0] || "Contributor";
                          const cInitials = cName
                            .split(" ")
                            .map((n: string) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase();

                          return (
                            <div 
                              key={contrib._id}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-amber-500/20 bg-amber-500/5 transition-colors shadow-2xs"
                              title={`${cName} (Working on tasks)`}
                            >
                              <div className="h-5 w-5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center text-[9px] font-black">
                                {cInitials}
                              </div>
                              <span className="text-[11px] font-bold text-zinc-300">
                                {cName}
                              </span>
                              <span className="text-[8px] font-bold uppercase px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-0.5">
                                <Clock className="h-2 w-2" /> Task Contributor
                              </span>
                            </div>
                          );
                        })}

                        {/* Quick Add Member trigger pill */}
                        <button
                          onClick={() => openAssignMembersModal(client)}
                          className="h-7 w-7 rounded-lg border border-dashed border-border hover:border-[#05ffc4] hover:text-[#05ffc4] text-zinc-500 flex items-center justify-center transition-colors"
                          title="Assign more team members"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Card Body: Connected Channels */}
                  <div className="p-5 border-b border-border/70 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-[#05ffc4]" /> Linked Social Channels ({clientPages.length})
                      </h4>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedClientId(client._id);
                          setActiveModal("page");
                        }}
                        className="text-[10px] h-6 px-2 bg-muted/60 hover:bg-muted border border-border text-zinc-300 hover:text-foreground font-bold rounded-md"
                      >
                        <Plus className="h-3 w-3 mr-1 text-[#05ffc4]" /> Link Channel
                      </Button>
                    </div>

                    {clientPages.length === 0 ? (
                      <div className="p-3.5 rounded-xl border border-dashed border-border/80 bg-muted/10 flex items-center justify-between text-xs text-zinc-500">
                        <span className="italic">No social accounts connected yet.</span>
                        <button
                          onClick={() => {
                            setSelectedClientId(client._id);
                            setActiveModal("page");
                          }}
                          className="text-[10px] font-bold text-[#05ffc4] hover:underline flex items-center gap-1"
                        >
                          Connect channel now <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {clientPages.map((page) => {
                          const pConfig = platforms.find(p => p.value === page.platform);
                          const PIcon = pConfig ? pConfig.icon : Globe;

                          const platformUrl = 
                            page.platform === "instagram" ? `https://instagram.com/${page.handle}` :
                            page.platform === "facebook" ? `https://facebook.com/${page.handle}` :
                            page.platform === "tiktok" ? `https://tiktok.com/@${page.handle}` :
                            page.platform === "x" ? `https://x.com/${page.handle}` :
                            `https://linkedin.com/search/results/all/?keywords=${page.handle}`;

                          return (
                            <div 
                              key={page._id}
                              className="p-2.5 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/35 transition-colors flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`p-1.5 rounded-lg border shrink-0 ${pConfig?.color || "text-zinc-400 bg-zinc-900 border-zinc-800"}`}>
                                  <PIcon className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex flex-col min-w-0 text-left">
                                  <a 
                                    href={platformUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs font-bold text-foreground hover:text-[#05ffc4] transition-colors truncate flex items-center gap-1 group/link"
                                  >
                                    @{page.handle}
                                    <ExternalLink className="h-2.5 w-2.5 opacity-40 group-hover/link:opacity-100 transition-opacity" />
                                  </a>
                                  <span className="text-[9px] text-zinc-500 font-medium capitalize">
                                    {pConfig?.label || page.platform}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button 
                                  onClick={() => togglePageActive({ pageId: page._id, isActive: !page.isActive })}
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold border uppercase tracking-wider transition-colors ${
                                    page.isActive 
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                      : "bg-zinc-800 text-zinc-400 border-zinc-700"
                                  }`}
                                  title={page.isActive ? "Pause channel" : "Activate channel"}
                                >
                                  {page.isActive ? "Active" : "Paused"}
                                </button>

                                <button
                                  onClick={() => {
                                    setDeleteTargetPageId(page._id);
                                    setDeleteTargetPageHandle(page.handle);
                                    setActiveModal("delete_page");
                                  }}
                                  className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                  title="Disconnect Page"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Card Body: Campaigns & Associated Tasks */}
                  <div className="p-5 flex-1 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <FolderKanban className="h-3.5 w-3.5 text-[#00d9f5]" /> Campaigns & Action Items ({clientProjects.length})
                      </h4>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedClientId(client._id);
                          setActiveModal("project");
                        }}
                        className="text-[10px] h-6 px-2 bg-muted/60 hover:bg-muted border border-border text-zinc-300 hover:text-foreground font-bold rounded-md"
                      >
                        <Plus className="h-3 w-3 mr-1 text-[#00d9f5]" /> New Campaign
                      </Button>
                    </div>

                    {clientProjects.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/10 flex items-center justify-between text-xs text-zinc-500">
                        <span className="italic">No campaigns initialized for this client.</span>
                        <button
                          onClick={() => {
                            setSelectedClientId(client._id);
                            setActiveModal("project");
                          }}
                          className="text-[10px] font-bold text-[#00d9f5] hover:underline flex items-center gap-1"
                        >
                          Initialize campaign <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {clientProjects.map((project) => {
                          const projectTasks = tasks.filter(t => t.projectId === project._id);
                          const projectOpenTasks = projectTasks.filter(t => t.status !== "done");

                          return (
                            <div 
                              key={project._id}
                              className="p-3.5 rounded-xl border border-border bg-card/60 hover:border-border/90 flex flex-col gap-2.5 transition-colors text-left"
                            >
                              {/* Campaign Title & Status */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Link 
                                    href={`/${slug}/content`}
                                    className="text-xs font-bold text-foreground hover:text-[#05ffc4] transition-colors truncate max-w-[220px]"
                                    title="Open campaign content workflow"
                                  >
                                    {project.name}
                                  </Link>
                                  {project.description && (
                                    <span className="text-[10px] text-zinc-500 italic truncate max-w-[140px]">
                                      • {project.description}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <select 
                                    value={project.status}
                                    onChange={(e) => updateProjectStatus({ projectId: project._id, status: e.target.value as any })}
                                    className="text-[9px] font-bold uppercase tracking-wider bg-muted text-zinc-300 border border-border rounded-md px-1.5 py-0.5 focus:outline-none focus:border-[#05ffc4]"
                                  >
                                    <option value="active">Active</option>
                                    <option value="paused">Paused</option>
                                    <option value="archived">Archived</option>
                                  </select>

                                  <button
                                    onClick={() => {
                                      setDeleteTargetProjectId(project._id);
                                      setDeleteTargetProjectName(project.name);
                                      setActiveModal("delete_project");
                                    }}
                                    className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    title="Delete Campaign"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Associated Campaign Tasks Preview */}
                              <div className="pt-2 border-t border-border/50 flex flex-col gap-1.5">
                                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-semibold">
                                  <span className="flex items-center gap-1">
                                    <CheckSquare className="h-3 w-3 text-amber-400" /> 
                                    {projectOpenTasks.length > 0 
                                      ? `${projectOpenTasks.length} open task${projectOpenTasks.length > 1 ? "s" : ""}` 
                                      : "Tasks up to date"}
                                  </span>
                                  <Link 
                                    href={`/${slug}/tasks`}
                                    className="text-[9px] font-bold text-[#05ffc4] hover:underline flex items-center gap-0.5"
                                  >
                                    Open Board <ChevronRight className="h-2.5 w-2.5" />
                                  </Link>
                                </div>

                                {projectTasks.length === 0 ? (
                                  <p className="text-[10px] text-zinc-500 italic pl-4">No tasks logged. Create tasks in Tasks Board.</p>
                                ) : (
                                  <div className="flex flex-col gap-1 pl-1">
                                    {projectTasks.slice(0, 3).map((task) => {
                                      const isDone = task.status === "done";
                                      return (
                                        <div 
                                          key={task._id}
                                          onClick={() => handleToggleTask(task._id, task.status)}
                                          className="flex items-center gap-2 text-xs group/task cursor-pointer select-none py-0.5"
                                        >
                                          <button 
                                            type="button"
                                            className="shrink-0 text-zinc-500 hover:text-[#05ffc4] transition-colors"
                                          >
                                            {isDone ? (
                                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                            ) : (
                                              <Circle className="h-3.5 w-3.5 text-zinc-500 group-hover/task:text-amber-400" />
                                            )}
                                          </button>
                                          <span className={`text-[11px] truncate ${
                                            isDone ? "line-through text-zinc-500" : "text-zinc-300 group-hover/task:text-foreground font-medium"
                                          }`}>
                                            {task.title}
                                          </span>
                                        </div>
                                      );
                                    })}
                                    {projectTasks.length > 3 && (
                                      <Link 
                                        href={`/${slug}/tasks`}
                                        className="text-[10px] text-zinc-500 hover:text-zinc-300 italic pl-5 pt-0.5"
                                      >
                                        +{projectTasks.length - 3} more tasks on board...
                                      </Link>
                                    )}
                                  </div>
                                )}
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Toolbar */}
                  <div className="p-3.5 bg-muted/20 border-t border-border/80 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Customer Subscribers (e.g. Cliniqly Annual Clinic Licenses) */}
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setSubscribersModalClientId(client._id);
                          setSubscribersModalClientName(client.name);
                          setSubscribersModalOpen(true);
                        }}
                        className="text-[10px] h-7 px-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-bold rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Users className="h-3 w-3 text-indigo-400" /> Subscribers ({clientSummary?.subscriberCount || 0})
                        {(clientSummary?.subscribersARR || 0) > 0 && (
                          <span className="text-[9px] text-[#05ffc4] font-mono font-bold">
                            • {formatCurrencyCents(clientSummary?.subscribersARR || 0, currencyCode)}/yr
                          </span>
                        )}
                      </Button>

                      {((clientSummary?.subscribersDueSoonCount || 0) + (clientSummary?.subscribersOverdueCount || 0)) > 0 && (
                        <span 
                          onClick={() => {
                            setSubscribersModalClientId(client._id);
                            setSubscribersModalClientName(client.name);
                            setSubscribersModalOpen(true);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono font-bold flex items-center gap-1 cursor-pointer hover:bg-amber-500/20 transition-colors"
                          title="Customer subscribers with annual renewals due soon or overdue"
                        >
                          <Clock className="h-2.5 w-2.5 text-amber-400" />
                          {(clientSummary?.subscribersDueSoonCount || 0) + (clientSummary?.subscribersOverdueCount || 0)} renewal{((clientSummary?.subscribersDueSoonCount || 0) + (clientSummary?.subscribersOverdueCount || 0)) > 1 ? "s" : ""} due
                        </span>
                      )}

                      <Button 
                        size="sm" 
                        onClick={() => {
                          setAssetModalClientId(client._id);
                          setAssetModalClientName(client.name);
                          setAssetModalOpen(true);
                        }}
                        className="text-[10px] h-7 px-2.5 bg-zinc-800/60 hover:bg-zinc-800 border border-border text-zinc-300 font-bold rounded-lg"
                      >
                        <Server className="h-3 w-3 mr-1 text-[#05ffc4]" /> Equipment & Parts ({clientSummary?.assetCount || 0})
                      </Button>

                      <Button 
                        size="sm" 
                        onClick={() => {
                          setTxModalClientId(client._id);
                          setTxModalClientName(client.name);
                          setTxModalOpen(true);
                        }}
                        className="text-[10px] h-7 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold rounded-lg transition-colors"
                      >
                        <DollarSign className="h-3 w-3 mr-1 text-emerald-400" /> + Transaction {clientSummary?.transactionCount ? `(${clientSummary.transactionCount})` : ""}
                      </Button>

                      {(clientSummary?.cloudHostingExpense || 0) > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 font-mono font-bold flex items-center gap-1" title="Recorded Hetzner & Cloud Hosting Server Expenses">
                          <Server className="h-2.5 w-2.5" /> Hetzner: {formatCurrencyCents(clientSummary?.cloudHostingExpense || 0, currencyCode)}
                        </span>
                      )}

                      {(clientSummary?.remainingBnplLiability || 0) > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/25 font-mono font-bold flex items-center gap-1">
                          <ShoppingCart className="h-2.5 w-2.5" /> BNPL: {formatCurrencyCents(clientSummary?.remainingBnplLiability || 0, currencyCode)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button 
                        size="sm" 
                        onClick={() => openAssignMembersModal(client)}
                        className="text-[10px] h-7 px-2.5 bg-muted hover:bg-muted/80 border border-border text-zinc-300 hover:text-[#05ffc4] font-bold rounded-lg"
                      >
                        <UserCheck className="h-3 w-3 mr-1" /> Team ({assignedMembersList.length})
                      </Button>

                      <Button 
                        size="sm" 
                        onClick={() => {
                          setSelectedClientId(client._id);
                          setActiveModal("project");
                        }}
                        className="text-[10px] h-7 px-2.5 bg-muted hover:bg-muted/80 border border-border text-zinc-300 hover:text-foreground font-bold rounded-lg"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Campaign
                      </Button>

                      <Button 
                        size="sm" 
                        onClick={() => {
                          setSelectedClientId(client._id);
                          setActiveModal("page");
                        }}
                        className="text-[10px] h-7 px-2.5 bg-muted hover:bg-muted/80 border border-border text-zinc-300 hover:text-foreground font-bold rounded-lg"
                      >
                        <Link2 className="h-3 w-3 mr-1" /> Channel
                      </Button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- MODALS OVERLAYS --- */}
      
      {/* 1. Add Client Modal */}
      {activeModal === "client" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-extrabold text-foreground text-sm uppercase tracking-wider">Add Client Profile</h3>
              <button onClick={() => setActiveModal(null)} className="text-zinc-500 hover:text-zinc-300">
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateClient} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Client Name</label>
                <input 
                  type="text" 
                  value={clientName} 
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Acme Corporation" 
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-muted/50 text-foreground text-xs focus:outline-none focus:border-[#05ffc4]"
                  required
                />
              </div>

              {/* Assign Initial Team Members */}
              {members.length > 0 && (
                <div className="flex flex-col gap-1.5 text-left pt-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                    <span>Assign Team Members (Optional)</span>
                    <span className="text-zinc-500 text-[9px]">{initialClientMemberIds.length} selected</span>
                  </label>
                  <div className="max-h-36 overflow-y-auto rounded-lg border border-border bg-muted/30 p-2 flex flex-col gap-1">
                    {members.map((m) => {
                      const mName = m.userName || m.userEmail?.split("@")[0] || "Team Member";
                      const isSelected = initialClientMemberIds.includes(m.userId);
                      return (
                        <div
                          key={m._id}
                          onClick={() => {
                            if (isSelected) {
                              setInitialClientMemberIds(initialClientMemberIds.filter(id => id !== m.userId));
                            } else {
                              setInitialClientMemberIds([...initialClientMemberIds, m.userId]);
                            }
                          }}
                          className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer select-none text-xs transition-colors ${
                            isSelected ? "bg-[#05ffc4]/10 border border-[#05ffc4]/30" : "hover:bg-muted/60 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-full bg-muted border border-border flex items-center justify-center text-[9px] font-bold text-zinc-300">
                              {mName[0]?.toUpperCase() || "U"}
                            </div>
                            <span className="font-semibold text-[11px] text-foreground">{mName}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-muted text-zinc-400 font-bold border border-border">
                              {m.role}
                            </span>
                            {isSelected && <Check className="h-3 w-3 text-[#05ffc4]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-foreground bg-transparent hover:bg-transparent text-xs font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={loadingAction} className="bg-gradient-to-r from-[#00f5a0] to-[#00d9f5] text-[#0b0c0e] font-extrabold text-xs px-4 py-2 border border-[#05ffc4]/20 rounded-lg">
                  {loadingAction && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  Create Client
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Assign Team Members Modal */}
      {activeModal === "assign_members" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center text-left">
              <div className="flex flex-col">
                <h3 className="font-extrabold text-foreground text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-[#05ffc4]" /> Assign Team Members
                </h3>
                <span className="text-xs text-zinc-500 font-medium">Client: {assignModalClientName}</span>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-zinc-500 hover:text-zinc-300">
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignedMembers} className="p-6 flex flex-col gap-4 text-left">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Select which team members from your workspace are assigned to manage or work with this client.
              </p>

              {members.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No other workspace team members found. Invite teammates in Team Members tab.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                  {members.map((member) => {
                    const isSelected = assignedMembersSelection.includes(member.userId);
                    const mName = member.userName || member.userEmail?.split("@")[0] || "Team Member";
                    const mInitials = mName
                      .split(" ")
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <div
                        key={member._id}
                        onClick={() => {
                          if (isSelected) {
                            setAssignedMembersSelection(assignedMembersSelection.filter(id => id !== member.userId));
                          } else {
                            setAssignedMembersSelection([...assignedMembersSelection, member.userId]);
                          }
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer select-none transition-all ${
                          isSelected 
                            ? "bg-[#05ffc4]/10 border-[#05ffc4]/40 shadow-xs" 
                            : "bg-muted/20 border-border/80 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {member.pictureUrl ? (
                            <img src={member.pictureUrl} alt={mName} className="h-8 w-8 rounded-full object-cover border border-[#05ffc4]/30" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#05ffc4]/20 to-[#00d9f5]/20 text-[#05ffc4] border border-[#05ffc4]/30 flex items-center justify-center text-xs font-black">
                              {mInitials}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              {mName}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {member.userEmail || member.role}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-muted text-zinc-400 font-bold border border-border">
                            {member.role}
                          </span>
                          <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                            isSelected ? "bg-[#05ffc4] border-[#05ffc4] text-[#0b0c0e]" : "border-zinc-600 bg-transparent"
                          }`}>
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2 border-t border-border">
                <Button type="button" onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-foreground bg-transparent hover:bg-transparent text-xs font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={loadingAction} className="bg-gradient-to-r from-[#00f5a0] to-[#00d9f5] text-[#0b0c0e] font-extrabold text-xs px-4 py-2 border border-[#05ffc4]/20 rounded-lg">
                  {loadingAction && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  Save Team ({assignedMembersSelection.length})
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Project/Campaign Modal */}
      {activeModal === "project" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-extrabold text-foreground text-sm uppercase tracking-wider">Initialize Campaign</h3>
              <button onClick={() => setActiveModal(null)} className="text-zinc-500 hover:text-zinc-300">
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Target Client</label>
                <select 
                  value={selectedClientId} 
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground text-xs focus:outline-none focus:border-[#05ffc4]"
                  required
                >
                  <option value="">Select a Client...</option>
                  {clients.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Campaign/Project Name</label>
                <input 
                  type="text" 
                  value={projectName} 
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Summer Launch 2026" 
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-muted/50 text-foreground text-xs focus:outline-none focus:border-[#05ffc4]"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Brief Description</label>
                <textarea 
                  value={projectDesc} 
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Optional notes or goals..." 
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-muted/50 text-foreground text-xs focus:outline-none focus:border-[#05ffc4]"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-foreground bg-transparent hover:bg-transparent text-xs font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={loadingAction} className="bg-gradient-to-r from-[#00f5a0] to-[#00d9f5] text-[#0b0c0e] font-extrabold text-xs px-4 py-2 border border-[#05ffc4]/20 rounded-lg">
                  {loadingAction && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  Create Campaign
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Social Page Modal */}
      {activeModal === "page" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-extrabold text-foreground text-sm uppercase tracking-wider">Connect Social Page</h3>
              <button onClick={() => setActiveModal(null)} className="text-zinc-500 hover:text-zinc-300">
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSocialPage} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Target Client</label>
                <select 
                  value={selectedClientId} 
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground text-xs focus:outline-none focus:border-[#05ffc4]"
                  required
                >
                  <option value="">Select a Client...</option>
                  {clients.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Social Platform</label>
                <select 
                  value={pagePlatform} 
                  onChange={(e) => setPagePlatform(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground text-xs focus:outline-none focus:border-[#05ffc4]"
                  required
                >
                  {platforms.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Handle / Account Name</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-zinc-500 text-xs font-bold select-none">@</span>
                  <input 
                    type="text" 
                    value={pageHandle} 
                    onChange={(e) => setPageHandle(e.target.value)}
                    placeholder="handle" 
                    className="w-full pl-8 pr-3.5 py-2 rounded-lg border border-border bg-muted/50 text-foreground text-xs focus:outline-none focus:border-[#05ffc4]"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-foreground bg-transparent hover:bg-transparent text-xs font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={loadingAction} className="bg-gradient-to-r from-[#00f5a0] to-[#00d9f5] text-[#0b0c0e] font-extrabold text-xs px-4 py-2 border border-[#05ffc4]/20 rounded-lg">
                  {loadingAction && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  Connect Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Delete Client Confirmation Modal */}
      {activeModal === "delete_client" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-red-900/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-red-900/20 bg-red-950/10 flex justify-between items-center text-left">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">Delete Client Profile</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-zinc-200">
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleDeleteClient} className="p-6 flex flex-col gap-4 text-left">
              <p className="text-xs text-zinc-400 leading-relaxed">
                You are about to delete client profile <strong className="text-foreground">"{deleteTargetClientName}"</strong>. 
                This action is <strong className="text-red-400 uppercase">permanent</strong> and will delete:
              </p>
              <ul className="text-xs text-zinc-500 list-disc pl-5 flex flex-col gap-1">
                <li>All active projects/campaigns of this client</li>
                <li>All linked social channels & credentials</li>
                <li>All social posts, tasks, and media assets</li>
                <li>All historical comments and P&L transactions</li>
              </ul>
              
              <div className="flex flex-col gap-1.5 pt-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Type <span className="text-foreground font-black">DELETE</span> to confirm:
                </label>
                <input 
                  type="text" 
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE" 
                  className="w-full px-3.5 py-2 rounded-lg border border-red-900/40 bg-muted/40 text-foreground text-xs focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-foreground bg-transparent hover:bg-transparent text-xs font-bold">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loadingAction || deleteConfirmText.toLowerCase() !== "delete"} 
                  className="bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-900/40 font-extrabold text-xs px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {loadingAction && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  Delete Client
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Delete Project Confirmation Modal */}
      {activeModal === "delete_project" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-red-900/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-red-900/20 bg-red-950/10 flex justify-between items-center text-left">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">Delete Campaign</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-zinc-200">
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleDeleteProject} className="p-6 flex flex-col gap-4 text-left">
              <p className="text-xs text-zinc-400 leading-relaxed">
                You are about to delete campaign <strong className="text-foreground">"{deleteTargetProjectName}"</strong>. 
                This action is <strong className="text-red-400 uppercase">permanent</strong> and will delete:
              </p>
              <ul className="text-xs text-zinc-500 list-disc pl-5 flex flex-col gap-1">
                <li>All posts and tasks drafts in this campaign</li>
                <li>All visual content and attachments</li>
                <li>All historical comments on related posts</li>
              </ul>
              
              <div className="flex flex-col gap-1.5 pt-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Type <span className="text-foreground font-black">DELETE</span> to confirm:
                </label>
                <input 
                  type="text" 
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE" 
                  className="w-full px-3.5 py-2 rounded-lg border border-red-900/40 bg-muted/40 text-foreground text-xs focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-foreground bg-transparent hover:bg-transparent text-xs font-bold">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loadingAction || deleteConfirmText.toLowerCase() !== "delete"} 
                  className="bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-900/40 font-extrabold text-xs px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {loadingAction && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  Delete Campaign
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Disconnect Page Confirmation Modal */}
      {activeModal === "delete_page" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-red-900/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-red-900/20 bg-red-950/10 flex justify-between items-center text-left">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">Disconnect social page</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-zinc-200">
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleDeleteSocialPage} className="p-6 flex flex-col gap-4 text-left">
              <p className="text-xs text-zinc-400 leading-relaxed">
                You are about to disconnect account <strong className="text-foreground">@{deleteTargetPageHandle}</strong>. 
                This action is <strong className="text-red-400 uppercase">permanent</strong> and will delete:
              </p>
              <ul className="text-xs text-zinc-500 list-disc pl-5 flex flex-col gap-1">
                <li>All posts bound to this social channel</li>
                <li>All comments and schedules associated with this page</li>
              </ul>
              
              <div className="flex flex-col gap-1.5 pt-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Type <span className="text-foreground font-black">DISCONNECT</span> to confirm:
                </label>
                <input 
                  type="text" 
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DISCONNECT" 
                  className="w-full px-3.5 py-2 rounded-lg border border-red-900/40 bg-muted/40 text-foreground text-xs focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-foreground bg-transparent hover:bg-transparent text-xs font-bold">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loadingAction || deleteConfirmText.toLowerCase() !== "disconnect"} 
                  className="bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-900/40 font-extrabold text-xs px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {loadingAction && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  Disconnect Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Client Inventory Asset Valuation Modal */}
      {assetModalClientId && (
        <ClientAssetModal
          isOpen={assetModalOpen}
          onClose={() => setAssetModalOpen(false)}
          workspaceId={workspace._id}
          clientId={assetModalClientId}
          clientName={assetModalClientName}
          currencyCode={currencyCode}
        />
      )}

      {/* 9. Client Direct Transactions & Cloud Server / Hetzner Modal */}
      {txModalClientId && (
        <ClientTransactionModal
          isOpen={txModalOpen}
          onClose={() => setTxModalOpen(false)}
          workspaceId={workspace._id}
          clientId={txModalClientId}
          clientName={txModalClientName}
          currencyCode={currencyCode}
        />
      )}

      {/* 10. Client Customer Subscribers & Annual Renewals Modal */}
      {subscribersModalClientId && (
        <ClientSubscribersModal
          isOpen={subscribersModalOpen}
          onClose={() => setSubscribersModalOpen(false)}
          workspaceId={workspace._id}
          clientId={subscribersModalClientId}
          clientName={subscribersModalClientName}
          currencyCode={currencyCode}
        />
      )}

    </div>
  );
}
