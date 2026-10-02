require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { PDFDocument, rgb } = require('pdf-lib');
const nodemailer = require('nodemailer');
const { execFile } = require('child_process');
const db = require('./db.js');
const r2 = require('./utils/r2.js');
const { AsyncLocalStorage } = require('async_hooks');
const requestContext = new AsyncLocalStorage();
const {
  SUPPORTED_CURRENCIES,
  VALID_CURRENCY_CODES,
  formatPrice,
  getCurrencyForCountry,
  isValidCurrency,
  isValidProgramPrice,
  getPlanPricing,
  getAllPlansPricing,
} = require('./config/pricing.js');
const { detectVisitorGeo } = require('./utils/geo.js');
const { PROJECT_CATALOGUE, getProjectForDomain } = require('./config/project-catalogue.js');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DEMO_STUDENT_EMAIL = 'demo.student@hireebridge.test';
const DEMO_STUDENT_ORDER_ID = 'HB-DEMO-STUDENT-001';
function isLocalDemoMode() {
  return process.env.HB_DISABLE_DATABASE === 'true' && String(process.env.NODE_ENV || '').toLowerCase() !== 'production';
}
const SITE_URL = process.env.SITE_URL || (process.env.NODE_ENV === 'development' ? `http://localhost:${PORT}` : 'https://hireebridge.in');
const CANONICAL_URL = process.env.CANONICAL_URL || 'https://hireebridge.in';
const GREYROCKS_URL = process.env.GREYROCKS_URL || 'https://greyrocks.in';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'help@hireebridge.in';
const DATA_DIR = path.join(__dirname, 'data');
const TEMPLATE = path.join(__dirname, 'certificate/templates/internship_certificate.jpeg');
const GENERATED = path.join(__dirname, 'certificate/generated');
const CERT_SCRIPT = path.join(__dirname, 'scripts/generate_certificate.py');
const PYTHON_EXE = process.platform === 'win32' ? 'python' : 'python3';

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(GENERATED, { recursive: true });

// Initialize Database
const databaseReady = db.init().catch(err => {
  console.error('Database initialization warning:', err.message);
  return false;
});

// In-Memory Sessions
const sessions = new Map(); // sessionId -> { userId, email, name, role, phone, createdAt }

function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(c => {
      const parts = c.split('=');
      list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
  }
  return list;
}

function getSession(req) {
  const cookies = parseCookies(req);
  if (!cookies.hb_session) return null;
  return sessions.get(cookies.hb_session) || null;
}

function setSession(res, user) {
  const sessionId = crypto.randomBytes(24).toString('hex');
  sessions.set(sessionId, {
    userId: user.id,
    email: user.email.toLowerCase(),
    name: user.name || user.email.split('@')[0],
    role: user.role || 'student',
    phone: user.phone || '',
    createdAt: Date.now()
  });
  res.setHeader('Set-Cookie', `hb_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
  return sessionId;
}

function invalidateUserSessions(userIdOrEmail) {
  if (!userIdOrEmail) return;
  const target = String(userIdOrEmail).toLowerCase();
  for (const [sid, sess] of sessions.entries()) {
    if (sess.userId === userIdOrEmail || (sess.email && sess.email.toLowerCase() === target)) {
      sessions.delete(sid);
    }
  }
}

// ==========================================
// LOGIN BRUTE-FORCE RATE LIMITER
// ==========================================
const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS) || 5;
const LOGIN_LOCKOUT_MS = (Number(process.env.LOGIN_LOCKOUT_MINUTES) || 15) * 60 * 1000;
const LOGIN_WINDOW_MS = (Number(process.env.LOGIN_RATE_WINDOW_MINUTES) || 15) * 60 * 1000;

// Bounded in-memory store for failed attempts
// key -> { attempts: [timestamp, ...], lockedUntil: timestamp }
const loginAttemptStore = new Map();

function getClientIp(req) {
  const cf = req.headers['cf-connecting-ip'];
  const real = req.headers['x-real-ip'];
  const xff = req.headers['x-forwarded-for'];
  const raw = (cf || real || (xff ? xff.split(',')[0] : '') || req.socket?.remoteAddress || '127.0.0.1');
  return String(raw).trim().replace(/^::ffff:/, '');
}

function checkLoginThrottle(ip, email) {
  const now = Date.now();
  const normEmail = String(email || '').trim().toLowerCase();
  const accKey = `acc:${ip}:${normEmail}`;
  const ipKey = `ip:${ip}`;

  // 1. Check account + IP lockout
  const accRecord = loginAttemptStore.get(accKey);
  if (accRecord && accRecord.lockedUntil && accRecord.lockedUntil > now) {
    const retryAfter = Math.max(1, Math.ceil((accRecord.lockedUntil - now) / 1000));
    return { throttled: true, retryAfter };
  }

  // 2. Check global IP lockout
  const ipRecord = loginAttemptStore.get(ipKey);
  if (ipRecord && ipRecord.lockedUntil && ipRecord.lockedUntil > now) {
    const retryAfter = Math.max(1, Math.ceil((ipRecord.lockedUntil - now) / 1000));
    return { throttled: true, retryAfter };
  }

  // 3. Check attempts within window for account + IP
  if (accRecord) {
    const validAttempts = (accRecord.attempts || []).filter(t => now - t < LOGIN_WINDOW_MS);
    if (validAttempts.length >= LOGIN_MAX_ATTEMPTS) {
      accRecord.lockedUntil = now + LOGIN_LOCKOUT_MS;
      const retryAfter = Math.ceil(LOGIN_LOCKOUT_MS / 1000);
      return { throttled: true, retryAfter };
    }
  }

  // 4. Check attempts within window for IP across accounts
  if (ipRecord) {
    const validIpAttempts = (ipRecord.attempts || []).filter(t => now - t < LOGIN_WINDOW_MS);
    if (validIpAttempts.length >= LOGIN_MAX_ATTEMPTS) {
      ipRecord.lockedUntil = now + LOGIN_LOCKOUT_MS;
      const retryAfter = Math.ceil(LOGIN_LOCKOUT_MS / 1000);
      return { throttled: true, retryAfter };
    }
  }

  return { throttled: false };
}

function recordFailedLogin(ip, email) {
  const now = Date.now();
  const normEmail = String(email || '').trim().toLowerCase();
  const accKey = `acc:${ip}:${normEmail}`;
  const ipKey = `ip:${ip}`;

  // Account + IP record
  let accRecord = loginAttemptStore.get(accKey);
  if (!accRecord) {
    accRecord = { attempts: [], lockedUntil: null };
    loginAttemptStore.set(accKey, accRecord);
  }
  accRecord.attempts = (accRecord.attempts || []).filter(t => now - t < LOGIN_WINDOW_MS);
  accRecord.attempts.push(now);
  if (accRecord.attempts.length >= LOGIN_MAX_ATTEMPTS) {
    accRecord.lockedUntil = now + LOGIN_LOCKOUT_MS;
  }

  // IP record
  let ipRecord = loginAttemptStore.get(ipKey);
  if (!ipRecord) {
    ipRecord = { attempts: [], lockedUntil: null };
    loginAttemptStore.set(ipKey, ipRecord);
  }
  ipRecord.attempts = (ipRecord.attempts || []).filter(t => now - t < LOGIN_WINDOW_MS);
  ipRecord.attempts.push(now);
  if (ipRecord.attempts.length >= LOGIN_MAX_ATTEMPTS) {
    ipRecord.lockedUntil = now + LOGIN_LOCKOUT_MS;
  }
}

function recordSuccessfulLogin(ip, email) {
  const normEmail = String(email || '').trim().toLowerCase();
  loginAttemptStore.delete(`acc:${ip}:${normEmail}`);
  loginAttemptStore.delete(`ip:${ip}`);
}

// Bounded store cleanup every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttemptStore.entries()) {
    const isLocked = record.lockedUntil && record.lockedUntil > now;
    const hasActiveAttempts = (record.attempts || []).some(t => now - t < LOGIN_WINDOW_MS);
    if (!isLocked && !hasActiveAttempts) {
      loginAttemptStore.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

// ==========================================
// FORGOT-PASSWORD ABUSE & RATE LIMITER
// ==========================================
const FORGOT_PASSWORD_IP_MAX = Number(process.env.FORGOT_PASSWORD_IP_MAX) || 5;
const FORGOT_PASSWORD_IP_WINDOW_MS = (Number(process.env.FORGOT_PASSWORD_IP_WINDOW_MINUTES) || 15) * 60 * 1000;
const FORGOT_PASSWORD_EMAIL_MAX = Number(process.env.FORGOT_PASSWORD_EMAIL_MAX) || 3;
const FORGOT_PASSWORD_EMAIL_WINDOW_MS = (Number(process.env.FORGOT_PASSWORD_EMAIL_WINDOW_MINUTES) || 60) * 60 * 1000;
const FORGOT_PASSWORD_EMAIL_COOLDOWN_MS = (Number(process.env.FORGOT_PASSWORD_EMAIL_COOLDOWN_MINUTES) || 5) * 60 * 1000;

// Bounded in-memory store for forgot password requests
// Key: fip:<ip> -> { requests: [timestamp, ...] }
// Key: femail:<normalizedEmail> -> { requests: [timestamp, ...], lastSentAt: timestamp }
const forgotPasswordStore = new Map();

function cleanForgotPasswordStore() {
  const now = Date.now();
  for (const [key, record] of forgotPasswordStore.entries()) {
    if (key.startsWith('fip:')) {
      record.requests = (record.requests || []).filter(t => now - t < FORGOT_PASSWORD_IP_WINDOW_MS);
      if (record.requests.length === 0) {
        forgotPasswordStore.delete(key);
      }
    } else if (key.startsWith('femail:')) {
      record.requests = (record.requests || []).filter(t => now - t < FORGOT_PASSWORD_EMAIL_WINDOW_MS);
      const isCooldownActive = record.lastSentAt && (now - record.lastSentAt < FORGOT_PASSWORD_EMAIL_COOLDOWN_MS);
      if (record.requests.length === 0 && !isCooldownActive) {
        forgotPasswordStore.delete(key);
      }
    }
  }
}

// Bounded cleanup: every 10 minutes (unref so timers do not block node shutdown)
setInterval(cleanForgotPasswordStore, 10 * 60 * 1000).unref();

function checkForgotPasswordRateLimit(ip, email) {
  const now = Date.now();
  const normEmail = String(email || '').trim().toLowerCase();
  const ipKey = ip ? `fip:${ip}` : null;
  const emailKey = normEmail ? `femail:${normEmail}` : null;

  // 1. Check IP limit (5 per 15 minutes by default)
  if (ipKey) {
    const ipRecord = forgotPasswordStore.get(ipKey);
    if (ipRecord) {
      const activeRequests = (ipRecord.requests || []).filter(t => now - t < FORGOT_PASSWORD_IP_WINDOW_MS);
      if (activeRequests.length >= FORGOT_PASSWORD_IP_MAX) {
        const oldest = activeRequests[0];
        const retryAfter = Math.max(1, Math.ceil((oldest + FORGOT_PASSWORD_IP_WINDOW_MS - now) / 1000));
        return { allowed: false, throttledBy: 'ip', retryAfter };
      }
    }
  }

  // 2. Check Email limit (3 per 60 minutes and 5-min cooldown)
  if (emailKey) {
    const emailRecord = forgotPasswordStore.get(emailKey);
    if (emailRecord) {
      // Cooldown check (burst protection: max 1 email dispatch per 5 minutes)
      if (emailRecord.lastSentAt && (now - emailRecord.lastSentAt < FORGOT_PASSWORD_EMAIL_COOLDOWN_MS)) {
        const retryAfter = Math.max(1, Math.ceil((emailRecord.lastSentAt + FORGOT_PASSWORD_EMAIL_COOLDOWN_MS - now) / 1000));
        return { allowed: false, throttledBy: 'email_cooldown', retryAfter };
      }

      // Hourly window check (max 3 per 60 minutes)
      const activeRequests = (emailRecord.requests || []).filter(t => now - t < FORGOT_PASSWORD_EMAIL_WINDOW_MS);
      if (activeRequests.length >= FORGOT_PASSWORD_EMAIL_MAX) {
        const oldest = activeRequests[0];
        const retryAfter = Math.max(1, Math.ceil((oldest + FORGOT_PASSWORD_EMAIL_WINDOW_MS - now) / 1000));
        return { allowed: false, throttledBy: 'email_limit', retryAfter };
      }
    }
  }

  return { allowed: true };
}

function recordForgotPasswordAttempt(ip, email, sentEmail = false) {
  const now = Date.now();
  const normEmail = String(email || '').trim().toLowerCase();
  const ipKey = ip ? `fip:${ip}` : null;
  const emailKey = normEmail ? `femail:${normEmail}` : null;

  if (forgotPasswordStore.size > 10000) {
    cleanForgotPasswordStore();
  }

  if (ipKey) {
    let ipRecord = forgotPasswordStore.get(ipKey);
    if (!ipRecord) {
      ipRecord = { requests: [] };
      forgotPasswordStore.set(ipKey, ipRecord);
    }
    ipRecord.requests = (ipRecord.requests || []).filter(t => now - t < FORGOT_PASSWORD_IP_WINDOW_MS);
    ipRecord.requests.push(now);
  }

  if (emailKey) {
    let emailRecord = forgotPasswordStore.get(emailKey);
    if (!emailRecord) {
      emailRecord = { requests: [], lastSentAt: null };
      forgotPasswordStore.set(emailKey, emailRecord);
    }
    emailRecord.requests = (emailRecord.requests || []).filter(t => now - t < FORGOT_PASSWORD_EMAIL_WINDOW_MS);
    emailRecord.requests.push(now);
    if (sentEmail) {
      emailRecord.lastSentAt = now;
    }
  }
}

// Preserve exact Cashfree webhook bytes before any JSON parser can transform them.
app.use('/api/payment/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true }));

// Server-Side Visitor Geolocation & Request Context Middleware
app.use(async (req, res, next) => {
  try {
    const geo = await detectVisitorGeo(req);
    req.visitorGeo = geo;
    requestContext.run({ geo, req }, () => next());
  } catch (err) {
    req.visitorGeo = { country: 'IN', currency: 'INR', source: 'middleware-fallback' };
    requestContext.run({ geo: req.visitorGeo, req }, () => next());
  }
});

// Currency Switcher Endpoints (POST & GET) - Only allows visitor's authorized country currency or explicit INR
app.post('/api/set-currency', (req, res) => {
  const { currency } = req.body || {};
  const code = String(currency || '').trim().toUpperCase();
  const visitorGeo = req.visitorGeo || { country: 'IN', currency: 'INR' };
  const authorized = getCurrencyForCountry(visitorGeo.country);

  if (code && (code === authorized || code === 'INR')) {
    res.setHeader('Set-Cookie', `hb_currency=${encodeURIComponent(code)}; Path=/; Max-Age=2592000; SameSite=Lax`);
    return res.json({ ok: true, currency: code });
  }
  return res.status(403).json({ error: 'Cannot set unauthorized cross-border currency', authorizedCurrency: authorized });
});

app.get('/api/set-currency', (req, res) => {
  const code = String(req.query.currency || '').trim().toUpperCase();
  const redirect = req.query.redirect || req.get('Referrer') || '/';
  const visitorGeo = req.visitorGeo || { country: 'IN', currency: 'INR' };
  const authorized = getCurrencyForCountry(visitorGeo.country);

  if (code && (code === authorized || code === 'INR')) {
    res.setHeader('Set-Cookie', `hb_currency=${encodeURIComponent(code)}; Path=/; Max-Age=2592000; SameSite=Lax`);
  }
  return res.redirect(redirect);
});

// Cache headers for static assets to eliminate FOUC and boost performance
app.use('/assets', express.static(path.join(__dirname, 'public/assets'), { maxAge: '2h' }));
app.use('/brand', express.static(path.join(__dirname, 'public/brand'), { maxAge: '2h' }));
app.use('/css', express.static(path.join(__dirname, 'public/css'), { maxAge: '2h' }));
app.use('/js', express.static(path.join(__dirname, 'public/js'), { maxAge: '2h' }));
app.use('/favicon.ico', express.static(path.join(__dirname, 'public/brand/favicon.ico'), { maxAge: '1d' }));
app.use(['/downloads', '/certificate/generated'], async (req, res, next) => {
  try {
    const rawFile = decodeURIComponent(req.path.replace(/^\//, ''));
    if (!rawFile) return next();

    // Check if this is a certificate artifact: <credentialId>.(pdf|jpg|jpeg)
    const certMatch = rawFile.match(/^([A-Za-z0-9_-]+)\.(pdf|jpg|jpeg)$/i);
    if (certMatch) {
      const rawId = certMatch[1];
      const ext = certMatch[2].toLowerCase() === 'jpeg' ? 'jpg' : certMatch[2].toLowerCase();
      const safeId = normalizeCredentialId(rawId);

      let certificate = null;
      if (safeId) {
        certificate = await db.getCertificateById(safeId);
        if (!certificate) return res.status(404).send('Certificate record not found.');
        if (certificate?.orderId && !String(certificate.orderId).startsWith('HB-MANUAL-')) {
          const submissions = await db.getAllSubmissions();
          const approved = (submissions || []).some(submission =>
            (submission.order_id || submission.orderId) === certificate.orderId && submission.status === 'approved'
          );
          if (!approved) return res.status(404).send('Certificate is not available before task approval.');
        }
      }

      if (safeId && r2.isConfigured()) {
        const key = ext === 'pdf' ? r2.getPdfKey(safeId) : r2.getJpgKey(safeId);
        const head = await r2.headObject(key);
        if (head) {
          const presignedUrl = await r2.getPresignedDownloadUrl(key, {
            expiresIn: 600,
            filename: `Internship_Certificate_${safeId}.${ext}`,
            isInline: ext === 'jpg'
          });
          return res.redirect(302, presignedUrl);
        }
      }
    }

    // Fallback: check local filesystem (for unmigrated certificates or non-certificate files)
    const directPath = path.join(GENERATED, rawFile);
    if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
      return res.sendFile(directPath);
    }
    const normalizedFile = rawFile.replace(/[\/\\]+/g, '-');
    const normalizedPath = path.join(GENERATED, normalizedFile);
    if (fs.existsSync(normalizedPath) && fs.statSync(normalizedPath).isFile()) {
      return res.sendFile(normalizedPath);
    }

    // Fallback: check public templates directory (for report / presentation templates)
    const tplPath = path.join(__dirname, 'public/assets/templates', rawFile);
    if (fs.existsSync(tplPath) && fs.statSync(tplPath).isFile()) {
      return res.sendFile(tplPath);
    }

    if (certMatch) {
      return res.status(404).send('Certificate artifact not found.');
    }
  } catch (e) {
    console.warn('Downloads middleware notice:', e.message);
  }
  next();
}, express.static(GENERATED));

function esc(v = '') {
  return String(v).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}
function formatDate(d = new Date()) {
  try {
    const dateObj = (d instanceof Date && !isNaN(d)) ? d : new Date(d);
    if (isNaN(dateObj)) return '29 Sept 2026';
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(dateObj);
  } catch (e) {
    return '29 Sept 2026';
  }
}

// 32 Technical Domains
const domains = [
  ['Data Science', 'data-science', 'Build practical skills in data analysis, machine learning and evidence-driven problem solving.'],
  ['Artificial Intelligence', 'artificial-intelligence', 'Work through applied AI tasks, model evaluation and practical implementation.'],
  ['Machine Learning', 'machine-learning', 'Practice the full ML workflow from data preparation to evaluation and documentation.'],
  ['Data Analytics', 'data-analytics', 'Learn reporting, SQL, dashboards, business metrics and analytical storytelling.'],
  ['Python Development', 'python-development', 'Build Python applications with clean structure, APIs, testing and documentation.'],
  ['Web Development', 'web-development', 'Create responsive web projects with modern frontend and backend fundamentals.'],
  ['Full Stack Development', 'full-stack-development', 'Work across UI, APIs, databases and deployment in a guided project path.'],
  ['Frontend Development', 'frontend-development', 'Build accessible, responsive interfaces with modern web technologies.'],
  ['Backend Development', 'backend-development', 'Practice APIs, databases, authentication, validation and backend architecture.'],
  ['Cloud Computing', 'cloud-computing', 'Explore cloud fundamentals, deployment, storage, networking and operational workflows.'],
  ['DevOps', 'devops', 'Practice version control, CI/CD concepts, containers and reliable delivery workflows.'],
  ['Cyber Security', 'cyber-security', 'Learn defensive security concepts, secure development and practical security hygiene.'],
  ['UI/UX Design', 'ui-ux-design', 'Turn user needs into flows, wireframes, interfaces and design documentation.'],
  ['Generative AI', 'generative-ai', 'Build practical workflows with LLMs, prompting, evaluation and responsible AI practices.'],
  ['NLP', 'nlp', 'Work with text data, preprocessing, language models and evaluation techniques.'],
  ['Computer Vision', 'computer-vision', 'Explore image processing, computer vision pipelines and model evaluation.'],
  ['Business Analytics', 'business-analytics', 'Translate business questions into metrics, analysis and clear recommendations.'],
  ['Software Testing', 'software-testing', 'Practice test planning, API testing, bug reporting and quality workflows.'],
  ['FDE / Forward Deployed Engineering', 'fde', 'Bridge customer problems, software, data and deployment in practical project scenarios.'],
  ['Product Management', 'product-management', 'Practice requirements, prioritisation, user stories, metrics and product documentation.'],
  ['Mobile App Development', 'mobile-app-development', 'Build cross-platform mobile apps using Flutter or React Native with clean architecture.'],
  ['Big Data Engineering', 'big-data-engineering', 'Design and implement distributed data pipelines with Spark, Kafka and modern data warehouses.'],
  ['Deep Learning', 'deep-learning', 'Train and fine-tune neural networks for computer vision, audio and predictive tasks.'],
  ['Blockchain Development', 'blockchain-development', 'Develop smart contracts, decentralized apps (dApps) and Web3 protocol integrations.'],
  ['Site Reliability Engineering', 'sre', 'Master system observability, automated alerting, disaster recovery and uptime reliability.'],
  ['Ethical Hacking & Pen Testing', 'ethical-hacking', 'Conduct vulnerability assessments, network penetration tests and security audits.'],
  ['Embedded Systems & IoT', 'embedded-iot', 'Program microcontrollers, sensor integration, IoT protocols and hardware-software firmware.'],
  ['Systems Programming in Rust', 'systems-rust', 'Write memory-safe, ultra-fast low-level applications and networking tools using Rust.'],
  ['Game Development', 'game-development', 'Design game loops, physics engines, shaders and interactive 2D/3D gameplay in Unity.'],
  ['Digital Marketing & Growth', 'digital-marketing', 'Execute data-driven SEO, conversion rate optimization, SEM and growth marketing experiments.'],
  ['API & Microservices Architecture', 'api-microservices', 'Architect scalable REST and gRPC microservices with Docker, Redis and PostgreSQL.'],
  ['Bioinformatics & Computational Biology', 'bioinformatics', 'Analyze genomic sequences, molecular datasets and biological pipelines using Python and R.']
];

function assignmentForOrder(order = {}) {
  const domainName = String(order.domain || 'Data Science').trim();
  const project = getProjectForDomain(domainName);
  if (!project) return null;
  const planKey = resolvePlanKey(order.plan);
  const includesReference = planKey === 'project' || planKey === 'comprehensive';
  const comprehensive = planKey === 'comprehensive';
  const requirements = project.requirements.map(item => `\u2022 ${item}`).join('\n');
  const common = [
    `Assigned Internship Task: ${project.title}`,
    `Domain: ${project.domain}`,
    `Plan: ${plans[planKey]?.name || 'Project Based Internship'}`,
    `Internship context: ${project.context}`,
    `Problem statement: ${project.context}`,
    `Objective: ${project.objective}`,
    `Why it matters: Deliver a documented, testable result that addresses the stated student or operator need and makes its limitations clear.`,
    `Expected system / outcome: ${project.objective}`,
    `Functional and technical requirements:\n${requirements}`,
    `Inputs: ${project.inputs}`,
    `Expected outputs: ${project.outputs}`,
    `Data and validation: Use the specified sample/public inputs, document provenance and assumptions, validate malformed or missing inputs, and avoid using real personal data.`,
    `Testing: ${project.tests}`,
    `Documentation: Include setup/run instructions, architecture or workflow, input/output formats, test steps/results, limitations, and attribution for third-party assets or code.`,
    `Deliverables: ${project.outputs}`,
    `Acceptance criteria: All stated requirements are implemented or clearly scoped; the project runs from documented steps; validation and tests are reproducible; outputs are demonstrated; documentation and resource attribution are included.`,
    `Submission requirements: Submit your own implementation repository URL, a concise summary of completed features, test evidence, and any deployment/demo URL or screenshots through Submit Task.`,
    `Evaluation criteria: Requirement coverage, correctness, validation, test quality, documentation, evidence, and responsible attribution.`,
    'Certificate status: Payment provides task access only. The certificate is issued and shown in the Certificate tab only after the submitted task is explicitly approved.'
  ];
  if (includesReference) {
    common.push(`Source Code / Reference Repository: ${project.repo}\nThis plan includes the domain repository as a starting code resource. Review its licence and attribution terms, then set it up, understand how it works, implement the assigned requirements, test your changes, and publish your own project repository. Identify reused material and your original work. See Internship Roadmap for setup and GitHub guidance.`);
  } else {
    common.push('Resources: This plan provides the project specification only. You build the project independently from the stated requirements; source code and a GitHub reference repository are not included.');
  }
  if (comprehensive) {
    common.push('Complete kit: Open Project Resources for the domain source repository, editable internship report, presentation deck, and offer letter. Adapt and document your implementation, submit the required evidence, and receive the certificate only after explicit reviewer approval.');
  }
  return { project, title: project.title, description: common.join('\n\n'), includesReference, comprehensive, planKey };
}

// Standard 3 Plans
const plans = {
  certificate: {
    id: 'certificate',
    name: 'Certificate Program',
    subtitle: 'Direct Credential Path',
    desc: 'Build your assigned project independently from a detailed brief. Submit your work for review; the certificate follows approval.',
    features: [
      'Detailed Task and Requirements',
      'Build the Project Yourself',
      'Submit Your Own GitHub Work',
      'Reviewer Approval Before Certificate',
      'Credential Access After Approval'
    ]
  },
  project: {
    id: 'project',
    name: 'Project Based Internship',
    subtitle: 'Guided Projects + Proof',
    featured: true,
    desc: 'Use the included domain source repository as a starting point: run it, understand it, adapt it, and publish your own implementation.',
    features: [
      'Everything in Certificate Program',
      'Domain Source Code / GitHub Repository',
      'Internship Roadmap & Setup Guidance',
      'GitHub Workflow and Evidence Guidance',
      'Reviewer Approval Before Certificate'
    ]
  },
  comprehensive: {
    id: 'comprehensive',
    name: 'Comprehensive Program',
    subtitle: 'Complete Academic & Career Kit',
    desc: 'Get the complete project kit: source resources, editable report, presentation, offer letter, and guided project materials.',
    features: [
      'Everything in Project Based Internship',
      'Comprehensive Domain-Specific Project Materials',
      'Source Code & Repository',
      'Editable Internship Report and PPT / Presentation',
      'Offer Letter; Certificate After Task Approval'
    ]
  }
};

function resolvePlanKey(key) {
  if (key === 'starter') return 'certificate';
  if (key === 'direct') return 'project';
  if (plans[key]) return key;
  return 'project';
}

const blogTopics = [
  ['What Is an Internship Certificate and Why Does It Matter?', 'internship-certificate', 'internship certificate, certificate of internship, internship completion certificate'],
  ['How to Get an Internship Certificate Online', 'get-internship-certificate-online', 'get internship certificate online, online internship certificate'],
  ['Internship Certificate vs Experience Certificate', 'internship-vs-experience-certificate', 'internship certificate vs experience certificate'],
  ['What Should an Internship Certificate Include?', 'what-should-internship-certificate-include', 'internship certificate format, certificate details'],
  ['How to Add an Internship Certificate to Your Resume', 'add-internship-certificate-to-resume', 'internship certificate resume, internship experience'],
  ['How to Verify an Internship Certificate', 'how-to-verify-internship-certificate', 'verify internship certificate, certificate verification'],
  ['Internship Certificate for College Submission: A Practical Guide', 'internship-certificate-for-college', 'college internship certificate, internship submission'],
  ['Online Internship Certificate: What Students Should Check', 'online-internship-certificate-guide', 'online internship, internship credential'],
  ['How to Choose an Internship Domain in 2026', 'choose-internship-domain', 'internship domains, best internship domain'],
  ['Data Science Internship Certificate: What to Look For', 'data-science-internship-certificate', 'data science internship certificate'],
  ['AI and Machine Learning Internship Certificate Guide', 'ai-ml-internship-certificate', 'AI internship certificate, machine learning internship'],
  ['Python Internship Certificate: Skills and Evidence', 'python-internship-certificate', 'python internship certificate'],
  ['Web Development Internship Certificate Guide', 'web-development-internship-certificate', 'web development internship certificate'],
  ['Cloud and DevOps Internship Certificate Guide', 'cloud-devops-internship-certificate', 'cloud internship certificate, devops internship'],
  ['How GitHub Project Work Strengthens Internship Evidence', 'github-internship-project', 'github internship project, internship proof'],
  ['Internship Tasks: How to Document What You Actually Did', 'document-internship-tasks', 'internship tasks, internship documentation'],
  ['Internship Certificate Format: Modern Examples and Checklist', 'internship-certificate-format-checklist', 'internship certificate format, certificate template'],
  ['How Internship Credentials Can Support a Fresher Portfolio', 'internship-credential-portfolio', 'fresher portfolio, internship credential'],
  ['A Student Checklist Before Buying an Online Internship Program', 'student-internship-buying-checklist', 'online internship checklist, internship program'],
  ['HireeBridge Internship Workflow: From Enrollment to Credential', 'hireebridge-internship-workflow', 'HireeBridge internship, internship credential workflow']
];

function article(topic, keywords) {
  const [title, slug, kw] = topic;
  const paragraphs = [
    `${title} is a common search topic for students, recent graduates and early-career professionals who want to document practical work. A useful internship credential should be connected to a clear process: what the learner was expected to do, what was submitted, how completion was recorded and which organisation issued the credential. This guide explains the practical side without assuming that a certificate alone replaces real project evidence.`,
    `When you compare internship certificate options, look beyond the graphic design of the document. Check the issuer, the domain, the duration, the issue date, the credential or certificate ID, and whether there is a verification path. A certificate is easier for another person to understand when those details are consistent and when the document can be checked independently.`,
    `For students, the strongest workflow is usually certificate plus evidence. Evidence can include a GitHub repository, project screenshots, a short report, a deployment link, test results, dashboards, design files or a concise explanation of the work. These artifacts help a recruiter, mentor or college reviewer understand what was actually completed.`,
    `A well-organised internship record also makes it easier to update a resume and portfolio. Instead of writing a vague line such as “completed an internship”, keep the domain, project scope, tools used, dates and measurable output together. If the program includes a task dashboard, use it to record progress and keep links to submissions in one place.`,
    `HireeBridge is designed around this idea. The platform provides structured internship pathways across technology, data, design, product and business domains. Its credential workflow is connected to GreyRocks as the issuing partner in the platform model. The public website should always make the distinction clear: HireeBridge manages the student-facing program experience, while GreyRocks is the stated credential issuer and verification destination.`,
    `Before using any internship certificate for college submission or employment, confirm the receiving organisation's own requirements. Some colleges require a specific duration, letterhead, supervisor details or physical signature. Employers can also ask for project evidence rather than relying on a certificate. Treat the certificate as one part of a complete record of work.`,
    `If you are searching for ${kw}, build a checklist before enrolling. Confirm the program price, deliverables, domain, duration, completion rules, refund terms, support channel and certificate workflow. Keep your payment receipt and completion records. A transparent program should explain these details before checkout rather than hiding them after payment.`,
    `Finally, remember that an internship certificate should describe something that actually happened. Do not submit a certificate for work you did not complete, and do not represent a credential as employment experience if it was not employment. Honest documentation protects the student and makes the credential more useful to the people reviewing it.`
  ];
  return `<h2>${esc(title)}</h2>${paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}<h3>Quick checklist</h3><ul><li>Confirm the issuer and verification destination.</li><li>Check your name, domain, dates and credential ID.</li><li>Keep project or task evidence alongside the certificate.</li><li>Read the program, privacy and refund terms before payment.</li><li>Use the credential accurately on your resume and portfolio.</li></ul><h3>Frequently asked questions</h3><h4>Is an internship certificate the same as work experience?</h4><p>No. It documents an internship or training experience; it should not be described as employment unless the underlying arrangement was employment.</p><h4>Can I use an online internship certificate?</h4><p>That depends on the receiving college, employer or other organisation. Check their submission requirements first.</p><h4>What should I verify?</h4><p>Check the issuer, certificate ID, dates, domain and the official verification route.</p><h4>Should I keep project evidence?</h4><p>Yes. A certificate is stronger when paired with accurate project, task or portfolio evidence that reflects the work completed.</p><h4>Can a certificate guarantee a job?</h4><p>No. A credential can document an experience, but it does not guarantee employment, salary or admission.</p>`;
}

// Master Layout
function layout({
  title,
  description,
  content,
  active = '',
  session = null,
  currency = null,
  keywords = null,
  ogImage = null,
  ogType = 'website',
  noindex = false
}) {
  let navActions = `<a class="btn btn-dark" href="/login">Login</a>`;
  if (session) {
    const roleLink = session.role === 'admin' ? '/admin' : '/dashboard';
    const roleLabel = session.role === 'admin' ? 'Admin Portal' : 'Dashboard';
    const firstName = esc((session.name || 'User').split(' ')[0]);
    const firstInitial = esc((session.name || 'U').charAt(0).toUpperCase());
    navActions = `
      <div class="user-pill">
        <span class="user-circle">${firstInitial}</span>
        <span class="user-pill-name">${firstName}</span>
      </div>
      <a class="btn btn-dark" href="${roleLink}">${roleLabel}</a>
      <a class="btn btn-ghost" href="/logout">Logout</a>
    `;
  }

  const defaultKeywords = 'internship programs, verified certificate, virtual internship, software engineering internship, data science internship, web development internship, cloud computing, hireebridge, student internships, online internship with certificate, tech skills, verified credentials';
  const metaKeywords = keywords || defaultKeywords;
  const isPrivate = noindex || /^\/(admin|dashboard|checkout|login|reset-password|forgot-password)(\/|$)/.test(active);
  const robotsDirective = isPrivate ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  const cleanActive = (active || '').split('?')[0].split('#')[0];
  const canonicalUrl = `${CANONICAL_URL}${cleanActive.startsWith('/') ? cleanActive : (cleanActive ? '/' + cleanActive : '')}`;
  const metaOgImage = ogImage || `${CANONICAL_URL}/assets/sample-certificate.jpg`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="keywords" content="${esc(metaKeywords)}">
  <meta name="robots" content="${robotsDirective}">
  <meta name="googlebot" content="${robotsDirective}">
  <meta name="theme-color" content="#0b1f36">
  <meta name="author" content="HireeBridge">
  <link rel="canonical" href="${esc(canonicalUrl)}">
  <link rel="icon" type="image/png" sizes="32x32" href="/brand/favicon.png">
  <link rel="apple-touch-icon" href="/brand/favicon.png">
  <link rel="shortcut icon" href="/favicon.ico">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="${esc(ogType)}">
  <meta property="og:site_name" content="HireeBridge">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonicalUrl)}">
  <meta property="og:image" content="${esc(metaOgImage)}">
  <meta property="og:image:secure_url" content="${esc(metaOgImage)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(title)}">
  <meta property="og:locale" content="en_US">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@hireebridge">
  <meta name="twitter:creator" content="@hireebridge">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(metaOgImage)}">
  <meta name="twitter:image:alt" content="${esc(title)}">

  ${!isPrivate ? `
  <!-- Structured Data (Schema.org JSON-LD) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "EducationalOrganization",
        "@id": "https://hireebridge.in/#organization",
        "name": "HireeBridge",
        "url": "https://hireebridge.in",
        "logo": {
          "@type": "ImageObject",
          "url": "https://hireebridge.in/brand/hireebridge-logo.png"
        },
        "image": "https://hireebridge.in/assets/sample-certificate.jpg",
        "description": "Global virtual internship and verified credentials platform for engineering and computer science students.",
        "email": "help@hireebridge.in",
        "sameAs": [
          "https://www.linkedin.com/company/hireebridge",
          "https://t.me/+u1eccYEzCelmZDBl",
          "https://www.instagram.com/hireebridge?stkn=MTU1ZndxY3djZGkxdA=="
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "contactType": "Customer Support",
          "email": "help@hireebridge.in"
        }
      },
      {
        "@type": "WebSite",
        "@id": "https://hireebridge.in/#website",
        "url": "https://hireebridge.in",
        "name": "HireeBridge",
        "publisher": {
          "@id": "https://hireebridge.in/#organization"
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://hireebridge.in/internships?search={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      }
    ]
  }
  </script>` : ''}

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/styles.css?v=5.5">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <style>
    /* Student Dashboard Layout (Matching Admin Sidebar + Main Content Design) */
    .dashboard { max-width: 1340px; margin: 24px auto 60px; padding: 0 10px; }
    .dashboard-layout { display: grid; grid-template-columns: 260px 1fr; gap: 24px; align-items: start; }
    .dashboard-sidebar { background: rgba(255,255,255,.94); border: 1px solid var(--line); border-radius: 18px; padding: 18px 14px; position: sticky; top: 88px; z-index: 20; max-height: calc(100vh - 104px); overflow-y: auto; overscroll-behavior: contain; align-self: start; box-shadow: var(--shadow); }
    .dashboard-sidebar-header { padding: 0 8px 14px; margin-bottom: 12px; border-bottom: 1px solid var(--line); }
    .dashboard-sidebar-header h3 { font: 800 15px Manrope, sans-serif; margin: 0 0 3px; color: var(--ink); letter-spacing: -.01em; }
    .dashboard-sidebar-header p { margin: 0; font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dashboard-nav { list-style: none !important; list-style-type: none !important; padding: 0 !important; margin: 0 !important; display: flex !important; flex-direction: column !important; gap: 3px !important; }
    .dashboard-nav li { list-style: none !important; list-style-type: none !important; margin: 0 !important; padding: 0 !important; }
    .dashboard-nav button.dashboard-tab { display: flex !important; align-items: center !important; gap: 11px !important; width: 100% !important; text-align: left !important; padding: 11px 14px !important; border-radius: 11px !important; color: #475569 !important; font-size: 13.5px !important; font-weight: 700 !important; transition: all .15s ease !important; background: transparent !important; border: 1px solid transparent !important; cursor: pointer !important; font-family: 'DM Sans', sans-serif !important; box-sizing: border-box !important; list-style: none !important; }
    .dashboard-nav button.dashboard-tab svg { flex-shrink: 0; color: #64748b; transition: color .15s ease; }
    .dashboard-nav button.dashboard-tab:hover { background: #edf5f8 !important; color: #0b1f36 !important; border-color: #e2e8f0 !important; }
    .dashboard-nav button.dashboard-tab:hover svg { color: #0d6e6e !important; }
    .dashboard-nav button.dashboard-tab.active { background: #0b1f36 !important; color: #ffffff !important; border-color: #0b1f36 !important; box-shadow: 0 4px 14px rgba(11,31,54,.18) !important; font-weight: 800 !important; }
    .dashboard-nav button.dashboard-tab.active svg { color: #38bdf8 !important; }
    .dashboard-main { background: rgba(255,255,255,.94); border: 1px solid var(--line); border-radius: 18px; padding: 28px 30px; box-shadow: var(--shadow); min-width: 0; }

    /* Tab Switching */
    .dashboard-tabs { display: none !important; }
    .tab-content { display: none; }
    .tab-content.active { display: block; animation: tabFadeIn .2s ease; }
    @keyframes tabFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

    .dash-info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .dash-info-item { background: rgba(255,255,255,.88); border: 1px solid var(--line); border-radius: 14px; padding: 18px; }
    .dash-info-item label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); display: block; margin-bottom: 4px; }
    .dash-info-item span, .dash-info-item p { font-size: 15px; color: var(--ink); margin: 0; }

    .task-list { list-style: none !important; padding: 0 !important; margin: 0 !important; }
    .task-item { display: flex; align-items: center; gap: 14px; padding: 16px; background: rgba(255,255,255,.88); border: 1px solid var(--line); border-radius: 14px; margin-bottom: 10px; }
    .task-item .task-status { width: 32px; height: 32px; border-radius: 50%; background: #edf5f8; border: 2px solid var(--line); display: grid; place-items: center; font-size: 13px; flex-shrink: 0; }
    .task-item .task-status.done { background: #0d6e6e; border-color: #0d6e6e; color: white; }
    .task-item .task-info { flex: 1; }
    .task-item .task-info h4 { font: 700 14px 'DM Sans'; margin: 0; }
    .task-item .task-info p { font-size: 13px; color: var(--muted); margin: 3px 0 0; }

    .submit-form { display: grid; gap: 14px; max-width: 620px; }
    .submit-form label { font-size: 12px; font-weight: 800; }
    .submit-form input, .submit-form textarea { width: 100%; padding: 12px 14px; border: 1px solid rgba(11,31,54,.15); border-radius: 10px; background: white; font: inherit; color: var(--ink); }
    .submit-form textarea { min-height: 90px; resize: vertical; }

    /* Resource Grid & Cards */
    .resource-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .resource-card { background: rgba(255,255,255,.94); border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 22px; text-decoration: none; color: var(--ink); transition: .2s; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 6px rgba(11,31,54,.03); }
    .resource-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); border-color: #cbd5e1; }
    .resource-card.locked { background: rgba(248,250,252,.92); border-color: #e2e8f0; }
    .resource-card h4 { font: 800 15px Manrope; margin: 0 0 6px; color: var(--ink); }
    .resource-card p { font-size: 13px; color: var(--muted); margin: 0; line-height: 1.55; }

    /* Internship Roadmap Styling */
    .roadmap-container { display: flex; flex-direction: column; gap: 18px; }
    .roadmap-step-card { background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 22px 24px; box-shadow: 0 2px 8px rgba(11,31,54,.03); position: relative; transition: all .2s ease; }
    .roadmap-step-card:hover { border-color: #cbd5e1; box-shadow: 0 4px 14px rgba(11,31,54,.06); }
    .roadmap-step-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; flex-wrap: wrap; }
    .roadmap-step-left { display: flex; align-items: flex-start; gap: 14px; flex: 1; min-width: 240px; }
    .roadmap-step-badge { width: 36px; height: 36px; border-radius: 10px; background: #0b1f36; color: #ffffff; display: flex; align-items: center; justify-content: center; font: 800 15px Manrope, sans-serif; flex-shrink: 0; box-shadow: 0 2px 6px rgba(11,31,54,.15); }
    .roadmap-step-title-area h4 { margin: 0 0 3px; font: 800 16px Manrope, sans-serif; color: #0b1f36; line-height: 1.3; }
    .roadmap-step-title-area span { font-size: 12px; color: #64748b; display: block; }
    .roadmap-step-body { font-size: 13.5px; line-height: 1.7; color: #334155; }
    .roadmap-code-box { background: #0b1f36; color: #f1f5f9; border-radius: 12px; padding: 16px 20px; font-family: 'Courier New', Courier, monospace; font-size: 13px; line-height: 1.65; margin: 14px 0; overflow-x: auto; box-shadow: inset 0 2px 6px rgba(0,0,0,.25); border: 1px solid #1e3a5f; }
    .roadmap-code-box pre { margin: 0; font-family: inherit; }
    .roadmap-code-box code { color: #38bdf8; }
    .roadmap-code-box .comment { color: #94a3b8; font-style: italic; }
    .roadmap-guide-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 12px 0; font-size: 13px; line-height: 1.75; color: #334155; }
    .roadmap-guide-block strong { color: #0b1f36; display: block; margin-bottom: 6px; font-size: 13.5px; }

    @media (max-width: 900px) {
      .dashboard-layout { grid-template-columns: 1fr !important; }
      .dashboard-sidebar { position: static !important; }
      .dash-info-grid, .resource-grid { grid-template-columns: 1fr !important; }
    }

    @media print {
      @page {
        size: A4 portrait;
        margin: 8mm 12mm;
      }
      html, body {
        background: #ffffff !important;
        color: #0b1f36 !important;
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .noise,
      .nav,
      header,
      footer,
      .dashboard-sidebar,
      .dashboard-sidebar-header,
      .dashboard-nav,
      .dashboard-tabs,
      .offer-action-bar,
      .dash-top,
      .dash-hero,
      .page-hero,
      .user-nav-wrapper,
      .admin-sidebar,
      .btn,
      #tab-roadmap,
      #tab-profile,
      #tab-domain,
      #tab-account,
      #tab-tasks,
      #tab-submit,
      #tab-resources,
      #tab-certificate {
        display: none !important;
      }
      .dashboard-layout,
      .dashboard {
        margin: 0 !important;
        padding: 0 !important;
        max-width: 100% !important;
        display: block !important;
      }
      .dashboard-main {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      #tab-offer {
        display: block !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      #offerLetterCard {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 auto !important;
        padding: 24px 30px !important;
        box-shadow: none !important;
        border: 1.5px solid #cbd5e1 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        background: #ffffff !important;
        border-radius: 8px !important;
      }
    }
  .article {
      max-width: 820px;
      margin: 40px auto 80px;
      padding: 0 20px;
      box-sizing: border-box;
      overflow-wrap: break-word;
      word-break: break-word;
    }
    .blog-card h2, .blog-card h3 {
      font: 700 17px/1.3 Manrope !important;
      margin: 10px 0 8px !important;
    }
    .journey-arrow {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      color: #94a3b8;
      margin: 0 4px;
      margin-bottom: 20px;
      line-height: 1;
    }
  </style>
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "HireeBridge",
    url: SITE_URL,
    description: description || undefined,
    contactPoint: { "@type": "ContactPoint", email: SUPPORT_EMAIL, contactType: "customer support" }
  })}</script>
</head>
<body>
  <div class="noise"></div>
  <header class="nav">
    <a class="brand" href="/">
      <img src="/brand/hireebridge-logo.png" alt="HireeBridge Logo" width="34" height="34">
      <span>HireeBridge</span>
    </a>
    <nav>
      <a href="/internships">Internships</a>
      <a href="/pricing">Pricing</a>
      <a href="/how-it-works">How it works</a>
      <a href="/certificate">Certificate</a>
      <a href="/blog">Blog</a>
      <a href="/contact">Contact</a>
    </nav>
    <div class="nav-actions">
      ${navActions}
    </div>
  </header>
  ${content}
  <footer>
    <div class="footer-grid">
      <div>
        <a class="brand footer-brand" href="/">
          <img src="/brand/hireebridge-logo.png" alt="HireeBridge Logo" width="34" height="34">
          <span>HireeBridge</span>
        </a>
        <p>Structured internship programs, guided projects and globally verifiable GreyRocks credential workflows for students and early-career builders.</p>
        <div class="footer-socials" style="display:flex;align-items:center;gap:10px;margin-top:16px;">
          <a class="footer-social-link" href="https://www.linkedin.com/company/hireebridge" target="_blank" rel="noopener noreferrer" aria-label="HireeBridge on LinkedIn" title="Follow HireeBridge on LinkedIn" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.08);color:#dbe7ee;text-decoration:none;padding:0;margin:0;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45c-.88 0-1.6.72-1.6 1.6s.72 1.6 1.6 1.6 1.6-.72 1.6-1.6-.72-1.6-1.6-1.6Z"/></svg>
          </a>
          <a class="footer-social-link" href="https://t.me/+u1eccYEzCelmZDBl" target="_blank" rel="noopener noreferrer" aria-label="HireeBridge on Telegram" title="Join HireeBridge Telegram Group" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.08);color:#dbe7ee;text-decoration:none;padding:0;margin:0;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
          </a>
          <a class="footer-social-link" href="https://www.instagram.com/hireebridge?stkn=MTU1ZndxY3djZGkxdA==" target="_blank" rel="noopener noreferrer" aria-label="HireeBridge on Instagram" title="Follow HireeBridge on Instagram" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.08);color:#dbe7ee;text-decoration:none;padding:0;margin:0;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          </a>
        </div>
      </div>
      <div>
        <h4>Explore</h4>
        <a href="/internships">All ${PROJECT_CATALOGUE.length} domains</a>
        <a href="/pricing">Pricing plans</a>
        <a href="/certificate">Sample certificate</a>
        <a href="/blog">Internship guides</a>
      </div>
      <div>
        <h4>Company</h4>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
      </div>
      <div>
        <h4>Support</h4>
        <a href="/refund">Refund Policy</a>
        <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>
        <span>Credential issuer: GreyRocks</span>
      </div>
    </div>
    <div class="footer-bottom">
      &copy; ${new Date().getFullYear()} HireeBridge. Internship platform. Credential issuer: GreyRocks.
    </div>
  </footer>
  <script src="/js/app.js?v=3.8"></script>
</body>
</html>`;
}

function faq(items) {
  return `<section class="section faq" aria-labelledby="page-faq-title"><div class="eyebrow">FAQ</div><h2 id="page-faq-title">Frequently asked questions</h2><div class="faq-list">${items.map((x, i) => `<details ${i === 0 ? 'open' : ''}><summary>${esc(x[0])}<span aria-hidden="true">+</span></summary><p>${esc(x[1])}</p></details>`).join('')}</div></section>`;
}

// 1. Home Page
const CASHFREE_IPG_GLOBAL_MARKETS = 170;
// Cashfree International Payment Gateway currently describes card acceptance in 170+ global markets.
// This is a market-reach metric, not a country count or a promise of identical methods everywhere.
let publicStatsCache = { values: null, expiresAt: 0 };

async function getCachedPublicStats() {
  const now = Date.now();
  if (publicStatsCache.values && now < publicStatsCache.expiresAt) return publicStatsCache.values;
  let counts = null;
  try { counts = await db.getPublicStats(); } catch (err) { console.error('Public stats unavailable:', err.message); }
  if (counts) {
    publicStatsCache = { values: counts, expiresAt: now + 60_000 };
    return counts;
  }
  return publicStatsCache.values || { students: 0, certificates: 0 };
}

function home(session = null, geo = null, programPrices = null, stats = { students: 0, certificates: 0 }) {
  const currentGeo = geo || requestContext.getStore()?.geo || { country: 'IN', currency: 'INR' };
  const pricing = getAllPlansPricing(currentGeo.currency, programPrices);

  const reviews = [
    ['Aanya Sharma', 'India', 'I used the structured workflow to keep my project, GitHub link and certificate details in one place.'],
    ['Liam Walker', 'United Kingdom', 'The dashboard format made it clear what I needed to finish before requesting my credential.'],
    ['Sofia Rodriguez', 'Philippines', 'I liked having a defined domain and completion checklist instead of just receiving a document.'],
    ['Mateo Hernandez', 'Mexico', 'The certificate preview helped me understand exactly what information would appear on the final credential.'],
    ['Noah Tremblay', 'Canada', 'I used the internship project as a portfolio item and kept the credential as supporting documentation.'],
    ['Priya Patel', 'India', 'The flow was simple to follow during my final-year engineering project preparation.']
  ];

  return layout({
    title: 'HireeBridge | Internship Experience & GreyRocks Credentials',
    description: 'Build real-world internship experience, complete guided tasks and earn globally verifiable credentials issued by GreyRocks through HireeBridge.',
    active: '/',
    session,
    currency: currentGeo.currency,
    content: `<main>
<!-- Animated Ambient Pastel Gradient Mesh Background (Front Page) -->
<div class="ambient-glow-wrap">
  <div class="glow-orb orb-1"></div>
  <div class="glow-orb orb-2"></div>
  <div class="glow-orb orb-3"></div>
  <div class="glow-orb orb-4"></div>
</div>

<section class="hero">
  <div class="hero-copy">
    <div class="eyebrow-industry">
      <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      Industry Recognized Programs
    </div>
    <h1>Get Your Internship Experience Through <span>HireeBridge.</span></h1>
    <p class="hero-sub">Receive Your Credential From Our Partner Company <strong>GreyRocks.</strong></p>
    <div class="hero-actions">
      <a class="btn btn-dark btn-lg" href="/checkout?plan=certificate&domain=data-science">Start ${pricing.certificate.formatted} Program</a>
      <a class="btn btn-light btn-lg" href="/checkout?plan=project&domain=data-science">Explore Project Internship ${pricing.project.formatted}</a>
    </div>
    <div class="trust-row">
      <span>&#10003; GreyRocks credential</span>
      <span>&#10003; Unique credential ID</span>
      <span>&#10003; QR verification destination</span>
      <span>&#10003; ${PROJECT_CATALOGUE.length} domains</span>
    </div>
  </div>

  <div class="certificate-stage">
    <div class="stage-glow"></div>
    <div class="certificate-geometry" aria-hidden="true">
      <span class="geo-ring geo-ring-a"></span>
      <span class="geo-ring geo-ring-b"></span>
      <span class="geo-arc"></span>
      <span class="geo-grid"></span>
      <span class="geo-square geo-square-a"></span>
      <span class="geo-square geo-square-b"></span>
      <span class="geo-line geo-line-a"></span>
      <span class="geo-line geo-line-b"></span>
      <span class="geo-node geo-node-a"></span>
      <span class="geo-node geo-node-b"></span>
      <span class="geo-node geo-node-c"></span>
    </div>
    <div class="certificate-card" id="certificateCard" oncontextmenu="return false;">
      <div class="cert-shield" oncontextmenu="return false;"></div>
      <img src="/assets/sample-certificate.jpg" alt="Sample GreyRocks internship certificate preview" draggable="false" oncontextmenu="return false;">
    </div>
  </div>
</section>

<!-- Proof Strip (Defaults to Actual Stats, animates smoothly on scroll) -->
<section class="proof-strip" id="proofStrip">
  <div>
    <strong class="stat-counter" data-base="100" data-target="${100 + (Number(stats.students) || 0)}" data-suffix="+">${100 + (Number(stats.students) || 0)}+</strong>
    <span>Students Joined</span>
  </div>
  <div>
    <strong class="stat-counter" data-base="100" data-target="${100 + (Number(stats.certificates) || 0)}" data-suffix="+">${100 + (Number(stats.certificates) || 0)}+</strong>
    <span>Certificates Issued</span>
  </div>
  <div>
    <strong class="stat-counter" data-target="${PROJECT_CATALOGUE.length}">${PROJECT_CATALOGUE.length}</strong>
    <span>Domains</span>
  </div>
  <div>
    <strong class="stat-counter" data-target="${CASHFREE_IPG_GLOBAL_MARKETS}" data-suffix="+">${CASHFREE_IPG_GLOBAL_MARKETS}+</strong>
    <span>Countries</span>
  </div>
</section>
<!-- 3 Plans Section (Compact & Vertically Aligned Start Buttons) -->
<section class="section plans-section" id="plans">
  <div class="eyebrow">Simple Pricing</div>
  <h2>Choose how you want to earn your credential.</h2>
  <div class="plan-grid-3">
    <!-- Plan 1: Certificate Program -->
    <article class="plan-3">
      <div class="plan-icon">
        <svg viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>
      </div>
      <h3>Certificate Program</h3>
      <div class="plan-subtitle">Direct Credential Path</div>
      <div class="price-box">
        <div class="price-main">${pricing.certificate.formatted}</div>
      </div>
      <div class="plan-features-title">What's included:</div>
      <ul class="plan-features">
        <li>Assigned task with full problem statement and requirements</li>
        <li>Choose from all ${PROJECT_CATALOGUE.length} internship domains</li>
        <li>You build the project yourself from the full task brief</li>
        <li>Reviewer evaluates your task submission</li>
        <li>Certificate available after explicit approval</li>
      </ul>
      <a class="btn-plan" href="/checkout?plan=certificate&domain=data-science">Start ${pricing.certificate.formatted}</a>
      <div class="secure-note">
        <svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
        Secure 256-bit checkout
      </div>
    </article>

    <!-- Plan 2: Project Based Internship (Featured / Best Seller) -->
    <article class="plan-3 featured">
      <span class="best-seller">⭐ Best Seller</span>
      <span class="featured-tag">Popular</span>
      <div class="plan-icon">
        <svg viewBox="0 0 24 24"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
      </div>
      <h3>Project Based Internship</h3>
      <div class="plan-subtitle">Guided Projects + Proof</div>
      <div class="price-box">
        <div class="price-main">${pricing.project.formatted}</div>
      </div>
      <div class="plan-features-title">Everything in ${pricing.certificate.formatted}, plus:</div>
      <ul class="plan-features">
        <li>Domain source code / GitHub repository to set up and implement</li>
        <li>Internship Roadmap, setup, Git and GitHub guidance</li>
        <li>Adapt the code, make it your own, and push your work to GitHub</li>
        <li>Practical implementation and documentation instructions</li>
        <li>Certificate after task approval</li>
      </ul>
      <a class="btn-plan" href="/checkout?plan=project&domain=data-science">Start ${pricing.project.formatted}</a>
      <div class="secure-note">
        <svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
        Secure 256-bit checkout
      </div>
    </article>

    <!-- Plan 3: Comprehensive Program -->
    <article class="plan-3">
      <div class="plan-icon">
        <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
      </div>
      <h3>Comprehensive Program</h3>
      <div class="plan-subtitle">Complete Academic &amp; Career Kit</div>
      <div class="price-box">
        <div class="price-main">${pricing.comprehensive.formatted}</div>
      </div>
      <div class="plan-features-title">Everything in ${pricing.project.formatted}, plus:</div>
      <ul class="plan-features">
        <li>Complete project kit: source resources and domain materials</li>
        <li>Offer letter; certificate after reviewer approval</li>
        <li>Editable internship report and PPT / presentation</li>
        <li>Guided project documentation and submission resources</li>
        <li>Adapt the supplied project and submit your implementation</li>
      </ul>
      <a class="btn-plan" href="/checkout?plan=comprehensive&domain=data-science">Start ${pricing.comprehensive.formatted}</a>
      <div class="secure-note">
        <svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
        Secure 256-bit checkout
      </div>
    </article>
  </div>
</section>

<!-- Feature Comparison Table -->
<p class="plan-comparison-intro">Not sure which path fits you? The detailed comparison below shows exactly what you receive with each plan.</p>
${renderPlanComparisonTable(pricing)}

<!-- Internship Journey (Interactive 8-Node Pipeline) -->
<section class="journey-section" id="internshipJourney">
  <div class="eyebrow">Internship Journey</div>
  <h2>INTERNSHIP JOURNEY</h2>
  <p class="lead">From application to certification — complete real-world projects, submit your work, and earn globally verifiable credentials.</p>

  <div class="journey-steps" id="journeySteps">
    <div class="journey-step active" data-step="0">
      <div class="step-num">01</div>
      <div class="step-label">Apply</div>
    </div>
    <span class="journey-arrow">&rarr;</span>
    <div class="journey-step" data-step="1">
      <div class="step-num">02</div>
      <div class="step-label">Review</div>
    </div>
    <span class="journey-arrow">&rarr;</span>
    <div class="journey-step" data-step="2">
      <div class="step-num">03</div>
      <div class="step-label">Offer Letter</div>
    </div>
    <span class="journey-arrow">&rarr;</span>
    <div class="journey-step" data-step="3">
      <div class="step-num">04</div>
      <div class="step-label">Get Tasks</div>
    </div>
    <span class="journey-arrow">&rarr;</span>
    <div class="journey-step" data-step="4">
      <div class="step-num">05</div>
      <div class="step-label">Code/Project</div>
    </div>
    <span class="journey-arrow">&rarr;</span>
    <div class="journey-step" data-step="5">
      <div class="step-num">06</div>
      <div class="step-label">Submit</div>
    </div>
    <span class="journey-arrow">&rarr;</span>
    <div class="journey-step" data-step="6">
      <div class="step-num">07</div>
      <div class="step-label">Evaluate</div>
    </div>
    <span class="journey-arrow">&rarr;</span>
    <div class="journey-step" data-step="7">
      <div class="step-num">08</div>
      <div class="step-label">Certify</div>
    </div>
  </div>

  <div class="journey-detail" id="journeyDetail">
    <div class="detail-eyebrow" id="journeyDetailEyebrow">STEP 1 – APPLY &amp; CHOOSE YOUR DOMAIN</div>
    <h3 id="journeyDetailTitle">Select Your Path &amp; Begin Your Journey</h3>
    <p id="journeyDetailDesc">Explore domains including AI, Web Dev, Data Science, and Cloud. Select the internship path that matches your career goals and submit your basic enrollment details.</p>
    <h4>WHAT HAPPENS HERE?</h4>
    <ul id="journeyDetailList">
      <li>Choose from the internship domains listed on HireeBridge</li>
      <li>Flexible 2 to 4 weeks or 1 month duration</li>
      <li>Instant enrollment confirmation</li>
      <li>Dedicated student account creation</li>
    </ul>
    <div class="journey-nav">
      <button type="button" id="journeyPrev" disabled>&larr; Prev</button>
      <span class="phase-label" id="journeyPhase">Phase 1 of 8</span>
      <button type="button" id="journeyNext">Next &rarr;</button>
    </div>
  </div>
</section>

<!-- Credential Workflow Section -->
<section class="section">
  <div class="eyebrow">The credential workflow</div>
  <h2>Not just a PDF. A documented path from enrollment to credential.</h2>
  <p class="lead">HireeBridge keeps the student experience simple while making the completion record more useful.</p>
  <div class="feature-grid">
    <article>
      <div class="icon">01</div>
      <h3>Choose your domain</h3>
      <p>Pick from data, AI, development, cloud, design, product, testing and student-friendly paths.</p>
    </article>
    <article>
      <div class="icon">02</div>
      <h3>Complete your path</h3>
      <p>Work through the task dashboard, commit GitHub evidence and complete the required checklist.</p>
    </article>
    <article>
      <div class="icon">03</div>
      <h3>Receive your credential</h3>
      <p>Your certificate uses the GreyRocks template with name, domain, duration, date, credential ID and QR.</p>
    </article>
    <article>
      <div class="icon">04</div>
      <h3>Keep proof organised</h3>
      <p>Use your dashboard to access completion records and certificate downloads anytime.</p>
    </article>
  </div>
</section>

<!-- Partner Section (Uses GreyRocks own mark) -->
<section class="section partner">
  <div>
    <div class="eyebrow">Credential issuer</div>
    <h2>Your certificate is issued by GreyRocks.</h2>
    <p class="lead">HireeBridge is the student-facing platform. The certificate template, issuer identity and stated verification destination are GreyRocks.</p>
    <a class="text-link" href="${esc(GREYROCKS_URL)}" target="_blank" rel="noopener">Visit GreyRocks &nearr;</a>
  </div>
  <div class="partner-card">
    <img src="/assets/greyrocks-mark.png" alt="GreyRocks" width="64" height="64">
    <div>
      <strong>GREYROCKS</strong>
      <span>Digital Engineering &middot; AI &middot; Data &middot; Cloud</span>
    </div>
  </div>
</section>

<!-- Student Reviews -->
<section class="section stories">
  <div class="eyebrow">Student stories</div>
  <h2>Verified feedback from our student community.</h2>
  <p class="lead">Students can explore domain-specific project pathways and submit their work for review. International payment availability depends on Cashfree account configuration, country, and method.</p>
  <div class="marquee-wrap">
    <div class="marquee row1">
      ${reviews.map(r => `
        <article class="review">
          <div class="stars">★★★★★</div>
          <p>“${esc(r[2])}”</p>
          <strong>${esc(r[0])}</strong>
          <span>${esc(r[1])}</span>
        </article>
      `).join('')}
    </div>
    <div class="marquee row2 reverse">
      ${reviews.slice().reverse().map(r => `
        <article class="review">
          <div class="stars">★★★★★</div>
          <p>“${esc(r[2])}”</p>
          <strong>${esc(r[0])}</strong>
          <span>${esc(r[1])}</span>
        </article>
      `).join('')}
    </div>
  </div>
</section>

<!-- Blog Section -->
<section class="section blogs">
  <div class="eyebrow">Internship knowledge hub</div>
  <h2>20 practical guides built around internship searches.</h2>
  <div class="blog-grid">
    ${blogTopics.slice(0, 6).map(t => `
      <a class="blog-card" href="/blog/${t[1]}">
        <span>Guide</span>
        <h3>${esc(t[0])}</h3>
        <p>Practical guidance for students researching ${esc(t[2])}.</p>
        <b>Read guide &rarr;</b>
      </a>
    `).join('')}
  </div>
  <a class="btn btn-light more" href="/blog">Explore all 20 guides</a>
</section>

${faq([
  ['What happens after I pay?', 'Payment confirms enrollment and gives access to your domain-specific assigned task. Payment alone does not issue a certificate.'],
  ['When is a certificate available?', 'After you complete and submit the assigned task and a reviewer explicitly approves it.'],
  ['How do the plans differ?', 'INR 99: build the project yourself from the task brief. INR 199: start from the domain repository, adapt and test it, then publish your own implementation. INR 499: includes the source repository, editable report, presentation, offer letter, and complete project resources.'],
  ['Can I choose my domain?', 'Yes. Select from the domains listed on the Internships page.'],
  ['How can I verify a certificate?', 'Issued certificates show a unique credential ID and QR verification destination.'],
  ['Are international payment methods identical everywhere?', 'No. Cashfree international payment coverage and available methods depend on the country, payment method, and account configuration.']
])}
</main>`
  });
}

// 2. Pricing Page
function renderPlanComparisonTable(pricing) {
  const dash = '<span class="compare-plans-cross">&mdash;</span>';
  const included = value => `<strong>${value || '&#10003; Included'}</strong>`;
  const row = (feature, certificate, project, comprehensive) => `<div class="compare-plans-row"><span>${feature}</span>${certificate === null ? dash : included(certificate)}${project === null ? dash : included(project)}${comprehensive === null ? dash : included(comprehensive)}</div>`;
  return `<section class="section compare-plans">
  <div class="eyebrow">Compare Plans</div>
  <h2>Detailed Feature Comparison</h2>
  <div class="compare-plans-table">
    <div class="compare-plans-head">
      <span>Feature</span>
      <span>Certificate (${pricing.certificate.formatted})</span>
      <span>Project (${pricing.project.formatted})</span>
      <span>Comprehensive (${pricing.comprehensive.formatted})</span>
    </div>
    ${row(`Domain Selection (${PROJECT_CATALOGUE.length} Domains)`, `All ${PROJECT_CATALOGUE.length}`, `All ${PROJECT_CATALOGUE.length}`, `All ${PROJECT_CATALOGUE.length}`)}
    ${row('Official Offer Letter', '', '', '')}
    ${row('GreyRocks Verified Certificate', 'After task approval', 'After task approval', 'After task approval')}
    ${row('Unique Credential ID + QR', 'Issued with approved certificate', 'Issued with approved certificate', 'Issued with approved certificate')}
    ${row('Student Dashboard Access', '', '', '')}
    ${row('Assigned Domain-Specific Internship Task', '', '', '')}
    ${row('Project Source Code / Reference Repository', null, 'Domain source repository to implement', 'Complete source resources and repository')}
    ${row('Task Submission & Reviewer Approval', '', '', '')}
    ${row('Editable Internship Report (Word/PDF)', null, null, '')}
    ${row('Complete College Submission Kit', null, null, '')}
    ${row('Priority Evaluation & Verification', null, null, 'Priority support')}
    ${row('PPT / Presentation', null, null, '')}
  </div>
</section>`;
}

function pricingPage(session = null, geo = null, programPrices = null) {
  const currentGeo = geo || requestContext.getStore()?.geo || { country: 'IN', currency: 'INR' };
  const pricing = getAllPlansPricing(currentGeo.currency, programPrices);

  return layout({
    title: 'Internship Pricing | HireeBridge',
    description: `Transparent pricing for HireeBridge programs: ${pricing.certificate.formatted} Certificate Program, ${pricing.project.formatted} Project Based Internship, and ${pricing.comprehensive.formatted} Comprehensive Program.`,
    active: '/pricing',
    session,
    currency: currentGeo.currency,
    content: `<main>
<section class="page-hero">
  <div class="eyebrow">Transparent pricing</div>
  <h1>Choose your credential path.</h1>
  <p>Three flexible options designed for students, freshers, and early-career engineers.</p>
</section>

<section class="section plan-grid-3 big-plans">
  <!-- Plan 1 -->
  <article class="plan-3">
    <div class="plan-icon">
      <svg viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>
    </div>
    <h3>Certificate Program</h3>
    <div class="plan-subtitle">Direct Credential Path</div>
    <div class="price-box">
      <div class="price-main">${pricing.certificate.formatted}</div>
    </div>
    <div class="plan-features-title">What's included:</div>
    <ul class="plan-features">
      <li>Assigned task with full problem statement and requirements</li>
      <li>Choose from all ${PROJECT_CATALOGUE.length} internship domains</li>
      <li>You build the project yourself from the full task brief</li>
      <li>Reviewer evaluates your task submission</li>
      <li>Certificate available after explicit approval</li>
    </ul>
    <a class="btn-plan" href="/checkout?plan=certificate&domain=data-science">Start ${pricing.certificate.formatted}</a>
    <div class="secure-note">Secure 256-bit checkout</div>
  </article>

  <!-- Plan 2 -->
  <article class="plan-3 featured">
    <span class="best-seller">⭐ Best Seller</span>
    <span class="featured-tag">Popular</span>
    <div class="plan-icon">
      <svg viewBox="0 0 24 24"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
    </div>
    <h3>Project Based Internship</h3>
    <div class="plan-subtitle">Guided Projects + Proof</div>
    <div class="price-box">
      <div class="price-main">${pricing.project.formatted}</div>
    </div>
    <div class="plan-features-title">Everything in ${pricing.certificate.formatted}, plus:</div>
    <ul class="plan-features">
      <li>Domain source code / GitHub repository to set up and implement</li>
      <li>Internship Roadmap, setup, Git and GitHub guidance</li>
      <li>Adapt the code, make it your own, and push your work to GitHub</li>
      <li>Practical implementation and documentation instructions</li>
      <li>Certificate after task approval</li>
    </ul>
    <a class="btn-plan" href="/checkout?plan=project&domain=data-science">Start ${pricing.project.formatted}</a>
    <div class="secure-note">Secure 256-bit checkout</div>
  </article>

  <!-- Plan 3 -->
  <article class="plan-3">
    <div class="plan-icon">
      <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
    </div>
    <h3>Comprehensive Program</h3>
    <div class="plan-subtitle">Complete Academic &amp; Career Kit</div>
    <div class="price-box">
      <div class="price-main">${pricing.comprehensive.formatted}</div>
    </div>
    <div class="plan-features-title">Everything in ${pricing.project.formatted}, plus:</div>
    <ul class="plan-features">
      <li>Complete project kit: source resources and domain materials</li>
      <li>Offer letter; certificate after reviewer approval</li>
      <li>Editable internship report and PPT / presentation</li>
      <li>Guided project documentation and submission resources</li>
      <li>Adapt the supplied project and submit your implementation</li>
    </ul>
    <a class="btn-plan" href="/checkout?plan=comprehensive&domain=data-science">Start ${pricing.comprehensive.formatted}</a>
    <div class="secure-note">Secure 256-bit checkout</div>
  </article>
</section>

<!-- Comparison Table -->
<p class="plan-comparison-intro">The detailed comparison below shows what is included with each plan.</p>
${renderPlanComparisonTable(pricing)}
<section class="section pricing-workflow" aria-labelledby="pricing-workflow-title">
  <div class="eyebrow">Certificate workflow</div>
  <h2 id="pricing-workflow-title">Payment gives task access; approval issues the certificate.</h2>
  <ol><li>Choose a plan and domain</li><li>Pay and open your assigned internship task</li><li>Complete the task and submit your work</li><li>A reviewer evaluates your submission</li><li>After explicit approval, the certificate appears in your dashboard</li></ol>
</section>
${faq([
  ['What does the entry plan include?', 'A domain-specific task with the project context, requirements, deliverables, and acceptance criteria. It does not include a GitHub reference repository or external project resources.'],
  ['What does the Project Based plan add?', 'It includes the task plus the domain source repository and Internship Roadmap. Set up the project, implement or customize it, test your changes, and publish your own GitHub repository. Review and follow the source repository licence.'],
  ['What do I receive in the Comprehensive plan?', 'It includes the task and domain source repository, editable Word report, presentation deck, offer letter, and complete project resources. Your certificate follows task submission and reviewer approval.'],
  ['When is the certificate issued?', 'Only after you complete and submit your assigned task and a reviewer explicitly approves it. Payment alone does not issue a certificate.'],
  ['Can I change plans after purchase?', 'The dashboard has no plan-switch control. Contact support before making another purchase if you need help with your enrollment.'],
  ['Are prices controlled by Admin?', 'The displayed plan prices are loaded from the current Admin-managed program price settings.'],
  ['Is certificate delivery instant?', 'No. Payment grants task access. The certificate becomes available only after task submission and explicit reviewer approval.']
])}</main>`
  });
}

// 3. Checkout Page
function checkoutPage(req, session = null, programPrices = null) {
  const chosenKey = resolvePlanKey(req.query.plan);
  const plan = plans[chosenKey];
  const selectedDomainSlug = req.query.domain || 'data-science';
  const defaultDomain = domains.find(d => d[1] === selectedDomainSlug)?.[0] || 'Data Science';

  const geo = req.visitorGeo || requestContext.getStore()?.geo || { country: 'IN', currency: 'INR' };
  const isExplicitInr = (req.query.currency === 'INR' && (req.query.explicit === 'true' || req.query.fallback === 'inr'));
  const activeCurrency = isExplicitInr ? 'INR' : geo.currency;
  const planPricing = getPlanPricing(chosenKey, activeCurrency, programPrices);

  const countryNames = {
    IN: 'India',
    US: 'United States',
    GB: 'United Kingdom',
    DE: 'Germany',
    FR: 'France',
    AE: 'United Arab Emirates',
    SG: 'Singapore',
    AU: 'Australia',
    CA: 'Canada',
    JP: 'Japan'
  };
  const detectedCountryName = countryNames[geo.country] || (geo.country && geo.country.length === 2 ? geo.country : 'India');

  return layout({
    title: `Checkout | ${plan.name} | HireeBridge`,
    description: `Complete enrollment for ${plan.name} in ${defaultDomain}.`,
    active: '/checkout',
    session,
    currency: planPricing.currency,
    content: `<main>
<section class="checkout">
  <div class="checkout-main">
    <div class="eyebrow">Secure Enrollment</div>
    <h1>${esc(plan.name)}</h1>
    <p class="lead">${esc(plan.desc)}</p>

    ${(!isExplicitInr && planPricing.currency !== 'INR') ? `
    <div style="background:#f0f7fa;border:1px solid #c2dbe8;border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:13px;color:#1e4a62;display:flex;justify-content:space-between;align-items:center;">
      <span>Pricing in <strong>${esc(planPricing.currency)}</strong> for ${esc(detectedCountryName)}. Prefer Indian Rupees (INR)?</span>
      <a href="/checkout?plan=${encodeURIComponent(chosenKey)}&domain=${encodeURIComponent(selectedDomainSlug)}&currency=INR&explicit=true" style="color:#0d6e6e;font-weight:700;text-decoration:underline;white-space:nowrap;margin-left:8px;">Switch to INR (₹)</a>
    </div>
    ` : (isExplicitInr ? `
    <div style="background:#eaf8f0;border:1px solid #b3e3c5;border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:13px;color:#1e5e38;display:flex;justify-content:space-between;align-items:center;">
      <span>Pricing switched to domestic <strong>INR (₹)</strong>.</span>
      <a href="/checkout?plan=${encodeURIComponent(chosenKey)}&domain=${encodeURIComponent(selectedDomainSlug)}" style="color:#1e5e38;font-weight:700;text-decoration:underline;white-space:nowrap;margin-left:8px;">Revert to ${esc(geo.currency)}</a>
    </div>
    ` : '')}

    <form id="checkoutForm" method="POST" action="/api/checkout">
      <input type="hidden" name="plan" value="${plan.id}">
      <input type="hidden" name="currencyPreference" value="${esc(planPricing.currency)}">
      <input type="hidden" name="countryCode" value="${esc(geo.country || 'IN')}">
      ${isExplicitInr ? '<input type="hidden" name="explicitInr" value="true">' : ''}

      <label>Full Name
        <input required name="name" placeholder="Enter Full Name" value="${session ? esc(session.name) : ''}">
      </label>

      <label>Email Address
        <input required type="email" name="email" placeholder="you@example.com" value="${session ? esc(session.email) : ''}">
      </label>

      ${!session ? `
      <label>Create Account Password (used to log in to your dashboard)
        <input required type="password" name="password" minlength="6" placeholder="Enter secure password">
      </label>
      ` : ''}

      <label>Internship Domain (${PROJECT_CATALOGUE.length} Domains Available)
        <select name="domain">
          ${domains.map(d => `<option value="${d[1]}" ${d[1] === selectedDomainSlug ? 'selected' : ''}>${esc(d[0])}</option>`).join('')}
        </select>
      </label>

      <label>Internship Duration
        <select name="duration">
          <option value="4 Weeks" selected>4 Weeks (Standard)</option>
          <option value="2 Weeks">2 Weeks (Fast Track)</option>
          <option value="1 Month">1 Month (Comprehensive)</option>
        </select>
      </label>

      <label>Country
        <input name="country" value="${esc(detectedCountryName)}" placeholder="Country">
      </label>

      <label>Phone Number
        <input name="phone" required placeholder="${geo.country === 'IN' ? '+91 9876543210' : '+1 (555) 000-0000'}">
      </label>

      <button class="btn btn-dark btn-wide" type="submit">
        Continue to ${planPricing.formatted} Payment
      </button>

      <p class="small">By continuing, you agree to our <a href="/terms">Terms</a>, <a href="/privacy">Privacy Policy</a> and <a href="/refund">Refund Policy</a>.</p>
    </form>

    <div id="checkoutResult"></div>
    <script>window.HB_CASHFREE_MODE = ${JSON.stringify(CASHFREE_ENV === 'sandbox' ? 'sandbox' : 'production')};</script>
    <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
  </div>

  <aside class="checkout-side">
    <div class="mini-certificate">
      <img src="/assets/sample-certificate.jpg" alt="Certificate preview" draggable="false" oncontextmenu="return false;">
    </div>
    <h3>${esc(plan.name)}</h3>
    <p style="font-size:20px;font-weight:800;color:#0d6e6e;margin:6px 0 14px;">${planPricing.formatted}</p>
    <p>Credential Issuer: <strong>GreyRocks</strong></p>
    <ul>
      <li>Official GreyRocks Verified Credential</li>
      <li>Unique Credential ID + Live QR Destination</li>
      <li>Full Student Dashboard Workspace</li>
      <li>Offer Letter &amp; Academic Documentation</li>
      <li>Support at ${esc(SUPPORT_EMAIL)}</li>
    </ul>
  </aside>
</section>
</main>`
  });
}

// 4. Unified Login Page (Strict POST, detects admin vs student, no password in URL)
function loginPage(error = '', session = null, success = '') {
  const showDemoLogin = isLocalDemoMode();
  return layout({
    title: 'Sign In | HireeBridge',
    description: 'Sign in to access your HireeBridge student workspace or administrative portal.',
    active: '/login',
    session,
    content: `<main>
<div class="login-container">
  <div class="login-card">
    <div style="margin-bottom:16px;">
      <img src="/brand/hireebridge-logo.png" alt="HireeBridge Logo" width="48" height="48">
    </div>
    <h1>Sign In to HireeBridge</h1>
    <p class="login-sub">Access your student workspace or administrative portal.</p>

    ${success ? `
    <div id="loginSuccess" style="background:#edfbf3;color:#1e7e48;border:1px solid #c2eecf;padding:12px;border-radius:10px;margin-bottom:18px;font-size:13px;font-weight:600;">
      ${esc(success)}
    </div>` : ''}

    <div id="loginError" style="display:${error ? 'block' : 'none'};background:#fff5f5;color:#c53030;border:1px solid #feb2b2;padding:12px;border-radius:10px;margin-bottom:18px;font-size:13px;font-weight:600;">
      ${esc(error)}
    </div>

    <form id="loginForm" method="POST" action="/login">
      <label>Email Address
        <input required type="email" name="email" placeholder="you@example.com" autofocus>
      </label>
      <label>Password
        <input required type="password" name="password" placeholder="••••••••">
      </label>
      <div style="display:flex;justify-content:flex-end;margin:-4px 0 12px;">
        <a href="/forgot-password" style="font-size:13px;color:#0d6e6e;font-weight:700;text-decoration:none;">Forgot password?</a>
      </div>
      <button class="btn btn-dark btn-wide" type="submit" style="margin-top:8px;">Sign In</button>
    </form>

    <div class="login-toggle">
      Don't have an account? <a href="/pricing">Select a Program &amp; Enroll</a>
    </div>

    ${showDemoLogin ? `<div style="margin-top:22px;padding:14px;border:1px solid #cfe2e8;border-radius:12px;background:#f3fafb;text-align:left;font-size:13px;"><strong>Local dashboard demo</strong><br>Email: <code>${DEMO_STUDENT_EMAIL}</code><br>Password: <code>DemoStudent2026!</code></div>` : ''}
  </div>
</div>
</main>`
  });
}

// 4b. Forgot Password Page
function forgotPasswordPage(message = '', error = '') {
  return layout({
    title: 'Forgot Password | HireeBridge',
    description: 'Reset your HireeBridge account password securely.',
    active: '/forgot-password',
    content: `<main>
<div class="login-container">
  <div class="login-card">
    <div style="margin-bottom:16px;">
      <img src="/brand/hireebridge-logo.png" alt="HireeBridge Logo" width="48" height="48">
    </div>
    <h1>Forgot Password</h1>
    <p class="login-sub">Enter your registered email address to receive a secure reset link.</p>

    ${error ? `
    <div style="background:#fff5f5;color:#c53030;border:1px solid #feb2b2;padding:12px;border-radius:10px;margin-bottom:18px;font-size:13px;font-weight:600;">
      ${esc(error)}
    </div>` : ''}

    ${message ? `
    <div style="background:#edfbf3;color:#1e7e48;border:1px solid #c2eecf;padding:14px;border-radius:10px;margin-bottom:18px;font-size:13px;font-weight:600;line-height:1.5;">
      ${esc(message)}
    </div>` : ''}

    <form method="POST" action="/forgot-password">
      <label>Email Address
        <input required type="email" name="email" placeholder="you@example.com" autofocus>
      </label>
      <button class="btn btn-dark btn-wide" type="submit" style="margin-top:12px;">Send Reset Link</button>
    </form>

    <div class="login-toggle" style="margin-top:20px;">
      Remember your password? <a href="/login">Back to Sign In</a>
    </div>
  </div>
</div>
</main>`
  });
}

// 4c. Reset Password Page
function resetPasswordPage({ token = '', error = '', valid = true }) {
  return layout({
    title: 'Reset Password | HireeBridge',
    description: 'Set a new secure password for your HireeBridge account.',
    active: '/reset-password',
    content: `<main>
<div class="login-container">
  <div class="login-card">
    <div style="margin-bottom:16px;">
      <img src="/brand/hireebridge-logo.png" alt="HireeBridge Logo" width="48" height="48">
    </div>
    <h1>Reset Password</h1>
    <p class="login-sub">Create a new password for your account (minimum 8 characters).</p>

    ${error ? `
    <div style="background:#fff5f5;color:#c53030;border:1px solid #feb2b2;padding:14px;border-radius:10px;margin-bottom:18px;font-size:13px;font-weight:600;line-height:1.5;">
      ${esc(error)}
    </div>` : ''}

    ${!valid ? `
    <div style="margin-top:16px;">
      <a href="/forgot-password" class="btn btn-dark" style="display:inline-block;padding:10px 20px;text-decoration:none;">Request New Reset Link</a>
    </div>
    <div class="login-toggle" style="margin-top:20px;">
      <a href="/login">Back to Sign In</a>
    </div>
    ` : `
    <form method="POST" action="/reset-password">
      <input type="hidden" name="token" value="${esc(token)}">
      <label>New Password
        <input required type="password" name="password" minlength="8" placeholder="Minimum 8 characters" autofocus>
      </label>
      <label style="margin-top:10px;">Confirm New Password
        <input required type="password" name="confirmPassword" minlength="8" placeholder="Re-enter password">
      </label>
      <button class="btn btn-dark btn-wide" type="submit" style="margin-top:16px;">Reset Password</button>
    </form>

    <div class="login-toggle" style="margin-top:20px;">
      <a href="/login">Back to Sign In</a>
    </div>
    `}
  </div>
</div>
</main>`
  });
}

// 5. Fast & Optimized Student Dashboard
async function dashboardPage(req, res, session) {
  // Query all user records in parallel for instant sub-millisecond response
  const [user, orders, tasks, certs, submissions, notifs] = await Promise.all([
    db.getUserByEmail(session.email),
    db.getUserOrders(session.email),
    db.getUserTasks(session.email),
    db.getUserCertificates(session.email),
    db.getUserSubmissions(session.email),
    db.getUserNotifications(session.email)
  ]);

  const activeOrder = (orders && orders[0]) || null;
  if (!activeOrder || activeOrder.status !== 'paid') {
    const message = activeOrder
      ? 'Your payment is still awaiting confirmation. Once Cashfree confirms it, your assigned internship task and program workspace will appear here.'
      : 'Choose a program and complete payment to open your assigned internship task and student workspace.';
    return res.send(layout({
      title: 'Payment Confirmation | HireeBridge',
      description: 'Your student workspace opens after payment confirmation.',
      active: '/dashboard',
      session,
      content: `<main><section class="page-hero"><div class="eyebrow">Enrollment status</div><h1>Student workspace access</h1><p>${esc(message)}</p><a class="btn btn-dark" href="${activeOrder ? '/payment/return?order_id=' + encodeURIComponent(activeOrder.gatewayOrderId || activeOrder.gateway_order_id || '') : '/pricing'}">${activeOrder ? 'Check payment status' : 'Choose a program'}</a></section></main>`
    }));
  }

  const domainName = activeOrder.domain || 'Data Science';
  const duration = activeOrder.duration || '4 Weeks';
  const planInfo = plans[activeOrder.plan] || plans.project;
  const isDemoStudent = isLocalDemoMode()
    && String(session.email || '').toLowerCase() === DEMO_STUDENT_EMAIL
    && activeOrder.id === DEMO_STUDENT_ORDER_ID;
  const planKey = resolvePlanKey(activeOrder.plan);
  const isCertificatePlan = planKey === 'certificate';
  const isComprehensivePlan = planKey === 'comprehensive';
  const isProjectPlan = planKey === 'project';
  const offerLetterRef = `HB-OL-2026-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const latestSub = (submissions || []).find(submission =>
    (submission.order_id || submission.orderId) === (activeOrder.id || activeOrder.order_id)
  ) || null;
  const approvedOrderId = latestSub?.order_id || latestSub?.orderId;
  const cert = latestSub?.status === 'approved' && certs?.length
    ? (certs.find(item => (item.orderId || item.order_id) === approvedOrderId) || null)
    : null;
  const certId = cert ? (cert.credentialId || cert.credential_id) : '';
  const certPdfUrl = cert ? (cert.pdf || `/downloads/${certId}.pdf`) : '';
  const certJpgUrl = cert ? (cert.jpg || `/downloads/${certId}.jpg`) : '';
  const isApproved = Boolean(cert);
  const isPending = !isApproved && Boolean(latestSub && latestSub.status === 'pending');

  // Query configured domain resources (GitHub, Report, PPT links)
  const domainResources = await db.getDomainResources(domainName);
  const domainSlug = domains.find(d => d[0].toLowerCase() === domainName.toLowerCase())?.[1] || 'starter-project';
  const domainGithubUrl = (domainResources && domainResources.github_url) || assignmentForOrder(activeOrder)?.project.repo || `https://github.com/hireebridge-projects/${domainSlug}`;
  const domainReportUrl = (domainResources && domainResources.report_url) || '/assets/templates/HireeBridge_College_Project_Report_Template.docx';
  const domainPptUrl = (domainResources && domainResources.ppt_url) || '/assets/templates/HireeBridge_Seminar_Presentation_Deck.pptx';

  const assignment = assignmentForOrder(activeOrder);
  let assignedTask = (tasks || []).find(task => task.orderId === (activeOrder.id || activeOrder.order_id)) || null;
  if (!assignedTask && assignment) {
    assignedTask = await db.createTask({
      id: `task-${crypto.randomBytes(4).toString('hex')}`,
      email: session.email,
      orderId: activeOrder.id || activeOrder.order_id,
      plan: planKey,
      domain: assignment.project.domain,
      title: assignment.title,
      description: assignment.description,
      dueDate: duration,
      status: 'assigned'
    });
  }
  const taskTitle = assignedTask?.title || assignment?.title || 'Assigned internship task';
  const taskDetails = assignedTask?.description || assignment?.description || 'Your assigned task details are not available yet. Contact support with your order ID.';
  const taskStatus = latestSub?.status === 'approved' ? 'APPROVED'
    : latestSub?.status === 'pending' ? 'UNDER REVIEW'
      : latestSub?.status === 'rejected' ? 'CHANGES REQUESTED'
        : assignedTask?.status === 'in_progress' ? 'IN PROGRESS' : 'ASSIGNED';

  const content = `<main>
<section class="dashboard">
  <div class="dash-top" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:20px;margin-bottom:26px;">
    <div>
      <div class="eyebrow" style="background:#edf5f8;color:#0d6e6e;border-color:transparent;">Student Workspace</div>
      <h1 style="margin:8px 0 4px;">Welcome, ${esc(session.name)}!</h1>
      <p class="lead" style="font-size:15px;margin:0;">Enrolled: <strong>${esc(domainName)}</strong> &middot; Plan: <strong>${esc(planInfo.name)}</strong></p>
    </div>
  </div>

  <!-- Notification Banner -->
  ${(notifs && notifs.length > 0) ? `
  <div style="background:#eef7fb;border:1px solid rgba(13,110,110,.25);border-radius:14px;padding:16px 20px;margin-bottom:24px;">
    <strong style="color:#0d6e6e;display:flex;align-items:center;gap:6px;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#0d6e6e"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
      ${esc(notifs[0].title)}
    </strong>
    <p style="margin:4px 0 0;font-size:14px;color:var(--ink2);">${esc(notifs[0].message)}</p>
  </div>
  ` : ''}

  <!-- Admin-Style 2-Column Dashboard Layout -->
  <div class="dashboard-layout">
    <!-- Left Sidebar Navigation with Clean Vector SVG Icons -->
    <aside class="dashboard-sidebar">
      <div class="dashboard-sidebar-header">
        <h3>Student Navigation</h3>
        <p>${esc(domainName)} &middot; ${esc(planInfo.name)}</p>
      </div>
      <ul class="dashboard-nav">
        <li>
          <button type="button" class="dashboard-tab active" data-tab="roadmap" onclick="switchDashboardTab('roadmap')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
            <span>Internship Roadmap</span>
          </button>
        </li>
        <li>
          <button type="button" class="dashboard-tab" data-tab="profile" onclick="switchDashboardTab('profile')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>Account &amp; Domain</span>
          </button>
        </li>
        <li>
          <button type="button" class="dashboard-tab" data-tab="offer" onclick="switchDashboardTab('offer')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <span>Official Offer Letter</span>
          </button>
        </li>
        <li>
          <button type="button" class="dashboard-tab" data-tab="tasks" onclick="switchDashboardTab('tasks')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
            <span>Assigned Task</span>
          </button>
        </li>
        <li>
          <button type="button" class="dashboard-tab" data-tab="submit" onclick="switchDashboardTab('submit')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            <span>Submit Task</span>
          </button>
        </li>
        <li>
          <button type="button" class="dashboard-tab" data-tab="resources" onclick="switchDashboardTab('resources')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            <span>Project Resources</span>
          </button>
        </li>
        <li>
          <button type="button" class="dashboard-tab" data-tab="certificate" onclick="switchDashboardTab('certificate')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
            <span>Internship Certificate</span>
          </button>
        </li>
      </ul>
    </aside>

    <!-- Right Main Content Area -->
    <div class="dashboard-main">

      <!-- Tab 1: Internship Roadmap (Dynamic Tailored Guide per Plan) -->
      <div class="tab-content active" id="tab-roadmap">
        <div style="margin-bottom:24px;border-bottom:1px solid var(--line);padding-bottom:18px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;">
            <span class="eyebrow" style="background:#edf5f8;color:#0d6e6e;border-color:transparent;font-size:12px;">
              ${isCertificatePlan ? 'Certificate Track Roadmap' : isComprehensivePlan ? 'Comprehensive Academic Track Roadmap' : 'Project-Based Track Roadmap'}
            </span>
            <span class="admin-badge admin-badge-green" style="font-size:11px;">
              ${esc(planInfo.name)}
            </span>
          </div>
          <h2 style="font:800 24px Manrope;color:var(--ink);margin:0 0 6px;">Your Step-by-Step Internship &amp; Certification Roadmap</h2>
          <p style="color:var(--muted);font-size:14px;margin:0;line-height:1.6;">Follow these guided steps to complete your assigned internship task, prepare your project submission, and receive your official GreyRocks verifiable credential.</p>
        </div>

        <div class="roadmap-container">
          <!-- Step 1: Offer Letter (Common) -->
          <div class="roadmap-step-card">
            <div class="roadmap-step-header">
              <div class="roadmap-step-left">
                <div class="roadmap-step-badge">1</div>
                <div class="roadmap-step-title-area">
                  <h4>Download Your Internship Program Letter</h4>
                  <span>Verification &amp; Academic Onboarding</span>
                </div>
              </div>
              <button type="button" class="btn btn-dark" onclick="switchDashboardTab('offer')" style="padding:8px 16px;font-size:12.5px;cursor:pointer;">
                Go to Offer Letter &rarr;
              </button>
            </div>
            <p class="roadmap-step-body" style="margin:0;">
              This letter confirms your enrollment in the <strong>${esc(domainName)} program</strong>. Open the <strong>Official Offer Letter</strong> tab to download your participation letter.
            </p>
          </div>

          ${isCertificatePlan ? `
          <!-- Certificate Program Steps -->
          <div class="roadmap-step-card">
            <div class="roadmap-step-header">
              <div class="roadmap-step-left">
                <div class="roadmap-step-badge">2</div>
                <div class="roadmap-step-title-area">
                  <h4>Review the Assigned Task in ${esc(domainName)}</h4>
                  <span>Domain Implementation Guidelines</span>
                </div>
              </div>
              <button type="button" class="btn btn-light" onclick="switchDashboardTab('tasks')" style="padding:8px 16px;font-size:12.5px;cursor:pointer;">
                View Assigned Task &rarr;
              </button>
            </div>
            <p class="roadmap-step-body" style="margin:0;">
              Review the single detailed domain-specific task under <strong>Assigned Task</strong>. Implement its requirements independently, test your solution, document your work, and submit the required evidence.
            </p>
          </div>

          <div class="roadmap-step-card">
            <div class="roadmap-step-header">
              <div class="roadmap-step-left">
                <div class="roadmap-step-badge">3</div>
                <div class="roadmap-step-title-area">
                  <h4>Develop Project &amp; Setup GitHub Repository</h4>
                  <span>Step-by-Step GitHub Setup Guide</span>
                </div>
              </div>
            </div>
            <p class="roadmap-step-body" style="margin:0 0 12px;">
              All project source code and deliverables must be hosted in your personal public GitHub repository. Follow this step-by-step procedure:
            </p>
            
            <div class="roadmap-guide-block">
              <strong>A. Create Your GitHub Repository</strong>
              <ol style="margin:6px 0 0;padding-left:20px;font-size:13px;line-height:1.7;">
                <li>If you do not have an account, sign up at <a href="https://github.com" target="_blank" class="text-link">github.com</a> and log in.</li>
                <li>Click <strong>New Repository</strong>, name it (e.g. <code>${esc(domainSlug)}-internship-project</code>), set visibility to <strong>Public</strong>, and click <strong>Create repository</strong>.</li>
              </ol>
            </div>

            <div class="roadmap-guide-block">
              <strong>B. Initialize Local Code &amp; Push to GitHub</strong>
              <p style="margin:4px 0 8px;font-size:13px;">Open your terminal or command prompt in your project folder and run:</p>
            </div>

            <div class="roadmap-code-box">
              <pre><code><span class="comment"># 1. Initialize local git repository</span>
git init

<span class="comment"># 2. Link to your newly created GitHub repository</span>
git remote add origin https://github.com/YOUR_USERNAME/${esc(domainSlug)}-internship-project.git

<span class="comment"># 3. Create or switch to main branch</span>
git branch -M main

<span class="comment"># 4. Stage and commit all project files &amp; README</span>
git add .
git commit -m "feat: complete ${esc(domainName)} internship project milestones"

<span class="comment"># 5. Push code to your remote GitHub repository</span>
git push -u origin main</code></pre>
            </div>

            <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
              <span style="font-size:12px;color:var(--muted);">Copy your repository link: <code>https://github.com/username/repo-name</code></span>
              <button type="button" class="btn btn-dark" onclick="switchDashboardTab('submit')" style="padding:8px 16px;font-size:12.5px;cursor:pointer;">
                Go to Submit Task &rarr;
              </button>
            </div>
          </div>

          <div class="roadmap-step-card" style="border-left:4px solid #0d6e6e;">
            <div class="roadmap-step-header">
              <div class="roadmap-step-left">
                <div class="roadmap-step-badge" style="background:#0d6e6e;">4</div>
                <div class="roadmap-step-title-area">
                  <h4>Prepare Task Evidence for Review</h4>
                  <span style="color:#0d6e6e;font-weight:700;">Optional professional sharing</span>
                </div>
              </div>
            </div>
            <p class="roadmap-step-body" style="margin:0 0 12px;">
              Prepare a concise summary of your implementation and the evidence required by your assigned task. LinkedIn sharing is optional.
            </p>
            <div class="roadmap-guide-block">
              <strong>LinkedIn Post Recommendations:</strong>
              <ul style="margin:6px 0 0;padding-left:18px;font-size:13px;line-height:1.7;">
                <li>Mention your key learnings, algorithms or models built, and repository link.</li>
                <li>Tag <strong>#HireeBridge</strong> and <strong>#GreyRocks</strong> in your post.</li>
                <li>Copy your public post URL (e.g. <code>https://linkedin.com/posts/yourname-update...</code>).</li>
                <li>Navigate to the <strong>Submit Task</strong> tab and provide your own repository and task evidence links.</li>
              </ul>
            </div>
          </div>

          <div class="roadmap-step-card">
            <div class="roadmap-step-header">
              <div class="roadmap-step-left">
                <div class="roadmap-step-badge">5</div>
                <div class="roadmap-step-title-area">
                  <h4>Mentor Review &amp; Official Certificate Issuance</h4>
                  <span>Verification, QR Generation &amp; Credential Delivery</span>
                </div>
              </div>
              <button type="button" class="btn btn-dark" onclick="switchDashboardTab('certificate')" style="padding:8px 16px;font-size:12.5px;cursor:pointer;">
                Check Certificate Status &rarr;
              </button>
            </div>
            <p class="roadmap-step-body" style="margin:0 0 12px;">
              Our reviewer evaluates your submitted task and evidence. Only after explicit approval, your official <strong>GreyRocks Verifiable Certificate</strong> with unique credential ID and QR verification becomes available in the <strong>Internship Certificate</strong> tab in both High-Resolution JPG and PDF formats.
            </p>
          </div>
          ` : isProjectPlan ? `
          <!-- Project Based Internship-Based Track Steps -->
          <div class="roadmap-step-card">
            <div class="roadmap-step-header">
              <div class="roadmap-step-left">
                <div class="roadmap-step-badge">2</div>
                <div class="roadmap-step-title-area">
                  <h4>Review the Curated Domain Reference in Project Resources</h4>
                  <span>Learning reference; reuse only as permitted by its license</span>
                </div>
              </div>
              <button type="button" class="btn btn-dark" onclick="switchDashboardTab('resources')" style="padding:8px 16px;font-size:12.5px;cursor:pointer;">
                View Project Resources &rarr;
              </button>
            </div>
            <p class="roadmap-step-body" style="margin:0;">
              Your Project Based Internship includes a curated learning reference for <strong>${esc(domainName)}</strong>. Use it to study approaches, check its license, and implement your own assignment. Open the <strong>Internship Roadmap</strong> for setup, Git workflow, documentation, testing, and evidence-submission guidance.
            </p>
          </div>

          <div class="roadmap-step-card">
            <div class="roadmap-step-header">
              <div class="roadmap-step-left">
                <div class="roadmap-step-badge">3</div>
                <div class="roadmap-step-title-area">
                  <h4>Push Code to Your Personal GitHub Repository</h4>
                  <span>Clone, Customize &amp; Commit Deliverables</span>
                </div>
              </div>
            </div>
            <p class="roadmap-step-body" style="margin:0 0 12px;">
              Review the source repository and its licence. Create your own repository, adapt the implementation to the assigned requirements, and clearly identify reused work:
            </p>
            <div class="roadmap-code-box">
              <pre><code><span class="comment"># 1. Initialize local repository</span>
git init

<span class="comment"># 2. Add your personal remote repository link</span>
git remote add origin https://github.com/YOUR_USERNAME/${esc(domainSlug)}-project.git

<span class="comment"># 3. Commit your customized project files</span>
git add .
git commit -m "feat: complete ${esc(domainName)} project implementation"
git push -u origin main</code></pre>
            </div>
          </div>

          <div class="roadmap-step-card">
            <div class="roadmap-step-header">
              <div class="roadmap-step-left">
                <div class="roadmap-step-badge" style="background:#0d6e6e;">4</div>
                <div class="roadmap-step-title-area">
                  <h4>Submit Repository in Submit Task Tab</h4>
                  <span style="color:#0d6e6e;font-weight:700;">LinkedIn Sharing is Optional for Project Based Internship</span>
                </div>
              </div>
              <button type="button" class="btn btn-dark" onclick="switchDashboardTab('submit')" style="padding:8px 16px;font-size:12.5px;cursor:pointer;">
                Go to Submit Task &rarr;
              </button>
            </div>
            <p class="roadmap-step-body" style="margin:0;">
              Paste your public GitHub repository link in the <strong>Submit Task</strong> tab. For Project Based candidates, sharing on LinkedIn is completely <em>optional</em> (recommended for networking, but not required to unlock your certificate).
            </p>
          </div>

          <div class="roadmap-step-card">
            <div class="roadmap-step-header">
              <div class="roadmap-step-left">
                <div class="roadmap-step-badge">5</div>
                <div class="roadmap-step-title-area">
                  <h4>Review &amp; Unlock Verified Credential</h4>
                  <span>Mentor Review &amp; Certificate After Approval</span>
                </div>
              </div>
              <button type="button" class="btn btn-dark" onclick="switchDashboardTab('certificate')" style="padding:8px 16px;font-size:12.5px;cursor:pointer;">
                Open Certificate Tab &rarr;
              </button>
            </div>
            <p class="roadmap-step-body" style="margin:0;">
              Once submitted, our reviewer validates your repository deliverables. Upon approval, your official GreyRocks verifiable certificate with verifiable QR code and ID will be available in the <strong>Internship Certificate</strong> tab.
            </p>
          </div>
          ` : `
          <!-- Comprehensive Program Academic Track Steps -->
          <div class="roadmap-step-card" style="border-left:4px solid #0b1f36;">
            <div class="roadmap-step-header">
              <div class="roadmap-step-left">
                <div class="roadmap-step-badge">2</div>
                <div class="roadmap-step-title-area">
                  <h4>Access Complete Academic Kit in Project Resources</h4>
                  <span style="color:#0b1f36;font-weight:700;">Editable Word Report &amp; PowerPoint PPT Deck Unlocked</span>
                </div>
              </div>
              <button type="button" class="btn btn-dark" onclick="switchDashboardTab('resources')" style="padding:8px 16px;font-size:12.5px;cursor:pointer;">
                Open Project Resources &rarr;
              </button>
            </div>
            <p class="roadmap-step-body" style="margin:0 0 12px;">
              Your comprehensive package includes everything needed for college and university submission for <strong>${esc(domainName)}</strong>:
            </p>
            <div class="roadmap-guide-block">
              <strong>Included in Your Comprehensive Kit:</strong>
              <ul style="margin:6px 0 0;padding-left:18px;font-size:13px;line-height:1.7;">
                <li><strong>Domain Source Repository:</strong> Starting code to run, study, and adapt to your assigned requirements.</li>
                <li><strong>Editable Project Report Template (.docx):</strong> Formatted Word document with abstract, system architecture, literature review, and test results.</li>
                <li><strong>Seminar Presentation Deck (.pptx):</strong> Professional presentation slides ready for viva defense.</li>
                <li><strong>Program Letter and Certificate:</strong> Participation letter; certificate after task submission and reviewer approval.</li>
              </ul>
            </div>
          </div>

          <div class="roadmap-step-card">
            <div class="roadmap-step-header">
              <div class="roadmap-step-left">
                <div class="roadmap-step-badge">3</div>
                <div class="roadmap-step-title-area">
                  <h4>Push Source Code to Your Personal GitHub</h4>
                  <span>Create Verifiable Portfolio Deliverable</span>
                </div>
              </div>
            </div>
            <p class="roadmap-step-body" style="margin:0 0 12px;">
              Download the codebase from Project Resources and push it to your GitHub profile following standard commands:
            </p>
            <div class="roadmap-code-box">
              <pre><code>git init
git remote add origin https://github.com/YOUR_USERNAME/${esc(domainSlug)}-project.git
git add .
git commit -m "feat: complete ${esc(domainName)} internship deliverables"
git push -u origin main</code></pre>
            </div>
          </div>

          <div class="roadmap-step-card">
            <div class="roadmap-step-header">
              <div class="roadmap-step-left">
                <div class="roadmap-step-badge">4</div>
                <div class="roadmap-step-title-area">
                  <h4>Submit Deliverables for Expedited Review</h4>
                  <span>Optional LinkedIn &middot; Priority Evaluation</span>
                </div>
              </div>
              <button type="button" class="btn btn-dark" onclick="switchDashboardTab('submit')" style="padding:8px 16px;font-size:12.5px;cursor:pointer;">
                Submit Task &rarr;
              </button>
            </div>
            <p class="roadmap-step-body" style="margin:0;">
              Submit your GitHub URL in the Submit Task tab. Sharing on LinkedIn is completely optional. Your submission receives expedited review, and your GreyRocks certificate unlocks under the <strong>Internship Certificate</strong> tab.
            </p>
          </div>
          `}
        </div>
      </div>

      <!-- Tab 2: Account & Domain Info (Combined) -->
      <div class="tab-content" id="tab-profile">
        <div style="margin-bottom:20px;">
          <h3 style="margin:0 0 6px;">Account &amp; Domain Overview</h3>
          <p style="color:var(--muted);font-size:14px;margin:0;">Your verified candidate profile, enrolled track, and issuing partner specifications.</p>
        </div>
        <div class="dash-info-grid">
          <div class="dash-info-item">
            <label>Full Name</label>
            <p><strong>${esc(session.name)}</strong></p>
          </div>
          <div class="dash-info-item">
            <label>Email Address</label>
            <p>${esc(session.email)}</p>
          </div>
          <div class="dash-info-item">
            <label>Enrolled Domain</label>
            <p><strong>${esc(domainName)}</strong></p>
          </div>
          <div class="dash-info-item">
            <label>Program Plan</label>
            <p>${esc(planInfo.name)} (${formatPrice(activeOrder.amount, activeOrder.currency || 'INR')})</p>
          </div>
          <div class="dash-info-item">
            <label>Tenure &amp; Duration</label>
            <p>${esc(duration)} (Flexible &middot; Self-Paced)</p>
          </div>
          <div class="dash-info-item">
            <label>Program Status</label>
            <p><span class="admin-badge admin-badge-green">Active &middot; In Progress</span></p>
          </div>
          <div class="dash-info-item">
            <label>Credential Partner</label>
            <p>GreyRocks Digital Engineering</p>
          </div>
          <div class="dash-info-item">
            <label>Verification Authority</label>
            <p>greyrocks.in/verification</p>
          </div>
          <div class="dash-info-item">
            <label>Student Role</label>
            <p><span class="admin-badge admin-badge-blue">Candidate / Intern</span></p>
          </div>
          <div class="dash-info-item">
            <label>Candidate Order ID</label>
            <p><code>${esc(activeOrder.id)}</code></p>
          </div>
        </div>

        ${isDemoStudent ? `
        <form id="demoEnrollmentForm" style="margin-top:24px;padding:20px;border:1px solid #cfe2e8;border-radius:14px;background:#f3fafb;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;align-items:end;">
          <div style="grid-column:1/-1;"><strong>Demo controls</strong><p style="margin:4px 0 0;color:var(--muted);font-size:13px;">Change the local demo plan or domain to preview how the dashboard assignment and resources respond. These controls are unavailable in production.</p></div>
          <label style="display:grid;gap:6px;font-size:13px;font-weight:700;">Program plan
            <select name="plan" required style="padding:10px;border:1px solid var(--line);border-radius:9px;font:inherit;">
              ${Object.values(plans).map(plan => `<option value="${esc(plan.id)}" ${plan.id === planKey ? 'selected' : ''}>${esc(plan.name)}</option>`).join('')}
            </select>
          </label>
          <label style="display:grid;gap:6px;font-size:13px;font-weight:700;">Internship domain
            <select name="domain" required style="padding:10px;border:1px solid var(--line);border-radius:9px;font:inherit;">
              ${domains.map(([name, slug]) => `<option value="${esc(slug)}" ${name === domainName ? 'selected' : ''}>${esc(name)}</option>`).join('')}
            </select>
          </label>
          <button type="submit" class="btn btn-dark" style="min-height:42px;">Save demo selection</button>
          <p id="demoEnrollmentStatus" role="status" style="grid-column:1/-1;margin:0;color:var(--muted);font-size:13px;"></p>
        </form>` : ''}

        ${(certs && certs.length > 0) ? `
        <div style="margin-top:24px;background:white;border:1px solid var(--line);border-radius:16px;padding:22px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
          <div>
            <h3 style="margin:0 0 6px;">Your Verified GreyRocks Credential is Ready!</h3>
            <p style="margin:0;color:var(--muted);font-size:14px;">Credential ID: <code>${esc(certs[0].credentialId)}</code> &middot; Issued: ${esc(certs[0].issueDate)}</p>
          </div>
          <div style="display:flex;gap:10px;">
            <button type="button" class="btn btn-dark" onclick="switchDashboardTab('certificate')">View Certificate</button>
          </div>
        </div>
        ` : ''}
      </div>

      <!-- Tab 3: Official Offer Letter -->
      <div class="tab-content" id="tab-offer">
        <div class="offer-action-bar" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:22px;padding:16px 20px;background:white;border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);">
          <div>
            <h4 style="margin:0 0 4px;font:700 15px Manrope;color:var(--ink);">Official Internship Offer Letter</h4>
            <p style="margin:0;font-size:13px;color:var(--muted);">Download your official letter in PDF or high-resolution JPG format, or print directly.</p>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button type="button" class="btn btn-dark" id="btnDownloadOfferPdf" onclick="downloadOfferPdf(this)" style="display:inline-flex;align-items:center;gap:6px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Download PDF
            </button>
            <button type="button" class="btn btn-light" id="btnDownloadOfferJpg" onclick="downloadOfferJpg(this)" style="display:inline-flex;align-items:center;gap:6px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;background:white;border:1px solid var(--line);color:var(--ink);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              Download JPG
            </button>
            <button type="button" class="btn btn-ghost" id="btnPrintOffer" onclick="printOffer()" style="display:inline-flex;align-items:center;gap:6px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              Print Document
            </button>
          </div>
        </div>

        <!-- Official Letterhead Card -->
        <div class="offer-letter" id="offerLetterCard" style="margin:0 auto;background:#ffffff;padding:45px 50px;border:1.5px solid #cbd5e1;border-radius:18px;box-shadow:0 12px 35px rgba(11,31,54,.08);max-width:760px;position:relative;font-family:'DM Sans',sans-serif;color:#1e293b;">
          
          <div style="position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#0d6e6e 0%,#0b1f36 50%,#c79a4a 100%);border-top-left-radius:16px;border-top-right-radius:16px;"></div>

          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #e2e8f0;padding-bottom:20px;margin-bottom:26px;">
            <div style="display:flex;align-items:center;gap:14px;">
              <img src="/brand/hireebridge-offer-mark.png" alt="HireeBridge Logo" width="46" height="46" style="border-radius:8px;object-fit:contain;" crossorigin="anonymous">
              <div>
                <h2 style="font:800 24px/1 Manrope,sans-serif;margin:0;letter-spacing:-.02em;color:#0b1f36;">GREYROCKS</h2>
                <span style="display:block;margin-top:4px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">In Academic Association with Hireebridge</span>
              </div>
            </div>
            <div style="text-align:right;">
              <span style="display:block;font-size:12px;color:#64748b;">Ref: <strong style="color:#0b1f36;font-family:monospace;font-size:13px;">${offerLetterRef}</strong></span>
              <span style="display:block;font-size:12px;color:#64748b;margin-top:3px;">Date: <strong style="color:#0b1f36;">${formatDate()}</strong></span>
            </div>
          </div>

          <div style="margin-bottom:22px;">
            <span style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">To,</span>
            <h3 style="margin:4px 0 2px;font:800 21px Manrope,sans-serif;color:#0b1f36;">${esc(session.name)}</h3>
            <p style="margin:0;font-size:13px;color:#475569;">Email: ${esc(session.email)} &middot; Candidate ID: <code>${esc(activeOrder.id)}</code></p>
          </div>

          <div style="margin:20px 0;background:#f0fdfa;border:1px solid #ccfbf1;border-left:4px solid #0d6e6e;padding:12px 18px;border-radius:8px;">
            <strong style="color:#0f766e;font-size:16px;letter-spacing:.04em;">INTERNSHIP OFFER LETTER</strong>
          </div>

          <p style="font-size:14px;line-height:1.75;color:#334155;margin:0 0 14px;">
            Dear <strong>${esc(session.name)}</strong>,
          </p>
          <p style="font-size:14px;line-height:1.75;color:#334155;margin:0 0 14px;">
            We are pleased to offer you an internship opportunity with <strong>GreyRocks</strong>, facilitated through the <strong>HireeBridge Internship Program</strong>, for the position of <strong>${esc(domainName)} Intern</strong>.
          </p>
          <h4 style="margin:20px 0 10px;font:800 14px Manrope,sans-serif;color:#0b1f36;text-transform:uppercase;letter-spacing:.04em;">Internship Details</h4>
          <table style="width:100%;border-collapse:collapse;margin:0 0 22px;font-size:13px;line-height:1.55;">
            <thead><tr style="background:#f1f5f9;text-align:left;"><th style="padding:10px 12px;border:1px solid #dbe4ec;">Particular</th><th style="padding:10px 12px;border:1px solid #dbe4ec;">Details</th></tr></thead>
            <tbody>
              <tr><td style="padding:9px 12px;border:1px solid #dbe4ec;">Intern Name</td><td style="padding:9px 12px;border:1px solid #dbe4ec;">${esc(session.name)}</td></tr>
              <tr><td style="padding:9px 12px;border:1px solid #dbe4ec;">Position</td><td style="padding:9px 12px;border:1px solid #dbe4ec;">${esc(domainName)} Intern</td></tr>
              <tr><td style="padding:9px 12px;border:1px solid #dbe4ec;">Duration</td><td style="padding:9px 12px;border:1px solid #dbe4ec;">${esc(duration)}</td></tr>
              <tr><td style="padding:9px 12px;border:1px solid #dbe4ec;">Work Mode</td><td style="padding:9px 12px;border:1px solid #dbe4ec;">Remote</td></tr>
            </tbody>
          </table>
          <h4 style="margin:20px 0 8px;font:800 14px Manrope,sans-serif;color:#0b1f36;text-transform:uppercase;letter-spacing:.04em;">Program Overview</h4>
          <p style="font-size:14px;line-height:1.75;color:#334155;margin:0 0 10px;">During the internship, you will work on a domain-specific practical project designed to develop your technical and professional skills. The assigned project is <strong>${esc(assignment?.project.title || domainName)}</strong>. ${esc(assignment?.project.objective || "The project follows the requirements of the selected internship domain.")}</p>
          <p style="font-size:14px;line-height:1.75;color:#334155;margin:0 0 18px;">The program includes project implementation, documentation, task submission, and evaluation according to the selected program requirements. You are expected to complete the assigned task within the program duration and submit the required work for review.</p>
          <h4 style="margin:20px 0 8px;font:800 14px Manrope,sans-serif;color:#0b1f36;text-transform:uppercase;letter-spacing:.04em;">Responsibilities</h4>
          <p style="font-size:14px;line-height:1.7;color:#334155;margin:0 0 8px;">As a ${esc(domainName)} Intern, your responsibilities include:</p>
          <ul style="font-size:13px;color:#334155;line-height:1.7;padding-left:20px;margin:0 0 18px;">${(assignment?.project.requirements || []).map(requirement => `<li style="margin-bottom:5px;">${esc(requirement)}</li>`).join("")}</ul>
          <h4 style="margin:20px 0 8px;font:800 14px Manrope,sans-serif;color:#0b1f36;text-transform:uppercase;letter-spacing:.04em;">Evaluation &amp; Completion</h4>
          <p style="font-size:14px;line-height:1.75;color:#334155;margin:0 0 18px;">Your internship project will be reviewed against the assigned requirements by the designated program reviewer. Successful completion and approval of the submitted work make you eligible for the applicable internship completion certificate and program deliverables.</p>
          <h4 style="margin:20px 0 8px;font:800 14px Manrope,sans-serif;color:#0b1f36;text-transform:uppercase;letter-spacing:.04em;">Important Notice</h4>
          <p style="font-size:14px;line-height:1.75;color:#334155;margin:0 0 18px;">This offer letter confirms your acceptance into the applicable internship program. It does not by itself confirm internship completion or certificate issuance. Completion-related documents are issued according to the program task submission and evaluation process.</p>
          <h4 style="margin:20px 0 8px;font:800 14px Manrope,sans-serif;color:#0b1f36;text-transform:uppercase;letter-spacing:.04em;">Confidentiality &amp; Professional Conduct</h4>
          <p style="font-size:14px;line-height:1.75;color:#334155;margin:0 0 18px;">You are expected to maintain professional conduct and appropriately handle any confidential information, project materials, credentials, or data provided as part of the program.</p>
          <h4 style="margin:20px 0 8px;font:800 14px Manrope,sans-serif;color:#0b1f36;text-transform:uppercase;letter-spacing:.04em;">Acceptance</h4>
          <p style="font-size:14px;line-height:1.75;color:#334155;margin:0 0 18px;">We welcome you to the program and look forward to your participation.</p>
          <div style="margin-top:28px;padding-top:20px;border-top:1.5px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-end;gap:20px;">
            <div style="text-align:left;">
              <div style="font-family:'Georgia',serif;font-style:italic;font-weight:700;font-size:18px;color:#0d6e6e;">Internship Coordinator</div>
              <strong style="display:block;font-size:13px;color:#0b1f36;margin-top:4px;">HireeBridge Technical Programs</strong>
              <span style="display:block;font-size:11px;color:#64748b;margin-top:2px;">Operations &amp; Delivery</span>
            </div>
            <div style="text-align:right;">
              <div style="font-family:'Georgia',serif;font-style:italic;font-weight:700;font-size:18px;color:#0b1f36;">Director of Certifications</div>
              <strong style="display:block;font-size:13px;color:#0b1f36;margin-top:4px;">GreyRocks Digital Engineering</strong>
              <span style="display:block;font-size:11px;color:#64748b;margin-top:2px;">Credential Authority</span>
            </div>
          </div>
          <div style="margin-top:28px;padding-top:14px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#94a3b8;">
            <span>Official Verification Authority: <strong style="color:#0d6e6e;">greyrocks.in/verification</strong></span>
            <span>Candidate Copy &middot; Unique Ref: ${offerLetterRef}</span>
          </div>
        </div>

        <script>
          window.switchDashboardTab = function(tabName) {
            if (!tabName) return;
            document.querySelectorAll('.dashboard-tab').forEach(function(b) {
              if (b.getAttribute('data-tab') === tabName) {
                b.classList.add('active');
              } else {
                b.classList.remove('active');
              }
            });
            document.querySelectorAll('.tab-content').forEach(function(pane) {
              if (pane.id === 'tab-' + tabName) {
                pane.classList.add('active');
                pane.style.display = 'block';
              } else {
                pane.classList.remove('active');
                pane.style.display = 'none';
              }
            });
            if (window.innerWidth <= 900) {
              var target = document.querySelector('.dashboard-main');
              if (target) {
                var top = target.getBoundingClientRect().top;
                window.scrollTo({ top: window.pageYOffset + top - 76, behavior: 'smooth' });
              }
            }
          };

          var demoEnrollmentForm = document.getElementById('demoEnrollmentForm');
          if (demoEnrollmentForm) {
            demoEnrollmentForm.addEventListener('submit', async function(event) {
              event.preventDefault();
              var status = document.getElementById('demoEnrollmentStatus');
              var button = demoEnrollmentForm.querySelector('button[type="submit"]');
              button.disabled = true;
              status.textContent = 'Saving demo selection…';
              try {
                var response = await fetch('/api/demo/student/enrollment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ plan: demoEnrollmentForm.elements.plan.value, domain: demoEnrollmentForm.elements.domain.value })
                });
                var result = await response.json();
                if (!response.ok || !result.ok) throw new Error(result.error || 'Could not update the demo selection.');
                window.location.reload();
              } catch (error) {
                status.textContent = error.message || 'Could not update the demo selection.';
                button.disabled = false;
              }
            });
          }

          function printOffer() {
            var offerTab = document.getElementById('tab-offer');
            if (offerTab) {
              document.querySelectorAll('.tab-content').forEach(function(p) { p.classList.remove('active'); });
              offerTab.classList.add('active');
            }
            window.print();
          }

          function loadScriptAsync(src) {
            return new Promise(function(resolve, reject) {
              if (document.querySelector('script[src="' + src + '"]')) return resolve();
              var s = document.createElement('script');
              s.src = src;
              s.onload = resolve;
              s.onerror = function() { reject(new Error('Failed to load ' + src)); };
              document.head.appendChild(s);
            });
          }

          async function getOfferCanvas() {
            var card = document.getElementById('offerLetterCard');
            if (!card) throw new Error('Offer letter card not found');
            if (!window.html2canvas) {
              await loadScriptAsync('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
            }
            return window.html2canvas(card, {
              scale: 2,
              useCORS: true,
              backgroundColor: '#ffffff',
              logging: false
            });
          }

          async function downloadOfferJpg(btn) {
            var origText = btn ? btn.innerHTML : '';
            if (btn) { btn.disabled = true; btn.textContent = 'Generating JPG…'; }
            try {
              var canvas = await getOfferCanvas();
              var dataUrl = canvas.toDataURL('image/jpeg', 0.95);
              var link = document.createElement('a');
              link.download = 'Offer_Letter_HireeBridge.jpg';
              link.href = dataUrl;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            } catch (err) {
              console.error('JPG download error:', err);
              alert('Could not download JPG: ' + (err && err.message ? err.message : err));
            } finally {
              if (btn) { btn.disabled = false; btn.innerHTML = origText; }
            }
          }

          async function downloadOfferPdf(btn) {
            var origText = btn ? btn.innerHTML : '';
            if (btn) { btn.disabled = true; btn.textContent = 'Generating PDF…'; }
            try {
              var canvas = await getOfferCanvas();
              if (!window.jspdf) {
                await loadScriptAsync('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
              }
              var jsPDF = window.jspdf.jsPDF;
              var pdf = new jsPDF('p', 'mm', 'a4');
              var pageWidth = pdf.internal.pageSize.getWidth();
              var pageHeight = pdf.internal.pageSize.getHeight();
              var margin = 10;
              var maxW = pageWidth - (margin * 2);
              var maxH = pageHeight - (margin * 2);
              var ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
              var renderW = canvas.width * ratio;
              var renderH = canvas.height * ratio;
              var posX = (pageWidth - renderW) / 2;
              var posY = 10;
              var imgData = canvas.toDataURL('image/jpeg', 0.95);
              pdf.addImage(imgData, 'JPEG', posX, posY, renderW, renderH);
              pdf.save('Offer_Letter_HireeBridge.pdf');
            } catch (err) {
              console.error('PDF download error:', err);
              window.print();
            } finally {
              if (btn) { btn.disabled = false; btn.innerHTML = origText; }
            }
          }
        </script>
      </div>

      <!-- Tab 4: Assigned Internship Task -->
      <div class="tab-content" id="tab-tasks">
        <div style="margin-bottom:18px;">
          <h3 style="margin:0 0 6px;">Assigned Internship Task</h3>
          <p style="color:var(--muted);font-size:14px;margin:0;">Complete this domain-specific assignment, then submit your implementation and evidence for reviewer evaluation.</p>
        </div>
        ${assignment ? `<article class="task-brief">
          <div class="task-brief-head"><div><div class="eyebrow">${esc(domainName)} &middot; ${esc(planInfo.name)}</div><h4>${esc(assignment.project.title)}</h4></div><span class="admin-badge ${taskStatus === 'APPROVED' ? 'admin-badge-green' : taskStatus === 'UNDER REVIEW' ? 'admin-badge-blue' : 'admin-badge-yellow'}">${esc(taskStatus)}</span></div>
          <p class="task-brief-lead">${esc(assignment.project.context)}</p>
          <section class="task-brief-section"><h5>Project objective</h5><p>${esc(assignment.project.objective)}</p></section>
          <section class="task-brief-section"><h5>What to build</h5><ul class="task-brief-list">${assignment.project.requirements.map(item => `<li>${esc(item)}</li>`).join('')}</ul></section>
          <div class="task-brief-grid"><section class="task-brief-section"><h5>Use these inputs</h5><p>${esc(assignment.project.inputs)}</p></section><section class="task-brief-section"><h5>Submit these deliverables</h5><p>${esc(assignment.project.outputs)}</p></section></div>
          <section class="task-brief-section"><h5>Validation and testing</h5><p>${esc(assignment.project.tests)}</p><p class="task-brief-note">Document how to set up and run your work, the tests you performed, key results, limitations, and any third-party material used.</p></section>
          <section class="task-brief-section task-brief-plan"><h5>Your plan: ${esc(planInfo.name)}</h5><p>${assignment.includesReference ? 'Start with the supplied domain repository. Review its licence, run it, understand the relevant parts, implement the assigned requirements, then test and push your own project to GitHub.' : 'Build the project yourself from this specification. This plan does not include starter source code or a reference repository.'}${assignment.comprehensive ? ' Your complete kit also includes the editable report, presentation, and offer letter in Project Resources.' : ''}</p>${assignment.includesReference ? `<p style="margin-top:10px"><a class="text-link" href="${esc(assignment.project.repo)}" target="_blank" rel="noopener noreferrer">Open the ${esc(assignment.project.title)} source repository</a></p>` : ''}</section>
          <p class="task-brief-note">Submit your GitHub repository, a summary of completed requirements, test evidence, and an optional demo link. A certificate is available only after reviewer approval.</p>
          <div class="task-brief-actions"><button type="button" class="btn btn-dark" onclick="switchDashboardTab('submit')">Submit Task</button>${assignment.comprehensive ? `<button type="button" class="btn btn-light" onclick="switchDashboardTab('resources')">Open Project Resources</button>` : ''}</div>
        </article>` : `<div class="task-brief"><p>${esc(taskDetails)}</p></div>`}
      </div>
      <!-- Tab 5: Submit Task -->
      <div class="tab-content" id="tab-submit">
        <div style="margin-bottom:20px;">
          <h3 style="margin:0 0 6px;">Submit Project Deliverables</h3>
          <p style="color:var(--muted);font-size:14px;margin:0;">Submit your GitHub repository, LinkedIn post link, and optional deployment URL for mentor evaluation.</p>
        </div>

        <form class="submit-form" id="submitTaskForm">
          <label>GitHub Repository URL *
            <input required type="url" name="github" placeholder="https://github.com/yourusername/internship-project">
            <span style="font-size:12px;color:var(--muted);font-weight:normal;display:block;margin-top:3px;">Ensure your repository is Public with your README and source code.</span>
          </label>

          <label>LinkedIn Post URL <span style="color:var(--muted);font-weight:normal;">(Optional)</span>
            <input type="url" name="linkedin" placeholder="https://linkedin.com/posts/your-internship-milestone">
            <span style="font-size:12px;color:var(--muted);font-weight:normal;display:block;margin-top:3px;">
              Optional: share a professional update about your work. This is not required for task review or certificate issuance.
            </span>
          </label>

          <label>Live Demo / Deployment Link (Optional)
            <input type="url" name="deployment" placeholder="https://your-project.vercel.app">
          </label>
          <label>Project Summary &amp; Key Learnings
            <textarea name="notes" placeholder="Summarize your tech stack, architecture, modules built, and challenges solved…"></textarea>
          </label>
          <button class="btn btn-dark" type="submit">Submit Deliverables for Review</button>
          <div id="submitTaskResult" style="display:none;font-weight:700;margin-top:10px;"></div>
        </form>

        ${(submissions && submissions.length > 0) ? `
        <div style="margin-top:35px;">
          <h4 style="margin:0 0 14px;font:800 18px Manrope;">Previous Submissions</h4>
          <table class="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>GitHub</th>
                <th>LinkedIn</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${submissions.map(s => `
                <tr>
                  <td>${formatDate(new Date(s.created_at))}</td>
                  <td><a href="${esc(s.github)}" target="_blank" class="text-link">View Repo &#8599;</a></td>
                  <td>${s.linkedin ? `<a href="${esc(s.linkedin)}" target="_blank" class="text-link">View Post &#8599;</a>` : '<span style="color:var(--muted);">N/A</span>'}</td>
                  <td>
                    <span class="admin-badge ${s.status === 'approved' ? 'admin-badge-green' : s.status === 'rejected' ? 'admin-badge-yellow' : 'admin-badge-blue'}">
                      ${esc(s.status || 'pending')}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
      </div>

      <!-- Tab 6: Project Resources (Plan-Gated & Dynamic Admin Links) -->
      <div class="tab-content" id="tab-resources">
        <div style="margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;">
            <h3 style="margin:0;font:800 20px Manrope;color:var(--ink);">Curated Project Resources &amp; Downloads</h3>
            <span class="admin-badge admin-badge-green" style="font-size:11px;">${esc(domainName)} Track</span>
          </div>
          <p style="color:var(--muted);font-size:14px;margin:0;">Access the domain reference repository and, for the Comprehensive Program, source code, editable report, and presentation materials. Availability depends on your enrolled plan.</p>
        </div>

        <div class="resource-grid">
          <!-- Card 1: Starter Project Source Code Repo -->
          <div class="resource-card ${isCertificatePlan ? 'locked' : ''}">
            <div>
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
                <h4 style="margin:0;">Starter Project Repository</h4>
                <span class="admin-badge ${isCertificatePlan ? 'admin-badge-yellow' : 'admin-badge-green'}" style="font-size:10px;">
                  ${isCertificatePlan ? 'Included with the other program tiers' : 'Unlocked &middot; Included'}
                </span>
              </div>
              <p>Curated GitHub learning reference for <strong>${esc(domainName)}</strong>. Check its license before reuse and submit your own implementation.</p>
            </div>
            <div style="margin-top:16px;">
              ${isCertificatePlan ? `
                <a href="/pricing" class="btn btn-light" style="padding:8px 14px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
                  Upgrade to Unlock Repository &rarr;
                </a>
              ` : `
                <a href="${esc(domainGithubUrl)}" target="_blank" class="btn btn-dark" style="padding:9px 16px;font-size:12.5px;font-weight:700;display:inline-flex;align-items:center;gap:6px;text-decoration:none;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  Access GitHub Repository &#8599;
                </a>
              `}
            </div>
          </div>

          <!-- Card 2: College Project Report Template (Word docx) -->
          <div class="resource-card ${isComprehensivePlan ? '' : 'locked'}">
            <div>
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
                <h4 style="margin:0;">College Project Report Template (.docx)</h4>
                <span class="admin-badge ${isComprehensivePlan ? 'admin-badge-green' : 'admin-badge-yellow'}" style="font-size:10px;">
                  ${isComprehensivePlan ? 'Unlocked &middot; Comprehensive' : 'Comprehensive Program only'}
                </span>
              </div>
              <p>Complete academic report template customized for <strong>${esc(domainName)}</strong> with abstract, literature review, architecture diagrams, and testing results.</p>
            </div>
            <div style="margin-top:16px;">
              ${isComprehensivePlan ? `
                <a href="${esc(domainReportUrl)}" target="_blank" download class="btn btn-dark" style="padding:9px 16px;font-size:12.5px;font-weight:700;display:inline-flex;align-items:center;gap:6px;text-decoration:none;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Download Report Template (.docx) &#8599;
                </a>
              ` : `
                <a href="/pricing" class="btn btn-light" style="padding:8px 14px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
                  Upgrade to Comprehensive &rarr;
                </a>
              `}
            </div>
          </div>

          <!-- Card 3: Seminar Presentation Deck (PPT) -->
          <div class="resource-card ${isComprehensivePlan ? '' : 'locked'}">
            <div>
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
                <h4 style="margin:0;">Seminar Presentation Deck (.pptx)</h4>
                <span class="admin-badge ${isComprehensivePlan ? 'admin-badge-green' : 'admin-badge-yellow'}" style="font-size:10px;">
                  ${isComprehensivePlan ? 'Unlocked &middot; Comprehensive' : 'Comprehensive Program only'}
                </span>
              </div>
              <p>Professionally designed 18+ slide PowerPoint deck for <strong>${esc(domainName)}</strong> ready for academic viva, department seminar, and project evaluation.</p>
            </div>
            <div style="margin-top:16px;">
              ${isComprehensivePlan ? `
                <a href="${esc(domainPptUrl)}" target="_blank" download class="btn btn-dark" style="padding:9px 16px;font-size:12.5px;font-weight:700;display:inline-flex;align-items:center;gap:6px;text-decoration:none;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                  Download Presentation Deck (.pptx) &#8599;
                </a>
              ` : `
                <a href="/pricing" class="btn btn-light" style="padding:8px 14px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
                  Upgrade to Comprehensive &rarr;
                </a>
              `}
            </div>
          </div>

          <!-- Card 4: Verification Authority Guide -->
          <div class="resource-card">
            <div>
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
                <h4 style="margin:0;">GreyRocks Credential &amp; Verification Guide</h4>
                <span class="admin-badge admin-badge-green" style="font-size:10px;">All Students</span>
              </div>
              <p>Complete step-by-step instructions on verifying credentials, embedding badges on LinkedIn, and showcasing tamper-proof credentials to recruiters.</p>
            </div>
            <div style="margin-top:16px;">
              <a href="https://greyrocks.in/verification" target="_blank" class="btn btn-light" style="padding:8px 14px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;text-decoration:none;">
                Open Verification Portal &#8599;
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 7: Internship Certificate -->
      <div class="tab-content" id="tab-certificate">
        ${isApproved ? `
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:24px;padding:20px 24px;background:white;border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <h4 style="margin:0;font:800 18px Manrope;color:var(--ink);">Official Internship Completion Certificate</h4>
              <span class="admin-badge admin-badge-green" style="font-size:11px;">Verified &amp; Issued</span>
            </div>
            <p style="margin:0;font-size:13px;color:var(--muted);">Credential ID: <strong style="color:#0d6e6e;font-family:monospace;font-size:14px;">${esc(certId)}</strong> &middot; Issued by GreyRocks Digital Engineering</p>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <a href="${certPdfUrl}" download="Internship_Certificate_${certId}.pdf" target="_blank" class="btn btn-dark" style="display:inline-flex;align-items:center;gap:7px;padding:11px 20px;font-size:13px;font-weight:700;text-decoration:none;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Download PDF
            </a>
            <a href="${certJpgUrl}" download="Internship_Certificate_${certId}.jpg" target="_blank" class="btn btn-light" style="display:inline-flex;align-items:center;gap:7px;padding:11px 20px;font-size:13px;font-weight:700;background:white;border:1px solid var(--line);color:var(--ink);text-decoration:none;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              Download JPG
            </a>
            <a href="https://greyrocks.in/verification/${encodeURIComponent(certId)}" target="_blank" class="btn btn-ghost" style="display:inline-flex;align-items:center;gap:7px;padding:11px 18px;font-size:13px;font-weight:700;text-decoration:none;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
              Verify Online
            </a>
          </div>
        </div>

        <div style="background:white;padding:30px;border:1px solid var(--line);border-radius:20px;box-shadow:var(--shadow);text-align:center;margin-bottom:24px;">
          <div style="position:relative;max-width:880px;margin:0 auto;overflow:hidden;border-radius:14px;box-shadow:0 12px 35px rgba(11,31,54,.12);border:1px solid #e2e8f0;">
            <img src="${certJpgUrl}" alt="Official Internship Certificate - ${esc(certId)}" style="width:100%;height:auto;display:block;" onerror="this.onerror=null;this.src='${certPdfUrl}';" />
          </div>
        </div>

        <div style="background:white;border:1px solid var(--line);border-radius:18px;padding:24px 28px;box-shadow:var(--shadow);">
          <h4 style="margin:0 0 16px;font:800 16px Manrope;color:var(--ink);">Verified Credential Details</h4>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:16px;">
            <div style="background:#f8fafc;padding:14px 18px;border-radius:12px;border:1px solid #e2e8f0;">
              <span style="display:block;font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">Candidate Name</span>
              <strong style="font-size:14px;color:var(--ink);">${esc(cert.name || session.name)}</strong>
            </div>
            <div style="background:#f8fafc;padding:14px 18px;border-radius:12px;border:1px solid #e2e8f0;">
              <span style="display:block;font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">Internship Domain</span>
              <strong style="font-size:14px;color:var(--ink);">${esc(cert.domain || domainName)}</strong>
            </div>
            <div style="background:#f8fafc;padding:14px 18px;border-radius:12px;border:1px solid #e2e8f0;">
              <span style="display:block;font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">Tenure &amp; Duration</span>
              <strong style="font-size:14px;color:var(--ink);">${esc(cert.duration || duration)}</strong>
            </div>
            <div style="background:#f8fafc;padding:14px 18px;border-radius:12px;border:1px solid #e2e8f0;">
              <span style="display:block;font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">Issue Date</span>
              <strong style="font-size:14px;color:var(--ink);">${esc(cert.issueDate || '29 Sept 2026')}</strong>
            </div>
            <div style="background:#f8fafc;padding:14px 18px;border-radius:12px;border:1px solid #e2e8f0;">
              <span style="display:block;font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">Credential ID</span>
              <strong style="font-size:14px;color:#0d6e6e;font-family:monospace;">${esc(certId)}</strong>
            </div>
            <div style="background:#f8fafc;padding:14px 18px;border-radius:12px;border:1px solid #e2e8f0;">
              <span style="display:block;font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">Credential Issuer</span>
              <strong style="font-size:14px;color:var(--ink);">GreyRocks Digital Engineering</strong>
            </div>
          </div>
        </div>
        ` : isPending ? `
        <div style="background:white;padding:48px 30px;border:1px solid var(--line);border-radius:20px;box-shadow:var(--shadow);text-align:center;max-width:680px;margin:30px auto;">
          <div style="width:64px;height:64px;border-radius:50%;background:#fef9c3;color:#854d0e;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;font-size:26px;">⏳</div>
          <span class="admin-badge admin-badge-yellow" style="font-size:12px;padding:5px 14px;font-weight:700;">Evaluation in Progress</span>
          <h3 style="font:800 24px Manrope;color:var(--ink);margin:16px 0 8px;">Project Submitted &amp; Under Review</h3>
          <p style="color:var(--muted);font-size:14px;line-height:1.6;max-width:520px;margin:0 auto 20px;">Your technical deliverables and repository submission are currently being reviewed by the evaluation committee. Once approved by the administrator, your official tamper-proof GreyRocks verifiable certificate will be available here for download in high-resolution JPG and PDF formats.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 20px;display:inline-block;text-align:left;font-size:13px;">
            <span style="color:var(--muted);">Submitted Project:</span> <strong style="color:var(--ink);">${esc(latestSub.project_title || latestSub.projectTitle || 'Capstone Project')}</strong><br>
            <span style="color:var(--muted);">Status:</span> <strong style="color:#d97706;text-transform:capitalize;">Pending Review</strong>
          </div>
        </div>
        ` : `
        <div style="background:white;padding:48px 30px;border:1px solid var(--line);border-radius:20px;box-shadow:var(--shadow);text-align:center;max-width:680px;margin:30px auto;">
          <div style="width:64px;height:64px;border-radius:50%;background:#e0f2fe;color:#0369a1;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;font-size:26px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
          </div>
          <span class="admin-badge admin-badge-blue" style="font-size:12px;padding:5px 14px;font-weight:700;">Submission Required</span>
          <h3 style="font:800 24px Manrope;color:var(--ink);margin:16px 0 8px;">Submit Your Completed Task for Review</h3>
          <p style="color:var(--muted);font-size:14px;line-height:1.6;max-width:520px;margin:0 auto 24px;">To receive your official GreyRocks verifiable internship certificate and unique credential ID, please complete your assigned internship task and submit your GitHub repository under the <strong>Submit Task</strong> tab.</p>
          <button type="button" class="btn btn-dark" onclick="switchDashboardTab('submit')" style="padding:12px 24px;font-size:14px;font-weight:700;cursor:pointer;">
            Go to Submit Task &rarr;
          </button>
        </div>
        `}
      </div>

    </div><!-- /.dashboard-main -->
  </div><!-- /.dashboard-layout -->
</section>
</main>`;

  res.send(layout({
    title: 'Student Workspace | HireeBridge',
    description: 'Manage your tasks, view your offer letter, submit deliverables, and access project resources.',
    active: '/dashboard',
    content,
    session
  }));
}

async function adminPage(req, res, session) {
  const [stats, users, orders, certs, submissions, tasks, inquiries, domainResourcesList, totalStorageBytes, recentAuditLogs, programPrices] = await Promise.all([
    db.getDatabaseStats(),
    db.getAllUsers(),
    db.getAllOrders(),
    db.getAllCertificates(),
    db.getAllSubmissions(),
    db.getAllTasks(),
    db.getAllInquiries(),
    db.getAllDomainResources(),
    db.getTotalCertificateStorageBytes().catch(() => 0),
    db.getAuditLogs(15).catch(() => []),
    db.getProgramPrices()
  ]);

  const resourcesByDomain = {};
  (domainResourcesList || []).forEach(r => {
    if (r.domain) resourcesByDomain[r.domain.toLowerCase()] = r;
  });

  const totalRevenue = (orders || []).reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const certCount = (orders || []).filter(o => o.plan === 'certificate').length;
  const projectCount = (orders || []).filter(o => o.plan === 'project' || o.plan === 'starter').length;
  const compCount = (orders || []).filter(o => o.plan === 'comprehensive').length;
  const paidPlanCounts = Object.fromEntries(['certificate', 'project', 'comprehensive'].map(planId => [
    planId, (orders || []).filter(o => o.plan === planId && o.status === 'paid').length
  ]));
  const totalOrders = (orders || []).length;

  const pendingSubmissions = (submissions || []).filter(s => (s.status || 'pending') === 'pending');
  const approvedSubmissions = (submissions || []).filter(s => s.status === 'approved');
  const rejectedSubmissions = (submissions || []).filter(s => s.status === 'rejected');

  const content = `<main>
<div class="admin-layout">
  <aside class="admin-sidebar">
    <h3>Admin Navigation</h3>
    <ul class="admin-nav">
      <li>
        <button type="button" class="active" data-admin-view="analytics" onclick="switchAdminView('analytics')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          Analytics &amp; Revenue
        </button>
      </li>
      <li>
        <button type="button" data-admin-view="orders" onclick="switchAdminView('orders')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          Orders &amp; Sales (${totalOrders})
        </button>
      </li>
      <li>
        <button type="button" data-admin-view="pricing" onclick="switchAdminView('pricing')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><path d="M12 6v2m0 8v2"></path></svg>
          Program Pricing
        </button>
      </li>
      <li>
        <button type="button" data-admin-view="students" onclick="switchAdminView('students')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          Students (${(users || []).length})
        </button>
      </li>
      <li>
        <button type="button" data-admin-view="submissions" onclick="switchAdminView('submissions')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Submissions (${(submissions || []).length})
        </button>
      </li>
      <li>
        <button type="button" data-admin-view="certificates" onclick="switchAdminView('certificates')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
          Issue Certificates (${(certs || []).length})
        </button>
      </li>
      <li>
        <button type="button" data-admin-view="offer-letters" onclick="switchAdminView('offer-letters')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line></svg>
          Offer Letter Emails
        </button>
      </li>
      <li>
        <button type="button" data-admin-view="inquiries" onclick="switchAdminView('inquiries')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          Student Queries (${(inquiries || []).length})
        </button>
      </li>
      <li>
        <button type="button" data-admin-view="assign" onclick="switchAdminView('assign')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
          Assign Tasks
        </button>
      </li>
      <li>
        <button type="button" data-admin-view="resources" onclick="switchAdminView('resources')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          Course Resources
        </button>
      </li>
      <li>
        <button type="button" data-admin-view="broadcast" onclick="switchAdminView('broadcast')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          Broadcast &amp; Email
        </button>
      </li>
      <li>
        <button type="button" data-admin-view="storage-data" onclick="switchAdminView('storage-data')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
          Storage &amp; Data
        </button>
      </li>
      <li style="margin-top:18px;border-top:1px solid var(--line);padding-top:10px;">
        <a href="/logout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Logout (${esc(session.email)})
        </a>
      </li>
    </ul>
  </aside>

  <section class="admin-main">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:12px;">
      <div>
        <h1 style="margin:0;">Administrator Portal</h1>
        <div class="admin-subtitle" style="margin:2px 0 0;">Logged in: <strong>${esc(session.email)}</strong> &middot; Cloud Database: <strong>Neon PostgreSQL</strong></div>
      </div>
      <a class="btn btn-light" href="/" target="_blank">View Live Website &nearr;</a>
    </div>

    <!-- VIEW 1: Analytics & Revenue (Original Database Metrics, No Simulated Charts) -->
    <div class="admin-view active" id="view-analytics">
      <div class="admin-stats">
        <div class="admin-stat">
          <strong>₹${totalRevenue.toLocaleString('en-IN')}</strong>
          <span>Total Sales Revenue</span>
        </div>
        <div class="admin-stat">
          <strong>${totalOrders}</strong>
          <span>Total Program Enrollments</span>
        </div>
        <div class="admin-stat">
          <strong>${(certs || []).length}</strong>
          <span>Certificates Issued</span>
        </div>
        <div class="admin-stat">
          <strong>${(users || []).length}</strong>
          <span>Registered Students</span>
        </div>
      </div>

      <!-- Real Database Metrics Grid -->
      <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:18px;margin-bottom:24px;">
        
        <!-- Card 1: Real Revenue & Plan Distribution -->
        <div style="background:#ffffff;border:1px solid var(--line);border-radius:18px;padding:24px;box-shadow:var(--shadow);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h4 style="margin:0;font:800 16px Manrope;color:var(--ink);">Real Plan Breakdown &amp; Revenue</h4>
            <span class="admin-badge admin-badge-blue" style="font-size:11px;">Live Database</span>
          </div>

          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;">
            <div style="background:#f8fafc;padding:12px;border-radius:12px;border:1px solid #e2e8f0;text-align:center;">
              <span style="font-size:11px;font-weight:700;color:var(--muted);display:block;">Project Based Internship</span>
              <strong style="font:800 20px Manrope;color:#0d6e6e;display:block;margin:4px 0 2px;">${projectCount}</strong>
              <span style="font-size:11px;color:var(--muted);">${paidPlanCounts.project} paid orders</span>
            </div>
            <div style="background:#f8fafc;padding:12px;border-radius:12px;border:1px solid #e2e8f0;text-align:center;">
              <span style="font-size:11px;font-weight:700;color:var(--muted);display:block;">Certificate Program</span>
              <strong style="font:800 20px Manrope;color:#0b1f36;display:block;margin:4px 0 2px;">${certCount}</strong>
              <span style="font-size:11px;color:var(--muted);">${paidPlanCounts.certificate} paid orders</span>
            </div>
            <div style="background:#f8fafc;padding:12px;border-radius:12px;border:1px solid #e2e8f0;text-align:center;">
              <span style="font-size:11px;font-weight:700;color:var(--muted);display:block;">Comprehensive Program</span>
              <strong style="font:800 20px Manrope;color:#c79a4a;display:block;margin:4px 0 2px;">${compCount}</strong>
              <span style="font-size:11px;color:var(--muted);">${paidPlanCounts.comprehensive} paid orders</span>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
                <span style="color:var(--ink2);font-weight:600;">Project Based Track</span>
                <strong>${projectCount} / ${totalOrders || 1} (${totalOrders ? Math.round(projectCount / totalOrders * 100) : 0}%)</strong>
              </div>
              <div style="height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
                <div style="width:${totalOrders ? (projectCount / totalOrders * 100) : 0}%;height:100%;background:#0d6e6e;border-radius:999px;"></div>
              </div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
                <span style="color:var(--ink2);font-weight:600;">Certificate Only Track</span>
                <strong>${certCount} / ${totalOrders || 1} (${totalOrders ? Math.round(certCount / totalOrders * 100) : 0}%)</strong>
              </div>
              <div style="height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
                <div style="width:${totalOrders ? (certCount / totalOrders * 100) : 0}%;height:100%;background:#0b1f36;border-radius:999px;"></div>
              </div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
                <span style="color:var(--ink2);font-weight:600;">Comprehensive Career Track</span>
                <strong>${compCount} / ${totalOrders || 1} (${totalOrders ? Math.round(compCount / totalOrders * 100) : 0}%)</strong>
              </div>
              <div style="height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
                <div style="width:${totalOrders ? (compCount / totalOrders * 100) : 0}%;height:100%;background:#c79a4a;border-radius:999px;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 2: Workflow Pipeline & Pending Actions -->
        <div style="background:#ffffff;border:1px solid var(--line);border-radius:18px;padding:24px;box-shadow:var(--shadow);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h4 style="margin:0;font:800 16px Manrope;color:var(--ink);">Evaluation &amp; Issuance Pipeline</h4>
            <span class="admin-badge admin-badge-green" style="font-size:11px;">Active</span>
          </div>

          <div style="display:grid;gap:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
              <div>
                <strong style="display:block;font-size:13px;color:var(--ink);">Deliverables Pending Review</strong>
                <span style="font-size:11px;color:var(--muted);">Submissions awaiting approval</span>
              </div>
              <span class="admin-badge ${pendingSubmissions.length > 0 ? 'admin-badge-yellow' : 'admin-badge-blue'}" style="font-size:13px;font-weight:800;padding:4px 10px;">
                ${pendingSubmissions.length}
              </span>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
              <div>
                <strong style="display:block;font-size:13px;color:var(--ink);">Approved &amp; Certified</strong>
                <span style="font-size:11px;color:var(--muted);">Completed student deliverables</span>
              </div>
              <span class="admin-badge admin-badge-green" style="font-size:13px;font-weight:800;padding:4px 10px;">
                ${approvedSubmissions.length}
              </span>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
              <div>
                <strong style="display:block;font-size:13px;color:var(--ink);">Open Student Queries</strong>
                <span style="font-size:11px;color:var(--muted);">Inquiries awaiting reply</span>
              </div>
              <span class="admin-badge ${inquiries.length > 0 ? 'admin-badge-yellow' : 'admin-badge-blue'}" style="font-size:13px;font-weight:800;padding:4px 10px;">
                ${inquiries.length}
              </span>
            </div>
          </div>

          <div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end;">
            <button type="button" class="admin-btn" onclick="switchAdminView('certificates')">
              Issue Certificate &rarr;
            </button>
            <button type="button" class="admin-btn admin-btn-primary" onclick="switchAdminView('submissions')">
              Review Submissions (${pendingSubmissions.length}) &rarr;
            </button>
          </div>
        </div>

      </div>

      <!-- Neon PostgreSQL Storage Widget -->
      <div style="background:#f8fafc;border:1px solid var(--line);border-radius:16px;padding:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px;">
          <div>
            <h3 style="margin:0 0 3px;font:800 17px Manrope;">Neon PostgreSQL Database Status</h3>
            <span style="font-size:13px;color:var(--muted);">Total Cloud Storage Used: <strong>${esc(stats.totalSize)}</strong> &middot; Host: <code>ap-southeast-1.aws.neon.tech</code></span>
          </div>
          <button id="btnCleanDb" class="admin-btn admin-btn-danger">Clean Test Records</button>
        </div>

        <table class="admin-table">
          <thead>
            <tr>
              <th>Table Name</th>
              <th>Live Tuples</th>
              <th>Disk Size</th>
            </tr>
          </thead>
          <tbody>
            ${(stats.tables || []).map(t => `
              <tr>
                <td><code>${esc(t.name)}</code></td>
                <td>${esc(t.rows)}</td>
                <td>${esc(t.size)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- PROGRAM PRICING -->
    <div class="admin-view" id="view-pricing">
      <h3 style="font:800 20px Manrope;margin:0 0 8px;">Program Pricing</h3>
      <p style="color:var(--muted);font-size:14px;margin:0 0 18px;">Set the current INR price for each program. New orders use the saved price; existing orders keep their original amount.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;">
        ${programPrices.map(price => `
          <form onsubmit="saveProgramPrice(event, this)" data-plan-id="${esc(price.planId)}" style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px;box-shadow:var(--shadow);">
            <h4 style="margin:0 0 4px;font:800 16px Manrope;color:var(--ink);">${esc(price.name)}</h4>
            <code style="font-size:12px;color:var(--muted);">${esc(price.planId)}</code>
            <label style="display:block;margin-top:16px;font-size:13px;font-weight:700;" for="price-${esc(price.planId)}">Current INR price</label>
            <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
              <span style="font-weight:800;">₹</span>
              <input id="price-${esc(price.planId)}" name="amount" type="number" min="0.01" max="1000000" step="0.01" required value="${esc(String(price.amount))}" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:9px;font:inherit;">
            </div>
            <button type="submit" class="admin-btn admin-btn-primary" style="margin-top:12px;">Save Price</button>
            <span class="price-save-status" role="status" style="display:block;min-height:18px;margin-top:8px;font-size:12px;color:var(--muted);"></span>
          </form>
        `).join('')}
      </div>
      <p style="margin-top:16px;color:var(--muted);font-size:12px;">Prices are INR. Use up to two decimal places; maximum ₹1,000,000.</p>
    </div>

    <!-- VIEW 2: Orders & Sales -->
    <div class="admin-view" id="view-orders">
      <h3 style="font:800 20px Manrope;margin:0 0 16px;">Orders &amp; Enrollments (${totalOrders})</h3>
      ${(!orders || orders.length === 0) ? '<p style="color:var(--muted);font-size:14px;">No enrollments recorded yet.</p>' : `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Student Name &amp; Email</th>
            <th>Domain</th>
            <th>Plan</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td><code>${esc(o.id)}</code></td>
              <td>
                <strong>${esc(o.name)}</strong>
                <span style="display:block;font-size:11px;color:var(--muted);">${esc(o.email)}</span>
              </td>
              <td>${esc(o.domain)}</td>
              <td><span class="admin-badge admin-badge-blue">${esc(o.plan)}</span></td>
              <td><strong>${formatPrice(o.amount, o.currency || 'INR')}</strong></td>
              <td><span class="admin-badge admin-badge-green">${esc(o.status)}</span></td>
              <td>${formatDate(new Date(o.created_at || o.createdAt))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      `}
    </div>

    <!-- VIEW 3: Registered Students -->
    <div class="admin-view" id="view-students">
      <h3 style="font:800 20px Manrope;margin:0 0 16px;">Registered Students (${(users || []).length})</h3>
      <table class="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          ${(users || []).map(u => `
            <tr>
              <td><strong>${esc(u.name)}</strong></td>
              <td>${esc(u.email)}</td>
              <td>${esc(u.phone || '—')}</td>
              <td>
                <span class="admin-badge ${u.role === 'admin' ? 'admin-badge-yellow' : 'admin-badge-blue'}">
                  ${esc(u.role)}
                </span>
              </td>
              <td>${formatDate(new Date(u.created_at))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- VIEW 4: Submissions & Evaluation (with Filter Buttons & Real-Time Search) -->
    <div class="admin-view" id="view-submissions">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
        <div>
          <h3 style="font:800 20px Manrope;margin:0 0 4px;">Student Deliverables for Evaluation (${(submissions || []).length})</h3>
          <p style="color:var(--muted);font-size:13px;margin:0;">Review project repositories and LinkedIn posts, evaluate milestones, and approve to issue certificates.</p>
        </div>
      </div>

      <!-- Filter Controls & Real-Time Search -->
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:18px;background:#f8fafc;padding:14px 18px;border-radius:14px;border:1px solid var(--line);">
        <div style="display:flex;gap:8px;flex-wrap:wrap;" id="subFilterBtnGroup">
          <button type="button" class="admin-btn admin-btn-primary sub-filter-btn active" data-filter="all">All (${(submissions || []).length})</button>
          <button type="button" class="admin-btn sub-filter-btn" data-filter="pending">Pending Review (${pendingSubmissions.length})</button>
          <button type="button" class="admin-btn sub-filter-btn" data-filter="approved">Approved &amp; Certified (${approvedSubmissions.length})</button>
          <button type="button" class="admin-btn sub-filter-btn" data-filter="rejected">Rejected (${rejectedSubmissions.length})</button>
        </div>
        <div style="min-width:260px;">
          <input type="text" id="subFilterSearch" placeholder="🔍 Search student, email, repo…" style="width:100%;padding:8px 12px;border:1px solid var(--line);border-radius:8px;font:inherit;font-size:13px;background:white;" />
        </div>
      </div>

      ${(!submissions || submissions.length === 0) ? '<p style="color:var(--muted);font-size:14px;padding:20px 0;">No student submissions waiting for review.</p>' : `
      <table class="admin-table" id="submissionsTable">
        <thead>
          <tr>
            <th>Student</th>
            <th>Project Title / Deliverable</th>
            <th>GitHub Repository</th>
            <th>LinkedIn Post</th>
            <th>Notes</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${submissions.map(s => {
            const statusLower = (s.status || 'pending').toLowerCase();
            return `
            <tr class="sub-row" data-status="${esc(statusLower)}" data-search="${esc(((s.name||'') + ' ' + (s.email||'') + ' ' + (s.project_title||s.projectTitle||'') + ' ' + (s.github||'')).toLowerCase())}">
              <td>
                <strong>${esc(s.name || s.email)}</strong>
                <span style="display:block;font-size:11px;color:var(--muted);">${esc(s.email)}</span>
              </td>
              <td>
                <strong>${esc(s.project_title || s.projectTitle || 'Capstone Milestone')}</strong>
              </td>
              <td><a href="${esc(s.github)}" target="_blank" class="text-link">View Repo &#8599;</a></td>
              <td><a href="${esc(s.linkedin)}" target="_blank" class="text-link">View Post &#8599;</a></td>
              <td style="max-width:180px;font-size:12px;color:var(--muted);">${esc(s.notes || '—')}</td>
              <td>
                <span class="admin-badge ${statusLower === 'approved' ? 'admin-badge-green' : statusLower === 'rejected' ? 'admin-badge-red' : 'admin-badge-yellow'}">
                  ${esc(statusLower)}
                </span>
              </td>
              <td>
                <div class="admin-actions">
                  ${statusLower === 'approved' ? `
                    <span class="admin-badge admin-badge-green" style="padding:5px 10px;">✓ Certificate Issued</span>
                  ` : `
                    <button class="admin-btn admin-btn-primary btn-evaluate" data-id="${s.id}" data-action="approved">Approve &amp; Issue Cert</button>
                    <button class="admin-btn btn-evaluate" data-id="${s.id}" data-action="rejected">Reject</button>
                  `}
                </div>
              </td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      <div id="subFilterEmptyNotice" style="display:none;text-align:center;padding:30px;color:var(--muted);font-size:14px;">
        No submissions match the current filter or search criteria.
      </div>
      `}
    </div>

    <!-- VIEW 5: Certificate Management & Issuance (NEW TAB) -->
    <div class="admin-view" id="view-certificates">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
        <div>
          <h3 style="font:800 22px Manrope;margin:0 0 4px;">Certificate Management &amp; Issuance</h3>
          <p style="color:var(--muted);font-size:13px;margin:0;">Issue verified GreyRocks credentials manually, search registered students, preview certificates, and dispatch emails.</p>
        </div>
      </div>

      <!-- Quick Stats Strip -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:14px 18px;border-radius:12px;">
          <span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;">Total Issued</span>
          <strong style="display:block;font:800 22px Manrope;color:#0d6e6e;margin-top:2px;" id="statCertIssuedCount">${(certs || []).length}</strong>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:14px 18px;border-radius:12px;">
          <span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;">Enrolled Students</span>
          <strong style="display:block;font:800 22px Manrope;color:#0b1f36;margin-top:2px;">${(users || []).length}</strong>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:14px 18px;border-radius:12px;">
          <span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;">Pending Review</span>
          <strong style="display:block;font:800 22px Manrope;color:#d97706;margin-top:2px;">${pendingSubmissions.length}</strong>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:14px 18px;border-radius:12px;">
          <span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;">Issuing Partner</span>
          <strong style="display:block;font:800 15px Manrope;color:var(--ink);margin-top:4px;">GreyRocks Digital</strong>
        </div>
      </div>

      <!-- Section A: Manual Certificate Generator Form -->
      <div style="background:#ffffff;border:1.5px solid var(--line);border-radius:18px;padding:26px 30px;box-shadow:var(--shadow);margin-bottom:28px;" id="manualCertCard">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;border-bottom:1px solid #f1f5f9;padding-bottom:14px;">
          <div style="width:38px;height:38px;border-radius:10px;background:#e6f5f5;display:grid;place-items:center;color:#0d6e6e;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
          </div>
          <div>
            <h4 style="margin:0;font:800 17px Manrope;color:var(--ink);">Manual Certificate Generator</h4>
            <span style="font-size:12px;color:var(--muted);">Generate a high-resolution JPG &amp; PDF certificate with live QR verification. Auto-fills from student search below or manual entry.</span>
          </div>
        </div>

        <form id="adminManualCertForm" style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;">
          <div>
            <label style="font-size:12px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:6px;">Candidate Full Name *</label>
            <input type="text" name="name" id="certInputName" required placeholder="e.g. Priyanshu Singh" style="width:100%;padding:11px 14px;border:1px solid var(--line);border-radius:10px;font:inherit;" />
          </div>
          <div>
            <label style="font-size:12px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:6px;">Candidate Email Address *</label>
            <input type="email" name="email" id="certInputEmail" required placeholder="e.g. priyanshu@example.com" style="width:100%;padding:11px 14px;border:1px solid var(--line);border-radius:10px;font:inherit;" />
          </div>
          <div>
            <label style="font-size:12px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:6px;">Internship Domain *</label>
            <select name="domain" id="certInputDomain" style="width:100%;padding:11px 14px;border:1px solid var(--line);border-radius:10px;font:inherit;background:white;">
              ${domains.map(d => `<option value="${esc(d[0])}">${esc(d[0])}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:12px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:6px;">Tenure &amp; Duration *</label>
            <select name="duration" id="certInputDuration" style="width:100%;padding:11px 14px;border:1px solid var(--line);border-radius:10px;font:inherit;background:white;">
              <option value="4 Weeks">4 Weeks</option>
              <option value="2 Weeks">2 Weeks</option>
              <option value="1 Month">1 Month</option>
              <option value="8 Weeks">8 Weeks</option>
              <option value="3 Months">3 Months</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:6px;">Issue Date</label>
            <input type="text" name="issueDate" id="certInputDate" value="${formatDate()}" style="width:100%;padding:11px 14px;border:1px solid var(--line);border-radius:10px;font:inherit;" />
          </div>
          <div>
            <label style="font-size:12px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:6px;">Credential ID (Optional &middot; Leave empty to auto-generate)</label>
            <input type="text" name="credentialId" id="certInputCredId" placeholder="e.g. GR-DS-2026-XXXXXX" style="width:100%;padding:11px 14px;border:1px solid var(--line);border-radius:10px;font:inherit;font-family:monospace;" />
          </div>
          <div style="grid-column:span 2;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-top:6px;padding-top:14px;border-top:1px solid #f1f5f9;">
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink);cursor:pointer;">
              <input type="checkbox" name="sendEmail" id="certInputSendEmail" checked style="width:16px;height:16px;" />
              <strong>Automatically dispatch official certificate email to student</strong>
            </label>
            <button type="submit" class="btn btn-dark" id="btnSubmitGenerateCert" style="padding:12px 26px;font-size:14px;font-weight:700;display:inline-flex;align-items:center;gap:8px;cursor:pointer;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
              Generate &amp; Issue Certificate
            </button>
          </div>
        </form>

        <div id="certGenSuccessAlert" style="display:none;margin-top:18px;padding:16px 20px;background:#f0fdfa;border:1.5px solid #0d6e6e;border-radius:12px;"></div>
      </div>

      <!-- Section B: Search & Select from Enrolled Students -->
      <div style="background:#ffffff;border:1px solid var(--line);border-radius:18px;padding:24px 28px;box-shadow:var(--shadow);margin-bottom:28px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
          <div>
            <h4 style="margin:0;font:800 16px Manrope;color:var(--ink);">Search Enrolled Students &amp; Quick-Fill</h4>
            <span style="font-size:12px;color:var(--muted);">Click "Select &amp; Auto-fill" to instantly populate the certificate generator with student info.</span>
          </div>
          <div style="min-width:240px;">
            <input type="text" id="quickStudentSearch" placeholder="🔍 Filter student list…" style="width:100%;padding:8px 12px;border:1px solid var(--line);border-radius:8px;font:inherit;font-size:13px;" />
          </div>
        </div>

        <div style="max-height:220px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:10px;">
          <table class="admin-table" id="quickStudentTable">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Email Address</th>
                <th>Enrolled Domain</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${(users || []).map(u => {
                const userOrder = (orders || []).find(o => o.email.toLowerCase() === u.email.toLowerCase());
                const userDomain = userOrder ? userOrder.domain : 'Data Science';
                return `
                <tr class="quick-student-row" data-search="${esc((u.name + ' ' + u.email + ' ' + userDomain).toLowerCase())}">
                  <td><strong>${esc(u.name)}</strong></td>
                  <td>${esc(u.email)}</td>
                  <td><span class="admin-badge admin-badge-blue">${esc(userDomain)}</span></td>
                  <td>
                    <button type="button" class="admin-btn admin-btn-primary btn-auto-fill" data-name="${esc(u.name)}" data-email="${esc(u.email)}" data-domain="${esc(userDomain)}">
                      Select &amp; Auto-fill &uarr;
                    </button>
                  </td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section C: Directory of Issued Certificates -->
      <div style="background:#ffffff;border:1px solid var(--line);border-radius:18px;padding:24px 28px;box-shadow:var(--shadow);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
          <div>
            <h4 style="margin:0;font:800 18px Manrope;color:var(--ink);">Directory of Issued Certificates (${(certs || []).length})</h4>
            <span style="font-size:12px;color:var(--muted);">All generated certificates with PDF/JPG downloads, verification links, and email dispatch controls.</span>
          </div>
          <div style="min-width:240px;">
            <input type="text" id="certDirectorySearch" placeholder="🔍 Search by ID, name, email…" style="width:100%;padding:8px 12px;border:1px solid var(--line);border-radius:8px;font:inherit;font-size:13px;" />
          </div>
        </div>

        ${(!certs || certs.length === 0) ? '<p style="color:var(--muted);font-size:14px;padding:20px 0;">No certificates issued yet. Use the form above to generate your first credential.</p>' : `
        <table class="admin-table" id="issuedCertsTable">
          <thead>
            <tr>
              <th>Credential ID</th>
              <th>Student Name &amp; Email</th>
              <th>Domain &amp; Duration</th>
              <th>Issue Date</th>
              <th>Email Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${certs.map(c => {
              const cId = c.credentialId || c.credential_id;
              const pdfUrl = c.pdf || `/downloads/${cId}.pdf`;
              const jpgUrl = c.jpg || `/downloads/${cId}.jpg`;
              const emailStatus = c.emailStatus || 'not_sent';
              const emailStatusLabel = emailStatus === 'sent' ? 'Sent' : emailStatus === 'limit_reached' ? 'Daily Limit Reached' : emailStatus === 'failed' ? 'Failed' : 'Not Sent';
              return `
              <tr class="cert-row" data-search="${esc((cId + ' ' + (c.name||'') + ' ' + (c.email||'') + ' ' + (c.domain||'')).toLowerCase())}">
                <td>
                  <strong style="font-family:monospace;color:#0d6e6e;font-size:13px;">${esc(cId)}</strong>
                  <a href="https://greyrocks.in/verification/${encodeURIComponent(cId)}" target="_blank" style="display:block;font-size:11px;color:var(--muted);text-decoration:none;">Verify &#8599;</a>
                </td>
                <td>
                  <strong>${esc(c.name)}</strong>
                  <span style="display:block;font-size:11px;color:var(--muted);">${esc(c.email)}</span>
                </td>
                <td>
                  ${esc(c.domain)}
                  <span style="display:block;font-size:11px;color:var(--muted);">${esc(c.duration)}</span>
                </td>
                <td>${esc(c.issueDate || '—')}</td>
                <td><span class="admin-badge ${emailStatus === 'sent' ? 'admin-badge-green' : emailStatus === 'limit_reached' ? 'admin-badge-yellow' : 'admin-badge-blue'}">${emailStatusLabel}</span>${c.emailSentAt ? `<span style="display:block;font-size:11px;color:var(--muted);">${esc(formatDate(new Date(c.emailSentAt)))}</span>` : ''}${c.emailError ? `<span title="${esc(c.emailError)}" style="display:block;font-size:11px;color:var(--muted);max-width:150px;">${esc(c.emailError)}</span>` : ''}</td>
                <td>
                  <div class="admin-actions">
                    <button type="button" class="admin-btn btn-view-cert" data-id="${esc(cId)}" data-jpg="${esc(jpgUrl)}" data-pdf="${esc(pdfUrl)}" data-name="${esc(c.name)}" data-domain="${esc(c.domain)}" data-date="${esc(c.issueDate||'')}">
                      👁 View
                    </button>
                    <a href="${esc(pdfUrl)}" download="Internship_Certificate_${esc(cId)}.pdf" target="_blank" class="admin-btn" style="text-decoration:none;">
                      ⬇ PDF
                    </a>
                    <a href="${esc(jpgUrl)}" download="Internship_Certificate_${esc(cId)}.jpg" target="_blank" class="admin-btn" style="text-decoration:none;">
                      ⬇ JPG
                    </a>
                    <button type="button" class="admin-btn admin-btn-primary btn-send-cert-mail" onclick="sendCertificateEmailAdmin('${esc(cId)}',this)">
                      ${emailStatus === 'sent' ? 'Resend Certificate Email' : 'Send Certificate Email'}
                    </button>
                  </div>
                </td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        <div id="certDirectoryEmptyNotice" style="display:none;text-align:center;padding:30px;color:var(--muted);font-size:14px;">
          No certificates match the search query.
        </div>
        `}
      </div>
    </div>

    <!-- VIEW 6: Manual offer-letter email sending -->
    <div class="admin-view" id="view-offer-letters">
      <div style="margin-bottom:18px;">
        <h3 style="font:800 22px Manrope;margin:0 0 4px;">Offer Letter Emails</h3>
        <p style="color:var(--muted);font-size:13px;margin:0;">Send or resend an email linking a student to their existing offer letter in the dashboard. This action does not create or change offer letters.</p>
      </div>
      ${(() => {
        const paidOrders = (orders || []).filter(order => order.status === 'paid');
        if (!paidOrders.length) return '<p style="color:var(--muted);padding:20px 0;">No paid enrollments with available offer letters.</p>';
        return `<table class="admin-table"><thead><tr><th>Student</th><th>Email</th><th>Program / Domain</th><th>Availability</th><th>Email Status</th><th>Action</th></tr></thead><tbody>${paidOrders.map(order => {
          const status = order.offerEmailStatus || 'not_sent';
          const label = status === 'sent' ? 'Sent' : status === 'failed' ? 'Failed' : status === 'limit_reached' ? 'Daily Limit Reached' : 'Not Sent';
          const availableDate = order.created_at || order.createdAt;
          return `<tr><td><strong>${esc(order.name || 'Student')}</strong></td><td>${esc(order.email)}</td><td>${esc(order.domain)}</td><td>Available${availableDate ? `<span style="display:block;font-size:11px;color:var(--muted);">Enrollment ${esc(formatDate(new Date(availableDate)))}</span>` : ''}</td><td><span class="admin-badge ${status === 'sent' ? 'admin-badge-green' : status === 'limit_reached' ? 'admin-badge-yellow' : 'admin-badge-blue'}">${label}</span>${order.offerEmailSentAt ? `<span style="display:block;font-size:11px;color:var(--muted);">${esc(formatDate(new Date(order.offerEmailSentAt)))}</span>` : ''}${order.offerEmailError ? `<span title="${esc(order.offerEmailError)}" style="display:block;font-size:11px;color:var(--muted);">${esc(order.offerEmailError)}</span>` : ''}</td><td><button type="button" class="admin-btn admin-btn-primary" data-order-id="${esc(order.id)}" onclick="sendOfferLetterEmailAdmin(this.dataset.orderId,this)">${status === 'sent' ? 'Resend Offer Letter' : 'Send Offer Letter'}</button></td></tr>`;
        }).join('')}</tbody></table>`;
      })()}
    </div>

    <!-- VIEW 7: Student Queries & Inquiries -->
    <div class="admin-view" id="view-inquiries">
      <h3 style="font:800 20px Manrope;margin:0 0 16px;">Student Support Tickets &amp; Inquiries (${(inquiries || []).length})</h3>
      ${(!inquiries || inquiries.length === 0) ? '<p style="color:var(--muted);font-size:14px;">No inquiries submitted yet. When users submit the Contact form, their tickets appear here.</p>' : `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Name &amp; Email</th>
            <th>Subject</th>
            <th>Message</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${inquiries.map(inq => `
            <tr>
              <td>${formatDate(new Date(inq.created_at))}</td>
              <td>
                <strong>${esc(inq.name)}</strong>
                <span style="display:block;font-size:11px;color:var(--muted);">${esc(inq.email)}</span>
              </td>
              <td><strong>${esc(inq.subject)}</strong></td>
              <td style="max-width:320px;font-size:13px;color:var(--ink2);">${esc(inq.message)}</td>
              <td><span class="admin-badge admin-badge-blue">${esc(inq.status)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      `}
    </div>

    <!-- VIEW 7: Assign Tasks -->
    <div class="admin-view" id="view-assign">
      <h3 style="font:800 20px Manrope;margin:0 0 16px;">Assign Custom Milestone to Student</h3>
      <form class="admin-form" id="assignTaskForm">
        <label>Student Email Address
          <input required type="email" name="email" placeholder="student@example.com">
        </label>
        <label>Milestone Title
          <input required name="title" placeholder="e.g. Build Machine Learning Model Pipeline">
        </label>
        <label>Requirements &amp; Deliverables
          <textarea name="description" placeholder="Specify project requirements, data sources, and test criteria…"></textarea>
        </label>
        <label>Target Deadline
          <input name="dueDate" placeholder="e.g. 7 Days / End of Week">
        </label>
        <button class="btn btn-dark" type="submit">Assign Milestone</button>
      </form>
    </div>

    <!-- VIEW 9: Course & Domain Project Resources (GitHub, Report, PPT Links) -->
    <div class="admin-view" id="view-resources">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
        <div>
          <h3 style="font:800 22px Manrope;margin:0 0 4px;color:var(--ink);">Course &amp; Domain Project Resources</h3>
          <p style="margin:0;font-size:13px;color:var(--muted);">Configure GitHub source code repositories, project report templates (.docx), and presentation decks (.pptx) for each course. Students unlock these materials according to their plan.</p>
        </div>
      </div>

      <!-- Resource Configuration Form -->
      <div style="background:white;border:1.5px solid var(--line);border-radius:18px;padding:24px 28px;box-shadow:var(--shadow);margin-bottom:28px;">
        <h4 style="font:800 16px Manrope;margin:0 0 16px;color:var(--ink);" id="resFormTitle">Set Course Resource Links</h4>
        <form class="admin-form" id="domainResourcesForm" style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;max-width:100%;">
          <div style="grid-column:span 2;">
            <label style="font-size:12px;font-weight:800;display:block;margin-bottom:6px;">Select Course / Domain *
              <select name="domain" id="resDomainSelect" required style="width:100%;padding:11px 14px;border:1px solid rgba(11,31,54,.15);border-radius:10px;background:white;font:inherit;color:var(--ink);" onchange="onResDomainChange(this.value)">
                <option value="">-- Choose Course Domain --</option>
                ${domains.map(d => `<option value="${esc(d[0])}">${esc(d[0])}</option>`).join('')}
              </select>
            </label>
          </div>
          <div>
            <label style="font-size:12px;font-weight:800;display:block;margin-bottom:6px;">GitHub Source Code Repository URL *
              <input type="url" name="github_url" id="resGithubInput" placeholder="https://github.com/hireebridge/course-project" style="width:100%;padding:11px 14px;border:1px solid rgba(11,31,54,.15);border-radius:10px;background:white;font:inherit;color:var(--ink);">
              <span style="font-size:11px;color:var(--muted);margin-top:3px;display:block;">Accessible to Project Based and Comprehensive students</span>
            </label>
          </div>
          <div>
            <label style="font-size:12px;font-weight:800;display:block;margin-bottom:6px;">Project Report Download URL (.docx / Google Drive / PDF)
              <input type="url" name="report_url" id="resReportInput" placeholder="https://drive.google.com/... or download URL" style="width:100%;padding:11px 14px;border:1px solid rgba(11,31,54,.15);border-radius:10px;background:white;font:inherit;color:var(--ink);">
              <span style="font-size:11px;color:var(--muted);margin-top:3px;display:block;">Exclusive to Comprehensive Program students</span>
            </label>
          </div>
          <div style="grid-column:span 2;">
            <label style="font-size:12px;font-weight:800;display:block;margin-bottom:6px;">Seminar Presentation Deck URL (.pptx / Google Slides)
              <input type="url" name="ppt_url" id="resPptInput" placeholder="https://drive.google.com/... or download URL" style="width:100%;padding:11px 14px;border:1px solid rgba(11,31,54,.15);border-radius:10px;background:white;font:inherit;color:var(--ink);">
              <span style="font-size:11px;color:var(--muted);margin-top:3px;display:block;">Exclusive to Comprehensive Program students</span>
            </label>
          </div>
          <div style="grid-column:span 2;display:flex;align-items:center;gap:14px;margin-top:8px;">
            <button class="btn btn-dark" type="submit" id="btnSaveResources" style="padding:11px 24px;cursor:pointer;">Save Course Resources</button>
            <div id="resFormMessage" style="display:none;font-size:13px;font-weight:700;"></div>
          </div>
        </form>
      </div>

      <!-- Configured Courses Table -->
      <div style="background:white;border:1.5px solid var(--line);border-radius:18px;padding:24px 28px;box-shadow:var(--shadow);">
        <h4 style="font:800 16px Manrope;margin:0 0 16px;color:var(--ink);">All Course Domain Materials (${domains.length} Courses)</h4>
        <div style="overflow-x:auto;">
          <table class="admin-table" id="coursesResourceTable">
            <thead>
              <tr>
                <th>Course / Domain</th>
                <th>GitHub Repo Link</th>
                <th>Project Report Link</th>
                <th>Presentation PPT Link</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${domains.map(d => {
                const domName = d[0];
                const res = resourcesByDomain[domName.toLowerCase()] || {};
                const gUrl = res.github_url || '';
                const rUrl = res.report_url || '';
                const pUrl = res.ppt_url || '';
                return `
                <tr id="resRow-${esc(d[1])}">
                  <td>
                    <strong style="color:var(--ink);">${esc(domName)}</strong>
                    <span style="display:block;font-size:11px;color:var(--muted);">${esc(d[1])}</span>
                  </td>
                  <td>
                    ${gUrl ? `<a href="${esc(gUrl)}" target="_blank" class="text-link" style="font-size:12px;display:inline-flex;align-items:center;gap:4px;">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                      Repo Link
                    </a>` : '<span style="color:var(--muted);font-size:12px;">Default Template</span>'}
                  </td>
                  <td>
                    ${rUrl ? `<a href="${esc(rUrl)}" target="_blank" class="text-link" style="font-size:12px;display:inline-flex;align-items:center;gap:4px;">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                      Report Link
                    </a>` : '<span style="color:var(--muted);font-size:12px;">Default Docx</span>'}
                  </td>
                  <td>
                    ${pUrl ? `<a href="${esc(pUrl)}" target="_blank" class="text-link" style="font-size:12px;display:inline-flex;align-items:center;gap:4px;">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                      PPT Link
                    </a>` : '<span style="color:var(--muted);font-size:12px;">Default Deck</span>'}
                  </td>
                  <td>
                    <button type="button" class="admin-btn admin-btn-primary" onclick="editCourseResources('${esc(domName)}', '${esc(gUrl)}', '${esc(rUrl)}', '${esc(pUrl)}')">
                      Edit Links
                    </button>
                  </td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- VIEW 8: Broadcast & Email -->
    <div class="admin-view" id="view-broadcast">
      <h3 style="font:800 20px Manrope;margin:0 0 16px;">Send Announcement / Email</h3>
      <form class="admin-form" id="sendNotifForm">
        <label>Recipient Email (Leave blank to Broadcast to ALL students)
          <input type="email" name="email" placeholder="student@example.com (or empty for Broadcast)">
        </label>
        <label>Subject / Notification Title
          <input required name="title" placeholder="e.g. Mid-term Project Review Guidelines">
        </label>
        <label>Message Content
          <textarea required name="message" placeholder="Write message to student…"></textarea>
        </label>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
          <input type="checkbox" name="sendEmail" value="true" style="width:auto;">
          Also dispatch via SMTP Email
        </label>
        <button class="btn btn-dark" type="submit">Dispatch Announcement</button>
      </form>
    </div>

    <!-- VIEW 9: Cloud Storage & Data Governance -->
    <div class="admin-view" id="view-storage-data">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
        <div>
          <h3 style="font:800 22px Manrope;margin:0 0 4px;">Cloud Storage &amp; Data Governance</h3>
          <p style="color:var(--muted);font-size:13px;margin:0;">Cloudflare R2 storage management, reconciliation audit, student lifecycle, and administrative audit trail.</p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button type="button" class="btn btn-dark" onclick="openCreateStudentModal()" style="font-size:13px;padding:9px 18px;display:inline-flex;align-items:center;gap:6px;">
            + Add New Student
          </button>
        </div>
      </div>

      <!-- SECTION 1: Cloudflare R2 Storage Dashboard -->
      <div style="background:#ffffff;border:1.5px solid var(--line);border-radius:18px;padding:24px 28px;box-shadow:var(--shadow);margin-bottom:28px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:38px;height:38px;border-radius:10px;background:#e0f2fe;display:grid;place-items:center;color:#0284c7;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
            </div>
            <div>
              <h4 style="margin:0;font:800 17px Manrope;color:var(--ink);">Cloudflare R2 Bucket Overview</h4>
              <span style="font-size:12px;color:var(--muted);">Authoritative usage accounting from Neon PostgreSQL registry. No R2 API calls on page load.</span>
            </div>
          </div>
          <div>
            <span class="admin-badge ${r2.isConfigured() ? 'admin-badge-green' : 'admin-badge-yellow'}" style="font-size:12px;padding:5px 12px;">
              ${r2.isConfigured() ? '● R2 Active &amp; Connected' : '○ R2 Not Configured'}
            </span>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:14px 18px;border-radius:12px;">
            <span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;">R2 Bucket</span>
            <strong style="display:block;font:800 15px Manrope;color:var(--ink);margin-top:4px;word-break:break-all;">${esc(process.env.R2_BUCKET_NAME || 'hireebridge-certificates')}</strong>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:14px 18px;border-radius:12px;">
            <span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;">Configured Limit</span>
            <strong style="display:block;font:800 20px Manrope;color:#0b1f36;margin-top:2px;">${Number(process.env.R2_STORAGE_LIMIT_GB) || 9} GB</strong>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:14px 18px;border-radius:12px;">
            <span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;">Tracked Storage</span>
            <strong style="display:block;font:800 20px Manrope;color:#0d6e6e;margin-top:2px;" id="trackedStorageStat">${(totalStorageBytes / (1024 * 1024)).toFixed(2)} MB</strong>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:14px 18px;border-radius:12px;">
            <span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;">Available Space</span>
            <strong style="display:block;font:800 20px Manrope;color:#16a34a;margin-top:2px;" id="availStorageStat">${Math.max(0, ((Number(process.env.R2_STORAGE_LIMIT_GB) || 9) - (totalStorageBytes / (1024 * 1024 * 1024)))).toFixed(2)} GB</strong>
          </div>
        </div>

        <!-- Storage Progress Meter -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px 20px;border-radius:12px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">
            <span style="font-weight:700;color:var(--ink);">Storage Safety Threshold Meter</span>
            <span id="storagePercentText" style="font-weight:800;color:#0d6e6e;">
              ${Math.min(100, Math.round((totalStorageBytes / ((Number(process.env.R2_STORAGE_LIMIT_GB) || 9) * 1024 * 1024 * 1024)) * 1000) / 10)}% Used
            </span>
          </div>
          <div style="height:10px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
            <div id="storageProgressBar" style="width:${Math.min(100, Math.round((totalStorageBytes / ((Number(process.env.R2_STORAGE_LIMIT_GB) || 9) * 1024 * 1024 * 1024)) * 1000) / 10)}%;height:100%;background:linear-gradient(90deg, #0d6e6e, #0284c7);border-radius:999px;transition:width 0.3s ease;"></div>
          </div>
        </div>

        <!-- Reconciliation Action -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;border-top:1px solid #f1f5f9;padding-top:16px;">
          <div>
            <strong style="font-size:13px;display:block;color:var(--ink);">Storage Health &amp; Bucket Reconciliation</strong>
            <span style="font-size:12px;color:var(--muted);">Compares Neon PostgreSQL certificate records with actual files in the R2 bucket. Safely detects missing files and untracked orphans without deleting anything.</span>
          </div>
          <button type="button" class="btn btn-dark" id="btnRunReconcile" onclick="reconcileR2Storage()" style="font-size:13px;padding:9px 18px;display:inline-flex;align-items:center;gap:6px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            Run R2 Reconciliation Scan
          </button>
        </div>

        <!-- Reconciliation Results Box -->
        <div id="reconcileResultsBox" style="display:none;margin-top:20px;padding:18px 20px;background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:14px;"></div>
      </div>

      <!-- SECTION 2: Student Account & Data Lifecycle -->
      <div style="background:#ffffff;border:1px solid var(--line);border-radius:18px;padding:24px 28px;box-shadow:var(--shadow);margin-bottom:28px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:12px;">
          <div>
            <h4 style="margin:0;font:800 18px Manrope;color:var(--ink);">Student Account &amp; Lifecycle Management</h4>
            <span style="font-size:12px;color:var(--muted);">Search students, view cascading dependencies, deactivate (soft delete), restore, or permanently remove test accounts.</span>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            <select id="studentFilterStatus" onchange="filterStudentsList()" style="padding:8px 12px;border:1px solid var(--line);border-radius:8px;font:inherit;font-size:13px;background:white;">
              <option value="active">Active Accounts Only</option>
              <option value="deleted">Deactivated / Soft-Deleted</option>
              <option value="all">All Accounts</option>
            </select>
            <input type="text" id="studentFilterSearch" oninput="filterStudentsList()" placeholder="🔍 Search name or email…" style="padding:8px 12px;border:1px solid var(--line);border-radius:8px;font:inherit;font-size:13px;min-width:220px;" />
          </div>
        </div>

        <div style="overflow-x:auto;">
          <table class="admin-table" id="adminStudentsTable">
            <thead>
              <tr>
                <th>Student</th>
                <th>Joined</th>
                <th>Orders</th>
                <th>Certificates</th>
                <th>Submissions</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="adminStudentsTableBody">
              ${(users || []).map(u => {
                const isDeactivated = !!u.deleted_at;
                const userOrders = (orders || []).filter(o => (o.email || '').toLowerCase() === (u.email || '').toLowerCase());
                const userCerts = (certs || []).filter(c => (c.email || '').toLowerCase() === (u.email || '').toLowerCase());
                const userSubs = (submissions || []).filter(s => (s.email || '').toLowerCase() === (u.email || '').toLowerCase());
                return `
                <tr class="student-row" data-id="${esc(u.id)}" data-name="${esc(u.name)}" data-email="${esc(u.email)}" data-deleted="${isDeactivated ? 'true' : 'false'}" data-search="${esc((u.name + ' ' + u.email).toLowerCase())}">
                  <td>
                    <strong>${esc(u.name)}</strong>
                    <span style="display:block;font-size:11px;color:var(--muted);">${esc(u.email)}</span>
                    ${u.phone ? `<span style="display:block;font-size:11px;color:var(--muted);">${esc(u.phone)}</span>` : ''}
                  </td>
                  <td>${formatDate(new Date(u.created_at))}</td>
                  <td><span class="admin-badge admin-badge-blue">${userOrders.length}</span></td>
                  <td><span class="admin-badge ${userCerts.length > 0 ? 'admin-badge-green' : 'admin-badge-blue'}">${userCerts.length}</span></td>
                  <td><span class="admin-badge admin-badge-blue">${userSubs.length}</span></td>
                  <td>
                    ${isDeactivated 
                      ? '<span class="admin-badge" style="background:#fee2e2;color:#991b1b;font-weight:800;">Deactivated</span>' 
                      : '<span class="admin-badge admin-badge-green" style="font-weight:800;">Active</span>'}
                  </td>
                  <td>
                    <div class="admin-actions" style="flex-wrap:wrap;gap:6px;">
                      <button type="button" class="admin-btn" onclick="showStudentDeps('${esc(u.id)}')">
                        Dependencies
                      </button>
                      ${isDeactivated 
                        ? `<button type="button" class="admin-btn admin-btn-primary" onclick="restoreStudentAccount('${esc(u.id)}')">Restore</button>` 
                        : `<button type="button" class="admin-btn" style="color:#d97706;" onclick="promptSoftDelete('${esc(u.id)}', '${esc(u.name)}')">Deactivate</button>`}
                      ${u.role !== 'admin' ? `
                      <button type="button" class="admin-btn" style="color:#dc2626;" onclick="promptHardDelete('${esc(u.id)}', '${esc(u.name)}')">
                        Hard Delete
                      </button>` : ''}
                    </div>
                  </td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- SECTION 3: Certificate Artifacts Control -->
      <div style="background:#ffffff;border:1px solid var(--line);border-radius:18px;padding:24px 28px;box-shadow:var(--shadow);margin-bottom:28px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
          <div>
            <h4 style="margin:0;font:800 18px Manrope;color:var(--ink);">Certificate Artifacts &amp; Storage Control</h4>
            <span style="font-size:12px;color:var(--muted);">Manage PDF/JPG files stored in R2. Purge files to save storage space while preserving registry verification, or regenerate on demand.</span>
          </div>
          <div style="min-width:240px;">
            <input type="text" id="storageCertFilterInput" oninput="filterStorageCertTable()" placeholder="🔍 Filter by ID, candidate, domain…" style="width:100%;padding:8px 12px;border:1px solid var(--line);border-radius:8px;font:inherit;font-size:13px;" />
          </div>
        </div>

        <div style="overflow-x:auto;">
          <table class="admin-table" id="storageCertsTable">
            <thead>
              <tr>
                <th>Credential ID</th>
                <th>Candidate &amp; Email</th>
                <th>Domain &amp; Date</th>
                <th>R2 Stored Footprint</th>
                <th>Storage Actions</th>
              </tr>
            </thead>
            <tbody>
              ${(certs || []).map(c => {
                const cId = c.credentialId || c.credential_id;
                const pdfBytes = Number(c.pdfSizeBytes || c.pdf_size_bytes || 0);
                const jpgBytes = Number(c.jpgSizeBytes || c.jpg_size_bytes || 0);
                const totalBytes = pdfBytes + jpgBytes;
                const hasArtifacts = totalBytes > 0 || !!(c.pdfKey || c.pdf_key);
                return `
                <tr class="storage-cert-row" data-search="${esc((cId + ' ' + (c.name||'') + ' ' + (c.email||'') + ' ' + (c.domain||'')).toLowerCase())}">
                  <td>
                    <strong style="font-family:monospace;color:#0d6e6e;">${esc(cId)}</strong>
                    <a href="https://greyrocks.in/verification/${encodeURIComponent(cId)}" target="_blank" style="display:block;font-size:11px;color:var(--muted);text-decoration:none;">Registry &#8599;</a>
                  </td>
                  <td>
                    <strong>${esc(c.name)}</strong>
                    <span style="display:block;font-size:11px;color:var(--muted);">${esc(c.email)}</span>
                  </td>
                  <td>
                    ${esc(c.domain)}
                    <span style="display:block;font-size:11px;color:var(--muted);">${esc(c.issueDate || '—')}</span>
                  </td>
                  <td>
                    ${hasArtifacts 
                      ? `<span class="admin-badge admin-badge-green">${(totalBytes / 1024).toFixed(1)} KB (PDF+JPG)</span>` 
                      : `<span class="admin-badge" style="background:#f1f5f9;color:#64748b;">Artifacts Purged (0 B)</span>`}
                  </td>
                  <td>
                    <div class="admin-actions" style="flex-wrap:wrap;gap:6px;">
                      <button type="button" class="admin-btn admin-btn-primary" onclick="regenerateCertArtifacts('${esc(cId)}')">
                        ⟳ Regenerate
                      </button>
                      ${hasArtifacts ? `
                      <button type="button" class="admin-btn" style="color:#d97706;" onclick="deleteCertArtifactsOnly('${esc(cId)}')">
                        Purge Artifacts
                      </button>` : ''}
                      <button type="button" class="admin-btn" style="color:#dc2626;" onclick="deleteFullCertRecord('${esc(cId)}')">
                        Delete Record
                      </button>
                    </div>
                  </td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- SECTION 4: Administrative Audit Trail -->
      <div style="background:#ffffff;border:1px solid var(--line);border-radius:18px;padding:24px 28px;box-shadow:var(--shadow);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
          <div>
            <h4 style="margin:0;font:800 18px Manrope;color:var(--ink);">Administrative Audit Trail</h4>
            <span style="font-size:12px;color:var(--muted);">Immutable log of sensitive administrative actions: soft deactivations, restorations, hard deletions, artifact removals, and regenerations.</span>
          </div>
          <div>
            <button type="button" class="admin-btn" onclick="refreshAuditTrail()" style="font-size:12px;">
              ↻ Refresh Audit Log
            </button>
          </div>
        </div>

        <div style="overflow-x:auto;">
          <table class="admin-table" id="auditTrailTable">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Target</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody id="auditTrailTableBody">
              ${(!recentAuditLogs || recentAuditLogs.length === 0) ? '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:20px;">No audit logs recorded yet.</td></tr>' : recentAuditLogs.map(l => `
                <tr>
                  <td style="white-space:nowrap;font-size:12px;">${formatDate(new Date(l.created_at))}</td>
                  <td style="font-size:12px;"><strong>${esc(l.admin_email || 'System')}</strong></td>
                  <td>
                    <span class="admin-badge ${l.action.includes('DELETED') ? 'admin-badge-yellow' : (l.action.includes('RESTOR') || l.action.includes('CREATED') ? 'admin-badge-green' : 'admin-badge-blue')}" style="font-size:11px;font-family:monospace;">
                      ${esc(l.action)}
                    </span>
                  </td>
                  <td style="font-size:12px;font-family:monospace;">${esc(l.target_type || '')}: ${esc(l.target_id || '')}</td>
                  <td>
                    <span class="admin-badge ${l.success ? 'admin-badge-green' : 'admin-badge-yellow'}" style="font-size:10px;">
                      ${l.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td style="font-size:11px;color:var(--muted);max-width:280px;word-break:break-all;">
                    ${esc(JSON.stringify(l.details || {}))}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</div>

<script>
  window.switchAdminView = function(viewId) {
    if (!viewId) return;
    var allNavBtns = document.querySelectorAll('[data-admin-view]');
    allNavBtns.forEach(function(b) {
      if (b.getAttribute('data-admin-view') === viewId) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    var allViews = document.querySelectorAll('.admin-view');
    allViews.forEach(function(view) {
      if (view.id === 'view-' + viewId) {
        view.classList.add('active');
        view.style.display = 'block';
      } else {
        view.classList.remove('active');
        view.style.display = 'none';
      }
    });

    if (window.innerWidth <= 900) {
      var target = document.querySelector('.admin-main');
      if (target) {
        var top = target.getBoundingClientRect().top;
        window.scrollTo({ top: window.pageYOffset + top - 76, behavior: 'smooth' });
      }
    }
  };

  window.sendCertificateEmailAdmin = async function(credentialId, button) {
    if (!credentialId || !button) return;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Sending…';
    try {
      const response = await fetch('/api/admin/certificates/send-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialId })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Certificate email request failed.');
      alert(data.message || 'Certificate email status updated.');
      window.location.reload();
    } catch (error) {
      alert(error.message || 'Certificate email could not be sent.');
      button.disabled = false;
      button.textContent = original;
    }
  };

  window.sendOfferLetterEmailAdmin = async function(orderId, button) {
    if (!orderId || !button) return;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Sending…';
    try {
      const response = await fetch('/api/admin/offer-letter-emails/' + encodeURIComponent(orderId) + '/send', { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Offer letter email request failed.');
      alert(data.message || 'Offer letter email status updated.');
      window.location.reload();
    } catch (error) {
      alert(error.message || 'Offer letter email could not be sent.');
      button.disabled = false;
      button.textContent = original;
    }
  };

  window.saveProgramPrice = async function(event, form) {
    event.preventDefault();
    const status = form.querySelector('.price-save-status');
    const button = form.querySelector('button[type="submit"]');
    const amount = Number(new FormData(form).get('amount'));
    status.textContent = 'Saving…';
    button.disabled = true;
    try {
      const response = await fetch('/api/admin/prices/' + encodeURIComponent(form.dataset.planId), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency: 'INR' })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Could not save this price.');
      form.elements.amount.value = result.price.amount;
      status.textContent = 'Saved at ₹' + result.price.amount;
      status.style.color = '#15803d';
    } catch (error) {
      status.textContent = error.message || 'Could not save this price.';
      status.style.color = '#b91c1c';
    } finally {
      button.disabled = false;
    }
  };

  const domainResourcesData = ${JSON.stringify(resourcesByDomain)};
  function onResDomainChange(domain) {
    if (!domain) return;
    const res = domainResourcesData[domain.toLowerCase()] || {};
    document.getElementById('resGithubInput').value = res.github_url || '';
    document.getElementById('resReportInput').value = res.report_url || '';
    document.getElementById('resPptInput').value = res.ppt_url || '';
  }

  function editCourseResources(domain, gUrl, rUrl, pUrl) {
    const sel = document.getElementById('resDomainSelect');
    if (sel) {
      sel.value = domain;
      document.getElementById('resGithubInput').value = gUrl;
      document.getElementById('resReportInput').value = rUrl;
      document.getElementById('resPptInput').value = pUrl;
      document.getElementById('domainResourcesForm').scrollIntoView({ behavior: 'smooth' });
      document.getElementById('resGithubInput').focus();
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    const domainResForm = document.getElementById('domainResourcesForm');
    if (domainResForm) {
      domainResForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const btn = document.getElementById('btnSaveResources');
        const msg = document.getElementById('resFormMessage');
        btn.disabled = true;
        btn.textContent = 'Saving Links…';
        msg.style.display = 'none';

        try {
          const payload = Object.fromEntries(new FormData(domainResForm).entries());
          const res = await fetch('/api/admin/domain-resources', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const j = await res.json();
          if (!res.ok || !j.ok) throw new Error(j.error || 'Failed to save resources');

          domainResourcesData[payload.domain.toLowerCase()] = payload;

          msg.style.display = 'block';
          msg.style.color = '#15803d';
          msg.textContent = '✓ ' + (j.message || 'Saved successfully!');
          setTimeout(function() { window.location.reload(); }, 900);
        } catch (err) {
          msg.style.display = 'block';
          msg.style.color = '#dc2626';
          msg.textContent = '✗ ' + err.message;
        } finally {
          btn.disabled = false;
          btn.textContent = 'Save Course Resources';
        }
      });
    }
  });

  // Storage & Data Management Scripts
  window.reconcileR2Storage = async function() {
    const btn = document.getElementById('btnRunReconcile');
    const box = document.getElementById('reconcileResultsBox');
    if (!btn || !box) return;
    btn.disabled = true;
    btn.innerHTML = '⟳ Scanning R2 Bucket…';
    box.style.display = 'block';
    box.innerHTML = '<p style="color:var(--muted);font-size:13px;margin:0;">Connecting to Cloudflare R2 bucket and comparing against PostgreSQL certificate table…</p>';

    try {
      const res = await fetch('/api/admin/storage/reconcile', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Reconciliation failed');

      let html = '<div style="margin-bottom:14px;"><h4 style="margin:0 0 4px;font:800 16px Manrope;color:var(--ink);">Reconciliation Audit Results</h4><span style="font-size:12px;color:var(--muted);">Scan timestamp: ' + new Date(data.scannedAt).toLocaleTimeString() + '</span></div>';

      html += '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:10px;margin-bottom:16px;">';
      html += '<div style="background:#ffffff;padding:10px;border-radius:10px;border:1px solid #e2e8f0;text-align:center;"><span style="font-size:11px;color:var(--muted);display:block;">R2 Objects</span><strong style="font-size:18px;color:var(--ink);">' + (data.stats.totalR2Objects || 0) + '</strong></div>';
      html += '<div style="background:#ffffff;padding:10px;border-radius:10px;border:1px solid #e2e8f0;text-align:center;"><span style="font-size:11px;color:var(--muted);display:block;">Healthy Certs</span><strong style="font-size:18px;color:#16a34a;">' + (data.stats.healthyCertificates || 0) + '</strong></div>';
      html += '<div style="background:#ffffff;padding:10px;border-radius:10px;border:1px solid #e2e8f0;text-align:center;"><span style="font-size:11px;color:var(--muted);display:block;">Missing PDF</span><strong style="font-size:18px;color:' + (data.stats.missingPdf > 0 ? '#dc2626' : 'var(--ink)') + ';">' + (data.stats.missingPdf || 0) + '</strong></div>';
      html += '<div style="background:#ffffff;padding:10px;border-radius:10px;border:1px solid #e2e8f0;text-align:center;"><span style="font-size:11px;color:var(--muted);display:block;">Missing JPG</span><strong style="font-size:18px;color:' + (data.stats.missingJpg > 0 ? '#dc2626' : 'var(--ink)') + ';">' + (data.stats.missingJpg || 0) + '</strong></div>';
      html += '<div style="background:#ffffff;padding:10px;border-radius:10px;border:1px solid #e2e8f0;text-align:center;"><span style="font-size:11px;color:var(--muted);display:block;">Size Mismatches</span><strong style="font-size:18px;color:' + (data.stats.sizeMismatch > 0 ? '#d97706' : 'var(--ink)') + ';">' + (data.stats.sizeMismatch || 0) + '</strong></div>';
      html += '<div style="background:#ffffff;padding:10px;border-radius:10px;border:1px solid #e2e8f0;text-align:center;"><span style="font-size:11px;color:var(--muted);display:block;">Orphan Objects</span><strong style="font-size:18px;color:' + (data.stats.orphanFilesCount > 0 ? '#dc2626' : '#16a34a') + ';">' + (data.stats.orphanFilesCount || 0) + '</strong></div>';
      html += '</div>';

      if (data.orphans && data.orphans.length > 0) {
        html += '<div style="background:#fff;padding:14px;border-radius:10px;border:1.5px solid #fca5a5;margin-bottom:12px;">';
        html += '<h5 style="margin:0 0 6px;color:#991b1b;font:800 14px Manrope;">&#9888; Orphan Objects Detected in Cloudflare R2 (' + data.orphans.length + ')</h5>';
        html += '<p style="font-size:12px;color:var(--muted);margin:0 0 10px;">These files exist in bucket <code>certificates/</code> prefix but have no corresponding certificate row in the database. No deletion occurred automatically. You may delete individual orphans safely below.</p>';
        html += '<table class="admin-table" style="font-size:12px;"><thead><tr><th>Key</th><th>Size</th><th>Last Modified</th><th>Action</th></tr></thead><tbody>';
        data.orphans.forEach(function(o) {
          html += '<tr><td><code style="color:#0d6e6e;">' + o.key + '</code></td><td>' + (o.size ? (o.size / 1024).toFixed(1) + ' KB' : '—') + '</td><td>' + (o.lastModified ? new Date(o.lastModified).toLocaleDateString() : '—') + '</td><td><button type="button" class="admin-btn" style="color:#dc2626;font-size:11px;" data-key="' + o.key + '" onclick="deleteOrphanFile(this.dataset.key)">Delete Orphan</button></td></tr>';
        });
        html += '</tbody></table></div>';
      } else {
        html += '<div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:10px 14px;border-radius:8px;font-size:12px;color:#166534;">✓ No orphan files found in R2. All bucket objects map cleanly to database certificates.</div>';
      }

      box.innerHTML = html;

      // Also refresh storage stats
      try {
        const ovRes = await fetch('/api/admin/storage/overview');
        const ovData = await ovRes.json();
        if (ovData.ok) {
          const trackedStat = document.getElementById('trackedStorageStat');
          const availStat = document.getElementById('availStorageStat');
          const pText = document.getElementById('storagePercentText');
          const pBar = document.getElementById('storageProgressBar');
          if (trackedStat) trackedStat.textContent = (ovData.usedBytes / (1024 * 1024)).toFixed(2) + ' MB';
          if (availStat) availStat.textContent = (ovData.remainingBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
          if (pText) pText.textContent = ovData.percentUsed + '% Used';
          if (pBar) pBar.style.width = ovData.percentUsed + '%';
        }
      } catch (e) {}

    } catch (err) {
      box.innerHTML = '<div style="color:#dc2626;font-size:13px;">✗ Scan failed: ' + err.message + '</div>';
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Run R2 Reconciliation Scan';
    }
  };

  window.deleteOrphanFile = async function(key) {
    if (!key) return;
    if (!confirm('Are you sure you want to delete orphan object "' + key + '" from Cloudflare R2?\\n\\nThis key has no database certificate record.')) return;
    try {
      const res = await fetch('/api/admin/storage/orphans/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to delete orphan');
      alert(data.message || 'Orphan object successfully deleted.');
      reconcileR2Storage();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  window.filterStudentsList = function() {
    const q = (document.getElementById('studentFilterSearch').value || '').trim().toLowerCase();
    const status = document.getElementById('studentFilterStatus').value;
    const rows = document.querySelectorAll('#adminStudentsTableBody .student-row');
    rows.forEach(function(row) {
      const searchData = row.getAttribute('data-search') || '';
      const isDeleted = row.getAttribute('data-deleted') === 'true';
      const matchSearch = !q || searchData.includes(q);
      let matchStatus = true;
      if (status === 'active') matchStatus = !isDeleted;
      else if (status === 'deleted') matchStatus = isDeleted;
      row.style.display = (matchSearch && matchStatus) ? '' : 'none';
    });
  };

  window.filterStorageCertTable = function() {
    const q = (document.getElementById('storageCertFilterInput').value || '').trim().toLowerCase();
    const rows = document.querySelectorAll('#storageCertsTable .storage-cert-row');
    rows.forEach(function(row) {
      const s = row.getAttribute('data-search') || '';
      row.style.display = (!q || s.includes(q)) ? '' : 'none';
    });
  };

  window.showStudentDeps = async function(userId) {
    const modal = document.getElementById('adminStudentDepsModal');
    const content = document.getElementById('studentDepsModalContent');
    if (!modal || !content) return;
    modal.style.display = 'flex';
    content.innerHTML = '<p style="color:var(--muted);text-align:center;padding:24px;">Loading student record &amp; dependencies…</p>';

    try {
      const res = await fetch('/api/admin/students/' + encodeURIComponent(userId) + '/dependencies');
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to load dependencies');

      const d = data.dependencies;
      const u = d.user;
      let html = '<div style="margin-bottom:16px;">';
      html += '<h4 style="margin:0;font:800 18px Manrope;color:var(--ink);">' + u.name + '</h4>';
      html += '<span style="font-size:12px;color:var(--muted);">' + u.email + ' &middot; ID: <code>' + u.id + '</code></span>';
      html += '</div>';

      html += '<div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;margin-bottom:20px;">';
      html += '<div style="background:#f8fafc;padding:12px;border-radius:10px;border:1px solid #e2e8f0;text-align:center;"><span style="font-size:11px;color:var(--muted);display:block;">Orders (Paid)</span><strong style="font-size:18px;color:#0b1f36;">' + d.counts.orders + ' (' + d.counts.paidOrders + ')</strong></div>';
      html += '<div style="background:#f8fafc;padding:12px;border-radius:10px;border:1px solid #e2e8f0;text-align:center;"><span style="font-size:11px;color:var(--muted);display:block;">Certificates</span><strong style="font-size:18px;color:#0d6e6e;">' + d.counts.certificates + '</strong></div>';
      html += '<div style="background:#f8fafc;padding:12px;border-radius:10px;border:1px solid #e2e8f0;text-align:center;"><span style="font-size:11px;color:var(--muted);display:block;">R2 Artifacts</span><strong style="font-size:18px;color:#0284c7;">' + d.counts.r2Artifacts + '</strong></div>';
      html += '<div style="background:#f8fafc;padding:12px;border-radius:10px;border:1px solid #e2e8f0;text-align:center;"><span style="font-size:11px;color:var(--muted);display:block;">Submissions</span><strong style="font-size:18px;color:var(--ink);">' + d.counts.submissions + '</strong></div>';
      html += '<div style="background:#f8fafc;padding:12px;border-radius:10px;border:1px solid #e2e8f0;text-align:center;"><span style="font-size:11px;color:var(--muted);display:block;">Tasks</span><strong style="font-size:18px;color:var(--ink);">' + d.counts.tasks + '</strong></div>';
      html += '<div style="background:#f8fafc;padding:12px;border-radius:10px;border:1px solid #e2e8f0;text-align:center;"><span style="font-size:11px;color:var(--muted);display:block;">Status</span><strong style="font-size:14px;color:' + (u.deleted_at ? '#dc2626' : '#16a34a') + ';">' + (u.deleted_at ? 'Deactivated' : 'Active') + '</strong></div>';
      html += '</div>';

      if (d.certificates && d.certificates.length > 0) {
        html += '<h5 style="margin:12px 0 6px;font:700 13px Manrope;">Associated Certificates:</h5>';
        html += '<ul style="font-size:12px;padding-left:18px;margin:0 0 14px;">';
        d.certificates.forEach(function(c) {
          html += '<li><code>' + (c.credential_id || c.credentialId) + '</code> — ' + c.domain + ' (' + c.duration + ')</li>';
        });
        html += '</ul>';
      }

      if (d.orders && d.orders.length > 0) {
        html += '<h5 style="margin:12px 0 6px;font:700 13px Manrope;">Associated Orders:</h5>';
        html += '<ul style="font-size:12px;padding-left:18px;margin:0 0 14px;">';
        d.orders.forEach(function(o) {
          html += '<li><code>' + o.id + '</code> — ' + (o.plan || 'Plan') + ' (₹' + (o.amount || 0) + ') &middot; Status: <strong>' + o.status + '</strong></li>';
        });
        html += '</ul>';
      }

      content.innerHTML = html;
    } catch (err) {
      content.innerHTML = '<div style="color:#dc2626;padding:16px;">Failed to load dependencies: ' + err.message + '</div>';
    }
  };

  window.closeStudentDepsModal = function() {
    const modal = document.getElementById('adminStudentDepsModal');
    if (modal) modal.style.display = 'none';
  };

  let currentTargetStudentId = null;
  window.promptSoftDelete = function(userId, name) {
    currentTargetStudentId = userId;
    document.getElementById('softDeleteStudentName').textContent = name;
    document.getElementById('softDeleteReasonInput').value = '';
    document.getElementById('adminSoftDeleteModal').style.display = 'flex';
  };

  window.closeSoftDeleteModal = function() {
    document.getElementById('adminSoftDeleteModal').style.display = 'none';
    currentTargetStudentId = null;
  };

  window.executeSoftDelete = async function() {
    if (!currentTargetStudentId) return;
    const reason = (document.getElementById('softDeleteReasonInput').value || '').trim();
    const btn = document.getElementById('btnConfirmSoftDelete');
    btn.disabled = true;
    btn.textContent = 'Deactivating…';

    try {
      const res = await fetch('/api/admin/students/' + encodeURIComponent(currentTargetStudentId) + '/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'soft', reason: reason })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to deactivate account');
      alert(data.message || 'Account deactivated successfully.');
      window.location.reload();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Deactivate Account';
      closeSoftDeleteModal();
    }
  };

  window.promptHardDelete = function(userId, name) {
    currentTargetStudentId = userId;
    document.getElementById('hardDeleteStudentName').textContent = name;
    document.getElementById('hardDeleteConfirmInput').value = '';
    document.getElementById('hardDeletePurgeCerts').checked = false;
    document.getElementById('hardDeletePurgeOrders').checked = false;
    document.getElementById('btnConfirmHardDelete').disabled = true;
    document.getElementById('adminHardDeleteModal').style.display = 'flex';
  };

  window.checkHardDeleteInput = function() {
    const val = (document.getElementById('hardDeleteConfirmInput').value || '').trim();
    document.getElementById('btnConfirmHardDelete').disabled = (val !== 'DELETE');
  };

  window.closeHardDeleteModal = function() {
    document.getElementById('adminHardDeleteModal').style.display = 'none';
    currentTargetStudentId = null;
  };

  window.executeHardDelete = async function() {
    if (!currentTargetStudentId) return;
    const confirmVal = (document.getElementById('hardDeleteConfirmInput').value || '').trim();
    if (confirmVal !== 'DELETE') return alert('Please type DELETE to confirm.');

    const purgeCerts = document.getElementById('hardDeletePurgeCerts').checked;
    const purgeOrders = document.getElementById('hardDeletePurgeOrders').checked;
    const btn = document.getElementById('btnConfirmHardDelete');
    btn.disabled = true;
    btn.textContent = 'Deleting…';

    try {
      const res = await fetch('/api/admin/students/' + encodeURIComponent(currentTargetStudentId) + '/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'hard',
          confirmText: 'DELETE',
          purgeCertificates: purgeCerts,
          purgeOrders: purgeOrders
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to delete student');
      alert(data.message || 'Student account permanently removed.');
      window.location.reload();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Permanently Delete';
      closeHardDeleteModal();
    }
  };

  window.restoreStudentAccount = async function(userId) {
    if (!userId) return;
    if (!confirm('Restore this student account? This will reactivate the login and permit workspace access.')) return;
    try {
      const res = await fetch('/api/admin/students/' + encodeURIComponent(userId) + '/restore', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to restore student');
      alert(data.message || 'Student account restored successfully.');
      window.location.reload();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  window.openCreateStudentModal = function() {
    document.getElementById('adminCreateStudentModal').style.display = 'flex';
  };

  window.closeCreateStudentModal = function() {
    document.getElementById('adminCreateStudentModal').style.display = 'none';
  };

  window.submitCreateStudentForm = async function(e) {
    e.preventDefault();
    const form = document.getElementById('createStudentForm');
    const msg = document.getElementById('createStudentMsg');
    const btn = document.getElementById('btnSubmitCreateStudent');
    msg.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Creating…';

    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const res = await fetch('/api/admin/students/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (data.canRestore && data.userId) {
          if (confirm(data.error + '\\n\\nWould you like to restore this existing account now?')) {
            await restoreStudentAccount(data.userId);
            return;
          }
        }
        throw new Error(data.error || 'Failed to create student');
      }

      msg.style.display = 'block';
      msg.style.color = '#15803d';
      msg.textContent = '✓ ' + (data.message || 'Student created successfully!');
      setTimeout(function() { window.location.reload(); }, 900);
    } catch (err) {
      msg.style.display = 'block';
      msg.style.color = '#dc2626';
      msg.textContent = '✗ ' + err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Student';
    }
  };

  window.deleteCertArtifactsOnly = async function(credentialId) {
    if (!credentialId) return;
    if (!confirm('Purge PDF & JPG artifacts for certificate ' + credentialId + ' from Cloudflare R2?\\n\\nThe certificate metadata and public verification URL will remain intact, and storage will be freed.')) return;
    try {
      const res = await fetch('/api/admin/certificates/' + encodeURIComponent(credentialId) + '/artifacts/delete', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to purge artifacts');
      alert(data.message || 'Artifacts purged successfully.');
      window.location.reload();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  window.regenerateCertArtifacts = async function(credentialId) {
    if (!credentialId) return;
    if (!confirm('Regenerate certificate artifacts for ' + credentialId + ' using the EXACT SAME credential ID?\\n\\nThis will re-render high-res JPG and PDF with live QR verification and update Cloudflare R2.')) return;
    try {
      const res = await fetch('/api/admin/certificates/' + encodeURIComponent(credentialId) + '/regenerate', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to regenerate certificate');
      alert(data.message || 'Certificate regenerated successfully!');
      window.location.reload();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  window.deleteFullCertRecord = async function(credentialId) {
    if (!credentialId) return;
    if (!confirm('PERMANENTLY DELETE certificate ' + credentialId + '?\\n\\nThis deletes BOTH the database certificate record and the R2 artifacts. Online verification will cease to exist.')) return;
    try {
      const res = await fetch('/api/admin/certificates/' + encodeURIComponent(credentialId) + '/delete', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to delete certificate');
      alert(data.message || 'Certificate record deleted successfully.');
      window.location.reload();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  window.refreshAuditTrail = async function() {
    const tbody = document.getElementById('auditTrailTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--muted);">Refreshing audit log…</td></tr>';
    try {
      const res = await fetch('/api/admin/audit-logs?limit=25');
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to fetch logs');
      if (!data.logs || data.logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:20px;">No audit logs recorded yet.</td></tr>';
        return;
      }
      let html = '';
      data.logs.forEach(function(l) {
        const isDelete = (l.action || '').includes('DELETED');
        const isCreate = (l.action || '').includes('CREATED') || (l.action || '').includes('RESTOR');
        const badgeClass = isDelete ? 'admin-badge-yellow' : (isCreate ? 'admin-badge-green' : 'admin-badge-blue');
        html += '<tr>';
        html += '<td style="white-space:nowrap;font-size:12px;">' + new Date(l.created_at).toLocaleString() + '</td>';
        html += '<td style="font-size:12px;"><strong>' + (l.admin_email || 'System') + '</strong></td>';
        html += '<td><span class="admin-badge ' + badgeClass + '" style="font-size:11px;font-family:monospace;">' + l.action + '</span></td>';
        html += '<td style="font-size:12px;font-family:monospace;">' + (l.target_type || '') + ': ' + (l.target_id || '') + '</td>';
        html += '<td><span class="admin-badge ' + (l.success ? 'admin-badge-green' : 'admin-badge-yellow') + '" style="font-size:10px;">' + (l.success ? 'Success' : 'Failed') + '</span></td>';
        html += '<td style="font-size:11px;color:var(--muted);max-width:280px;word-break:break-all;">' + JSON.stringify(l.details || {}) + '</td>';
        html += '</tr>';
      });
      tbody.innerHTML = html;
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#dc2626;padding:16px;">Failed to load audit logs: ' + err.message + '</td></tr>';
    }
  };
</script>
<!-- Admin Certificate Preview Modal -->
<div class="admin-modal" id="adminCertPreviewModal" style="display:none;position:fixed;inset:0;background:rgba(11,31,54,.6);z-index:9999;align-items:center;justify-content:center;padding:20px;">
  <div class="admin-modal-content" style="max-width:880px;width:100%;max-height:92vh;background:white;border-radius:20px;padding:28px 32px;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.25);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;border-bottom:1px solid #f1f5f9;padding-bottom:12px;">
      <div>
        <h3 style="margin:0;font:800 20px Manrope;" id="modalCertTitle">Certificate Preview</h3>
        <span style="font-size:12px;color:var(--muted);" id="modalCertSubtitle">Credential ID</span>
      </div>
      <button type="button" class="admin-btn" id="btnCloseCertModal" style="font-size:22px;line-height:1;padding:4px 12px;border:none;background:#f1f5f9;border-radius:8px;cursor:pointer;">&times;</button>
    </div>
    <div style="text-align:center;background:#f8fafc;padding:16px;border-radius:14px;border:1px solid #e2e8f0;margin-bottom:20px;">
      <img id="modalCertImg" src="" alt="Certificate Preview" style="width:100%;height:auto;max-height:480px;object-fit:contain;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.08);display:block;margin:0 auto;" />
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;border-top:1px solid #f1f5f9;padding-top:16px;">
      <a id="modalCertVerifyLink" href="#" target="_blank" class="text-link" style="font-size:13px;font-weight:700;">Open Verification Page &#8599;</a>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <a id="modalCertPdfBtn" href="#" download="" class="btn btn-dark" style="text-decoration:none;font-size:13px;padding:9px 18px;">Download PDF</a>
        <a id="modalCertJpgBtn" href="#" download="" class="btn btn-light" style="text-decoration:none;font-size:13px;padding:9px 18px;background:white;border:1px solid var(--line);color:var(--ink);">Download JPG</a>
        <button type="button" class="btn btn-ghost" id="modalCertSendMailBtn" style="font-size:13px;padding:9px 18px;">✉ Send Email to Student</button>
      </div>
    </div>
  </div>
</div>
<!-- Admin Student Dependencies Modal -->
<div class="admin-modal" id="adminStudentDepsModal" style="display:none;position:fixed;inset:0;background:rgba(11,31,54,.6);z-index:9999;align-items:center;justify-content:center;padding:20px;">
  <div class="admin-modal-content" style="max-width:680px;width:100%;max-height:88vh;background:white;border-radius:20px;padding:28px 32px;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.25);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #f1f5f9;padding-bottom:12px;">
      <div>
        <h3 style="margin:0;font:800 20px Manrope;">Student Record Dependencies</h3>
        <span style="font-size:12px;color:var(--muted);">Audit of all associated database entries &amp; storage artifacts</span>
      </div>
      <button type="button" class="admin-btn" onclick="closeStudentDepsModal()" style="font-size:22px;line-height:1;padding:4px 12px;border:none;background:#f1f5f9;border-radius:8px;cursor:pointer;">&times;</button>
    </div>
    <div id="studentDepsModalContent"></div>
    <div style="display:flex;justify-content:flex-end;margin-top:20px;border-top:1px solid #f1f5f9;padding-top:14px;">
      <button type="button" class="btn btn-dark" onclick="closeStudentDepsModal()" style="font-size:13px;padding:8px 18px;">Close</button>
    </div>
  </div>
</div>

<!-- Admin Soft Delete Confirmation Modal -->
<div class="admin-modal" id="adminSoftDeleteModal" style="display:none;position:fixed;inset:0;background:rgba(11,31,54,.6);z-index:9999;align-items:center;justify-content:center;padding:20px;">
  <div class="admin-modal-content" style="max-width:520px;width:100%;background:white;border-radius:20px;padding:28px 32px;box-shadow:0 25px 60px rgba(0,0,0,.25);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <h3 style="margin:0;font:800 19px Manrope;color:#b45309;">Deactivate Student Account</h3>
      <button type="button" class="admin-btn" onclick="closeSoftDeleteModal()" style="font-size:20px;line-height:1;padding:4px 10px;border:none;background:#f1f5f9;border-radius:8px;cursor:pointer;">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--ink);line-height:1.5;margin:0 0 14px;">
      Are you sure you want to deactivate <strong id="softDeleteStudentName">Student</strong>?
    </p>
    <div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:10px;padding:12px 14px;font-size:12px;color:#92400e;margin-bottom:16px;line-height:1.4;">
      <strong>Data Safety Guarantee:</strong> Soft deactivation blocks student logins and password reset requests. However, all paid orders, certificates, submissions, and verification URLs are <strong>strictly preserved</strong>. You can restore this account anytime.
    </div>
    <div style="margin-bottom:18px;">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px;color:var(--muted);">Reason for deactivation (Optional):</label>
      <input type="text" id="softDeleteReasonInput" placeholder="e.g. Requested account closure, fraudulent activity…" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font:inherit;font-size:13px;" />
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;">
      <button type="button" class="btn btn-light" onclick="closeSoftDeleteModal()" style="font-size:13px;padding:8px 16px;">Cancel</button>
      <button type="button" class="btn btn-dark" id="btnConfirmSoftDelete" onclick="executeSoftDelete()" style="font-size:13px;padding:8px 18px;background:#d97706;border-color:#d97706;">Deactivate Account</button>
    </div>
  </div>
</div>

<!-- Admin Hard Delete Confirmation Modal -->
<div class="admin-modal" id="adminHardDeleteModal" style="display:none;position:fixed;inset:0;background:rgba(11,31,54,.6);z-index:9999;align-items:center;justify-content:center;padding:20px;">
  <div class="admin-modal-content" style="max-width:540px;width:100%;background:white;border-radius:20px;padding:28px 32px;box-shadow:0 25px 60px rgba(0,0,0,.25);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <h3 style="margin:0;font:800 19px Manrope;color:#dc2626;">&#9888; Permanent Hard Deletion</h3>
      <button type="button" class="admin-btn" onclick="closeHardDeleteModal()" style="font-size:20px;line-height:1;padding:4px 10px;border:none;background:#f1f5f9;border-radius:8px;cursor:pointer;">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--ink);line-height:1.5;margin:0 0 14px;">
      Permanently deleting <strong id="hardDeleteStudentName">Student</strong> executes a database transaction removing user account records, task assignments, submissions, and reset tokens.
    </p>
    <div style="background:#fef2f2;border:1.5px solid #fecaca;border-radius:10px;padding:12px 14px;font-size:12px;color:#991b1b;margin-bottom:16px;line-height:1.4;">
      <strong>Warning: This action is permanent and cannot be undone.</strong> By default, paid orders and issued certificates are retained for financial and verification compliance unless explicitly checked below.
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
      <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;">
        <input type="checkbox" id="hardDeletePurgeCerts" style="width:16px;height:16px;" />
        <span>Also purge issued certificates &amp; R2 artifacts (Breaks public verification)</span>
      </label>
      <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;">
        <input type="checkbox" id="hardDeletePurgeOrders" style="width:16px;height:16px;" />
        <span>Also purge payment order records (Not recommended for paid students)</span>
      </label>
    </div>
    <div style="margin-bottom:18px;">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px;color:#991b1b;">Type <code style="background:#fee2e2;padding:2px 6px;border-radius:4px;">DELETE</code> below to confirm permanent deletion:</label>
      <input type="text" id="hardDeleteConfirmInput" oninput="checkHardDeleteInput()" placeholder="Type DELETE to confirm" style="width:100%;padding:10px 12px;border:1.5px solid #dc2626;border-radius:8px;font:inherit;font-size:13px;font-family:monospace;" />
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;">
      <button type="button" class="btn btn-light" onclick="closeHardDeleteModal()" style="font-size:13px;padding:8px 16px;">Cancel</button>
      <button type="button" class="btn btn-dark" id="btnConfirmHardDelete" disabled onclick="executeHardDelete()" style="font-size:13px;padding:8px 18px;background:#dc2626;border-color:#dc2626;">Permanently Delete</button>
    </div>
  </div>
</div>

<!-- Admin Create Student Modal -->
<div class="admin-modal" id="adminCreateStudentModal" style="display:none;position:fixed;inset:0;background:rgba(11,31,54,.6);z-index:9999;align-items:center;justify-content:center;padding:20px;">
  <div class="admin-modal-content" style="max-width:500px;width:100%;background:white;border-radius:20px;padding:28px 32px;box-shadow:0 25px 60px rgba(0,0,0,.25);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #f1f5f9;padding-bottom:12px;">
      <h3 style="margin:0;font:800 20px Manrope;">Add New Student</h3>
      <button type="button" class="admin-btn" onclick="closeCreateStudentModal()" style="font-size:22px;line-height:1;padding:4px 12px;border:none;background:#f1f5f9;border-radius:8px;cursor:pointer;">&times;</button>
    </div>
    <form id="createStudentForm" onsubmit="submitCreateStudentForm(event)" style="display:grid;gap:14px;">
      <div>
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;color:var(--muted);">Full Name *</label>
        <input type="text" name="name" required placeholder="e.g. John Doe" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font:inherit;" />
      </div>
      <div>
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;color:var(--muted);">Email Address *</label>
        <input type="email" name="email" required placeholder="e.g. student@example.com" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font:inherit;" />
      </div>
      <div>
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;color:var(--muted);">Phone Number (Optional)</label>
        <input type="tel" name="phone" placeholder="e.g. +91 9876543210" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font:inherit;" />
      </div>
      <div>
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;color:var(--muted);">Initial Password * (Min 6 chars)</label>
        <input type="password" name="password" required minlength="6" placeholder="••••••••" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font:inherit;" />
      </div>
      <div id="createStudentMsg" style="display:none;font-size:13px;padding:8px 12px;border-radius:8px;"></div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px;">
        <button type="button" class="btn btn-light" onclick="closeCreateStudentModal()" style="font-size:13px;padding:8px 16px;">Cancel</button>
        <button type="submit" class="btn btn-dark" id="btnSubmitCreateStudent" style="font-size:13px;padding:8px 18px;">Create Student</button>
      </div>
    </form>
  </div>
</div>
</main>`;

  res.send(layout({
    title: 'Admin Portal | HireeBridge',
    description: 'HireeBridge Administrative Portal for user management, task assignment, evaluations, and Neon PostgreSQL database metrics.',
    active: '/admin',
    content,
    session
  }));
}

// 7. Full, Defensible Legal Pages
function privacyPolicyPage(session = null) {
  return layout({
    title: 'Privacy Policy | HireeBridge',
    description: 'Comprehensive Privacy Policy governing student data, collection, processing, and protection on HireeBridge.',
    active: '/privacy',
    session,
    content: `<main class="legal-container">
<article class="legal-article">
  <h1>Privacy Policy</h1>
  <div class="legal-meta">Effective Date: January 1, 2026 &middot; Version 2.2 &middot; HireeBridge Data Governance</div>

  <h2>1. Data Controller &amp; Scope of Policy</h2>
  <p>HireeBridge ("we", "our", or "the Platform") provides structured virtual internship pathways, project evidence documentation workspaces, and partner credential facilitation services. This Privacy Policy details our practices concerning the collection, storage, use, disclosure, and protection of personal and technical information gathered through HireeBridge and associated services.</p>
  <p>By accessing the platform, registering an account, or completing an enrollment checkout, you explicitly consent to the data practices described herein.</p>

  <h2>2. Categories of Information Collected</h2>
  <p>To deliver structured curriculum, issue official credentials, and maintain verification compliance, we collect the following categories of information:</p>
  <ul>
    <li><strong>Account &amp; Enrollment Identification:</strong> Full legal name, verified email address, contact telephone number, selected academic domain, country of residence, and enrollment order identifier.</li>
    <li><strong>Project Evidence &amp; Academic Deliverables:</strong> Public or private GitHub repository URLs, source code commits, project summaries, system synopses, and public LinkedIn showcase URLs submitted by the student.</li>
      <li><strong>Payment Transaction Data:</strong> Transaction tokens, gateway order IDs, and payment statuses provided by Cashfree Payments. <em>HireeBridge does not directly store, process, or retain credit/debit card numbers, CVVs, or NetBanking credentials on platform servers.</em></li>
    <li><strong>Telemetry &amp; Access Logs:</strong> IP address, browser type, operating system, timestamped session tokens, and cryptographic request verification headers.</li>
  </ul>

  <h2>3. Lawful Basis and Purpose of Processing</h2>
  <p>We process personal data under applicable data protection frameworks, including the Information Technology Act 2000 (India), the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules 2011, and globally aligned data protection standards:</p>
  <ul>
    <li>Fulfillment of contractual obligations to grant curriculum access and generate academic credentials.</li>
    <li>Facilitation of tamper-proof credential verification with partner issuer GreyRocks Digital Engineering.</li>
    <li>Prevention of plagiarism, credential falsification, and fraudulent activity.</li>
    <li>Operational communications, system status notifications, and customer support resolution.</li>
  </ul>

  <h2>4. Disclosure to Third Parties &amp; Verification Partners</h2>
  <p>We strictly do NOT sell, rent, or trade student personal information to commercial advertising networks or data brokers. Disclosures are restricted strictly to:</p>
  <ul>
    <li><strong>Credential Issuing Partner (GreyRocks):</strong> Student name, domain, completion date, and unique credential ID are transmitted to GreyRocks Digital Engineering to generate cryptographic verification records and QR validation destinations.</li>
    <li><strong>Authorized Payment Gateways:</strong> Name, email, and transaction amount are transmitted securely to payment gateways under strict PCI-DSS compliance.</li>
    <li><strong>Legal &amp; Regulatory Authorities:</strong> Where compelled by valid subpoena, statutory authority, or court order under prevailing law.</li>
  </ul>

  <h2>5. Cloud Infrastructure &amp; Security Measures</h2>
  <p>Data is stored in high-availability, encrypted cloud infrastructure powered by Neon Cloud PostgreSQL (hosted in secure AWS data centers) with SSL/TLS encryption in transit and AES-256 encryption at rest. Platform passwords are cryptographically hashed using salted SHA-256 routines.</p>

  <h2>6. Data Retention &amp; User Rights</h2>
  <p>Students retain the right to inspect their personal record, update contact parameters, and access generated credentials in perpetuity. Credential verification records are permanently archived to guarantee that university reviewers or prospective employers can independently confirm certificate authenticity indefinitely.</p>

  <h2>7. Inquiries &amp; Data Protection Officer</h2>
  <p>For inquiries regarding privacy, data rectification, or data governance, contact our designated compliance mailbox at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
</article>
</main>`
  });
}

function termsOfServicePage(session = null) {
  return layout({
    title: 'Terms of Service | HireeBridge',
    description: 'Terms of Service governing the use of HireeBridge programs, student workspace, and GreyRocks credentials.',
    active: '/terms',
    session,
    content: `<main class="legal-container">
<article class="legal-article">
  <h1>Terms of Service</h1>
  <div class="legal-meta">Last Updated: January 1, 2026 &middot; Legally Binding Agreement</div>

  <h2>1. Agreement to Terms</h2>
  <p>These Terms of Service ("Terms") constitute a legally binding contractual agreement between you ("User", "Student", or "Candidate") and HireeBridge ("Company", "we", "us"). By creating an account, completing an enrollment transaction, or utilizing any portion of the platform, you agree to be strictly bound by these Terms.</p>

  <h2>2. Nature of Platform &amp; Explicit Non-Employment Disclaimer</h2>
  <p><strong>HIREEBRIDGE PROVIDES STRUCTURED EDUCATIONAL INTERNSHIP SIMULATIONS, PRACTICAL PROJECT CURRICULA, AND FACILITATED COMPLETION CREDENTIALS.</strong></p>
  <p>Enrollment in any HireeBridge program, whether Certificate Program, Project Based Internship, or Comprehensive Program, does <strong>NOT</strong> create an employer-employee relationship, labor contract, apprenticeship under the Apprentices Act, or promise of paid employment.</p>
  <p>Candidates are independent learners completing self-paced or guided practical projects. Nothing on this website, in offer letters, or on completion certificates guarantees employment, hiring preference, corporate sponsorship, or academic degree conferral.</p>

  <h2>3. Credential Facilitation &amp; Academic Integrity</h2>
  <p>Credentials issued through the platform present GreyRocks Digital Engineering as the issuing corporate entity. Candidates agree to submit authentic, original work. Plagiarism, automated code scraping without attribution, or submitting fraudulent repositories constitutes a material breach resulting in immediate program termination and revocation of credential verification records without notice or refund.</p>

  <h2>4. Intellectual Property Rights</h2>
  <p>The HireeBridge brand name, vector logos, platform software, curriculum designs, and synopsis templates are the exclusive intellectual property of HireeBridge. Students retain ownership of original project code written during their internship, granting HireeBridge a non-exclusive license to inspect, evaluate, and showcase anonymized project deliverables.</p>

  <h2>5. Limitation of Liability</h2>
  <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, HIREEBRIDGE, ITS AFFILIATES, PARTNERS, DIRECTORS, AND EMPLOYEES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF EMPLOYMENT OPPORTUNITY, REPUTATIONAL INJURY, COLLEGE REJECTION, OR SYSTEM INTERRUPTIONS.</p>
  <p><strong>IN ALL CIRCUMSTANCES, THE MAXIMUM AGGREGATE LIABILITY OF HIREEBRIDGE FOR ANY AND ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR YOUR USE OF THE SERVICES SHALL BE STRICTLY LIMITED TO THE EXACT AMOUNT PAID BY YOU TO HIREEBRIDGE FOR THE SPECIFIC PROGRAM ENROLLMENT IN DISPUTE.</strong></p>

  <h2>6. Indemnification</h2>
  <p>You agree to indemnify, defend, and hold harmless HireeBridge, GreyRocks, their officers, partners, and agents from any claims, liabilities, damages, or costs (including legal fees) arising from your breach of these Terms, misrepresentation of your credentials, or violation of third-party intellectual property rights.</p>

  <h2>7. Dispute Resolution &amp; Sole Arbitration</h2>
  <p>Any dispute, controversy, or claim arising out of or relating to these Terms shall be settled by binding arbitration in accordance with the Arbitration and Conciliation Act 1996. The seat and venue of arbitration shall be Pune/Maharashtra, India. The proceedings shall be conducted in English.</p>
</article>
</main>`
  });
}

function refundPolicyPage(session = null) {
  return layout({
    title: 'Refund Policy | HireeBridge',
    description: 'Strict, legally binding No-Refund Policy governing all digital credentials, programs, and materials on HireeBridge.',
    active: '/refund',
    session,
    content: `<main class="legal-container">
<article class="legal-article">
  <h1>Refund &amp; Cancellation Policy</h1>
  <div class="legal-meta">Authoritative Policy &middot; Applicable to All Transactions</div>

  <div class="legal-alert">
    <strong>CRITICAL NOTICE TO ALL ENROLLING STUDENTS:</strong><br>
    Please read this Refund Policy thoroughly before completing any checkout. By submitting payment, you expressly agree and acknowledge that all transactions are final, non-cancellable, and completely non-refundable.
  </div>

  <h2>1. Strict No-Refund Policy for Digital Products &amp; Credentials</h2>
  <p>Due to the instantaneous digital nature of our services, including immediate access to proprietary technical domain curricula, allocation of automated credential records, provisioning of student workspace instances, and generation of verifiable offer letters and certificates:</p>
  <p><strong>ALL PAYMENTS MADE TO HIREEBRIDGE FOR ANY PROGRAM OPTION ARE STRICTLY FINAL AND NON-REFUNDABLE UNDER ANY CIRCUMSTANCES.</strong></p>

  <h2>2. Immediate Consumption of Digital Resources</h2>
  <p>Upon transaction completion and authentication, the student is granted instantaneous access to digital assets, project briefs, source code guidelines, and partner credential records. Under digital consumer regulations and prevailing electronic commerce laws, accessing digital materials waives any statutory right to cancellation, withdrawal, or cooling-off period.</p>

  <h2>3. Non-Acceptance by Third Parties Disclaimer</h2>
  <p>HireeBridge credentials and offer letters are issued in academic and professional association with GreyRocks Digital Engineering. However, academic acceptance criteria, credit recognition, and internship requirements vary widely across individual universities, colleges, departments, and employers.</p>
  <p>HireeBridge makes no representation or warranty that any third-party institution will accept or grant academic credit for completed credentials. <strong>Rejection or non-acceptance of a credential by any college, academic mentor, university, or corporate employer shall NOT constitute valid grounds for a refund.</strong> Students are solely responsible for verifying program suitability with their respective department before enrolling.</p>

  <h2>4. Fraudulent Chargebacks &amp; Payment Disputes</h2>
  <p>Any attempt to initiate a fraudulent chargeback, payment retrieval, or unauthorized transaction dispute with your banking provider after accessing platform resources constitutes a material breach of our Terms of Service. In such cases:</p>
  <ul>
    <li>The student's account and access to the workspace will be immediately suspended.</li>
    <li>All issued completion certificates, unique credential IDs, and GreyRocks verification records will be permanently cancelled and flagged as revoked.</li>
    <li>We reserve the right to report fraudulent dispute activities to payment security registries and academic institutions.</li>
  </ul>

  <h2>5. Inquiries Regarding Transactions</h2>
  <p>If you experience technical payment anomalies (such as duplicate deduction for a single order), submit proof of duplicate transaction to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> within 24 hours for reconciliation.</p>
</article>
</main>`
  });
}

function aboutPage(session = null) {
  return layout({
    title: 'About Us | HireeBridge',
    description: 'Learn about HireeBridge, our mission, and our credential partnership with GreyRocks Digital Engineering.',
    active: '/about',
    session,
    content: `<main class="legal-container">
<article class="legal-article">
  <h1>About HireeBridge</h1>
  <div class="legal-meta">Empowering the next generation of engineers, builders, and data practitioners worldwide.</div>

  <h2>Our Mission</h2>
  <p>HireeBridge was founded to bridge the gap between classroom theory and industry-demanded engineering execution. We believe every aspiring engineer, data scientist, and developer should have transparent access to practical project paths and verifiable proof of their skills without predatory fees.</p>

  <h2>The Partnership Model: HireeBridge &amp; GreyRocks</h2>
  <p>HireeBridge serves as the student-facing learning experience platform. We structure the domain curriculum, manage the milestone workspace, evaluate submitted GitHub repositories, and coordinate onboarding.</p>
  <p>Our credential issuing partner, <strong>GreyRocks Digital Engineering</strong>, is a dedicated digital engineering and technology consulting organization. Through this model, candidates who complete requirements receive credentials backed by an active engineering entity with tamper-proof QR code verification.</p>

  <h2>Global Reach &amp; Community Impact</h2>
  <p>HireeBridge provides domain-specific project paths, task submission, reviewer evaluation, and certificate access after approval.</p>
  ${faq([
    ['What does HireeBridge provide?', 'HireeBridge provides the student enrollment and task workflow for domain-specific project assignments.'],
    ['How does GreyRocks relate to the program?', 'The platform presents GreyRocks Digital Engineering as the credential issuer for certificates available after approved task completion.'],
    ['Does enrollment create an employment relationship?', 'No. The Terms page describes the platform as educational internship simulations and practical project curricula, not employment.']
  ])}
</article>
</main>`
  });
}

function contactPage(session = null) {
  return layout({
    title: 'Contact Us | HireeBridge Support',
    description: 'Contact HireeBridge for enrollment support, technical assistance, and general inquiries.',
    active: '/contact',
    session,
    content: `<main class="legal-container">
<article class="legal-article" style="max-width:860px;margin:0 auto;">
  <h1>Contact HireeBridge Support</h1>
  <div class="legal-meta">We are here to assist you with enrollment, projects, payments, and credentials.</div>

  <p>If you have any problem or query regarding your internship, tasks, payment verification, or certificates, please reach out to us using either of the two direct options below:</p>

  <!-- TWO WAYS SUPPORT SECTION -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(290px, 1fr));gap:20px;margin:28px 0;">
    
    <!-- Way 1: Direct Email -->
    <div style="background:#ffffff;border:1.5px solid var(--line);border-radius:18px;padding:26px;box-shadow:0 6px 20px rgba(11,31,54,.04);display:flex;flex-direction:column;justify-content:space-between;">
      <div>
        <div style="display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;background:#e6f4f1;color:#0d6e6e;margin-bottom:14px;">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        </div>
        <div style="display:inline-block;background:#0d6e6e;color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:999px;margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em;">Way 1 &bull; Email Support</div>
        <h3 style="margin:0 0 8px;font:800 20px Manrope;color:var(--ink);">Send Us an Email</h3>
        <p style="margin:0 0 18px;color:var(--muted);font-size:14px;line-height:1.6;">If you have any problem or query, simply send it to our official support mailbox at <strong>help@hireebridge.in</strong>. Our team typically reviews and resolves queries within 24 business hours.</p>
        <div style="background:#f8fafc;padding:12px 14px;border-radius:10px;border:1px solid var(--line);margin-bottom:18px;font-size:14px;font-weight:700;color:var(--ink);">
          <span style="color:var(--muted);font-weight:600;display:block;font-size:12px;margin-bottom:2px;">Support Email:</span>
          <a href="mailto:help@hireebridge.in" style="color:#0d6e6e;text-decoration:none;">help@hireebridge.in</a>
        </div>
      </div>
      <a href="mailto:help@hireebridge.in" class="btn btn-dark" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 20px;text-decoration:none;border-radius:11px;font-weight:700;font-size:14px;width:100%;text-align:center;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        Send Email to help@hireebridge.in
      </a>
    </div>

    <!-- Way 2: Telegram Support Group -->
    <div style="background:#ffffff;border:1.5px solid #bce1f7;border-radius:18px;padding:26px;box-shadow:0 6px 20px rgba(0,136,204,.06);display:flex;flex-direction:column;justify-content:space-between;">
      <div>
        <div style="display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;background:#0088cc;color:#ffffff;margin-bottom:14px;">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
        </div>
        <div style="display:inline-block;background:#0088cc;color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:999px;margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em;">Way 2 &bull; Telegram Community</div>
        <h3 style="margin:0 0 8px;font:800 20px Manrope;color:var(--ink);">Join Telegram Group</h3>
        <p style="margin:0 0 18px;color:var(--muted);font-size:14px;line-height:1.6;">Join our official Telegram group to connect with mentors and peers. Simply join the group and mention your query there for quick help and assistance.</p>
        <div style="background:#f0f8ff;padding:12px 14px;border-radius:10px;border:1px solid #cce5f8;margin-bottom:18px;font-size:13px;color:#0b4267;">
          <strong>Quick Tip:</strong> Post your order ID or registered email along with your question in the group.
        </div>
      </div>
      <a href="https://t.me/+u1eccYEzCelmZDBl" target="_blank" rel="noopener noreferrer" class="btn" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 20px;text-decoration:none;border-radius:11px;font-weight:700;font-size:14px;background:#0088cc;color:#ffffff;border:none;width:100%;text-align:center;box-shadow:0 4px 14px rgba(0,136,204,.28);">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
        Join Group &amp; Mention Query &rarr;
      </a>
    </div>

  </div>

  <!-- SOCIAL FOLLOW CHANNELS -->
  <div style="background:#f8fafc;border:1px solid var(--line);border-radius:18px;padding:24px;margin:28px 0;">
    <h3 style="margin:0 0 6px;font:800 18px Manrope;color:var(--ink);">Follow &amp; Join HireeBridge on Social Media</h3>
    <p style="margin:0 0 16px;color:var(--muted);font-size:14px;">Connect with us on our official social networks to stay updated on internships, student highlights, and announcements:</p>
    <div style="display:flex;flex-wrap:wrap;gap:12px;">
      <a href="https://www.linkedin.com/company/hireebridge" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:10px;padding:11px 18px;border-radius:12px;background:#ffffff;border:1px solid var(--line);color:#0a66c2;font-weight:700;font-size:13.5px;text-decoration:none;box-shadow:0 2px 6px rgba(0,0,0,.04);">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45c-.88 0-1.6.72-1.6 1.6s.72 1.6 1.6 1.6 1.6-.72 1.6-1.6-.72-1.6-1.6-1.6Z"/></svg>
        LinkedIn &bull; Follow Page
      </a>
      <a href="https://t.me/+u1eccYEzCelmZDBl" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:10px;padding:11px 18px;border-radius:12px;background:#ffffff;border:1px solid var(--line);color:#0088cc;font-weight:700;font-size:13.5px;text-decoration:none;box-shadow:0 2px 6px rgba(0,0,0,.04);">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
        Telegram &bull; Join Community
      </a>
      <a href="https://www.instagram.com/hireebridge?stkn=MTU1ZndxY3djZGkxdA==" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:10px;padding:11px 18px;border-radius:12px;background:#ffffff;border:1px solid var(--line);color:#e1306c;font-weight:700;font-size:13.5px;text-decoration:none;box-shadow:0 2px 6px rgba(0,0,0,.04);">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
        Instagram &bull; Follow Profile
      </a>
    </div>
  </div>

  <h2>Or Submit an Inquiry Ticket Online</h2>
  <form id="contactForm" class="submit-form" style="max-width:100%;margin-top:16px;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <label>Your Full Name *
        <input required name="name" placeholder="Enter Full Name" value="${session ? esc(session.name) : ''}">
      </label>
      <label>Your Email Address *
        <input required type="email" name="email" placeholder="you@example.com" value="${session ? esc(session.email) : ''}">
      </label>
    </div>
    <label>Subject *
      <input required name="subject" placeholder="e.g. Question about Data Science program deliverables">
    </label>
    <label>Message *
      <textarea required name="message" placeholder="Provide full details of your query…"></textarea>
    </label>
    <button class="btn btn-dark" type="submit" style="width:fit-content;padding:12px 24px;">Send Inquiry</button>
    <div id="contactResult"></div>
  </form>
</article>
${faq([
  ['How do I contact HireeBridge?', 'Use the email address, Telegram community, or inquiry form shown on this page.'],
  ['What information should I include in a support request?', 'Include your registered email and order ID when relevant, and describe the enrollment, task, payment, or certificate issue. Do not send payment card details.'],
  ['Can support approve my task or issue a certificate from this page?', 'No. Task submissions are reviewed in the student workflow; certificate availability follows explicit reviewer approval.']
])}</main>`
  });
}

function internshipsPage(session = null) {
  return layout({
    title: 'Internship Domains | AI, Data, Development, Cloud & More | HireeBridge',
    description: 'Explore HireeBridge internship domains across AI, data science, software engineering, cloud, security, design, and product.',
    active: '/internships',
    session,
    content: `<main>
<section class="page-hero">
  <div class="eyebrow">${PROJECT_CATALOGUE.length} Specialized Domains</div>
  <h1>Choose the field you want to build in.</h1>
  <p>Each domain maps to an assigned project and task specification. Reference repositories and comprehensive materials depend on the selected plan; certificates follow task submission and explicit reviewer approval.</p>
</section>
<section class="section domain-grid">
  ${domains.map((d, idx) => `
    <article class="domain-card">
      <div class="domain-num">${String(idx + 1).padStart(2, '0')}</div>
      <h3>${esc(d[0])}</h3>
      <p>${esc(d[2])}</p>
      <a href="/checkout?plan=project&domain=${d[1]}">Start in ${esc(d[0])} &rarr;</a>
    </article>
  `).join('')}
</section>
${faq([
  ['How is a project matched to my domain?', 'The selected internship domain maps to a specific project from the HireeBridge project catalogue.'],
  ['Does every plan include a GitHub reference repository?', 'No. The entry plan provides the project specification only. Reference repositories are available in the Project Based and Comprehensive plans.'],
  ['What will I submit?', 'Submit your own implementation repository and evidence requested by the assigned project through the dashboard Submit Task flow.'],
  ['When is the certificate issued?', 'Only after the reviewer approves your submitted task. Payment and enrollment do not issue a certificate.']
])}
</main>`
  });
}

function howItWorksPage(session = null) {
  return layout({
    title: 'How HireeBridge Works | Internship to GreyRocks Credential',
    description: 'See how HireeBridge enrollment, tasks, evidence, and GreyRocks credential delivery work from start to finish.',
    active: '/how-it-works',
    session,
    content: `<main>
<section class="page-hero">
  <div class="eyebrow">How it works</div>
  <h1>One clear path from enrollment to task approval and certificate.</h1>
  <p>Designed so students know what happens next at every stage.</p>
</section>
<section class="section timeline">
  ${[
    ['01', 'Select a domain', 'Choose from the listed technology, data, design, or engineering pathways.'],
    ['02', 'Choose your route', 'Pick the Certificate, Project Based, or Comprehensive Program.'],
    ['03', 'Complete assigned task', 'Follow your task dashboard, build the project, and commit code evidence to GitHub.'],
    ['04', 'Submit & review', 'Submit your task implementation and evidence for reviewer evaluation; LinkedIn sharing is optional.'],
    ['05', 'Download & verify', 'After explicit task approval, access your GreyRocks certificate with a unique ID and QR verification.']
  ].map(x => `
    <article>
      <span>${x[0]}</span>
      <div>
        <h3>${x[1]}</h3>
        <p>${x[2]}</p>
      </div>
    </article>
  `).join('')}
</section>

<!-- Internship Journey (Interactive 8-Node Pipeline) -->
<section class="journey-section" id="internshipJourney">
  <div class="eyebrow">Internship Journey</div>
  <h2>INTERNSHIP JOURNEY</h2>
  <p class="lead">From application to certification — complete real-world projects, submit your work, and earn globally verifiable credentials.</p>

  <div class="journey-steps" id="journeySteps">
    <div class="journey-step active" data-step="0">
      <div class="step-num">01</div>
      <div class="step-label">Apply</div>
    </div>
    <span class="journey-arrow">&rarr;</span>
    <div class="journey-step" data-step="1">
      <div class="step-num">02</div>
      <div class="step-label">Review</div>
    </div>
    <span class="journey-arrow">&rarr;</span>
    <div class="journey-step" data-step="2">
      <div class="step-num">03</div>
      <div class="step-label">Offer Letter</div>
    </div>
    <span class="journey-arrow">&rarr;</span>
    <div class="journey-step" data-step="3">
      <div class="step-num">04</div>
      <div class="step-label">Get Tasks</div>
    </div>
    <span class="journey-arrow">&rarr;</span>
    <div class="journey-step" data-step="4">
      <div class="step-num">05</div>
      <div class="step-label">Code/Project</div>
    </div>
    <span class="journey-arrow">&rarr;</span>
    <div class="journey-step" data-step="5">
      <div class="step-num">06</div>
      <div class="step-label">Submit</div>
    </div>
    <span class="journey-arrow">&rarr;</span>
    <div class="journey-step" data-step="6">
      <div class="step-num">07</div>
      <div class="step-label">Evaluate</div>
    </div>
    <span class="journey-arrow">&rarr;</span>
    <div class="journey-step" data-step="7">
      <div class="step-num">08</div>
      <div class="step-label">Certify</div>
    </div>
  </div>

  <div class="journey-detail" id="journeyDetail">
    <div class="detail-eyebrow" id="journeyDetailEyebrow">STEP 1 – APPLY &amp; CHOOSE YOUR DOMAIN</div>
    <h3 id="journeyDetailTitle">Select Your Path &amp; Begin Your Journey</h3>
    <p id="journeyDetailDesc">Explore domains including AI, Web Dev, Data Science, and Cloud. Select the internship path that matches your career goals and submit your basic enrollment details.</p>
    <h4>WHAT HAPPENS HERE?</h4>
    <ul id="journeyDetailList">
      <li>Choose from the internship domains listed on HireeBridge</li>
      <li>Flexible 2 to 4 weeks or 1 month duration</li>
      <li>Instant enrollment confirmation</li>
      <li>Dedicated student account creation</li>
    </ul>
    <div class="journey-nav">
      <button type="button" id="journeyPrev" disabled>&larr; Prev</button>
      <span class="phase-label" id="journeyPhase">Phase 1 of 8</span>
      <button type="button" id="journeyNext">Next &rarr;</button>
    </div>
  </div>
</section>
${faq([
  ['How does enrollment work?', 'Choose a domain and plan, register, and complete payment. Confirmed payment grants access to your assigned domain task.'],
  ['How is my task assigned?', 'A paid enrollment receives the project and detailed requirements mapped to its selected domain and plan.'],
  ['How do I submit my work?', 'Use Submit Task in your student dashboard to provide your implementation repository and required evidence.'],
  ['Who reviews a submission?', 'An authorized HireeBridge reviewer evaluates the submitted task through the existing review workflow.'],
  ['When is a certificate issued?', 'After explicit approval of the submitted task; payment alone never issues it.']
])}
</main>`
  });
}

function certificatePage(session = null) {
  return layout({
    title: 'Internship Certificate | GreyRocks Credential | HireeBridge',
    description: 'See the student-specific fields on a GreyRocks certificate and learn when it becomes available.',
    active: '/certificate',
    session,
    content: `<main>
<section class="page-hero">
  <div class="eyebrow">Certificate preview</div>
  <h1>A minimal, verifiable internship credential.</h1>
  <p>The master certificate includes candidate name, domain, duration, issue date, unique credential ID, and GreyRocks QR verification.</p>
</section>
<section class="section certificate-show">
  <div class="certificate-large" style="position:relative;max-width:540px;margin:0 auto;" oncontextmenu="return false;">
    <div class="cert-shield" oncontextmenu="return false;"></div>
    <img src="/assets/sample-certificate.jpg" alt="Sample GreyRocks internship certificate" style="max-height:380px;object-fit:contain;" draggable="false" oncontextmenu="return false;">
  </div>
  <div>
    <div class="eyebrow">What your certificate contains</div>
    <h2>Student-specific credential details.</h2>
    <ul class="check-list">
      <li>Student full name</li>
      <li>Internship domain (e.g. Data Science)</li>
      <li>Program duration</li>
      <li>Issue date</li>
      <li>Unique credential ID</li>
      <li>Tamper-proof QR verification code</li>
    </ul>
    <a class="btn btn-dark" href="/checkout?plan=project&domain=data-science">Get Started &rarr;</a>
  </div>
</section>
${faq([
  ['What information appears on the certificate?', 'The student full name, internship domain, program duration, issue date, unique credential ID, and QR verification code.'],
  ['What is the credential ID?', 'It is the unique identifier displayed with an issued certificate and used to look up its verification record.'],
  ['What does the QR code do?', 'It points to the certificate verification destination so a viewer can check the credential online.'],
  ['When does a certificate become available?', 'After the student completes and submits the assigned task and the reviewer explicitly approves it.'],
  ['Can I download one before approval?', 'No. The student dashboard exposes certificate downloads after the task is approved and the certificate is issued.']
])}
</main>`
  });
}

function blogIndex(session = null) {
  return layout({
    title: 'Internship Blog | Certificates, Projects, Domains & Career Guides | HireeBridge',
    description: '20 comprehensive guides on internship certificates, portfolios, project evidence, and career readiness.',
    active: '/blog',
    session,
    content: `<main>
<section class="page-hero">
  <div class="eyebrow">Knowledge hub</div>
  <h1>Internship guides that answer the questions students actually search.</h1>
  <p>Long-form guides about internship certificates, project evidence, domains and credential verification.</p>
</section>
<section class="section blog-grid big-blog">
  ${blogTopics.map((t, i) => `
    <a class="blog-card" href="/blog/${t[1]}">
      <span>${String(i + 1).padStart(2, '0')} &middot; Internship guide</span>
      <h2>${esc(t[0])}</h2>
      <p>Explore practical advice around ${esc(t[2])}, documentation, verification and portfolio evidence.</p>
      <b>Read article &rarr;</b>
    </a>
  `).join('')}
</section>
${faq([
  ['What topics are covered in the HireeBridge blog?', 'The guide collection covers internship domains, task evidence, certificate details, and portfolio documentation.'],
  ['Are blog guides a substitute for my assigned task?', 'No. Follow the requirements in your dashboard assignment; blog articles provide general informational guidance.'],
  ['Where can I see the certificate workflow?', 'The How It Works and Certificate pages explain that a certificate follows submission and explicit task approval.']
])}</main>`
  });
}

function blogPage(slug, session = null) {
  const t = blogTopics.find(x => x[1] === slug);
  if (!t) return null;
  return layout({
    title: `${t[0]} | HireeBridge`,
    description: `${t[0]}. Practical guide covering ${t[2]}.`,
    active: `/blog/${slug}`,
    session,
    content: `<main>
<article class="article">
  <div class="eyebrow">Internship guide</div>
  <h1>${esc(t[0])}</h1>
  <p class="article-meta">Updated ${formatDate()} &middot; HireeBridge knowledge hub</p>
  ${article(t, t[2])}
  <div class="article-cta">
    <h3>Ready to choose a domain?</h3>
    <p>Explore the internship paths listed on HireeBridge and earn your verifiable GreyRocks credential.</p>
    <a class="btn btn-dark" href="/internships">Explore domains</a>
  </div>
</article>
${faq([
    [`What does “${t[0]}” cover?`, `This guide focuses on ${t[2]} and explains practical considerations for students.`],
    ['How should I use this information in my internship?', 'Use it as general guidance, then follow your assigned project requirements, implement your own work, and submit evidence for review.'],
    ['Does reading this guide issue a certificate?', 'No. A certificate is available only after the assigned task is submitted and explicitly approved.']
  ])}</main>`
  });
}

// Certificate ID safety: credential IDs are user-visible identifiers but also become
// certificate filenames. Normalize them before they can reach the filesystem so
// Windows path separators (e.g. \\ or /) can never turn part of an ID into a folder.
function normalizeCredentialId(rawId) {
  const raw = String(rawId || '').trim();
  if (!raw) return '';
  const normalized = raw
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .toUpperCase();
  return normalized;
}

async function generateUniqueCredentialId(domain) {
  const cleanDomain = String(domain || 'Data Science').replace(/[^a-zA-Z0-9\s]/g, ' ');
  const words = cleanDomain.trim().split(/\s+/).filter(Boolean);
  const rawPrefix = words.map(x => x[0]).join('').slice(0, 4);
  const prefix = normalizeCredentialId(rawPrefix) || 'GEN';
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 20; attempt++) {
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const id = normalizeCredentialId(`GR-${prefix}-${year}-${suffix}`);
    const exists = await db.getCertificateById(id);
    if (!exists) return id;
  }
  return normalizeCredentialId(`GR-${prefix}-${year}-${Date.now().toString(36).slice(-6)}`);
}
const generateCredentialId = generateUniqueCredentialId;

async function createCertificate({ name, domain, duration, issueDate, credentialId }) {
  const safeCredentialId = normalizeCredentialId(credentialId);
  if (!safeCredentialId) {
    throw new Error('A valid credential ID is required.');
  }

  // Ensure output directory exists before any generator runs
  fs.mkdirSync(GENERATED, { recursive: true });
  const jpgFile = path.resolve(GENERATED, `${safeCredentialId}.jpg`);
  const pdfFile = path.resolve(GENERATED, `${safeCredentialId}.pdf`);
  fs.mkdirSync(path.dirname(pdfFile), { recursive: true });

  const args = [
    CERT_SCRIPT,
    '--name', String(name || 'Candidate Name'),
    '--domain', String(domain || 'Data Science'),
    '--duration', String(duration || '4 Weeks'),
    '--date', String(issueDate || formatDate()),
    '--id', safeCredentialId,
    '--template', TEMPLATE,
    '--outdir', GENERATED
  ];

  let pySuccess = false;
  try {
    await new Promise((resolve, reject) => {
      execFile(PYTHON_EXE, args, { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
          console.error('Python generator error:', error.message, stderr);
          return reject(error);
        }
        console.log('Python certificate generated:', stdout ? stdout.trim() : '');
        resolve(stdout);
      });
    });
    if (fs.existsSync(jpgFile) && fs.existsSync(pdfFile)) {
      pySuccess = true;
    }
  } catch (pyErr) {
    console.warn('Python generator failed, using pdf-lib fallback:', pyErr.message);
  }

  if (!pySuccess) {
    // pdf-lib fallback
    const qrData = await QRCode.toDataURL(`${GREYROCKS_URL.replace(/\/$/, '')}/verification/${encodeURIComponent(safeCredentialId)}`, {
      margin: 1,
      width: 300,
      color: { dark: '#0B1F36', light: '#FFFFFF' }
    });
    const qrBuffer = Buffer.from(qrData.split(',')[1], 'base64');
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]);
    const bgBytes = await fs.promises.readFile(TEMPLATE);
    const bg = await pdfDoc.embedJpg(bgBytes);
    page.drawImage(bg, { x: 0, y: 0, width: 842, height: 595 });

    const font = await pdfDoc.embedFont('Helvetica');
    const bold = await pdfDoc.embedFont('Times-Bold');
    const scaleX = 842 / 2048, scaleY = 595 / 1448;
    const ink = rgb(11 / 255, 31 / 255, 54 / 255);

    const drawCentered = (text, xPx, yPx, size, fontObj) => {
      const w = fontObj.widthOfTextAtSize(text, size);
      page.drawText(text, { x: xPx * scaleX - w / 2, y: 595 - yPx * scaleY - size, font: fontObj, size, color: ink });
    };

    drawCentered(name, 1024, 640, 30 * scaleY, bold);
    const fields = [[duration, 345], [domain, 590], [issueDate, 820], [safeCredentialId, 1115]];
    for (const [text, x] of fields) drawCentered(String(text), x, 746, 10 * scaleY, font);

    const qr = await pdfDoc.embedPng(qrBuffer);
    page.drawImage(qr, { x: 1340 * scaleX, y: 595 - (1080 + 170) * scaleY, width: 170 * scaleX, height: 170 * scaleY });

    const pdf = await pdfDoc.save();
    fs.mkdirSync(path.dirname(pdfFile), { recursive: true });
    await fs.promises.writeFile(pdfFile, pdf);
  }

  // Verify both required files exist and are non-empty
  const jpgValid = fs.existsSync(jpgFile) && fs.statSync(jpgFile).size > 0;
  const pdfValid = fs.existsSync(pdfFile) && fs.statSync(pdfFile).size > 0;

  if (!jpgValid || !pdfValid) {
    throw new Error(
      `Certificate generation incomplete: both JPG and PDF must exist with size > 0. JPG: ${jpgValid ? 'valid' : 'missing/empty'}, PDF: ${pdfValid ? 'valid' : 'missing/empty'}`
    );
  }

  // Upload to Cloudflare R2 if configured
  if (r2.isConfigured()) {
    const uploadRes = await r2.uploadCertificateArtifacts({
      credentialId: safeCredentialId,
      pdfPath: pdfFile,
      jpgPath: jpgFile,
      reserveStorageFn: (id, bytes, limit) => db.reserveStorage(id, bytes, limit),
      releaseStorageFn: (id) => db.releaseStorageReservation(id),
      currentStorageBytesGetter: () => db.getTotalCertificateStorageBytes()
    });

    return {
      pdf: `/downloads/${safeCredentialId}.pdf`,
      jpg: `/downloads/${safeCredentialId}.jpg`,
      pdfKey: uploadRes.pdfKey,
      jpgKey: uploadRes.jpgKey,
      pdfSizeBytes: uploadRes.pdfSizeBytes,
      jpgSizeBytes: uploadRes.jpgSizeBytes,
      localJpgPath: jpgFile,
      localPdfPath: pdfFile
    };
  }

  return {
    pdf: `/downloads/${safeCredentialId}.pdf`,
    jpg: `/downloads/${safeCredentialId}.jpg`,
    pdfKey: null,
    jpgKey: null,
    pdfSizeBytes: fs.statSync(pdfFile).size,
    jpgSizeBytes: fs.statSync(jpgFile).size,
    localJpgPath: jpgFile,
    localPdfPath: pdfFile
  };
}

async function issueAndPersistCertificate({ name, email, domain, duration, issueDate, credentialId, orderId }) {
  const files = await createCertificate({ name, domain, duration, issueDate, credentialId });
  const certRecord = {
    credentialId,
    orderId,
    name,
    email: (email || '').trim().toLowerCase(),
    domain,
    duration,
    issueDate,
    status: 'issued',
    pdf: files.pdf,
    jpg: files.jpg,
    pdfKey: files.pdfKey || null,
    jpgKey: files.jpgKey || null,
    pdfSizeBytes: files.pdfSizeBytes || null,
    jpgSizeBytes: files.jpgSizeBytes || null
  };

  const saved = await db.createCertificate(certRecord);
  if (!saved) {
    // If DB persistence failed after R2 upload, roll back R2 objects to prevent orphan files
    if (files.pdfKey && files.jpgKey && r2.isConfigured()) {
      console.error(`DB persistence failed for ${credentialId}; rolling back uploaded R2 objects.`);
      await r2.deleteCertificateArtifacts(credentialId).catch(delErr => {
        console.error(`Failed to rollback R2 objects for ${credentialId}:`, delErr.message);
      });
    }
    // Also release the storage reservation if it remained active
    await db.releaseStorageReservation(credentialId).catch(relErr => {
      console.error(`Failed to release storage reservation for ${credentialId}:`, relErr.message);
    });
    throw new Error(`Failed to save certificate ${credentialId} in database.`);
  }

  // After successful DB persistence, clean up local temp files if R2 is active
  if (files.pdfKey && files.jpgKey) {
    try {
      if (files.localJpgPath && fs.existsSync(files.localJpgPath)) fs.unlinkSync(files.localJpgPath);
      if (files.localPdfPath && fs.existsSync(files.localPdfPath)) fs.unlinkSync(files.localPdfPath);
    } catch (cleanupErr) {
      console.warn(`Notice: Failed to clean up temp cert files for ${credentialId}:`, cleanupErr.message);
    }
  }

  return { ...certRecord, ...files };
}

const CASHFREE_ENV = String(process.env.CASHFREE_ENV || (process.env.NODE_ENV === 'development' ? 'sandbox' : 'production')).trim().toLowerCase();
const CASHFREE_API_BASE = CASHFREE_ENV === 'production'
  ? 'https://api.cashfree.com/pg'
  : CASHFREE_ENV === 'sandbox' ? 'https://sandbox.cashfree.com/pg' : null;
const CASHFREE_API_VERSION = process.env.CASHFREE_API_VERSION || '2025-01-01';
// All non-INR currencies currently configured in PPP_PRICING are on Cashfree's IPG list.
// Account-level international acceptance is still required and enforced by Cashfree at order creation.
const CASHFREE_INTERNATIONAL_CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY']);

function getCashfreeCallbackUrls(siteUrl = SITE_URL, environment = CASHFREE_ENV) {
  let base;
  try { base = new URL(siteUrl); } catch { throw new Error('SITE_URL must be a valid absolute URL.'); }
  if (base.username || base.password || base.search || base.hash || !['', '/'].includes(base.pathname)) {
    throw new Error('SITE_URL must contain only the HireeBridge origin.');
  }
  if (environment === 'production' && (
    base.protocol !== 'https:' || !['hireebridge.in', 'www.hireebridge.in'].includes(base.hostname.toLowerCase())
  )) {
    throw new Error('Production Cashfree requires SITE_URL=https://hireebridge.in.');
  }
  return {
    returnUrl: `${base.origin}/payment/return?order_id={order_id}`,
    notifyUrl: `${base.origin}/api/payment/webhook`
  };
}

function getCashfreeRuntimeConfig(environment = CASHFREE_ENV, siteUrl = SITE_URL) {
  const apiBase = environment === 'production'
    ? 'https://api.cashfree.com/pg'
    : environment === 'sandbox' ? 'https://sandbox.cashfree.com/pg' : null;
  return {
    environment,
    apiBase,
    callbackUrls: getCashfreeCallbackUrls(siteUrl, environment)
  };
}

function cashfreeConfigured() {
  if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY || !CASHFREE_API_BASE) return false;
  try { getCashfreeCallbackUrls(); return true; } catch { return false; }
}

async function cashfreeRequest(method, apiPath, body) {
  if (!CASHFREE_API_BASE) throw new Error('CASHFREE_ENV must be production or sandbox.');
  const data = body ? JSON.stringify(body) : undefined;
  const response = await fetch(`${CASHFREE_API_BASE}${apiPath}`, {
    method,
    headers: {
      'x-client-id': process.env.CASHFREE_APP_ID || '',
      'x-client-secret': process.env.CASHFREE_SECRET_KEY || '',
      'x-api-version': CASHFREE_API_VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: data,
    signal: AbortSignal.timeout(15000)
  });
  const raw = await response.text();
  let parsed = {};
  try { parsed = raw ? JSON.parse(raw) : {}; } catch { /* Provider errors are intentionally normalized below. */ }
  if (!response.ok) {
    const error = new Error(`Cashfree payment request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return parsed;
}

function verifyCashfreeWebhook(rawBody, signature, timestamp) {
  if (!process.env.CASHFREE_SECRET_KEY || !Buffer.isBuffer(rawBody) || !signature || !timestamp) return false;
  const expected = crypto.createHmac('sha256', process.env.CASHFREE_SECRET_KEY)
    .update(String(timestamp))
    .update(rawBody)
    .digest('base64');
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(String(signature));
  return expectedBytes.length === suppliedBytes.length && crypto.timingSafeEqual(expectedBytes, suppliedBytes);
}

async function findOrderByGatewayId(gatewayOrderId) {
  const orders = await db.getAllOrders();
  return orders.find(o => (o.gatewayOrderId || o.gateway_order_id) === gatewayOrderId || o.id === gatewayOrderId) || null;
}

async function confirmCashfreePayment(order) {
  const gatewayOrderId = order.gatewayOrderId || order.gateway_order_id;
  const [gatewayOrder, payments] = await Promise.all([
    cashfreeRequest('GET', `/orders/${encodeURIComponent(gatewayOrderId)}`),
    cashfreeRequest('GET', `/orders/${encodeURIComponent(gatewayOrderId)}/payments`)
  ]);
  if (gatewayOrder.order_id !== gatewayOrderId || gatewayOrder.order_status !== 'PAID' || Number(gatewayOrder.order_amount) !== Number(order.amount) || gatewayOrder.order_currency !== order.currency) {
    return { ok: false, error: 'Payment details do not match this order.' };
  }
  const successfulPayment = (Array.isArray(payments) ? payments : []).find(p =>
    p.payment_status === 'SUCCESS' && p.order_id === gatewayOrderId
  );
  if (successfulPayment && (Number(successfulPayment.payment_amount) !== Number(order.amount) || successfulPayment.payment_currency !== order.currency)) {
    return { ok: false, error: 'Payment details do not match this order.' };
  }
  const payment = successfulPayment;
  if (!payment) {
    const attempts = Array.isArray(payments) ? payments : [];
    const hasPending = attempts.some(p => p.payment_status === 'PENDING');
    if (hasPending || attempts.length === 0) return { ok: false, pending: true, error: 'Payment is not confirmed yet. If you completed payment, please wait a moment and retry.' };
    return { ok: false, pending: false, error: 'Payment was not completed. You can return to checkout and try again.' };
  }
  return { ok: true, paymentId: String(payment.cf_payment_id || payment.payment_id || ''), gatewayOrderId };
}

async function markOrderPaidAndFulfill(order, paymentId, gatewayOrderId, dependencies = {}) {
  if (order.status === 'paid') return { alreadyHandled: true, order };
  const claimed = await db.claimOrderPaid(order.id, { paymentId, gatewayOrderId });
  if (!claimed?.claimed) return { alreadyHandled: !claimed?.inProgress, inProgress: !!claimed?.inProgress, order: claimed?.order || order };
  Object.assign(order, claimed.order || {}, { status: 'paid' });
  try {
    const assignment = assignmentForOrder(order);
    if (assignment) {
      const getTask = dependencies.getTaskByOrderId || (id => db.getTaskByOrderId(id));
      const createTask = dependencies.createTask || (task => db.createTask(task));
      const existingTask = await getTask(order.id);
      if (!existingTask) {
        const task = await createTask({
          id: `task-${crypto.randomBytes(4).toString('hex')}`,
          email: order.email,
          orderId: order.id,
          plan: resolvePlanKey(order.plan),
          domain: assignment.project.domain,
          title: assignment.title,
          description: assignment.description,
          dueDate: order.duration || 'Self-paced',
          status: 'assigned'
        });
        if (!task) throw new Error('Could not assign the paid internship task.');
      }
    }
    await db.updateOrder(order.id, { status: 'paid' });
    return { alreadyHandled: false, order };
  } catch (err) {
    // Allow a later verified callback to retry interrupted fulfillment.
    await db.updateOrder(order.id, { status: 'created' });
    throw err;
  }
}

async function sendMail(to, subject, text, html = null, attachments = []) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return { sent: false, reason: 'SMTP not configured' };
  const dateKey = new Date().toISOString().slice(0, 10);
  const dailyLimit = Number(process.env.EMAIL_DAILY_LIMIT || 300);
  const reserved = await db.reserveDailyMailSlot(dailyLimit, dateKey);
  if (!reserved) return reserved === false
    ? { sent: false, status: 'limit_reached', reason: 'Daily email limit reached' }
    : { sent: false, status: 'failed', reason: 'Mail quota is temporarily unavailable' };
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    const defaultSender = 'HireeBridge <sender@hireebridge.in>';
    const fromAddress = (process.env.MAIL_FROM && process.env.MAIL_FROM.trim()) || defaultSender || process.env.SMTP_USER;
    const opts = {
      from: fromAddress,
      to,
      subject,
      text: text || ''
    };
    if (html) opts.html = html;
    if (attachments && attachments.length) opts.attachments = attachments;
    await transporter.sendMail(opts);
    return { sent: true };
  } catch (e) {
    await db.releaseDailyMailSlot(dateKey);
    console.error('Mail delivery failed:', e.code || e.name || 'SMTP error');
    return { sent: false, status: 'failed', reason: 'SMTP delivery failed' };
  }
}

function certificateEmailContent(certificate) {
  const credentialId = certificate.credentialId || certificate.credential_id;
  const pdfPath = certificate.pdf || `/downloads/${credentialId}.pdf`;
  const jpgPath = certificate.jpg || `/downloads/${credentialId}.jpg`;
  const pdfUrl = /^https?:\/\//i.test(pdfPath) ? pdfPath : `${SITE_URL}${pdfPath.startsWith('/') ? '' : '/'}${pdfPath}`;
  const jpgUrl = /^https?:\/\//i.test(jpgPath) ? jpgPath : `${SITE_URL}${jpgPath.startsWith('/') ? '' : '/'}${jpgPath}`;
  const verifyUrl = `https://greyrocks.in/verification/${encodeURIComponent(credentialId)}`;
  const studentName = certificate.name || 'Candidate';
  const domain = certificate.domain || 'Internship Program';
  const issueDate = certificate.issueDate || certificate.issue_date || formatDate();
  const subject = `Congratulations - your ${domain} certificate is ready | HireeBridge`;
  const text = `Dear ${studentName},\n\nCongratulations. Your ${domain} internship at GreyRocks has been reviewed and approved, and your certificate is now available.\n\nCredential ID: ${credentialId}\nIssue date: ${issueDate}\n\nDownload certificate (PDF): ${pdfUrl}\nDownload certificate (JPG): ${jpgUrl}\nVerify credential: ${verifyUrl}\n\nYou can also sign in at ${SITE_URL}/dashboard and open the Internship Certificate tab.\n\nRegards,\nHireeBridge Team`;
  const html = `<div style="font-family:Arial,sans-serif;color:#183047;max-width:640px;margin:0 auto;line-height:1.65"><div style="padding:22px 26px;background:#0b1f36;color:#fff"><strong style="font-size:20px">HireeBridge</strong><div style="font-size:12px;color:#dbe7ee">GreyRocks Internship · HireeBridge</div></div><div style="padding:26px;border:1px solid #dbe4ec"><p style="font-size:13px;color:#64748b">CERTIFICATE ISSUED</p><h1 style="font-size:22px">Congratulations, ${esc(studentName)}</h1><p>Your <strong>${esc(domain)}</strong> internship at GreyRocks has been reviewed and approved, and your certificate is now available.</p><p><strong>Credential ID:</strong> ${esc(credentialId)}<br><strong>Issue date:</strong> ${esc(issueDate)}</p><p><a href="${esc(pdfUrl)}">Download PDF</a> &nbsp; <a href="${esc(jpgUrl)}">Download JPG</a></p><p><a href="${esc(verifyUrl)}">Verify credential</a> · <a href="${esc(`${SITE_URL}/dashboard`)}">Open dashboard</a></p><p>Regards,<br><strong>HireeBridge Team</strong></p></div></div>`;
  return { subject, text, html };
}

async function sendCertificateEmail(certificate, mailer = sendMail, statusUpdater = db.updateCertificateEmailStatus.bind(db)) {
  const credentialId = certificate?.credentialId || certificate?.credential_id;
  if (!credentialId || !certificate?.email) return { sent: false, status: 'failed', reason: 'Certificate recipient data is incomplete.' };
  const content = certificateEmailContent(certificate);
  let result;
  try { result = await mailer(certificate.email, content.subject, content.text, content.html); }
  catch (err) { result = { sent: false, status: 'failed', reason: 'SMTP delivery failed' }; }
  const status = result?.sent ? 'sent' : result?.status === 'limit_reached' ? 'limit_reached' : 'failed';
  try { await statusUpdater(credentialId, { status, error: result?.sent ? '' : (result?.reason || 'SMTP delivery failed') }); }
  catch (err) { console.error('Certificate email status update failed:', err.code || err.name || 'database error'); }
  return { ...result, status };
}

async function sendOfferLetterEmail(order, mailer = sendMail, statusUpdater = db.updateOfferLetterEmailStatus.bind(db)) {
  if (!order?.id || !order?.email || order.status !== 'paid') return { sent: false, status: 'failed', reason: 'Paid enrollment is required.' };
  const dashboardUrl = `${SITE_URL}/dashboard`;
  const planKey = resolvePlanKey(order.plan);
  const planName = plans[planKey]?.name || 'Project Based Internship';
  const domain = order.domain || 'Internship';
  const assignment = assignmentForOrder(order);
  const repoUrl = assignment?.project.repo;
  const reportUrl = `${SITE_URL}/assets/templates/HireeBridge_College_Project_Report_Template.docx`;
  const pptUrl = `${SITE_URL}/assets/templates/HireeBridge_Seminar_Presentation_Deck.pptx`;
  const subject = `Your ${domain} offer letter and program details | HireeBridge`;
  const text = `Dear ${order.name || 'Student'},\n\nCongratulations on your selection for the HireeBridge ${domain} virtual internship at GreyRocks. Your enrollment is confirmed for the ${planName} plan.\n\nStart here:\n1. Sign in and read your assigned task: ${dashboardUrl}\n${planKey === 'certificate' ? '2. Build the project yourself from the task specification. This plan does not include source code or a reference repository.\n' : `2. Open the domain source repository, review its licence, and use it as a starting point for your own implementation: ${repoUrl}\n`}${planKey === 'comprehensive' ? `3. Download the editable report and presentation from Project Resources: ${reportUrl} | ${pptUrl}\n` : ''}${planKey === 'comprehensive' ? '4' : '3'}. Push your work to your GitHub repository, then submit the link and test evidence through your dashboard. Your certificate is issued after reviewer approval.\n\nYour Official Offer Letter and enrolled program details are in the dashboard: ${dashboardUrl}\nEnrollment reference: ${order.id}\n\nRegards,\nHireeBridge Team`;
  const resourceInstructions = planKey === 'certificate' ? 'Build the project independently from the task brief; no source repository is included.' : `Use the domain source repository as a starting point, follow its licence, and publish your own implementation: <a href="${esc(repoUrl)}">${esc(assignment?.project.title || domain)} source repository</a>.`;
  const html = `<div style="font-family:Arial,sans-serif;color:#183047;max-width:640px;margin:0 auto;line-height:1.65"><div style="padding:22px 26px;background:#0b1f36;color:#fff;border-radius:12px 12px 0 0"><strong style="font-size:20px">HireeBridge</strong><div style="font-size:12px;color:#dbe7ee">GreyRocks Internship · HireeBridge</div></div><div style="padding:26px;border:1px solid #dbe4ec;border-top:0;border-radius:0 0 12px 12px"><p style="font-size:13px;color:#64748b;margin:0 0 8px">PROGRAM ENROLLMENT CONFIRMED</p><h1 style="font-size:22px">Congratulations, ${esc(order.name || 'Student')}</h1><p>Your selection for the HireeBridge <strong>${esc(domain)}</strong> virtual internship at GreyRocks is confirmed.</p><p><strong>Plan:</strong> ${esc(planName)}<br><strong>Enrollment:</strong> ${esc(order.id)}</p><h2 style="font-size:16px">Your next steps</h2><ol><li><a href="${esc(dashboardUrl)}">Sign in to your dashboard</a> and read your assigned task.</li><li>${resourceInstructions}</li>${planKey === 'comprehensive' ? `<li><a href="${esc(reportUrl)}">Download the Word report template</a> · <a href="${esc(pptUrl)}">Download the presentation deck</a></li>` : ''}<li>Build and test your implementation, push it to your GitHub repository, and submit the link with evidence. A certificate is issued after reviewer approval.</li></ol><p><a href="${esc(dashboardUrl)}" style="display:inline-block;padding:11px 16px;background:#0d6e6e;color:#fff;text-decoration:none;border-radius:7px">Open student dashboard</a></p><p style="margin-top:24px">Regards,<br><strong>HireeBridge Team</strong></p></div></div>`;
  let result;
  try { result = await mailer(order.email, subject, text, html); }
  catch (err) { result = { sent: false, status: 'failed', reason: 'SMTP delivery failed' }; }
  const status = result?.sent ? 'sent' : result?.status === 'limit_reached' ? 'limit_reached' : 'failed';
  try { await statusUpdater(order.id, { status, error: result?.sent ? '' : (result?.reason || 'SMTP delivery failed') }); }
  catch (err) { console.error('Offer letter email status update failed:', err.code || err.name || 'database error'); }
  return { ...result, status };
}

// ==========================================
// ROUTES & HTTP CONTROLLERS
// ==========================================

// Core Navigation
app.get('/', async (req, res) => {
  try {
    const [programPrices, stats] = await Promise.all([db.getProgramPrices(), getCachedPublicStats()]);
    return res.send(home(getSession(req), req.visitorGeo, programPrices, stats));
  }
  catch (err) { console.error('Homepage pricing load failed:', err.message); return res.status(503).send('Pricing is temporarily unavailable. Please retry shortly.'); }
});
app.get('/pricing', async (req, res) => {
  try { return res.send(pricingPage(getSession(req), req.visitorGeo, await db.getProgramPrices())); }
  catch (err) { console.error('Pricing page load failed:', err.message); return res.status(503).send('Pricing is temporarily unavailable. Please retry shortly.'); }
});
app.get('/internships', (req, res) => res.send(internshipsPage(getSession(req))));
app.get('/how-it-works', (req, res) => res.send(howItWorksPage(getSession(req))));
app.get('/certificate', (req, res) => res.send(certificatePage(getSession(req))));
app.get('/blog', (req, res) => res.send(blogIndex(getSession(req))));
app.get('/blog/:slug', (req, res) => {
  const p = blogPage(req.params.slug, getSession(req));
  if (!p) return res.status(404).send(layout({ title: 'Not Found | HireeBridge', description: 'Page not found', content: '<main><section class="page-hero"><h1>Article not found</h1><a class="btn btn-dark" href="/blog">Back to blog</a></section></main>' }));
  res.send(p);
});

// Legal Pages (Full Defensible Legal Language)
app.get('/privacy', (req, res) => res.send(privacyPolicyPage(getSession(req))));
app.get('/terms', (req, res) => res.send(termsOfServicePage(getSession(req))));
app.get('/refund', (req, res) => res.send(refundPolicyPage(getSession(req))));
app.get('/about', (req, res) => res.send(aboutPage(getSession(req))));
app.get('/contact', (req, res) => res.send(contactPage(getSession(req))));

// Redirect standalone register to pricing
app.get('/register', (req, res) => res.redirect('/pricing'));

// Checkout Page
app.get('/checkout', async (req, res) => {
  try { return res.send(checkoutPage(req, getSession(req), await db.getProgramPrices())); }
  catch (err) { console.error('Checkout pricing load failed:', err.message); return res.status(503).send('Pricing is temporarily unavailable. Please retry shortly.'); }
});

app.get('/payment/return', (req, res) => {
  const orderId = String(req.query.order_id || '').replace(/[<>"'&]/g, '');
  res.type('html').send(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verifying payment | HireeBridge</title><body style="font:16px system-ui;max-width:620px;margin:12vh auto;padding:24px;color:#0b1f36"><h1>Checking your payment</h1><p id="status">Please wait while we confirm the payment securely.</p><p><a href="/dashboard">Open your dashboard</a></p><script>
    (async function(){
      const status=document.getElementById('status');
      try {
        const response=await fetch('/api/payment/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({gatewayOrderId:${JSON.stringify(orderId)}})});
        const data=await response.json();
        if(response.ok && data.ok){status.textContent='Payment confirmed. Redirecting to your dashboard…';setTimeout(()=>location.href='/dashboard',900);return;}
        status.textContent=data.error||'Payment is not confirmed yet. If you completed payment, wait a moment and refresh this page.';
      } catch(e) { status.textContent='We could not confirm your payment right now. Please refresh this page in a moment.'; }
    })();
  </script></body></html>`);
});

// Login Page & Auth with Strong Brute-Force Rate Limiting
app.get('/login', (req, res) => {
  const session = getSession(req);
  if (session) {
    if (session.role === 'admin') return res.redirect('/admin');
    return res.redirect('/dashboard');
  }
  const resetSuccess = req.query.reset === 'success' ? 'Password reset successful. Please sign in with your new password.' : '';
  res.send(loginPage('', null, resetSuccess));
});

// Native fallback form submission (Strict POST, rate limited, protects against brute-force)
app.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const clientIp = getClientIp(req);

  // Check rate limit BEFORE database lookup and password hashing
  const throttle = checkLoginThrottle(clientIp, email);
  if (throttle.throttled) {
    res.set('Retry-After', String(throttle.retryAfter));
    return res.status(429).send(loginPage('Too many login attempts. Please try again later.', null));
  }

  if (!email || !password) return res.send(loginPage('Please provide both email and password', null));

  const user = await db.getUserByEmail(email);
  if (!user) {
    recordFailedLogin(clientIp, email);
    return res.send(loginPage('Invalid email or password', null));
  }

  if (user.deleted_at) {
    return res.send(loginPage('This account has been deactivated. Please contact support.', null));
  }

  const hash = db.hashPassword(password);
  if (hash !== user.password) {
    recordFailedLogin(clientIp, email);
    return res.send(loginPage('Invalid email or password', null));
  }

  // Authentication succeeded - clear failure state
  recordSuccessfulLogin(clientIp, email);
  setSession(res, user);
  if (user.role === 'admin') return res.redirect('/admin');
  return res.redirect('/dashboard');
});

// JSON Auth API endpoint (Strict POST, rate limited, returns 429 when throttled)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const clientIp = getClientIp(req);

  // Check rate limit BEFORE database lookup and password hashing
  const throttle = checkLoginThrottle(clientIp, email);
  if (throttle.throttled) {
    res.set('Retry-After', String(throttle.retryAfter));
    return res.status(429).json({
      error: 'Too many login attempts. Please try again later.',
      retryAfter: throttle.retryAfter
    });
  }

  if (!email || !password) return res.status(400).json({ error: 'Please enter both email and password' });

  const user = await db.getUserByEmail(email);
  if (!user) {
    recordFailedLogin(clientIp, email);
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (user.deleted_at) {
    return res.status(403).json({ error: 'This account has been deactivated. Please contact support.' });
  }

  const hash = db.hashPassword(password);
  if (hash !== user.password) {
    recordFailedLogin(clientIp, email);
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Authentication succeeded - clear failure state
  recordSuccessfulLogin(clientIp, email);
  setSession(res, user);
  const redirect = user.role === 'admin' ? '/admin' : '/dashboard';
  res.json({ ok: true, redirect, role: user.role });
});

// ==========================================
// SECURE PASSWORD RESET ROUTES
// ==========================================

// GET /forgot-password
app.get('/forgot-password', (req, res) => {
  res.send(forgotPasswordPage());
});

// POST /forgot-password
app.post('/forgot-password', async (req, res) => {
  const genericResponse = 'If an account exists for that email, we’ve sent a password reset link.';
  const email = String(req.body?.email || '').trim().toLowerCase();
  const clientIp = getClientIp(req);

  // Basic format validation
  if (!email || !email.includes('@')) {
    recordForgotPasswordAttempt(clientIp, null, false);
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ ok: true, message: genericResponse });
    }
    return res.send(forgotPasswordPage(genericResponse));
  }

  // Check rate limit BEFORE database lookup and BEFORE email dispatch
  const throttle = checkForgotPasswordRateLimit(clientIp, email);
  if (!throttle.allowed) {
    // Record this attempt so abusive traffic accumulates against limits
    recordForgotPasswordAttempt(clientIp, email, false);

    // IP limit or Email hourly limit hit -> HTTP 429
    if (throttle.throttledBy === 'ip' || throttle.throttledBy === 'email_limit') {
      res.set('Retry-After', String(throttle.retryAfter));
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(429).json({
          ok: false,
          error: 'Too many requests. Please try again later.',
          message: genericResponse,
          retryAfter: throttle.retryAfter
        });
      }
      return res.status(429).send(forgotPasswordPage(genericResponse));
    }

    // Email burst cooldown hit (1 email per 5 minutes) -> HTTP 200 with generic response (suppress email)
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ ok: true, message: genericResponse });
    }
    return res.send(forgotPasswordPage(genericResponse));
  }

  // Record allowed request attempt
  recordForgotPasswordAttempt(clientIp, email, false);

  try {
    const user = await db.getUserByEmail(email);

    // Only process if user exists, is not deactivated, and is a student (do not reset configured admin account)
    if (user && user.role !== 'admin' && !user.deleted_at) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const tokenMinutes = Number(process.env.PASSWORD_RESET_TOKEN_MINUTES) || 30;
      const expiresAt = new Date(Date.now() + tokenMinutes * 60 * 1000);
      const tokenId = 'prt-' + crypto.randomBytes(8).toString('hex');

      const created = await db.createPasswordResetToken({
        id: tokenId,
        userId: user.id,
        tokenHash,
        expiresAt
      });

      if (created) {
        const resetUrl = `${SITE_URL}/reset-password?token=${rawToken}`;
        const firstName = user.name ? esc(user.name.split(' ')[0]) : 'Candidate';

        const emailSubject = 'Reset your HireeBridge password';
        const emailText = `Hello ${firstName},\n\nWe received a request to reset the password for your HireeBridge account.\n\nYou can reset your password by opening the link below:\n${resetUrl}\n\nLink expires in 30 minutes.\n\nIf you did not request this password reset, you can safely ignore this email.\n\nSupport:\nhelp@hireebridge.in\n\n— HireeBridge Team`;

        const emailHtml = `<!doctype html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;padding:24px;background:#f5f7fa;color:#1d2939;">
  <div style="max-width:540px;margin:0 auto;background:#ffffff;border:1px solid #eaecf0;border-radius:16px;padding:36px;box-shadow:0 4px 16px rgba(0,0,0,0.04);">
    <div style="margin-bottom:24px;text-align:center;">
      <img src="${SITE_URL}/brand/hireebridge-logo.png" alt="HireeBridge" width="48" height="48" style="vertical-align:middle;">
      <h2 style="margin:12px 0 4px;font-size:22px;color:#0b1f36;">HireeBridge</h2>
    </div>
    <h3 style="margin:0 0 16px;font-size:18px;color:#0b1f36;">Reset your password</h3>
    <p style="font-size:14px;line-height:1.6;color:#475467;margin:0 0 16px;">Hello ${firstName},</p>
    <p style="font-size:14px;line-height:1.6;color:#475467;margin:0 0 24px;">We received a request to reset your password. Click the button below to set a new password for your HireeBridge student workspace:</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${resetUrl}" style="background:#0b1f36;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;">Reset Password</a>
    </div>
    <p style="font-size:13px;line-height:1.6;color:#475467;margin:20px 0 8px;">Or copy and paste this link into your browser:</p>
    <p style="font-size:12px;line-height:1.5;color:#0d6e6e;word-break:break-all;background:#f8fafc;padding:10px;border-radius:8px;border:1px solid #e2e8f0;margin:0 0 20px;">${resetUrl}</p>
    <p style="font-size:12px;color:#667085;margin:0 0 8px;">⏱️ Link expires in 30 minutes.</p>
    <p style="font-size:12px;color:#667085;margin:0 0 24px;">If you did not request this password reset, you can safely ignore this email.</p>
    <hr style="border:none;border-top:1px solid #eaecf0;margin:24px 0;">
    <p style="font-size:11px;color:#98a2b3;margin:0;text-align:center;">Need help? Contact <a href="mailto:help@hireebridge.in" style="color:#0d6e6e;">help@hireebridge.in</a></p>
  </div>
</body>
</html>`;

        const mailResult = await sendMail(user.email, emailSubject, emailText, emailHtml);
        if (!mailResult || !mailResult.sent) {
          console.error('[Forgot Password] Email delivery failed:', mailResult ? mailResult.reason : 'unknown error');
          // Safely invalidate token so unused undelivered token does not hang
          await db.markPasswordResetTokenUsed(tokenHash, user.id);
        } else {
          // Record successful email dispatch for burst cooldown tracking
          recordForgotPasswordAttempt(clientIp, email, true);
        }
      }
    }
  } catch (err) {
    console.error('[Forgot Password Error]:', err.message);
  }

  // ALWAYS return the exact same generic message regardless of existence
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.json({ ok: true, message: genericResponse });
  }
  return res.send(forgotPasswordPage(genericResponse));
});

// GET /reset-password
app.get('/reset-password', async (req, res) => {
  const rawToken = String(req.query.token || '').trim();
  const genericInvalid = 'This password reset link is invalid or has expired.';

  if (!rawToken || rawToken.length < 32 || !/^[0-9a-fA-F]+$/.test(rawToken)) {
    return res.send(resetPasswordPage({ error: genericInvalid, valid: false }));
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenRecord = await db.getPasswordResetToken(tokenHash);

  if (!tokenRecord) {
    return res.send(resetPasswordPage({ error: genericInvalid, valid: false }));
  }

  if (tokenRecord.used_at) {
    return res.send(resetPasswordPage({ error: genericInvalid, valid: false }));
  }

  if (new Date(tokenRecord.expires_at).getTime() <= Date.now()) {
    return res.send(resetPasswordPage({ error: genericInvalid, valid: false }));
  }

  return res.send(resetPasswordPage({ token: rawToken, valid: true }));
});

// POST /reset-password
app.post('/reset-password', async (req, res) => {
  const genericInvalid = 'This password reset link is invalid or has expired.';
  const { token, password, confirmPassword } = req.body || {};
  const rawToken = String(token || '').trim();

  if (!rawToken || rawToken.length < 32 || !/^[0-9a-fA-F]+$/.test(rawToken)) {
    return res.send(resetPasswordPage({ error: genericInvalid, valid: false }));
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenRecord = await db.getPasswordResetToken(tokenHash);

  if (!tokenRecord || tokenRecord.used_at || new Date(tokenRecord.expires_at).getTime() <= Date.now()) {
    return res.send(resetPasswordPage({ error: genericInvalid, valid: false }));
  }

  // Password validation
  if (!password || password.length < 8) {
    return res.send(resetPasswordPage({
      token: rawToken,
      error: 'Password must be at least 8 characters long.',
      valid: true
    }));
  }

  if (password !== confirmPassword) {
    return res.send(resetPasswordPage({
      token: rawToken,
      error: 'Passwords do not match. Please re-enter.',
      valid: true
    }));
  }

  // 1. Hash new password using existing db.hashPassword
  const hashedPassword = db.hashPassword(password);

  // 2. Atomically update password and invalidate reset tokens in a single transaction
  const resetResult = await db.resetPasswordWithToken({
    tokenHash,
    userId: tokenRecord.user_id,
    newHashedPassword: hashedPassword
  });

  if (!resetResult || !resetResult.success) {
    console.error('[Reset Password Transaction Failed]:', resetResult ? resetResult.reason : 'unknown error');
    return res.send(resetPasswordPage({ error: genericInvalid, valid: false }));
  }

  // 3. Invalidate existing sessions for this user
  invalidateUserSessions(tokenRecord.user_id);

  // 4. Redirect to /login with success message
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.json({
      ok: true,
      message: 'Password reset successful. Please sign in with your new password.',
      redirect: '/login?reset=success'
    });
  }

  return res.redirect('/login?reset=success');
});

// Logout
app.get('/logout', (req, res) => {
  const cookies = parseCookies(req);
  if (cookies.hb_session) sessions.delete(cookies.hb_session);
  res.setHeader('Set-Cookie', 'hb_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  res.redirect('/login');
});

// Student Dashboard (Protected)
app.get('/dashboard', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.redirect('/login');
  await dashboardPage(req, res, session);
});

app.post('/api/demo/student/enrollment', async (req, res) => {
  const session = getSession(req);
  const localDemoEnabled = isLocalDemoMode();
  if (!localDemoEnabled || !session || session.role !== 'student' || String(session.email || '').toLowerCase() !== DEMO_STUDENT_EMAIL) {
    return res.status(404).json({ ok: false, error: 'Not found.' });
  }

  const selectedPlan = String(req.body?.plan || '');
  const selectedDomain = domains.find(([, slug]) => slug === String(req.body?.domain || ''));
  if (!Object.prototype.hasOwnProperty.call(plans, selectedPlan) || !selectedDomain) {
    return res.status(400).json({ ok: false, error: 'Choose a valid plan and internship domain.' });
  }

  const order = (await db.getUserOrders(session.email) || []).find(item => item.id === DEMO_STUDENT_ORDER_ID);
  if (!order || order.status !== 'paid') return res.status(404).json({ ok: false, error: 'Demo enrollment is unavailable.' });

  const currentPrices = await db.getProgramPrices();
  const selectedPrice = currentPrices.find(item => item.planId === selectedPlan);
  if (!selectedPrice) return res.status(503).json({ ok: false, error: 'Demo plan pricing is unavailable.' });
  const updatedOrder = await db.updateOrder(DEMO_STUDENT_ORDER_ID, {
    plan: selectedPlan,
    domain: selectedDomain[0],
    amount: selectedPrice.amount
  });
  if (!updatedOrder) return res.status(503).json({ ok: false, error: 'Could not update the local demo enrollment.' });

  const assignment = assignmentForOrder(updatedOrder);
  if (assignment) {
    const existingTask = await db.getTaskByOrderId(DEMO_STUDENT_ORDER_ID);
    if (existingTask) {
      await db.updateLocalTaskAssignment(DEMO_STUDENT_ORDER_ID, {
        plan: selectedPlan,
        domain: selectedDomain[0],
        title: assignment.title,
        description: assignment.description
      });
    } else {
      await db.createTask({
        id: `task-demo-${crypto.randomBytes(4).toString('hex')}`,
        email: session.email,
        orderId: DEMO_STUDENT_ORDER_ID,
        plan: selectedPlan,
        domain: selectedDomain[0],
        title: assignment.title,
        description: assignment.description,
        dueDate: order.duration || '4 Weeks',
        status: 'assigned'
      });
    }
  }

  return res.json({ ok: true });
});

// Admin Panel (Protected, requires role 'admin')
app.get('/admin', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.redirect('/login');
  if (await databaseReady === false) return res.status(503).send('Administrator data is temporarily unavailable. Please retry shortly.');
  await adminPage(req, res, session);
});

// Admin-managed program prices
app.get('/api/admin/prices', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ ok: false, error: 'Forbidden' });
  if (await databaseReady === false) return res.status(503).json({ ok: false, error: 'Pricing storage is temporarily unavailable.' });
  try {
    res.set('Cache-Control', 'no-store');
    return res.json({ ok: true, prices: await db.getProgramPrices() });
  } catch (err) {
    console.error('Admin price read failed:', err.message);
    return res.status(503).json({ ok: false, error: 'Pricing storage is temporarily unavailable.' });
  }
});

app.put('/api/admin/prices/:planId', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ ok: false, error: 'Forbidden' });
  if (await databaseReady === false) return res.status(503).json({ ok: false, error: 'Pricing storage is temporarily unavailable.' });
  const planId = String(req.params.planId || '').trim();
  const amount = req.body?.amount;
  if (!['certificate', 'project', 'comprehensive'].includes(planId)) {
    return res.status(404).json({ ok: false, error: 'Unknown program.' });
  }
  if (req.body?.currency !== 'INR' || !isValidProgramPrice(amount)) {
    return res.status(400).json({ ok: false, error: 'Enter a positive INR price up to ₹1,000,000 with no more than two decimal places.' });
  }
  try {
    const price = await db.updateProgramPrice(planId, amount);
    if (!price) return res.status(503).json({ ok: false, error: 'Price could not be updated.' });
    await db.createAuditLog({
      action: 'PROGRAM_PRICE_UPDATED', adminEmail: session.email, targetId: planId,
      targetType: 'program_price', details: { amount, currency: 'INR' }
    });
    res.set('Cache-Control', 'no-store');
    return res.json({ ok: true, price });
  } catch (err) {
    console.error('Admin price update failed:', err.message);
    return res.status(503).json({ ok: false, error: 'Pricing storage is temporarily unavailable.' });
  }
});

// Checkout API (Creates User Account + Sets Session + Creates Order with authoritative database pricing)
app.post('/api/checkout', async (req, res) => {
  const { name, email, password, domain, duration, plan, phone, currencyPreference } = req.body || {};
  if (await databaseReady === false) return res.status(503).json({ error: 'Enrollment is temporarily unavailable. Please retry shortly.' });
  if (!name || !email || !domain || !duration) {
    return res.status(400).json({ error: 'Missing required enrollment details' });
  }
  const normalizedPhone = String(phone || '').replace(/\D/g, '');
  if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
    return res.status(400).json({ error: 'Enter a valid phone number to continue with Cashfree checkout.' });
  }

  const chosenKey = resolvePlanKey(plan);
  if (!plans[plan] && plan !== 'starter' && plan !== 'direct') {
    return res.status(400).json({ ok: false, error: 'Choose a valid program to continue.' });
  }
  const planDetails = plans[chosenKey];
  let programPrices;
  try { programPrices = await db.getProgramPrices(); }
  catch (err) {
    console.error('Checkout price lookup failed:', err.message);
    return res.status(503).json({ ok: false, error: 'Pricing is temporarily unavailable. Please retry shortly.' });
  }
  const domainName = domains.find(d => d[1] === domain)?.[0] || domain;
  const orderId = `HB-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

  // Server-side authoritative PPP pricing resolution
  // CLIENT AMOUNT IS NEVER TRUSTED
  const resolvedGeo = req.visitorGeo || await detectVisitorGeo(req);
  const authorizedCurrency = getCurrencyForCountry(resolvedGeo.country);

  // An INR fallback is acceptable ONLY if the user explicitly switched to INR before payment
  const isExplicitInr = (
    (currencyPreference === 'INR' || req.body?.currency === 'INR') &&
    (req.body?.explicitInr === true || req.body?.explicitInr === 'true')
  );

  // Authorize market currency strictly from visitor country (US -> USD, GB -> GBP, etc.)
  // Never allow a user to obtain another country's cheaper PPP rate (e.g. US visitor passing GBP is ignored)
  const finalCurrency = isExplicitInr ? 'INR' : authorizedCurrency;
  const pppPricing = getPlanPricing(chosenKey, finalCurrency, programPrices);
  const finalAmount = pppPricing.amount;
  const resolvedCountry = resolvedGeo?.country || 'IN';

  if (finalCurrency !== 'INR' && !CASHFREE_INTERNATIONAL_CURRENCIES.has(finalCurrency)) {
    return res.status(422).json({
      ok: false,
      code: 'PAYMENT_CURRENCY_UNAVAILABLE',
      error: `Cashfree's international card checkout does not currently list ${finalCurrency} as a supported currency. Choose INR explicitly or contact support.`,
      currency: finalCurrency,
      inrFallbackAllowed: true
    });
  }
  if (!cashfreeConfigured()) return res.status(503).json({ ok: false, code: 'PAYMENT_NOT_CONFIGURED', error: 'Online payments are temporarily unavailable. Please contact support.' });

  // Check or Create User Account
  let user = await db.getUserByEmail(email);
  if (!user) {
    const pwd = password && password.length >= 6 ? password : crypto.randomBytes(4).toString('hex');
    user = await db.createUser({
      name,
      email,
      password: pwd,
      phone: phone || '',
      role: 'student'
    });
  }

  // Authenticate user session immediately
  setSession(res, user);

  const order = {
    id: orderId,
    name,
    email: email.toLowerCase(),
    domain: domainName,
    duration,
    plan: chosenKey,
    programName: planDetails.name,
    country: resolvedCountry,
    phone: phone || '',
    amount: finalAmount,
    currency: finalCurrency,
    status: 'created',
    createdAt: new Date().toISOString()
  };

  try {
    // The standard PG order endpoint supports INR. Foreign currencies are attempted
    // without conversion and accepted only when enabled for this merchant account.
    const gatewayOrderId = `CF-${orderId}`;
    const callbackUrls = getCashfreeCallbackUrls();
    const cashfreeOrder = await cashfreeRequest('POST', '/orders', {
      order_id: gatewayOrderId,
      order_amount: finalAmount,
      order_currency: finalCurrency,
      customer_details: {
        customer_id: orderId,
        customer_name: name,
        customer_email: email.toLowerCase(),
        customer_phone: normalizedPhone
      },
      order_meta: {
        return_url: callbackUrls.returnUrl,
        notify_url: callbackUrls.notifyUrl
      },
      order_note: `${planDetails.name} enrollment`
    });
    if (!cashfreeOrder.payment_session_id || cashfreeOrder.order_id !== gatewayOrderId) throw new Error('Cashfree did not return a valid payment session.');
    order.gatewayOrderId = gatewayOrderId;
    const stored = await db.createOrder(order);
    if (!stored) throw new Error('Unable to save the payment order. Please retry.');
    return res.json({
      ok: true, mode: 'cashfree', orderId, gatewayOrderId,
      payment_session_id: cashfreeOrder.payment_session_id,
      amount: finalAmount, currency: finalCurrency, redirect: '/dashboard'
    });
  } catch (e) {
    console.error('[Cashfree order creation failed]:', e.message);
    const unsupportedCurrency = finalCurrency !== 'INR';
    return res.status(502).json({
      ok: false,
      code: unsupportedCurrency ? 'PAYMENT_CURRENCY_UNAVAILABLE' : 'PAYMENT_UNAVAILABLE',
      error: unsupportedCurrency
        ? `Cashfree could not create a ${finalCurrency} payment for this account. Enable international payments for this currency or contact support. Your price has not been converted.`
        : 'Cashfree could not start your payment. Please try again or contact support.',
      currency: finalCurrency,
      inrFallbackAllowed: false
    });
  }
});

// Payment Verification API
app.post('/api/payment/verify', async (req, res) => {
  if (await databaseReady === false) return res.status(503).json({ error: 'Payment verification is temporarily unavailable.' });
  if (!cashfreeConfigured()) return res.status(503).json({ error: 'Payment verification is temporarily unavailable.' });
  const gatewayOrderId = String(req.body?.gatewayOrderId || req.body?.order_id || '').trim();
  if (!gatewayOrderId) return res.status(400).json({ error: 'Missing Cashfree order ID.' });
  try {
    const order = await findOrderByGatewayId(gatewayOrderId);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    const verified = await confirmCashfreePayment(order);
    if (!verified.ok) return res.status(verified.pending ? 202 : 400).json({ ok: false, error: verified.error, pending: !!verified.pending });
    const result = await markOrderPaidAndFulfill(order, verified.paymentId, gatewayOrderId);
    if (result.inProgress) return res.status(202).json({ ok: false, pending: true, error: 'Payment is confirmed and enrollment is still processing. Please retry shortly.' });
    return res.json({ ok: true, order: result.order, redirect: '/dashboard' });
  } catch (e) {
    console.error('[Cashfree verification failed]:', e.message);
    return res.status(502).json({ error: 'We could not verify your payment yet. Please retry shortly.' });
  }
});

// Cashfree webhook: express.raw middleware above the global JSON parser preserves signed bytes.
app.post('/api/payment/webhook', async (req, res) => {
  if (await databaseReady === false) return res.status(503).json({ error: 'Payment webhook processing is temporarily unavailable.' });
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  if (!verifyCashfreeWebhook(req.body, signature, timestamp)) return res.status(400).json({ error: 'Invalid webhook signature.' });
  let payload;
  try { payload = JSON.parse(req.body.toString('utf8')); }
  catch { return res.status(400).json({ error: 'Invalid webhook payload.' }); }

  const eventType = payload.type || payload.event;
  if (eventType !== 'PAYMENT_SUCCESS_WEBHOOK' && eventType !== 'PAYMENT_SUCCESS') {
    return res.json({ status: 'ignored' });
  }
  try {
    const data = payload.data || {};
    const gatewayOrderId = data.order?.order_id || data.payment?.order_id;
    if (!gatewayOrderId) return res.status(400).json({ error: 'Webhook is missing order ID.' });
    const order = await findOrderByGatewayId(gatewayOrderId);
    if (!order) return res.json({ status: 'ignored' });
    // Confirm via authenticated PG APIs too; the signed webhook alone does not fulfil.
    const verified = await confirmCashfreePayment(order);
    if (!verified.ok) return res.status(202).json({ status: 'pending' });
    const fulfillment = await markOrderPaidAndFulfill(order, verified.paymentId, gatewayOrderId);
    if (fulfillment.inProgress) return res.status(202).json({ status: 'processing' });
    return res.json({ status: 'ok' });
  } catch (e) {
    console.error('[Cashfree webhook processing failed]:', e.message);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }
});

// Student Deliverables Submit
// Admin Domain / Course Resources API
app.post('/api/admin/domain-resources', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized: Admin access required' });
  }

  const { domain, github_url, report_url, ppt_url } = req.body || {};
  if (!domain || !domain.trim()) {
    return res.status(400).json({ error: 'Course domain is required' });
  }

  const saved = await db.upsertDomainResources({
    domain: domain.trim(),
    github_url: (github_url || '').trim(),
    report_url: (report_url || '').trim(),
    ppt_url: (ppt_url || '').trim()
  });

  res.json({ ok: true, message: `Resources successfully updated for ${domain.trim()}`, resources: saved });
});

app.get('/api/admin/domain-resources', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized: Admin access required' });
  }
  const all = await db.getAllDomainResources();
  res.json({ ok: true, resources: all });
});

// Student Deliverables Submit
app.post('/api/student/submit-task', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Please sign in to submit deliverables' });

  const { github, linkedin, deployment, notes } = req.body || {};
  if (!github || !github.trim()) {
    return res.status(400).json({ error: 'GitHub repository link is required' });
  }

  const orders = await db.getUserOrders(session.email);
  const activeOrder = (orders && orders[0]) || {};
  if (activeOrder.status !== 'paid') {
    return res.status(403).json({ error: 'A confirmed paid enrollment is required before submitting the assigned task.' });
  }
  const planKey = resolvePlanKey(activeOrder.plan);
  const tasks = await db.getUserTasks(session.email);
  let assignedTask = (tasks || []).find(task => task.orderId === (activeOrder.id || activeOrder.order_id));
  if (!assignedTask) {
    const assignment = assignmentForOrder(activeOrder);
    if (assignment) assignedTask = await db.createTask({
      id: `task-${crypto.randomBytes(4).toString('hex')}`,
      email: session.email,
      orderId: activeOrder.id || activeOrder.order_id,
      plan: planKey,
      domain: assignment.project.domain,
      title: assignment.title,
      description: assignment.description,
      dueDate: activeOrder.duration || 'Self-paced',
      status: 'assigned'
    });
  }
  if (!assignedTask) return res.status(409).json({ error: 'Your assigned internship task is not available yet. Please contact support.' });
  const priorSubmissions = await db.getUserSubmissions(session.email);
  const existingReview = (priorSubmissions || []).find(submission =>
    (submission.order_id || submission.orderId) === (activeOrder.id || activeOrder.order_id) &&
    ['pending', 'approved'].includes(submission.status)
  );
  if (existingReview) return res.status(409).json({ error: existingReview.status === 'approved' ? 'This task has already been approved.' : 'Your task submission is already under review.' });

  const submissionId = `sub-${crypto.randomBytes(4).toString('hex')}`;
  const savedSubmission = await db.createSubmission({
    id: submissionId,
    name: session.name,
    email: session.email,
    orderId: activeOrder.id || activeOrder.order_id,
    taskId: assignedTask.id,
    github: github.trim(),
    linkedin: (linkedin || '').trim(),
    deployment: (deployment || '').trim(),
    notes: (notes || '').trim(),
    status: 'pending'
  });
  if (!savedSubmission) return res.status(503).json({ error: 'Could not save your submission. Please try again.' });
  await db.updateTaskStatus(assignedTask.id, 'under_review');

  res.json({ ok: true, message: 'Deliverables submitted successfully for evaluation!' });
});

// Contact Support Ticket Submission
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const inqId = `inq-${crypto.randomBytes(4).toString('hex')}`;
  await db.createInquiry({
    id: inqId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    subject: subject.trim(),
    message: message.trim()
  });

  res.json({ ok: true, message: 'Your support inquiry has been submitted! Our team will respond within 24 hours.' });
});

// Admin Actions
app.post('/api/admin/clean-db', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  await db.cleanTestRecords();
  res.json({ ok: true, message: 'Test and demo records cleaned successfully from Neon DB' });
});

app.post('/api/admin/tasks/assign', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const { email, title, description, dueDate } = req.body || {};
  if (!email || !title) return res.status(400).json({ error: 'Student email and task title required' });

  const taskId = `task-${crypto.randomBytes(4).toString('hex')}`;
  await db.createTask({
    id: taskId,
    email: email.trim().toLowerCase(),
    title: title.trim(),
    description: (description || '').trim(),
    dueDate: (dueDate || '').trim(),
    status: 'pending'
  });

  await db.createNotification({
    id: `notif-${crypto.randomBytes(4).toString('hex')}`,
    email: email.trim().toLowerCase(),
    title: 'New Milestone Assigned',
    message: `A new task "${title}" has been added to your dashboard.`
  });

  res.json({ ok: true });
});

app.post('/api/admin/notifications/send', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const { email, title, message, sendEmail } = req.body || {};
  if (!title || !message) return res.status(400).json({ error: 'Title and message required' });

  const isBroadcast = !email || !email.trim();
  const targetEmail = isBroadcast ? '' : email.trim().toLowerCase();

  await db.createNotification({
    id: `notif-${crypto.randomBytes(4).toString('hex')}`,
    email: targetEmail,
    broadcast: isBroadcast,
    title: title.trim(),
    message: message.trim()
  });

  if (sendEmail && targetEmail) {
    await sendMail(targetEmail, title, message);
  }

  res.json({ ok: true });
});

async function approveSubmissionAndIssueCertificate(id, dependencies = {}) {
  const getSubmissions = dependencies.getAllSubmissions || (() => db.getAllSubmissions());
  const getOrders = dependencies.getUserOrders || (email => db.getUserOrders(email));
  const evaluate = dependencies.evaluateSubmission || ((submissionId, status) => db.evaluateSubmission(submissionId, status));
  const getCertificate = dependencies.getCertificateByOrderId || (orderId => db.getCertificateByOrderId(orderId));
  const issueCertificate = dependencies.issueAndPersistCertificate || (details => issueAndPersistCertificate(details));
  const claimCredential = dependencies.claimCertificateCredential || ((orderId, credentialId) => db.claimCertificateCredential(orderId, credentialId));
  const createNotification = dependencies.createNotification || (notification => db.createNotification(notification));
  const updateTask = dependencies.updateTaskStatus || ((taskId, status) => db.updateTaskStatus(taskId, status));
  const sendApprovalEmail = dependencies.sendCertificateEmail || (certificate => sendCertificateEmail(certificate));

  const sub = (await getSubmissions()).find(item => item.id === id);
  if (!sub) return { ok: false, statusCode: 404, error: 'Submission not found.' };
  const orders = await getOrders(sub.email);
  const linkedOrderId = sub.order_id || sub.orderId;
  const order = (orders || []).find(item => (item.id || item.order_id) === linkedOrderId) || (orders || [])[0];
  if (!order || order.status !== 'paid') return { ok: false, statusCode: 409, error: 'A paid enrollment is required before certificate issuance.' };

  const transitioned = await evaluate(id, 'approved');
  if (!transitioned) return { ok: true, alreadyProcessed: true };

  const orderId = order.id || order.order_id;
  const existingCert = await getCertificate(orderId);
  let certificateRecord = existingCert || null;
  let credentialId = existingCert?.credentialId || existingCert?.credential_id;
  if (!credentialId) {
    const domain = order.domain || 'Data Science';
    credentialId = await claimCredential(orderId, await generateCredentialId(domain));
    if (!credentialId) throw new Error('Could not reserve a unique certificate ID for the paid order.');
    const certificate = await issueCertificate({
      name: sub.name || sub.email,
      email: sub.email,
      domain,
      duration: order.duration || '4 Weeks',
      issueDate: formatDate(),
      credentialId,
      orderId
    });
    if (!certificate) throw new Error('Certificate generation failed after task approval.');
    certificateRecord = certificate;
    credentialId = certificate.credentialId || certificate.credential_id;
  }
  await updateTask(sub.task_id || sub.taskId, 'approved');
  await createNotification({
    id: `approval-${id}`,
    email: sub.email,
    title: 'Task Approved & Certificate Available',
    message: `Your ${order.domain || 'internship'} task was approved. Your GreyRocks certificate (${credentialId}) is now available in the Certificate tab.`
  });
  let emailResult = { sent: false, status: 'failed', reason: 'Certificate email attempt failed.' };
  try {
    if (!certificateRecord) certificateRecord = await getCertificate(orderId);
    if (certificateRecord) emailResult = await sendApprovalEmail(certificateRecord);
  } catch (err) {
    console.error('Certificate approval email failed:', err.code || err.name || 'delivery error');
  }
  return { ok: true, credentialId, emailStatus: emailResult.status || (emailResult.sent ? 'sent' : 'failed') };
}

app.post('/api/admin/submissions/evaluate', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const { id, status } = req.body || {};
  if (!id || !status) return res.status(400).json({ error: 'Submission ID and status required' });
  if (!['approved', 'rejected', 'pending'].includes(status)) return res.status(400).json({ error: 'Invalid submission status' });
  if (status === 'approved') {
    try {
      const result = await approveSubmissionAndIssueCertificate(id);
      return res.status(result.statusCode || 200).json(result);
    } catch (err) {
      console.error('Submission approval failed:', err.message);
      return res.status(500).json({ error: 'Approval could not be completed. Please retry or contact support.' });
    }
  }
  await db.evaluateSubmission(id, status);
  return res.json({ ok: true });
});


// Admin Certificate Issuance & Email Endpoints
app.post('/api/admin/certificates/generate', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const { name, email, domain, duration, issueDate, credentialId: customId, sendEmail: shouldSendEmail } = req.body || {};
  if (!name || !name.trim() || !email || !email.trim()) {
    return res.status(400).json({ error: 'Candidate full name and email are required.' });
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanDomain = (domain || 'Data Science').trim();
  const cleanDuration = (duration || '4 Weeks').trim();
  const cleanIssueDate = (issueDate || formatDate()).trim();
  const rawCredentialId = (customId && customId.trim()) ? customId.trim() : '';
  const credId = rawCredentialId
    ? normalizeCredentialId(rawCredentialId)
    : await generateCredentialId(cleanDomain);

  if (!credId) {
    return res.status(400).json({ error: 'Credential ID contains no valid filename-safe characters.' });
  }

  try {
    const certRecord = await issueAndPersistCertificate({
      name: cleanName,
      email: cleanEmail,
      domain: cleanDomain,
      duration: cleanDuration,
      issueDate: cleanIssueDate,
      credentialId: credId,
      orderId: `HB-MANUAL-${Date.now()}`
    });

    await db.createNotification({
      id: `notif-${crypto.randomBytes(4).toString('hex')}`,
      email: cleanEmail,
      title: 'Official Internship Certificate Issued!',
      message: `Your official GreyRocks verifiable certificate (${credId}) in ${cleanDomain} is now available in your student dashboard.`
    });

    let emailSent = false;
    let emailMsg = null;
    if (shouldSendEmail) {
      const emailSubject = `Official GreyRocks Internship Certificate & Verified Credential — ${credId}`;
      const emailText = `Dear ${cleanName},\n\nCongratulations! Your official GreyRocks internship completion certificate in ${cleanDomain} has been issued.\n\nCredential Details:\n- Credential ID: ${credId}\n- Domain: ${cleanDomain}\n- Tenure & Duration: ${cleanDuration}\n- Issue Date: ${cleanIssueDate}\n\nDownload Links:\n- PDF Format: ${SITE_URL}${certRecord.pdf}\n- JPG Format: ${SITE_URL}${certRecord.jpg}\n\nOnline Credential Verification:\nhttps://greyrocks.in/verification/${encodeURIComponent(credId)}\n\nYou can also access and download your certificate anytime from your student workspace.\n\nWarm regards,\nHireeBridge Academic Administration × GreyRocks Digital Engineering`;
      
      const mailRes = await sendCertificateEmail(certRecord);
      emailSent = mailRes && mailRes.sent;
      emailMsg = emailSent ? 'Email dispatched successfully' : (mailRes ? mailRes.reason : 'SMTP not configured');
    }

    res.json({
      ok: true,
      message: `Certificate ${credId} successfully generated and issued to ${cleanName}!`,
      certificate: certRecord,
      emailSent,
      emailMsg
    });
  } catch (err) {
    console.error('Manual certificate generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate certificate.' });
  }
});

app.post('/api/admin/certificates/send-email', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const { credentialId } = req.body || {};
  if (!credentialId) return res.status(400).json({ error: 'Credential ID is required.' });

  const cert = await db.getCertificateById(credentialId);
  if (!cert) return res.status(404).json({ error: 'Certificate not found.' });

  const targetEmail = (cert.email || '').toLowerCase();
  if (!targetEmail) return res.status(400).json({ error: 'Recipient email address is required.' });

  const pdfUrl = cert.pdf || `/downloads/${cert.credentialId}.pdf`;
  const jpgUrl = cert.jpg || `/downloads/${cert.credentialId}.jpg`;
  const emailSubject = `Official GreyRocks Internship Certificate — ${cert.credentialId}`;
  const emailText = `Dear ${cert.name || 'Candidate'},\n\nPlease find your official GreyRocks internship certificate details below:\n\nCandidate Name: ${cert.name}\nInternship Domain: ${cert.domain}\nTenure & Duration: ${cert.duration}\nIssue Date: ${cert.issueDate}\nCredential ID: ${cert.credentialId}\n\nOfficial Download Links:\n- Download PDF: ${SITE_URL}${pdfUrl}\n- Download JPG: ${SITE_URL}${jpgUrl}\n\nOnline Credential Verification:\nhttps://greyrocks.in/verification/${encodeURIComponent(cert.credentialId)}\n\nBest regards,\nHireeBridge Academic Administration × GreyRocks Digital Engineering`;

  try {
    if (cert.orderId && !String(cert.orderId).startsWith('HB-MANUAL-')) {
      const approved = (await db.getAllSubmissions()).some(submission =>
        (submission.order_id || submission.orderId) === cert.orderId && submission.status === 'approved'
      );
      if (!approved) return res.status(409).json({ error: 'Certificate email is available after reviewer approval.' });
    }
    const mailResult = await sendCertificateEmail(cert);
    if (mailResult.sent) return res.json({ ok: true, sent: true, status: 'sent', message: `Certificate email sent to the registered address ${targetEmail}.` });
    if (mailResult.status === 'limit_reached') return res.json({ ok: true, sent: false, status: 'limit_reached', message: 'Daily Limit Reached. The certificate remains available; try again tomorrow.' });
    return res.json({ ok: true, sent: false, status: 'failed', message: 'Certificate email was not sent. The certificate remains available; check SMTP configuration and try again.' });
  } catch (err) {
    console.error('Admin certificate email action failed:', err.code || err.name || 'delivery error');
    return res.json({ ok: true, sent: false, status: 'failed', message: 'Certificate email was not sent. The certificate remains available.' });
  }
});

app.get('/api/admin/offer-letter-emails', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const orders = await db.getAllOrders();
  return res.json({ ok: true, offers: (orders || []).filter(order => order.status === 'paid').map(order => ({
    id: order.id, name: order.name, email: order.email, domain: order.domain,
    available: true, availableDate: order.created_at || order.createdAt || null,
    emailStatus: order.offerEmailStatus || 'not_sent', emailSentAt: order.offerEmailSentAt || null,
    emailAttemptedAt: order.offerEmailAttemptedAt || null, emailError: order.offerEmailError || ''
  })) });
});

app.post('/api/admin/offer-letter-emails/:orderId/send', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const order = (await db.getAllOrders()).find(item => item.id === req.params.orderId);
  if (!order || order.status !== 'paid') return res.status(404).json({ error: 'Paid enrollment with an available offer letter not found.' });
  try {
    const result = await sendOfferLetterEmail(order);
    if (result.sent) return res.json({ ok: true, sent: true, status: 'sent', message: `Offer letter email sent to ${order.email}.` });
    if (result.status === 'limit_reached') return res.json({ ok: true, sent: false, status: 'limit_reached', message: 'Daily Limit Reached. The offer letter remains available; try again later.' });
    return res.json({ ok: true, sent: false, status: 'failed', message: 'Offer letter email was not sent. The offer letter remains available; check SMTP configuration and try again.' });
  } catch (err) {
    console.error('Admin offer letter email action failed:', err.code || err.name || 'delivery error');
    return res.json({ ok: true, sent: false, status: 'failed', message: 'Offer letter email was not sent. The offer letter remains available.' });
  }
});

// ==========================================
// ADMIN STORAGE & DATA MANAGEMENT API ROUTES
// ==========================================

app.get('/api/admin/storage/overview', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const limitBytes = r2.getStorageLimitBytes();
    const usedBytes = await db.getTotalCertificateStorageBytes();
    const limitGb = Number(process.env.R2_STORAGE_LIMIT_GB) || 9;
    const certs = await db.getAllCertificates();
    const pdfCount = certs.filter(c => c.pdfKey || c.pdf_key || (c.pdfSizeBytes && c.pdfSizeBytes > 0) || (c.pdf_size_bytes && c.pdf_size_bytes > 0)).length;
    const jpgCount = certs.filter(c => c.jpgKey || c.jpg_key || (c.jpgSizeBytes && c.jpgSizeBytes > 0) || (c.jpg_size_bytes && c.jpg_size_bytes > 0)).length;
    const remainingBytes = Math.max(0, limitBytes - usedBytes);
    const percentUsed = limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 1000) / 10) : 0;
    res.json({
      ok: true,
      bucketName: process.env.R2_BUCKET_NAME || 'Not configured',
      status: r2.isConfigured() ? 'active' : 'not_configured',
      limitGb,
      limitBytes,
      usedBytes,
      remainingBytes,
      percentUsed,
      totalCerts: certs.length,
      pdfCount,
      jpgCount
    });
  } catch (err) {
    console.error('Storage overview error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/storage/reconcile', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const certs = await db.getAllCertificates();
    const report = await r2.reconcileStorage(certs);
    res.json({ ok: true, ...report });
  } catch (err) {
    console.error('Reconciliation error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/storage/orphans/delete', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { key } = req.body || {};
  if (!key || typeof key !== 'string') return res.status(400).json({ error: 'Object key is required' });
  try {
    const certs = await db.getAllCertificates();
    await r2.deleteOrphanObject(key.trim(), certs);
    await db.createAuditLog({
      action: 'ORPHAN_OBJECT_DELETED',
      adminEmail: session.email,
      targetId: key.trim(),
      targetType: 'r2_object',
      details: { key: key.trim() }
    });
    res.json({ ok: true, message: `Orphan object deleted: ${key.trim()}` });
  } catch (err) {
    console.error('Delete orphan object error:', err);
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/certificates/:credentialId/artifacts/delete', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { credentialId } = req.params;
  if (!credentialId) return res.status(400).json({ error: 'Credential ID is required' });
  try {
    await db.deleteCertificateArtifacts(credentialId, session.email);
    res.json({ ok: true, message: `Artifacts for certificate ${credentialId} deleted.` });
  } catch (err) {
    console.error('Delete cert artifacts error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/certificates/:credentialId/regenerate', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { credentialId } = req.params;
  if (!credentialId) return res.status(400).json({ error: 'Credential ID is required' });
  try {
    const cert = await db.getCertificateById(credentialId);
    if (!cert) return res.status(404).json({ error: 'Certificate not found' });

    // Generate files preserving the exact same credential ID
    const files = await createCertificate({
      name: cert.name,
      domain: cert.domain,
      duration: cert.duration,
      issueDate: cert.issueDate,
      credentialId: cert.credentialId
    });

    await db.updateCertificateStorageInfo(cert.credentialId, {
      pdfKey: files.pdfKey || null,
      jpgKey: files.jpgKey || null,
      pdfSizeBytes: files.pdfSizeBytes || 0,
      jpgSizeBytes: files.jpgSizeBytes || 0
    });

    // Release the temporary in-flight storage reservation now that it is committed
    await db.releaseStorageReservation(cert.credentialId).catch(() => {});

    // Clean up local temp files if R2 is active
    if (files.pdfKey && files.jpgKey) {
      if (files.localJpgPath && fs.existsSync(files.localJpgPath)) fs.unlinkSync(files.localJpgPath);
      if (files.localPdfPath && fs.existsSync(files.localPdfPath)) fs.unlinkSync(files.localPdfPath);
    }

    await db.createAuditLog({
      action: 'CERTIFICATE_REGENERATED',
      adminEmail: session.email,
      targetId: cert.credentialId,
      targetType: 'certificate',
      details: {
        name: cert.name,
        pdfSizeBytes: files.pdfSizeBytes,
        jpgSizeBytes: files.jpgSizeBytes,
        pdfKey: files.pdfKey,
        jpgKey: files.jpgKey
      }
    });

    res.json({ ok: true, message: `Certificate ${cert.credentialId} regenerated successfully`, certificate: { ...cert, ...files } });
  } catch (err) {
    console.error('Regenerate cert error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/certificates/:credentialId/delete', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { credentialId } = req.params;
  if (!credentialId) return res.status(400).json({ error: 'Credential ID is required' });
  try {
    await db.deleteCertificateRecord(credentialId, session.email);
    res.json({ ok: true, message: `Certificate record ${credentialId} and associated artifacts deleted.` });
  } catch (err) {
    console.error('Delete cert record error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/students', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { search = '', status = 'active' } = req.query;
    const students = await db.getUsersWithStats({ search, status });
    res.json({ ok: true, students });
  } catch (err) {
    console.error('Get students error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/students/:id/dependencies', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const deps = await db.getStudentDependencies(req.params.id);
    if (!deps) return res.status(404).json({ error: 'Student not found' });
    res.json({ ok: true, dependencies: deps });
  } catch (err) {
    console.error('Get student dependencies error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/students/create', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { name, email, phone, password } = req.body || {};
  if (!name || !name.trim() || !email || !email.trim()) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const cleanEmail = email.trim().toLowerCase();
  try {
    const existing = await db.getUserByEmail(cleanEmail);
    if (existing) {
      if (!existing.deleted_at) {
        return res.status(409).json({ error: 'A student account with this email already exists.' });
      } else {
        return res.status(409).json({
          error: 'An archived/deactivated student account with this email exists. You can restore it instead of creating a new one.',
          canRestore: true,
          userId: existing.id
        });
      }
    }

    const newStudent = await db.createStudent({
      name: name.trim(),
      email: cleanEmail,
      phone: (phone || '').trim(),
      password,
      role: 'student'
    });

    await db.createAuditLog({
      action: 'STUDENT_CREATED',
      adminEmail: session.email,
      targetId: newStudent.id,
      targetType: 'user',
      details: { name: newStudent.name, email: newStudent.email }
    });

    res.json({ ok: true, message: 'Student created successfully', student: newStudent });
  } catch (err) {
    console.error('Create student error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/students/:id/delete', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  const { type = 'soft', reason = '', purgeCertificates = false, purgeOrders = false, confirmText = '' } = req.body || {};
  try {
    if (type === 'hard') {
      if (confirmText !== 'DELETE') {
        return res.status(400).json({ error: 'Please type DELETE to confirm permanent deletion.' });
      }
      await db.hardDeleteStudent(id, {
        deleteCertificates: !!purgeCertificates,
        deleteR2Artifacts: !!purgeCertificates,
        deleteOrders: !!purgeOrders
      }, session.email);
      return res.json({ ok: true, message: 'Student permanently deleted.' });
    } else {
      await db.softDeleteStudent(id, session.email, reason);
      return res.json({ ok: true, message: 'Student account deactivated successfully.' });
    }
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/students/:id/restore', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  try {
    await db.restoreStudent(id, session.email);
    res.json({ ok: true, message: 'Student account restored successfully.' });
  } catch (err) {
    console.error('Restore student error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/audit-logs', async (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const logs = await db.getAuditLogs(limit);
    res.json({ ok: true, logs });
  } catch (err) {
    console.error('Get audit logs error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Meta Routes
app.get('/sitemap.xml', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const pages = [
    { loc: '/', changefreq: 'weekly', priority: '1.0' },
    { loc: '/internships', changefreq: 'weekly', priority: '0.9' },
    { loc: '/pricing', changefreq: 'weekly', priority: '0.9' },
    { loc: '/certificate', changefreq: 'monthly', priority: '0.8' },
    { loc: '/how-it-works', changefreq: 'monthly', priority: '0.8' },
    { loc: '/blog', changefreq: 'weekly', priority: '0.8' },
    { loc: '/about', changefreq: 'monthly', priority: '0.7' },
    { loc: '/contact', changefreq: 'monthly', priority: '0.7' },
    { loc: '/privacy', changefreq: 'yearly', priority: '0.5' },
    { loc: '/terms', changefreq: 'yearly', priority: '0.5' },
    { loc: '/refund', changefreq: 'yearly', priority: '0.5' },
    ...blogTopics.map(x => ({ loc: `/blog/${x[1]}`, changefreq: 'monthly', priority: '0.7' }))
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${esc(CANONICAL_URL + p.loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.type('application/xml').send(xml);
});

app.get('/robots.txt', (req, res) => {
  const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /checkout
Disallow: /api/
Disallow: /reset-password
Disallow: /forgot-password
Disallow: /login
Disallow: /logout

Sitemap: ${CANONICAL_URL}/sitemap.xml
`;
  res.type('text/plain').send(robots);
});
app.get('/api/domains', (req, res) => res.json(domains.map(d => ({ name: d[0], slug: d[1], description: d[2] }))));
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'hireebridge', time: new Date().toISOString() }));

// 404 Handler
app.get('*', (req, res) => {
  res.status(404).send(layout({
    title: 'Page Not Found | HireeBridge',
    description: 'HireeBridge page not found',
    content: '<main><section class="page-hero"><div class="eyebrow">404</div><h1>This page is not here.</h1><p>Use the navigation above to explore our internship programs.</p><a class="btn btn-dark" href="/">Back to Home</a></section></main>'
  }));
});

let serverInstance = null;
if (require.main === module) {
  serverInstance = app.listen(PORT, () => {
    console.log(`HireeBridge running at ${SITE_URL} (Port ${PORT})`);
  });
}

module.exports = {
  app,
  server: serverInstance,
  sessions,
  setSession,
  issueAndPersistCertificate,
  markOrderPaidAndFulfill,
  assignmentForOrder,
  approveSubmissionAndIssueCertificate,
  sendMail,
  certificateEmailContent,
  sendCertificateEmail,
  sendOfferLetterEmail,
  checkLoginThrottle,
  checkForgotPasswordRateLimit,
  recordForgotPasswordAttempt,
  forgotPasswordStore,
  loginAttemptStore,
  getCashfreeRuntimeConfig
};
