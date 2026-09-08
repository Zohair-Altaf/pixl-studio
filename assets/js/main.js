/* Pixl Studio — shared data loader + renderers used by index/work/contact pages */

const PixlData = {
  STORAGE_KEY: 'pixlstudio_content',

  // Live sites (deployed on Netlify) serve content from /api/content, which is
  // backed by a real database (Netlify Blobs) — so every visitor sees the same,
  // up-to-date content. When previewing locally with serve.ps1 there's no API,
  // so this falls back to the bundled data/content.json.
  async load() {
    try {
      const res = await fetch('/api/content', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
        return data;
      }
    } catch (e) { /* no API available (local preview) — fall through */ }

    const local = localStorage.getItem(this.STORAGE_KEY);
    if (local) {
      try { return JSON.parse(local); } catch (e) { /* fall through */ }
    }
    const res = await fetch('data/content.json');
    return await res.json();
  }
};

function esc(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function applyTheme(data) {
  const root = document.documentElement.style;
  root.setProperty('--primary', data.site.primaryColor || '#c1443f');
  root.setProperty('--bg', data.site.bgColor || '#f1e4cf');
  root.setProperty('--text', data.site.textColor || '#241609');
  document.title = document.title.includes('|') ? document.title : `${data.site.name} — ${data.site.tagline || ''}`;
}

function socialIcon(key) {
  const map = { instagram: 'IG', twitter: 'TW', linkedin: 'LN', behance: 'BE' };
  return map[key] || key.slice(0, 2).toUpperCase();
}

function renderHeader(data, activePage) {
  const el = document.getElementById('site-header');
  if (!el) return;
  const navLinks = (data.nav || []).map(n =>
    `<a href="${esc(n.href)}">${esc(n.label)}</a>`
  ).join('');
  el.innerHTML = `
    <div class="container">
      <a href="index.html" class="logo">${esc(data.site.name).split(' ')[0]} <span>${esc(data.site.name).split(' ').slice(1).join(' ')}</span></a>
      <nav class="main-nav">${navLinks}</nav>
      <div class="header-actions">
        <a href="${esc(data.hero?.ctaLink || 'contact.html')}" class="btn btn-primary">${esc(data.hero?.ctaText || 'Start a project')}</a>
        <button class="menu-toggle" id="menu-toggle" aria-label="Menu">☰</button>
      </div>
    </div>
    <div class="nav-links-mobile" id="mobile-nav" style="display:none; flex-direction:column; gap:2px; background:var(--bg); border-top:1px solid rgba(0,0,0,0.08);">
      <div class="container" style="display:flex; flex-direction:column; padding:16px 32px;">
        ${(data.nav || []).map(n => `<a href="${esc(n.href)}" style="padding:12px 0; border-bottom:1px solid rgba(0,0,0,0.06); font-weight:600; text-transform:uppercase; font-size:14px;">${esc(n.label)}</a>`).join('')}
      </div>
    </div>
  `;
  const toggle = document.getElementById('menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  if (toggle) {
    toggle.addEventListener('click', () => {
      mobileNav.style.display = mobileNav.style.display === 'none' ? 'block' : 'none';
    });
  }
}

function renderFooter(data) {
  const el = document.getElementById('site-footer');
  if (!el) return;
  const navLinks = (data.nav || []).map(n => `<a href="${esc(n.href)}">${esc(n.label)}</a>`).join('');
  const socials = Object.entries(data.site.social || {}).filter(([,v]) => v).map(([k, v]) =>
    `<a href="${esc(v)}" target="_blank" rel="noopener">${socialIcon(k)}</a>`
  ).join('');
  const nameParts = esc(data.site.name).split(' ');
  el.innerHTML = `
    <div class="container">
      <div class="footer-top">
        <div>
          <div class="footer-logo">${nameParts[0]} <span>${nameParts.slice(1).join(' ')}</span></div>
          <p style="opacity:0.6; max-width:320px; margin-top:14px; font-size:14px;">${esc(data.site.tagline || '')}</p>
        </div>
        <nav class="footer-nav">${navLinks}</nav>
        <a href="${esc(data.hero?.ctaLink || 'contact.html')}" class="btn btn-primary">${esc(data.hero?.ctaText || 'Start a project')}</a>
      </div>
      <div class="footer-bottom">
        <div class="footer-copy">© ${new Date().getFullYear()} ${esc(data.site.name)}. All rights reserved.</div>
        <div class="footer-socials">${socials}</div>
      </div>
    </div>
  `;
}

function renderBadge(text, link) {
  const id = 'badge-path-' + Math.random().toString(36).slice(2, 8);
  return `
  <a href="${esc(link || '#')}" class="badge-rotate-wrap" aria-label="${esc(text)}">
    <svg class="badge-rotate" viewBox="0 0 100 100">
      <defs><path id="${id}" d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"/></defs>
      <text font-size="8.2" letter-spacing="1.5" fill="currentColor" font-family="Inter, sans-serif" font-weight="700">
        <textPath href="#${id}">${esc(text)}</textPath>
      </text>
    </svg>
    <span class="badge-center-btn">→</span>
  </a>`;
}

function renderHero(data) {
  const el = document.getElementById('hero-section');
  if (!el) return;
  el.innerHTML = `
    <div class="container">
      <h1 class="hero-heading">${esc(data.hero.line1)}<br><span class="line2">${esc(data.hero.line2)}</span></h1>
      <div class="hero-media">
        <div class="floating-photo fp1"><img src="${esc(data.team?.[0]?.image || '')}" alt=""></div>
        <div class="floating-photo fp2"><img src="${esc(data.team?.[1]?.image || '')}" alt=""></div>
        <div class="floating-photo fp3"><img src="${esc(data.portfolio?.[0]?.image || '')}" alt=""></div>
        <div class="floating-photo fp4"><img src="${esc(data.portfolio?.[1]?.image || '')}" alt=""></div>
      </div>
      <div class="hero-banner">
        <p>${esc(data.hero.bannerText)}</p>
        ${renderBadge(data.hero.badgeText, data.hero.badgeLink)}
      </div>
    </div>
  `;
  initHeroParallax(el);
}

/* Floating hero photos drift slightly toward the cursor, each at a different
   depth, for the same feel as the reference site's mouse-move interaction. */
function initHeroParallax(heroEl) {
  const photos = heroEl.querySelectorAll('.floating-photo');
  if (!photos.length || window.matchMedia('(pointer: coarse)').matches) return;
  const depth = [16, 22, 12, 18]; // max px drift per photo
  heroEl.addEventListener('mousemove', (e) => {
    const rect = heroEl.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;  // -0.5..0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    photos.forEach((photo, i) => {
      const d = depth[i % depth.length];
      photo.style.setProperty('--px', `${nx * d}px`);
      photo.style.setProperty('--py', `${ny * d}px`);
    });
  });
  heroEl.addEventListener('mouseleave', () => {
    photos.forEach((photo) => {
      photo.style.setProperty('--px', `0px`);
      photo.style.setProperty('--py', `0px`);
    });
  });
}

