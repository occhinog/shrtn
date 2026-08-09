#!/usr/bin/env node
'use strict';

/**
 * shrtn.link — import massivo di link da CSV
 *
 * Uso:
 *   node import-csv.js <file.csv> [opzioni]
 *
 * Opzioni:
 *   --dry-run        mostra cosa succederebbe senza scrivere links.json
 *   --yes            sovrascrive tutti gli slug già esistenti senza chiedere
 *   --skip-existing  mantiene sempre la versione già presente in links.json
 *   --skip-invalid   ignora le righe non valide invece di interrompere
 *   --sort           riordina links.json alfabeticamente per slug
 *   --links <path>   usa un links.json diverso da quello nella root
 *
 * Colonne attese: slug,url,title,description[,image]
 * title, description e image sono opzionali. Il separatore (virgola,
 * punto e virgola o tabulazione) viene rilevato automaticamente, così i CSV
 * esportati da Excel in locale italiano funzionano senza conversioni.
 */

const fs = require('fs');
const path = require('path');
const readline = require('node:readline/promises');
const { validateSlug, validateEntry } = require('./validate-links');

const OPTIONAL_FIELDS = ['title', 'description', 'image'];

// ---------------------------------------------------------------------------
// Parsing CSV (RFC 4180: virgolette doppie, escape con "", newline nei campi)
// ---------------------------------------------------------------------------

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const candidates = [',', ';', '\t'];
  let best = ',';
  let bestCount = -1;
  for (const candidate of candidates) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }
  return best;
}

function parseCsv(text, delimiter) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let started = false;   // distingue una riga vuota da una riga con un campo vuoto

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') { inQuotes = true; started = true; }
    else if (ch === delimiter) { row.push(field); field = ''; started = true; }
    else if (ch === '\n') {
      row.push(field);
      if (started || row.length > 1 || row[0] !== '') rows.push(row);
      row = []; field = ''; started = false;
    }
    else if (ch === '\r') { /* ignorato: gestito dal \n successivo */ }
    else { field += ch; started = true; }
  }

  if (started || field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Scarta le righe completamente vuote (tipiche in coda ai file Excel).
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const options = {
    file: null,
    dryRun: false,
    yes: false,
    skipExisting: false,
    skipInvalid: false,
    sort: false,
    links: path.join(__dirname, 'links.json')
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--yes' || arg === '-y' || arg === '--force') options.yes = true;
    else if (arg === '--skip-existing') options.skipExisting = true;
    else if (arg === '--skip-invalid') options.skipInvalid = true;
    else if (arg === '--sort') options.sort = true;
    else if (arg === '--links') options.links = path.resolve(argv[++i]);
    else if (arg.startsWith('-')) fail(`opzione non riconosciuta: ${arg}`);
    else if (options.file === null) options.file = path.resolve(arg);
    else fail(`argomento inatteso: ${arg}`);
  }

  if (!options.file) fail('manca il file CSV da importare.\n\n  Uso: node import-csv.js <file.csv> [--dry-run] [--yes]');
  if (options.yes && options.skipExisting) fail('--yes e --skip-existing si escludono a vicenda.');

  return options;
}

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

function readRows(options) {
  let text;
  try {
    text = fs.readFileSync(options.file, 'utf8').replace(/^\uFEFF/, '');
  } catch (err) {
    fail(`impossibile leggere ${options.file} — ${err.message}`);
  }

  const delimiter = detectDelimiter(text);
  const rows = parseCsv(text, delimiter);
  if (rows.length === 0) fail('il CSV è vuoto.');

  const header = rows[0].map((h) => h.trim().toLowerCase());
  for (const required of ['slug', 'url']) {
    if (!header.includes(required)) {
      fail(`colonna "${required}" mancante. Intestazione trovata: ${header.join(delimiter)}`);
    }
  }

  const label = delimiter === '\t' ? 'tabulazione' : `"${delimiter}"`;
  console.log(`Separatore rilevato: ${label} — ${rows.length - 1} righe da importare.\n`);

  const parsed = [];
  const problems = [];
  const seen = new Set();

  for (let i = 1; i < rows.length; i++) {
    const line = i + 1;
    const cells = rows[i];
    const record = {};
    header.forEach((name, index) => { record[name] = (cells[index] || '').trim(); });

    const slug = record.slug;
    const entry = { url: record.url };
    for (const field of OPTIONAL_FIELDS) {
      if (record[field]) entry[field] = record[field];
    }

    const errors = validateSlug(slug).concat(validateEntry(entry).errors);
    if (seen.has(slug)) errors.push(`slug "${slug}" ripetuto due volte nel CSV`);

    if (errors.length > 0) {
      problems.push({ line, slug, errors });
      continue;
    }

    seen.add(slug);
    parsed.push({ slug, entry, line });
  }

  if (problems.length > 0) {
    console.error(`${problems.length} riga/e non valida/e:\n`);
    for (const problem of problems) {
      console.error(`  riga ${problem.line} (${problem.slug || 'slug vuoto'}):`);
      for (const message of problem.errors) console.error(`    ✖ ${message}`);
    }
    console.error('');
    if (!options.skipInvalid) {
      fail('import interrotto. Correggi il CSV, oppure usa --skip-invalid per ignorare queste righe.');
    }
    console.warn('→ righe non valide ignorate (--skip-invalid).\n');
  }

  return parsed;
}

