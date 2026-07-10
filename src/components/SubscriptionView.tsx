/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Search, Plus, Trash2, CalendarClock, ShieldAlert, Sparkles, Mail } from "lucide-react";
import { Subscription, Customer, Product } from "../types";
import { formatINR, formatDate, toInputDate } from "../utils";

interface SubscriptionViewProps {
  subscriptions: Subscription[];
  customers: Customer[];
  products?: Product[];
  onUpdateSubscriptions: (updated: Subscription[]) => void;
}

export default function SubscriptionView({
  subscriptions,
  customers,
  products = [],
  onUpdateSubscriptions
}: SubscriptionViewProps) {
  
  const [searchTerm, setSearchTerm] = useState("");

  // Form toggles
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState<"create" | "edit">("create");
  const [activeSubId, setActiveSubId] = useState<string | null>(null);

  // Form Fields
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formService, setFormService] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCycle, setFormCycle] = useState<Subscription["billingCycle"]>("Monthly");
  const [formStart, setFormStart] = useState("");
  const [formRenewal, setFormRenewal] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<Subscription["status"]>("Active");

  const resetForm = () => {
    setFormCustomerId(customers[0]?.id || "");
    setFormService("");
    setFormAmount("");
    setFormCycle("Monthly");
    setFormStart("");
    setFormRenewal("");
    setFormDescription("");
    setFormStatus("Active");
    setActiveSubId(null);
  };

  const openCreateForm = () => {
    resetForm();
    setFormType("create");
    setFormStart(formatDate(new Date()));
    
    const nextYr = new Date();
    nextYr.setFullYear(nextYr.getFullYear() + 1);
    setFormRenewal(formatDate(nextYr));

    setIsFormOpen(true);
  };

  const openEditForm = (sub: Subscription) => {
    setFormType("edit");
    setActiveSubId(sub.id);
    setFormCustomerId(sub.customerId);
    setFormService(sub.serviceName);
    setFormAmount(String(sub.amount));
    setFormCycle(sub.billingCycle);
    setFormStart(formatDate(sub.startDate));
    setFormRenewal(formatDate(sub.nextRenewalDate));
    setFormDescription(sub.description || "");
    setFormStatus(sub.status);
    setIsFormOpen(true);
  };

  const saveSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerId || !formService) {
      alert("Please select a customer and provide service details.");
      return;
    }

    const price = parseFloat(formAmount) || 0;

    if (formType === "create") {
      const nw: Subscription = {
        id: "sub_" + Date.now(),
        customerId: formCustomerId,
        serviceName: formService,
        amount: price,
        billingCycle: formCycle,
        startDate: formStart,
        nextRenewalDate: formRenewal,
        status: formStatus,
        description: formDescription
      };
      onUpdateSubscriptions([...subscriptions, nw]);
    } else {
      const upd = subscriptions.map(s => {
        if (s.id === activeSubId) {
          return {
            ...s,
            customerId: formCustomerId,
            serviceName: formService,
            amount: price,
            billingCycle: formCycle,
            startDate: formStart,
            nextRenewalDate: formRenewal,
            status: formStatus,
            description: formDescription
          };
        }
        return s;
      });
      onUpdateSubscriptions(upd);
    }
    setIsFormOpen(false);
    resetForm();
  };

  const deleteSubscription = (id: string) => {
    if (confirm("Are you sure you want to terminate this recurring contract log permanently?")) {
      const upd = subscriptions.filter(s => s.id !== id);
      onUpdateSubscriptions(upd);
    }
  };

  const filteredSubscriptions = subscriptions.filter(s => {
    const term = searchTerm.toLowerCase();
    const cust = customers.find(c => c.id === s.customerId);
    const company = cust ? cust.company : "";
    return (
      (s.serviceName || "").toLowerCase().includes(term) ||
      (company || "").toLowerCase().includes(term)
    );
  });

  const getSubRenewalTime = (sub: Subscription) => {
    const inputDate = toInputDate(sub.nextRenewalDate);
    if (!inputDate) return Infinity;
    return new Date(inputDate).getTime();
  };

  const sortedSubscriptions = [...filteredSubscriptions].sort((a, b) => {
    return getSubRenewalTime(a) - getSubRenewalTime(b);
  });

  return (
    <div className="space-y-6" id="subscriptions-workspace-panel">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">AMC & SLA Subscriptions</h2>
          <p className="text-xs text-slate-500">Log recurring software subscriptions, hardware leasing contracts, or ongoing SLA retainerships</p>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Log SLA Retainer
        </button>
      </div>

      {/* FILTER SEARCH BAR */}
      <div className="flex bg-white p-3.5 rounded-xl border border-slate-200 font-sans shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by registered client name, specialized service agreement name..."
            className="w-full bg-slate-50 border border-slate-205 rounded-xl py-2 pl-10 pr-4 text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* CORE DISPLAY (FULL PAGE TABLE LIST) */}
      <div className="font-sans">
        {sortedSubscriptions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-205 text-slate-400 font-sans text-sm font-semibold shadow-sm animate-fade-in">
            No SLA subscriptions match selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm font-sans">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="p-3 pl-4">Agreement / SLA Service</th>
                  <th className="p-3">Consignee Client</th>
                  <th className="p-3 text-right">Cycle & Billing Amount</th>
                  <th className="p-3 text-center">Start Date</th>
                  <th className="p-3 text-center font-bold text-indigo-700 bg-indigo-50/10">End Date / Renewal</th>
                  <th className="p-3 text-center">Plan Status</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {sortedSubscriptions.map((s) => {
                  const client = customers.find((c) => c.id === s.customerId);
                  const todayStr = new Date().toISOString().split("T")[0];
                  const expDate = toInputDate(s.nextRenewalDate);
                  const isExpired = (expDate && expDate < todayStr) || s.status === "Expired";
                  const resolvedStatus = isExpired ? "Expired" : s.status;

                  const isNearRenewal = (() => {
                    const d = new Date(s.nextRenewalDate);
                    const now = new Date();
                    const diffTime = d.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays <= 30 && diffDays >= 0 && s.status === "Active" && !isExpired;
                  })();

                  return (
                    <tr key={s.id} className={`hover:bg-indigo-50/10 transition-colors ${
                      isExpired ? "text-red-600 bg-red-50/10 border-red-200" :
                      isNearRenewal ? "text-amber-700 bg-amber-50/10" : ""
                    }`}>
                      {/* Service Agreement Name */}
                      <td className="p-3 pl-4 vertical-top max-w-[240px]">
                        <div className={`font-extrabold break-words leading-snug ${
                          isExpired ? "text-red-700 font-black" :
                          isNearRenewal ? "text-amber-800" : "text-slate-900"
                        }`}>
                          {s.serviceName}
                        </div>
                        {s.description && (
                          <div className={`text-[10px] mt-1 italic ${isExpired ? "text-red-500" : "text-slate-500"}`}>
                            {s.description}
                          </div>
                        )}
                        <div className={`text-[10px] mt-0.5 ${isExpired ? "text-red-400" : "text-slate-404"}`}>
                          ID: <span className="font-mono">{s.id}</span>
                        </div>
                      </td>

                      {/* Customer Company Name */}
                      <td className="p-3 vertical-top">
                        <div className={`font-bold leading-snug ${isExpired ? "text-red-600 font-extrabold" : "text-slate-900"}`}>
                          {client?.company || "Unmapped Company"}
                        </div>
                        {client?.state && (
                          <span className={`text-[10px] font-medium ${isExpired ? "text-red-400" : "text-slate-450"}`}>
                            State: {client.state}
                          </span>
                        )}
                      </td>

                      {/* Cycle amount */}
                      <td className="p-3 vertical-top text-right">
                        <div className={`font-extrabold font-sans text-sm ${isExpired ? "text-red-700" : "text-slate-900"}`}>
                          {formatINR(s.amount)}
                        </div>
                        <div className={`text-[10px] mt-0.5 font-bold uppercase tracking-wider font-mono ${isExpired ? "text-red-500" : "text-indigo-600"}`}>
                          {s.billingCycle} Iteration
                        </div>
                      </td>

                      {/* Start Date Column */}
                      <td className={`p-3 vertical-top text-center font-mono font-medium ${isExpired ? "text-red-600 font-bold" : "text-slate-700"}`}>
                        {formatDate(s.startDate)}
                      </td>

                      {/* End Date Column */}
                      <td className={`p-3 vertical-top text-center font-mono font-bold ${
                        isExpired ? "text-red-600 bg-red-50/30 border-red-200" : "text-indigo-700 bg-indigo-50/20"
                      }`}>
                        {formatDate(s.nextRenewalDate)}
                      </td>

                      {/* Status badge */}
                      <td className="p-3 vertical-top text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] uppercase font-extrabold tracking-wider border ${
                          isExpired ? "bg-red-100 text-red-700 border-red-200" :
                          s.status === "Active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          s.status === "Cancelled" ? "bg-slate-50 text-slate-500 border-slate-200" :
                          "bg-amber-50 text-amber-600 border-amber-100"
                        }`}>
                          {resolvedStatus}
                        </span>
                      </td>

                      {/* Actions buttons row */}
                      <td className="p-3 pr-4 vertical-top text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              const body = `Dear ${client?.name || 'Customer'},\n\nThis is a gentle reminder that your subscription for "${s.serviceName}" is due for renewal on ${formatDate(s.nextRenewalDate)}.\nSubject amount: ${formatINR(s.amount)}.\n\nThank you!`;
                              window.location.href = `mailto:${client?.email || ''}?subject=Subscription Renewal Reminder&body=${encodeURIComponent(body)}`;
                            }}
                            className="px-2 py-1.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold cursor-pointer border border-blue-200 transition-colors flex items-center gap-1"
                            title="Send Email Reminder"
                          >
                            <Mail className="w-3.5 h-3.5" /> Remind
                          </button>
                          <button
                            onClick={() => openEditForm(s)}
                            className="px-2 py-1.5 rounded bg-slate-100 hover:bg-slate-205 text-slate-700 text-xs font-bold cursor-pointer border border-slate-200 transition-colors"
                            title="Amend plan parameters"
                          >
                            Edit Plan
                          </button>
                          <button
                            onClick={() => deleteSubscription(s.id)}
                            className="p-1 px-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer border border-rose-100"
                            title="Permanent termination"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Edit/Add Contract Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-sans animate-fade-in">
          <form 
            onSubmit={saveSubscription} 
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
          >
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                {formType === "create" ? "Add SLA/SaaS Retainer" : "Amend SLA Details"}
              </h3>
              <button 
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600 font-bold select-none cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 px-6 overflow-y-auto max-h-[70vh] text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Select Consignee Client</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-500 font-sans"
                  value={formCustomerId}
                  onChange={(e) => setFormCustomerId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company} (Attn: {c.name})
                    </option>
                  ))}
                </select>
              </div>

              {products && products.some(p => p.itemType === "Service" || p.itemType === "Agreement") && (
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Auto-Fill from Catalog</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-850 focus:outline-none focus:border-indigo-500 font-sans"
                    onChange={(e) => {
                      const matchedProd = products.find(p => p.id === e.target.value);
                      if (matchedProd) {
                        setFormService(matchedProd.name);
                        setFormAmount(String(matchedProd.rate));
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">-- Choose Standard Service / Agreement --</option>
                    {products.filter(p => p.itemType === "Service" || p.itemType === "Agreement").map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.itemType}] {p.sku} | {p.name} (₹{p.rate})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Agreement / Service Name</label>
                <input
                  type="text"
                  required
                  list="subscription-service-names"
                  placeholder="e.g. Dedicated Backups & SLA support"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-500"
                  value={formService}
                  onChange={(e) => setFormService(e.target.value)}
                />
                <datalist id="subscription-service-names">
                  {Array.from(new Set([
                    ...subscriptions.map(s => s.serviceName).filter(Boolean),
                    "Dedicated Backups & SLA support",
                    "Enterprise ERP Software SaaS Licensing",
                    "SLA Gold Retainer Support",
                    "Standard AMC IT Maintainance Support",
                    "AWS Cloud Server Hosting & SLA Retainer",
                    "Secure Virtual Private Network (VPN) Setup",
                    "Weekly Database Verification AMC",
                    "Full Security Audit & Compliance Retainer"
                  ])).map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Recurring rate (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="Rate ₹"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-mono focus:outline-none focus:border-indigo-500"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Billing Interval</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-850 focus:outline-none focus:border-indigo-500"
                    value={formCycle}
                    onChange={(e) => setFormCycle(e.target.value as Subscription["billingCycle"])}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Annually">Annually</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Start Date</label>
                  <input
                    type="text"
                    required
                    placeholder="dd/MM/yyyy"
                    pattern="\d{2}/\d{2}/\d{4}"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none text-[11px] focus:border-indigo-500"
                    value={formStart}
                    onChange={(e) => {
                      // auto-format to dd/MM/yyyy
                      let val = e.target.value.replace(/[^\d]/g, '');
                      if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                      if (val.length > 5) val = val.slice(0, 5) + '/' + val.slice(5, 9);
                      setFormStart(val);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">End Date</label>
                  <input
                    type="text"
                    required
                    placeholder="dd/MM/yyyy"
                    pattern="\d{2}/\d{2}/\d{4}"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none text-[11px] focus:border-indigo-500"
                    value={formRenewal}
                    onChange={(e) => {
                      let val = e.target.value.replace(/[^\d]/g, '');
                      if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                      if (val.length > 5) val = val.slice(0, 5) + '/' + val.slice(5, 9);
                      setFormRenewal(val);
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Plan Description</label>
                <textarea
                  placeholder="Optional details about this plan..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-500 text-xs"
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Plan Status</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-850 focus:outline-none focus:border-indigo-500"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as Subscription["status"])}
                >
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  resetForm();
                }}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
              >
                Save Subscription
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
