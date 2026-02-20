// PHPeste 2026 — Content Renderer

(async function () {
  // ── Load content ──────────────────────────────────────────────
  let raw = '';
  try {
    const res = await fetch('content/pt_BR.md');
    raw = await res.text();
  } catch (e) {
    console.error('Falha ao carregar conteúdo:', e);
    return;
  }

  // ── Parse sections ────────────────────────────────────────────
  const sections = {};
  const sectionRegex = /<!--\s*section:(\w+)\s*-->([\s\S]*?)(?=<!--\s*section:|$)/g;
  let match;
  while ((match = sectionRegex.exec(raw)) !== null) {
    sections[match[1]] = match[2].trim();
  }

  // ── Helpers ───────────────────────────────────────────────────
  function lines(text) {
    return text.split('\n').map(l => l.trim()).filter(Boolean);
  }

  function mdToHtml(text) {
    return marked.parse(text);
  }

  function setHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  // ── NAV ───────────────────────────────────────────────────────
  if (sections.nav) {
    const navLinks = document.getElementById('navLinks');
    const mobileLinks = document.getElementById('mobileNavLinks');
    const ctaLine = lines(sections.nav).find(l => l.startsWith('[cta:'));

    lines(sections.nav)
      .filter(l => l.startsWith('[link:'))
      .forEach(l => {
        const [, href, label] = l.match(/\[link:([^:]+):([^\]]+)\]/) || [];
        if (!href) return;
        const li = document.createElement('li');
        li.innerHTML = `<a href="#${href}">${label}</a>`;
        navLinks.appendChild(li);
        mobileLinks.appendChild(li.cloneNode(true));
      });

    if (ctaLine) {
      const [, label] = ctaLine.match(/\[cta:([^\]]+)\]/) || [];
      if (label) {
        const btn = document.getElementById('navCta');
        if (btn) btn.textContent = label;
      }
    }
  }

  // ── HERO ──────────────────────────────────────────────────────
  if (sections.hero) {
    const heroLines = lines(sections.hero);
    const h1       = heroLines.find(l => l.startsWith('# '))?.replace(/^# /, '') || '';
    const h2       = heroLines.find(l => l.startsWith('## '))?.replace(/^## /, '') || '';
    const dateEl   = heroLines.find(l => l.startsWith('[date:'));
    const cta1     = heroLines.find(l => l.startsWith('[cta1:'));
    const cta2     = heroLines.find(l => l.startsWith('[cta2:'));
    const subtitle = heroLines.find(l => !l.startsWith('#') && !l.startsWith('[')) || '';

    if (dateEl) {
      const [, date] = dateEl.match(/\[date:([^\]]+)\]/) || [];
      setHtml('heroDate', `<span class="hero-badge">${date}</span>`);
    }

    setHtml('heroTitle', h1);
    setHtml('heroSubtitle', subtitle);

    const ctasEl = document.getElementById('heroCtas');
    if (ctasEl) {
      if (cta1) {
        const [, label] = cta1.match(/\[cta1:([^\]]+)\]/) || [];
        ctasEl.innerHTML += `<a href="#ingressos" class="btn btn-primary btn-lg">${label}</a>`;
      }
      if (cta2) {
        const [, label] = cta2.match(/\[cta2:([^\]]+)\]/) || [];
        ctasEl.innerHTML += `<a href="#programacao" class="btn btn-outline btn-lg">${label}</a>`;
      }
    }
  }

  // ── SOBRE ─────────────────────────────────────────────────────
  if (sections.sobre) {
    const sobreText = document.getElementById('sobreText');
    if (sobreText) sobreText.innerHTML = mdToHtml(sections.sobre);
  }

  // ── NÚMEROS ───────────────────────────────────────────────────
  if (sections.numeros) {
    const grid = document.getElementById('numerosGrid');
    if (grid) {
      const items = lines(sections.numeros).reduce((acc, line) => {
        if (line.startsWith('### ')) {
          acc.push({ number: line.replace(/^### /, ''), label: '' });
        } else if (acc.length > 0 && !line.startsWith('#')) {
          acc[acc.length - 1].label = line;
        }
        return acc;
      }, []);

      grid.innerHTML = items.map(item => `
        <div class="numero-item" data-aos="fade-up">
          <span class="numero-value">${item.number}</span>
          <span class="numero-label">${item.label}</span>
        </div>
      `).join('');
    }
  }

  // ── Render genérico de seção ──────────────────────────────────
  function renderSection(key, titleId, subtitleId, bodyId, opts = {}) {
    if (!sections[key]) return;
    const sec      = sections[key];
    const secLines = lines(sec);
    const h1 = secLines.find(l => l.startsWith('# '))?.replace(/^# /, '') || '';
    const h2 = secLines.find(l => l.startsWith('## '))?.replace(/^## /, '') || '';

    if (titleId)    setHtml(titleId, h1);
    if (subtitleId) setHtml(subtitleId, h2);

    const bodyEl = document.getElementById(bodyId);
    if (!bodyEl) return;

    // Tokens especiais: [ticket:...], [map:...], [cta:...]
    const ticketLines = secLines.filter(l => l.startsWith('[ticket:'));
    const mapLine     = secLines.find(l => l.startsWith('[map:'));
    const ctaLine     = secLines.find(l => l.startsWith('[cta:'));

    // Linhas de conteúdo puro (sem tokens e sem headings h1/h2)
    const bodyLines = secLines.filter(l =>
      !l.startsWith('# ') &&
      !l.startsWith('## ') &&
      !l.startsWith('[ticket:') &&
      !l.startsWith('[map:') &&
      !l.startsWith('[cta:')
    );

    let html = bodyLines.length ? mdToHtml(bodyLines.join('\n')) : '';

    // Renderiza link do mapa
    if (mapLine) {
      const [, url, label] = mapLine.match(/\[map:([^|]+)\|([^\]]+)\]/) || [];
      if (url) {
        html += `<p class="map-link"><a href="${url}" target="_blank" rel="noopener" class="btn btn-outline-dark">${label} ↗</a></p>`;
      }
    }

    // Renderiza cards de ingresso
    if (ticketLines.length) {
      html += '<div class="tickets-grid">' + ticketLines.map((t, i) => {
        const [, name, price, deadline, status] = t.match(/\[ticket:([^:]+):([^:]+):([^:]+):([^\]]+)\]/) || [];
        const isActive = status === 'active';
        return `
          <div class="ticket-card ${isActive ? 'ticket-active' : 'ticket-pending'}" data-aos="fade-up" data-aos-delay="${i * 100}">
            <div class="ticket-lote">${deadline}<span class="ticket-lote-note">ou enquanto durarem as vagas</span></div>
            <div class="ticket-name">${name}</div>
            <div class="ticket-price">
              <span class="ticket-currency">R$</span>
              <span class="ticket-value">${price}</span>
            </div>
            ${isActive ? `<a href="#" class="btn btn-ticket">Comprar agora</a>` : `<span class="ticket-soon">Em breve</span>`}
          </div>`;
      }).join('') + '</div>';
    }

    // CTA genérico — suporta [cta:label] e [cta:label|url]
    if (ctaLine) {
      const [, labelAndUrl] = ctaLine.match(/\[cta:([^\]]+)\]/) || [];
      if (labelAndUrl) {
        const sep = labelAndUrl.indexOf('|');
        const label = sep === -1 ? labelAndUrl : labelAndUrl.slice(0, sep);
        const href  = sep === -1 ? '#' : labelAndUrl.slice(sep + 1);
        html += `<div class="section-cta"><a href="${href}" target="${href === '#' ? '_self' : '_blank'}" rel="noopener" class="btn btn-primary btn-lg">${label}</a></div>`;
      }
    }

    bodyEl.innerHTML = html;
  }

  renderSection('programacao',   'programacaoTitle',   'programacaoSubtitle',   'programacaoBody');
  renderSection('palestrantes',  'palestrantesTitle',  'palestrantesSubtitle',  'palestrantesBody');
  renderSection('local',         'localTitle',         'localSubtitle',         'localBody');
  renderSection('patrocinadores','patrocinadoresTitle','patrocinadoresSubtitle','patrocinadoresBody');
  renderSection('ingressos',     'ingressosTitle',     'ingressosSubtitle',     'ingressosBody');

  // ── FOOTER ────────────────────────────────────────────────────
  const socialIcons = {
    twitter: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    instagram: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
    youtube: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
    linkedin: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  };

  if (sections.footer) {
    const footerLines = lines(sections.footer);
    const socials = footerLines.filter(l => l.startsWith('[social:'));
    const text    = footerLines.filter(l => !l.startsWith('['));

    let html = text.map(t => {
      if (t.startsWith('Realização:')) {
        const label = t.replace('Realização:', '').trim();
        return `<p class="footer-realizacao">Realização: <img src="assets/logo_mini.png" alt="${label}" class="footer-realizacao-logo"></p>`;
      }
      return `<p>${t}</p>`;
    }).join('');
    if (socials.length) {
      const urls = { twitter: 'https://twitter.com/', instagram: 'https://instagram.com/', youtube: 'https://youtube.com/', linkedin: 'https://linkedin.com/in/' };
      html += '<div class="footer-socials">' + socials.map(s => {
        const [, platform, handle] = s.match(/\[social:([^:]+):([^\]]+)\]/) || [];
        const url  = urls[platform] || '#';
        const icon = socialIcons[platform] || '';
        return `<a href="${url}${handle.replace('@','')}" target="_blank" rel="noopener" class="footer-social-link" aria-label="${platform}">
          ${icon}
        </a>`;
      }).join('') + '</div>';
    }
    html += `<p class="footer-copy">© ${new Date().getFullYear()} PHPeste. Todos os direitos reservados.</p>`;
    setHtml('footerBody', html);
  }

  // ── Nav scroll behavior + hero logo animation ─────────────────
  const navbar   = document.getElementById('navbar');
  const heroLogo = document.getElementById('heroLogo');
  const navLogo  = document.querySelector('.nav-logo-img');

  function onScroll() {
    const scrollY  = window.scrollY;
    const heroH    = document.getElementById('hero')?.offsetHeight || window.innerHeight;
    const fadeEnd  = heroH * 0.45;   // hero logo fully faded by 45% of hero height
    const navStart = heroH * 0.3;    // nav logo starts appearing at 30%

    navbar.classList.toggle('scrolled', scrollY > 60);

    if (heroLogo) {
      const progress = Math.min(scrollY / fadeEnd, 1);
      const scale = 1 - progress * 0.15;
      heroLogo.style.opacity = String(1 - progress);
      heroLogo.style.transform = `scale(${scale})`;
    }

    if (navLogo) {
      const navProgress = Math.max(0, Math.min((scrollY - navStart) / (fadeEnd - navStart), 1));
      navLogo.style.opacity = String(navProgress);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // init on load

  // ── Mobile menu ───────────────────────────────────────────────
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  hamburger?.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(open));
    hamburger.classList.toggle('active', open);
  });
  mobileMenu?.addEventListener('click', e => {
    if (e.target.tagName === 'A') {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });

  // ── Smooth scroll ─────────────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // ── AOS init ──────────────────────────────────────────────────
  AOS.init({ once: true, offset: 80 });
})();
