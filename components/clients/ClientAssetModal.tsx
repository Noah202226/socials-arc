"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { 
  X, 
  Package, 
  Plus, 
  Trash2, 
  Edit2, 
  Loader2, 
  Check, 
  DollarSign, 
  HardDrive, 
  FileCode, 
  Boxes, 
  Layers,
  Server,
  Calendar,
  Activity,
  Cpu,
  AlertTriangle,
  Laptop,
  Monitor,
  Tag,
  UserCheck,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrencyCents } from "@/lib/currency";

interface ClientAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: Id<"workspaces">;
  clientId: Id<"clients">;
  clientName: string;
  currencyCode?: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  hardware: Laptop,
  digital_asset: FileCode,
  inventory_stock: Boxes,
  license_domain: Server,
  other: Layers,
};

const CATEGORY_LABELS: Record<string, string> = {
  hardware: "Hardware & PC Parts",
  digital_asset: "Digital Asset / Master File",
  inventory_stock: "Inventory Stock",
  license_domain: "Cloud VPS / License / Domain",
  other: "Other Asset",
};

const PROVIDER_PRESETS = ["Hetzner", "AWS", "DigitalOcean", "Cloudflare", "Namecheap", "Vultr", "Google Cloud"];
const BRAND_PRESETS = ["Apple", "NVIDIA", "ASUS", "AMD", "Dell", "Corsair", "Samsung", "Lenovo", "Sony", "Logitech"];

const HARDWARE_QUICK_PRESETS = [
  { label: "Laptop / MacBook", name: "MacBook Pro 16", brand: "Apple", specs: "M3 Max 64GB RAM 1TB SSD", icon: Laptop },
  { label: "Workstation Rig", name: "Production Workstation PC", brand: "Custom", specs: "Intel Core i9-14900K, 64GB DDR5, 2TB NVMe", icon: Cpu },
  { label: "GPU / Graphics Card", name: "GeForce RTX 4090", brand: "NVIDIA", specs: "24GB GDDR6X PCIe 4.0", icon: Cpu },
  { label: "Studio Monitor", name: "Studio Display 27 5K", brand: "Apple", specs: "5K Retina 5120x2880 Display", icon: Monitor },
  { label: "RAM / Memory", name: "Vengeance 64GB DDR5", brand: "Corsair", specs: "2x32GB 6000MHz CL30", icon: HardDrive },
  { label: "SSD / NVMe Storage", name: "990 PRO 4TB NVMe SSD", brand: "Samsung", specs: "PCIe Gen 4.0 M.2 Read 7450MB/s", icon: HardDrive },
];

