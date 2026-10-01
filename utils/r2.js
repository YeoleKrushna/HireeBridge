require('dotenv').config();
const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');

// Read configuration from environment
const endpoint = process.env.R2_ENDPOINT;
const bucket = process.env.R2_BUCKET_NAME;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

// Configurable storage limit (default 9 GB if not specified)
const DEFAULT_STORAGE_LIMIT_GB = 9;

function getStorageLimitBytes() {
  const envVal = process.env.R2_STORAGE_LIMIT_GB;
  const gb = envVal ? parseFloat(envVal) : DEFAULT_STORAGE_LIMIT_GB;
  if (isNaN(gb) || gb <= 0) {
    return DEFAULT_STORAGE_LIMIT_GB * 1024 * 1024 * 1024;
  }
  return Math.round(gb * 1024 * 1024 * 1024);
}

function isConfigured() {
  return Boolean(endpoint && bucket && accessKeyId && secretAccessKey);
}

// Singleton S3 client instance for Cloudflare R2
let s3ClientInstance = null;

function getClient() {
  if (!isConfigured()) {
    throw new Error('R2 storage is not configured. Missing required R2 environment variables.');
  }
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: endpoint.trim(),
      credentials: {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim()
      }
    });
  }
  return s3ClientInstance;
}

/**
 * Deterministic R2 object key generators based strictly on immutable credential ID.
 */
function getPdfKey(credentialId) {
  const cleanId = String(credentialId || '').trim();
  if (!cleanId) throw new Error('credentialId is required to generate PDF object key');
  return `certificates/${cleanId}/certificate.pdf`;
}

function getJpgKey(credentialId) {
  const cleanId = String(credentialId || '').trim();
  if (!cleanId) throw new Error('credentialId is required to generate JPG object key');
  return `certificates/${cleanId}/certificate.jpg`;
}

/**
 * Check an object exists in R2 and retrieve metadata.
 * Returns { size, contentType, etag, lastModified } or null if not found.
 */
async function headObject(key) {
  if (!isConfigured()) return null;
  const client = getClient();
  try {
    const res = await client.send(new HeadObjectCommand({
      Bucket: bucket,
      Key: key
    }));
    return {
      size: res.ContentLength,
      contentType: res.ContentType,
      etag: res.ETag,
      lastModified: res.LastModified
    };
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return null;
    }
    console.error('R2 headObject error for key:', key, err.message);
    throw err;
  }
}

/**
 * Check if both PDF and JPG artifacts for a credential exist in R2.
 */
async function certificateArtifactsExist(credentialId) {
  const pdfKey = getPdfKey(credentialId);
  const jpgKey = getJpgKey(credentialId);
  const [pdfHead, jpgHead] = await Promise.all([
    headObject(pdfKey),
    headObject(jpgKey)
  ]);
  return {
    exists: Boolean(pdfHead && jpgHead),
    pdf: pdfHead,
    jpg: jpgHead
  };
}

/**
 * Generate a short-lived presigned GET URL for secure downloading/viewing.
 */
async function getPresignedDownloadUrl(key, { expiresIn = 600, filename = null, isInline = false } = {}) {
  const client = getClient();
  const params = {
    Bucket: bucket,
    Key: key
  };

  if (isInline) {
    params.ResponseContentDisposition = 'inline';
  } else if (filename) {
    const safeFilename = filename.replace(/["\r\n]/g, '_');
    params.ResponseContentDisposition = `attachment; filename="${safeFilename}"`;
  }

  const command = new GetObjectCommand(params);
  return await getSignedUrl(client, command, { expiresIn });
}

/**
 * Delete a single object from R2.
 */
async function deleteObject(key) {
  if (!isConfigured()) return false;
  const client = getClient();
  try {
    await client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    }));
    return true;
  } catch (err) {
    console.error('R2 deleteObject error for key:', key, err.message);
    return false;
  }
}

/**
 * Delete both PDF and JPG artifacts for a credential ID.
 */
async function deleteCertificateArtifacts(credentialId) {
  const pdfKey = getPdfKey(credentialId);
  const jpgKey = getJpgKey(credentialId);
  const [pdfDel, jpgDel] = await Promise.all([
    deleteObject(pdfKey),
    deleteObject(jpgKey)
  ]);
  return pdfDel && jpgDel;
}

