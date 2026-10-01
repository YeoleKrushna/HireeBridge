require('dotenv').config();
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  try { dns.setDefaultResultOrder('ipv4first'); } catch {}
}
const { Resolver } = require('dns');
const publicDnsResolver = new Resolver();
try { publicDnsResolver.setServers(['8.8.8.8', '1.1.1.1']); } catch {}
const origDnsLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  origDnsLookup(hostname, options, (err, address, family) => {
    if (!err && address) return callback(null, address, family);
    if (typeof hostname === 'string' && hostname.includes('neon.tech')) {
      return publicDnsResolver.resolve4(hostname, (resErr, addresses) => {
        if (!resErr && addresses && addresses.length > 0) {
          return callback(null, addresses[0], 4);
        }
        callback(err || resErr);
      });
    }
    callback(err, address, family);
  });
};

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const r2 = require('../../utils/r2');
const { PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

async function runMigration() {
  console.log('====================================================');
  console.log('STARTING CERTIFICATE MIGRATION TO CLOUDFLARE R2');
  console.log('====================================================\n');

  // 1. Verify R2 configuration
  if (!r2.isConfigured()) {
    console.error('ERROR: R2 credentials are not fully configured in environment.');
    process.exit(1);
  }
  console.log('[1/5] R2 configuration detected and verified.');

  // 2. Connect to PostgreSQL
  const connStr = process.env.NEON_DB || process.env['NEON_DB '];
  if (!connStr) {
    console.error('ERROR: NEON_DB connection string not found.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: connStr.trim(),
    ssl: { rejectUnauthorized: false }
  });

  const r2Client = r2.getClient();
  const bucket = process.env.R2_BUCKET_NAME;

  try {
    // 3. Ensure schema columns exist
    console.log('[2/5] Ensuring R2 columns exist on certificates table...');
    await pool.query(`
      ALTER TABLE certificates ADD COLUMN IF NOT EXISTS pdf_key TEXT;
      ALTER TABLE certificates ADD COLUMN IF NOT EXISTS jpg_key TEXT;
      ALTER TABLE certificates ADD COLUMN IF NOT EXISTS pdf_size_bytes INT;
      ALTER TABLE certificates ADD COLUMN IF NOT EXISTS jpg_size_bytes INT;
    `);
    console.log(' - Columns (pdf_key, jpg_key, pdf_size_bytes, jpg_size_bytes) verified.');

    // 4. Retrieve existing certificates
    console.log('\n[3/5] Querying certificates from database...');
    const certsRes = await pool.query('SELECT * FROM certificates ORDER BY created_at ASC');
    const certs = certsRes.rows;
    console.log(` - Found ${certs.length} certificate(s) in PostgreSQL.`);

    const genDir = path.resolve(__dirname, '../../certificate/generated');
    console.log(` - Local generated directory: ${genDir}`);

    let countAlreadyMigrated = 0;
    let countNewlyMigrated = 0;
    let countMissingLocal = 0;
    let totalBytesMigrated = 0;

    console.log('\n[4/5] Processing certificates...');
    for (const cert of certs) {
      const credId = cert.credential_id;
      const pdfKey = r2.getPdfKey(credId);
      const jpgKey = r2.getJpgKey(credId);

      console.log(`\n -> Checking Certificate: ${credId} (${cert.name} - ${cert.email})`);

      // Check if both objects already exist in R2
      const [existingPdf, existingJpg] = await Promise.all([
        r2.headObject(pdfKey).catch(() => null),
        r2.headObject(jpgKey).catch(() => null)
      ]);

      if (existingPdf && existingJpg) {
        console.log(`    Already in R2 (PDF: ${existingPdf.size} B, JPG: ${existingJpg.size} B).`);
        // Ensure DB fields are populated
        if (!cert.pdf_key || !cert.jpg_key || !cert.pdf_size_bytes || !cert.jpg_size_bytes) {
          console.log('    Syncing DB storage metadata...');
          await pool.query(
            'UPDATE certificates SET pdf_key = $1, jpg_key = $2, pdf_size_bytes = $3, jpg_size_bytes = $4 WHERE credential_id = $5',
            [pdfKey, jpgKey, existingPdf.size, existingJpg.size, credId]
          );
        }
        countAlreadyMigrated++;
        continue;
      }

      // Find local files
      const localPdfPath = path.join(genDir, `${credId}.pdf`);
      const localJpgPath = path.join(genDir, `${credId}.jpg`);

      const pdfExists = fs.existsSync(localPdfPath);
      const jpgExists = fs.existsSync(localJpgPath);

      if (!pdfExists || !jpgExists) {
        console.warn(`    WARNING: Missing local files for ${credId} (PDF exists: ${pdfExists}, JPG exists: ${jpgExists}). Skipping upload.`);
        countMissingLocal++;
        continue;
      }

      const pdfStats = fs.statSync(localPdfPath);
      const jpgStats = fs.statSync(localJpgPath);

      if (pdfStats.size === 0 || jpgStats.size === 0) {
        console.warn(`    WARNING: 0-byte local file for ${credId}. Skipping upload.`);
        countMissingLocal++;
        continue;
      }

      console.log(`    Local files found. PDF: ${pdfStats.size} B, JPG: ${jpgStats.size} B. Uploading to R2...`);

      // Upload JPG
      const jpgBuf = fs.readFileSync(localJpgPath);
      await r2Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: jpgKey,
        Body: jpgBuf,
        ContentType: 'image/jpeg',
        ContentLength: jpgStats.size,
        Metadata: { credentialId: credId }
      }));

      // Upload PDF
      const pdfBuf = fs.readFileSync(localPdfPath);
      await r2Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: pdfKey,
        Body: pdfBuf,
        ContentType: 'application/pdf',
        ContentLength: pdfStats.size,
        Metadata: { credentialId: credId }
      }));

      // Verify both in R2 via HeadObject
      const [verPdf, verJpg] = await Promise.all([
        r2Client.send(new HeadObjectCommand({ Bucket: bucket, Key: pdfKey })),
        r2Client.send(new HeadObjectCommand({ Bucket: bucket, Key: jpgKey }))
      ]);

      if (verPdf.ContentLength !== pdfStats.size || verJpg.ContentLength !== jpgStats.size) {
        throw new Error(`Size mismatch after upload for ${credId}! Aborting migration.`);
      }

      // Update DB record
      await pool.query(
        'UPDATE certificates SET pdf_key = $1, jpg_key = $2, pdf_size_bytes = $3, jpg_size_bytes = $4 WHERE credential_id = $5',
        [pdfKey, jpgKey, pdfStats.size, jpgStats.size, credId]
      );

      console.log(`    UPLOAD & VERIFY SUCCESS: ${credId} (Total: ${pdfStats.size + jpgStats.size} bytes). Local files preserved.`);
      countNewlyMigrated++;
      totalBytesMigrated += (pdfStats.size + jpgStats.size);
    }

    // 5. Final report
    console.log('\n[5/5] Migration Summary:');
    console.log('====================================================');
    console.log(`Total DB Certificates Processed : ${certs.length}`);
    console.log(`Already Present in R2           : ${countAlreadyMigrated}`);
    console.log(`Newly Uploaded & Verified       : ${countNewlyMigrated}`);
    console.log(`Missing Local Files / Skipped   : ${countMissingLocal}`);
    console.log(`New Bytes Uploaded to R2        : ${(totalBytesMigrated / 1024).toFixed(2)} KB`);
    console.log('Local certificate files status  : ALL LOCAL FILES PRESERVED (NON-DESTRUCTIVE)');
    console.log('====================================================\n');

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('\nMIGRATION ERROR:', err);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
