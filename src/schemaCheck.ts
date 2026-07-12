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
