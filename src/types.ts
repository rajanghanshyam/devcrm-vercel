/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  sku: string;
  rate: number;
  gstRate: number; // e.g. 18
  hsnCode?: string;
  description: string;
  itemType?: "Product" | "Service" | "Agreement";
  mrp?: number;
  lastPurchasePrice?: number;
  sellPrice?: number;
}

export interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  gstin: string; // Indian GSTIN (15 characters)
  state: string; // e.g. "Maharashtra", "Karnataka"
  billingAddress: string;
  shippingAddress: string;
}

export interface QuotationItem {
  productId: string;
  productName: string;
  description?: string;
  hsnCode?: string;
  quantity: number;
  rate: number;
  discountPercent: number;
  gstPercent: number;
}

export type DocumentStatus = "Draft" | "Pending" | "Approved" | "Expired" | "Converted" | "Cancelled";
export type InvoiceStatus = "Paid" | "Unpaid" | "Overdue";
export type ChallanStatus = "Dispatched" | "Delivered" | "Cancelled";
export type LeadStatus = "New" | "Contacted" | "Qualified" | "Proposal Sent" | "Won" | "Lost";

export interface Quotation {
  id: string;
  quotationNo: string;
  date: string; // YYYY-MM-DD for standard input values, formatted to DD/MM/YYYY inside views
  validUntil: string;
  customerId: string;
  subject?: string;
  items: QuotationItem[];
  subtotal: number;
  discountTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  grandTotal: number;
  status: DocumentStatus;
  terms: string;
  companyId?: string; // Configured issuing company
  termsPresetId?: string; // Applied terms preset
  freight?: number;
  additionalDiscount?: number;
  customerSignature?: string;
  customerSignedAt?: string;
  revisionOfId?: string;
  originalQuoteId?: string;
  revisionNumber?: number;
  templateType?: "Standard";
}

export interface ProformaInvoice {
  id: string;
  invoiceNo: string;
  quotationNo?: string; // Optional links
  date: string;
  dueDate: string;
  customerId: string;
  subject?: string;
  items: QuotationItem[];
  subtotal: number;
  discountTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  grandTotal: number;
  status: InvoiceStatus;
  terms: string;
  companyId?: string; // Configured issuing company
  termsPresetId?: string; // Applied terms preset
  freight?: number;
  additionalDiscount?: number;
  customerSignature?: string;
  customerSignedAt?: string;
}

export interface DeliveryChallanItem {
  productName: string;
  quantity: number;
  hsnCode?: string;
  description?: string;
}

export interface DeliveryChallan {
  id: string;
  challanNo: string;
  date: string;
  customerId: string;
  items: DeliveryChallanItem[];
  vehicleNo: string;
  transporter: string;
  lrNumber: string; // Lorry Receipt Number
  dispatchAddress: string;
  status: ChallanStatus;
  notes: string;
  companyId?: string; // Configured issuing company
}

export interface Lead {
  id: string;
  customerId?: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  value: number;
  status: LeadStatus;
  source: string;
  notes: string;
  date: string;
  conversionStatus?: "Cold" | "Warm" | "Hot" | "Converted";
}

export type Role = "Admin" | "Employee";

export interface UserRights {
  dashboard?: boolean;
  quotations?: boolean;
  proforma?: boolean;
  challans?: boolean;
  leads?: boolean;
  customers?: boolean;
  products?: boolean;
  inventory?: boolean;
  subscriptions?: boolean;
  reminders?: boolean;
  settings?: boolean;
  amazonSeller?: boolean;
  catalogues?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Stored securely in real app, plain for mock
  role: Role;
  isActive: boolean;
  rights?: UserRights;
}

export interface SubscriptionPolicy {
  id: string;
  daysBeforeRenewal: number; // Send reminder X days before
  emailSubjectTemplate: string;
  emailBodyTemplate: string;
  isActive: boolean;
}

export interface Subscription {
  id: string;
  customerId: string;
  serviceName: string;
  amount: number;
  billingCycle: "Monthly" | "Quarterly" | "Half-Yearly" | "Annually";
  startDate: string;
  nextRenewalDate: string;
  status: "Active" | "Suspended" | "Cancelled" | "Expired";
  description?: string;
}


export interface Reminder {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: "Pending" | "Completed";
  priority: "Low" | "Medium" | "High";
  relatedTo?: string; // E.g. "Quotation QM/2026-27/001" or customer name
  subscriptionId?: string;
  customerId?: string;
}

export interface InventoryLog {
  id: string;
  date: string;
  type: "IN" | "OUT";
  quantity: number;
  reason: string;
  prevQty: number;
  newQty: number;
  supplierName?: string;
  customerName?: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  productName: string;
  category: string;
  quantity: number;
  minQuantity: number;
  purchaseFrom?: string;
  unitPrice: number;
  latestPurchasePrice?: number;
  lastUpdated: string;
  logs?: InventoryLog[];
}

export interface TermsPreset {
  id: string;
  title: string;
  content: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  gstin: string;
  pan: string;
  state: string;
  bankName: string;
  bankBranch: string;
  accountNo: string;
  ifsc: string;
  headerImage?: string; // Base64 Data URL or path
  footerImage?: string; // Base64 Data URL or path
  signatureImage?: string; // Base64 Data URL or path
  template?: 'minimal' | 'classic' | 'modern'; // PDF template selection
  termsPresets: TermsPreset[];
  quotationPrefix?: string;
  invoicePrefix?: string;
  challanPrefix?: string;
  nextQuotationNumber?: number;
  nextInvoiceNumber?: number;
  nextChallanNumber?: number;
  enableGst?: boolean;
  profitWithoutGst?: boolean;
  subscriptionPolicies?: SubscriptionPolicy[];
}

export interface CompanySettings {
  name: string;
  email: string;
  phone: string;
  address: string;
  gstin: string; // Indian GSTIN
  pan: string;   // Indian PAN
  state: string; // State of source (crucial for choosing SGST/CGST vs IGST)
  bankName: string;
  bankBranch: string;
  accountNo: string;
  ifsc: string;
  defaultTerms: string;
  headerImage?: string;
  footerImage?: string;
  signatureImage?: string;
  termsPresets?: TermsPreset[];
  quotationPrefix?: string;
  invoicePrefix?: string;
  challanPrefix?: string;
  nextQuotationNumber?: number;
  nextInvoiceNumber?: number;
  nextChallanNumber?: number;
  enableGst?: boolean;
  profitWithoutGst?: boolean;
  subscriptionPolicies?: SubscriptionPolicy[];
}
