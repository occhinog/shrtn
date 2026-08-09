#!/usr/bin/env node
'use strict';

/**
 * shrtn.link — validatore di links.json
 *
 * Uso:
 *   node validate-links.js [percorso/links.json]
 *
 * Exit code: 0 se tutto è valido, 1 se c'è almeno un errore.
 * Gli avvisi non fanno fallire la validazione.
 *
 * Il file esporta anche le funzioni di validazione, riusate da build.js
 * e da import-csv.js, così le regole restano definite in un solo posto.
 */

const fs = require('fs');
const path = require('path');

const SLUG_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Slug che collidono con file o directory reali del sito. */
const RESERVED_SLUGS = new Set([
  'assets', 'qr', 'index', '404', 'api', 'cname', 'dist', 'favicon',
  'links', 'node_modules', 'readme', 'robots', 'sitemap', 'well-known'
]);

const KNOWN_FIELDS = new Set(['url', 'title', 'description', 'image']);

/** Host del sito stesso: usarlo come destinazione creerebbe un loop. */
const SELF_HOSTS = new Set(['shrtn.link', 'www.shrtn.link']);

// ---------------------------------------------------------------------------
// Validazione
// ---------------------------------------------------------------------------

/**
 * JSON.parse collassa silenziosamente le chiavi duplicate tenendo l'ultima:
 * per accorgersene bisogna rileggere il testo grezzo. Questo scanner estrae
 * le chiavi al primo livello di annidamento tenendo conto di stringhe ed escape.
 *
 * @param {string} raw
 * @returns {string[]} slug che compaiono più di una volta
 */
function findDuplicateTopLevelKeys(raw) {
  const counts = new Map();
  let depth = 0;
  let inString = false;
  let escaped = false;
  let stringStart = -1;
  let pendingKey = null;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') {
        inString = false;
        if (depth === 1) pendingKey = raw.slice(stringStart, i);
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      stringStart = i + 1;
    } else if (ch === '{' || ch === '[') {
      depth++;
    } else if (ch === '}' || ch === ']') {
      depth--;
    } else if (ch === ',' && depth === 1) {
      pendingKey = null;
    } else if (ch === ':' && depth === 1 && pendingKey !== null) {
      let key = pendingKey;
      try { key = JSON.parse('"' + pendingKey + '"'); } catch (_) { /* chiave esotica: usa il grezzo */ }
      counts.set(key, (counts.get(key) || 0) + 1);
      pendingKey = null;
    }
  }

  const dupes = [];
  for (const [key, n] of counts) if (n > 1) dupes.push(key);
  return dupes;
}

/**
 * @param {string} slug
 * @returns {string[]} messaggi di errore (vuoto se lo slug è valido)
 */
function validateSlug(slug) {
  const errors = [];

  if (typeof slug !== 'string' || slug.length === 0) {
    errors.push('slug vuoto');
    return errors;
  }
  if (!SLUG_RE.test(slug)) {
    errors.push(
      `slug non valido: sono ammessi solo a-z, A-Z, 0-9, "-" e "_" (max 64 caratteri)`
    );
  }
  if (RESERVED_SLUGS.has(slug.toLowerCase())) {
    errors.push(`slug riservato: "${slug}" collide con un percorso del sito`);
  }
  return errors;
}

/**
 * @param {unknown} entry
 * @returns {{errors: string[], warnings: string[]}}
 */
function validateEntry(entry) {
  const errors = [];
  const warnings = [];

  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    errors.push('il valore deve essere un oggetto con almeno il campo "url"');
    return { errors, warnings };
  }

  // --- url (obbligatorio) ---
  const url = entry.url;
  if (typeof url !== 'string' || url.trim() === '') {
    errors.push('campo "url" mancante o non è una stringa');
  } else {
    if (url !== url.trim()) warnings.push('l\'url contiene spazi iniziali o finali');

    let parsed = null;
    try {
      parsed = new URL(url.trim());
    } catch (_) {
      errors.push(`url non valido: ${JSON.stringify(url)}`);
    }

    if (parsed) {
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        errors.push(`protocollo non ammesso "${parsed.protocol}": usa http:// o https://`);
      } else if (parsed.protocol === 'http:') {
        warnings.push('destinazione in http:// non cifrato: preferisci https:// dove possibile');
      }
      if (!parsed.hostname) {
        errors.push('url senza hostname');
      } else {
        if (SELF_HOSTS.has(parsed.hostname.toLowerCase())) {
          errors.push('la destinazione punta a shrtn.link: creerebbe un loop di redirect');
        }
        if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
          warnings.push(`hostname sospetto "${parsed.hostname}": manca il dominio di primo livello`);
        }
      }
    }
  }

  // --- title / description (opzionali, usati per Open Graph) ---
  for (const field of ['title', 'description']) {
    if (entry[field] === undefined) continue;
    if (typeof entry[field] !== 'string') {
      errors.push(`campo "${field}" deve essere una stringa`);
    } else if (entry[field].trim() === '') {
      warnings.push(`campo "${field}" vuoto: verrà usato il valore di default`);
    }
  }
  if (typeof entry.title === 'string' && entry.title.length > 70) {
    warnings.push(`title lungo ${entry.title.length} caratteri: verrà troncato nelle anteprime (max ~70)`);
  }
  if (typeof entry.description === 'string' && entry.description.length > 200) {
    warnings.push(`description lunga ${entry.description.length} caratteri: verrà troncata (max ~200)`);
  }

  // --- image (opzionale, og:image) ---
  if (entry.image !== undefined) {
    if (typeof entry.image !== 'string') {
      errors.push('campo "image" deve essere una stringa');
    } else {
      let img = null;
      try { img = new URL(entry.image); } catch (_) {
        errors.push('campo "image" deve essere un URL assoluto (le anteprime social non risolvono i path relativi)');
      }
      if (img && img.protocol !== 'https:') {
        warnings.push('og:image non in https://: alcune piattaforme la ignorano');
      }
    }
  }

  // --- campi sconosciuti ---
  for (const key of Object.keys(entry)) {
    if (!KNOWN_FIELDS.has(key)) {
      warnings.push(`campo sconosciuto "${key}": verrà ignorato dalla build`);
    }
  }

  return { errors, warnings };
}

