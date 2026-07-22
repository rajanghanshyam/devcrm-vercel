/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Search, 
  Plus, 
  Trash2, 
  Printer, 
  ArrowLeft, 
  CheckCircle, 
  XCircle,
  FileText,
  IndianRupee,
  Coins,
  Mail,
  Edit
} from "lucide-react";
import { ProformaInvoice, Customer, Product, CompanySettings, CompanyProfile } from "../types";
import { formatINR, formatDate, toInputDate } from "../utils";
import { EmailModal } from "./EmailModal";

interface ProformaInvoiceViewProps {
  invoices: ProformaInvoice[];
  customers: Customer[];
  products: Product[];
  companySettings: CompanySettings;
  companyProfiles?: CompanyProfile[];
  onUpdateInvoices: (updated: ProformaInvoice[]) => void;
  onUpdateCompanyProfiles?: (updated: CompanyProfile[]) => void;
  initialSubView?: "list" | "create";
  onSubViewChange?: (view: "list" | "create" | "detail" | "edit") => void;
  onConvertToTaxInvoice?: (proforma: ProformaInvoice) => void;
  activeCompanyId?: string;
}

export default function ProformaInvoiceView({
  invoices,
  customers,
  products,
  companySettings,
  companyProfiles = [],
  onUpdateInvoices,
  onUpdateCompanyProfiles,
  initialSubView,
  onSubViewChange,
  onConvertToTaxInvoice,
  activeCompanyId = ""
}: ProformaInvoiceViewProps) {
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [companyFilter, setCompanyFilter] = useState(activeCompanyId || "All");

  React.useEffect(() => {
    if (activeCompanyId) {
      setCompanyFilter(activeCompanyId);
    }
  }, [activeCompanyId]);
  
  const [activeSubView, setActiveSubView] = useState<"list" | "create" | "detail" | "edit">("list");
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  React.useEffect(() => {
    if (initialSubView) {
      if (initialSubView === "create") {
        openCreateForm();
      } else {
        setActiveSubView(initialSubView);
      }
    }
  }, [initialSubView]);

  React.useEffect(() => {
    onSubViewChange?.(activeSubView);
  }, [activeSubView]);

  // Form State variables for direct creation/editing
  const [formInvoiceNo, setFormInvoiceNo] = useState("");
  const [formQuotationNo, setFormQuotationNo] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formItems, setFormItems] = useState<any[]>([]);
  const [formFreight, setFormFreight] = useState<number>(0);
  const [formAdditionalDiscount, setFormAdditionalDiscount] = useState<number>(0);
  const [formTerms, setFormTerms] = useState("");
  const [formCompanyId, setFormCompanyId] = useState("");
  const [formTermsPresetId, setFormTermsPresetId] = useState("");
  const [formStatus, setFormStatus] = useState<ProformaInvoice["status"]>("Unpaid");

  // Helper sequence generator
  const generateNewInvoiceNumber = (profile: any) => {
    const prefix = profile.invoicePrefix || "PI";
    let nextNum = profile.nextInvoiceNumber || 1;
    
    let candidate = `${prefix}-${String(nextNum).padStart(4, '0')}`;
    while (invoices.some(i => i.invoiceNo.toUpperCase().trim() === candidate.toUpperCase().trim())) {
      nextNum++;
      candidate = `${prefix}-${String(nextNum).padStart(4, '0')}`;
    }
    return candidate;
  };

  const selectInvoice = (invId: string) => {
    setActiveInvoiceId(invId);
    setActiveSubView("detail");
  };

  const getSelectedInvoice = (): ProformaInvoice | undefined => {
    return invoices.find(i => i.id === activeInvoiceId);
  };

  // Helper lookup for active company settings per invoice
  const getDocCompanyProfile = (docCompanyId?: string) => {
    const profile = companyProfiles.find(p => p.id === docCompanyId);
    if (profile) return profile;
    return {
      id: "comp_apex",
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
      termsPresets: companySettings.termsPresets || [],
      signatureImage: companySettings.signatureImage,
      enableGst: companySettings.enableGst
    };
  };

  // Toggle invoice status directly to "Paid"
  const recordPayment = (invoiceId: string) => {
    const updated = invoices.map(v => {
      if (v.id === invoiceId) {
        return { ...v, status: "Paid" as const };
      }
      return v;
    });
    onUpdateInvoices(updated);
    alert("Payment received successfully! The Proforma Invoice status has been updated to PAID and logged in revenue totals.");
  };

  // Delete invoice
  const deleteInvoice = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this proforma invoice permanently?")) {
      const updated = invoices.filter(i => i.id !== id);
      onUpdateInvoices(updated);
      if (activeInvoiceId === id) {
        setActiveSubView("list");
      }
    }
  };

  // Open Direct Create Form
  const openCreateForm = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 15);
    const expStr = expDate.toISOString().split("T")[0];

    const initialProfile = companyProfiles.find(p => p.id === activeCompanyId) || companyProfiles.find(p => p.isDefault) || companyProfiles[0] || { id: "comp_apex" };
    const resolvedProfile = getDocCompanyProfile(initialProfile.id);

    setFormCompanyId(resolvedProfile.id || "comp_apex");
    setFormTermsPresetId(resolvedProfile.termsPresets?.[0]?.id || "");
    setFormInvoiceNo(generateNewInvoiceNumber(resolvedProfile));
    setFormQuotationNo("");
    setFormDate(todayStr);
    setFormDueDate(expStr);
    setFormCustomerId(customers[0]?.id || "");
    setFormSubject("");
    setFormTerms(resolvedProfile.termsPresets?.[0]?.content || companySettings.defaultTerms || "");
    setFormItems([
      {
        productId: "",
        name: "",
        description: "",
        quantity: 1,
        rate: 0,
        discountPercent: 0,
        gstPercent: 18
      }
    ]);
    setFormStatus("Unpaid");
    setFormFreight(0);
    setFormAdditionalDiscount(0);
    setActiveSubView("create");
  };

  // Open Edit Form
  const openEditForm = (inv: ProformaInvoice) => {
    setActiveInvoiceId(inv.id);
    setFormCompanyId(inv.companyId || "comp_apex");
    setFormTermsPresetId(inv.termsPresetId || "");
    setFormInvoiceNo(inv.invoiceNo || "");
    setFormQuotationNo(inv.quotationNo || "");
    setFormDate(toInputDate(inv.date));
    setFormDueDate(toInputDate(inv.dueDate));
    setFormCustomerId(inv.customerId || "");
    setFormSubject(inv.subject || "");
    setFormTerms(inv.terms || "");
    setFormItems(inv.items.map(item => ({
      productId: item.productId || "",
      name: item.productName || "",
      description: item.description || "",
      quantity: item.quantity !== undefined && item.quantity !== null ? item.quantity : 1,
      rate: item.rate !== undefined && item.rate !== null ? item.rate : 0,
      discountPercent: item.discountPercent !== undefined && item.discountPercent !== null ? item.discountPercent : 0,
      gstPercent: item.gstPercent !== undefined && item.gstPercent !== null ? item.gstPercent : 18
    })));
    setFormStatus(inv.status || "Unpaid");
    setFormFreight(inv.freight || 0);
    setFormAdditionalDiscount(inv.additionalDiscount || 0);
    setActiveSubView("edit");
  };

  // Row items handlers
  const handleItemValueChange = (index: number, field: string, val: any) => {
    const updated = [...formItems];
    updated[index] = {
      ...updated[index],
      [field]: val
    };
    setFormItems(updated);
  };

  const addFormItemRow = () => {
    setFormItems([
      ...formItems,
      {
        productId: "",
        name: "",
        description: "",
        quantity: 1,
        rate: 0,
        discountPercent: 0,
        gstPercent: 18
      }
    ]);
  };

  const removeFormItemRow = (index: number) => {
    if (formItems.length === 1) return;
    const updated = [...formItems];
    updated.splice(index, 1);
    setFormItems(updated);
  };

  const handleProductChangeInRow = (index: number, productId: string) => {
    const matched = products.find(p => p.id === productId);
    if (!matched) return;

    const updated = [...formItems];
    updated[index] = {
      ...updated[index],
      productId: matched.id,
      name: matched.name,
      description: matched.description || "",
      rate: matched.rate,
      gstPercent: matched.gstRate
    };
    setFormItems(updated);
  };

  const getFormCalculatedTotals = () => {
    let subtotal = 0;
    let discountTotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const customer = customers.find(c => c.id === formCustomerId);
    const custState = customer?.state || "Maharashtra";
    const compProfile = getDocCompanyProfile(formCompanyId);
    const companyState = compProfile.state || "Maharashtra";
    const isGstEnabled = compProfile.enableGst !== false;

    const isIntrastate = String(custState).trim().toLowerCase() === String(companyState).trim().toLowerCase();

    const numAdditionalDiscount = Number(formAdditionalDiscount) || 0;
    const numFreight = Number(formFreight) || 0;

    formItems.forEach((item) => {
      const rate = Number(item.rate) || 0;
      const quantity = Number(item.quantity) || 0;
      const discountPercent = Number(item.discountPercent) || 0;
      const gstPercent = Number(item.gstPercent) || 0;

      const baseVal = rate * quantity;
      const discountVal = (baseVal * (discountPercent || 0)) / 100;
      const taxableVal = baseVal - discountVal;

      subtotal += baseVal;
      discountTotal += discountVal;

      const gstPercentToUse = isGstEnabled ? (gstPercent || 0) : 0;
      const totalGst = (taxableVal * gstPercentToUse) / 100;

      if (isIntrastate) {
        cgstTotal += totalGst / 2;
        sgstTotal += totalGst / 2;
      } else {
        igstTotal += totalGst;
      }
    });

    const grandTotal = subtotal - discountTotal - numAdditionalDiscount + numFreight + cgstTotal + sgstTotal + igstTotal;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      cgstTotal: Math.round(cgstTotal * 100) / 100,
      sgstTotal: Math.round(sgstTotal * 100) / 100,
      igstTotal: Math.round(igstTotal * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
    };
  };

  const saveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerId) {
      alert("Please select a customer.");
      return;
    }
    if (formItems.length === 0) {
      alert("Please add at least one line item.");
      return;
    }

    // Check if any row has empty product name/id
    const hasInvalid = formItems.some(it => !it.name && !it.productId);
    if (hasInvalid) {
      alert("Please choose a product or enter custom item names for all lines.");
      return;
    }

    const isEdit = activeSubView === "edit";
    const targetInvoiceNo = formInvoiceNo.toUpperCase().trim();

    if (isEdit) {
      const duplicate = invoices.find(i => i.id !== activeInvoiceId && i.invoiceNo.toUpperCase().trim() === targetInvoiceNo);
      if (duplicate) {
        alert(`Error: Another Proforma Invoice with the number "${formInvoiceNo}" already exists. Please provide a unique number.`);
        return;
      }
    } else {
      const duplicate = invoices.find(i => i.invoiceNo.toUpperCase().trim() === targetInvoiceNo);
      if (duplicate) {
        alert(`Error: A Proforma Invoice with the number "${formInvoiceNo}" already exists. Please provide a unique number.`);
        return;
      }
    }

    const totals = getFormCalculatedTotals();

    if (isEdit) {
      const updated = invoices.map(inv => {
        if (inv.id === activeInvoiceId) {
          return {
            ...inv,
            invoiceNo: formInvoiceNo,
            quotationNo: formQuotationNo || undefined,
            date: formDate,
            dueDate: formDueDate,
            customerId: formCustomerId,
            subject: formSubject,
            items: formItems.map(item => ({
              productId: item.productId,
              productName: item.name,
              description: item.description || "",
              quantity: item.quantity,
              rate: item.rate,
              discountPercent: item.discountPercent,
              gstPercent: item.gstPercent
            })),
            subtotal: totals.subtotal,
            discountTotal: totals.discountTotal,
            cgstTotal: totals.cgstTotal,
            sgstTotal: totals.sgstTotal,
            igstTotal: totals.igstTotal,
            grandTotal: totals.grandTotal,
            status: formStatus,
            terms: formTerms,
            companyId: formCompanyId,
            freight: formFreight,
            additionalDiscount: formAdditionalDiscount
          };
        }
        return inv;
      });
      onUpdateInvoices(updated);
      setActiveSubView("detail");
      alert("Proforma Invoice updated successfully!");
    } else {
      const newInvoice: ProformaInvoice = {
        id: "pi_" + Date.now(),
        invoiceNo: formInvoiceNo,
        quotationNo: formQuotationNo || undefined,
        date: formDate,
        dueDate: formDueDate,
        customerId: formCustomerId,
        subject: formSubject,
        items: formItems.map(item => ({
          productId: item.productId,
          productName: item.name,
          description: item.description || "",
          quantity: item.quantity,
          rate: item.rate,
          discountPercent: item.discountPercent,
          gstPercent: item.gstPercent
        })),
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        cgstTotal: totals.cgstTotal,
        sgstTotal: totals.sgstTotal,
        igstTotal: totals.igstTotal,
        grandTotal: totals.grandTotal,
        status: formStatus,
        terms: formTerms,
        companyId: formCompanyId,
        freight: formFreight,
        additionalDiscount: formAdditionalDiscount
      };

      // Increment company serial index counter for proforma invoice
      if (companyProfiles && onUpdateCompanyProfiles && formCompanyId) {
        const profile = companyProfiles.find(p => p.id === formCompanyId);
        const prefix = profile?.invoicePrefix || "PI";
        
        let nextNum = (profile?.nextInvoiceNumber || 1) + 1;
        // Parse serial number from formInvoiceNo to keep nextNum ahead
        const regex = new RegExp(`${prefix}-(\\d+)$`, 'i');
        const match = formInvoiceNo.match(regex);
        if (match) {
          const parsed = parseInt(match[1], 10);
          if (!isNaN(parsed) && parsed >= (profile?.nextInvoiceNumber || 1)) {
            nextNum = parsed + 1;
          }
        }

        const updatedProfiles = companyProfiles.map(p => {
          if (p.id === formCompanyId) {
            return {
              ...p,
              nextInvoiceNumber: nextNum
            };
          }
          return p;
        });
        onUpdateCompanyProfiles(updatedProfiles);
      }

      onUpdateInvoices([newInvoice, ...invoices]);
      setActiveInvoiceId(newInvoice.id);
      setActiveSubView("detail");
      alert("Proforma Invoice created successfully!");
    }
  };

  // Filter list
  const filteredInvoices = invoices.filter((inv) => {
    const client = customers.find(c => c.id === inv.customerId);
    const compName = client ? client.company : "";
    const clientName = client ? client.name : "";
    const matchesSearch = 
      (inv.invoiceNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((inv.subject || "").toLowerCase().includes(searchTerm.toLowerCase())) ||
      (compName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (clientName || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "All" || inv.status === statusFilter;
    const matchesCompany = companyFilter === "All" || inv.companyId === companyFilter;

    return matchesSearch && matchesStatus && matchesCompany;
  });

  return (
    <div className="space-y-6" id="proforma-invoices-workspace">
      {/* 1. LIST VIEW */}
      {activeSubView === "list" && (
        <div className="space-y-6">
          <div className="pb-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-left">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Proforma Invoices</h2>
              <p className="text-xs text-slate-500">Track advances, generate demand logs, and manage incoming corporate remittances</p>
            </div>
            <button
              onClick={openCreateForm}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold shadow-sm transition-all duration-150 cursor-pointer self-start md:self-auto"
            >
              <Plus className="w-4 h-4" /> Create Proforma Invoice
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-4 bg-white p-3.5 rounded-xl border border-slate-200 font-sans shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by invoice number, company, contact or subject details..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400 focus:border-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-4 flex-wrap md:flex-nowrap shrink-0">
              <div className="flex items-center gap-2">
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

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Status:</span>
                <select
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Invoices</option>
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
            </div>
          </div>

          {/* Invoices List Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-5">Invoice Number</th>
                    <th className="py-3.5 px-5">Attn Company</th>
                    <th className="py-3.5 px-5">Issue / Due Date</th>
                    <th className="py-3.5 px-5 text-right font-sans">Total amount due</th>
                    <th className="py-3.5 px-5 text-center">Status</th>
                    <th className="py-3.5 px-5 text-center">Action Workflow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                        No Proforma Invoices recorded in this session. Create one directly or convert an approved quotation to begin!
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const client = customers.find(c => c.id === inv.customerId);
                      return (
                        <tr 
                          key={inv.id} 
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => selectInvoice(inv.id)}
                        >
                          <td className="py-3 px-5 font-bold font-mono text-slate-900 text-sm">
                            {inv.invoiceNo}
                          </td>
                          <td className="py-3 px-5">
                            <div className="font-bold text-slate-850">
                              {client ? client.company : "N/A"}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              Ref Proposal: {inv.quotationNo || "Direct creation"}
                            </div>
                          </td>
                          <td className="py-3 px-5">
                            <span className="font-medium text-slate-600">
                              {formatDate(inv.date)}
                            </span>
                            <div className="text-[10px] text-rose-500 font-semibold">
                              Due: {formatDate(inv.dueDate)}
                            </div>
                          </td>
                          <td className="py-3 px-5 text-right font-bold text-slate-900 font-mono text-sm">
                            {formatINR(inv.grandTotal)}
                          </td>
                          <td className="py-3 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={inv.status}
                              onChange={(e) => {
                                const updated = invoices.map(item => {
                                  if (item.id === inv.id) {
                                    return { ...item, status: e.target.value as ProformaInvoice["status"] };
                                  }
                                  return item;
                                });
                                onUpdateInvoices(updated);
                              }}
                              className={`rounded-full px-2.5 py-0.5 font-bold text-[9px] border appearance-none outline-none text-center cursor-pointer ${
                                inv.status === "Paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                inv.status === "Unpaid" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              <option value="Unpaid">Unpaid</option>
                              <option value="Paid">Paid</option>
                              <option value="Overdue">Overdue</option>
                            </select>
                          </td>
                          <td className="py-3 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              {inv.status !== "Paid" && (
                                <button
                                  onClick={() => recordPayment(inv.id)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-600 text-emerald-850 hover:text-white text-xs font-bold border border-emerald-200 cursor-pointer transition-colors"
                                >
                                  <Coins className="w-3.5 h-3.5" /> Log Payment
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditForm(inv);
                                }}
                                className="p-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer"
                                title="Edit Invoice"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => deleteInvoice(inv.id, e)}
                                className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                                title="Delete Permanently"
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

      {/* 1.5 DIRECT CREATION / EDITING PANEL VIEW */}
      {(activeSubView === "create" || activeSubView === "edit") && (
        <form onSubmit={saveInvoice} className="space-y-6 max-w-5xl mx-auto bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-left">
          <div className="flex items-center justify-between pb-3 border-b border-slate-150">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveSubView("list")}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {activeSubView === "create" ? "Generate Proforma Invoice" : "Update Proforma Invoice"}
                </h3>
                <p className="text-xs text-slate-500">Configure client details, item lists, and auto-computed states</p>
              </div>
            </div>
          </div>

          {/* Issuing Corporate Profile */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-2 border-b border-slate-100 mb-2 font-sans">
            <div className="md:col-span-4 bg-slate-50/50 p-3.5 rounded-lg border border-slate-150">
              <label className="block text-indigo-950 text-[10px] font-extrabold uppercase mb-1 tracking-wider leading-none">
                Issuing Company Profile
              </label>
              <select
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                value={formCompanyId}
                onChange={(e) => {
                  const targetId = e.target.value;
                  setFormCompanyId(targetId);
                  const targetProfile = getDocCompanyProfile(targetId);
                  
                  if (activeSubView === "create") {
                    setFormInvoiceNo(generateNewInvoiceNumber(targetProfile));
                    if (targetProfile.termsPresets && targetProfile.termsPresets.length > 0) {
                      setFormTermsPresetId(targetProfile.termsPresets[0].id);
                      setFormTerms(targetProfile.termsPresets[0].content);
                    } else {
                      setFormTermsPresetId("");
                      setFormTerms(companySettings.defaultTerms || "");
                    }
                  }
                }}
              >
                {companyProfiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (GSTIN: {p.gstin} | State: {p.state})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-sans">
            {/* Field A - Invoice No */}
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Invoice Number</label>
              <input
                type="text"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 uppercase focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                value={formInvoiceNo}
                onChange={(e) => setFormInvoiceNo(e.target.value.toUpperCase())}
              />
            </div>

            {/* Field B - Quotation Ref */}
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Ref Quotation No (Optional)</label>
              <input
                type="text"
                placeholder="e.g. QTN-0001"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 uppercase focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                value={formQuotationNo}
                onChange={(e) => setFormQuotationNo(e.target.value.toUpperCase())}
              />
            </div>

            {/* Field C - Date */}
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Issue Date</label>
              <input
                type="date"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            {/* Field D - Due Date */}
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Due Date</label>
              <input
                type="date"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
            {/* Customer select */}
            <div className="md:col-span-2">
              <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Recipient Customer</label>
              <select
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                value={formCustomerId}
                onChange={(e) => setFormCustomerId(e.target.value)}
              >
                <option value="">-- Choose Corporate Recipient --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.company} | Contact: {c.name} ({c.state})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Select */}
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Payment Status</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
              >
                <option value="Unpaid">Unpaid / Awaiting Advance</option>
                <option value="Paid">Paid / Confirmed</option>
                <option value="Overdue">Overdue / Delayed</option>
              </select>
            </div>
          </div>

          {/* Subject Line */}
          <div className="font-sans">
            <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Subject / Project Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Supply and commissioning of server components..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              value={formSubject}
              onChange={(e) => setFormSubject(e.target.value)}
            />
          </div>

          {/* LINE ITEMS MANAGER */}
          <div className="space-y-3 font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Interactive Invoice Line Items</span>
              <button
                type="button"
                onClick={addFormItemRow}
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Line Row
              </button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {(() => {
                const compProfile = getDocCompanyProfile(formCompanyId);
                const isFormGstEnabled = compProfile.enableGst !== false;
                return (
                  <>
                    {formItems.map((item, idx) => (
                      <div 
                        key={idx}
                        className="grid grid-cols-1 md:grid-cols-12 gap-2.5 p-3.5 bg-slate-50 rounded-lg border border-slate-200 items-start"
                      >
                        {/* Select Product */}
                        <div className="md:col-span-4 rounded-md">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Product Catalog (Optional)</label>
                          <select
                            className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-800 focus:outline-none"
                            value={item.productId}
                            onChange={(e) => handleProductChangeInRow(idx, e.target.value)}
                          >
                            <option value="">-- Custom (Type Details Below) --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.sku} | {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Custom Name */}
                        <div className="md:col-span-4 rounded-md">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Item Title / Service Name</label>
                          <input
                            type="text"
                            required
                            placeholder="Enter product or service name"
                            className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-800 focus:outline-none"
                            value={item.name}
                            onChange={(e) => handleItemValueChange(idx, "name", e.target.value)}
                          />
                        </div>

                        {/* Quantity */}
                        <div className="md:col-span-1">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 text-center">Qty</label>
                          <input
                            type="number"
                            required
                            min="1"
                            className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-800 text-center focus:outline-none"
                            value={item.quantity}
                            onChange={(e) => handleItemValueChange(idx, "quantity", parseInt(e.target.value) || 1)}
                          />
                        </div>

                        {/* Rate */}
                        <div className="md:col-span-2">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 text-right">Unit Rate (₹)</label>
                          <input
                            type="number"
                            required
                            min="0"
                            className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-800 text-right font-mono focus:outline-none"
                            value={item.rate}
                            onChange={(e) => handleItemValueChange(idx, "rate", parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        {/* Trash Row Button */}
                        <div className="md:col-span-1 pt-5 flex justify-center">
                          <button
                            type="button"
                            onClick={() => removeFormItemRow(idx)}
                            disabled={formItems.length === 1}
                            className="p-1.5 rounded text-rose-500 hover:bg-rose-55 disabled:opacity-30 cursor-pointer"
                            title="Remove Row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Description row below */}
                        <div className={isFormGstEnabled ? "md:col-span-6 rounded-md" : "md:col-span-9 rounded-md"}>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Item Description / Specifications</label>
                          <input
                            type="text"
                            placeholder="Add supplementary description details..."
                            className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-600 focus:outline-none"
                            value={item.description || ""}
                            onChange={(e) => handleItemValueChange(idx, "description", e.target.value)}
                          />
                        </div>

                        {/* Trade Discount Percent */}
                        <div className="md:col-span-3">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 text-center">Trade Disc %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-800 text-center focus:outline-none font-mono"
                            value={item.discountPercent}
                            onChange={(e) => handleItemValueChange(idx, "discountPercent", parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        {/* GST Rate Percent */}
                        {isFormGstEnabled && (
                          <div className="md:col-span-3">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 text-center">GST rate %</label>
                            <select
                              className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
                              value={item.gstPercent}
                              onChange={(e) => handleItemValueChange(idx, "gstPercent", parseInt(e.target.value) || 18)}
                            >
                              <option value="0">0% Exempt</option>
                              <option value="5">5% Concessional</option>
                              <option value="12">12% Standard Lower</option>
                              <option value="18">18% Standard GST</option>
                              <option value="28">28% Luxury Tax</option>
                            </select>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Interactive live totals summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-slate-100 font-sans text-xs">
            {/* Terms Preset Selection & Terms Textarea */}
            <div className="space-y-4">
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Standard Terms Preset Selection</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  value={formTermsPresetId}
                  onChange={(e) => {
                    const presetId = e.target.value;
                    setFormTermsPresetId(presetId);
                    const compProfile = getDocCompanyProfile(formCompanyId);
                    const matchedPreset = compProfile.termsPresets?.find(preset => preset.id === presetId);
                    if (matchedPreset) {
                      setFormTerms(matchedPreset.content);
                    } else if (presetId === "default_terms") {
                      setFormTerms(companySettings.defaultTerms || "");
                    }
                  }}
                >
                  <option value="default_terms">-- Main Default Terms --</option>
                  {getDocCompanyProfile(formCompanyId).termsPresets?.map(preset => (
                    <option key={preset.id} value={preset.id}>
                      {preset.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Clauses & Bank Account Mandates</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Payment conditions, legal caveats..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none leading-relaxed"
                  value={formTerms}
                  onChange={(e) => setFormTerms(e.target.value)}
                />
              </div>
            </div>

            {/* Calculations right side panel */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
              <span className="block text-slate-505 font-extrabold uppercase tracking-widest text-[9px] pb-1 border-b border-slate-200">
                Summary tax ledger worksheet
              </span>

              {(() => {
                const calculated = getFormCalculatedTotals();
                const customer = customers.find(c => c.id === formCustomerId);
                const custState = customer?.state || "Maharashtra";
                const compProfile = getDocCompanyProfile(formCompanyId);
                const companyState = compProfile.state || "Maharashtra";
                const isIntrastate = (custState || "").trim().toLowerCase() === (companyState || "").trim().toLowerCase();
                const isGstEnabled = compProfile.enableGst !== false;

                return (
                  <div className="space-y-2 font-medium">
                    <div className="flex justify-between text-slate-650">
                      <span>Gross Base Value (Aggregated):</span>
                      <span className="font-mono text-slate-900">{formatINR(calculated.subtotal)}</span>
                    </div>

                    {calculated.discountTotal > 0 && (
                      <div className="flex justify-between text-rose-600 font-semibold">
                        <span>Trade Discount Amount:</span>
                        <span className="font-mono">- {formatINR(calculated.discountTotal)}</span>
                      </div>
                    )}

                    {/* Flat Discount Input field */}
                    <div className="flex items-center justify-between text-amber-700">
                      <span>Additional Flat Cash Discount (₹):</span>
                      <input
                        type="number"
                        min="0"
                        className="w-24 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-right font-mono text-slate-800 focus:outline-none"
                        value={formAdditionalDiscount}
                        onChange={(e) => setFormAdditionalDiscount(parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    {/* Freight / Shipping Input field */}
                    <div className="flex items-center justify-between text-indigo-700">
                      <span>Freight & Shipping Charges (₹):</span>
                      <input
                        type="number"
                        min="0"
                        className="w-24 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-right font-mono text-slate-800 focus:outline-none"
                        value={formFreight}
                        onChange={(e) => setFormFreight(parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="flex justify-between text-slate-700 font-extrabold border-b border-slate-200 border-dashed pb-1.5">
                      <span>{isGstEnabled ? "Net Taxable Value:" : "Net Total:"}</span>
                      <span className="font-mono">
                        {formatINR(calculated.subtotal - calculated.discountTotal - (formAdditionalDiscount || 0) + (formFreight || 0))}
                      </span>
                    </div>

                    {isGstEnabled && (isIntrastate ? (
                      <>
                        <div className="flex justify-between text-slate-500">
                          <span>Central GST (CGST component):</span>
                          <span className="font-mono text-slate-700">{formatINR(calculated.cgstTotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-505 pb-1.5 border-b border-slate-200 border-dashed">
                          <span>State GST (SGST component):</span>
                          <span className="font-mono text-slate-700">{formatINR(calculated.sgstTotal)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-slate-505 pb-1.5 border-b border-slate-200 border-dashed">
                        <span>Integrated GST (IGST total):</span>
                        <span className="font-mono text-slate-700">{formatINR(calculated.igstTotal)}</span>
                      </div>
                    ))}

                    <div className="flex justify-between text-indigo-900 font-bold text-sm pt-1 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                      <span className="uppercase tracking-wider text-[10px] text-indigo-950 flex items-center font-bold">Invoice Grand Total Due (INR):</span>
                      <span className="font-mono text-base text-indigo-950 font-black">{formatINR(calculated.grandTotal)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Form Actions footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-150">
            <button
              type="button"
              onClick={() => setActiveSubView("list")}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer shadow-sm"
            >
              {activeSubView === "create" ? "Generate & Save Invoice" : "Update & Store Invoice"}
            </button>
          </div>
        </form>
      )}

      {/* 2. SPECIFIC PREVIEW SCREEN (With Print layout) */}
      {activeSubView === "detail" && (
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Header toolbar */}
          <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl border border-slate-800 gap-4">
            <button
              onClick={() => setActiveSubView("list")}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-bold cursor-pointer uppercase tracking-wider"
            >
              <ArrowLeft className="w-5 h-5 text-indigo-500" /> Return to catalog
            </button>
            <div className="flex items-center gap-2">
              {getSelectedInvoice()?.status !== "Paid" && (
                <button
                  onClick={() => recordPayment(getSelectedInvoice()!.id)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer select-none"
                >
                  Confirm advance payment
                </button>
              )}
              {onConvertToTaxInvoice && (
                <button
                  onClick={() => {
                    const inv = getSelectedInvoice();
                    if (inv) {
                      onConvertToTaxInvoice(inv);
                      alert(`Proforma Invoice ${inv.invoiceNo} successfully converted to a Tax Invoice!`);
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  <FileText className="w-4 h-4" /> Convert to Tax Invoice
                </button>
              )}
              <button
                onClick={() => setIsEmailModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-800 hover:bg-blue-700 text-blue-200 hover:text-white text-xs font-bold cursor-pointer transition-colors"
              >
                <Mail className="w-4 h-4" /> Email Document
              </button>
              <button
                onClick={() => {
                  const inv = getSelectedInvoice();
                  if (inv) openEditForm(inv);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white text-xs font-bold cursor-pointer transition-colors"
              >
                <Edit className="w-4 h-4" /> Edit Invoice
              </button>
              <button
                onClick={() => {
                  const invoice = getSelectedInvoice();
                  if (invoice) {
                    const client = customers.find(c => c.id === invoice.customerId);
                    const customerName = client?.company || client?.name || "Customer";
                    const documentName = invoice.invoiceNo || "PROFORMA_INVOICE";
                    const originalTitle = document.title;
                    document.title = `${customerName.replace(/[^a-z0-9]/gi, '_')}_${documentName.toUpperCase().replace(/[^a-z0-9]/gi, '_')}`;
                    window.print();
                    document.title = originalTitle;
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-655 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
            </div>
          </div>

          {/* Printable Layout */}
          {(() => {
            const invoice = getSelectedInvoice();
            if (!invoice) return <div className="text-white">Loading invoice...</div>;
            
            const compProfile = getDocCompanyProfile(invoice.companyId);
            const client = customers.find(c => c.id === invoice.customerId);
            const isIntrastate = (client && compProfile) ? (client.state || "").trim().toLowerCase() === (compProfile.state || "").trim().toLowerCase() : true;
            const isGstEnabled = compProfile.enableGst !== false;

            return (
              <div 
                className="bg-white text-slate-900 p-8 sm:p-12 rounded-xl border border-slate-300 shadow-xl space-y-8 flex flex-col font-sans max-w-4xl mx-auto ring-1 ring-black/5 min-h-[100vh] print:min-h-[100vh]" 
                id="printable-area-container"
              >
                {/* Print specific CSS definitions */}
                <style dangerouslySetInnerHTML={{__html: `
                  @page {
                    margin: 0;
                  }
                  @media print {
                    body { -webkit-print-color-adjust: exact; zoom: 100%; }
                    body * { visibility: hidden; background-color: white !important; color: black !important; }
                    #printable-area-container, #printable-area-container * { visibility: visible; }
                    #printable-area-container { position: absolute; left: 0; top: 0; width: 100% !important; border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; }
                    
                    /* Table header repetition */
                    thead { display: table-header-group; }
                    /* Avoid breaking rows */
                    tr { page-break-inside: avoid; }
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
                          {compProfile.headerImage ? (
                            <div className="w-full flex flex-col items-center mb-4 print:hidden">
                              <img 
                                src={compProfile.headerImage} 
                                alt="Corporate Header Banner" 
                                className="w-full h-auto" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-950 pb-6 gap-4 text-left">
                              <div className="space-y-1 text-left">
                                <h1 className="text-2xl font-black uppercase text-indigo-950 tracking-wide">{compProfile.name}</h1>
                                <p className="text-xs text-slate-500 whitespace-pre-line leading-relaxed">{compProfile.address}</p>
                              </div>
                              <div className="text-left sm:text-right text-xs space-y-1">
                                <div>GSTIN: <span className="font-bold font-mono">{compProfile.gstin}</span></div>
                                {compProfile.pan && <div>PAN: <span className="font-bold font-mono">{compProfile.pan}</span></div>}
                                <div>State: <span className="font-bold">{compProfile.state}</span></div>
                                <div>Email: <span className="font-semibold text-slate-700">{compProfile.email}</span></div>
                              </div>
                            </div>
                          )}

                          {/* Document identification strip with prominent PROFORMA INVOICE Title */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-2.5 px-4 bg-slate-50 rounded-lg border border-slate-150 gap-4 text-xs font-sans mb-6">
                            <div className="text-left">
                              <span className="text-indigo-800 font-black uppercase text-[12px] tracking-wider block">PROFORMA INVOICE</span>
                              <span className="text-[10px] text-slate-500">For Customer:</span> <span className="font-bold text-slate-800 text-sm">{client?.company || "N/A"}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-slate-600">
                              <div>Doc #: <span className="font-bold text-slate-900 font-mono">{invoice.invoiceNo}</span></div>
                              {invoice.quotationNo && <div>Ref Quote: <span className="font-bold text-slate-900 font-mono">{invoice.quotationNo}</span></div>}
                              <div>Dated: <span className="font-bold text-slate-900">{formatDate(invoice.date)}</span></div>
                              <div>Due Date: <span className="font-bold text-slate-900">{formatDate(invoice.dueDate)}</span></div>
                              <div>Status: <span className="font-bold uppercase text-slate-900">{invoice.status}</span></div>
                            </div>
                          </div>


                {/* Billed to - Consignee Section (Updated with GSTIN) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs leading-relaxed mb-0 pb-0">
                  <div className="space-y-1 text-left">
                    <h3 className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Billed to Consignee</h3>
                    <div className="font-bold text-sm text-slate-800">{client?.company || "N/A"}</div>
                    
                    <div className="text-slate-600 leading-normal whitespace-pre-line">
                      {client?.billingAddress || "N/A"}
                    </div>
                    <div>GSTIN: <span className="font-semibold text-slate-800 font-mono">{client?.gstin || "URD/Unregistered"}</span></div>
                    <div>Contact Person: <span className="font-semibold text-slate-800">{client?.name || "N/A"}</span></div>
                    <div>Contact Call: <span className="font-semibold text-slate-800 font-mono">{client?.phone || "N/A"}</span></div>
                  </div>

                  <div className="space-y-1 text-left">
                    <h3 className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Shipping Destination</h3>
                    <div className="font-bold text-sm text-slate-800">{client?.company || "N/A"}</div>
                    <div className="text-slate-600 leading-normal whitespace-pre-line">
                      {client?.shippingAddress || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Solid spacer of exactly 0.25 inches */}
                <div style={{ height: "0.25in" }} className="w-full clear-both select-none pointer-events-none" />

                {/* Items list */}
                <div className="overflow-x-auto ring-1 ring-slate-150 rounded-lg mt-0 mb-8">
                  <table className="w-full text-left text-xs text-slate-700 min-w-[650px] border-collapse bg-transparent">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase text-[9px] font-black tracking-wider text-left">
                        <th className="py-3 px-4 text-center">#</th>
                        <th className="py-3 px-4 max-w-sm">Products and Services</th>
                        <th className="py-3 px-3 text-center">HSN Code</th>
                        <th className="py-3 px-3 text-center">Qty</th>
                        <th className="py-3 px-3 text-right">Rate</th>
                        <th className="py-3 px-3 text-center">Discount</th>
                        {isGstEnabled && <th className="py-3 px-3 text-center">Gst Rate</th>}
                        <th className="py-3 px-4 text-right">{isGstEnabled ? "Taxable Basic Value" : "Amount"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 text-left">
                      {invoice.items.map((item, idx) => {
                        const baseVal = item.rate * item.quantity;
                        const discVal = (baseVal * item.discountPercent) / 100;
                        const finalVal = baseVal - discVal;
                        return (
                           <tr key={idx} className="hover:bg-slate-50/55">
                            <td className="py-3 px-4 text-center font-bold text-slate-400 font-mono">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-800">{item.productName}</div>
                              {item.description && (
                                <div className="text-[10px] text-slate-500 font-normal leading-relaxed whitespace-pre-wrap mt-0.5">
                                  {item.description}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center font-mono">
                              {item.hsnCode || "-"}
                            </td>
                            <td className="py-3 px-3 text-center font-semibold font-mono">
                              {item.quantity}
                            </td>
                            <td className="py-3 px-3 text-right font-mono">
                              {formatINR(item.rate)}
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-rose-500">
                              {item.discountPercent > 0 ? `${item.discountPercent}%` : "-"}
                            </td>
                            {isGstEnabled && (
                              <td className="py-3 px-3 text-center font-semibold text-indigo-600">
                                {item.gstPercent}%
                              </td>
                            )}
                            <td className="py-3 px-4 text-right font-bold text-slate-800 font-mono">
                              {formatINR(finalVal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Subtotals & Taxes breakdown with standard values */}
                <div className="flex flex-col sm:flex-row justify-between gap-8 pt-4 items-start text-left">
                  {/* Left: General Bank Info */}
                  <div className="w-full sm:max-w-md p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-2 text-xs">
                    <span className="font-bold text-slate-500 uppercase select-none text-[9px] tracking-widest block pb-1 border-b border-slate-200">
                      Standard Remittance Details (RTGS/NEFT/IMPS)
                    </span>
                    <div className="grid grid-cols-3 gap-y-1 text-left">
                      <span className="text-slate-500">Bank Name:</span>
                      <span className="col-span-2 font-bold text-slate-800">{compProfile.bankName}</span>
                      
                      <span className="text-slate-500">Branch Name:</span>
                      <span className="col-span-2 font-semibold text-slate-800">{compProfile.bankBranch}</span>
                      
                      <span className="text-slate-500">Account No:</span>
                      <span className="col-span-2 font-mono font-bold text-slate-900">{compProfile.accountNo}</span>
                      
                      <span className="text-slate-500">IFSC Code:</span>
                      <span className="col-span-2 font-mono font-bold text-indigo-750">{compProfile.ifsc}</span>
                    </div>
                  </div>

                  {/* Calculations summary alignment */}
                  <div className="w-full sm:max-w-xs space-y-2 text-xs font-medium text-left">
                    <div className="flex justify-between text-slate-500">
                      <span>Total Base Subtotal:</span>
                      <span className="font-mono text-slate-800">{formatINR(invoice.subtotal)}</span>
                    </div>
                    {invoice.discountTotal > 0 && (
                      <div className="flex justify-between text-rose-500 font-medium">
                        <span>Item-Level Trade Discount:</span>
                        <span className="font-mono">- {formatINR(invoice.discountTotal)}</span>
                      </div>
                    )}
                    {invoice.additionalDiscount && invoice.additionalDiscount > 0 ? (
                      <div className="flex justify-between text-amber-700 font-semibold">
                        <span>Additional flat Discount:</span>
                        <span className="font-mono">- {formatINR(invoice.additionalDiscount)}</span>
                      </div>
                    ) : null}
                    {invoice.freight && invoice.freight > 0 ? (
                      <div className="flex justify-between text-indigo-700 font-semibold">
                        <span>Freight / Shipping Charges:</span>
                        <span className="font-mono">+ {formatINR(invoice.freight)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between text-slate-600 border-b border-dashed border-slate-200 pb-1.5 font-bold">
                      <span>{isGstEnabled ? "Taxable Value (Net):" : "Subtotal:"}</span>
                      <span className="font-mono text-slate-900 font-bold">
                        {formatINR(invoice.subtotal - invoice.discountTotal - (invoice.additionalDiscount || 0) + (invoice.freight || 0))}
                      </span>
                    </div>

                    {isGstEnabled && (isIntrastate ? (
                      <>
                        <div className="flex justify-between text-slate-505">
                          <span>Central GST (CGST component):</span>
                          <span className="font-mono text-slate-700">{formatINR(invoice.cgstTotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-505 pb-1.5 border-b border-slate-200 border-dashed">
                          <span>State GST (SGST component):</span>
                          <span className="font-mono text-slate-700">{formatINR(invoice.sgstTotal)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-slate-505 pb-1.5 border-b border-slate-200 border-dashed">
                        <span>Integrated GST (IGST total):</span>
                        <span className="font-mono text-slate-700">{formatINR(invoice.igstTotal)}</span>
                      </div>
                    ))}

                    <div className="flex justify-between text-indigo-900 font-sans font-black text-sm pt-1.5 leading-none">
                      <span className="uppercase text-[10px] tracking-wider text-indigo-705 font-bold">Invoice Total Due:</span>
                      <span className="font-mono text-lg text-indigo-950 font-black">{formatINR(invoice.grandTotal)}</span>
                    </div>

                    {invoice.status === "Paid" && (
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/50 flex items-center justify-center gap-1.5 text-emerald-800 font-bold uppercase text-[10px] tracking-wider mt-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        Fully Paid / Cleared
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer terms */}
                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 leading-normal text-[11px] text-left page-break-inside-avoid">
                  <div className="text-left space-y-2 whitespace-pre-line text-[#5c657a]">
                    <div className="font-bold text-[#3e485e] uppercase tracking-wider text-[10px] select-none mb-3">Remittance Requirements & Conditions</div>
                    <div className="leading-relaxed">
                      {invoice.terms || compProfile.termsPresets?.[0]?.content || companySettings.defaultTerms}
                    </div>
                  </div>
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
      
      {activeInvoiceId && (
        <EmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          documentName={`${customers.find(c => c.id === getSelectedInvoice()?.customerId)?.company?.replace(/[^a-zA-Z0-9]/g, '_') || 'Customer'}_${getSelectedInvoice()?.invoiceNo || 'Proforma'}`}
          customerEmail={customers.find(c => c.id === getSelectedInvoice()?.customerId)?.email || ''}
          defaultSubject={`Proforma Invoice ${getSelectedInvoice()?.invoiceNo} from ${companyProfiles.find(p => p.id === getSelectedInvoice()?.companyId)?.name || 'Us'}`}
          defaultBody={`Dear ${customers.find(c => c.id === getSelectedInvoice()?.customerId)?.name || 'Customer'},\n\nPlease find attached the payment proforma ${getSelectedInvoice()?.invoiceNo}.\n\nThank you for your business!`}
        />
      )}
    </div>
  );
}
