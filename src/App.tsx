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

  // Dynamic database synchronization helper to update dynamic tables safely using direct connectivity without sync method
  const syncModelWithServer = async (payload: any) => {
    try {
      const keys = Object.keys(payload);
      for (const key of keys) {
        let model = key;
        let oldList: any[] = [];
        
        if (key === "company_profiles") {
          oldList = companyProfilesRef.current;
        } else if (key === "customers") {
          oldList = customersRef.current;
        } else if (key === "products") {
          oldList = productsRef.current;
        } else if (key === "quotations") {
          oldList = quotationsRef.current;
        } else if (key === "proforma_invoices" || key === "invoices") {
          oldList = invoicesRef.current;
          model = "invoices";
        } else if (key === "challans") {
          oldList = challansRef.current;
        } else if (key === "leads") {
          oldList = leadsRef.current;
        } else if (key === "subscriptions") {
          oldList = subscriptionsRef.current;
        } else if (key === "reminders") {
          oldList = remindersRef.current;
        } else if (key === "inventory") {
          oldList = inventoryItemsRef.current;
        }
        
        const newList = payload[key] || [];
        
        // 1. Identify deleted items (exist in oldList but missing in newList)
        const newIds = new Set(newList.map((x: any) => x.id));
        const deleted = oldList.filter((x: any) => !newIds.has(x.id));
        
        for (const item of deleted) {
          console.log(`Directly deleting ${model} with ID: ${item.id}`);
          fetch("/api/db/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model, id: item.id })
          }).catch(err => console.error(`Failed to delete ${model}:`, err));
        }
        
        // 2. Identify created/updated items (new, or changed from oldList)
        const oldMap = new Map(oldList.map((x: any) => [x.id, x]));
        for (const item of newList) {
          const oldItem = oldMap.get(item.id);
          const isNew = !oldItem;
          const isChanged = oldItem && JSON.stringify(item) !== JSON.stringify(oldItem);
          
          if (isNew || isChanged) {
            console.log(`Directly saving ${model} with ID: ${item.id} (${isNew ? 'New' : 'Updated'})`);
            fetch("/api/save-entry", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ model, data: item })
            }).catch(err => console.error(`Failed to save ${model}:`, err));
          }
        }
      }
    } catch (err) {
      console.error("Failed to directly sync database entry:", err);
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

  // Database persistence helper wrappers using transaction-safe batch updates
  const updateCompanyProfiles = (updated: CompanyProfile[]) => {
    setCompanyProfiles(updated);
    companyProfilesRef.current = updated;
    syncModelWithServer({ company_profiles: updated });
  };

  const updateCustomers = (updated: Customer[]) => {
    setCustomers(updated);
    customersRef.current = updated;
    syncModelWithServer({ customers: updated });
  };

  const updateProducts = (updated: Product[]) => {
    setProducts(updated);
    productsRef.current = updated;
    syncModelWithServer({ products: updated });
  };

  const updateQuotations = (updated: Quotation[]) => {
    setQuotations(updated);
    quotationsRef.current = updated;
    syncModelWithServer({ quotations: updated });
  };

  const updateInvoices = (updated: ProformaInvoice[]) => {
    setInvoices(updated);
    invoicesRef.current = updated;
    syncModelWithServer({ proforma_invoices: updated });
  };

  const updateChallans = (updated: DeliveryChallan[]) => {
    setChallans(updated);
    challansRef.current = updated;
    syncModelWithServer({ challans: updated });
  };

  const updateLeads = (updated: Lead[]) => {
    setLeads(updated);
    leadsRef.current = updated;
    syncModelWithServer({ leads: updated });
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

    setReminders(newReminders);
    remindersRef.current = newReminders;

    syncModelWithServer({
      subscriptions: checkedSubs,
      reminders: newReminders
    });
  };

  const updateReminders = (updated: Reminder[]) => {
    setReminders(updated);
    remindersRef.current = updated;
    syncModelWithServer({ reminders: updated });
  };
  
  const updateInventory = (updated: InventoryItem[]) => {
    setInventoryItems(updated);
    inventoryItemsRef.current = updated;
    syncModelWithServer({ inventory: updated });
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
                  {dbError.includes('password') || dbError.toLowerCase().includes('password authentication failed') || dbError.includes('neondb_owner') ? (
                    <div className="bg-white/80 p-3 rounded border border-red-100 font-sans text-xs text-red-800 leading-normal">
                      <strong className="text-red-900 font-semibold block mb-1">Reason: Database password authentication failed</strong>
                      <p>This indicates that the password provided in your <code>DATABASE_URL</code> or <code>DATABASE_URL_UNPOOLED</code> is incorrect or has expired.</p>
                      <p className="mt-2 text-slate-800 font-semibold">To resolve this:</p>
                      <ol className="list-decimal list-inside mt-1 space-y-1 text-slate-700">
                        <li>Go to your <strong>Neon console</strong> (or PostgreSQL provider dashboard) and copy your correct connection string.</li>
                        <li>Open Google AI Studio, click <strong>Settings</strong> (gear icon) in the sidebar/header, then choose <strong>Environment Variables</strong>.</li>
                        <li>Locate <code>DATABASE_URL</code> and <code>DATABASE_URL_UNPOOLED</code> and update them with the correct password. Ensure no leading or trailing spaces are copied.</li>
                      </ol>
                    </div>
                  ) : dbError.includes('******') || dbError.includes('%2A%2A%2A%2A%2A%2A') ? (
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
                    * Direct Connection Required: Offline sandbox simulation and local fallbacks have been disabled. Connecting a valid database is required for full application use.
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