function renderQuote(containerId, quote, alt) {
  const el = document.getElementById(containerId);
  if (!el || !quote) return;
  el.innerHTML = `
    <div class="quote-section ${alt ? 'alt' : ''}">
      <div class="container">
        <blockquote>&ldquo;${esc(quote.text)}&rdquo;</blockquote>
        <div class="quote-author">${esc(quote.author)}</div>
        <div class="quote-role">${esc(quote.role)}</div>
      </div>
    </div>
  `;
}

function renderIntro(data) {
  const el = document.getElementById('about');
  if (!el) return;
  el.innerHTML = `
    <div class="container">
      <div class="eyebrow">${esc(data.intro.eyebrow)}</div>
      <h2 style="margin-top:10px;">${esc(data.intro.heading)}</h2>
      <p style="margin-top:24px;">${esc(data.intro.text)}</p>
      <div class="process-grid" id="services" style="scroll-margin-top:100px;">
        ${(data.process || []).map(p => `
          <div class="process-item">
            <div class="num">${esc(p.number)}</div>
            <h3>${esc(p.title)}</h3>
            <p>${esc(p.text)}</p>
          </div>`).join('')}
      </div>
    </div>
  `;
}

function portfolioCard(p) {
  return `
    <a class="portfolio-card" href="${esc(p.link || '#')}">
      <img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">
      <span class="date">${esc(p.date)}</span>
      <div class="overlay">
        <div class="cat">${esc(p.category)}</div>
        <div class="title">${esc(p.title)}</div>
      </div>
    </a>`;
}

