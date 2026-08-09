# shrtn.link

URL shortener statico ospitato su GitHub Pages. Nessun backend, nessun database,
nessun tracking: ogni link è una voce in `links.json`, versionata su Git.

```
https://shrtn.link/instagram  →  https://instagram.com/smartai_it
https://shrtn.link/instagram/qr  →  QR code scaricabile in PNG
```

---

## Indice

- [Aggiungere un link](#aggiungere-un-link)
- [Validare in locale prima del commit](#validare-in-locale-prima-del-commit)
- [Import massivo da CSV](#import-massivo-da-csv)
- [QR code](#qr-code)
- [Anteprime Open Graph](#anteprime-open-graph)
- [Controllo automatico dei link rotti](#controllo-automatico-dei-link-rotti)
- [Come funziona](#come-funziona)
- [Setup di GitHub Pages e del dominio](#setup-di-github-pages-e-del-dominio)
- [Struttura del repository](#struttura-del-repository)

---

## Aggiungere un link

Modifica `links.json` e apri una pull request. Alla root del file c'è un oggetto
con uno slug per chiave:

```json
{
  "instagram": {
    "url": "https://instagram.com/smartai_it",
    "title": "SmartAI su Instagram",
    "description": "Segui SmartAI per aggiornamenti su corsi ed eventi"
  },
  "corso-ai": {
    "url": "https://example.com/corsi/ai-per-manager"
  }
}
```

| Campo | Obbligatorio | Uso |
| --- | --- | --- |
| `url` | sì | destinazione del redirect, `http://` o `https://` |
| `title` | no | `og:title`. Default: `shrtn.link/[slug]` |
| `description` | no | `og:description`. Default: `Collegamento breve verso [dominio].` |
| `image` | no | `og:image`. Deve essere un URL assoluto |

Regole sugli slug, applicate dalla validazione:

- solo `a-z`, `A-Z`, `0-9`, `-` e `_`, massimo 64 caratteri;
- niente duplicati, nemmeno a meno di maiuscole (`Corso` e `corso` collidono);
- niente slug riservati (`assets`, `qr`, `index`, `404`, `robots`, …);
- la destinazione non può puntare a `shrtn.link`, per non creare loop.

Il flusso completo:

```bash
git checkout -b add/nuovo-link
# modifica links.json
npm run validate          # controllo locale
git commit -am "Aggiunge lo short link /nuovo-link"
git push -u origin add/nuovo-link
```

Alla PR gira il workflow **Validate links**. Al merge su `main`, **Deploy**
rigenera e pubblica il sito: il link è attivo dopo circa un minuto.

---

## Validare in locale prima del commit

Serve solo Node.js 20 o superiore, nessuna dipendenza da installare.

```bash
node validate-links.js        # oppure: npm run validate
```

Output tipico quando qualcosa non va:

```
Validazione di links.json
✖ corso ai: slug non valido: sono ammessi solo a-z, A-Z, 0-9, "-" e "_" (max 64 caratteri)
✖ evento: url non valido: "exmaple.com/eventi"
! linkedin: title lungo 84 caratteri: verrà troncato nelle anteprime (max ~70)

Validazione fallita: 2 errori, 1 avviso su 4 link.
```

Exit code `0` se tutto è valido, `1` se c'è almeno un errore. Gli avvisi (`!`)
non bloccano nulla.

Per non dimenticarsene mai, installa un hook di pre-commit:

```bash
cat > .git/hooks/pre-commit <<'EOF'
#!/bin/sh
node validate-links.js || {
  echo "Commit annullato: links.json non è valido."
  exit 1
}
EOF
chmod +x .git/hooks/pre-commit
```

Per vedere il sito come sarà in produzione:

```bash
npm run preview     # build in dist/ e server locale su http://localhost:3000
```

---

## Import massivo da CSV

```bash
node import-csv.js import-example.csv --dry-run    # simulazione
node import-csv.js miei-link.csv                   # import reale
```

Colonne attese: `slug,url,title,description` (più l'opzionale `image`).
`title` e `description` possono restare vuoti. Il separatore viene rilevato
automaticamente, quindi anche i CSV esportati da Excel in italiano (`;`)
funzionano senza conversioni.

Quando uno slug esiste già con contenuto diverso, lo script si ferma e chiede:

```
Conflitto sullo slug "instagram":
  attuale: https://instagram.com/smartai_it  — SmartAI su Instagram
  nuovo:   https://instagram.com/smartai_official  — SmartAI
  [s] sovrascrivi  [m] mantieni  [ts] sovrascrivi tutti  [tm] mantieni tutti  [a] annulla >
```

| Opzione | Effetto |
| --- | --- |
| `--dry-run` | mostra il riepilogo senza scrivere niente |
| `--yes` | sovrascrive tutti i conflitti senza chiedere |
| `--skip-existing` | mantiene sempre la versione già presente |
| `--skip-invalid` | ignora le righe non valide invece di interrompere |
| `--sort` | riordina `links.json` alfabeticamente |

Le righe non valide vengono segnalate con numero di riga e motivo, e per
impostazione predefinita bloccano l'intero import: meglio correggere il CSV che
scoprire il problema in produzione.

---

## QR code

Ogni link ha la sua pagina QR: `https://shrtn.link/[slug]/qr`.

Il codice viene generato nel browser a 1024 px ed è scaricabile in PNG con il
bottone **Download QR** — risoluzione adeguata per locandine e materiali
stampati.

La libreria (`qrcode@1.5.1`) è ospitata in `assets/qrcode.min.js`, non presa da
un CDN: la pagina QR serve tipicamente sul posto a un evento, dove la rete è
inaffidabile. Per aggiornarla, sostituisci il file — tieni presente che dalla
versione 1.5.2 il pacchetto npm non pubblica più un bundle browser, quindi la
1.5.1 è l'ultima utilizzabile così com'è.

Il QR punta allo short link, non alla destinazione finale: se domani il link di
un evento cambia, basta aggiornare `links.json` e i volantini già stampati
continuano a funzionare.

---

## Anteprime Open Graph

Le pagine di redirect includono `og:title`, `og:description` e `og:url`
staticamente nell'HTML, quindi LinkedIn, WhatsApp, Telegram e Slack mostrano
un'anteprima corretta. Se `title` o `description` mancano, la build usa dei
default (`shrtn.link/[slug]` e `Collegamento breve verso [dominio].`).

Dopo aver cambiato `title` o `description` di un link già condiviso, le
piattaforme mantengono in cache la vecchia anteprima. Per forzare
l'aggiornamento:

- LinkedIn: <https://www.linkedin.com/post-inspector/>
- Facebook e WhatsApp: <https://developers.facebook.com/tools/debug/>

---

## Controllo automatico dei link rotti

Il workflow **Link health** gira ogni lunedì mattina (e a mano da
Actions → Link health → Run workflow). Per ogni destinazione prova una `HEAD`,
con fallback a `GET` sui server che non la supportano.

| Esito | Classificazione | Azione |
| --- | --- | --- |
| 2xx, 3xx | ok | chiude una eventuale issue aperta in precedenza |
| 401, 403, 405, 429, 999 | non conclusivo | nessuna azione: quasi sempre anti-bot, non un link rotto |
| 404, 410, 5xx, timeout, errore di rete | rotto | apre una issue con etichetta `link-health` |

Ogni issue contiene slug, destinazione, status code, metodo e data del
controllo. La deduplica si basa su un marker HTML nascosto nel corpo della
issue, quindi un link già segnalato non genera doppioni anche se qualcuno
rinomina la issue a mano. Le issue si chiudono da sole quando la destinazione
torna raggiungibile o quando lo slug viene rimosso da `links.json`.

In locale:

```bash
node check-links.js           # oppure: npm run health
node check-links.js --strict  # exit 1 se almeno un link è rotto
```

---

## Come funziona

Il punto delicato di uno shortener statico sono le anteprime social: i crawler
di LinkedIn e WhatsApp **non eseguono JavaScript**, quindi un redirect fatto
solo lato client non può produrre meta tag `og:*` corretti. Per questo
`build.js` pre-genera una pagina HTML reale per ogni slug, con i meta tag già
scritti nel sorgente.

```
links.json
    │
    │  node build.js
    ▼
dist/
├── index.html            homepage
├── 404.html              catch-all
├── links.json            copiato: serve al fallback del 404
├── assets/
├── instagram/
│   ├── index.html        meta og:* + pagina di transizione + redirect JS
│   └── qr/index.html     QR code
└── …
```

Cosa succede aprendo `shrtn.link/instagram`:

1. GitHub Pages serve `instagram/index.html` con status 200;
2. il crawler che sta generando un'anteprima legge gli `og:*` e si ferma qui;
3. un browser vero mostra per ~250 ms «Reindirizzamento a instagram.com…» e poi
   esegue `location.replace()`.

I 250 ms sono una scelta di trasparenza, non un limite tecnico: l'utente vede
dove sta andando prima di arrivarci. Per non pagarli due volte, la pagina è
completamente autonoma — CSS incorporato, nessuna richiesta di rete — e apre in
anticipo la connessione verso la destinazione con `preconnect`, così il tempo di
attesa viene speso a fare handshake TLS invece che ad aspettare. Con JavaScript
disabilitato interviene un `<meta http-equiv="refresh">` dentro `<noscript>`.

Uno slug inesistente arriva a `404.html`, che GitHub Pages serve con status 404.
Quella pagina è anche una rete di sicurezza: se il sito venisse pubblicato
direttamente dal branch senza build, risolve comunque slug e QR leggendo
`links.json` lato client. In quel caso funziona tutto tranne le anteprime
social, che richiedono HTML statico.

Il redirect è client-side per forza di cose: GitHub Pages non permette di
impostare header HTTP, quindi un vero `301` non è possibile senza un backend o
un CDN davanti.

---

## Setup di GitHub Pages e del dominio

### 1. Push del repository

```bash
git add .
git commit -m "Setup iniziale di shrtn.link"
git push -u origin main
```

### 2. Attiva Pages in modalità GitHub Actions

**Settings → Pages → Build and deployment → Source: `GitHub Actions`.**

Non scegliere "Deploy from a branch": senza la build mancherebbero le pagine
per-slug e quindi le anteprime Open Graph.

Al primo push su `main` il workflow **Deploy** pubblica il sito. Verifica in
Actions che sia verde prima di procedere.

### 3. Configura il DNS di shrtn.link

Presso il registrar del dominio, crea questi record. `shrtn.link` è un dominio
apex, quindi servono record A e AAAA — un `CNAME` sull'apex non è ammesso dallo
standard DNS (alcuni provider offrono `ALIAS` o `ANAME`: in quel caso puntalo a
`occhinog.github.io` e salta A/AAAA).

| Tipo | Nome | Valore | TTL |
| --- | --- | --- | --- |
| A | `@` | `185.199.108.153` | 3600 |
| A | `@` | `185.199.109.153` | 3600 |
| A | `@` | `185.199.110.153` | 3600 |
| A | `@` | `185.199.111.153` | 3600 |
| AAAA | `@` | `2606:50c0:8000::153` | 3600 |
| AAAA | `@` | `2606:50c0:8001::153` | 3600 |
| AAAA | `@` | `2606:50c0:8002::153` | 3600 |
| AAAA | `@` | `2606:50c0:8003::153` | 3600 |
| CNAME | `www` | `occhinog.github.io.` | 3600 |

I quattro A record convivono: sono lo stesso servizio su edge diversi.

**Se usi Cloudflare**: tieni il proxy disattivato (nuvola grigia, "DNS only")
finché GitHub non ha emesso il certificato, altrimenti la validazione fallisce.
Dopo puoi riattivarlo solo con SSL/TLS in modalità **Full (strict)**; in
modalità Flexible si crea un loop di redirect.

### 4. Imposta il dominio in GitHub

**Settings → Pages → Custom domain → `shrtn.link` → Save.**

GitHub verifica il DNS (da pochi minuti a qualche ora in base al TTL). Quando la
verifica passa, spunta **Enforce HTTPS**: il certificato Let's Encrypt viene
emesso automaticamente.

Il file `CNAME` nella root del repository contiene già `shrtn.link` ed è incluso
nell'artifact della build. Con il deploy via Actions è l'impostazione in Settings
a fare fede, ma il file resta utile se un domani passassi al deploy da branch.

### 5. Verifica

```bash
dig shrtn.link +short                       # deve elencare i quattro IP 185.199.*
dig www.shrtn.link +short                   # deve risolvere via occhinog.github.io
curl -sI https://shrtn.link/ | head -1      # HTTP/2 200
curl -s https://shrtn.link/instagram | grep 'og:title'
curl -sI https://shrtn.link/non-esiste | head -1   # HTTP/2 404
```

Se dopo la propagazione il sito risponde ma il redirect no, controlla che il
workflow **Deploy** sia andato a buon fine: il sito viene pubblicato da lì, non
dal contenuto del branch.

---

## Struttura del repository

```
.
├── index.html              homepage
├── 404.html                catch-all + fallback per slug e QR
├── links.json              i link (unica fonte di verità)
├── CNAME                   shrtn.link
├── .nojekyll               disattiva Jekyll (slug con underscore iniziale)
├── robots.txt
├── assets/
│   ├── style.css           stile condiviso
│   ├── qr.js               generazione QR lato client
│   └── qrcode.min.js       qrcode@1.5.1, self-hosted
├── build.js                genera dist/ con una pagina per slug
├── validate-links.js       validazione di links.json (anche modulo condiviso)
├── import-csv.js           import massivo da CSV
├── check-links.js          controllo di raggiungibilità
├── import-example.csv      CSV di esempio
└── .github/workflows/
    ├── validate.yml        validazione su push e PR
    ├── deploy.yml          build e pubblicazione su Pages
    └── health-check.yml    controllo settimanale + gestione issue
```

Nessuna dipendenza npm: gli script usano solo la libreria standard di Node.
`package.json` esiste solo per gli alias dei comandi.

---

## Note

- **Nessun tracking**: nessun cookie, nessuna analitica, nessun conteggio dei
  click. Il redirect passa dal browser dell'utente e non lascia traccia lato
  server, oltre ai log di GitHub.
- **Le pagine di redirect sono indicizzabili.** È voluto: `noindex` avrebbe
  potuto compromettere la generazione delle anteprime su alcune piattaforme.
  Le pagine QR sono invece `noindex`.
- **Slug maiuscoli/minuscoli**: le pagine generate sono case-sensitive, ma il
  fallback in `404.html` recupera anche chi digita `/Instagram` invece di
  `/instagram`.
- **Nessuna dipendenza runtime di terze parti.** Tutto ciò che il browser
  scarica arriva da `shrtn.link`, libreria QR inclusa.
