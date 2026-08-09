#!/usr/bin/env node
'use strict';

/**
 * shrtn.link — controllo di raggiungibilità delle destinazioni
 *
 * Uso:
 *   node check-links.js [--strict] [--links links.json] [--report health-report.json]
 *
 * Per ogni link in links.json prova una HEAD, con fallback a GET quando il
 * server non la supporta. Scrive un report JSON consumato dal workflow
 * link-health, che apre (o chiude) le issue su GitHub.
 *
 * Exit code: sempre 0, così il workflow arriva comunque al passo delle issue.
 * Con --strict esce 1 se almeno una destinazione risulta rotta.
 *
 * Classificazione:
 *   ok            2xx/3xx
 *   inconclusive  401/403/405/429/999 — quasi sempre anti-bot, non un link rotto
 *   broken        404/410, 5xx, errori di rete, timeout
 */

const fs = require('fs');
const path = require('path');

const TIMEOUT_MS = Number(process.env.HEALTH_TIMEOUT_MS || 15000);
const CONCURRENCY = Number(process.env.HEALTH_CONCURRENCY || 5);
const USER_AGENT =
  process.env.HEALTH_USER_AGENT ||
  'Mozilla/5.0 (compatible; shrtn-link-healthcheck/1.0; +https://shrtn.link)';

/** Codici che di solito significano "HEAD non supportata", non "link rotto". */
const RETRY_WITH_GET = new Set([400, 403, 404, 405, 406, 501]);

/** Codici che non provano nulla sulla validità del link (bot detection, rate limit). */
const INCONCLUSIVE = new Set([401, 403, 405, 429, 999]);

function parseArgs(argv) {
  const options = {
    strict: false,
    report: path.join(__dirname, 'health-report.json'),
    links: path.join(__dirname, 'links.json')
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--strict') options.strict = true;
    else if (argv[i] === '--report') options.report = path.resolve(argv[++i]);
    else if (argv[i] === '--links') options.links = path.resolve(argv[++i]);
    else {
      console.error(`Argomento non riconosciuto: ${argv[i]}`);
      process.exit(1);
    }
  }
  return options;
}

function describeError(err) {
  if (!err) return 'errore sconosciuto';
  if (err.name === 'TimeoutError' || err.name === 'AbortError') {
    return `nessuna risposta entro ${TIMEOUT_MS} ms`;
  }
  const code = err.cause && err.cause.code ? err.cause.code : null;
  return code ? `${code}: ${err.message}` : err.message;
}

async function request(url, method) {
  const response = await fetch(url, {
    method,
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      'user-agent': USER_AGENT,
      'accept': 'text/html,application/xhtml+xml,*/*'
    }
  });
  // Non serve il corpo: chiudiamo subito lo stream per non scaricare la pagina.
  if (response.body) {
    try { await response.body.cancel(); } catch (_) { /* già consumato */ }
  }
  return response;
}

async function check(slug, entry) {
  const url = String(entry.url).trim();
  let response = null;
  let method = 'HEAD';
  let error = null;

  try {
    response = await request(url, method);
    if (RETRY_WITH_GET.has(response.status)) {
      method = 'GET';
      response = await request(url, method);
    }
  } catch (headError) {
    // Alcuni CDN chiudono la connessione sulle HEAD: vale la pena riprovare in GET.
    try {
      method = 'GET';
      response = await request(url, method);
    } catch (getError) {
      error = describeError(getError);
    }
  }

  const status = response ? response.status : null;
  let state;
  if (error !== null) state = 'broken';
  else if (status >= 200 && status < 400) state = 'ok';
  else if (INCONCLUSIVE.has(status)) state = 'inconclusive';
  else state = 'broken';

  return {
    slug,
    url,
    state,
    status,
    method,
    error,
    finalUrl: response && response.url && response.url !== url ? response.url : null
  };
}

/** Esegue i controlli a gruppi, per non aprire decine di connessioni insieme. */
async function runPool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

async function main(argv) {
  const options = parseArgs(argv);
  const links = JSON.parse(fs.readFileSync(options.links, 'utf8'));
  const entries = Object.entries(links);

  if (entries.length === 0) {
    console.log('Nessun link da controllare.');
    fs.writeFileSync(options.report, JSON.stringify(
      { checkedAt: new Date().toISOString(), total: 0, ok: [], inconclusive: [], broken: [] }, null, 2
    ));
    return;
  }

  console.log(`Controllo di ${entries.length} destinazioni (timeout ${TIMEOUT_MS} ms, ${CONCURRENCY} in parallelo)…\n`);

  const results = await runPool(entries, CONCURRENCY, ([slug, entry]) => check(slug, entry));

  const icon = { ok: '✔', inconclusive: '?', broken: '✖' };
  for (const result of results) {
    const detail = result.error ? result.error : `HTTP ${result.status}`;
    console.log(`  ${icon[result.state]} ${result.slug.padEnd(20)} ${detail.padEnd(28)} ${result.url}`);
  }

  const report = {
    checkedAt: new Date().toISOString(),
    total: results.length,
    ok: results.filter((r) => r.state === 'ok'),
    inconclusive: results.filter((r) => r.state === 'inconclusive'),
    broken: results.filter((r) => r.state === 'broken')
  };

  fs.writeFileSync(options.report, JSON.stringify(report, null, 2));

  console.log(
    `\n${report.ok.length} ok · ${report.inconclusive.length} non conclusivi · ${report.broken.length} rotti` +
    `\nReport scritto in ${path.relative(process.cwd(), options.report) || options.report}`
  );

  if (options.strict && report.broken.length > 0) process.exit(1);
}

main(process.argv.slice(2)).catch((err) => {
  console.error(`✖ errore inatteso — ${err && err.stack ? err.stack : err}`);
  process.exit(1);
});
