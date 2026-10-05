# HireeBridge Database Backup & Disaster Recovery Architecture

## 1. Overview & Cloud Architecture

HireeBridge uses **Neon Serverless PostgreSQL** as its primary authoritative data store in production, paired with **Cloudflare R2** for credential object storage (PDF and JPG artifacts).

| Component | Storage Type | Redundancy & Durability | Primary Recovery Mechanism |
| :--- | :--- | :--- | :--- |
| **Neon PostgreSQL** | Serverless Cloud Postgres | Multi-AZ WAL replication (AWS) | Point-in-Time Restore (PITR) & Instant Branching |
| **Cloudflare R2** | Distributed Object Storage | 99.999999999% (11 9's) durability | Re-generation on demand + R2 Bucket Versioning |

---

## 2. Neon PostgreSQL Continuous Backup Capabilities

Neon features storage-level architecture where compute and storage are decoupled:
- **Write-Ahead Logging (WAL)**: All transactions (`orders`, `users`, `certificates`, `submissions`, `consent_records`, `privacy_requests`) are continuously streamed and archived to cloud object storage.
- **Point-in-Time Recovery (PITR)**: Enables rolling back or restoring the database state to any specific second within the retention window (default: 7 to 30 days depending on the Neon compute tier).
- **Zero-Downtime Branching**: Allows creating instantaneous, isolated read/write copies of the production database at any timestamp without copying raw gigabytes of data.

---

## 3. Safe Step-by-Step Restoration Procedure

> [!IMPORTANT]
> Never perform a destructive restore directly on the active production database during business hours without prior validation on an isolated branch.

### Step 1: Create a Recovery Branch in Neon Console
1. Log into the **Neon Cloud Console** (console.neon.tech).
2. Navigate to the `hireebridge` project.
3. Open the **Branches** tab and click **Create Branch**.
4. In the creation modal:
   - **Branch Name**: `recovery-validation-[TIMESTAMP]`
   - **Parent**: `main`
   - **Restore Type**: Select **Time** and pick the exact recovery point (e.g., 5 minutes before the data corruption/incident).
5. Click **Create**. Neon provisions the snapshot branch within seconds.

### Step 2: Validate Data Integrity on Recovery Branch
1. Obtain the connection string for the new `recovery-validation` branch.
2. In a staging environment, run verification queries to confirm target tables are intact:
   ```sql
   SELECT COUNT(*) FROM users WHERE deleted_at IS NULL;
   SELECT COUNT(*) FROM orders WHERE status = 'paid';
   SELECT COUNT(*) FROM certificates;
   ```

### Step 3: Promote or Swap to Production
Depending on the incident severity:
- **Option A (Targeted Table Export/Import)**: Use `pg_dump` on the recovery branch to export only the affected table(s) and import them into production using `pg_restore`.
- **Option B (Primary Endpoint Switch)**: If catastrophic corruption occurred, set the `recovery-validation` branch as default in Neon, update Render's `DATABASE_URL` environment variable, and trigger a redeployment.

---

## 4. Automated Daily Logical Backups (Recommended Secondary Safeguard)

For secondary redundancy independent of the cloud provider, a scheduled cron or GitHub Action / Render Cron Job can be configured to take a daily logical dump:

```bash
pg_dump "$DATABASE_URL" -Fc -f "hireebridge_backup_$(date +%Y%m%d_%H%M%S).dump"
```

To restore from a logical dump:
```bash
pg_restore -d "$DATABASE_URL" --clean --if-exists -v hireebridge_backup_YYYYMMDD_HHMMSS.dump
```

---

## 5. R2 Storage Artifact Recovery

If R2 certificate artifacts are lost or purged:
1. All metadata (Credential ID, Candidate Name, Domain, Issue Date, Duration) is permanently preserved in PostgreSQL `certificates`.
2. Admin can navigate to **Admin Portal → Storage & Data → Certificate Artifacts & Storage Control**.
3. Click **Regenerate Artifacts**: HireeBridge runs the certificate rendering pipeline, generates pristine JPG and PDF files with the exact same Credential ID and GreyRocks QR code, and uploads them to Cloudflare R2 without altering registry verification.
