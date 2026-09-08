/* Pixl Studio — admin panel logic.
   Talks to the Netlify Functions API (/api/content, /api/login, /api/upload)
   backed by Netlify Blobs, so edits are live in a real database for every
   visitor — not just this browser. Requires the site to be deployed on
   Netlify with ADMIN_PASSWORD and ADMIN_SECRET environment variables set. */

let state = null; // working copy of content
let editing = { portfolio: null, team: null, clients: null, testimonials: null };

/* ---------------- utils ---------------- */

function uid() { return Math.random().toString(36).slice(2, 10); }

function esc(str) {
  if (str === undefined || str === null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2600);
}

function resizeImage(file, maxW) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read image.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxW) { height = Math.round(height * (maxW / width)); width = maxW; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadImage(file, maxW) {
  const dataUrl = await resizeImage(file, maxW);
  const res = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed (${res.status})`);
  }
  const { url } = await res.json();
  return url;
}

async function saveState(msg) {
  try {
    const res = await fetch('/api/content', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    if (res.status === 401) {
      toast('Your session expired — please log in again.');
      setTimeout(() => location.reload(), 1200);
      return;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Save failed (${res.status})`);
    }
    renderDashboardStats();
    toast(msg || 'Saved — live on the site for everyone right now.');
  } catch (e) {
    toast('Could not save: ' + e.message);
  }
}

/* ---------------- auth gate ---------------- */

async function initAuth() {
  const gate = document.getElementById('login-gate');
  const app = document.getElementById('app');
  const title = document.getElementById('login-title');
  const sub = document.getElementById('login-sub');
  const btn = document.getElementById('login-btn');
  const err = document.getElementById('login-error');
  const pwField = document.getElementById('password-input');

  let session;
  try {
    const res = await fetch('/api/session', { credentials: 'include', cache: 'no-store' });
    session = await res.json();
  } catch (e) {
    title.textContent = "Can't reach the server";
    sub.innerHTML = "This admin panel needs to run on your deployed Netlify site — it won't work when previewing files locally. Open <code>your-site.netlify.app/admin/</code> instead.";
    pwField.parentElement.style.display = 'none';
    btn.style.display = 'none';
    return;
  }

  if (!session.configured) {
    title.textContent = 'Almost there';
    sub.innerHTML = "Your site is deployed, but the admin password hasn't been set yet. In Netlify: <b>Site configuration → Environment variables</b>, add <code>ADMIN_PASSWORD</code> (your password) and <code>ADMIN_SECRET</code> (any random string), then redeploy.";
    pwField.parentElement.style.display = 'none';
    btn.style.display = 'none';
    return;
  }

  if (session.authed) {
    gate.style.display = 'none';
    app.style.display = 'block';
    boot();
    return;
  }

  btn.addEventListener('click', async () => {
    const pw = pwField.value;
    if (!pw) return;
    btn.disabled = true;
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        err.textContent = 'Incorrect password. Try again.';
        err.style.display = 'block';
        return;
      }
      gate.style.display = 'none';
      app.style.display = 'block';
      boot();
    } catch (e) {
      err.textContent = 'Could not reach the server. Try again.';
      err.style.display = 'block';
    } finally {
      btn.disabled = false;
    }
  });

  pwField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btn.click();
  });
}

document.addEventListener('DOMContentLoaded', initAuth);

/* ---------------- boot / tabs ---------------- */

async function loadContent() {
  const res = await fetch('/api/content', { cache: 'no-store' });
  return await res.json();
}

async function boot() {
  state = await loadContent();
  wireTabs();
  wireLock();
  fillSettings();
  fillHero();
  fillAbout();
  fillQuotes();
  fillContactPage();
  renderPortfolioList();
  renderTeamList();
  renderClientsList();
  renderTestimonialsList();
  renderDashboardStats();
  wireItemForms();
  wirePublishTab();
}

function wireTabs() {
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
      document.getElementById('tab-' + btn.dataset.tab).style.display = 'block';
    });
  });
}

function wireLock() {
  document.getElementById('lock-btn').addEventListener('click', async () => {
    try { await fetch('/api/logout', { method: 'POST', credentials: 'include' }); } catch (e) {}
    location.reload();
  });
}

