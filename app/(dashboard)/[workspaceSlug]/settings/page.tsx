"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Settings, 
  Columns, 
  Palette, 
  EyeOff, 
  Eye, 
  Undo2, 
  Check, 
  AlertCircle,
  Plus,
  Trash2,
  AlertTriangle,
  CreditCard,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  GripVertical,
  Coins,
  Globe
} from "lucide-react";
import { toast } from "sonner";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";

// Default column configurations
const defaultTaskColumns = [
  { id: "todo", label: "To Do", color: "bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-800", hidden: false },
  { id: "in_progress", label: "In Progress", color: "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/50 dark:border-indigo-900/30", hidden: false },
  { id: "done", label: "Completed", color: "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-900/20", hidden: false },
];

const defaultPostColumns = [
  { id: "draft", label: "Draft", color: "bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800", hidden: false },
  { id: "internal_review", label: "Internal Review", color: "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/50 dark:border-indigo-900/30", hidden: false },
  { id: "client_review", label: "Client Review", color: "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-900/20", hidden: false },
  { id: "changes_requested", label: "Changes Requested", color: "bg-rose-50/50 dark:bg-rose-950/10 border-rose-200/50 dark:border-rose-900/20", hidden: false },
  { id: "approved", label: "Approved", color: "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-900/20", hidden: false },
  { id: "scheduled", label: "Scheduled", color: "bg-sky-50/50 dark:bg-sky-950/10 border-sky-200/50 dark:border-sky-900/20", hidden: false },
  { id: "published", label: "Published", color: "bg-teal-50/50 dark:bg-teal-950/10 border-teal-200/50 dark:border-teal-900/20", hidden: false },
];

// Available theme color styles for columns
const colorOptions = [
  { value: "bg-zinc-800/60 border-zinc-800", label: "Zinc Dark" },
  { value: "bg-indigo-950/20 border-indigo-900/30", label: "Indigo Accent" },
  { value: "bg-amber-950/10 border-amber-900/20", label: "Amber Review" },
  { value: "bg-rose-950/10 border-rose-900/20", label: "Rose Alert" },
  { value: "bg-emerald-950/10 border-emerald-900/20", label: "Emerald Success" },
  { value: "bg-sky-950/10 border-sky-900/20", label: "Sky Progress" },
  { value: "bg-teal-950/10 border-teal-900/20", label: "Teal Publish" },
  { value: "bg-purple-950/10 border-purple-900/20", label: "Purple Creative" },
];

