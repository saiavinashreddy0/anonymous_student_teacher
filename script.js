/* ═══════════════════════════════════════════
   DEMO STATE (localStorage — shared store)
   ═══════════════════════════════════════════ */
const SK='qrds_s', DK='qrds_d', STK='qrds_st';
let tFilter='all', openAns={}, myIds=[], joined=false;

const gS  = () => { try { return JSON.parse(localStorage.getItem(SK)); } catch { return null; } };
const sS  = v  => localStorage.setItem(SK, JSON.stringify(v));
const clr = () => [SK, DK, STK].forEach(k => localStorage.removeItem(k));
const gD  = () => { try { return JSON.parse(localStorage.getItem(DK)) || []; } catch { return []; } };
const sD  = a  => localStorage.setItem(DK, JSON.stringify(a));
const gSt = () => parseInt(localStorage.getItem(STK) || '0');
const iSt = () => localStorage.setItem(STK, gSt() + 1);
const dSt = () => localStorage.setItem(STK, Math.max(0, gSt() - 1));
const ago = ts => { const m = Math.floor((Date.now() - ts) / 60000); return m < 1 ? 'just now' : m < 60 ? m + 'm ago' : Math.floor(m / 60) + 'h ago'; };
const esc = t  => { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; };
const g5  = () => String(Math.floor(10000 + Math.random() * 90000));

/* ─── TEACHER ─── */
function teacherCreateSession() {
  const c = g5();
  sS({ code: c, ts: Date.now() }); sD([]); localStorage.setItem(STK, '0'); openAns = {};
  showActive(c);
  showToast('✅ Session created — share the code or QR!', 'success');
}