function renderDashboardStats() {
  const el = document.getElementById('dashboard-stats');
  if (!el) return;
  const stats = [
    ['Portfolio items', state.portfolio.length],
    ['Team members', state.team.length],
    ['Client logos', state.clients.length],
    ['Testimonials', state.testimonials.length],
  ];
  el.innerHTML = stats.map(([label, val]) => `
    <div style="background:var(--bg); border-radius:12px; padding:18px;">
      <div style="font-family:'Anton',sans-serif; font-size:30px; color:var(--primary);">${val}</div>
      <div style="font-size:12px; color:#8a7a5f; text-transform:uppercase; font-weight:700; margin-top:4px;">${label}</div>
    </div>`).join('');
}

/* ---------------- settings tab ---------------- */

function fillSettings() {
  document.getElementById('s-name').value = state.site.name;
  document.getElementById('s-tagline').value = state.site.tagline;
  document.getElementById('s-primary').value = state.site.primaryColor;
  document.getElementById('s-primary-hex').value = state.site.primaryColor;
  document.getElementById('s-bg').value = state.site.bgColor;
  document.getElementById('s-bg-hex').value = state.site.bgColor;
  document.getElementById('s-email').value = state.site.email;
  document.getElementById('s-phone').value = state.site.phone;
  document.getElementById('s-address').value = state.site.address;
  document.getElementById('s-instagram').value = state.site.social.instagram || '';
  document.getElementById('s-twitter').value = state.site.social.twitter || '';
  document.getElementById('s-linkedin').value = state.site.social.linkedin || '';
  document.getElementById('s-behance').value = state.site.social.behance || '';

  const syncColor = (colorId, hexId) => {
    document.getElementById(colorId).addEventListener('input', e => document.getElementById(hexId).value = e.target.value);
    document.getElementById(hexId).addEventListener('input', e => document.getElementById(colorId).value = e.target.value);
  };
  syncColor('s-primary', 's-primary-hex');
  syncColor('s-bg', 's-bg-hex');

  document.getElementById('save-settings').addEventListener('click', async () => {
    state.site.name = document.getElementById('s-name').value;
    state.site.tagline = document.getElementById('s-tagline').value;
    state.site.primaryColor = document.getElementById('s-primary-hex').value;
    state.site.bgColor = document.getElementById('s-bg-hex').value;
    state.site.email = document.getElementById('s-email').value;
    state.site.phone = document.getElementById('s-phone').value;
    state.site.address = document.getElementById('s-address').value;
    state.site.social.instagram = document.getElementById('s-instagram').value;
    state.site.social.twitter = document.getElementById('s-twitter').value;
    state.site.social.linkedin = document.getElementById('s-linkedin').value;
    state.site.social.behance = document.getElementById('s-behance').value;
    await saveState('Site settings saved.');
  });
}

/* ---------------- hero tab ---------------- */

function fillHero() {
  document.getElementById('h-line1').value = state.hero.line1;
  document.getElementById('h-line2').value = state.hero.line2;
  document.getElementById('h-banner').value = state.hero.bannerText;
  document.getElementById('h-cta-text').value = state.hero.ctaText;
  document.getElementById('h-cta-link').value = state.hero.ctaLink;
  document.getElementById('h-badge-text').value = state.hero.badgeText;
  document.getElementById('h-badge-link').value = state.hero.badgeLink;

  document.getElementById('save-hero').addEventListener('click', async () => {
    state.hero.line1 = document.getElementById('h-line1').value;
    state.hero.line2 = document.getElementById('h-line2').value;
    state.hero.bannerText = document.getElementById('h-banner').value;
    state.hero.ctaText = document.getElementById('h-cta-text').value;
    state.hero.ctaLink = document.getElementById('h-cta-link').value;
    state.hero.badgeText = document.getElementById('h-badge-text').value;
    state.hero.badgeLink = document.getElementById('h-badge-link').value;
    await saveState('Hero section saved.');
  });
}

/* ---------------- about / process tab ---------------- */

function fillAbout() {
  document.getElementById('a-eyebrow').value = state.intro.eyebrow;
  document.getElementById('a-heading').value = state.intro.heading;
  document.getElementById('a-text').value = state.intro.text;
  document.getElementById('a-work-heading').value = state.workHeading;

  const wrap = document.getElementById('process-fields');
  wrap.innerHTML = state.process.map((p, i) => `
    <div class="field-row" style="margin-bottom:8px;">
      <div class="field"><label>Step ${i + 1} Number/Label</label><input data-i="${i}" class="proc-num" value="${esc(p.number)}"></div>
      <div class="field"><label>Step ${i + 1} Title</label><input data-i="${i}" class="proc-title" value="${esc(p.title)}"></div>
    </div>
    <div class="field" style="margin-bottom:18px;"><label>Step ${i + 1} Description</label><textarea data-i="${i}" class="proc-text">${esc(p.text)}</textarea></div>
  `).join('');

  document.getElementById('save-about').addEventListener('click', async () => {
    state.intro.eyebrow = document.getElementById('a-eyebrow').value;
    state.intro.heading = document.getElementById('a-heading').value;
    state.intro.text = document.getElementById('a-text').value;
    state.workHeading = document.getElementById('a-work-heading').value;
    document.querySelectorAll('.proc-num').forEach(inp => state.process[inp.dataset.i].number = inp.value);
    document.querySelectorAll('.proc-title').forEach(inp => state.process[inp.dataset.i].title = inp.value);
    document.querySelectorAll('.proc-text').forEach(inp => state.process[inp.dataset.i].text = inp.value);
    await saveState('About & process saved.');
  });
}

