◇ injected env (1) from .env // tip: ⌘ suppress logs { quiet: true }
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "company_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "state" TEXT,
    "bank_name" TEXT,
    "bank_branch" TEXT,
    "account_no" TEXT,
    "ifsc" TEXT,
    "header_image" TEXT,
    "footer_image" TEXT,
    "signature_image" TEXT,
    "template" TEXT DEFAULT 'minimal',
    "quotation_prefix" TEXT DEFAULT 'QT-',
    "invoice_prefix" TEXT DEFAULT 'INV-',
    "challan_prefix" TEXT DEFAULT 'DC-',
    "next_quotation_number" INTEGER DEFAULT 1,
    "next_invoice_number" INTEGER DEFAULT 1,
    "next_challan_number" INTEGER DEFAULT 1,
    "enable_gst" BOOLEAN DEFAULT TRUE,
    "profit_without_gst" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "gstin" TEXT,
    "state" TEXT NOT NULL,
    "billing_address" TEXT,
    "shipping_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "rate" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "gst_rate" DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    "hsn_code" TEXT,
    "description" TEXT,
    "item_type" TEXT DEFAULT 'Product',
    "mrp" DECIMAL(15,2),
    "last_purchase_price" DECIMAL(15,2),
    "sell_price" DECIMAL(15,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms_presets" (
    "id" TEXT NOT NULL,
    "company_profile_id" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terms_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_policies" (
    "id" TEXT NOT NULL,
    "company_profile_id" TEXT,
    "days_before_renewal" INTEGER NOT NULL DEFAULT 7,
    "email_subject_template" TEXT,
    "email_body_template" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "quotation_no" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "valid_until" DATE,
    "customer_id" TEXT NOT NULL,
    "subject" TEXT,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "discount_total" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "cgst_total" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "sgst_total" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "igst_total" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "grand_total" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "status" TEXT DEFAULT 'Draft',
    "terms" TEXT,
    "company_id" TEXT,
    "terms_preset_id" TEXT,
    "freight" DECIMAL(15,2) DEFAULT 0.00,
    "additional_discount" DECIMAL(15,2) DEFAULT 0.00,
    "customer_signature" TEXT,
    "customer_signed_at" TIMESTAMP(3),
    "revision_of_id" TEXT,
    "original_quote_id" TEXT,
    "revision_number" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_items" (
    "id" SERIAL NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "product_id" TEXT,
    "product_name" TEXT NOT NULL,
    "description" TEXT,
    "hsn_code" TEXT,
    "quantity" DECIMAL(15,4) NOT NULL DEFAULT 1,
    "rate" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "discount_percent" DECIMAL(5,2) DEFAULT 0.00,
    "gst_percent" DECIMAL(5,2) DEFAULT 18.00,

    CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoice_no" TEXT NOT NULL,
    "quotation_no" TEXT,
    "date" DATE NOT NULL,
    "due_date" DATE,
    "customer_id" TEXT NOT NULL,
    "subject" TEXT,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "discount_total" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "cgst_total" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "sgst_total" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "igst_total" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "grand_total" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "status" TEXT DEFAULT 'Unpaid',
    "terms" TEXT,
    "company_id" TEXT,
    "terms_preset_id" TEXT,
    "freight" DECIMAL(15,2) DEFAULT 0.00,
    "additional_discount" DECIMAL(15,2) DEFAULT 0.00,
    "customer_signature" TEXT,
    "customer_signed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" SERIAL NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "product_id" TEXT,
    "product_name" TEXT NOT NULL,
    "description" TEXT,
    "hsn_code" TEXT,
    "quantity" DECIMAL(15,4) NOT NULL DEFAULT 1,
    "rate" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "discount_percent" DECIMAL(5,2) DEFAULT 0.00,
    "gst_percent" DECIMAL(5,2) DEFAULT 18.00,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_challans" (
    "id" TEXT NOT NULL,
    "challan_no" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "customer_id" TEXT NOT NULL,
    "vehicle_no" TEXT,
    "transporter" TEXT,
    "lr_number" TEXT,
    "dispatch_address" TEXT,
    "status" TEXT DEFAULT 'Dispatched',
    "notes" TEXT,
    "company_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_challans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_challan_items" (
    "id" SERIAL NOT NULL,
    "delivery_challan_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL DEFAULT 1,
    "hsn_code" TEXT,
    "description" TEXT,

    CONSTRAINT "delivery_challan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "value" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "status" TEXT DEFAULT 'New',
    "source" TEXT,
    "notes" TEXT,
    "date" DATE,
    "conversion_status" TEXT DEFAULT 'Cold',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "billing_cycle" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "next_renewal_date" DATE NOT NULL,
    "status" TEXT DEFAULT 'Active',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT DEFAULT 'Pending',
    "priority" TEXT DEFAULT 'Medium',
    "related_to" TEXT,
    "subscription_id" TEXT,
    "customer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "category" TEXT,
    "quantity" DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
    "min_quantity" DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
    "purchase_from" TEXT,
    "unit_price" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "latest_purchase_price" DECIMAL(15,2),
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_logs" (
    "id" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "reason" TEXT,
    "prev_qty" DECIMAL(15,4) NOT NULL,
    "new_qty" DECIMAL(15,4) NOT NULL,
    "supplier_name" TEXT,
    "customer_name" TEXT,

    CONSTRAINT "inventory_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "role" TEXT,
    "password" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "rights" TEXT,
    "created_at" TEXT,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_data" (
    "key" TEXT NOT NULL,
    "data_json" TEXT,
    "updated_at" TEXT,

    CONSTRAINT "app_data_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_quotation_no_key" ON "quotations"("quotation_no");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_no_key" ON "invoices"("invoice_no");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_challans_challan_no_key" ON "delivery_challans"("challan_no");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_sku_key" ON "inventory_items"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_email_key" ON "user_profiles"("email");

-- AddForeignKey
ALTER TABLE "terms_presets" ADD CONSTRAINT "terms_presets_company_profile_id_fkey" FOREIGN KEY ("company_profile_id") REFERENCES "company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_policies" ADD CONSTRAINT "subscription_policies_company_profile_id_fkey" FOREIGN KEY ("company_profile_id") REFERENCES "company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_terms_preset_id_fkey" FOREIGN KEY ("terms_preset_id") REFERENCES "terms_presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_revision_of_id_fkey" FOREIGN KEY ("revision_of_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_original_quote_id_fkey" FOREIGN KEY ("original_quote_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quotation_no_fkey" FOREIGN KEY ("quotation_no") REFERENCES "quotations"("quotation_no") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_terms_preset_id_fkey" FOREIGN KEY ("terms_preset_id") REFERENCES "terms_presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_challans" ADD CONSTRAINT "delivery_challans_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_challans" ADD CONSTRAINT "delivery_challans_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_challan_items" ADD CONSTRAINT "delivery_challan_items_delivery_challan_id_fkey" FOREIGN KEY ("delivery_challan_id") REFERENCES "delivery_challans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_sku_fkey" FOREIGN KEY ("sku") REFERENCES "products"("sku") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

