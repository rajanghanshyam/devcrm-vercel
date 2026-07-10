import React, { useState } from "react";
import { 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Box, 
  HelpCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  User, 
  Truck, 
  ClipboardList, 
  Info,
  Layers,
  MapPin,
  Tag
} from "lucide-react";
import { InventoryItem, InventoryLog, Customer } from "../types";
import { formatINR, formatDate } from "../utils";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

interface InventoryViewProps {
  inventory: InventoryItem[];
  onUpdateInventory: (updated: InventoryItem[]) => void;
  customers: Customer[];
}

export default function InventoryView({ inventory, onUpdateInventory, customers = [] }: InventoryViewProps) {
  const [activeTab, setActiveTab] = useState<"items" | "ledger" | "product-wise">("items");
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Ledger Filter states
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState("");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});
  const [reportingSearchTerm, setReportingSearchTerm] = useState("");
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Stock Adjustment micro-states
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<"IN" | "OUT">("IN");
  const [adjustQty, setAdjustQty] = useState<number | "">("");
  const [adjustReason, setAdjustReason] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [isAdjustGeneralOpen, setIsAdjustGeneralOpen] = useState(false);
  const [generalItemId, setGeneralItemId] = useState("");

  // Product register attributes
  const [formSku, setFormSku] = useState("");
  const [formProductName, setFormProductName] = useState("");
  const [formCategory, setFormCategory] = useState("Hardware");
  const [formQuantity, setFormQuantity] = useState<number | "">("");
  const [formMinQuantity, setFormMinQuantity] = useState<number | "">("");
  const [formPurchaseFrom, setFormPurchaseFrom] = useState("");
  const [formUnitPrice, setFormUnitPrice] = useState<number | "">("");
  const [formLatestPurchasePrice, setFormLatestPurchasePrice] = useState<number | "">("");
  const [adjustPurchasePrice, setAdjustPurchasePrice] = useState<number | "">("");

  const resetForm = () => {
    setFormSku("");
    setFormProductName("");
    setFormCategory("Hardware");
    setFormQuantity("");
    setFormMinQuantity("");
    setFormPurchaseFrom("");
    setFormUnitPrice("");
    setFormLatestPurchasePrice("");
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (item: InventoryItem) => {
    setFormSku(item.sku);
    setFormProductName(item.productName);
    setFormCategory(item.category);
    setFormQuantity(item.quantity);
    setFormMinQuantity(item.minQuantity);
    setFormPurchaseFrom(item.purchaseFrom || "");
    setFormUnitPrice(item.unitPrice);
    setFormLatestPurchasePrice(item.latestPurchasePrice !== undefined ? item.latestPurchasePrice : "");
    setEditingId(item.id);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("Are you sure you want to remove this item from the inventory? All associated movement records will be deleted as well.")) {
      onUpdateInventory(inventory.filter((i) => i.id !== id));
      if (editingId === id) {
        resetForm();
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSku || !formProductName || formQuantity === "" || formMinQuantity === "" || formUnitPrice === "") return;

    const existingItem = inventory.find((i) => i.id === editingId);
    let logsList: InventoryLog[] = existingItem?.logs || [];

    const inputQty = Number(formQuantity);

    if (existingItem) {
      const diff = inputQty - existingItem.quantity;
      if (diff !== 0) {
        const adjustmentLog: InventoryLog = {
          id: "log_" + Date.now(),
          date: new Date().toISOString().split("T")[0],
          type: diff > 0 ? "IN" : "OUT",
          quantity: Math.abs(diff),
          reason: "Manual Quantity form override correction",
          prevQty: existingItem.quantity,
          newQty: inputQty,
          supplierName: diff > 0 ? "System Adjustment" : undefined,
          customerName: diff < 0 ? "System Adjustment" : undefined
        };
        logsList = [adjustmentLog, ...logsList];
      }
    } else {
      // First initial setup seed log
      const initialLog: InventoryLog = {
        id: "log_" + Date.now(),
        date: new Date().toISOString().split("T")[0],
        type: "IN",
        quantity: inputQty,
        reason: "Initial Stock Listing Seeding",
        prevQty: 0,
        newQty: inputQty,
        supplierName: "System Initialization"
      };
      logsList = [initialLog];
    }

    const newItem: InventoryItem = {
      id: editingId || "inv_" + Date.now(),
      sku: formSku.toUpperCase().trim(),
      productName: formProductName,
      category: formCategory,
      quantity: inputQty,
      minQuantity: Number(formMinQuantity),
      purchaseFrom: formPurchaseFrom,
      unitPrice: Number(formUnitPrice),
      latestPurchasePrice: formLatestPurchasePrice !== "" ? Number(formLatestPurchasePrice) : undefined,
      lastUpdated: new Date().toISOString().split("T")[0],
      logs: logsList
    };

    if (editingId) {
      onUpdateInventory(inventory.map((i) => (i.id === editingId ? newItem : i)));
    } else {
      onUpdateInventory([newItem, ...inventory]);
    }
    resetForm();
  };

  const handleDownloadProductReportPDF = async () => {
    const printElement = document.getElementById('product-wise-report-printable');
    if (!printElement) {
      alert("Report container not found to generate PDF!");
      return;
    }
    setIsExportingPDF(true);
    try {
      const imgData = await toPng(printElement, {
        quality: 0.98,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      
      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const canvasWidth = img.width;
      const canvasHeight = img.height;

      const pdfWidth = 595.28; // Standard portrait width in pt
      const pdfHeight = (canvasHeight * pdfWidth) / canvasWidth;
      
      // Instantiate jsPDF with custom dynamic size to fit the document perfectly inside 1 page
      const pdf = new jsPDF('p', 'pt', [pdfWidth, pdfHeight]);
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      pdf.save(`Inventory_ProductWise_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Error generating PDF: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleAdjustmentSave = (e: React.FormEvent) => {
    e.preventDefault();
    const targetItem = adjustItem || inventory.find(i => i.id === generalItemId);
    if (!targetItem || adjustQty === "" || Number(adjustQty) <= 0) {
      alert("Please specify a valid item and quantity greater than zero.");
      return;
    }

    const qtyShift = Number(adjustQty);
    const delta = adjustType === "IN" ? qtyShift : -qtyShift;
    const newQty = targetItem.quantity + delta;

    if (newQty < 0) {
      alert(`Error: Cannot complete stock OUT. OUT quantity (${qtyShift}) exceeds current stock (${targetItem.quantity}).`);
      return;
    }

    const currentSupplierName = adjustType === "IN" ? (supplierName.trim() || "Unspecified Supplier") : undefined;
    const currentCustomerName = adjustType === "OUT" ? (customerName.trim() || "Unspecified Customer") : undefined;

    const movementLog: InventoryLog = {
      id: "log_" + Date.now(),
      date: new Date().toISOString(),
      type: adjustType,
      quantity: qtyShift,
      reason: adjustReason.trim() || `${adjustType === "IN" ? "Restocking Addition" : "Stock Dispatch release"}`,
      prevQty: targetItem.quantity,
      newQty: newQty,
      supplierName: currentSupplierName,
      customerName: currentCustomerName
    };

    const updatedItem: InventoryItem = {
      ...targetItem,
      quantity: newQty,
      latestPurchasePrice: (adjustType === "IN" && adjustPurchasePrice !== "") ? Number(adjustPurchasePrice) : targetItem.latestPurchasePrice,
      lastUpdated: new Date().toISOString().split("T")[0],
      logs: [movementLog, ...(targetItem.logs || [])]
    };

    onUpdateInventory(inventory.map((i) => (i.id === targetItem.id ? updatedItem : i)));
    
    // Reset micro-states
    setAdjustItem(null);
    setGeneralItemId("");
    setAdjustQty("");
    setAdjustReason("");
    setSupplierName("");
    setCustomerName("");
    setAdjustPurchasePrice("");
    setIsAdjustGeneralOpen(false);
  };

  // Compile all transaction history log items chronologically
  const compiledLedgerLogs = inventory.reduce<{ log: InventoryLog; item: InventoryItem }[]>((acc, item) => {
    if (item.logs) {
      item.logs.forEach((log) => {
        acc.push({ log, item });
      });
    }
    return acc;
  }, []);

  // Sort latest first (using ID/Timestamp or Date)
  compiledLedgerLogs.sort((a, b) => {
    const timeA = a.log.date.includes("T") ? new Date(a.log.date).getTime() : new Date(a.log.date + "T00:00:00").getTime();
    const timeB = b.log.date.includes("T") ? new Date(b.log.date).getTime() : new Date(b.log.date + "T00:00:00").getTime();
    return (timeB || 0) - (timeA || 0);
  });

  const filteredInventory = inventory.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      (item.productName || "").toLowerCase().includes(term) ||
      (item.sku || "").toLowerCase().includes(term) ||
      (item.category || "").toLowerCase().includes(term) ||
      (item.purchaseFrom || "").toLowerCase().includes(term)
    );
  });

  const filteredLedger = compiledLedgerLogs.filter(({ log, item }) => {
    const term = ledgerSearchTerm.toLowerCase();
    const matchesSearch = 
      (item.productName || "").toLowerCase().includes(term) ||
      (item.sku || "").toLowerCase().includes(term) ||
      (log.reason || "").toLowerCase().includes(term) ||
      (log.supplierName || "").toLowerCase().includes(term) ||
      (log.customerName || "").toLowerCase().includes(term);

    const matchesType = 
      ledgerTypeFilter === "ALL" || 
      log.type === ledgerTypeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Box className="w-6 h-6 text-indigo-600" /> Inventory & Warehouse Control
          </h2>
          <p className="text-sm text-slate-500 font-sans mt-0.5">
            Manage physical stock levels, map logistics locations, and maintain robust audit ledgers for suppliers and customers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setAdjustItem(null);
              setGeneralItemId("");
              setAdjustQty("");
              setAdjustType("IN");
              setSupplierName("");
              setCustomerName("");
              setIsAdjustGeneralOpen(true);
            }}
            className="flex items-center gap-1.5 bg-slate-50 text-indigo-700 hover:bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm whitespace-nowrap cursor-pointer"
            title="Adjust Stock levels manually"
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            <ArrowDownLeft className="w-4 h-4 text-rose-600 -ml-1" />
            Stock IN / OUT
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Stock Item
          </button>
        </div>
      </div>

      {/* Main Mode Sub-Navigation Tabs */}
      <div className="flex items-center border-b border-slate-200 gap-1 bg-slate-50/50 p-1.5 rounded-xl">
        <button
          onClick={() => setActiveTab("items")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "items"
              ? "bg-white text-indigo-700 shadow-sm border border-slate-250/30"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="w-4 h-4" />
          Active Stock Registry ({filteredInventory.length})
        </button>
        <button
          onClick={() => setActiveTab("ledger")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "ledger"
              ? "bg-white text-indigo-700 shadow-sm border border-slate-250/30"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Detailed In-Out Ledger Log ({compiledLedgerLogs.length} Entries)
        </button>
        <button
          onClick={() => setActiveTab("product-wise")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "product-wise"
              ? "bg-white text-indigo-700 shadow-sm border border-slate-250/30"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Box className="w-4 h-4" />
          Product-Wise Reports ({filteredInventory.length} Products)
        </button>
      </div>

      {/* Item Setup / Edit form */}
      {isFormOpen && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative mb-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
              {editingId ? "Amend Stock Registry Item" : "Register New Warehouse Inventory Item"}
            </h3>
            <button 
              onClick={resetForm}
              className="text-xs text-slate-400 hover:text-slate-650 uppercase font-black tracking-wider cursor-pointer select-none"
            >
              Close
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form onSubmit={handleSave} className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Product Name *</label>
                <input
                  required
                  type="text"
                  value={formProductName}
                  onChange={(e) => setFormProductName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans"
                  placeholder="e.g. Dell PowerEdge Server R740"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SKU / Stock Identification Code *</label>
                <input
                  required
                  type="text"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800"
                  placeholder="e.g. HW-SRV-PE740"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans text-slate-800"
                >
                  <option value="Hardware">Hardware Components</option>
                  <option value="Software">Licensed Software</option>
                  <option value="Accessories">Cables & Accessories</option>
                  <option value="Electronics">Test Equipment</option>
                  <option value="Raw Material">Raw Material</option>
                  <option value="Finished Goods">Dispatched Goods</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Current Quantity on Hand *</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value ? Number(e.target.value) : "")}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Minimum Alert Threshold *</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={formMinQuantity}
                  onChange={(e) => setFormMinQuantity(e.target.value ? Number(e.target.value) : "")}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Unit Valuation Rate (₹) *</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={formUnitPrice}
                  onChange={(e) => setFormUnitPrice(e.target.value ? Number(e.target.value) : "")}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Latest Purchase Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formLatestPurchasePrice}
                  onChange={(e) => setFormLatestPurchasePrice(e.target.value ? Number(e.target.value) : "")}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800"
                  placeholder="e.g. 14500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Supplier / Purchase From</label>
                <input
                  type="text"
                  value={formPurchaseFrom}
                  onChange={(e) => setFormPurchaseFrom(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans"
                  placeholder="e.g. Acme Tech Solutions Ltd"
                />
              </div>

              <div className="col-span-1 md:col-span-2 flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-xs font-bold text-slate-650 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> Register Stock Item
                </button>
              </div>
            </form>

            {/* Sidebar Ledger Log Section */}
            <div className="col-span-1 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between max-h-[440px]">
              <div className="overflow-hidden flex flex-col h-full">
                <h4 className="font-extrabold text-[10px] text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Incremental Movement Log</span>
                  <span className="bg-indigo-100 text-indigo-700 font-mono px-2 py-0.5 rounded-full text-[9px] font-bold">
                    {editingId ? (inventory.find(i => i.id === editingId)?.logs?.length || 0) : 0} Rows
                  </span>
                </h4>

                <div className="overflow-y-auto space-y-2.5 pr-1 flex-1 scrollbar-thin">
                  {(() => {
                    if (!editingId) {
                      return (
                        <div className="text-center py-16 text-slate-400 italic text-[11px] font-medium leading-relaxed bg-white rounded-lg border border-dashed border-slate-200 px-4">
                          Select an existing item in the registry list below to check its complete local audit ledger list.
                        </div>
                      );
                    }
                    const matchedItem = inventory.find(i => i.id === editingId);
                    const itemLogs = matchedItem?.logs || [];
                    if (itemLogs.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-400 italic text-[11px] font-medium leading-relaxed bg-white rounded-lg border border-dashed border-slate-200 px-4">
                          No logging events registered yet.
                        </div>
                      );
                    }
                    return itemLogs.map((lg) => (
                      <div key={lg.id} className="bg-white p-2.5 rounded-lg border border-slate-150 text-xs shadow-xs flex items-start gap-2.5">
                        <div className={`p-1 rounded mt-0.5 select-none ${
                          lg.type === "IN" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                            : "bg-rose-50 text-rose-700 border border-rose-100"
                        }`}>
                          {lg.type === "IN" ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 font-sans">
                          <div className="font-bold flex items-center justify-between text-[11px]">
                            <span className={lg.type === "IN" ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                              {lg.type === "IN" ? "STOCK IN" : "STOCK OUT"} (+{lg.quantity})
                            </span>
                            <span className="text-[9px] text-slate-450 font-mono font-normal">
                              {formatDate(lg.date.split("T")[0])}
                            </span>
                          </div>
                          
                          {/* Reason */}
                          <div className="text-slate-600 text-[10.5px] mt-0.5 italic leading-tight">
                            "{lg.reason}"
                          </div>

                          {/* Customer / Supplier Metadata Display */}
                          {lg.type === "IN" && lg.supplierName && (
                            <div className="mt-1 text-[9.5px] bg-emerald-50/50 text-emerald-800 border border-emerald-100/30 px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1 select-none">
                              <Truck className="w-3 h-3 flex-shrink-0" />
                              Vendor: <strong className="font-extrabold">{lg.supplierName}</strong>
                            </div>
                          )}
                          {lg.type === "OUT" && lg.customerName && (
                            <div className="mt-1 text-[9.5px] bg-slate-100 text-slate-800 border border-slate-200/50 px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1 select-none">
                              <User className="w-3 h-3 flex-shrink-0" />
                              Client: <strong className="font-extrabold">{lg.customerName}</strong>
                            </div>
                          )}

                          <div className="text-[9px] text-slate-400 mt-1 font-mono tracking-wide pt-1 border-t border-slate-50 flex items-center gap-1 uppercase select-none">
                            Prev: <strong>{lg.prevQty}</strong> ➔ Remaining: <strong className="text-slate-800">{lg.newQty}</strong>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER ACTIVE STOCK LEVEL ITEMS */}
      {activeTab === "items" && (
        <div className="space-y-4 font-sans animate-fade-in animate-duration-200">
          {/* SEARCH BAR */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search items by product name, category, supplier name, SKU code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full shadow-sm placeholder:text-slate-400 text-slate-800"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-250 shadow-sm overflow-hidden">
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left border-collapse border border-slate-250 [&_th]:border [&_th]:border-slate-200 [&_td]:border [&_td]:border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-[9px] uppercase tracking-wider text-slate-650 font-black font-sans">
                    <th className="py-2 px-3 w-10 text-center bg-slate-50">#</th>
                    <th className="py-2 px-3 bg-slate-50">Storage SKU</th>
                    <th className="py-2 px-3 bg-slate-50">Registered Item Name</th>
                    <th className="py-2 px-3 bg-slate-50 hidden sm:table-cell">Category Classification</th>
                    <th className="py-2 px-3 bg-slate-50">Available Qty</th>
                    <th className="py-2 px-3 bg-slate-50 hidden md:table-cell">Purchased From</th>
                    <th className="py-2 px-3 bg-slate-50 text-right">Latest Purchase Cost</th>
                    <th className="py-2 px-3 bg-slate-50 text-right">Unit Rate (Ex GST)</th>
                    <th className="py-2 px-3 bg-slate-50 text-center w-40">Post Movement</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-sans divide-y divide-slate-150 bg-white">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center py-6">
                          <HelpCircle className="w-10 h-10 text-slate-350 mb-2" />
                          <p className="font-bold text-slate-700 text-xs">No warehouse stock items match your search.</p>
                          <p className="text-[11px] mt-1 text-slate-400 font-sans">Refine keywords or register a new material catalog above.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item, index) => {
                      const isLowStock = item.quantity <= item.minQuantity;
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                          onClick={() => handleEdit(item)}
                        >
                          <td className="py-2.5 px-3 text-slate-400 text-center font-bold font-mono">{index + 1}</td>
                          <td className="py-2.5 px-3 font-mono font-extrabold text-slate-900 tracking-wide bg-slate-50/20">
                            {item.sku}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-extrabold text-slate-800 tracking-tight leading-snug">{item.productName}</div>
                          </td>
                          <td className="py-2 px-3 hidden sm:table-cell text-slate-650 bg-slate-50/10">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black tracking-wider bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                              <Tag className="w-2.5 h-2.5 text-slate-450" />
                              {item.category}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono">
                            <div className="flex items-center gap-1.5">
                              <div className={`text-[13px] font-black tracking-tighter ${isLowStock ? 'text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100/50' : 'text-slate-800'}`}>
                                {item.quantity}
                              </div>
                              {isLowStock && (
                                <span className="bg-rose-100 text-rose-700 text-[8px] font-extrabold px-1 py-0.5 rounded border border-rose-200 uppercase tracking-widest leading-none">
                                  Alert
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                              Min Alert threshold: {item.minQuantity}
                            </div>
                          </td>
                          <td className="py-2 px-3 hidden md:table-cell text-slate-600 font-sans text-[11px]">
                            <div className="flex items-center gap-1.5 font-medium text-slate-705">
                              <Truck className="w-3.5 h-3.5 text-slate-400" />
                              {item.purchaseFrom || "Standard Sourcing"}
                            </div>
                            <div className="text-[9px] text-slate-400 font-semibold mt-0.5 uppercase">Updated: {formatDate(item.lastUpdated)}</div>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-medium text-slate-500">
                            {item.latestPurchasePrice !== undefined ? formatINR(item.latestPurchasePrice) : "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-extrabold text-slate-950">
                            {formatINR(item.unitPrice)}
                          </td>
                          <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setAdjustItem(item);
                                  setAdjustType("IN");
                                  setAdjustQty("");
                                  setSupplierName("");
                                  setCustomerName("");
                                }}
                                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-black px-2 py-1 rounded-md cursor-pointer transition-colors shadow-xs"
                                title="Stock In/Supply"
                              >
                                + IN
                              </button>
                              <button
                                onClick={() => {
                                  setAdjustItem(item);
                                  setAdjustType("OUT");
                                  setAdjustQty("");
                                  setSupplierName("");
                                  setCustomerName("");
                                }}
                                className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-[10px] font-black px-2 py-1 rounded-md cursor-pointer transition-colors shadow-xs"
                                title="Stock Out/Dispatch"
                              >
                                - OUT
                              </button>
                              <button
                                onClick={(e) => handleDelete(item.id, e)}
                                className="p-1 px-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                                title="Delete Entry permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RENDER DETAILED COMPREHENSIVE TRANSACTION LEDGER */}
      {activeTab === "ledger" && (
        <div className="space-y-4 font-sans animate-fade-in animate-duration-200">
          {/* LEDGER FILTER CONTROLS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter ledger by item name, SKU, vendor name, client name or memo..."
                value={ledgerSearchTerm}
                onChange={(e) => setLedgerSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full"
              />
            </div>
            
            <div>
              <select
                value={ledgerTypeFilter}
                onChange={(e) => setLedgerTypeFilter(e.target.value as "ALL" | "IN" | "OUT")}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-700"
              >
                <option value="ALL">All Operations (IN & OUT)</option>
                <option value="IN">Only Stock IN (+)</option>
                <option value="OUT">Only Stock OUT (-)</option>
              </select>
            </div>

            <div className="flex items-center justify-end text-[11px] text-slate-450 font-medium px-1">
              Showing {filteredLedger.length} of {compiledLedgerLogs.length} Records
            </div>
          </div>

          {/* LEDGER COMPACT TABLE */}
          <div className="bg-white rounded-xl border border-slate-250 shadow-sm overflow-hidden">
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left border-collapse border border-slate-250 [&_th]:border [&_th]:border-slate-200 [&_td]:border [&_td]:border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-[9px] uppercase tracking-wider text-slate-650 font-black font-sans">
                    <th className="py-2 px-3 text-center w-12 bg-slate-50">#</th>
                    <th className="py-2 px-3 bg-slate-50 w-24">Date</th>
                    <th className="py-2 px-3 bg-slate-50 w-24 text-center">Type</th>
                    <th className="py-2 px-3 bg-slate-50">Item Name & SKU</th>
                    <th className="py-2 px-3 bg-slate-50">Entity (Supplier / Customer)</th>
                    <th className="py-2 px-3 bg-slate-50 text-right w-24">Qty Shift</th>
                    <th className="py-2 px-3 bg-slate-50 text-center w-36">Stock Impact</th>
                    <th className="py-2 px-3 bg-slate-50">Action / Memo</th>
                  </tr>
                </thead>
                <tbody className="text-xs bg-white text-slate-650">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center">
                          <ClipboardList className="w-12 h-12 text-slate-300 mb-2" />
                          <p className="font-bold text-slate-700 text-xs">No transaction records match the set filters.</p>
                          <p className="text-[11px] mt-1">Try updating your filters or register stock actions.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map(({ log, item }, index) => {
                      const isIN = log.type === "IN";
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                          <td className="py-2.5 px-3 text-slate-400 text-center font-bold font-mono">
                            {index + 1}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[10px] whitespace-nowrap">
                            {formatDate(log.date.split("T")[0])}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide border uppercase ${
                              isIN 
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                                : "bg-rose-50 text-rose-800 border-rose-250"
                            }`}>
                              {isIN ? "Stock In" : "Stock Out"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-905">{item.productName}</div>
                            <div className="text-[9.5px] text-indigo-650 font-mono font-semibold tracking-wide">
                              SKU: {item.sku}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            {isIN ? (
                              <div className="flex items-center gap-1 text-emerald-800 bg-emerald-50/30 text-[11px] font-semibold border border-emerald-100/40 rounded-md px-2 py-0.5 w-fit">
                                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{log.supplierName || "Unspecified Vendor"}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-indigo-900 bg-slate-50 text-[11px] font-semibold border border-slate-200 rounded-md px-2 py-0.5 w-fit">
                                <User className="w-3.5 h-3.5 text-slate-500" />
                                <span>{log.customerName || "Unspecified Customer"}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                            {isIN ? `+ ${log.quantity}` : `- ${log.quantity}`}
                          </td>
                          <td className="py-1 px-3 text-center whitespace-nowrap">
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-mono py-0.5 px-2 rounded-full border border-slate-200/50">
                              {log.prevQty} ➔ {log.newQty} Units
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px] italic" title={log.reason}>
                            {log.reason}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RENDER DETAILED PRODUCT-WISE INVENTORY REPORT */}
      {activeTab === "product-wise" && (
        <div className="space-y-6 font-sans animate-fade-in animate-duration-200">
          
          {/* SEARCH & DOWNLOAD BUTTON */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search and compile report by product name, SKU or categories..."
                value={reportingSearchTerm}
                onChange={(e) => setReportingSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full font-medium"
              />
            </div>
            
            <button
              onClick={handleDownloadProductReportPDF}
              disabled={isExportingPDF || inventory.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white gap-2 font-bold text-xs rounded-lg transition-colors flex items-center justify-center shadow-md shadow-indigo-600/10 cursor-pointer shrink-0"
            >
              {isExportingPDF ? (
                <>Generating Corporate PDF...</>
              ) : (
                <>
                  <ClipboardList className="w-4 h-4" /> Export Report (PDF)
                </>
              )}
            </button>
          </div>

          {/* REPORT WRAPPER (TARGET FOR PDF EXPORT) */}
          <div 
            id="product-wise-report-printable"
            className="bg-white p-6 rounded-xl border border-slate-250 shadow-sm space-y-6 select-text"
          >
            {/* Report Header for PDF */}
            <div className="border-b border-b-slate-100 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Product-Wise Available Stock & Valuation Ledger</h2>
                <p className="text-[11px] text-slate-450 mt-1">Generated: {formatDate(new Date().toISOString().split('T')[0])} | Real-Time Active Inventory Ledger Analysis</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-200 font-bold uppercase shrink-0">
                  Total Active Rows: {inventory.length} SKUs
                </span>
              </div>
            </div>

            {/* Micro Dashboard Statistics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="p-2.5 bg-white rounded border border-slate-150">
                <span className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Catalogue Items</span>
                <span className="text-lg font-black text-slate-800">{inventory.length} SKUs</span>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-150">
                <span className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Units On Hand</span>
                <span className="text-lg font-black text-slate-800">
                  {inventory.reduce((sum, item) => sum + item.quantity, 0)} Units
                </span>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-150">
                <span className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Total Valuation</span>
                <span className="text-lg font-black text-emerald-700">
                  {formatINR(inventory.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0))}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-150">
                <span className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Low Stock Safety Flags</span>
                <span className={`text-lg font-black ${inventory.filter(i => i.quantity <= i.minQuantity).length > 0 ? "text-rose-600 font-black animate-pulse" : "text-slate-700"}`}>
                  {inventory.filter(i => i.quantity <= i.minQuantity).length} Alerts
                </span>
              </div>
            </div>

            {/* TABULAR REPORT LIST */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-200 [&_th]:border [&_th]:border-slate-200 [&_td]:border [&_td]:border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-[9px] uppercase tracking-wider text-slate-655 font-black">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">SKU & Item Name</th>
                    <th className="py-2.5 px-2.5">Category</th>
                    <th className="py-2.5 px-3 text-center">Inward Vol</th>
                    <th className="py-2.5 px-3 text-center">Outward Vol</th>
                    <th className="py-2.5 px-3 text-center">Current Qty</th>
                    <th className="py-2.5 px-3 text-right">Latest Sourcing Rate</th>
                    <th className="py-2.5 px-3 text-right">Total Stock Value</th>
                    <th className="py-2 px-3 text-center no-print w-16">Audit</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-150">
                  {(() => {
                    const term = reportingSearchTerm.toLowerCase();
                    const reportingItems = inventory.filter(i => 
                      i.productName.toLowerCase().includes(term) ||
                      i.sku.toLowerCase().includes(term) ||
                      i.category.toLowerCase().includes(term)
                    );

                    if (reportingItems.length === 0) {
                      return (
                        <tr>
                          <td colSpan={9} className="p-10 text-center text-slate-400 italic">
                            No product records meet your current query search filter.
                          </td>
                        </tr>
                      );
                    }

                    return reportingItems.map((item, index) => {
                      const isLow = item.quantity <= item.minQuantity;
                      const itemLogs = item.logs || [];
                      const totalIn = itemLogs.filter(l => l.type === "IN").reduce((sum, l) => sum + l.quantity, 0);
                      const totalOut = itemLogs.filter(l => l.type === "OUT").reduce((sum, l) => sum + l.quantity, 0);
                      const sumValue = item.quantity * item.unitPrice;
                      const isExpanded = !!expandedProductIds[item.id];

                      return (
                        <React.Fragment key={item.id}>
                          <tr className="hover:bg-slate-5/50 transition-colors border-b border-slate-200">
                            <td className="py-2.5 px-3 text-center font-bold text-slate-400 font-mono">{index + 1}</td>
                            <td className="py-2.5 px-3 font-sans">
                              <div className="font-extrabold text-slate-800">{item.productName}</div>
                              <div className="text-[10px] font-mono font-bold text-indigo-600 mt-0.5">{item.sku}</div>
                              {item.purchaseFrom && (
                                <div className="text-[9.5px] text-slate-450 mt-1 flex items-center gap-1 font-medium select-none">
                                  <Truck className="w-3 h-3 text-slate-400 shrink-0" />
                                  Supplier: <strong className="font-extrabold text-slate-600">{item.purchaseFrom}</strong>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-2.5">
                              <span className="inline-flex font-black tracking-wider text-[9px] uppercase bg-slate-150 text-slate-700 px-1.5 py-0.5 rounded border border-slate-250/20">
                                {item.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                              +{totalIn}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-700">
                              -{totalOut}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                                isLow 
                                  ? "bg-rose-50 text-rose-600 border border-rose-150" 
                                  : "bg-slate-50 text-slate-800 border border-slate-200"
                              }`}>
                                {item.quantity} Units
                              </span>
                              {isLow && (
                                <span className="block text-[8px] font-bold text-rose-500 uppercase mt-1 leading-none">Low Threshold ({item.minQuantity})</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                              {item.latestPurchasePrice !== undefined ? formatINR(item.latestPurchasePrice) : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900 bg-slate-50/10">
                              {formatINR(sumValue)}
                            </td>
                            <td className="py-2 px-3 text-center no-print" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setExpandedProductIds(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-755 border border-slate-250 text-[10px] font-black rounded transition-all cursor-pointer select-none"
                              >
                                {isExpanded ? "Hide Logs" : "View Logs"}
                              </button>
                            </td>
                          </tr>

                          {/* INLINE PRODUCT TRANSACTION HISTORY */}
                          {isExpanded && (
                            <tr className="bg-slate-50/70 border-b border-slate-250">
                              <td colSpan={9} className="p-3.5 pl-12 bg-slate-50/50">
                                <div className="space-y-2.5">
                                  <div className="flex items-center gap-1.5 font-bold uppercase text-[9.5px] text-slate-500 tracking-wider">
                                    <ClipboardList className="w-3.5 h-3.5 text-indigo-500" />
                                    Transaction Ledger Audit for {item.productName}
                                  </div>

                                  {itemLogs.length === 0 ? (
                                    <p className="text-[11px] italic text-slate-400 pl-5">No transaction movements registered for this specific asset.</p>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-3">
                                      {itemLogs.map(lg => (
                                        <div key={lg.id} className="bg-white p-2.5 rounded border border-slate-200 text-xs shadow-3xs hover:shadow-2xs transition-all flex justify-between items-start">
                                          <div className="min-w-0 pr-2">
                                            <div className="flex items-center gap-1.5 font-bold text-[11px]">
                                              <span className={lg.type === "IN" ? "text-emerald-700" : "text-rose-700"}>
                                                {lg.type === "IN" ? "STOCK RECEIVED" : "STOCK DESPATCHED"}
                                              </span>
                                              <span className="text-[8.5px] text-slate-400 font-mono font-normal">({formatDate(lg.date.split("T")[0])})</span>
                                            </div>
                                            
                                            <p className="text-[10.5px] text-slate-500 italic mt-0.5">"{lg.reason}"</p>
                                            
                                            {lg.type === "IN" && lg.supplierName && (
                                              <div className="mt-1 text-[9.5px] text-slate-600 bg-slate-100 px-1 py-0.5 rounded font-medium inline-block pr-1.5">
                                                Vendor: <strong className="font-extrabold">{lg.supplierName}</strong>
                                              </div>
                                            )}
                                            {lg.type === "OUT" && lg.customerName && (
                                              <div className="mt-1 text-[9.5px] text-slate-600 bg-slate-100 px-1 py-0.5 rounded font-medium inline-block pr-1.5">
                                                Client: <strong className="font-extrabold">{lg.customerName}</strong>
                                              </div>
                                            )}
                                          </div>
                                          <div className="text-right whitespace-nowrap">
                                            <div className="font-mono font-extrabold text-slate-800">{lg.type === "IN" ? `+ ${lg.quantity}` : `- ${lg.quantity}`} Units</div>
                                            <div className="text-[9.5px] text-slate-400 font-mono mt-0.5">Stock Shift: {lg.prevQty} ➔ {lg.newQty}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal Overlay */}
      {(adjustItem || isAdjustGeneralOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans">
          <form 
            onSubmit={handleAdjustmentSave}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
          >
            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                {adjustType === "IN" ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ArrowDownLeft className="w-4 h-4 text-rose-600" />
                )}
                Register Stock movement ({adjustType})
              </h3>
              <button 
                type="button"
                onClick={() => {
                  setAdjustItem(null);
                  setIsAdjustGeneralOpen(false);
                }}
                className="text-slate-400 hover:text-slate-650 font-extrabold select-none cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto">
              {/* Product selector if general quick adjustment */}
              {isAdjustGeneralOpen ? (
                <div>
                  <label className="block text-slate-550 font-bold mb-1 uppercase text-[9px] tracking-wide">Select Item from Registry *</label>
                  <select
                    required
                    value={generalItemId}
                    onChange={(e) => {
                      setGeneralItemId(e.target.value);
                      const selectedItem = inventory.find(i => i.id === e.target.value);
                      if (selectedItem) {
                        setAdjustItem(selectedItem);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 py-2.5 text-slate-800 font-sans focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose Stock Item --</option>
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.productName} [{item.sku}] - Available Qty: {item.quantity}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-150">
                  <span className="block text-[9px] text-slate-450 font-black uppercase tracking-wider mb-1">Target product</span>
                  <div className="text-xs font-black text-slate-850 leading-snug">{adjustItem?.productName}</div>
                  <div className="text-[10px] font-mono text-indigo-600 mt-0.5 font-bold">SKU: {adjustItem?.sku}</div>
                  <div className="text-[11px] text-slate-600 mt-2 pt-1 border-t border-slate-200/50 flex items-center justify-between">
                    <span>Available stock on hand:</span>
                    <strong className="text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded text-xs font-bold">{adjustItem?.quantity} Units</strong>
                  </div>
                </div>
              )}

              {/* Adjustment direction selection (mandatory if general) */}
              {isAdjustGeneralOpen && (
                <div>
                  <label className="block text-slate-550 font-bold mb-1 uppercase text-[9px] tracking-wide">Movement Type *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustType("IN")}
                      className={`py-2 rounded-lg border text-center font-bold text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        adjustType === "IN" 
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs scale-[0.99]" 
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" /> Stock IN (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType("OUT")}
                      className={`py-2 rounded-lg border text-center font-bold text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        adjustType === "OUT" 
                          ? "bg-rose-50 border-rose-300 text-rose-700 shadow-xs scale-[0.99]" 
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" /> Stock OUT (-)
                    </button>
                  </div>
                </div>
              )}

              {/* Dynamic Entity Supplier / Customer Input based on transaction type */}
              {adjustType === "IN" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-550 font-bold mb-1 uppercase text-[9px] tracking-wide">Supplier / Vendor Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Acme Tech Corp, Cisco Logistics India..."
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <p className="text-[9.5px] text-slate-400 mt-1">Specify which vendor/firm supplied these goods.</p>
                  </div>
                  <div>
                    <label className="block text-slate-550 font-bold mb-1 uppercase text-[9px] tracking-wide">Purchase Price Rate (₹, Optional)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Update newest stock purchase cost..."
                      value={adjustPurchasePrice}
                      onChange={(e) => setAdjustPurchasePrice(e.target.value ? Number(e.target.value) : "")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                    <p className="text-[9.5px] text-slate-400 mt-1">Will update the item's Latest Purchase Cost instantly.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-slate-550 font-bold mb-1 uppercase text-[9px] tracking-wide">Customer / Recipient Name *</label>
                  
                  {/* Select dropdown from existing Customer state */}
                  {customers.length > 0 && (
                    <select
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 hover:border-slate-350 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 font-sans cursor-pointer text-slate-750"
                    >
                      <option value="">-- Choose Registered Customer Profile --</option>
                      {customers.map((cust) => (
                        <option key={cust.id} value={cust.name}>
                          {cust.name} {cust.company ? `(${cust.company})` : ""}
                        </option>
                      ))}
                    </select>
                  )}

                  <input
                    required
                    type="text"
                    placeholder="Or type custom customer/recipient name..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[9.5px] text-slate-400">Specify which client entity or work site received these goods.</p>
                </div>
              )}

              {/* Adjustment numeric units */}
              <div>
                <label className="block text-slate-550 font-bold mb-1 uppercase text-[9px] tracking-wide">Quantity (Units) *</label>
                <input
                  required
                  type="number"
                  min="1"
                  placeholder="e.g. 5"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value ? Number(e.target.value) : "")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              {/* Adjustment Reason/Notes */}
              <div>
                <label className="block text-slate-550 font-bold mb-1 uppercase text-[9px] tracking-wide">Movement Memo / Reason *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Monthly procurement delivery, client project dispatch, hardware swap"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-705 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAdjustItem(null);
                  setIsAdjustGeneralOpen(false);
                }}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-655 rounded-lg font-bold cursor-pointer hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-5 py-2 text-white font-bold rounded-lg cursor-pointer shadow-sm transition-all hover:brightness-105 ${
                  adjustType === "IN" 
                    ? "bg-emerald-600 shadow-emerald-100" 
                    : "bg-rose-600 shadow-rose-100"
                }`}
              >
                Submit {adjustType === "IN" ? "Stock IN (+)" : "Stock OUT (-)"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