/* ---------------- quotes tab ---------------- */

function fillQuotes() {
  document.getElementById('q1-text').value = state.quote1.text;
  document.getElementById('q1-author').value = state.quote1.author;
  document.getElementById('q1-role').value = state.quote1.role;
  document.getElementById('q2-text').value = state.quote2.text;
  document.getElementById('q2-author').value = state.quote2.author;
  document.getElementById('q2-role').value = state.quote2.role;

  document.getElementById('save-quotes').addEventListener('click', async () => {
    state.quote1 = {
      text: document.getElementById('q1-text').value,
      author: document.getElementById('q1-author').value,
      role: document.getElementById('q1-role').value,
    };
    state.quote2 = {
      text: document.getElementById('q2-text').value,
      author: document.getElementById('q2-author').value,
      role: document.getElementById('q2-role').value,
    };
    await saveState('Quotes saved.');
  });
}

/* ---------------- contact page tab ---------------- */

function fillContactPage() {
  document.getElementById('ct-heading').value = state.contact.heading;
  document.getElementById('ct-text').value = state.contact.text;
  document.getElementById('save-contact').addEventListener('click', async () => {
    state.contact.heading = document.getElementById('ct-heading').value;
    state.contact.text = document.getElementById('ct-text').value;
    await saveState('Contact page saved.');
  });
}

/* ---------------- generic item CRUD helpers ---------------- */

function openForm(formId) { document.getElementById(formId).classList.add('open'); }
function closeForm(formId) { document.getElementById(formId).classList.remove('open'); }

/* ---- Portfolio ---- */

function renderPortfolioList() {
  const el = document.getElementById('portfolio-list');
  el.innerHTML = state.portfolio.length ? state.portfolio.map(p => `
    <div class="item-card">
      <div class="thumb" style="background-image:url('${esc(p.image)}')"></div>
      <div class="meta">
        <div class="t1">${esc(p.title)} <span class="tag">${esc(p.category)}</span></div>
        <div class="t2">${esc(p.date)}</div>
      </div>
      <div class="actions">
        <button class="btn btn-outline btn-sm" onclick="editPortfolio('${p.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deletePortfolio('${p.id}')">Delete</button>
      </div>
    </div>`).join('') : '<p class="hint">No projects yet. Click "Add project" to create one.</p>';
}

function editPortfolio(id) {
  const p = state.portfolio.find(x => x.id === id);
  editing.portfolio = id;
  document.getElementById('p-id').value = p.id;
  document.getElementById('p-title').value = p.title;
  document.getElementById('p-category').value = p.category;
  document.getElementById('p-date').value = p.date;
  document.getElementById('p-link').value = p.link || '';
  document.getElementById('p-description').value = p.description || '';
  document.getElementById('p-image').value = p.image || '';
  document.getElementById('p-image-preview').style.backgroundImage = p.image ? `url('${p.image}')` : '';
  openForm('form-portfolio');
}
async function deletePortfolio(id) {
  if (!confirm('Delete this project?')) return;
  state.portfolio = state.portfolio.filter(x => x.id !== id);
  renderPortfolioList();
  await saveState('Project deleted.');
}

/* ---- Team ---- */

