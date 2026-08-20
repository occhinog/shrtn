# shrtn.link — SaaS Plan & Research

> **Status: ON STANDBY** (parked 20 August 2026)
>
> Research and design work for turning `shrtn.link` from a static GitHub Pages
> shortener into a multi-tenant link + QR service. No code has been written
> against this plan. Kept here so the research is not lost.
>
> Research was run against the live web on 18–19 August 2026. Prices, policies
> and legal deadlines cited below **will go stale** — re-verify anything
> decision-relevant before acting on it.
>
> **Two blocking questions for an Italian ICT lawyer before any launch:**
> Piracy Shield feed access (§9.2) and namespace/trademark exposure (§9.3).


## Context

`shrtn.link` today is a static GitHub Pages shortener: `links.json` → `build.js` pre-renders one HTML page per slug with Open Graph tags, then `location.replace()` after 250 ms, plus a `/qr` page per slug. Three live links (`rqeAG`, `webinar`, `workshop`). Single tenant, no accounts, no backend.

Gabriel wants to turn it into a multi-tenant service. His stated brief, in his own words: **not a proper standalone business** — something that "could run alone for everyone and just keep paying its own expenses (servers, APIs, legal…) with little or no effort from my side", with an optional stretch goal of supporting a manager's salary (≥ €200k gross) if the numbers ever justify it. He also wants it usable internally across HelioH2, DieciMaggio, Kopernik and Domify.

Six research lanes ran against the live web on 18–19 Aug 2026 (competitors, ad economics, EU/Italian law, abuse & domain reputation, monetisation & exit; infrastructure costed directly). This plan is the synthesis. **The research killed two of the original eleven requirements and confirmed the rest.**

---

## 1. The two numbers that decide everything

Verified Cloudflare pricing (19 Aug 2026): Workers Paid is **$5/month**, including 10M requests, 30M CPU-ms, D1 at 25 **billion** rows read/month, and KV at 10M reads/month. At any volume this product will plausibly reach, infrastructure is a rounding error.

| | Customers needed | Reality |
|---|---:|---|
| **Target 1 — pays its own expenses** (€81/yr infra + domain, +€300/yr compliance amortised) | **3–4** at €15/mo | A weekend goal. His own four companies plus two DieciMaggio clients clear it. |
| **Target 2 — €200k/yr gross profit** (≈ €222k revenue ≈ **€18.5k MRR**), of which 30–40% funds an employee | **~740–1,030** at €18–25 blended ARPU | A real micro-SaaS with a sales motion. |

**Target 1 and Target 2 are 150–400x apart.** Only Target 1 matches the brief as stated. The plan below builds Target 1 deliberately and instruments for Target 2 without betting on it.

**Run cost at launch: ~€7/month.** That is the single most important fact in this document — it means the product does not need to succeed commercially to be worth keeping.

### The ARPU mix is the whole game for Target 2

Customer count is driven almost entirely by **add-on attach rate**, not by the headline €18:

| Blended ARPU | Customers for €200k GP | What that mix looks like |
|---:|---:|---|
| €18/mo | 1,029 | base plan only, no add-ons attached |
| €25/mo | 741 | ~60% attach SVG export or a second namespace |
| €29/mo | 639 | healthy attach + some custom domains |
| €39/mo | 475 | **hospitality / multi-location** — SVG + extra namespaces + custom domain |

