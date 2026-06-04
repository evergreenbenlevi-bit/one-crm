# PowerDoc — Escape-Hatch & Billing-Autonomy Decision Record

> Owner: Claude (autonomous). Source: POWERDOC-AUTONOMY-HANDOFF (2026-06-04).
> Purpose: define exactly WHEN to keep paying PowerDoc vs. switch signing providers,
> so the "ran out of credits" block never recurs as a surprise.

## Current architecture (locked)
- EOT one-time send (`POST /api/v1/submission/onetime/send`) — self-generated PDF + hardcoded
  signature coords. No PowerDoc templates, no manual UI. Code: `src/lib/powerdoc.ts`.
- Signing URL stored in `proposals.docuseal_document_url`; `/sign/[id]` redirects to it.
- Quota guard: `PowerDocQuotaExhaustedError` (4097002) → route returns **402** + Telegram alert
  to Ben (`notifyContractQuotaExhausted`). A real client never fails silently on empty credits.

## Why we stay on PowerDoc (do NOT switch on billing alone)
- PowerDoc is an **Israeli המשרד-להגנת-הצרכן / ISO-27001-aligned** e-sign service → contracts
  carry valid legal weight under Israeli law. DocuSeal self-hosted does NOT give that out of the box.
- The build is 100% done and verified. Switching = re-solving legal validity + re-building, for zero
  billing gain.
- **Billing exhaustion is NOT a switch trigger.** It is solved by §"Billing autonomy" below.

## Billing autonomy (how the block stops recurring)
Three-layer model — remove the *recurring* dependency on Ben, not Ben himself:
1. **Ben pre-funds once** (subscription, decision tree below). Money = Ben-only by rule.
2. **Subscription auto-renews** — Ben's saved payment method renews; Claude never touches money.
3. **Claude guards the edge** — 402 + Telegram alert on 4097002 means the *first* blocked send
   pings Ben immediately (mid-month allotment overrun or lapsed card), instead of failing dark.

### Decision tree (VERIFIED live, powerdoc.co.il/prices, 2026-06-04 — prices exclude VAT)
Annual quota is a YEARLY pool ("יתרת השליחות מתאפסת בסוף כל תקופה"), not monthly. Annual > monthly
(cheaper + fewer renewal touchpoints). Pick on headroom ≥ 1.5× projected yearly sends.

| Plan (annual) | Price/yr | Sends/yr (~/mo) | Use when |
|---|---|---|---|
| **Power** | ₪350 | 200 (~16/mo) | **default** — cheapest, fits ≤~130 contracts/yr at 1.5× |
| Power Plus | ₪564 | 360 (~30/mo) | expecting growth / ~150–240 contracts/yr |
| Power Pro | ₪1,068 | 840 (~70/mo) | high volume / ~250–560/yr |
| Full Power | custom | large | re-open escape-hatch eval |

Monthly option (resets monthly): Power ₪35/mo (15), Power Plus ₪57/mo (30), Power Pro ₪99/mo (70).
Add-ons: +user ₪319/yr · +5 templates ₪60/yr · +200 contacts ₪70/yr (EOT needs none of these).

## Escape-hatch TRIGGER (open DocuSeal/other ONLY if ALL true)
- Sustained volume exceeds Full Power's economics by a meaningful margin, **OR**
- PowerDoc has repeated non-billing service failures (API downtime / breaking changes).
- Billing exhaustion alone is **NOT** a trigger — solved by Billing autonomy above.
- Before any switch: re-solve Israeli legal validity (consumer-protection registration). Don't skip.

## Contingency — programmatic top-up (only if needed)
No PowerDoc billing/purchase API endpoint exists (probed 2026-06-04: account/me/subscription/balance
all 404/406). Purchase is UI-only. If an auto-renewing subscription ever isn't enough and a manual
top-up is needed mid-cycle:
- Capture the dashboard's XHR/fetch purchase call (Ben opens DevTools once during a real purchase) →
  Claude can replay top-ups **only within a Ben-pre-approved budget ceiling**, with a hard guardrail
  + logged ledger. Reversibility: money is hard-to-reverse → keep the ceiling strict.

## DONE / OPEN
- [x] WS-A Vercel prod env (POWERDOC_API_KEY + POWERDOC_ACCOUNT_TOKEN) set + verified.
- [x] WS-C quota guard (402 + Telegram alert) wired + typechecked.
- [x] WS-D this record.
- [ ] WS-F live e2e — blocked on Ben pre-funding (decision tree above).
