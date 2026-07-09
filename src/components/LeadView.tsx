/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Search, Plus, Trash2, Edit3, ArrowRight, UserPlus, Coins, Info } from "lucide-react";
import { Lead, Customer } from "../types";
import { formatINR, formatDate } from "../utils";

interface LeadViewProps {
  leads: Lead[];
  customers: Customer[];
  onUpdateLeads: (updated: Lead[]) => void;
  onNavigateToQuotation: () => void;
}

export default function LeadView({
  leads,
  customers,
  onUpdateLeads,
  onNavigateToQuotation
}: LeadViewProps) {
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Form toggles
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState<"create" | "edit">("create");
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);

  // Form Fields
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formName, setFormName] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formStatus, setFormStatus] = useState<Lead["status"]>("New");
  const [formConversionStatus, setFormConversionStatus] = useState<"Cold" | "Warm" | "Hot" | "Converted">("Cold");
  const [formSource, setFormSource] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const resetForm = () => {
    setFormCustomerId("");
    setFormName("");
    setFormCompany("");
    setFormEmail("");
    setFormPhone("");
    setFormValue("");
    setFormStatus("New");
    setFormConversionStatus("Cold");
    setFormSource("");
    setFormNotes("");
    setActiveLeadId(null);
  };

  const openCreateForm = () => {
    resetForm();
    setFormType("create");
    setIsFormOpen(true);
  };

  const openEditForm = (lead: Lead) => {
    setFormType("edit");
    setActiveLeadId(lead.id);
    setFormCustomerId(lead.customerId || "");
    setFormName(lead.name || "");
    setFormCompany(lead.company || "");
    setFormEmail(lead.email || "");
    setFormPhone(lead.phone || "");
    setFormValue(lead.value !== undefined && lead.value !== null ? String(lead.value) : "0");
    setFormStatus(lead.status || "New");
    setFormConversionStatus(lead.conversionStatus || 
      (lead.status === "Won" ? "Converted" : 
       lead.status === "Proposal Sent" ? "Hot" : 
       (lead.status === "Qualified" || lead.status === "Contacted") ? "Warm" : "Cold")
    );
    setFormSource(lead.source || "Website");
    setFormNotes(lead.notes || "");
    setIsFormOpen(true);
  };

  const saveLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCompany) {
      alert("Name and Company name are required.");
      return;
    }

    const numericalValue = parseFloat(formValue) || 0;

    if (formType === "create") {
      const nw: Lead = {
        id: "lead_" + Date.now(),
        customerId: formCustomerId || undefined,
        name: formName,
        company: formCompany,
        email: formEmail,
        phone: formPhone,
        value: numericalValue,
        status: formStatus,
        conversionStatus: formConversionStatus,
        source: formSource,
        notes: formNotes,
        date: new Date().toISOString().split("T")[0]
      };
      onUpdateLeads([nw, ...leads]);
    } else {
      const upd = leads.map(l => {
        if (l.id === activeLeadId) {
          return {
            ...l,
            customerId: formCustomerId || undefined,
            name: formName,
            company: formCompany,
            email: formEmail,
            phone: formPhone,
            value: numericalValue,
            status: formStatus,
            conversionStatus: formConversionStatus,
            source: formSource,
            notes: formNotes
          };
        }
        return l;
      });
      onUpdateLeads(upd);
    }
    setIsFormOpen(false);
    resetForm();
  };

  const deleteLead = (id: string) => {
    if (confirm("Are you sure you want to delete this lead from system archives?")) {
      const upd = leads.filter(l => l.id !== id);
      onUpdateLeads(upd);
    }
  };

  const updateLeadStatusDirectly = (id: string, stage: Lead["status"]) => {
    const upd = leads.map(l => {
      if (l.id === id) {
        const autoTemp = 
          stage === "Won" ? "Converted" : 
          stage === "Proposal Sent" ? "Hot" : 
          (stage === "Qualified" || stage === "Contacted") ? "Warm" : "Cold";
        return { 
          ...l, 
          status: stage,
          conversionStatus: autoTemp as "Cold" | "Warm" | "Hot" | "Converted"
        };
      }
      return l;
    });
    onUpdateLeads(upd);
  };

  const updateLeadConversionStatusDirectly = (id: string, stage: "Cold" | "Warm" | "Hot" | "Converted") => {
    const upd = leads.map(l => {
      if (l.id === id) {
        return { ...l, conversionStatus: stage };
      }
      return l;
    });
    onUpdateLeads(upd);
  };

  const getConversionDetails = (l: Lead) => {
    const status = l.conversionStatus || 
      (l.status === "Won" ? "Converted" : 
       l.status === "Proposal Sent" ? "Hot" : 
       (l.status === "Qualified" || l.status === "Contacted") ? "Warm" : "Cold");

    let progress = 0; // percentage
    let colorClass = "bg-slate-200";
    let labelColor = "text-slate-500 bg-slate-50 border-slate-200";

    if (status === "Cold") {
      progress = 25;
      colorClass = "bg-sky-500";
      labelColor = "text-sky-700 bg-sky-50 border-sky-200";
    } else if (status === "Warm") {
      progress = 50;
      colorClass = "bg-amber-500";
      labelColor = "text-amber-700 bg-amber-50 border-amber-200";
    } else if (status === "Hot") {
      progress = 75;
      colorClass = "bg-orange-500";
      labelColor = "text-orange-700 bg-orange-50 border-orange-200";
    } else if (status === "Converted") {
      progress = 100;
      colorClass = "bg-emerald-500";
      labelColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
    }

    return { status, progress, colorClass, labelColor };
  };

  // Calculations
  const activePipelineTotal = leads
    .filter(l => l.status !== "Lost" && l.status !== "Won")
    .reduce((acc, lead) => acc + lead.value, 0);

  const filteredLeads = leads.filter(l => {
    const term = searchTerm.toLowerCase();
    const matchSearch = 
      (l.name || "").toLowerCase().includes(term) ||
      (l.company || "").toLowerCase().includes(term) ||
      (l.email || "").toLowerCase().includes(term) ||
      (l.notes || "").toLowerCase().includes(term);

    if (statusFilter === "All") return matchSearch;
    return matchSearch && l.status === statusFilter;
  });

  return (
    <div className="space-y-6" id="leads-workspace-panel">
      {/* Metrics & Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Leads Pipeline</h2>
          <p className="text-xs text-slate-500">Manage sales journey across pipeline stages</p>
        </div>
        <div className="flex items-center gap-4 shrink-0 font-sans">
          <div className="bg-white px-3.5 py-1.5 border border-slate-200 rounded-xl text-left shadow-sm">
            <div className="text-[9px] text-slate-400 uppercase font-extrabold leading-none">Active pipeline valuation</div>
            <div className="text-base font-black text-indigo-600 mt-0.5 font-mono">
              {formatINR(activePipelineTotal)}
            </div>
          </div>
          <button
            onClick={openCreateForm}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" /> Add New Lead
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-3.5 rounded-xl border border-slate-200 font-sans shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by lead representative, company details, specific requirement tags..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Pipeline Stage:</span>
          <select
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-705 focus:outline-none focus:border-indigo-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Leads</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Proposal Sent">Proposal Sent</option>
            <option value="Won">Won (Closed)</option>
            <option value="Lost">Lost (Closed)</option>
          </select>
        </div>
      </div>

      {/* CORE DISPLAY (GRID SPLIT / POPUP MODEL) */}
      <div className={`grid grid-cols-1 ${isFormOpen ? "lg:grid-cols-3 gap-6" : ""}`}>
        {/* Left lists (2 Cols) */}
        <div className={`${isFormOpen ? "lg:col-span-2" : ""} space-y-4`}>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-5">Lead / Company</th>
                    <th className="py-3.5 px-5 font-sans text-right">Potential Total</th>
                    <th className="py-3.5 px-5 text-center">Pipeline State</th>
                    <th className="py-3.5 px-5 text-center">Conversion Status</th>
                    <th className="py-3.5 px-5 text-center">Operation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400 font-medium font-sans">
                        No prospective leads recorded matching selected filter states.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((l) => {
                      const { status, progress, colorClass, labelColor } = getConversionDetails(l);
                      return (
                        <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-5">
                            <div className="font-extrabold text-slate-900 text-sm">{l.company}</div>
                            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                              Rep: {l.name} | Phone: {l.phone || "N/A"} | Date: {formatDate(l.date)}
                            </div>
                            {l.notes && (
                              <div className="text-[10px] text-slate-600 italic mt-1 bg-slate-50 p-2 rounded-lg max-w-sm border border-slate-100 line-clamp-2">
                                {l.notes}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-5 text-right font-bold text-slate-900 font-mono text-sm">
                            {formatINR(l.value)}
                          </td>
                          <td className="py-3 px-5 text-center">
                            <select
                              value={l.status}
                              onChange={(e) => updateLeadStatusDirectly(l.id, e.target.value as Lead["status"])}
                              className={`rounded-full px-2.5 py-0.5 font-bold text-[9px] border appearance-none outline-none text-center cursor-pointer ${
                                l.status === "Won" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                l.status === "Proposal Sent" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                l.status === "New" ? "bg-sky-50 text-sky-700 border-sky-200" :
                                l.status === "Contacted" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                l.status === "Qualified" ? "bg-purple-50 text-purple-700 border-purple-200" :
                                "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              <option value="New">New</option>
                              <option value="Contacted">Contacted</option>
                              <option value="Qualified">Qualified</option>
                              <option value="Proposal Sent">Proposal Sent</option>
                              <option value="Won">Won</option>
                              <option value="Lost">Lost</option>
                            </select>
                          </td>
                          <td className="py-3 px-5">
                            <div className="flex flex-col items-center gap-1.5 w-32 mx-auto">
                              {/* 4-Segmented Progress Bar */}
                              <div className="flex gap-1 w-full h-1.5 rounded-full overflow-hidden bg-slate-100 p-[1px] border border-slate-200/50">
                                <div className={`h-full flex-1 rounded-sm transition-all ${progress >= 25 ? colorClass : "bg-slate-200"}`} title="Cold" />
                                <div className={`h-full flex-1 rounded-sm transition-all ${progress >= 50 ? colorClass : "bg-slate-200"}`} title="Warm" />
                                <div className={`h-full flex-1 rounded-sm transition-all ${progress >= 75 ? colorClass : "bg-slate-200"}`} title="Hot" />
                                <div className={`h-full flex-1 rounded-sm transition-all ${progress >= 100 ? colorClass : "bg-slate-200"}`} title="Converted" />
                              </div>
                              
                              <select
                                value={status}
                                onChange={(e) => updateLeadConversionStatusDirectly(l.id, e.target.value as "Cold" | "Warm" | "Hot" | "Converted")}
                                className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border accent-indigo-650 outline-none text-center cursor-pointer ${labelColor}`}
                              >
                                <option value="Cold">❄️ Cold</option>
                                <option value="Warm">☀️ Warm</option>
                                <option value="Hot">🔥 Hot</option>
                                <option value="Converted">🤝 Converted</option>
                              </select>
                            </div>
                          </td>
                        <td className="py-3 px-5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditForm(l)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer text-xs font-bold rounded-lg border border-slate-200"
                              title="Edit Lead"
                            >
                              Edit
                            </button>
                            {l.status === "Proposal Sent" && (
                              <button
                                onClick={onNavigateToQuotation}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white transition-all cursor-pointer text-xs font-bold rounded-lg border border-indigo-200"
                                title="Draft Quotation Proposal"
                              >
                                Draft Proposal
                              </button>
                            )}
                            <button
                              onClick={() => deleteLead(l.id)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete permanently"
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

        {/* Right Form side panel */}
        <div>
          {isFormOpen && (
            <form onSubmit={saveLead} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3.5 text-xs font-sans">
              
              {/* [Form content restored] */}
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-705 uppercase tracking-wider">
                  {formType === "create" ? "Add Lead Registry" : "Amend Lead Information"}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-slate-400 hover:text-slate-700 select-none text-xs font-bold font-mono cursor-pointer"
                >
                  CLOSE
                </button>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Link Existing Customer</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-500"
                  value={formCustomerId}
                  onChange={(e) => {
                    const custId = e.target.value;
                    setFormCustomerId(custId);
                    const cust = customers.find(c => c.id === custId);
                    if (cust) {
                      setFormCompany(cust.company);
                      setFormName(cust.name);
                      setFormEmail(cust.email);
                      setFormPhone(cust.phone);
                    }
                  }}
                >
                  <option value="">Select Customer (Optional)</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Company / Organization name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation India"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-500"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Representative Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-500"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Rep Email</label>
                  <input
                    type="email"
                    placeholder="name@company.in"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-500"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Rep Phone</label>
                  <input
                    type="text"
                    placeholder="+91 99000 ..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Pipeline State</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-500"
                    value={formStatus}
                    onChange={(e) => {
                      const newStatus = e.target.value as Lead["status"];
                      setFormStatus(newStatus);
                      const autoTemp = 
                        newStatus === "Won" ? "Converted" : 
                        newStatus === "Proposal Sent" ? "Hot" : 
                        (newStatus === "Qualified" || newStatus === "Contacted") ? "Warm" : "Cold";
                      setFormConversionStatus(autoTemp);
                    }}
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Est. Value (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 150000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-mono focus:outline-none focus:border-indigo-500"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Conversion Status Warmth</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-500 font-sans"
                  value={formConversionStatus}
                  onChange={(e) => setFormConversionStatus(e.target.value as "Cold" | "Warm" | "Hot" | "Converted")}
                >
                  <option value="Cold">❄️ Cold</option>
                  <option value="Warm">☀️ Warm</option>
                  <option value="Hot">🔥 Hot</option>
                  <option value="Converted">🤝 Converted</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Inquiry Source</label>
                <input
                  type="text"
                  placeholder="e.g. Cold Email, Google Ad, Exhibition"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-500"
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">Inquiry Requirements</label>
                <textarea
                  rows={4}
                  placeholder="e.g. Seeks annual support package for firewall hardware and enterprise implementation assistance."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-500 leading-normal"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm text-center"
                >
                  Save Registry
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