function showActive(code) {
  document.getElementById('t-no-session').style.display = 'none';
  document.getElementById('t-active-session').style.display = 'block';
  document.getElementById('display-code').textContent = code.split('').join('  ');
  // QR Code
  const w = document.getElementById('qr-canvas-wrap'); w.innerHTML = '';
  const url = window.location.href.split('#')[0] + '#demo?code=' + code;
  new QRCode(w, { text: url, width: 150, height: 150, colorDark: '#0d1425', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
  renderFeed(); updateMeta();
}

function teacherEnd() {
  if (!confirm('End session and clear all doubts?')) return;
  clr();
  if (joined) sLeave(true);
  document.getElementById('t-no-session').style.display = 'block';
  document.getElementById('t-active-session').style.display = 'none';
  showToast('Session ended.', 'info');
}

function renderFeed() {
  if (!gS()) return;
  const q = (document.getElementById('t-search')?.value || '').toLowerCase();
  let ds = gD();
  if (tFilter !== 'all') ds = ds.filter(d => d.status === tFilter);
  if (q) ds = ds.filter(d => d.text.toLowerCase().includes(q) || d.subj.toLowerCase().includes(q));
  const feed = document.getElementById('doubts-feed'); if (!feed) return;
  if (!ds.length) { feed.innerHTML = '<div class="empty-state"><div class="ei">📭</div><p>No doubts yet. Waiting for students.</p></div>'; return; }
  const cm = { concept: 'pill-concept', exam: 'pill-exam', assignment: 'pill-assignment', general: 'pill-general' };
  feed.innerHTML = ds.map(d => {
    const op = openAns[d.id] || false;
    return `<div class="doubt-card ${d.status === 'answered' ? 'answered-card' : 'pending-card'}">
      <div class="dc-question">${esc(d.text)}</div>
      <div class="dc-meta">
        <span class="pill ${cm[d.cat] || 'pill-general'}">${d.cat}</span>
        <span class="pill pill-${d.status}">${d.status}</span>
        <span style="font-size:0.62rem;color:var(--muted)">📚 ${esc(d.subj)}</span>
        <button class="upvote-btn ${d._v ? 'voted' : ''}" onclick="tUp('${d.id}')">▲ <span>${d.upvotes}</span></button>
        <button class="btn-del" onclick="tDel('${d.id}')">🗑</button>
        <span class="time-lbl">${ago(d.ts)}</span>
      </div>
      ${d.answer ? `<div class="dc-answer-box"><div class="dc-answer-lbl">✅ Your Answer</div><div class="dc-answer-text">${esc(d.answer)}</div></div>` : ''}
      <button class="btn-open-answer" onclick="togAns('${d.id}')">${d.answer ? '✏️ Edit Answer' : '✏️ Answer this Doubt'}</button>
      <div class="answer-form ${op ? 'open' : ''}" id="af-${d.id}">
        <textarea id="at-${d.id}" placeholder="Type a helpful answer..." rows="3">${esc(d.answer || '')}</textarea>
        <div class="answer-form-btns">
          <button class="btn-post-ans" onclick="postAns('${d.id}')">Post Answer →</button>
          <button class="btn-cancel-ans" onclick="togAns('${d.id}')">Cancel</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function togAns(id) { openAns[id] = !openAns[id]; renderFeed(); setTimeout(() => { const a = document.getElementById('af-' + id); if (a && openAns[id]) { a.querySelector('textarea').focus(); a.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } }, 80); }
function postAns(id) { const el = document.getElementById('at-' + id); if (!el) return; const a = el.value.trim(); if (!a || a.length < 5) { showToast('Write a proper answer (min 5 chars)', 'error'); return; } const ds = gD(); const d = ds.find(x => x.id === id); if (!d) return; d.answer = a; d.status = 'answered'; sD(ds); openAns[id] = false; showToast('✅ Answer posted!', 'success'); renderFeed(); updateMeta(); renderMine(); }
function tUp(id) { const ds = gD(); const d = ds.find(x => x.id === id); if (!d) return; if (d._v) { d.upvotes = Math.max(0, d.upvotes - 1); d._v = false; } else { d.upvotes++; d._v = true; } sD(ds); renderFeed(); }
function tDel(id) { if (!confirm('Delete this doubt?')) return; sD(gD().filter(d => d.id !== id)); myIds = myIds.filter(x => x !== id); showToast('Deleted', 'info'); renderFeed(); updateMeta(); renderMine(); }
function setFilter(el) { tFilter = el.dataset.f; document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('on')); el.classList.add('on'); renderFeed(); }
function updateMeta() { const all = gD(); ['sm-total','sm-pending','sm-answered','sm-students'].forEach((id, i) => { const el = document.getElementById(id); if (!el) return; if (i === 0) el.textContent = all.length; else if (i === 1) el.textContent = all.filter(d => d.status === 'pending').length; else if (i === 2) el.textContent = all.filter(d => d.status === 'answered').length; else el.textContent = gSt(); }); }

/* ─── STUDENT ─── */
function dIn(el, i) { el.value = el.value.replace(/\D/g, '').slice(-1); el.classList.toggle('filled', el.value !== ''); if (el.value && i < 4) document.getElementById('d' + (i + 1)).focus(); chkJoin(); }
function dKey(e, i) { if (e.key === 'Backspace' && !document.getElementById('d' + i).value && i > 0) { const p = document.getElementById('d' + (i - 1)); p.value = ''; p.classList.remove('filled'); p.focus(); } if (e.key === 'Enter') sJoin(); }
const gCode = () => [0, 1, 2, 3, 4].map(i => document.getElementById('d' + i).value).join('');
function chkJoin() { document.getElementById('btn-join').disabled = gCode().length !== 5; }

function checkURL() {
  const m = window.location.hash.match(/[?&]code=(\d{5})/);
  if (m) { m[1].split('').forEach((c, i) => { const el = document.getElementById('d' + i); el.value = c; el.classList.add('filled'); }); chkJoin(); setTimeout(sJoin, 400); }
}

function sJoin() {
  const t = gCode(); if (t.length !== 5) { showToast('Enter all 5 digits', 'error'); return; }
  const sess = gS();
  if (!sess || sess.code !== t) {
    document.getElementById('digit-group').classList.add('gate-shake');
    setTimeout(() => document.getElementById('digit-group').classList.remove('gate-shake'), 450);
    const e = document.getElementById('gate-err'); e.classList.add('show'); setTimeout(() => e.classList.remove('show'), 3500);
    return;
  }
  joined = true; iSt();
  document.getElementById('joined-code').textContent = t;
  document.getElementById('s-gate').style.display = 'none';
  document.getElementById('s-form').style.display = 'block';
  showToast('🎓 Joined session ' + t + ' — ask anonymously!', 'success');
  renderMine();
}

function sLeave(silent = false) {
  if (joined) { dSt(); joined = false; } myIds = [];
  document.getElementById('s-form').style.display = 'none';
  document.getElementById('s-gate').style.display = 'block';
  [0, 1, 2, 3, 4].forEach(i => { const el = document.getElementById('d' + i); el.value = ''; el.classList.remove('filled'); });
  chkJoin(); if (!silent) showToast('Left session', 'info');
}

function sSubmit() {
  const text = document.getElementById('s-doubt').value.trim();
  const cat  = document.getElementById('s-cat').value;
  const subj = document.getElementById('s-subj').value;
  if (!text || text.length < 8) { showToast('Write a more detailed doubt (min 8 chars)', 'error'); return; }
  if (!gS()) { showToast('Session ended. Ask teacher to create a new one.', 'error'); sLeave(true); return; }
  const btn = document.getElementById('s-btn'), sp = document.getElementById('s-spin'), bt = document.getElementById('s-btn-txt');
  btn.disabled = true; sp.style.display = 'block'; bt.style.display = 'none';
  setTimeout(() => {
    const id = 'd' + Date.now();
    const ds = gD(); ds.unshift({ id, text, cat, subj, upvotes: 0, ts: Date.now(), status: 'pending', answer: '' });
    sD(ds); myIds.unshift(id);
    document.getElementById('s-doubt').value = ''; updateChar();
    btn.disabled = false; sp.style.display = 'none'; bt.style.display = 'block';
    const sf = document.getElementById('s-ok'); sf.style.display = 'block'; setTimeout(() => sf.style.display = 'none', 3500);
    showToast('✓ Doubt submitted anonymously!', 'success'); renderMine();
  }, 650);
}

function renderMine() {
  const mine = gD().filter(d => myIds.includes(d.id));
  const el = document.getElementById('my-list'); if (!el) return;
  if (!mine.length) { el.innerHTML = '<div class="empty-state"><div class="ei">📭</div><p>No doubts submitted yet</p></div>'; return; }
  const cm = { concept: 'pill-concept', exam: 'pill-exam', assignment: 'pill-assignment', general: 'pill-general' };
  el.innerHTML = mine.map(d => `
    <div class="doubt-card ${d.status === 'answered' ? 'answered-card' : 'pending-card'}" style="margin-bottom:8px">
      <div class="dc-question">${esc(d.text)}</div>
      <div class="dc-meta">
        <span class="pill ${cm[d.cat] || 'pill-general'}">${d.cat}</span>
        <span class="pill pill-${d.status}">${d.status}</span>
        <span class="time-lbl">${ago(d.ts)}</span>
      </div>
      ${d.answer ? `<div class="dc-answer-box"><div class="dc-answer-lbl">Teacher's Answer</div><div class="dc-answer-text">${esc(d.answer)}</div></div>` : '<div style="font-size:0.78rem;color:var(--muted);margin-top:4px">⏳ Waiting for answer...</div>'}
    </div>`).join('');
}

function updateChar() { const v = document.getElementById('s-doubt').value.length; document.getElementById('char-lbl').textContent = v + ' / 500'; const p = (v / 500) * 100; const f = document.getElementById('char-fill'); f.style.width = p + '%'; f.style.background = p > 80 ? 'linear-gradient(90deg,#fb923c,#f87171)' : 'linear-gradient(90deg,#38bdf8,#818cf8)'; }

/* Role toggle — reorders panels on mobile */
function switchRole(r) {
  const st = document.getElementById('rt-student'), te = document.getElementById('rt-teacher');
  if (r === 'teacher') { te.className = 'role-tab t-active'; st.className = 'role-tab'; document.getElementById('teacher-panel').style.order = '1'; document.getElementById('student-panel').style.order = '2'; }
  else { st.className = 'role-tab s-active'; te.className = 'role-tab'; document.getElementById('student-panel').style.order = '1'; document.getElementById('teacher-panel').style.order = '2'; }
}

/* Auto-poll every 1.5s for real-time sync */
let lastH = '';
setInterval(() => {
  const s = gS();
  if (s && document.getElementById('t-active-session').style.display !== 'none') {
    const h = gD().map(d => d.id + '|' + d.status + '|' + d.upvotes).join(',') + gSt();
    if (h !== lastH) { lastH = h; renderFeed(); updateMeta(); }
  }
  if (joined && !s) { showToast('Session ended by teacher.', 'info'); sLeave(true); }
  if (joined) renderMine();
}, 1500);

document.addEventListener('keydown', e => { if (e.ctrlKey && e.key === 'Enter' && document.activeElement.id === 's-doubt') sSubmit(); });

/* ═══════════════════════════════════
   PHASE NAV
   ═══════════════════════════════════ */
function showPhase(n, btn) {
  document.querySelectorAll('.phase-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.phase-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('ph' + n).classList.add('active');
}

/* ═══════════════════════════════════
   PERSONA TABS
   ═══════════════════════════════════ */
function showPersona(id, btn) {
  document.querySelectorAll('.ptab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.persona-content').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(id).classList.add('active');
}

/* ═══════════════════════════════════
   SOLUTION STEP ROWS
   ═══════════════════════════════════ */
function setStep(el) {
  document.querySelectorAll('.step-row').forEach(r => r.classList.remove('active'));
  el.classList.add('active');
  const p = el.querySelector('p'); if (p) document.getElementById('phone-preview').textContent = p.textContent;
}

/* ═══════════════════════════════════
   TOAST
   ═══════════════════════════════════ */
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast'); t.textContent = msg; t.className = 'show ' + type;
  setTimeout(() => t.className = '', 2800);
}

/* ═══════════════════════════════════
   HAMBURGER / MOBILE NAV
   ═══════════════════════════════════ */
document.getElementById('hamburger').addEventListener('click', function () {
  document.getElementById('mobile-menu').classList.toggle('open');
});
document.querySelectorAll('.mm-lnk').forEach(a => a.addEventListener('click', () => document.getElementById('mobile-menu').classList.remove('open')));

/* ═══════════════════════════════════
   CUSTOM CURSOR
   ═══════════════════════════════════ */
const cur = document.getElementById('cursor'), ring = document.getElementById('cursor-ring');
let rx = 0, ry = 0, mx = 0, my = 0;
document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; cur.style.left = mx + 'px'; cur.style.top = my + 'px'; });
(function animRing() { rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12; ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; requestAnimationFrame(animRing); })();

/* ═══════════════════════════════════
   SCROLL REVEAL
   ═══════════════════════════════════ */
function initReveal() {
  const obs = new IntersectionObserver(es => {
    es.forEach((e, i) => { if (e.isIntersecting) { setTimeout(() => e.target.classList.add('visible'), 80 * i); obs.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

/* ═══════════════════════════════════
   ANIMATED COUNTERS
   ═══════════════════════════════════ */
function initCounters() {
  const obs = new IntersectionObserver(es => {
    es.forEach(e => {
      if (e.isIntersecting) {
        const el = e.target, t = parseInt(el.dataset.target), s = el.dataset.suffix || '';
        let v = 0; const inc = t / (1800 / 16);
        const ix = setInterval(() => { v += inc; if (v >= t) { v = t; clearInterval(ix); } el.textContent = Math.round(v) + s; }, 16);
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.counter').forEach(el => obs.observe(el));
}

/* ═══════════════════════════════════
   PROGRESS BARS (Findings section)
   ═══════════════════════════════════ */
function initProgressBars() {
  const obs = new IntersectionObserver(es => {
    es.forEach(e => {
      if (e.isIntersecting) {
        const fill = e.target;
        const w = fill.dataset.width;
        const pctId = fill.id.replace('pf', 'p-pct-');
        fill.style.width = w + '%';
        const pctEl = document.getElementById(pctId);
        if (pctEl) { let v = 0; const inc = parseInt(w) / (1200 / 16); const ix = setInterval(() => { v += inc; if (v >= parseInt(w)) { v = parseInt(w); clearInterval(ix); } if (pctEl) pctEl.textContent = Math.round(v) + '%'; }, 16); }
        obs.unobserve(fill);
      }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('.prog-fill').forEach(el => obs.observe(el));
}

/* ═══════════════════════════════════
   NAV ACTIVE ON SCROLL
   ═══════════════════════════════════ */
function initNavSpy() {
  const sections = document.querySelectorAll('section[id], div[id]');
  const links = document.querySelectorAll('.nav-lnk');
  window.addEventListener('scroll', () => {
    let cur = '';
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 120) cur = s.id; });
    links.forEach(a => { a.classList.toggle('active', a.getAttribute('href') === '#' + cur); });
    document.getElementById('btt').classList.toggle('show', window.scrollY > 400);
  });
}

/* ═══════════════════════════════════
   PARTICLES
   ═══════════════════════════════════ */
function initPart() {
  const c = document.getElementById('particles-canvas'), ctx = c.getContext('2d');
  c.width = window.innerWidth; c.height = window.innerHeight;
  window.addEventListener('resize', () => { c.width = window.innerWidth; c.height = window.innerHeight; });
  const R = [{ r: 56, g: 189, b: 248 }, { r: 129, g: 140, b: 248 }, { r: 52, g: 211, b: 153 }];
  const pts = Array.from({ length: 48 }, () => { const cl = R[Math.floor(Math.random() * 3)]; return { x: Math.random() * c.width, y: Math.random() * c.height, vx: (Math.random() - .5) * .28, vy: (Math.random() - .5) * .28, rad: Math.random() * 1.8 + .4, ...cl }; });
  (function draw() {
    ctx.clearRect(0, 0, c.width, c.height);
    pts.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0; if (p.y < 0) p.y = c.height; if (p.y > c.height) p.y = 0; ctx.beginPath(); ctx.arc(p.x, p.y, p.rad, 0, Math.PI * 2); ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},0.5)`; ctx.fill(); });
    pts.forEach((p, i) => { for (let j = i + 1; j < pts.length; j++) { const d = Math.hypot(p.x - pts[j].x, p.y - pts[j].y); if (d < 110) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(pts[j].x, pts[j].y); ctx.strokeStyle = `rgba(56,189,248,${.05 * (1 - d / 110)})`; ctx.lineWidth = .5; ctx.stroke(); } } });
    requestAnimationFrame(draw);
  })();
}

/* ═══════════════════════════════════
   BOOT
   ═══════════════════════════════════ */
function initApp() {
  initPart(); initReveal(); initCounters(); initProgressBars(); initNavSpy();
  // Restore existing session on teacher side
  const s = gS(); if (s) showActive(s.code);
  // Auto-fill code from URL if QR was scanned
  checkURL();
}

/* LOADER */
const msgs = ["Initializing...", "Loading data...", "Preparing demo...", "Almost ready..."];
let pct = 0, mi = 0;
const lf = document.getElementById('lf'), lt = document.getElementById('lt');
const lx = setInterval(() => {
  pct += Math.random() * 18 + 6; if (pct > 100) pct = 100;
  lf.style.width = pct + '%';
  if (pct > 25 && mi < 1) { mi = 1; lt.textContent = msgs[1]; }
  if (pct > 55 && mi < 2) { mi = 2; lt.textContent = msgs[2]; }
  if (pct > 80 && mi < 3) { mi = 3; lt.textContent = msgs[3]; }
  if (pct >= 100) { clearInterval(lx); setTimeout(() => { document.getElementById('loader').style.opacity = '0'; setTimeout(() => { document.getElementById('loader').style.display = 'none'; initApp(); }, 600); }, 400); }
}, 80);
