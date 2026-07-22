/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Search, Plus, Trash2, Printer, ArrowLeft, Bus, Compass, ClipboardList, Mail } from "lucide-react";
import { DeliveryChallan, Customer, CompanySettings, DeliveryChallanItem, CompanyProfile } from "../types";
import { formatDate } from "../utils";
import { EmailModal } from "./EmailModal";

interface ChallanViewProps {
  challans: DeliveryChallan[];
  customers: Customer[];
  companySettings: CompanySettings;
  companyProfiles: CompanyProfile[];
  onUpdateCompanyProfiles?: (updated: CompanyProfile[]) => void;
  onUpdateChallans: (updated: DeliveryChallan[]) => void;
  activeCompanyId?: string;
}

export default function ChallanView({
  challans,
  customers,
  companySettings,
  companyProfiles,
  onUpdateCompanyProfiles,
  onUpdateChallans,
  activeCompanyId = ""
}: ChallanViewProps) {
  
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState(activeCompanyId || "All");

  React.useEffect(() => {
    if (activeCompanyId) {
      setCompanyFilter(activeCompanyId);
    }
  }, [activeCompanyId]);
  const [activeSubView, setActiveSubView] = useState<"list" | "detail" | "create">("list");
  const [activeChallanId, setActiveChallanId] = useState<string | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // Form states for creating DC
  const [formCompanyId, setFormCompanyId] = useState("");
  const [formChallanNo, setFormChallanNo] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formVehicleNo, setFormVehicleNo] = useState("");
  const [formTransporter, setFormTransporter] = useState("");
  const [formLrNumber, setFormLrNumber] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<DeliveryChallanItem[]>([
    { productName: "", quantity: 1, hsnCode: "", description: "" }
  ]);

  const selectChallan = (dcId: string) => {
    setActiveChallanId(dcId);
    setActiveSubView("detail");
  };

  const getDocCompanyProfile = (id?: string) => {
    const profile = companyProfiles.find(p => p.id === id);
    if (profile) return profile;
    return {
      id: "default",
      name: companySettings.name,
      email: companySettings.email,
      phone: companySettings.phone,
      address: companySettings.address,
      gstin: companySettings.gstin,
      pan: companySettings.pan,
      state: companySettings.state,
      bankName: companySettings.bankName,
      bankBranch: companySettings.bankBranch,
      accountNo: companySettings.accountNo,
      ifsc: companySettings.ifsc,
      headerImage: companySettings.headerImage,
      footerImage: companySettings.footerImage,
      termsPresets: [],
      enableGst: companySettings.enableGst
    };
  };

  const getSelectedChallan = (): DeliveryChallan | undefined => {
    return challans.find(c => c.id === activeChallanId);
  };

  const generateNewChallanNo = (profileId?: string): string => {
    const pId = profileId || formCompanyId;
    const profile = companyProfiles.find(p => p.id === pId);
    const prefix = profile?.challanPrefix || companySettings.challanPrefix || "DC";
    const year = new Date().getFullYear();
    const financialYear = `${year}-${String(year + 1).slice(2)}`;
    
    // Get sequence count
    let nextNum = 1;
    if (profile && profile.nextChallanNumber !== undefined) {
      nextNum = profile.nextChallanNumber;
    } else if (companySettings.nextChallanNumber !== undefined) {
      nextNum = companySettings.nextChallanNumber;
    } else {
      nextNum = challans.length + 1;
    }

    let candidate = `${prefix}/${financialYear}/${String(nextNum).padStart(3, "0")}`;
    while (challans.some(c => c.challanNo.toUpperCase().trim() === candidate.toUpperCase().trim())) {
      nextNum++;
      candidate = `${prefix}/${financialYear}/${String(nextNum).padStart(3, "0")}`;
    }

    return candidate;
  };

  const openCreateForm = () => {
    const initialCompanyId = companyProfiles.find(p => p.id === activeCompanyId)?.id || companyProfiles.find(p => p.isDefault)?.id || companyProfiles[0]?.id || "default";
    setFormCompanyId(initialCompanyId);
    setFormChallanNo(generateNewChallanNo(initialCompanyId));
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormCustomerId(customers[0]?.id || "");
    setFormVehicleNo("");
    setFormTransporter("");
    setFormLrNumber("");
    setFormAddress(customers[0]?.shippingAddress || "");
    setFormNotes("");
    setFormItems([{ productName: "", quantity: 1, hsnCode: "", description: "" }]);
    setActiveSubView("create");
  };

  const handleCompanyChange = (compId: string) => {
    setFormCompanyId(compId);
    setFormChallanNo(generateNewChallanNo(compId));
  };

  const handleCustomerChange = (custId: string) => {
    setFormCustomerId(custId);
    const cust = customers.find(c => c.id === custId);
    if (cust) {
      setFormAddress(cust.shippingAddress);
    }
  };

  const addFormItemRow = () => {
    setFormItems([...formItems, { productName: "", quantity: 1, hsnCode: "", description: "" }]);
  };

  const removeFormItemRow = (index: number) => {
    if (formItems.length === 1) return;
    const upd = [...formItems];
    upd.splice(index, 1);
    setFormItems(upd);
  };

  const handleItemValueChange = (index: number, field: keyof DeliveryChallanItem, val: any) => {
    const upd = [...formItems];
    upd[index] = { ...upd[index], [field]: val };
    setFormItems(upd);
  };

  const saveChallan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerId) {
      alert("Please select a customer first.");
      return;
    }
    if (formItems.some(i => !i.productName || i.quantity <=0 )) {
      alert("Please complete the item descriptions with positive quantities.");
      return;
    }

    // Check for duplicate challan number
    const targetChallanNo = formChallanNo.toUpperCase().trim();
    const duplicate = challans.find(c => c.challanNo.toUpperCase().trim() === targetChallanNo);
    if (duplicate) {
      alert(`Error: A Delivery Challan with the number "${formChallanNo}" already exists in the system. Please provide a unique number.`);
      return;
    }

    const newChallan: DeliveryChallan = {
      id: "dc_" + Date.now(),
      challanNo: formChallanNo,
      date: formDate,
      customerId: formCustomerId,
      items: formItems,
      vehicleNo: formVehicleNo,
      transporter: formTransporter,
      lrNumber: formLrNumber,
      dispatchAddress: formAddress,
      status: "Dispatched",
      notes: formNotes,
      companyId: formCompanyId
    };

    // Increment company serial index counter for delivery challan
    if (companyProfiles && onUpdateCompanyProfiles && formCompanyId) {
      const profile = companyProfiles.find(p => p.id === formCompanyId);
      let nextNum = (profile?.nextChallanNumber || 1) + 1;
      
      const match = formChallanNo.match(/\/(\d+)$/);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed) && parsed >= (profile?.nextChallanNumber || 1)) {
          nextNum = parsed + 1;
        }
      }

      const updatedProfiles = companyProfiles.map(p => {
        if (p.id === formCompanyId) {
          return {
            ...p,
            nextChallanNumber: nextNum
          };
        }
        return p;
      });
      onUpdateCompanyProfiles(updatedProfiles);
    }

    onUpdateChallans([newChallan, ...challans]);
    setActiveSubView("list");
  };

  const deleteChallan = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this delivery challan permanently?")) {
      const updated = challans.filter(c => c.id !== id);
      onUpdateChallans(updated);
      if (activeChallanId === id) {
        setActiveSubView("list");
      }
    }
  };

  const filteredChallans = challans.filter((c) => {
    const client = customers.find(cust => cust.id === c.customerId);
    const compName = client ? client.company : "";
    const matchesSearch = (
      (c.challanNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.vehicleNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.transporter || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (compName || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesCompany = companyFilter === "All" || c.companyId === companyFilter;
    return matchesSearch && matchesCompany;
  });

  return (
    <div className="space-y-6" id="delivery-challans-workspace">
      {/* 1. LIST */}
      {activeSubView === "list" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Delivery Challans</h2>
              <p className="text-xs text-slate-500">Dispatch and monitor transport consignment logs with regulatory legal descriptors</p>
            </div>
            <button
              onClick={openCreateForm}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer transition-colors shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Generate Challan
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-4 bg-white p-3.5 rounded-xl border border-slate-200 font-sans shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Challan No, transporter, vehicle registration or destination..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400 focus:border-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Company:</span>
              <select
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 max-w-[200px]"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
              >
                <option value="All">All Companies</option>
                {companyProfiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Challans Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-5">Challan Code</th>
                    <th className="py-3.5 px-5">Receiving Company</th>
                    <th className="py-3.5 px-5">Dispatch Date</th>
                    <th className="py-3.5 px-5">Transport & Log Details</th>
                    <th className="py-3.5 px-5 text-center">Status</th>
                    <th className="py-3.5 px-5 text-center">Action Workflow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {filteredChallans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                        No delivery challan records logged in this session. Create a new challan to begin!
                      </td>
                    </tr>
                  ) : (
                    filteredChallans.map((c) => {
                      const client = customers.find(cust => cust.id === c.customerId);
                      return (
                        <tr 
                          key={c.id} 
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => selectChallan(c.id)}
                        >
                          <td className="py-3 px-5 font-bold font-mono text-slate-900 text-sm">
                            {c.challanNo}
                          </td>
                          <td className="py-3 px-5">
                            <div className="font-bold text-slate-850">
                              {client ? client.company : "N/A"}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              Attn: {client ? client.name : "N/A"}
                            </div>
                          </td>
                          <td className="py-3 px-5 font-semibold">
                            {formatDate(c.date)}
                          </td>
                          <td className="py-3 px-5">
                            <div className="font-medium text-slate-700">{c.transporter || "Self-Transport"}</div>
                            <div className="text-[10px] text-indigo-600 font-mono font-bold mt-0.5">
                              {c.vehicleNo ? `Vehicle: ${c.vehicleNo}` : "No Vehicle specified"} {c.lrNumber ? `| LR: ${c.lrNumber}` : ""}
                            </div>
                          </td>
                          <td className="py-3 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full text-[9px] font-bold">
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => deleteChallan(c.id, e)}
                              className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 cursor-pointer text-xs transition-colors"
                            >
                              Delete
                            </button>
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

      {/* 2. FORM VIEW */}
      {activeSubView === "create" && (
        <form onSubmit={saveChallan} className="space-y-6 max-w-5xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveSubView("list")}
              className="p-1 px-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4 inline" /> Back
            </button>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Generate Delivery Challan</h3>
              <p className="text-xs text-slate-500">Record physical stock relocation, hardware shipping or sample delivery</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-sans">
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Issuing Company</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                value={formCompanyId}
                onChange={(e) => handleCompanyChange(e.target.value)}
              >
                <option value="default">{companySettings.name} (Default)</option>
                {companyProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Challan Number</label>
              <input
                type="text"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                value={formChallanNo}
                onChange={(e) => setFormChallanNo(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Dispatch Date</label>
              <input
                type="date"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Consignee Customer</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                value={formCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company} (Attn: {c.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-sans">
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Vehicle Number</label>
              <input
                type="text"
                placeholder="e.g. MH-12-PQ-9244"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                value={formVehicleNo}
                onChange={(e) => setFormVehicleNo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Transporter Name</label>
              <input
                type="text"
                placeholder="e.g. SafeExpress India"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                value={formTransporter}
                onChange={(e) => setFormTransporter(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Lorry Receipt / LR Number</label>
              <input
                type="text"
                placeholder="e.g. LRN-8293819"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                value={formLrNumber}
                onChange={(e) => setFormLrNumber(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Delivery Shipping Address</label>
            <textarea
              rows={2}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
            />
          </div>

          {/* Items detailed checklist */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-sm font-bold text-slate-900 uppercase">Consignment Stock Items</span>
              <button
                type="button"
                onClick={addFormItemRow}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 cursor-pointer transition-colors"
              >
                + Add Stock Row
              </button>
            </div>

            <div className="space-y-3 font-sans">
              {formItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-slate-50/50 rounded-xl border border-slate-200 items-end">
                  <div className="md:col-span-4">
                    <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Item / Product Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Intel Hardware Router Support module"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                      value={item.productName}
                      onChange={(e) => handleItemValueChange(idx, "productName", e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Quantity</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 text-center"
                      value={item.quantity}
                      onChange={(e) => handleItemValueChange(idx, "quantity", parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">HSN Code</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                      value={item.hsnCode}
                      onChange={(e) => handleItemValueChange(idx, "hsnCode", e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Specific Description</label>
                    <input
                      type="text"
                      placeholder="Serial numbers etc."
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-805"
                      value={item.description}
                      onChange={(e) => handleItemValueChange(idx, "description", e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-1 text-center">
                    <button
                      type="button"
                      disabled={formItems.length === 1}
                      onClick={() => removeFormItemRow(idx)}
                      className="p-1 px-2 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-lg text-xs cursor-pointer transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Logistics & Dispatch Notes</label>
            <textarea
              rows={3}
              placeholder="e.g. Ensure physical delivery verification document is stamped on delivery destination."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setActiveSubView("list")}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 pointer-events-auto transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-sm cursor-pointer transition-colors"
            >
              Save Dispatch Challan
            </button>
          </div>
        </form>
      )}

      {/* 3. DETAIL VIEW PRINT */}
      {activeSubView === "detail" && (
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm gap-4">
            <button
              onClick={() => setActiveSubView("list")}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-bold uppercase tracking-wider cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 text-indigo-500" /> Back to log
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEmailModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs border border-blue-200 cursor-pointer transition-colors"
              >
                <Mail className="w-4 h-4" /> Email Document
              </button>
              <button
                onClick={() => {
                  const dc = getSelectedChallan();
                  if (dc) {
                    const client = customers.find(c => c.id === dc.customerId);
                    const customerName = client?.company || client?.name || "Customer";
                    const documentName = dc.challanNo || "CHALLAN";
                    const originalTitle = document.title;
                    document.title = `${customerName.replace(/[^a-z0-9]/gi, '_')}_${documentName.toUpperCase().replace(/[^a-z0-9]/gi, '_')}`;
                    window.print();
                    document.title = originalTitle;
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
            </div>
          </div>

          {(() => {
            const dc = getSelectedChallan();
            if (!dc) return <div className="text-white">Loading challan details...</div>;
            const compProfile = getDocCompanyProfile(dc.companyId);
            const client = customers.find(c => c.id === dc.customerId);

            return (
              <div 
                className="bg-white text-slate-900 p-8 sm:p-12 rounded-xl border border-slate-300 shadow-xl space-y-8 flex flex-col font-sans max-w-4xl mx-auto ring-1 ring-black/5 min-h-[100vh] print:min-h-[100vh]" 
                id="printable-area-container"
              >
                <style dangerouslySetInnerHTML={{__html: `
                  @page {
                    margin: 0;
                  }
                  @media print {
                    body { -webkit-print-color-adjust: exact; zoom: 100%; }
                    body * { visibility: hidden; background-color: white !important; color: black !important; }
                    #printable-area-container, #printable-area-container * { visibility: visible; }
                    #printable-area-container { position: absolute; left: 0; top: 0; width: 100% !important; border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; }
                  }
                `}} />

                {/* Optional Header Image / Graphic */}
                <table className="w-full border-collapse">
                  {compProfile.headerImage && (
                    <thead className="hidden print:table-header-group">
                      <tr>
                        <td className="p-0 border-none">
                          <div className="print:pl-[0.50in] print:pr-[0.30in] w-full pb-6">
                            <img 
                              src={compProfile.headerImage} 
                              alt="Corporate Header Banner" 
                              className="w-full h-auto" 
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </td>
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    <tr className="page-break-inside-auto">
                      <td className="p-0 border-none h-full align-top page-break-inside-auto">
                        <div className="print:pl-[0.50in] print:pr-[0.30in] space-y-8 flex-grow w-full">
                          {/* Corporate Letterhead */}
                          {compProfile.headerImage && (
                            <div className="w-full flex flex-col items-center mb-4 print:hidden">
                              <img 
                                src={compProfile.headerImage} 
                                alt="Corporate Header Banner" 
                                className="w-full h-auto" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                          {/* If header graphic was used, show Doc summary strip block below it */}
                          {compProfile.headerImage && (
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-2.5 px-4 bg-slate-50 rounded-lg border border-slate-150 gap-4 text-xs font-sans mb-6">
                              <div>
                                <span className="text-slate-450 font-bold uppercase text-[9px] tracking-wider block">Corporate Delivery Challan for</span>
                                <span className="font-bold text-slate-800 text-sm">{client?.company || "N/A"}</span>
                              </div>
                              <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-slate-650">
                                <div>Challan #: <span className="font-bold text-slate-900 font-mono">{dc.challanNo}</span></div>
                                <div>Dated: <span className="font-bold text-slate-900">{formatDate(dc.date)}</span></div>
                                <div>Status: <span className="font-bold uppercase">{dc.status}</span></div>
                              </div>
                            </div>
                          )}


                {/* Logistics table details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg text-xs border border-slate-100 text-left">
                  <div>
                    <div className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-0.5">Transporter</div>
                    <div className="font-bold text-slate-800">{dc.transporter || "Self Transport"}</div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-0.5">Vehicle Number</div>
                    <div className="font-bold text-slate-800 font-mono">{dc.vehicleNo || "N/A"}</div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-0.5">Lorry Receipt / LR Number</div>
                    <div className="font-bold text-indigo-700 font-mono">{dc.lrNumber || "N/A"}</div>
                  </div>
                </div>

                {/* Shipping locations address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs text-left leading-relaxed mb-0 pb-0">
                  <div>
                    <h3 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mb-1">Company Details (Sender)</h3>
                    <div className="font-bold text-slate-800">{compProfile.name}</div>
                    <div>GSTIN Code: <span className="font-semibold font-mono">{compProfile.gstin}</span></div>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mb-1">Deliver To (Consignee)</h3>
                    <div className="font-bold text-slate-850">{client?.company || "N/A"}</div>
                    <div className="text-slate-600 leading-normal whitespace-pre-line bg-[#f8fafc]/50 p-3 rounded border border-dashed mt-1.5 border-slate-200">
                      {dc.dispatchAddress || client?.shippingAddress}
                    </div>
                    <div className="mt-1.5">Receiver GSTIN: <span className="font-semibold font-mono">{client?.gstin || "URD"}</span></div>
                  </div>
                </div>

                {/* Solid spacer of exactly 0.25 inches */}
                <div style={{ height: "0.25in" }} className="w-full clear-both select-none pointer-events-none" />

                {/* Items checklist */}
                <div className="overflow-x-auto ring-1 ring-slate-150 rounded-lg mt-0 mb-8">
                  <table className="w-full text-left text-xs text-slate-700 min-w-[600px] border-collapse bg-transparent">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase text-[9px] font-black tracking-wider text-left">
                        <th className="py-3 px-4 text-center">#</th>
                        <th className="py-3 px-4">Descriptions of Stock Shipped</th>
                        <th className="py-3 px-4 text-center">HSN Code</th>
                        <th className="py-3 px-4 text-center">Quantity (Units)</th>
                        <th className="py-3 px-6">Consignment Details / Marks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 text-left">
                      {dc.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 text-center font-bold text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            <div>{item.productName}</div>
                            {item.description && (
                              <div className="text-[10px] text-slate-500 font-normal leading-relaxed whitespace-pre-wrap mt-0.5">
                                {item.description}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            {item.hsnCode || "-"}
                          </td>
                          <td className="py-3 px-4 text-center font-black font-mono text-slate-800">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-6 text-slate-500 whitespace-nowrap leading-tight text-[11px]">
                            {item.description || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Notes and sign-offs */}
                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-left text-[11px] leading-relaxed page-break-inside-avoid">
                  <div className="space-y-2 text-[#5c657a]">
                    <div className="font-bold text-[#3e485e] uppercase tracking-wider text-[10px] select-none mb-3">Logistical declaration & guidelines</div>
                    <div className="whitespace-pre-line leading-relaxed">
                      {dc.notes || "This delivery challan acts purely as a non-commercial dispatch receipt representing items shipped for relocation. No financial transactions or commercial collections are registered on this document."}
                    </div>
                  </div>
                  
                  {/* Delivery signoff */}
                  <div className="text-right space-y-4 select-none flex flex-col items-end">
                    <div className="font-semibold text-[13px] text-[#3e485e]">
                      For {compProfile.name}
                    </div>
                    
                    {compProfile.signatureImage && (
                      <div className="w-full flex items-end justify-end mt-4">
                        <img 
                          src={compProfile.signatureImage} 
                          alt="Authorized Signature" 
                          className="max-h-[80px] max-w-full object-contain mix-blend-multiply" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>
                </div>

                </div>
                      </td>
                    </tr>
                  </tbody>

                  {compProfile.footerImage && (
                    <tfoot className="hidden print:table-footer-group">
                      <tr>
                        <td className="p-0 border-none">
                          {/* Reserve exact space for the fixed footer on print */}
                          <div style={{ height: "1.1in" }} className="w-full clear-both" />
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>

                {/* For Print: Fixed at the very bottom of every page */}
                {compProfile.footerImage && (
                  <div className="hidden print:block" style={{ position: "fixed", bottom: "0.4in", left: "0.50in", right: "0.30in", zIndex: 50 }}>
                    <img
                      src={compProfile.footerImage}
                      alt="Official Stamp"
                      className="w-full h-auto object-contain mix-blend-multiply block"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* For Screen View: Render at the end of the document content */}
                {compProfile.footerImage && (
                  <div className="w-full pt-8 mt-12 print:hidden">
                    <img
                      src={compProfile.footerImage}
                      alt="Official Stamp"
                      className="w-full h-auto object-contain mix-blend-multiply block"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
      
      {activeChallanId && (
        <EmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          documentName={`${customers.find(c => c.id === getSelectedChallan()?.customerId)?.company?.replace(/[^a-zA-Z0-9]/g, '_') || 'Customer'}_${getSelectedChallan()?.challanNo || 'Challan'}`}
          customerEmail={customers.find(c => c.id === getSelectedChallan()?.customerId)?.email || ''}
          defaultSubject={`Delivery Challan ${getSelectedChallan()?.challanNo} from ${companyProfiles.find(p => p.id === getSelectedChallan()?.companyId)?.name || 'Us'}`}
          defaultBody={`Dear ${customers.find(c => c.id === getSelectedChallan()?.customerId)?.name || 'Customer'},\n\nPlease find attached the delivery challan ${getSelectedChallan()?.challanNo}.\n\nThank you for your business!`}
        />
      )}
    </div>
  );
}
