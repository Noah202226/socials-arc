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
  CreditCard,
  ShoppingCart,
  Wrench,
  Clock,
  ArrowRight,
  ShieldAlert,
  CalendarClock
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
const BRAND_PRESETS = ["Apple", "NVIDIA", "ASUS", "AMD", "Dell", "Corsair", "Samsung", "G.Skill", "NZXT", "MSI"];

const BNPL_PROVIDER_PRESETS = [
  "Shopee SPayLater",
  "Lazada LazPayLater",
  "Billease",
  "Maya PayLater",
  "Credit Card Installment",
  "Other",
];

const PC_PART_TYPES = [
  { value: "gpu", label: "🎮 GPU / Graphics Card" },
  { value: "cpu", label: "⚡ CPU / Processor" },
  { value: "motherboard", label: "🖲️ Motherboard" },
  { value: "ram", label: "💾 RAM / Memory" },
  { value: "storage", label: "💿 SSD / NVMe Storage" },
  { value: "psu", label: "🔌 Power Supply (PSU)" },
  { value: "case", label: "🖥️ PC Case / Chassis" },
  { value: "cooling", label: "❄️ Liquid / Air Cooler" },
  { value: "peripheral", label: "⌨️ Keyboard / Mouse / Display" },
  { value: "complete_pc", label: "🏆 Complete Custom PC Rig" },
  { value: "other", label: "⚙️ General Hardware / Other" },
];