export default function ClientAssetModal({
  isOpen,
  onClose,
  workspaceId,
  clientId,
  clientName,
  currencyCode = "PHP",
}: ClientAssetModalProps) {
  const assets = useQuery(api.clientAssets.listByClient, { clientId });
  const createAsset = useMutation(api.clientAssets.create);
  const updateAsset = useMutation(api.clientAssets.update);
  const removeAsset = useMutation(api.clientAssets.remove);

  // Tab Filtering
  const [activeTab, setActiveTab] = useState<"all" | "hardware" | "cloud" | "other">("all");

  // Form State
  const [editingId, setEditingId] = useState<Id<"clientAssets"> | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [category, setCategory] = useState<"hardware" | "digital_asset" | "inventory_stock" | "license_domain" | "other">("hardware");
  const [quantity, setQuantity] = useState("1");
  const [unitPriceInput, setUnitPriceInput] = useState("0.00");
  const [notes, setNotes] = useState("");

  // Hardware Specific Fields (Laptops, PC Parts, Workstations)
  const [serialNumber, setSerialNumber] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [condition, setCondition] = useState<"brand_new" | "excellent" | "good" | "fair" | "needs_repair">("brand_new");

  // Cloud & Recurring Subscription Fields
  const [provider, setProvider] = useState("");
  const [specsOrDetails, setSpecsOrDetails] = useState("");
  const [renewalDateStr, setRenewalDateStr] = useState("");
  const [recurringCostInput, setRecurringCostInput] = useState("");
  const [costInterval, setCostInterval] = useState<"monthly" | "yearly" | "one_time">("monthly");
  const [assetStatus, setAssetStatus] = useState<"active" | "maintenance" | "expired" | "archived">("active");

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{ id: Id<"clientAssets">; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetForm = () => {
    setName("");
    setCategory("hardware");
    setQuantity("1");
    setUnitPriceInput("0.00");
    setNotes("");
    setSerialNumber("");
    setAssignedTo("");
    setCondition("brand_new");
    setProvider("");
    setSpecsOrDetails("");
    setRenewalDateStr("");
    setRecurringCostInput("");
    setCostInterval("monthly");
    setAssetStatus("active");
    setEditingId(null);
    setIsAdding(false);
    setErrors({});
  };

  const handleStartEdit = (asset: any) => {
    setErrors({});
    setEditingId(asset._id);
    setName(asset.name);
    setCategory(asset.category);
    setQuantity(String(asset.quantity));
    setUnitPriceInput((asset.unitValue / 100).toFixed(2));
    setNotes(asset.notes || "");
    setSerialNumber(asset.serialNumber || "");
    setAssignedTo(asset.assignedTo || "");
    setCondition(asset.condition || "brand_new");
    setProvider(asset.provider || "");
    setSpecsOrDetails(asset.specsOrDetails || "");
    setRenewalDateStr(asset.renewalDate ? new Date(asset.renewalDate).toISOString().split("T")[0] : "");
    setRecurringCostInput(asset.recurringCost ? (asset.recurringCost / 100).toFixed(2) : "");
    setCostInterval(asset.costInterval || "monthly");
    setAssetStatus(asset.status || "active");
    setIsAdding(true);
  };

  const handleApplyHardwarePreset = (preset: typeof HARDWARE_QUICK_PRESETS[0]) => {
    setName(preset.name);
    setCategory("hardware");
    setProvider(preset.brand);
    setSpecsOrDetails(preset.specs);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = category === "hardware"
        ? "Please enter a hardware/device name"
        : "Please enter an asset or subscription name";
    }

    const trimmedQty = quantity.trim();
    if (!trimmedQty) {
      newErrors.quantity = "Quantity is required";
    } else {
      const qty = parseInt(trimmedQty, 10);
      if (isNaN(qty) || qty < 1) {
        newErrors.quantity = "Quantity must be at least 1";
      }
    }

    const trimmedPrice = unitPriceInput.trim();
    if (!trimmedPrice) {
      newErrors.unitPrice = "Unit valuation is required (enter 0.00 if non-monetary)";
    } else {
      const parsedPrice = parseFloat(trimmedPrice);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        newErrors.unitPrice = "Unit value must be a valid non-negative number";
      }
    }

    const trimmedProvider = provider.trim();
    if (category === "hardware" && !trimmedProvider) {
      newErrors.provider = "Brand / Manufacturer is required (e.g. Apple, NVIDIA, ASUS, Custom)";
    } else if (category === "license_domain" && !trimmedProvider) {
      newErrors.provider = "Provider / Cloud Host is required (e.g. Hetzner, AWS, Cloudflare)";
    }

    if (category === "license_domain" && recurringCostInput.trim() !== "") {
      const parsedRecurring = parseFloat(recurringCostInput.trim());
      if (isNaN(parsedRecurring) || parsedRecurring < 0) {
        newErrors.recurringCost = "Recurring cost must be a non-negative number";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorMessage = Object.values(newErrors)[0];
      toast.error(firstErrorMessage);
      return;
    }

    setErrors({});

    const qty = parseInt(trimmedQty, 10);
    const parsedPrice = parseFloat(trimmedPrice);
    const unitValCents = Math.round(parsedPrice * 100);

    const parsedRecurring = parseFloat(recurringCostInput.trim() || "0");
    const recurringCents = !isNaN(parsedRecurring) && parsedRecurring > 0 ? Math.round(parsedRecurring * 100) : undefined;

    const renewalTimestamp = renewalDateStr ? new Date(renewalDateStr).getTime() : undefined;

    setLoading(true);

    try {
      if (editingId) {
        await updateAsset({
          assetId: editingId,
          name: trimmedName,
          category,
          quantity: qty,
          unitValue: unitValCents,
          currency: currencyCode,
          notes: notes.trim() || undefined,
          serialNumber: serialNumber.trim() || undefined,
          assignedTo: assignedTo.trim() || undefined,
          condition: category === "hardware" ? condition : undefined,
          provider: trimmedProvider || undefined,
          specsOrDetails: specsOrDetails.trim() || undefined,
          renewalDate: renewalTimestamp,
          recurringCost: recurringCents,
          costInterval,
          status: assetStatus,
        });
        toast.success(`Updated "${trimmedName}" in client assets.`);
      } else {
        await createAsset({
          workspaceId,
          clientId,
          name: trimmedName,
          category,
          quantity: qty,
          unitValue: unitValCents,
          currency: currencyCode,
          notes: notes.trim() || undefined,
          serialNumber: serialNumber.trim() || undefined,
          assignedTo: assignedTo.trim() || undefined,
          condition: category === "hardware" ? condition : undefined,
          provider: trimmedProvider || undefined,
          specsOrDetails: specsOrDetails.trim() || undefined,
          renewalDate: renewalTimestamp,
          recurringCost: recurringCents,
          costInterval,
          status: assetStatus,
        });
        toast.success(`Added "${trimmedName}" to ${clientName}'s inventory.`);
      }
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save asset");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await removeAsset({ assetId: deleteTarget.id });
      toast.success(`Removed "${deleteTarget.name}" from client inventory.`);
      setDeleteTarget(null);
      if (editingId === deleteTarget.id) {
        resetForm();
      }
    } catch (err: any) {
      console.error("Failed to delete asset:", err);
      toast.error(err.message || "Failed to delete asset");
    } finally {
      setIsDeleting(false);
    }
  };

  const totalValuationCents = (assets || []).reduce((acc, curr) => acc + curr.totalValue, 0);

  const hardwareAssets = (assets || []).filter(a => a.category === "hardware");
  const hardwareValuationCents = hardwareAssets.reduce((acc, curr) => acc + curr.totalValue, 0);

  const cloudAssets = (assets || []).filter(a => a.category === "license_domain");
  const otherAssets = (assets || []).filter(a => a.category !== "hardware" && a.category !== "license_domain");

  // Total monthly recurring cost of assets (Hetzner VPS, domains, etc.)
  const totalMonthlyRecurringExpenseCents = (assets || []).reduce((acc, curr) => {
    if (!curr.recurringCost) return acc;
    if (curr.costInterval === "yearly") return acc + Math.round(curr.recurringCost / 12);
    return acc + curr.recurringCost;
  }, 0);

  const dailyBurnCents = Math.round(totalMonthlyRecurringExpenseCents / 30);

  // Filtered list by tab
  const displayedAssets = useMemo(() => {
    if (!assets) return [];
    if (activeTab === "hardware") return hardwareAssets;
    if (activeTab === "cloud") return cloudAssets;
    if (activeTab === "other") return otherAssets;
    return assets;
  }, [assets, activeTab, hardwareAssets, cloudAssets, otherAssets]);

  const calculatedTotalFormValue = useMemo(() => {
    const qty = parseInt(quantity, 10) || 1;
    const price = parseFloat(unitPriceInput || "0") || 0;
    return Math.round(qty * price * 100);
  }, [quantity, unitPriceInput]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Package className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-left">
              <h3 className="text-base font-bold text-foreground">
                Client Infrastructure & Hardware Inventory — {clientName}
              </h3>
              <p className="text-xs text-muted-foreground">
                Track laptops, PC parts, workstations, Hetzner/Cloud VPS subscriptions, and asset valuation.
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 4-Pillar Executive Valuation & Burn Banner */}
        <div className="px-6 py-3.5 bg-muted/40 border-b border-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase">Total Asset Valuation</span>
            <span className="font-mono font-black text-indigo-400 text-sm">
              {formatCurrencyCents(totalValuationCents, currencyCode)}
            </span>
            <span className="text-[9px] text-muted-foreground">Direct Added Value</span>
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase">Hardware & PC Parts</span>
            <span className="font-mono font-black text-emerald-400 text-sm">
              {formatCurrencyCents(hardwareValuationCents, currencyCode)}
            </span>
            <span className="text-[9px] text-muted-foreground">{hardwareAssets.length} Devices & Parts</span>
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase">Monthly Cloud Burn</span>
            <span className="font-mono font-black text-amber-400 text-sm">
              {formatCurrencyCents(totalMonthlyRecurringExpenseCents, currencyCode)}/mo
            </span>
            <span className="text-[9px] text-muted-foreground">Servers & Licenses</span>
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase">Daily Burn Pace</span>
            <span className="font-mono font-black text-rose-400 text-sm">
              {formatCurrencyCents(dailyBurnCents, currencyCode)}/day
            </span>
            <span className="text-[9px] text-muted-foreground">Hosting Run-Rate</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5">
          
          {/* Action Header & Tabs */}
          {!isAdding && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({assets?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("hardware")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === "hardware" ? "bg-card text-emerald-400 shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Laptop className="h-3 w-3" /> Hardware & PC ({hardwareAssets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("cloud")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === "cloud" ? "bg-card text-indigo-400 shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Server className="h-3 w-3" /> Cloud & VPS ({cloudAssets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("other")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "other" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Stock/Digital ({otherAssets.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => { resetForm(); setCategory("hardware"); setIsAdding(true); }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20"
                >
                  <Laptop className="h-3.5 w-3.5 mr-1" /> Add Laptop / PC Part
                </Button>
                <Button
                  type="button"
                  onClick={() => { resetForm(); setCategory("license_domain"); setIsAdding(true); }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20"
                >
                  <Server className="h-3.5 w-3.5 mr-1" /> Add Server / Cloud
                </Button>
              </div>
            </div>
          )}

          {/* Form */}
          {isAdding && (
            <form onSubmit={handleSubmit} className="p-5 rounded-2xl border border-border bg-card/50 backdrop-blur-xs flex flex-col gap-4 text-left shadow-lg">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                    category === "hardware" ? "bg-emerald-500/10 text-emerald-400" : "bg-indigo-500/10 text-indigo-400"
                  }`}>
                    {category === "hardware" ? <Laptop className="h-4 w-4" /> : <Server className="h-4 w-4" />}
                  </div>
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    {editingId ? "Edit Client Asset" : (category === "hardware" ? "Add Hardware, Laptop or PC Part" : "Add Server / Subscription")}
                  </span>
                </div>
                <button type="button" onClick={resetForm} className="text-xs text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
              </div>

              {/* Hardware Quick Template Chips (If Hardware selected) */}
              {category === "hardware" && !editingId && (
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-muted/40 border border-border">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-400" /> Quick Hardware & PC Templates
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    {HARDWARE_QUICK_PRESETS.map((preset) => {
                      const Icon = preset.icon;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleApplyHardwarePreset(preset)}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-background hover:bg-muted text-foreground border border-border flex items-center gap-1.5 transition-all shadow-xs"
                        >
                          <Icon className="h-3 w-3 text-emerald-400" />
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Name */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center justify-between">
                    <span>{category === "hardware" ? "Hardware / Laptop / PC Part Name *" : "Asset / Subscription Name *"}</span>
                    {errors.name && (
                      <span className="text-[10px] font-semibold text-rose-400 flex items-center gap-1 normal-case">
                        <AlertTriangle className="h-3 w-3 shrink-0" /> {errors.name}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                    }}
                    placeholder={category === "hardware" ? "e.g. MacBook Pro 16 M3 Max, NVIDIA RTX 4090 24GB, Studio Workstation Rig" : "e.g. Hetzner CPX21 Production Server, Primary Domain"}
                    className={`px-3.5 py-2 rounded-lg bg-background border text-foreground text-xs focus:outline-none transition-all ${
                      errors.name ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20" : "border-border focus:border-indigo-500"
                    }`}
                  />
                </div>

                {/* Category Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase text-muted-foreground">Asset Category</label>
                  <select
                    value={category}
                    onChange={(e: any) => {
                      setCategory(e.target.value);
                      setErrors({});
                    }}
                    className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="hardware">💻 Hardware, Laptops & PC Parts</option>
                    <option value="license_domain">☁️ Cloud VPS, License & Domain</option>
                    <option value="digital_asset">📄 Digital Asset / Master File</option>
                    <option value="inventory_stock">📦 Inventory Stock</option>
                    <option value="other">⚙️ Other Asset</option>
                  </select>
                </div>

                {/* Brand / Manufacturer or Cloud Provider */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center justify-between">
                    <span>
                      {category === "hardware" ? "Brand / Manufacturer *" : category === "license_domain" ? "Provider / Cloud Host *" : "Brand / Provider"}
                    </span>
                    {errors.provider && (
                      <span className="text-[10px] font-semibold text-rose-400 flex items-center gap-1 normal-case">
                        <AlertTriangle className="h-3 w-3 shrink-0" /> Required
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={provider}
                    onChange={(e) => {
                      setProvider(e.target.value);
                      if (errors.provider) setErrors((prev) => ({ ...prev, provider: "" }));
                    }}
                    placeholder={category === "hardware" ? "e.g. Apple, NVIDIA, ASUS, Corsair" : "e.g. Hetzner, AWS, Cloudflare"}
                    className={`px-3 py-2 rounded-lg bg-background border text-foreground text-xs focus:outline-none transition-all ${
                      errors.provider ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20" : "border-border focus:border-indigo-500"
                    }`}
                  />
                  {errors.provider && (
                    <span className="text-[10px] font-semibold text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0" /> {errors.provider}
                    </span>
                  )}
                  <div className="flex gap-1 flex-wrap pt-0.5">
                    {(category === "hardware" ? BRAND_PRESETS : PROVIDER_PRESETS).slice(0, 7).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setProvider(p);
                          if (errors.provider) setErrors((prev) => ({ ...prev, provider: "" }));
                        }}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specs / Details */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase text-muted-foreground">
                    {category === "hardware" ? "Technical Specs (CPU, RAM, GPU, Storage)" : "Server Specs / IP / License Key"}
                  </label>
                  <input
                    type="text"
                    value={specsOrDetails}
                    onChange={(e) => setSpecsOrDetails(e.target.value)}
                    placeholder={category === "hardware" ? "e.g. M3 Max 16-Core CPU, 40-Core GPU, 64GB RAM, 1TB SSD" : "e.g. CPX21 3 vCPU / 4GB RAM / 80GB NVMe - IP 168.119.x.x"}
                    className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* HARDWARE SPECIFIC: Serial # and Assigned User */}
                {category === "hardware" && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                        <Tag className="h-3 w-3 text-indigo-400" /> Serial Number / Asset Tag
                      </label>
                      <input
                        type="text"
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value)}
                        placeholder="e.g. SN: C02XG104... / ARC-PC-01"
                        className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                        <UserCheck className="h-3 w-3 text-emerald-400" /> Assigned Member / Location
                      </label>
                      <input
                        type="text"
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        placeholder="e.g. Lead Video Editor, Studio Desk #1, Storage"
                        className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold uppercase text-muted-foreground">Hardware Condition</label>
                      <select
                        value={condition}
                        onChange={(e: any) => setCondition(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-indigo-500"
                      >
                        <option value="brand_new">✨ Brand New (Sealed/In Box)</option>
                        <option value="excellent">💎 Excellent (Like New)</option>
                        <option value="good">👍 Good (Fully Operational)</option>
                        <option value="fair">⚠️ Fair (Cosmetic Wear)</option>
                        <option value="needs_repair">🛠️ Needs Repair / Service</option>
                      </select>
                    </div>
                  </>
                )}

                {/* CLOUD SPECIFIC: Renewal Date & Recurring Cost */}
                {category === "license_domain" && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center justify-between">
                        <span>Recurring Hosting Expense ({currencyCode})</span>
                        {errors.recurringCost && (
                          <span className="text-[10px] font-semibold text-rose-400 flex items-center gap-1 normal-case">
                            <AlertTriangle className="h-3 w-3 shrink-0" /> Invalid
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">
                          ₱
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={recurringCostInput}
                          onChange={(e) => {
                            setRecurringCostInput(e.target.value);
                            if (errors.recurringCost) setErrors((prev) => ({ ...prev, recurringCost: "" }));
                          }}
                          placeholder="e.g. 1400.00"
                          className={`w-full pl-8 pr-3 py-2 rounded-lg bg-background border text-foreground text-xs focus:outline-none font-mono transition-all ${
                            errors.recurringCost ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20" : "border-border focus:border-indigo-500"
                          }`}
                        />
                      </div>
                      {errors.recurringCost && (
                        <span className="text-[10px] font-semibold text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> {errors.recurringCost}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold uppercase text-muted-foreground">Billing Interval</label>
                      <select
                        value={costInterval}
                        onChange={(e: any) => setCostInterval(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-indigo-500"
                      >
                        <option value="monthly">Monthly Recurring</option>
                        <option value="yearly">Yearly Recurring (Prorated /12)</option>
                        <option value="one_time">One-time Expense</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold uppercase text-muted-foreground">Next Renewal / Expiration Date</label>
                      <input
                        type="date"
                        value={renewalDateStr}
                        onChange={(e) => setRenewalDateStr(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </>
                )}

                {/* Operational Status */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase text-muted-foreground">Operational Status</label>
                  <select
                    value={assetStatus}
                    onChange={(e: any) => setAssetStatus(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="active">Active In Use</option>
                    <option value="maintenance">Maintenance / Bench Testing</option>
                    <option value="expired">Decommissioned</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                {/* Quantity */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center justify-between">
                    <span>Quantity *</span>
                    {errors.quantity && (
                      <span className="text-[10px] font-semibold text-rose-400 flex items-center gap-1 normal-case">
                        <AlertTriangle className="h-3 w-3 shrink-0" /> {errors.quantity}
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => {
                      setQuantity(e.target.value);
                      if (errors.quantity) setErrors((prev) => ({ ...prev, quantity: "" }));
                    }}
                    className={`px-3 py-2 rounded-lg bg-background border text-foreground text-xs focus:outline-none transition-all ${
                      errors.quantity ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20" : "border-border focus:border-indigo-500"
                    }`}
                  />
                </div>

                {/* Asset Valuation (Adds direct value to Client) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-emerald-400" />
                      Asset Value per Unit ({currencyCode}) *
                    </span>
                    {errors.unitPrice && (
                      <span className="text-[10px] font-semibold text-rose-400 flex items-center gap-1 normal-case">
                        <AlertTriangle className="h-3 w-3 shrink-0" /> Invalid
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">
                      ₱
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={unitPriceInput}
                      onChange={(e) => {
                        setUnitPriceInput(e.target.value);
                        if (errors.unitPrice) setErrors((prev) => ({ ...prev, unitPrice: "" }));
                      }}
                      placeholder={category === "hardware" ? "e.g. 150000.00" : "0.00"}
                      className={`w-full pl-8 pr-3 py-2 rounded-lg bg-background border text-foreground text-xs focus:outline-none font-mono font-bold transition-all ${
                        errors.unitPrice ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20" : "border-border focus:border-emerald-500"
                      }`}
                    />
                  </div>
                  {errors.unitPrice && (
                    <span className="text-[10px] font-semibold text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0" /> {errors.unitPrice}
                    </span>
                  )}
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase text-muted-foreground">Notes & Instructions</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Warranty info, purchase invoice #, receipt reference, maintenance notes..."
                    className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>

              {/* Dynamic Added Valuation Callout */}
              {calculatedTotalFormValue > 0 && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="text-foreground">
                      <strong>Client Value Addition:</strong> This item adds value to {clientName}'s total asset worth.
                    </span>
                  </div>
                  <span className="font-mono font-black text-emerald-400 text-sm">
                    +{formatCurrencyCents(calculatedTotalFormValue, currencyCode)}
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="ghost" onClick={resetForm} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                  {editingId ? "Save Changes" : (category === "hardware" ? "Add to Client Inventory" : "Create Asset")}
                </Button>
              </div>
            </form>
          )}

          {/* Asset List */}
          {assets === undefined ? (
            <div className="py-12 flex flex-col items-center text-muted-foreground text-xs">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mb-2" />
              Loading client inventory & equipment...
            </div>
          ) : displayedAssets.length === 0 ? (
            <div className="py-12 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground text-xs text-center p-6 bg-muted/20">
              <Laptop className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="font-bold text-foreground text-sm">No items in this category</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Add laptops, PC parts, studio rigs, or Hetzner VPS servers to track inventory and enhance {clientName}'s asset valuation.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {displayedAssets.map((asset) => {
                const IconComponent = CATEGORY_ICONS[asset.category] || Layers;
                const isHardware = asset.category === "hardware";

                return (
                  <div
                    key={asset._id}
                    className="p-4 rounded-xl border border-border bg-card hover:border-indigo-500/30 transition-all flex items-start justify-between text-left gap-3 group"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                        isHardware 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                      }`}>
                        <IconComponent className="h-5 w-5" />
                      </div>

                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-foreground">{asset.name}</span>

                          {asset.provider && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                              {asset.provider}
                            </span>
                          )}

                          {asset.condition && (
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {asset.condition.replace("_", " ")}
                            </span>
                          )}

                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                            asset.status === "active" 
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                              : "bg-zinc-800 text-zinc-400 border-zinc-700"
                          }`}>
                            {asset.status || "active"}
                          </span>
                        </div>

                        {asset.specsOrDetails && (
                          <span className="text-[11px] font-mono text-muted-foreground line-clamp-1">
                            {asset.specsOrDetails}
                          </span>
                        )}

                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap pt-0.5">
                          <span className="bg-muted/80 px-2 py-0.5 rounded text-foreground font-mono">
                            Qty: {asset.quantity}
                          </span>

                          {asset.serialNumber && (
                            <span className="font-mono text-zinc-400 flex items-center gap-1">
                              <Tag className="h-3 w-3 text-indigo-400" />
                              {asset.serialNumber}
                            </span>
                          )}

                          {asset.assignedTo && (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <UserCheck className="h-3 w-3" />
                              {asset.assignedTo}
                            </span>
                          )}

                          {asset.renewalDate && (
                            <span className="text-indigo-400 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Renews {new Date(asset.renewalDate).toLocaleDateString()}
                            </span>
                          )}

                          {asset.notes && <span className="line-clamp-1 text-muted-foreground">• {asset.notes}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 shrink-0">
                      <div className="flex flex-col items-end">
                        {asset.totalValue > 0 ? (
                          <span className="text-xs font-mono font-black text-emerald-400">
                            +{formatCurrencyCents(asset.totalValue, currencyCode)}
                          </span>
                        ) : null}

                        {asset.recurringCost && asset.recurringCost > 0 ? (
                          <span className="text-xs font-mono font-bold text-amber-400">
                            {formatCurrencyCents(asset.recurringCost, currencyCode)}/{asset.costInterval === "yearly" ? "yr" : "mo"}
                          </span>
                        ) : null}

                        <span className="text-[9px] text-muted-foreground font-mono">
                          {isHardware ? "Added Client Worth" : "Asset Valuation"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(asset)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title={`Edit ${asset.name}`}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ id: asset._id, name: asset.name });
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors"
                          title={`Delete ${asset.name}`}
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

        {/* Delete Confirmation Modal Overlay */}
        {deleteTarget && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-4 text-left animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <h4 className="text-sm font-bold text-foreground">
                    Delete Inventory / Asset?
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    This action cannot be undone.
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-foreground">"{deleteTarget.name}"</strong>? This will remove its valuation from {clientName}'s total asset inventory and balance.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isDeleting}
                  onClick={() => setDeleteTarget(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Asset
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
