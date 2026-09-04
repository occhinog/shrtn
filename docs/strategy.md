# Shrtn Product Strategy

> **Status:** working product strategy — 4 September 2026
>
> This supersedes the product direction in `docs/saas-plan.md`. That document
> remains historical research for the original static-shortener concept.

## The product

**Shorten your links. That's all, folks.**

Shrtn is a deliberately simple redirection service. It does not sell an
analytics suite, a marketing dashboard, or audience profiling. It sells three
increasingly valuable things:

| Level | What the customer buys |
| --- | --- |
| Free | The redirect |
| Control | Properties of that redirect |
| Brand | Identity within the URL |

`shrtn.link` is the readable public domain. `shr.mp` is the compact paid
domain.

## Product rules

### Free

- Random, six-character Base32 `shrtn.link` links.
- HTTPS public destinations only.
- Destination is fixed after creation.
- Standard black-and-white QR in PNG and SVG.
- Three-second Shrtn transition page.
- Five new links in any rolling 60-minute period; the interface shows the
  remaining allowance and next available time.
- User may delete a link. It deactivates immediately, enters a 60-day
  quarantine, then may be reused.
- One-time **Unlock editing** purchase may make an individual link editable
  without a subscription.

### Control

Everything in Free, plus:

- Unlimited Controlled Links while active, with an invisible emergency
  throttle for automation or abuse.
- Instant redirect.
- Edit destination, pause/reactivate, and retire/reserve a code.
- Random `shrtn.link` codes only; custom URL identity is not a Control feature.
- When Control is cancelled, published links remain active but become frozen.

### Compact add-on

Compact is an optional Control add-on.

- Creates the deterministic `shr.mp/{code}` alias of an eligible controlled
  `shrtn.link/{code}` link.
- The two routes are one link record with one destination; the compact route
  is the default copy and newly generated QR target.
- The add-on applies to links created while Compact is active and links created
  during the preceding rolling 72 hours. It never backfills older links.
- Created compact aliases remain active after cancellation; newly created
  links do not receive one without an active add-on.
- Deleting the canonical link deletes all of its active routes together.

### Brand

One Brand subscription equals one paired brand identity. More brands require
more subscriptions.

Everything in Control and Compact, plus:

- Ordinary unbranded controlled links on both `shrtn.link` and `shr.mp`.
- One readable and one compact branded identity, for example
  `helioh2.shrtn.link/deck` and `hlh2.shr.mp/dck`.
- Custom branded subdomains and paths.
- Custom public destination name on the transition page.
- Branded QR colours, logo and graphics.
- Optional Brand Index at both brand roots; otherwise both roots redirect to
  the verified official website.
- Instant redirection by default. Per-link optional three-second branded
  transition using a single shared brand image.

Brand requests are manually approved at launch. The applicant's card is
authorised before review and captured only after approval. Rejection cancels
the authorisation and includes a written reason. Review target: three working
days.

## Experience rules

- Every creator signs in with Google, Apple or Microsoft. No phone
  verification.
- The public homepage can show an inactive changing example after `shrtn it`;
  no anonymous link is stored or reserved. Account creation activates the real
  link.
- The creator sees no click analytics at any tier. Shrtn keeps minimal internal
  data for reliability, abuse prevention and future sponsorship evaluation.
- The transition page shows the cached destination page title, with hostname
  fallback. Brand can override the public name after verification.
- No clickable advertising or third-party ad platform exists on the transition
  page.
- Paused, deleted, reserved-without-destination and nonexistent links display
  a neutral unavailable page, then return to the previous page after five
  seconds; Shrtn homepage is the fallback.

## Sponsorship: later, separate business

The launch product has no external sponsors. Future sponsorship is direct,
not programmatic:

- Only Free transition pages may carry it.
- Shrtn assigns sponsors; creators cannot choose, remove or change them.
- The sponsor is a non-clickable background with clear attribution.
- A sponsored transition lasts five seconds; a Shrtn-only Free transition
  lasts three.
- Sponsorship billing, allocation and reporting remain separate decisions.

## Open decisions

- Actual prices, annual billing and VAT presentation.
- PAYG pack/payment mechanics and its eventual sponsorship treatment.
- Sponsorship pricing unit, targeting, reporting and content policy.
- Brand-name suggestion, edit and proof rules beyond launch-time manual review.
- Exact QR customisation editor and future per-link Brand images.
- Reliability-check implementation and health-deactivation handling.
