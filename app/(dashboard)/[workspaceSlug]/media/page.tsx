"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Plus, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  FileText as DocIcon,
  Search, 
  Trash2, 
  Link as LinkIcon, 
  Unlink, 
  X as CloseIcon, 
  ExternalLink,
  Folder,
  Eye,
  Sparkles,
  Layers
} from "lucide-react";
import { toast } from "sonner";

export default function MediaLibraryPage() {
  const params = useParams();
  const slug = params.workspaceSlug as string;
  const { user: currentUser } = useUser();

  // Convex Queries
  const workspace = useQuery(api.workspaces.getBySlug, { slug });
  
  const assets = useQuery(
    api.assets.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip"
  );
  const projects = useQuery(
    api.projects.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip"
  );
  const posts = useQuery(
    api.posts.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  // Mutations
  const generateUploadUrl = useMutation(api.assets.generateUploadUrl);
  const saveAsset = useMutation(api.assets.save);
  const attachToPost = useMutation(api.assets.attachToPost);
  const deleteAsset = useMutation(api.assets.deleteAsset);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "image" | "video" | "document">("all");
  const [selectedProjFilter, setSelectedProjFilter] = useState<string>("all");

  // Modals & Forms State
  const [activeModal, setActiveModal] = useState<null | "upload" | "inspect">(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  
  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploadProjectId, setUploadProjectId] = useState("");
  const [uploadPostId, setUploadPostId] = useState("");
  const [uploading, setUploading] = useState(false);

  // Attachment editing state inside inspector
  const [inspectPostId, setInspectPostId] = useState("");
  const [updatingAttachment, setUpdatingAttachment] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (workspace === undefined || assets === undefined || projects === undefined || posts === undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm font-medium">Loading Media Library assets & catalogs...</p>
      </div>
    );
  }

  if (!workspace) return null;

  // Filtered Assets list
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || asset.type === selectedType;
    const matchesProject = selectedProjFilter === "all" || asset.projectId === selectedProjFilter;
    return matchesSearch && matchesType && matchesProject;
  });

  // Handle Drag Over / Drop UI helper
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !uploadProjectId) return;
    setUploading(true);

    try {
      // 1. Get secure URL from Convex
      const uploadUrl = await generateUploadUrl({ projectId: uploadProjectId as any });

      // 2. Perform direct HTTP POST upload
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Convex storage upload failed");
      }

      const { storageId } = await response.json();

      // Determine asset type category
      let assetType: "image" | "video" | "document" = "document";
      if (file.type.startsWith("image/")) assetType = "image";
      else if (file.type.startsWith("video/")) assetType = "video";

      // 3. Save mapping to DB
      await saveAsset({
        projectId: uploadProjectId as any,
        postId: uploadPostId ? (uploadPostId as any) : undefined,
        storageId,
        type: assetType,
        fileName: file.name,
      });

      toast.success("File uploaded to Media Library.");
      
      // Reset
      setFile(null);
      setUploadProjectId("");
      setUploadPostId("");
      setActiveModal(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleAttachSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    setUpdatingAttachment(true);

    try {
      const updated = await attachToPost({
        assetId: selectedAsset._id,
        postId: inspectPostId ? (inspectPostId as any) : undefined,
      });
      setSelectedAsset(updated);
      toast.success("Post association updated successfully.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update attachment mapping");
    } finally {
      setUpdatingAttachment(false);
    }
  };

  const handleDeleteAsset = async () => {
    if (!selectedAsset) return;
    if (!confirm("Are you sure you want to delete this asset? This cannot be undone.")) return;
    setDeleting(true);

    try {
      await deleteAsset({ assetId: selectedAsset._id });
      toast.success("Asset deleted permanently.");
      setSelectedAsset(null);
      setActiveModal(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete asset");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in font-sans">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-indigo-500 dark:text-indigo-400" /> Media & Assets Library
          </h2>
          <p className="text-sm text-zinc-650 dark:text-zinc-400">
            Upload, browse, and connect social graphics, shorts, and scripts to your campaigns & posts.
          </p>
        </div>
        
        <Button 
          onClick={() => {
            setFile(null);
            setUploadProjectId("");
            setUploadPostId("");
            setActiveModal("upload");
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 text-xs font-semibold"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Upload File
        </Button>
      </div>

      {/* Filters & Control bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-zinc-900/20 p-4 rounded-xl border border-zinc-900">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Search filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-800 bg-zinc-950/60 text-zinc-200 text-sm focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Project Filter */}
          <select
            value={selectedProjFilter}
            onChange={(e) => setSelectedProjFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950/60 text-zinc-300 text-sm focus:outline-none focus:border-indigo-600 min-w-[160px]"
          >
            <option value="all">All Campaigns</option>
            {projects.map(p => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Type Tabs */}
        <div className="flex bg-zinc-950/60 p-1 rounded-lg border border-zinc-850 shrink-0">
          {(["all", "image", "video", "document"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                selectedType === type
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {type === "all" ? "All Files" : `${type}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Assets */}
      {filteredAssets.length === 0 ? (
        <div className="p-16 rounded-2xl border border-zinc-900 border-dashed bg-zinc-950/20 text-center flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500">
            <ImageIcon className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-semibold text-white">No assets found</h4>
            <p className="text-xs text-zinc-500 max-w-xs">
              {searchQuery || selectedProjFilter !== "all" || selectedType !== "all"
                ? "Try adjusting your search query or filter options."
                : "Get started by uploading graphic design files, TikTok clips, or script templates."}
            </p>
          </div>
          {(searchQuery || selectedProjFilter !== "all" || selectedType !== "all") ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setSearchQuery("");
                setSelectedType("all");
                setSelectedProjFilter("all");
              }}
              className="text-indigo-400 hover:text-indigo-300 text-xs"
            >
              Clear Filters
            </Button>
          ) : (
            <Button 
              onClick={() => setActiveModal("upload")} 
              variant="outline" 
              size="sm" 
              className="border-zinc-800 text-zinc-300 hover:bg-zinc-900"
            >
              Upload First Asset
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredAssets.map((asset) => {
            const project = projects.find(p => p._id === asset.projectId);
            const post = posts.find(p => p._id === asset.postId);
            
            return (
              <div 
                key={asset._id}
                onClick={() => {
                  setSelectedAsset(asset);
                  setInspectPostId(asset.postId || "");
                  setActiveModal("inspect");
                }}
                className="group relative rounded-xl border border-zinc-900 bg-zinc-900/10 hover:border-zinc-850 hover:bg-zinc-900/20 overflow-hidden cursor-pointer transition-all duration-300 flex flex-col h-48 shadow-lg"
              >
                {/* Media Preview Box */}
                <div className="flex-1 w-full bg-zinc-950 flex items-center justify-center relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
                  {asset.type === "image" && asset.url ? (
                    <img 
                      src={asset.url} 
                      alt={asset.fileName} 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : asset.type === "video" ? (
                    <div className="flex flex-col items-center justify-center text-indigo-400">
                      <VideoIcon className="h-8 w-8" />
                      <span className="text-[9px] text-zinc-500 font-bold uppercase mt-1">Video File</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-amber-500">
                      <DocIcon className="h-8 w-8" />
                      <span className="text-[9px] text-zinc-500 font-bold uppercase mt-1">Doc File</span>
                    </div>
                  )}

                  {/* Attachment indicator icon */}
                  {post && (
                    <div className="absolute top-2 right-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-1 rounded-md text-[9px] font-bold flex items-center gap-1 shadow-md">
                      <LinkIcon className="h-3 w-3" /> Attached
                    </div>
                  )}
                </div>

                {/* Footer details */}
                <div className="p-3 flex flex-col gap-1 border-t border-zinc-900/50 bg-zinc-950/40">
                  <span className="text-xs font-medium text-zinc-200 truncate group-hover:text-indigo-400 transition-colors">
                    {asset.fileName}
                  </span>
                  <div className="flex items-center justify-between text-[9px] text-zinc-500 font-semibold uppercase">
                    <span className="truncate max-w-[80px]">{project?.name || "No Campaign"}</span>
                    <span className="text-zinc-600 capitalize">{asset.type}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- MODALS OVERLAYS --- */}

      {/* 1. Upload Asset Modal */}
      {activeModal === "upload" && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-900 flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" /> Upload Campaign Media
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-zinc-500 hover:text-zinc-300">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="p-6 flex flex-col gap-4">
              
              {/* File Select */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-400">Select File</label>
                <div className="border border-dashed border-zinc-800 bg-zinc-900/10 rounded-xl p-6 text-center flex flex-col items-center gap-3">
                  <ImageIcon className="h-8 w-8 text-zinc-600" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-300">
                      {file ? file.name : "Select your image or video"}
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-1">
                      {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Supports image or video formats"}
                    </span>
                  </div>
                  <input 
                    type="file" 
                    onChange={handleFileChange}
                    className="hidden" 
                    id="asset-file-picker" 
                    required 
                  />
                  <label 
                    htmlFor="asset-file-picker"
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Browse Files
                  </label>
                </div>
              </div>

              {/* Target Project (Required) */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-400">Target Campaign/Project *</label>
                <select 
                  value={uploadProjectId} 
                  onChange={(e) => {
                    setUploadProjectId(e.target.value);
                    setUploadPostId(""); // Reset post association when project changes
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-300 text-sm focus:outline-none focus:border-indigo-600"
                  required
                >
                  <option value="">Select a Campaign...</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Optional Post Assignment */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-400">Attach to Content Post (Optional)</label>
                <select 
                  value={uploadPostId} 
                  onChange={(e) => setUploadPostId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-350 text-sm focus:outline-none focus:border-indigo-600 disabled:opacity-50"
                  disabled={!uploadProjectId}
                >
                  <option value="">Do not attach (Leave in library)</option>
                  {posts
                    .filter(post => post.projectId === uploadProjectId)
                    .map(post => (
                      <option key={post._id} value={post._id}>
                        {post.caption.substring(0, 40)}{post.caption.length > 40 ? "..." : ""} ({post.status})
                      </option>
                    ))}
                </select>
                {!uploadProjectId && (
                  <span className="text-[10px] text-zinc-500">Please select a campaign first to attach.</span>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 justify-end pt-2 border-t border-zinc-900/50 mt-2">
                <Button type="button" variant="ghost" onClick={() => setActiveModal(null)} className="text-zinc-500 text-xs">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={uploading || !file || !uploadProjectId} 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                >
                  {uploading && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  {uploading ? "Uploading..." : "Start Upload"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Inspect Asset Detail Modal */}
      {activeModal === "inspect" && selectedAsset && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Asset Preview Frame (Left/Top) */}
            <div className="flex-1 bg-zinc-900 flex items-center justify-center p-6 relative min-h-[300px] md:min-h-[400px] border-b md:border-b-0 md:border-r border-zinc-900">
              {selectedAsset.type === "image" && selectedAsset.url ? (
                <img 
                  src={selectedAsset.url} 
                  alt={selectedAsset.fileName} 
                  className="max-w-full max-h-[50vh] md:max-h-[70vh] object-contain rounded shadow-lg"
                />
              ) : selectedAsset.type === "video" && selectedAsset.url ? (
                <video 
                  src={selectedAsset.url} 
                  controls 
                  className="max-w-full max-h-[50vh] md:max-h-[70vh] object-contain rounded shadow-lg"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-zinc-500 text-center">
                  <DocIcon className="h-16 w-16 text-amber-500" />
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-zinc-350 text-sm">{selectedAsset.fileName}</span>
                    <span className="text-[10px] text-zinc-650 font-bold uppercase">{selectedAsset.type}</span>
                  </div>
                  {selectedAsset.url && (
                    <a 
                      href={selectedAsset.url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                    >
                      <ExternalLink className="h-3 w-3" /> View / Download Document
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Side Asset Config Details Panel (Right/Bottom) */}
            <div className="w-full md:w-80 flex flex-col p-6 overflow-y-auto">
              
              {/* Heading details */}
              <div className="flex justify-between items-start gap-4 pb-4 border-b border-zinc-900 mb-4">
                <div className="flex flex-col min-w-0">
                  <h4 className="font-bold text-white text-base truncate" title={selectedAsset.fileName}>
                    {selectedAsset.fileName}
                  </h4>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold mt-0.5 tracking-wider">
                    {selectedAsset.type} file
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setSelectedAsset(null);
                    setActiveModal(null);
                  }} 
                  className="text-zinc-500 hover:text-zinc-300 shrink-0"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              {/* General Metadata */}
              <div className="flex flex-col gap-3 text-xs mb-6 bg-zinc-900/20 p-3 rounded-lg border border-zinc-900">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Campaign</span>
                  <span className="font-semibold text-zinc-300">
                    {projects.find(p => p._id === selectedAsset.projectId)?.name || "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Uploaded By</span>
                  <span className="font-mono text-zinc-400">
                    {selectedAsset.uploadedBy.substring(0, 10)}...
                  </span>
                </div>
              </div>

              {/* Attach / Detach Form */}
              <form onSubmit={handleAttachSave} className="flex flex-col gap-3 flex-1">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Attached Content Post</label>
                  <select 
                    value={inspectPostId} 
                    onChange={(e) => setInspectPostId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-300 text-xs focus:outline-none focus:border-indigo-600"
                  >
                    <option value="">Unattached (Store in library)</option>
                    {posts
                      .filter(post => post.projectId === selectedAsset.projectId)
                      .map(post => (
                        <option key={post._id} value={post._id}>
                          {post.caption.substring(0, 40)}{post.caption.length > 40 ? "..." : ""} ({post.status})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="submit"
                    disabled={updatingAttachment || inspectPostId === (selectedAsset.postId || "")}
                    size="sm"
                    className="flex-1 bg-zinc-900 hover:bg-zinc-850 text-indigo-400 hover:text-indigo-300 border border-zinc-800 text-[11px]"
                  >
                    {updatingAttachment && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                    Update Link
                  </Button>
                </div>
              </form>

              {/* Danger / Action Zone */}
              <div className="border-t border-zinc-900 pt-4 mt-6 flex flex-col gap-2">
                
                {selectedAsset.url && (
                  <a 
                    href={selectedAsset.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="w-full"
                  >
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full border-zinc-900 hover:bg-zinc-900 text-zinc-300 text-xs"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open Direct Link
                    </Button>
                  </a>
                )}

                <Button 
                  onClick={handleDeleteAsset}
                  disabled={deleting}
                  variant="ghost" 
                  size="sm"
                  className="w-full hover:bg-red-500/10 text-red-500 hover:text-red-400 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Permanent Delete
                </Button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
