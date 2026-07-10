/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
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
    nextChallanNumber: activeProfile.nextChallanNumber
  };

  // Sync helper to write complete state payload to server
  const syncToServer = (payloadOverrides?: any) => {
    const payload = {
      company_profiles: payloadOverrides?.company_profiles || companyProfiles,
      customers: payloadOverrides?.customers || customers,
      products: payloadOverrides?.products || products,
      quotations: payloadOverrides?.quotations || quotations,
      proforma_invoices: payloadOverrides?.invoices || invoices,
      challans: payloadOverrides?.challans || challans,
      leads: payloadOverrides?.leads || leads,
      subscriptions: payloadOverrides?.subscriptions || subscriptions,
      reminders: payloadOverrides?.reminders || reminders,
      inventory: payloadOverrides?.inventory || inventoryItems
    };

    fetch("/api/db/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          console.error("Failsafe saver file persistence returned failed status:", data.error);
        }
      })
      .catch((err) => {
        console.error("Failsafe background saver network issue:", err);
      });
  };

  // Initialize and Seed Storage once on mount
  useEffect(() => {
    // 1. Fetch from server-side filesystem sync
    fetch("/api/db/get")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && resData.data && Object.keys(resData.data).length > 0) {
          const s = resData.data;
          if (s.company_profiles) setCompanyProfiles(s.company_profiles);
          if (s.customers) setCustomers(s.customers);
          if (s.products) setProducts(s.products);
          if (s.quotations) setQuotations(s.quotations);
          if (s.proforma_invoices) setInvoices(s.proforma_invoices);
          if (s.challans) setChallans(s.challans);
          if (s.leads) setLeads(s.leads);
          if (s.subscriptions) setSubscriptions(s.subscriptions);
          if (s.reminders) setReminders(s.reminders);
          if (s.inventory) setInventoryItems(s.inventory);
        } else {
          // Fallback check and seed standard local defaults
          setCompanyProfiles(SEED_COMPANY_PROFILES);
          setCustomers(SEED_CUSTOMERS);
          setProducts(SEED_PRODUCTS);
          setQuotations(SEED_QUOTATIONS);
          setInvoices(SEED_PROFORMA_INVOICES);
          setChallans(SEED_CHALLANS);
          setLeads(SEED_LEADS);
          setSubscriptions(SEED_SUBSCRIPTIONS);
          setReminders(SEED_REMINDERS);
          setInventoryItems(SEED_INVENTORY);
          
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
      })
      .catch((err) => {
        console.warn("Express server persist load unavailable, matching localstorage fallback:", err);
      });
  }, []);

  // Update localStorage and filesystem helper wrappers
  const updateCompanyProfiles = (updated: CompanyProfile[]) => {
    setCompanyProfiles(updated);
    syncToServer({ company_profiles: updated });
  };

  const updateCustomers = (updated: Customer[]) => {
    setCustomers(updated);
    syncToServer({ customers: updated });
  };

  const updateProducts = (updated: Product[]) => {
    setProducts(updated);
    syncToServer({ products: updated });
  };

  const updateQuotations = (updated: Quotation[]) => {
    setQuotations(updated);
    syncToServer({ quotations: updated });
  };

  const updateInvoices = (updated: ProformaInvoice[]) => {
    setInvoices(updated);
    syncToServer({ invoices: updated });
  };

  const updateChallans = (updated: DeliveryChallan[]) => {
    setChallans(updated);
    syncToServer({ challans: updated });
  };

  const updateLeads = (updated: Lead[]) => {
    setLeads(updated);
    syncToServer({ leads: updated });
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

    let newReminders = [...reminders];

    checkedSubs.forEach(sub => {
       // Clear ALL existing reminders for this sub to prevent stale/duplicate entries
       newReminders = newReminders.filter(r => r.subscriptionId !== sub.id);
       
       const expDate = toInputDate(sub.nextRenewalDate);
       const isExpired = expDate && expDate < todayStr;

       // If the subscription is Active and not expired and next renewal date is set:
       if (sub.status === "Active" && sub.nextRenewalDate && !isExpired) {
          const customer = customers.find(c => c.id === sub.customerId);
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
    
    // Write full sync state
    syncToServer({ subscriptions: checkedSubs, reminders: newReminders });
  };

  const updateReminders = (updated: Reminder[]) => {
    setReminders(updated);
    syncToServer({ reminders: updated });
  };
  
  const updateInventory = (updated: InventoryItem[]) => {
    setInventoryItems(updated);
    syncToServer({ inventory: updated });
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

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-900">
      {/* Sidebar Component with perfect visual copying mapping */}
      <Sidebar 
        currentTab={currentTab} 
        onTabChange={setCurrentTab}
        userName="Administrator"
        userEmail="admin@example.com"
        onLogout={() => {}}
        user={null}
      />

      {/* Main Content scroll window */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-screen custom-scrollbar">
        {currentTab === "dashboard" && (
          <DashboardView 
            quotations={quotations}
            invoices={invoices}
            leads={leads}
            customers={customers}
            reminders={reminders}
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
