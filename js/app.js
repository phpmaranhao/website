// PHP Maranhão — Content Renderer

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

  // ── Social icons ──────────────────────────────────────────────
  const socialIcons = {
    twitter:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    instagram: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
    youtube:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
    telegram:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`,
    linkedin:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
    facebook:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
    github:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`,
  };

  // ── NAV ───────────────────────────────────────────────────────
  if (sections.nav) {
    const navLinks    = document.getElementById('navLinks');
    const mobileLinks = document.getElementById('mobileNavLinks');
    const ctaLine     = lines(sections.nav).find(l => l.startsWith('[cta:'));

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
      const [, label] = ctaLine.match(/\[cta:([^\]|]+)/) || [];
      if (label) {
        const btn = document.getElementById('navCta');
        if (btn) btn.textContent = label.trim();
      }
    }
  }

  // ── HERO ──────────────────────────────────────────────────────
  if (sections.hero) {
    const heroLines = lines(sections.hero);
    const subtitle  = heroLines.find(l => !l.startsWith('#') && !l.startsWith('[')) || '';
    const cta1      = heroLines.find(l => l.startsWith('[cta1:'));
    const cta2      = heroLines.find(l => l.startsWith('[cta2:'));

    setHtml('heroSubtitle', subtitle);

    const ctasEl = document.getElementById('heroCtas');
    if (ctasEl) {
      if (cta1) {
        const [, labelAndUrl] = cta1.match(/\[cta1:([^\]]+)\]/) || [];
        if (labelAndUrl) {
          const sep   = labelAndUrl.indexOf('|');
          const label = sep === -1 ? labelAndUrl : labelAndUrl.slice(0, sep);
          const href  = sep === -1 ? 'https://t.me/phpma' : labelAndUrl.slice(sep + 1);
          ctasEl.innerHTML += `<a href="${href}" target="_blank" rel="noopener" class="btn btn-guara btn-lg">${label}</a>`;
        }
      }
      if (cta2) {
        const [, labelAndUrl] = cta2.match(/\[cta2:([^\]]+)\]/) || [];
        if (labelAndUrl) {
          const sep   = labelAndUrl.indexOf('|');
          const label = sep === -1 ? labelAndUrl : labelAndUrl.slice(0, sep);
          const href  = sep === -1 ? '#sobre' : labelAndUrl.slice(sep + 1);
          const isExternal = href.startsWith('http');
          ctasEl.innerHTML += `<a href="${href}"${isExternal ? ' target="_blank" rel="noopener"' : ''} class="btn btn-outline btn-lg">${label}</a>`;
        }
      }
    }
  }

  // ── SOBRE ─────────────────────────────────────────────────────
  if (sections.sobre) {
    const sobreLines = lines(sections.sobre);

    const bodyLines = sobreLines.filter(l => !l.startsWith('[stat:'));
    const sobreEl   = document.getElementById('sobreText');
    if (sobreEl) sobreEl.innerHTML = mdToHtml(bodyLines.join('\n'));

    const statsEl = document.getElementById('statsGrid');
    if (statsEl) {
      const stats = sobreLines.filter(l => l.startsWith('[stat:'));
      statsEl.innerHTML = stats.map(s => {
        const [, value, label] = s.match(/\[stat:([^:]+):([^\]]+)\]/) || [];
        if (!value) return '';
        return `
          <div class="stat-item">
            <span class="stat-value">${value}</span>
            <span class="stat-label">${label}</span>
          </div>`;
      }).join('');
    }
  }

  // ── Generic section renderer ──────────────────────────────────
  function renderSection(key, titleId, subtitleId, bodyId) {
    if (!sections[key]) return;
    const sec      = sections[key];
    const secLines = lines(sec);
    const h1 = secLines.find(l => l.startsWith('# '))?.replace(/^# /, '')  || '';
    const h2 = secLines.find(l => l.startsWith('## '))?.replace(/^## /, '') || '';

    if (titleId)    setHtml(titleId, h1);
    if (subtitleId) setHtml(subtitleId, h2);

    const bodyEl = document.getElementById(bodyId);
    if (!bodyEl) return;

    const ctaLine = secLines.find(l => l.startsWith('[cta:'));

    const bodyLines = secLines.filter(l =>
      !l.startsWith('# ') &&
      !l.startsWith('## ') &&
      !l.startsWith('[cta:') &&
      !l.startsWith('[event:') &&
      !l.startsWith('[stat:')
    );

    let html = bodyLines.length ? mdToHtml(bodyLines.join('\n')) : '';

    if (ctaLine) {
      const [, labelAndUrl] = ctaLine.match(/\[cta:([^\]]+)\]/) || [];
      if (labelAndUrl) {
        const sep   = labelAndUrl.indexOf('|');
        const label = sep === -1 ? labelAndUrl : labelAndUrl.slice(0, sep);
        const href  = sep === -1 ? 'https://t.me/phpma' : labelAndUrl.slice(sep + 1);
        const isExternal = href.startsWith('http');
        html += `<div class="section-cta"><a href="${href}"${isExternal ? ' target="_blank" rel="noopener"' : ''} class="btn btn-amazon btn-lg">${label}</a></div>`;
      }
    }

    bodyEl.innerHTML = html;
  }

  // ── PHPUB ─────────────────────────────────────────────────────
  renderSection('phpub', 'phpubTitle', 'phpubSubtitle', 'phpubBody');

  // ── EVENTOS ───────────────────────────────────────────────────
  if (sections.eventos) {
    const sec      = sections.eventos;
    const secLines = lines(sec);
    const h1 = secLines.find(l => l.startsWith('# '))?.replace(/^# /, '')  || '';
    const h2 = secLines.find(l => l.startsWith('## '))?.replace(/^## /, '') || '';

    setHtml('eventosTitle', h1);
    setHtml('eventosSubtitle', h2);

    const bodyEl = document.getElementById('eventosBody');
    if (bodyEl) {
      const eventLines = secLines.filter(l => l.startsWith('[event:'));
      const ctaLine    = secLines.find(l => l.startsWith('[cta:'));

      const bodyLines = secLines.filter(l =>
        !l.startsWith('# ') && !l.startsWith('## ') &&
        !l.startsWith('[event:') && !l.startsWith('[cta:')
      );
      let html = bodyLines.length ? mdToHtml(bodyLines.join('\n')) : '';

      if (eventLines.length) {
        const lastIdx = eventLines.length - 1;
        const cards = eventLines.map((e, i) => {
          const [, year, city, participants, highlight] = e.match(/\[event:([^:]+):([^:]+):([^:]+):([^\]]+)\]/) || [];
          if (!year) return '';
          const isFuture = i === lastIdx && parseInt(year) >= new Date().getFullYear();
          return `
            <div class="evento-card${isFuture ? ' future' : ''}" data-aos="fade-up" data-aos-delay="${i * 100}">
              <div class="evento-year">${year}</div>
              <div class="evento-city">${city}</div>
              <div class="evento-participants">
                ${participants}
                <span>participantes</span>
              </div>
              <p class="evento-highlight">${highlight}</p>
            </div>`;
        }).join('');
        html += `<div class="eventos-grid">${cards}</div>`;
      }

      if (ctaLine) {
        const [, labelAndUrl] = ctaLine.match(/\[cta:([^\]]+)\]/) || [];
        if (labelAndUrl) {
          const sep   = labelAndUrl.indexOf('|');
          const label = sep === -1 ? labelAndUrl : labelAndUrl.slice(0, sep);
          const href  = sep === -1 ? '#' : labelAndUrl.slice(sep + 1);
          const isExternal = href.startsWith('http');
          html += `<div class="section-cta"><a href="${href}"${isExternal ? ' target="_blank" rel="noopener"' : ''} class="btn btn-outline btn-lg">${label}</a></div>`;
        }
      }

      bodyEl.innerHTML = html;
    }
  }

  // ── FOOTER ────────────────────────────────────────────────────
  if (sections.footer) {
    const footerLines = lines(sections.footer);
    const socials     = footerLines.filter(l => l.startsWith('[social:'));
    const text        = footerLines.filter(l => !l.startsWith('['));

    let html = text.map(t => `<p>${t}</p>`).join('');

    if (socials.length) {
      html += '<div class="footer-socials">' + socials.map(s => {
        // Supports [social:platform:full-url] or [social:platform:handle]
        const [, platform, value] = s.match(/\[social:([^:]+):([^\]]+)\]/) || [];
        if (!platform) return '';
        const url  = value.startsWith('http') ? value : `https://${platform}.com/${value.replace('@', '')}`;
        const icon = socialIcons[platform] || '';
        return `<a href="${url}" target="_blank" rel="noopener" class="footer-social-link" aria-label="${platform}">${icon}</a>`;
      }).join('') + '</div>';
    }

    html += `<p class="footer-copy">© ${new Date().getFullYear()} Comunidade PHP Maranhão. Todos os direitos reservados.</p>`;
    html += `<p class="footer-credit">Desenvolvido com zelo por <a href="https://nexy.com.br" target="_blank" rel="noopener">Nexy Consultoria</a></p>`;
    setHtml('footerBody', html);
  }

  // ── Nav scroll behavior ───────────────────────────────────────
  const navbar = document.getElementById('navbar');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
  navbar.classList.toggle('scrolled', window.scrollY > 60);

  // ── Mobile menu ───────────────────────────────────────────────
  const hamburger  = document.getElementById('hamburger');
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

  // ── Time-of-day sky adaptation ─────────────────────────────────
  function setSkyHour(hour) {
    const grad = document.getElementById('skyGrad');
    if (!grad) return;

    const stops = grad.querySelectorAll('stop');
    const stars = document.querySelectorAll('.sky-star');
    const crabs = document.getElementById('skyCrebs');

    // Sky color palettes: [top, mid, bottom-horizon]
    let sky, showStars, showCrabs;

    if (hour >= 5 && hour < 8) {
      // Dawn — warm purples fading to orange horizon
      sky = ['#120820', '#8a3210', '#e87828'];
      showStars = false; showCrabs = false;
    } else if (hour >= 8 && hour < 17) {
      // Day — bright blue sky, crabs on the sand
      sky = ['#0a4a8a', '#2080c8', '#5aaad8'];
      showStars = false; showCrabs = true;
    } else if (hour >= 17 && hour < 20) {
      // Sunset — orange, red, deep violet — Guará birds vivid
      sky = ['#1a0530', '#b03810', '#e87018'];
      showStars = false; showCrabs = false;
    } else if (hour >= 20 && hour < 22) {
      // Dusk — deep violet fading to forest
      sky = ['#0a0a28', '#201040', '#1B3A2E'];
      showStars = true; showCrabs = false;
    } else {
      // Night (22–5) — default, stars bright
      sky = ['#0A1222', '#0e1f2f', '#1B3A2E'];
      showStars = true; showCrabs = false;
    }

    // Apply gradient stops
    stops.forEach((stop, i) => {
      if (sky[i]) stop.setAttribute('stop-color', sky[i]);
    });

    // Stars
    const starOpacity = showStars ? null : '0';
    stars.forEach(s => {
      s.style.opacity = starOpacity !== null ? starOpacity : '';
    });

    // Crabs
    if (crabs) crabs.style.display = showCrabs ? '' : 'none';
  }

  // Expose globally for console testing: setSkyHour(14)
  window.setSkyHour = setSkyHour;

  setSkyHour(new Date().getHours());
})();