Hospitality QR comparables: MENU TIGER $17–119/mo, Flipdish from €49/mo, UpMenu $49–149/mo, enterprise hotel groups $200–1,500/mo **per property**. Kopernik (Nik's&Co, Zona Locanda) is a live reference customer and DieciMaggio is a warm channel into Italian SMEs. **If Target 2 is ever pursued it goes through hospitality, where the add-ons attach naturally — never through single-namespace generic customers at €18.**

Practical consequence for the build: **instrument add-on attach rate from day one.** It is the single metric that decides whether Target 2 needs 475 customers or 1,029.

### What €200k gross profit actually funds as an employee

30–40% of €200k = €60,000–80,000 of **employer cost**. In Italy that is RAL × ~1.374 (INPS ~30% + TFR 7.4%), so:

| RAL | Employer cost | % of €200k GP |
|---:|---:|---:|
| €45,000 | €61,833 | 31% |
| €55,000 | €75,574 | 38% |
| €60,000 | €82,444 | 41% |
| €80,000 | €109,926 | 55% |

So the 30–40% band funds a **RAL of ~€44–58k**, not €60–80k. A €60–80k RAL needs €206–275k of gross profit to stay inside that band. Minor, but worth fixing before it becomes a planning assumption.

---

## 2. What the research killed

**① Third-party advertising on the interstitial — dead on policy, not economics.** Google Publisher Policies prohibit Google-served ads on screens "used for alerts, navigation or other behavioral purposes" ([support.google.com/adsense/answer/10502938](https://support.google.com/adsense/answer/10502938)). That eliminates AdSense/AdX/Ad Manager and, by inheritance, Ezoic, Mediavine, Raptive and Media.net. What remains is the popunder tier whose own published high-CPM tables are labelled adult/niche traffic.

The economics are worse than the policy. To net €1,000/month: **193,000 redirects** at exe.io's best advertised Italian rate ($6.00 CPM), ~**1,449,000** at a realistic post-adblock net, **7,729,000** at the $0.15 CPM one real shortener publisher actually reported. And uBlock Origin ships targeted scriptlets that zero these countdowns outright (`adfoc.us##+js(set, count, 0)`, `exe.io##+js(nowoif)`) — the inventory is structurally undeliverable, not merely cheap. adf.ly was absorbed by Linkvertise; shorte.st's domain lapsed and now sits on ParkingCrew.

Selling delay-removal to the link owner earns **~12.5x more per redirect** than selling the attention. Gabriel's Decision C was right, and it is now evidenced.

**② The 2-character internal namespace — replaced by his own better idea.** It was never viable: base26 gives 676 codes, not the ~3,850 he assumed (that figure holds only for base62). Worse, at any alphabet the entire 2-char space is enumerable in **under one second**, which would publish a complete inventory of four companies' internal links. Georgiev & Shmatikov (Cornell Tech, 2016) scanned 100M six-character bit.ly tokens and **42% resolved to live URLs** — no realistic code length makes a slug a secret.

---

## 3. Verdict on the subfolder idea: adopt it — it is better than the original plan

Gabriel proposed: free tier gets random codes; paid customers claim a **subfolder namespace** they organise as they wish; one namespace serves his own companies. **This is the strongest idea in the thread and it should become the core of the product.** Four reasons, all evidence-backed:

1. **It substitutes for custom domains at ~5% of the engineering cost.** Custom domain is demonstrably the strongest paid trigger in this category — Bitly's price triples exactly at that boundary (Core $10 → Growth $29, the first tier with a domain). A namespace delivers most of the branding benefit with no ACME wildcard issuance, no DNS-verification UX, no per-tenant certificate renewal ops.
2. **Scarcity creates urgency.** `/eni`, `/ferrari`, `/intesa` are finite. Username psychology is a real conversion mechanic that flat-keyspace shorteners cannot manufacture.
3. **It partitions blast radius — a genuine security advantage.** Google Safe Browsing expands each URL into up to 30 host-suffix/path-prefix combinations, checking up to 6 path strings built by successively appending components from the root. That means `shrtn.link/scammer/` can be listed **as a path prefix without killing `shrtn.link/helioh2/`**. A flat keyspace offers Google no such boundary and forces escalation to the host — which is the company-ending event.
4. **It fixes the trust problem.** 21.6% of phishing uses redirect links; users are trained to fear opaque short links. A branded path segment is more clickable than five random characters.

**Five things it must be designed around:**

| Issue | Control |
|---|---|
| **Length defeats "short"** — `shrtn.link/helioh2/investor-deck` is 33 chars | Reposition: the paid product sells **recognisability, permanence and control**, not brevity. That is what the research says buyers actually pay for. Stop selling "short". |
| **Trademark squatting** (`/gucci`, `/enel`) is a legal liability under DSA Art. 16 | Three-tier control — see below. **Price is not one of them.** |
| **A2P SMS stays closed** — public shorteners face filtering approaching 100%; AT&T blocks them outright | Namespaces do not fix this; it is still the shared host. Custom domains remain the gate to the SMS segment — they *follow* namespaces, not replace them. Exclude SMS-campaign customers from the TAM. |
| **Namespace/code collision** | One flat `reserved_prefix` table. Claiming a namespace inserts a row that permanently blocks that string from being issued as a code. `qr` is reserved as a **terminal** keyword only. |
| **Enumeration of semantic paths** (`/helioh2/*` is guessable) | Hard policy: **nothing confidential behind a short code or namespace path, ever.** Public marketing links only; confidential material goes behind auth. Costs nothing to enforce. |

---

### Anti-squatting: price is friction, not a control

The "random guy from Alabama takes `/ferrari`" problem is real, but **raising the price does not solve it**:

| | Cost |
|---|---:|
| Holding `/ferrari` for a year at €18/mo | €216 |
| Holding 10 brand names for a year | €2,160 |
| Squatting a `.com` for comparison | ~€10–15/yr |
| Recovering a name via WIPO/UDRP | ~$1,500–5,000 |

€216/year deters nobody with actual intent — domain squatters pay less and have done it for 25 years. Price filters out *casual* claims only. The real controls are structural, and all three are cheap:

1. **Automatic grant requires DNS TXT proof of an exact label match.** `ferrari.com` → `/ferrari`. Someone controlling `ferrari-models.com` gets `/ferrari-models` or `/ferrarimodels` — **not** `/ferrari`. This single rule kills the Alabama scenario outright and costs nothing to run.
2. **Reserved-marks list blocks automatic grant entirely** for well-known marks, routing them to manual review. Seed it from a public well-known-marks list plus the obvious Italian/EU brands.
3. **A UDRP-style takeback clause in the ToS from day one** — the right to reclaim a namespace on a substantiated trademark complaint, with no refund obligation beyond the unused period. Every registrar has one; it costs a paragraph and it is the difference between a nuisance email and a lawsuit.

€18 is still the right price — it doubles as a quality filter and improves the Target-2 arithmetic (1,029 customers at €18 blended vs 1,544 at €12). Just don't let it carry weight it can't bear.

## 4. Product definition

**shrtn.link is a link and dynamic-QR utility with a claimed-namespace paid tier, engineered so that abuse and compliance run unattended.**

The research is unambiguous that the money is in QR, not links: per-unit dynamic-QR prices run **8–10x** per-link prices at the same vendors (Flowcode $0.50/code/mo vs Bitly $0.058/link/mo), Bitly's own €29 tier rations QR **50:1** against links (500 links vs 10 QR codes), Uniqode charges **$2,000/domain/year** where Bitly bundles one into a $348/year plan, and Bitly's first-ever acquisition after a decade as the category-defining shortener was a QR company (Egoditor, Dec 2021). Blended ARPU: **€14–22 QR-first vs €5–9 shortener-first**.

### The mutability insight (resolves the central design tension)

Spamhaus's published operator guidance tells shorteners to **prevent users changing the landing URL after creation** — it is the dominant abuse primitive (create clean → pass scan → swap to payload). But an editable destination is the entire value proposition of dynamic QR.

Resolution — **mutability is a paid, verified, audited feature, which is also exactly why people pay for it**:

- **Free tier, random code → destination IMMUTABLE.** Need a new destination? Create a new code. Kills the primitive at zero cost.
- **Paid tier, claimed namespace, domain-verified owner, card on file → MUTABLE**, with a full rescan on every edit, an edit rate limit, and an append-only audit trail.

Abuse control and monetisation align perfectly. This is the product's spine.

### Tiers

**One paid plan, plus add-ons.** No separate Business tier — a customer climbs from €18 toward ~€39 by taking what they actually need.

| | Free | **Namespace** — the only paid plan |
|---|---|---|
| Price | €0 | **€18/mo + VAT** (€180/yr) |
| Codes | 5-char random, unlimited | unlimited within the namespace |
| Destination | immutable | **editable + audited** |
| Redirect | safety interstitial | **instant (302)** |
| QR image (PNG) | **free** | free |
| Aggregate stats | — | yes (bannerless) |

| Add-on | Price |
|---|---:|
| **SVG/PDF/EPS print export + bulk generation + error-correction control** | +€5/mo |
| Additional namespace | +€8/mo each |
| Custom domain (phase 3 — opens the A2P SMS segment) | +€10/mo |
| Extended aggregate-stats retention | +€3/mo |

A customer taking SVG + one extra namespace + a custom domain lands at **€41/mo** — the €39 target reached honestly, by usage, rather than by tier-gating features people don't want.

**QR is free — and that costs less than it appears.** Bitly rations QR 50:1 against links, so giving it away is a real acquisition hook. Crucially, **a QR of a paid short link is already a dynamic QR**: the image encodes `shrtn.link/{ns}/{slug}` and paid destinations are editable, so printed material survives a destination change. The existing repo already does this correctly (*"il QR punta allo short link, non alla destinazione finale"*). Only the professional output — vector export, bulk, error-correction control — is paid.

### Vanity words — a third SKU that costs nothing to build

The word-exclusion filter has to exist anyway (§5). Rather than discarding word-shaped codes, **sell them from the root at €10/mo + VAT**.

The lengths partition cleanly, so there is no collision risk at all:

| Root namespace | Use |
|---|---|
| **5-char** | free random codes (words excluded from issuance) |
| **6-char words** | **vanity SKU at €10/mo** |
| 6-char non-words | reserve for when 5-char fills |

Verified inventory (English only, Crockford-spellable):

| Length | English words | Spellable in Crockford |
|---|---:|---:|
| 5-char | 10,239 | 2,361 |
| **6-char** | 17,713 | **2,921** |

Adding Italian, Spanish, French, German and Portuguese via the LibreOffice Hunspell dictionaries plausibly takes 6-char inventory to **~10,000–15,000**. Keyspace cost is negligible — 2,921 words is **0.0003%** of the 1.07bn 6-char space.

| Sell-through | Sold | Revenue |
|---:|---:|---:|
| 0.5% | 15 | €150/mo · €1,800/yr |
| 2% | 58 | €580/mo · €6,960/yr |
| 5% | 146 | €1,460/mo · €17,520/yr |

**Honest caveat:** sell-through is unproven and has no comparable in the research. A vanity code derives value from the namespace being well-known, and on day one `shrtn.link/GRANDE` is worth little. Model 0.5%, not 5%. It is worth building only because the marginal cost is a price column on rows the exclusion filter already produces — even the pessimistic case covers the run cost ~20x over. The 2,361 five-char words must be excluded from random issuance regardless; hold them back as a premium pool and price them later.

Deliberately excluded: per-visitor analytics (would force a consent banner), team seats, link-in-bio, A/B testing, deep API. "No fancy services" is held as a real constraint.

**Pay-per-use is dropped.** Stripe Italy charges 1.5% + €0.25 on standard EEA cards, so a €0.50 ticket costs **51.5% in fees**; €1 costs 26.5%. Micro-payments are arithmetically dead. If wanted later, prepaid credit packs at €10/25/50 are the only viable shape.

**Free-tier interstitial: 3 seconds, honest countdown, "Continue" always available.** Not 2–7s. It shows the full destination URL, an HTTPS badge, the namespace owner, and a report control. Design it so an adblocker skipping the timer still lands the user correctly — that makes it bypass-proof **by construction** rather than starting an arms race the filter lists have already won. And per Spamhaus: a link that **fails** a scan returns `410 Gone`, never a warning page. The interstitial is disclosure, never mitigation.

---

## 5. Architecture

Primary stack: **Cloudflare Workers + D1 + KV**. Runner-up: Fly.io + Postgres (switch only if EU-only data residency becomes a contractual requirement).

```
                    ┌──────────────────────────────────────────┐
   GET /{code}      │  Cloudflare edge (free plan: WAF, DDoS,  │
   GET /{ns}/{slug} │  Bot Fight, 1 rate-limit rule)           │
   GET /…/qr        └────────────────┬─────────────────────────┘
                                     ▼
                            ┌─────────────────┐
                            │  Worker         │  ~1-3 ms
                            │  route + decide │
                            └───┬─────────┬───┘
                       KV hit   │         │  KV miss
                       (~5 ms)  │         ▼
                                │   ┌──────────────┐
                                │   │ D1 (source   │  strongly consistent
                                │   │ of truth)    │  → populate KV, never
                                │   └──────┬───────┘    negative-cache
                                ▼          ▼
                    ┌───────────────────────────────┐
                    │ paid  → 302 instant           │
                    │ free  → interstitial (3s)     │
                    │ flagged → 410 Gone            │
                    │ crawler → OG tags, no delay   │
                    └───────────────────────────────┘

   Cron (unattended):  URLhaus dumps /5min · Web Risk computeDiff mirror
                       · AGCOM Piracy Shield blocklist · rolling rescan
```

**KV eventual consistency is a correctness bug, not a perf detail.** Cloudflare documents writes taking "**up to 60 seconds or more**" to become visible in other locations. A user who creates a link and immediately tests it would get a 404. Therefore: **D1 is the source of truth; KV is a read-through cache; 404s are never negatively cached.** New links resolve correctly everywhere from the first millisecond.

### Short codes

**Alphabet: base32 Crockford** (excludes I, L, O, U — ambiguity-safe by construction), case-insensitive, randomly generated.

Chosen because the monetisable use cases are print, table cards, packaging, QR and voice dictation — exactly where `l/I/1` and `O/0` confusion and case-sensitivity cost real money. Case-sensitive base62 buys keyspace nobody needs at the price of transcription errors in the one channel that pays.

| Length | Space | Use |
|---|---:|---|
| 5-char | 33,554,432 | free-tier random codes |
| 6-char | 1,073,741,824 | reserve when 5-char passes 10% fill |

#### Generation: counter + Feistel permutation

Random-with-retry degrades as the space fills (1M codes into 33.5M already means a ~3% retry rate per issue, and it needs a database round-trip per attempt). Instead: keep a plain sequential counter, then push it through a **reversible pseudorandom permutation** before encoding. The output looks random; collisions are *impossible* rather than merely unlikely, because a permutation is a bijection.

`32^5 = 2^25` exactly. 25 bits is odd, so run a balanced 13+13 Feistel over `2^26` and **cycle-walk** — if the result lands outside `2^25`, encrypt again (expected 2 passes).

```js
const A = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';   // Crockford: no I, L, O, U
const KEY = 0x5f3a9c;                           // secret, fixed forever, never rotate

function prf(x, round) {                        // any cheap mixing function
  let h = (x ^ (KEY + round * 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
function feistel26(v) {                         // bijection on [0, 2^26)
  let L = (v >>> 13) & 0x1FFF, R = v & 0x1FFF;
  for (let r = 0; r < 4; r++) { const nL = R; R = L ^ (prf(R, r) & 0x1FFF); L = nL; }
  return ((L << 13) | R) >>> 0;
}
const N = 2 ** 25;
function permute(counter) {                     // bijection on [0, 2^25)
  let v = counter; do { v = feistel26(v); } while (v >= N); return v;
}
function encode(n) { let s = ''; for (let i = 0; i < 5; i++) { s = A[n % 32] + s; n = Math.floor(n / 32); } return s; }
```

Verified output — sequential counters, scattered codes:

| counter | permuted index | code |
|---:|---:|---|
| 0 | 8,974,838 | `8HWFP` |
| 1 | 122,213 | `03QB5` |
| 2 | 4,555,008 | `4B080` |
| 3 | 7,362,644 | `70P2M` |
| 1,000,000 | 20,326,401 | `KCA01` |

300,000 sequential counters produced 300,000 distinct codes and **0 collisions**. The counter is the only state you store; `KEY` must never change once codes are issued (changing it re-maps every future code — harmless — but you must never re-issue an old counter value).

#### Excluding real words

Two separate concerns, and the Crockford alphabet already solves most of the first for free: dropping **I, L, O, U** removes three of the five vowels, so only **2,361 of 10,239** five-letter English words can even be spelled — **0.007% of the keyspace**. Excluding words is therefore essentially free.

| Need | Source | Licence |
|---|---|---|
| Multilingual profanity (~28 languages) | [LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words) — 3.4k★ | **CC-BY-4.0** |
| English wordlist (479k) | [dwyl/english-words](https://github.com/dwyl/english-words) — 12.2k★ | **The Unlicense** (public domain) |
| Per-language Latin-script dictionaries (IT, ES, FR, DE, PT…) | [LibreOffice/dictionaries](https://github.com/LibreOffice/dictionaries) — Hunspell `.dic` files, actively maintained | per-dictionary (mostly LGPL/MPL/GPL) — **check each before bundling** |
| Local quick start | `/usr/share/dict/words` on macOS (235,976 entries) | public domain |

**Turn the constraint into revenue:** don't merely discard word-like codes — move them into a **reserved vanity pool** and sell them. A code that reads `GRAND` or `BAKER` is exactly what someone would pay for, so it should never be handed out free at random. Build the exclusion filter as a pre-computed set of blocked counter-indices, checked at issue time.

**Anti-enumeration is rate limiting, not code length** — Cornell Tech proved 6 chars is brute-forceable. Strict per-IP rate limiting on 404s, Turnstile-gated retry after threshold, and never reuse a burned code.

### Clean start — no migration

Decided: the three existing links (`rqeAG`, `webinar`, `workshop`) are **not** preserved. This removes a whole class of work and bugs — notably `rqeAG`, which is mixed-case and would have needed case-sensitive grandfathering forever against a case-insensitive alphabet. Saves ~2 days and one permanent special case.

Two consequences to accept deliberately:
- Any printed material or QR code pointing at those three slugs dies. Confirm none is in circulation before launch.
- Decide whether the current GitHub Pages deployment is switched off at cutover or left serving until the new system is live. Leaving both live on the same host is the only genuinely bad option — pick one.

---

## 6. Security & compliance — the part that actually threatens the brief

**"Little or no effort from my side" fails here, not in the code.** Everything below must run unattended or the product becomes a second job.

### The existential risk

**How a blocklisting actually stops you — the mechanism is not what it looks like.** Google never touches your server. Your Worker keeps returning `302` correctly, forever. What changes is that **the browser refuses to follow it.**

Safe Browsing ships as a hash list *inside the browser*. Chrome checks every URL against that local list **before the request is ever made**. If `shrtn.link/` is listed at host level, the user gets a full-page red interstitial — "Deceptive site ahead" — with the real destination buried behind a small "Details → visit anyway". Firefox and Safari consume the same Google list; Edge uses Microsoft SmartScreen, which is a *separate* listing with the same effect. Gmail, Outlook, WhatsApp, Slack and Discord additionally strip or warn on the link, corporate secure web gateways block it, and Google Search delists you.

So the failure mode is not downtime. It is **every browser on earth simultaneously placing a red warning page in front of every link you have ever issued** — including the printed QR codes, which is the part you cannot fix. For a product whose only function is links, that is terminal.

Recovery is slow and has a trap: reviews take days to weeks, and **repeated rejected review requests trigger "Repeat Offender" status for 30 days, during which no further review can be requested.** A botched appeal locks you out for a month. SmartScreen is worse — no published appeal SLA, and its own stated risk signals ("newly registered or low-traffic domains, redirects…") describe shrtn.link exactly.

**This is why the namespace design matters beyond marketing.** Safe Browsing checks up to 6 path prefixes built by appending components from the root, so it *can* list `shrtn.link/scammer/` and leave `shrtn.link/helioh2/` alive. Concentrating abuse into attributable, individually-killable paths gives Google a surgical target so it never needs to escalate to the host. A flat keyspace offers no such boundary.

**Do not migrate domains.** `.link` is absent from the top-100 most-abused zones (NetAPI, 18 Aug 2026) and from Interisle/Spamhaus worst-offender lists; Nova Registry markets `.link` explicitly for shortened links with **Bitly and Dub as named partners**. The risk is behaviour-driven, not TLD-driven. Spend the migration budget on controls. (Do read the registry AUP — registry suspension is a third kill switch.)

### Day-one control stack — ~€0–20/month in cash

| Control | Cost | Why |
|---|---|---|
| **Google Web Risk** — `uris.search` at creation | €0 (100k/mo free, then $0.50/1k) | **Never Safe Browsing**: v4/v5 is contractually non-commercial-only. Using it would breach terms with the exact party controlling the listing that can kill the domain. |
| Web Risk `threatLists.computeDiff` local mirror | €0 (free, unlimited) | Click-path checks. Avoid `hashes.search` — $50/1k, a 100x cliff. |
| URLhaus dumps every 5 min | €0 | Malware feed, no per-lookup cost. |
| **Rolling rescan of all active destinations** | €0 | **Mandatory, not deferrable.** Defeats create-clean-then-weaponise, the dominant evasion. |
| Cloudflare Turnstile | €0 (unlimited challenges) | Signup + link creation. |
| Disposable-email blocking | €0–20/mo | Cheapest real identity signal. |
| https-only + immutable free destinations | €0 | Design-level. |
| abuse@ intake + DSA Art. 16 form | €0 | Legal obligation and sales asset. |

### Abuse memory — the destination denylist

Gabriel's instinct is right and it is the control most small shorteners skip: **remember the scammer so they cannot simply create a fresh free URL.** Design:

- **Normalise before matching.** Lowercase host, strip `www.`, resolve to the registrable domain (eTLD+1) via the Public Suffix List, keep the path separately.
- **Three match granularities:** exact URL · registrable domain · path prefix.
- **The shared-host trap — this is the one that bites.** If a scammer uses `sites.google.com/view/…`, `notion.so/…` or a Firebase storage bucket, banning the registrable domain would kill legitimate customers. Maintain a shared-host list; for those hosts ban the **path prefix only**, never the domain.
- **Auto-populate on takedown:** disabling a link queues its eTLD+1 for the denylist, with a review gate whenever the host is on the shared-host list.
- **Ban the account, not just the destination.** The same actor returning with a new destination is the common case — this is what actually stops re-registration, backed by disposable-email blocking, Turnstile, and card-on-file for any reinstatement.
- **Never reuse a burned code.**

One correction to the mechanic: **do not park abusive links under a live `/scammer/` path.** Per Spamhaus's operator guidance, an abusive URL must be fully suspended — the original code returns `410 Gone`, permanently. The denylist is *memory*, not a parking lot; a relocated link that still redirects has been relabelled, not stopped.

### The three scanners — keep them separate

Gabriel asked for a batch scanner that checks whether links are still valid. There are **three** distinct jobs here and conflating them is the single easiest way to destroy customer trust:

| Job | Question | Source | On hit |
|---|---|---|---|
| **Abuse rescan** | is the destination malicious *now*? | Web Risk `computeDiff` mirror + URLhaus | disable → `410` |
| **Legal blocklist** | is it AGCOM-blocked? | Piracy Shield feed | disable **within 30 min** (legal duty) |
| **Liveness** | does it still respond? | `HEAD` → `GET` fallback | **notify the owner — never disable** |

**Rule: link rot must never auto-disable a link.** If Kopernik's menu server is down for an hour, the printed table cards must keep working. Printed-QR permanence is the entire paid value proposition; an over-eager health check would destroy it.

`check-links.js` already implements the liveness logic correctly — including classifying `401/403/405/429/999` as *inconclusive* (anti-bot) rather than broken. Carry it over close to as-is; it is the most reusable file in the repo.

**Scale and cost (verified 19 Aug 2026):** Cron Triggers 250/account on Workers Paid; scheduled invocations get 30 s CPU (<1 h interval) or 15 min (≥1 h); **10,000 subrequests per invocation**; Queues include **1M operations/month**, then $0.40/M, at ~3 ops per message ⇒ **~333k checks/month free ≈ 77,000 links checked weekly at zero cost.** Pattern: hourly cron → enqueue → consumer fans out `HEAD` checks, prioritised by traffic (hot links often, dormant links rarely), with per-destination-host rate limiting so a customer's own server never gets hammered.

**Verification ladder — email + Turnstile + disposable-domain blocking for everyone.** Not phone, not ID. Phone OTP in Italy costs ~$0.143/verification (Twilio Verify $0.05 + $0.0927/segment) — ~20x email validation — with documented SMS failure modes. Stripe Identity at €1.25 with a biometric selfie is **Art. 9 special-category data** and indefensible as proportionate for gating a redirect. Card-on-file for paid tiers is a *stronger* signal than an OTP because it is chargeback-backed. Phone/ID only as risk-triggered escalation or voluntary reinstatement after suspension.

### Italian obligations most founders miss

- **Piracy Shield (legge 93/2023 art. 2) — the single largest jurisdiction-specific risk.** Binds "prestatori di servizi della società dell'informazione coinvolti a qualunque titolo nell'accessibilità" to execute AGCOM blocking orders **within 30 minutes**. A shortener resolving to a blocklisted FQDN is squarely within that wording; AGCOM has sanctioned Cloudflare on this basis. For a solo founder this is a 24/7 on-call duty unless automated. **Build automated blocklist ingestion that kills matching destinations unattended.** This is also precisely what converts a diligence red flag into a green one.
- **AGCOM contribution declaration, due 31 March annually.** File it even at €0 (exempt below ~€50k Italian revenue) — the declarative obligation is separate from payment, and the sanction band has been cited at €516–€103,291.
- **GDPR Art. 30 ROPA from the first production click.** The <250-employee derogation does **not** apply: it falls away where processing "is not occasional", and a shortener logs continuously.
- **DSA Arts. 11, 12, 14, 16, 17 bind regardless of size** (Art. 15 transparency reporting and all of Section 3 are exempt for micro-enterprises under Arts. 15(2) and 19). Five artefacts, ~1 day of work: published authority contact, user contact channel, terms with an enumerated prohibited-destinations list, notice-and-action form, statement-of-reasons template.

### The bannerless advantage — market it

No cookies, no localStorage, no fingerprinting, no third-party tags ⇒ the interstitial falls inside the art. 122 Codice Privacy "strictly necessary" exemption ⇒ **no consent banner**. Click counting stays bannerless if kept server-side, IP-truncated (last IPv4 octet) and aggregate-only, per the Garante's 2021 analytics carve-out (provv. 231/2021 §7.2). This is a real wedge against Bitly. It also means per-visitor analytics must never ship on the same tier — it would force a banner and destroy the claim.

### Payments

**Stripe, Italian VAT only, at launch.** At 3–20 customers, cross-border B2C stays under the EU-wide €10,000/year threshold, so OSS is not triggered and a merchant-of-record's ~2.6pp premium buys nothing. Revisit Paddle (5% + $0.50, VAT handled) only on crossing €10k cross-border B2C.

---

## 7. Build plan — lean solo, ~6–7 weeks part-time

Given the brief, **Level 1 is the right budget**: near-zero cash, self-templated legal, ship and observe. Levels 2–3 (contractor + €2,500–6,000 legal review; team + full compliance posture) are only justified if Target 2 is ever seriously pursued — do not pre-spend against a 1,900-customer outcome.

| Phase | Scope | Effort |
|---|---|---|
| **1 — Core redirect** | Workers + D1 + KV read-through; base32 Crockford + Feistel codes; 302 redirect; OG tags for crawlers; 410 for flagged | 1 w |
| **2 — Safety & abuse** | Web Risk at creation, computeDiff mirror, URLhaus cron, rate limits, Turnstile, `410` path, abuse@ intake; **destination denylist** (PSL normalisation + shared-host path rule); **three scanners** on Cron + Queues, reusing `check-links.js` for liveness | 1.5 w |
| **3 — Accounts & namespaces** | Email auth + disposable blocking; namespace claim with **DNS TXT exact-label proof**; reserved-marks list + UDRP-style ToS clause; reserved-prefix table; immutable free / audited-mutable paid | 1 w |
| **4 — QR & interstitial** | Free PNG for all; **paid SVG/PDF/EPS + bulk + error-correction**; 3s disclosure interstitial; instant path for paid | 4 d |
| **5 — Billing & legal** | Stripe subscription + **add-on line items** (attach-rate instrumented); withdrawal-waiver checkbox + confirmation email; ToS with prohibited-destinations list; privacy notice; ROPA + LIA; DSA artefacts; **Piracy Shield automation**; AGCOM diary entry | 1 w |
| **6 — Vanity pool** | Multi-language word extraction (LibreOffice Hunspell + LDNOOBW); exclude from random issuance; 6-char words listed for sale at €10/mo; 5-char words held back as premium reserve | 3 d |

Reuse from the existing repo: `validate-links.js` (slug rules, reserved words, loop prevention), `import-csv.js` (bulk create for internal namespaces), `check-links.js` (health checks → becomes the rescan job), `assets/qr.js` + `qrcode.min.js` (self-hosted QR, already correct).

---

## 8. Verification

1. **KV consistency:** create a link, immediately `curl` it from three regions (`--resolve` against different Cloudflare PoPs). Must be 302, never 404 — this is the bug the read-through design exists to prevent.
3. **Abuse:** submit a known URLhaus entry as a destination → creation rejected. Create a clean link, add its destination to a local test feed, run the rescan job → link returns `410`.
3b. **Denylist:** disable a link for abuse, then try to create a new link to the same destination from a *different* account → rejected. Repeat with a shared-host destination (`sites.google.com/view/x`) → only that path prefix is blocked, a second `sites.google.com/view/y` still works.
3c. **Liveness never disables:** point a link at a server, take the server down, run the liveness job → link still returns 302 and the owner is notified. This is the regression that would break printed QR codes.
4. **SSRF:** attempt destinations `http://169.254.169.254/`, `http://127.0.0.1/`, `http://10.0.0.1/` and a DNS-rebinding host → all rejected at validation.
5. **Enumeration:** hammer 500 random non-existent codes from one IP → rate limit engages, Turnstile challenge served.
6. **Bannerless claim:** load the interstitial with devtools open → zero cookies, zero localStorage writes, zero third-party requests.
7. **Namespace:** claim `/helioh2` without the DNS TXT record → refused; add the record → granted. Confirm `helioh2` can never be issued as a random code.
7b. **Squatting:** prove control of `ferrari-models.com` → `/ferrari-models` granted, **`/ferrari` refused** (label is not an exact match). Confirm a reserved-marks entry routes to manual review rather than auto-granting.
7c. **Vanity partition:** confirm no 5-char random code is ever a dictionary word, and that 6-char listed words are unreachable by random issuance.
8. **Crawler:** `curl -A "facebookexternalhit/1.1"` → OG tags, no interstitial, no delay.

---

## 9. Critical assessment — where this plan is weak

Asked directly whether the plan is solid legally and managerially. The research base and the architecture are sound. Three things are not, and one of them is structural.

### 9.1 The structural flaw: a public free tier is incompatible with "no effort"

This is the most important paragraph in the document. The brief asks for three things:

> (a) runs alone for everyone · (b) free tier · (c) secure and reliable

**You can have any two.** The free tier is the entire source of abuse risk and produces approximately zero revenue. Everything expensive in §6 — Web Risk, rescans, the denylist, Safe Browsing reputation defence, Piracy Shield exposure, the DSA notice-and-action desk — exists *because of it*. Automation covers the routine cases, but three things remain irreducibly human and time-critical:

- **DSA Art. 16** contested takedowns need a human decision plus an Art. 17 statement of reasons.
- **Safe Browsing appeals** are manual, and a botched one triggers the **30-day Repeat Offender lockout**.
- **Piracy Shield** is a 30-minute clock (see 9.2) — that is 24/7 human availability unless fully automatable.

A phishing incident at 02:00 on a Sunday is a normal event for a public free shortener, not an edge case.

**Recommendation — the single highest-leverage change available: drop the anonymous public free tier.** Make free access conditional on the same **DNS TXT domain proof** already built for namespaces. Anyone who controls a domain gets free 5-char links; nobody else signs up.

| | Public free tier | Free-for-verified-domain-owners |
|---|---|---|
| Abuse surface | full | ~95% smaller — attackers must burn a domain per account |
| Safe Browsing risk | existential | marginal |
| Piracy Shield exposure | real | negligible (verified businesses don't link to pirate streams) |
| Growth | high | low |
| Ops load | 24/7 | near zero |

The only thing it costs is growth — which the brief explicitly does not want. **This change is what actually delivers "runs alone with little or no effort."** Everything else in this plan is optimisation; this is the decision.

### 9.2 Piracy Shield is flagged but NOT solved — verify before launch

§6 says "automate blocklist ingestion". That may not be implementable: **the AGCOM Piracy Shield blocklist is not a public feed.** Access runs through the platform for accredited parties (ISPs, VPN and DNS providers). A micro Srl may not qualify for access at all.

That produces the worst possible compliance shape: **bound by a 30-minute obligation, with no ability to see the list you must act on.** Legge 93/2023 art. 2 reaches "prestatori di servizi della società dell'informazione coinvolti a qualunque titolo nell'accessibilità", and AGCOM has already sanctioned Cloudflare under this regime.

**This is a blocking question for Italian counsel, not a build task.** Three possible answers, in order of preference: (i) shorteners are out of scope in practice — get it in writing; (ii) accreditation is obtainable — apply before launch; (iii) neither — then the honest options are to operate the entity outside Italy, or to accept a known unmitigated legal exposure. Do not launch a public free tier before this is answered.

### 9.3 Selling namespaces makes you a naming registry, with none of a registry's protections

`/{brand}` sales are structurally closer to domain registration than to SaaS. Registrars operate under UDRP, an established dispute regime with predictable outcomes. You would have only your own ToS. **Trademark liability has no equivalent of the DSA hosting safe harbour** — the Art. 6 protection covers illegal content, not your own act of allocating a confusingly similar name to a paying customer.

The DNS exact-label rule (§3) is a strong mitigation and should hold in most cases, but it is not a defence to a claim — `ferrari-models.com` legitimately obtaining `/ferrari-models` could still draw a letter. Mitigations, all cheap: a genuine reserved-marks list seeded before launch, a written takeback clause with no refund obligation beyond the unused period, and a decision — taken now — that you will always yield to a substantiated complaint rather than litigate. Have counsel review the namespace ToS specifically; it is a different document from the general terms.

### 9.4 Smaller managerial gaps, stated honestly

- **DSA hosting classification is my estimate, not settled law.** Mere-conduit vs hosting has not been tested for shorteners. It changes which obligations bind. Counsel question.
- **Bus factor of one.** The 30-minute clock and the abuse queue have no backup if you are unavailable. For a service people print QR codes from, that is a real operational risk with no cheap fix.
- **No wind-down clause = a personal indefinite commitment.** Links live forever. Put a 12-month-notice termination right in the ToS *from day one*, or you have signed up to run this for as long as the links exist.
- **Target 2 has no go-to-market.** "Revisit at 100 customers" is honest, but there is no described path to 100 customers. Treat €200k as an aspiration, not a plan.
- **6–7 weeks part-time is optimistic** across four other companies. Plan for 3–4 months elapsed.

### 9.5 Verdict

**Legally:** sound on GDPR/ePrivacy/consumer/VAT, which is most of the surface. Two genuine open risks — Piracy Shield feed access (9.2) and namespace/trademark exposure (9.3) — both requiring an Italian ICT lawyer, not more research. Budget €2,500–6,000 and one meeting.

**Managerially:** the plan delivers a technically excellent product that does not match the brief, *unless* §9.1 is adopted. With verified-only access it genuinely runs itself on ~€7/month. With an anonymous public free tier it is a small unpaid job with an unbounded tail. That is the decision to take before any code is written.

## 10. Open decisions for Gabriel

1. **Vanity-word sell-through is the one unproven number in the plan.** Everything else is sourced or arithmetic. Build the SKU (it is a price column on rows the exclusion filter already produces), but keep it out of any forecast until real data exists.
2. **Target 2 (€200k gross profit)** — ~740–1,030 customers at realistic blended ARPU, dropping to ~475 if add-ons attach at hospitality-like rates. Don't let it shape the build now; revisit at ~100 paying customers and pick the segment then.
3. **Name — you CAN use "shrtn". The issue is only that you probably cannot *protect* it.** Three separate things get conflated here:
   - **Using it as a brand/domain:** entirely fine. Nobody can stop you. Keep `shrtn.link`.
   - **Registering it as an EU trade mark:** likely refused. "Shrtn" is aurally identical to "shorten", which is directly descriptive of the service — Art. 7(1)(b)/(c) EUTMR routinely refuses deliberate misspellings that sound like a descriptive term. It's like trying to trademark "Bred" for a bakery. Consequence: **no exclusivity** — you cannot stop `shrtn.app`, `shrtn.io` or `shrtn.cc` (all already live), and there is no trademark asset in a future sale package.
   - **Company name (*denominazione sociale*):** a different register with far weaker requirements. "Shrtn Srl" is fine as long as it isn't confusingly similar to an existing Italian company in the same sector.
   
   Net: use it freely, don't spend €850 on an EUTM application, and if you ever want a defensible mark, register a distinctive house name and keep `shrtn.link` as the redirect domain underneath it.
4. **Entity — deferring the NewCo is fine, with one clock to know about.** PEX (art. 87 TUIR) needs the participation held from the first day of the twelfth month before sale *and* classified among *immobilizzazioni finanziarie* in the first financial statement closed during that period. So deferring doesn't lose the option — it costs ~12 months of clock before an exit could use it. The expensive path is the other one: building revenue inside an existing Srl and carving it out later. If a NewCo ever happens, do it before there's meaningful revenue to move.
