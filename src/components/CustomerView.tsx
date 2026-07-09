/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Search, Plus, Trash2, Edit2, Contact, CheckCircle, Mail, Phone, MapPin, Sparkles } from "lucide-react";
import { Customer } from "../types";

interface CustomerViewProps {
  customers: Customer[];
  onUpdateCustomers: (updated: Customer[]) => void;
}

export default function CustomerView({
  customers,
  onUpdateCustomers
}: CustomerViewProps) {
  
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState<"create" | "edit">("create");
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formGstin, setFormGstin] = useState("");
  const [formState, setFormState] = useState("Maharashtra");
  const [formBilling, setFormBilling] = useState("");
  const [formShipping, setFormShipping] = useState("");

  const [isFetchingGst, setIsFetchingGst] = useState(false);
  const [gstError, setGstError] = useState<string | null>(null);

  const [instantGstin, setInstantGstin] = useState("");
  const [isInstantFetching, setIsInstantFetching] = useState(false);
  const [instantError, setInstantError] = useState<string | null>(null);
  const [instantSuccess, setInstantSuccess] = useState<string | null>(null);

  const getIndianStateFromGstin = (gstin: string): string => {
    const code = (gstin || "").trim().substring(0, 2);
    const mapping: { [key: string]: string } = {
      "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Punjab", "05": "Uttarakhand",
      "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar",
      "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
      "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand",
      "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat", "25": "Gujarat",
      "26": "Gujarat", "27": "Maharashtra", "28": "Andhra Pradesh", "29": "Karnataka", "30": "Goa",
      "31": "Kerala", "32": "Kerala", "33": "Tamil Nadu", "34": "Tamil Nadu", "35": "Andaman and Nicobar Islands",
      "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh"
    };
    return mapping[code] || "Maharashtra";
  };

  const handleInstantGstinOnboard = async () => {
    const clean = instantGstin.trim().toUpperCase();
    if (clean.length !== 15) {
      setInstantError("GSTIN must be exactly 15 characters long");
      return;
    }

    setInstantError(null);
    setInstantSuccess(null);

    // Check if already exists in the list of customers
    const existing = customers.find(c => (c.gstin || "").trim().toUpperCase() === clean);
    if (existing) {
      setInstantSuccess(`Customer already exists: "${existing.company}"`);
      setSearchTerm(clean); // Filter list to show them immediately
      setInstantGstin("");
      return;
    }

    setIsInstantFetching(true);
    try {
      const res = await fetch(`/api/gst/fetch?gstin=${encodeURIComponent(clean)}`);
      const resData = await res.json();
      if (resData.success && resData.data) {
        // Map elements directly from real-life Appyflow live query response lite data fields
        const newCust: Customer = {
          id: "cust_" + Date.now(),
          name: resData.data.name || "", // Live registry has no secret contact name
          company: resData.data.company || `Company (${clean.substring(2, 10)})`,
          email: resData.data.email || "", // Live registry has no secret email
          phone: resData.data.phone || "", // Live registry has no secret phone
          gstin: clean,
          state: resData.data.state || "Maharashtra",
          billingAddress: resData.data.billingAddress || `${resData.data.state || "Maharashtra"}, India`,
          shippingAddress: resData.data.shippingAddress || `${resData.data.state || "Maharashtra"}, India`
        };

        onUpdateCustomers([...customers, newCust]);
        setInstantSuccess(`🎉 Successfully created from Live Appyflow Registry: "${newCust.company}"`);
        setSearchTerm(clean); // Filter list to show newly created customer immediately
        setInstantGstin("");
      } else {
        throw new Error(resData.error || "GSTIN not found or live registry offline.");
      }
    } catch (e: any) {
      setInstantError(`❌ Verification failed: ${e.message || "Live API server unreachable."}`);
    } finally {
      setIsInstantFetching(false);
    }
  };

  const handleFetchGstDetails = async () => {
    const clean = formGstin.trim().toUpperCase();
    if (clean.length !== 15) {
      setGstError("GSTIN must be exactly 15 characters long");
      return;
    }
    setIsFetchingGst(true);
    setGstError(null);
    try {
      const res = await fetch(`/api/gst/fetch?gstin=${encodeURIComponent(clean)}`);
      const resData = await res.json();
      if (resData.success && resData.data) {
        setFormCompany(resData.data.company || "");
        setFormName(resData.data.name || "");
        setFormEmail(resData.data.email || "");
        setFormPhone(resData.data.phone || "");
        setFormState(resData.data.state || "Maharashtra");
        setFormBilling(resData.data.billingAddress || "");
        setFormShipping(resData.data.shippingAddress || "");
        setGstError(null);
      } else {
        throw new Error(resData.error || "Live lookup failed.");
      }
    } catch (e: any) {
      setGstError(`❌ Live Appyflow verification failed: ${e.message || "Offline"}. Please type customer info manually.`);
    } finally {
      setIsFetchingGst(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormCompany("");
    setFormEmail("");
    setFormPhone("");
    setFormGstin("");
    setFormState("Maharashtra");
    setFormBilling("");
    setFormShipping("");
    setIsFetchingGst(false);
    setGstError(null);
    setActiveCustomerId(null);
  };

  const openCreateForm = () => {
    resetForm();
    setFormType("create");
    setIsFormOpen(true);
  };

  const openEditForm = (cust: Customer) => {
    setFormType("edit");
    setActiveCustomerId(cust.id);
    setFormName(cust.name || "");
    setFormCompany(cust.company || "");
    setFormEmail(cust.email || "");
    setFormPhone(cust.phone || "");
    setFormGstin(cust.gstin || "");
    setFormState(cust.state || "Maharashtra");
    setFormBilling(cust.billingAddress || "");
    setFormShipping(cust.shippingAddress || "");
    setIsFormOpen(true);
  };

  const saveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany || !formName) {
      alert("Please fill both Company and Representative Name.");
      return;
    }

    if (formGstin && formGstin.trim().length !== 15) {
      alert("Indian Goods and Services Tax Identification Number (GSTIN) must be exactly 15 alphanumeric characters long.");
      return;
    }

    if (formType === "create") {
      const nw: Customer = {
        id: "cust_" + Date.now(),
        name: formName,
        company: formCompany,
        email: formEmail,
        phone: formPhone,
        gstin: formGstin.toUpperCase().trim(),
        state: formState,
        billingAddress: formBilling,
        shippingAddress: formShipping || formBilling
      };
      onUpdateCustomers([...customers, nw]);
    } else {
      const upd = customers.map(c => {
        if (c.id === activeCustomerId) {
          return {
            ...c,
            name: formName,
            company: formCompany,
            email: formEmail,
            phone: formPhone,
            gstin: formGstin.toUpperCase().trim(),
            state: formState,
            billingAddress: formBilling,
            shippingAddress: formShipping || formBilling
          };
        }
        return c;
      });
      onUpdateCustomers(upd);
    }
    setIsFormOpen(false);
    resetForm();
  };

  const deleteCustomer = (id: string) => {
    if (confirm("Are you sure you want to delete this company?")) {
      const upd = customers.filter(c => c.id !== id);
      onUpdateCustomers(upd);
    }
  };

  const copyBillingToShipping = () => {
    setFormShipping(formBilling);
  };

  const filteredCustomers = customers.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      (c.company || "").toLowerCase().includes(term) ||
      (c.name || "").toLowerCase().includes(term) ||
      (c.email || "").toLowerCase().includes(term) ||
      (c.gstin || "").toLowerCase().includes(term) ||
      (c.state || "").toLowerCase().includes(term)
    );
  });

  const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", 
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", 
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Delhi", "Jammu and Kashmir", "Ladakh"
  ];

  return (
    <div className="space-y-6" id="customers-view-panel">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Master Database</h2>
          <p className="text-xs text-slate-500">Add shipping credentials, legal states, and authorized Indian corporate tax registrations</p>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Customer File
        </button>
      </div>

      {/* FILTER SEARCH BAR & INSTANT ONBOARD RIBBON */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 font-sans">
        <div className="lg:col-span-2 flex bg-white p-3.5 rounded-xl border border-slate-205 shadow-sm items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Company entity, rep name, state registry, or GSTIN registration..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white p-3.5 border border-slate-205 rounded-xl shadow-sm flex flex-col justify-center gap-1.5">
          <div className="flex gap-2 items-center justify-between">
            <div className="relative flex-1">
              <Sparkles className="absolute left-3 top-2.5 w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <input
                type="text"
                maxLength={15}
                placeholder="Instant GSTIN Onboard..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-9 pr-2 text-slate-830 text-[10px] uppercase font-mono focus:outline-none focus:border-indigo-500 placeholder:text-slate-350"
                value={instantGstin}
                onChange={(e) => {
                  setInstantGstin(e.target.value.toUpperCase());
                  setInstantError(null);
                  setInstantSuccess(null);
                }}
              />
            </div>
            <button
              type="button"
              disabled={isInstantFetching || instantGstin.trim().length !== 15}
              onClick={handleInstantGstinOnboard}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-all disabled:opacity-40 select-none flex items-center justify-center gap-1 shrink-0 h-8 shadow-sm"
            >
              {isInstantFetching ? (
                <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-slate-300 border-t-white" />
              ) : (
                "+ Onboard"
              )}
            </button>
          </div>
          {instantError && (
            <p className="text-[9px] text-rose-500 font-semibold truncate px-1">{instantError}</p>
          )}
          {instantSuccess && (
            <p className="text-[9px] text-emerald-600 font-semibold truncate px-1">{instantSuccess}</p>
          )}
        </div>
      </div>

      {/* DYNAMICS CONTAINER SPLIT */}
      <div className="space-y-4 font-sans">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm font-sans shadow-sm">
              No customer listings match your search keywords.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm font-sans">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="p-3 pl-4">Company Entity</th>
                    <th className="p-3">Representative Contacts</th>
                    <th className="p-3">State Registry</th>
                    <th className="p-3">GSTIN Registration</th>
                    <th className="p-3">Addresses</th>
                    <th className="p-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-indigo-50/10 transition-colors">
                      {/* Company Name */}
                      <td className="p-3 pl-4 vertical-top max-w-[200px]">
                        <div className="font-extrabold text-slate-900 break-words leading-snug">
                          {c.company}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          ID: <span className="font-mono">{c.id}</span>
                        </div>
                      </td>

                      {/* Rep Contact details */}
                      <td className="p-3 vertical-top max-w-[220px]">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5 leading-none">
                          <Contact className="w-3.5 h-3.5 text-indigo-505 shrink-0 inline-block" />
                          {c.name}
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {c.email && (
                            <div className="text-slate-520 flex items-center gap-1 leading-tight text-[11px]">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate" title={c.email}>{c.email}</span>
                            </div>
                          )}
                          {c.phone && (
                            <div className="text-slate-520 flex items-center gap-1 font-mono leading-tight text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{c.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* State Registry */}
                      <td className="p-3 vertical-top">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {c.state}
                        </span>
                      </td>

                      {/* GSTIN registration */}
                      <td className="p-3 vertical-top font-mono">
                        {c.gstin ? (
                          <span className="font-bold text-slate-800 text-[11px] bg-slate-50 border border-slate-150 px-1.5 py-0.5 rounded">
                            {c.gstin}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-sans italic">
                            URD / Unregistered
                          </span>
                        )}
                      </td>

                      {/* Addresses */}
                      <td className="p-3 vertical-top text-[11px] max-w-[240px]">
                        <div className="line-clamp-2 leading-relaxed text-slate-600" title={c.billingAddress}>
                          <span className="font-bold text-slate-700">Billing:</span> {c.billingAddress}
                        </div>
                        {c.shippingAddress && c.shippingAddress !== c.billingAddress && (
                          <div className="line-clamp-2 leading-relaxed text-slate-400 mt-1" title={c.shippingAddress}>
                            <span className="font-bold">Shipping:</span> {c.shippingAddress}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 pr-4 vertical-top text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => openEditForm(c)}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer border border-slate-200 transition-colors"
                            title="Update representative & address"
                          >
                            Update fields
                          </button>
                          <button
                            onClick={() => deleteCustomer(c.id)}
                            className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer border border-rose-100"
                            title="Remove customer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* Creation / Amend Box Modal Overlay */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-sans animate-fade-in">
          <form 
            onSubmit={saveCustomer} 
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
          >
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                {formType === "create" ? "Add Client File" : "Amend Client Details"}
              </h3>
              <button 
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-slate-450 hover:text-slate-600 font-bold select-none cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 px-6 overflow-y-auto max-h-[70vh] text-xs font-sans">

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Company Registered Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Innova Kraft Technologies"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-500"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Lead Representative</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Khanna"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-850 focus:outline-none focus:border-indigo-500"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-505 font-bold mb-1 uppercase text-[9px] tracking-wide">Indian State Registry</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-850 focus:outline-none focus:border-indigo-500"
                  value={formState}
                  onChange={(e) => setFormState(e.target.value)}
                >
                  {indianStates.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-405 block mt-1 leading-normal">
                  Tax checks apply: matching company settings state triggers CGST+SGST, deviations apply IGST.
                </span>
              </div>

              <div>
                <label className="block text-slate-505 font-bold mb-1 uppercase text-[9px] tracking-wide">GSTIN (15 Alphanumerics)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="e.g. 27AABCI4821M1ZN"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-855 uppercase font-mono focus:outline-none focus:border-indigo-500"
                    value={formGstin}
                    onChange={(e) => setFormGstin(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={isFetchingGst || formGstin.trim().length !== 15}
                    onClick={handleFetchGstDetails}
                    className="px-3.5 py-1.5 bg-indigo-600 border border-indigo-700 font-bold text-white text-[11px] rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    {isFetchingGst ? (
                      <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-slate-300 border-t-white" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-indigo-200 animate-pulse" />
                    )}
                    Auto-Fetch
                  </button>
                </div>
                {gstError && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">{gstError}</p>
                )}
                <p className="text-[9px] text-slate-400 mt-1 leading-normal">
                  Click <strong>Auto-Fetch</strong> to instantly discover Indian corporate records, addresses, state registries, corporate billing entries, and representatives.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Official Email</label>
                  <input
                    type="email"
                    placeholder="name@company.in"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-850 text-xs focus:outline-none focus:border-indigo-500"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Official Mobile</label>
                  <input
                    type="text"
                    placeholder="+91 98200 ..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-850 text-xs font-mono focus:outline-none focus:border-indigo-500"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-slate-400 font-semibold text-[9px] uppercase tracking-wide">Billing Address</label>
                  <button
                    type="button"
                    onClick={copyBillingToShipping}
                    className="text-indigo-600 hover:text-indigo-700 font-bold text-[9px] uppercase hover:underline cursor-pointer"
                  >
                    Same Shipping
                  </button>
                </div>
                <textarea
                  rows={2}
                  required
                  placeholder="Billing block and local offices..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-500 leading-normal"
                  value={formBilling}
                  onChange={(e) => setFormBilling(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-405 font-bold mb-1 uppercase text-[9px] tracking-wide">Consignee Shipping Address</label>
                <textarea
                  rows={2}
                  placeholder="Leave empty to use Billing address..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-500 leading-normal"
                  value={formShipping}
                  onChange={(e) => setFormShipping(e.target.value)}
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
