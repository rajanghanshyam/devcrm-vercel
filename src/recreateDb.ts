import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const url = process.env.DATABASE_URL || '';
if (!url) {
  console.error("DATABASE_URL is not set in env!");
  process.exit(1);
}

console.log("Database connection URL detected. Initializing rebuild...");

async function rebuildDatabase() {
  const config: pg.PoolConfig = {
    connectionString: url,
  };

  if (url.includes('sslmode=') || url.includes('ssl=true')) {
    config.ssl = {
      rejectUnauthorized: false
    };
  }

  const pool = new pg.Pool(config);

  try {
    const client = await pool.connect();
    console.log("Connected to database. Dropping existing tables...");

    const tablesToDrop = [
      'inventory_logs',
      'inventory_items',
      'reminders',
      'subscriptions',
      'leads',
      'delivery_challan_items',
      'delivery_challans',
      'invoice_items',
      'invoices',
      'quotation_items',
      'quotations',
      'subscription_policies',
      'terms_presets',
      'products',
      'customers',
      'company_profiles',
      'user_profiles',
      'app_data'
    ];

    for (const table of tablesToDrop) {
      try {
        await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.log(`Dropped table: ${table}`);
      } catch (dropErr: any) {
        console.warn(`Warning dropping table ${table}:`, dropErr.message);
      }
    }

    console.log("All existing tables dropped. Reading table_creation_queries.sql...");

    const sqlFilePath = path.join(process.cwd(), 'table_creation_queries.sql');
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL file not found at ${sqlFilePath}`);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
    const statements = sqlContent.split(';');
    console.log(`Loaded ${statements.length} SQL statements. Executing sequentially...`);

    let count = 0;
    for (let statement of statements) {
      const lines = statement.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('--') && !line.startsWith('◇'));
      
      const cleanStatement = lines.join('\n').trim();
      if (!cleanStatement) {
        continue;
      }

      try {
        await client.query(cleanStatement);
        count++;
      } catch (stmtErr: any) {
        console.error(`Error executing statement:\n${cleanStatement}\nError:`, stmtErr.message);
        throw stmtErr;
      }
    }

    console.log(`Successfully executed ${count} schema creation statements! Database rebuilt successfully.`);
    client.release();
  } catch (err: any) {
    console.error("Database rebuild failed:", err.message || err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

rebuildDatabase();
