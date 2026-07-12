/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Customer, Quotation, ProformaInvoice, DeliveryChallan, Lead, Subscription, Reminder, CompanySettings, CompanyProfile, InventoryItem } from "./types";

// Professional format for Indian Currency (INR): 
// Tries to format as e.g. ₹ 12,34,567.89 instead of standard formatting (using Lakhs and Crores placement)
export function formatINR(amount: number): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    return "₹" + amount.toFixed(2);
  }
}

// Convert YYYY-MM-DD or any format to DD/MM/YYYY
export function formatDate(dateString: string | Date | undefined | null): string {
  if (!dateString) return "";
  
  // If it's already a Date object
  if (dateString instanceof Date) {
    if (!isNaN(dateString.getTime())) {
      const dd = String(dateString.getDate()).padStart(2, '0');
      const mm = String(dateString.getMonth() + 1).padStart(2, '0');
      const yyyy = dateString.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
    return "";
  }

  // Handle standard YYYY-MM-DD prefix if it's a string
  const str = String(dateString).trim();
  
  // Regex to match exact YYYY-MM-DD at the beginning
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }

  // Regex to match exact DD/MM/YYYY
  const standardMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (standardMatch) {
    const [, day, month, year] = standardMatch;
    return `${day}/${month}/${year}`;
  }

  // Try creating a standard JS Date fallback
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
  } catch (e) {
    // Ignore
  }
  return str;
}

