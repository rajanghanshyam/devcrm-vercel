import { prisma } from './db';

export async function performSchemaMigrationCheck() {
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

    // Query information_schema for existing tables
    const result: any[] = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    const existingTables = result.map((r) => r.table_name);
    const missingTables = expectedTables.filter(t => !existingTables.includes(t));

    if (missingTables.length > 0) {
      console.warn(`[Schema Check] Missing tables found: ${missingTables.join(', ')}.`);
      console.warn('Please run prisma migrate dev or prisma db push to sync the schema.');
    } else {
      console.log('[Schema Check] All expected tables exist. Schema is up to date.');
    }
  } catch (error) {
    console.error('[Schema Check] Failed to check schema:', error);
  }
}
