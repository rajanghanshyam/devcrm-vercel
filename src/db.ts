import './env';
import pg from 'pg';

// Set up type parser to parse decimal/numeric columns as floating-point numbers
pg.types.setTypeParser(1700, function(val) {
  return parseFloat(val);
});

let _pool: pg.Pool | null = null;

function getPoolInstance(): pg.Pool {
  let url = process.env.DATABASE_URL || '';
  let unpooledUrl = process.env.DATABASE_URL_UNPOOLED || '';

  // Determine the best URL to use (prefer non-empty, non-masked)
  let selectedUrl = '';
  const isMasked = (str: string) => str.includes('******') || str.includes('%2A%2A%2A%2A%2A%2A');

  if (url && !isMasked(url)) {
    selectedUrl = url;
  } else if (unpooledUrl && !isMasked(unpooledUrl)) {
    selectedUrl = unpooledUrl;
  } else if (url) {
    selectedUrl = url; // Fallback to DATABASE_URL even if masked
  } else if (unpooledUrl) {
    selectedUrl = unpooledUrl; // Fallback to DATABASE_URL_UNPOOLED even if masked
  }

  if (!selectedUrl) {
    throw new Error("DB_NOT_CONFIGURED");
  }

  if (isMasked(selectedUrl)) {
    throw new Error("DB_MASKED");
  }

  const isPostgres = selectedUrl.startsWith('postgres://') || selectedUrl.startsWith('postgresql://');
  if (!isPostgres) {
    throw new Error("DB_NOT_CONFIGURED");
  }

  if (!_pool) {
    const config: pg.PoolConfig = {
      connectionString: selectedUrl,
    };

    // Configure SSL for cloud hosted PostgreSQL databases if sslmode or ssl is specified, or default to true for Neon
    if (selectedUrl.includes('sslmode=') || selectedUrl.includes('ssl=true') || selectedUrl.includes('neon.tech')) {
      config.ssl = {
        rejectUnauthorized: false
      };
    }

    try {
      _pool = new pg.Pool(config);
    } catch (e: any) {
      console.error("Failed to initialize pg Pool:", e);
      throw new Error(`Failed to initialize connection pool: ${e.message}`);
    }
  }
  return _pool;
}

export const pool = new Proxy({} as pg.Pool, {
  get(target, prop) {
    const instance = getPoolInstance();
    const value = (instance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});

const modelToTable: Record<string, string> = {
  companyProfiles: 'company_profiles',
  customers: 'customers',
  products: 'products',
  termsPresets: 'terms_presets',
  subscriptionPolicies: 'subscription_policies',
  quotations: 'quotations',
  quotationItems: 'quotation_items',
  invoices: 'invoices',
  invoiceItems: 'invoice_items',
  deliveryChallans: 'delivery_challans',
  deliveryChallanItems: 'delivery_challan_items',
  leads: 'leads',
  subscriptions: 'subscriptions',
  reminders: 'reminders',
  inventoryItems: 'inventory_items',
  inventoryLogs: 'inventory_logs',
  appData: 'app_data',
  userProfiles: 'user_profiles'
};

const relationMap: Record<string, { table: string, fk: string, key: string }> = {
  termsPresets: { table: 'terms_presets', fk: 'company_profile_id', key: 'termsPresets' },
  quotationItems: { table: 'quotation_items', fk: 'quotation_id', key: 'quotationItems' },
  invoiceItems: { table: 'invoice_items', fk: 'invoice_id', key: 'invoiceItems' },
  deliveryChallanItems: { table: 'delivery_challan_items', fk: 'delivery_challan_id', key: 'deliveryChallanItems' },
  inventoryLogs: { table: 'inventory_logs', fk: 'inventory_item_id', key: 'inventoryLogs' }
};

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function mapKeysToSnake(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(mapKeysToSnake);
  if (typeof obj !== 'object') return obj;
  
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value === undefined) continue;
    result[toSnakeCase(key)] = mapKeysToSnake(value);
  }
  return result;
}

function mapKeysToCamel(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(mapKeysToCamel);
  if (typeof obj !== 'object') return obj;
  
  const result: any = {};
  for (const key of Object.keys(obj)) {
    result[toCamelCase(key)] = mapKeysToCamel(obj[key]);
  }
  return result;
}

