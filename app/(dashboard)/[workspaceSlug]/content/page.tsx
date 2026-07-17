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
  Layers, 
  Calendar as CalendarIcon, 
  Kanban as KanbanIcon,
  MessageSquare, 
  Copy, 
  Check, 
  User, 
  Clock, 
  Trash2, 
  Globe, 
  Eye, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X as CloseIcon,
  Send,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText as DocIcon,
  Link as LinkIcon,
  Unlink
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { resolveColumnColor } from "@/lib/utils";

const defaultPostColumns = [
  { id: "draft", label: "Draft", color: "bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800", hidden: false },
  { id: "internal_review", label: "Internal Review", color: "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/50 dark:border-indigo-900/30", hidden: false },
  { id: "client_review", label: "Client Review", color: "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-900/20", hidden: false },
  { id: "changes_requested", label: "Changes Requested", color: "bg-rose-50/50 dark:bg-rose-955/10 border-rose-200/50 dark:border-rose-900/20", hidden: false },
  { id: "approved", label: "Approved", color: "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-900/20", hidden: false },
  { id: "scheduled", label: "Scheduled", color: "bg-sky-50/50 dark:bg-sky-950/10 border-sky-200/50 dark:border-sky-900/20", hidden: false },
  { id: "published", label: "Published", color: "bg-teal-50/50 dark:bg-teal-950/10 border-teal-200/50 dark:border-teal-900/20", hidden: false },
];

type PostStatus = "draft" | "internal_review" | "client_review" | "changes_requested" | "approved" | "scheduled" | "published" | "failed";

