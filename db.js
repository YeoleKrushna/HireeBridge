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
          if (options && options.all) {
            return callback(null, addresses.map(a => ({ address: a, family: 4 })));
          }
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
const crypto = require('crypto');
const r2 = require('./utils/r2');
const { PROGRAM_PRICE_DEFAULTS, isValidProgramPrice } = require('./config/pricing');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
fs.mkdirSync(DATA_DIR, { recursive: true });

// Initialize Pool with Neon / PostgreSQL Connection String
let pool = null;
const connStr = process.env.HB_DISABLE_DATABASE === 'true'
  ? null
  : process.env.NEON_DB || process.env['NEON_DB '] || process.env.DATABASE_URL;
if (connStr) {
  pool = new Pool({
    connectionString: connStr.trim(),
    ssl: { rejectUnauthorized: false },
    max: 15,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 7000
  });
  pool.on('error', (err) => {
    console.error('Unexpected Neon PG pool error:', err.message);
  });
}

// R2 Storage Coordination Constants
const R2_STORAGE_LOCK_ID = 1212306226; // 'HBR2' 32-bit advisory lock key
let localReservationLock = Promise.resolve();
let localMailUsageLock = Promise.resolve();

function hashPassword(pwd) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(pwd, salt, 32, { N: 16384, r: 8, p: 1 }).toString('hex');
  return 'scrypt:' + salt + ':' + derivedKey;
}

function verifyPassword(pwd, storedHash) {
  if (!storedHash || !pwd) return false;
  if (storedHash.startsWith('scrypt:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const expectedKey = parts[2];
    try {
      const actualKey = crypto.scryptSync(pwd, salt, 32, { N: 16384, r: 8, p: 1 }).toString('hex');
      return crypto.timingSafeEqual(Buffer.from(actualKey, 'hex'), Buffer.from(expectedKey, 'hex'));
    } catch {
      return false;
    }
  }
  // Legacy salted SHA-256 fallback
  const legacyHash = crypto.createHash('sha256').update(pwd + 'hb_salt_2026').digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(legacyHash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return legacyHash === storedHash;
  }
}

function isLegacyHash(storedHash) {
  return typeof storedHash === 'string' && !storedHash.startsWith('scrypt:');
}

// Fallback JSON DB helpers
function readJsonDb() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return { orders: [], certificates: [], users: [], tasks: [], notifications: [], submissions: [], inquiries: [], domain_resources: [], password_reset_tokens: [], storage_reservations: [], admin_audit_logs: [], mail_daily_usage: [], consent_records: [], privacy_requests: [] };
  }
}
function writeJsonDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error writing JSON DB:', e.message);
  }
}

