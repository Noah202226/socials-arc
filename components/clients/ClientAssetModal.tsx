"use client";

import { useState } from "react";
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
  Key, 
  Layers 
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
  hardware: HardDrive,
  digital_asset: FileCode,
  inventory_stock: Boxes,
  license_domain: Key,
  other: Layers,
};

const CATEGORY_LABELS: Record<string, string> = {
  hardware: "Hardware Equipment",
  digital_asset: "Digital Asset / Master File",
  inventory_stock: "Inventory Stock",
  license_domain: "License / Domain",
  other: "Other Asset",
};

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

  // Form State
  const [editingId, setEditingId] = useState<Id<"clientAssets"> | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<"hardware" | "digital_asset" | "inventory_stock" | "license_domain" | "other">("hardware");
  const [quantity, setQuantity] = useState("1");
  const [unitPriceInput, setUnitPriceInput] = useState("");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const resetForm = () => {
    setName("");
    setCategory("hardware");
    setQuantity("1");
    setUnitPriceInput("");
    setNotes("");
    setEditingId(null);
    setIsAdding(false);
  };

  const handleStartEdit = (asset: any) => {
    setEditingId(asset._id);
    setName(asset.name);
    setCategory(asset.category);
    setQuantity(String(asset.quantity));
    setUnitPriceInput((asset.unitValue / 100).toFixed(2));
    setNotes(asset.notes || "");
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please provide an asset name");
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    const parsedPrice = parseFloat(unitPriceInput);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Please enter a valid unit price");
      return;
    }

    const unitValCents = Math.round(parsedPrice * 100);
    setLoading(true);

    try {
      if (editingId) {
        await updateAsset({
          assetId: editingId,
          name,
          category,
          quantity: qty,
          unitValue: unitValCents,
          currency: currencyCode,
          notes,
        });
        toast.success(`Updated "${name}" inventory asset.`);
      } else {
        await createAsset({
          workspaceId,
          clientId,
          name,
          category,
          quantity: qty,
          unitValue: unitValCents,
          currency: currencyCode,
          notes,
        });
        toast.success(`Added "${name}" to client inventory.`);
      }
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save asset");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (assetId: Id<"clientAssets">, assetName: string) => {
    if (!confirm(`Delete asset "${assetName}" from client inventory?`)) return;
    try {
      await removeAsset({ assetId });
      toast.info(`Removed "${assetName}"`);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete asset");
    }
  };

  const totalValuationCents = (assets || []).reduce((acc, curr) => acc + curr.totalValue, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Package className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-left">
              <h3 className="text-base font-bold text-foreground">
                Inventory & Assets — {clientName}
              </h3>
              <p className="text-xs text-muted-foreground">
                Manage hardware, digital master files, and inventory valuation.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Total Valuation Banner */}
        <div className="px-6 py-3 bg-indigo-950/15 border-b border-indigo-900/30 flex justify-between items-center text-xs">
          <span className="text-muted-foreground font-medium">Total Inventory Asset Valuation:</span>
          <span className="font-mono font-bold text-indigo-400 text-sm">
            {formatCurrencyCents(totalValuationCents, currencyCode)}
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          
          {/* Action Header */}
          {!isAdding && (
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider font-mono">
                Assets List ({assets?.length || 0})
              </span>
              <Button
                onClick={() => { resetForm(); setIsAdding(true); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Inventory Asset
              </Button>
            </div>
          )}

          {/* Form */}
          {isAdding && (
            <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 flex flex-col gap-4 text-left">
              <div className="flex justify-between items-center border-b border-indigo-500/20 pb-2">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  {editingId ? "Edit Inventory Asset" : "New Inventory Asset"}
                </span>
                <button type="button" onClick={resetForm} className="text-xs text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase text-muted-foreground">Asset Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sony A7IV Camera Kit, Master Video Files, Swag Stock"
                    className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase text-muted-foreground">Category</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="hardware">Hardware Equipment</option>
                    <option value="digital_asset">Digital Asset / Master File</option>
                    <option value="inventory_stock">Inventory Stock</option>
                    <option value="license_domain">License / Domain</option>
                    <option value="other">Other Asset</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase text-muted-foreground">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase text-muted-foreground">
                    Unit Value ({currencyCode})
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
                      onChange={(e) => setUnitPriceInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase text-muted-foreground">Notes / Serial #</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Location, storage URL, serial number..."
                    className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={resetForm} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                  {editingId ? "Save Changes" : "Create Asset"}
                </Button>
              </div>
            </form>
          )}

          {/* Asset List */}
          {assets === undefined ? (
            <div className="py-12 flex flex-col items-center text-muted-foreground text-xs">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mb-2" />
              Loading client inventory...
            </div>
          ) : assets.length === 0 ? (
            <div className="py-12 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground text-xs text-center p-6">
              <Package className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="font-semibold text-foreground">No inventory assets recorded yet</p>
              <p className="text-[11px] mt-1 max-w-sm">
                Add hardware equipment, master digital files, stock inventory, or licenses associated with {clientName}.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {assets.map((asset) => {
                const IconComponent = CATEGORY_ICONS[asset.category] || Layers;
                return (
                  <div
                    key={asset._id}
                    className="p-3.5 rounded-xl border border-border bg-card hover:border-indigo-500/30 transition-all flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-indigo-400 shrink-0">
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-foreground">{asset.name}</span>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="px-1.5 py-0.5 rounded bg-muted font-medium border border-border">
                            {CATEGORY_LABELS[asset.category] || asset.category}
                          </span>
                          <span>Qty: {asset.quantity}</span>
                          {asset.notes && <span>• {asset.notes}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-mono font-bold text-foreground">
                          {formatCurrencyCents(asset.totalValue, currencyCode)}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {formatCurrencyCents(asset.unitValue, currencyCode)} / ea
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(asset)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(asset._id, asset.name)}
                          className="p-1.5 rounded-md hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors"
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
      </div>
    </div>
  );
}
