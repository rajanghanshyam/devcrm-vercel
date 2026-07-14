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
  ChevronRight, 
  ArrowLeft, 
  Check, 
  Download,
  Percent,
  FileCheck2,
  Calendar,
  Layers,
  Sparkles,
  Mail,
  PenTool
} from "lucide-react";
import { Quotation, Customer, Product, CompanySettings, QuotationItem, CompanyProfile } from "../types";
import { formatINR, formatDate, calculateTaxTotals, toInputDate } from "../utils";
import { EmailModal } from "./EmailModal";

interface QuotationsViewProps {
  quotations: Quotation[];
  customers: Customer[];
  products: Product[];
  companySettings: CompanySettings;
  companyProfiles?: CompanyProfile[];
  onUpdateCompanyProfiles?: (updated: CompanyProfile[]) => void;
  onUpdateQuotations: (updated: Quotation[]) => void;
  onConvertToInvoice: (quote: Quotation) => void;
  onUpdateCustomers: (updated: Customer[]) => void;
  onUpdateProducts: (updated: Product[]) => void;
}

export default function QuotationsView({
  quotations,
  customers,
  products,
  companySettings,
  companyProfiles = [],
  onUpdateCompanyProfiles,
  onUpdateQuotations,
  onConvertToInvoice,
  onUpdateCustomers,
  onUpdateProducts
}: QuotationsViewProps) {
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [coverTheme, setCoverTheme] = useState<"classic-blue" | "modern-gold" | "tech-dark" | "minimal-charcoal" | "corporate-accent">("corporate-accent");
  const [includeCoverPage, setIncludeCoverPage] = useState(false);
  
  // Views navigation inside Quotations: "list" | "create" | "detail" | "edit"
  const [activeSubView, setActiveSubView] = useState<"list" | "create" | "detail" | "edit">("list");
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // Quick Create Modal States
  const [openQuickCustomerModal, setOpenQuickCustomerModal] = useState(false);
  const [openQuickProductModal, setOpenQuickProductModal] = useState(false);
  const [activeItemRowIdxForQuickProd, setActiveItemRowIdxForQuickProd] = useState<number | null>(null);

  // Quick Customer Form Fields
  const [quickCustCompany, setQuickCustCompany] = useState("");
  const [quickCustName, setQuickCustName] = useState("");
  const [quickCustEmail, setQuickCustEmail] = useState("");
  const [quickCustPhone, setQuickCustPhone] = useState("");
  const [quickCustGstin, setQuickCustGstin] = useState("");
  const [quickCustState, setQuickCustState] = useState("Maharashtra");
  const [quickCustBillingAddress, setQuickCustBillingAddress] = useState("");
  const [quickCustShippingAddress, setQuickCustShippingAddress] = useState("");
  const [quickCustSameAddress, setQuickCustSameAddress] = useState(true);

  // Quick Product Form Fields
  const [quickProdName, setQuickProdName] = useState("");
  const [quickProdSku, setQuickProdSku] = useState("");
  const [quickProdRate, setQuickProdRate] = useState("");
  const [quickProdGst, setQuickProdGst] = useState<number>(18);
  const [quickProdHsn, setQuickProdHsn] = useState("");
  const [quickProdDesc, setQuickProdDesc] = useState("");
  const [quickProdItemType, setQuickProdItemType] = useState<"Product" | "Service" | "Agreement">("Product");

  // Form States for creating/editing
  const [formCompanyId, setFormCompanyId] = useState("");
  const [formTemplateType, setFormTemplateType] = useState<"Standard">("Standard");
  const [formTermsPresetId, setFormTermsPresetId] = useState("");
  const [formQuoteNo, setFormQuoteNo] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formValidUntil, setFormValidUntil] = useState("");
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formTerms, setFormTerms] = useState("");
  const [formItems, setFormItems] = useState<QuotationItem[]>([]);
  const [formStatus, setFormStatus] = useState<Quotation["status"]>("Pending");
  const [formFreight, setFormFreight] = useState<number>(0);
  const [formAdditionalDiscount, setFormAdditionalDiscount] = useState<number>(0);
  const [revisingQuoteId, setRevisingQuoteId] = useState<string | null>(null);

  // Helper to open Details Page
  const selectQuote = (quoteId: string) => {
    setActiveQuoteId(quoteId);
    setActiveSubView("detail");
  };

  const getSelectedQuote = (): Quotation | undefined => {
    return quotations.find(q => q.id === activeQuoteId);
  };

  // Helper lookup for active company settings per quotation
  const getDocCompanyProfile = (docCompanyId?: string) => {
    const profile = companyProfiles.find(p => p.id === docCompanyId);
    if (profile) return profile;
    
    // Fallback block if unconfigured or legacy
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
      enableGst: companySettings.enableGst
    };
  };

  // Get current selected company profile inside form
  const selectedFormProfile = companyProfiles.find(p => p.id === formCompanyId) || companyProfiles[0] || getDocCompanyProfile("");

  // Generate Unique Quotation Number for a given company profile e.g. QTN-APEX-26-104
  const generateNewQuoteNumber = (profile: CompanyProfile | any): string => {
    const currentYear = new Date().getFullYear();
    const prefix = profile?.quotationPrefix || "QTN";
    const seq = profile?.nextQuotationNumber || (quotations.length + 101);
    return `${prefix}-${String(currentYear).slice(2)}-${seq}`;
  };

  // Open "Create New" Form
  const openCreateForm = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 30);
    const expStr = expDate.toISOString().split("T")[0];

    const initialProfile = companyProfiles[0] || { id: "comp_apex" };
    const resolvedProfile = getDocCompanyProfile(initialProfile.id);

    // Reset Form
    setFormCompanyId(resolvedProfile.id || "comp_apex");
    setFormTemplateType("Standard");
    setFormTermsPresetId(resolvedProfile.termsPresets?.[0]?.id || "");
    setFormQuoteNo(generateNewQuoteNumber(resolvedProfile));
    setFormDate(todayStr);
    setFormValidUntil(expStr);
    setFormCustomerId(customers[0]?.id || "");
    setFormTerms(resolvedProfile.termsPresets?.[0]?.content || companySettings.defaultTerms || "");
    setFormItems([
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
    setFormStatus("Pending");
    setFormFreight(0);
    setFormAdditionalDiscount(0);
    setRevisingQuoteId(null);
    setActiveSubView("create");
  };

  // Open Edit Form
  const openEditForm = (quote: Quotation) => {
    setActiveQuoteId(quote.id);
    setFormCompanyId(quote.companyId || "comp_apex");
    setFormTemplateType(quote.templateType || "Standard");
    setFormTermsPresetId(quote.termsPresetId || "");
    setFormQuoteNo(quote.quotationNo || "");
    setFormDate(toInputDate(quote.date));
    setFormValidUntil(toInputDate(quote.validUntil));
    setFormCustomerId(quote.customerId || "");
    setFormTerms(quote.terms || "");
    setFormItems([...quote.items]);
    setFormStatus(quote.status || "Pending");
    setFormFreight(quote.freight || 0);
    setFormAdditionalDiscount(quote.additionalDiscount || 0);
    setRevisingQuoteId(null);
    setActiveSubView("edit");
  };

  // Open Revision Form
  const openRevisionForm = (quote: Quotation) => {
    setFormCompanyId(quote.companyId || "comp_apex");
    setFormTemplateType(quote.templateType || "Standard");
    setFormTermsPresetId(quote.termsPresetId || "");
    
    const baseNo = quote.quotationNo || "";
    let nextQuoteNo = baseNo;
    const match = baseNo.match(/(.*)[-/_]R(\d+)$/i);
    if (match) {
      const base = match[1];
      const rev = parseInt(match[2], 10) + 1;
      nextQuoteNo = `${base}-R${rev}`;
    } else {
      nextQuoteNo = `${baseNo ? baseNo + "-R1" : "QTN-R1"}`;
    }
    
    setFormQuoteNo(nextQuoteNo);
    setFormDate(new Date().toISOString().split("T")[0]);
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 30);
    setFormValidUntil(expDate.toISOString().split("T")[0]);
    setFormCustomerId(quote.customerId || "");
    setFormTerms(quote.terms || "");
    setFormItems(quote.items.map(item => ({ ...item })));
    setFormStatus("Pending");
    setFormFreight(quote.freight || 0);
    setFormAdditionalDiscount(quote.additionalDiscount || 0);
    
    setRevisingQuoteId(quote.id);
    setActiveSubView("create");
  };

  // Handle Form changes - Add item row
  const addFormItemRow = () => {
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

  // Handle Form changes - Remove item row
  const removeFormItemRow = (index: number) => {
    if (formItems.length === 1) return; // Must have at least one row
    const updated = [...formItems];
    updated.splice(index, 1);
    setFormItems(updated);
  };

  // Handle Product Selection change in row
  const handleProductChangeInRow = (index: number, productId: string) => {
    if (productId === "__NEW_PRODUCT__") {
      // Clear product form states
      setQuickProdName("");
      setQuickProdSku("SKU-" + String(Date.now()).slice(-6)); // Nice auto SKU suggestion
      setQuickProdRate("");
      setQuickProdHsn("");
      setQuickProdDesc("");
      setQuickProdGst(18);
      setQuickProdItemType("Product");
      
      setActiveItemRowIdxForQuickProd(index);
      setOpenQuickProductModal(true);
      return;
    }

    const matched = products.find(p => p.id === productId);
    if (!matched) return;

    const updated = [...formItems];
    updated[index] = {
      ...updated[index],
      productId: matched.id,
      productName: matched.name,
      description: matched.description || "",
      hsnCode: matched.hsnCode,
      rate: matched.rate,
      gstPercent: matched.gstRate
    };
    setFormItems(updated);
  };

  // Quick Customer Creation Save Handler
  const handleQuickCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustCompany || !quickCustName) {
      alert("Company Name and Contact Person Name are required.");
      return;
    }
    const newCustomer: Customer = {
      id: "cust_" + Date.now(),
      company: quickCustCompany,
      name: quickCustName,
      email: quickCustEmail,
      phone: quickCustPhone,
      gstin: quickCustGstin || "URP",
      state: quickCustState,
      billingAddress: quickCustBillingAddress,
      shippingAddress: quickCustSameAddress ? quickCustBillingAddress : quickCustShippingAddress
    };
    onUpdateCustomers([...customers, newCustomer]);
    setFormCustomerId(newCustomer.id);
    
    // Reset quick customer states
    setQuickCustCompany("");
    setQuickCustName("");
    setQuickCustEmail("");
    setQuickCustPhone("");
    setQuickCustGstin("");
    setQuickCustBillingAddress("");
    setQuickCustShippingAddress("");
    setQuickCustSameAddress(true);
    setOpenQuickCustomerModal(false);
  };

  // Quick Product Creation Save Handler
  const handleQuickProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProdName || !quickProdSku) {
      alert("Product Name and SKU/Code are required.");
      return;
    }
    
    // Check if SKU already exists
    if (products.some(p => p.sku === quickProdSku.toUpperCase().trim())) {
      alert(`Error: A catalog product with SKU '${quickProdSku.toUpperCase().trim()}' already exists. Please provide a unique SKU/Code.`);
      return;
    }

    const price = parseFloat(quickProdRate) || 0;
    const newProduct: Product = {
      id: "prod_" + Date.now(),
      name: quickProdName,
      sku: quickProdSku.toUpperCase().trim(),
      rate: price,
      gstRate: quickProdGst,
      hsnCode: quickProdHsn,
      description: quickProdDesc,
      itemType: quickProdItemType
    };
    
    onUpdateProducts([...products, newProduct]);

    if (activeItemRowIdxForQuickProd !== null) {
      const updated = [...formItems];
      updated[activeItemRowIdxForQuickProd] = {
        ...updated[activeItemRowIdxForQuickProd],
        productId: newProduct.id,
        productName: newProduct.name,
        description: newProduct.description || "",
        hsnCode: newProduct.hsnCode,
        rate: newProduct.rate,
        gstPercent: newProduct.gstRate
      };
      setFormItems(updated);
    }

    // Reset quick product states
    setQuickProdName("");
    setQuickProdSku("");
    setQuickProdRate("");
    setQuickProdHsn("");
    setQuickProdDesc("");
    setOpenQuickProductModal(false);
    setActiveItemRowIdxForQuickProd(null);
  };

  // Handle Row Item Value Change (Quantity, Rate, Discount)
  const handleItemValueChange = (index: number, field: keyof QuotationItem, val: any) => {
    const updated = [...formItems];
    updated[index] = {
      ...updated[index],
      [field]: val
    };
    setFormItems(updated);
  };

  // Compute Live totals for active form
  const getFormCalculatedTotals = () => {
    const customer = customers.find(c => c.id === formCustomerId);
    const sourceState = selectedFormProfile?.state || companySettings.state || "Maharashtra";
    const destinationState = customer ? customer.state : sourceState;
    const isGstEnabled = selectedFormProfile ? (selectedFormProfile.enableGst !== false) : (companySettings.enableGst !== false);
    return calculateTaxTotals(formItems, destinationState, sourceState, formAdditionalDiscount, formFreight, isGstEnabled);
  };

  // Save creation / edition
  const saveQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerId) {
      alert("Please select a customer first.");
      return;
    }
    if (formItems.some(item => !item.productId || item.quantity <= 0 || item.rate < 0)) {
      alert("Please complete the item listings with positive quantity and rates.");
      return;
    }

    const { subtotal, discountTotal, cgstTotal, sgstTotal, igstTotal, grandTotal } = getFormCalculatedTotals();

    if (activeSubView === "create") {
      let revisionOfId: string | undefined = undefined;
      let originalQuoteId: string | undefined = undefined;
      let revisionNumber: number = 0;

      if (revisingQuoteId) {
        const parent = quotations.find(q => q.id === revisingQuoteId);
        if (parent) {
          revisionOfId = parent.id;
          originalQuoteId = parent.originalQuoteId || parent.id;
          revisionNumber = (parent.revisionNumber || 0) + 1;
        }
      }

      const newQuote: Quotation = {
        id: "q_" + Date.now(),
        quotationNo: formQuoteNo,
        date: formDate,
        validUntil: formValidUntil,
        customerId: formCustomerId,
        items: formItems,
        subtotal,
        discountTotal,
        cgstTotal,
        sgstTotal,
        igstTotal,
        grandTotal,
        status: formStatus,
        terms: formTerms,
        companyId: formCompanyId,
        templateType: formTemplateType,
        termsPresetId: formTermsPresetId,
        freight: formFreight,
        additionalDiscount: formAdditionalDiscount,
        // revision attributes
        ...(revisingQuoteId ? { revisionOfId, originalQuoteId, revisionNumber } : {})
      };

      // Increment company serial index counter (only for non-revisions)
      if (!revisingQuoteId && companyProfiles && onUpdateCompanyProfiles && formCompanyId) {
        const updatedProfiles = companyProfiles.map(p => {
          if (p.id === formCompanyId) {
            return {
              ...p,
              nextQuotationNumber: (p.nextQuotationNumber || 1) + 1
            };
          }
          return p;
        });
        onUpdateCompanyProfiles(updatedProfiles);
      }

      const revised = [newQuote, ...quotations];
      onUpdateQuotations(revised);
      setRevisingQuoteId(null);
      setActiveSubView("list");
    } else {
      // Edit mode
      const revised = quotations.map(q => {
        if (q.id === activeQuoteId) {
          return {
            ...q,
            quotationNo: formQuoteNo,
            date: formDate,
            validUntil: formValidUntil,
            customerId: formCustomerId,
            items: formItems,
            subtotal,
            discountTotal,
            cgstTotal,
            sgstTotal,
            igstTotal,
            grandTotal,
            status: formStatus,
            terms: formTerms,
            companyId: formCompanyId,
            templateType: formTemplateType,
            termsPresetId: formTermsPresetId,
            freight: formFreight,
            additionalDiscount: formAdditionalDiscount
          };
        }
        return q;
      });
      onUpdateQuotations(revised);
      setActiveSubView("list");
    }
  };

  // Delete Quotation
  const deleteQuotation = (id: string) => {
    if (confirm("Are you sure you want to delete this quotation permanently?")) {
      const updated = quotations.filter(q => q.id !== id);
      onUpdateQuotations(updated);
      if (activeQuoteId === id) {
        setActiveQuoteId(null);
        setActiveSubView("list");
      }
    }
  };

  // Filter quotes
  const filteredQuotations = quotations.filter((q) => {
    const client = customers.find(c => c.id === q.customerId);
    const compName = client ? client.company : "";
    const clientName = client ? client.name : "";
    const matchesSearch = 
      (q.quotationNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.subject || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (compName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (clientName || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "All" || q.status === statusFilter;
    const matchesCompany = companyFilter === "All" || q.companyId === companyFilter;
    
    return matchesSearch && matchesStatus && matchesCompany;
  });

  return (
    <div className="space-y-6" id="quotations-view-panel">
      {/* 1. INITIAL LIST SCREEN */}
      {activeSubView === "list" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Quotations Workspace</h2>
              <p className="text-xs text-slate-500">Draft, configure, and print tax-authorized corporate proposals in INR</p>
            </div>
            <button
              onClick={openCreateForm}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm cursor-pointer shadow-md shadow-indigo-650/10 select-none transition-colors shrink-0"
              id="btn-create-quotation-trigger"
            >
              <Plus className="w-5 h-5" /> Generate Proposal
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm font-sans">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by ID, company name, representative or subject..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                id="quote-search-bar"
              />
            </div>
            
            <div className="flex items-center gap-4 flex-wrap md:flex-nowrap shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Company:</span>
                <select
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 max-w-[200px]"
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  id="quote-company-filter"
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
                  id="quote-status-filter"
                >
                  <option value="All">All Documents</option>
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending</option>
                  <option value="Draft">Draft</option>
                  <option value="Converted">Converted</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quotations List Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-5">Quotation No</th>
                    <th className="py-3.5 px-5">Company / Representative</th>
                    <th className="py-3.5 px-5">Issuance Date</th>
                    <th className="py-3.5 px-5 text-right font-sans">Quoted Value</th>
                    <th className="py-3.5 px-5 text-center">Status</th>
                    <th className="py-3.5 px-5 text-center">Action Workflow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {filteredQuotations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 font-medium bg-white">
                        No corporate quotations found matching search terms.
                      </td>
                    </tr>
                  ) : (
                    filteredQuotations.map((q) => {
                      const client = customers.find(c => c.id === q.customerId);
                      return (
                        <tr 
                          key={q.id} 
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => selectQuote(q.id)}
                        >
                          <td className="py-3 px-5 font-bold font-mono text-slate-900 text-sm">
                            {q.quotationNo}
                          </td>
                          <td className="py-3 px-5">
                            <div className="font-bold text-slate-800">
                              {client ? client.company : "Unspecified"}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                              Representative: {client ? client.name : "N/A"} ({client ? client.state : ""})
                            </div>
                          </td>
                          <td className="py-3 px-5 font-semibold text-slate-500">
                            {formatDate(q.date)}
                          </td>
                          <td className="py-3 px-5 text-right font-bold text-slate-900 font-mono text-sm">
                            {formatINR(q.grandTotal)}
                          </td>
                          <td className="py-3 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={q.status}
                              onChange={(e) => {
                                  const revised = quotations.map(item => {
                                    if (item.id === q.id) {
                                      return { ...item, status: e.target.value as Quotation["status"] };
                                    }
                                    return item;
                                  });
                                  onUpdateQuotations(revised);
                              }}
                              className={`rounded-full px-2.5 py-0.5 font-bold text-[9px] border appearance-none outline-none text-center cursor-pointer ${
                                q.status === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                q.status === "Pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                q.status === "Draft" ? "bg-slate-100 text-slate-600 border-slate-200" :
                                "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Approved">Approved</option>
                              <option value="Draft">Draft</option>
                              <option value="Converted">Converted</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="py-3 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditForm(q)}
                                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-indigo-700 font-bold cursor-pointer border border-slate-200"
                                title="Edit Quotation"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => openRevisionForm(q)}
                                className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-150 text-indigo-700 font-bold cursor-pointer border border-indigo-250 flex items-center gap-1"
                                title="Create Revision / Amendment of this quotation"
                              >
                                <Layers className="w-3 h-3 text-indigo-600" /> Revise
                              </button>
                              <button
                                onClick={() => deleteQuotation(q.id)}
                                className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 cursor-pointer"
                                title="Delete permanently"
                              >
                                Delete
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

      {/* 2. CREATION / EDITING PANEL VIEW */}
      {(activeSubView === "create" || activeSubView === "edit") && (
        <form onSubmit={saveQuotation} className="space-y-6 max-w-5xl mx-auto bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
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
                  {activeSubView === "create" ? "Generate Tax Quotation" : "Update Corporate Quotation"}
                </h3>
                <p className="text-xs text-slate-500">Configure client details, item lists, and auto-computed states</p>
              </div>
            </div>
          </div>

          {/* Issuing Corporate Profile */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-2 border-b border-slate-100 mb-2 font-sans text-left">
            <div className="md:col-span-4 bg-slate-50/50 p-3.5 rounded-lg border border-slate-150">
              <label className="block text-indigo-950 text-[10px] font-extrabold uppercase mb-1 tracking-wider leading-none">
                Company Name Profile
              </label>
              <select
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                value={formCompanyId}
                onChange={(e) => {
                  const targetId = e.target.value;
                  setFormCompanyId(targetId);
                  
                  const targetProfile = getDocCompanyProfile(targetId);
                  
                  // Re-populate sequence number if it is a new doc
                  if (activeSubView === "create") {
                    setFormQuoteNo(generateNewQuoteNumber(targetProfile));
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
              <p className="text-[10px] text-slate-450 mt-1 select-none">
                Selecting a profile adjusts the brand letterhead representation, sequence codes, bank routing tables, and contract terms defaults.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans text-left">
            {/* Field A - Quote No */}
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Quotation Code</label>
              <input
                type="text"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 uppercase focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                value={formQuoteNo}
                onChange={(e) => setFormQuoteNo(e.target.value.toUpperCase())}
              />
            </div>

            {/* Field B - Date */}
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Creation Date</label>
              <input
                type="date"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            {/* Field C - Valid Until */}
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Validity Date</label>
              <input
                type="date"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                value={formValidUntil}
                onChange={(e) => setFormValidUntil(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
            {/* Customer Select */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-500 text-[10px] font-bold uppercase">Target Client (Indian Business)</label>
                <button
                  type="button"
                  onClick={() => setOpenQuickCustomerModal(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  + Quick Add Client
                </button>
              </div>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                value={formCustomerId}
                onChange={(e) => {
                  if (e.target.value === "__NEW_CUSTOMER__") {
                    setOpenQuickCustomerModal(true);
                  } else {
                    setFormCustomerId(e.target.value);
                  }
                }}
              >
                <option value="">-- Choose Target Client --</option>
                <option value="__NEW_CUSTOMER__" className="text-indigo-600 font-bold bg-indigo-50">+ Quick Add New Client...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company} (Attn: {c.name} | State: {c.state})
                  </option>
                ))}
              </select>

              {(() => {
                const activeSelectedCustomer = customers.find(c => c.id === formCustomerId);
                if (!activeSelectedCustomer) return null;
                const sourceSt = (selectedFormProfile?.state || companySettings.state || "Maharashtra").trim().toLowerCase();
                const destSt = (activeSelectedCustomer.state || "").trim().toLowerCase();
                const isSameState = sourceSt === destSt;
                return (
                  <div className="mt-2.5 p-3 bg-indigo-50/40 rounded-xl border border-indigo-100/60 space-y-2 text-left">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Customer Registered Identity</span>
                        <div className="font-extrabold text-slate-900 text-xs">{activeSelectedCustomer.company}</div>
                        <div className="text-[10px] text-slate-550 font-medium font-sans">
                          Contact Representative: <strong className="text-slate-750">{activeSelectedCustomer.name}</strong> • {activeSelectedCustomer.email || "No Email"}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Indian GSTIN / PAN</span>
                        <span className="inline-block px-2 py-0.5 mt-1 font-mono text-[10px] font-extrabold text-indigo-700 bg-indigo-50 rounded border border-indigo-100">
                          {activeSelectedCustomer.gstin || "URD (UNREGISTERED)"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-[10px] text-slate-605">
                      <div>
                        <strong className="text-slate-800 uppercase text-[8px] font-extrabold block mb-0.5">Billing Address (GST Registered)</strong>
                        <div className="leading-relaxed font-sans text-[10px] text-slate-600">{activeSelectedCustomer.billingAddress || "Not entered"}</div>
                        <div className="mt-1 font-semibold text-slate-500">State: <span className="text-indigo-600 font-bold">{activeSelectedCustomer.state}</span></div>
                      </div>
                      <div>
                        <strong className="text-slate-800 uppercase text-[8px] font-extrabold block mb-0.5">Shipping Address (Consignee Destination)</strong>
                        <div className="leading-relaxed font-sans text-[10px] text-slate-600">{activeSelectedCustomer.shippingAddress || "Not entered"}</div>
                        <div className="mt-1 font-semibold text-slate-550">
                          Tax Jurisdiction: <span className={`font-extrabold ${isSameState ? 'text-emerald-600' : 'text-indigo-600'}`}>
                            {isSameState ? `INTRA-STATE (CGST + SGST @ ${activeSelectedCustomer.state})` : `INTER-STATE (IGST Route to ${activeSelectedCustomer.state})`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Status Select */}
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Document Status</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as Quotation["status"])}
              >
                <option value="Draft">Draft</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Converted">Converted</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Dynamic Itemized Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-150">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Item details & rates</span>
              <button
                type="button"
                onClick={addFormItemRow}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-650 text-indigo-700 hover:text-white font-bold text-xs cursor-pointer select-none border border-indigo-200/60"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            {(() => {
              const formIsGstEnabled = selectedFormProfile ? (selectedFormProfile.enableGst !== false) : (companySettings.enableGst !== false);
              return (
                <div className="space-y-2 font-sans">
                  {/* Table Header */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 p-2 font-bold text-[10px] text-slate-500 uppercase border-b border-slate-200">
                    <div className={formIsGstEnabled ? "md:col-span-4" : "md:col-span-5"}>Product / Item</div>
                    <div className="md:col-span-1">Qty</div>
                    <div className="md:col-span-2">Rate</div>
                    <div className="md:col-span-1">Disc %</div>
                    {formIsGstEnabled && <div className="md:col-span-1">GST %</div>}
                    <div className="md:col-span-2">Amount (₹)</div>
                    <div className="md:col-span-1"></div>
                  </div>

                  {formItems.map((item, idx) => (
                    <div 
                      key={idx}
                      className="grid grid-cols-1 md:grid-cols-12 gap-2.5 p-3.5 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      {/* Select Product */}
                      <div className={formIsGstEnabled ? "md:col-span-4 rounded-md" : "md:col-span-5 rounded-md"}>
                        <select
                          className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                          value={item.productId}
                          onChange={(e) => handleProductChangeInRow(idx, e.target.value)}
                          required
                        >
                          <option value="">-- Choose Product / Service / SLA --</option>
                          <option value="__NEW_PRODUCT__" className="text-indigo-650 font-bold bg-indigo-50">+ Quick Add Line Entry...</option>
                          {(() => {
                            const itemProducts = products.filter(p => !p.itemType || p.itemType === "Product");
                            const itemServices = products.filter(p => p.itemType === "Service");
                            const itemAgreements = products.filter(p => p.itemType === "Agreement");
                            return (
                              <>
                                {itemProducts.length > 0 && (
                                  <optgroup label="Products 📦">
                                    {itemProducts.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.sku} | {p.name}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                                {itemServices.length > 0 && (
                                  <optgroup label="Services 🛠️">
                                    {itemServices.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.sku} | {p.name}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                                {itemAgreements.length > 0 && (
                                  <optgroup label="Agreements & SLAs 📝">
                                    {itemAgreements.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.sku} | {p.name}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                              </>
                            );
                          })()}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="md:col-span-1">
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="Qty"
                          className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800 text-center focus:outline-none focus:border-indigo-500"
                          value={item.quantity}
                          onChange={(e) => handleItemValueChange(idx, "quantity", parseInt(e.target.value) || 1)}
                        />
                      </div>

                      {/* Rate */}
                      <div className="md:col-span-2">
                        <input
                          type="number"
                          required
                          min="0"
                          placeholder="Rate"
                          className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800 text-right focus:outline-none font-mono focus:border-indigo-500"
                          value={item.rate}
                          onChange={(e) => handleItemValueChange(idx, "rate", parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      {/* Discount percent */}
                      <div className="md:col-span-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.001"
                          placeholder="Disc %"
                          className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800 text-center focus:outline-none focus:border-indigo-500"
                          value={item.discountPercent}
                          onChange={(e) => handleItemValueChange(idx, "discountPercent", parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      {/* GST rate */}
                      {formIsGstEnabled && (
                        <div className="md:col-span-1">
                          <select
                            className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                            value={item.gstPercent}
                            onChange={(e) => handleItemValueChange(idx, "gstPercent", parseInt(e.target.value) || 18)}
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </div>
                      )}

                      {/* Amount (Display) */}
                      <div className="md:col-span-2">
                        <div className="w-full bg-slate-100 border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800 text-right font-bold h-7 flex items-center justify-end">
                          {(item.quantity * item.rate * (1 - item.discountPercent / 100) * (1 + (formIsGstEnabled ? item.gstPercent : 0) / 100)).toFixed(2)}
                        </div>
                      </div>

                      {/* Delete button */}
                      <div className="md:col-span-1 text-center flex items-center justify-center">
                        <button
                          type="button"
                          disabled={formItems.length === 1}
                          onClick={() => removeFormItemRow(idx)}
                          className="p-1.5 rounded bg-white hover:bg-rose-50 text-rose-500 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Item Description - Multiline below */}
                      <div className="md:col-span-12 rounded-md">
                        <textarea
                          rows={2}
                          placeholder="Item Description"
                          className="w-full bg-slate-50 border border-slate-100 rounded-md px-2 py-1 text-xs text-slate-600 focus:outline-none focus:border-indigo-300"
                          value={item.description}
                          onChange={(e) => handleItemValueChange(idx, "description", e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Interactive live totals summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 font-sans text-xs text-left">
            {/* Left side terms */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                <label className="block text-indigo-950 font-extrabold uppercase text-[9px] tracking-wider leading-none">
                  Quotation Terms Preset
                </label>
                {selectedFormProfile?.termsPresets && selectedFormProfile.termsPresets.length > 0 && (
                  <select
                    className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-indigo-700 font-bold focus:outline-none cursor-pointer"
                    value={formTermsPresetId || ""}
                    onChange={(e) => {
                      const presetVal = e.target.value;
                      setFormTermsPresetId(presetVal);
                      const matched = selectedFormProfile.termsPresets.find(tp => tp.id === presetVal);
                      if (matched) {
                        setFormTerms(matched.content);
                      }
                    }}
                  >
                    {selectedFormProfile.termsPresets.map(preset => (
                      <option key={preset.id} value={preset.id}>{preset.title}</option>
                    ))}
                  </select>
                )}
              </div>
              <textarea
                rows={6}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono leading-relaxed"
                value={formTerms}
                onChange={(e) => setFormTerms(e.target.value)}
              />
            </div>

            {/* Calculations Breakdown */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold uppercase">Billing break-up</span>
                <span className="text-slate-400 font-bold uppercase">Status calculations</span>
              </div>

              {/* Interactive Input for Freight & Additional Discount */}
              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-dashed border-slate-200 text-left">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Freight Charges (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-mono text-right focus:outline-none focus:border-indigo-500"
                    value={formFreight || ""}
                    onChange={(e) => setFormFreight(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Addl Flat Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-mono text-right focus:outline-none focus:border-indigo-500"
                    value={formAdditionalDiscount || ""}
                    onChange={(e) => setFormAdditionalDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Compute breakdown */}
              {(() => {
                const { subtotal, discountTotal, cgstTotal, sgstTotal, igstTotal, grandTotal } = getFormCalculatedTotals();
                const selectedCust = customers.find(c => c.id === formCustomerId);
                const activeSourceState = selectedFormProfile?.state || companySettings.state || "Maharashtra";
                const isIntrastate = selectedCust ? (selectedCust.state || "").trim().toLowerCase() === (activeSourceState || "").trim().toLowerCase() : true;
                const formIsGstEnabled = selectedFormProfile ? (selectedFormProfile.enableGst !== false) : (companySettings.enableGst !== false);
                
                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-550">Total Catalogue Subtotal:</span>
                      <span className="font-mono text-slate-900 font-bold">{formatINR(subtotal)}</span>
                    </div>
                    {discountTotal > 0 && (
                      <div className="flex justify-between text-rose-600 font-medium">
                        <span>Item-Level Trade Discount:</span>
                        <span className="font-mono">- {formatINR(discountTotal)}</span>
                      </div>
                    )}
                    {formAdditionalDiscount > 0 && (
                      <div className="flex justify-between text-amber-700 font-semibold border-b border-slate-100 pb-1">
                        <span>Additional flat Discount:</span>
                        <span className="font-mono">- {formatINR(formAdditionalDiscount)}</span>
                      </div>
                    )}
                    {formFreight > 0 && (
                      <div className="flex justify-between text-indigo-700 font-semibold">
                        <span>Freight / Shipping Charges:</span>
                        <span className="font-mono">+ {formatINR(formFreight)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-150 pt-1">
                      <span className="text-slate-550 font-bold">Taxable Basic Value:</span>
                      <span className="font-mono text-slate-900 font-bold">{formatINR(subtotal - discountTotal - formAdditionalDiscount + formFreight)}</span>
                    </div>
                    
                    {formIsGstEnabled && (isIntrastate ? (
                      <>
                        <div className="flex justify-between text-indigo-705">
                          <span>Central GST (CGST Component):</span>
                          <span className="font-mono font-medium">{formatINR(cgstTotal)}</span>
                        </div>
                        <div className="flex justify-between text-indigo-705">
                          <span>State GST (SGST Component):</span>
                          <span className="font-mono font-medium">{formatINR(sgstTotal)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-indigo-705 font-semibold">
                        <span>Integrated GST (IGST Component):</span>
                        <span className="font-mono font-bold">{formatINR(igstTotal)}</span>
                      </div>
                    ))}
                    
                    <div className="flex justify-between text-indigo-650 border-t border-slate-200 pt-2 text-sm font-bold">
                      <span className="uppercase tracking-wide">Grand Total (Rounded):</span>
                      <span className="font-mono text-indigo-950 font-black">{formatINR(grandTotal)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setActiveSubView("list")}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-200 font-bold text-xs cursor-pointer select-none transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-xs cursor-pointer select-none transition-all shadow-md shadow-indigo-600/10"
            >
              Verify & Save Document
            </button>
          </div>
        </form>
      )}

      {/* 3. CORE PRINTABLE DETAIL PREVIEW VIEW */}
      {activeSubView === "detail" && (
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Detailed View Header Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white rounded-xl border border-slate-200 gap-4 shadow-sm">
            <button
              onClick={() => setActiveSubView("list")}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer uppercase tracking-wider"
            >
              <ArrowLeft className="w-5 h-5 text-indigo-600" /> Return to list
            </button>

            {/* Actions for active document */}
            {getSelectedQuote() && (
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  onClick={() => {
                    const qObj = getSelectedQuote();
                    if(qObj) {
                      onConvertToInvoice(qObj);
                      alert(`Quotation ${qObj.quotationNo} successfully cloned & converted into an active Proforma Invoice!`);
                    }
                  }}
                  disabled={getSelectedQuote()?.status === "Converted"}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-750 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold whitespace-nowrap cursor-pointer transition-colors"
                >
                  <FileCheck2 className="w-4 h-4" /> Convert to Invoice
                </button>
                <button
                  onClick={() => setIsEmailModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200 cursor-pointer transition-colors"
                >
                  <Mail className="w-4 h-4" /> Email Document
                </button>
                <button
                  onClick={() => {
                    const quote = getSelectedQuote();
                    if (quote) {
                      const client = customers.find(c => c.id === quote.customerId);
                      const customerName = client?.company || client?.name || "Customer";
                      const documentName = quote.quotationNo || "DOCUMENT";
                      const originalTitle = document.title;
                      document.title = `${customerName.replace(/[^a-z0-9]/gi, '_')}_${documentName.toUpperCase().replace(/[^a-z0-9]/gi, '_')}`;
                      window.print();
                      document.title = originalTitle;
                    }
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
                <button
                  onClick={() => openEditForm(getSelectedQuote()!)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-bold cursor-pointer transition-colors"
                >
                  Edit Quotation
                </button>
                <button
                  onClick={() => {
                    const quote = getSelectedQuote();
                    if (quote) {
                      openRevisionForm(quote);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold cursor-pointer transition-colors"
                  title="Create Revised Version"
                >
                  <Layers className="w-4 h-4" /> Revise
                </button>
              </div>
            )}
          </div>





          {/* Revision Roadmap Timeline */}
          {(() => {
            const currentQuote = getSelectedQuote();
            if (!currentQuote) return null;
            
            const familyId = currentQuote.originalQuoteId || currentQuote.id;
            const family = quotations.filter(q => q.id === familyId || q.originalQuoteId === familyId)
              .sort((a, b) => (a.revisionNumber || 0) - (b.revisionNumber || 0));
              
            return (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col gap-3 font-sans max-w-4xl mx-auto print:hidden shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Maintainable Quotation Revision Path ({family.length} version{family.length === 1 ? "" : "s"})
                    </span>
                  </div>
                  {family.length === 1 && (
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5 font-semibold">
                      Click "Revise" above to create an amended trailing revision
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-3 overflow-x-auto py-1 scrollbar-thin">
                  {family.map((item, index) => {
                    const isSelected = item.id === currentQuote.id;
                    const displayRev = item.revisionNumber === undefined || item.revisionNumber === 0 ? "Original" : `Rev ${item.revisionNumber}`;
                    
                    return (
                      <React.Fragment key={item.id}>
                        {index > 0 && (
                          <span className="text-slate-400 text-sm font-bold select-none">→</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveQuoteId(item.id)}
                          className={`flex flex-col items-start gap-0.5 p-2.5 rounded-lg border text-left cursor-pointer transition-all min-w-[150px] ${
                            isSelected 
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-md ring-2 ring-indigo-300" 
                              : "bg-white border-slate-200 hover:border-indigo-300 text-slate-800 hover:bg-slate-50 shadow-sm"
                          }`}
                        >
                          <span className={`text-[10px] font-extrabold uppercase tracking-wide leading-none ${isSelected ? "text-indigo-100" : "text-indigo-600"}`}>
                            {displayRev}
                          </span>
                          <span className="text-xs font-bold font-mono mt-0.5 max-w-[130px] truncate leading-tight">
                            {item.quotationNo}
                          </span>
                          <span className={`text-[9px] font-medium leading-none mt-1 ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                            {formatDate(item.date)} ({formatINR(item.grandTotal)})
                          </span>
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })()}


          {/* Core Invoice/Quotation Template (Indian GST Standards) */}
          {(() => {
            const quote = getSelectedQuote();
            if (!quote) return <div className="text-white">Loading document context...</div>;
            
            const compProfile = getDocCompanyProfile(quote.companyId);
            const client = customers.find(c => c.id === quote.customerId);
            const isIntrastate = (client && compProfile) ? (client.state || "").trim().toLowerCase() === (compProfile.state || "").trim().toLowerCase() : true;
            const isGstEnabled = compProfile.enableGst !== false;
            const isAmcCover = includeCoverPage;

            if (false) {
              return (
                <div 
                  className="max-w-4xl w-full rounded-2xl border border-slate-250 shadow-xl p-8 sm:p-12 md:p-16 my-6 space-y-12 bg-white text-slate-900 flex flex-col font-sans mx-auto min-h-[100vh] print:my-0 print:p-0 print:border-0 print:shadow-none print:rounded-none print:max-w-none print:space-y-0"
                  id="printable-area-container"
                  style={{ textTransform: "none" }}
                >
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="p-0 border-none font-normal">
                          {compProfile.headerImage ? (
                            <div className="w-full mb-6">
                              <img 
                                src={compProfile.headerImage} 
                                alt="Header" 
                                className="w-full h-auto rounded-t-xl print:rounded-none" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 py-4 border-b border-slate-200 mb-6">
                              <div className="p-2.5 bg-indigo-600 text-white rounded-lg">
                                <FileCheck2 className="w-6 h-6" />
                              </div>
                              <span className="font-sans font-bold text-2xl text-slate-900 tracking-tight">
                                {compProfile.name}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 border-b border-slate-200 mb-8 text-left">
                            <div>
                              <span className="text-[10px] font-black tracking-widest text-indigo-600 uppercase">SERVICE AGREEMENT PROPOSAL</span>
                              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                                ANNUAL MAINTENANCE CONTRACT
                              </h1>
                              <p className="text-xs text-slate-500 mt-1">Formal Quotation & SLA Terms</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium space-y-1 min-w-[200px]">
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-450 uppercase text-[9px] font-bold">Proposal No:</span>
                                <span className="font-mono font-bold text-slate-800">{quote.quotationNo}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-450 uppercase text-[9px] font-bold">Proposal Date:</span>
                                <span className="text-slate-700 font-bold">{formatDate(quote.date)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-450 uppercase text-[9px] font-bold">Valid Until:</span>
                                <span className="text-slate-700 font-bold">{formatDate(quote.validUntil)}</span>
                              </div>
                            </div>
                          </div>
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr>
                        <td className="p-0 border-none">
                          {/* Parties Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed text-left mb-8">
                            <div className="p-5 bg-indigo-50/30 rounded-xl border border-indigo-100/50 space-y-2">
                              <h3 className="font-extrabold text-indigo-700 uppercase tracking-widest text-[9px]">The Client (Contract Receiver)</h3>
                              <div className="font-bold text-sm text-slate-850">{client?.company || "N/A"}</div>
                              <div className="text-slate-600 leading-normal whitespace-pre-line">
                                {client?.billingAddress || "N/A"}
                              </div>
                              <div className="pt-2 border-t border-indigo-100/40 space-y-1">
                                <div><span className="opacity-60 font-semibold font-sans">Contact Person:</span> {client?.name || "N/A"}</div>
                                <div><span className="opacity-60 font-semibold font-sans">Phone:</span> <span className="font-mono">{client?.phone || "N/A"}</span></div>
                                {client?.gstin && <div><span className="opacity-60 font-semibold font-sans">GSTIN:</span> <span className="font-mono font-bold">{client.gstin}</span></div>}
                              </div>
                            </div>

                            <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200/50 space-y-2">
                              <h3 className="font-extrabold text-slate-500 uppercase tracking-widest text-[9px]">The Provider (Contract Issuer)</h3>
                              <div className="font-bold text-sm text-slate-855">{compProfile.name}</div>
                              <div className="text-slate-600 leading-normal whitespace-pre-line">
                                {compProfile.address || "N/A"}
                              </div>
                              <div className="pt-2 border-t border-slate-200/45 space-y-1">
                                <div><span className="opacity-60 font-semibold font-sans">Support Desk:</span> {compProfile.phone || "N/A"}</div>
                                <div><span className="opacity-60 font-semibold font-sans">Email:</span> {compProfile.email || "N/A"}</div>
                                {compProfile.gstin && <div><span className="opacity-60 font-semibold font-sans">GSTIN:</span> <span className="font-mono font-bold">{compProfile.gstin}</span></div>}
                              </div>
                            </div>
                          </div>

                          {/* Scope of Work Section Indicator */}
                          <div className="mb-4 text-left">
                            <span className="text-[10px] font-black tracking-widest text-slate-450 uppercase">SECTION I: BILL OF QUANTITIES & PRICING</span>
                          </div>

                          {/* Products & SLA Services Table */}
                          <div className="overflow-x-auto ring-1 ring-slate-150 rounded-xl mb-8">
                            <table className="w-full text-left text-xs text-slate-700 min-w-[650px] border-collapse">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase text-[9px] font-black tracking-wider text-left">
                                  <th className="py-3.5 px-4 text-center w-12 font-bold font-sans">#</th>
                                  <th className="py-3.5 px-4 max-w-sm font-bold font-sans">Service description / AMC Scope</th>
                                  <th className="py-3.5 px-3 text-center font-bold font-sans">HSN Code</th>
                                  <th className="py-3.5 px-3 text-center font-bold font-sans">Qty</th>
                                  <th className="py-3.5 px-3 text-right font-bold font-sans">Unit Rate</th>
                                  <th className="py-3.5 px-3 text-center font-bold font-sans">Disc.</th>
                                  {isGstEnabled && <th className="py-3.5 px-3 text-center font-bold font-sans">GST</th>}
                                  <th className="py-3.5 px-4 text-right font-bold font-sans">{isGstEnabled ? "Taxable Basic Value" : "Amount"}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-600 text-left">
                                {quote.items.map((item, idx) => {
                                  const baseVal = item.rate * item.quantity;
                                  const discVal = (baseVal * item.discountPercent) / 100;
                                  const finalVal = baseVal - discVal;
                                  return (
                                    <tr key={idx} className="hover:bg-slate-50/50">
                                      <td className="py-3.5 px-4 text-center font-bold text-slate-400 font-mono">
                                        {idx + 1}
                                      </td>
                                      <td className="py-3.5 px-4">
                                        <div className="font-bold text-slate-800">{item.productName}</div>
                                        {item.description && <div className="text-[10px] text-slate-505 mt-1 whitespace-pre-wrap leading-relaxed">{item.description}</div>}
                                      </td>
                                      <td className="py-3.5 px-3 text-center font-mono">
                                        {item.hsnCode || "-"}
                                      </td>
                                      <td className="py-3.5 px-3 text-center font-bold text-slate-800 font-mono">
                                        {item.quantity}
                                      </td>
                                      <td className="py-3.5 px-3 text-right font-mono font-medium">
                                        {formatINR(item.rate)}
                                      </td>
                                      <td className="py-3.5 px-3 text-center font-mono font-semibold text-rose-500">
                                        {item.discountPercent > 0 ? `${item.discountPercent}%` : "-"}
                                      </td>
                                      {isGstEnabled && (
                                        <td className="py-3.5 px-3 text-center font-semibold font-mono text-indigo-600">
                                          {item.gstPercent}%
                                        </td>
                                      )}
                                      <td className="py-3.5 px-4 text-right font-bold text-slate-800 font-mono">
                                        {formatINR(finalVal)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Subtotals Grid */}
                          <div className="flex flex-col md:flex-row justify-between gap-8 items-start text-left mb-12">
                            {/* Bank details */}
                            <div className="w-full md:max-w-md p-5 bg-slate-50 rounded-xl border border-slate-200/60 space-y-3 text-xs font-sans">
                              <span className="font-extrabold text-slate-500 uppercase select-none text-[9px] tracking-wider block pb-1.5 border-b border-slate-200">
                                REMITTANCE & BANK BILLING DETAILS
                              </span>
                              <div className="grid grid-cols-3 gap-y-1.5">
                                <span className="text-slate-500">Bank Name:</span>
                                <span className="col-span-2 font-bold text-slate-850">{compProfile.bankName}</span>
                                
                                <span className="text-slate-550 font-sans">Branch Name:</span>
                                <span className="col-span-2 font-semibold text-slate-850">{compProfile.bankBranch}</span>
                                
                                <span className="text-slate-550 font-sans">Account No:</span>
                                <span className="col-span-2 font-mono font-bold text-slate-900">{compProfile.accountNo}</span>
                                
                                <span className="text-slate-550 font-mono">IFSC Code:</span>
                                <span className="col-span-2 font-mono font-bold text-indigo-700">{compProfile.ifsc}</span>
                              </div>
                            </div>

                            {/* Calculation right column */}
                            <div className="w-full md:max-w-xs space-y-2.5 text-xs font-medium self-end font-sans">
                              <div className="flex justify-between text-slate-505">
                                <span>Total Basic Value:</span>
                                <span className="font-mono text-slate-800 font-semibold">{formatINR(quote.subtotal)}</span>
                              </div>
                              {quote.discountTotal > 0 && (
                                <div className="flex justify-between text-rose-500 font-medium font-sans">
                                  <span>Trade Discount:</span>
                                  <span className="font-mono">- {formatINR(quote.discountTotal)}</span>
                                </div>
                              )}
                              {quote.additionalDiscount && quote.additionalDiscount > 0 ? (
                                <div className="flex justify-between text-amber-705 font-semibold font-sans">
                                  <span>Flat Discount:</span>
                                  <span className="font-mono">- {formatINR(quote.additionalDiscount)}</span>
                                </div>
                              ) : null}
                              {quote.freight && quote.freight > 0 ? (
                                <div className="flex justify-between text-indigo-700 font-semibold font-sans">
                                  <span>Freight / Transp.:</span>
                                  <span className="font-mono">+ {formatINR(quote.freight)}</span>
                                </div>
                              ) : null}
                              <div className="flex justify-between text-slate-650 border-b border-dashed border-slate-200 pb-2 font-bold font-sans">
                                <span>{isGstEnabled ? "Taxable Net Value:" : "Total Subtotal:"}</span>
                                <span className="font-mono text-slate-900 font-bold">
                                  {formatINR(quote.subtotal - quote.discountTotal - (quote.additionalDiscount || 0) + (quote.freight || 0))}
                                </span>
                              </div>

                              {isGstEnabled && (isIntrastate ? (
                                <>
                                  <div className="flex justify-between text-slate-505">
                                    <span>CGST Amount:</span>
                                    <span className="font-mono text-slate-705">{formatINR(quote.cgstTotal)}</span>
                                  </div>
                                  <div className="flex justify-between text-slate-505 pb-2 border-b border-slate-200 border-dashed">
                                    <span>SGST Amount:</span>
                                    <span className="font-mono text-slate-705">{formatINR(quote.sgstTotal)}</span>
                                  </div>
                                </>
                              ) : (
                                <div className="flex justify-between text-slate-505 pb-2 border-b border-slate-200 border-dashed">
                                  <span>IGST Amount:</span>
                                  <span className="font-mono text-slate-705 font-bold">{formatINR(quote.igstTotal)}</span>
                                </div>
                              ))}

                              <div className="flex justify-between text-indigo-900 pt-1.5 items-end">
                                <span className="uppercase text-[9px] font-black tracking-wider text-indigo-700">Contract Grand Total:</span>
                                <span className="font-mono text-xl text-indigo-950 font-black leading-none">{formatINR(quote.grandTotal)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Terms & Conditions - FULL PAGE WIDTH */}
                          <div className="pt-8 border-t border-slate-200 text-left page-break-inside-avoid space-y-4 w-full">
                            <span className="text-[10px] font-black tracking-widest text-slate-450 uppercase block font-sans">SECTION II: TERMS, CONDITIONS & SERVICE LEVEL AGREEMENT (SLA)</span>
                            <div className="leading-relaxed bg-slate-50/50 p-6 rounded-xl border border-slate-200 text-xs text-slate-600 font-sans whitespace-pre-line w-full">
                              {quote.terms}
                            </div>
                          </div>

                          {/* Signatures Area */}
                          <div className="flex flex-col sm:flex-row justify-between items-end gap-12 pt-12 page-break-inside-avoid font-sans">
                            <div className="text-left min-w-[220px]">
                              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Accepted & Agreed (For Customer)</span>
                              <div className="h-12 border-b border-dashed border-slate-300 w-48 mt-4"></div>
                              <div className="text-[10px] text-slate-500 mt-2 font-semibold">Authorized Representative Signature & Date</div>
                            </div>

                            <div className="text-right min-w-[240px] flex flex-col items-end">
                              <div className="font-bold text-xs text-slate-855 font-sans">
                                For {compProfile.name}
                              </div>
                              
                              {compProfile.signatureImage ? (
                                <div className="w-full flex items-end justify-end mt-2 h-14">
                                  <img
                                    src={compProfile.signatureImage}
                                    alt="Authorized Signature"
                                    className="max-h-full max-w-full object-contain mix-blend-multiply"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ) : (
                                <div className="h-14"></div>
                              )}
                              <div className="text-[10px] text-slate-500 mt-2 font-semibold border-t border-slate-200/80 pt-1 font-sans">Authorized Signatory</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>

                    {compProfile.footerImage && (
                      <tfoot>
                        <tr>
                          <td className="p-0 border-none">
                            <div className="w-full pt-8 mt-auto">
                              <img
                                src={compProfile.footerImage}
                                alt="Footer"
                                className="w-full h-auto"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              );
            }

            return (
              <div 
                className="space-y-8 max-w-4xl w-full mx-auto print:space-y-0 print:max-w-none"
                id="printable-area-container"
              >
                {/* -------------------- AMC COVER PAGE SECTION -------------------- */}
                {isAmcCover && (
                  <div 
                    className={`flex flex-col justify-between p-8 sm:p-12 md:p-16 select-none font-sans relative overflow-hidden
                      ${
                        coverTheme === "classic-blue" ? "bg-slate-50 text-slate-800" :
                        coverTheme === "modern-gold" ? "bg-amber-50/20 text-amber-950" :
                        coverTheme === "tech-dark" ? "bg-slate-950 text-slate-200" :
                        coverTheme === "corporate-accent" ? "bg-white text-slate-900" :
                        "bg-white text-slate-950"
                      } 
                      w-full rounded-xl border border-slate-300 shadow-xl min-h-[100vh]
                      print:border-0 print:rounded-none print:shadow-none print:p-10 print:m-0 print:print-cover-page print:w-full`}
                    style={{ minHeight: "100vh" }}
                  >
                    {/* Decorative Corner / Top accents */}
                    {coverTheme === "classic-blue" && (
                      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />
                    )}
                    {coverTheme === "modern-gold" && (
                      <div className="absolute top-0 left-0 right-0 h-3 bg-amber-500/80" />
                    )}
                    {coverTheme === "tech-dark" && (
                      <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
                    )}
                    {coverTheme === "minimal-charcoal" && (
                      <div className="absolute top-0 left-0 w-full h-4 bg-slate-950" />
                    )}
                    {coverTheme === "corporate-accent" && (
                      <>
                        {/* Top-Right Premium Dark Slate Polygon matching the image layout */}
                        <div 
                          className="absolute top-0 right-0 w-[55%] h-[42%] bg-slate-900/95 pointer-events-none"
                          style={{
                            clipPath: "polygon(30% 0, 100% 0, 100% 100%, 0 0)",
                            backgroundImage: "linear-gradient(135deg, #0f172a, #1e293b, #0f172a)"
                          }}
                        >
                          {/* Inner elegant accent light */}
                          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
                          <div className="absolute bottom-6 right-6 font-mono text-[9px] text-slate-400 tracking-wider text-right uppercase">
                            <div>Corporate Document</div>
                            <div className="text-slate-500 mt-0.5">REF: {quote.quotationNo}</div>
                          </div>
                        </div>

                        {/* Bottom-Left Golden-Yellow chevron block matching the image layout */}
                        <div 
                          className="absolute left-0 bottom-0 w-[42%] h-[48%] bg-amber-400 pointer-events-none"
                          style={{
                            clipPath: "polygon(0 35%, 100% 100%, 45% 100%, 0 65%)"
                          }}
                        />
                        <div 
                          className="absolute left-0 bottom-0 w-[42%] h-[48%] bg-amber-400/30 pointer-events-none"
                          style={{
                            clipPath: "polygon(0 65%, 45% 100%, 0 100%)"
                          }}
                        />

                        {/* Thin elegant parallel lines running diagonally at the bottom */}
                        <div 
                          className="absolute left-[15%] bottom-[5%] w-[35%] h-[20%] pointer-events-none opacity-40 select-none"
                          style={{
                            background: "repeating-linear-gradient(135deg, transparent, transparent 12px, #475569 12px, #475569 13.5px)"
                          }}
                        />

                        {/* Years badge in the bottom-left space */}
                        <div className="absolute left-8 bottom-12 z-10 flex items-center gap-2 font-sans select-none scale-90 origin-left">
                          <div className="flex flex-col items-center justify-center bg-indigo-650 text-white font-extrabold w-12 h-12 rounded-lg shadow-sm">
                            <span className="text-lg leading-none">08</span>
                            <span className="text-[7px] tracking-tight leading-none uppercase">Years</span>
                          </div>
                          <div className="text-left leading-none font-sans">
                            <div className="text-[9px] font-bold text-slate-600 uppercase">of trust &</div>
                            <div className="text-[10px] font-black text-indigo-750 uppercase">service</div>
                          </div>
                        </div>

                        {/* Barcode/QR Code in the bottom right corner */}
                        <div className="absolute right-8 bottom-12 z-10 flex flex-col items-end gap-1.5 opacity-80 scale-90 origin-right print:opacity-100">
                          <svg className="w-16 h-16 text-slate-800" viewBox="0 0 100 100" fill="currentColor">
                            {/* Outer QR box */}
                            <path d="M0,0 h30 v10 h-20 v20 h-10 z" />
                            <path d="M70,0 h30 v30 h-10 v-20 h-20 z" />
                            <path d="M0,70 h10 v20 h20 v10 h-30 z" />
                            <path d="M100,70 h-10 v20 h-20 v10 h30 z" />
                            {/* Core QR blocks */}
                            <rect x="15" y="15" width="20" height="20" />
                            <rect x="20" y="20" width="10" height="10" fill="white" />
                            <rect x="65" y="15" width="20" height="20" />
                            <rect x="70" y="20" width="10" height="10" fill="white" />
                            <rect x="15" y="65" width="20" height="20" />
                            <rect x="20" y="70" width="10" height="10" fill="white" />
                            {/* Styled dots/random squares */}
                            <rect x="45" y="15" width="8" height="8" />
                            <rect x="45" y="28" width="8" height="8" />
                            <rect x="45" y="45" width="10" height="10" />
                            <rect x="15" y="45" width="8" height="8" />
                            <rect x="28" y="45" width="8" height="8" />
                            <rect x="65" y="45" width="8" height="8" />
                            <rect x="78" y="45" width="8" height="8" />
                            <rect x="65" y="65" width="8" height="8" />
                            <rect x="78" y="65" width="8" height="8" />
                            <rect x="65" y="78" width="8" height="8" />
                            <rect x="78" y="78" width="8" height="8" />
                          </svg>
                          <span className="text-[7px] font-mono tracking-widest text-slate-400">SECURE VERIFIED</span>
                        </div>
                      </>
                    )}

                    {/* Cover Page Header - Full Bleed Width Banner */}
                    {coverTheme === "corporate-accent" ? (
                      <div className="flex justify-between items-start z-10">
                        <div className="flex items-center gap-3">
                          {compProfile.headerImage ? (
                            <img 
                              src={compProfile.headerImage} 
                              alt="Company Logo" 
                              className="w-12 h-12 object-contain rounded-lg" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="p-2.5 bg-indigo-650 text-white rounded-xl shadow-sm">
                              <FileCheck2 className="w-6 h-6 text-white" />
                            </div>
                          )}
                          <div className="text-left font-sans">
                            <span className="block font-sans font-black text-lg tracking-tight text-slate-800 leading-tight">
                              {compProfile.name}
                            </span>
                            <span className="block text-[9px] text-slate-400 font-mono tracking-widest uppercase mt-0.5">
                              DELIVERING EXCELLENCE & VALUE
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : compProfile.headerImage ? (
                      <div className="-mx-8 sm:-mx-12 md:-mx-16 -mt-8 sm:-mt-12 md:-mt-16 print:-mx-10 print:-mt-10 mb-8 overflow-hidden h-48 sm:h-56 print:h-64 relative rounded-t-2xl print:rounded-none shadow-sm">
                        <img 
                          src={compProfile.headerImage} 
                          alt="Cover Page Header Image" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/40 to-transparent flex flex-col justify-end p-6 print:p-10 select-none">
                          <div className="flex justify-between items-end">
                            <div>
                              <div className="text-amber-500 text-[10px] uppercase font-black tracking-widest mb-1">PROPOSAL BY</div>
                              <span className="font-sans font-extrabold text-lg sm:text-2xl text-white tracking-tight drop-shadow-sm">
                                {compProfile.name}
                              </span>
                            </div>
                            <div className="text-right font-mono text-[9px] sm:text-[10px] text-slate-200 opacity-90">
                              <div>REF: {quote.quotationNo}</div>
                              <div>DATE: {formatDate(quote.date)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={`-mx-8 sm:-mx-12 md:-mx-16 -mt-8 sm:-mt-12 md:-mt-16 print:-mx-10 print:-mt-10 mb-8 h-32 print:h-40 flex items-center justify-between px-8 sm:px-12 md:px-16 print:px-10 relative overflow-hidden select-none rounded-t-2xl print:rounded-none ${
                        coverTheme === "classic-blue" ? "bg-gradient-to-r from-indigo-700 to-indigo-900 text-white" :
                        coverTheme === "modern-gold" ? "bg-gradient-to-r from-amber-700 to-amber-900 text-white" :
                        coverTheme === "tech-dark" ? "bg-gradient-to-r from-slate-900 to-teal-950 text-white border-b border-teal-500/20" :
                        "bg-slate-950 text-white"
                      }`}>
                        <div className="flex items-center gap-3 z-10">
                          <div className="p-2 bg-white/10 rounded-lg">
                            <FileCheck2 className="w-5 h-5 text-white" />
                          </div>
                          <span className="font-sans font-bold text-xl tracking-tight">
                            {compProfile.name}
                          </span>
                        </div>
                        <div className="text-right font-mono text-[10px] opacity-80 z-10">
                          <div>REF: {quote.quotationNo}</div>
                          <div>DATE: {formatDate(quote.date)}</div>
                        </div>
                      </div>
                    )}

                    {/* Cover Page Main Content Box */}
                    <div className={`my-auto py-12 text-left z-10 ${coverTheme === "corporate-accent" ? "pl-0 sm:pl-4 space-y-8" : "text-center sm:text-left space-y-6"}`}>
                      {coverTheme === "corporate-accent" ? (
                        <div className="space-y-4">
                          <div className="space-y-0.5 select-none uppercase tracking-tighter">
                            <span className="block font-sans font-extrabold text-amber-500 text-4xl sm:text-5xl md:text-6xl tracking-wide leading-none">
                              Business
                            </span>
                            <span className="block font-sans font-black text-slate-900 text-5xl sm:text-6xl md:text-7xl tracking-tight leading-none">
                              Proposal
                            </span>
                            <span className="block font-sans font-extrabold text-slate-800 text-5xl sm:text-6xl md:text-7xl tracking-tight leading-none">
                              {new Date(quote.date).getFullYear()}
                            </span>
                          </div>

                          <div className="text-left pt-6 max-w-sm">
                            <div className="text-[10px] font-black tracking-widest text-slate-450 uppercase">PLACE YOUR TEXT HERE</div>
                            <p className="text-[11px] text-slate-500 leading-relaxed mt-2 whitespace-normal font-sans">
                              {quote.items.some(item => item.productName.toLowerCase().includes("amc") || item.productName.toLowerCase().includes("maintenance"))
                                ? "This document represents a formal annual maintenance contract (AMC) proposal including service level agreement (SLA) terms for corporate IT support and infrastructure maintenance."
                                : "This commercial quotation outlines premium product supply, deployment specifications, pricing breakdowns, and business collaboration terms customized for your corporate infrastructure."
                              }
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${
                            coverTheme === "classic-blue" ? "bg-indigo-100 text-indigo-800" :
                            coverTheme === "modern-gold" ? "bg-amber-100 text-amber-850" :
                            coverTheme === "tech-dark" ? "bg-teal-50/10 text-teal-400 border border-teal-500/30" :
                            "bg-slate-950 text-white"
                          }`}>
                            Formal Proposal & SLA Contract
                          </div>

                          <h1 className={`font-sans font-black tracking-tight leading-none ${
                            coverTheme === "classic-blue" ? "text-slate-900 text-4xl sm:text-5xl" :
                            coverTheme === "modern-gold" ? "text-amber-900 text-4xl sm:text-5xl font-serif italic" :
                            coverTheme === "tech-dark" ? "text-white text-4xl sm:text-5xl font-mono uppercase" :
                            "text-slate-950 text-5xl sm:text-6xl font-sans tracking-tighter uppercase"
                          }`}>
                            {quote.items.some(item => item.productName.toLowerCase().includes("amc") || item.productName.toLowerCase().includes("maintenance")) 
                              ? <>Annual Maintenance <br className="hidden sm:inline" /> Contract Proposal</> 
                              : <>Commercial <br className="hidden sm:inline" /> Quotation Proposal</>
                            }
                          </h1>
                          
                          <p className={`text-sm max-w-xl leading-relaxed ${coverTheme === "tech-dark" ? "text-slate-400" : "text-slate-600"}`}>
                            {quote.items.some(item => item.productName.toLowerCase().includes("amc") || item.productName.toLowerCase().includes("maintenance"))
                              ? "This contract ensures proactive maintenance, rapid-response service levels (SLAs), and certified hardware/software engineering services tailored specifically for your corporate infrastructure."
                              : "This document contains the commercial proposal, pricing breakdown, and delivery terms customized for your business requirements. We look forward to a successful collaboration."
                            }
                          </p>

                          <div className={`w-32 h-1 rounded-full ${
                            coverTheme === "classic-blue" ? "bg-indigo-600" :
                            coverTheme === "modern-gold" ? "bg-amber-500" :
                            coverTheme === "tech-dark" ? "bg-teal-400" :
                            "bg-slate-950"
                          }`} />
                        </>
                      )}
                    </div>

                    {/* Metadata Parties Layout */}
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 text-left text-xs leading-relaxed z-10 ${
                      coverTheme === "corporate-accent" 
                        ? "border-t border-slate-150 text-slate-700 bg-slate-50/40 p-5 rounded-xl backdrop-blur-sm max-w-2xl" 
                        : "border-t border-slate-200/65"
                    }`}>
                      {/* Prepared For (Client) */}
                      <div className="space-y-2">
                        <span className={`block text-[10px] font-extrabold uppercase tracking-wider ${
                          coverTheme === "classic-blue" ? "text-indigo-600" :
                          coverTheme === "modern-gold" ? "text-amber-700" :
                          coverTheme === "tech-dark" ? "text-teal-400 font-mono" :
                          "text-slate-500"
                        }`}>
                          Prepared For (The Client)
                        </span>
                        <div>
                          <div className={`font-bold text-sm ${coverTheme === "tech-dark" ? "text-white" : "text-slate-900"}`}>
                            {client?.company || "N/A"}
                          </div>
                          <div className="opacity-80 mt-1 whitespace-pre-line">{client?.billingAddress}</div>
                          <div className="mt-2 text-[11px]">
                            <span className="opacity-60 font-sans">Representative:</span> <span className="font-semibold">{client?.name || "N/A"}</span>
                          </div>
                          {client?.gstin && (
                            <div className="text-[10px] font-mono opacity-70">GSTIN: {client.gstin}</div>
                          )}
                        </div>
                      </div>

                      {/* Prepared By (Service Provider) */}
                      <div className="space-y-2">
                        <span className={`block text-[10px] font-extrabold uppercase tracking-wider ${
                          coverTheme === "classic-blue" ? "text-indigo-600" :
                          coverTheme === "modern-gold" ? "text-amber-700" :
                          coverTheme === "tech-dark" ? "text-teal-400 font-mono" :
                          "text-slate-500"
                        }`}>
                          Prepared By (The Provider)
                        </span>
                        <div>
                          <div className={`font-bold text-sm ${coverTheme === "tech-dark" ? "text-white" : "text-slate-900"}`}>
                            {compProfile.name}
                          </div>
                          <div className="opacity-80 mt-1">{compProfile.address || "N/A"}</div>
                          <div className="mt-2 text-[11px] space-y-0.5 font-sans">
                            <div><span className="opacity-60">Contact Support:</span> <span className="font-semibold">{compProfile.phone || "N/A"}</span></div>
                            <div><span className="opacity-60">Corporate Email:</span> <span className="font-semibold">{compProfile.email || "N/A"}</span></div>
                          </div>
                          {compProfile.gstin && (
                            <div className="text-[10px] font-mono opacity-70 mt-1">GSTIN: {compProfile.gstin}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cover Page Footer block */}
                    <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4 border-slate-200/40 text-[9px] opacity-60 font-mono z-10">
                      <div>CONFIDENTIAL & PROPRIETARY DOCUMENT</div>
                      <div>VALID UNTIL: {formatDate(quote.validUntil)}</div>
                      <div>© {new Date().getFullYear()} {compProfile.name}. ALL RIGHTS RESERVED.</div>
                    </div>

                    {/* Footer Image on Cover Page */}
                    {compProfile.footerImage && (
                      <div className="w-full mt-4 print:hidden z-10">
                        <img
                          src={compProfile.footerImage}
                          alt="Footer Image"
                          className="w-full h-auto max-h-16 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Printable Styles for Browser */}

                {/* Main Quotation Sheet Card */}
                <div className="w-full rounded-xl border border-slate-300 shadow-xl p-8 sm:p-12 md:p-16 bg-white text-slate-900 flex flex-col font-sans print:border-0 print:shadow-none print:rounded-none print:p-0 print:m-0 print:w-full">
                  <table className="w-full border-collapse">
                  <tbody>
                    <tr className="page-break-inside-auto">
                      <td className="p-0 border-none page-break-inside-auto">
                        {/* Corporate Letterhead and Invoice Details (Printed once on Page 1) */}
                        {compProfile.headerImage && (
                          <div className="w-full mb-6">
                            <img 
                              src={compProfile.headerImage} 
                              alt="Header" 
                              className="w-full h-auto rounded-t-xl print:rounded-none" 
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        {isAmcCover ? (
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 border-b border-slate-200 mb-8 text-left">
                            <div>
                              <span className="text-[10px] font-black tracking-widest text-indigo-600 uppercase">SERVICE AGREEMENT PROPOSAL</span>
                              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                                ANNUAL MAINTENANCE CONTRACT
                              </h1>
                              <p className="text-xs text-slate-500 mt-1">Formal Quotation & SLA Terms</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium space-y-1 min-w-[200px]">
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-450 uppercase text-[9px] font-bold">Proposal No:</span>
                                <span className="font-mono font-bold text-slate-800">{quote.quotationNo}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-450 uppercase text-[9px] font-bold">Proposal Date:</span>
                                <span className="text-slate-700 font-bold">{formatDate(quote.date)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-450 uppercase text-[9px] font-bold">Valid Until:</span>
                                <span className="text-slate-700 font-bold">{formatDate(quote.validUntil)}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center py-2 border-b border-slate-200 mb-4">
                             <h1 className="text-2xl font-bold uppercase">Quotation</h1>
                             <div className="text-xs text-right font-mono">
                                <div>No: {quote.quotationNo}</div>
                                <div>Date: {formatDate(quote.date)}</div>
                             </div>
                          </div>
                        )}

                        {/* Client / Customer Party Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs leading-relaxed text-left mb-0 pb-0">
                          <div className="space-y-1">
                            <h3 className="font-bold text-slate-500 uppercase tracking-wider select-none text-[10px]">To Company (Consignee)</h3>
                            <div className="font-bold text-sm text-slate-800">{client?.company || "N/A"}</div>
                            <div className="text-slate-650 leading-normal whitespace-pre-line">
                              {client?.billingAddress || "N/A"}
                            </div>
                            <div>Attn Check: <span className="font-semibold text-slate-800">{client?.name || "N/A"}</span></div>
                            <div>Contact Call: <span className="font-semibold text-slate-855 font-mono">{client?.phone || "N/A"}</span></div>
                          </div>

                          <div className="space-y-1">
                            <h3 className="font-bold text-slate-500 uppercase tracking-wider select-none text-[10px]">Shipping Destination</h3>
                            <div className="font-bold text-sm text-slate-800">{client?.company || "N/A"}</div>
                            <div className="text-slate-650 leading-normal whitespace-pre-line">
                              {client?.shippingAddress || "N/A"}
                            </div>
                          </div>
                        </div>

                        {/* Solid spacer of exactly 0.25 inches */}
                        <div style={{ height: "0.25in" }} className="w-full clear-both select-none pointer-events-none" />

                        {/* Products / Items Catalogue billing table */}
                        <div className="overflow-x-auto ring-1 ring-slate-150 rounded-lg mt-0 mb-8">
                          <table className="w-full text-left text-xs text-slate-700 min-w-[650px] border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase text-[9px] font-black tracking-wider text-left">
                                <th className="py-3 px-4 text-center">#</th>
                                <th className="py-3 px-4 max-w-sm">{isAmcCover ? "Service description / AMC Scope" : "Products and Services"}</th>
                                <th className="py-3 px-3 text-center">HSN Code</th>
                                <th className="py-3 px-3 text-center">Qty</th>
                                <th className="py-3 px-3 text-right">Rate</th>
                                <th className="py-3 px-3 text-center">Discount</th>
                                {isGstEnabled && <th className="py-3 px-3 text-center">Gst Rate</th>}
                                <th className="py-3 px-4 text-right">{isGstEnabled ? "Taxable Basic Value" : "Amount"}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600 text-left">
                              {quote.items.map((item, idx) => {
                                const baseVal = item.rate * item.quantity;
                                const discVal = (baseVal * item.discountPercent) / 100;
                                const finalVal = baseVal - discVal;
                                return (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="py-3 px-4 text-center font-bold text-slate-400 font-mono">
                                      {idx + 1}
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="font-bold text-slate-800">{item.productName}</div>
                                      {item.description && <div className="text-[10px] text-slate-500 mt-0.5 whitespace-pre-wrap">{item.description}</div>}
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono">
                                      {item.hsnCode || "-"}
                                    </td>
                                    <td className="py-3 px-3 text-center font-bold text-slate-800 font-mono">
                                      {item.quantity}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono font-medium">
                                      {formatINR(item.rate)}
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono font-semibold text-rose-500">
                                      {item.discountPercent > 0 ? `${item.discountPercent}%` : "-"}
                                    </td>
                                    {isGstEnabled && (
                                      <td className="py-3 px-3 text-center font-semibold font-mono text-indigo-600">
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

                        {/* Subtotals & Indian Taxation Grid */}
                        <div className="flex flex-col sm:flex-row justify-between gap-8 pt-4 items-start text-left">
                          {/* Left: General Bank Info */}
                          <div className="w-full sm:max-w-md p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-2 text-xs">
                            <span className="font-bold text-slate-500 uppercase select-none text-[9px] tracking-widest block pb-1 border-b border-slate-200">
                              Standard Remittance Details (RTGS/NEFT/IMPS)
                            </span>
                            <div className="grid grid-cols-3 gap-y-1">
                              <span className="text-slate-550 font-sans">Bank Name:</span>
                              <span className="col-span-2 font-bold text-slate-800">{compProfile.bankName}</span>
                              
                              <span className="text-slate-550">Branch Name:</span>
                              <span className="col-span-2 font-semibold text-slate-800">{compProfile.bankBranch}</span>
                              
                              <span className="text-slate-550">Account No:</span>
                              <span className="col-span-2 font-mono font-bold text-slate-900">{compProfile.accountNo}</span>
                              
                              <span className="text-slate-550 font-mono">IFSC Code:</span>
                              <span className="col-span-2 font-mono font-bold text-indigo-700">{compProfile.ifsc}</span>
                            </div>
                          </div>

                          {/* Right: Calculations with CGST + SGST vs IGST split representation */}
                          <div className="w-full sm:max-w-xs space-y-2 text-xs font-medium">
                            <div className="flex justify-between text-slate-500">
                              <span>Total Base Subtotal:</span>
                              <span className="font-mono text-slate-800 font-semibold">{formatINR(quote.subtotal)}</span>
                            </div>
                            {quote.discountTotal > 0 && (
                              <div className="flex justify-between text-rose-500 font-medium">
                                <span>Item-Level Trade Discount:</span>
                                <span className="font-mono">- {formatINR(quote.discountTotal)}</span>
                              </div>
                            )}
                            {quote.additionalDiscount && quote.additionalDiscount > 0 ? (
                              <div className="flex justify-between text-amber-700 font-semibold">
                                <span>Additional flat Discount:</span>
                                <span className="font-mono">- {formatINR(quote.additionalDiscount)}</span>
                              </div>
                            ) : null}
                            {quote.freight && quote.freight > 0 ? (
                              <div className="flex justify-between text-indigo-700 font-semibold">
                                <span>Freight / Shipping Charges:</span>
                                <span className="font-mono">+ {formatINR(quote.freight)}</span>
                              </div>
                            ) : null}
                            <div className="flex justify-between text-slate-600 border-b border-dashed border-slate-200 pb-1.5 font-bold">
                              <span>{isGstEnabled ? "Taxable Value (Net):" : "Subtotal:"}</span>
                              <span className="font-mono text-slate-900 font-bold">
                                {formatINR(quote.subtotal - quote.discountTotal - (quote.additionalDiscount || 0) + (quote.freight || 0))}
                              </span>
                            </div>

                            {/* Tax split indicator */}
                            {isGstEnabled && (isIntrastate ? (
                              <>
                                <div className="flex justify-between text-slate-500">
                                  <span>Central GST (CGST component):</span>
                                  <span className="font-mono text-slate-700">{formatINR(quote.cgstTotal)}</span>
                                </div>
                                <div className="flex justify-between text-slate-505 pb-1.5 border-b border-slate-200 border-dashed">
                                  <span>State GST (SGST component):</span>
                                  <span className="font-mono text-slate-700">{formatINR(quote.sgstTotal)}</span>
                                </div>
                              </>
                            ) : (
                              <div className="flex justify-between text-slate-505 pb-1.5 border-b border-slate-200 border-dashed">
                                <span>Integrated GST (IGST total):</span>
                                <span className="font-mono text-slate-705 font-bold">{formatINR(quote.igstTotal)}</span>
                              </div>
                            ))}

                            <div className="flex justify-between text-indigo-900 font-sans font-black text-sm pt-1.5 leading-none">
                              <span className="uppercase text-[10px] tracking-wider text-indigo-700">Invoice Grand Total:</span>
                              <span className="font-mono text-lg text-indigo-950 font-black">{formatINR(quote.grandTotal)}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Scope terms & clauses signature area */}
                        <div className="pt-8 border-t border-slate-200 leading-normal text-[11px] text-left page-break-inside-avoid space-y-6">
                          {/* Full width terms list */}
                          <div className="text-left space-y-2 whitespace-pre-line text-[#5c657a] w-full">
                            <div className="font-extrabold text-[#3e485e] uppercase tracking-wider text-[10px] select-none mb-2 pb-1 border-b border-slate-150">
                              Terms and Conditions of Proposal
                            </div>
                            <div className="leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 font-sans">
                              {quote.terms}
                            </div>
                          </div>

                          {/* Signature Layout: Client acceptance & Service Provider side-by-side */}
                          <div className="flex flex-col sm:flex-row justify-between items-end gap-8 pt-4">
                            <div className="text-left min-w-[200px]">
                              <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Accepted & Agreed By (The Client)</div>
                              <div className="h-10 border-b border-dashed border-slate-300 w-48 mt-4"></div>
                              <div className="text-[10px] text-slate-500 mt-2 font-semibold">Authorized Signature & Date</div>
                            </div>

                            <div className="text-right min-w-[240px] flex flex-col items-end">
                              <div className="font-extrabold text-xs text-[#3e485e]">
                                For {compProfile.name}
                              </div>
                              
                              {compProfile.signatureImage && (
                                 <div className="w-full flex items-end justify-end mt-2">
                                  <img
                                    src={compProfile.signatureImage}
                                    alt="Authorized Signature"
                                    className="max-h-[70px] max-w-full object-contain mix-blend-multiply"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}
                              <div className="text-[10px] text-slate-500 mt-2 font-semibold">Authorized Signatory</div>
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
                      alt="Footer"
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
                      alt="Footer"
                      className="w-full h-auto object-contain mix-blend-multiply block"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                </div> {/* Close the main quotation sheet card wrapper */}
              </div>
            );
          })()}




        </div>
      )}
      
      {activeQuoteId && (
        <EmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          documentName={`${customers.find(c => c.id === getSelectedQuote()?.customerId)?.company?.replace(/[^a-zA-Z0-9]/g, '_') || 'Customer'}_${getSelectedQuote()?.quotationNo || 'Quote'}`}
          customerEmail={customers.find(c => c.id === getSelectedQuote()?.customerId)?.email || ''}
          defaultSubject={`Quotation ${getSelectedQuote()?.quotationNo} from ${companyProfiles.find(p => p.id === getSelectedQuote()?.companyId)?.name || 'Us'}`}
          defaultBody={`Dear ${customers.find(c => c.id === getSelectedQuote()?.customerId)?.name || 'Customer'},\n\nPlease find attached the quotation ${getSelectedQuote()?.quotationNo}.\n\nThank you for your business!`}
        />
      )}

      {/* Quick Customer Creation Modal */}
      {openQuickCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-sans animate-fade-in">
          <form 
            onSubmit={handleQuickCustomerSubmit}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
          >
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                Quick Add Target Client
              </h3>
              <button 
                type="button"
                onClick={() => setOpenQuickCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold select-none cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 px-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Company Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Acme Tech Solutions"
                    value={quickCustCompany}
                    onChange={(e) => setQuickCustCompany(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg p-2 text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Contact Person *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. John Doe"
                    value={quickCustName}
                    onChange={(e) => setQuickCustName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg p-2 text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Email</label>
                  <input
                    type="email"
                    placeholder="e.g. business@acme.com"
                    value={quickCustEmail}
                    onChange={(e) => setQuickCustEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg p-2 text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Phone No.</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={quickCustPhone}
                    onChange={(e) => setQuickCustPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg p-2 text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">GSTIN (Indian Code)</label>
                  <input
                    type="text"
                    placeholder="e.g. 27AAAAA1111A1Z1"
                    value={quickCustGstin}
                    onChange={(e) => setQuickCustGstin(e.target.value.toUpperCase())}
                    maxLength={15}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg p-2 text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 font-sans font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Trading State / Place of Supply *</label>
                  <select
                    required
                    value={quickCustState}
                    onChange={(e) => setQuickCustState(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg p-2 text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 font-sans"
                  >
                    {["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Gujarat", "Telangana", "Uttar Pradesh", "West Bengal", "Haryana", "Rajasthan", "Kerala", "Madhya Pradesh", "Andhra Pradesh", "Punjab", "Bihar", "Goa", "Assam", "Odisha", "Jharkhand", "Chhattisgarh", "Uttarakhand", "Himachal Pradesh", "Jammu & Kashmir"].map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Billing Address</label>
                <textarea
                  rows={2}
                  placeholder="Complete business invoicing address details..."
                  value={quickCustBillingAddress}
                  onChange={(e) => setQuickCustBillingAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-lg p-3 text-slate-700 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="quick-cust-same-addr"
                  checked={quickCustSameAddress}
                  onChange={(e) => setQuickCustSameAddress(e.target.checked)}
                  className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="quick-cust-same-addr" className="text-slate-600 text-xs font-medium cursor-pointer select-none">Shipping Address is the same as Billing Address</label>
              </div>

              {!quickCustSameAddress && (
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Shipping Delivery Address</label>
                  <textarea
                    rows={2}
                    placeholder="Enter dispatch delivery address details..."
                    value={quickCustShippingAddress}
                    onChange={(e) => setQuickCustShippingAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg p-3 text-slate-700 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setOpenQuickCustomerModal(false)}
                className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-[11px] cursor-pointer hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] cursor-pointer shadow transition-colors"
              >
                Create Target Client
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Product Creation Modal */}
      {openQuickProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-sans animate-fade-in">
          <form 
            onSubmit={handleQuickProductSubmit}
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
          >
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                Quick Add Catalog Entry
              </h3>
              <button 
                type="button"
                onClick={() => {
                  setOpenQuickProductModal(false);
                  setActiveItemRowIdxForQuickProd(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold select-none cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 px-6 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Registry Type</label>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                  {(["Product", "Service", "Agreement"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setQuickProdItemType(t)}
                      className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-all ${
                        quickProdItemType === t
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
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Catalog Item Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Cisco Ethernet Switch"
                  value={quickProdName}
                  onChange={(e) => setQuickProdName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-lg p-2 text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Unique SKU/Code *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. CS-SW-12"
                    value={quickProdSku}
                    onChange={(e) => setQuickProdSku(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg p-2 text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 font-sans font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Standard Rate (₹) *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    placeholder="Rate ₹"
                    value={quickProdRate}
                    onChange={(e) => setQuickProdRate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg p-2 text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">HSN Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 851762"
                    value={quickProdHsn}
                    onChange={(e) => setQuickProdHsn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg p-2 text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Standard GST Rate (%)</label>
                  <select
                    value={quickProdGst}
                    onChange={(e) => setQuickProdGst(parseInt(e.target.value) || 18)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg p-2 text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 font-sans"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Specifications / Description</label>
                <textarea
                  rows={3}
                  placeholder="Catalog specs of product metrics..."
                  value={quickProdDesc}
                  onChange={(e) => setQuickProdDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-lg p-3 text-slate-700 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setOpenQuickProductModal(false);
                  setActiveItemRowIdxForQuickProd(null);
                }}
                className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-[11px] cursor-pointer hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] cursor-pointer shadow transition-colors"
              >
                Create Catalog Item
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
