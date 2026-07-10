/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Search, Plus, Trash2, Edit2, Package, Layers, ShieldCheck } from "lucide-react";
import { Product } from "../types";
import { formatINR } from "../utils";

interface ProductViewProps {
  products: Product[];
  onUpdateProducts: (updated: Product[]) => void;
}

export default function ProductView({
  products,
  onUpdateProducts
}: ProductViewProps) {
  
  const [searchTerm, setSearchTerm] = useState("");

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState<"create" | "edit">("create");
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formRate, setFormRate] = useState("");
  const [formGst, setFormGst] = useState<number>(18);
  const [formHsn, setFormHsn] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formItemType, setFormItemType] = useState<"Product" | "Service" | "Agreement">("Product");
  const [formMrp, setFormMrp] = useState("");
  const [formLastPurchasePrice, setFormLastPurchasePrice] = useState("");
  const [formSellPrice, setFormSellPrice] = useState("");

  const resetForm = () => {
    setFormName("");
    setFormSku("");
    setFormRate("");
    setFormGst(18);
    setFormHsn("");
    setFormDesc("");
    setFormItemType("Product");
    setFormMrp("");
    setFormLastPurchasePrice("");
    setFormSellPrice("");
    setActiveProductId(null);
  };

  const openCreateForm = () => {
    resetForm();
    setFormType("create");
    setIsFormOpen(true);
  };

  const openEditForm = (prod: Product) => {
    setFormType("edit");
    setActiveProductId(prod.id);
    setFormName(prod.name);
    setFormSku(prod.sku);
    setFormRate(String(prod.rate));
    setFormGst(prod.gstRate);
    setFormHsn(prod.hsnCode || "");
    setFormDesc(prod.description);
    setFormItemType(prod.itemType || "Product");
    setFormMrp(prod.mrp !== undefined ? String(prod.mrp) : "");
    setFormLastPurchasePrice(prod.lastPurchasePrice !== undefined ? String(prod.lastPurchasePrice) : "");
    setFormSellPrice(prod.sellPrice !== undefined ? String(prod.sellPrice) : "");
    setIsFormOpen(true);
  };

  const saveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formSku) {
      alert("Please provide both name and unique SKU.");
      return;
    }

    const price = parseFloat(formRate) || 0;
    const mrpValue = formMrp ? parseFloat(formMrp) : undefined;
    const lastPurchaseValue = formLastPurchasePrice ? parseFloat(formLastPurchasePrice) : undefined;
    const sellPriceValue = formSellPrice ? parseFloat(formSellPrice) : undefined;

    // If sellPriceValue is provided but rate is 0/empty, let rate equal sellPriceValue to fallback gracefully
    const finalRate = sellPriceValue !== undefined && price === 0 ? sellPriceValue : price;

    if (formType === "create") {
      const nw: Product = {
        id: "prod_" + Date.now(),
        name: formName,
        sku: formSku.toUpperCase().trim(),
        rate: finalRate,
        gstRate: formGst,
        hsnCode: formHsn,
        description: formDesc,
        itemType: formItemType,
        mrp: mrpValue,
        lastPurchasePrice: lastPurchaseValue,
        sellPrice: sellPriceValue
      };
      onUpdateProducts([...products, nw]);
    } else {
      const upd = products.map(p => {
        if (p.id === activeProductId) {
          return {
            ...p,
            name: formName,
            sku: formSku.toUpperCase().trim(),
            rate: finalRate,
            gstRate: formGst,
            hsnCode: formHsn,
            description: formDesc,
            itemType: formItemType,
            mrp: mrpValue,
            lastPurchasePrice: lastPurchaseValue,
            sellPrice: sellPriceValue
          };
        }
        return p;
      });
      onUpdateProducts(upd);
    }
    setIsFormOpen(false);
    resetForm();
  };

  const deleteProduct = (id: string) => {
    if (confirm("Are you sure you want to delete this catalog item permanently? Documents referencing it won't be broken, but it will be removed from manual options.")) {
      const upd = products.filter(p => p.id !== id);
      onUpdateProducts(upd);
    }
  };

  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase();
    const typeLabel = (p.itemType || "Product").toLowerCase();
    return (
      (p.name || "").toLowerCase().includes(term) ||
      (p.sku || "").toLowerCase().includes(term) ||
      (p.hsnCode || "").toLowerCase().includes(term) ||
      (p.description || "").toLowerCase().includes(term) ||
      typeLabel.includes(term)
    );
  });

  return (
    <div className="space-y-6" id="products-view-panel">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-905 tracking-tight">Products, Services & Agreements</h2>
          <p className="text-xs text-slate-500">Configure pre-set products, custom services, maintenance retainers, and SLA agreements with standard pricing, HSN/SAC codes, and GST categories</p>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Item / Service / Agreement
        </button>
      </div>

      {/* FILTER SEARCH BAR */}
      <div className="flex bg-white p-3.5 rounded-xl border border-slate-200 font-sans shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SKU, name, registry type (Product/Service/Agreement), HSN/SAC classification code, etc..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* DYNAMICS CONTAINER SPLIT */}
      <div className={`grid grid-cols-1 ${isFormOpen ? "lg:grid-cols-4 gap-6" : ""} font-sans`}>
        {/* Lists column */}
        <div className={`${isFormOpen ? "lg:col-span-3" : ""} space-y-4`}>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm font-sans font-medium">
                No catalog items match your search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] text-slate-705 border-collapse border border-slate-300 [&_th]:border [&_th]:border-slate-300 [&_td]:border [&_td]:border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase text-[9px] font-black tracking-wider border-b border-slate-300">
                      <th className="py-1.5 px-2 text-center w-12 bg-slate-50">#</th>
                      <th className="py-1.5 px-2 w-24 bg-slate-50">Type</th>
                      <th className="py-1.5 px-2 w-28 bg-slate-50">SKU / Code</th>
                      <th className="py-1.5 px-2 bg-slate-50">Name & Description</th>
                      <th className="py-1.5 px-2 text-right w-24 bg-slate-50">MRP (₹)</th>
                      <th className="py-1.5 px-2 text-right w-24 bg-slate-50">Last Purchase (₹)</th>
                      <th className="py-1.5 px-2 text-right w-24 bg-slate-50">Selling Price (₹)</th>
                      <th className="py-1.5 px-2 text-right w-24 bg-slate-50">Rate / Base (₹)</th>
                      <th className="py-1.5 px-2 text-center w-20 bg-slate-50">GST Rate</th>
                      <th className="py-1.5 px-2 text-center w-24 bg-slate-50">HSN / SAC</th>
                      <th className="py-1.5 px-2 text-center w-20 bg-slate-50">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-650">
                    {filteredProducts.map((p, idx) => {
                      const type = p.itemType || "Product";
                      let typeBadge = (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-750 border border-blue-100 uppercase">
                          Product
                        </span>
                      );
                      if (type === "Service") {
                        typeBadge = (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-100 uppercase">
                            Service
                          </span>
                        );
                      } else if (type === "Agreement") {
                        typeBadge = (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-50 text-purple-700 border border-purple-100 uppercase">
                            Agreement
                          </span>
                        );
                      }

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-1.5 px-2 text-center font-bold text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-2">
                            {typeBadge}
                          </td>
                          <td className="py-1.5 px-2 font-mono font-bold text-slate-800 tracking-wide">
                            {p.sku}
                          </td>
                          <td className="py-1.5 px-2 max-w-xs">
                            <div className="font-extrabold text-slate-900 text-xs">{p.name}</div>
                            {p.description && (
                              <div className="text-slate-450 mt-0.5 text-[10px] line-clamp-1 italic" title={p.description}>
                                {p.description}
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-medium text-slate-600 text-xs">
                            {p.mrp !== undefined ? formatINR(p.mrp) : "-"}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-medium text-slate-600 text-xs">
                            {p.lastPurchasePrice !== undefined ? formatINR(p.lastPurchasePrice) : "-"}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-extrabold text-emerald-700 text-xs">
                            {p.sellPrice !== undefined ? formatINR(p.sellPrice) : "-"}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-950 text-xs">
                            {formatINR(p.rate)}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono font-bold text-indigo-650">
                            {p.gstRate}%
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono text-slate-700 font-medium font-bold">
                            {p.hsnCode || "-"}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditForm(p)}
                                className="p-1 px-1.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-655 border border-slate-200 hover:border-slate-350 transition-colors cursor-pointer"
                                title="Amend details"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteProduct(p.id)}
                                className="p-1 px-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-655 border border-rose-100 hover:border-rose-250 transition-colors cursor-pointer"
                                title="Delete entry"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Create / Edit Form Column (1 Col) */}
        <div className="lg:col-span-1">
          {isFormOpen ? (
            <form onSubmit={saveProduct} className="p-4 bg-white rounded-xl border border-slate-200 space-y-3.5 text-xs shadow-sm shadow-slate-100/50">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-705 uppercase tracking-wider">
                  {formType === "create" ? "Add Item Registry" : "Amend Item Details"}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold select-none cursor-pointer"
                >
                  CLOSE
                </button>
              </div>

              <div>
                <label className="block text-slate-505 font-bold mb-1 uppercase text-[9px] tracking-wide">Registry Type</label>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                  {(["Product", "Service", "Agreement"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormItemType(t)}
                      className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-all ${
                        formItemType === t
                          ? "bg-white text-indigo-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-505 font-bold mb-1 uppercase text-[9px] tracking-wide">Item Title / Service Spec</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cisco Security Managed Firewall"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-500"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-505 font-bold mb-1 uppercase text-[9px] tracking-wide">Unique Stock Code / SKU</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INFRA-CSCO-FW"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 uppercase font-mono focus:outline-none focus:border-indigo-500"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-505 font-bold mb-1 uppercase text-[9px] tracking-wide">Base Rate / Quote (INR)</label>
                  <input
                    type="number"
                    required
                    placeholder="Rate ₹"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-mono focus:outline-none focus:border-indigo-500"
                    value={formRate}
                    onChange={(e) => setFormRate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-505 font-bold mb-1 uppercase text-[9px] tracking-wide font-sans">Tax Category (GST %)</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-500"
                    value={formGst}
                    onChange={(e) => setFormGst(parseInt(e.target.value) || 18)}
                  >
                    <option value="0">0% (Nil Exemption)</option>
                    <option value="5">5% SGST/CGST</option>
                    <option value="12">12% SGST/CGST</option>
                    <option value="18">18% Standard GST</option>
                    <option value="28">28% Premium GST</option>
                  </select>
                </div>
              </div>

              {/* Optional Pricing Parameters */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-150">
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[8px] tracking-tight">MRP (Optional)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="MRP ₹"
                    className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] text-slate-800 font-mono focus:outline-none focus:border-indigo-500"
                    value={formMrp}
                    onChange={(e) => setFormMrp(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[8px] tracking-tight" title="Last Purchase Price">Purchase (Opt)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Buy ₹"
                    className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] text-slate-800 font-mono focus:outline-none focus:border-indigo-500"
                    value={formLastPurchasePrice}
                    onChange={(e) => setFormLastPurchasePrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[8px] tracking-tight">Sell Price (Opt)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Sell ₹"
                    className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] text-slate-800 font-mono focus:outline-none focus:border-indigo-500"
                    value={formSellPrice}
                    onChange={(e) => setFormSellPrice(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-550 font-bold mb-1 uppercase text-[9px] tracking-wide">HSN Code / SAC Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 998313 (Services) or 851762"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-mono focus:outline-none focus:border-indigo-500"
                  value={formHsn}
                  onChange={(e) => setFormHsn(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-550 font-bold mb-1 uppercase text-[9px] tracking-wide">Scope Details</label>
                <textarea
                  rows={4}
                  placeholder="Draft deep specifications of product metrics..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-500 leading-normal"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg text-center font-bold hover:bg-indigo-700 cursor-pointer shadow-sm transition-all"
                >
                  Save Entry
                </button>
              </div>
            </form>
          ) : (
            <div className="p-5 bg-white rounded-xl border border-slate-200 text-center py-10 space-y-4 shadow-sm shadow-slate-100/50">
              <Layers className="w-8 h-8 text-indigo-400 mx-auto" />
              <div>
                <span className="font-bold text-slate-900 text-sm block">Tax Compliant Preset Catalogues</span>
                <p className="text-slate-400 text-xs mt-1.5 leading-relaxed font-sans">
                  Pre-defining HSN codes eliminates compilation mistakes during corporate tax filing or invoicing cycles.
                </p>
              </div>
              <button
                onClick={openCreateForm}
                className="mx-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-indigo-700 text-xs font-bold rounded-lg border border-slate-200 cursor-pointer transition-colors"
              >
                + Register Item Catalog
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
