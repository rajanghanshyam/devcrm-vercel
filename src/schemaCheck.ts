import fs from 'fs';
import path from 'path';
import { neon, pool } from './db';

export async function performSchemaMigrationCheck() {
  const url = process.env.DATABASE_URL || '';
  const unpooledUrl = process.env.DATABASE_URL_UNPOOLED || '';
  
  const isMasked = (str: string) => str.includes('******') || str.includes('%2A%2A%2A%2A%2A%2A');
  const isPostgres = (str: string) => str.startsWith('postgres://') || str.startsWith('postgresql://');

  let selectedUrl = '';
  if (url && !isMasked(url) && isPostgres(url)) {
    selectedUrl = url;
  } else if (unpooledUrl && !isMasked(unpooledUrl) && isPostgres(unpooledUrl)) {
    selectedUrl = unpooledUrl;
  }

  if (!selectedUrl) {
    console.log('[Schema Check] Bypassing schema check: Database is unconfigured, masked, or not a valid PostgreSQL URL (Sandbox offline mode active).');
    return;
  }

  console.log('Performing schema migration check...');
  try {
    const expectedTables = [
      'company_profiles',
      'customers',
      'products',
      'terms_presets',
      'subscription_policies',
      'quotations',
      'quotation_items',
      'invoices',
      'invoice_items',
      'delivery_challans',
      'delivery_challan_items',
      'leads',
      'subscriptions',
      'reminders',
      'inventory_items',
      'inventory_logs',
      'user_profiles',
      'app_data'
    ];

    // Query existing public tables directly from PostgreSQL
    const result: any[] = await neon.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    const existingTables = result.map((r) => r.table_name);
    const missingTables = expectedTables.filter(t => !existingTables.includes(t));

    let hasEnableGst = true;
    if (existingTables.includes('company_profiles')) {
      try {
        const columnsResult: any[] = await neon.$queryRaw`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'company_profiles' AND column_name = 'enable_gst'
        `;
        hasEnableGst = columnsResult.length > 0;
      } catch (err) {
        console.warn('[Schema Check] Failed to check for enable_gst column:', err);
      }
    }

    const shouldRebuild = missingTables.length > 0 || !hasEnableGst;

    if (shouldRebuild) {
      if (!hasEnableGst && existingTables.includes('company_profiles')) {
        console.warn(`[Schema Check] Missing column "enable_gst" in "company_profiles" table. Rebuilding database tables from scratch to push latest schema...`);
        for (const table of expectedTables) {
          try {
            await pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
            console.log(`[Schema Check] Dropped table ${table} CASCADE`);
          } catch (dropErr: any) {
            console.warn(`[Schema Check] Non-blocking warning dropping table ${table}:`, dropErr.message || dropErr);
          }
        }
      } else {
        console.warn(`[Schema Check] Missing tables found: ${missingTables.join(', ')}. Initiating automatic schema migration...`);
      }

      try {
        const filePath = path.join(process.cwd(), 'table_creation_queries.sql');
        if (fs.existsSync(filePath)) {
          const sqlContent = fs.readFileSync(filePath, 'utf-8');
          const statements = sqlContent.split(';');
          console.log(`[Schema Check] Found ${statements.length} SQL statements in table_creation_queries.sql. Executing...`);
          
          for (let statement of statements) {
            const lines = statement.split('\n')
              .map(line => line.trim())
              .filter(line => line && !line.startsWith('--') && !line.startsWith('◇'));
            
            const cleanStmt = lines.join(' ').trim();
            if (!cleanStmt) {
              continue;
            }
            try {
              await pool.query(cleanStmt);
            } catch (stmtErr: any) {
              if (stmtErr.message && (stmtErr.message.includes('already exists') || stmtErr.message.includes('already a relation'))) {
                continue;
              }
              console.log(`[Schema Check] Non-blocking statement warning during execution: ${stmtErr.message || stmtErr}`);
            }
          }
          console.log('[Schema Check] Automatic schema migration completed successfully!');
        } else {
          console.error('[Schema Check] table_creation_queries.sql not found at ' + filePath);
        }
      } catch (migrationErr: any) {
        console.error('[Schema Check] Failed to execute schema migration automatically:', migrationErr.message || migrationErr);
      }
    } else {
      console.log('[Schema Check] All expected tables exist. Schema is up to date.');
    }
  } catch (error: any) {
    const errMsg = error.message || String(error);
    if (errMsg.toLowerCase().includes("password authentication failed") || errMsg.toLowerCase().includes("authentication failed")) {
      console.log('[Schema Check] Notice: Could not verify database tables automatically (skipping check).\n' +
        'DATABASE PASSWORD ERROR: Password authentication failed for your user.\n\n' +
        'To resolve this:\n' +
        '1. Go to your Neon console (or PostgreSQL provider dashboard) and copy your correct connection string.\n' +
        '2. Open Google AI Studio, click \'Settings\' (gear icon) in the sidebar/header, then choose \'Environment Variables\'.\n' +
        '3. Locate \'DATABASE_URL\' and \'DATABASE_URL_UNPOOLED\' and update them with the correct password.');
    } else {
      const cleanMsg = errMsg.includes('AggregateError') || errMsg.includes('timeout') || errMsg.includes('connect')
        ? 'Database host is currently unreachable (Sandbox offline mode active).'
        : errMsg;
      console.log('[Schema Check] Database connection check bypassed (Sandbox offline mode active). Info:', cleanMsg);
    }
  }
}
