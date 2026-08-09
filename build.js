#!/usr/bin/env node
'use strict';

/**
 * shrtn.link — generatore del sito statico
 *
 * Uso:
 *   node build.js [--out dist] [--site https://shrtn.link]
 *
 * Produce in dist/:
 *   - i file statici della root (index.html, 404.html, assets/, CNAME, …)
 *   - /[slug]/index.html      pagina di transizione con meta Open Graph statici
 *   - /[slug]/qr/index.html   pagina QR
 *
 * Perché serve una build invece del solo 404.html: i crawler che generano le
 * anteprime (LinkedIn, WhatsApp, Telegram, Slack) non eseguono JavaScript.
 * Gli og:* devono quindi esistere nell'HTML servito, il che richiede una
 * pagina reale per ogni slug. Il 404.html resta come rete di sicurezza.
 */

const fs = require('fs');
const path = require('path');
const { validateRaw } = require('./validate-links');

const REDIRECT_DELAY_MS = 250;   // deve restare allineato a 404.html

const STATIC_ENTRIES = [
  'index.html',
  '404.html',
  'links.json',
  'robots.txt',
  'CNAME',
  '.nojekyll',
  'assets'
];

/* Copia ridotta di assets/style.css, incorporata nella pagina di redirect per
   evitare una richiesta di rete su una pagina che vive ~250ms. Se cambi la
   palette in style.css, allineala qui. */
const CRITICAL_CSS = `
:root{color-scheme:light dark;--bg:#fbfbfc;--fg:#14181d;--muted:#5f6b78;--border:#e4e7ec;--accent:#2f6df6}
@media(prefers-color-scheme:dark){:root{--bg:#0c0f13;--fg:#e7ebf0;--muted:#97a2af;--border:#232a33;--accent:#6f9bff}}
*{box-sizing:border-box}
body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:1.5rem;
background:var(--bg);color:var(--fg);text-align:center;line-height:1.6;-webkit-font-smoothing:antialiased;
font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
main{max-width:32rem}
.spinner{width:22px;height:22px;margin:0 auto 1rem;border:2px solid var(--border);border-top-color:var(--accent);
border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.spinner{animation:none}}
p{margin:0 0 .5rem}
.lead{font-size:1.05rem}
.small{font-size:.875rem;color:var(--muted)}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
`.trim();

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

/** Stringa JS sicura da incorporare in un tag <script> inline. */
const jsString = (value) => JSON.stringify(String(value))
  .replace(/</g, '\\u003c')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

const FAVICON = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" +
  "<text y='.9em' font-size='90'>🔗</text></svg>";

