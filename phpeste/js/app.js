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

    // Tokens especiais: [ticket:...], [map:...], [waze:...], [cta:...]
    const ticketLines  = secLines.filter(l => l.startsWith('[ticket:'));
    const sponsorLines = secLines.filter(l => l.startsWith('[sponsor:'));
    const mapLine      = secLines.find(l => l.startsWith('[map:'));
    const wazeLine     = secLines.find(l => l.startsWith('[waze:'));
    const ctaLine      = secLines.find(l => l.startsWith('[cta:'));

    // Linhas de conteúdo puro (sem tokens e sem headings h1/h2)
    const bodyLines = secLines.filter(l =>
      !l.startsWith('# ') &&
      !l.startsWith('## ') &&
      !l.startsWith('[ticket:') &&
      !l.startsWith('[sponsor:') &&
      !l.startsWith('[map:') &&
      !l.startsWith('[waze:') &&
      !l.startsWith('[cta:')
    );

    let html = bodyLines.length ? mdToHtml(bodyLines.join('\n')) : '';

    // Renderiza links de localização (mapa + waze)
    if (mapLine || wazeLine) {
      let btns = '';
      if (mapLine) {
        const [, url, label] = mapLine.match(/\[map:([^|]+)\|([^\]]+)\]/) || [];
        if (url) btns += `<a href="${url}" target="_blank" rel="noopener" class="btn btn-outline-dark">${label} ↗</a>`;
      }
      if (wazeLine) {
        const [, url, label] = wazeLine.match(/\[waze:([^|]+)\|([^\]]+)\]/) || [];
        if (url) btns += `<a href="${url}" target="_blank" rel="noopener" class="btn btn-outline-dark">${label} ↗</a>`;
      }
      html += `<div class="map-links">${btns}</div>`;
    }

    // Renderiza cards de ingresso
    if (ticketLines.length) {
      html += '<div class="tickets-grid">' + ticketLines.map((t, i) => {
        const [, name, price, deadline, status] = t.match(/\[ticket:([^:]+):([^:]+):([^:]+):([^\]]+)\]/) || [];
        const isActive = status === 'active';
        const isPast = status === 'past';
        const cardClass = isActive ? 'ticket-active' : (isPast ? 'ticket-past' : 'ticket-pending');
        const footer = isActive
          ? `<a href="https://eventiza.com.br/evento/phpeste-2026" target="_blank" rel="noopener" class="btn btn-ticket">Comprar agora</a>`
          : (isPast ? `<span class="ticket-soon">Encerrado</span>` : `<span class="ticket-soon">Em breve</span>`);
        return `
          <div class="ticket-card ${cardClass}" data-aos="fade-up" data-aos-delay="${i * 100}">
            <div class="ticket-lote">${deadline}${isPast ? '' : '<span class="ticket-lote-note">ou enquanto durarem as vagas</span>'}</div>
            <div class="ticket-name">${name}</div>
            <div class="ticket-price">
              <span class="ticket-currency">R$</span>
              <span class="ticket-value">${price}</span>
            </div>
            ${footer}
          </div>`;
      }).join('') + '</div>';
    }

    // Grade de patrocinadores agrupada por cota (ordem de destaque)
    if (sponsorLines.length) {
      const TIER_ORDER = ['Babaçu', 'Buriti', 'Juçara'];
      const sponsors = sponsorLines.map(l => {
        const [, tier, name, logo, href, bg] =
          l.match(/\[sponsor:([^:]+):([^:]+):([^:]+):([^:]+):([^\]]+)\]/) || [];
        return tier ? { tier, name, logo, href, bg } : null;
      }).filter(Boolean);

      const slug = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      // A fonte de t\u00edtulos (Rye) n\u00e3o tem "\u00e7": c + v\u00edrgula reposicionada (.ced)
      const cedilla = s => String(s).replace(/[\u00e7\u00c7]/g, m =>
        (m === '\u00e7' ? 'c' : 'C') + '<span class="ced">,</span>');
      let grid = '';
      TIER_ORDER.forEach(tier => {
        const group = sponsors.filter(s => s.tier === tier);
        const cards = group.length
          ? group.map(s => `
            <a class="sponsor-card is-${s.bg === 'dark' ? 'dark' : 'light'}" href="${s.href}" aria-label="${s.name}">
              <img src="${s.logo}" alt="${s.name}" loading="lazy">
            </a>`).join('')
          : `<div class="sponsor-card sponsor-card-empty">Sua marca aqui</div>`;
        grid += `<div class="sponsor-tier tier-${slug(tier)}">
          <div class="sponsor-tier-label">${cedilla(tier)}</div>
          <div class="sponsor-tier-logos">${cards}</div>
        </div>`;
      });
      html += `<div class="sponsors">${grid}</div>`;
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

  // ── PROGRAMAÇÃO (grade de horários) ──────────────────────────
  const categoryIcons = {
    'IA':             `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="4" r="2"/><circle cx="3" cy="12" r="1.5"/><circle cx="13" cy="12" r="1.5"/><line x1="8" y1="6" x2="4" y2="10.5"/><line x1="8" y1="6" x2="12" y2="10.5"/><line x1="4.5" y1="12" x2="11.5" y2="12"/></svg>`,
    'Blockchain':     `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="4" height="4" rx="1"/><rect x="6" y="6" width="4" height="4" rx="1"/><rect x="11" y="6" width="4" height="4" rx="1"/><line x1="5" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="11" y2="8"/></svg>`,
    'Arquitetura':    `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="14" x2="15" y2="14"/><line x1="3" y1="6" x2="3" y2="14"/><line x1="8" y1="4" x2="8" y2="14"/><line x1="13" y1="6" x2="13" y2="14"/><polyline points="1,7 8,2 15,7"/></svg>`,
    'Integração':     `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="8" r="4"/><circle cx="10.5" cy="8" r="4"/></svg>`,
    'Testes':         `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.5"/><polyline points="5,8 7,10 11,6"/></svg>`,
    'Escalabilidade': `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="10" width="3.5" height="4"/><rect x="6.25" y="6" width="3.5" height="8"/><rect x="11.5" y="2" width="3.5" height="12"/></svg>`,
    'Segurança':      `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2L2 5v3.5C2 11.5 4.7 14.2 8 15.5c3.3-1.3 6-4 6-7V5z"/></svg>`,
    'Observabilidade':`<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>`,
    'Carreira':       `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,14 1,10 5,10 5,6 10,6 10,2 15,2"/></svg>`,
    'SaaS':           `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 11.5H4a3.5 3.5 0 01-.5-7 4.5 4.5 0 018.8-.5 3 3 0 01.2 7.5z"/></svg>`,
  };

  (function renderProgramacao() {
    if (!sections.programacao) return;
    const sec      = sections.programacao;
    const secLines = lines(sec);

    setHtml('programacaoTitle',    secLines.find(l => l.startsWith('# '))?.replace(/^# /, '')  || '');
    setHtml('programacaoSubtitle', secLines.find(l => l.startsWith('## '))?.replace(/^## /, '') || '');

    // Parse days
    const days = [];
    let cur = null;
    secLines.forEach(line => {
      if (line.startsWith('[schedule-day:')) {
        const m = line.match(/\[schedule-day:([^\]]+)\]/);
        if (m) { cur = { label: m[1], note: '', rooms: [], slots: [] }; days.push(cur); }
      } else if (cur && line.startsWith('[day-note:')) {
        const m = line.match(/\[day-note:([^\]]+)\]/);
        if (m) cur.note = m[1];
      } else if (cur && line.startsWith('[rooms:')) {
        const m = line.match(/\[rooms:([^\]]+)\]/);
        if (m) cur.rooms = m[1].split('|');
      } else if (cur && line.startsWith('[slot:')) {
        const m = line.match(/\[slot:([^\]]+)\]/);
        if (m) {
          const parts = m[1].split('|');
          cur.slots.push({ time: parts[0], talks: parts.slice(1), type: 'talk' });
        }
      } else if (cur && line.startsWith('[lunch:')) {
        const m = line.match(/\[lunch:([^\]]+)\]/);
        if (m) cur.slots.push({ time: m[1], type: 'lunch' });
      }
    });

    const bodyEl = document.getElementById('programacaoBody');
    if (!bodyEl || !days.length) return;

    function renderRow(slot, roomCount) {
      if (slot.type === 'lunch') {
        return `<div class="schedule-row">
          <div class="schedule-time">${slot.time}</div>
          <div class="schedule-cell schedule-cell-span schedule-cell-lunch">Almoço</div>
        </div>`;
      }
      const isCredenciamento = slot.talks.length === 1 && slot.talks[0].toLowerCase() === 'credenciamento';
      if (isCredenciamento) {
        return `<div class="schedule-row">
          <div class="schedule-time">${slot.time}</div>
          <div class="schedule-cell schedule-cell-span schedule-cell-credenciamento">Credenciamento</div>
        </div>`;
      }
      const cells = slot.talks.map(t => {
        const parts     = t.split('~');
        const title     = parts[0].trim();
        const speaker   = parts[1]?.trim() || 'Palestrante a definir';
        const category  = parts[2]?.trim() || '';
        const confirmed = parts.length > 1;
        const icon = category && categoryIcons[category]
          ? `<span class="schedule-category-badge" title="${category}">${categoryIcons[category]}</span>`
          : '';
        return `
        <div class="schedule-cell schedule-cell-talk">
          ${icon}
          <span class="schedule-talk-title${confirmed ? ' schedule-talk-title--confirmed' : ''}">${title}</span>
          <span class="schedule-talk-speaker${confirmed ? ' schedule-talk-speaker--confirmed' : ''}">${speaker}</span>
        </div>`;
      }).join('');
      return `<div class="schedule-row">${'<div class="schedule-time">' + slot.time + '</div>'}${cells}</div>`;
    }

    const tabs = days.map((day, i) => `
      <button class="schedule-tab${i === 0 ? ' active' : ''}" data-day="${i}">
        ${day.label}
      </button>`).join('');

    const panels = days.map((day, i) => {
      const isTalk = day.rooms.length > 0;
      const inner  = isTalk
        ? `<div class="schedule-grid">
            <div class="schedule-header">
              <div class="schedule-time-header"></div>
              ${day.rooms.map(r => `<div class="schedule-room">${r}</div>`).join('')}
            </div>
            ${day.slots.map(s => renderRow(s, day.rooms.length)).join('')}
          </div>`
        : `<div class="schedule-turismo">
            <div class="schedule-turismo-icon">☀</div>
            <p>${day.note || 'Programação em breve.'}</p>
          </div>`;
      return `<div class="schedule-panel${i === 0 ? ' active' : ''}" data-day="${i}">${inner}</div>`;
    }).join('');

    const legend = `<div class="schedule-legend">
      <span class="schedule-legend-title">Trilhas</span>
      <div class="schedule-legend-items">
        ${Object.entries(categoryIcons).map(([name, icon]) =>
          `<span class="schedule-legend-item">${icon}${name}</span>`
        ).join('')}
      </div>
    </div>`;

    bodyEl.innerHTML = `<div class="schedule-tabs">${tabs}</div><div class="schedule-panels">${panels}</div>${legend}`;

    bodyEl.querySelectorAll('.schedule-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const idx = tab.dataset.day;
        bodyEl.querySelectorAll('.schedule-tab').forEach(t => t.classList.remove('active'));
        bodyEl.querySelectorAll('.schedule-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        bodyEl.querySelector(`.schedule-panel[data-day="${idx}"]`).classList.add('active');
      });
    });
  })();
  // ── PALESTRANTES ─────────────────────────────────────────────
  await (async function renderPalestrantes() {
    if (!sections.palestrantes) return;
    const sec      = sections.palestrantes;
    const secLines = lines(sec);
    setHtml('palestrantesTitle',    secLines.find(l => l.startsWith('# '))?.replace(/^# /, '')  || '');
    setHtml('palestrantesSubtitle', secLines.find(l => l.startsWith('## '))?.replace(/^## /, '') || '');

    // Coleta palestrantes confirmados do schedule
    const speakers = new Map();
    if (sections.programacao) {
      let currentDay = '';
      let currentRooms = [];
      lines(sections.programacao).forEach(line => {
        if (line.startsWith('[schedule-day:')) {
          const m = line.match(/\[schedule-day:([^\]]+)\]/);
          if (m) { currentDay = m[1]; currentRooms = []; }
        } else if (line.startsWith('[rooms:')) {
          const m = line.match(/\[rooms:([^\]]+)\]/);
          if (m) currentRooms = m[1].split('|');
        } else if (line.startsWith('[slot:')) {
          const m = line.match(/\[slot:([^\]]+)\]/);
          if (m) {
            const slotParts = m[1].split('|');
            const time = slotParts[0];
            slotParts.slice(1).forEach((talk, idx) => {
              const parts = talk.split('~');
              if (parts.length < 2) return;
              const title    = parts[0].trim().replace(/<br>/gi, ' ');
              const name     = parts[1].trim();
              const category = parts[2]?.trim() || '';
              const room     = currentRooms[idx] || '';
              if (!speakers.has(name)) {
                const slug = name.toLowerCase()
                  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                  .replace(/\s+/g, '-');
                speakers.set(name, { name, slug, talks: [] });
              }
              speakers.get(name).talks.push({ title, category, day: currentDay, time, room });
            });
          }
        }
      });
    }

    // Palestrantes declarados na própria seção: [speaker:Nome|Palestra|Trilha]
    secLines.filter(l => l.startsWith('[speaker:')).forEach(line => {
      const m = line.match(/\[speaker:([^\]]+)\]/);
      if (!m) return;
      const [rawName, rawTitle, rawCategory] = m[1].split('|');
      const name = (rawName || '').trim();
      if (!name) return;
      if (!speakers.has(name)) {
        const slug = name.toLowerCase()
          .normalize('NFD').replace(/[^ -~]/g, '')
          .replace(/\s+/g, '-');
        speakers.set(name, { name, slug, talks: [] });
      }
      const sp = speakers.get(name);
      sp.talks = sp.talks.filter(t => t.title.toLowerCase() !== 'tema a definir');
      sp.talks.push({
        title:    (rawTitle || 'Tema a definir').trim(),
        category: (rawCategory || '').trim(),
        day: '', time: '', room: '',
      });
    });

    const sorted = [...speakers.values()].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR')
    );

    const bodyEl = document.getElementById('palestrantesBody');
    if (!bodyEl) return;

    if (!sorted.length) {
      const ctaLine = secLines.find(l => l.startsWith('[cta:'));
      if (ctaLine) {
        const [, labelAndUrl] = ctaLine.match(/\[cta:([^\]]+)\]/) || [];
        if (labelAndUrl) {
          const sep   = labelAndUrl.indexOf('|');
          const label = sep === -1 ? labelAndUrl : labelAndUrl.slice(0, sep);
          const href  = sep === -1 ? '#' : labelAndUrl.slice(sep + 1);
          bodyEl.innerHTML = `<p>${secLines.find(l => !l.startsWith('#') && !l.startsWith('[')) || ''}</p>
            <div class="section-cta"><a href="${href}" target="_blank" rel="noopener" class="btn btn-primary btn-lg">${label}</a></div>`;
        }
      }
      return;
    }

    // Busca minicurrículos em paralelo (assets/palestrantes/{slug}.md)
    const bios = await Promise.all(
      sorted.map(sp =>
        fetch(`assets/palestrantes/${sp.slug}.md`)
          .then(r => r.ok ? r.text() : '')
          .catch(() => '')
      )
    );

    // Cria modal no DOM
    const modal = document.createElement('div');
    modal.id = 'speakerModal';
    modal.className = 'speaker-modal-backdrop';
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('role', 'dialog');
    modal.innerHTML = `
      <div class="speaker-modal">
        <button class="speaker-modal-close" aria-label="Fechar">&#x2715;</button>
        <div class="speaker-modal-photo-wrap">
          <img id="modalPhoto" class="speaker-modal-photo" src="" alt="">
        </div>
        <div class="speaker-modal-body">
          <h2 class="speaker-modal-name" id="modalName"></h2>
          <div class="speaker-modal-bio" id="modalBio"></div>
          <div class="speaker-modal-divider"></div>
          <p class="speaker-modal-talk-title" id="modalTalkTitle"></p>
          <div class="speaker-modal-meta" id="modalMeta"></div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const iconCalendar = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="14" height="12" rx="1"/><line x1="1" y1="7" x2="15" y2="7"/><line x1="5" y1="1" x2="5" y2="5"/><line x1="11" y1="1" x2="11" y2="5"/></svg>`;
    const iconClock    = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.5"/><line x1="8" y1="4" x2="8" y2="8"/><line x1="8" y1="8" x2="11" y2="10"/></svg>`;
    const iconRoom     = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5z"/><circle cx="8" cy="6" r="1.5"/></svg>`;

    function buildTalkMeta(talk) {
      const icon = talk.category && categoryIcons[talk.category] ? categoryIcons[talk.category] : '';
      return [
        talk.day      ? `<span class="modal-meta-item">${iconCalendar}${talk.day}</span>` : '',
        talk.time     ? `<span class="modal-meta-item">${iconClock}${talk.time}</span>` : '',
        talk.room     ? `<span class="modal-meta-item">${iconRoom}${talk.room}</span>` : '',
        talk.category ? `<span class="modal-meta-item modal-meta-trilha">${icon}${talk.category}</span>` : '',
      ].filter(Boolean).join('');
    }

    function clampBioSections(container, talks) {
      const nodes    = Array.from(container.childNodes);
      const sections = [];
      let current    = { heading: null, nodes: [] };
      nodes.forEach(node => {
        if (node.nodeName === 'H2') {
          sections.push(current);
          current = { heading: node.cloneNode(true), nodes: [] };
        } else {
          current.nodes.push(node.cloneNode(true));
        }
      });
      sections.push(current);
      container.innerHTML = '';
      const hasTalks = sections.some(s => s.heading);
      let atividadesInserted = false;
      sections.forEach(sec => {
        if (!sec.nodes.length && !sec.heading) return;
        if (sec.heading && !atividadesInserted) {
          const atividadesEl = document.createElement('div');
          atividadesEl.className = 'bio-atividades-label';
          atividadesEl.textContent = 'Atividades';
          container.appendChild(atividadesEl);
          atividadesInserted = true;
        }
        const wrap = document.createElement('div');
        wrap.className = 'bio-section';
        if (sec.heading) {
          wrap.appendChild(sec.heading);
          // Injeta metadados buscando pelo título do heading
          const headingText = sec.heading.textContent.trim().toLowerCase();
          const talk = talks.find(t => t.title.toLowerCase() === headingText)
                    || talks.find(t => headingText.includes(t.title.toLowerCase()));
          if (talk) {
            const metaEl = document.createElement('div');
            metaEl.className = 'bio-talk-meta';
            metaEl.innerHTML = buildTalkMeta(talk);
            wrap.appendChild(metaEl);
          }
        }
        if (sec.nodes.length) {
          const content = document.createElement('div');
          content.className = 'bio-section-content';
          sec.nodes.forEach(n => content.appendChild(n));
          wrap.appendChild(content);
          const toggle = document.createElement('div');
          toggle.className = 'bio-expand-toggle';
          toggle.innerHTML = '<span class="bio-expand-btn">Ver mais</span>';
          toggle.addEventListener('click', () => {
            const expanded = content.classList.toggle('bio-section-expanded');
            toggle.querySelector('.bio-expand-btn').textContent = expanded ? 'Ver menos' : 'Ver mais';
          });
          wrap.appendChild(toggle);
        }
        container.appendChild(wrap);
      });
    }

    const openModal = (sp, bio) => {
      const modalPhoto = document.getElementById('modalPhoto');
      modalPhoto.onerror = () => { modalPhoto.src = 'assets/palestrantes/placeholder.svg'; modalPhoto.onerror = null; };
      modalPhoto.src = `assets/palestrantes/${sp.slug}.jpg`;
      modalPhoto.alt = sp.name;
      document.getElementById('modalName').textContent = sp.name;

      const modalBio      = document.getElementById('modalBio');
      const divider       = modal.querySelector('.speaker-modal-divider');
      const talkTitleEl   = document.getElementById('modalTalkTitle');
      const metaEl        = document.getElementById('modalMeta');

      if (bio) {
        modalBio.innerHTML = marked.parse(bio);
        clampBioSections(modalBio, sp.talks);
        divider.hidden     = true;
        talkTitleEl.hidden = true;
        metaEl.hidden      = true;
      } else {
        modalBio.innerHTML  = '';
        divider.hidden      = false;
        talkTitleEl.hidden  = false;
        metaEl.hidden       = false;
        talkTitleEl.textContent  = sp.talks[0].title;
        metaEl.innerHTML         = buildTalkMeta(sp.talks[0]);
      }

      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    };

    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    modal.querySelector('.speaker-modal-close').addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    const cards = sorted.map((sp, i) => `
      <div class="speaker-card" data-aos="fade-up" data-speaker="${i}" role="button" tabindex="0" aria-label="Ver perfil de ${sp.name}">
        <div class="speaker-photo-wrap">
          <img src="assets/palestrantes/${sp.slug}.jpg" alt="${sp.name}" class="speaker-photo" width="400" height="400" onerror="this.src='assets/palestrantes/placeholder.svg';this.onerror=null;">
        </div>
        <div class="speaker-info">
          <h3 class="speaker-name">${sp.name}</h3>
          <p class="speaker-talk">${sp.talks[0].title}</p>
          ${sp.talks[0].category ? `<span class="speaker-category">${categoryIcons[sp.talks[0].category] || ''}${sp.talks[0].category}</span>` : ''}
        </div>
      </div>`).join('');

    const ctaLine = secLines.find(l => l.startsWith('[cta:'));
    let ctaHtml = '';
    if (ctaLine) {
      const [, labelAndUrl] = ctaLine.match(/\[cta:([^\]]+)\]/) || [];
      if (labelAndUrl) {
        const sep   = labelAndUrl.indexOf('|');
        const label = sep === -1 ? labelAndUrl : labelAndUrl.slice(0, sep);
        const href  = sep === -1 ? '#' : labelAndUrl.slice(sep + 1);
        ctaHtml = `<div class="section-cta"><a href="${href}" target="_blank" rel="noopener" class="btn btn-primary btn-lg">${label}</a></div>`;
      }
    }

    bodyEl.innerHTML = `<div class="speakers-grid">${cards}</div>${ctaHtml}`;

    bodyEl.querySelectorAll('.speaker-card').forEach(card => {
      const handler = () => openModal(sorted[+card.dataset.speaker], bios[+card.dataset.speaker]);
      card.addEventListener('click', handler);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handler(); });
    });
  })();
  renderSection('local',         'localTitle',         'localSubtitle',         'localBody');
  renderSection('patrocinadores','patrocinadoresTitle','patrocinadoresSubtitle','patrocinadoresBody');
  renderSection('ingressos',     'ingressosTitle',     'ingressosSubtitle',     'ingressosBody');

  // ── FOOTER ────────────────────────────────────────────────────
  const socialIcons = {
    twitter: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    instagram: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
    youtube: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
    telegram: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`,
    linkedin: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
    facebook: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
  };

  if (sections.footer) {
    const footerLines = lines(sections.footer);
    const socials = footerLines.filter(l => l.startsWith('[social:'));
    const text    = footerLines.filter(l => !l.startsWith('['));

    let html = text.map(t => {
      if (t.startsWith('Realização:')) {
        const label = t.replace('Realização:', '').trim();
        return `<p class="footer-realizacao">Realização: <a href="https://phpmaranhao.com.br" target="_blank" rel="noopener"><img src="assets/logo_mini.png" alt="${label}" class="footer-realizacao-logo"></a></p>`;
      }
      return `<p>${t}</p>`;
    }).join('');
    if (socials.length) {
      const urls = { twitter: 'https://x.com/', instagram: 'https://instagram.com/', youtube: 'https://youtube.com/', linkedin: 'https://linkedin.com/in/', telegram: 'https://t.me/', facebook: 'https://www.facebook.com/' };
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
    html += `<p class="footer-credit">Desenvolvido com zelo por <a href="https://nexy.com.br" target="_blank" rel="noopener">Nexy Consultoria</a></p>`;
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
