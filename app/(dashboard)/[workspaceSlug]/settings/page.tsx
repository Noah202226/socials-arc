"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
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
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

// Default column configurations
const defaultTaskColumns = [
  { id: "todo", label: "To Do", color: "bg-zinc-800/60 border-zinc-800", hidden: false },
  { id: "in_progress", label: "In Progress", color: "bg-indigo-950/20 border-indigo-900/30", hidden: false },
  { id: "done", label: "Completed", color: "bg-emerald-950/10 border-emerald-900/20", hidden: false },
];

const defaultPostColumns = [
  { id: "draft", label: "Draft", color: "bg-zinc-900/60 border-zinc-800", hidden: false },
  { id: "internal_review", label: "Internal Review", color: "bg-indigo-950/20 border-indigo-900/30", hidden: false },
  { id: "client_review", label: "Client Review", color: "bg-amber-950/10 border-amber-900/20", hidden: false },
  { id: "changes_requested", label: "Changes Requested", color: "bg-rose-950/10 border-rose-900/20", hidden: false },
  { id: "approved", label: "Approved", color: "bg-emerald-950/10 border-emerald-900/20", hidden: false },
  { id: "scheduled", label: "Scheduled", color: "bg-sky-950/10 border-sky-900/20", hidden: false },
  { id: "published", label: "Published", color: "bg-teal-950/10 border-teal-900/20", hidden: false },
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

  // States
  const [taskCols, setTaskCols] = useState(defaultTaskColumns);
  const [postCols, setPostCols] = useState(defaultPostColumns);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Add Column Inputs
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskColor, setNewTaskColor] = useState("bg-zinc-800/60 border-zinc-800");

  const [newPostName, setNewPostName] = useState("");
  const [newPostColor, setNewPostColor] = useState("bg-zinc-800/60 border-zinc-800");

  // Populate local states when workspace settings load
  useEffect(() => {
    if (workspace?.settings) {
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
    try {
      await updateSettings({
        workspaceId: workspace._id,
        settings: {
          taskColumns: taskCols,
          postColumns: postCols,
        },
      });
      setSuccessMsg("Kanban process configurations successfully saved!");
      toast.success("Kanban process configurations successfully saved!");
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
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-900 pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-white tracking-tight">Board Customization Settings</h2>
          <p className="text-sm text-zinc-400">
            Personalize your workspace Kanban columns: rename labels, customize styling themes, or hide processes.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            onClick={handleResetDefaults}
            className="text-zinc-550 hover:text-zinc-300 text-xs border border-zinc-900"
          >
            <Undo2 className="h-4 w-4 mr-1.5" /> Defaults
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 text-xs font-semibold"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
            Save Settings
          </Button>
        </div>
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
        <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-900/10 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <h3 className="text-sm font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-2">
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
                className={`grid grid-cols-1 md:grid-cols-5 gap-4 p-4 rounded-lg border items-center ${col.hidden ? "border-zinc-950 bg-zinc-950/20 opacity-60" : "border-zinc-900 bg-zinc-950/50"}`}
              >
                {/* ID Tag */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-550 uppercase font-bold tracking-wider">Database Status Key</span>
                  <span className="text-xs font-mono text-zinc-300 font-semibold truncate max-w-[130px]" title={col.id}>{col.id}</span>
                </div>

                {/* Custom Label */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-550 uppercase">Display Name</label>
                  <input 
                    type="text"
                    value={col.label}
                    onChange={(e) => updateColProperty("tasks", col.id, "label", e.target.value)}
                    className="px-3 py-1.5 rounded bg-zinc-900/30 border border-zinc-850 text-zinc-200 text-xs focus:outline-none focus:border-indigo-650 w-full"
                    placeholder={col.id}
                  />
                </div>

                {/* Color Styling */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-550 uppercase">Color Theme</label>
                  <select 
                    value={col.color}
                    onChange={(e) => updateColProperty("tasks", col.id, "color", e.target.value)}
                    className="px-2.5 py-1.5 rounded bg-zinc-900/30 border border-zinc-850 text-zinc-300 text-xs focus:outline-none focus:border-indigo-650 w-full"
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
                        ? "text-zinc-550 border-zinc-800 bg-zinc-900/10 hover:text-zinc-300 hover:bg-zinc-900/30" 
                        : "text-indigo-400 border-indigo-950 bg-indigo-500/5 hover:bg-indigo-500/10"
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
                    className="h-8 w-8 border border-rose-950 bg-rose-500/5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
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
        <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-900/10 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <h3 className="text-sm font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-2">
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
                className={`grid grid-cols-1 md:grid-cols-5 gap-4 p-4 rounded-lg border items-center ${col.hidden ? "border-zinc-950 bg-zinc-950/20 opacity-60" : "border-zinc-900 bg-zinc-950/50"}`}
              >
                {/* ID Tag */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-550 uppercase font-bold tracking-wider">Database Status Key</span>
                  <span className="text-xs font-mono text-zinc-300 font-semibold truncate max-w-[130px]" title={col.id}>{col.id}</span>
                </div>

                {/* Custom Label */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-550 uppercase">Display Name</label>
                  <input 
                    type="text"
                    value={col.label}
                    onChange={(e) => updateColProperty("posts", col.id, "label", e.target.value)}
                    className="px-3 py-1.5 rounded bg-zinc-900/30 border border-zinc-850 text-zinc-200 text-xs focus:outline-none focus:border-indigo-650 w-full"
                    placeholder={col.id}
                  />
                </div>

                {/* Color Styling */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-550 uppercase">Color Theme</label>
                  <select 
                    value={col.color}
                    onChange={(e) => updateColProperty("posts", col.id, "color", e.target.value)}
                    className="px-2.5 py-1.5 rounded bg-zinc-900/30 border border-zinc-850 text-zinc-300 text-xs focus:outline-none focus:border-indigo-650 w-full"
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
                        ? "text-zinc-555 border-zinc-800 bg-zinc-900/10 hover:text-zinc-300 hover:bg-zinc-900/30" 
                        : "text-indigo-400 border-indigo-950 bg-indigo-500/5 hover:bg-indigo-500/10"
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
                    className="h-8 w-8 border border-rose-950 bg-rose-500/5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Create Custom Column Panel */}
            <div className="p-4 rounded-lg border border-dashed border-zinc-850 bg-zinc-900/5 flex flex-col md:grid md:grid-cols-5 gap-4 items-center mt-2">
              <div className="flex flex-col text-left w-full md:col-span-2">
                <span className="text-xs font-semibold text-zinc-300">Add Custom Content Column</span>
                <span className="text-[10px] text-zinc-500">Configure a brand new process status for posts.</span>
              </div>
              <div className="w-full">
                <input 
                  type="text"
                  value={newPostName}
                  onChange={(e) => setNewPostName(e.target.value)}
                  placeholder="e.g. QA, Backlog, On Hold"
                  className="w-full px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div className="w-full">
                <select 
                  value={newPostColor}
                  onChange={(e) => setNewPostColor(e.target.value)}
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

    </div>
  );
}
