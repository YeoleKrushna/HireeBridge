(function() {
  'use strict';

  // 1. Certificate Right-Click & Drag Protection
  function initCertificateProtection() {
    const card = document.getElementById('certificateCard');
    if (card && !card.dataset.tiltInitialized) {
      card.dataset.tiltInitialized = 'true';

      // CSS owns the certificate's position and base rotation.
      // JS only updates the two live tilt values so hover never overwrites the vertical offset.
      card.style.setProperty('--cert-tilt-x', '0deg');
      card.style.setProperty('--cert-tilt-y', '0deg');

      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;

        card.style.setProperty('--cert-tilt-x', `${y * -4}deg`);
        card.style.setProperty('--cert-tilt-y', `${x * 5}deg`);
      });

      card.addEventListener('mouseleave', () => {
        card.style.setProperty('--cert-tilt-x', '0deg');
        card.style.setProperty('--cert-tilt-y', '0deg');
      });

      card.addEventListener('contextmenu', e => { e.preventDefault(); return false; });
      card.addEventListener('dragstart', e => { e.preventDefault(); return false; });
    }
  }

  // 2. Animated Stats Counters (Count-up from 0)
  function initCounters() {
    const proofStrip = document.getElementById('proofStrip');
    if (!proofStrip) return;

    let animated = false;
    function runCountUp() {
      if (animated) return;
      animated = true;
      const counters = proofStrip.querySelectorAll('.stat-counter');
      counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target') || '100', 10);
        const suffix = counter.getAttribute('data-suffix') || '';
        const duration = 1400; // ms
        const start = performance.now();
        counter.textContent = '0' + suffix;

        function step(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          // Ease-out cubic
          const ease = 1 - Math.pow(1 - progress, 3);
          const current = Math.floor(ease * target);
          counter.textContent = current + suffix;
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            counter.textContent = target + suffix;
          }
        }
        requestAnimationFrame(step);
      });
    }

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            runCountUp();
            observer.disconnect();
          }
        });
      }, { threshold: 0.15 });
      observer.observe(proofStrip);
    } else {
      runCountUp();
    }
  }

  // 3. Internship Journey Steps Data & State
  const journeyStepsData = [
    {
      num: '01',
      title: 'STEP 1 – APPLY & CHOOSE YOUR DOMAIN',
      heading: 'Select Your Path & Begin Your Journey',
      desc: 'Explore 30+ domains including AI, Web Dev, Data Science, and Cloud. Select the internship path that matches your career goals and submit your basic enrollment details.',
      items: [
        'Choose from 30+ specialized tech domains',
        'Flexible 2 to 4 weeks or 1 month duration',
        'Instant enrollment confirmation',
        'Dedicated student account creation'
      ]
    },
    {
      num: '02',
      title: 'STEP 2 – APPLICATION REVIEW & CONFIRMATION',
      heading: 'Automated Profile Screening & Match',
      desc: 'Our system automatically verifies your domain selection and prepares your customized internship curriculum and orientation details.',
      items: [
        'Eligibility verification completed',
        'Internship curriculum mapped to selected domain',
        'Resource toolkit and workspace allocated',
        'Orientation materials dispatched'
      ]
    },
    {
      num: '03',
      title: 'STEP 3 – RECEIVE YOUR OFFICIAL OFFER LETTER',
      heading: 'Get Selected & Start Your Internship',
      desc: 'Candidates who successfully pass the review process receive an official internship offer letter confirming their selection. The offer letter contains important information regarding the internship, duration, and onboarding process.',
      items: [
        'Selection officially confirmed',
        'Offer letter generated with unique verification ID',
        'Internship details and duration shared',
        'Onboarding instructions provided in dashboard'
      ]
    },
    {
      num: '04',
      title: 'STEP 4 – RECEIVE REAL-WORLD PROJECT TASKS',
      heading: 'Practical Problem Statements & Milestones',
      desc: 'Access your task dashboard with structured milestones designed to test and elevate your practical skills with real-world industry tools.',
      items: [
        'Step-by-step milestone instructions',
        'Curated learning resources and reference repositories',
        'Clear evaluation criteria and deliverables',
        'Self-paced schedule tailored for students'
      ]
    },
    {
      num: '05',
      title: 'STEP 5 – BUILD YOUR PROJECT & COMMIT CODE',
      heading: 'Hands-on Implementation & Version Control',
      desc: 'Write clean code, build the solution, document your architecture, and commit your work to GitHub to create verifiable portfolio proof.',
      items: [
        'Develop real-world software or data solutions',
        'Commit and push code to your GitHub repository',
        'Write comprehensive README documentation',
        'Deploy live demo if applicable'
      ]
    },
    {
      num: '06',
      title: 'STEP 6 – SUBMIT YOUR PROJECT & EVIDENCE',
      heading: 'Upload Work Through Student Workspace',
      desc: 'Submit your GitHub repository link, LinkedIn project post link, and live deployment URL through your student workspace for review.',
      items: [
        'Easy submission form in student dashboard',
        'Provide GitHub repository URL',
        'Share your LinkedIn project showcase link',
        'Optional deployment link & project notes'
      ]
    },
    {
      num: '07',
      title: 'STEP 7 – PROJECT EVALUATION & FEEDBACK',
      heading: 'Quality Review & Verification',
      desc: 'Mentors and automated review pipelines assess your submission against industry standards, code quality, and project deliverables.',
      items: [
        'Code quality and project functionality assessment',
        'Verification of GitHub repository and commit history',
        'LinkedIn showcase verification',
        'Evaluation status updated in your dashboard'
      ]
    },
    {
      num: '08',
      title: 'STEP 8 – EARN YOUR GLOBALLY VERIFIABLE CREDENTIAL',
      heading: 'Download Your GreyRocks Certificate',
      desc: 'Upon successful review, your official GreyRocks completion credential is automatically generated with a unique credential ID and QR verification.',
      items: [
        'Official GreyRocks completion certificate generated',
        'Unique credential ID and tamper-proof verification QR',
        'High-resolution PDF download + SVG export',
        'Add credential directly to LinkedIn profile & resume'
      ]
    }
  ];

  let currentJourneyIndex = 0;
  let isJourneyDetailOpen = true;

  function renderJourneyStep(index) {
    if (index < 0 || index >= journeyStepsData.length) return;
    currentJourneyIndex = index;
    const data = journeyStepsData[index];

    const detailCard = document.getElementById('journeyDetail');
    const stepEls = document.querySelectorAll('.journey-step');
    const eyebrowEl = document.getElementById('journeyDetailEyebrow');
    const titleEl = document.getElementById('journeyDetailTitle');
    const descEl = document.getElementById('journeyDetailDesc');
    const listEl = document.getElementById('journeyDetailList');
    const phaseEl = document.getElementById('journeyPhase');
    const prevBtn = document.getElementById('journeyPrev');
    const nextBtn = document.getElementById('journeyNext');

    stepEls.forEach((el, i) => {
      el.classList.toggle('active', i === index);
    });

    if (eyebrowEl) eyebrowEl.textContent = data.title;
    if (titleEl) titleEl.textContent = data.heading;
    if (descEl) descEl.textContent = data.desc;
    if (listEl) listEl.innerHTML = data.items.map(it => `<li>${it}</li>`).join('');
    if (phaseEl) phaseEl.textContent = `Phase ${index + 1} of ${journeyStepsData.length}`;

    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === journeyStepsData.length - 1;

    if (detailCard) {
      detailCard.classList.remove('is-hidden');
      isJourneyDetailOpen = true;
    }
  }

  // 4. Global Event Delegation (Guaranteed Click Handling)
  document.addEventListener('click', function(e) {
    // Capture phase keeps dashboard/admin navigation responsive even if another
    // nested handler stops bubbling. All matched controls still use their normal
    // browser click behavior unless this handler intentionally handles them.
    const clickTarget = e.target instanceof Element
      ? e.target
      : (e.target && e.target.parentElement ? e.target.parentElement : null);
    if (!clickTarget) return;

    // A. Journey Step Node Click
    const journeyNode = clickTarget.closest('.journey-step');
    if (journeyNode) {
      const stepIdx = parseInt(journeyNode.getAttribute('data-step') || '0', 10);
      const detailCard = document.getElementById('journeyDetail');
      if (isJourneyDetailOpen && currentJourneyIndex === stepIdx && detailCard) {
        detailCard.classList.add('is-hidden');
        journeyNode.classList.remove('active');
        isJourneyDetailOpen = false;
      } else {
        renderJourneyStep(stepIdx);
      }
      return;
    }

    // B. Journey Prev / Next Buttons
    if (clickTarget.closest('#journeyPrev')) {
      if (currentJourneyIndex > 0) renderJourneyStep(currentJourneyIndex - 1);
      return;
    }
    if (clickTarget.closest('#journeyNext')) {
      if (currentJourneyIndex < journeyStepsData.length - 1) renderJourneyStep(currentJourneyIndex + 1);
      return;
    }

    // C. Student Dashboard Tab Click
    const tabBtn = clickTarget.closest('.dashboard-tab');
    if (tabBtn) {
      e.preventDefault();
      const targetTab = tabBtn.getAttribute('data-tab');
      document.querySelectorAll('.dashboard-tab').forEach(b => b.classList.remove('active'));
      tabBtn.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(pane => {
        pane.classList.remove('active');
        if (pane.id === 'tab-' + targetTab) {
          pane.classList.add('active');
        }
      });
      return;
    }

    // D. Admin Navigation Tab Click
    const adminNavBtn = clickTarget.closest('[data-admin-view]');
    if (adminNavBtn) {
      e.preventDefault();
      const viewId = adminNavBtn.getAttribute('data-admin-view');
      if (typeof window.switchAdminView === 'function') {
        window.switchAdminView(viewId);
      } else {
        document.querySelectorAll('[data-admin-view]').forEach(b => b.classList.remove('active'));
        adminNavBtn.classList.add('active');

        document.querySelectorAll('.admin-view').forEach(view => {
          if (view.id === 'view-' + viewId) {
            view.classList.add('active');
            view.style.display = 'block';
          } else {
            view.classList.remove('active');
            view.style.display = 'none';
          }
        });
      }
      return;
    }

    // E. Admin Clean DB Button
    if (clickTarget.closest('#btnCleanDb')) {
      const cleanBtn = clickTarget.closest('#btnCleanDb');
      if (!confirm('Are you sure you want to clean demo and test records from Neon PostgreSQL?')) return;
      cleanBtn.disabled = true;
      cleanBtn.textContent = 'Cleaning…';
      fetch('/api/admin/clean-db', { method: 'POST' })
        .then(r => r.json())
        .then(res => {
          alert(res.message || 'Database cleaned successfully!');
          window.location.reload();
        })
        .catch(err => {
          alert('Error: ' + err.message);
          cleanBtn.disabled = false;
          cleanBtn.textContent = 'Clean Test Records';
        });
      return;
    }

    // F. Admin Evaluation Buttons
    const evalBtn = clickTarget.closest('.btn-evaluate');
    if (evalBtn) {
      const subId = evalBtn.getAttribute('data-id');
      const action = evalBtn.getAttribute('data-action');
      if (!confirm(`Mark submission as ${action}?`)) return;
      evalBtn.disabled = true;
      fetch('/api/admin/submissions/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: subId, status: action })
      })
      .then(r => r.json())
      .then(res => {
        if (!res.ok) throw new Error(res.error || 'Evaluation failed');
        window.location.reload();
      })
      .catch(err => {
        alert(err.message);
        evalBtn.disabled = false;
      });
      return;
    }
  }, true);

  // 5. Form Submissions
  // Login Form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const errorMsg = document.getElementById('loginError');
      if (errorMsg) errorMsg.style.display = 'none';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Signing in…'; }

      const email = (loginForm.querySelector('input[name="email"]')?.value || '').trim();
      const password = (loginForm.querySelector('input[name="password"]')?.value || '');

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Invalid credentials');
        window.location.href = data.redirect || '/dashboard';
      } catch (err) {
        if (errorMsg) {
          errorMsg.textContent = err.message;
          errorMsg.style.display = 'block';
        } else {
          alert(err.message);
        }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sign In'; }
      }
    });
  }

  // Checkout Form
  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = checkoutForm.querySelector('button[type="submit"]');
      const result = document.getElementById('checkoutResult');
      btn.disabled = true;
      btn.textContent = 'Processing enrollment…';

      try {
        const payload = Object.fromEntries(new FormData(checkoutForm).entries());
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const j = await res.json();
        if (!res.ok || !j.ok) {
          if (j.code === 'PAYMENT_CURRENCY_UNAVAILABLE' && j.inrFallbackAllowed) {
            if (result) {
              result.innerHTML = `<div class="demo-note" style="border-left:4px solid #c79a4a;background:#fff9e6;padding:16px;border-radius:12px;margin-top:16px;">
                <strong>Payment Currency Notice</strong>
                <p style="margin:8px 0 12px;color:#6b5212;">${j.error}</p>
                <a href="${window.location.pathname}?plan=${encodeURIComponent(payload.plan || 'project')}&domain=${encodeURIComponent(payload.domain || 'data-science')}&currency=INR&explicit=true" class="btn btn-dark" style="display:inline-block;padding:8px 16px;font-size:13px;text-decoration:none;">Switch to INR (₹) &amp; Continue</a>
              </div>`;
            }
            btn.disabled = false;
            btn.textContent = 'Retry or Switch Currency';
            return;
          }
          throw new Error(j.error || 'Checkout initialization failed');
        }

        if (j.mode !== 'cashfree' || !j.payment_session_id) throw new Error('Cashfree did not return a payment session. Please retry.');
        if (!window.Cashfree) throw new Error('Cashfree checkout failed to load. Check your connection.');
        const cashfree = window.Cashfree({ mode: window.HB_CASHFREE_MODE || 'sandbox' });
        await cashfree.checkout({ paymentSessionId: j.payment_session_id, redirectTarget: '_self' });
      } catch (err) {
        if (result) {
          result.innerHTML = `<div class="demo-note" style="color:#d9534f;border-left:4px solid #d9534f;background:#fff5f5;padding:14px;border-radius:12px;margin-top:16px;">${err.message}</div>`;
        } else {
          alert(err.message);
        }
        btn.disabled = false;
        btn.textContent = 'Try again';
      }
    });
  }

  // Student Task Submit Form
  const submitTaskForm = document.getElementById('submitTaskForm');
  if (submitTaskForm) {
    submitTaskForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = submitTaskForm.querySelector('button[type="submit"]');
      const msg = document.getElementById('submitTaskResult');
      btn.disabled = true;
      btn.textContent = 'Submitting deliverables…';
      if (msg) msg.style.display = 'none';

      try {
        const data = Object.fromEntries(new FormData(submitTaskForm).entries());
        const res = await fetch('/api/student/submit-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const j = await res.json();
        if (!res.ok || !j.ok) throw new Error(j.error || 'Submission failed');

        if (msg) {
          msg.textContent = j.message || 'Deliverables submitted successfully for review!';
          msg.style.display = 'block';
          msg.style.color = '#0d6e6e';
        }
        submitTaskForm.reset();
        btn.textContent = 'Submitted!';
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        if (msg) {
          msg.textContent = err.message;
          msg.style.display = 'block';
          msg.style.color = '#c53030';
        } else {
          alert(err.message);
        }
        btn.disabled = false;
        btn.textContent = 'Submit Deliverables for Review';
      }
    });
  }

  // Contact Support Ticket Form
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = contactForm.querySelector('button[type="submit"]');
      const result = document.getElementById('contactResult');
      btn.disabled = true;
      btn.textContent = 'Sending message…';

      try {
        const payload = Object.fromEntries(new FormData(contactForm).entries());
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const j = await res.json();
        if (!res.ok || !j.ok) throw new Error(j.error || 'Failed to submit message');

        if (result) {
          result.innerHTML = `<div style="background:#e6f5e6;color:#2d7a2d;padding:14px;border-radius:10px;margin-top:14px;font-weight:700;">${j.message || 'Inquiry submitted successfully! Our support team will respond shortly.'}</div>`;
        }
        contactForm.reset();
        btn.textContent = 'Message Sent!';
      } catch (err) {
        if (result) {
          result.innerHTML = `<div style="background:#fff5f5;color:#c53030;padding:14px;border-radius:10px;margin-top:14px;font-weight:700;">${err.message}</div>`;
        }
        btn.disabled = false;
        btn.textContent = 'Send Inquiry';
      }
    });
  }

  // Admin Assign Task Form
  const assignTaskForm = document.getElementById('assignTaskForm');
  if (assignTaskForm) {
    assignTaskForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = assignTaskForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const data = Object.fromEntries(new FormData(assignTaskForm).entries());
        const res = await fetch('/api/admin/tasks/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const j = await res.json();
        if (!res.ok || !j.ok) throw new Error(j.error || 'Failed to assign task');
        alert('Task assigned successfully!');
        assignTaskForm.reset();
        window.location.reload();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
      }
    });
  }

  // Admin Broadcast Notification Form
  const sendNotifForm = document.getElementById('sendNotifForm');
  if (sendNotifForm) {
    sendNotifForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = sendNotifForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const data = Object.fromEntries(new FormData(sendNotifForm).entries());
        const res = await fetch('/api/admin/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const j = await res.json();
        if (!res.ok || !j.ok) throw new Error(j.error || 'Failed to send notification');
        alert('Announcement dispatched successfully!');
        sendNotifForm.reset();
      } catch (err) {
        alert(err.message);
      } finally {
        btn.disabled = false;
      }
    });
  }

  // Gentle scroll-reveal animation for important sections/cards.
  function initScrollReveal() {
    const selectors = [
      '.proof-strip',
      '.section > .eyebrow',
      '.section > .eyebrow-industry',
      '.section > h2',
      '.section > .lead',
      '.feature-grid article',
      '.domain-card',
      '.plan-3',
      '.review',
      '.blog-card',
      '.resource-card',
      '.partner-card',
      '.journey-section',
      '.compare-plans-table'
    ];

    const elements = Array.from(document.querySelectorAll(selectors.join(',')));
    if (!elements.length) return;

    elements.forEach((el, index) => {
      if (el.dataset.revealInitialized) return;
      el.dataset.revealInitialized = 'true';
      el.classList.add('scroll-reveal');
      el.style.setProperty('--reveal-delay', `${(index % 4) * 70}ms`);
    });

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach(el => el.classList.add('is-visible'));
      return;
    }

    if (!('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    elements.forEach(el => observer.observe(el));
  }

  // Offer Letter PDF, JPG & Print Export Handlers
  function initOfferLetterDownload() {
    const btnPdf = document.getElementById('btnDownloadOfferPdf');
    const btnJpg = document.getElementById('btnDownloadOfferJpg');
    const btnPrint = document.getElementById('btnPrintOffer');

    if (btnPrint && !btnPrint.dataset.bound) {
      btnPrint.dataset.bound = 'true';
      btnPrint.addEventListener('click', function(e) {
        e.preventDefault();
        if (typeof window.printOffer === 'function') window.printOffer();
      });
    }
    if (btnPdf && !btnPdf.dataset.bound) {
      btnPdf.dataset.bound = 'true';
      btnPdf.addEventListener('click', function(e) {
        e.preventDefault();
        if (typeof window.downloadOfferPdf === 'function') window.downloadOfferPdf(btnPdf);
      });
    }
    if (btnJpg && !btnJpg.dataset.bound) {
      btnJpg.dataset.bound = 'true';
      btnJpg.addEventListener('click', function(e) {
        e.preventDefault();
        if (typeof window.downloadOfferJpg === 'function') window.downloadOfferJpg(btnJpg);
      });
    }
  }


  // Administrator Portal Interactive Handlers (Filtering, Manual Generation, Directory & Email)
  function initAdminFeatures() {
    // 1. Submissions Filtering & Real-Time Search
    const subFilterBtns = document.querySelectorAll('.sub-filter-btn');
    const subFilterSearch = document.getElementById('subFilterSearch');
    const subRows = document.querySelectorAll('.sub-row');
    const subEmptyNotice = document.getElementById('subFilterEmptyNotice');

    function filterSubmissions() {
      const activeBtn = document.querySelector('.sub-filter-btn.active');
      const selectedFilter = activeBtn ? activeBtn.getAttribute('data-filter') : 'all';
      const searchVal = subFilterSearch ? subFilterSearch.value.trim().toLowerCase() : '';
      let visibleCount = 0;

      subRows.forEach(row => {
        const rowStatus = (row.getAttribute('data-status') || '').toLowerCase();
        const rowSearch = (row.getAttribute('data-search') || '').toLowerCase();

        const matchesStatus = (selectedFilter === 'all') || (rowStatus === selectedFilter);
        const matchesSearch = !searchVal || rowSearch.includes(searchVal);

        if (matchesStatus && matchesSearch) {
          row.style.display = '';
          visibleCount++;
        } else {
          row.style.display = 'none';
        }
      });

      if (subEmptyNotice) {
        subEmptyNotice.style.display = visibleCount === 0 ? 'block' : 'none';
      }
    }

    if (subFilterBtns.length > 0) {
      subFilterBtns.forEach(btn => {
        if (!btn.dataset.bound) {
          btn.dataset.bound = 'true';
          btn.addEventListener('click', function(e) {
            e.preventDefault();
            subFilterBtns.forEach(b => b.classList.remove('active', 'admin-btn-primary'));
            btn.classList.add('active', 'admin-btn-primary');
            filterSubmissions();
          });
        }
      });
    }

    if (subFilterSearch && !subFilterSearch.dataset.bound) {
      subFilterSearch.dataset.bound = 'true';
      subFilterSearch.addEventListener('input', filterSubmissions);
    }

    // 2. Quick-fill for Manual Certificate Generator from Student List
    const autoFillBtns = document.querySelectorAll('.btn-auto-fill');
    autoFillBtns.forEach(btn => {
      if (!btn.dataset.bound) {
        btn.dataset.bound = 'true';
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          const name = btn.getAttribute('data-name');
          const email = btn.getAttribute('data-email');
          const domain = btn.getAttribute('data-domain');

          const nameInp = document.getElementById('certInputName');
          const emailInp = document.getElementById('certInputEmail');
          const domainInp = document.getElementById('certInputDomain');
          const card = document.getElementById('manualCertCard');

          if (nameInp) nameInp.value = name || '';
          if (emailInp) emailInp.value = email || '';
          if (domainInp && domain) {
            for (let i = 0; i < domainInp.options.length; i++) {
              if (domainInp.options[i].value === domain) {
                domainInp.selectedIndex = i;
                break;
              }
            }
          }

          if (card) {
            card.scrollIntoView({ behavior: 'smooth' });
            card.style.outline = '2px solid #0d6e6e';
            setTimeout(() => { card.style.outline = 'none'; }, 2000);
          }
        });
      }
    });

    // 3. Quick Student Search in Auto-fill Table
    const quickStudentSearch = document.getElementById('quickStudentSearch');
    const quickStudentRows = document.querySelectorAll('.quick-student-row');
    if (quickStudentSearch && !quickStudentSearch.dataset.bound) {
      quickStudentSearch.dataset.bound = 'true';
      quickStudentSearch.addEventListener('input', function() {
        const val = quickStudentSearch.value.trim().toLowerCase();
        quickStudentRows.forEach(row => {
          const s = (row.getAttribute('data-search') || '').toLowerCase();
          row.style.display = (!val || s.includes(val)) ? '' : 'none';
        });
      });
    }

    // 4. Issued Certificates Directory Search
    const certDirSearch = document.getElementById('certDirectorySearch');
    const certRows = document.querySelectorAll('.cert-row');
    const certEmptyNotice = document.getElementById('certDirectoryEmptyNotice');
    if (certDirSearch && !certDirSearch.dataset.bound) {
      certDirSearch.dataset.bound = 'true';
      certDirSearch.addEventListener('input', function() {
        const val = certDirSearch.value.trim().toLowerCase();
        let matches = 0;
        certRows.forEach(row => {
          const s = (row.getAttribute('data-search') || '').toLowerCase();
          const isMatch = !val || s.includes(val);
          row.style.display = isMatch ? '' : 'none';
          if (isMatch) matches++;
        });
        if (certEmptyNotice) certEmptyNotice.style.display = matches === 0 ? 'block' : 'none';
      });
    }

    // 5. Manual Certificate Generator Form Submission
    const manualCertForm = document.getElementById('adminManualCertForm');
    const alertBox = document.getElementById('certGenSuccessAlert');
    if (manualCertForm && !manualCertForm.dataset.bound) {
      manualCertForm.dataset.bound = 'true';
      manualCertForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const submitBtn = document.getElementById('btnSubmitGenerateCert');
        const origBtnText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = 'Generating Certificate…';
        }

        const name = (document.getElementById('certInputName') || {}).value || '';
        const email = (document.getElementById('certInputEmail') || {}).value || '';
        const domain = (document.getElementById('certInputDomain') || {}).value || 'Data Science';
        const duration = (document.getElementById('certInputDuration') || {}).value || '4 Weeks';
        const issueDate = (document.getElementById('certInputDate') || {}).value || '';
        const credentialId = (document.getElementById('certInputCredId') || {}).value || '';
        const sendEmail = (document.getElementById('certInputSendEmail') || {}).checked;

        try {
          const resp = await fetch('/api/admin/certificates/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, domain, duration, issueDate, credentialId, sendEmail })
          });

          const data = await resp.json();
          if (!resp.ok || !data.ok) {
            throw new Error(data.error || 'Failed to generate certificate.');
          }

          if (alertBox) {
            const cert = data.certificate;
            alertBox.style.display = 'block';
            alertBox.innerHTML = `
              <div style="display:flex;align-items:flex-start;gap:12px;">
                <div style="width:32px;height:32px;border-radius:50%;background:#0d6e6e;color:white;display:grid;place-items:center;flex-shrink:0;font-size:16px;">✓</div>
                <div style="flex:1;">
                  <h4 style="margin:0 0 4px;font:800 16px Manrope;color:#0b1f36;">Certificate Generated Successfully!</h4>
                  <p style="margin:0 0 10px;font-size:13px;color:#334155;">
                    Credential ID: <strong style="font-family:monospace;color:#0d6e6e;">${cert.credentialId}</strong> &middot; Candidate: <strong>${cert.name}</strong> (${cert.domain})
                  </p>
                  ${data.emailSent ? '<p style="margin:0 0 12px;font-size:12px;color:#0d6e6e;font-weight:700;">✓ Official certificate email dispatched to candidate (' + cert.email + ')</p>' : '<p style="margin:0 0 12px;font-size:12px;color:#64748b;">Note: Email was ' + (sendEmail ? 'queued (SMTP: ' + (data.emailMsg || 'offline fallback') + ')' : 'not requested') + '.</p>'}
                  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                    <a href="${cert.pdf}" download="Internship_Certificate_${cert.credentialId}.pdf" target="_blank" class="btn btn-dark" style="font-size:12px;padding:8px 16px;text-decoration:none;">Download PDF</a>
                    <a href="${cert.jpg}" download="Internship_Certificate_${cert.credentialId}.jpg" target="_blank" class="btn btn-light" style="font-size:12px;padding:8px 16px;background:white;border:1px solid var(--line);color:var(--ink);text-decoration:none;">Download JPG</a>
                    <a href="https://greyrocks.in/verification/${encodeURIComponent(cert.credentialId)}" target="_blank" class="text-link" style="font-size:12px;">Verify Online ↗</a>
                  </div>
                </div>
              </div>
            `;
            alertBox.scrollIntoView({ behavior: 'smooth' });
          }

          // Prepend newly generated certificate row to issued certificates table
          const certTable = document.getElementById('issuedCertsTable');
          if (certTable) {
            const tbody = certTable.querySelector('tbody');
            if (tbody) {
              const tr = document.createElement('tr');
              tr.className = 'cert-row';
              tr.setAttribute('data-search', (data.certificate.credentialId + ' ' + name + ' ' + email + ' ' + domain).toLowerCase());
              tr.innerHTML = `
                <td>
                  <strong style="font-family:monospace;color:#0d6e6e;font-size:13px;">${data.certificate.credentialId}</strong>
                  <a href="https://greyrocks.in/verification/${encodeURIComponent(data.certificate.credentialId)}" target="_blank" style="display:block;font-size:11px;color:var(--muted);text-decoration:none;">Verify ↗</a>
                </td>
                <td>
                  <strong>${name}</strong>
                  <span style="display:block;font-size:11px;color:var(--muted);">${email}</span>
                </td>
                <td>
                  ${domain}
                  <span style="display:block;font-size:11px;color:var(--muted);">${duration}</span>
                </td>
                <td>${issueDate || 'Just now'}</td>
                <td>
                  <div class="admin-actions">
                    <button type="button" class="admin-btn btn-view-cert" data-id="${data.certificate.credentialId}" data-jpg="${data.certificate.jpg}" data-pdf="${data.certificate.pdf}" data-name="${name}" data-domain="${domain}" data-date="${issueDate}">
                      👁 View
                    </button>
                    <a href="${data.certificate.pdf}" download="Internship_Certificate_${data.certificate.credentialId}.pdf" target="_blank" class="admin-btn" style="text-decoration:none;">
                      ⬇ PDF
                    </a>
                    <a href="${data.certificate.jpg}" download="Internship_Certificate_${data.certificate.credentialId}.jpg" target="_blank" class="admin-btn" style="text-decoration:none;">
                      ⬇ JPG
                    </a>
                    <button type="button" class="admin-btn admin-btn-primary btn-send-cert-mail" data-id="${data.certificate.credentialId}" data-email="${email}" data-name="${name}">
                      ✉ Send Email
                    </button>
                  </div>
                </td>
              `;
              tbody.insertBefore(tr, tbody.firstChild);
            }
          }

          // Increment counter
          const statElem = document.getElementById('statCertIssuedCount');
          if (statElem) {
            statElem.textContent = String(parseInt(statElem.textContent || '0', 10) + 1);
          }

        } catch (err) {
          if (alertBox) {
            alertBox.style.display = 'block';
            alertBox.style.background = '#fef2f2';
            alertBox.style.borderColor = '#ef4444';
            alertBox.innerHTML = `<strong style="color:#b91c1c;">Error: ${err.message || err}</strong>`;
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origBtnText;
          }
        }
      });
    }

    // 6. View Certificate Modal Handler
    document.addEventListener('click', function(e) {
      const viewBtn = e.target.closest('.btn-view-cert');
      if (viewBtn) {
        e.preventDefault();
        const id = viewBtn.getAttribute('data-id');
        const jpg = viewBtn.getAttribute('data-jpg');
        const pdf = viewBtn.getAttribute('data-pdf');
        const name = viewBtn.getAttribute('data-name');
        const domain = viewBtn.getAttribute('data-domain');
        const date = viewBtn.getAttribute('data-date');

        const modal = document.getElementById('adminCertPreviewModal');
        const img = document.getElementById('modalCertImg');
        const title = document.getElementById('modalCertTitle');
        const subtitle = document.getElementById('modalCertSubtitle');
        const pdfBtn = document.getElementById('modalCertPdfBtn');
        const jpgBtn = document.getElementById('modalCertJpgBtn');
        const verifyLink = document.getElementById('modalCertVerifyLink');
        const sendMailBtn = document.getElementById('modalCertSendMailBtn');

        if (modal && img) {
          if (title) title.textContent = 'Certificate: ' + (name || 'Candidate') + ' (' + (domain || '') + ')';
          if (subtitle) subtitle.textContent = 'Credential ID: ' + id + (date ? ' · Issue Date: ' + date : '');
          img.src = jpg || pdf;
          if (pdfBtn) {
            pdfBtn.href = pdf;
            pdfBtn.setAttribute('download', 'Internship_Certificate_' + id + '.pdf');
          }
          if (jpgBtn) {
            jpgBtn.href = jpg;
            jpgBtn.setAttribute('download', 'Internship_Certificate_' + id + '.jpg');
          }
          if (verifyLink) {
            verifyLink.href = 'https://greyrocks.in/verification/' + encodeURIComponent(id);
          }
          if (sendMailBtn) {
            sendMailBtn.setAttribute('data-id', id);
            sendMailBtn.setAttribute('data-email', viewBtn.closest('tr') ? (viewBtn.closest('tr').querySelectorAll('td')[1].querySelector('span').textContent.trim()) : '');
          }
          modal.style.display = 'flex';
        }
        return;
      }

      // Close modal
      if (e.target.closest('#btnCloseCertModal') || e.target.id === 'adminCertPreviewModal') {
        const modal = document.getElementById('adminCertPreviewModal');
        if (modal) modal.style.display = 'none';
        return;
      }

      // 7. Send Certificate Email Action
      const mailBtn = e.target.closest('.btn-send-cert-mail') || (e.target.id === 'modalCertSendMailBtn' ? e.target : null);
      if (mailBtn) {
        e.preventDefault();
        const id = mailBtn.getAttribute('data-id');
        const email = mailBtn.getAttribute('data-email');
        if (!id) return;

        const targetEmail = prompt('Confirm student email to dispatch certificate to:', email || '');
        if (!targetEmail || !targetEmail.trim()) return;

        const origText = mailBtn.innerHTML;
        mailBtn.disabled = true;
        mailBtn.innerHTML = 'Sending…';

        fetch('/api/admin/certificates/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credentialId: id, email: targetEmail.trim() })
        })
        .then(r => r.json())
        .then(res => {
          if (!res.ok) throw new Error(res.error || 'Failed to send email');
          alert(res.message || res.warning || 'Certificate email dispatched successfully!');
        })
        .catch(err => {
          alert('Could not dispatch email: ' + err.message);
        })
        .finally(() => {
          mailBtn.disabled = false;
          mailBtn.innerHTML = origText;
        });
      }
    });
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    initCertificateProtection();
    initCounters();
    initScrollReveal();
    initOfferLetterDownload();
    initAdminFeatures();
    if (document.getElementById('internshipJourney')) {
      renderJourneyStep(0);
    }
  });

  // Also call immediately if script runs after DOM loaded
  initCertificateProtection();
  initCounters();
  initScrollReveal();
  initOfferLetterDownload();
  initAdminFeatures();
  if (document.getElementById('internshipJourney')) {
    renderJourneyStep(0);
  }

})();









