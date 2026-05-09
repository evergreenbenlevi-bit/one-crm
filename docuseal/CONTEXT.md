# DocuSeal — Context

## מה זה
DocuSeal OSS (self-hosted) — מנוע חתימה אלקטרונית.
תת-שכבה של ONE-CRM. לא פרויקט עצמאי.

## גישה
- URL: http://localhost:3002
- Admin: ben.evyatar.one@gmail.com / ONE2026!docuseal
- API Token (בן — ראשי): 15c0446f3951dd3e91b8c6ce061b107f61a408afb726fcd705a8efdc0fdc0b58
- API Token (אביתר — חירום): aL4VruWi4CrgX8hRNy2VM3ezGkjtqEhzaRZC9hgwTN6
- Template ID: 1

## הפעלה
```bash
cd ~/ONE-CRM/docuseal
DOCKER_HOST=unix:///Users/benlevi/.colima/default/docker.sock docker compose up -d
```

## Production (Hetzner)
- Status: ממתין ל-domain (BEN-REQUIRED)
- Config: docker-compose.yml (מוכן)

## Env vars (ONE-CRM .env.local)
- DOCUSEAL_URL
- DOCUSEAL_API_KEY
- DOCUSEAL_TEMPLATE_ID
- DOCUSEAL_WEBHOOK_SECRET

## RTL
- UI Chrome: English LTR (מוגבלות OSS)
- PDF Content: Hebrew RTL ✅
- החלטה v1: accept as-is

## Files
- `docker-compose.yml` — Hetzner deploy config
- `~/ONE-CRM/src/lib/docuseal.ts` — API client
- `~/ONE-CRM/src/app/api/webhooks/docuseal/route.ts` — webhook handler
- `~/ONE-CRM/src/app/api/proposals/` — proposals CRUD + send-for-signing
- `~/ONE-CRM/src/app/(dashboard)/proposals/page.tsx` — UI
- `~/ONE-CRM/supabase/migrations/20260504_esign.sql` — DB schema