const platformConfigs = {
  instagram: { label: "Instagram", color: "text-pink-400 bg-pink-500/10 border-pink-500/20" },
  facebook: { label: "Facebook", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  tiktok: { label: "TikTok", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
  x: { label: "X / Twitter", color: "text-white bg-zinc-900 border-zinc-800" },
  linkedin: { label: "LinkedIn", color: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
} as const;

export default function ContentWorkflowPage() {
  const params = useParams();
  const slug = params.workspaceSlug as string;
  const { user: currentUser } = useUser();

  // Convex Queries
  const workspace = useQuery(api.workspaces.getBySlug, { slug });
  
  const posts = useQuery(
    api.posts.listByWorkspace,
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

  const members = useQuery(
    api.workspaces.listMembers,
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  const assets = useQuery(
    api.assets.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  // Mutations
  const createPost = useMutation(api.posts.create);
  const updatePostStatus = useMutation(api.posts.updateStatus);
  const updatePostDetails = useMutation(api.posts.updateDetails);
  const deletePost = useMutation(api.posts.deletePost);

  const generateUploadUrl = useMutation(api.assets.generateUploadUrl);
  const saveAsset = useMutation(api.assets.save);
  const attachToPost = useMutation(api.assets.attachToPost);

  const columnsList = workspace?.settings?.postColumns || defaultPostColumns;
  const activeColumns = columnsList.filter(col => !col.hidden);

  // States
  const [activeTab, setActiveTab] = useState<"kanban" | "calendar">("kanban");
  const [activeModal, setActiveModal] = useState<null | "create" | "inspect">(null);

  // Drag and Drop States
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [activeDropCol, setActiveDropCol] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const postAssets = selectedPost ? (assets?.filter((a) => a.postId === selectedPost._id) || []) : [];
  const [copiedToken, setCopiedToken] = useState(false);

  // Form Composer States
  const [postCaption, setPostCaption] = useState("");
  const [postProject, setPostProject] = useState("");
  const [postPage, setPostPage] = useState("");
  const [postAssignee, setPostAssignee] = useState("");
  const [postScheduledDate, setPostScheduledDate] = useState("");
  const [postScheduledTime, setPostScheduledTime] = useState("");
  const [postStatus, setPostStatus] = useState<string>("draft");

  // File Upload States
  const [composerFile, setComposerFile] = useState<File | null>(null);
  const [uploadingInspectorFile, setUploadingInspectorFile] = useState(false);

  // Comment Form States
  const [commentText, setCommentText] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // Calendar Navigation State
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Load Comments for selected post
  const comments = useQuery(
    api.comments.listByPost,
    selectedPost ? { postId: selectedPost._id } : "skip"
  );
  const createComment = useMutation(api.comments.create);

  if (workspace === undefined || posts === undefined || projects === undefined || socialPages === undefined || members === undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm font-medium">Fetching content workflow, calendar, and comments...</p>
      </div>
    );
  }

  if (!workspace) return null;

  // Helpers to handle creations/saves
  const handleCreatePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postCaption.trim() || !postProject || !postPage) return;
    setLoadingAction(true);

    let scheduledTime: number | undefined = undefined;
    if (postScheduledDate) {
      const dateTimeString = postScheduledTime 
        ? `${postScheduledDate}T${postScheduledTime}` 
        : `${postScheduledDate}T12:00`;
      scheduledTime = new Date(dateTimeString).getTime();
    }

    try {
      const newPost = await createPost({
        projectId: postProject as any,
        pageId: postPage as any,
        caption: postCaption.trim(),
        scheduledAt: scheduledTime,
        assigneeId: postAssignee || undefined,
        status: postStatus,
      });
      toast.success("Post created successfully.");

      if (composerFile && newPost) {
        toast.info("Uploading attached media...");
        const uploadUrl = await generateUploadUrl({ projectId: postProject as any });
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": composerFile.type },
          body: composerFile,
        });
        if (!response.ok) {
          throw new Error("File upload to Convex storage failed.");
        }
        const { storageId } = await response.json();
        
        let assetType: "image" | "video" | "document" = "document";
        if (composerFile.type.startsWith("image/")) assetType = "image";
        else if (composerFile.type.startsWith("video/")) assetType = "video";

        await saveAsset({
          projectId: postProject as any,
          postId: newPost._id,
          storageId,
          type: assetType,
          fileName: composerFile.name,
        });
        toast.success("Media attached successfully.");
      }

      // Reset
      setPostCaption("");
      setPostProject("");
      setPostPage("");
      setPostAssignee("");
      setPostScheduledDate("");
      setPostScheduledTime("");
      setComposerFile(null);
      setActiveModal(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create post");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleInspectSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !postCaption.trim() || !postPage) return;
    setLoadingAction(true);

    let scheduledTime: number | undefined = undefined;
    if (postScheduledDate) {
      const dateTimeString = postScheduledTime 
        ? `${postScheduledDate}T${postScheduledTime}` 
        : `${postScheduledDate}T12:00`;
      scheduledTime = new Date(dateTimeString).getTime();
    }

    try {
      const updatedPost = await updatePostDetails({
        postId: selectedPost._id,
        caption: postCaption.trim(),
        pageId: postPage as any,
        status: postStatus,
        scheduledAt: scheduledTime,
        assigneeId: postAssignee || undefined,
      });
      toast.success("Post updated successfully.");
      
      setSelectedPost(updatedPost);
      setActiveModal(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update post");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeletePost = async (postId: any) => {
    if (!confirm("Are you sure you want to delete this post? All comments will be permanently deleted.")) return;
    try {
      await deletePost({ postId });
      toast.info("Post deleted successfully.");
      setActiveModal(null);
      setSelectedPost(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete post");
    }
  };

  const handlePostCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!commentText.trim() && !commentFile) || !selectedPost) return;
    setLoadingComment(true);
    try {
      let imageStorageId = undefined;
      if (commentFile) {
        const uploadUrl = await generateUploadUrl({ projectId: selectedPost.projectId });
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": commentFile.type },
          body: commentFile,
        });
        if (!res.ok) throw new Error("Image upload failed");
        const json = await res.json();
        imageStorageId = json.storageId;
      }

      await createComment({
        postId: selectedPost._id,
        body: commentText.trim(),
        imageStorageId,
      });
      setCommentText("");
      setCommentFile(null);
      toast.success("Comment posted successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to post comment");
    } finally {
      setLoadingComment(false);
    }
  };

  const handleMoveStatus = async (postId: any, currentStatus: any, direction: "left" | "right") => {
    const order = activeColumns.map(col => col.id);
    const idx = order.indexOf(currentStatus);
    const nextIdx = idx + (direction === "right" ? 1 : -1);

    if (nextIdx >= 0 && nextIdx < order.length) {
      const nextStatus = order[nextIdx];
      try {
        await updatePostStatus({ postId, status: nextStatus });
        const nextCol = activeColumns.find(c => c.id === nextStatus);
        toast.success(`Post moved to: ${nextCol?.label || nextStatus}`);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to move post");
      }
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedPostId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedPostId(null);
    setActiveDropCol(null);
  };

  const handleDragEnter = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setActiveDropCol(colId);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData("text/plain") || draggedPostId;
    setDraggedPostId(null);
    setActiveDropCol(null);

    if (!postId) return;

    // Find post
    const postObj = posts?.find(p => p._id === postId);
    if (!postObj || postObj.status === targetStatus) return;

    try {
      await updatePostStatus({ postId: postId as any, status: targetStatus });
      const targetCol = activeColumns.find(c => c.id === targetStatus);
      toast.success(`Post moved to: ${targetCol?.label || targetStatus}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update post status");
    }
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const openInspectModal = (post: any) => {
    setSelectedPost(post);
    setPostCaption(post.caption);
    setPostProject(post.projectId);
    setPostPage(post.pageId);
    setPostAssignee(post.assigneeId || "");
    setPostStatus(post.status);
    
    if (post.scheduledAt) {
      const dt = new Date(post.scheduledAt);
      setPostScheduledDate(dt.toISOString().split("T")[0]);
      setPostScheduledTime(dt.toTimeString().split(" ")[0].substring(0, 5));
    } else {
      setPostScheduledDate("");
      setPostScheduledTime("");
    }
    
    setActiveModal("inspect");
  };

  // Calendar Helpers
  const changeMonth = (direction: "prev" | "next") => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + (direction === "next" ? 1 : -1), 1));
  };

  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Fill empty offset boxes before start of month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-[100px] border border-zinc-900 bg-zinc-950/20 text-zinc-800 p-2" />);
    }

    // Days grid
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDayDate = new Date(year, month, day);
      const isToday = currentDayDate.toDateString() === new Date().toDateString();
      
      // Filter posts for this day
      const dayPosts = posts.filter(post => {
        if (!post.scheduledAt) return false;
        const d = new Date(post.scheduledAt);
        return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
      });

      days.push(
        <div 
          key={`day-${day}`}
          className={`min-h-[120px] border border-zinc-900 p-2 flex flex-col gap-1.5 transition-colors duration-200 ${
            isToday ? "bg-indigo-950/5 border-indigo-900/40" : "bg-zinc-950/40 hover:bg-zinc-900/10"
          }`}
        >
          <span className={`text-[11px] font-bold h-5 w-5 rounded-full flex items-center justify-center ${
            isToday ? "bg-indigo-600 text-white font-mono" : "text-zinc-500 font-mono"
          }`}>
            {day}
          </span>

          <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
            {dayPosts.map(post => {
              const page = socialPages.find(sp => sp._id === post.pageId);
              const pConfig = page ? (platformConfigs as any)[page.platform] : null;

              return (
                <button
                  key={post._id}
                  onClick={() => openInspectModal(post)}
                  className="w-full text-left p-1 rounded border border-border bg-card text-[10px] truncate leading-tight flex items-center gap-1 group"
                >
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                    post.status === "published" ? "bg-teal-500" :
                    post.status === "client_review" ? "bg-amber-500" :
                    post.status === "approved" ? "bg-emerald-500" : "bg-zinc-500"
                  }`} />
                  <span className="text-zinc-600 dark:text-zinc-300 truncate group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">
                    {page ? `@${page.handle}: ` : ""}{post.caption}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="flex flex-col gap-6 w-full flex-1">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Content Workflow</h2>
          <p className="text-sm text-zinc-650 dark:text-zinc-400">
            Write captions, schedule platforms, organize reviews, and retrieve client-facing share tokens.
          </p>
        </div>

        {projects.length > 0 && socialPages.length > 0 && (
          <Button 
            onClick={() => {
              setPostProject(projects[0]?._id || "");
              setPostPage(socialPages[0]?._id || "");
              setPostStatus(activeColumns[0]?.id || "draft");
              setActiveModal("create");
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 text-xs font-semibold"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Create Post
          </Button>
        )}
      </div>

      {/* Main Tab Controls */}
      <div className="flex items-center justify-between">
        <div className="p-0.5 bg-muted rounded-lg flex border border-border">
          <button 
            onClick={() => setActiveTab("kanban")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === "kanban" ? "bg-background text-foreground shadow" : "text-zinc-500 dark:text-zinc-400 hover:text-foreground"
            }`}
          >
            <KanbanIcon className="h-3.5 w-3.5" /> Kanban Board
          </button>
          <button 
            onClick={() => setActiveTab("calendar")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === "calendar" ? "bg-background text-foreground shadow" : "text-zinc-500 dark:text-zinc-400 hover:text-foreground"
            }`}
          >
            <CalendarIcon className="h-3.5 w-3.5" /> Content Calendar
          </button>
        </div>
      </div>

      {projects.length === 0 || socialPages.length === 0 ? (
        /* Empty states */
        <div className="p-12 rounded-2xl border border-border border-dashed bg-card/30 text-center flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-zinc-500 border border-border">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-1 text-left items-center max-w-sm">
            <h4 className="text-base font-semibold text-foreground">Prerequisites Missing</h4>
            <p className="text-xs text-zinc-500 text-center leading-relaxed">
              You must set up at least one **Campaign/Project** and connect one **Social Page** under the "Clients & Pages" tab first to compose social content.
            </p>
          </div>
          <Link href={`/${slug}/clients`}>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25">
              Set Up Clients & Pages
            </Button>
          </Link>
        </div>
      ) : activeTab === "kanban" ? (
        
        /* 1. KANBAN BOARD VIEW */
        <div 
          className="flex gap-5 items-start w-full overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
        >
          {activeColumns.map((col) => {
            const colPosts = posts.filter((p) => p.status === col.id);
            const { bgBorder, text: headerTextClass } = resolveColumnColor(col.color);

            return (
              <div 
                key={col.id} 
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => handleDragEnter(e, col.id)}
                onDragLeave={() => setActiveDropCol(prev => prev === col.id ? null : prev)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`rounded-xl border p-4 flex flex-col gap-4 w-[290px] shrink-0 h-auto lg:h-[calc(100vh-270px)] lg:min-h-[450px] overflow-hidden transition-all duration-200 ${
                  activeDropCol === col.id 
                    ? "border-indigo-500/60 bg-indigo-950/20 shadow-lg shadow-indigo-950/25" 
                    : bgBorder
                }`}
              >
                {/* Header */}
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <h4 className={`text-[10px] font-bold uppercase tracking-wider truncate max-w-[130px] ${headerTextClass}`}>
                    {col.label}
                  </h4>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-zinc-100 dark:bg-zinc-900 border border-border text-zinc-650 dark:text-zinc-400">
                    {colPosts.length}
                  </span>
                </div>

                {/* Stack */}
                <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto pr-0.5">
                  {colPosts.length === 0 ? (
                    <div className="text-center py-8 text-zinc-700 text-[10px] italic">
                      Empty
                    </div>
                  ) : (
                    colPosts.map((post) => {
                      const project = projects.find((p) => p._id === post.projectId);
                      const page = socialPages.find((sp) => sp._id === post.pageId);
                      const pConfig = page ? (platformConfigs as any)[page.platform] : null;
                      const postAsset = assets?.find((a) => a.postId === post._id && a.type === "image");
                      const assignee = members.find((m) => m.userId === post.assigneeId);

                      return (
                        <div 
                          key={post._id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, post._id)}
                          onDragEnd={handleDragEnd}
                          className={`p-3 rounded-lg border border-border bg-card hover:border-indigo-600/40 cursor-grab active:cursor-grabbing transition-all duration-200 flex flex-col gap-2.5 text-left group ${
                            draggedPostId === post._id ? "opacity-40 border-dashed border-zinc-300 dark:border-zinc-800 scale-95" : ""
                          }`}
                        >
                          {/* Project + Platform tags */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {project && (
                              <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-muted text-zinc-600 dark:text-zinc-500 border border-border">
                                {project.name}
                              </span>
                            )}
                            {page && pConfig && (
                              <span className={`text-[8px] font-semibold px-1 rounded flex items-center border capitalize ${pConfig.color}`}>
                                {page.platform}
                              </span>
                            )}
                          </div>

                          {/* Media Preview (If attached) */}
                          {postAsset && postAsset.url && (
                            <div className="w-full h-24 rounded-md overflow-hidden bg-muted border border-border mb-0.5 shrink-0 relative">
                              <img 
                                src={postAsset.url} 
                                alt={post.caption} 
                                className="w-full h-full object-cover" 
                                loading="lazy"
                              />
                            </div>
                          )}

                          {/* Caption */}
                          <div className="flex justify-between items-start gap-1">
                            <span 
                              onClick={() => openInspectModal(post)}
                              className="text-xs font-medium text-zinc-800 dark:text-zinc-300 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors cursor-pointer leading-snug line-clamp-3"
                            >
                              {post.caption}
                            </span>
                          </div>

                          {/* Info row */}
                          <div className="flex items-center justify-between text-[9px] text-zinc-500 border-t border-border pt-2 mt-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {/* Assignee Avatar */}
                              {assignee ? (
                                assignee.pictureUrl ? (
                                  assignee.pictureUrl.startsWith("http://") || assignee.pictureUrl.startsWith("https://") || assignee.pictureUrl.startsWith("/") ? (
                                    <div className="h-[15px] w-[15px] rounded-full overflow-hidden shrink-0 border border-border" title={assignee.userName || "Teammate"}>
                                      <img 
                                        src={assignee.pictureUrl} 
                                        alt="Assignee Avatar" 
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-[10px] leading-none shrink-0" title={assignee.userName || "Teammate"}>{assignee.pictureUrl}</span>
                                  )
                                ) : (
                                  <span title={assignee.userName || "Teammate"} className="flex items-center shrink-0">
                                    <User className="h-3 w-3 text-zinc-650" />
                                  </span>
                                )
                              ) : (
                                <span className="text-[10px] text-zinc-700 font-bold" title="Unassigned">👤</span>
                              )}
                              
                              <span className="text-zinc-800">|</span>

                              <div className="flex items-center gap-1 text-[8.5px] min-w-0">
                                <Clock className="h-2.5 w-2.5 text-zinc-650 shrink-0" />
                                <span className="truncate">
                                  {post.scheduledAt 
                                    ? new Date(post.scheduledAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) 
                                    : "Unscheduled"}
                                </span>
                              </div>
                            </div>

                            {post.status === "client_review" && post.approvalToken && (
                              <button 
                                onClick={() => handleCopyLink(post.approvalToken as string)}
                                className="text-amber-500 hover:text-amber-400 flex items-center gap-0.5 font-bold uppercase text-[8px] shrink-0"
                                title="Copy Share Link"
                              >
                                <ExternalLink className="h-2.5 w-2.5" /> Review
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        
        /* 2. CALENDAR MONTH GRID VIEW */
        <div className="flex flex-col gap-4 border border-border bg-card/50 rounded-xl p-4 w-full">
          {/* Calendar month selector header */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="text-sm font-bold text-foreground capitalize">
              {calendarDate.toLocaleString("default", { month: "long", year: "numeric" })}
            </h3>
            
            <div className="flex items-center gap-1.5">
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 border border-border text-zinc-500 hover:text-foreground"
                onClick={() => changeMonth("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 text-xs border-border text-zinc-700 dark:text-zinc-300"
                onClick={() => setCalendarDate(new Date())}
              >
                Today
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 border border-border text-zinc-500 hover:text-foreground"
                onClick={() => changeMonth("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days grid wrapper */}
          <div className="grid grid-cols-7 gap-1.5">
            {renderCalendar()}
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* 1. Create Post Composer Modal */}
      {activeModal === "create" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-foreground text-base">Compose Social Post</h3>
              <button onClick={() => setActiveModal(null)} className="text-zinc-500 hover:text-zinc-350">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreatePostSubmit} className="p-6 flex flex-col gap-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-550 dark:text-zinc-400">Campaign / Project</label>
                  <select 
                    value={postProject} 
                    onChange={(e) => setPostProject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600"
                    required
                  >
                    {projects.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-550 dark:text-zinc-400">Target Social Page</label>
                  <select 
                    value={postPage} 
                    onChange={(e) => setPostPage(e.target.value)}
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
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-550 dark:text-zinc-400">Caption / Copy</label>
                <textarea 
                  value={postCaption} 
                  onChange={(e) => setPostCaption(e.target.value)}
                  placeholder="Draft your social copy, hashtags, or threads..." 
                  rows={4}
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  required
                />
              </div>

              {/* Optional Media Attachment */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-550 dark:text-zinc-400">Media Attachment (Optional)</label>
                <div className="border border-dashed border-border bg-muted/40 rounded-xl p-4 text-center flex flex-col items-center gap-2">
                  <input 
                    type="file" 
                    id="composer-media-file"
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setComposerFile(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs text-zinc-400 truncate max-w-[220px]">
                      {composerFile ? composerFile.name : "No file attached"}
                    </span>
                    {composerFile ? (
                      <button 
                        type="button" 
                        onClick={() => setComposerFile(null)}
                        className="text-zinc-500 hover:text-red-450 text-xs font-bold"
                      >
                        Remove
                      </button>
                    ) : (
                      <label 
                        htmlFor="composer-media-file"
                        className="px-2.5 py-1 bg-muted hover:bg-muted/80 border border-border text-foreground text-[10px] font-semibold rounded cursor-pointer transition-colors"
                      >
                        Browse File
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5 text-left col-span-2">
                  <label className="text-xs font-semibold text-zinc-550 dark:text-zinc-400">Scheduled Date</label>
                  <input 
                    type="date" 
                    value={postScheduledDate} 
                    onChange={(e) => setPostScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-550 dark:text-zinc-400">Time</label>
                  <input 
                    type="time" 
                    value={postScheduledTime} 
                    onChange={(e) => setPostScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-550 dark:text-zinc-400">Assign Member / Editor</label>
                <select 
                  value={postAssignee} 
                  onChange={(e) => setPostAssignee(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600"
                >
                  <option value="">👤 Unassigned</option>
                  {members.map(m => {
                    const avatarSymbol = m.pictureUrl 
                      ? (m.pictureUrl.startsWith("http") || m.pictureUrl.startsWith("/") ? "👤" : m.pictureUrl) 
                      : "👤";
                    const displayName = m.userName && (m.userEmail || m.invitedEmail) 
                      ? `${m.userName} (${m.userEmail || m.invitedEmail})` 
                      : (m.userEmail || m.invitedEmail || m.userName || m.userId.substring(0, 8) + "...");
                    return (
                      <option key={m.userId} value={m.userId}>
                        {avatarSymbol} {m.userId === workspace.ownerId ? `Owner: ${displayName}` : `Teammate: ${displayName}`}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setActiveModal(null)} className="text-zinc-500 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={loadingAction} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
                  {loadingAction && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  Save Draft
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Inspect Post (Details + Share + Comments) Modal */}
      {activeModal === "inspect" && selectedPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[calc(100%-2rem)] md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-7xl h-[95vh] bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-400" />
                <h3 className="font-bold text-foreground text-sm">Post Inspector</h3>
              </div>
              <button 
                onClick={() => { setActiveModal(null); setSelectedPost(null); }} 
                className="text-zinc-500 hover:text-zinc-350"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 flex-1 min-h-0 overflow-y-auto md:overflow-visible">
              
              {/* Left Column: Form Details */}
              <form onSubmit={handleInspectSaveSubmit} className="p-6 border-b md:border-b-0 md:border-r border-border flex flex-col gap-4 h-auto md:h-full overflow-y-visible md:overflow-y-auto">
                
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-550 dark:text-zinc-400">Caption / Copy</label>
                  <textarea 
                    value={postCaption} 
                    onChange={(e) => setPostCaption(e.target.value)}
                    rows={4}
                    className="w-full px-3.5 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-semibold text-zinc-550 dark:text-zinc-400">Social Channel</label>
                    <select 
                      value={postPage} 
                      onChange={(e) => setPostPage(e.target.value)}
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

                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-semibold text-zinc-550 dark:text-zinc-400">Assign Member</label>
                    <select 
                      value={postAssignee} 
                      onChange={(e) => setPostAssignee(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600"
                    >
                      <option value="">👤 Unassigned</option>
                      {members.map(m => {
                        const avatarSymbol = m.pictureUrl 
                          ? (m.pictureUrl.startsWith("http") || m.pictureUrl.startsWith("/") ? "👤" : m.pictureUrl) 
                          : "👤";
                        const displayName = m.userName && (m.userEmail || m.invitedEmail) 
                          ? `${m.userName} (${m.userEmail || m.invitedEmail})` 
                          : (m.userEmail || m.invitedEmail || m.userName || m.userId.substring(0, 8) + "...");
                        return (
                          <option key={m.userId} value={m.userId}>
                            {avatarSymbol} {m.userId === workspace.ownerId ? `Owner: ${displayName}` : `Teammate: ${displayName}`}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5 text-left col-span-2">
                    <label className="text-xs font-semibold text-zinc-550 dark:text-zinc-400">Scheduled Date</label>
                    <input 
                      type="date" 
                      value={postScheduledDate} 
                      onChange={(e) => setPostScheduledDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-semibold text-zinc-555 dark:text-zinc-400">Time</label>
                    <input 
                      type="time" 
                      value={postScheduledTime} 
                      onChange={(e) => setPostScheduledTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-550 dark:text-zinc-400">Post Status</label>
                  <select 
                    value={postStatus} 
                    onChange={(e) => setPostStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    {activeColumns.map((col) => (
                      <option key={col.id} value={col.id}>{col.label}</option>
                    ))}
                  </select>
                </div>

                {/* Attached Media Section */}
                <div className="flex flex-col gap-2 border-t border-border pt-4 mt-2">
                  <label className="text-xs font-semibold text-zinc-550 dark:text-zinc-400">Attached Media</label>
                  
                  {/* List of currently attached assets */}
                  {postAssets.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {postAssets.map((asset) => (
                        <div key={asset._id} className="relative group border border-border bg-card rounded-lg p-2 flex items-center gap-2">
                          {asset.type === "image" && asset.url ? (
                            <img src={asset.url} className="h-8 w-8 object-cover rounded" />
                          ) : asset.type === "video" ? (
                            <VideoIcon className="h-8 w-8 text-indigo-400 p-1.5 bg-indigo-500/10 rounded" />
                          ) : (
                            <DocIcon className="h-8 w-8 text-amber-500 p-1.5 bg-amber-500/10 rounded" />
                          )}
                          <span className="text-[10px] text-zinc-600 dark:text-zinc-300 truncate flex-1">{asset.fileName}</span>
                          
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await attachToPost({ assetId: asset._id, postId: undefined });
                                toast.success("Asset detached from post.");
                              } catch (err: any) {
                                toast.error(err.message || "Failed to detach asset");
                              }
                            }}
                            className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 cursor-pointer"
                            title="Detach from post"
                          >
                            <Unlink className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload box */}
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      id="inspector-media-upload"
                      className="hidden" 
                      onChange={async (e) => {
                        if (e.target.files && e.target.files[0]) {
                          const fileToUpload = e.target.files[0];
                          setUploadingInspectorFile(true);
                          try {
                            const uploadUrl = await generateUploadUrl({ projectId: selectedPost.projectId });
                            const res = await fetch(uploadUrl, {
                              method: "POST",
                              headers: { "Content-Type": fileToUpload.type },
                              body: fileToUpload,
                            });
                            if (!res.ok) throw new Error("Upload failed");
                            const { storageId } = await res.json();
                            
                            let assetType: "image" | "video" | "document" = "document";
                            if (fileToUpload.type.startsWith("image/")) assetType = "image";
                            else if (fileToUpload.type.startsWith("video/")) assetType = "video";

                            await saveAsset({
                              projectId: selectedPost.projectId,
                              postId: selectedPost._id,
                              storageId,
                              type: assetType,
                              fileName: fileToUpload.name,
                            });
                            toast.success("File uploaded and attached!");
                          } catch (err: any) {
                            toast.error(err.message || "Failed to upload file");
                          } finally {
                            setUploadingInspectorFile(false);
                          }
                        }
                      }}
                    />
                    <label 
                      htmlFor="inspector-media-upload"
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-dashed border-border hover:border-zinc-400 dark:hover:border-zinc-700 bg-muted hover:bg-muted/80 text-zinc-550 dark:text-zinc-400 hover:text-foreground rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      {uploadingInspectorFile ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                          Uploading file...
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          Upload & Attach File
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Client approval link section */}
                {postStatus === "client_review" && selectedPost.approvalToken && (
                  <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 dark:bg-amber-955/5 flex flex-col gap-2 text-left mt-2">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <Globe className="h-3 w-3" /> Client Approval Link Exists
                    </span>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-normal">
                      Share the link below with your client. They can approve the post or request changes without creating a login.
                    </p>
                    <div className="flex gap-1.5 mt-1">
                      <Button
                        type="button"
                        onClick={() => handleCopyLink(selectedPost.approvalToken)}
                        className={`text-[9px] h-7 flex-1 ${
                          copiedToken ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-muted border border-border text-foreground hover:bg-muted/80"
                        }`}
                      >
                        {copiedToken ? (
                          <>
                            <Check className="h-3 w-3 mr-1" /> Copied Link
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" /> Copy Share Link
                          </>
                        )}
                      </Button>
                      <Link href={`/share/${selectedPost.approvalToken}`} target="_blank" className="shrink-0">
                        <Button type="button" size="icon" className="h-7 w-7 bg-muted hover:bg-muted/80 border border-border text-zinc-500 hover:text-foreground">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-between border-t border-border pt-4 mt-3">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => handleDeletePost(selectedPost._id)}
                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10 text-xs"
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => { setActiveModal(null); setSelectedPost(null); }} 
                      className="text-zinc-500 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loadingAction} 
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                    >
                      {loadingAction && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              </form>

              {/* Right Column: Comments Threads */}
              <div className="p-6 bg-zinc-100/30 dark:bg-zinc-950/40 flex flex-col gap-4 h-[500px] md:h-full overflow-hidden shrink-0 md:shrink">
                <h4 className="text-xs font-bold uppercase text-zinc-550 dark:text-zinc-400 tracking-wider flex items-center gap-1.5 border-b border-border pb-2 text-left">
                  <MessageSquare className="h-3.5 w-3.5 text-indigo-400" /> Collaboration Thread
                </h4>

                {/* Messages Roster */}
                <div className="flex-1 overflow-y-auto flex flex-col gap-3 min-h-0 pr-1.5">
                  {comments === undefined ? (
                    <div className="flex justify-center items-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-12 text-xs italic text-zinc-650 text-left">
                      No comments posted. Teammate and client approval feedback will appear here.
                    </div>
                  ) : (
                    comments.map((c) => {
                      const isClient = c.authorId === "client";
                      return (
                        <div key={c._id} className="flex flex-col gap-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold ${isClient ? "text-amber-400" : "text-indigo-400"}`}>
                              {c.authorName}
                            </span>
                            {isClient && (
                              <span className="px-1 py-0.25 rounded text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
                                External
                              </span>
                            )}
                          </div>
                          <div className="p-2.5 rounded-lg border border-border bg-card max-w-[90%] flex flex-col gap-2">
                            {c.body && (
                              <p className="text-xs text-zinc-800 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                {c.body}
                              </p>
                            )}
                            {c.imageUrl && (
                              <div className="relative max-w-full rounded-md overflow-hidden border border-border bg-black/40">
                                <img 
                                  src={c.imageUrl} 
                                  alt="Comment attachment" 
                                  className="max-h-48 object-contain rounded w-auto max-w-full block"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Comment File Preview */}
                {commentFile && (
                  <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg border border-border bg-card text-xs mt-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative h-8 w-8 rounded overflow-hidden border border-border bg-muted shrink-0">
                        <img 
                          src={URL.createObjectURL(commentFile)} 
                          alt="preview" 
                          className="h-full w-full object-cover" 
                        />
                      </div>
                      <span className="text-[10px] text-zinc-650 dark:text-zinc-300 truncate">{commentFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCommentFile(null)}
                      className="text-zinc-500 hover:text-red-450 p-1"
                    >
                      <CloseIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Comment Input */}
                <form onSubmit={handlePostCommentSubmit} className="flex items-center gap-2 border-t border-border pt-3">
                  <input
                    type="file"
                    accept="image/*"
                    id="comment-image-upload"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setCommentFile(e.target.files[0]);
                      }
                    }}
                  />
                  <label 
                    htmlFor="comment-image-upload"
                    className="h-8 w-8 rounded-lg flex items-center justify-center border border-border bg-muted text-zinc-550 dark:text-zinc-400 hover:text-foreground cursor-pointer shrink-0"
                    title="Attach image"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </label>
 
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Ask a question or request copy edits..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-muted text-foreground text-xs focus:outline-none focus:border-indigo-600"
                    required={!commentFile}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={loadingComment || (!commentText.trim() && !commentFile)}
                    className="h-8 w-8 bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
                  >
                    {loadingComment ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