function sameEntry(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function resolveConflicts(conflicts, options) {
  const decisions = new Map();

  if (options.yes) {
    for (const conflict of conflicts) decisions.set(conflict.slug, true);
    return decisions;
  }
  if (options.skipExisting) {
    for (const conflict of conflicts) decisions.set(conflict.slug, false);
    return decisions;
  }
  if (!process.stdin.isTTY) {
    fail(
      `${conflicts.length} slug già esistenti richiedono una conferma, ma il terminale non è interattivo.\n` +
      '  Rilancia con --yes (sovrascrivi tutti) oppure --skip-existing (mantieni gli attuali).'
    );
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let applyToAll = null;

  try {
    for (const conflict of conflicts) {
      if (applyToAll !== null) {
        decisions.set(conflict.slug, applyToAll);
        continue;
      }

      console.log(`\nConflitto sullo slug "${conflict.slug}":`);
      console.log(`  attuale: ${conflict.current.url}${conflict.current.title ? `  — ${conflict.current.title}` : ''}`);
      console.log(`  nuovo:   ${conflict.incoming.url}${conflict.incoming.title ? `  — ${conflict.incoming.title}` : ''}`);

      let answer = '';
      while (!['s', 'm', 'ts', 'tm', 'a'].includes(answer)) {
        let response;
        try {
          response = await rl.question(
            '  [s] sovrascrivi  [m] mantieni  [ts] sovrascrivi tutti  [tm] mantieni tutti  [a] annulla > '
          );
        } catch (err) {
          // Ctrl+C o Ctrl+D al prompt: annullamento, non un crash.
          answer = 'a';
          break;
        }
        answer = response.trim().toLowerCase();
      }

      if (answer === 'a') {
        console.log('\nImport annullato: links.json non è stato modificato.');
        rl.close();
        process.exit(0);
      }
      if (answer === 'ts') applyToAll = true;
      if (answer === 'tm') applyToAll = false;

      decisions.set(conflict.slug, answer === 's' || answer === 'ts');
    }
  } finally {
    rl.close();
  }

  return decisions;
}

async function main(argv) {
  const options = parseArgs(argv);
  const incoming = readRows(options);

  let links;
  try {
    links = JSON.parse(fs.readFileSync(options.links, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') links = {};
    else fail(`links.json non leggibile — ${err.message}`);
  }

  const added = [];
  const identical = [];
  const conflicts = [];

  for (const item of incoming) {
    if (!Object.prototype.hasOwnProperty.call(links, item.slug)) {
      added.push(item);
    } else if (sameEntry(links[item.slug], item.entry)) {
      identical.push(item);
    } else {
      conflicts.push({ slug: item.slug, current: links[item.slug], incoming: item.entry });
    }
  }

  // In --dry-run non si chiede niente: i conflitti vengono solo elencati.
  const decisions = (conflicts.length > 0 && !options.dryRun)
    ? await resolveConflicts(conflicts, options)
    : new Map();

  for (const item of added) links[item.slug] = item.entry;

  const overwritten = [];
  const kept = [];
  for (const conflict of conflicts) {
    if (decisions.get(conflict.slug)) {
      links[conflict.slug] = conflict.incoming;
      overwritten.push(conflict.slug);
    } else {
      kept.push(conflict.slug);
    }
  }

  if (options.sort) {
    const sorted = {};
    for (const slug of Object.keys(links).sort()) sorted[slug] = links[slug];
    links = sorted;
  }

  const list = (items) => (items.length ? '  (' + items.join(', ') + ')' : '');

  console.log('\n--- Riepilogo ---');
  console.log(`  nuovi:        ${added.length}${list(added.map((i) => i.slug))}`);

  if (options.dryRun) {
    const pending = conflicts.map((c) => c.slug);
    console.log(`  da decidere:  ${pending.length}${list(pending)}`);
  } else {
    console.log(`  sovrascritti: ${overwritten.length}${list(overwritten)}`);
    console.log(`  mantenuti:    ${kept.length}${list(kept)}`);
  }

  console.log(`  identici:     ${identical.length}`);
  console.log(`  totale link:  ${Object.keys(links).length}`);

  if (options.dryRun) {
    console.log('\n(--dry-run) Nessuna modifica scritta su disco.');
    return;
  }

  if (added.length === 0 && overwritten.length === 0 && !options.sort) {
    console.log('\nNessuna modifica da scrivere.');
    return;
  }

  fs.writeFileSync(options.links, JSON.stringify(links, null, 2) + '\n');
  console.log(`\n✔ ${path.relative(process.cwd(), options.links) || options.links} aggiornato.`);
  console.log('  Passo successivo: npm run validate && git add links.json && git commit');
}

main(process.argv.slice(2)).catch((err) => {
  console.error(`✖ errore inatteso — ${err && err.stack ? err.stack : err}`);
  process.exit(1);
});
