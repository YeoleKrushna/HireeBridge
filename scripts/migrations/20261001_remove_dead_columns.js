require('dotenv').config();
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  try { dns.setDefaultResultOrder('ipv4first'); } catch {}
}
const { Pool } = require('pg');

async function runMigration() {
  console.log('====================================================');
  console.log('STARTING DATABASE MIGRATION: REMOVE DEAD COLUMNS');
  console.log('====================================================\n');

  const connStr = process.env.NEON_DB || process.env['NEON_DB '];
  if (!connStr) {
    console.error('ERROR: NEON_DB connection string not found in environment.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: connStr.trim(),
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. Verify pre-migration state
    console.log('[1/4] Verifying pre-migration schema and row counts...');

    const preUsersCountRes = await pool.query('SELECT COUNT(*) FROM users');
    const preUsersCount = parseInt(preUsersCountRes.rows[0].count, 10);

    const preCertsCountRes = await pool.query('SELECT COUNT(*) FROM certificates');
    const preCertsCount = parseInt(preCertsCountRes.rows[0].count, 10);

    const preUsersColsRes = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'"
    );
    const preUsersCols = preUsersColsRes.rows.map(r => r.column_name);

    const preCertsColsRes = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'certificates'"
    );
    const preCertsCols = preCertsColsRes.rows.map(r => r.column_name);

    console.log(` - users row count: ${preUsersCount}`);
    console.log(` - users columns: [${preUsersCols.join(', ')}]`);
    console.log(` - certificates row count: ${preCertsCount}`);
    console.log(` - certificates columns: [${preCertsCols.join(', ')}]`);

    console.log('\n[2/4] Executing idempotent DROP COLUMN statements...');
    
    // Execute SQL migrations
    console.log(' - Executing: ALTER TABLE users DROP COLUMN IF EXISTS domain;');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS domain;');

    console.log(' - Executing: ALTER TABLE users DROP COLUMN IF EXISTS plan;');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS plan;');

    console.log(' - Executing: ALTER TABLE certificates DROP COLUMN IF EXISTS svg;');
    await pool.query('ALTER TABLE certificates DROP COLUMN IF EXISTS svg;');

    // Ensure jpg column exists in certificates if not already present
    console.log(' - Ensuring: ALTER TABLE certificates ADD COLUMN IF NOT EXISTS jpg TEXT;');
    await pool.query('ALTER TABLE certificates ADD COLUMN IF NOT EXISTS jpg TEXT;');

    console.log('\n[3/4] Verifying post-migration schema and row counts...');

    const postUsersCountRes = await pool.query('SELECT COUNT(*) FROM users');
    const postUsersCount = parseInt(postUsersCountRes.rows[0].count, 10);

    const postCertsCountRes = await pool.query('SELECT COUNT(*) FROM certificates');
    const postCertsCount = parseInt(postCertsCountRes.rows[0].count, 10);

    const postUsersColsRes = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
    );
    const postUsersCols = postUsersColsRes.rows.map(r => r.column_name);

    const postCertsColsRes = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'certificates' ORDER BY ordinal_position"
    );
    const postCertsCols = postCertsColsRes.rows.map(r => r.column_name);

    console.log(` - users row count after: ${postUsersCount} (was: ${preUsersCount})`);
    console.log(` - users columns after: [${postUsersCols.join(', ')}]`);
    console.log(` - certificates row count after: ${postCertsCount} (was: ${preCertsCount})`);
    console.log(` - certificates columns after: [${postCertsCols.join(', ')}]`);

    // Integrity assertions
    if (postUsersCount !== preUsersCount) {
      throw new Error(`Row count mismatch on users table! Expected ${preUsersCount}, got ${postUsersCount}`);
    }
    if (postCertsCount !== preCertsCount) {
      throw new Error(`Row count mismatch on certificates table! Expected ${preCertsCount}, got ${postCertsCount}`);
    }

    if (postUsersCols.includes('domain')) {
      throw new Error('users.domain was NOT successfully dropped!');
    }
    if (postUsersCols.includes('plan')) {
      throw new Error('users.plan was NOT successfully dropped!');
    }
    if (postCertsCols.includes('svg')) {
      throw new Error('certificates.svg was NOT successfully dropped!');
    }

    console.log('\n[4/4] Migration validation SUCCESSFUL!');
    console.log('====================================================');
    console.log('All dead columns dropped safely with zero row loss.');
    console.log('====================================================');

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('\nMIGRATION FAILED:', err);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