function parseArgs(argv) {
  const options = { out: 'dist', site: process.env.SITE_URL || 'https://shrtn.link' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') options.out = argv[++i];
    else if (argv[i] === '--site') options.site = argv[++i];
    else {
      console.error(`Argomento non riconosciuto: ${argv[i]}`);
      process.exit(1);
    }
  }
  options.site = options.site.replace(/\/+$/, '');
  return options;
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

function redirectPage(slug, entry, site) {
  const url = entry.url.trim();
  const destination = new URL(url);
  const host = destination.hostname.replace(/^www\./, '');
  const canonical = `${site}/${slug}`;

  // Default richiesti quando title/description non sono valorizzati.
  const title = entry.title && entry.title.trim()
    ? entry.title.trim()
    : `shrtn.link/${slug}`;
  const description = entry.description && entry.description.trim()
    ? entry.description.trim()
    : `Collegamento breve verso ${host}.`;

  const image = entry.image && entry.image.trim() ? entry.image.trim() : null;

  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">

<meta property="og:type" content="website">
<meta property="og:site_name" content="shrtn.link">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
${image ? `<meta property="og:image" content="${escapeHtml(image)}">\n` : ''}<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
${image ? `<meta name="twitter:image" content="${escapeHtml(image)}">\n` : ''}
<link rel="preconnect" href="${escapeHtml(destination.origin)}" crossorigin>
<link rel="dns-prefetch" href="${escapeHtml(destination.origin)}">
<link rel="icon" href="${FAVICON}">
<style>${CRITICAL_CSS}</style>
<noscript><meta http-equiv="refresh" content="0; url=${escapeHtml(url)}"></noscript>
</head>
<body>
<main>
  <div class="spinner"></div>
  <p class="lead">Reindirizzamento a <strong>${escapeHtml(host)}</strong>…</p>
  <p class="small">
    <a href="${escapeHtml(url)}" rel="noopener">Vai subito</a> ·
    <a href="${escapeHtml(`${site}/${slug}/qr/`)}">QR code</a>
  </p>
</main>
<script>
(function(){
  var u = ${jsString(url)};
  setTimeout(function(){ location.replace(u); }, ${REDIRECT_DELAY_MS});
})();
</script>
</body>
</html>
`;
}

function qrPage(slug, entry, site) {
  const target = `${site}/${slug}`;
  const label = entry.title && entry.title.trim() ? entry.title.trim() : `shrtn.link/${slug}`;

  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>QR · shrtn.link/${escapeHtml(slug)}</title>
<meta name="robots" content="noindex">
<link rel="stylesheet" href="/assets/style.css">
<link rel="icon" href="${FAVICON}">
</head>
<body>

<main class="wrap wrap--center">
  <a class="brand" href="/">shrtn<span class="dot">.</span>link</a>
  <h1 style="font-size:1.4rem">${escapeHtml(label)}</h1>
  <p class="target">${escapeHtml(target)}</p>

  <div class="qr-frame">
    <canvas id="qr-canvas" hidden></canvas>
    <p class="small muted" id="qr-status" style="margin:0">Generazione del QR…</p>
  </div>

  <div class="actions">
    <button class="btn" id="qr-download" type="button" disabled>Download QR (PNG)</button>
    <a class="btn btn--ghost" href="${escapeHtml(entry.url.trim())}" rel="noopener">Apri il link</a>
  </div>

  <p class="small muted" style="margin-top:1.5rem">
    Il QR punta a <code>${escapeHtml(target)}</code>: la destinazione può cambiare
    in futuro senza dover ristampare il codice.
  </p>
</main>

<footer>
  <a href="/">shrtn.link</a> · nessun tracking
</footer>

<script src="/assets/qr.js" defer></script>
<script>
document.addEventListener('DOMContentLoaded', function () {
  // qr.js è "defer": a DOMContentLoaded è già stato eseguito, salvo errori di rete.
  if (!window.shrtnQr) {
    document.getElementById('qr-status').textContent = 'Impossibile caricare il generatore di QR.';
    return;
  }
  window.shrtnQr.render({
    canvas: document.getElementById('qr-canvas'),
    text: ${jsString(target)},
    filename: ${jsString(`shrtn-${slug}-qr.png`)},
    status: document.getElementById('qr-status'),
    button: document.getElementById('qr-download')
  });
});
</script>

</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function main(argv) {
  const options = parseArgs(argv);
  const root = __dirname;
  const outDir = path.resolve(root, options.out);
  const linksFile = path.join(root, 'links.json');

  const raw = fs.readFileSync(linksFile, 'utf8');
  const { errors, warnings, links } = validateRaw(raw);

  if (errors.length > 0) {
    console.error('Build interrotta: links.json non è valido.\n');
    for (const issue of errors) {
      console.error(`  ✖ ${issue.slug ? issue.slug + ': ' : ''}${issue.message}`);
    }
    console.error('\nEsegui `npm run validate` per il dettaglio.');
    process.exit(1);
  }
  for (const issue of warnings) {
    console.warn(`  ! ${issue.slug ? issue.slug + ': ' : ''}${issue.message}`);
  }

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  for (const name of STATIC_ENTRIES) {
    const source = path.join(root, name);
    if (!fs.existsSync(source)) {
      console.warn(`  ! ${name} assente, salto la copia`);
      continue;
    }
    fs.cpSync(source, path.join(outDir, name), { recursive: true });
  }

  const slugs = Object.keys(links);
  for (const slug of slugs) {
    const entry = links[slug];
    const slugDir = path.join(outDir, slug);

    fs.mkdirSync(slugDir, { recursive: true });
    fs.writeFileSync(path.join(slugDir, 'index.html'), redirectPage(slug, entry, options.site));

    const qrDir = path.join(slugDir, 'qr');
    fs.mkdirSync(qrDir, { recursive: true });
    fs.writeFileSync(path.join(qrDir, 'index.html'), qrPage(slug, entry, options.site));
  }

  console.log(
    `✔ Build completata in ${path.relative(process.cwd(), outDir) || outDir}: ` +
    `${slugs.length} link, ${slugs.length * 2} pagine generate.`
  );
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { redirectPage, qrPage };
