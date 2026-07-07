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
  AlertCircle
} from "lucide-react";
import Link from "next/link";

const defaultPostColumns = [
  { id: "draft", label: "Draft", color: "bg-zinc-900/60 border-zinc-800", hidden: false },
  { id: "internal_review", label: "Internal Review", color: "bg-indigo-950/20 border-indigo-900/30", hidden: false },
  { id: "client_review", label: "Client Review", color: "bg-amber-950/10 border-amber-900/20", hidden: false },
  { id: "changes_requested", label: "Changes Requested", color: "bg-rose-950/10 border-rose-900/20", hidden: false },
  { id: "approved", label: "Approved", color: "bg-emerald-950/10 border-emerald-900/20", hidden: false },
  { id: "scheduled", label: "Scheduled", color: "bg-sky-950/10 border-sky-900/20", hidden: false },
  { id: "published", label: "Published", color: "bg-teal-950/10 border-teal-900/20", hidden: false },
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

  // Mutations
  const createPost = useMutation(api.posts.create);
  const updatePostStatus = useMutation(api.posts.updateStatus);
  const updatePostDetails = useMutation(api.posts.updateDetails);
  const deletePost = useMutation(api.posts.deletePost);

  const columnsList = workspace?.settings?.postColumns || defaultPostColumns;
  const activeColumns = columnsList.filter(col => !col.hidden);

  // States
  const [activeTab, setActiveTab] = useState<"kanban" | "calendar">("kanban");
  const [activeModal, setActiveModal] = useState<null | "create" | "inspect">(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Form Composer States
  const [postCaption, setPostCaption] = useState("");
  const [postProject, setPostProject] = useState("");
  const [postPage, setPostPage] = useState("");
  const [postAssignee, setPostAssignee] = useState("");
  const [postScheduledDate, setPostScheduledDate] = useState("");
  const [postScheduledTime, setPostScheduledTime] = useState("");
  const [postStatus, setPostStatus] = useState<PostStatus>("draft");

  // Comment Form States
  const [commentText, setCommentText] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);
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
      await createPost({
        projectId: postProject as any,
        pageId: postPage as any,
        caption: postCaption.trim(),
        scheduledAt: scheduledTime,
        assigneeId: postAssignee || undefined,
      });

      // Reset
      setPostCaption("");
      setPostProject("");
      setPostPage("");
      setPostAssignee("");
      setPostScheduledDate("");
      setPostScheduledTime("");
      setActiveModal(null);
    } catch (err) {
      console.error(err);
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
      
      setSelectedPost(updatedPost);
      setActiveModal(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeletePost = async (postId: any) => {
    if (!confirm("Are you sure you want to delete this post? All comments will be permanently deleted.")) return;
    try {
      await deletePost({ postId });
      setActiveModal(null);
      setSelectedPost(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedPost) return;
    setLoadingComment(true);
    try {
      await createComment({
        postId: selectedPost._id,
        body: commentText.trim(),
      });
      setCommentText("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComment(false);
    }
  };

  const handleMoveStatus = async (postId: any, currentStatus: any, direction: "left" | "right") => {
    const order: PostStatus[] = ["draft", "internal_review", "client_review", "changes_requested", "approved", "scheduled", "published"];
    const idx = order.indexOf(currentStatus);
    const nextIdx = idx + (direction === "right" ? 1 : -1);

    if (nextIdx >= 0 && nextIdx < order.length) {
      try {
        await updatePostStatus({ postId, status: order[nextIdx] });
      } catch (err) {
        console.error(err);
      }
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
                  className="w-full text-left p-1 rounded border border-zinc-900 bg-zinc-950 text-[10px] truncate leading-tight flex items-center gap-1 group"
                >
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                    post.status === "published" ? "bg-teal-500" :
                    post.status === "client_review" ? "bg-amber-500" :
                    post.status === "approved" ? "bg-emerald-500" : "bg-zinc-500"
                  }`} />
                  <span className="text-zinc-300 truncate group-hover:text-indigo-400 transition-colors">
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
      {/* Header and Toggle Controllers */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-900 pb-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-white tracking-tight">Content Workflow</h2>
          <p className="text-sm text-zinc-400">
            Write captions, schedule platforms, organize reviews, and retrieve client-facing share tokens.
          </p>
        </div>

        {projects.length > 0 && socialPages.length > 0 && (
          <Button 
            onClick={() => {
              setPostProject(projects[0]?._id || "");
              setPostPage(socialPages[0]?._id || "");
              setPostStatus("draft");
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
        <div className="p-0.5 bg-zinc-900 rounded-lg flex border border-zinc-850">
          <button 
            onClick={() => setActiveTab("kanban")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === "kanban" ? "bg-zinc-800 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <KanbanIcon className="h-3.5 w-3.5" /> Kanban Board
          </button>
          <button 
            onClick={() => setActiveTab("calendar")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === "calendar" ? "bg-zinc-800 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <CalendarIcon className="h-3.5 w-3.5" /> Content Calendar
          </button>
        </div>
      </div>

      {projects.length === 0 || socialPages.length === 0 ? (
        /* Empty states */
        <div className="p-12 rounded-2xl border border-zinc-900 border-dashed bg-zinc-950/20 text-center flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 border border-zinc-850">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-1 text-left items-center max-w-sm">
            <h4 className="text-base font-semibold text-white">Prerequisites Missing</h4>
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
          className="grid grid-cols-1 gap-4 items-start w-full overflow-x-auto pb-4 md:grid"
          style={{ gridTemplateColumns: activeColumns.length > 0 ? `repeat(${activeColumns.length}, minmax(0, 1fr))` : undefined }}
        >
          {activeColumns.map((col) => {
            const colPosts = posts.filter((p) => p.status === col.id);

            return (
              <div 
                key={col.id} 
                className={`rounded-xl border p-3 flex flex-col gap-3 min-w-[200px] h-auto lg:h-[calc(100vh-270px)] lg:min-h-[400px] overflow-hidden ${col.color}`}
              >
                {/* Header */}
                <div className="flex justify-between items-center pb-2 border-b border-zinc-900/60">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 truncate max-w-[130px]">
                    {col.label}
                  </h4>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-zinc-900 border border-zinc-800 text-zinc-400">
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

                      return (
                        <div 
                          key={post._id}
                          className="p-3 rounded-lg border border-zinc-900 bg-zinc-950 hover:border-zinc-800 transition-all duration-200 flex flex-col gap-2.5 text-left group"
                        >
                          {/* Project + Platform tags */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {project && (
                              <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-850">
                                {project.name}
                              </span>
                            )}
                            {page && pConfig && (
                              <span className={`text-[8px] font-semibold px-1 rounded flex items-center border capitalize ${pConfig.color}`}>
                                {page.platform}
                              </span>
                            )}
                          </div>

                          {/* Caption */}
                          <div className="flex justify-between items-start gap-1">
                            <span 
                              onClick={() => openInspectModal(post)}
                              className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors cursor-pointer leading-snug line-clamp-3"
                            >
                              {post.caption}
                            </span>
                          </div>

                          {/* Info row */}
                          <div className="flex items-center justify-between text-[9px] text-zinc-500 border-t border-zinc-900/60 pt-2 mt-0.5">
                            <div className="flex items-center gap-1 text-[8.5px]">
                              <Clock className="h-2.5 w-2.5 text-zinc-650" />
                              <span>
                                {post.scheduledAt 
                                  ? new Date(post.scheduledAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) 
                                  : "Unscheduled"}
                              </span>
                            </div>

                            {post.status === "client_review" && post.approvalToken && (
                              <button 
                                onClick={() => handleCopyLink(post.approvalToken as string)}
                                className="text-amber-500 hover:text-amber-400 flex items-center gap-0.5 font-bold uppercase text-[8px]"
                                title="Copy Share Link"
                              >
                                <ExternalLink className="h-2.5 w-2.5" /> Review
                              </button>
                            )}
                          </div>

                          {/* Move arrows */}
                          <div className="flex items-center justify-between border-t border-zinc-900/60 pt-1.5 text-zinc-650">
                            {col.id !== "draft" ? (
                              <button 
                                onClick={() => handleMoveStatus(post._id, post.status, "left")}
                                className="hover:text-indigo-400 p-0.5 rounded hover:bg-zinc-900"
                              >
                                <ChevronLeft className="h-3.5 w-3.5" />
                              </button>
                            ) : <div />}

                            <span className="text-[8px] uppercase tracking-wider font-bold text-zinc-650 font-mono select-none">
                              Move
                            </span>

                            {col.id !== "published" ? (
                              <button 
                                onClick={() => handleMoveStatus(post._id, post.status, "right")}
                                className="hover:text-indigo-400 p-0.5 rounded hover:bg-zinc-900"
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            ) : <div />}
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
        <div className="flex flex-col gap-4 border border-zinc-900 bg-zinc-950/20 rounded-xl p-4 w-full">
          {/* Calendar month selector header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
            <h3 className="text-sm font-bold text-zinc-200 capitalize">
              {calendarDate.toLocaleString("default", { month: "long", year: "numeric" })}
            </h3>
            
            <div className="flex items-center gap-1.5">
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 border border-zinc-900 text-zinc-400 hover:text-white"
                onClick={() => changeMonth("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 text-xs border-zinc-900 text-zinc-300"
                onClick={() => setCalendarDate(new Date())}
              >
                Today
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 border border-zinc-900 text-zinc-400 hover:text-white"
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
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-900 flex justify-between items-center">
              <h3 className="font-bold text-white text-base">Compose Social Post</h3>
              <button onClick={() => setActiveModal(null)} className="text-zinc-500 hover:text-zinc-300">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreatePostSubmit} className="p-6 flex flex-col gap-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-400">Campaign / Project</label>
                  <select 
                    value={postProject} 
                    onChange={(e) => setPostProject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-300 text-sm focus:outline-none focus:border-indigo-600"
                    required
                  >
                    {projects.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-400">Target Social Page</label>
                  <select 
                    value={postPage} 
                    onChange={(e) => setPostPage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-300 text-sm focus:outline-none focus:border-indigo-600"
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
                <label className="text-xs font-semibold text-zinc-400">Caption / Copy</label>
                <textarea 
                  value={postCaption} 
                  onChange={(e) => setPostCaption(e.target.value)}
                  placeholder="Draft your social copy, hashtags, or threads..." 
                  rows={4}
                  className="w-full px-3.5 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-250 text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5 text-left col-span-2">
                  <label className="text-xs font-semibold text-zinc-400">Scheduled Date</label>
                  <input 
                    type="date" 
                    value={postScheduledDate} 
                    onChange={(e) => setPostScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-350 text-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-400">Time</label>
                  <input 
                    type="time" 
                    value={postScheduledTime} 
                    onChange={(e) => setPostScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-350 text-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-400">Assign Member / Editor</label>
                <select 
                  value={postAssignee} 
                  onChange={(e) => setPostAssignee(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-350 text-sm focus:outline-none focus:border-indigo-600"
                >
                  <option value="">Unassigned</option>
                  {members.map(m => (
                    <option key={m.userId} value={m.userId}>
                      {m.userId === workspace.ownerId ? "Owner (You)" : `Teammate: ${m.userId.substring(0, 8)}...`}
                    </option>
                  ))}
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
          <div className="w-full max-w-4xl bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-900 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">Post Inspector</h3>
              </div>
              <button 
                onClick={() => { setActiveModal(null); setSelectedPost(null); }} 
                className="text-zinc-500 hover:text-zinc-300"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2">
              
              {/* Left Column: Form Details */}
              <form onSubmit={handleInspectSaveSubmit} className="p-6 border-r border-zinc-900 flex flex-col gap-4 overflow-y-auto max-h-[500px]">
                
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-400">Caption / Copy</label>
                  <textarea 
                    value={postCaption} 
                    onChange={(e) => setPostCaption(e.target.value)}
                    rows={4}
                    className="w-full px-3.5 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-200 text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-semibold text-zinc-400">Social Channel</label>
                    <select 
                      value={postPage} 
                      onChange={(e) => setPostPage(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-300 text-sm focus:outline-none focus:border-indigo-600"
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
                    <label className="text-xs font-semibold text-zinc-400">Assign Member</label>
                    <select 
                      value={postAssignee} 
                      onChange={(e) => setPostAssignee(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-350 text-sm focus:outline-none focus:border-indigo-600"
                    >
                      <option value="">Unassigned</option>
                      {members.map(m => (
                        <option key={m.userId} value={m.userId}>
                          {m.userId === workspace.ownerId ? "Owner (You)" : `Teammate: ${m.userId.substring(0, 8)}...`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5 text-left col-span-2">
                    <label className="text-xs font-semibold text-zinc-400">Scheduled Date</label>
                    <input 
                      type="date" 
                      value={postScheduledDate} 
                      onChange={(e) => setPostScheduledDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-300 text-sm focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-semibold text-zinc-400">Time</label>
                    <input 
                      type="time" 
                      value={postScheduledTime} 
                      onChange={(e) => setPostScheduledTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-300 text-sm focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-400">Post Status</label>
                  <select 
                    value={postStatus} 
                    onChange={(e) => setPostStatus(e.target.value as PostStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-900 bg-zinc-900/30 text-zinc-300 text-sm focus:outline-none focus:border-indigo-600"
                  >
                    <option value="draft">Draft</option>
                    <option value="internal_review">Internal Review</option>
                    <option value="client_review">Client Review</option>
                    <option value="changes_requested">Changes Requested</option>
                    <option value="approved">Approved</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                {/* Client approval link section */}
                {postStatus === "client_review" && selectedPost.approvalToken && (
                  <div className="p-3 rounded-lg border border-amber-900/30 bg-amber-950/5 flex flex-col gap-2 text-left mt-2">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <Globe className="h-3 w-3" /> Client Approval Link Exists
                    </span>
                    <p className="text-[10px] text-zinc-400 leading-normal">
                      Share the link below with your client. They can approve the post or request changes without creating a login.
                    </p>
                    <div className="flex gap-1.5 mt-1">
                      <Button
                        type="button"
                        onClick={() => handleCopyLink(selectedPost.approvalToken)}
                        className={`text-[9px] h-7 flex-1 ${
                          copiedToken ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
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
                        <Button type="button" size="icon" className="h-7 w-7 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-between border-t border-zinc-900/60 pt-4 mt-3">
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
              <div className="p-6 bg-zinc-950/40 flex flex-col gap-4 max-h-[500px]">
                <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-2 text-left">
                  <MessageSquare className="h-3.5 w-3.5 text-indigo-400" /> Collaboration Thread
                </h4>

                {/* Messages Roster */}
                <div className="flex-1 overflow-y-auto flex flex-col gap-3 min-h-[250px] pr-1.5">
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
                          <p className="text-xs text-zinc-300 p-2.5 rounded-lg border border-zinc-900 bg-zinc-900/20 leading-relaxed max-w-[90%]">
                            {c.body}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Comment Input */}
                <form onSubmit={handlePostCommentSubmit} className="flex items-center gap-2 border-t border-zinc-900/60 pt-3">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Ask a question or request copy edits..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-900 bg-zinc-900/20 text-zinc-200 text-xs focus:outline-none focus:border-indigo-600"
                    required
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={loadingComment || !commentText.trim()}
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
