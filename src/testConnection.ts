import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

async function testConnection() {
  console.log("==================================================");
  console.log("   PostgreSQL Database Connection Verification    ");
  console.log("==================================================");

  const databaseUrl = process.env.DATABASE_URL || '';
  const unpooledUrl = process.env.DATABASE_URL_UNPOOLED || '';

  if (!databaseUrl && !unpooledUrl) {
    console.error("❌ ERROR: No connection URL found in your environment.");
    console.error("Please configure DATABASE_URL or DATABASE_URL_UNPOOLED in your Settings.");
    process.exit(1);
  }

  // Choose the URL to test
  const isMasked = (str: string) => str.includes('******') || str.includes('%2A%2A%2A%2A%2A%2A');
  let selectedUrl = '';
  let urlSource = '';

  if (databaseUrl && !isMasked(databaseUrl)) {
    selectedUrl = databaseUrl;
    urlSource = 'DATABASE_URL';
  } else if (unpooledUrl && !isMasked(unpooledUrl)) {
    selectedUrl = unpooledUrl;
    urlSource = 'DATABASE_URL_UNPOOLED';
  } else if (databaseUrl) {
    selectedUrl = databaseUrl;
    urlSource = 'DATABASE_URL (Warning: Masked)';
  } else {
    selectedUrl = unpooledUrl;
    urlSource = 'DATABASE_URL_UNPOOLED (Warning: Masked)';
  }

  console.log(`\nSource being tested: ${urlSource}`);
  
  if (isMasked(selectedUrl)) {
    console.warn("⚠️  WARNING: The connection URL contains masked/asterisk characters.");
    console.warn("Please make sure you have typed the real credentials in Settings -> Environment Variables.");
  }

  // Parse connection URL details for clear logging (without exposing password)
  try {
    const parsed = new URL(selectedUrl);
    console.log("Connection Details:");
    console.log(`- Protocol: ${parsed.protocol}`);
    console.log(`- Host:     ${parsed.hostname}`);
    console.log(`- Port:     ${parsed.port || '5432'}`);
    console.log(`- Database: ${parsed.pathname.slice(1)}`);
    console.log(`- User:     ${parsed.username}`);
  } catch (e) {
    console.warn("Could not parse the database URL directly with standard URL parser, testing raw string instead...");
  }

  const config: pg.PoolConfig = {
    connectionString: selectedUrl,
    connectionTimeoutMillis: 8000, // 8-second timeout for quick failure feedback
  };

  if (selectedUrl.includes('sslmode=') || selectedUrl.includes('ssl=true') || selectedUrl.includes('neon.tech')) {
    config.ssl = {
      rejectUnauthorized: false
    };
  }

  console.log("\nInitiating connection pool...");
  const pool = new pg.Pool(config);

  try {
    console.log("Running 'SELECT 1' test query...");
    const startTime = Date.now();
    const res = await pool.query('SELECT 1 as test_val');
    const duration = Date.now() - startTime;

    console.log("\n✨ SUCCESS! Database connection verified successfully!");
    console.log(`- Round-trip Query Time: ${duration}ms`);
    console.log(`- Test Query Result:     ${JSON.stringify(res.rows[0])}`);
    console.log("\nYour connection is working perfectly! Applications can read/write data safely.");
  } catch (error: any) {
    console.error("\n❌ CONNECTION FAILURE!");
    console.error("--------------------------------------------------");
    console.error(`Error Code:    ${error.code || 'N/A'}`);
    console.error(`Error Message: ${error.message || error}`);
    console.error("--------------------------------------------------");

    const msg = (error.message || String(error)).toLowerCase();

    if (msg.includes("password authentication failed") || msg.includes("password")) {
      console.error("\n💡 DIAGNOSIS: Password authentication failed.");
      console.error("The username/password combination in your connection string is incorrect.");
      console.error("Solution: Go to your Neon or database provider dashboard, retrieve your correct password, and update it in Settings -> Environment Variables.");
    } else if (msg.includes("enotfound") || msg.includes("getaddrinfo")) {
      console.error("\n💡 DIAGNOSIS: Host unreachable / DNS resolution failed.");
      console.error("The host domain name is wrong, or you are not connected to the internet.");
      console.error("Solution: Check if there is a typo in the database host address in your connection string.");
    } else if (msg.includes("connect timeout") || msg.includes("timeout")) {
      console.error("\n💡 DIAGNOSIS: Connection timed out.");
      console.error("The database server took too long to respond. This can be due to security group/firewall settings, incorrect host/port, or the instance being paused.");
      console.error("Solution: Ensure public access is enabled on your database, or that your Neon compute endpoint is active (not suspended).");
    } else if (msg.includes("database") && msg.includes("does not exist")) {
      console.error("\n💡 DIAGNOSIS: Database name not found.");
      console.error("The database name specified in the connection string does not exist on your server.");
      console.error("Solution: Create the database on your database server, or correct the name in the connection string.");
    } else {
      console.error("\n💡 DIAGNOSIS: Generic database connection error.");
      console.error("Please review your credentials and make sure the database is online and accepts external connections.");
    }
  } finally {
    await pool.end();
  }
}

testConnection();
