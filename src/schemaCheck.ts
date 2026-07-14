import fs from 'fs';
import path from 'path';
import { prisma, pool } from './db';

export async function performSchemaMigrationCheck() {
  const url = process.env.DATABASE_URL || '';
  if (!url || url.includes('******') || url.includes('%2A%2A%2A%2A%2A%2A')) {
    console.log('[Schema Check] Bypassing schema check: Database is unconfigured or masked (Sandbox offline mode active).');
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
    const result: any[] = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    const existingTables = result.map((r) => r.table_name);
    const missingTables = expectedTables.filter(t => !existingTables.includes(t));

    if (missingTables.length > 0) {
      console.warn(`[Schema Check] Missing tables found: ${missingTables.join(', ')}. Initiating automatic schema migration...`);
      try {
        const filePath = path.join(process.cwd(), 'table_creation_queries.sql');
        if (fs.existsSync(filePath)) {
          const sqlContent = fs.readFileSync(filePath, 'utf-8');
          const statements = sqlContent.split(';');
          console.log(`[Schema Check] Found ${statements.length} SQL statements in table_creation_queries.sql. Executing...`);
          
          for (let statement of statements) {
            statement = statement.trim();
            if (!statement || statement.startsWith('◇') || statement.startsWith('--')) {
              continue;
            }
            try {
              await pool.query(statement);
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
    console.log('[Schema Check] Notice: Could not verify database tables automatically (skipping check). Details:', error.message || error);
  }
}