export default function SettingsPage() {
  const params = useParams();
  const slug = params.workspaceSlug as string;

  // Convex Queries
  const workspace = useQuery(api.workspaces.getBySlug, { slug });
  const updateSettings = useMutation(api.workspaces.updateSettings);
  const devUpgradeToAgency = useMutation(api.workspaces.devUpgradeToAgency);

  // Stripe Actions
  const pay = useAction(api.stripe.pay);
  const portal = useAction(api.stripe.portal);

  // Developer Upgrade State & Handler
  const [loadingDevUpgrade, setLoadingDevUpgrade] = useState(false);
  const handleDevUpgrade = async () => {
    if (!workspace) return;
    setLoadingDevUpgrade(true);
    try {
      await devUpgradeToAgency({ workspaceId: workspace._id });
      toast.success("Successfully upgraded to Agency plan (Dev Mode)!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upgrade to Agency plan");
    } finally {
      setLoadingDevUpgrade(false);
    }
  };

  // Stripe Billing Handlers & State
  const [redirectingStripe, setRedirectingStripe] = useState<string | null>(null);

  const handleOpenPortal = async () => {
    if (!workspace) return;
    setRedirectingStripe("portal");
    try {
      const res = await portal({
        workspaceId: workspace._id,
        host: window.location.origin,
      });
      if (res?.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to open billing portal");
      setRedirectingStripe(null);
    }
  };

  const handleSubscribe = async (plan: "pro" | "agency") => {
    if (!workspace) return;
    setRedirectingStripe(plan);
    try {
      const res = await pay({
        workspaceId: workspace._id,
        plan,
        host: window.location.origin,
      });
      if (res?.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to start checkout session");
      setRedirectingStripe(null);
    }
  };

  // States
  const [activeTab, setActiveTab] = useState<"kanban" | "currency" | "billing">("kanban");
  const [currencyCode, setCurrencyCode] = useState<string>("PHP");
  const [taskCols, setTaskCols] = useState(defaultTaskColumns);
  const [postCols, setPostCols] = useState(defaultPostColumns);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Draggable Column Customization States & Handlers
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [draggedColType, setDraggedColType] = useState<"tasks" | "posts" | null>(null);

  const handleColDragStart = (type: "tasks" | "posts", id: string) => {
    setDraggedColId(id);
    setDraggedColType(type);
  };

  const handleColDragEnter = (type: "tasks" | "posts", targetId: string) => {
    if (draggedColType !== type || !draggedColId || draggedColId === targetId) return;

    const list = type === "tasks" ? [...taskCols] : [...postCols];
    const dragIndex = list.findIndex(c => c.id === draggedColId);
    const hoverIndex = list.findIndex(c => c.id === targetId);

    if (dragIndex !== -1 && hoverIndex !== -1) {
      const temp = list[dragIndex];
      list.splice(dragIndex, 1);
      list.splice(hoverIndex, 0, temp);
      
      if (type === "tasks") {
        setTaskCols(list);
      } else {
        setPostCols(list);
      }
    }
  };

  const handleColDragEnd = () => {
    setDraggedColId(null);
    setDraggedColType(null);
  };

  // Add Column Inputs
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskColor, setNewTaskColor] = useState("bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-800");

  const [newPostName, setNewPostName] = useState("");
  const [newPostColor, setNewPostColor] = useState("bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-800");

  // Populate local states when workspace settings load
  useEffect(() => {
    if (workspace?.settings) {
      if (workspace.settings.currency) {
        setCurrencyCode(workspace.settings.currency);
      }
      if (workspace.settings.taskColumns) {
        setTaskCols(workspace.settings.taskColumns);
      }
      if (workspace.settings.postColumns) {
        setPostCols(workspace.settings.postColumns);
      }
    }
  }, [workspace]);

  // Handlers for adding columns dynamically
  const handleAddTaskColumn = () => {
    if (!newTaskName.trim()) return;
    const newId = "task_" + newTaskName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_") + "_" + Math.random().toString(36).substring(2, 6);
    const newCol = {
      id: newId,
      label: newTaskName.trim(),
      color: newTaskColor,
      hidden: false,
    };
    setTaskCols([...taskCols, newCol]);
    setNewTaskName("");
    toast.success(`Added task column "${newCol.label}". Click 'Save Settings' to apply.`);
  };

  const handleAddPostColumn = () => {
    if (!newPostName.trim()) return;
    const newId = "post_" + newPostName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_") + "_" + Math.random().toString(36).substring(2, 6);
    const newCol = {
      id: newId,
      label: newPostName.trim(),
      color: newPostColor,
      hidden: false,
    };
    setPostCols([...postCols, newCol]);
    setNewPostName("");
    toast.success(`Added content column "${newCol.label}". Click 'Save Settings' to apply.`);
  };

  const handleDeleteColumn = (type: "tasks" | "posts", id: string) => {
    if (type === "tasks") {
      if (taskCols.length <= 1) {
        toast.error("You must keep at least one column active.");
        return;
      }
      const col = taskCols.find(c => c.id === id);
      if (confirm(`Are you sure you want to permanently delete this column status? Any tasks currently in this status won't be shown on the board unless moved.`)) {
        setTaskCols(taskCols.filter(col => col.id !== id));
        toast.info(`Deleted task column "${col?.label || id}". Click 'Save Settings' to apply.`);
      }
    } else {
      if (postCols.length <= 1) {
        toast.error("You must keep at least one column active.");
        return;
      }
      const col = postCols.find(c => c.id === id);
      if (confirm(`Are you sure you want to permanently delete this column status? Any posts currently in this status won't be shown on the board unless moved.`)) {
        setPostCols(postCols.filter(col => col.id !== id));
        toast.info(`Deleted content column "${col?.label || id}". Click 'Save Settings' to apply.`);
      }
    }
  };

  if (workspace === undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm font-medium">Loading workspace settings...</p>
      </div>
    );
  }

  if (!workspace) return null;

  const handleSave = async () => {
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    const matchedCurrency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || SUPPORTED_CURRENCIES[0];

    try {
      await updateSettings({
        workspaceId: workspace._id,
        settings: {
          currency: matchedCurrency.code,
          currencySymbol: matchedCurrency.symbol,
          taskColumns: taskCols,
          postColumns: postCols,
        },
      });
      setSuccessMsg("Workspace settings & currency preferences successfully saved!");
      toast.success("Workspace settings & currency preferences successfully saved!");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to update settings.");
      toast.error(err.message || "Failed to update settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm("Reset all Kanban board columns to factory default labels and styles?")) {
      setTaskCols(defaultTaskColumns);
      setPostCols(defaultPostColumns);
      toast.info("Columns reset to factory defaults. Click 'Save Settings' to apply.");
    }
  };

  // Modify specific column property
  const updateColProperty = (
    type: "tasks" | "posts",
    id: string,
    property: "label" | "color" | "hidden",
    value: any
  ) => {
    const list = type === "tasks" ? [...taskCols] : [...postCols];
    const index = list.findIndex((c) => c.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], [property]: value };
      if (type === "tasks") {
        setTaskCols(list);
      } else {
        setPostCols(list);
      }
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl text-left">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            {activeTab === "kanban" ? "Board Customization Settings" : "Billing & Subscription"}
          </h2>
          <p className="text-sm text-zinc-650 dark:text-zinc-400">
            {activeTab === "kanban" 
              ? "Personalize your workspace Kanban columns: rename labels, customize styling themes, or hide processes."
              : "Manage your subscription tiers, limits, and customer portal details."}
          </p>
        </div>
        
        {(activeTab === "kanban" || activeTab === "currency") && (
          <div className="flex items-center gap-2">
            {activeTab === "kanban" && (
              <Button 
                variant="ghost" 
                onClick={handleResetDefaults}
                className="text-zinc-650 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-250 text-xs border border-border"
              >
                <Undo2 className="h-4 w-4 mr-1.5" /> Defaults
              </Button>
            )}
            <Button 
              onClick={handleSave} 
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 text-xs font-semibold"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
              Save Settings
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-muted p-1 rounded-lg border border-border w-fit shrink-0">
        <button
          onClick={() => setActiveTab("kanban")}
          className={`px-4 py-2 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
            activeTab === "kanban"
              ? "bg-background text-foreground shadow-sm"
              : "text-zinc-550 dark:text-zinc-400 hover:text-foreground"
          }`}
        >
          <Columns className="h-3.5 w-3.5" /> Kanban Process Columns
        </button>
        <button
          onClick={() => setActiveTab("currency")}
          className={`px-4 py-2 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
            activeTab === "currency"
              ? "bg-background text-foreground shadow-sm"
              : "text-zinc-550 dark:text-zinc-400 hover:text-foreground"
          }`}
        >
          <Coins className="h-3.5 w-3.5" /> Currency & Regional
        </button>
        <button
          onClick={() => setActiveTab("billing")}
          className={`px-4 py-2 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
            activeTab === "billing"
              ? "bg-background text-foreground shadow-sm"
              : "text-zinc-550 dark:text-zinc-400 hover:text-foreground"
          }`}
        >
          <CreditCard className="h-3.5 w-3.5" /> Billing & Plans
        </button>
      </div>

      {/* Success/Error Alerts */}
      {successMsg && (
        <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-xs flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Settings Grid */}
      {activeTab === "kanban" ? (
        <div className="flex flex-col gap-8">
        
        {/* Warning Banner */}
        <div className="p-4 rounded-xl border border-amber-900/30 bg-amber-950/10 text-amber-300 text-xs flex gap-3 items-start">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-white font-sans text-left">Kanban Process Customization Notice</span>
            <span className="text-left">
              Hiding a column disables its board visibility. Deleting a column permanently removes it from your settings array. Ensure that you have relocated any active tasks or posts under a deleted status before removing it.
            </span>
          </div>
        </div>

        {/* 1. Tasks Board customization */}
        <div className="p-6 rounded-xl border border-border bg-card flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-bold uppercase text-zinc-800 dark:text-zinc-300 tracking-wider flex items-center gap-2">
              <Columns className="h-4 w-4 text-indigo-400" /> Tasks Kanban Columns
            </h3>
            <span className="text-[10px] text-zinc-500 font-medium font-mono">
              {taskCols.length} Columns configured ({taskCols.filter(c => !c.hidden).length} Active)
            </span>
          </div>
          
          <div className="flex flex-col gap-4">
            {/* Render Task Columns */}
            {taskCols.map((col) => (
              <div 
                key={col.id}
                draggable
                onDragStart={() => handleColDragStart("tasks", col.id)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => handleColDragEnter("tasks", col.id)}
                onDragEnd={handleColDragEnd}
                className={`flex flex-col md:grid md:grid-cols-5 gap-4 p-4 rounded-lg border items-center transition-all duration-200 cursor-grab active:cursor-grabbing relative pl-10 ${
                  draggedColId === col.id 
                    ? "border-dashed border-indigo-500 bg-indigo-500/5 dark:bg-indigo-950/5 scale-[0.98] opacity-40" 
                    : col.hidden 
                      ? "border-border bg-muted/40 opacity-60 hover:border-zinc-350 dark:hover:border-zinc-800" 
                      : "border-border bg-card hover:border-zinc-350 dark:hover:border-zinc-800"
                }`}
              >
                {/* Drag Handle Icon */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-600 cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-4 w-4" />
                </div>

                {/* ID Tag */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-550 uppercase font-bold tracking-wider">Database Status Key</span>
                  <span className="text-xs font-mono text-foreground font-semibold truncate max-w-[130px]" title={col.id}>{col.id}</span>
                </div>

                {/* Custom Label */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-550 uppercase">Display Name</label>
                  <input 
                    type="text"
                    value={col.label}
                    onChange={(e) => updateColProperty("tasks", col.id, "label", e.target.value)}
                    className="px-3 py-1.5 rounded bg-muted border border-border text-foreground text-xs focus:outline-none focus:border-indigo-650 w-full"
                    placeholder={col.id}
                  />
                </div>

                {/* Color Styling */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-555 uppercase">Color Theme</label>
                  <select 
                    value={col.color}
                    onChange={(e) => updateColProperty("tasks", col.id, "color", e.target.value)}
                    className="px-2.5 py-1.5 rounded bg-muted border border-border text-foreground text-xs focus:outline-none focus:border-indigo-650 w-full"
                  >
                    {colorOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Column Actions */}
                <div className="flex flex-row gap-2 justify-end md:items-end h-full pt-4 md:pt-0">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    title={col.hidden ? "Show column on board" : "Hide column from board"}
                    onClick={() => updateColProperty("tasks", col.id, "hidden", !col.hidden)}
                    className={`h-8 w-8 border ${
                      col.hidden 
                        ? "text-zinc-500 dark:text-zinc-400 border-border bg-muted/40 hover:text-foreground hover:bg-muted/80" 
                        : "text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-950/40 bg-indigo-500/5 hover:bg-indigo-500/10"
                    }`}
                  >
                    {col.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    title="Permanently delete column status"
                    onClick={() => handleDeleteColumn("tasks", col.id)}
                    className="h-8 w-8 border border-rose-250 dark:border-rose-950 bg-rose-500/5 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Create Custom Column Panel */}
            <div className="p-4 rounded-lg border border-dashed border-zinc-850 bg-zinc-900/5 flex flex-col md:grid md:grid-cols-5 gap-4 items-center mt-2">
              <div className="flex flex-col text-left w-full md:col-span-2">
                <span className="text-xs font-semibold text-zinc-300">Add Custom Task Column</span>
                <span className="text-[10px] text-zinc-500">Configure a brand new process status for tasks.</span>
              </div>
              <div className="w-full">
                <input 
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="e.g. Backlog, On Hold"
                  className="w-full px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div className="w-full">
                <select 
                  value={newTaskColor}
                  onChange={(e) => setNewTaskColor(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  {colorOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="w-full flex justify-end">
                <Button 
                  type="button"
                  onClick={handleAddTaskColumn}
                  disabled={!newTaskName.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow shadow-indigo-650/20"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Column
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Content Workflow Board customization */}
        <div className="p-6 rounded-xl border border-border bg-card flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-bold uppercase text-zinc-800 dark:text-zinc-300 tracking-wider flex items-center gap-2">
              <Palette className="h-4 w-4 text-indigo-400" /> Content Workflow Columns
            </h3>
            <span className="text-[10px] text-zinc-500 font-medium font-mono">
              {postCols.length} Columns configured ({postCols.filter(c => !c.hidden).length} Active)
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {/* Render Post Columns */}
            {postCols.map((col) => (
              <div 
                key={col.id}
                draggable
                onDragStart={() => handleColDragStart("posts", col.id)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => handleColDragEnter("posts", col.id)}
                onDragEnd={handleColDragEnd}
                className={`flex flex-col md:grid md:grid-cols-5 gap-4 p-4 rounded-lg border items-center transition-all duration-200 cursor-grab active:cursor-grabbing relative pl-10 ${
                  draggedColId === col.id 
                    ? "border-dashed border-indigo-500 bg-indigo-500/5 dark:bg-indigo-950/5 scale-[0.98] opacity-40" 
                    : col.hidden 
                      ? "border-border bg-muted/40 opacity-60 hover:border-zinc-350 dark:hover:border-zinc-800" 
                      : "border-border bg-card hover:border-zinc-350 dark:hover:border-zinc-800"
                }`}
              >
                {/* Drag Handle Icon */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-600 cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-4 w-4" />
                </div>

                {/* ID Tag */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-550 uppercase font-bold tracking-wider">Database Status Key</span>
                  <span className="text-xs font-mono text-foreground font-semibold truncate max-w-[130px]" title={col.id}>{col.id}</span>
                </div>

                {/* Custom Label */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-555 uppercase">Display Name</label>
                  <input 
                    type="text"
                    value={col.label}
                    onChange={(e) => updateColProperty("posts", col.id, "label", e.target.value)}
                    className="px-3 py-1.5 rounded bg-muted border border-border text-foreground text-xs focus:outline-none focus:border-indigo-650 w-full"
                    placeholder={col.id}
                  />
                </div>

                {/* Color Styling */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-555 uppercase">Color Theme</label>
                  <select 
                    value={col.color}
                    onChange={(e) => updateColProperty("posts", col.id, "color", e.target.value)}
                    className="px-2.5 py-1.5 rounded bg-muted border border-border text-foreground text-xs focus:outline-none focus:border-indigo-650 w-full"
                  >
                    {colorOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Column Actions */}
                <div className="flex flex-row gap-2 justify-end md:items-end h-full pt-4 md:pt-0">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    title={col.hidden ? "Show column on board" : "Hide column from board"}
                    onClick={() => updateColProperty("posts", col.id, "hidden", !col.hidden)}
                    className={`h-8 w-8 border ${
                      col.hidden 
                        ? "text-zinc-500 dark:text-zinc-400 border-border bg-muted/40 hover:text-foreground hover:bg-muted/80" 
                        : "text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-950/40 bg-indigo-500/5 hover:bg-indigo-500/10"
                    }`}
                  >
                    {col.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    title="Permanently delete column status"
                    onClick={() => handleDeleteColumn("posts", col.id)}
                    className="h-8 w-8 border border-rose-250 dark:border-rose-950 bg-rose-500/5 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Create Custom Column Panel */}
            <div className="p-4 rounded-lg border border-dashed border-border bg-muted/20 flex flex-col md:grid md:grid-cols-5 gap-4 items-center mt-2">
              <div className="flex flex-col text-left w-full md:col-span-2">
                <span className="text-xs font-semibold text-foreground">Add Custom Content Column</span>
                <span className="text-[10px] text-zinc-500">Configure a brand new process status for posts.</span>
              </div>
              <div className="w-full">
                <input 
                  type="text"
                  value={newPostName}
                  onChange={(e) => setNewPostName(e.target.value)}
                  placeholder="e.g. QA, Backlog, On Hold"
                  className="w-full px-3 py-1.5 rounded bg-muted border border-border text-foreground text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div className="w-full">
                <select 
                  value={newPostColor}
                  onChange={(e) => setNewPostColor(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-muted border border-border text-foreground text-xs focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  {colorOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="w-full flex justify-end">
                <Button 
                  type="button"
                  onClick={handleAddPostColumn}
                  disabled={!newPostName.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow shadow-indigo-650/20"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Column
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      ) : activeTab === "currency" ? (
        <div className="flex flex-col gap-6 w-full text-left">
          <div className="p-6 rounded-2xl border border-border bg-card flex flex-col gap-6 shadow-sm">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Coins className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-foreground">Workspace Currency & Financial Locale</h3>
                <p className="text-xs text-muted-foreground">
                  Select your primary agency currency. All lead deals, financial ledgers, and inventory asset valuations will be formatted with your chosen currency symbol.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Primary Workspace Currency</label>
                <select
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} — {c.label}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-muted-foreground mt-1">
                  Default currency for {workspace.name}. Changing this updates formatters across your dashboard and client ledgers.
                </span>
              </div>

              {/* Currency Preview Card */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/20 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-indigo-400 font-mono tracking-wider">Currency Preview</span>
                  <Globe className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-2xl font-extrabold text-foreground font-mono">
                    {SUPPORTED_CURRENCIES.find(c => c.code === currencyCode)?.symbol || "₱"}150,000.00
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    Active Code: {currencyCode}
                  </span>
                </div>
                <div className="pt-2 border-t border-indigo-500/10 flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                  >
                    {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                    Save Currency Preference
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 w-full">
          
          {/* Current Plan Overview Card */}
          <div className="p-6 rounded-2xl border border-border bg-gradient-to-br from-card to-indigo-50/10 dark:from-zinc-900/60 dark:to-indigo-950/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden group shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-all" />
            
            <div className="flex flex-col gap-2 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Current Workspace Plan</span>
              <div className="flex items-center gap-2.5">
                <span className="text-3xl font-extrabold tracking-tight text-foreground capitalize">{workspace.plan} Plan</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  workspace.plan === "free" 
                    ? "bg-muted text-zinc-500 border-border" 
                    : workspace.plan === "pro"
                    ? "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-500/25 animate-pulse"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                }`}>
                  {workspace.plan === "free" ? "Default Tier" : "Active Subscription"}
                </span>
              </div>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1 max-w-md">
                {workspace.plan === "free" && "Enjoy basic scheduling and management features. Upgrade to unlock agency workflows, client portals, and multi-channel ledger entries."}
                {workspace.plan === "pro" && "Your workspace is subscribed to the Pro plan. Manage your team, publish multiple posts, and track campaign investments."}
                {workspace.plan === "agency" && "Enterprise-grade workflow enabled. Enjoy unlimited social channels, custom client-facing portals, and priority performance metrics."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              {workspace.plan !== "agency" && (
                <Button 
                  onClick={handleDevUpgrade}
                  disabled={loadingDevUpgrade}
                  className="bg-[#00f5a0]/15 hover:bg-[#00f5a0]/25 border border-[#00d9f5]/35 text-teal-600 dark:text-[#05ffc4] text-xs font-semibold shadow-md shadow-[#05ffc4]/5"
                >
                  {loadingDevUpgrade ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1.5" />
                      Dev Upgrade
                    </>
                  )}
                </Button>
              )}

              {workspace.plan !== "free" && (
                <Button 
                  onClick={handleOpenPortal}
                  disabled={redirectingStripe !== null}
                  className="bg-muted hover:bg-muted/80 border border-border text-foreground text-xs font-semibold"
                >
                  {redirectingStripe === "portal" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-1.5" />
                      Manage Billing
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Free Card */}
            <div className={`p-6 rounded-2xl border ${workspace.plan === "free" ? "border-indigo-600 bg-indigo-50/10 dark:bg-indigo-950/5 relative shadow-indigo-950/20 shadow-lg" : "border-border bg-card"} flex flex-col justify-between gap-6`}>
              <div className="flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Starter / Free</span>
                  <span className="text-[10px] text-zinc-550 dark:text-zinc-500">Perfect for exploring the platform.</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-foreground">$0</span>
                  <span className="text-xs text-zinc-550 dark:text-zinc-500">/ forever</span>
                </div>
                <div className="border-t border-border my-1" />
                <ul className="flex flex-col gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>1 Active Client Portfolio</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>1 Connected Social Page</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>5 Scheduled Posts / month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Basic Media Uploads (100MB)</span>
                  </li>
                </ul>
              </div>
              
              <Button 
                variant="ghost"
                disabled={true}
                className="w-full text-zinc-500 bg-muted border border-border text-xs"
              >
                {workspace.plan === "free" ? "Current Tier" : "Starter Account"}
              </Button>
            </div>

            {/* Pro Card */}
            <div className={`p-6 rounded-2xl border ${workspace.plan === "pro" ? "border-indigo-600 bg-indigo-50/10 dark:bg-indigo-950/5 relative shadow-indigo-950/20 shadow-lg" : "border-border bg-card"} flex flex-col justify-between gap-6`}>
              <div className="flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-indigo-500 dark:text-indigo-400" /> Pro Creator
                  </span>
                  <span className="text-[10px] text-zinc-550 dark:text-zinc-500">Ideal for growing creators & professionals.</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-foreground">$29</span>
                  <span className="text-xs text-zinc-550 dark:text-zinc-500">/ month</span>
                </div>
                <div className="border-t border-border my-1" />
                <ul className="flex flex-col gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    <span className="font-semibold text-zinc-800 dark:text-zinc-300">Unlimited Clients</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-550 dark:text-indigo-400 shrink-0" />
                    <span>5 Connected Social Pages</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-550 dark:text-indigo-400 shrink-0" />
                    <span>Unlimited Scheduled Posts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-550 dark:text-indigo-400 shrink-0" />
                    <span>10 GB Media Library Storage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-550 dark:text-indigo-400 shrink-0" />
                    <span>Multi-Currency P&L Tracking</span>
                  </li>
                </ul>
              </div>
              
              <Button 
                onClick={() => handleSubscribe("pro")}
                disabled={workspace.plan === "pro" || redirectingStripe !== null}
                className={`w-full text-xs font-semibold ${
                  workspace.plan === "pro" 
                    ? "bg-muted border border-border text-zinc-500 cursor-not-allowed" 
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                }`}
              >
                {redirectingStripe === "pro" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : workspace.plan === "pro" ? (
                  "Current Subscription"
                ) : (
                  "Upgrade to Pro"
                )}
              </Button>
            </div>

            {/* Agency Card */}
            <div className={`p-6 rounded-2xl border ${workspace.plan === "agency" ? "border-indigo-600 bg-indigo-50/10 dark:bg-indigo-950/5 relative shadow-indigo-950/20 shadow-lg" : "border-border bg-card"} flex flex-col justify-between gap-6`}>
              <div className="flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Agency / Brand</span>
                  <span className="text-[10px] text-zinc-550 dark:text-zinc-500">For teams & marketing agencies.</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-foreground">$79</span>
                  <span className="text-xs text-zinc-555 dark:text-zinc-500">/ month</span>
                </div>
                <div className="border-t border-border my-1" />
                <ul className="flex flex-col gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    <span className="font-semibold text-zinc-800 dark:text-zinc-300">Unlimited Clients</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    <span className="font-semibold text-zinc-800 dark:text-zinc-300">Unlimited Social Channels</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-550 dark:text-indigo-400 shrink-0" />
                    <span>Unlimited Scheduled Posts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-550 dark:text-indigo-400 shrink-0" />
                    <span>100 GB Media Storage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-550 dark:text-indigo-400 shrink-0" />
                    <span>Client Share Links & Portals</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-550 dark:text-indigo-400 shrink-0" />
                    <span>Priority Support response</span>
                  </li>
                </ul>
              </div>
              
              <Button 
                onClick={() => handleSubscribe("agency")}
                disabled={workspace.plan === "agency" || redirectingStripe !== null}
                className={`w-full text-xs font-semibold ${
                  workspace.plan === "agency" 
                    ? "bg-muted border border-border text-zinc-500 cursor-not-allowed" 
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                }`}
              >
                {redirectingStripe === "agency" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : workspace.plan === "agency" ? (
                  "Current Subscription"
                ) : (
                  "Upgrade to Agency"
                )}
              </Button>
            </div>

          </div>

          {/* Secure Stripe Badge */}
          <div className="flex justify-center items-center gap-1.5 text-[10px] text-zinc-500 mt-4">
            <CreditCard className="h-3 w-3" />
            <span>Payments secured & managed by Stripe. Standard SaaS subscription terms apply.</span>
          </div>

        </div>
      )}

    </div>
  );
}