const PC_PARTS_PRESETS = [
  { label: "NVIDIA RTX 4070 Super", name: "GeForce RTX 4070 Super 12GB Dual", brand: "NVIDIA", partType: "gpu", specs: "12GB GDDR6X 192-bit DLSS 3.5", icon: Cpu, defaultPrice: "37500.00" },
  { label: "AMD Ryzen 7 7800X3D", name: "AMD Ryzen 7 7800X3D Processor", brand: "AMD", partType: "cpu", specs: "8-Core, 16-Thread 5.0GHz 96MB Cache", icon: Cpu, defaultPrice: "24500.00" },
  { label: "B650 Gaming Motherboard", name: "ROG STRIX B650-A GAMING WIFI", brand: "ASUS", partType: "motherboard", specs: "AM5 ATX, DDR5, PCIe 5.0, WiFi 6E", icon: Layers, defaultPrice: "14500.00" },
  { label: "32GB DDR5 6000MHz RAM", name: "Trident Z5 RGB 32GB (2x16GB) DDR5", brand: "G.Skill", partType: "ram", specs: "DDR5-6000 CL30-38-38-96 1.35V", icon: HardDrive, defaultPrice: "7200.00" },
  { label: "2TB NVMe Gen4 SSD", name: "Samsung 990 PRO 2TB PCIe 4.0 M.2", brand: "Samsung", partType: "storage", specs: "Read up to 7450MB/s, Write 6900MB/s", icon: HardDrive, defaultPrice: "9800.00" },
  { label: "850W Gold Modular PSU", name: "Corsair RM850x 850W 80+ Gold", brand: "Corsair", partType: "psu", specs: "Fully Modular ATX Power Supply", icon: Activity, defaultPrice: "7900.00" },
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
  const projects = useQuery(api.projects.listByClient, { clientId });
  
  const createAsset = useMutation(api.clientAssets.create);
  const updateAsset = useMutation(api.clientAssets.update);
  const removeAsset = useMutation(api.clientAssets.remove);
  const recordBnplPayment = useMutation(api.clientAssets.recordBnplPayment);

  // Tab Filtering
  const [activeTab, setActiveTab] = useState<"all" | "hardware" | "bnpl" | "cloud" | "other">("all");

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

  // PC Components & Custom Build Allocation
  const [partType, setPartType] = useState<string>("gpu");
  const [buildStatus, setBuildStatus] = useState<"in_stock" | "reserved" | "installed_in_pc" | "sold">("in_stock");
  const [targetProjectId, setTargetProjectId] = useState<string>("");

  // Payment & BNPL Financing Fields
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bnpl" | "credit_card" | "other">("cash");
  const [bnplProvider, setBnplProvider] = useState("Shopee SPayLater");
  const [bnplOrderNumber, setBnplOrderNumber] = useState("");
  const [bnplMonthlyInstallmentInput, setBnplMonthlyInstallmentInput] = useState("");
  const [bnplTotalInstallments, setBnplTotalInstallments] = useState("6");
  const [bnplInstallmentsPaid, setBnplInstallmentsPaid] = useState("0");
  const [bnplDueDay, setBnplDueDay] = useState("15");
  const [bnplNextDueDateStr, setBnplNextDueDateStr] = useState("");
  const [bnplStatus, setBnplStatus] = useState<"active" | "fully_paid">("active");

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

  // Quick Pay Modal State
  const [payTarget, setPayTarget] = useState<any | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  const resetForm = () => {
    setName("");
    setCategory("hardware");
    setQuantity("1");
    setUnitPriceInput("0.00");
    setNotes("");
    setSerialNumber("");
    setAssignedTo("");
    setCondition("brand_new");
    setPartType("gpu");
    setBuildStatus("in_stock");
    setTargetProjectId("");
    setPaymentMethod("cash");
    setBnplProvider("Shopee SPayLater");
    setBnplOrderNumber("");
    setBnplMonthlyInstallmentInput("");
    setBnplTotalInstallments("6");
    setBnplInstallmentsPaid("0");
    setBnplDueDay("15");
    setBnplNextDueDateStr("");
    setBnplStatus("active");
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
    setPartType(asset.partType || "gpu");
    setBuildStatus(asset.buildStatus || "in_stock");
    setTargetProjectId(asset.targetProjectId || "");
    setPaymentMethod(asset.paymentMethod || "cash");
    setBnplProvider(asset.bnplProvider || "Shopee SPayLater");
    setBnplOrderNumber(asset.bnplOrderNumber || "");
    setBnplMonthlyInstallmentInput(asset.bnplMonthlyInstallment ? (asset.bnplMonthlyInstallment / 100).toFixed(2) : "");
    setBnplTotalInstallments(String(asset.bnplTotalInstallments || 6));
    setBnplInstallmentsPaid(String(asset.bnplInstallmentsPaid || 0));
    setBnplDueDay(String(asset.bnplDueDay || 15));
    setBnplNextDueDateStr(asset.bnplNextDueDate ? new Date(asset.bnplNextDueDate).toISOString().split("T")[0] : "");
    setBnplStatus(asset.bnplStatus || "active");
    setProvider(asset.provider || "");
    setSpecsOrDetails(asset.specsOrDetails || "");
    setRenewalDateStr(asset.renewalDate ? new Date(asset.renewalDate).toISOString().split("T")[0] : "");
    setRecurringCostInput(asset.recurringCost ? (asset.recurringCost / 100).toFixed(2) : "");
    setCostInterval(asset.costInterval || "monthly");
    setAssetStatus(asset.status || "active");
    setIsAdding(true);
  };

  const handleApplyHardwarePreset = (preset: typeof PC_PARTS_PRESETS[0]) => {
    setName(preset.name);
    setCategory("hardware");
    setProvider(preset.brand);
    setSpecsOrDetails(preset.specs);
    setPartType(preset.partType);
    if (preset.defaultPrice) {
      setUnitPriceInput(preset.defaultPrice);
      if (paymentMethod === "bnpl") {
        const months = parseInt(bnplTotalInstallments || "6", 10);
        const monthly = (parseFloat(preset.defaultPrice) / Math.max(1, months)).toFixed(2);
        setBnplMonthlyInstallmentInput(monthly);
      }
    }
    setErrors({});
  };

  const handleAutoCalculateMonthly = () => {
    const unitPrice = parseFloat(unitPriceInput.trim() || "0");
    const qty = parseInt(quantity.trim() || "1", 10);
    const months = parseInt(bnplTotalInstallments || "6", 10);
    if (unitPrice > 0 && months > 0) {
      const total = unitPrice * Math.max(1, qty);
      const estMonthly = (total / months).toFixed(2);
      setBnplMonthlyInstallmentInput(estMonthly);
      toast.info(`Estimated ₱${estMonthly}/mo across ${months} installments.`);
    }
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
      newErrors.provider = "Brand / Manufacturer is required (e.g. NVIDIA, AMD, ASUS, Custom)";
    } else if (category === "license_domain" && !trimmedProvider) {
      newErrors.provider = "Provider / Cloud Host is required (e.g. Hetzner, AWS, Cloudflare)";
    }

    if (paymentMethod === "bnpl") {
      const monthlyVal = parseFloat(bnplMonthlyInstallmentInput.trim() || "0");
      if (isNaN(monthlyVal) || monthlyVal <= 0) {
        newErrors.bnplMonthly = "Please enter the monthly installment amount (e.g. ₱3,500/mo)";
      }
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
    const totalValCents = qty * unitValCents;

    const parsedRecurring = parseFloat(recurringCostInput.trim() || "0");
    const recurringCents = !isNaN(parsedRecurring) && parsedRecurring > 0 ? Math.round(parsedRecurring * 100) : undefined;
    const renewalTimestamp = renewalDateStr ? new Date(renewalDateStr).getTime() : undefined;

    // BNPL Values
    const isBnpl = paymentMethod === "bnpl";
    const monthlyCents = isBnpl ? Math.round(parseFloat(bnplMonthlyInstallmentInput.trim() || "0") * 100) : undefined;
    const totalInstallments = isBnpl ? parseInt(bnplTotalInstallments || "6", 10) : undefined;
    const installmentsPaid = isBnpl ? parseInt(bnplInstallmentsPaid || "0", 10) : undefined;
    const dueDay = isBnpl ? parseInt(bnplDueDay || "15", 10) : undefined;
    const nextDueDate = isBnpl && bnplNextDueDateStr ? new Date(bnplNextDueDateStr).getTime() : undefined;

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
          // BNPL & Hardware
          paymentMethod,
          bnplProvider: isBnpl ? (bnplProvider.trim() || "Shopee SPayLater") : undefined,
          bnplOrderNumber: isBnpl ? (bnplOrderNumber.trim() || undefined) : undefined,
          bnplTotalFinanced: isBnpl ? totalValCents : undefined,
          bnplMonthlyInstallment: monthlyCents,
          bnplTotalInstallments: totalInstallments,
          bnplInstallmentsPaid: installmentsPaid,
          bnplDueDay: dueDay,
          bnplNextDueDate: nextDueDate,
          bnplStatus: isBnpl ? (installmentsPaid !== undefined && totalInstallments !== undefined && installmentsPaid >= totalInstallments ? "fully_paid" : "active") : undefined,
          partType: category === "hardware" ? (partType as any) : undefined,
          buildStatus: category === "hardware" ? (buildStatus as any) : undefined,
          targetProjectId: targetProjectId ? (targetProjectId as Id<"projects">) : undefined,
        });
        toast.success(`Updated "${trimmedName}" in client inventory.`);
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
          // BNPL & Hardware
          paymentMethod,
          bnplProvider: isBnpl ? (bnplProvider.trim() || "Shopee SPayLater") : undefined,
          bnplOrderNumber: isBnpl ? (bnplOrderNumber.trim() || undefined) : undefined,
          bnplTotalFinanced: isBnpl ? totalValCents : undefined,
          bnplMonthlyInstallment: monthlyCents,
          bnplTotalInstallments: totalInstallments,
          bnplInstallmentsPaid: installmentsPaid,
          bnplDueDay: dueDay,
          bnplNextDueDate: nextDueDate,
          bnplStatus: isBnpl ? (installmentsPaid !== undefined && totalInstallments !== undefined && installmentsPaid >= totalInstallments ? "fully_paid" : "active") : undefined,
          partType: category === "hardware" ? (partType as any) : undefined,
          buildStatus: category === "hardware" ? (buildStatus as any) : undefined,
          targetProjectId: targetProjectId ? (targetProjectId as Id<"projects">) : undefined,
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

  const handleRecordPayment = async () => {
    if (!payTarget) return;
    setIsPaying(true);
    try {
      const res = await recordBnplPayment({
        assetId: payTarget._id,
        autoCreateExpense: true,
      });
      toast.success(
        res.isFullyPaid
          ? `Installment #${res.newInstallmentsPaid} recorded! This item is now fully paid.`
          : `Recorded installment payment #${res.newInstallmentsPaid} of ${payTarget.bnplTotalInstallments}. Logged to finance ledger.`
      );
      setPayTarget(null);
    } catch (err: any) {
      console.error("Failed to record installment:", err);
      toast.error(err.message || "Failed to record payment");
    } finally {
      setIsPaying(false);
    }
  };

  // Calculations for Rollups
  const { totalValuation, totalHardwareVal, totalCloudCost, totalBnplDebt, totalMonthlyBnpl, bnplItemCount } = useMemo(() => {
    if (!assets) return { totalValuation: 0, totalHardwareVal: 0, totalCloudCost: 0, totalBnplDebt: 0, totalMonthlyBnpl: 0, bnplItemCount: 0 };
    let val = 0;
    let hw = 0;
    let cloud = 0;
    let bnplDebt = 0;
    let monthlyBnpl = 0;
    let bnplCount = 0;

    assets.forEach((a) => {
      val += a.totalValue;
      if (a.category === "hardware") hw += a.totalValue;
      if (a.recurringCost) {
        cloud += a.costInterval === "yearly" ? Math.round(a.recurringCost / 12) : a.recurringCost;
      }
      if (a.paymentMethod === "bnpl") {
        bnplCount += 1;
        const financed = a.bnplTotalFinanced || a.totalValue;
        const paid = ((a.bnplInstallmentsPaid || 0) * (a.bnplMonthlyInstallment || 0)) + (a.bnplDownpayment || 0);
        const remaining = Math.max(0, financed - paid);
        bnplDebt += remaining;
        if (a.bnplStatus !== "fully_paid" && remaining > 0 && a.bnplMonthlyInstallment) {
          monthlyBnpl += a.bnplMonthlyInstallment;
        }
      }
    });

    return { 
      totalValuation: val, 
      totalHardwareVal: hw, 
      totalCloudCost: cloud,
      totalBnplDebt: bnplDebt,
      totalMonthlyBnpl: monthlyBnpl,
      bnplItemCount: bnplCount,
    };
  }, [assets]);

  // Tab Filtering
  const displayedAssets = useMemo(() => {
    if (!assets) return [];
    if (activeTab === "all") return assets;
    if (activeTab === "hardware") return assets.filter((a) => a.category === "hardware");
    if (activeTab === "bnpl") return assets.filter((a) => a.paymentMethod === "bnpl");
    if (activeTab === "cloud") return assets.filter((a) => a.category === "license_domain" || a.provider);
    return assets.filter((a) => a.category !== "hardware" && a.category !== "license_domain");
  }, [assets, activeTab]);

  const calculatedTotalFormValue = useMemo(() => {
    const qty = parseInt(quantity.trim() || "0", 10);
    const price = parseFloat(unitPriceInput.trim() || "0");
    if (isNaN(qty) || isNaN(price) || qty < 1 || price <= 0) return 0;
    return Math.round(qty * price * 100);
  }, [quantity, unitPriceInput]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                {clientName} — Equipment, Parts & Inventories
              </h3>
              <p className="text-xs text-muted-foreground">
                Manage physical PC builds, parts, Shopee/Lazada BNPL installments, and cloud servers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Stats Overview Bar */}
        <div className="px-5 py-3.5 bg-card/60 border-b border-border grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Inventory Assets</span>
            <span className="text-base font-extrabold font-mono text-emerald-400">
              +{formatCurrencyCents(totalValuation, currencyCode)}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <ShoppingCart className="h-3 w-3 text-amber-400" /> Outstanding BNPL Debt
            </span>
            <span className="text-base font-extrabold font-mono text-amber-400">
              {formatCurrencyCents(totalBnplDebt, currencyCode)}
            </span>
            <span className="text-[9px] text-muted-foreground font-mono">
              Monthly Outflow: {formatCurrencyCents(totalMonthlyBnpl, currencyCode)}/mo
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hardware & PC Parts</span>
            <span className="text-base font-extrabold font-mono text-foreground">
              {formatCurrencyCents(totalHardwareVal, currencyCode)}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cloud Server Burn</span>
            <span className="text-base font-extrabold font-mono text-indigo-400">
              {formatCurrencyCents(totalCloudCost, currencyCode)}/mo
            </span>
          </div>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          
          {/* Action Row & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeTab === "all" ? "bg-indigo-600 text-white shadow-xs" : "bg-muted/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({assets?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("hardware")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                  activeTab === "hardware" ? "bg-indigo-600 text-white shadow-xs" : "bg-muted/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Cpu className="h-3.5 w-3.5" /> Hardware & Parts
              </button>
              <button
                onClick={() => setActiveTab("bnpl")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                  activeTab === "bnpl" ? "bg-amber-600 text-white shadow-xs" : "bg-muted/60 text-amber-400/90 hover:text-amber-300"
                }`}
              >
                <ShoppingCart className="h-3.5 w-3.5" /> BNPL Financed ({bnplItemCount})
              </button>
              <button
                onClick={() => setActiveTab("cloud")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                  activeTab === "cloud" ? "bg-indigo-600 text-white shadow-xs" : "bg-muted/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Server className="h-3.5 w-3.5" /> Cloud & Servers
              </button>
            </div>

            {!isAdding && (
              <Button
                onClick={() => setIsAdding(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Component / Asset
              </Button>
            )}
          </div>

          {/* Inline Asset & BNPL Form */}
          {isAdding && (
            <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-indigo-500/30 bg-card flex flex-col gap-4 shadow-sm animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    {editingId ? "Edit Component / Asset Details" : "Log New Equipment, PC Part or Cloud Server"}
                  </span>
                </div>
                <button type="button" onClick={resetForm} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Quick PC Hardware Presets */}
              {!editingId && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-400" /> Quick PC Part Presets
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    {PC_PARTS_PRESETS.map((preset) => {
                      const Icon = preset.icon;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleApplyHardwarePreset(preset)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-muted/60 hover:bg-indigo-600 hover:text-white border border-border flex items-center gap-1.5 transition-colors"
                        >
                          <Icon className="h-3 w-3 shrink-0" />
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Main Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Name */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center justify-between">
                    <span>Component / Asset Name *</span>
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
                    placeholder="e.g. NVIDIA GeForce RTX 4070 Super 12GB Dual, AMD Ryzen 7 7800X3D"
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
                    <option value="hardware">💻 Hardware & PC Parts</option>
                    <option value="inventory_stock">📦 Inventory Stock / Merch</option>
                    <option value="license_domain">☁️ Cloud VPS, Server & Domain</option>
                    <option value="digital_asset">📄 Digital Asset / Master File</option>
                    <option value="other">⚙️ Other Asset</option>
                  </select>
                </div>

                {/* Brand / Manufacturer or Provider */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center justify-between">
                    <span>{category === "hardware" ? "Brand / Manufacturer *" : "Host / Provider"}</span>
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
                    placeholder={category === "hardware" ? "e.g. NVIDIA, AMD, ASUS, Corsair" : "e.g. Hetzner, AWS, Cloudflare"}
                    className={`px-3 py-2 rounded-lg bg-background border text-foreground text-xs focus:outline-none transition-all ${
                      errors.provider ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20" : "border-border focus:border-indigo-500"
                    }`}
                  />
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

                {/* HARDWARE SPECIFIC: PC Component Type & Build Status */}
                {category === "hardware" && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                        <Cpu className="h-3 w-3 text-indigo-400" /> Component / Part Type
                      </label>
                      <select
                        value={partType}
                        onChange={(e) => setPartType(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-indigo-500"
                      >
                        {PC_PART_TYPES.map((pt) => (
                          <option key={pt.value} value={pt.value}>{pt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                        <Wrench className="h-3 w-3 text-emerald-400" /> PC Build Status
                      </label>
                      <select
                        value={buildStatus}
                        onChange={(e: any) => setBuildStatus(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-indigo-500"
                      >
                        <option value="in_stock">🟢 In Stock (Available for Builds)</option>
                        <option value="reserved">🟡 Reserved (Allocated to Quote)</option>
                        <option value="installed_in_pc">🔵 Installed in Client PC Build</option>
                        <option value="sold">🟣 Sold / Delivered to Customer</option>
                      </select>
                    </div>

                    {projects && projects.length > 0 && (
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-[11px] font-bold uppercase text-muted-foreground">
                          Assign to Client PC Build / Campaign (Optional)
                        </label>
                        <select
                          value={targetProjectId}
                          onChange={(e) => setTargetProjectId(e.target.value)}
                          className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">-- Unassigned Inventory Stock --</option>
                          {projects.map((p) => (
                            <option key={p._id} value={p._id}>Rig / Project: {p.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                {/* Specs / Details */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase text-muted-foreground">
                    Technical Specifications / Model Details
                  </label>
                  <input
                    type="text"
                    value={specsOrDetails}
                    onChange={(e) => setSpecsOrDetails(e.target.value)}
                    placeholder="e.g. 12GB GDDR6X, PCIe 4.0, 2x HDMI 2.1a, Dual Fan OC"
                    className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-indigo-500 font-mono"
                  />
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

                {/* Purchase Cost / Valuation */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-emerald-400" />
                      Part Price / Unit Value ({currencyCode}) *
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
                      placeholder="0.00"
                      className={`w-full pl-8 pr-3 py-2 rounded-lg bg-background border text-foreground text-xs focus:outline-none font-mono font-bold transition-all ${
                        errors.unitPrice ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20" : "border-border focus:border-emerald-500"
                      }`}
                    />
                  </div>
                </div>

              </div>

              {/* PAYMENT & FINANCING SECTION: Cash vs BNPL (SPayLater/LazPayLater) */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-amber-400" /> Payment & Purchase Financing
                  </span>
                  <div className="flex items-center gap-1 bg-background border border-border p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                        paymentMethod === "cash" ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      💵 Full Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod("bnpl");
                        handleAutoCalculateMonthly();
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                        paymentMethod === "bnpl" ? "bg-amber-600 text-white shadow-xs" : "text-amber-400 hover:text-amber-300"
                      }`}
                    >
                      🛒 BNPL Installment
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("credit_card")}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                        paymentMethod === "credit_card" ? "bg-indigo-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      💳 Credit Card
                    </button>
                  </div>
                </div>

                {/* Detailed BNPL Config Fields */}
                {paymentMethod === "bnpl" && (
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col gap-3.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[11px] font-bold uppercase text-amber-400 flex items-center gap-1.5">
                        <ShoppingCart className="h-3.5 w-3.5" /> Buy Now Pay Later Terms (Shopee / Lazada)
                      </span>
                      <div className="flex gap-1 flex-wrap">
                        {BNPL_PROVIDER_PRESETS.map((bp) => (
                          <button
                            key={bp}
                            type="button"
                            onClick={() => setBnplProvider(bp)}
                            className={`text-[9px] px-2 py-0.5 rounded-md font-medium border transition-colors ${
                              bnplProvider === bp
                                ? "bg-amber-600 text-white border-amber-500 font-bold"
                                : "bg-card text-muted-foreground border-border hover:text-foreground"
                            }`}
                          >
                            {bp}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Provider name input */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">App / Provider</label>
                        <input
                          type="text"
                          value={bnplProvider}
                          onChange={(e) => setBnplProvider(e.target.value)}
                          placeholder="e.g. Shopee SPayLater"
                          className="px-3 py-1.5 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-amber-500 font-semibold"
                        />
                      </div>

                      {/* Order / Reference Number */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Order / Tracking ID</label>
                        <input
                          type="text"
                          value={bnplOrderNumber}
                          onChange={(e) => setBnplOrderNumber(e.target.value)}
                          placeholder="e.g. 2409041234ABC"
                          className="px-3 py-1.5 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>

                      {/* Monthly Installment Amount */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center justify-between">
                          <span>Monthly Due ({currencyCode}) *</span>
                          <button
                            type="button"
                            onClick={handleAutoCalculateMonthly}
                            className="text-[9px] text-amber-400 hover:underline flex items-center gap-0.5"
                          >
                            Auto-Estimate
                          </button>
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">
                            ₱
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={bnplMonthlyInstallmentInput}
                            onChange={(e) => {
                              setBnplMonthlyInstallmentInput(e.target.value);
                              if (errors.bnplMonthly) setErrors((prev) => ({ ...prev, bnplMonthly: "" }));
                            }}
                            placeholder="e.g. 5500.00"
                            className={`w-full pl-7 pr-3 py-1.5 rounded-lg bg-background border text-foreground text-xs focus:outline-none font-mono font-bold transition-all ${
                              errors.bnplMonthly ? "border-rose-500 focus:border-rose-500" : "border-border focus:border-amber-500"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Tenure / Total Installments */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Tenure (Months)</label>
                        <select
                          value={bnplTotalInstallments}
                          onChange={(e) => {
                            setBnplTotalInstallments(e.target.value);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-amber-500 font-mono"
                        >
                          <option value="1">1 Month (Pay Later)</option>
                          <option value="3">3 Months Installment</option>
                          <option value="6">6 Months Installment</option>
                          <option value="9">9 Months Installment</option>
                          <option value="12">12 Months (1 Year)</option>
                          <option value="18">18 Months Installment</option>
                          <option value="24">24 Months (2 Years)</option>
                        </select>
                      </div>

                      {/* Installments Paid to Date */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Already Paid</label>
                        <input
                          type="number"
                          min="0"
                          max={bnplTotalInstallments}
                          value={bnplInstallmentsPaid}
                          onChange={(e) => setBnplInstallmentsPaid(e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>

                      {/* Due Day of Month */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Billing Due Day</label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={bnplDueDay}
                          onChange={(e) => setBnplDueDay(e.target.value)}
                          placeholder="e.g. 15"
                          className="px-3 py-1.5 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>
                    </div>

                    {/* Live Installment Balance Summary */}
                    {calculatedTotalFormValue > 0 && (
                      <div className="p-3 rounded-lg bg-background/80 border border-border flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-amber-400" />
                          <span className="text-foreground">
                            <strong>Installment Schedule:</strong> {bnplInstallmentsPaid} of {bnplTotalInstallments} payments paid.
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-muted-foreground">
                            Remaining Balance:{" "}
                            <strong className="text-amber-400">
                              {formatCurrencyCents(
                                Math.max(0, calculatedTotalFormValue - ((parseInt(bnplInstallmentsPaid || "0", 10) * Math.round(parseFloat(bnplMonthlyInstallmentInput || "0") * 100)))),
                                currencyCode
                              )}
                            </strong>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase text-muted-foreground">Notes & Warranty Info</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Warranty period, distributor name, store link, Shopee/Lazada shop name..."
                  className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Form Submission Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="ghost" onClick={resetForm} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                  {editingId ? "Save Changes" : "Add to Client Inventory"}
                </Button>
              </div>
            </form>
          )}

          {/* Asset List */}
          {assets === undefined ? (
            <div className="py-12 flex flex-col items-center text-muted-foreground text-xs">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mb-2" />
              Loading client inventory & parts...
            </div>
          ) : displayedAssets.length === 0 ? (
            <div className="py-12 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground text-xs text-center p-6 bg-muted/20">
              <Laptop className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="font-bold text-foreground text-sm">No items in this filter</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Add hardware parts, PC builds, or log parts bought with Shopee SPayLater or Lazada LazPayLater to track inventory and liabilities.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {displayedAssets.map((asset) => {
                const IconComponent = CATEGORY_ICONS[asset.category] || Laptop;
                const isBnpl = asset.paymentMethod === "bnpl";
                const isFullyPaid = asset.bnplStatus === "fully_paid";

                const financed = asset.bnplTotalFinanced || asset.totalValue;
                const paidCount = asset.bnplInstallmentsPaid || 0;
                const totalCount = asset.bnplTotalInstallments || 1;
                const monthly = asset.bnplMonthlyInstallment || 0;
                const paidAmount = (paidCount * monthly) + (asset.bnplDownpayment || 0);
                const remainingDebt = Math.max(0, financed - paidAmount);

                return (
                  <div
                    key={asset._id}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between text-left gap-3 group ${
                      isBnpl 
                        ? "bg-card border-amber-500/20 hover:border-amber-500/40" 
                        : "bg-card border-border hover:border-indigo-500/30"
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                        isBnpl
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : asset.category === "hardware"
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

                          {asset.partType && (
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {asset.partType.toUpperCase()}
                            </span>
                          )}

                          {asset.buildStatus && (
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                              asset.buildStatus === "in_stock" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              asset.buildStatus === "reserved" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              asset.buildStatus === "installed_in_pc" ? "bg-sky-500/10 text-sky-400 border-sky-500/20" :
                              "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            }`}>
                              {asset.buildStatus.replace(/_/g, " ")}
                            </span>
                          )}

                          {isBnpl && (
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border flex items-center gap-1 ${
                              isFullyPaid 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                : "bg-amber-500/10 text-amber-400 border-amber-500/25"
                            }`}>
                              <ShoppingCart className="h-2.5 w-2.5" />
                              {asset.bnplProvider || "BNPL"} ({paidCount}/{totalCount} {isFullyPaid ? "Paid" : "mo"})
                            </span>
                          )}
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

                          {isBnpl && asset.bnplOrderNumber && (
                            <span className="font-mono text-amber-400/90 flex items-center gap-1">
                              <Tag className="h-3 w-3" /> Order #{asset.bnplOrderNumber}
                            </span>
                          )}

                          {isBnpl && !isFullyPaid && (
                            <span className="text-amber-400 flex items-center gap-1 font-mono font-bold">
                              <Clock className="h-3 w-3" /> Unpaid Debt: {formatCurrencyCents(remainingDebt, currencyCode)}
                            </span>
                          )}

                          {asset.serialNumber && (
                            <span className="font-mono text-zinc-400 flex items-center gap-1">
                              <Tag className="h-3 w-3 text-indigo-400" /> {asset.serialNumber}
                            </span>
                          )}

                          {asset.notes && <span className="line-clamp-1 text-muted-foreground">• {asset.notes}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                      <div className="flex flex-col sm:items-end">
                        <span className="text-xs font-mono font-black text-emerald-400">
                          +{formatCurrencyCents(asset.totalValue, currencyCode)}
                        </span>

                        {isBnpl && asset.bnplMonthlyInstallment ? (
                          <span className="text-[11px] font-mono font-bold text-amber-400">
                            {formatCurrencyCents(asset.bnplMonthlyInstallment, currencyCode)}/mo
                          </span>
                        ) : asset.recurringCost ? (
                          <span className="text-[11px] font-mono font-bold text-indigo-400">
                            {formatCurrencyCents(asset.recurringCost, currencyCode)}/{asset.costInterval === "yearly" ? "yr" : "mo"}
                          </span>
                        ) : null}

                        <span className="text-[9px] text-muted-foreground font-mono">
                          {isBnpl ? "Asset Value & Monthly Due" : "Asset Valuation"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Quick Pay Installment Button */}
                        {isBnpl && !isFullyPaid && (
                          <Button
                            size="sm"
                            type="button"
                            onClick={() => setPayTarget(asset)}
                            className="bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 text-[11px] h-7 px-2 font-bold"
                          >
                            Pay Installment
                          </Button>
                        )}

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

        {/* Quick Pay Installment Confirmation Dialog */}
        {payTarget && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-4 text-left animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <h4 className="text-sm font-bold text-foreground">
                    Record BNPL Monthly Installment?
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {payTarget.bnplProvider || "BNPL App"} • {payTarget.name}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex flex-col gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Progress:</span>
                  <span className="font-mono font-bold text-foreground">
                    {payTarget.bnplInstallmentsPaid || 0} of {payTarget.bnplTotalInstallments || 1} Paid
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Installment Outflow:</span>
                  <span className="font-mono font-extrabold text-amber-400 text-sm">
                    {formatCurrencyCents(payTarget.bnplMonthlyInstallment || 0, currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
                  <span>Automatic Action:</span>
                  <span className="text-emerald-400 font-semibold">
                    ✓ Writes Expense to Finance Ledger
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isPaying}
                  onClick={() => setPayTarget(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isPaying}
                  onClick={handleRecordPayment}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
                >
                  {isPaying ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Recording...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1.5" /> Confirm Payment & Log Expense
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

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
                    Delete Component / Asset?
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