// Team items are keyed by array index for simplicity (no separate id field in schema)
function editTeamByIndex(i) {
  const t = state.team[i];
  editing.team = i;
  document.getElementById('tm-id').value = i;
  document.getElementById('tm-name').value = t.name;
  document.getElementById('tm-role').value = t.role;
  document.getElementById('tm-image').value = t.image || '';
  document.getElementById('tm-image-preview').style.backgroundImage = t.image ? `url('${t.image}')` : '';
  openForm('form-team');
}
async function deleteTeam(i) {
  if (!confirm('Delete this team member?')) return;
  state.team.splice(i, 1);
  renderTeamList();
  await saveState('Team member deleted.');
}
function renderTeamList() {
  const el = document.getElementById('team-list');
  el.innerHTML = state.team.length ? state.team.map((t, i) => `
    <div class="item-card">
      <div class="thumb" style="background-image:url('${esc(t.image)}')"></div>
      <div class="meta">
        <div class="t1">${esc(t.name)}</div>
        <div class="t2">${esc(t.role)}</div>
      </div>
      <div class="actions">
        <button class="btn btn-outline btn-sm" onclick="editTeamByIndex(${i})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteTeam(${i})">Delete</button>
      </div>
    </div>`).join('') : '<p class="hint">No team members yet.</p>';
}

/* ---- Clients ---- */

function renderClientsList() {
  const el = document.getElementById('clients-list');
  el.innerHTML = state.clients.length ? state.clients.map((c, i) => `
    <div class="item-card">
      <div class="thumb" style="background-image:url('${esc(c.logo)}'); ${c.logo ? '' : 'display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#8a7a5f;'}">${c.logo ? '' : esc(c.name.slice(0,2).toUpperCase())}</div>
      <div class="meta">
        <div class="t1">${esc(c.name)}</div>
        <div class="t2">${esc(c.link || 'No link set')}</div>
      </div>
      <div class="actions">
        <button class="btn btn-outline btn-sm" onclick="editClientByIndex(${i})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteClient(${i})">Delete</button>
      </div>
    </div>`).join('') : '<p class="hint">No client logos yet.</p>';
}
function editClientByIndex(i) {
  const c = state.clients[i];
  editing.clients = i;
  document.getElementById('c-id').value = i;
  document.getElementById('c-name').value = c.name;
  document.getElementById('c-link').value = c.link || '';
  document.getElementById('c-image').value = c.logo || '';
  document.getElementById('c-image-preview').style.backgroundImage = c.logo ? `url('${c.logo}')` : '';
  openForm('form-clients');
}
async function deleteClient(i) {
  if (!confirm('Delete this client logo?')) return;
  state.clients.splice(i, 1);
  renderClientsList();
  await saveState('Client removed.');
}

/* ---- Testimonials ---- */

function renderTestimonialsList() {
  const el = document.getElementById('testimonials-list');
  el.innerHTML = state.testimonials.length ? state.testimonials.map((t, i) => `
    <div class="item-card">
      <div class="meta">
        <div class="t1">"${esc(t.quote.slice(0, 60))}${t.quote.length > 60 ? '…' : ''}"</div>
        <div class="t2">${esc(t.author)}, ${esc(t.role)}</div>
      </div>
      <div class="actions">
        <button class="btn btn-outline btn-sm" onclick="editTestimonialByIndex(${i})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteTestimonial(${i})">Delete</button>
      </div>
    </div>`).join('') : '<p class="hint">No testimonials yet.</p>';
}
function editTestimonialByIndex(i) {
  const t = state.testimonials[i];
  editing.testimonials = i;
  document.getElementById('t-id').value = i;
  document.getElementById('t-quote').value = t.quote;
  document.getElementById('t-author').value = t.author;
  document.getElementById('t-role').value = t.role;
  openForm('form-testimonials');
}
async function deleteTestimonial(i) {
  if (!confirm('Delete this testimonial?')) return;
  state.testimonials.splice(i, 1);
  renderTestimonialsList();
  await saveState('Testimonial removed.');
}

/* ---------------- wire add/save/cancel + image uploads ---------------- */

function wireUpload(fileInputId, hiddenInputId, previewId, maxW) {
  document.getElementById(fileInputId).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = document.getElementById(previewId);
    preview.style.opacity = '0.4';
    try {
      const url = await uploadImage(file, maxW);
      document.getElementById(hiddenInputId).value = url;
      preview.style.backgroundImage = `url('${url}')`;
    } catch (err) {
      toast('Upload failed: ' + err.message);
    } finally {
      preview.style.opacity = '1';
    }
  });
}

