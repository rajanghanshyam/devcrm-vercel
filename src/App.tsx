/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import QuotationsView from "./components/QuotationsView";
import ProformaInvoiceView from "./components/ProformaInvoiceView";
import ChallanView from "./components/ChallanView";
import LeadView from "./components/LeadView";
import CustomerView from "./components/CustomerView";
import ProductView from "./components/ProductView";
import InventoryView from "./components/InventoryView";
import SubscriptionView from "./components/SubscriptionView";
import ReminderView from "./components/ReminderView";
import SettingsView from "./components/SettingsView";
import AmazonSellerView from "./components/AmazonSellerView";
import CataloguesView from "./components/CataloguesView";
import LoginView from "./components/LoginView";
import { useAuth } from "./hooks/useAuth";
import { 
  Quotation, 
  ProformaInvoice, 
  DeliveryChallan, 
  Lead, 
  Customer, 
  Product, 
  Subscription, 
  Reminder, 
  CompanySettings,
  CompanyProfile,
  InventoryItem
} from "./types";
import { 
  initializeStorage,
  DEFAULT_COMPANY_SETTINGS,
  SEED_COMPANY_PROFILES,
  SEED_CUSTOMERS,
  SEED_PRODUCTS,
  SEED_QUOTATIONS,
  SEED_PROFORMA_INVOICES,
  SEED_CHALLANS,
  SEED_LEADS,
  SEED_SUBSCRIPTIONS,
  SEED_REMINDERS,
  SEED_INVENTORY,
  toInputDate
} from "./utils";