/* =====================================================================
   HireeBridge — Mobile navigation + journey UX (append to end of app.js)
   Self-contained IIFE. Does not touch existing handlers, APIs or forms.
   ===================================================================== */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;

  function ready(fn) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    var mq = window.matchMedia('(max-width: 960px)');
    var header = doc.querySelector('header.nav');

    /* ---------- Mobile hamburger menu ---------- */
    if (header && !header.querySelector('.nav-toggle')) {
      var links = header.querySelector('nav');
      var actions = header.querySelector('.nav-actions');
      root.classList.add('hb-js');

      if (links) {
        if (!links.id) links.id = 'primaryNav';
        links.setAttribute('aria-label', 'Primary');
      }

      var btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'nav-toggle';
      btn.setAttribute('aria-label', 'Open menu');
      btn.setAttribute('aria-expanded', 'false');
      if (links) btn.setAttribute('aria-controls', links.id);
      btn.innerHTML = '<span class="nav-toggle-bars" aria-hidden="true"></span>';
      header.insertBefore(btn, links || actions || null);

      // Mark current page link
      var path = location.pathname.replace(/\/+$/, '') || '/';
      if (links) {
        links.querySelectorAll('a').forEach(function (a) {
          var p = (a.getAttribute('href') || '').replace(/\/+$/, '') || '/';
          if (p === path || (p !== '/' && path.indexOf(p + '/') === 0)) {
            a.classList.add('is-current');
            a.setAttribute('aria-current', 'page');
          }
        });
      }

      var setOpen = function (open, returnFocus) {
        header.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        if (!open && returnFocus) btn.focus();
      };

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        setOpen(!header.classList.contains('is-open'));
      });

      // Close after choosing a destination
      header.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a');
        if (a && header.classList.contains('is-open')) setOpen(false);
      });

      // Close on outside tap
      doc.addEventListener('click', function (e) {
        if (header.classList.contains('is-open') && !header.contains(e.target)) setOpen(false);
      });

      // Close on Escape
      doc.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && header.classList.contains('is-open')) setOpen(false, true);
      });

      // Reset when growing to desktop
      var onChange = function (ev) { if (!ev.matches) setOpen(false); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }

    /* ---------- Journey: on mobile, bring the opened detail card into view ---------- */
    var steps = doc.getElementById('journeySteps');
    var detail = doc.getElementById('journeyDetail');
    if (steps && detail) {
      steps.addEventListener('click', function (e) {
        if (!mq.matches) return;
        if (!(e.target.closest && e.target.closest('.journey-step'))) return;
        // Let the existing handler update the content first
        setTimeout(function () {
          var navH = header ? header.offsetHeight + 16 : 80;
          var top = detail.getBoundingClientRect().top;
          if (top > window.innerHeight * 0.55 || top < navH) {
            var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.scrollTo({ top: window.pageYOffset + top - navH - 8, behavior: reduce ? 'auto' : 'smooth' });
          }
        }, 80);
      });
    }
  });

  /* ---------- Dev helper: run hbFindOverflow() in the console at 320-480px ---------- */
  window.hbFindOverflow = function () {
    var w = root.clientWidth, bad = [];
    doc.querySelectorAll('body *').forEach(function (el) {
      if (el.closest('.ambient-glow-wrap,.noise,.admin-table,.roadmap-code-box')) return;
      var r = el.getBoundingClientRect();
      if (r.width && (r.right > w + 1 || r.left < -1)) bad.push(el);
    });
    console.log('scrollWidth=' + root.scrollWidth + ' clientWidth=' + w + ' offenders=' + bad.length);
    bad.slice(0, 25).forEach(function (el) { console.log(el); });
    return bad;
  };
})();