function renderWork(data, limit) {
  const el = document.getElementById('work-section');
  if (!el) return;
  const items = limit ? (data.portfolio || []).slice(0, limit) : (data.portfolio || []);
  el.innerHTML = `
    <div class="container">
      <div class="section-heading-row">
        <h2>${esc(data.workHeading)}</h2>
        ${limit ? `<a href="work.html" class="btn btn-outline">View all work</a>` : ''}
      </div>
      <div class="portfolio-grid">
        ${items.length ? items.map(portfolioCard).join('') : '<p class="empty-note">No projects yet — add some from the admin panel.</p>'}
      </div>
    </div>
  `;
}

function renderTeam(data) {
  const el = document.getElementById('team-section');
  if (!el) return;
  el.innerHTML = `
    <div class="container">
      <h2 class="heading">${esc(data.teamHeading.line1)}<br>${esc(data.teamHeading.line2)}</h2>
      <p class="sub">${esc(data.teamHeading.text)}</p>
      <div class="team-grid">
        ${(data.team || []).map(t => `
          <div class="team-card">
            <img src="${esc(t.image)}" alt="${esc(t.name)}">
            <div class="info">
              <div class="name">${esc(t.name)}</div>
              <div class="role">${esc(t.role)}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>
  `;
}

function renderClients(data) {
  const el = document.getElementById('clients-section');
  if (!el) return;
  el.innerHTML = `
    <div class="container">
      <h2>${esc(data.clientsHeading)}</h2>
      <div class="clients-grid">
        ${(data.clients || []).map(c => `
          <a class="client-logo" href="${esc(c.link || '#')}" target="_blank" rel="noopener">
            ${c.logo ? `<img src="${esc(c.logo)}" alt="${esc(c.name)}">` : esc(c.name)}
          </a>`).join('')}
      </div>
    </div>
  `;
}

function renderTestimonials(data) {
  const el = document.getElementById('testimonials-section');
  if (!el) return;
  el.innerHTML = `
    <div class="container">
      <div class="testimonials-grid">
        ${(data.testimonials || []).map(t => `
          <div class="testimonial-card">
            <p class="quote">&ldquo;${esc(t.quote)}&rdquo;</p>
            <div class="quote-author" style="color:var(--text);">${esc(t.author)}</div>
            <div class="quote-role" style="color:rgba(36,22,9,0.6);">${esc(t.role)}</div>
          </div>`).join('')}
      </div>
    </div>
  `;
}

function renderContactInfo(data) {
  const el = document.getElementById('contact-info');
  if (!el) return;
  const socials = Object.entries(data.site.social || {}).filter(([,v]) => v).map(([k, v]) =>
    `<a href="${esc(v)}" target="_blank" rel="noopener">${socialIcon(k)}</a>`
  ).join('');
  el.innerHTML = `
    <h3>Get in touch</h3>
    <div class="row"><div class="label">Email</div><a href="mailto:${esc(data.site.email)}">${esc(data.site.email)}</a></div>
    <div class="row"><div class="label">Phone</div><div>${esc(data.site.phone)}</div></div>
    <div class="row"><div class="label">Studio</div><div>${esc(data.site.address)}</div></div>
    <div class="socials">${socials}</div>
  `;
}
