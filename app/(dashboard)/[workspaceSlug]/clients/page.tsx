"use client";

import { useState } from "react";
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
  PlusCircle, 
  ToggleLeft, 
  ToggleRight, 
  Globe, 
  Instagram, 
  Facebook, 
  Linkedin,
  X as CloseIcon,
  Check,
  ChevronRight,
  Sparkles,
  Link2,
  Trash2,
  AlertTriangle
} from "lucide-react";

// Platform helper config
const platforms = [
  { value: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-400 bg-pink-950/20 border-pink-900/30" },
  { value: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-400 bg-blue-950/20 border-blue-900/30" },
  { value: "tiktok", label: "TikTok", icon: Globe, color: "text-[#05ffc4] bg-[#05ffc4]/10 border-[#05ffc4]/20" },
  { value: "x", label: "X (Twitter)", icon: Globe, color: "text-zinc-300 bg-zinc-900/40 border-zinc-800" },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-indigo-400 bg-indigo-950/20 border-indigo-900/30" },
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

  // Mutations
  const createClient = useMutation(api.clients.create);
  const toggleClientActive = useMutation(api.clients.toggleActive);
  const deleteClient = useMutation(api.clients.remove);

  const createProject = useMutation(api.projects.create);
  const updateProjectStatus = useMutation(api.projects.updateStatus);
  const deleteProject = useMutation(api.projects.remove);
  
  const createSocialPage = useMutation(api.socialPages.create);
  const togglePageActive = useMutation(api.socialPages.toggleActive);
  const deleteSocialPage = useMutation(api.socialPages.remove);

  // Component local states (Modals)
  const [activeModal, setActiveModal] = useState<null | "client" | "project" | "page" | "delete_client" | "delete_project" | "delete_page">(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  
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
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [pagePlatform, setPagePlatform] = useState("instagram");
  const [pageHandle, setPageHandle] = useState("");

  const [loadingAction, setLoadingAction] = useState(false);

  if (workspace === undefined || clients === undefined || projects === undefined || socialPages === undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin text-[#05ffc4] mb-4" />
        <p className="text-sm font-medium">Fetching clients, campaigns, and page profiles...</p>
      </div>
    );
  }

  if (!workspace) return null;

  // Handlers
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    setLoadingAction(true);
    try {
      await createClient({
        workspaceId: workspace._id,
        name: clientName.trim(),
      });
      toast.success(`Client "${clientName.trim()}" created successfully!`);
      setClientName("");
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

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full text-left">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#16181d] pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">Clients & Connections</h2>
          <p className="text-xs text-zinc-500">
            Define client entities, configure campaigns, and link social pages for workflow & cashflow tracking.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setActiveModal("client")} 
            className="bg-gradient-to-r from-[#00f5a0] to-[#00d9f5] hover:opacity-90 text-[#0b0c0e] font-extrabold text-xs shadow-lg shadow-[#05ffc4]/15 border border-[#05ffc4]/20 rounded-lg px-4 py-2"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Client
          </Button>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Clients list (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase text-zinc-550 tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4 text-[#05ffc4]" /> Active Clients ({clients.length})
            </h3>
          </div>

          {clients.length === 0 ? (
            <div className="p-12 rounded-2xl border border-[#16181d] border-dashed bg-[#0d0e12]/30 text-center flex flex-col items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-[#12141a] flex items-center justify-center text-zinc-550 border border-[#1d2027]">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-1 text-center items-center">
                <h4 className="text-sm font-bold text-white">No clients found</h4>
                <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                  Create your first client to start organizing campaigns and publishing schedules.
                </p>
              </div>
              <Button onClick={() => setActiveModal("client")} className="bg-[#12141a] border border-[#1d2027] text-zinc-350 hover:bg-[#1c1f26] text-xs font-bold px-4">
                Create Client Profile
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {clients.map((client) => {
                const clientProjects = projects.filter(p => p.clientId === client._id);
                const clientPages = socialPages.filter(p => p.clientId === client._id);

                return (
                  /* Premium 3D glowing glass card wrapper */
                  <div key={client._id} className="relative group">
                    <div className="absolute -inset-px bg-gradient-to-tr from-[#05ffc4] to-[#00d9f5] rounded-xl blur-xs opacity-0 group-hover:opacity-15 transition duration-500" />
                    
                    <div className="relative p-5 rounded-xl border border-[#16181d] bg-[#0d0e12]/80 backdrop-blur-sm hover:border-[#05ffc4]/30 hover:[transform:perspective(800px)_rotateX(2deg)_rotateY(-2deg)] hover:shadow-xl hover:shadow-[#05ffc4]/5 transition-all duration-300 ease-out flex flex-col gap-4 min-h-[170px] text-left">
                      {/* Header */}
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <h4 className="font-extrabold text-sm text-white group-hover:text-[#05ffc4] transition-colors">
                            {client.name}
                          </h4>
                          <span className="text-[9px] text-zinc-550 uppercase font-bold tracking-wider">
                            Client Profile
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleClientActive({ clientId: client._id, isActive: !client.isActive })}
                            className={`transition-colors ${client.isActive ? "text-[#05ffc4]" : "text-zinc-650 hover:text-zinc-400"}`}
                            title={client.isActive ? "Pause Client" : "Activate Client"}
                          >
                            {client.isActive ? (
                              <ToggleRight className="h-5 w-5" />
                            ) : (
                              <ToggleLeft className="h-5 w-5" />
                            )}
                          </button>

                          {/* Client Delete Trigger Button */}
                          <button
                            onClick={() => {
                              setDeleteTargetClientId(client._id);
                              setDeleteTargetClientName(client.name);
                              setActiveModal("delete_client");
                            }}
                            className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete Client"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 border-t border-[#16181d] pt-3 text-xs text-zinc-450 font-semibold font-mono">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-550 font-bold uppercase tracking-wider">Campaigns</span>
                          <span className="font-bold text-zinc-200">{clientProjects.length} Active</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-550 font-bold uppercase tracking-wider">Social Channels</span>
                          <span className="font-bold text-zinc-200">{clientPages.length} Connected</span>
                        </div>
                      </div>

                      {/* Quick Action buttons */}
                      <div className="flex gap-2 border-t border-[#16181d] pt-3 mt-auto">
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setSelectedClientId(client._id);
                            setActiveModal("project");
                          }}
                          className="text-[10px] h-7 px-2.5 bg-[#12141a] hover:bg-[#1c1f26] border border-[#1d2027] text-zinc-350 hover:text-white font-bold rounded-lg"
                        >
                          <Plus className="h-3 w-3 mr-1" /> Project
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setSelectedClientId(client._id);
                            setActiveModal("page");
                          }}
                          className="text-[10px] h-7 px-2.5 bg-[#12141a] hover:bg-[#1c1f26] border border-[#1d2027] text-zinc-350 hover:text-white font-bold rounded-lg ml-auto"
                        >
                          <Link2 className="h-3 w-3 mr-1" /> Link Channel
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Channels & campaigns (1 col) */}
        <div className="flex flex-col gap-8 border-l-0 lg:border-l border-[#16181d] pl-0 lg:pl-8">
          
          {/* Linked Pages */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase text-zinc-550 tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#05ffc4]" /> Linked Channels ({socialPages.length})
            </h3>

            {socialPages.length === 0 ? (
              <p className="text-xs text-zinc-550 italic">No social pages connected yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {socialPages.map((page) => {
                  const client = clients.find(c => c._id === page.clientId);
                  const pConfig = platforms.find(p => p.value === page.platform);
                  const PIcon = pConfig ? pConfig.icon : Globe;

                  // Define clickable link location based on platform
                  const platformUrl = 
                    page.platform === "instagram" ? `https://instagram.com/${page.handle}` :
                    page.platform === "facebook" ? `https://facebook.com/${page.handle}` :
                    page.platform === "tiktok" ? `https://tiktok.com/@${page.handle}` :
                    page.platform === "x" ? `https://x.com/${page.handle}` :
                    `https://linkedin.com/search/results/all/?keywords=${page.handle}`;

                  return (
                    /* Page row 3D card styling */
                    <div key={page._id} className="relative group/page">
                      <div className="absolute -inset-px bg-gradient-to-tr from-[#05ffc4] to-[#00d9f5] rounded-xl blur-xs opacity-0 group-hover/page:opacity-10 transition duration-500" />
                      
                      <div className="relative p-3 rounded-xl border border-[#16181d] bg-[#0d0e12]/80 backdrop-blur-xs flex items-center justify-between hover:[transform:perspective(500px)_rotateX(1.5deg)_rotateY(-1.5deg)] transition-all duration-300 ease-out">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded border ${pConfig?.color || "text-zinc-500 bg-zinc-900"}`}>
                            <PIcon className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col text-left">
                            {/* Clickable Social handle going to actual location */}
                            <a 
                              href={platformUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-xs font-bold text-zinc-205 hover:text-[#05ffc4] transition-colors flex items-center gap-0.5 group/link"
                            >
                              @{page.handle} <span className="text-[8px] opacity-0 group-hover/link:opacity-100 transition-opacity">↗</span>
                            </a>
                            <span className="text-[9px] text-zinc-500 font-bold uppercase">Client: {client?.name || "Unknown"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => togglePageActive({ pageId: page._id, isActive: !page.isActive })}
                            className={`text-[9px] px-2 py-0.5 rounded font-extrabold border uppercase tracking-wider ${
                              page.isActive 
                                ? "bg-[#05ffc4]/10 text-[#05ffc4] border-[#05ffc4]/20" 
                                : "bg-zinc-900 text-zinc-650 border-zinc-800"
                            }`}
                          >
                            {page.isActive ? "Active" : "Paused"}
                          </button>
                          
                          {/* Page Delete Trigger Button */}
                          <button
                            onClick={() => {
                              setDeleteTargetPageId(page._id);
                              setDeleteTargetPageHandle(page.handle);
                              setActiveModal("delete_page");
                            }}
                            className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Disconnect Account"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Campaigns */}
          <div className="flex flex-col gap-4 border-t border-[#16181d] pt-6">
            <h3 className="text-xs font-bold uppercase text-zinc-550 tracking-wider flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-[#05ffc4]" /> Active Projects ({projects.length})
            </h3>

            {projects.length === 0 ? (
              <p className="text-xs text-zinc-550 italic">No campaigns initialized yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {projects.map((project) => {
                  const client = clients.find(c => c._id === project.clientId);

                  return (
                    /* Project row 3D card styling */
                    <div key={project._id} className="relative group/project">
                      <div className="absolute -inset-px bg-gradient-to-tr from-[#05ffc4] to-[#00d9f5] rounded-xl blur-xs opacity-0 group-hover/project:opacity-10 transition duration-500" />
                      
                      <div className="relative p-3.5 rounded-xl border border-[#16181d] bg-[#0d0e12]/80 backdrop-blur-xs flex flex-col gap-1.5 hover:[transform:perspective(500px)_rotateX(1.5deg)_rotateY(-1.5deg)] transition-all duration-300 ease-out text-left">
                        <div className="flex justify-between items-center">
                          {/* Clickable project name going to content board */}
                          <Link 
                            href={`/${slug}/content`}
                            className="text-xs font-bold text-zinc-200 hover:text-[#05ffc4] transition-colors truncate max-w-[150px]"
                          >
                            {project.name}
                          </Link>
                          
                          <div className="flex items-center gap-2">
                            <select 
                              value={project.status}
                              onChange={(e) => updateProjectStatus({ projectId: project._id, status: e.target.value as any })}
                              className="text-[9px] font-bold uppercase tracking-wider bg-[#12141a] text-zinc-400 border border-[#1d2027] rounded-md px-1 py-0.5"
                            >
                              <option value="active">Active</option>
                              <option value="paused">Paused</option>
                              <option value="archived">Archived</option>
                            </select>

                            {/* Project Delete Trigger Button */}
                            <button
                              onClick={() => {
                                setDeleteTargetProjectId(project._id);
                                setDeleteTargetProjectName(project.name);
                                setActiveModal("delete_project");
                              }}
                              className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Delete Project"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[9px] text-zinc-500 font-medium">
                          <span>Client: {client?.name || "Unknown"}</span>
                          {project.description && <span className="italic truncate max-w-[120px]">{project.description}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* --- MODALS OVERLAYS --- */}
      
      {/* 1. Add Client Modal */}
      {activeModal === "client" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d0e12] border border-[#16181d] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#16181d] flex justify-between items-center">
              <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">Add Client Profile</h3>
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
                  className="w-full px-3.5 py-2 rounded-lg border border-[#16181d] bg-[#12141a] text-zinc-200 text-xs focus:outline-none focus:border-[#05ffc4]"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" onClick={() => setActiveModal(null)} className="text-zinc-500 hover:text-zinc-300 bg-transparent hover:bg-transparent text-xs font-bold">
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

      {/* 2. Project/Campaign Modal */}
      {activeModal === "project" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d0e12] border border-[#16181d] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#16181d] flex justify-between items-center">
              <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">Initialize Campaign</h3>
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
                  className="w-full px-3 py-2 rounded-lg border border-[#16181d] bg-[#12141a] text-zinc-300 text-xs focus:outline-none focus:border-[#05ffc4]"
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
                  className="w-full px-3.5 py-2 rounded-lg border border-[#16181d] bg-[#12141a] text-zinc-200 text-xs focus:outline-none focus:border-[#05ffc4]"
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
                  className="w-full px-3.5 py-2 rounded-lg border border-[#16181d] bg-[#12141a] text-zinc-200 text-xs focus:outline-none focus:border-[#05ffc4]"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" onClick={() => setActiveModal(null)} className="text-zinc-550 hover:text-zinc-300 bg-transparent hover:bg-transparent text-xs font-bold">
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

      {/* 3. Social Page Modal */}
      {activeModal === "page" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d0e12] border border-[#16181d] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#16181d] flex justify-between items-center">
              <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">Connect Social Page</h3>
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
                  className="w-full px-3 py-2 rounded-lg border border-[#16181d] bg-[#12141a] text-zinc-350 text-xs focus:outline-none focus:border-[#05ffc4]"
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
                  className="w-full px-3 py-2 rounded-lg border border-[#16181d] bg-[#12141a] text-zinc-300 text-xs focus:outline-none focus:border-[#05ffc4]"
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
                    className="w-full pl-8 pr-3.5 py-2 rounded-lg border border-[#16181d] bg-[#12141a] text-zinc-200 text-xs focus:outline-none focus:border-[#05ffc4]"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" onClick={() => setActiveModal(null)} className="text-zinc-550 hover:text-zinc-300 bg-transparent hover:bg-transparent text-xs font-bold">
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

      {/* 4. Delete Client Confirmation Modal */}
      {activeModal === "delete_client" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d0e12] border border-red-900/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-red-900/20 bg-red-950/10 flex justify-between items-center text-left">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">Delete Client Profile</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-zinc-550 hover:text-zinc-300">
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleDeleteClient} className="p-6 flex flex-col gap-4 text-left">
              <p className="text-xs text-zinc-400 leading-relaxed">
                You are about to delete client profile <strong className="text-white">"{deleteTargetClientName}"</strong>. 
                This action is <strong className="text-red-400 uppercase">permanent</strong> and will delete:
              </p>
              <ul className="text-xs text-zinc-500 list-disc pl-5 flex flex-col gap-1">
                <li>All active projects/campaigns of this client</li>
                <li>All linked social channels & credentials</li>
                <li>All social posts, tasks, and media assets</li>
                <li>All historical comments and P&L transactions</li>
              </ul>
              
              <div className="flex flex-col gap-1.5 pt-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">
                  Type <span className="text-white font-black">DELETE</span> to confirm:
                </label>
                <input 
                  type="text" 
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE" 
                  className="w-full px-3.5 py-2 rounded-lg border border-red-950 bg-[#12141a] text-zinc-200 text-xs focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" onClick={() => setActiveModal(null)} className="text-zinc-550 hover:text-zinc-300 bg-transparent hover:bg-transparent text-xs font-bold">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loadingAction || deleteConfirmText.toLowerCase() !== "delete"} 
                  className="bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/40 font-extrabold text-xs px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {loadingAction && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  Delete Client
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Delete Project Confirmation Modal */}
      {activeModal === "delete_project" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d0e12] border border-red-900/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-red-900/20 bg-red-950/10 flex justify-between items-center text-left">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">Delete Campaign</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-zinc-550 hover:text-zinc-300">
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleDeleteProject} className="p-6 flex flex-col gap-4 text-left">
              <p className="text-xs text-zinc-400 leading-relaxed">
                You are about to delete campaign <strong className="text-white">"{deleteTargetProjectName}"</strong>. 
                This action is <strong className="text-red-400 uppercase">permanent</strong> and will delete:
              </p>
              <ul className="text-xs text-zinc-500 list-disc pl-5 flex flex-col gap-1">
                <li>All posts and tasks drafts in this campaign</li>
                <li>All visual content and attachments</li>
                <li>All historical comments on related posts</li>
              </ul>
              
              <div className="flex flex-col gap-1.5 pt-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">
                  Type <span className="text-white font-black">DELETE</span> to confirm:
                </label>
                <input 
                  type="text" 
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE" 
                  className="w-full px-3.5 py-2 rounded-lg border border-red-950 bg-[#12141a] text-zinc-200 text-xs focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" onClick={() => setActiveModal(null)} className="text-zinc-550 hover:text-zinc-300 bg-transparent hover:bg-transparent text-xs font-bold">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loadingAction || deleteConfirmText.toLowerCase() !== "delete"} 
                  className="bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/40 font-extrabold text-xs px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {loadingAction && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  Delete Campaign
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Disconnect Page Confirmation Modal */}
      {activeModal === "delete_page" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d0e12] border border-red-900/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-red-900/20 bg-red-950/10 flex justify-between items-center text-left">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">Disconnect social page</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-zinc-550 hover:text-zinc-300">
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleDeleteSocialPage} className="p-6 flex flex-col gap-4 text-left">
              <p className="text-xs text-zinc-400 leading-relaxed">
                You are about to disconnect account <strong className="text-white">@{deleteTargetPageHandle}</strong>. 
                This action is <strong className="text-red-400 uppercase">permanent</strong> and will delete:
              </p>
              <ul className="text-xs text-zinc-500 list-disc pl-5 flex flex-col gap-1">
                <li>All posts bound to this social channel</li>
                <li>All comments and schedules associated with this page</li>
              </ul>
              
              <div className="flex flex-col gap-1.5 pt-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">
                  Type <span className="text-white font-black">DISCONNECT</span> to confirm:
                </label>
                <input 
                  type="text" 
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DISCONNECT" 
                  className="w-full px-3.5 py-2 rounded-lg border border-red-950 bg-[#12141a] text-zinc-200 text-xs focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" onClick={() => setActiveModal(null)} className="text-zinc-550 hover:text-zinc-300 bg-transparent hover:bg-transparent text-xs font-bold">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loadingAction || deleteConfirmText.toLowerCase() !== "disconnect"} 
                  className="bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/40 font-extrabold text-xs px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {loadingAction && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  Disconnect Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
