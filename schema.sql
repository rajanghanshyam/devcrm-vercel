-- ============================================================================
-- POSTGRESQL DATABASE SCHEMA CREATION SCRIPT
-- ============================================================================
-- Designed for enterprise-level consistency with clean relational design,
-- appropriate data types, indexing for query optimization, and solid foreign keys.
-- ============================================================================

-- Enable UUID extension if UUIDs are used for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Table: CompanyProfiles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_profiles (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    gstin VARCHAR(15), -- Indian GSTIN format
    pan VARCHAR(10),   -- Indian PAN format
    state VARCHAR(100),
    bank_name VARCHAR(150),
    bank_branch VARCHAR(150),
    account_no VARCHAR(50),
    ifsc VARCHAR(20),
    header_image TEXT,     -- Stored as base64 or URL
    footer_image TEXT,     -- Stored as base64 or URL
    signature_image TEXT,  -- Stored as base64 or URL
    template VARCHAR(50) DEFAULT 'minimal' CHECK (template IN ('minimal', 'classic', 'modern')),
    quotation_prefix VARCHAR(50) DEFAULT 'QT-',
    invoice_prefix VARCHAR(50) DEFAULT 'INV-',
    challan_prefix VARCHAR(50) DEFAULT 'DC-',
    next_quotation_number INT DEFAULT 1,
    next_invoice_number INT DEFAULT 1,
    next_challan_number INT DEFAULT 1,
    enable_gst BOOLEAN DEFAULT TRUE,
    profit_without_gst BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. Table: Customers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    gstin VARCHAR(15),
    state VARCHAR(100) NOT NULL,
    billing_address TEXT,
    shipping_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. Table: Products
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    rate DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 18.00, -- Default GST rate in % (e.g. 18.00)
    hsn_code VARCHAR(50),
    description TEXT,
    item_type VARCHAR(50) DEFAULT 'Product' CHECK (item_type IN ('Product', 'Service', 'Agreement')),
    mrp DECIMAL(15, 2),
    last_purchase_price DECIMAL(15, 2),
    sell_price DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. Table: TermsPresets
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS terms_presets (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    company_profile_id VARCHAR(100) REFERENCES company_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 5. Table: SubscriptionPolicies
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_policies (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    company_profile_id VARCHAR(100) REFERENCES company_profiles(id) ON DELETE CASCADE,
    days_before_renewal INT NOT NULL DEFAULT 7,
    email_subject_template TEXT,
    email_body_template TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 6. Table: Quotations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quotations (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    quotation_no VARCHAR(100) UNIQUE NOT NULL,
    date DATE NOT NULL,
    valid_until DATE,
    customer_id VARCHAR(100) NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    subject TEXT,
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    discount_total DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    cgst_total DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    sgst_total DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    igst_total DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    grand_total DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending', 'Approved', 'Expired', 'Converted', 'Cancelled')),
    terms TEXT,
    company_id VARCHAR(100) REFERENCES company_profiles(id) ON DELETE SET NULL,
    terms_preset_id VARCHAR(100) REFERENCES terms_presets(id) ON DELETE SET NULL,
    freight DECIMAL(15, 2) DEFAULT 0.00,
    additional_discount DECIMAL(15, 2) DEFAULT 0.00,
    customer_signature TEXT, -- Stored as Base64/image reference
    customer_signed_at TIMESTAMP WITH TIME ZONE,
    revision_of_id VARCHAR(100) REFERENCES quotations(id) ON DELETE SET NULL,
    original_quote_id VARCHAR(100) REFERENCES quotations(id) ON DELETE SET NULL,
    revision_number INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 7. Table: QuotationItems
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quotation_items (
    id SERIAL PRIMARY KEY,
    quotation_id VARCHAR(100) NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    product_id VARCHAR(100) REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    hsn_code VARCHAR(50),
    quantity DECIMAL(15, 4) NOT NULL DEFAULT 1,
    rate DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    discount_percent DECIMAL(5, 2) DEFAULT 0.00,
    gst_percent DECIMAL(5, 2) DEFAULT 18.00
);

-- ----------------------------------------------------------------------------
-- 8. Table: Invoices
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    invoice_no VARCHAR(100) UNIQUE NOT NULL,
    quotation_no VARCHAR(100) REFERENCES quotations(quotation_no) ON DELETE SET NULL,
    date DATE NOT NULL,
    due_date DATE,
    customer_id VARCHAR(100) NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    subject TEXT,
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    discount_total DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    cgst_total DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    sgst_total DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    igst_total DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    grand_total DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Unpaid' CHECK (status IN ('Paid', 'Unpaid', 'Overdue')),
    terms TEXT,
    company_id VARCHAR(100) REFERENCES company_profiles(id) ON DELETE SET NULL,
    terms_preset_id VARCHAR(100) REFERENCES terms_presets(id) ON DELETE SET NULL,
    freight DECIMAL(15, 2) DEFAULT 0.00,
    additional_discount DECIMAL(15, 2) DEFAULT 0.00,
    customer_signature TEXT,
    customer_signed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 9. Table: InvoiceItems
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id VARCHAR(100) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id VARCHAR(100) REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    hsn_code VARCHAR(50),
    quantity DECIMAL(15, 4) NOT NULL DEFAULT 1,
    rate DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    discount_percent DECIMAL(5, 2) DEFAULT 0.00,
    gst_percent DECIMAL(5, 2) DEFAULT 18.00
);

-- ----------------------------------------------------------------------------
-- 10. Table: DeliveryChallans
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delivery_challans (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    challan_no VARCHAR(100) UNIQUE NOT NULL,
    date DATE NOT NULL,
    customer_id VARCHAR(100) NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    vehicle_no VARCHAR(100),
    transporter VARCHAR(255),
    lr_number VARCHAR(100), -- Lorry Receipt number
    dispatch_address TEXT,
    status VARCHAR(50) DEFAULT 'Dispatched' CHECK (status IN ('Dispatched', 'Delivered', 'Cancelled')),
    notes TEXT,
    company_id VARCHAR(100) REFERENCES company_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 11. Table: DeliveryChallanItems
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delivery_challan_items (
    id SERIAL PRIMARY KEY,
    delivery_challan_id VARCHAR(100) NOT NULL REFERENCES delivery_challans(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(15, 4) NOT NULL DEFAULT 1,
    hsn_code VARCHAR(50),
    description TEXT
);

-- ----------------------------------------------------------------------------
-- 12. Table: Leads
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    customer_id VARCHAR(100) REFERENCES customers(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    value DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Qualified', 'Proposal Sent', 'Won', 'Lost')),
    source VARCHAR(255),
    notes TEXT,
    date DATE,
    conversion_status VARCHAR(50) DEFAULT 'Cold' CHECK (conversion_status IN ('Cold', 'Warm', 'Hot', 'Converted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 13. Table: Subscriptions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    customer_id VARCHAR(100) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    service_name VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    billing_cycle VARCHAR(50) NOT NULL CHECK (billing_cycle IN ('Monthly', 'Quarterly', 'Half-Yearly', 'Annually')),
    start_date DATE NOT NULL,
    next_renewal_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Cancelled', 'Expired')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 14. Table: Reminders
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reminders (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed')),
    priority VARCHAR(50) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    related_to VARCHAR(255), -- References documents/customers (e.g. "Quotation QM/2026-27/001")
    subscription_id VARCHAR(100) REFERENCES subscriptions(id) ON DELETE CASCADE,
    customer_id VARCHAR(100) REFERENCES customers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 15. Table: InventoryItems
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_items (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    sku VARCHAR(100) UNIQUE NOT NULL REFERENCES products(sku) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(150),
    quantity DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    min_quantity DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    purchase_from VARCHAR(255),
    unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    latest_purchase_price DECIMAL(15, 2),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 16. Table: InventoryLogs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_logs (
    id VARCHAR(100) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    inventory_item_id VARCHAR(100) NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(10) NOT NULL CHECK (type IN ('IN', 'OUT')),
    quantity DECIMAL(15, 4) NOT NULL,
    reason TEXT,
    prev_qty DECIMAL(15, 4) NOT NULL,
    new_qty DECIMAL(15, 4) NOT NULL,
    supplier_name VARCHAR(255),
    customer_name VARCHAR(255)
);

-- ============================================================================
-- Indexes for Optimal Performance (Foreign Keys and Frequently Queried Columns)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_terms_presets_company ON terms_presets(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_quotations_no ON quotations(quotation_no);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quote ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_no ON invoices(invoice_no);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_delivery_challans_no ON delivery_challans(challan_no);
CREATE INDEX IF NOT EXISTS idx_delivery_challans_customer ON delivery_challans(customer_id);
CREATE INDEX IF NOT EXISTS idx_challan_items_challan ON delivery_challan_items(delivery_challan_id);
CREATE INDEX IF NOT EXISTS idx_leads_customer ON leads(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_reminders_customer ON reminders(customer_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_item ON inventory_logs(inventory_item_id);

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