/**
 * Valida il contenuto grezzo di un links.json.
 *
 * @param {string} raw
 * @returns {{errors: Array<{slug: string|null, message: string}>,
 *            warnings: Array<{slug: string|null, message: string}>,
 *            links: Object|null}}
 */
function validateRaw(raw) {
  const errors = [];
  const warnings = [];
  const push = (list, slug, message) => list.push({ slug, message });

  let links;
  try {
    links = JSON.parse(raw);
  } catch (err) {
    push(errors, null, `JSON non valido — ${err.message}`);
    return { errors, warnings, links: null };
  }

  if (links === null || typeof links !== 'object' || Array.isArray(links)) {
    push(errors, null, 'la radice di links.json deve essere un oggetto { "slug": { ... } }');
    return { errors, warnings, links: null };
  }

  for (const dupe of findDuplicateTopLevelKeys(raw)) {
    push(errors, dupe, 'slug duplicato: compare più volte nel file (JSON.parse terrebbe solo l\'ultimo)');
  }

  const slugs = Object.keys(links);
  if (slugs.length === 0) {
    push(warnings, null, 'links.json non contiene nessun link');
  }

  // Collisioni sul case: su un filesystem case-insensitive (macOS) le directory
  // generate da build.js si sovrascriverebbero a vicenda.
  const byLower = new Map();
  for (const slug of slugs) {
    const lower = slug.toLowerCase();
    if (byLower.has(lower)) {
      push(errors, slug, `collide con "${byLower.get(lower)}": due slug identici a meno di maiuscole`);
    } else {
      byLower.set(lower, slug);
    }
  }

  for (const slug of slugs) {
    for (const message of validateSlug(slug)) push(errors, slug, message);

    const result = validateEntry(links[slug]);
    for (const message of result.errors) push(errors, slug, message);
    for (const message of result.warnings) push(warnings, slug, message);
  }

  return { errors, warnings, links };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = (s) => paint('31', s);
const yellow = (s) => paint('33', s);
const green = (s) => paint('32', s);
const dim = (s) => paint('2', s);

function formatIssue(issue) {
  return issue.slug ? `${paint('1', issue.slug)}: ${issue.message}` : issue.message;
}

function main(argv) {
  const file = path.resolve(argv[0] || path.join(__dirname, 'links.json'));
  const relative = path.relative(process.cwd(), file) || file;

  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    console.error(`${red('✖')} impossibile leggere ${relative} — ${err.message}`);
    process.exit(1);
  }

  const { errors, warnings, links } = validateRaw(raw);
  const count = links ? Object.keys(links).length : 0;

  console.log(dim(`Validazione di ${relative}`));

  for (const issue of errors) console.log(`${red('✖')} ${formatIssue(issue)}`);
  for (const issue of warnings) console.log(`${yellow('!')} ${formatIssue(issue)}`);

  if (errors.length > 0) {
    console.log(
      `\n${red('Validazione fallita')}: ${errors.length} error${errors.length === 1 ? 'e' : 'i'}` +
      (warnings.length ? `, ${warnings.length} avvis${warnings.length === 1 ? 'o' : 'i'}` : '') +
      ` su ${count} link.`
    );
    process.exit(1);
  }

  console.log(
    `\n${green('✔')} ${count} link valid${count === 1 ? 'o' : 'i'}` +
    (warnings.length ? `, ${warnings.length} avvis${warnings.length === 1 ? 'o' : 'i'}.` : '.')
  );
  process.exit(0);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = {
  SLUG_RE,
  RESERVED_SLUGS,
  KNOWN_FIELDS,
  findDuplicateTopLevelKeys,
  validateSlug,
  validateEntry,
  validateRaw
};