// Database Operations
const db = {
  pool,
  hashPassword,
  verifyPassword,
  isLegacyHash,

  async init() {
    // Ensure JSON file exists
    if (!fs.existsSync(DB_FILE)) {
      writeJsonDb({ orders: [], certificates: [], users: [], tasks: [], notifications: [], submissions: [], inquiries: [], domain_resources: [], password_reset_tokens: [], mail_daily_usage: [] });
    }

    if (!pool) {
      console.log('Running with local storage database.');
      return true;
    }

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(32) PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          email VARCHAR(150) UNIQUE NOT NULL,
          password VARCHAR(64) NOT NULL,
          phone VARCHAR(30) DEFAULT '',
          role VARCHAR(20) DEFAULT 'student',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS orders (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          email VARCHAR(150) NOT NULL,
          domain VARCHAR(100) NOT NULL,
          duration VARCHAR(30) NOT NULL,
          plan VARCHAR(30) NOT NULL,
          amount NUMERIC(14,3) NOT NULL,
          status VARCHAR(30) DEFAULT 'created',
          credential_id VARCHAR(64),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        ALTER TABLE orders ALTER COLUMN amount TYPE NUMERIC(14,3) USING amount::NUMERIC(14,3);
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS gateway_order_id VARCHAR(100);
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_id VARCHAR(100);
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR';
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT '';
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone VARCHAR(30) DEFAULT '';
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS program_name VARCHAR(120) DEFAULT '';
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_claimed_at TIMESTAMPTZ;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS offer_email_status VARCHAR(20) DEFAULT 'not_sent';
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS offer_email_sent_at TIMESTAMPTZ;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS offer_email_attempted_at TIMESTAMPTZ;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS pricing_currency VARCHAR(3);
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS pricing_amount NUMERIC(14,3);
        ALTER TABLE orders ALTER COLUMN pricing_amount TYPE NUMERIC(14,3) USING pricing_amount::NUMERIC(14,3);
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_currency VARCHAR(3);
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(14,3);
        ALTER TABLE orders ALTER COLUMN payment_amount TYPE NUMERIC(14,3) USING payment_amount::NUMERIC(14,3);
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS settlement_currency VARCHAR(3);
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS settlement_amount NUMERIC(14,3);
        ALTER TABLE orders ALTER COLUMN settlement_amount TYPE NUMERIC(14,3) USING settlement_amount::NUMERIC(14,3);
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(20) DEFAULT 'CASHFREE';
        CREATE UNIQUE INDEX IF NOT EXISTS orders_gateway_order_id_unique ON orders (gateway_order_id) WHERE gateway_order_id IS NOT NULL;

        CREATE TABLE IF NOT EXISTS program_prices (
          plan_id VARCHAR(30) PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          amount_inr NUMERIC(10,2) NOT NULL CHECK (amount_inr > 0 AND amount_inr <= 1000000),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        INSERT INTO program_prices (plan_id, name, amount_inr) VALUES
          ('certificate', 'Certificate Program', 1),
          ('project', 'Project Based Internship', 2),
          ('comprehensive', 'Comprehensive Program', 3)
        ON CONFLICT (plan_id) DO NOTHING;

        CREATE TABLE IF NOT EXISTS certificates (
          credential_id VARCHAR(64) PRIMARY KEY,
          order_id VARCHAR(64),
          name VARCHAR(120) NOT NULL,
          email VARCHAR(150) NOT NULL,
          domain VARCHAR(100) NOT NULL,
          duration VARCHAR(30) NOT NULL,
          issue_date VARCHAR(30) NOT NULL,
          pdf TEXT NOT NULL,
          jpg TEXT,
          pdf_key TEXT,
          jpg_key TEXT,
          pdf_size_bytes INT,
          jpg_size_bytes INT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS tasks (
          id VARCHAR(32) PRIMARY KEY,
          email VARCHAR(150) NOT NULL,
          order_id VARCHAR(64),
          plan VARCHAR(30) DEFAULT '',
          domain VARCHAR(100) DEFAULT '',
          title VARCHAR(200) NOT NULL,
          description TEXT DEFAULT '',
          due_date VARCHAR(50) DEFAULT '',
          status VARCHAR(30) DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS order_id VARCHAR(64);
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS plan VARCHAR(30) DEFAULT '';
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS domain VARCHAR(100) DEFAULT '';
        CREATE UNIQUE INDEX IF NOT EXISTS tasks_order_id_unique ON tasks (order_id) WHERE order_id IS NOT NULL;

        CREATE TABLE IF NOT EXISTS submissions (
          id VARCHAR(32) PRIMARY KEY,
          name VARCHAR(120),
          email VARCHAR(150) NOT NULL,
          order_id VARCHAR(64),
          task_id VARCHAR(32),
          github TEXT NOT NULL,
          linkedin TEXT NOT NULL,
          deployment TEXT DEFAULT '',
          notes TEXT DEFAULT '',
          status VARCHAR(30) DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE submissions ADD COLUMN IF NOT EXISTS order_id VARCHAR(64);
        ALTER TABLE submissions ADD COLUMN IF NOT EXISTS task_id VARCHAR(32);

        CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(32) PRIMARY KEY,
          email VARCHAR(150) DEFAULT '',
          broadcast BOOLEAN DEFAULT FALSE,
          title VARCHAR(200) NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS inquiries (
          id VARCHAR(32) PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          email VARCHAR(150) NOT NULL,
          subject VARCHAR(200) NOT NULL,
          message TEXT NOT NULL,
          status VARCHAR(30) DEFAULT 'new',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS domain_resources (
          id SERIAL PRIMARY KEY,
          domain VARCHAR(100) UNIQUE NOT NULL,
          github_url TEXT DEFAULT '',
          report_url TEXT DEFAULT '',
          ppt_url TEXT DEFAULT '',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(32) NOT NULL,
          token_hash VARCHAR(64) UNIQUE NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ DEFAULT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_prt_user_id ON password_reset_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens(token_hash);
        CREATE INDEX IF NOT EXISTS idx_prt_expires_at ON password_reset_tokens(expires_at);

        ALTER TABLE domain_resources ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE certificates ADD COLUMN IF NOT EXISTS pdf_key TEXT;
        ALTER TABLE certificates ADD COLUMN IF NOT EXISTS jpg_key TEXT;
        ALTER TABLE certificates ADD COLUMN IF NOT EXISTS pdf_size_bytes INT;
        ALTER TABLE certificates ADD COLUMN IF NOT EXISTS jpg_size_bytes INT;
        ALTER TABLE certificates ADD COLUMN IF NOT EXISTS email_status VARCHAR(20) DEFAULT 'not_sent';
        ALTER TABLE certificates ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
        ALTER TABLE certificates ADD COLUMN IF NOT EXISTS email_attempted_at TIMESTAMPTZ;
        ALTER TABLE certificates ADD COLUMN IF NOT EXISTS email_error TEXT DEFAULT '';

        CREATE TABLE IF NOT EXISTS mail_daily_usage (
          mail_date DATE PRIMARY KEY,
          attempt_count INT NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
        CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

        CREATE TABLE IF NOT EXISTS storage_reservations (
          credential_id VARCHAR(64) PRIMARY KEY,
          bytes_reserved BIGINT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_storage_res_expires ON storage_reservations(expires_at);

        CREATE TABLE IF NOT EXISTS admin_audit_logs (
          id SERIAL PRIMARY KEY,
          action VARCHAR(64) NOT NULL,
          admin_email VARCHAR(150) NOT NULL,
          target_id VARCHAR(100),
          target_type VARCHAR(50),
          details JSONB,
          success BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_audit_created_at ON admin_audit_logs(created_at DESC);

        -- DPDP Compliance Schema Additions
        ALTER TABLE users ALTER COLUMN password TYPE VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS age_confirmed BOOLEAN DEFAULT NULL;
        ALTER TABLE users ALTER COLUMN age_confirmed DROP DEFAULT;
        ALTER TABLE users ALTER COLUMN age_confirmed SET DEFAULT NULL;

        CREATE TABLE IF NOT EXISTS consent_records (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64),
          purpose VARCHAR(64) NOT NULL,
          consent_status VARCHAR(20) NOT NULL,
          notice_version VARCHAR(30) NOT NULL,
          consent_timestamp TIMESTAMPTZ DEFAULT NOW(),
          source VARCHAR(64) DEFAULT 'checkout',
          withdrawn_at TIMESTAMPTZ DEFAULT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_consent_user ON consent_records(user_id);
        CREATE INDEX IF NOT EXISTS idx_consent_purpose ON consent_records(purpose);

        CREATE TABLE IF NOT EXISTS privacy_requests (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64),
          requester_email VARCHAR(150) NOT NULL,
          request_type VARCHAR(50) NOT NULL,
          request_details TEXT NOT NULL,
          status VARCHAR(30) DEFAULT 'PENDING',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          resolved_at TIMESTAMPTZ DEFAULT NULL,
          internal_notes TEXT DEFAULT ''
        );
        CREATE INDEX IF NOT EXISTS idx_priv_req_email ON privacy_requests(LOWER(requester_email));
        CREATE INDEX IF NOT EXISTS idx_priv_req_status ON privacy_requests(status);

        -- Production Performance & Concurrency Indexes
        CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(LOWER(email));
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_tasks_email ON tasks(LOWER(email));
        CREATE INDEX IF NOT EXISTS idx_tasks_order_id ON tasks(order_id);
        CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(LOWER(email));
        CREATE INDEX IF NOT EXISTS idx_submissions_order_id ON submissions(order_id);
        CREATE INDEX IF NOT EXISTS idx_certificates_email ON certificates(LOWER(email));
        CREATE INDEX IF NOT EXISTS idx_certificates_order_id ON certificates(order_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_active_task ON submissions(task_id) WHERE task_id IS NOT NULL AND status IN ('pending', 'approved');
      `);

      // Configure the initial/admin account only from deployment environment values.
      const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (adminEmail && adminPassword) {
        await pool.query(`
          INSERT INTO users (id, name, email, password, role)
          VALUES (
            COALESCE(
              (SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1),
              'admin-' || SUBSTRING(MD5(LOWER($1)), 1, 16)
            ),
            'HireeBridge Administrator', $1, $2, 'admin'
          )
          ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = 'admin';
        `, [adminEmail, hashPassword(adminPassword)]);
      } else {
        const existingAdmin = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (!existingAdmin.rowCount) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD to initialize the first administrator.');
      }

      console.log('Neon PostgreSQL initialized.');
      return true;
    } catch (e) {
      console.error('Neon DB init error, using local fallback:', e.message);
      return false;
    }
  },

  // USERS (PostgreSQL authoritative when configured; FAIL CLOSED on error)
  async getUserByEmail(email) {
    const lower = (email || '').trim().toLowerCase();
    if (!lower) return null;
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const res = await activePool.query('SELECT * FROM users WHERE LOWER(email) = $1', [lower]);
        if (res.rows.length) return res.rows[0];
        return null;
      } catch (e) {
        console.error('PG getUserByEmail error (failing closed):', e.message);
        return null; // Production DB outage: FAIL CLOSED, never fall back to local JSON
      }
    }
    // Local development only (when PostgreSQL is intentionally not configured)
    const d = readJsonDb();
    return (d.users || []).find(u => u.email && u.email.toLowerCase() === lower) || null;
  },

  async createUser({ id, name, email, password, phone = '', role = 'student', ageConfirmed = null }) {
    const lower = (email || '').trim().toLowerCase();
    const userId = id || crypto.randomBytes(6).toString('hex');
    const pwdHash = (typeof password === 'string' && (password.startsWith('scrypt:') || (password.length === 64 && /^[0-9a-fA-F]+$/.test(password)))) ? password : hashPassword(password);
    const resolvedAge = (ageConfirmed === true) ? true : (ageConfirmed === false ? false : null);
    const userObj = { id: userId, name: (name || '').trim(), email: lower, password: pwdHash, phone: (phone || '').trim(), role, age_confirmed: resolvedAge, created_at: new Date().toISOString() };

    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        await activePool.query(
          'INSERT INTO users (id, name, email, password, phone, role, age_confirmed) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (email) DO UPDATE SET password = $4, name = $2, age_confirmed = COALESCE($7, users.age_confirmed)',
          [userId, (name || '').trim(), lower, pwdHash, (phone || '').trim(), role, resolvedAge]
        );
        return userObj;
      } catch (e) {
        console.error('PG createUser error (failing closed):', e.message);
        return null; // Production DB outage: FAIL CLOSED, never write to local JSON
      }
    }
    // Local development only (when PostgreSQL is intentionally not configured)
    const d = readJsonDb();
    d.users = d.users || [];
    const idx = d.users.findIndex(u => u.email && u.email.toLowerCase() === lower);
    if (idx >= 0) d.users[idx] = { ...d.users[idx], password: pwdHash, name: (name || '').trim(), age_confirmed: resolvedAge ?? d.users[idx].age_confirmed ?? null };
    else d.users.push(userObj);
    writeJsonDb(d);
    return userObj;
  },

  async getAllUsers() {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const res = await activePool.query('SELECT id, name, email, phone, role, created_at, deleted_at FROM users ORDER BY created_at DESC');
        return res.rows;
      } catch (e) {
        console.error('PG getAllUsers error (failing closed):', e.message);
        return []; // Production DB outage: FAIL CLOSED
      }
    }
    // Local development only (when PostgreSQL is intentionally not configured)
    return (readJsonDb().users || []).map(u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, created_at: u.created_at, deleted_at: u.deleted_at || null }));
  },

  async getUserById(id) {
    const cleanId = (id || '').trim();
    if (!cleanId) return null;
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const res = await activePool.query('SELECT id, name, email, password, phone, role, created_at, deleted_at FROM users WHERE id = $1', [cleanId]);
        if (res.rows.length) return res.rows[0];
        return null;
      } catch (e) {
        console.error('PG getUserById error:', e.message);
        return null;
      }
    }
    const d = readJsonDb();
    const u = (d.users || []).find(item => item.id === cleanId);
    return u ? { ...u, deleted_at: u.deleted_at || null } : null;
  },

  async getUsersWithStats({ search = '', status = 'active' } = {}) {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    const cleanSearch = (search || '').trim().toLowerCase();

    if (activePool) {
      try {
        let whereClauses = [];
        let params = [];
        let pIdx = 1;

        if (status === 'active') {
          whereClauses.push('u.deleted_at IS NULL');
        } else if (status === 'deleted') {
          whereClauses.push('u.deleted_at IS NOT NULL');
        }

        if (cleanSearch) {
          whereClauses.push(`(LOWER(u.name) LIKE $${pIdx} OR LOWER(u.email) LIKE $${pIdx})`);
          params.push(`%${cleanSearch}%`);
          pIdx++;
        }

        const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const sql = `
          SELECT
            u.id, u.name, u.email, u.phone, u.role, u.created_at, u.deleted_at,
            (SELECT COUNT(*) FROM orders o WHERE LOWER(o.email) = LOWER(u.email)) AS orders_count,
            (SELECT COUNT(*) FROM certificates c WHERE LOWER(c.email) = LOWER(u.email)) AS certs_count,
            (SELECT COUNT(*) FROM submissions s WHERE LOWER(s.email) = LOWER(u.email)) AS submissions_count,
            (SELECT COUNT(*) FROM tasks t WHERE LOWER(t.email) = LOWER(u.email)) AS tasks_count,
            (SELECT COUNT(*) FROM notifications n WHERE LOWER(n.email) = LOWER(u.email)) AS notifs_count
          FROM users u
          ${whereSql}
          ORDER BY u.created_at DESC
        `;

        const res = await activePool.query(sql, params);
        return res.rows.map(r => ({
          id: r.id,
          name: r.name,
          email: r.email,
          phone: r.phone,
          role: r.role,
          created_at: r.created_at,
          deleted_at: r.deleted_at,
          ordersCount: parseInt(r.orders_count, 10) || 0,
          certsCount: parseInt(r.certs_count, 10) || 0,
          submissionsCount: parseInt(r.submissions_count, 10) || 0,
          tasksCount: parseInt(r.tasks_count, 10) || 0,
          notifsCount: parseInt(r.notifs_count, 10) || 0
        }));
      } catch (e) {
        console.error('PG getUsersWithStats error:', e.message);
        return [];
      }
    }

    // Local JSON
    const d = readJsonDb();
    let users = d.users || [];
    if (status === 'active') {
      users = users.filter(u => !u.deleted_at);
    } else if (status === 'deleted') {
      users = users.filter(u => u.deleted_at);
    }
    if (cleanSearch) {
      users = users.filter(u => (u.name || '').toLowerCase().includes(cleanSearch) || (u.email || '').toLowerCase().includes(cleanSearch));
    }
    return users.map(u => {
      const email = (u.email || '').toLowerCase();
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        created_at: u.created_at,
        deleted_at: u.deleted_at || null,
        ordersCount: (d.orders || []).filter(o => (o.email || '').toLowerCase() === email).length,
        certsCount: (d.certificates || []).filter(c => (c.email || '').toLowerCase() === email).length,
        submissionsCount: (d.submissions || []).filter(s => (s.email || '').toLowerCase() === email).length,
        tasksCount: (d.tasks || []).filter(t => (t.email || '').toLowerCase() === email).length,
        notifsCount: (d.notifications || []).filter(n => (n.email || '').toLowerCase() === email).length
      };
    });
  },

  async getStudentDependencies(userId) {
    const user = await this.getUserById(userId);
    if (!user) return null;
    const lowerEmail = (user.email || '').toLowerCase();

    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const [ordersRes, certsRes, subsRes, tasksRes, notifsRes, prtRes] = await Promise.all([
          activePool.query('SELECT * FROM orders WHERE LOWER(email) = $1 ORDER BY created_at DESC', [lowerEmail]),
          activePool.query('SELECT * FROM certificates WHERE LOWER(email) = $1 ORDER BY created_at DESC', [lowerEmail]),
          activePool.query('SELECT * FROM submissions WHERE LOWER(email) = $1 ORDER BY created_at DESC', [lowerEmail]),
          activePool.query('SELECT * FROM tasks WHERE LOWER(email) = $1 ORDER BY created_at DESC', [lowerEmail]),
          activePool.query('SELECT * FROM notifications WHERE LOWER(email) = $1 ORDER BY created_at DESC', [lowerEmail]),
          activePool.query('SELECT * FROM password_reset_tokens WHERE user_id = $1', [userId])
        ]);

        const certs = certsRes.rows;
        let r2ArtifactsCount = 0;
        certs.forEach(c => {
          if (c.pdf_key) r2ArtifactsCount++;
          if (c.jpg_key) r2ArtifactsCount++;
        });

        const paidOrders = ordersRes.rows.filter(o => o.status === 'paid');

        return {
          user,
          counts: {
            orders: ordersRes.rows.length,
            paidOrders: paidOrders.length,
            certificates: certs.length,
            submissions: subsRes.rows.length,
            tasks: tasksRes.rows.length,
            notifications: notifsRes.rows.length,
            resetTokens: prtRes.rows.length,
            r2Artifacts: r2ArtifactsCount
          },
          orders: ordersRes.rows,
          certificates: certs,
          submissions: subsRes.rows,
          tasks: tasksRes.rows,
          notifications: notifsRes.rows
        };
      } catch (e) {
        console.error('PG getStudentDependencies error:', e.message);
        return null;
      }
    }

    // Local JSON
    const d = readJsonDb();
    const orders = (d.orders || []).filter(o => (o.email || '').toLowerCase() === lowerEmail);
    const certs = (d.certificates || []).filter(c => (c.email || '').toLowerCase() === lowerEmail);
    const submissions = (d.submissions || []).filter(s => (s.email || '').toLowerCase() === lowerEmail);
    const tasks = (d.tasks || []).filter(t => (t.email || '').toLowerCase() === lowerEmail);
    const notifications = (d.notifications || []).filter(n => (n.email || '').toLowerCase() === lowerEmail);
    const resetTokens = (d.password_reset_tokens || []).filter(t => t.user_id === userId);

    let r2ArtifactsCount = 0;
    certs.forEach(c => {
      if (c.pdfKey || c.pdf_key) r2ArtifactsCount++;
      if (c.jpgKey || c.jpg_key) r2ArtifactsCount++;
    });

    return {
      user,
      counts: {
        orders: orders.length,
        paidOrders: orders.filter(o => o.status === 'paid').length,
        certificates: certs.length,
        submissions: submissions.length,
        tasks: tasks.length,
        notifications: notifications.length,
        resetTokens: resetTokens.length,
        r2Artifacts: r2ArtifactsCount
      },
      orders,
      certificates: certs,
      submissions,
      tasks,
      notifications
    };
  },

  async createStudent({ name, email, phone = '', password, role = 'student' }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    if (!cleanEmail || !cleanName || !password) {
      throw new Error('Name, email, and password are required');
    }
    if (role === 'admin') {
      throw new Error('Cannot create admin account through student management');
    }

    // Check existing
    const existing = await this.getUserByEmail(cleanEmail);
    if (existing) {
      if (existing.deleted_at) {
        const err = new Error('An archived student with this email already exists. You can restore this account instead.');
        err.code = 'STUDENT_ARCHIVED_EXISTS';
        err.existingUserId = existing.id;
        throw err;
      }
      const err = new Error('A student with this email already exists');
      err.code = 'EMAIL_ALREADY_EXISTS';
      throw err;
    }

    const userId = crypto.randomBytes(6).toString('hex');
    const pwdHash = hashPassword(password);
    const userObj = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      password: pwdHash,
      phone: (phone || '').trim(),
      role: 'student',
      created_at: new Date().toISOString(),
      deleted_at: null
    };

    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        await activePool.query(
          'INSERT INTO users (id, name, email, password, phone, role, created_at, deleted_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NULL)',
          [userId, cleanName, cleanEmail, pwdHash, (phone || '').trim(), 'student']
        );
        return userObj;
      } catch (e) {
        console.error('PG createStudent error:', e.message);
        throw e;
      }
    }

    const d = readJsonDb();
    d.users = d.users || [];
    d.users.push(userObj);
    writeJsonDb(d);
    return userObj;
  },

  async softDeleteStudent(userId, adminEmail, reason = '') {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('Student not found');
    if (user.role === 'admin') throw new Error('Cannot delete admin account');

    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        await activePool.query('UPDATE users SET deleted_at = NOW() WHERE id = $1', [userId]);
      } catch (e) {
        console.error('PG softDeleteStudent error:', e.message);
        throw e;
      }
    } else {
      const d = readJsonDb();
      const u = (d.users || []).find(item => item.id === userId);
      if (u) {
        u.deleted_at = new Date().toISOString();
        writeJsonDb(d);
      }
    }

    await this.createAuditLog({
      action: 'STUDENT_SOFT_DELETED',
      adminEmail,
      targetId: userId,
      targetType: 'user',
      details: { name: user.name, email: user.email, reason }
    });

    return { success: true };
  },

  async restoreStudent(userId, adminEmail) {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('Student not found');

    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        await activePool.query('UPDATE users SET deleted_at = NULL WHERE id = $1', [userId]);
      } catch (e) {
        console.error('PG restoreStudent error:', e.message);
        throw e;
      }
    } else {
      const d = readJsonDb();
      const u = (d.users || []).find(item => item.id === userId);
      if (u) {
        u.deleted_at = null;
        writeJsonDb(d);
      }
    }

    await this.createAuditLog({
      action: 'STUDENT_RESTORED',
      adminEmail,
      targetId: userId,
      targetType: 'user',
      details: { name: user.name, email: user.email }
    });

    return { success: true };
  },

  async hardDeleteStudent(userId, { deleteCertificates = false, deleteR2Artifacts = false, deleteOrders = false } = {}, adminEmail) {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('Student not found');
    if (user.role === 'admin') throw new Error('Cannot delete admin account');

    const userEmail = (user.email || '').toLowerCase();
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;

    if (activePool) {
      const client = await activePool.connect();
      try {
        await client.query('BEGIN');

        // Delete reset tokens
        await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);

        // Delete tasks, notifications, submissions
        await client.query('DELETE FROM tasks WHERE LOWER(email) = $1', [userEmail]);
        await client.query('DELETE FROM notifications WHERE LOWER(email) = $1', [userEmail]);
        await client.query('DELETE FROM submissions WHERE LOWER(email) = $1', [userEmail]);

        // Certificates handling
        let certsPurged = [];
        if (deleteCertificates) {
          const cRes = await client.query('SELECT * FROM certificates WHERE LOWER(email) = $1', [userEmail]);
          certsPurged = cRes.rows;
          await client.query('DELETE FROM certificates WHERE LOWER(email) = $1', [userEmail]);
        }

        // Orders handling
        if (deleteOrders) {
          await client.query('DELETE FROM orders WHERE LOWER(email) = $1', [userEmail]);
        }

        // Delete user row
        await client.query('DELETE FROM users WHERE id = $1', [userId]);

        await client.query('COMMIT');

        // Delete R2 objects if requested
        if (deleteCertificates && deleteR2Artifacts && r2.isConfigured()) {
          for (const cert of certsPurged) {
            await r2.deleteCertificateArtifacts(cert.credential_id).catch(() => {});
          }
        }

        await this.createAuditLog({
          action: 'STUDENT_HARD_DELETED',
          adminEmail,
          targetId: userId,
          targetType: 'user',
          details: { email: userEmail, deleteCertificates, deleteR2Artifacts, deleteOrders, certsCount: certsPurged.length }
        });

        return { success: true };
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch {}
        console.error('PG hardDeleteStudent error:', e.message);
        throw e;
      } finally {
        client.release();
      }
    }

    // Local JSON
    const d = readJsonDb();
    d.password_reset_tokens = (d.password_reset_tokens || []).filter(t => t.user_id !== userId);
    d.tasks = (d.tasks || []).filter(t => (t.email || '').toLowerCase() !== userEmail);
    d.notifications = (d.notifications || []).filter(n => (n.email || '').toLowerCase() !== userEmail);
    d.submissions = (d.submissions || []).filter(s => (s.email || '').toLowerCase() !== userEmail);

    let certsPurged = [];
    if (deleteCertificates) {
      certsPurged = (d.certificates || []).filter(c => (c.email || '').toLowerCase() === userEmail);
      d.certificates = (d.certificates || []).filter(c => (c.email || '').toLowerCase() !== userEmail);
      if (deleteR2Artifacts && r2.isConfigured()) {
        for (const cert of certsPurged) {
          await r2.deleteCertificateArtifacts(cert.credentialId).catch(() => {});
        }
      }
    }

    if (deleteOrders) {
      d.orders = (d.orders || []).filter(o => (o.email || '').toLowerCase() !== userEmail);
    }

    d.users = (d.users || []).filter(u => u.id !== userId);
    writeJsonDb(d);

    await this.createAuditLog({
      action: 'STUDENT_HARD_DELETED',
      adminEmail,
      targetId: userId,
      targetType: 'user',
      details: { email: userEmail, deleteCertificates, deleteR2Artifacts, deleteOrders }
    });

    return { success: true };
  },

  async deleteCertificateArtifacts(credentialId, adminEmail) {
    const cert = await this.getCertificateById(credentialId);
    if (!cert) throw new Error(`Certificate ${credentialId} not found`);

    if (r2.isConfigured()) {
      await r2.deleteCertificateArtifacts(credentialId);
    }

    await this.updateCertificateStorageInfo(credentialId, {
      pdfKey: null,
      jpgKey: null,
      pdfSizeBytes: 0,
      jpgSizeBytes: 0
    });

    await this.createAuditLog({
      action: 'CERTIFICATE_ARTIFACTS_DELETED',
      adminEmail,
      targetId: credentialId,
      targetType: 'certificate',
      details: {
        name: cert.name,
        email: cert.email,
        domain: cert.domain,
        freedBytes: (cert.pdfSizeBytes || 0) + (cert.jpgSizeBytes || 0)
      }
    });

    return { success: true };
  },

  async deleteCertificateRecord(credentialId, adminEmail) {
    const cert = await this.getCertificateById(credentialId);
    if (!cert) throw new Error(`Certificate ${credentialId} not found`);

    if (r2.isConfigured()) {
      await r2.deleteCertificateArtifacts(credentialId).catch(() => {});
    }

    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      await activePool.query('DELETE FROM certificates WHERE credential_id = $1', [credentialId]);
    } else {
      const d = readJsonDb();
      d.certificates = (d.certificates || []).filter(c => c.credentialId !== credentialId);
      writeJsonDb(d);
    }

    await this.createAuditLog({
      action: 'CERTIFICATE_RECORD_DELETED',
      adminEmail,
      targetId: credentialId,
      targetType: 'certificate',
      details: { name: cert.name, email: cert.email, domain: cert.domain }
    });

    return { success: true };
  },

  async createAuditLog({ action, adminEmail, targetId, targetType, details = {}, success = true }) {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        await activePool.query(
          `INSERT INTO admin_audit_logs (action, admin_email, target_id, target_type, details, success, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [action, (adminEmail || 'admin').toLowerCase(), targetId || null, targetType || null, JSON.stringify(details), success]
        );
        return true;
      } catch (e) {
        console.error('PG createAuditLog error:', e.message);
        return false;
      }
    }
    const d = readJsonDb();
    d.admin_audit_logs = d.admin_audit_logs || [];
    d.admin_audit_logs.unshift({
      id: Date.now(),
      action,
      admin_email: (adminEmail || 'admin').toLowerCase(),
      target_id: targetId || null,
      target_type: targetType || null,
      details,
      success,
      created_at: new Date().toISOString()
    });
    if (d.admin_audit_logs.length > 500) d.admin_audit_logs = d.admin_audit_logs.slice(0, 500);
    writeJsonDb(d);
    return true;
  },

  async getAuditLogs(limit = 100) {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const res = await activePool.query('SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT $1', [limit]);
        return res.rows;
      } catch (e) {
        console.error('PG getAuditLogs error:', e.message);
        return [];
      }
    }
    const d = readJsonDb();
    return (d.admin_audit_logs || []).slice(0, limit);
  },

  async updateUserPassword(userId, newHashedPassword) {
    if (!userId || !newHashedPassword) return false;
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const res = await activePool.query('UPDATE users SET password = $1 WHERE id = $2', [newHashedPassword, userId]);
        return res.rowCount > 0;
      } catch (e) {
        console.error('PG updateUserPassword error (failing closed):', e.message);
        return false; // Production DB outage: FAIL CLOSED
      }
    }
    // Local development only (when PostgreSQL is intentionally not configured)
    const d = readJsonDb();
    const u = (d.users || []).find(user => user.id === userId);
    if (u) {
      u.password = newHashedPassword;
      writeJsonDb(d);
      return true;
    }
    return false;
  },

  // PASSWORD RESET TOKENS (PostgreSQL authoritative when configured; FAIL CLOSED on error)
  async createPasswordResetToken({ id, userId, tokenHash, expiresAt }) {
    if (!userId || !tokenHash || !expiresAt) return null;
    const tokenId = id || ('prt-' + crypto.randomBytes(8).toString('hex'));
    const expDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);

    if (pool) {
      try {
        // Invalidate previous unused tokens for this user
        await pool.query(
          'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
          [userId]
        );
        // Insert new active token
        const res = await pool.query(
          `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING id, user_id, token_hash, expires_at, used_at, created_at`,
          [tokenId, userId, tokenHash, expDate]
        );
        if (res.rows.length) return res.rows[0];
        return null;
      } catch (e) {
        console.error('PG createPasswordResetToken error (failing closed):', e.message);
        return null; // Production DB outage: FAIL CLOSED, never fall back to local JSON
      }
    }

    // Local development only (when PostgreSQL is intentionally not configured)
    const d = readJsonDb();
    d.password_reset_tokens = d.password_reset_tokens || [];
    d.password_reset_tokens.forEach(t => {
      if (t.user_id === userId && !t.used_at) {
        t.used_at = new Date().toISOString();
      }
    });

    const tokenObj = {
      id: tokenId,
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expDate.toISOString(),
      used_at: null,
      created_at: new Date().toISOString()
    };
    d.password_reset_tokens.push(tokenObj);
    writeJsonDb(d);
    return tokenObj;
  },

  async getPasswordResetToken(tokenHash) {
    if (!tokenHash) return null;
    if (pool) {
      try {
        const res = await pool.query(
          'SELECT id, user_id, token_hash, expires_at, used_at, created_at FROM password_reset_tokens WHERE token_hash = $1 LIMIT 1',
          [tokenHash]
        );
        if (res.rows.length) return res.rows[0];
        return null;
      } catch (e) {
        console.error('PG getPasswordResetToken error (failing closed):', e.message);
        return null; // Production DB outage: FAIL CLOSED, never fall back to local JSON
      }
    }
    // Local development only (when PostgreSQL is intentionally not configured)
    const d = readJsonDb();
    return (d.password_reset_tokens || []).find(t => t.token_hash === tokenHash) || null;
  },

  async markPasswordResetTokenUsed(tokenHash, userId) {
    if (!tokenHash) return false;
    if (pool) {
      try {
        await pool.query(
          'UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1',
          [tokenHash]
        );
        if (userId) {
          await pool.query(
            'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
            [userId]
          );
        }
        return true;
      } catch (e) {
        console.error('PG markPasswordResetTokenUsed error (failing closed):', e.message);
        return false; // Production DB outage: FAIL CLOSED
      }
    }
    // Local development only (when PostgreSQL is intentionally not configured)
    const now = new Date();
    const d = readJsonDb();
    d.password_reset_tokens = d.password_reset_tokens || [];
    d.password_reset_tokens.forEach(t => {
      if (t.token_hash === tokenHash || (userId && t.user_id === userId && !t.used_at)) {
        t.used_at = now.toISOString();
      }
    });
    writeJsonDb(d);
    return true;
  },

  // ATOMIC PASSWORD RESET TRANSACTION (Consistent password update + token invalidation)
  async resetPasswordWithToken({ tokenHash, userId, newHashedPassword }) {
    if (!tokenHash || !userId || !newHashedPassword) {
      return { success: false, reason: 'missing_parameters' };
    }
    if (pool) {
      let client;
      try {
        client = await pool.connect();
      } catch (connErr) {
        console.error('PG resetPasswordWithToken connection error (failing closed):', connErr.message);
        return { success: false, reason: 'db_unavailable' };
      }
      try {
        await client.query('BEGIN');
        const tRes = await client.query(
          'SELECT id, user_id, token_hash, expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1 FOR UPDATE',
          [tokenHash]
        );
        if (tRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return { success: false, reason: 'token_not_found' };
        }
        const tok = tRes.rows[0];
        if (tok.used_at) {
          await client.query('ROLLBACK');
          return { success: false, reason: 'token_already_used' };
        }
        if (new Date(tok.expires_at).getTime() <= Date.now()) {
          await client.query('ROLLBACK');
          return { success: false, reason: 'token_expired' };
        }
        if (tok.user_id !== userId) {
          await client.query('ROLLBACK');
          return { success: false, reason: 'user_mismatch' };
        }

        const uRes = await client.query('UPDATE users SET password = $1 WHERE id = $2', [newHashedPassword, userId]);
        if (uRes.rowCount === 0) {
          await client.query('ROLLBACK');
          return { success: false, reason: 'user_not_found' };
        }

        await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [userId]);
        await client.query('COMMIT');
        return { success: true };
      } catch (txErr) {
        await client.query('ROLLBACK');
        console.error('PG resetPasswordWithToken transaction error (failing closed):', txErr.message);
        return { success: false, reason: 'transaction_error', error: txErr.message };
      } finally {
        client.release();
      }
    }

    // Local development only (when PostgreSQL is intentionally not configured)
    const d = readJsonDb();
    d.password_reset_tokens = d.password_reset_tokens || [];
    const tok = d.password_reset_tokens.find(t => t.token_hash === tokenHash);
    if (!tok) return { success: false, reason: 'token_not_found' };
    if (tok.used_at) return { success: false, reason: 'token_already_used' };
    if (new Date(tok.expires_at).getTime() <= Date.now()) return { success: false, reason: 'token_expired' };
    if (tok.user_id !== userId) return { success: false, reason: 'user_mismatch' };

    const user = (d.users || []).find(u => u.id === userId);
    if (!user) return { success: false, reason: 'user_not_found' };
    user.password = newHashedPassword;

    d.password_reset_tokens.forEach(t => {
      if (t.user_id === userId && !t.used_at) {
        t.used_at = new Date().toISOString();
      }
    });
    writeJsonDb(d);
    return { success: true };
  },

  // ORDERS
  async createOrder(order) {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        await activePool.query(
          'INSERT INTO orders (id, name, email, domain, duration, plan, amount, status, credential_id, gateway_order_id, currency, country, phone, program_name, pricing_currency, pricing_amount, payment_currency, payment_amount, settlement_currency, settlement_amount, payment_gateway) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)',
          [
            order.id, order.name, order.email.toLowerCase(), order.domain, order.duration, order.plan,
            order.amount, order.status, order.credentialId || null, order.gatewayOrderId || null,
            order.currency || 'INR', order.country || '', order.phone || '', order.programName || '',
            order.pricingCurrency || order.currency || 'INR',
            order.pricingAmount != null ? order.pricingAmount : order.amount,
            order.paymentCurrency || order.currency || 'INR',
            order.paymentAmount != null ? order.paymentAmount : order.amount,
            order.settlementCurrency || order.paymentCurrency || order.currency || 'INR',
            order.settlementAmount != null ? order.settlementAmount : (order.paymentAmount != null ? order.paymentAmount : order.amount),
            order.paymentGateway || order.payment_gateway || (order.currency === 'INR' ? 'CASHFREE' : 'PAYPAL')
          ]
        );
        return order;
      } catch (e) {
        console.error('PG createOrder error:', e.message);
        return null;
      }
    }
    // Local development only (when PostgreSQL is intentionally not configured)
    const d = readJsonDb();
    d.orders = d.orders || [];
    d.orders.push(order);
    writeJsonDb(d);
    return order;
  },

  async updateOrder(id, fields) {
    const orderId = (id || '').toString().trim();
    if (!orderId || !fields || typeof fields !== 'object') {
      return null;
    }

    const ALLOWED_ORDER_UPDATE_FIELDS = {
      status: 'status',
      paymentId: 'payment_id',
      payment_id: 'payment_id',
      gatewayOrderId: 'gateway_order_id',
      gateway_order_id: 'gateway_order_id',
      credentialId: 'credential_id',
      credential_id: 'credential_id',
      amount: 'amount',
      pricingAmount: 'pricing_amount',
      pricing_amount: 'pricing_amount',
      paymentAmount: 'payment_amount',
      payment_amount: 'payment_amount',
      settlementAmount: 'settlement_amount',
      settlement_amount: 'settlement_amount',
      pricingCurrency: 'pricing_currency',
      pricing_currency: 'pricing_currency',
      paymentCurrency: 'payment_currency',
      payment_currency: 'payment_currency',
      settlementCurrency: 'settlement_currency',
      settlement_currency: 'settlement_currency',
      currency: 'currency',
      country: 'country',
      paymentGateway: 'payment_gateway',
      payment_gateway: 'payment_gateway',
      name: 'name',
      email: 'email',
      domain: 'domain',
      duration: 'duration',
      plan: 'plan'
    };

    const updates = {};
    for (const [key, rawVal] of Object.entries(fields)) {
      if (Object.prototype.hasOwnProperty.call(ALLOWED_ORDER_UPDATE_FIELDS, key)) {
        const col = ALLOWED_ORDER_UPDATE_FIELDS[key];
        let val = rawVal;
        if (col === 'email' && typeof val === 'string') {
          val = val.trim().toLowerCase();
        }
        updates[col] = val;
      }
    }

    const colsToUpdate = Object.keys(updates);
    if (colsToUpdate.length === 0) {
      return null;
    }

    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const setClauses = [];
        const values = [];
        let idx = 1;
        for (const col of colsToUpdate) {
          setClauses.push(`"${col}" = $${idx++}`);
          values.push(updates[col]);
        }
        values.push(orderId);
        const sql = `UPDATE orders SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`;
        const res = await activePool.query(sql, values);
        if (res.rows.length === 0) {
          return null;
        }
        const updatedRow = res.rows[0];
        if (updatedRow.gateway_order_id && !updatedRow.gatewayOrderId) updatedRow.gatewayOrderId = updatedRow.gateway_order_id;
        if (updatedRow.payment_id && !updatedRow.paymentId) updatedRow.paymentId = updatedRow.payment_id;
        if (updatedRow.credential_id && !updatedRow.credentialId) updatedRow.credentialId = updatedRow.credential_id;
        if (updatedRow.amount != null) updatedRow.amount = Number(updatedRow.amount);
        if (updatedRow.pricing_amount != null) updatedRow.pricingAmount = Number(updatedRow.pricing_amount);
        if (updatedRow.payment_amount != null) updatedRow.paymentAmount = Number(updatedRow.payment_amount);
        if (updatedRow.settlement_amount != null) updatedRow.settlementAmount = Number(updatedRow.settlement_amount);
        if (updatedRow.pricing_currency && !updatedRow.pricingCurrency) updatedRow.pricingCurrency = updatedRow.pricing_currency;
        if (updatedRow.payment_currency && !updatedRow.paymentCurrency) updatedRow.paymentCurrency = updatedRow.payment_currency;
        if (updatedRow.settlement_currency && !updatedRow.settlementCurrency) updatedRow.settlementCurrency = updatedRow.settlement_currency;
        return updatedRow;
      } catch (e) {
        console.error('PG updateOrder error (failing closed):', e.message);
        return null; // Production DB outage: FAIL CLOSED, never fall back to local JSON
      }
    }

    // Local development only (when PostgreSQL is intentionally not configured)
    const d = readJsonDb();
    d.orders = d.orders || [];
    const idx = d.orders.findIndex(o => o && o.id === orderId);
    if (idx === -1) return null;

    const existing = d.orders[idx];
    const updated = { ...existing };

    for (const [key, rawVal] of Object.entries(fields)) {
      if (Object.prototype.hasOwnProperty.call(ALLOWED_ORDER_UPDATE_FIELDS, key)) {
        let val = rawVal;
        if (key === 'email' && typeof val === 'string') {
          val = val.trim().toLowerCase();
        }
        if (key === 'paymentId' || key === 'payment_id') {
          updated.paymentId = val;
          updated.payment_id = val;
        } else if (key === 'gatewayOrderId' || key === 'gateway_order_id') {
          updated.gatewayOrderId = val;
          updated.gateway_order_id = val;
        } else if (key === 'credentialId' || key === 'credential_id') {
          updated.credentialId = val;
          updated.credential_id = val;
        } else if (key === 'pricingAmount' || key === 'pricing_amount') {
          updated.pricingAmount = val != null ? Number(val) : val;
          updated.pricing_amount = val != null ? Number(val) : val;
        } else if (key === 'paymentAmount' || key === 'payment_amount') {
          updated.paymentAmount = val != null ? Number(val) : val;
          updated.payment_amount = val != null ? Number(val) : val;
        } else if (key === 'settlementAmount' || key === 'settlement_amount') {
          updated.settlementAmount = val != null ? Number(val) : val;
          updated.settlement_amount = val != null ? Number(val) : val;
        } else if (key === 'pricingCurrency' || key === 'pricing_currency') {
          updated.pricingCurrency = val;
          updated.pricing_currency = val;
        } else if (key === 'paymentCurrency' || key === 'payment_currency') {
          updated.paymentCurrency = val;
          updated.payment_currency = val;
        } else if (key === 'settlementCurrency' || key === 'settlement_currency') {
          updated.settlementCurrency = val;
          updated.settlement_currency = val;
        } else if (key === 'paymentGateway' || key === 'payment_gateway') {
          updated.paymentGateway = val;
          updated.payment_gateway = val;
        } else if (key === 'amount') {
          updated.amount = val != null ? Number(val) : val;
        } else {
          updated[key] = val;
        }
      }
    }

    d.orders[idx] = updated;
    writeJsonDb(d);
    return updated;
  },

  async claimOrderPaid(id, { paymentId, gatewayOrderId }) {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const result = await activePool.query(
          `UPDATE orders SET status = 'paid_processing', payment_id = $2, gateway_order_id = $3, payment_claimed_at = NOW()
           WHERE id = $1 AND status <> 'paid'
             AND (status <> 'paid_processing' OR payment_claimed_at IS NULL OR payment_claimed_at < NOW() - INTERVAL '5 minutes')
           RETURNING *`,
          [id, paymentId || null, gatewayOrderId]
        );
        if (result.rows.length) return { claimed: true, order: result.rows[0] };
        const existing = await activePool.query('SELECT * FROM orders WHERE id = $1', [id]);
        return { claimed: false, inProgress: existing.rows[0]?.status === 'paid_processing', order: existing.rows[0] || null };
      } catch (e) {
        console.error('PG payment claim failed:', e.message);
        return { claimed: false, order: null };
      }
    }
    const d = readJsonDb();
    const order = (d.orders || []).find(item => item.id === id);
    if (!order || order.status === 'paid') return { claimed: false, order: order || null };
    const claimTime = Date.parse(order.paymentClaimedAt || '');
    if (order.status === 'paid_processing' && Number.isFinite(claimTime) && Date.now() - claimTime < 5 * 60 * 1000) {
      return { claimed: false, inProgress: true, order };
    }
    order.status = 'paid_processing';
    order.paymentClaimedAt = new Date().toISOString();
    order.paymentId = order.payment_id = paymentId || '';
    order.gatewayOrderId = order.gateway_order_id = gatewayOrderId;
    writeJsonDb(d);
    return { claimed: true, order };
  },


  async getOrderById(id) {
    if (!id) return null;
    const cleanId = String(id).trim();
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const res = await activePool.query('SELECT * FROM orders WHERE id = $1', [cleanId]);
        if (res.rows.length) {
          const row = res.rows[0];
          return {
            ...row,
            amount: Number(row.amount),
            gatewayOrderId: row.gateway_order_id || '',
            paymentId: row.payment_id || '',
            credentialId: row.credential_id || '',
            createdAt: row.created_at,
            currency: row.currency || 'INR',
            country: row.country || '',
            phone: row.phone || '',
            programName: row.program_name || '',
            pricingCurrency: row.pricing_currency || row.currency || 'INR',
            pricingAmount: row.pricing_amount != null ? Number(row.pricing_amount) : Number(row.amount),
            paymentCurrency: row.payment_currency || row.currency || 'INR',
            paymentAmount: row.payment_amount != null ? Number(row.payment_amount) : Number(row.amount),
            settlementCurrency: row.settlement_currency || row.payment_currency || row.currency || 'INR',
            settlementAmount: row.settlement_amount != null ? Number(row.settlement_amount) : (row.payment_amount != null ? Number(row.payment_amount) : Number(row.amount)),
            paymentGateway: row.payment_gateway || (row.currency === 'INR' ? 'CASHFREE' : 'PAYPAL'),
            payment_gateway: row.payment_gateway || (row.currency === 'INR' ? 'CASHFREE' : 'PAYPAL')
          };
        }
        return null;
      } catch (e) {
        console.error('PG getOrderById error:', e.message);
        return null;
      }
    }
    const d = readJsonDb();
    return (d.orders || []).find(o => o.id === cleanId) || null;
  },

  async getOrderByGatewayId(gatewayOrderId) {
    if (!gatewayOrderId) return null;
    const cleanId = String(gatewayOrderId).trim();
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const res = await activePool.query(
          'SELECT * FROM orders WHERE gateway_order_id = $1 OR id = $1 LIMIT 1',
          [cleanId]
        );
        if (res.rows.length) {
          const row = res.rows[0];
          return {
            ...row,
            amount: Number(row.amount),
            gatewayOrderId: row.gateway_order_id || '',
            paymentId: row.payment_id || '',
            credentialId: row.credential_id || '',
            createdAt: row.created_at,
            currency: row.currency || 'INR',
            country: row.country || '',
            phone: row.phone || '',
            programName: row.program_name || '',
            pricingCurrency: row.pricing_currency || row.currency || 'INR',
            pricingAmount: row.pricing_amount != null ? Number(row.pricing_amount) : Number(row.amount),
            paymentCurrency: row.payment_currency || row.currency || 'INR',
            paymentAmount: row.payment_amount != null ? Number(row.payment_amount) : Number(row.amount),
            settlementCurrency: row.settlement_currency || row.payment_currency || row.currency || 'INR',
            settlementAmount: row.settlement_amount != null ? Number(row.settlement_amount) : (row.payment_amount != null ? Number(row.payment_amount) : Number(row.amount)),
            paymentGateway: row.payment_gateway || (row.currency === 'INR' ? 'CASHFREE' : 'PAYPAL'),
            payment_gateway: row.payment_gateway || (row.currency === 'INR' ? 'CASHFREE' : 'PAYPAL')
          };
        }
        return null;
      } catch (e) {
        console.error('PG getOrderByGatewayId error:', e.message);
        return null;
      }
    }
    const d = readJsonDb();
    return (d.orders || []).find(o => (o.gatewayOrderId || o.gateway_order_id) === cleanId || o.id === cleanId) || null;
  },

  async getAllOrders() {
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        return res.rows.map(row => ({
          ...row,
          amount: Number(row.amount),
          gatewayOrderId: row.gateway_order_id || '',
          paymentId: row.payment_id || '',
          credentialId: row.credential_id || '',
          createdAt: row.created_at,
          currency: row.currency || 'INR',
          country: row.country || '',
          phone: row.phone || '',
          programName: row.program_name || '',
          pricingCurrency: row.pricing_currency || row.currency || 'INR',
          pricingAmount: row.pricing_amount != null ? Number(row.pricing_amount) : Number(row.amount),
          paymentCurrency: row.payment_currency || row.currency || 'INR',
          paymentAmount: row.payment_amount != null ? Number(row.payment_amount) : Number(row.amount),
          settlementCurrency: row.settlement_currency || row.payment_currency || row.currency || 'INR',
          settlementAmount: row.settlement_amount != null ? Number(row.settlement_amount) : (row.payment_amount != null ? Number(row.payment_amount) : Number(row.amount)),
          paymentGateway: row.payment_gateway || (row.currency === 'INR' ? 'CASHFREE' : 'PAYPAL'),
          payment_gateway: row.payment_gateway || (row.currency === 'INR' ? 'CASHFREE' : 'PAYPAL'),
          offerEmailStatus: row.offer_email_status || 'not_sent',
          offerEmailSentAt: row.offer_email_sent_at || null,
          offerEmailAttemptedAt: row.offer_email_attempted_at || null,
          offerEmailError: row.offer_email_error || ''
        }));
      } catch (e) {
        console.error('PG getAllOrders error:', e.message);
      }
    }
    return readJsonDb().orders || [];
  },

  async getUserOrders(email) {
    const lower = (email || '').trim().toLowerCase();
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM orders WHERE LOWER(email) = $1 ORDER BY created_at DESC', [lower]);
        return res.rows;
      } catch (e) {
        console.error('PG getUserOrders error:', e.message);
      }
    }
    const d = readJsonDb();
    return (d.orders || []).filter(o => o.email && o.email.toLowerCase() === lower);
  },

  // CERTIFICATES
  async createCertificate(cert) {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      const client = await activePool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO certificates (credential_id, order_id, name, email, domain, duration, issue_date, pdf, jpg, pdf_key, jpg_key, pdf_size_bytes, jpg_size_bytes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (credential_id) DO UPDATE SET
             pdf_key = COALESCE(EXCLUDED.pdf_key, certificates.pdf_key),
             jpg_key = COALESCE(EXCLUDED.jpg_key, certificates.jpg_key),
             pdf_size_bytes = COALESCE(EXCLUDED.pdf_size_bytes, certificates.pdf_size_bytes),
             jpg_size_bytes = COALESCE(EXCLUDED.jpg_size_bytes, certificates.jpg_size_bytes),
             pdf = COALESCE(EXCLUDED.pdf, certificates.pdf),
             jpg = COALESCE(EXCLUDED.jpg, certificates.jpg)`,
          [
            cert.credentialId,
            cert.orderId,
            cert.name,
            cert.email.toLowerCase(),
            cert.domain,
            cert.duration,
            cert.issueDate,
            cert.pdf,
            cert.jpg,
            cert.pdfKey || null,
            cert.jpgKey || null,
            cert.pdfSizeBytes || null,
            cert.jpgSizeBytes || null
          ]
        );
        // Atomically remove temporary storage reservation now that permanent row exists
        await client.query('DELETE FROM storage_reservations WHERE credential_id = $1', [cert.credentialId]);
        await client.query('COMMIT');
        return cert;
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch {}
        console.error('PG createCertificate error:', e.message);
        return null;
      } finally {
        client.release();
      }
    }
    // Local development only (when PostgreSQL is intentionally not configured)
    const d = readJsonDb();
    d.certificates = d.certificates || [];
    const existing = d.certificates.find(item => item.credentialId === cert.credentialId || (cert.orderId && (item.orderId || item.order_id) === cert.orderId));
    if (existing) return existing;
    d.certificates.push(cert);
    d.storage_reservations = (d.storage_reservations || []).filter(r => r.credential_id !== cert.credentialId);
    writeJsonDb(d);
    return cert;
  },

  async getAllCertificates() {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const res = await activePool.query('SELECT * FROM certificates ORDER BY created_at DESC');
        return res.rows.map(r => ({
          credentialId: r.credential_id,
          orderId: r.order_id,
          name: r.name,
          email: r.email,
          domain: r.domain,
          duration: r.duration,
          issueDate: r.issue_date,
          pdf: r.pdf,
          jpg: r.jpg,
          pdfKey: r.pdf_key || null,
          jpgKey: r.jpg_key || null,
          pdfSizeBytes: r.pdf_size_bytes || null,
          jpgSizeBytes: r.jpg_size_bytes || null,
          emailStatus: r.email_status || 'not_sent',
          emailSentAt: r.email_sent_at || null,
          emailAttemptedAt: r.email_attempted_at || null,
          emailError: r.email_error || '',
          createdAt: r.created_at
        }));
      } catch (e) {
        console.error('PG getAllCertificates error:', e.message);
      }
    }
    return readJsonDb().certificates || [];
  },

  async getUserCertificates(email) {
    const lower = (email || '').trim().toLowerCase();
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const res = await activePool.query('SELECT * FROM certificates WHERE LOWER(email) = $1 ORDER BY created_at DESC', [lower]);
        return res.rows.map(r => ({
          credentialId: r.credential_id,
          orderId: r.order_id,
          name: r.name,
          email: r.email,
          domain: r.domain,
          duration: r.duration,
          issueDate: r.issue_date,
          pdf: r.pdf,
          jpg: r.jpg,
          pdfKey: r.pdf_key || null,
          jpgKey: r.jpg_key || null,
          pdfSizeBytes: r.pdf_size_bytes || null,
          jpgSizeBytes: r.jpg_size_bytes || null,
          emailStatus: r.email_status || 'not_sent',
          emailSentAt: r.email_sent_at || null,
          emailAttemptedAt: r.email_attempted_at || null,
          emailError: r.email_error || ''
        }));
      } catch (e) {
        console.error('PG getUserCertificates error:', e.message);
      }
    }
    const d = readJsonDb();
    return (d.certificates || []).filter(c => c.email && c.email.toLowerCase() === lower);
  },

  async getCertificateById(credentialId) {
    const id = (credentialId || '').trim();
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const res = await activePool.query('SELECT * FROM certificates WHERE credential_id = $1', [id]);
        if (res.rows.length) {
          const r = res.rows[0];
          return {
            credentialId: r.credential_id,
            orderId: r.order_id,
            name: r.name,
            email: r.email,
            domain: r.domain,
            duration: r.duration,
            issueDate: r.issue_date,
            pdf: r.pdf,
            jpg: r.jpg,
            pdfKey: r.pdf_key || null,
            jpgKey: r.jpg_key || null,
            pdfSizeBytes: r.pdf_size_bytes || null,
            jpgSizeBytes: r.jpg_size_bytes || null,
            emailStatus: r.email_status || 'not_sent',
            emailSentAt: r.email_sent_at || null,
            emailAttemptedAt: r.email_attempted_at || null,
            emailError: r.email_error || ''
          };
        }
      } catch (e) {
        console.error('PG getCertificateById error:', e.message);
      }
    }
    const d = readJsonDb();
    return (d.certificates || []).find(c => c.credentialId === id) || null;
  },

  async getPublicStats() {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const [students, certificates] = await Promise.all([
          activePool.query("SELECT COUNT(*)::int AS count FROM users WHERE LOWER(COALESCE(role, 'student')) <> 'admin' AND deleted_at IS NULL"),
          activePool.query('SELECT COUNT(*)::int AS count FROM certificates')
        ]);
        return {
          students: Math.max(0, Number(students.rows[0]?.count) || 0),
          certificates: Math.max(0, Number(certificates.rows[0]?.count) || 0)
        };
      } catch (e) {
        console.error('PG getPublicStats error:', e.message);
        return null;
      }
    }
    const data = readJsonDb();
    return {
      students: (data.users || []).filter(user => String(user.role || 'student').toLowerCase() !== 'admin' && !user.deleted_at).length,
      certificates: (data.certificates || []).length
    };
  },

  async getProgramPrices() {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      const result = await activePool.query('SELECT plan_id, name, amount_inr, updated_at FROM program_prices ORDER BY CASE plan_id WHEN \'certificate\' THEN 1 WHEN \'project\' THEN 2 WHEN \'comprehensive\' THEN 3 ELSE 4 END');
      return result.rows.map(row => ({ planId: row.plan_id, name: row.name, amount: Number(row.amount_inr), currency: 'INR', updatedAt: row.updated_at }));
    }
    const data = readJsonDb();
    if (!Array.isArray(data.program_prices) || !data.program_prices.length) {
      data.program_prices = PROGRAM_PRICE_DEFAULTS.map(item => ({ ...item, currency: 'INR', updatedAt: new Date().toISOString() }));
      writeJsonDb(data);
    }
    return data.program_prices.map(item => ({ ...item, amount: Number(item.amount), currency: 'INR' }));
  },

  async updateProgramPrice(planId, amount) {
    const plan = PROGRAM_PRICE_DEFAULTS.find(item => item.planId === planId);
    if (!plan || !isValidProgramPrice(amount)) return null;
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      const result = await activePool.query(
        'UPDATE program_prices SET amount_inr = $2, updated_at = NOW() WHERE plan_id = $1 RETURNING plan_id, name, amount_inr, updated_at',
        [planId, amount]
      );
      if (!result.rows.length) return null;
      const row = result.rows[0];
      return { planId: row.plan_id, name: row.name, amount: Number(row.amount_inr), currency: 'INR', updatedAt: row.updated_at };
    }
    const data = readJsonDb();
    if (!Array.isArray(data.program_prices) || !data.program_prices.length) {
      data.program_prices = PROGRAM_PRICE_DEFAULTS.map(item => ({ ...item, currency: 'INR' }));
    }
    const row = data.program_prices.find(item => item.planId === planId);
    if (!row) return null;
    row.amount = amount;
    row.currency = 'INR';
    row.updatedAt = new Date().toISOString();
    writeJsonDb(data);
    return { ...row };
  },

  async getCertificateByOrderId(orderId) {
    const id = String(orderId || '').trim();
    if (!id) return null;
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const res = await activePool.query('SELECT * FROM certificates WHERE order_id = $1 LIMIT 1', [id]);
        if (res.rows.length) {
          const r = res.rows[0];
          return {
            credentialId: r.credential_id,
            orderId: r.order_id,
            name: r.name,
            email: r.email,
            domain: r.domain,
            duration: r.duration,
            issueDate: r.issue_date,
            pdf: r.pdf,
            jpg: r.jpg,
            pdfKey: r.pdf_key || null,
            jpgKey: r.jpg_key || null,
            pdfSizeBytes: r.pdf_size_bytes || null,
            jpgSizeBytes: r.jpg_size_bytes || null,
            emailStatus: r.email_status || 'not_sent',
            emailSentAt: r.email_sent_at || null,
            emailAttemptedAt: r.email_attempted_at || null,
            emailError: r.email_error || ''
          };
        }
      } catch (e) {
        console.error('PG getCertificateByOrderId error:', e.message);
      }
    }
    const d = readJsonDb();
    return (d.certificates || []).find(c => c.orderId === id || c.order_id === id) || null;
  },

  async updateCertificateEmailStatus(credentialId, { status, error = '' } = {}) {
    if (!credentialId || !['not_sent', 'sent', 'failed', 'limit_reached'].includes(status)) return false;
    const timestamp = new Date().toISOString();
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const result = await activePool.query(
          `UPDATE certificates SET email_status = $1, email_attempted_at = $2,
           email_sent_at = CASE WHEN $1 = 'sent' THEN $2 ELSE email_sent_at END,
           email_error = $3 WHERE credential_id = $4`,
          [status, timestamp, error, credentialId]
        );
        return result.rowCount > 0;
      } catch (e) { console.error('PG updateCertificateEmailStatus error:', e.message); return false; }
    }
    const d = readJsonDb();
    const certificate = (d.certificates || []).find(item => item.credentialId === credentialId || item.credential_id === credentialId);
    if (!certificate) return false;
    certificate.emailStatus = status;
    certificate.emailAttemptedAt = timestamp;
    if (status === 'sent') certificate.emailSentAt = timestamp;
    certificate.emailError = error;
    writeJsonDb(d);
    return true;
  },

  async updateOfferLetterEmailStatus(orderId, { status, error = '' } = {}) {
    if (!orderId || !['not_sent', 'sent', 'failed', 'limit_reached'].includes(status)) return false;
    const timestamp = new Date().toISOString();
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const result = await activePool.query(
          `UPDATE orders SET offer_email_status = $1, offer_email_attempted_at = $2,
           offer_email_sent_at = CASE WHEN $1 = 'sent' THEN $2 ELSE offer_email_sent_at END,
           offer_email_error = $3 WHERE id = $4`,
          [status, timestamp, error, orderId]
        );
        return result.rowCount > 0;
      } catch (e) { console.error('PG updateOfferLetterEmailStatus error:', e.message); return false; }
    }
    const d = readJsonDb();
    const order = (d.orders || []).find(item => item.id === orderId || item.order_id === orderId);
    if (!order) return false;
    order.offerEmailStatus = status;
    order.offerEmailAttemptedAt = timestamp;
    if (status === 'sent') order.offerEmailSentAt = timestamp;
    order.offerEmailError = error;
    writeJsonDb(d);
    return true;
  },

  async reserveDailyMailSlot(limit = 300, dateKey = new Date().toISOString().slice(0, 10)) {
    const cap = Math.max(0, Number(limit) || 0);
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const result = await activePool.query(
          `INSERT INTO mail_daily_usage (mail_date, attempt_count) SELECT $1::date, 1 WHERE $2 > 0
           ON CONFLICT (mail_date) DO UPDATE SET attempt_count = mail_daily_usage.attempt_count + 1, updated_at = NOW()
           WHERE mail_daily_usage.attempt_count < $2 RETURNING attempt_count`,
          [dateKey, cap]
        );
        return result.rowCount > 0;
      } catch (e) { console.error('PG reserveDailyMailSlot error:', e.message); return null; }
    }
    const operation = localMailUsageLock.then(() => {
      const d = readJsonDb();
      d.mail_daily_usage = d.mail_daily_usage || [];
      let record = d.mail_daily_usage.find(item => item.date === dateKey);
      if (!record) {
        const legacySent = (d.orders || []).filter(order => order.emailSentDate === dateKey && order.emailSent).length;
        record = { date: dateKey, attemptCount: legacySent };
        d.mail_daily_usage.push(record);
      }
      if (record.attemptCount >= cap) return false;
      record.attemptCount++;
      writeJsonDb(d);
      return true;
    });
    localMailUsageLock = operation.catch(() => {});
    return operation;
  },

  async releaseDailyMailSlot(dateKey = new Date().toISOString().slice(0, 10)) {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        await activePool.query('UPDATE mail_daily_usage SET attempt_count = GREATEST(attempt_count - 1, 0), updated_at = NOW() WHERE mail_date = $1::date', [dateKey]);
        return true;
      } catch (e) { console.error('PG releaseDailyMailSlot error:', e.message); return false; }
    }
    const operation = localMailUsageLock.then(() => {
      const d = readJsonDb();
      const record = (d.mail_daily_usage || []).find(item => item.date === dateKey);
      if (!record) return false;
      record.attemptCount = Math.max(0, (Number(record.attemptCount) || 0) - 1);
      writeJsonDb(d);
      return true;
    });
    localMailUsageLock = operation.catch(() => {});
    return operation;
  },

  async claimCertificateCredential(orderId, proposedCredentialId) {
    const id = String(orderId || '').trim();
    const proposed = String(proposedCredentialId || '').trim();
    if (!id || !proposed) return null;
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const claimed = await activePool.query(
          'UPDATE orders SET credential_id = $2 WHERE id = $1 AND credential_id IS NULL RETURNING credential_id',
          [id, proposed]
        );
        if (claimed.rows[0]?.credential_id) return claimed.rows[0].credential_id;
        const current = await activePool.query('SELECT credential_id FROM orders WHERE id = $1', [id]);
        return current.rows[0]?.credential_id || null;
      } catch (e) {
        console.error('PG claimCertificateCredential error:', e.message);
        return null;
      }
    }
    const data = readJsonDb();
    const order = (data.orders || []).find(item => item.id === id);
    if (!order) return null;
    const current = order.credentialId || order.credential_id;
    if (current) return current;
    order.credentialId = proposed;
    order.credential_id = proposed;
    writeJsonDb(data);
    return proposed;
  },

  async updateCertificateStorageInfo(credentialId, { pdfKey, jpgKey, pdfSizeBytes, jpgSizeBytes }) {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        await activePool.query(
          'UPDATE certificates SET pdf_key = $1, jpg_key = $2, pdf_size_bytes = $3, jpg_size_bytes = $4 WHERE credential_id = $5',
          [pdfKey, jpgKey, pdfSizeBytes, jpgSizeBytes, credentialId]
        );
        return true;
      } catch (e) {
        console.error('PG updateCertificateStorageInfo error:', e.message);
        return false;
      }
    }
    const d = readJsonDb();
    const c = (d.certificates || []).find(item => item.credentialId === credentialId);
    if (c) {
      c.pdfKey = pdfKey;
      c.jpgKey = jpgKey;
      c.pdfSizeBytes = pdfSizeBytes;
      c.jpgSizeBytes = jpgSizeBytes;
      writeJsonDb(d);
      return true;
    }
    return false;
  },

  async getTotalCertificateStorageBytes(includeReservations = true) {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        if (includeReservations) {
          const res = await activePool.query(`
            SELECT
              (SELECT COALESCE(SUM(COALESCE(pdf_size_bytes, 0) + COALESCE(jpg_size_bytes, 0)), 0) FROM certificates) +
              (SELECT COALESCE(SUM(bytes_reserved), 0) FROM storage_reservations WHERE expires_at > NOW())
              AS total_bytes
          `);
          return parseInt(res.rows[0].total_bytes, 10) || 0;
        } else {
          const res = await activePool.query('SELECT COALESCE(SUM(COALESCE(pdf_size_bytes, 0) + COALESCE(jpg_size_bytes, 0)), 0) AS total_bytes FROM certificates');
          return parseInt(res.rows[0].total_bytes, 10) || 0;
        }
      } catch (e) {
        console.error('PG getTotalCertificateStorageBytes error:', e.message);
        return 0;
      }
    }
    const d = readJsonDb();
    const certBytes = (d.certificates || []).reduce((acc, c) => acc + (c.pdfSizeBytes || 0) + (c.jpgSizeBytes || 0), 0);
    if (!includeReservations) return certBytes;
    const now = Date.now();
    const resBytes = (d.storage_reservations || [])
      .filter(r => new Date(r.expires_at).getTime() > now)
      .reduce((acc, r) => acc + (r.bytes_reserved || 0), 0);
    return certBytes + resBytes;
  },

  async reserveStorage(credentialId, incomingBytes, limitBytes) {
    const credId = String(credentialId || '').trim();
    if (!credId) throw new Error('credentialId is required for storage reservation');
    const bytesToReserve = Math.max(0, parseInt(incomingBytes, 10) || 0);
    const maxLimit = (limitBytes !== undefined && limitBytes !== null) ? Math.max(0, parseInt(limitBytes, 10) || 0) : r2.getStorageLimitBytes();

    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      const client = await activePool.connect();
      try {
        await client.query('BEGIN');
        // Serialize concurrent reservation attempts across all cluster workers via PostgreSQL advisory lock
        await client.query('SELECT pg_advisory_xact_lock($1)', [R2_STORAGE_LOCK_ID]);

        // Automatically prune expired reservations
        await client.query('DELETE FROM storage_reservations WHERE expires_at < NOW()');

        // Calculate total committed bytes + active in-flight reservations (excluding current credentialId if retrying)
        const res = await client.query(`
          SELECT
            (SELECT COALESCE(SUM(COALESCE(pdf_size_bytes, 0) + COALESCE(jpg_size_bytes, 0)), 0) FROM certificates WHERE credential_id != $1) +
            (SELECT COALESCE(SUM(bytes_reserved), 0) FROM storage_reservations WHERE credential_id != $1 AND expires_at > NOW())
            AS total_used
        `, [credId]);

        const currentTotal = parseInt(res.rows[0].total_used, 10) || 0;

        if (currentTotal + bytesToReserve > maxLimit) {
          await client.query('ROLLBACK');
          const currentGb = (currentTotal / (1024 ** 3)).toFixed(3);
          const limitGb = (maxLimit / (1024 ** 3)).toFixed(1);
          const incomingMb = (bytesToReserve / (1024 ** 2)).toFixed(2);
          const err = new Error(`R2 storage safety limit exceeded: currently using ${currentGb} GB (including reservations), incoming upload is ${incomingMb} MB, limit is ${limitGb} GB. Upload aborted to prevent unexpected billing.`);
          err.code = 'R2_STORAGE_LIMIT_EXCEEDED';
          err.currentTotal = currentTotal;
          err.limitBytes = maxLimit;
          throw err;
        }

        // Upsert reservation record (valid for 10 minutes)
        await client.query(`
          INSERT INTO storage_reservations (credential_id, bytes_reserved, expires_at)
          VALUES ($1, $2, NOW() + INTERVAL '10 minutes')
          ON CONFLICT (credential_id) DO UPDATE SET
            bytes_reserved = EXCLUDED.bytes_reserved,
            expires_at = EXCLUDED.expires_at
        `, [credId, bytesToReserve]);

        await client.query('COMMIT');
        return { success: true, currentTotal, bytesReserved: bytesToReserve };
      } catch (err) {
        try { await client.query('ROLLBACK'); } catch {}
        throw err;
      } finally {
        client.release();
      }
    }

    // Local development fallback (when PostgreSQL is intentionally not configured)
    return new Promise((resolve, reject) => {
      localReservationLock = localReservationLock.then(() => {
        try {
          const d = readJsonDb();
          d.storage_reservations = d.storage_reservations || [];
          const now = Date.now();
          d.storage_reservations = d.storage_reservations.filter(r => new Date(r.expires_at).getTime() > now);

          const certBytes = (d.certificates || [])
            .filter(c => c.credentialId !== credId)
            .reduce((sum, c) => sum + (c.pdfSizeBytes || 0) + (c.jpgSizeBytes || 0), 0);
          const resBytes = d.storage_reservations
            .filter(r => r.credential_id !== credId)
            .reduce((sum, r) => sum + (r.bytes_reserved || 0), 0);
          const currentTotal = certBytes + resBytes;

          if (currentTotal + bytesToReserve > maxLimit) {
            const currentGb = (currentTotal / (1024 ** 3)).toFixed(3);
            const limitGb = (maxLimit / (1024 ** 3)).toFixed(1);
            const incomingMb = (bytesToReserve / (1024 ** 2)).toFixed(2);
            const err = new Error(`R2 storage safety limit exceeded: currently using ${currentGb} GB (including reservations), incoming upload is ${incomingMb} MB, limit is ${limitGb} GB. Upload aborted to prevent unexpected billing.`);
            err.code = 'R2_STORAGE_LIMIT_EXCEEDED';
            err.currentTotal = currentTotal;
            err.limitBytes = maxLimit;
            return reject(err);
          }

          const existingIdx = d.storage_reservations.findIndex(r => r.credential_id === credId);
          const record = {
            credential_id: credId,
            bytes_reserved: bytesToReserve,
            created_at: new Date().toISOString(),
            expires_at: new Date(now + 10 * 60 * 1000).toISOString()
          };
          if (existingIdx >= 0) {
            d.storage_reservations[existingIdx] = record;
          } else {
            d.storage_reservations.push(record);
          }
          writeJsonDb(d);
          resolve({ success: true, currentTotal, bytesReserved: bytesToReserve });
        } catch (e) {
          reject(e);
        }
      });
    });
  },

  async releaseStorageReservation(credentialId) {
    const credId = String(credentialId || '').trim();
    if (!credId) return false;

    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        await activePool.query('DELETE FROM storage_reservations WHERE credential_id = $1', [credId]);
        return true;
      } catch (e) {
        console.error('PG releaseStorageReservation error:', e.message);
        return false;
      }
    }

    const d = readJsonDb();
    d.storage_reservations = d.storage_reservations || [];
    d.storage_reservations = d.storage_reservations.filter(r => r.credential_id !== credId);
    writeJsonDb(d);
    return true;
  },

  // TASKS
  async createTask(task) {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const result = await activePool.query(
          'INSERT INTO tasks (id, email, order_id, plan, domain, title, description, due_date, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (order_id) WHERE order_id IS NOT NULL DO NOTHING RETURNING id',
          [task.id, task.email.toLowerCase(), task.orderId || null, task.plan || '', task.domain || '', task.title, task.description || '', task.dueDate || '', task.status || 'pending']
        );
        return result.rows.length ? task : this.getTaskByOrderId(task.orderId);
      } catch (e) {
        console.error('PG createTask error:', e.message);
        return null;
      }
    }
    // Local development only (when PostgreSQL is intentionally not configured)
    const d = readJsonDb();
    d.tasks = d.tasks || [];
    const existingTask = task.orderId && d.tasks.find(item => item.orderId === task.orderId);
    if (existingTask) return existingTask;
    d.tasks.push(task);
    writeJsonDb(d);
    return task;
  },

  async getTaskByOrderId(orderId) {
    if (!orderId) return null;
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const result = await activePool.query('SELECT * FROM tasks WHERE order_id = $1 LIMIT 1', [orderId]);
        const row = result.rows[0];
        return row ? { id: row.id, email: row.email, orderId: row.order_id, plan: row.plan, domain: row.domain, title: row.title, description: row.description, dueDate: row.due_date, status: row.status } : null;
      } catch (e) {
        console.error('PG getTaskByOrderId error:', e.message);
        return null;
      }
    }
    return (readJsonDb().tasks || []).find(task => task.orderId === orderId) || null;
  },

  async updateLocalTaskAssignment(orderId, { plan, domain, title, description }) {
    if ((this && this.pool !== undefined) ? this.pool : pool) return false;
    const data = readJsonDb();
    const task = (data.tasks || []).find(item => item.orderId === orderId);
    if (!task) return false;
    Object.assign(task, { plan, domain, title, description, status: 'assigned' });
    writeJsonDb(data);
    return true;
  },

  async getAllTasks() {
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
        return res.rows.map(r => ({
          id: r.id,
          email: r.email,
          orderId: r.order_id,
          plan: r.plan,
          domain: r.domain,
          title: r.title,
          description: r.description,
          dueDate: r.due_date,
          status: r.status,
          createdAt: r.created_at
        }));
      } catch (e) {
        console.error('PG getAllTasks error:', e.message);
      }
    }
    return readJsonDb().tasks || [];
  },

  async getUserTasks(email) {
    const lower = (email || '').trim().toLowerCase();
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM tasks WHERE LOWER(email) = $1 ORDER BY created_at ASC', [lower]);
        return res.rows.map(r => ({
          id: r.id,
          email: r.email,
          orderId: r.order_id,
          plan: r.plan,
          domain: r.domain,
          title: r.title,
          description: r.description,
          dueDate: r.due_date,
          status: r.status
        }));
      } catch (e) {
        console.error('PG getUserTasks error:', e.message);
      }
    }
    const d = readJsonDb();
    return (d.tasks || []).filter(t => t.email && t.email.toLowerCase() === lower);
  },

  // SUBMISSIONS
  async createSubmission(sub) {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        await activePool.query(
          'INSERT INTO submissions (id, name, email, order_id, task_id, github, linkedin, deployment, notes, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [sub.id, sub.name || '', sub.email.toLowerCase(), sub.orderId || null, sub.taskId || null, sub.github, sub.linkedin || '', sub.deployment || '', sub.notes || '', sub.status || 'pending']
        );
        return sub;
      } catch (e) {
        if (e.code === '23505') {
          console.warn('Duplicate submission blocked by DB uniqueness constraint:', sub.taskId);
          return { duplicate: true };
        }
        console.error('PG createSubmission error:', e.message);
        return null;
      }
    }
    // Local development only (when PostgreSQL is intentionally not configured)
    const d = readJsonDb();
    d.submissions = d.submissions || [];
    const existing = d.submissions.find(s => s.taskId === sub.taskId && ['pending', 'approved'].includes(s.status));
    if (existing) {
      return { duplicate: true };
    }
    d.submissions.push(sub);
    writeJsonDb(d);
    return sub;
  },

  async updateTaskStatus(id, status) {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const result = await activePool.query('UPDATE tasks SET status = $1 WHERE id = $2 RETURNING id', [status, id]);
        return result.rowCount > 0;
      } catch (e) {
        console.error('PG updateTaskStatus error:', e.message);
        return false;
      }
    }
    const data = readJsonDb();
    const task = (data.tasks || []).find(item => item.id === id);
    if (!task) return false;
    task.status = status;
    writeJsonDb(data);
    return true;
  },

  async getAllSubmissions() {
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM submissions ORDER BY created_at DESC');
        return res.rows;
      } catch (e) {
        console.error('PG getAllSubmissions error:', e.message);
      }
    }
    return readJsonDb().submissions || [];
  },

  async getUserSubmissions(email) {
    const lower = (email || '').trim().toLowerCase();
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM submissions WHERE LOWER(email) = $1 ORDER BY created_at DESC', [lower]);
        return res.rows;
      } catch (e) {
        console.error('PG getUserSubmissions error:', e.message);
      }
    }
    const d = readJsonDb();
    return (d.submissions || []).filter(s => s.email && s.email.toLowerCase() === lower);
  },

  async evaluateSubmission(id, status) {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const result = await activePool.query("UPDATE submissions SET status = $1 WHERE id = $2 AND status <> 'approved' RETURNING id", [status, id]);
        return result.rowCount > 0;
      } catch (e) {
        console.error('PG evaluateSubmission error:', e.message);
        return false;
      }
    }
    // Local development only (when PostgreSQL is intentionally not configured)
    const d = readJsonDb();
    const s = (d.submissions || []).find(x => x.id === id);
    if (s && s.status !== 'approved') {
      s.status = status;
      writeJsonDb(d);
      return true;
    }
    return false;
  },

  // NOTIFICATIONS
  async createNotification(notif) {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        await activePool.query(
          'INSERT INTO notifications (id, email, broadcast, title, message) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
          [notif.id, (notif.email || '').toLowerCase(), !!notif.broadcast, notif.title, notif.message]
        );
        return notif;
      } catch (e) {
        console.error('PG createNotification error:', e.message);
        return null;
      }
    }
    // Local development only (when PostgreSQL is intentionally not configured)
    const d = readJsonDb();
    d.notifications = d.notifications || [];
    if (d.notifications.some(item => item.id === notif.id)) return notif;
    d.notifications.push(notif);
    writeJsonDb(d);
    return notif;
  },

  async getUserNotifications(email) {
    const lower = (email || '').trim().toLowerCase();
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM notifications WHERE broadcast = TRUE OR LOWER(email) = $1 ORDER BY created_at DESC LIMIT 15', [lower]);
        return res.rows;
      } catch (e) {
        console.error('PG getUserNotifications error:', e.message);
      }
    }
    const d = readJsonDb();
    return (d.notifications || []).filter(n => n.broadcast || (n.email && n.email.toLowerCase() === lower));
  },

  // INQUIRIES & CONTACT MESSAGES
  async createInquiry(inq) {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        await activePool.query(
          'INSERT INTO inquiries (id, name, email, subject, message) VALUES ($1, $2, $3, $4, $5)',
          [inq.id, inq.name, inq.email.toLowerCase(), inq.subject, inq.message]
        );
        return inq;
      } catch (e) {
        console.error('PG createInquiry error:', e.message);
        return null;
      }
    }
    // Local development only (when PostgreSQL is intentionally not configured)
    const d = readJsonDb();
    d.inquiries = d.inquiries || [];
    d.inquiries.push(inq);
    writeJsonDb(d);
    return inq;
  },

  async getAllInquiries() {
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM inquiries ORDER BY created_at DESC');
        return res.rows;
      } catch (e) {
        console.error('PG getAllInquiries error:', e.message);
      }
    }
    const d = readJsonDb();
    return d.inquiries || [];
  },

  // DOMAIN / COURSE RESOURCES
  async getDomainResources(domain) {
    const name = (domain || '').trim();
    if (!name) return null;

    if (pool) {
      try {
        const res = await pool.query(
          'SELECT domain, github_url, report_url, ppt_url, created_at, updated_at FROM domain_resources WHERE LOWER(domain) = LOWER($1) LIMIT 1',
          [name]
        );
        if (res.rows.length) return res.rows[0];
      } catch (e) {
        console.error('PG getDomainResources error:', e.message);
      }
    }

    const d = readJsonDb();
    return (d.domain_resources || []).find(
      r => r.domain && r.domain.toLowerCase() === name.toLowerCase()
    ) || null;
  },

  async getAllDomainResources() {
    if (pool) {
      try {
        const res = await pool.query(
          'SELECT domain, github_url, report_url, ppt_url, created_at, updated_at FROM domain_resources ORDER BY domain ASC'
        );
        return res.rows;
      } catch (e) {
        console.error('PG getAllDomainResources error:', e.message);
      }
    }

    const d = readJsonDb();
    return (d.domain_resources || []).slice().sort((a, b) =>
      String(a.domain || '').localeCompare(String(b.domain || ''))
    );
  },

  async upsertDomainResources({ domain, github_url = '', report_url = '', ppt_url = '' }) {
    const cleanDomain = (domain || '').trim();
    const github = (github_url || '').trim();
    const report = (report_url || '').trim();
    const ppt = (ppt_url || '').trim();

    if (!cleanDomain) return null;

    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const res = await activePool.query(
          `INSERT INTO domain_resources (domain, github_url, report_url, ppt_url)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (domain) DO UPDATE SET
             github_url = EXCLUDED.github_url,
             report_url = EXCLUDED.report_url,
             ppt_url = EXCLUDED.ppt_url,
             updated_at = NOW()
           RETURNING domain, github_url, report_url, ppt_url, created_at, updated_at`,
          [cleanDomain, github, report, ppt]
        );
        if (res.rows.length) return res.rows[0];
        return null;
      } catch (e) {
        console.error('PG upsertDomainResources error:', e.message);
        return null;
      }
    }

    // Local development only (when PostgreSQL is intentionally not configured)
    const d = readJsonDb();
    d.domain_resources = d.domain_resources || [];
    const idx = d.domain_resources.findIndex(
      r => r.domain && r.domain.toLowerCase() === cleanDomain.toLowerCase()
    );

    const now = new Date().toISOString();
    const resource = {
      domain: cleanDomain,
      github_url: github,
      report_url: report,
      ppt_url: ppt,
      created_at: idx >= 0 ? (d.domain_resources[idx].created_at || now) : now,
      updated_at: now
    };

    if (idx >= 0) d.domain_resources[idx] = { ...d.domain_resources[idx], ...resource };
    else d.domain_resources.push(resource);

    writeJsonDb(d);
    return d.domain_resources.find(
      r => r.domain && r.domain.toLowerCase() === cleanDomain.toLowerCase()
    ) || null;
  },

  // STORAGE & DATABASE METRICS FOR ADMIN PANEL
  async getDatabaseStats() {
    let stats = {
      dbType: 'Neon PostgreSQL',
      totalSize: '7.8 MB',
      bytes: 8178892,
      tables: [
        { name: 'users', rows: 0, size: '40 kB' },
        { name: 'orders', rows: 0, size: '24 kB' },
        { name: 'certificates', rows: 0, size: '24 kB' },
        { name: 'tasks', rows: 0, size: '16 kB' },
        { name: 'submissions', rows: 0, size: '16 kB' },
        { name: 'notifications', rows: 0, size: '16 kB' },
        { name: 'inquiries', rows: 0, size: '16 kB' },
        { name: 'domain_resources', rows: 0, size: '16 kB' }
      ]
    };

    if (pool) {
      try {
        const sizeRes = await pool.query("SELECT pg_size_pretty(pg_database_size(current_database())) as size, pg_database_size(current_database()) as bytes;");
        if (sizeRes.rows.length) {
          stats.totalSize = sizeRes.rows[0].size;
          stats.bytes = Number(sizeRes.rows[0].bytes);
        }

        const tableRes = await pool.query(`
          SELECT relname AS name,
                 n_live_tup AS rows,
                 pg_size_pretty(pg_total_relation_size(relid)) AS size
          FROM pg_stat_user_tables
          ORDER BY pg_total_relation_size(relid) DESC;
        `);
        if (tableRes.rows.length) {
          stats.tables = tableRes.rows;
        }
      } catch (e) {
        console.error('PG getDatabaseStats error:', e.message);
      }
    }
    return stats;
  },


  // ==========================================
  // DPDP CONSENT MANAGEMENT
  // ==========================================
  async createConsentRecord({ id, userId, purpose, consentStatus = 'given', noticeVersion = '2026.1', source = 'checkout' }) {
    const consentId = id || ('cn-' + crypto.randomBytes(8).toString('hex'));
    const cleanUserId = userId ? String(userId).trim() : null;
    const cleanPurpose = String(purpose || 'service_delivery').trim();
    const cleanStatus = String(consentStatus || 'given').trim();
    const cleanVersion = String(noticeVersion || '2026.1').trim();
    const cleanSource = String(source || 'checkout').trim();

    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const res = await activePool.query(
          "INSERT INTO consent_records (id, user_id, purpose, consent_status, notice_version, consent_timestamp, source) VALUES ($1, $2, $3, $4, $5, NOW(), $6) RETURNING *",
          [consentId, cleanUserId, cleanPurpose, cleanStatus, cleanVersion, cleanSource]
        );
        return res.rows[0];
      } catch (e) {
        console.error('PG createConsentRecord error:', e.message);
        return null;
      }
    }

    const d = readJsonDb();
    d.consent_records = d.consent_records || [];
    const record = {
      id: consentId,
      user_id: cleanUserId,
      purpose: cleanPurpose,
      consent_status: cleanStatus,
      notice_version: cleanVersion,
      consent_timestamp: new Date().toISOString(),
      source: cleanSource,
      withdrawn_at: null
    };
    d.consent_records.push(record);
    writeJsonDb(d);
    return record;
  },

  async withdrawConsent(userId, purpose) {
    if (!userId || !purpose) return false;
    const cleanUserId = String(userId).trim();
    const cleanPurpose = String(purpose).trim();

    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        await activePool.query(
          "UPDATE consent_records SET consent_status = 'withdrawn', withdrawn_at = NOW() WHERE user_id = $1 AND purpose = $2 AND withdrawn_at IS NULL",
          [cleanUserId, cleanPurpose]
        );
        return true;
      } catch (e) {
        console.error('PG withdrawConsent error:', e.message);
        return false;
      }
    }

    const d = readJsonDb();
    d.consent_records = d.consent_records || [];
    let updated = false;
    for (const r of d.consent_records) {
      if (r.user_id === cleanUserId && r.purpose === cleanPurpose && !r.withdrawn_at) {
        r.consent_status = 'withdrawn';
        r.withdrawn_at = new Date().toISOString();
        updated = true;
      }
    }
    if (updated) writeJsonDb(d);
    return updated;
  },

  async getUserConsents(userId) {
    if (!userId) return [];
    const cleanUserId = String(userId).trim();
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const res = await activePool.query(
          "SELECT * FROM consent_records WHERE user_id = $1 ORDER BY consent_timestamp DESC",
          [cleanUserId]
        );
        return res.rows;
      } catch (e) {
        console.error('PG getUserConsents error:', e.message);
        return [];
      }
    }
    const d = readJsonDb();
    return (d.consent_records || []).filter(r => r.user_id === cleanUserId);
  },

  // ==========================================
  // PRIVACY REQUESTS (Data Principal Rights)
  // ==========================================
  async createPrivacyRequest({ id, userId = null, requesterEmail, requestType, requestDetails, internalNotes = '' }) {
    const cleanEmail = String(requesterEmail || '').trim().toLowerCase();
    const cleanType = String(requestType || 'access').trim().toLowerCase();
    const cleanDetails = String(requestDetails || '').trim();
    if (!cleanEmail || !cleanDetails) {
      throw new Error('Requester email and request details are required.');
    }
    const reqId = id || ('pr-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex'));

    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const res = await activePool.query(
          "INSERT INTO privacy_requests (id, user_id, requester_email, request_type, request_details, status, created_at, internal_notes) VALUES ($1, $2, $3, $4, $5, 'PENDING', NOW(), $6) RETURNING *",
          [reqId, userId || null, cleanEmail, cleanType, cleanDetails, internalNotes || '']
        );
        return res.rows[0];
      } catch (e) {
        console.error('PG createPrivacyRequest error:', e.message);
        throw e;
      }
    }

    const d = readJsonDb();
    d.privacy_requests = d.privacy_requests || [];
    const reqObj = {
      id: reqId,
      user_id: userId || null,
      requester_email: cleanEmail,
      request_type: cleanType,
      request_details: cleanDetails,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      resolved_at: null,
      internal_notes: internalNotes || ''
    };
    d.privacy_requests.unshift(reqObj);
    writeJsonDb(d);
    return reqObj;
  },

  async getPrivacyRequests({ status = null, limit = 50 } = {}) {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        let query = 'SELECT * FROM privacy_requests';
        const params = [];
        if (status) {
          query += ' WHERE LOWER(status) = LOWER($1)';
          params.push(status);
        }
        query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
        params.push(Math.max(1, parseInt(limit, 10) || 50));
        const res = await activePool.query(query, params);
        return res.rows;
      } catch (e) {
        console.error('PG getPrivacyRequests error:', e.message);
        return [];
      }
    }
    const d = readJsonDb();
    let list = d.privacy_requests || [];
    if (status) {
      list = list.filter(r => r.status && r.status.toLowerCase() === status.toLowerCase());
    }
    return list.slice(0, limit);
  },

  async getPrivacyRequestById(id) {
    if (!id) return null;
    const cleanId = String(id).trim();
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const res = await activePool.query('SELECT * FROM privacy_requests WHERE id = $1', [cleanId]);
        return res.rows[0] || null;
      } catch (e) {
        console.error('PG getPrivacyRequestById error:', e.message);
        return null;
      }
    }
    const d = readJsonDb();
    return (d.privacy_requests || []).find(r => r.id === cleanId) || null;
  },

  async updatePrivacyRequestStatus(id, { status, internalNotes = null, adminEmail = 'admin' }) {
    if (!id || !status) throw new Error('Request ID and status are required.');
    const cleanId = String(id).trim();
    const cleanStatus = String(status).trim().toUpperCase();
    const isResolved = ['COMPLETED', 'REJECTED'].includes(cleanStatus);

    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        let sql = 'UPDATE privacy_requests SET status = $1';
        const params = [cleanStatus];
        let pIdx = 2;
        if (isResolved) {
          sql += ', resolved_at = NOW()';
        }
        if (internalNotes !== null && internalNotes !== undefined) {
          sql += ', internal_notes = $' + (pIdx++);
          params.push(internalNotes);
        }
        sql += ' WHERE id = $' + pIdx + ' RETURNING *';
        params.push(cleanId);
        const res = await activePool.query(sql, params);
        if (res.rows.length) {
          await this.createAuditLog({
            action: 'PRIVACY_REQUEST_STATUS_UPDATED',
            adminEmail,
            targetId: cleanId,
            targetType: 'privacy_request',
            details: { newStatus: cleanStatus, internalNotes }
          });
          return res.rows[0];
        }
        return null;
      } catch (e) {
        console.error('PG updatePrivacyRequestStatus error:', e.message);
        throw e;
      }
    }

    const d = readJsonDb();
    d.privacy_requests = d.privacy_requests || [];
    const item = d.privacy_requests.find(r => r.id === cleanId);
    if (!item) return null;
    item.status = cleanStatus;
    if (isResolved) item.resolved_at = new Date().toISOString();
    if (internalNotes !== null && internalNotes !== undefined) item.internal_notes = internalNotes;
    writeJsonDb(d);

    await this.createAuditLog({
      action: 'PRIVACY_REQUEST_STATUS_UPDATED',
      adminEmail,
      targetId: cleanId,
      targetType: 'privacy_request',
      details: { newStatus: cleanStatus, internalNotes }
    });

    return item;
  },

  async getUserPrivacyRequests(emailOrUserId) {
    if (!emailOrUserId) return [];
    const target = String(emailOrUserId).trim().toLowerCase();
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        const res = await activePool.query(
          'SELECT * FROM privacy_requests WHERE LOWER(requester_email) = $1 OR user_id = $2 ORDER BY created_at DESC',
          [target, emailOrUserId]
        );
        return res.rows;
      } catch (e) {
        console.error('PG getUserPrivacyRequests error:', e.message);
        return [];
      }
    }
    const d = readJsonDb();
    return (d.privacy_requests || []).filter(r => (r.requester_email && r.requester_email.toLowerCase() === target) || r.user_id === emailOrUserId);
  },

  // ==========================================
  // RETENTION MAINTENANCE (Safe Data Cleanup)
  // ==========================================
  async runRetentionCleanup() {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        await activePool.query("DELETE FROM password_reset_tokens WHERE expires_at < NOW() - INTERVAL '7 days' OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days')");
        await activePool.query("DELETE FROM storage_reservations WHERE expires_at < NOW()");
      } catch (e) {
        console.warn('PostgreSQL retention cleanup warning:', e.message);
      }
    } else {
      const d = readJsonDb();
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 86400 * 1000;
      d.password_reset_tokens = (d.password_reset_tokens || []).filter(t => new Date(t.expires_at).getTime() > sevenDaysAgo && (!t.used_at || new Date(t.used_at).getTime() > sevenDaysAgo));
      d.storage_reservations = (d.storage_reservations || []).filter(r => new Date(r.expires_at).getTime() > now);
      writeJsonDb(d);
    }
  },

  async cleanTestRecords() {
    const activePool = (this && this.pool !== undefined) ? this.pool : pool;
    if (activePool) {
      try {
        await activePool.query("DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%' OR email LIKE '%example.com')");
        await activePool.query("DELETE FROM orders WHERE status = 'demo-paid' OR email LIKE '%test%' OR email LIKE '%example.com'");
        await activePool.query("DELETE FROM submissions WHERE email LIKE '%test%' OR email LIKE '%example.com'");
        await activePool.query("DELETE FROM tasks WHERE email LIKE '%test%' OR email LIKE '%example.com'");
        await activePool.query("DELETE FROM certificates WHERE email LIKE '%test%' OR email LIKE '%example.com'");
        await activePool.query("DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%example.com'");
        await activePool.query("VACUUM;");
      } catch (e) {
        console.error('PG cleanTestRecords error:', e.message);
      }
    }
    const d = readJsonDb();
    d.password_reset_tokens = (d.password_reset_tokens || []).filter(t => {
      const u = (d.users || []).find(user => user.id === t.user_id);
      return !u || (!u.email.includes('test') && !u.email.includes('example.com'));
    });
    d.orders = (d.orders || []).filter(o => o.status !== 'demo-paid' && !o.email.includes('test') && !o.email.includes('example.com'));
    d.submissions = (d.submissions || []).filter(s => !s.email.includes('test') && !s.email.includes('example.com'));
    d.tasks = (d.tasks || []).filter(t => !t.email.includes('test') && !t.email.includes('example.com'));
    d.certificates = (d.certificates || []).filter(c => !c.email.includes('test') && !c.email.includes('example.com'));
    d.users = (d.users || []).filter(u => !u.email.includes('test') && !u.email.includes('example.com') && u.role !== 'admin' ? true : u.role === 'admin');
    writeJsonDb(d);
  }
};

module.exports = db;
