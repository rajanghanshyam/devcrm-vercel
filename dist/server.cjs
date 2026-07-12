var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  default: () => server_default,
  formatDbErrorMessage: () => formatDbErrorMessage,
  isDbConnectionOrSchemaError: () => isDbConnectionOrSchemaError
});
module.exports = __toCommonJS(server_exports);

// src/env.ts
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
if (!process.env.DATABASE_URL && !process.env.VERCEL) {
  process.env.DATABASE_URL = "postgresql://dummy:dummy@localhost:5432/dummy";
}

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_nodemailer = __toESM(require("nodemailer"), 1);
var import_dotenv2 = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");

// src/db.ts
var import_pg = __toESM(require("pg"), 1);
import_pg.default.types.setTypeParser(1700, function(val) {
  return parseFloat(val);
});
var _pool = null;
function getPoolInstance() {
  let url = process.env.DATABASE_URL || "";
  let unpooledUrl = process.env.DATABASE_URL_UNPOOLED || "";
  let selectedUrl = "";
  const isMasked = (str) => str.includes("******") || str.includes("%2A%2A%2A%2A%2A%2A");
  if (url && !isMasked(url)) {
    selectedUrl = url;
  } else if (unpooledUrl && !isMasked(unpooledUrl)) {
    selectedUrl = unpooledUrl;
  } else if (url) {
    selectedUrl = url;
  } else if (unpooledUrl) {
    selectedUrl = unpooledUrl;
  }
  if (!selectedUrl) {
    throw new Error("DB_NOT_CONFIGURED");
  }
  if (isMasked(selectedUrl)) {
    throw new Error("DB_MASKED");
  }
  if (!_pool) {
    const config = {
      connectionString: selectedUrl
    };
    if (selectedUrl.includes("sslmode=") || selectedUrl.includes("ssl=true") || selectedUrl.includes("neon.tech")) {
      config.ssl = {
        rejectUnauthorized: false
      };
    }
    try {
      _pool = new import_pg.default.Pool(config);
    } catch (e) {
      console.error("Failed to initialize pg Pool:", e);
      throw new Error(`Failed to initialize connection pool: ${e.message}`);
    }
  }
  return _pool;
}
var pool = new Proxy({}, {
  get(target, prop) {
    const instance = getPoolInstance();
    const value = instance[prop];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  }
});
var modelToTable = {
  companyProfiles: "company_profiles",
  customers: "customers",
  products: "products",
  termsPresets: "terms_presets",
  subscriptionPolicies: "subscription_policies",
  quotations: "quotations",
  quotationItems: "quotation_items",
  invoices: "invoices",
  invoiceItems: "invoice_items",
  deliveryChallans: "delivery_challans",
  deliveryChallanItems: "delivery_challan_items",
  leads: "leads",
  subscriptions: "subscriptions",
  reminders: "reminders",
  inventoryItems: "inventory_items",
  inventoryLogs: "inventory_logs",
  appData: "app_data",
  userProfiles: "user_profiles"
};
var relationMap = {
  termsPresets: { table: "terms_presets", fk: "company_profile_id", key: "termsPresets" },
  quotationItems: { table: "quotation_items", fk: "quotation_id", key: "quotationItems" },
  invoiceItems: { table: "invoice_items", fk: "invoice_id", key: "invoiceItems" },
  deliveryChallanItems: { table: "delivery_challan_items", fk: "delivery_challan_id", key: "deliveryChallanItems" },
  inventoryLogs: { table: "inventory_logs", fk: "inventory_item_id", key: "inventoryLogs" }
};
function toSnakeCase(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
function mapKeysToSnake(obj) {
  if (obj === null || obj === void 0) return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(mapKeysToSnake);
  if (typeof obj !== "object") return obj;
  const result = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value === void 0) continue;
    result[toSnakeCase(key)] = mapKeysToSnake(value);
  }
  return result;
}
function mapKeysToCamel(obj) {
  if (obj === null || obj === void 0) return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(mapKeysToCamel);
  if (typeof obj !== "object") return obj;
  const result = {};
  for (const key of Object.keys(obj)) {
    result[toCamelCase(key)] = mapKeysToCamel(obj[key]);
  }
  return result;
}
function buildWhere(where) {
  if (!where || Object.keys(where).length === 0) {
    return { sql: "", values: [] };
  }
  const keys = Object.keys(where);
  const conditions = [];
  const values = [];
  let valIdx = 1;
  for (const key of keys) {
    const val = where[key];
    const column = toSnakeCase(key);
    if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      if ("in" in val) {
        conditions.push(`"${column}" = ANY($${valIdx})`);
        values.push(val.in);
        valIdx++;
      } else {
        conditions.push(`"${column}" = $${valIdx}`);
        values.push(val);
        valIdx++;
      }
    } else {
      conditions.push(`"${column}" = $${valIdx}`);
      values.push(val);
      valIdx++;
    }
  }
  return {
    sql: `WHERE ${conditions.join(" AND ")}`,
    values
  };
}
async function findMany(tableName, args, client) {
  let { sql: whereSql, values: whereValues } = buildWhere(args?.where);
  let orderSql = "";
  if (args?.orderBy) {
    const orderObj = Array.isArray(args.orderBy) ? args.orderBy[0] : args.orderBy;
    if (orderObj) {
      const keys = Object.keys(orderObj);
      const parts = keys.map((key) => `"${toSnakeCase(key)}" ${orderObj[key].toUpperCase()}`);
      orderSql = `ORDER BY ${parts.join(", ")}`;
    }
  }
  const sql = `SELECT * FROM "${tableName}" ${whereSql} ${orderSql}`;
  const res = await client.query(sql, whereValues);
  const rows = res.rows.map(mapKeysToCamel);
  if (rows.length > 0 && args?.include) {
    const includeKeys = Object.keys(args.include);
    for (const incKey of includeKeys) {
      if (args.include[incKey] && relationMap[incKey]) {
        const rel = relationMap[incKey];
        const parentIds = rows.map((r) => r.id);
        const childSql = `SELECT * FROM "${rel.table}" WHERE "${rel.fk}" = ANY($1)`;
        const childRes = await client.query(childSql, [parentIds]);
        const childRows = childRes.rows.map(mapKeysToCamel);
        const camelFk = toCamelCase(rel.fk);
        const group = {};
        for (const child of childRows) {
          const pId = child[camelFk];
          if (!group[pId]) group[pId] = [];
          group[pId].push(child);
        }
        for (const row of rows) {
          row[rel.key] = group[row.id] || [];
        }
      }
    }
  }
  return rows;
}
async function findUnique(tableName, args, client) {
  const rows = await findMany(tableName, args, client);
  return rows[0] || null;
}
async function create(tableName, args, client) {
  const createData = mapKeysToSnake(args.data);
  for (const k of Object.keys(createData)) {
    if (Array.isArray(createData[k])) delete createData[k];
  }
  const keys = Object.keys(createData);
  const values = keys.map((k) => createData[k]);
  const placeholders = keys.map((_, i) => `$${i + 1}`);
  const sql = `INSERT INTO "${tableName}" (${keys.map((k) => `"${k}"`).join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
  const res = await client.query(sql, values);
  return mapKeysToCamel(res.rows[0]);
}
async function update(tableName, args, client) {
  const { sql: whereSql, values: whereValues } = buildWhere(args.where);
  const updateData = mapKeysToSnake(args.data);
  for (const k of Object.keys(updateData)) {
    if (Array.isArray(updateData[k])) delete updateData[k];
  }
  const keys = Object.keys(updateData);
  const setClauses = keys.map((key, i) => `"${key}" = $${whereValues.length + i + 1}`);
  const updateValues = [...whereValues, ...keys.map((k) => updateData[k])];
  const sql = `UPDATE "${tableName}" SET ${setClauses.join(", ")} ${whereSql} RETURNING *`;
  const res = await client.query(sql, updateValues);
  return mapKeysToCamel(res.rows[0]);
}
async function deleteRow(tableName, args, client) {
  const { sql: whereSql, values: whereValues } = buildWhere(args.where);
  const sql = `DELETE FROM "${tableName}" ${whereSql} RETURNING *`;
  const res = await client.query(sql, whereValues);
  return mapKeysToCamel(res.rows[0]);
}
async function deleteMany(tableName, args, client) {
  const { sql: whereSql, values: whereValues } = buildWhere(args?.where);
  const sql = `DELETE FROM "${tableName}" ${whereSql}`;
  const res = await client.query(sql, whereValues);
  return { count: res.rowCount };
}
async function upsert(tableName, args, client) {
  const { sql: whereSql, values: whereValues } = buildWhere(args.where);
  const checkRes = await client.query(`SELECT * FROM "${tableName}" ${whereSql} LIMIT 1`, whereValues);
  if (checkRes.rows.length > 0) {
    const updateData = mapKeysToSnake(args.update);
    for (const k of Object.keys(updateData)) {
      if (Array.isArray(updateData[k])) delete updateData[k];
    }
    const updateKeys = Object.keys(updateData);
    if (updateKeys.length === 0) {
      return mapKeysToCamel(checkRes.rows[0]);
    }
    const setClauses = updateKeys.map((key, i) => `"${key}" = $${whereValues.length + i + 1}`);
    const updateValues = [...whereValues, ...updateKeys.map((k) => updateData[k])];
    const updateSql = `UPDATE "${tableName}" SET ${setClauses.join(", ")} ${whereSql} RETURNING *`;
    const updateRes = await client.query(updateSql, updateValues);
    return mapKeysToCamel(updateRes.rows[0]);
  } else {
    const createData = mapKeysToSnake(args.create);
    for (const k of Object.keys(createData)) {
      if (Array.isArray(createData[k])) delete createData[k];
    }
    const insertKeys = Object.keys(createData);
    const insertValues = insertKeys.map((k) => createData[k]);
    const placeholders = insertKeys.map((_, i) => `$${i + 1}`);
    const insertSql = `INSERT INTO "${tableName}" (${insertKeys.map((k) => `"${k}"`).join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
    const insertRes = await client.query(insertSql, insertValues);
    return mapKeysToCamel(insertRes.rows[0]);
  }
}
async function $transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const tx = new Proxy({}, {
      get(target, modelName) {
        if (modelName === "query") {
          return client.query.bind(client);
        }
        const tableName = modelToTable[modelName];
        if (!tableName) return void 0;
        return {
          findMany: (args) => findMany(tableName, args, client),
          findUnique: (args) => findUnique(tableName, args, client),
          create: (args) => create(tableName, args, client),
          update: (args) => update(tableName, args, client),
          delete: (args) => deleteRow(tableName, args, client),
          deleteMany: (args) => deleteMany(tableName, args, client),
          upsert: (args) => upsert(tableName, args, client)
        };
      }
    });
    const result = await callback(tx);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
async function $queryRaw(strings, ...values) {
  let sql = strings[0];
  for (let i = 1; i < strings.length; i++) {
    sql += `$${i}` + strings[i];
  }
  const res = await pool.query(sql, values);
  return res.rows;
}
var neon = new Proxy({}, {
  get(target, prop) {
    if (prop === "$transaction") {
      return $transaction;
    }
    if (prop === "$queryRaw") {
      return $queryRaw;
    }
    const tableName = modelToTable[prop];
    if (!tableName) return void 0;
    return {
      findMany: (args) => findMany(tableName, args, pool),
      findUnique: (args) => findUnique(tableName, args, pool),
      create: (args) => create(tableName, args, pool),
      update: (args) => update(tableName, args, pool),
      delete: (args) => deleteRow(tableName, args, pool),
      deleteMany: (args) => deleteMany(tableName, args, pool),
      upsert: (args) => upsert(tableName, args, pool)
    };
  }
});

// src/schemaCheck.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
async function performSchemaMigrationCheck() {
  const url = process.env.DATABASE_URL || "";
  if (!url || url.includes("******") || url.includes("%2A%2A%2A%2A%2A%2A")) {
    console.log("[Schema Check] Bypassing schema check: Database is unconfigured or masked (Sandbox offline mode active).");
    return;
  }
  console.log("Performing schema migration check...");
  try {
    const expectedTables = [
      "company_profiles",
      "customers",
      "products",
      "terms_presets",
      "subscription_policies",
      "quotations",
      "quotation_items",
      "invoices",
      "invoice_items",
      "delivery_challans",
      "delivery_challan_items",
      "leads",
      "subscriptions",
      "reminders",
      "inventory_items",
      "inventory_logs",
      "user_profiles",
      "app_data"
    ];
    const result = await neon.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    const existingTables = result.map((r) => r.table_name);
    const missingTables = expectedTables.filter((t) => !existingTables.includes(t));
    if (missingTables.length > 0) {
      console.warn(`[Schema Check] Missing tables found: ${missingTables.join(", ")}. Initiating automatic schema migration...`);
      try {
        const filePath = import_path.default.join(process.cwd(), "table_creation_queries.sql");
        if (import_fs.default.existsSync(filePath)) {
          const sqlContent = import_fs.default.readFileSync(filePath, "utf-8");
          const statements = sqlContent.split(";");
          console.log(`[Schema Check] Found ${statements.length} SQL statements in table_creation_queries.sql. Executing...`);
          for (let statement of statements) {
            const lines = statement.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("--") && !line.startsWith("\u25C7"));
            const cleanStmt = lines.join(" ").trim();
            if (!cleanStmt) {
              continue;
            }
            try {
              await pool.query(cleanStmt);
            } catch (stmtErr) {
              if (stmtErr.message && (stmtErr.message.includes("already exists") || stmtErr.message.includes("already a relation"))) {
                continue;
              }
              console.log(`[Schema Check] Non-blocking statement warning during execution: ${stmtErr.message || stmtErr}`);
            }
          }
          console.log("[Schema Check] Automatic schema migration completed successfully!");
        } else {
          console.error("[Schema Check] table_creation_queries.sql not found at " + filePath);
        }
      } catch (migrationErr) {
        console.error("[Schema Check] Failed to execute schema migration automatically:", migrationErr.message || migrationErr);
      }
    } else {
      console.log("[Schema Check] All expected tables exist. Schema is up to date.");
    }
  } catch (error) {
    const errMsg = error.message || String(error);
    if (errMsg.toLowerCase().includes("password authentication failed") || errMsg.toLowerCase().includes("authentication failed")) {
      console.log("[Schema Check] Notice: Could not verify database tables automatically (skipping check).\nDATABASE PASSWORD ERROR: Password authentication failed for your user.\n\nTo resolve this:\n1. Go to your Neon console (or PostgreSQL provider dashboard) and copy your correct connection string.\n2. Open Google AI Studio, click 'Settings' (gear icon) in the sidebar/header, then choose 'Environment Variables'.\n3. Locate 'DATABASE_URL' and 'DATABASE_URL_UNPOOLED' and update them with the correct password.");
    } else {
      console.log("[Schema Check] Notice: Could not verify database tables automatically (skipping check). Details:", errMsg);
    }
  }
}

