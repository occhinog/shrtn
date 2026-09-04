# Shrtn — Technical Product Brief for Davide and Matteo

## What we are building

Shrtn is moving from the current static `links.json` prototype to an
authenticated multi-tenant redirection service on the VPS. The product is not
an analytics suite. It must make creating, owning, editing and branding a link
safe and straightforward.

The product model is:

| Tier | Promise |
| --- | --- |
| Free | The redirect |
| Control | Properties of the redirect |
| Brand | Identity within the URL |

## Core concepts

### Link

One canonical link record has:

- Owner account.
- Tier/entitlements at creation.
- Six-character Base32 code for unbranded links.
- HTTPS destination URL, normalised and preserved exactly after validation.
- Cached destination page title.
- Lifecycle state: active, paused, retired/reserved, deleted/quarantined.
- Creation and audit metadata.

The database—not the route—is the source of truth. A public route resolves to
one canonical link record.

### Routes

- Free and standard Control: `shrtn.link/{code}`.
- Compact Control: deterministic alias `shr.mp/{code}`.
- Brand: readable and compact branded routes, for example:
  - `helioh2.shrtn.link/deck`
  - `hlh2.shr.mp/dck`

`shr.mp` must never issue an independent random code. It mirrors a canonical
`shrtn.link` code. Deleting a canonical link removes every active route tied to
it.

### Account and entitlement

- Sign-in: Google, Apple or Microsoft.
- Free: five creations per rolling 60 minutes per account, with abuse controls.
- Control and Brand: unlimited in normal use; backend emergency throttle only.
- No customer-facing analytics at any tier.

## Main flows

### Home / create

1. Anonymous visitor enters a URL and presses `shrtn it`.
2. UI shows a changing inactive example; do not store or reserve it.
3. User signs in.
4. Preserve the submitted URL through OAuth return.
5. Create the real link, cache its title, show copy action and standard QR.

Validation: accept public HTTPS only. Bare domains may be normalised to HTTPS;
HTTP may be accepted only if its final safe destination is HTTPS. Reject
private, localhost, metadata and non-web destinations.

### Redirect

| Link state/tier | Visitor behaviour |
| --- | --- |
| Free | Three-second Shrtn transition, then destination |
| Future sponsored Free | Five-second sponsor-background transition, then destination |
| Control | Immediate redirect |
| Brand | Immediate by default; optional three-second branded transition |
| Paused | Neutral unavailable page, return back after five seconds |
| Deleted/reserved/nonexistent | Same neutral unavailable page, return back after five seconds |

The transition page contains no interactive advertising. It shows cached title;
hostname is fallback. Only Brand may set a public display name.

### Dashboard

Minimum link actions:

- Copy.
- View/download QR PNG or SVG.
- Delete (shows every active route affected).
- Free: **Unlock editing** one-time purchase.
- Control: edit, pause/reactivate, retire/reserve.
- Control: **Add Compact** account-level upgrade.

Duplicate URLs within an account should offer **Copy existing** or **Create
another link anyway**.

## Compact rules

- Compact is a Control add-on and included in Brand.
- A link gets its compact alias when created while Compact is active, or when
  it is within the prior rolling 72 hours at activation.
- No backfill outside 72 hours.
- Once created, compact aliases remain after Compact cancellation.
- New links created without Compact do not get compact aliases.
- Brand accounts can always create ordinary unbranded links on both domains.

## Brand rules

- One paid Brand = one paired readable/compact identity.
- Brand onboarding is manual initially: payment authorisation, domain/identity
  review, approve/capture or deny/cancel.
- Target review: three working days.
- Brand can configure one shared transition image; it can enable that
  three-second transition per branded link.
- Brand root defaults to the verified official website and may instead serve a
  small Brand Index page.

## Security and operational non-negotiables

- Free destinations are immutable. Every paid edit must re-run destination
  validation and abuse screening, and produce an audit record.
- Never expose internal click analytics to customers.
- Use a generic public unavailable page so code existence/reservation is not
  disclosed.
- Free deletion: immediate deactivation plus 60-day code quarantine.
- Paid account deletion: 30-day reactivation window, then 60-day quarantine.
- Admin actions must be logged: operator, timestamp, decision, reason and
  payment result.
- Brand approval UI needs approve/deny confirmation because those actions
  capture or release a payment authorisation.

## Explicitly not in the launch scope

- Third-party/programmatic advertising.
- Customer-facing analytics.
- Custom URL paths for Control.
- Per-link Brand transition images.
- Automatic self-service Brand approval.
- Phone-number verification.

## Technical decisions still to make

- Framework, database, queue/cache and deployment shape on the VPS.
- OAuth provider integration and session model.
- Payment provider integration for subscriptions, PAYG and card authorisation.
- URL-abuse and destination-health providers/workflow.
- Brand identity verification evidence and moderation process.
- Sponsor allocation, reporting and billing only after launch inventory exists.
