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
import { TaxInvoice, Customer, Product, CompanySettings, CompanyProfile } from "../types";
import { formatINR, formatDate, toInputDate } from "../utils";
import { EmailModal } from "./EmailModal";

interface TaxInvoiceViewProps {
  taxInvoices: TaxInvoice[];
  customers: Customer[];
  products: Product[];
  companySettings: CompanySettings;
  companyProfiles?: CompanyProfile[];
  onUpdateTaxInvoices: (updated: TaxInvoice[]) => void;
  onUpdateCompanyProfiles?: (updated: CompanyProfile[]) => void;
  initialSubView?: "list" | "create";
  onSubViewChange?: (view: "list" | "create" | "detail" | "edit") => void;
  activeCompanyId?: string;
}

export default function TaxInvoiceView({
  taxInvoices = [],
  customers = [],
  products = [],
  companySettings,
  companyProfiles = [],
  onUpdateTaxInvoices,
  onUpdateCompanyProfiles,
  initialSubView,
  onSubViewChange,
  activeCompanyId = ""
}: TaxInvoiceViewProps) {
  
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

  // Form State variables
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
  const [formStatus, setFormStatus] = useState<TaxInvoice["status"]>("Unpaid");

  // Helper sequence generator
  const generateNewInvoiceNumber = (profile: any) => {
    const prefix = profile.taxInvoicePrefix || "TI";
    let nextNum = profile.nextTaxInvoiceNumber || 1;
    
    let candidate = `${prefix}-${String(nextNum).padStart(4, '0')}`;
    while (taxInvoices.some(i => i.invoiceNo.toUpperCase().trim() === candidate.toUpperCase().trim())) {
      nextNum++;
      candidate = `${prefix}-${String(nextNum).padStart(4, '0')}`;
    }
    return candidate;
  };

  const selectInvoice = (invId: string) => {
    setActiveInvoiceId(invId);
    setActiveSubView("detail");
  };

  const getSelectedInvoice = (): TaxInvoice | undefined => {
    return taxInvoices.find(i => i.id === activeInvoiceId);
  };

  // Helper lookup for active company settings per invoice
  const getDocCompanyProfile = (docCompanyId?: string) => {
    const profile = companyProfiles.find(p => p.id === docCompanyId);
    if (profile) return profile;
    
    // Return default company if found
    const defaultProfile = companyProfiles.find(p => p.isDefault);
    if (defaultProfile) return defaultProfile;

    // Fallback to settings
    return {
      id: companyProfiles[0]?.id || "comp_apex",
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
    const updated = taxInvoices.map(v => {
      if (v.id === invoiceId) {
        return { ...v, status: "Paid" as const };
      }
      return v;
    });
    onUpdateTaxInvoices(updated);
    alert("Payment received successfully! The Tax Invoice status has been updated to PAID.");
  };

  // Delete invoice
  const deleteInvoice = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this tax invoice permanently?")) {
      const updated = taxInvoices.filter(i => i.id !== id);
      onUpdateTaxInvoices(updated);
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

    // Prefer active company profile, default company profile, otherwise first profile
    const initialProfile = companyProfiles.find(p => p.id === activeCompanyId) || companyProfiles.find(p => p.isDefault) || companyProfiles[0] || { id: "comp_apex" };
    const resolvedProfile = getDocCompanyProfile(initialProfile.id);

    setFormCompanyId(resolvedProfile.id || "comp_apex");
    setFormInvoiceNo(generateNewInvoiceNumber(resolvedProfile));
    setFormQuotationNo("");
    setFormDate(todayStr);
    setFormDueDate(expStr);
    setFormCustomerId("");
    setFormSubject("");
    setFormItems([]);
    setFormFreight(0);
    setFormAdditionalDiscount(0);
    setFormTerms(resolvedProfile.termsPresets?.[0]?.content || companySettings.defaultTerms || "");
    setFormStatus("Unpaid");

    setActiveSubView("create");
  };

  const openEditForm = (inv: TaxInvoice) => {
    setFormCompanyId(inv.companyId || companyProfiles[0]?.id || "comp_apex");
    setFormInvoiceNo(inv.invoiceNo);
    setFormQuotationNo(inv.quotationNo || "");
    setFormDate(toInputDate(inv.date));
    setFormDueDate(toInputDate(inv.dueDate));
    setFormCustomerId(inv.customerId);
    setFormSubject(inv.subject || "");
    setFormItems(inv.items.map(item => ({ ...item })));
    setFormFreight(inv.freight || 0);
    setFormAdditionalDiscount(inv.additionalDiscount || 0);
    setFormTerms(inv.terms);
    setFormStatus(inv.status);

    setActiveInvoiceId(inv.id);
    setActiveSubView("edit");
  };

  const handleCompanyChange = (companyId: string) => {
    setFormCompanyId(companyId);
    const resolvedProfile = getDocCompanyProfile(companyId);
    setFormInvoiceNo(generateNewInvoiceNumber(resolvedProfile));
    if (resolvedProfile.termsPresets && resolvedProfile.termsPresets.length > 0) {
      setFormTerms(resolvedProfile.termsPresets[0].content);
    }
  };

  const addItemRow = () => {
    setFormItems([
      ...formItems,
      {
        productId: "",
        productName: "",
        description: "",
        hsnCode: "",
        quantity: 1,
        rate: 0,
        discountPercent: 0,
        gstPercent: 18
      }
    ]);
  };

  const updateItemRow = (index: number, field: string, value: any) => {
    const updated = [...formItems];
    if (field === "productId") {
      const prod = products.find(p => p.id === value);
      if (prod) {
        updated[index] = {
          ...updated[index],
          productId: prod.id,
          productName: prod.name,
          hsnCode: prod.hsnCode || "",
          rate: prod.sellPrice || prod.rate || 0,
          description: prod.description || "",
          gstPercent: prod.gstRate || 18
        };
      } else {
        updated[index].productId = "";
      }
    } else {
      updated[index][field] = value;
    }
    setFormItems(updated);
  };

  const removeItemRow = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const calculateTotals = (items: any[], freightVal: number, extraDiscount: number, customerState: string, compState: string, enableGst: boolean) => {
    let subtotal = 0;
    let discountTotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    items.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const discPercent = parseFloat(item.discountPercent) || 0;
      const gstPercent = parseFloat(item.gstPercent) || 0;

      const itemTotal = qty * rate;
      const itemDisc = itemTotal * (discPercent / 100);
      const taxableVal = itemTotal - itemDisc;

      subtotal += itemTotal;
      discountTotal += itemDisc;

      if (enableGst) {
        const gstAmount = taxableVal * (gstPercent / 100);
        // Determine CGST + SGST vs IGST
        if (customerState.trim().toUpperCase() === compState.trim().toUpperCase()) {
          cgstTotal += gstAmount / 2;
          sgstTotal += gstAmount / 2;
        } else {
          igstTotal += gstAmount;
        }
      }
    });

    const netTaxable = subtotal - discountTotal - extraDiscount;
    const totalGst = enableGst ? (cgstTotal + sgstTotal + igstTotal) : 0;
    const grandTotal = netTaxable + totalGst + freightVal;

    return {
      subtotal,
      discountTotal: discountTotal + extraDiscount,
      cgstTotal: enableGst ? cgstTotal : 0,
      sgstTotal: enableGst ? sgstTotal : 0,
      igstTotal: enableGst ? igstTotal : 0,
      grandTotal: Math.max(0, grandTotal)
    };
  };

  const saveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerId) {
      alert("Please select a customer to map corporate billing addresses.");
      return;
    }
    if (formItems.length === 0) {
      alert("Please append at least one itemized product billing row.");
      return;
    }

    const customer = customers.find(c => c.id === formCustomerId);
    const selectedCompany = getDocCompanyProfile(formCompanyId);
    
    const customerState = customer?.state || "Maharashtra";
    const compState = selectedCompany.state || "Maharashtra";
    const enableGst = selectedCompany.enableGst !== false;

    const computed = calculateTotals(formItems, formFreight, formAdditionalDiscount, customerState, compState, enableGst);

    const isEditing = activeSubView === "edit";
    
    // Auto increment setting update helper
    if (!isEditing && onUpdateCompanyProfiles) {
      const profile = companyProfiles.find(p => p.id === formCompanyId);
      if (profile) {
        const updatedProfiles = companyProfiles.map(p => {
          if (p.id === formCompanyId) {
            return {
              ...p,
              nextTaxInvoiceNumber: (p.nextTaxInvoiceNumber || 1) + 1
            };
          }
          return p;
        });
        onUpdateCompanyProfiles(updatedProfiles);
      }
    }

    const savedDoc: TaxInvoice = {
      id: isEditing && activeInvoiceId ? activeInvoiceId : "tax_inv_" + Date.now(),
      invoiceNo: formInvoiceNo,
      quotationNo: formQuotationNo || undefined,
      date: formDate,
      dueDate: formDueDate,
      customerId: formCustomerId,
      subject: formSubject || undefined,
      items: formItems.map(item => ({
        productId: item.productId || "",
        productName: item.productName,
        description: item.description,
        hsnCode: item.hsnCode,
        quantity: parseFloat(item.quantity) || 1,
        rate: parseFloat(item.rate) || 0,
        discountPercent: parseFloat(item.discountPercent) || 0,
        gstPercent: parseFloat(item.gstPercent) || 18
      })),
      subtotal: computed.subtotal,
      discountTotal: computed.discountTotal,
      cgstTotal: computed.cgstTotal,
      sgstTotal: computed.sgstTotal,
      igstTotal: computed.igstTotal,
      grandTotal: computed.grandTotal,
      status: formStatus,
      terms: formTerms,
      companyId: formCompanyId,
      freight: formFreight,
      additionalDiscount: formAdditionalDiscount
    };

    let updatedList: TaxInvoice[];
    if (isEditing) {
      updatedList = taxInvoices.map(i => i.id === activeInvoiceId ? savedDoc : i);
    } else {
      updatedList = [savedDoc, ...taxInvoices];
    }

    onUpdateTaxInvoices(updatedList);
    setActiveInvoiceId(savedDoc.id);
    setActiveSubView("detail");
  };

  const handlePrint = () => {
    const invoice = getSelectedInvoice();
    if (invoice) {
      const client = customers.find(c => c.id === invoice.customerId);
      const customerName = client?.company || client?.name || "Customer";
      const documentName = invoice.invoiceNo || "TAX_INVOICE";
      const originalTitle = document.title;
      document.title = `${customerName.replace(/[^a-z0-9]/gi, '_')}_${documentName.toUpperCase().replace(/[^a-z0-9]/gi, '_')}`;
      window.print();
      document.title = originalTitle;
    }
  };

  const filteredInvoices = taxInvoices.filter(i => {
    const customer = customers.find(c => c.id === i.customerId);
    const customerName = customer?.name || "";
    const customerCompany = customer?.company || "";
    const matchesSearch = 
      i.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerCompany.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.subject && i.subject.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "All" || i.status === statusFilter;
    const matchesCompany = companyFilter === "All" || i.companyId === companyFilter;

    return matchesSearch && matchesStatus && matchesCompany;
  });

  const selectedInvoice = getSelectedInvoice();
  const selectedInvoiceCustomer = selectedInvoice ? customers.find(c => c.id === selectedInvoice.customerId) : null;
  const selectedInvoiceCompany = selectedInvoice ? getDocCompanyProfile(selectedInvoice.companyId) : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans" id="tax-invoices-dashboard">
      
      {/* List Subview */}
      {activeSubView === "list" && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="text-indigo-600 w-7 h-7" /> Tax Invoices Management
              </h2>
              <p className="text-xs text-slate-500 font-sans">Draft, dispatch, and track formal GST Tax Invoices linked directly to books</p>
            </div>
            <button
              onClick={openCreateForm}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" /> Create Tax Invoice
            </button>
          </div>

          {/* Filters & Search Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm shadow-slate-100/50">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by invoice #, customer name, company, or subject..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold text-slate-700"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Payments</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>

            <div>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold text-slate-700"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
              >
                <option value="All">All Issuing Profiles</option>
                {companyProfiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] font-black uppercase text-slate-450 tracking-wider">
                    <th className="py-3.5 px-4">Invoice No</th>
                    <th className="py-3.5 px-4">Billing Customer</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4 text-right">Grand Total</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        No tax invoices discovered matching the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const cust = customers.find(c => c.id === inv.customerId);
                      const isPaid = inv.status === "Paid";
                      
                      return (
                        <tr 
                          key={inv.id}
                          onClick={() => selectInvoice(inv.id)}
                          className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                            {inv.invoiceNo}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-slate-900">{cust?.name || "Placeholder Cust"}</div>
                            <div className="text-[10px] text-slate-400 font-sans">{cust?.company}</div>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-600">{formatDate(inv.date)}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-600">{formatDate(inv.dueDate)}</td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                            {formatINR(inv.grandTotal)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isPaid ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-250"
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditForm(inv)}
                                className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg"
                                title="Edit invoice"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => deleteInvoice(inv.id, e)}
                                className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                title="Delete invoice"
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

      {/* Detail View Subview */}
      {activeSubView === "detail" && selectedInvoice && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4 print:hidden">
            <button
              onClick={() => setActiveSubView("list")}
              className="text-slate-500 hover:text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Invoices List
            </button>
            <div className="flex items-center gap-2">
              {selectedInvoice.status !== "Paid" && (
                <button
                  onClick={() => recordPayment(selectedInvoice.id)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/20"
                >
                  <Coins className="w-4 h-4" /> Record Account Receipt
                </button>
              )}
              <button
                onClick={() => setIsEmailModalOpen(true)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer border border-slate-300"
              >
                <Mail className="w-4 h-4" /> Dispatch Email
              </button>
              <button
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
            </div>
          </div>

          {/* Printable Layout */}
          {(() => {
            const invoice = selectedInvoice;
            const compProfile = selectedInvoiceCompany;
            const client = selectedInvoiceCustomer;
            if (!invoice || !compProfile) return <div className="text-slate-800">Loading invoice...</div>;
            
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
                          {/* Document ID info block below header graphic */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-2.5 px-4 bg-slate-50 rounded-lg border border-slate-150 gap-4 text-xs font-sans mb-6">
                            <div>
                              <span className="text-slate-450 font-bold uppercase text-[9px] tracking-wider block">Official {isGstEnabled ? "TAX INVOICE" : "RETAIL INVOICE"} for</span>
                              <span className="font-bold text-slate-800 text-sm">{client?.company || client?.name || "N/A"}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-slate-600">
                              <div>Invoice #: <span className="font-bold text-slate-900 font-mono">{invoice.invoiceNo}</span></div>
                              {invoice.quotationNo && <div>Linked Quote: <span className="font-semibold text-indigo-750 font-mono">{invoice.quotationNo}</span></div>}
                              <div>Dated: <span className="font-bold text-slate-900">{formatDate(invoice.date)}</span></div>
                              <div>Due Date: <span className="font-bold text-slate-900">{formatDate(invoice.dueDate)}</span></div>
                              <div>Status: <span className="font-bold uppercase">{invoice.status}</span></div>
                            </div>
                          </div>

                          {/* Billed to - Consignee Section */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs leading-relaxed mb-0 pb-0">
                            <div className="space-y-1 text-left">
                              <h3 className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Billed to Consignee</h3>
                              <div className="font-bold text-sm text-slate-800">{client?.company || "N/A"}</div>
                              
                              <div className="text-slate-600 leading-normal whitespace-pre-line">
                                {client?.billingAddress || "N/A"}
                              </div>
                              {client?.gstin && <div>GSTIN: <span className="font-semibold text-slate-800 font-mono">{client.gstin}</span></div>}
                              <div>Contact Person: <span className="font-semibold text-slate-800">{client?.name || "N/A"}</span></div>
                              {client?.phone && <div>Contact Call: <span className="font-semibold text-slate-800 font-mono">{client.phone}</span></div>}
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

                          {/* Subtotals & Taxes breakdown */}
                          <div className="flex flex-col sm:flex-row justify-between gap-8 pt-4 items-start text-left">
                            {/* Left: General Bank Info */}
                            <div className="w-full sm:max-w-md p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-2 text-xs font-sans">
                              <span className="font-bold text-slate-500 uppercase select-none text-[9px] tracking-widest block pb-1 border-b border-slate-200">
                                Standard Remittance Details (RTGS/NEFT/IMPS)
                              </span>
                              <div className="grid grid-cols-3 gap-y-1 text-left font-medium">
                                <span className="text-slate-500 font-normal">Bank Name:</span>
                                <span className="col-span-2 font-bold text-slate-800">{compProfile.bankName}</span>
                                
                                <span className="text-slate-500 font-normal">Branch Name:</span>
                                <span className="col-span-2 font-semibold text-slate-800">{compProfile.bankBranch}</span>
                                
                                <span className="text-slate-500 font-normal">Account No:</span>
                                <span className="col-span-2 font-mono font-bold text-slate-900">{compProfile.accountNo}</span>
                                
                                <span className="text-slate-500 font-normal">IFSC Code:</span>
                                <span className="col-span-2 font-mono font-bold text-indigo-750">{compProfile.ifsc}</span>
                              </div>
                            </div>

                            {/* Calculations summary alignment */}
                            <div className="w-full sm:max-w-xs space-y-2 text-xs font-medium text-left font-sans">
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
                            <div className="text-left space-y-2 whitespace-pre-line text-[#5c657a] font-sans">
                              <div className="font-bold text-[#3e485e] uppercase tracking-wider text-[10px] select-none mb-3">Remittance Requirements & Conditions</div>
                              <div className="leading-relaxed">
                                {invoice.terms || compProfile.termsPresets?.[0]?.content}
                              </div>
                            </div>
                            <div className="text-right space-y-4 select-none flex flex-col items-end font-sans">
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

          <EmailModal
            isOpen={isEmailModalOpen}
            onClose={() => setIsEmailModalOpen(false)}
            documentName={`${selectedInvoiceCompany?.enableGst !== false ? "Tax Invoice" : "Retail Invoice"} ${selectedInvoice.invoiceNo}`}
            customerEmail={selectedInvoiceCustomer?.email || ""}
            defaultSubject={`${selectedInvoiceCompany?.enableGst !== false ? "Tax Invoice" : "Retail Invoice"} ${selectedInvoice.invoiceNo} from ${selectedInvoiceCompany?.name}`}
            defaultBody={`Respected Sir/Madam,\n\nPlease find attached formal ${selectedInvoiceCompany?.enableGst !== false ? "Tax Invoice" : "Retail Invoice"} #${selectedInvoice.invoiceNo} with grand total of ${formatINR(selectedInvoice.grandTotal)}.\n\nKindly acknowledge and process receipts.\n\nWarm regards,\n${selectedInvoiceCompany?.name}`}
          />
        </div>
      )}

      {/* Create / Edit View */}
      {(activeSubView === "create" || activeSubView === "edit") && (
        <form onSubmit={saveInvoice} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <FileText className="text-indigo-600 w-5.5 h-5.5" /> 
              {activeSubView === "create" 
                ? `Create New ${getDocCompanyProfile(formCompanyId)?.enableGst !== false ? "Tax Invoice" : "Retail Invoice"}` 
                : `Modify ${getDocCompanyProfile(formCompanyId)?.enableGst !== false ? "Tax Invoice" : "Retail Invoice"} Details`
              }
            </h3>
            <button
              type="button"
              onClick={() => setActiveSubView("list")}
              className="text-slate-500 hover:text-slate-800 font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              ✕ Cancel Form
            </button>
          </div>

          {/* Top Form Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-sans">
            <div>
              <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Issuing Company Profile</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-bold text-slate-700"
                value={formCompanyId}
                onChange={(e) => handleCompanyChange(e.target.value)}
              >
                {companyProfiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.isDefault && "(Default)"}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Invoice Number</label>
              <input
                type="text"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-mono font-bold text-indigo-700"
                value={formInvoiceNo}
                onChange={(e) => setFormInvoiceNo(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Linked Quotation No (Optional)</label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
                value={formQuotationNo}
                onChange={(e) => setFormQuotationNo(e.target.value)}
                placeholder="e.g. QTN-APEX-002"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Payment Status</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-bold text-slate-700"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
            <div>
              <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Consignee Customer</label>
              <select
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-bold text-slate-700"
                value={formCustomerId}
                onChange={(e) => setFormCustomerId(e.target.value)}
              >
                <option value="">-- Choose Consignee --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ""}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Invoice Date</label>
              <input
                type="date"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-semibold"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Due Date</label>
              <input
                type="date"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-semibold"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide font-sans">Subject Line (Optional)</label>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-semibold text-xs"
              value={formSubject}
              onChange={(e) => setFormSubject(e.target.value)}
              placeholder="e.g. Annual Maintenance Retainership contract for Cloud systems"
            />
          </div>

          {/* Itemized row forms list */}
          <div className="space-y-3 font-sans">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Particulars of Invoiced Items</span>
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1 border border-indigo-200 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Append Product Billing Line
              </button>
            </div>

            <div className="space-y-3">
              {formItems.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 font-bold text-xs">
                  No billing lines appended. Append one now to build invoice subtotal books.
                </div>
              ) : (
                formItems.map((item, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative">
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 p-1 hover:bg-slate-100 rounded-lg shrink-0 transition-all cursor-pointer"
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 text-xs font-sans">
                      <div className="md:col-span-2">
                        <label className="block text-slate-500 font-bold mb-1 uppercase text-[8px] tracking-wide">Select registered catalog product</label>
                        <select
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-bold text-slate-700"
                          value={item.productId || ""}
                          onChange={(e) => updateItemRow(idx, "productId", e.target.value)}
                        >
                          <option value="">-- Custom Manual Billing Item --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-slate-500 font-bold mb-1 uppercase text-[8px] tracking-wide">Product / Service Name</label>
                        <input
                          type="text"
                          required
                          placeholder="Manual entry label"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-bold text-slate-800"
                          value={item.productName || ""}
                          onChange={(e) => updateItemRow(idx, "productName", e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 font-bold mb-1 uppercase text-[8px] tracking-wide">HSN Code</label>
                        <input
                          type="text"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-mono font-semibold"
                          value={item.hsnCode || ""}
                          onChange={(e) => updateItemRow(idx, "hsnCode", e.target.value)}
                          placeholder="e.g. 9987"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 font-bold mb-1 uppercase text-[8px] tracking-wide">GST percentage</label>
                        <select
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-500 font-bold text-slate-700"
                          value={item.gstPercent}
                          onChange={(e) => updateItemRow(idx, "gstPercent", parseInt(e.target.value) || 18)}
                        >
                          <option value="18">18% Standard</option>
                          <option value="12">12% Intermediate</option>
                          <option value="5">5% Essential</option>
                          <option value="28">28% Luxury</option>
                          <option value="0">0% Exempt</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-sans">
                      <div className="md:col-span-2">
                        <label className="block text-slate-500 font-bold mb-1 uppercase text-[8px] tracking-wide">Billing details or scope details</label>
                        <textarea
                          placeholder="Add further specific billing item info..."
                          rows={1}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                          value={item.description || ""}
                          onChange={(e) => updateItemRow(idx, "description", e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2 md:col-span-2">
                        <div>
                          <label className="block text-slate-500 font-bold mb-1 uppercase text-[8px] tracking-wide">Qty</label>
                          <input
                            type="number"
                            required
                            min="0.001"
                            step="any"
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-center"
                            value={item.quantity}
                            onChange={(e) => updateItemRow(idx, "quantity", e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="block text-slate-500 font-bold mb-1 uppercase text-[8px] tracking-wide">Unit Rate (INR)</label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="any"
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-right"
                            value={item.rate}
                            onChange={(e) => updateItemRow(idx, "rate", e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="block text-slate-500 font-bold mb-1 uppercase text-[8px] tracking-wide">Discount %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-bold font-mono text-center"
                            value={item.discountPercent}
                            onChange={(e) => updateItemRow(idx, "discountPercent", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Freight & Extra Discounts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
            <div>
              <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Freight & Forwarding Charges (INR)</label>
              <input
                type="number"
                min="0"
                step="any"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                value={formFreight}
                onChange={(e) => setFormFreight(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Additional Flat Discount (INR)</label>
              <input
                type="number"
                min="0"
                step="any"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-mono font-bold text-red-600"
                value={formAdditionalDiscount}
                onChange={(e) => setFormAdditionalDiscount(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide font-sans">Legal declarations and payment instructions presets</label>
            <textarea
              required
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs focus:outline-none focus:border-indigo-500 font-sans font-medium"
              value={formTerms}
              onChange={(e) => setFormTerms(e.target.value)}
              placeholder="e.g. 1. Terms of payment: 30 days clear.\n2. Goods once sold cannot be returned."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 font-sans">
            <button
              type="button"
              onClick={() => setActiveSubView("list")}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer shadow-md"
            >
              <CheckCircle className="w-4 h-4" /> Save & Build {getDocCompanyProfile(formCompanyId)?.enableGst !== false ? "Tax Invoice" : "Retail Invoice"}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