function buildWhere(where: any): { sql: string, values: any[] } {
  if (!where || Object.keys(where).length === 0) {
    return { sql: '', values: [] };
  }
  const keys = Object.keys(where);
  const conditions: string[] = [];
  const values: any[] = [];
  
  let valIdx = 1;
  for (const key of keys) {
    const val = where[key];
    const column = toSnakeCase(key);
    
    if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      if ('in' in val) {
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
    sql: `WHERE ${conditions.join(' AND ')}`,
    values
  };
}

async function findMany(tableName: string, args: any, client: any) {
  let { sql: whereSql, values: whereValues } = buildWhere(args?.where);
  
  let orderSql = '';
  if (args?.orderBy) {
    const orderObj = Array.isArray(args.orderBy) ? args.orderBy[0] : args.orderBy;
    if (orderObj) {
      const keys = Object.keys(orderObj);
      const parts = keys.map(key => `"${toSnakeCase(key)}" ${orderObj[key].toUpperCase()}`);
      orderSql = `ORDER BY ${parts.join(', ')}`;
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
        const parentIds = rows.map(r => r.id);
        
        const childSql = `SELECT * FROM "${rel.table}" WHERE "${rel.fk}" = ANY($1)`;
        const childRes = await client.query(childSql, [parentIds]);
        const childRows = childRes.rows.map(mapKeysToCamel);
        
        const camelFk = toCamelCase(rel.fk);
        const group: Record<string, any[]> = {};
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

async function findUnique(tableName: string, args: any, client: any) {
  const rows = await findMany(tableName, args, client);
  return rows[0] || null;
}

async function create(tableName: string, args: { data: any }, client: any) {
  const createData = mapKeysToSnake(args.data);
  for (const k of Object.keys(createData)) {
    if (Array.isArray(createData[k])) delete createData[k];
  }
  const keys = Object.keys(createData);
  const values = keys.map(k => createData[k]);
  const placeholders = keys.map((_, i) => `$${i + 1}`);
  
  const sql = `INSERT INTO "${tableName}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
  const res = await client.query(sql, values);
  return mapKeysToCamel(res.rows[0]);
}

async function update(tableName: string, args: { where: any, data: any }, client: any) {
  const { sql: whereSql, values: whereValues } = buildWhere(args.where);
  const updateData = mapKeysToSnake(args.data);
  for (const k of Object.keys(updateData)) {
    if (Array.isArray(updateData[k])) delete updateData[k];
  }
  const keys = Object.keys(updateData);
  const setClauses = keys.map((key, i) => `"${key}" = $${whereValues.length + i + 1}`);
  const updateValues = [...whereValues, ...keys.map(k => updateData[k])];
  
  const sql = `UPDATE "${tableName}" SET ${setClauses.join(', ')} ${whereSql} RETURNING *`;
  const res = await client.query(sql, updateValues);
  return mapKeysToCamel(res.rows[0]);
}

async function deleteRow(tableName: string, args: { where: any }, client: any) {
  const { sql: whereSql, values: whereValues } = buildWhere(args.where);
  const sql = `DELETE FROM "${tableName}" ${whereSql} RETURNING *`;
  const res = await client.query(sql, whereValues);
  return mapKeysToCamel(res.rows[0]);
}

async function deleteMany(tableName: string, args: { where?: any }, client: any) {
  const { sql: whereSql, values: whereValues } = buildWhere(args?.where);
  const sql = `DELETE FROM "${tableName}" ${whereSql}`;
  const res = await client.query(sql, whereValues);
  return { count: res.rowCount };
}

async function upsert(tableName: string, args: { where: any, update: any, create: any }, client: any) {
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
    const updateValues = [...whereValues, ...updateKeys.map(k => updateData[k])];
    
    const updateSql = `UPDATE "${tableName}" SET ${setClauses.join(', ')} ${whereSql} RETURNING *`;
    const updateRes = await client.query(updateSql, updateValues);
    return mapKeysToCamel(updateRes.rows[0]);
  } else {
    const createData = mapKeysToSnake(args.create);
    for (const k of Object.keys(createData)) {
      if (Array.isArray(createData[k])) delete createData[k];
    }
    
    const insertKeys = Object.keys(createData);
    const insertValues = insertKeys.map(k => createData[k]);
    const placeholders = insertKeys.map((_, i) => `$${i + 1}`);
    
    const insertSql = `INSERT INTO "${tableName}" (${insertKeys.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const insertRes = await client.query(insertSql, insertValues);
    return mapKeysToCamel(insertRes.rows[0]);
  }
}

async function $transaction(callback: (tx: any) => Promise<any>) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const tx = new Proxy({} as any, {
      get(target, modelName: string) {
        if (modelName === 'query') {
          return client.query.bind(client);
        }
        const tableName = modelToTable[modelName];
        if (!tableName) return undefined;
        
        return {
          findMany: (args: any) => findMany(tableName, args, client),
          findUnique: (args: any) => findUnique(tableName, args, client),
          create: (args: any) => create(tableName, args, client),
          update: (args: any) => update(tableName, args, client),
          delete: (args: any) => deleteRow(tableName, args, client),
          deleteMany: (args: any) => deleteMany(tableName, args, client),
          upsert: (args: any) => upsert(tableName, args, client),
        };
      }
    });
    
    const result = await callback(tx);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function $queryRaw(strings: TemplateStringsArray, ...values: any[]) {
  let sql = strings[0];
  for (let i = 1; i < strings.length; i++) {
    sql += `$${i}` + strings[i];
  }
  const res = await pool.query(sql, values);
  return res.rows;
}

export const neon = new Proxy({} as any, {
  get(target, prop: string) {
    if (prop === '$transaction') {
      return $transaction;
    }
    if (prop === '$queryRaw') {
      return $queryRaw;
    }
    const tableName = modelToTable[prop];
    if (!tableName) return undefined;
    
    return {
      findMany: (args: any) => findMany(tableName, args, pool),
      findUnique: (args: any) => findUnique(tableName, args, pool),
      create: (args: any) => create(tableName, args, pool),
      update: (args: any) => update(tableName, args, pool),
      delete: (args: any) => deleteRow(tableName, args, pool),
      deleteMany: (args: any) => deleteMany(tableName, args, pool),
      upsert: (args: any) => upsert(tableName, args, pool),
    };
  }
});

export const prisma = neon;