function wireItemForms() {
  // Portfolio
  document.getElementById('add-portfolio').addEventListener('click', () => {
    editing.portfolio = null;
    ['p-id','p-title','p-category','p-date','p-link','p-description','p-image'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('p-image-preview').style.backgroundImage = '';
    openForm('form-portfolio');
  });
  wireUpload('p-image-file', 'p-image', 'p-image-preview', 1600);
  document.getElementById('save-portfolio-item').addEventListener('click', async () => {
    const title = document.getElementById('p-title').value.trim();
    if (!title) { toast('Title is required.'); return; }
    const item = {
      id: editing.portfolio || uid(),
      title,
      category: document.getElementById('p-category').value.trim() || 'PROJECT',
      date: document.getElementById('p-date').value.trim(),
      link: document.getElementById('p-link').value.trim(),
      description: document.getElementById('p-description').value.trim(),
      image: document.getElementById('p-image').value,
    };
    if (editing.portfolio) {
      const idx = state.portfolio.findIndex(x => x.id === editing.portfolio);
      state.portfolio[idx] = item;
    } else {
      state.portfolio.push(item);
    }
    closeForm('form-portfolio');
    renderPortfolioList();
    await saveState('Project saved.');
  });
  document.getElementById('cancel-portfolio-item').addEventListener('click', () => closeForm('form-portfolio'));

  // Team
  document.getElementById('add-team').addEventListener('click', () => {
    editing.team = null;
    ['tm-id','tm-name','tm-role','tm-image'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('tm-image-preview').style.backgroundImage = '';
    openForm('form-team');
  });
  wireUpload('tm-image-file', 'tm-image', 'tm-image-preview', 800);
  document.getElementById('save-team-item').addEventListener('click', async () => {
    const name = document.getElementById('tm-name').value.trim();
    if (!name) { toast('Name is required.'); return; }
    const item = {
      name,
      role: document.getElementById('tm-role').value.trim(),
      image: document.getElementById('tm-image').value,
    };
    if (editing.team !== null && editing.team !== undefined && editing.team !== '' && state.team[editing.team]) {
      state.team[editing.team] = item;
    } else {
      state.team.push(item);
    }
    closeForm('form-team');
    renderTeamList();
    await saveState('Team member saved.');
  });
  document.getElementById('cancel-team-item').addEventListener('click', () => closeForm('form-team'));

  // Clients
  document.getElementById('add-client').addEventListener('click', () => {
    editing.clients = null;
    ['c-id','c-name','c-link','c-image'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('c-image-preview').style.backgroundImage = '';
    openForm('form-clients');
  });
  wireUpload('c-image-file', 'c-image', 'c-image-preview', 500);
  document.getElementById('save-client-item').addEventListener('click', async () => {
    const name = document.getElementById('c-name').value.trim();
    if (!name) { toast('Client name is required.'); return; }
    const item = {
      name,
      link: document.getElementById('c-link').value.trim(),
      logo: document.getElementById('c-image').value,
    };
    if (editing.clients !== null && editing.clients !== undefined && editing.clients !== '' && state.clients[editing.clients]) {
      state.clients[editing.clients] = item;
    } else {
      state.clients.push(item);
    }
    closeForm('form-clients');
    renderClientsList();
    await saveState('Client saved.');
  });
  document.getElementById('cancel-client-item').addEventListener('click', () => closeForm('form-clients'));

  // Testimonials
  document.getElementById('add-testimonial').addEventListener('click', () => {
    editing.testimonials = null;
    ['t-id','t-quote','t-author','t-role'].forEach(id => document.getElementById(id).value = '');
    openForm('form-testimonials');
  });
  document.getElementById('save-testimonial-item').addEventListener('click', async () => {
    const quote = document.getElementById('t-quote').value.trim();
    if (!quote) { toast('Quote is required.'); return; }
    const item = {
      quote,
      author: document.getElementById('t-author').value.trim(),
      role: document.getElementById('t-role').value.trim(),
    };
    if (editing.testimonials !== null && editing.testimonials !== undefined && editing.testimonials !== '' && state.testimonials[editing.testimonials]) {
      state.testimonials[editing.testimonials] = item;
    } else {
      state.testimonials.push(item);
    }
    closeForm('form-testimonials');
    renderTestimonialsList();
    await saveState('Testimonial saved.');
  });
  document.getElementById('cancel-testimonial-item').addEventListener('click', () => closeForm('form-testimonials'));
}

/* ---------------- publish tab (backup / restore) ---------------- */

function wirePublishTab() {
  document.getElementById('export-json').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'content-backup.json';
    a.click();
    toast('Backup downloaded.');
  });

  document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      let parsed;
      try {
        parsed = JSON.parse(ev.target.result);
      } catch (err) {
        toast('Invalid JSON file.');
        return;
      }
      if (!confirm('Replace the live site content with this backup? This affects everyone immediately.')) return;
      state = parsed;
      await saveState('Backup restored — live now.');
      location.reload();
    };
    reader.readAsText(file);
  });
}