// src/utils.ts
var SEED_COMPANY_PROFILES = [
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
var SEED_CUSTOMERS = [
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
var SEED_PRODUCTS = [
  {
    id: "prod_server",
    name: "High Performance Cloud Server Deployment",
    sku: "CLD-SRV-HP1",
    rate: 15e3,
    gstRate: 18,
    hsnCode: "997331",
    description: "Setup and deployment of enterprise-grade cloud servers with automatic load balancing.",
    itemType: "Product"
  },
  {
    id: "prod_maintenance",
    name: "Annual IT Support & Maintenance Contract",
    sku: "IT-AMC-001",
    rate: 45e3,
    gstRate: 18,
    hsnCode: "998713",
    description: "Annual maintenance, quarterly software updates, and 24/7 priority emergency support.",
    itemType: "Service"
  },
  {
    id: "prod_consulting",
    name: "Custom Software Development Consulting",
    sku: "SOFT-DEV-CON",
    rate: 5e3,
    gstRate: 18,
    hsnCode: "998314",
    description: "Hourly consulting and system analysis for modern full-stack web applications.",
    itemType: "Service"
  }
];
var SEED_QUOTATIONS = [
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
        rate: 15e3,
        discountPercent: 5,
        gstPercent: 18
      }
    ],
    subtotal: 3e4,
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
var SEED_PROFORMA_INVOICES = [
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
        rate: 15e3,
        discountPercent: 5,
        gstPercent: 18
      }
    ],
    subtotal: 3e4,
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
var SEED_CHALLANS = [
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
var SEED_LEADS = [
  {
    id: "lead_001",
    customerId: "cust_delta",
    name: "Sarah Jenkins",
    company: "Delta Tech Solutions",
    email: "billing@deltatech.in",
    phone: "+91 91234 56789",
    value: 45e3,
    status: "New",
    source: "Website Inquiry",
    notes: "Interested in high-availability Cloud Server configurations and annual server maintenance contracts.",
    date: "2026-07-12",
    conversionStatus: "Warm"
  }
];
var SEED_SUBSCRIPTIONS = [
  {
    id: "sub_001",
    customerId: "cust_acme",
    serviceName: "Managed Cloud Server SLA Subscription",
    amount: 15e3,
    billingCycle: "Monthly",
    startDate: "2026-07-12",
    nextRenewalDate: "2026-08-12",
    status: "Active",
    description: "Comprehensive active service contract covering platform performance metrics and regular system tune-ups."
  }
];
var SEED_REMINDERS = [
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
var SEED_INVENTORY = [
  {
    id: "inv_item_001",
    sku: "CLD-SRV-HP1",
    productName: "High Performance Cloud Server Deployment Node",
    category: "Servers",
    quantity: 15,
    minQuantity: 3,
    purchaseFrom: "Tech Hardware Solutions Ltd",
    unitPrice: 12e3,
    latestPurchasePrice: 12e3,
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

// src/dbHelper.ts
async function seedDatabaseIfEmpty() {
  try {
    const existing = await neon.companyProfiles.findMany();
    if (existing.length === 0) {
      console.log("[Seeding] Database is empty. Seeding initial records directly into PostgreSQL...");
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
      await saveToNeon(startingState);
      console.log("[Seeding] Database seeding completed successfully!");
    } else {
      console.log("[Seeding] Database is not empty. Skipping initial seeds.");
    }
  } catch (err) {
    console.error("[Seeding] Error checking or seeding empty database:", err.message || err);
  }
}
function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}
async function saveToNeon(payload) {
  await neon.$transaction(async (tx) => {
    const isFullSave = payload.company_profiles !== void 0 && payload.customers !== void 0 && payload.products !== void 0 && payload.inventory !== void 0 && payload.quotations !== void 0;
    if (isFullSave) {
      console.log("Full save detected. Wiping existing records first to ensure consistency.");
      await tx.inventoryLogs.deleteMany();
      await tx.inventoryItems.deleteMany();
      await tx.quotationItems.deleteMany();
      await tx.invoiceItems.deleteMany();
      await tx.deliveryChallanItems.deleteMany();
      await tx.reminders.deleteMany();
      await tx.subscriptions.deleteMany();
      await tx.leads.deleteMany();
      await tx.deliveryChallans.deleteMany();
      await tx.invoices.deleteMany();
      await tx.quotations.deleteMany();
      await tx.products.deleteMany();
      await tx.customers.deleteMany();
      await tx.subscriptionPolicies.deleteMany();
      await tx.termsPresets.deleteMany();
      await tx.companyProfiles.deleteMany();
    }
    const companyIds = /* @__PURE__ */ new Set();
    const termsPresetIds = /* @__PURE__ */ new Set();
    const customerIds = /* @__PURE__ */ new Set();
    const productIds = /* @__PURE__ */ new Set();
    const productSkus = /* @__PURE__ */ new Set();
    const inventorySkus = /* @__PURE__ */ new Set();
    const quotationIds = /* @__PURE__ */ new Set();
    const quotationNos = /* @__PURE__ */ new Set();
    const subscriptionIds = /* @__PURE__ */ new Set();
    if (!isFullSave) {
      const dbCompanies = await tx.companyProfiles.findMany({ select: { id: true } });
      dbCompanies.forEach((c) => companyIds.add(c.id));
      const dbTerms = await tx.termsPresets.findMany({ select: { id: true } });
      dbTerms.forEach((t) => termsPresetIds.add(t.id));
      const dbCustomers = await tx.customers.findMany({ select: { id: true } });
      dbCustomers.forEach((c) => customerIds.add(c.id));
      const dbProducts = await tx.products.findMany({ select: { id: true, sku: true } });
      dbProducts.forEach((p) => {
        productIds.add(p.id);
        if (p.sku) productSkus.add(p.sku.toUpperCase().trim());
      });
      const dbQuotations = await tx.quotations.findMany({ select: { id: true, quotationNo: true } });
      dbQuotations.forEach((q) => {
        quotationIds.add(q.id);
        if (q.quotationNo) quotationNos.add(q.quotationNo);
      });
      const dbSubscriptions = await tx.subscriptions.findMany({ select: { id: true } });
      dbSubscriptions.forEach((s) => subscriptionIds.add(s.id));
    }
    if (payload.company_profiles !== void 0) {
      const incomingIds = payload.company_profiles.map((cp) => cp.id);
      await tx.termsPresets.deleteMany({
        where: { companyProfileId: { in: incomingIds } }
      });
      for (const cp of payload.company_profiles || []) {
        companyIds.add(cp.id);
        await tx.companyProfiles.upsert({
          where: { id: cp.id },
          update: {
            name: cp.name,
            email: cp.email || "",
            phone: cp.phone,
            address: cp.address,
            gstin: cp.gstin,
            pan: cp.pan,
            state: cp.state,
            bankName: cp.bankName,
            bankBranch: cp.bankBranch,
            accountNo: cp.accountNo,
            ifsc: cp.ifsc,
            headerImage: cp.headerImage,
            footerImage: cp.footerImage,
            signatureImage: cp.signatureImage,
            template: cp.template,
            quotationPrefix: cp.quotationPrefix,
            invoicePrefix: cp.invoicePrefix,
            challanPrefix: cp.challanPrefix,
            nextQuotationNumber: cp.nextQuotationNumber || 1,
            nextInvoiceNumber: cp.nextInvoiceNumber || 1,
            nextChallanNumber: cp.nextChallanNumber || 1,
            enableGst: cp.enableGst !== void 0 ? cp.enableGst : true,
            profitWithoutGst: cp.profitWithoutGst !== void 0 ? cp.profitWithoutGst : true,
            updatedAt: /* @__PURE__ */ new Date()
          },
          create: {
            id: cp.id,
            name: cp.name,
            email: cp.email || "",
            phone: cp.phone,
            address: cp.address,
            gstin: cp.gstin,
            pan: cp.pan,
            state: cp.state,
            bankName: cp.bankName,
            bankBranch: cp.bankBranch,
            accountNo: cp.accountNo,
            ifsc: cp.ifsc,
            headerImage: cp.headerImage,
            footerImage: cp.footerImage,
            signatureImage: cp.signatureImage,
            template: cp.template,
            quotationPrefix: cp.quotationPrefix,
            invoicePrefix: cp.invoicePrefix,
            challanPrefix: cp.challanPrefix,
            nextQuotationNumber: cp.nextQuotationNumber || 1,
            nextInvoiceNumber: cp.nextInvoiceNumber || 1,
            nextChallanNumber: cp.nextChallanNumber || 1,
            enableGst: cp.enableGst !== void 0 ? cp.enableGst : true,
            profitWithoutGst: cp.profitWithoutGst !== void 0 ? cp.profitWithoutGst : true,
            updatedAt: /* @__PURE__ */ new Date()
          }
        });
        for (const tp of cp.termsPresets || []) {
          termsPresetIds.add(tp.id);
          await tx.termsPresets.create({
            data: {
              id: tp.id,
              companyProfileId: cp.id,
              title: tp.title,
              content: tp.content
            }
          });
        }
      }
      const existing = await tx.companyProfiles.findMany({ select: { id: true } });
      for (const ep of existing) {
        if (!incomingIds.includes(ep.id)) {
          try {
            await tx.companyProfiles.delete({ where: { id: ep.id } });
          } catch (e) {
            console.warn(`Could not delete unused company profile ${ep.id}:`, e);
          }
        }
      }
    }
    if (payload.customers !== void 0) {
      const incomingIds = payload.customers.map((c) => c.id);
      for (const cust of payload.customers || []) {
        customerIds.add(cust.id);
        await tx.customers.upsert({
          where: { id: cust.id },
          update: {
            name: cust.name,
            company: cust.company,
            email: cust.email,
            phone: cust.phone,
            gstin: cust.gstin,
            state: cust.state || "Maharashtra",
            billingAddress: cust.billingAddress,
            shippingAddress: cust.shippingAddress,
            updatedAt: /* @__PURE__ */ new Date()
          },
          create: {
            id: cust.id,
            name: cust.name,
            company: cust.company,
            email: cust.email,
            phone: cust.phone,
            gstin: cust.gstin,
            state: cust.state || "Maharashtra",
            billingAddress: cust.billingAddress,
            shippingAddress: cust.shippingAddress,
            updatedAt: /* @__PURE__ */ new Date()
          }
        });
      }
      const existing = await tx.customers.findMany({ select: { id: true } });
      for (const ec of existing) {
        if (!incomingIds.includes(ec.id)) {
          try {
            await tx.customers.delete({ where: { id: ec.id } });
          } catch (e) {
            console.warn(`Could not delete customer ${ec.id} (might be referenced):`, e);
          }
        }
      }
    }
    if (payload.products !== void 0) {
      const currentProductsMap = /* @__PURE__ */ new Map();
      const dbProducts = await tx.products.findMany({ select: { id: true, sku: true } });
      dbProducts.forEach((p) => {
        if (p.sku) currentProductsMap.set(p.sku.toUpperCase().trim(), p.id);
      });
      const incomingIds = payload.products.map((p) => p.id);
      for (const prod of payload.products || []) {
        productIds.add(prod.id);
        let prodSku = prod.sku ? prod.sku.toUpperCase().trim() : "";
        if (!prodSku) {
          prodSku = `SKU_${prod.id.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
        }
        let finalProdSku = prodSku;
        let counter = 1;
        while (true) {
          const owningId = currentProductsMap.get(finalProdSku);
          if (!owningId || owningId === prod.id) {
            break;
          }
          finalProdSku = `${prodSku}_${counter}`;
          counter++;
        }
        currentProductsMap.set(finalProdSku, prod.id);
        await tx.products.upsert({
          where: { id: prod.id },
          update: {
            name: prod.name || "Unnamed Product",
            sku: finalProdSku,
            rate: prod.rate || 0,
            gstRate: prod.gstRate || 18,
            hsnCode: prod.hsnCode,
            description: prod.description,
            itemType: prod.itemType,
            mrp: prod.mrp,
            lastPurchasePrice: prod.lastPurchasePrice,
            sellPrice: prod.sellPrice,
            updatedAt: /* @__PURE__ */ new Date()
          },
          create: {
            id: prod.id,
            name: prod.name || "Unnamed Product",
            sku: finalProdSku,
            rate: prod.rate || 0,
            gstRate: prod.gstRate || 18,
            hsnCode: prod.hsnCode,
            description: prod.description,
            itemType: prod.itemType,
            mrp: prod.mrp,
            lastPurchasePrice: prod.lastPurchasePrice,
            sellPrice: prod.sellPrice,
            updatedAt: /* @__PURE__ */ new Date()
          }
        });
      }
      const existing = await tx.products.findMany({ select: { id: true } });
      for (const ep of existing) {
        if (!incomingIds.includes(ep.id)) {
          try {
            await tx.products.delete({ where: { id: ep.id } });
          } catch (e) {
            console.warn(`Could not delete product ${ep.id} (might be referenced):`, e);
          }
        }
      }
    }
    if (payload.inventory !== void 0) {
      const currentProductsMap = /* @__PURE__ */ new Map();
      const dbProducts = await tx.products.findMany({ select: { id: true, sku: true } });
      dbProducts.forEach((p) => {
        if (p.sku) currentProductsMap.set(p.sku.toUpperCase().trim(), p.id);
      });
      const currentInventoryMap = /* @__PURE__ */ new Map();
      const dbInventory = await tx.inventoryItems.findMany({ select: { id: true, sku: true } });
      dbInventory.forEach((inv) => {
        if (inv.sku) currentInventoryMap.set(inv.sku.toUpperCase().trim(), inv.id);
      });
      const incomingIds = payload.inventory.map((inv) => inv.id);
      for (const inv of payload.inventory || []) {
        let invSku = inv.sku ? inv.sku.toUpperCase().trim() : "";
        if (!invSku) {
          invSku = `SKU_INV_${inv.id.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
        }
        let finalInvSku = invSku;
        let counter = 1;
        while (true) {
          const owningId = currentInventoryMap.get(finalInvSku);
          if (!owningId || owningId === inv.id) {
            break;
          }
          finalInvSku = `${invSku}_${counter}`;
          counter++;
        }
        currentInventoryMap.set(finalInvSku, inv.id);
        if (!currentProductsMap.has(finalInvSku)) {
          const placeholderProdId = `prod_placeholder_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          await tx.products.create({
            data: {
              id: placeholderProdId,
              name: inv.productName || `Product for SKU ${finalInvSku}`,
              sku: finalInvSku,
              rate: inv.unitPrice || 0,
              gstRate: 18,
              description: "Automatically created placeholder product for inventory item",
              updatedAt: /* @__PURE__ */ new Date()
            }
          });
          currentProductsMap.set(finalInvSku, placeholderProdId);
          productIds.add(placeholderProdId);
        }
        await tx.inventoryItems.upsert({
          where: { id: inv.id },
          update: {
            sku: finalInvSku,
            productName: inv.productName || "Product",
            category: inv.category,
            quantity: inv.quantity || 0,
            minQuantity: inv.minQuantity || 0,
            purchaseFrom: inv.purchaseFrom,
            unitPrice: inv.unitPrice || 0,
            latestPurchasePrice: inv.latestPurchasePrice,
            lastUpdated: parseDate(inv.lastUpdated) || /* @__PURE__ */ new Date()
          },
          create: {
            id: inv.id,
            sku: finalInvSku,
            productName: inv.productName || "Product",
            category: inv.category,
            quantity: inv.quantity || 0,
            minQuantity: inv.minQuantity || 0,
            purchaseFrom: inv.purchaseFrom,
            unitPrice: inv.unitPrice || 0,
            latestPurchasePrice: inv.latestPurchasePrice,
            lastUpdated: parseDate(inv.lastUpdated) || /* @__PURE__ */ new Date()
          }
        });
        await tx.inventoryLogs.deleteMany({
          where: { inventoryItemId: inv.id }
        });
        for (const log of inv.logs || []) {
          await tx.inventoryLogs.create({
            data: {
              id: log.id || "log_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now(),
              inventoryItemId: inv.id,
              date: parseDate(log.date) || /* @__PURE__ */ new Date(),
              type: log.type,
              quantity: log.quantity || 0,
              reason: log.reason,
              prevQty: log.prevQty || 0,
              newQty: log.newQty || 0,
              supplierName: log.supplierName,
              customerName: log.customerName
            }
          });
        }
      }
      const existing = await tx.inventoryItems.findMany({ select: { id: true } });
      for (const ei of existing) {
        if (!incomingIds.includes(ei.id)) {
          try {
            await tx.inventoryLogs.deleteMany({ where: { inventoryItemId: ei.id } });
            await tx.inventoryItems.delete({ where: { id: ei.id } });
          } catch (e) {
            console.warn(`Could not delete inventory item ${ei.id}:`, e);
          }
        }
      }
    }
    if (payload.quotations !== void 0) {
      const incomingIds = payload.quotations.map((q) => q.id);
      await tx.quotationItems.deleteMany({
        where: { quotationId: { in: incomingIds } }
      });
      for (const qt of payload.quotations || []) {
        quotationIds.add(qt.id);
        if (qt.quotationNo) {
          quotationNos.add(qt.quotationNo);
        }
        let qCustId = qt.customerId;
        if (!customerIds.has(qCustId)) {
          await tx.customers.create({
            data: {
              id: qCustId,
              name: "Placeholder Customer",
              state: "Maharashtra",
              updatedAt: /* @__PURE__ */ new Date()
            }
          });
          customerIds.add(qCustId);
        }
        await tx.quotations.upsert({
          where: { id: qt.id },
          update: {
            quotationNo: qt.quotationNo,
            date: parseDate(qt.date) || /* @__PURE__ */ new Date(),
            validUntil: parseDate(qt.validUntil),
            customerId: qCustId,
            subject: qt.subject,
            subtotal: qt.subtotal || 0,
            discountTotal: qt.discountTotal || 0,
            cgstTotal: qt.cgstTotal || 0,
            sgstTotal: qt.sgstTotal || 0,
            igstTotal: qt.igstTotal || 0,
            grandTotal: qt.grandTotal || 0,
            status: qt.status,
            terms: qt.terms,
            companyId: qt.companyId && companyIds.has(qt.companyId) ? qt.companyId : null,
            termsPresetId: qt.termsPresetId && termsPresetIds.has(qt.termsPresetId) ? qt.termsPresetId : null,
            freight: qt.freight,
            additionalDiscount: qt.additionalDiscount,
            customerSignature: qt.customerSignature,
            customerSignedAt: parseDate(qt.customerSignedAt),
            revisionOfId: null,
            // set to null on update, resolved later
            originalQuoteId: null,
            // set to null on update, resolved later
            revisionNumber: qt.revisionNumber,
            updatedAt: /* @__PURE__ */ new Date()
          },
          create: {
            id: qt.id,
            quotationNo: qt.quotationNo,
            date: parseDate(qt.date) || /* @__PURE__ */ new Date(),
            validUntil: parseDate(qt.validUntil),
            customerId: qCustId,
            subject: qt.subject,
            subtotal: qt.subtotal || 0,
            discountTotal: qt.discountTotal || 0,
            cgstTotal: qt.cgstTotal || 0,
            sgstTotal: qt.sgstTotal || 0,
            igstTotal: qt.igstTotal || 0,
            grandTotal: qt.grandTotal || 0,
            status: qt.status,
            terms: qt.terms,
            companyId: qt.companyId && companyIds.has(qt.companyId) ? qt.companyId : null,
            termsPresetId: qt.termsPresetId && termsPresetIds.has(qt.termsPresetId) ? qt.termsPresetId : null,
            freight: qt.freight,
            additionalDiscount: qt.additionalDiscount,
            customerSignature: qt.customerSignature,
            customerSignedAt: parseDate(qt.customerSignedAt),
            revisionOfId: null,
            originalQuoteId: null,
            revisionNumber: qt.revisionNumber,
            updatedAt: /* @__PURE__ */ new Date()
          }
        });
        for (const item of qt.items || []) {
          await tx.quotationItems.create({
            data: {
              quotationId: qt.id,
              productId: item.productId && productIds.has(item.productId) ? item.productId : null,
              productName: item.productName || "Product",
              description: item.description,
              hsnCode: item.hsnCode,
              quantity: item.quantity || 1,
              rate: item.rate || 0,
              discountPercent: item.discountPercent || 0,
              gstPercent: item.gstPercent || 18
            }
          });
        }
      }
      for (const qt of payload.quotations || []) {
        if (qt.revisionOfId || qt.originalQuoteId) {
          await tx.quotations.update({
            where: { id: qt.id },
            data: {
              revisionOfId: qt.revisionOfId && quotationIds.has(qt.revisionOfId) ? qt.revisionOfId : null,
              originalQuoteId: qt.originalQuoteId && quotationIds.has(qt.originalQuoteId) ? qt.originalQuoteId : null
            }
          });
        }
      }
      const existing = await tx.quotations.findMany({ select: { id: true } });
      for (const eq of existing) {
        if (!incomingIds.includes(eq.id)) {
          try {
            await tx.quotationItems.deleteMany({ where: { quotationId: eq.id } });
            await tx.quotations.delete({ where: { id: eq.id } });
          } catch (e) {
            console.warn(`Could not delete quotation ${eq.id}:`, e);
          }
        }
      }
    }
    if (payload.proforma_invoices !== void 0) {
      const incomingIds = payload.proforma_invoices.map((i) => i.id);
      await tx.invoiceItems.deleteMany({
        where: { invoiceId: { in: incomingIds } }
      });
      for (const inv of payload.proforma_invoices || []) {
        let iCustId = inv.customerId;
        if (!customerIds.has(iCustId)) {
          await tx.customers.create({
            data: {
              id: iCustId,
              name: "Placeholder Customer",
              state: "Maharashtra",
              updatedAt: /* @__PURE__ */ new Date()
            }
          });
          customerIds.add(iCustId);
        }
        await tx.invoices.upsert({
          where: { id: inv.id },
          update: {
            invoiceNo: inv.invoiceNo,
            quotationNo: inv.quotationNo && quotationNos.has(inv.quotationNo) ? inv.quotationNo : null,
            date: parseDate(inv.date) || /* @__PURE__ */ new Date(),
            dueDate: parseDate(inv.dueDate),
            customerId: iCustId,
            subject: inv.subject,
            subtotal: inv.subtotal || 0,
            discountTotal: inv.discountTotal || 0,
            cgstTotal: inv.cgstTotal || 0,
            sgstTotal: inv.sgstTotal || 0,
            igstTotal: inv.igstTotal || 0,
            grandTotal: inv.grandTotal || 0,
            status: inv.status,
            terms: inv.terms,
            companyId: inv.companyId && companyIds.has(inv.companyId) ? inv.companyId : null,
            termsPresetId: inv.termsPresetId && termsPresetIds.has(inv.termsPresetId) ? inv.termsPresetId : null,
            freight: inv.freight,
            additionalDiscount: inv.additionalDiscount,
            customerSignature: inv.customerSignature,
            customerSignedAt: parseDate(inv.customerSignedAt),
            updatedAt: /* @__PURE__ */ new Date()
          },
          create: {
            id: inv.id,
            invoiceNo: inv.invoiceNo,
            quotationNo: inv.quotationNo && quotationNos.has(inv.quotationNo) ? inv.quotationNo : null,
            date: parseDate(inv.date) || /* @__PURE__ */ new Date(),
            dueDate: parseDate(inv.dueDate),
            customerId: iCustId,
            subject: inv.subject,
            subtotal: inv.subtotal || 0,
            discountTotal: inv.discountTotal || 0,
            cgstTotal: inv.cgstTotal || 0,
            sgstTotal: inv.sgstTotal || 0,
            igstTotal: inv.igstTotal || 0,
            grandTotal: inv.grandTotal || 0,
            status: inv.status,
            terms: inv.terms,
            companyId: inv.companyId && companyIds.has(inv.companyId) ? inv.companyId : null,
            termsPresetId: inv.termsPresetId && termsPresetIds.has(inv.termsPresetId) ? inv.termsPresetId : null,
            freight: inv.freight,
            additionalDiscount: inv.additionalDiscount,
            customerSignature: inv.customerSignature,
            customerSignedAt: parseDate(inv.customerSignedAt),
            updatedAt: /* @__PURE__ */ new Date()
          }
        });
        for (const item of inv.items || []) {
          await tx.invoiceItems.create({
            data: {
              invoiceId: inv.id,
              productId: item.productId && productIds.has(item.productId) ? item.productId : null,
              productName: item.productName || "Product",
              description: item.description,
              hsnCode: item.hsnCode,
              quantity: item.quantity || 1,
              rate: item.rate || 0,
              discountPercent: item.discountPercent || 0,
              gstPercent: item.gstPercent || 18
            }
          });
        }
      }
      const existing = await tx.invoices.findMany({ select: { id: true } });
      for (const ei of existing) {
        if (!incomingIds.includes(ei.id)) {
          try {
            await tx.invoiceItems.deleteMany({ where: { invoiceId: ei.id } });
            await tx.invoices.delete({ where: { id: ei.id } });
          } catch (e) {
            console.warn(`Could not delete invoice ${ei.id}:`, e);
          }
        }
      }
    }
    if (payload.challans !== void 0) {
      const incomingIds = payload.challans.map((ch) => ch.id);
      await tx.deliveryChallanItems.deleteMany({
        where: { deliveryChallanId: { in: incomingIds } }
      });
      for (const ch of payload.challans || []) {
        let chCustId = ch.customerId;
        if (!customerIds.has(chCustId)) {
          await tx.customers.create({
            data: {
              id: chCustId,
              name: "Placeholder Customer",
              state: "Maharashtra",
              updatedAt: /* @__PURE__ */ new Date()
            }
          });
          customerIds.add(chCustId);
        }
        await tx.deliveryChallans.upsert({
          where: { id: ch.id },
          update: {
            challanNo: ch.challanNo,
            date: parseDate(ch.date) || /* @__PURE__ */ new Date(),
            customerId: chCustId,
            vehicleNo: ch.vehicleNo,
            transporter: ch.transporter,
            lrNumber: ch.lrNumber,
            dispatchAddress: ch.dispatchAddress,
            status: ch.status,
            notes: ch.notes,
            companyId: ch.companyId && companyIds.has(ch.companyId) ? ch.companyId : null,
            updatedAt: /* @__PURE__ */ new Date()
          },
          create: {
            id: ch.id,
            challanNo: ch.challanNo,
            date: parseDate(ch.date) || /* @__PURE__ */ new Date(),
            customerId: chCustId,
            vehicleNo: ch.vehicleNo,
            transporter: ch.transporter,
            lrNumber: ch.lrNumber,
            dispatchAddress: ch.dispatchAddress,
            status: ch.status,
            notes: ch.notes,
            companyId: ch.companyId && companyIds.has(ch.companyId) ? ch.companyId : null,
            updatedAt: /* @__PURE__ */ new Date()
          }
        });
        for (const item of ch.items || []) {
          await tx.deliveryChallanItems.create({
            data: {
              deliveryChallanId: ch.id,
              productName: item.productName || "Product",
              quantity: item.quantity || 1,
              hsnCode: item.hsnCode,
              description: item.description
            }
          });
        }
      }
      const existing = await tx.deliveryChallans.findMany({ select: { id: true } });
      for (const ec of existing) {
        if (!incomingIds.includes(ec.id)) {
          try {
            await tx.deliveryChallanItems.deleteMany({ where: { deliveryChallanId: ec.id } });
            await tx.deliveryChallans.delete({ where: { id: ec.id } });
          } catch (e) {
            console.warn(`Could not delete delivery challan ${ec.id}:`, e);
          }
        }
      }
    }
    if (payload.leads !== void 0) {
      const incomingIds = payload.leads.map((ld) => ld.id);
      for (const ld of payload.leads || []) {
        await tx.leads.upsert({
          where: { id: ld.id },
          update: {
            customerId: ld.customerId && customerIds.has(ld.customerId) ? ld.customerId : null,
            name: ld.name,
            company: ld.company,
            email: ld.email,
            phone: ld.phone,
            value: ld.value || 0,
            status: ld.status,
            source: ld.source,
            notes: ld.notes,
            date: parseDate(ld.date),
            conversionStatus: ld.conversionStatus,
            updatedAt: /* @__PURE__ */ new Date()
          },
          create: {
            id: ld.id,
            customerId: ld.customerId && customerIds.has(ld.customerId) ? ld.customerId : null,
            name: ld.name,
            company: ld.company,
            email: ld.email,
            phone: ld.phone,
            value: ld.value || 0,
            status: ld.status,
            source: ld.source,
            notes: ld.notes,
            date: parseDate(ld.date),
            conversionStatus: ld.conversionStatus,
            updatedAt: /* @__PURE__ */ new Date()
          }
        });
      }
      const existing = await tx.leads.findMany({ select: { id: true } });
      for (const el of existing) {
        if (!incomingIds.includes(el.id)) {
          try {
            await tx.leads.delete({ where: { id: el.id } });
          } catch (e) {
            console.warn(`Could not delete lead ${el.id}:`, e);
          }
        }
      }
    }
    if (payload.subscriptions !== void 0) {
      const incomingIds = payload.subscriptions.map((sub) => sub.id);
      for (const sub of payload.subscriptions || []) {
        subscriptionIds.add(sub.id);
        let sCustId = sub.customerId;
        if (!customerIds.has(sCustId)) {
          await tx.customers.create({
            data: {
              id: sCustId,
              name: "Placeholder Customer",
              state: "Maharashtra",
              updatedAt: /* @__PURE__ */ new Date()
            }
          });
          customerIds.add(sCustId);
        }
        await tx.subscriptions.upsert({
          where: { id: sub.id },
          update: {
            customerId: sCustId,
            serviceName: sub.serviceName,
            amount: sub.amount || 0,
            billingCycle: sub.billingCycle,
            startDate: parseDate(sub.startDate) || /* @__PURE__ */ new Date(),
            nextRenewalDate: parseDate(sub.nextRenewalDate) || /* @__PURE__ */ new Date(),
            status: sub.status,
            description: sub.description,
            updatedAt: /* @__PURE__ */ new Date()
          },
          create: {
            id: sub.id,
            customerId: sCustId,
            serviceName: sub.serviceName,
            amount: sub.amount || 0,
            billingCycle: sub.billingCycle,
            startDate: parseDate(sub.startDate) || /* @__PURE__ */ new Date(),
            nextRenewalDate: parseDate(sub.nextRenewalDate) || /* @__PURE__ */ new Date(),
            status: sub.status,
            description: sub.description,
            updatedAt: /* @__PURE__ */ new Date()
          }
        });
      }
      const existing = await tx.subscriptions.findMany({ select: { id: true } });
      for (const es of existing) {
        if (!incomingIds.includes(es.id)) {
          try {
            await tx.subscriptions.delete({ where: { id: es.id } });
          } catch (e) {
            console.warn(`Could not delete subscription ${es.id}:`, e);
          }
        }
      }
    }
    if (payload.reminders !== void 0) {
      const incomingIds = payload.reminders.map((rem) => rem.id);
      for (const rem of payload.reminders || []) {
        await tx.reminders.upsert({
          where: { id: rem.id },
          update: {
            title: rem.title,
            description: rem.description,
            dueDate: parseDate(rem.dueDate) || /* @__PURE__ */ new Date(),
            status: rem.status,
            priority: rem.priority,
            relatedTo: rem.relatedTo,
            subscriptionId: rem.subscriptionId && subscriptionIds.has(rem.subscriptionId) ? rem.subscriptionId : null,
            customerId: rem.customerId && customerIds.has(rem.customerId) ? rem.customerId : null,
            updatedAt: /* @__PURE__ */ new Date()
          },
          create: {
            id: rem.id,
            title: rem.title,
            description: rem.description,
            dueDate: parseDate(rem.dueDate) || /* @__PURE__ */ new Date(),
            status: rem.status,
            priority: rem.priority,
            relatedTo: rem.relatedTo,
            subscriptionId: rem.subscriptionId && subscriptionIds.has(rem.subscriptionId) ? rem.subscriptionId : null,
            customerId: rem.customerId && customerIds.has(rem.customerId) ? rem.customerId : null,
            updatedAt: /* @__PURE__ */ new Date()
          }
        });
      }
      const existing = await tx.reminders.findMany({ select: { id: true } });
      for (const er of existing) {
        if (!incomingIds.includes(er.id)) {
          try {
            await tx.reminders.delete({ where: { id: er.id } });
          } catch (e) {
            console.warn(`Could not delete reminder ${er.id}:`, e);
          }
        }
      }
    }
  }, {
    timeout: 6e4
    // 60 seconds for bulk transaction
  });
}
async function getFromNeon() {
  const result = {};
  result.company_profiles = await neon.companyProfiles.findMany({ include: { termsPresets: true } });
  result.customers = await neon.customers.findMany();
  result.products = await neon.products.findMany();
  const rawQuotations = await neon.quotations.findMany({ include: { quotationItems: true } });
  result.quotations = rawQuotations.map((q) => ({
    ...q,
    items: q.quotationItems
  }));
  const rawInvoices = await neon.invoices.findMany({ include: { invoiceItems: true } });
  result.proforma_invoices = rawInvoices.map((i) => ({
    ...i,
    items: i.invoiceItems
  }));
  const rawChallans = await neon.deliveryChallans.findMany({ include: { deliveryChallanItems: true } });
  result.challans = rawChallans.map((c) => ({
    ...c,
    items: c.deliveryChallanItems
  }));
  result.leads = await neon.leads.findMany();
  result.subscriptions = await neon.subscriptions.findMany();
  result.reminders = await neon.reminders.findMany();
  const rawInventory = await neon.inventoryItems.findMany({ include: { inventoryLogs: true } });
  result.inventory = rawInventory.map((inv) => ({
    ...inv,
    logs: inv.inventoryLogs
  }));
  return JSON.parse(JSON.stringify(result));
}

// server.ts
import_dotenv2.default.config();
function formatDbErrorMessage(msg) {
  if (msg === "DB_NOT_CONFIGURED") {
    return "Your DATABASE_URL environment variable is not configured. Please set DATABASE_URL in Google AI Studio Settings -> Environment Variables menu to persist data.";
  }
  if (msg === "DB_MASKED") {
    return "CRITICAL DATABASE CONFIGURATION ERROR: Your DATABASE_URL contains '******' (the masked/hidden password placeholder) instead of your actual database password.\n\nTo resolve this:\n1. Locate your database credentials or Connection String details.\n2. Make sure you use the actual password instead of '******'.\n3. Copy the complete connection string containing your actual unmasked password.\n4. Open Google AI Studio, click the 'Settings' menu in the sidebar, open 'Environment Variables', and update 'DATABASE_URL' and 'DATABASE_URL_UNPOOLED' with your correct unmasked connection string.";
  }
  if (msg.toLowerCase().includes("password authentication failed") || msg.toLowerCase().includes("authentication failed")) {
    return "DATABASE PASSWORD ERROR: Password authentication failed for your user 'neondb_owner'.\n\nThis indicates that the password provided in your DATABASE_URL or DATABASE_URL_UNPOOLED is incorrect or has expired.\n\nTo resolve this:\n1. Go to your Neon console (or PostgreSQL provider dashboard) and copy your correct connection string.\n2. Open Google AI Studio, click 'Settings' (gear icon) in the sidebar/header, then choose 'Environment Variables'.\n3. Locate 'DATABASE_URL' and 'DATABASE_URL_UNPOOLED' and update them with the correct password. Ensure no leading or trailing spaces are copied.";
  }
  return msg;
}
function isDbConnectionOrSchemaError(error) {
  return false;
}
var aiInstance = null;
function getAI() {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. Using offline/fallback Indian GST data synthesis.");
      return null;
    }
    aiInstance = new import_genai.GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiInstance;
}
var gstStateCodes = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Punjab",
  // UT Chandigarh
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Gujarat",
  // Daman & Diu
  "26": "Gujarat",
  // Dadra & Nagar Haveli
  "27": "Maharashtra",
  "28": "Andhra Pradesh",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Kerala",
  // Lakshadweep
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Tamil Nadu",
  // Puducherry
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh"
};
var app = (0, import_express.default)();
var PORT = 3e3;
var isInitialized = false;
var initPromise = null;
async function ensureInitialized() {
  if (isInitialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await performSchemaMigrationCheck();
        await seedDefaultUsers();
        isInitialized = true;
      } catch (e) {
        console.error("Serverless startup seeding failed:", e);
      }
    })();
  }
  await initPromise;
}
app.use(async (req, res, next) => {
  if (process.env.VERCEL) {
    await ensureInitialized();
  }
  next();
});
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
async function ensureInvoicesAndCustomersTablesExist() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "customers" (
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
    `);
    console.log('[Table Assertion] Checked/Created table "customers" successfully.');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "invoices" (
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
    `);
    console.log('[Table Assertion] Checked/Created table "invoices" successfully.');
  } catch (err) {
    console.error("[Table Assertion] Error checking/creating tables during runtime check:", err.message || err);
  }
}
app.post("/api/db/save", async (req, res) => {
  const payload = req.body;
  try {
    console.log("Saving massive JSON payload directly to PostgreSQL database...");
    await ensureInvoicesAndCustomersTablesExist();
    await saveToNeon(payload);
    res.json({ success: true, message: "Database saved to PostgreSQL database successfully!" });
  } catch (error) {
    console.error("CRITICAL error in PostgreSQL save endpoint:", error);
    res.status(500).json({ success: false, error: formatDbErrorMessage(error.message || String(error)) });
  }
});
app.post("/api/save-entry", async (req, res) => {
  const { model, data } = req.body;
  if (!model || !data || !data.id) {
    return res.status(400).json({ success: false, error: "Model, data, and data.id are required" });
  }
  try {
    console.log(`Direct entry save requested: model=${model}, id=${data.id}`);
    await ensureInvoicesAndCustomersTablesExist();
    if (model === "company_profiles") {
      await neon.termsPresets.deleteMany({ where: { companyProfileId: data.id } });
      await neon.companyProfiles.upsert({
        where: { id: data.id },
        update: {
          name: data.name,
          email: data.email || "",
          phone: data.phone,
          address: data.address,
          gstin: data.gstin,
          pan: data.pan,
          state: data.state,
          bankName: data.bankName,
          bankBranch: data.bankBranch,
          accountNo: data.accountNo,
          ifsc: data.ifsc,
          headerImage: data.headerImage,
          footerImage: data.footerImage,
          signatureImage: data.signatureImage,
          template: data.template,
          quotationPrefix: data.quotationPrefix,
          invoicePrefix: data.invoicePrefix,
          challanPrefix: data.challanPrefix,
          nextQuotationNumber: data.nextQuotationNumber || 1,
          nextInvoiceNumber: data.nextInvoiceNumber || 1,
          nextChallanNumber: data.nextChallanNumber || 1,
          enableGst: data.enableGst !== void 0 ? data.enableGst : true,
          profitWithoutGst: data.profitWithoutGst !== void 0 ? data.profitWithoutGst : true,
          updatedAt: /* @__PURE__ */ new Date()
        },
        create: {
          id: data.id,
          name: data.name,
          email: data.email || "",
          phone: data.phone,
          address: data.address,
          gstin: data.gstin,
          pan: data.pan,
          state: data.state,
          bankName: data.bankName,
          bankBranch: data.bankBranch,
          accountNo: data.accountNo,
          ifsc: data.ifsc,
          headerImage: data.headerImage,
          footerImage: data.footerImage,
          signatureImage: data.signatureImage,
          template: data.template,
          quotationPrefix: data.quotationPrefix,
          invoicePrefix: data.invoicePrefix,
          challanPrefix: data.challanPrefix,
          nextQuotationNumber: data.nextQuotationNumber || 1,
          nextInvoiceNumber: data.nextInvoiceNumber || 1,
          nextChallanNumber: data.nextChallanNumber || 1,
          enableGst: data.enableGst !== void 0 ? data.enableGst : true,
          profitWithoutGst: data.profitWithoutGst !== void 0 ? data.profitWithoutGst : true,
          createdAt: data.createdAt ? new Date(data.createdAt) : /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
      if (data.termsPresets && Array.isArray(data.termsPresets)) {
        for (const tp of data.termsPresets) {
          await neon.termsPresets.upsert({
            where: { id: tp.id },
            update: {
              companyProfileId: data.id,
              title: tp.title,
              content: tp.content
            },
            create: {
              id: tp.id,
              companyProfileId: data.id,
              title: tp.title,
              content: tp.content,
              createdAt: data.createdAt ? new Date(data.createdAt) : /* @__PURE__ */ new Date()
            }
          });
        }
      }
    } else if (model === "customers") {
      await neon.customers.upsert({
        where: { id: data.id },
        update: {
          name: data.name,
          company: data.company,
          email: data.email,
          phone: data.phone,
          gstin: data.gstin,
          state: data.state || "Maharashtra",
          billingAddress: data.billingAddress,
          shippingAddress: data.shippingAddress,
          updatedAt: /* @__PURE__ */ new Date()
        },
        create: {
          id: data.id,
          name: data.name,
          company: data.company,
          email: data.email,
          phone: data.phone,
          gstin: data.gstin,
          state: data.state || "Maharashtra",
          billingAddress: data.billingAddress,
          shippingAddress: data.shippingAddress,
          createdAt: data.createdAt ? new Date(data.createdAt) : /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
    } else if (model === "products") {
      await neon.products.upsert({
        where: { id: data.id },
        update: {
          name: data.name || "Unnamed Product",
          sku: data.sku,
          rate: data.rate || 0,
          gstRate: data.gstRate || 18,
          hsnCode: data.hsnCode,
          description: data.description,
          itemType: data.itemType,
          mrp: data.mrp,
          lastPurchasePrice: data.lastPurchasePrice,
          sellPrice: data.sellPrice,
          updatedAt: /* @__PURE__ */ new Date()
        },
        create: {
          id: data.id,
          name: data.name || "Unnamed Product",
          sku: data.sku,
          rate: data.rate || 0,
          gstRate: data.gstRate || 18,
          hsnCode: data.hsnCode,
          description: data.description,
          itemType: data.itemType,
          mrp: data.mrp,
          lastPurchasePrice: data.lastPurchasePrice,
          sellPrice: data.sellPrice,
          createdAt: data.createdAt ? new Date(data.createdAt) : /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
    } else if (model === "quotations") {
      await neon.quotationItems.deleteMany({ where: { quotationId: data.id } });
      if (data.customerId) {
        const custExists = await neon.customers.findUnique({ where: { id: data.customerId } });
        if (!custExists) {
          await neon.customers.create({
            data: {
              id: data.customerId,
              name: "Placeholder Customer",
              state: "Maharashtra",
              updatedAt: /* @__PURE__ */ new Date()
            }
          });
        }
      }
      await neon.quotations.upsert({
        where: { id: data.id },
        update: {
          quotationNo: data.quotationNo,
          date: data.date ? new Date(data.date) : /* @__PURE__ */ new Date(),
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
          customerId: data.customerId,
          subject: data.subject,
          subtotal: data.subtotal || 0,
          discountTotal: data.discountTotal || 0,
          cgstTotal: data.cgstTotal || 0,
          sgstTotal: data.sgstTotal || 0,
          igstTotal: data.igstTotal || 0,
          grandTotal: data.grandTotal || 0,
          status: data.status,
          terms: data.terms,
          companyId: data.companyId || null,
          termsPresetId: data.termsPresetId || null,
          freight: data.freight,
          additionalDiscount: data.additionalDiscount,
          customerSignature: data.customerSignature,
          customerSignedAt: data.customerSignedAt ? new Date(data.customerSignedAt) : null,
          revisionNumber: data.revisionNumber,
          updatedAt: /* @__PURE__ */ new Date()
        },
        create: {
          id: data.id,
          quotationNo: data.quotationNo,
          date: data.date ? new Date(data.date) : /* @__PURE__ */ new Date(),
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
          customerId: data.customerId,
          subject: data.subject,
          subtotal: data.subtotal || 0,
          discountTotal: data.discountTotal || 0,
          cgstTotal: data.cgstTotal || 0,
          sgstTotal: data.sgstTotal || 0,
          igstTotal: data.igstTotal || 0,
          grandTotal: data.grandTotal || 0,
          status: data.status,
          terms: data.terms,
          companyId: data.companyId || null,
          termsPresetId: data.termsPresetId || null,
          freight: data.freight,
          additionalDiscount: data.additionalDiscount,
          customerSignature: data.customerSignature,
          customerSignedAt: data.customerSignedAt ? new Date(data.customerSignedAt) : null,
          revisionNumber: data.revisionNumber,
          createdAt: data.createdAt ? new Date(data.createdAt) : /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          await neon.quotationItems.create({
            data: {
              quotationId: data.id,
              productId: item.productId,
              productName: item.productName || "Product",
              description: item.description,
              hsnCode: item.hsnCode,
              quantity: item.quantity || 1,
              rate: item.rate || 0,
              discountPercent: item.discountPercent || 0,
              gstPercent: item.gstPercent || 18
            }
          });
        }
      }
    } else if (model === "invoices" || model === "proforma_invoices") {
      await neon.invoiceItems.deleteMany({ where: { invoiceId: data.id } });
      if (data.customerId) {
        const custExists = await neon.customers.findUnique({ where: { id: data.customerId } });
        if (!custExists) {
          await neon.customers.create({
            data: {
              id: data.customerId,
              name: "Placeholder Customer",
              state: "Maharashtra",
              updatedAt: /* @__PURE__ */ new Date()
            }
          });
        }
      }
      await neon.invoices.upsert({
        where: { id: data.id },
        update: {
          invoiceNo: data.invoiceNo,
          quotationNo: data.quotationNo,
          date: data.date ? new Date(data.date) : /* @__PURE__ */ new Date(),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          customerId: data.customerId,
          subject: data.subject,
          subtotal: data.subtotal || 0,
          discountTotal: data.discountTotal || 0,
          cgstTotal: data.cgstTotal || 0,
          sgstTotal: data.sgstTotal || 0,
          igstTotal: data.igstTotal || 0,
          grandTotal: data.grandTotal || 0,
          status: data.status,
          terms: data.terms,
          companyId: data.companyId || null,
          termsPresetId: data.termsPresetId || null,
          freight: data.freight,
          additionalDiscount: data.additionalDiscount,
          customerSignature: data.customerSignature,
          customerSignedAt: data.customerSignedAt ? new Date(data.customerSignedAt) : null,
          updatedAt: /* @__PURE__ */ new Date()
        },
        create: {
          id: data.id,
          invoiceNo: data.invoiceNo,
          quotationNo: data.quotationNo,
          date: data.date ? new Date(data.date) : /* @__PURE__ */ new Date(),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          customerId: data.customerId,
          subject: data.subject,
          subtotal: data.subtotal || 0,
          discountTotal: data.discountTotal || 0,
          cgstTotal: data.cgstTotal || 0,
          sgstTotal: data.sgstTotal || 0,
          igstTotal: data.igstTotal || 0,
          grandTotal: data.grandTotal || 0,
          status: data.status,
          terms: data.terms,
          companyId: data.companyId || null,
          termsPresetId: data.termsPresetId || null,
          freight: data.freight,
          additionalDiscount: data.additionalDiscount,
          customerSignature: data.customerSignature,
          customerSignedAt: data.customerSignedAt ? new Date(data.customerSignedAt) : null,
          createdAt: data.createdAt ? new Date(data.createdAt) : /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          await neon.invoiceItems.create({
            data: {
              invoiceId: data.id,
              productId: item.productId,
              productName: item.productName || "Product",
              description: item.description,
              hsnCode: item.hsnCode,
              quantity: item.quantity || 1,
              rate: item.rate || 0,
              discountPercent: item.discountPercent || 0,
              gstPercent: item.gstPercent || 18
            }
          });
        }
      }
    } else if (model === "challans") {
      await neon.deliveryChallanItems.deleteMany({ where: { deliveryChallanId: data.id } });
      if (data.customerId) {
        const custExists = await neon.customers.findUnique({ where: { id: data.customerId } });
        if (!custExists) {
          await neon.customers.create({
            data: {
              id: data.customerId,
              name: "Placeholder Customer",
              state: "Maharashtra",
              updatedAt: /* @__PURE__ */ new Date()
            }
          });
        }
      }
      await neon.deliveryChallans.upsert({
        where: { id: data.id },
        update: {
          challanNo: data.challanNo,
          date: data.date ? new Date(data.date) : /* @__PURE__ */ new Date(),
          customerId: data.customerId,
          vehicleNo: data.vehicleNo,
          transporter: data.transporter,
          lrNumber: data.lrNumber,
          dispatchAddress: data.dispatchAddress,
          status: data.status,
          notes: data.notes,
          companyId: data.companyId || null,
          updatedAt: /* @__PURE__ */ new Date()
        },
        create: {
          id: data.id,
          challanNo: data.challanNo,
          date: data.date ? new Date(data.date) : /* @__PURE__ */ new Date(),
          customerId: data.customerId,
          vehicleNo: data.vehicleNo,
          transporter: data.transporter,
          lrNumber: data.lrNumber,
          dispatchAddress: data.dispatchAddress,
          status: data.status,
          notes: data.notes,
          companyId: data.companyId || null,
          createdAt: data.createdAt ? new Date(data.createdAt) : /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          await neon.deliveryChallanItems.create({
            data: {
              deliveryChallanId: data.id,
              productName: item.productName || "Product",
              quantity: item.quantity || 1,
              hsnCode: item.hsnCode,
              description: item.description
            }
          });
        }
      }
    } else if (model === "leads") {
      await neon.leads.upsert({
        where: { id: data.id },
        update: {
          customerId: data.customerId || null,
          name: data.name,
          company: data.company,
          email: data.email,
          phone: data.phone,
          value: data.value || 0,
          status: data.status,
          source: data.source,
          notes: data.notes,
          date: data.date ? new Date(data.date) : null,
          conversionStatus: data.conversionStatus,
          updatedAt: /* @__PURE__ */ new Date()
        },
        create: {
          id: data.id,
          customerId: data.customerId || null,
          name: data.name,
          company: data.company,
          email: data.email,
          phone: data.phone,
          value: data.value || 0,
          status: data.status,
          source: data.source,
          notes: data.notes,
          date: data.date ? new Date(data.date) : null,
          conversionStatus: data.conversionStatus,
          createdAt: data.createdAt ? new Date(data.createdAt) : /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
    } else if (model === "subscriptions") {
      if (data.customerId) {
        const custExists = await neon.customers.findUnique({ where: { id: data.customerId } });
        if (!custExists) {
          await neon.customers.create({
            data: {
              id: data.customerId,
              name: "Placeholder Customer",
              state: "Maharashtra",
              updatedAt: /* @__PURE__ */ new Date()
            }
          });
        }
      }
      await neon.subscriptions.upsert({
        where: { id: data.id },
        update: {
          customerId: data.customerId,
          serviceName: data.serviceName,
          amount: data.amount || 0,
          billingCycle: data.billingCycle,
          startDate: data.startDate ? new Date(data.startDate) : /* @__PURE__ */ new Date(),
          nextRenewalDate: data.nextRenewalDate ? new Date(data.nextRenewalDate) : /* @__PURE__ */ new Date(),
          status: data.status,
          description: data.description,
          updatedAt: /* @__PURE__ */ new Date()
        },
        create: {
          id: data.id,
          customerId: data.customerId,
          serviceName: data.serviceName,
          amount: data.amount || 0,
          billingCycle: data.billingCycle,
          startDate: data.startDate ? new Date(data.startDate) : /* @__PURE__ */ new Date(),
          nextRenewalDate: data.nextRenewalDate ? new Date(data.nextRenewalDate) : /* @__PURE__ */ new Date(),
          status: data.status,
          description: data.description,
          createdAt: data.createdAt ? new Date(data.createdAt) : /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
    } else if (model === "reminders") {
      await neon.reminders.upsert({
        where: { id: data.id },
        update: {
          title: data.title,
          description: data.description,
          dueDate: data.dueDate ? new Date(data.dueDate) : /* @__PURE__ */ new Date(),
          status: data.status,
          priority: data.priority,
          relatedTo: data.relatedTo,
          subscriptionId: data.subscriptionId || null,
          customerId: data.customerId || null,
          updatedAt: /* @__PURE__ */ new Date()
        },
        create: {
          id: data.id,
          title: data.title,
          description: data.description,
          dueDate: data.dueDate ? new Date(data.dueDate) : /* @__PURE__ */ new Date(),
          status: data.status,
          priority: data.priority,
          relatedTo: data.relatedTo,
          subscriptionId: data.subscriptionId || null,
          customerId: data.customerId || null,
          createdAt: data.createdAt ? new Date(data.createdAt) : /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
    } else if (model === "inventory") {
      const cleanSku = data.sku ? data.sku.toUpperCase().trim() : "";
      const cleanQuantity = Number(data.quantity) || 0;
      const cleanMinQty = Number(data.minQuantity) || 0;
      const cleanUnitPrice = Number(data.unitPrice) || 0;
      const cleanLatestPurchasePrice = data.latestPurchasePrice !== void 0 && data.latestPurchasePrice !== null && data.latestPurchasePrice !== "" ? Number(data.latestPurchasePrice) : null;
      await neon.inventoryLogs.deleteMany({ where: { inventoryItemId: data.id } });
      if (cleanSku) {
        const prodExists = await neon.products.findUnique({ where: { sku: cleanSku } });
        if (!prodExists) {
          const placeholderId = `prod_placeholder_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          await neon.products.create({
            data: {
              id: placeholderId,
              name: data.productName || `Product for SKU ${cleanSku}`,
              sku: cleanSku,
              rate: cleanUnitPrice || 0,
              gstRate: 18,
              description: "Automatically created placeholder product for inventory item",
              updatedAt: /* @__PURE__ */ new Date()
            }
          });
        }
      }
      await neon.inventoryItems.upsert({
        where: { id: data.id },
        update: {
          sku: cleanSku,
          productName: data.productName || "Product",
          category: data.category || null,
          quantity: cleanQuantity,
          minQuantity: cleanMinQty,
          purchaseFrom: data.purchaseFrom || null,
          unitPrice: cleanUnitPrice,
          latestPurchasePrice: cleanLatestPurchasePrice,
          lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : /* @__PURE__ */ new Date()
        },
        create: {
          id: data.id,
          sku: cleanSku,
          productName: data.productName || "Product",
          category: data.category || null,
          quantity: cleanQuantity,
          minQuantity: cleanMinQty,
          purchaseFrom: data.purchaseFrom || null,
          unitPrice: cleanUnitPrice,
          latestPurchasePrice: cleanLatestPurchasePrice,
          lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : /* @__PURE__ */ new Date(),
          createdAt: data.createdAt ? new Date(data.createdAt) : /* @__PURE__ */ new Date()
        }
      });
      if (data.logs && Array.isArray(data.logs)) {
        for (const log of data.logs) {
          await neon.inventoryLogs.create({
            data: {
              id: log.id || "log_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now(),
              inventoryItemId: data.id,
              date: log.date ? new Date(log.date) : /* @__PURE__ */ new Date(),
              type: log.type || "IN",
              quantity: Number(log.quantity) || 0,
              reason: log.reason || null,
              prevQty: Number(log.prevQty) || 0,
              newQty: Number(log.newQty) || 0,
              supplierName: log.supplierName || null,
              customerName: log.customerName || null
            }
          });
        }
      }
    }
    res.json({ success: true, message: `Successfully saved ${model} entry` });
  } catch (error) {
    console.error(`Direct save failed for model ${model}:`, error);
    res.status(500).json({ success: false, error: formatDbErrorMessage(error.message || String(error)) });
  }
});
app.post("/api/db/delete", async (req, res) => {
  const { model, id } = req.body;
  if (!model || !id) {
    return res.status(400).json({ success: false, error: "Model and id are required" });
  }
  try {
    console.log(`Direct entry delete requested: model=${model}, id=${id}`);
    if (model === "customers") {
      await neon.customers.delete({ where: { id } });
    } else if (model === "products") {
      await neon.products.delete({ where: { id } });
    } else if (model === "quotations") {
      await neon.quotationItems.deleteMany({ where: { quotationId: id } });
      await neon.quotations.delete({ where: { id } });
    } else if (model === "invoices" || model === "proforma_invoices") {
      await neon.invoiceItems.deleteMany({ where: { invoiceId: id } });
      await neon.invoices.delete({ where: { id } });
    } else if (model === "challans") {
      await neon.deliveryChallanItems.deleteMany({ where: { deliveryChallanId: id } });
      await neon.deliveryChallans.delete({ where: { id } });
    } else if (model === "leads") {
      await neon.leads.delete({ where: { id } });
    } else if (model === "subscriptions") {
      await neon.subscriptions.delete({ where: { id } });
    } else if (model === "reminders") {
      await neon.reminders.delete({ where: { id } });
    } else if (model === "inventory") {
      await neon.inventoryLogs.deleteMany({ where: { inventoryItemId: id } });
      await neon.inventoryItems.delete({ where: { id } });
    } else if (model === "company_profiles") {
      await neon.termsPresets.deleteMany({ where: { companyProfileId: id } });
      await neon.companyProfiles.delete({ where: { id } });
    }
    res.json({ success: true, message: `Deleted ${id} from ${model}` });
  } catch (error) {
    console.error(`Direct delete failed for ${model}:`, error);
    res.status(500).json({ success: false, error: formatDbErrorMessage(error.message || String(error)) });
  }
});
app.get("/api/db/test-connection", async (req, res) => {
  try {
    await neon.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      connected: true,
      message: "Successfully connected to the live PostgreSQL database!"
    });
  } catch (error) {
    console.error("[Database Test] Connection test failed:", error);
    res.json({
      success: false,
      connected: false,
      error: formatDbErrorMessage(error.message || String(error))
    });
  }
});
app.post("/api/db/init-schema", async (req, res) => {
  const { force } = req.body;
  try {
    const url = process.env.DATABASE_URL || "";
    if (!url || url.includes("******") || url.includes("%2A%2A%2A%2A%2A%2A")) {
      return res.status(400).json({ success: false, error: "Database not configured or credentials are still masked." });
    }
    const expectedTables = [
      "inventory_logs",
      "inventory_items",
      "reminders",
      "subscriptions",
      "leads",
      "delivery_challan_items",
      "delivery_challans",
      "invoice_items",
      "invoices",
      "quotation_items",
      "quotations",
      "subscription_policies",
      "terms_presets",
      "products",
      "customers",
      "company_profiles",
      "user_profiles",
      "app_data"
    ];
    if (force) {
      console.log("[Schema Push] Force flag specified. Dropping existing tables cascade style...");
      for (const table of expectedTables) {
        try {
          await pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
          console.log(`[Schema Push] Dropped table ${table} successfully.`);
        } catch (dropErr) {
          console.warn(`[Schema Push] Non-blocking warning dropping table ${table}:`, dropErr.message || dropErr);
        }
      }
    }
    const filePath = import_path2.default.join(process.cwd(), "table_creation_queries.sql");
    if (!import_fs2.default.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "table_creation_queries.sql not found." });
    }
    const sqlContent = import_fs2.default.readFileSync(filePath, "utf-8");
    const statements = sqlContent.split(";");
    console.log(`[Schema Push] Found ${statements.length} SQL statements. Executing...`);
    let executedCount = 0;
    let skippedCount = 0;
    for (let statement of statements) {
      const lines = statement.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("--") && !line.startsWith("\u25C7"));
      const cleanStmt = lines.join(" ").trim();
      if (!cleanStmt) {
        continue;
      }
      try {
        await pool.query(cleanStmt);
        executedCount++;
      } catch (stmtErr) {
        if (stmtErr.message && (stmtErr.message.includes("already exists") || stmtErr.message.includes("already a relation"))) {
          skippedCount++;
          continue;
        }
        throw stmtErr;
      }
    }
    await seedDefaultUsers();
    res.json({
      success: true,
      message: `Database schema successfully pushed! Executed ${executedCount} statements.`,
      executedCount,
      skippedCount
    });
  } catch (error) {
    console.error("[Schema Push] Failed to push schema:", error);
    res.status(500).json({
      success: false,
      error: formatDbErrorMessage(error.message || String(error))
    });
  }
});
app.get("/api/db/get", async (req, res) => {
  try {
    console.log("Fetching database directly from PostgreSQL database...");
    const result = await getFromNeon();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("CRITICAL error fetching database from PostgreSQL:", error);
    res.status(500).json({
      success: false,
      error: formatDbErrorMessage(error.message || String(error))
    });
  }
});
app.get("/api/amazon/orders", async (req, res) => {
  try {
    const ordersMap = /* @__PURE__ */ new Map();
    try {
      const metaRes = await neon.appData.findUnique({ where: { key: "amazon_orders_meta" } });
      if (metaRes && metaRes.dataJson) {
        const metaData = JSON.parse(metaRes.dataJson);
        const chunkCount = metaData.chunkCount || 0;
        if (chunkCount > 0) {
          const chunkPromises = [];
          for (let i = 0; i < chunkCount; i++) {
            chunkPromises.push(neon.appData.findUnique({ where: { key: `amazon_orders_chunk_${i}` } }));
          }
          const chunkResults = await Promise.all(chunkPromises);
          for (const chunkRes of chunkResults) {
            if (chunkRes && chunkRes.dataJson) {
              const chunkData = JSON.parse(chunkRes.dataJson);
              if (chunkData && chunkData.orders && Array.isArray(chunkData.orders)) {
                for (const o of chunkData.orders) {
                  if (o && o.orderId) {
                    ordersMap.set(o.orderId, o);
                  }
                }
              }
            }
          }
        }
      }
    } catch (chunkErr) {
      console.warn("Failed to fetch chunked Amazon orders from PostgreSQL:", chunkErr);
    }
    const finalOrders = Array.from(ordersMap.values());
    finalOrders.sort((a, b) => {
      const dateA = new Date(a.purchaseDate || 0).getTime();
      const dateB = new Date(b.purchaseDate || 0).getTime();
      return dateB - dateA;
    });
    res.json({ success: true, data: finalOrders });
  } catch (err) {
    console.error("Firestore Amazon orders query failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/amazon/orders", async (req, res) => {
  const { orders } = req.body || {};
  if (!orders || !Array.isArray(orders)) {
    return res.status(400).json({ success: false, error: "Orders array is required" });
  }
  try {
    const ordersMap = /* @__PURE__ */ new Map();
    for (const order of orders) {
      if (order && order.orderId) {
        ordersMap.set(order.orderId, order);
      }
    }
    const mergedOrders = Array.from(ordersMap.values());
    mergedOrders.sort((a, b) => {
      const dateA = new Date(a.purchaseDate || 0).getTime();
      const dateB = new Date(b.purchaseDate || 0).getTime();
      return dateB - dateA;
    });
    const cappedOrders = mergedOrders.slice(0, 4e3);
    res.json({ success: true, data: cappedOrders });
    const backgroundTask = (async () => {
      try {
        const metaRes = await neon.appData.findUnique({ where: { key: "amazon_orders_meta" } });
        const prevChunkCount = metaRes?.dataJson ? JSON.parse(metaRes.dataJson)?.chunkCount || 0 : 0;
        const chunkSize = 1e3;
        const newChunkCount = Math.ceil(cappedOrders.length / chunkSize);
        for (let c = 0; c < newChunkCount; c++) {
          const chunkData = cappedOrders.slice(c * chunkSize, (c + 1) * chunkSize);
          await neon.appData.upsert({
            where: { key: `amazon_orders_chunk_${c}` },
            update: { dataJson: JSON.stringify({ orders: chunkData }), updatedAt: (/* @__PURE__ */ new Date()).toISOString() },
            create: { key: `amazon_orders_chunk_${c}`, dataJson: JSON.stringify({ orders: chunkData }), updatedAt: (/* @__PURE__ */ new Date()).toISOString() }
          });
        }
        await neon.appData.upsert({
          where: { key: "amazon_orders_meta" },
          update: {
            dataJson: JSON.stringify({
              chunkCount: newChunkCount,
              totalCount: cappedOrders.length,
              lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
            })
          },
          create: {
            key: "amazon_orders_meta",
            dataJson: JSON.stringify({
              chunkCount: newChunkCount,
              totalCount: cappedOrders.length,
              lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
            })
          }
        });
        if (prevChunkCount > newChunkCount) {
          for (let p = newChunkCount; p < prevChunkCount; p++) {
            await neon.appData.delete({ where: { key: `amazon_orders_chunk_${p}` } }).catch(() => {
            });
          }
        }
        console.log(`[Background Sync] Successfully updated ${cappedOrders.length} orders in Neon cloud storage.`);
      } catch (postgresWriteErr) {
        console.error("[Background Sync] Cloud backup failed:", postgresWriteErr.message);
      }
    })();
    if (process.env.VERCEL) {
      await backgroundTask;
    }
  } catch (err) {
    console.error("Error updating Amazon orders:", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});
app.get("/api/gst/fetch", async (req, res) => {
  try {
    const { gstin } = req.query;
    if (!gstin || typeof gstin !== "string") {
      return res.status(400).json({ success: false, error: "GSTIN is required" });
    }
    const cleanGstin = gstin.trim().toUpperCase();
    if (cleanGstin.length !== 15) {
      return res.status(400).json({ success: false, error: "GSTIN must be exactly 15 characters long" });
    }
    const stateCode = cleanGstin.substring(0, 2);
    const stateName = gstStateCodes[stateCode] || "Maharashtra";
    try {
      const appyflowUrl = `https://sheet.appyflow.in/api/verifyGST?gstin=${cleanGstin}&key=free`;
      const response = await fetch(appyflowUrl, { signal: AbortSignal.timeout(1200) });
      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const respJson = await response.json();
          if (respJson && !respJson.error && respJson.taxpayerInfo) {
            const info = respJson.taxpayerInfo;
            const companyName = info.tradeNam || info.lgnm || `Gst Business (${cleanGstin.substring(2, 10)})`;
            const legalName = info.lgnm || "Authorized Representative";
            const dbaState = info.prb?.state || stateName;
            const streetAddr = [
              info.prb?.bno,
              info.prb?.bnm,
              info.prb?.st,
              info.prb?.loc,
              info.prb?.dst,
              info.prb?.pncd
            ].filter(Boolean).join(", ");
            const address = streetAddr || `${dbaState}, India`;
            console.log(`GSTIN "${cleanGstin}" successfully fetched using live free Appyflow API!`);
            return res.json({
              success: true,
              data: {
                company: companyName,
                name: legalName,
                email: `${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}@gmail.com`,
                phone: "+91 98765 43210",
                state: dbaState,
                billingAddress: address,
                shippingAddress: address,
                gstin: cleanGstin,
                source: "live_registry"
              }
            });
          }
        } else {
          console.warn("Appyflow response is not JSON, bypassing.");
        }
      }
    } catch (apiErr) {
      console.warn("Appyflow live lookup bypassed/failed (expected on free tier), falling back:", apiErr.message || apiErr);
    }
    try {
      const ai = getAI();
      if (!ai) {
        throw new Error("Gemini AI API key not configured");
      }
      const prompt = `You are a professional Indian corporate compliance officer and taxpayer data expert.
Synthesize structurally authentic, highly realistic Indian corporate taxpayer details for the GSTIN: "${cleanGstin}".
Indian State: "${stateName}" (State Code: "${stateCode}").

The business name should sound like an authentic, real Indian corporate taxpayer matching the state (e.g. matching major business names, trade labels, or random realistic enterprise names like "Naman Logistics Pvt Ltd", "Bajaj Auto Sales", "Devi Trading Company", "Arun Agro Industries", "Shree Balaji Textiles", etc.).
Construct a highly realistic street address in ${stateName}, complete with building name, shop/office number, street, industrial area/commercial hub, city, and correct PIN code matching ${stateName}.

Return response in strict JSON format (do NOT wrap in markdown \`\`\`json or any extra text, strictly output raw valid JSON):
{
  "company": "Trading Name or Business Name",
  "name": "Legal Registered Name (e.g., Authorized Proprietor or Director Name)",
  "email": "contact@businessdomain.in",
  "phone": "+91 98765 43210",
  "state": "${stateName}",
  "billingAddress": "Realistic complete billing address in ${stateName}, India",
  "shippingAddress": "Realistic complete shipping address in ${stateName}, India",
  "gstin": "${cleanGstin}"
}`;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      const responseText = response.text || "";
      const parsedData = JSON.parse(responseText.trim());
      console.log(`GSTIN "${cleanGstin}" successfully synthesized using Gemini 3.5 Flash!`);
      return res.json({
        success: true,
        data: {
          ...parsedData,
          source: "gemini_synthesis"
        }
      });
    } catch (aiErr) {
      console.error("Gemini synthesis fallback failed, using local deterministic fallback:", aiErr.message || aiErr);
      const defaultCompanyName = `Enterprise ${cleanGstin.substring(2, 6)} Trading`;
      const fallbackAddress = `Sector 4, Industrial Area, Noida, ${stateName}, India`;
      return res.json({
        success: true,
        data: {
          company: defaultCompanyName,
          name: "Proprietor Representative",
          email: `${defaultCompanyName.toLowerCase().replace(/[^a-z0-9]/g, "")}@gmail.com`,
          phone: "+91 98765 43210",
          state: stateName,
          billingAddress: fallbackAddress,
          shippingAddress: fallbackAddress,
          gstin: cleanGstin,
          source: "local_deterministic_fallback"
        }
      });
    }
  } catch (globalErr) {
    console.error("Critical error in /api/gst/fetch route:", globalErr);
    return res.status(500).json({ success: false, error: globalErr.message || "Unknown error during GST fetch" });
  }
});
app.post("/api/marketing/generate", async (req, res) => {
  const { productName, description, rate, sku, theme } = req.body;
  if (!productName) {
    return res.status(400).json({ success: false, error: "Product name is required" });
  }
  const selectedTheme = theme || "Professional & Trustworthy";
  try {
    const prompt = `You are a high-converting professional marketing copywriter. Generate promotional ad content and a WhatsApp message for the following product:
- Product Name: ${productName}
- SKU: ${sku || "N/A"}
- Price / Rate: INR ${rate || "On Request"}
- Original details: ${description || "N/A"}
- Marketing Tone / Theme: ${selectedTheme}

Return response purely in JSON format (do NOT wrap in markdown \`\`\`json or any extra text, strictly output raw valid JSON):
{
  "headline": "A short, extremely catchy, high-impact headline",
  "subheading": "A secondary tag line or sub-header to build excitement",
  "highlights": [
    "Compelling benefit or key feature 1",
    "Compelling benefit or key feature 2",
    "Compelling benefit or key feature 3"
  ],
  "whatsappText": "A complete, beautifully formatted promotional WhatsApp broadcast message. Use friendly emojis, clean paragraph spacings, and standard styling (e.g. *bold text* using asterisks) tailored to double sales. Include the price (INR ${rate || "On Request"}) and a clear call-to-action to reply!"
}`;
    const ai = getAI();
    if (!ai) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    const responseText = response.text || "";
    const parsedData = JSON.parse(responseText.trim());
    res.json({
      success: true,
      data: parsedData
    });
  } catch (err) {
    console.error("Gemini marketing synthesis failed:", err);
    res.json({
      success: true,
      data: {
        headline: `Premium Quality ${productName}!`,
        subheading: `Benchmark engineering crafted to support your core operations.`,
        highlights: [
          `Built for maximum uptime & optimized output.`,
          `Unmatched manufacturing standards and design specs.`,
          `Complete client satisfaction guarantee with corporate warranty.`
        ],
        whatsappText: `*\u2728 Special Product Spotlight: ${productName.toUpperCase()} \u2728*

Deliver the absolute best to your workshop or operations with our flagship choice!

*Highlight features:*
\u2705 Heavy-duty standard certification
\u2705 Expertly designed for performance durability
\u2705 Best-in-class value for INR ${rate || "On Request"}

\u{1F4AC} *Interested? Reply directly to this WhatsApp message, and our sales team will finalize your dispatch details!*`
      }
    });
  }
});
app.post("/api/marketing/generate-image", async (req, res) => {
  const { productName, promptOverride } = req.body;
  if (!productName) {
    return res.status(400).json({ success: false, error: "Product name is required" });
  }
  try {
    const ai = getAI();
    if (!ai) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    const promptText = promptOverride || `Professional high-quality product photography of a ${productName}. Clean studio lighting, white background, minimalist and high contrast, photorealistic, 4k.`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: promptText }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });
    let base64EncodeString = "";
    if (response.candidates && response.candidates.length > 0 && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64EncodeString = part.inlineData.data;
          break;
        }
      }
    }
    if (base64EncodeString) {
      res.json({
        success: true,
        imageUrl: `data:image/png;base64,${base64EncodeString}`
      });
    } else {
      throw new Error("Failed to extract image data from Model Response");
    }
  } catch (err) {
    console.error("Gemini image generation failed:", err);
    res.json({
      success: true,
      imageUrl: `https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop`
    });
  }
});
app.get("/api/users", async (req, res) => {
  try {
    const users = await neon.userProfiles.findMany();
    const profiles = users.map((u) => ({
      ...u,
      rights: u.rights ? JSON.parse(u.rights) : {}
    }));
    fallbackUsers = profiles;
    res.json({ success: true, users: profiles });
  } catch (err) {
    if (isDbConnectionOrSchemaError(err)) {
      console.log("[Database] Operating in sandbox offline mode (user profiles falling back to in-memory).");
      return res.json({
        success: true,
        users: fallbackUsers,
        isFallbackMode: true,
        dbError: formatDbErrorMessage(err.message || String(err))
      });
    }
    console.error("CRITICAL error fetching users from PostgreSQL:", err);
    res.status(500).json({ success: false, error: formatDbErrorMessage(err.message || String(err)) });
  }
});
app.post("/api/users/create", async (req, res) => {
  const { email, password, name, role, rights } = req.body;
  const userId = "user_" + Math.random().toString(36).substring(2, 15);
  const resolvedRole = role || "Employee";
  const userProfile = {
    id: userId,
    name: name || "New User",
    email: email || "",
    role: resolvedRole,
    password: password || "pass",
    isActive: true,
    rights: rights ? JSON.stringify(rights) : "{}",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    const newUser = await neon.userProfiles.create({ data: userProfile });
    res.json({ success: true, user: { ...newUser, rights: rights || {} } });
  } catch (err) {
    if (isDbConnectionOrSchemaError(err)) {
      console.log("[Database] Operating in sandbox offline mode (user creation falling back to in-memory).");
      const newUserFallback = {
        ...userProfile,
        rights: rights || {}
      };
      fallbackUsers.push(newUserFallback);
      return res.json({ success: true, user: newUserFallback, isFallbackMode: true });
    }
    console.error("Error creating backend user in PostgreSQL:", err);
    res.status(400).json({ success: false, error: formatDbErrorMessage(err.message || String(err)) });
  }
});
app.post("/api/users/update", async (req, res) => {
  const { id, name, role, password, isActive, rights } = req.body;
  try {
    const updateData = {};
    if (name !== void 0) updateData.name = name;
    if (role !== void 0) updateData.role = role;
    if (password !== void 0) updateData.password = password;
    if (isActive !== void 0) updateData.isActive = isActive;
    if (rights !== void 0) updateData.rights = JSON.stringify(rights);
    await neon.userProfiles.update({
      where: { id },
      data: updateData
    });
    res.json({ success: true });
  } catch (err) {
    if (isDbConnectionOrSchemaError(err)) {
      console.log("[Database] Operating in sandbox offline mode (user update falling back to in-memory).");
      const userIdx = fallbackUsers.findIndex((u) => u.id === id);
      if (userIdx !== -1) {
        if (name !== void 0) fallbackUsers[userIdx].name = name;
        if (role !== void 0) fallbackUsers[userIdx].role = role;
        if (password !== void 0) fallbackUsers[userIdx].password = password;
        if (isActive !== void 0) fallbackUsers[userIdx].isActive = isActive;
        if (rights !== void 0) fallbackUsers[userIdx].rights = rights;
      }
      return res.json({ success: true, isFallbackMode: true });
    }
    console.error("Error updating backend user in PostgreSQL:", err);
    res.status(400).json({ success: false, error: formatDbErrorMessage(err.message || String(err)) });
  }
});
app.post("/api/users/delete", async (req, res) => {
  const { id } = req.body;
  try {
    await neon.userProfiles.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    if (isDbConnectionOrSchemaError(err)) {
      console.log("[Database] Operating in sandbox offline mode (user deletion falling back to in-memory).");
      fallbackUsers = fallbackUsers.filter((u) => u.id !== id);
      return res.json({ success: true, isFallbackMode: true });
    }
    console.error("Error deleting backend user from PostgreSQL:", err);
    res.status(400).json({ success: false, error: formatDbErrorMessage(err.message || String(err)) });
  }
});
app.post("/api/users/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const users = await neon.userProfiles.findMany();
    const foundUser = users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (!foundUser) {
      return res.status(401).json({ success: false, error: "Incorrect email address or password" });
    }
    if (foundUser.password !== password) {
      return res.status(401).json({ success: false, error: "Incorrect email address or password" });
    }
    if (!foundUser.isActive) {
      return res.status(403).json({ success: false, error: "This user account is inactive" });
    }
    res.json({ success: true, user: { ...foundUser, rights: foundUser.rights ? JSON.parse(foundUser.rights) : {} } });
  } catch (err) {
    if (isDbConnectionOrSchemaError(err)) {
      console.log("[Database] Operating in sandbox offline mode (user login falling back to in-memory).");
      const foundUser = fallbackUsers.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (!foundUser) {
        return res.status(401).json({ success: false, error: "Incorrect email address or password" });
      }
      if (foundUser.password !== password) {
        return res.status(401).json({ success: false, error: "Incorrect email address or password" });
      }
      if (!foundUser.isActive) {
        return res.status(403).json({ success: false, error: "This user account is inactive" });
      }
      return res.json({ success: true, user: foundUser, isFallbackMode: true });
    }
    console.error("Error logging in backend user against PostgreSQL:", err);
    res.status(401).json({ success: false, error: "Login failed: " + formatDbErrorMessage(err.message || String(err)) });
  }
});
app.post("/api/send-email", async (req, res) => {
  const { to, subject, text, pdfBase64, filename } = req.body;
  try {
    let transporter;
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = import_nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      console.log("No SMTP credentials found. Creating Ethereal test account...");
      const testAccount = await import_nodemailer.default.createTestAccount();
      transporter = import_nodemailer.default.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    }
    const pdfData = pdfBase64.split("base64,")[1] || pdfBase64;
    const pdfBuffer = Buffer.from(pdfData, "base64");
    const info = await transporter.sendMail({
      from: '"Sales Application" <sales@application.local>',
      to,
      subject,
      text,
      attachments: [
        {
          filename: filename || "document.pdf",
          content: pdfBuffer,
          contentType: "application/pdf"
        }
      ]
    });
    const previewUrl = import_nodemailer.default.getTestMessageUrl(info);
    if (previewUrl) {
      console.log("Message sent: %s", info.messageId);
      console.log("Preview URL: %s", previewUrl);
    }
    res.json({ success: true, messageId: info.messageId, previewUrl });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ success: false, error: "Failed to send email" });
  }
});
var DEFAULT_ADMIN = {
  id: "admin_default",
  name: "System Administrator",
  email: "admin@application.local",
  password: "pass",
  role: "Admin",
  isActive: true,
  rights: {
    dashboard: true,
    quotations: true,
    proforma: true,
    challans: true,
    leads: true,
    customers: true,
    products: true,
    inventory: true,
    subscriptions: true,
    reminders: true,
    amazonSeller: true,
    catalogues: true,
    settings: true
  },
  createdAt: (/* @__PURE__ */ new Date()).toISOString()
};
var DEFAULT_RAJAN = {
  id: "rajan_default",
  name: "Rajan Ghanshyam",
  email: "rajan@devinfotech.net",
  password: "Devansh@2007",
  role: "Admin",
  isActive: true,
  rights: {
    dashboard: true,
    quotations: true,
    proforma: true,
    challans: true,
    leads: true,
    customers: true,
    products: true,
    inventory: true,
    subscriptions: true,
    reminders: true,
    amazonSeller: true,
    catalogues: true,
    settings: true
  },
  createdAt: (/* @__PURE__ */ new Date()).toISOString()
};
var fallbackUsers = [
  { ...DEFAULT_ADMIN },
  { ...DEFAULT_RAJAN }
];
async function seedDefaultUsers() {
  const url = process.env.DATABASE_URL || "";
  if (!url || url.includes("******") || url.includes("%2A%2A%2A%2A%2A%2A")) {
    console.log("[Seeding] Bypassing user seeding: Database is unconfigured or masked (Sandbox offline mode active).");
    return;
  }
  try {
    const adminExists = await neon.userProfiles.findUnique({ where: { id: "admin_default" } });
    if (!adminExists) {
      await neon.userProfiles.create({
        data: {
          id: DEFAULT_ADMIN.id,
          name: DEFAULT_ADMIN.name,
          email: DEFAULT_ADMIN.email,
          role: DEFAULT_ADMIN.role,
          password: DEFAULT_ADMIN.password,
          isActive: DEFAULT_ADMIN.isActive,
          rights: JSON.stringify(DEFAULT_ADMIN.rights)
        }
      });
      console.log("Seeded default admin in Neon PostgreSQL.");
    }
    const rajanExists = await neon.userProfiles.findUnique({ where: { id: "rajan_default" } });
    if (!rajanExists) {
      await neon.userProfiles.create({
        data: {
          id: DEFAULT_RAJAN.id,
          name: DEFAULT_RAJAN.name,
          email: DEFAULT_RAJAN.email,
          role: DEFAULT_RAJAN.role,
          password: DEFAULT_RAJAN.password,
          isActive: DEFAULT_RAJAN.isActive,
          rights: JSON.stringify(DEFAULT_RAJAN.rights)
        }
      });
      console.log("Seeded Rajan user in Neon PostgreSQL.");
    }
  } catch (error) {
    if (error.message && error.message.includes("relation")) {
      console.log("[Seeding] Database table 'user_profiles' does not exist yet. Seeding bypassed.");
    } else {
      console.log("[Seeding] Neon PostgreSQL user seeding bypassed:\n" + formatDbErrorMessage(error.message || String(error)));
    }
  }
}
async function startServer() {
  try {
    await performSchemaMigrationCheck();
    await seedDatabaseIfEmpty();
    await seedDefaultUsers();
  } catch (e) {
    if (isDbConnectionOrSchemaError(e)) {
      console.log("[Database] Database is unconfigured, masked, or unmigrated. Sandbox offline mode enabled.");
    } else {
      console.log(`[Database] Database check bypassed: ${e.message}. Sandbox offline mode enabled.`);
    }
  }
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
if (process.env.VERCEL) {
  const distPath = import_path2.default.join(process.cwd(), "dist");
  app.use(import_express.default.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(import_path2.default.join(distPath, "index.html"));
  });
} else {
  startServer();
}
var server_default = app;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  formatDbErrorMessage,
  isDbConnectionOrSchemaError
});
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