export default function App() {
  const { user, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>("dashboard");

  // Core Data States
  const [companyProfiles, setCompanyProfiles] = useState<CompanyProfile[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<ProformaInvoice[]>([]);
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);

  // State Mirror Refs to guarantee real-time access and prevent React state batching closures from using stale lists
  const companyProfilesRef = useRef<CompanyProfile[]>([]);
  const customersRef = useRef<Customer[]>([]);
  const productsRef = useRef<Product[]>([]);
  const quotationsRef = useRef<Quotation[]>([]);
  const invoicesRef = useRef<ProformaInvoice[]>([]);
  const challansRef = useRef<DeliveryChallan[]>([]);
  const leadsRef = useRef<Lead[]>([]);
  const subscriptionsRef = useRef<Subscription[]>([]);
  const remindersRef = useRef<Reminder[]>([]);
  const inventoryItemsRef = useRef<InventoryItem[]>([]);

  // Derived Company Settings for backward compatibility (using first company/profile as active)
  const activeProfile = companyProfiles[0] || {
    id: "comp_apex",
    name: "Apex Techno Solutions Pvt. Ltd.",
    email: "billing@apexsolutions.co.in",
    phone: "+91 22 4902 8888",
    address: "Suite 402, 4th Floor, Maker Chambers V, Nariman Point, Mumbai, Maharashtra",
    gstin: "27AADCA8945B1ZC",
    pan: "AADCA8945B",
    state: "Maharashtra",
    bankName: "HDFC Bank Ltd.",
    bankBranch: "Fort Branch, Mumbai",
    accountNo: "50200048102943",
    ifsc: "HDFC0000060",
    headerImage: "",
    footerImage: "",
    quotationPrefix: "QTN-APEX",
    invoicePrefix: "PI-APEX",
    challanPrefix: "DC-APEX",
    nextQuotationNumber: 1,
    nextInvoiceNumber: 1,
    nextChallanNumber: 1,
    enableGst: true,
    termsPresets: []
  };

  const companySettings: CompanySettings = {
    name: activeProfile.name,
    email: activeProfile.email,
    phone: activeProfile.phone,
    address: activeProfile.address,
    gstin: activeProfile.gstin,
    pan: activeProfile.pan,
    state: activeProfile.state,
    bankName: activeProfile.bankName,
    bankBranch: activeProfile.bankBranch,
    accountNo: activeProfile.accountNo,
    ifsc: activeProfile.ifsc,
    defaultTerms: activeProfile.termsPresets?.[0]?.content || "No preset clauses found",
    headerImage: activeProfile.headerImage,
    footerImage: activeProfile.footerImage,
    termsPresets: activeProfile.termsPresets,
    quotationPrefix: activeProfile.quotationPrefix,
    invoicePrefix: activeProfile.invoicePrefix,
    challanPrefix: activeProfile.challanPrefix,
    nextQuotationNumber: activeProfile.nextQuotationNumber,
    nextInvoiceNumber: activeProfile.nextInvoiceNumber,
    nextChallanNumber: activeProfile.nextChallanNumber,
    enableGst: activeProfile.enableGst !== false
  };

  // Direct single-record cloud persistence saving method
  const directSaveRecord = async (model: string, item: any) => {
    try {
      await fetch("/api/save-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, data: item })
      });
    } catch (err) {
      console.error(`Direct save record failed for ${model}:`, err);
    }
  };

  // Direct single-record cloud database deletion method
  const directDeleteRecord = async (model: string, id: string) => {
    try {
      await fetch("/api/db/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, id })
      });
    } catch (err) {
      console.error(`Direct delete record failed for ${model}:`, err);
    }
  };

  // Initialize and Seed Storage once on mount
  useEffect(() => {
    // 1. Fetch from server-side PostgreSQL database via direct connection
    fetch("/api/db/get")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((resData) => {
        if (resData.success && resData.data && Object.keys(resData.data).length > 0) {
          const s = resData.data;
          if (s.company_profiles) {
            setCompanyProfiles(s.company_profiles);
            companyProfilesRef.current = s.company_profiles;
          }
          if (s.customers) {
            setCustomers(s.customers);
            customersRef.current = s.customers;
          }
          if (s.products) {
            setProducts(s.products);
            productsRef.current = s.products;
          }
          if (s.quotations) {
            setQuotations(s.quotations);
            quotationsRef.current = s.quotations;
          }
          if (s.proforma_invoices) {
            setInvoices(s.proforma_invoices);
            invoicesRef.current = s.proforma_invoices;
          }
          if (s.challans) {
            setChallans(s.challans);
            challansRef.current = s.challans;
          }
          if (s.leads) {
            setLeads(s.leads);
            leadsRef.current = s.leads;
          }
          if (s.subscriptions) {
            setSubscriptions(s.subscriptions);
            subscriptionsRef.current = s.subscriptions;
          }
          if (s.reminders) {
            setReminders(s.reminders);
            remindersRef.current = s.reminders;
          }
          if (s.inventory) {
            setInventoryItems(s.inventory);
            inventoryItemsRef.current = s.inventory;
          }
        } else {
          if (!resData.success && resData.error) {
            setDbError(resData.error);
          }
          // Seed standard defaults
          setCompanyProfiles(SEED_COMPANY_PROFILES);
          companyProfilesRef.current = SEED_COMPANY_PROFILES;
          setCustomers(SEED_CUSTOMERS);
          customersRef.current = SEED_CUSTOMERS;
          setProducts(SEED_PRODUCTS);
          productsRef.current = SEED_PRODUCTS;
          setQuotations(SEED_QUOTATIONS);
          quotationsRef.current = SEED_QUOTATIONS;
          setInvoices(SEED_PROFORMA_INVOICES);
          invoicesRef.current = SEED_PROFORMA_INVOICES;
          setChallans(SEED_CHALLANS);
          challansRef.current = SEED_CHALLANS;
          setLeads(SEED_LEADS);
          leadsRef.current = SEED_LEADS;
          setSubscriptions(SEED_SUBSCRIPTIONS);
          subscriptionsRef.current = SEED_SUBSCRIPTIONS;
          setReminders(SEED_REMINDERS);
          remindersRef.current = SEED_REMINDERS;
          setInventoryItems(SEED_INVENTORY);
          inventoryItemsRef.current = SEED_INVENTORY;
          
          if (resData.success) {
            // Write starting seed to server right away so they exist
            const startingState = {
              company_profiles: SEED_COMPANY_PROFILES,
              customers: SEED_CUSTOMERS,
              products: SEED_PRODUCTS,
              quotations: SEED_QUOTATIONS,
              proforma_invoices: SEED_PROFORMA_INVOICES,
              challans: SEED_CHALLANS,
              leads: SEED_LEADS,
              subscriptions: SEED_SUBSCRIPTIONS,
              reminders: SEED_REMINDERS,
              inventory: SEED_INVENTORY
            };
            fetch("/api/db/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(startingState)
            }).catch(err => console.error("Could not write initial starting state seeds to server:", err));
          }
        }
      })
      .catch((err) => {
        console.warn("Express server direct database load failed:", err);
        setDbError(err.message || String(err));
        
        // Seed standard defaults as a fallback
        setCompanyProfiles(SEED_COMPANY_PROFILES);
        companyProfilesRef.current = SEED_COMPANY_PROFILES;
        setCustomers(SEED_CUSTOMERS);
        customersRef.current = SEED_CUSTOMERS;
        setProducts(SEED_PRODUCTS);
        productsRef.current = SEED_PRODUCTS;
        setQuotations(SEED_QUOTATIONS);
        quotationsRef.current = SEED_QUOTATIONS;
        setInvoices(SEED_PROFORMA_INVOICES);
        invoicesRef.current = SEED_PROFORMA_INVOICES;
        setChallans(SEED_CHALLANS);
        challansRef.current = SEED_CHALLANS;
        setLeads(SEED_LEADS);
        leadsRef.current = SEED_LEADS;
        setSubscriptions(SEED_SUBSCRIPTIONS);
        subscriptionsRef.current = SEED_SUBSCRIPTIONS;
        setReminders(SEED_REMINDERS);
        remindersRef.current = SEED_REMINDERS;
        setInventoryItems(SEED_INVENTORY);
        inventoryItemsRef.current = SEED_INVENTORY;
      });
  }, []);

  // Database persistence helper wrappers using direct record-level updates
  const updateCompanyProfiles = (updated: CompanyProfile[]) => {
    const oldList = companyProfilesRef.current;
    setCompanyProfiles(updated);
    companyProfilesRef.current = updated;

    const deleted = oldList.filter(oldItem => !updated.some(newItem => newItem.id === oldItem.id));
    for (const item of deleted) {
      directDeleteRecord("company_profiles", item.id);
    }

    const changedOrAdded = updated.filter(newItem => {
      const oldItem = oldList.find(o => o.id === newItem.id);
      if (!oldItem) return true;
      return JSON.stringify(newItem) !== JSON.stringify(oldItem);
    });
    for (const item of changedOrAdded) {
      directSaveRecord("company_profiles", item);
    }
  };

  const updateCustomers = (updated: Customer[]) => {
    const oldList = customersRef.current;
    setCustomers(updated);
    customersRef.current = updated;

    const deleted = oldList.filter(oldItem => !updated.some(newItem => newItem.id === oldItem.id));
    for (const item of deleted) {
      directDeleteRecord("customers", item.id);
    }

    const changedOrAdded = updated.filter(newItem => {
      const oldItem = oldList.find(o => o.id === newItem.id);
      if (!oldItem) return true;
      return JSON.stringify(newItem) !== JSON.stringify(oldItem);
    });
    for (const item of changedOrAdded) {
      directSaveRecord("customers", item);
    }
  };

  const updateProducts = (updated: Product[]) => {
    const oldList = productsRef.current;
    setProducts(updated);
    productsRef.current = updated;

    const deleted = oldList.filter(oldItem => !updated.some(newItem => newItem.id === oldItem.id));
    for (const item of deleted) {
      directDeleteRecord("products", item.id);
    }

    const changedOrAdded = updated.filter(newItem => {
      const oldItem = oldList.find(o => o.id === newItem.id);
      if (!oldItem) return true;
      return JSON.stringify(newItem) !== JSON.stringify(oldItem);
    });
    for (const item of changedOrAdded) {
      directSaveRecord("products", item);
    }
  };

  const updateQuotations = (updated: Quotation[]) => {
    const oldList = quotationsRef.current;
    setQuotations(updated);
    quotationsRef.current = updated;

    const deleted = oldList.filter(oldItem => !updated.some(newItem => newItem.id === oldItem.id));
    for (const item of deleted) {
      directDeleteRecord("quotations", item.id);
    }

    const changedOrAdded = updated.filter(newItem => {
      const oldItem = oldList.find(o => o.id === newItem.id);
      if (!oldItem) return true;
      return JSON.stringify(newItem) !== JSON.stringify(oldItem);
    });
    for (const item of changedOrAdded) {
      directSaveRecord("quotations", item);
    }
  };

  const updateInvoices = (updated: ProformaInvoice[]) => {
    const oldList = invoicesRef.current;
    setInvoices(updated);
    invoicesRef.current = updated;

    const deleted = oldList.filter(oldItem => !updated.some(newItem => newItem.id === oldItem.id));
    for (const item of deleted) {
      directDeleteRecord("proforma_invoices", item.id);
    }

    const changedOrAdded = updated.filter(newItem => {
      const oldItem = oldList.find(o => o.id === newItem.id);
      if (!oldItem) return true;
      return JSON.stringify(newItem) !== JSON.stringify(oldItem);
    });
    for (const item of changedOrAdded) {
      directSaveRecord("proforma_invoices", item);
    }
  };

  const updateChallans = (updated: DeliveryChallan[]) => {
    const oldList = challansRef.current;
    setChallans(updated);
    challansRef.current = updated;

    const deleted = oldList.filter(oldItem => !updated.some(newItem => newItem.id === oldItem.id));
    for (const item of deleted) {
      directDeleteRecord("challans", item.id);
    }

    const changedOrAdded = updated.filter(newItem => {
      const oldItem = oldList.find(o => o.id === newItem.id);
      if (!oldItem) return true;
      return JSON.stringify(newItem) !== JSON.stringify(oldItem);
    });
    for (const item of changedOrAdded) {
      directSaveRecord("challans", item);
    }
  };

  const updateLeads = (updated: Lead[]) => {
    const oldList = leadsRef.current;
    setLeads(updated);
    leadsRef.current = updated;

    const deleted = oldList.filter(oldItem => !updated.some(newItem => newItem.id === oldItem.id));
    for (const item of deleted) {
      directDeleteRecord("leads", item.id);
    }

    const changedOrAdded = updated.filter(newItem => {
      const oldItem = oldList.find(o => o.id === newItem.id);
      if (!oldItem) return true;
      return JSON.stringify(newItem) !== JSON.stringify(oldItem);
    });
    for (const item of changedOrAdded) {
      directSaveRecord("leads", item);
    }
  };

  const updateSubscriptions = (updatedSubs: Subscription[]) => {
    const todayStr = new Date().toISOString().split("T")[0];
    
    // Auto-detect expired subscriptions and assign status "Expired"
    const checkedSubs = updatedSubs.map(sub => {
      const expDate = toInputDate(sub.nextRenewalDate);
      if (expDate && expDate < todayStr && sub.status !== "Cancelled" && sub.status !== "Suspended") {
        return { ...sub, status: "Expired" as const };
      }
      return sub;
    });

    const oldSubs = subscriptionsRef.current;
    setSubscriptions(checkedSubs);
    subscriptionsRef.current = checkedSubs;

    let newReminders = [...remindersRef.current];

    checkedSubs.forEach(sub => {
       // Clear ALL existing reminders for this sub to prevent stale/duplicate entries
       newReminders = newReminders.filter(r => r.subscriptionId !== sub.id);
       
       const expDate = toInputDate(sub.nextRenewalDate);
       const isExpired = expDate && expDate < todayStr;

       // If the subscription is Active and not expired and next renewal date is set:
       if (sub.status === "Active" && sub.nextRenewalDate && !isExpired) {
          const customer = customersRef.current.find(c => c.id === sub.customerId);
          // Auto-generate exactly ONE latest active reminder where dueDate is strictly the subscription's nextRenewalDate
          newReminders.push({
             id: `rem_sub_${sub.id}`,
             title: `Renewal: ${sub.serviceName} (${customer?.company || 'Unknown'})`,
             description: `Plan renewal reminder for ${sub.serviceName} contract.`,
             dueDate: expDate,
             status: "Pending",
             priority: "High",
             relatedTo: customer?.company,
             subscriptionId: sub.id
          });
       }
    });

    const oldReminders = remindersRef.current;
    setReminders(newReminders);
    remindersRef.current = newReminders;

    // Direct save/delete for subscriptions
    const deletedSubs = oldSubs.filter(oldItem => !checkedSubs.some(newItem => newItem.id === oldItem.id));
    for (const item of deletedSubs) {
      directDeleteRecord("subscriptions", item.id);
    }
    const changedOrAddedSubs = checkedSubs.filter(newItem => {
      const oldItem = oldSubs.find(o => o.id === newItem.id);
      if (!oldItem) return true;
      return JSON.stringify(newItem) !== JSON.stringify(oldItem);
    });
    for (const item of changedOrAddedSubs) {
      directSaveRecord("subscriptions", item);
    }

    // Direct save/delete for reminders
    const deletedRems = oldReminders.filter(oldItem => !newReminders.some(newItem => newItem.id === oldItem.id));
    for (const item of deletedRems) {
      directDeleteRecord("reminders", item.id);
    }
    const changedOrAddedRems = newReminders.filter(newItem => {
      const oldItem = oldReminders.find(o => o.id === newItem.id);
      if (!oldItem) return true;
      return JSON.stringify(newItem) !== JSON.stringify(oldItem);
    });
    for (const item of changedOrAddedRems) {
      directSaveRecord("reminders", item);
    }
  };

  const updateReminders = (updated: Reminder[]) => {
    const oldList = remindersRef.current;
    setReminders(updated);
    remindersRef.current = updated;

    const deleted = oldList.filter(oldItem => !updated.some(newItem => newItem.id === oldItem.id));
    for (const item of deleted) {
      directDeleteRecord("reminders", item.id);
    }

    const changedOrAdded = updated.filter(newItem => {
      const oldItem = oldList.find(o => o.id === newItem.id);
      if (!oldItem) return true;
      return JSON.stringify(newItem) !== JSON.stringify(oldItem);
    });
    for (const item of changedOrAdded) {
      directSaveRecord("reminders", item);
    }
  };
  
  const updateInventory = (updated: InventoryItem[]) => {
    const oldList = inventoryItemsRef.current;
    setInventoryItems(updated);
    inventoryItemsRef.current = updated;

    const deleted = oldList.filter(oldItem => !updated.some(newItem => newItem.id === oldItem.id));
    for (const item of deleted) {
      directDeleteRecord("inventory", item.id);
    }

    const changedOrAdded = updated.filter(newItem => {
      const oldItem = oldList.find(o => o.id === newItem.id);
      if (!oldItem) return true;
      return JSON.stringify(newItem) !== JSON.stringify(oldItem);
    });
    for (const item of changedOrAdded) {
      directSaveRecord("inventory", item);
    }
  };

  // Convert Quotation into active Proforma Invoice (SaaS/Corporate ease!)
  const convertQuotationToInvoice = (quote: Quotation) => {
    // Check if quotation already converted to avoid double logic
    if (invoices.some(i => i.quotationNo === quote.quotationNo)) {
      alert("This quotation has already been converted to a Proforma Invoice.");
      return;
    }

    const currentYr = new Date().getFullYear();
    const invNo = `PI-${currentYr}-${String(currentYr + 1).slice(2)}-${String(invoices.length + 101)}`.toUpperCase();

    const todayStr = new Date().toISOString().split("T")[0];
    const due = new Date();
    due.setDate(due.getDate() + 14); // 2-weeks standard credit limit
    const dueStr = due.toISOString().split("T")[0];

    const newInvoice: ProformaInvoice = {
      id: "inv_" + Date.now(),
      invoiceNo: invNo,
      quotationNo: quote.quotationNo.toUpperCase(),
      date: todayStr,
      dueDate: dueStr,
      customerId: quote.customerId,
      subject: `PROFORMA INVOICE CONVERTED FROM APPROVED QUOTATION ${quote.quotationNo.toUpperCase()}`,
      items: quote.items,
      subtotal: quote.subtotal,
      discountTotal: quote.discountTotal,
      cgstTotal: quote.cgstTotal,
      sgstTotal: quote.sgstTotal,
      igstTotal: quote.igstTotal,
      grandTotal: quote.grandTotal,
      status: "Unpaid",
      terms: companySettings.defaultTerms || quote.terms,
      companyId: quote.companyId,
      freight: quote.freight,
      additionalDiscount: quote.additionalDiscount
    };

    // Update quote status to Converted
    const revisedQuotes = quotations.map(q => {
      if (q.id === quote.id) {
        return { ...q, status: "Converted" as const };
      }
      return q;
    });

    updateQuotations(revisedQuotes);
    updateInvoices([newInvoice, ...invoices]);
    setCurrentTab("proforma");
  };

  // Quick Action navigation triggers from Dashboard View
  const handleAddNewQuotationTrigger = () => {
    setCurrentTab("quotations");
  };

  const handleAddNewLeadTrigger = () => {
    setCurrentTab("leads");
  };

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-900">
      {/* Sidebar Component with perfect visual copying mapping */}
      <Sidebar 
        currentTab={currentTab} 
        onTabChange={setCurrentTab}
        userName={user.name}
        userEmail={user.email}
        onLogout={logout}
        user={user}
      />

      {/* Main Content scroll window */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-screen custom-scrollbar">
        {dbError && (
          <div className="mb-6 p-4 md:p-5 bg-red-50 border border-red-200 rounded-lg text-red-800 shadow-sm transition-all relative">
            <div className="flex gap-3">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 text-sm md:text-base">Database Connection Issue Detected</h3>
                <div className="mt-2 text-xs md:text-sm text-red-800 space-y-2 font-sans leading-relaxed">
                  <p>
                    The server failed to authenticate or connect with your PostgreSQL database.
                  </p>
                  {dbError.includes('******') || dbError.includes('%2A%2A%2A%2A%2A%2A') ? (
                    <div className="bg-white/80 p-3 rounded border border-red-100 font-mono text-[11px] md:text-xs text-red-700 leading-normal">
                      <strong>Reason:</strong> Your <code>DATABASE_URL</code> contains <code>******</code> (the masked/hidden password placeholder) instead of your actual database password.
                      <p className="mt-2 text-slate-800 font-sans">
                        To resolve this:
                      </p>
                      <ol className="list-decimal list-inside mt-1 space-y-1 text-slate-700 font-sans">
                        <li>Locate your database connection details or credentials.</li>
                        <li>Make sure to use your actual database password instead of the masked '******' placeholder.</li>
                        <li>Copy the complete unmasked connection string.</li>
                        <li>Open Google AI Studio, click the <strong>Settings</strong> button in the left panel, and paste the unmasked URL into <code>DATABASE_URL</code> and <code>DATABASE_URL_UNPOOLED</code>.</li>
                      </ol>
                    </div>
                  ) : (
                    <p className="bg-white/80 p-3 rounded border border-red-100 font-mono text-xs text-red-700 leading-normal">
                      <strong>Error Details:</strong> {dbError}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 font-sans italic mt-1">
                    * Fallback Active: We have automatically loaded clean default/seed values so you can still fully use, explore, and run all application screens in fallback mode!
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setDbError(null)}
                className="absolute top-3 right-3 text-red-400 hover:text-red-700 font-medium text-sm transition-colors p-1"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {currentTab === "dashboard" && (
          <DashboardView 
            quotations={quotations}
            invoices={invoices}
            leads={leads}
            customers={customers}
            reminders={reminders}
            companySettings={companySettings}
            onNavigate={setCurrentTab}
            onAddQuotation={handleAddNewQuotationTrigger}
            onAddLead={handleAddNewLeadTrigger}
          />
        )}

        {currentTab === "quotations" && (
          <QuotationsView 
            quotations={quotations}
            customers={customers}
            products={products}
            companySettings={companySettings}
            companyProfiles={companyProfiles}
            onUpdateQuotations={updateQuotations}
            onConvertToInvoice={convertQuotationToInvoice}
            onUpdateCustomers={updateCustomers}
            onUpdateProducts={updateProducts}
          />
        )}

        {currentTab === "proforma" && (
          <ProformaInvoiceView 
            invoices={invoices}
            customers={customers}
            products={products}
            companySettings={companySettings}
            companyProfiles={companyProfiles}
            onUpdateInvoices={updateInvoices}
            onUpdateCompanyProfiles={updateCompanyProfiles}
          />
        )}

        {currentTab === "challans" && (
          <ChallanView 
            challans={challans}
            customers={customers}
            companySettings={companySettings}
            companyProfiles={companyProfiles}
            onUpdateChallans={updateChallans}
          />
        )}

        {currentTab === "leads" && (
          <LeadView 
            leads={leads}
            customers={customers}
            onUpdateLeads={updateLeads}
            onNavigateToQuotation={handleAddNewQuotationTrigger}
          />
        )}

        {currentTab === "customers" && (
          <CustomerView 
            customers={customers}
            onUpdateCustomers={updateCustomers}
          />
        )}

        {currentTab === "products" && (
          <ProductView 
            products={products}
            onUpdateProducts={updateProducts}
          />
        )}

        {currentTab === "inventory" && (
          <InventoryView 
            inventory={inventoryItems}
            onUpdateInventory={updateInventory}
            customers={customers}
          />
        )}

        {currentTab === "subscriptions" && (
          <SubscriptionView 
            subscriptions={subscriptions}
            customers={customers}
            products={products}
            onUpdateSubscriptions={updateSubscriptions}
          />
        )}

        {currentTab === "reminders" && (
          <ReminderView 
            reminders={reminders}
            subscriptions={subscriptions}
            settings={companySettings}
            customers={customers}
            onUpdateReminders={updateReminders}
          />
        )}

        {currentTab === "amazonSeller" && (
          <AmazonSellerView />
        )}

        {currentTab === "catalogues" && (
          <CataloguesView 
            customers={customers}
            products={products}
            companySettings={companySettings}
          />
        )}

        {currentTab === "settings" && (
          <SettingsView 
            settings={companySettings}
            companyProfiles={companyProfiles}
            onUpdateCompanyProfiles={updateCompanyProfiles}
            customers={customers}
            products={products}
            quotations={quotations}
            invoices={invoices}
            challans={challans}
            leads={leads}
            subscriptions={subscriptions}
            reminders={reminders}
            inventory={inventoryItems}
          />
        )}
      </main>
    </div>
  );
}