// Format date back to input-friendly YYYY-MM-DD
export function toInputDate(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return "";
  
  // If Date object
  if (dateStr instanceof Date) {
    if (!isNaN(dateStr.getTime())) {
      const yyyy = dateStr.getFullYear();
      const mm = String(dateStr.getMonth() + 1).padStart(2, '0');
      const dd = String(dateStr.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return "";
  }

  const str = String(dateStr).trim();

  // Try to find YYYY-MM-DD at the start
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month}-${day}`;
  }

  // Try to find DD/MM/YYYY
  const standardMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (standardMatch) {
    const [, day, month, year] = standardMatch;
    return `${year}-${month}-${day}`;
  }

  // Try JS Date parsing
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  } catch (e) {
    // Ignore
  }

  return str;
}

// Helper to calculate SGST, CGST, and IGST for invoice totals based on customer vs company state
export function calculateTaxTotals(
  items: Array<{ rate: number; quantity: number; discountPercent: number; gstPercent: number }>,
  customerState: string,
  companyState: string,
  additionalDiscount: number = 0,
  freight: number = 0,
  enableGst: boolean = true
) {
  let subtotal = 0;
  let discountTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  const isIntrastate = String(customerState || "").trim().toLowerCase() === String(companyState || "").trim().toLowerCase();

  const numAdditionalDiscount = Number(additionalDiscount) || 0;
  const numFreight = Number(freight) || 0;

  (items || []).forEach((item) => {
    const rate = Number(item.rate) || 0;
    const quantity = Number(item.quantity) || 0;
    const discountPercent = Number(item.discountPercent) || 0;
    const gstPercent = Number(item.gstPercent) || 0;

    const baseVal = rate * quantity;
    const discountVal = (baseVal * discountPercent) / 100;
    const taxableVal = baseVal - discountVal;

    subtotal += baseVal;
    discountTotal += discountVal;

    const gstPercentToUse = enableGst !== false ? gstPercent : 0;
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
}

// Seed Initial Mock States - high fidelity, beautiful local Indian business scenario
// Generic pristine starting configurations
export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  name: "My Business",
  email: "admin@mycompany.com",
  phone: "+91 99999 99999",
  address: "123 Business Lane, Suite A",
  gstin: "27AADCA8945B1ZC",
  pan: "AADCA8945B",
  state: "Maharashtra",
  bankName: "Example Bank",
  bankBranch: "Main Branch",
  accountNo: "000000000000",
  ifsc: "EXAMP000001",
  defaultTerms: "1. Quotation is valid for 30 days.\n2. 50% Advance along with Purchase Order, 50% on Delivery.",
  quotationPrefix: "QTN",
  invoicePrefix: "PI",
  challanPrefix: "DC",
  nextQuotationNumber: 1,
  nextInvoiceNumber: 1,
  nextChallanNumber: 1,
  termsPresets: [
    {
      id: "preset_default_1",
      title: "Standard Validation Terms",
      content: "1. Quotation is valid for 30 days.\n2. 50% Advance along with Purchase Order, 50% on Delivery."
    }
  ]
};

export const SEED_COMPANY_PROFILES: CompanyProfile[] = [
  {
    id: "comp_default",
    name: "My Business",
    email: "admin@mycompany.com",
    phone: "+91 99999 99999",
    address: "123 Business Lane, Suite A",
    gstin: "27AADCA8945B1ZC",
    pan: "AADCA8945B",
    state: "Maharashtra",
    bankName: "Example Bank",
    bankBranch: "Main Branch",
    accountNo: "000000000000",
    ifsc: "EXAMP000001",
    headerImage: "",
    footerImage: "",
    quotationPrefix: "QTN",
    invoicePrefix: "PI",
    challanPrefix: "DC",
    nextQuotationNumber: 1,
    nextInvoiceNumber: 1,
    nextChallanNumber: 1,
    termsPresets: [
      {
        id: "preset_default_1",
        title: "Standard Validation Terms",
        content: "1. Quotation is valid for 30 days.\n2. 50% Advance along with Purchase Order, 50% on Delivery."
      }
    ]
  }
];

export const SEED_CUSTOMERS: Customer[] = [
  {
    id: "cust_acme",
    name: "John Doe",
    company: "Acme Industrial Corporation",
    email: "johndoe@acmeind.com",
    phone: "+91 98765 43210",
    gstin: "27AAACA1234A1Z1",
    state: "Maharashtra",
    billingAddress: "405-408, Pride Icon, Hadapsar, Pune, Maharashtra, 411028",
    shippingAddress: "Plot No. 12, MIDC Industrial Area, Bhosari, Pune, Maharashtra, 411026"
  },
  {
    id: "cust_delta",
    name: "Sarah Jenkins",
    company: "Delta Tech Solutions",
    email: "billing@deltatech.in",
    phone: "+91 91234 56789",
    gstin: "29BBBCB5678B2Z2",
    state: "Karnataka",
    billingAddress: "8th Floor, Brigade Tech Park, Whitefield, Bangalore, Karnataka, 560066",
    shippingAddress: "8th Floor, Brigade Tech Park, Whitefield, Bangalore, Karnataka, 560066"
  }
];

export const SEED_PRODUCTS: Product[] = [
  {
    id: "prod_server",
    name: "High Performance Cloud Server Deployment",
    sku: "CLD-SRV-HP1",
    rate: 15000,
    gstRate: 18,
    hsnCode: "997331",
    description: "Setup and deployment of enterprise-grade cloud servers with automatic load balancing.",
    itemType: "Product"
  },
  {
    id: "prod_maintenance",
    name: "Annual IT Support & Maintenance Contract",
    sku: "IT-AMC-001",
    rate: 45000,
    gstRate: 18,
    hsnCode: "998713",
    description: "Annual maintenance, quarterly software updates, and 24/7 priority emergency support.",
    itemType: "Service"
  },
  {
    id: "prod_consulting",
    name: "Custom Software Development Consulting",
    sku: "SOFT-DEV-CON",
    rate: 5000,
    gstRate: 18,
    hsnCode: "998314",
    description: "Hourly consulting and system analysis for modern full-stack web applications.",
    itemType: "Service"
  }
];

export const SEED_QUOTATIONS: Quotation[] = [
  {
    id: "qtn_001",
    quotationNo: "QTN-2026-27-001",
    date: "2026-07-10",
    validUntil: "2026-08-10",
    customerId: "cust_acme",
    subject: "Quotation for High Performance Cloud Server Deployment",
    items: [
      {
        productId: "prod_server",
        productName: "High Performance Cloud Server Deployment",
        description: "Setup and deployment of enterprise-grade cloud servers with automatic load balancing.",
        hsnCode: "997331",
        quantity: 2,
        rate: 15000,
        discountPercent: 5,
        gstPercent: 18
      }
    ],
    subtotal: 30000,
    discountTotal: 1500,
    cgstTotal: 2565,
    sgstTotal: 2565,
    igstTotal: 0,
    grandTotal: 33630,
    status: "Pending",
    terms: "1. Quotation is valid for 30 days.\n2. 50% Advance along with Purchase Order, 50% on Delivery.",
    companyId: "comp_default",
    termsPresetId: "preset_default_1"
  }
];

export const SEED_PROFORMA_INVOICES: ProformaInvoice[] = [
  {
    id: "inv_001",
    invoiceNo: "PI-2026-27-001",
    quotationNo: "QTN-2026-27-001",
    date: "2026-07-11",
    dueDate: "2026-07-25",
    customerId: "cust_acme",
    subject: "Proforma Invoice for High Performance Cloud Server Deployment",
    items: [
      {
        productId: "prod_server",
        productName: "High Performance Cloud Server Deployment",
        description: "Setup and deployment of enterprise-grade cloud servers with automatic load balancing.",
        hsnCode: "997331",
        quantity: 2,
        rate: 15000,
        discountPercent: 5,
        gstPercent: 18
      }
    ],
    subtotal: 30000,
    discountTotal: 1500,
    cgstTotal: 2565,
    sgstTotal: 2565,
    igstTotal: 0,
    grandTotal: 33630,
    status: "Unpaid",
    terms: "1. Quotation is valid for 30 days.\n2. 50% Advance along with Purchase Order, 50% on Delivery.",
    companyId: "comp_default",
    termsPresetId: "preset_default_1"
  }
];

export const SEED_CHALLANS: DeliveryChallan[] = [
  {
    id: "dc_001",
    challanNo: "DC-2026-27-001",
    date: "2026-07-12",
    customerId: "cust_acme",
    items: [
      {
        productName: "High Performance Cloud Server Deployment Router Node",
        quantity: 2,
        hsnCode: "84713010",
        description: "Physical gateway router nodes shipped for server communication integration."
      }
    ],
    vehicleNo: "MH-12-PQ-9999",
    transporter: "FastTrack Logistics",
    lrNumber: "LR-987654",
    dispatchAddress: "123 Business Lane, Suite A, Pune",
    status: "Dispatched",
    notes: "Please handle router nodes with care. Fragile electronic equipment.",
    companyId: "comp_default"
  }
];

export const SEED_LEADS: Lead[] = [
  {
    id: "lead_001",
    customerId: "cust_delta",
    name: "Sarah Jenkins",
    company: "Delta Tech Solutions",
    email: "billing@deltatech.in",
    phone: "+91 91234 56789",
    value: 45000,
    status: "New",
    source: "Website Inquiry",
    notes: "Interested in high-availability Cloud Server configurations and annual server maintenance contracts.",
    date: "2026-07-12",
    conversionStatus: "Warm"
  }
];

export const SEED_SUBSCRIPTIONS: Subscription[] = [
  {
    id: "sub_001",
    customerId: "cust_acme",
    serviceName: "Managed Cloud Server SLA Subscription",
    amount: 15000,
    billingCycle: "Monthly",
    startDate: "2026-07-12",
    nextRenewalDate: "2026-08-12",
    status: "Active",
    description: "Comprehensive active service contract covering platform performance metrics and regular system tune-ups."
  }
];

export const SEED_REMINDERS: Reminder[] = [
  {
    id: "rem_001",
    title: "Follow up on proposal",
    description: "Call Sarah Jenkins to discuss the Delta Tech Solutions proposal terms and SLA criteria.",
    dueDate: "2026-07-15",
    status: "Pending",
    priority: "High",
    relatedTo: "Sarah Jenkins (Delta Tech)",
    customerId: "cust_delta"
  }
];

export const SEED_INVENTORY: InventoryItem[] = [
  {
    id: "inv_item_001",
    sku: "CLD-SRV-HP1",
    productName: "High Performance Cloud Server Deployment Node",
    category: "Servers",
    quantity: 15,
    minQuantity: 3,
    purchaseFrom: "Tech Hardware Solutions Ltd",
    unitPrice: 12000,
    latestPurchasePrice: 12000,
    lastUpdated: "2026-07-12",
    logs: [
      {
        id: "log_001",
        date: "2026-07-12",
        type: "IN",
        quantity: 15,
        reason: "Initial inventory setup of high-performance router nodes",
        prevQty: 0,
        newQty: 15,
        supplierName: "Tech Hardware Solutions Ltd"
      }
    ]
  }
];

// Persistent state management has been completely transitioned to live Neon PostgreSQL direct connectivity.

// Utility to export all application state to a downloadable JSON file
export function exportAppState(data: {
  companyProfiles?: any[];
  customers?: any[];
  products?: any[];
  quotations?: any[];
  invoices?: any[];
  challans?: any[];
  leads?: any[];
  subscriptions?: any[];
  reminders?: any[];
  inventory?: any[];
}) {
  const allData = {
    companyProfiles: JSON.stringify(data.companyProfiles || []),
    customers: JSON.stringify(data.customers || []),
    products: JSON.stringify(data.products || []),
    quotations: JSON.stringify(data.quotations || []),
    proformaInvoices: JSON.stringify(data.invoices || []),
    challans: JSON.stringify(data.challans || []),
    leads: JSON.stringify(data.leads || []),
    subscriptions: JSON.stringify(data.subscriptions || []),
    reminders: JSON.stringify(data.reminders || []),
    inventory: JSON.stringify(data.inventory || [])
  };

  const fileContent = JSON.stringify(allData, null, 2);
  const blob = new Blob([fileContent], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `QuotationMaker_Backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Utility to import/restore application state from JSON file text and sync with the database server
export async function importAppState(
  rawText: string,
  defaults: {
    companyProfiles?: any[];
    customers?: any[];
    products?: any[];
    quotations?: any[];
    invoices?: any[];
    challans?: any[];
    leads?: any[];
    subscriptions?: any[];
    reminders?: any[];
    inventory?: any[];
  }
): Promise<any> {
  const data = JSON.parse(rawText);
  const payload = {
    company_profiles: data.companyProfiles ? JSON.parse(data.companyProfiles) : (defaults.companyProfiles || []),
    customers: data.customers ? JSON.parse(data.customers) : (defaults.customers || []),
    products: data.products ? JSON.parse(data.products) : (defaults.products || []),
    quotations: data.quotations ? JSON.parse(data.quotations) : (defaults.quotations || []),
    proforma_invoices: data.proformaInvoices ? JSON.parse(data.proformaInvoices) : (defaults.invoices || []),
    challans: data.challans ? JSON.parse(data.challans) : (defaults.challans || []),
    leads: data.leads ? JSON.parse(data.leads) : (defaults.leads || []),
    subscriptions: data.subscriptions ? JSON.parse(data.subscriptions) : (defaults.subscriptions || []),
    reminders: data.reminders ? JSON.parse(data.reminders) : (defaults.reminders || []),
    inventory: data.inventory ? JSON.parse(data.inventory) : (defaults.inventory || [])
  };

  const res = await fetch("/api/db/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error("Server synchronization failed during restore.");
  }

  const dataRes = await res.json();
  if (!dataRes.success) {
    throw new Error(dataRes.message || "Failed to synchronize restored state with live database.");
  }

  return payload;
}