/**
 * Check storage limit guard before uploading new artifacts.
 */
async function checkStorageLimit(incomingBytes = 0, currentStorageBytesGetter = null) {
  const limitBytes = getStorageLimitBytes();
  let currentBytes = 0;

  if (typeof currentStorageBytesGetter === 'function') {
    try {
      currentBytes = await currentStorageBytesGetter();
    } catch (e) {
      console.warn('Failed to get tracked storage from DB, continuing with 0 base:', e.message);
    }
  }

  if (currentBytes + incomingBytes > limitBytes) {
    const currentGb = (currentBytes / (1024 ** 3)).toFixed(3);
    const limitGb = (limitBytes / (1024 ** 3)).toFixed(1);
    const incomingMb = (incomingBytes / (1024 ** 2)).toFixed(2);
    const msg = `R2 storage safety limit exceeded: currently using ${currentGb} GB, incoming upload is ${incomingMb} MB, limit is ${limitGb} GB. Upload aborted to prevent unexpected billing.`;
    console.error(msg);
    const err = new Error(msg);
    err.code = 'R2_STORAGE_LIMIT_EXCEEDED';
    throw err;
  }

  return { currentBytes, limitBytes, allowed: true };
}

/**
 * Upload certificate artifacts to R2 with full verification and partial failure cleanup.
 *
 * @param {Object} options
 * @param {string} options.credentialId
 * @param {string} options.pdfPath - Local filesystem path to generated PDF
 * @param {string} options.jpgPath - Local filesystem path to generated JPG
 * @param {Function} [options.currentStorageBytesGetter] - Optional function returning current DB tracked bytes
 * @returns {Promise<{ pdfKey, jpgKey, pdfSizeBytes, jpgSizeBytes, pdfETag, jpgETag }>}
 */