/* =====================================================================
   HireeBridge — v3 UX: seamless review loop + scroll-to-content on
   dashboard/admin menu tap (mobile). Append after the v2 block.
   ===================================================================== */
(function () {
  'use strict';
  var doc = document;

  function ready(fn) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    var mq = window.matchMedia('(max-width: 960px)');
    var header = doc.querySelector('header.nav');

    /* ---------- Reviews: duplicate cards once so the loop never jumps ---------- */
    doc.querySelectorAll('.stories .marquee').forEach(function (row) {
      if (row.dataset.looped) return;
      row.dataset.looped = 'true';
      Array.prototype.slice.call(row.children).forEach(function (card) {
        var clone = card.cloneNode(true);
        clone.classList.remove('scroll-reveal', 'is-visible'); // clones must be visible immediately
        clone.style.removeProperty('--reveal-delay');
        clone.removeAttribute('data-reveal-initialized');
        clone.setAttribute('aria-hidden', 'true');
        row.appendChild(clone);
      });
      row.classList.add('is-looped');
    });

    /* ---------- Mobile: after tapping a dashboard/admin menu item, show its content ---------- */
    doc.addEventListener('click', function (e) {
      if (!mq.matches) return;
      var t = e.target.closest && e.target.closest('.dashboard-tab, [data-admin-view]');
      if (!t) return;
      var target = doc.querySelector('.dashboard-main') || doc.querySelector('.admin-main');
      if (!target) return;
      setTimeout(function () {
        var navH = (header ? header.offsetHeight : 56) + 20;
        var top = target.getBoundingClientRect().top;
        if (top < navH - 4 || top > window.innerHeight * 0.45) {
          var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          window.scrollTo({ top: window.pageYOffset + top - navH, behavior: reduce ? 'auto' : 'smooth' });
        }
      }, 60);
    });
  });
})();
