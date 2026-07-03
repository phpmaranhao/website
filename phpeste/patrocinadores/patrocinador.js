// PHPeste 2026 — Renderizador de página de patrocinador (compartilhado)
//
// A página define o patrocinador e a base de assets via <body>:
//   <body data-slug="keepcloud" data-base="../">
// Fallbacks: se data-slug ausente, usa o último segmento do path (pretty URL);
// se ainda ausente, usa ?p=<slug>. data-base default = "" (mesma pasta).

(async function () {
  const app = document.getElementById('app');
  const base = document.body.dataset.base || '';

  // ── Ícones lineares (Tabler Icons, MIT) ────────────────
  const ICONS = {
    world:
      '<circle cx="12" cy="12" r="9"/><line x1="3.6" y1="9" x2="20.4" y2="9"/><line x1="3.6" y1="15" x2="20.4" y2="15"/><path d="M11.5 3a17 17 0 0 0 0 18"/><path d="M12.5 3a17 17 0 0 1 0 18"/>',
    whatsapp:
      '<path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9"/><path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1"/>',
    instagram:
      '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="3"/><line x1="16.5" y1="7.5" x2="16.5" y2="7.51"/>',
    linkedin:
      '<rect x="4" y="4" width="16" height="16" rx="2"/><line x1="8" y1="11" x2="8" y2="16"/><line x1="8" y1="8" x2="8" y2="8.01"/><line x1="12" y1="16" x2="12" y2="11"/><path d="M16 16v-3a2 2 0 0 0 -4 0"/>',
    youtube:
      '<rect x="3" y="5" width="18" height="14" rx="4"/><path d="M10 9l5 3l-5 3z"/>',
    mail:
      '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6l9 -6"/>'
  };

  function iconFor(label, href) {
    const s = (label + ' ' + href).toLowerCase();
    let key = 'world';
    if (/wa\.me|whats/.test(s)) key = 'whatsapp';
    else if (/instagram/.test(s)) key = 'instagram';
    else if (/youtu/.test(s)) key = 'youtube';
    else if (/linkedin/.test(s)) key = 'linkedin';
    else if (/mailto:|e-?mail/.test(s)) key = 'mail';
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[key]}</svg>`;
  }

  const slug = (
    document.body.dataset.slug ||
    (location.pathname.replace(/\/index\.html?$/i, '').split('/').filter(Boolean).pop()) ||
    new URLSearchParams(location.search).get('p') ||
    'keepcloud'
  ).replace(/[^a-z0-9_-]/gi, '');

  // ── Fetch markdown ─────────────────────────────────────
  let raw;
  try {
    const res = await fetch(base + slug + '.md');
    if (!res.ok) throw new Error(res.status);
    raw = await res.text();
  } catch (e) {
    app.innerHTML = '<p class="error">Patrocinador não encontrado.</p>';
    return;
  }

  // ── Parse frontmatter + body ───────────────────────────
  const { meta, body } = parseFrontmatter(raw);

  if (meta.cor) document.documentElement.style.setProperty('--accent', meta.cor);
  if (meta.nome) document.title = meta.nome + ' — Patrocinador PHPeste 2026';

  const logoBg = meta.logo_bg === 'dark' ? 'is-dark' : 'is-light';
  const badge = meta.tipo ? `<span class="badge">Patrocinador ${cedilla(escapeHtml(meta.tipo))}</span>` : '';
  const logo = meta.logo
    ? `<div class="logo-plate ${logoBg}"><img src="${escapeHtml(base + meta.logo)}" alt="${escapeHtml(meta.nome || '')}"></div>`
    : '';

  // ── Links (site + redes) ───────────────────────────────
  const links = [];
  if (meta.site) links.push({ ...splitPipe(meta.site), primary: true });
  (meta.social || []).forEach(s => links.push(splitPipe(s)));
  const linksHtml = links.length
    ? `<nav class="sponsor-links">${links.map(l =>
        `<a class="link-btn ${l.primary ? 'is-primary' : ''}" href="${escapeHtml(l.href)}" target="_blank" rel="noopener" title="${escapeHtml(l.label)}" aria-label="${escapeHtml(l.label)}">${iconFor(l.label, l.href)}</a>`
      ).join('')}</nav>`
    : '';

  app.innerHTML = `
    <section class="sponsor-hero">
      ${badge}
      ${logo}
      <h1 class="sponsor-name">${escapeHtml(meta.nome || '')}</h1>
    </section>
    <article class="sponsor-body">${marked.parse(body)}</article>
    ${linksHtml}
  `;

  // ── Helpers ────────────────────────────────────────────
  function parseFrontmatter(text) {
    const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
    if (!m) return { meta: {}, body: text };
    const meta = {};
    m[1].split('\n').forEach(line => {
      const mm = line.match(/^([a-z_]+):\s*(.*)$/i);
      if (!mm) return;
      const key = mm[1].trim();
      const val = mm[2].trim();
      if (key === 'social') { (meta.social = meta.social || []).push(val); }
      else { meta[key] = val; }
    });
    return { meta, body: m[2].trim() };
  }

  function splitPipe(str) {
    const [href, label] = str.split('|').map(s => s.trim());
    return { href, label: label || href.replace(/^https?:\/\//, '').replace(/^mailto:/, '') };
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // A fonte de títulos (Rye) não tem "ç": renderiza c + vírgula
  // reposicionada via CSS (.ced) para simular a cedilha.
  function cedilla(text) {
    return String(text).replace(/[çÇ]/g, m =>
      (m === 'ç' ? 'c' : 'C') + '<span class="ced">,</span>');
  }
})();