async function uploadCertificateArtifacts({
  credentialId,
  pdfPath,
  jpgPath,
  reserveStorageFn = null,
  releaseStorageFn = null,
  currentStorageBytesGetter = null
}) {
  if (!isConfigured()) {
    throw new Error('R2 storage is not configured.');
  }

  const safeId = String(credentialId || '').trim();
  if (!safeId) throw new Error('A valid credentialId is required for R2 upload.');

  // 1. Verify both local files exist and are non-empty
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF artifact file missing at ${pdfPath}`);
  }
  if (!fs.existsSync(jpgPath)) {
    throw new Error(`JPG artifact file missing at ${jpgPath}`);
  }

  const pdfStats = fs.statSync(pdfPath);
  const jpgStats = fs.statSync(jpgPath);

  if (pdfStats.size === 0) {
    throw new Error(`PDF artifact file at ${pdfPath} is 0 bytes`);
  }
  if (jpgStats.size === 0) {
    throw new Error(`JPG artifact file at ${jpgPath} is 0 bytes`);
  }

  const totalIncomingBytes = pdfStats.size + jpgStats.size;

  // 2. Concurrency-Safe Storage Reservation BEFORE R2 Upload
  let reservationAcquired = false;
  if (typeof reserveStorageFn === 'function') {
    await reserveStorageFn(safeId, totalIncomingBytes, getStorageLimitBytes());
    reservationAcquired = true;
  } else {
    // Fallback: enforce Application-Level Storage Safety Limit Guard
    await checkStorageLimit(totalIncomingBytes, currentStorageBytesGetter);
  }

  const pdfKey = getPdfKey(safeId);
  const jpgKey = getJpgKey(safeId);
  const client = getClient();

  let jpgUploaded = false;
  let pdfUploaded = false;

  try {
    // 3. Upload JPG
    const jpgBuffer = fs.readFileSync(jpgPath);
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: jpgKey,
      Body: jpgBuffer,
      ContentType: 'image/jpeg',
      ContentLength: jpgStats.size,
      Metadata: {
        credentialId: safeId
      }
    }));
    jpgUploaded = true;

    // 4. Upload PDF
    const pdfBuffer = fs.readFileSync(pdfPath);
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: pdfKey,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      ContentLength: pdfStats.size,
      Metadata: {
        credentialId: safeId
      }
    }));
    pdfUploaded = true;

    // 5. Verify both R2 uploads with HeadObject
    const [jpgHead, pdfHead] = await Promise.all([
      client.send(new HeadObjectCommand({ Bucket: bucket, Key: jpgKey })),
      client.send(new HeadObjectCommand({ Bucket: bucket, Key: pdfKey }))
    ]);

    if (!jpgHead || jpgHead.ContentLength !== jpgStats.size) {
      throw new Error(`JPG verification failed in R2: expected ${jpgStats.size} bytes, got ${jpgHead?.ContentLength}`);
    }
    if (!pdfHead || pdfHead.ContentLength !== pdfStats.size) {
      throw new Error(`PDF verification failed in R2: expected ${pdfStats.size} bytes, got ${pdfHead?.ContentLength}`);
    }

    return {
      pdfKey,
      jpgKey,
      pdfSizeBytes: pdfStats.size,
      jpgSizeBytes: jpgStats.size,
      pdfETag: pdfHead.ETag,
      jpgETag: jpgHead.ETag
    };

  } catch (err) {
    console.error(`R2 upload failure for ${safeId}:`, err.message);

    // Partial upload cleanup: remove whatever was uploaded so no orphan exists
    if (jpgUploaded) {
      await deleteObject(jpgKey).catch(() => {});
    }
    if (pdfUploaded) {
      await deleteObject(pdfKey).catch(() => {});
    }

    // Release storage reservation if upload failed
    if (reservationAcquired && typeof releaseStorageFn === 'function') {
      await releaseStorageFn(safeId).catch(relErr => {
        console.error(`Failed to release reservation for ${safeId}:`, relErr.message);
      });
    }

    throw err;
  }
}

/**
 * List all objects currently stored in Cloudflare R2 under certificates/
 * Handles pagination up to any number of items.
 */
async function listAllCertificateObjects() {
  if (!isConfigured()) return [];
  const client = getClient();
  const objects = [];
  let continuationToken = null;

  try {
    do {
      const params = {
        Bucket: bucket,
        Prefix: 'certificates/',
        MaxKeys: 1000
      };
      if (continuationToken) {
        params.ContinuationToken = continuationToken;
      }
      const res = await client.send(new ListObjectsV2Command(params));
      if (res.Contents && res.Contents.length > 0) {
        for (const item of res.Contents) {
          objects.push({
            key: item.Key,
            size: item.Size,
            lastModified: item.LastModified,
            etag: item.ETag
          });
        }
      }
      continuationToken = res.IsTruncated ? res.NextContinuationToken : null;
    } while (continuationToken);

    return objects;
  } catch (err) {
    console.error('R2 listAllCertificateObjects error:', err.message);
    throw err;
  }
}

/**
 * Reconcile expected DB certificates against actual objects present in R2.
 * Pure comparison - NEVER deletes anything automatically.
 */
async function reconcileStorage(certificatesList = []) {
  if (!isConfigured()) {
    const emptySummary = {
      totalDb: certificatesList.length,
      totalR2: 0,
      healthy: 0,
      missingPdf: 0,
      missingJpg: 0,
      sizeMismatch: 0,
      orphans: 0,
      unknown: 0,
      totalCertificatesInDb: certificatesList.length,
      totalR2Objects: 0,
      healthyCertificates: 0,
      orphanFilesCount: 0
    };
    return {
      status: 'unconfigured',
      healthy: [],
      missingPdf: [],
      missingJpg: [],
      sizeMismatch: [],
      orphans: [],
      unknownObjects: [],
      summary: emptySummary,
      stats: emptySummary
    };
  }

  const r2Objects = await listAllCertificateObjects();
  const r2Map = new Map();
  for (const obj of r2Objects) {
    r2Map.set(obj.key, obj);
  }

  const healthy = [];
  const missingPdf = [];
  const missingJpg = [];
  const sizeMismatch = [];
  const recognizedKeys = new Set();

  for (const cert of certificatesList) {
    const credId = cert.credentialId || cert.credential_id;
    if (!credId) continue;
    const pdfKey = getPdfKey(credId);
    const jpgKey = getJpgKey(credId);

    recognizedKeys.add(pdfKey);
    recognizedKeys.add(jpgKey);

    const pdfObj = r2Map.get(pdfKey);
    const jpgObj = r2Map.get(jpgKey);

    const certPdfBytes = Number(cert.pdfSizeBytes || cert.pdf_size_bytes || 0);
    const certJpgBytes = Number(cert.jpgSizeBytes || cert.jpg_size_bytes || 0);

    let hasIssue = false;

    if (!pdfObj) {
      missingPdf.push({ credentialId: credId, name: cert.name, email: cert.email, expectedKey: pdfKey });
      hasIssue = true;
    } else if (certPdfBytes > 0 && pdfObj.size !== certPdfBytes) {
      sizeMismatch.push({ credentialId: credId, artifact: 'pdf', expectedBytes: certPdfBytes, actualBytes: pdfObj.size, key: pdfKey });
      hasIssue = true;
    }

    if (!jpgObj) {
      missingJpg.push({ credentialId: credId, name: cert.name, email: cert.email, expectedKey: jpgKey });
      hasIssue = true;
    } else if (certJpgBytes > 0 && jpgObj.size !== certJpgBytes) {
      sizeMismatch.push({ credentialId: credId, artifact: 'jpg', expectedBytes: certJpgBytes, actualBytes: jpgObj.size, key: jpgKey });
      hasIssue = true;
    }

    if (!hasIssue) {
      healthy.push({
        credentialId: credId,
        name: cert.name,
        email: cert.email,
        pdfKey,
        jpgKey,
        pdfBytes: pdfObj?.size || 0,
        jpgBytes: jpgObj?.size || 0
      });
    }
  }

  const orphans = [];
  const unknownObjects = [];

  for (const obj of r2Objects) {
    if (recognizedKeys.has(obj.key)) continue;

    // Check if this matches certificates/<credentialId>/certificate.(pdf|jpg)
    const match = obj.key.match(/^certificates\/([^/]+)\/certificate\.(pdf|jpg)$/i);
    if (match) {
      const orphanCredId = match[1];
      orphans.push({
        key: obj.key,
        credentialId: orphanCredId,
        size: obj.size,
        lastModified: obj.lastModified
      });
    } else {
      unknownObjects.push({
        key: obj.key,
        size: obj.size,
        lastModified: obj.lastModified
      });
    }
  }

  const summaryObj = {
    totalDb: certificatesList.length,
    totalR2: r2Objects.length,
    healthy: healthy.length,
    missingPdf: missingPdf.length,
    missingJpg: missingJpg.length,
    sizeMismatch: sizeMismatch.length,
    orphans: orphans.length,
    unknown: unknownObjects.length,
    totalCertificatesInDb: certificatesList.length,
    totalR2Objects: r2Objects.length,
    healthyCertificates: healthy.length,
    orphanFilesCount: orphans.length
  };

  return {
    status: 'healthy_check_completed',
    healthy,
    missingPdf,
    missingJpg,
    sizeMismatch,
    orphans,
    unknownObjects,
    summary: summaryObj,
    stats: summaryObj
  };
}

/**
 * Safe orphan object deletion.
 * Validates that key is strictly inside certificates/ and DOES NOT match any active DB certificate!
 */
async function deleteOrphanObject(key, certificatesList = []) {
  if (!isConfigured()) throw new Error('R2 is not configured');
  const safeKey = String(key || '').trim();
  if (!safeKey.startsWith('certificates/')) {
    throw new Error('Can only delete objects within certificates/ hierarchy');
  }

  // Safety check: ensure key does NOT belong to any valid DB certificate
  const activeKeys = new Set();
  for (const cert of certificatesList) {
    activeKeys.add(getPdfKey(cert.credentialId));
    activeKeys.add(getJpgKey(cert.credentialId));
  }

  if (activeKeys.has(safeKey)) {
    throw new Error(`Refusing to delete key '${safeKey}': it belongs to an active certificate in database.`);
  }

  return await deleteObject(safeKey);
}

module.exports = {
  isConfigured,
  getClient,
  getPdfKey,
  getJpgKey,
  headObject,
  certificateArtifactsExist,
  getPresignedDownloadUrl,
  deleteObject,
  deleteCertificateArtifacts,
  checkStorageLimit,
  getStorageLimitBytes,
  uploadCertificateArtifacts,
  listAllCertificateObjects,
  reconcileStorage,
  deleteOrphanObject
};
