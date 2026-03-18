# ONE™ CRM

Lead & client management system for the ONE™ coaching program.

ONE™ helps experts build marketing + conversion systems that bring ready clients — no sales calls, no burnout.

## Tech Stack

- **Frontend:** Next.js (App Router) + Tailwind CSS
- **Backend:** Supabase (Postgres + Auth + RLS)
- **Automations:** N8N workflows

## Features

- **Lead tracking** — from first content view through application to onboarding
- **Application management** — questionnaire submissions, scoring, approval flow
- **Client management** — program tracking, monthly progress, mentor assignment
- **Content metrics** — track performance across Instagram, LinkedIn, YouTube, TikTok
- **Financial dashboard** — transactions, expenses, revenue goals per quarter
- **Campaign tracking** — ad spend, impressions, clicks, conversions
- **Meeting management** — discovery calls, strategy sessions, group zooms, workshops
- **Automation logs** — full visibility into what N8N workflows did
- **Funnel analytics** — conversion rates across the entire journey

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Set environment variables** — copy `.env.example` to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Run migrations:**
   ```bash
   # Via Supabase CLI
   supabase db push

   # Or run manually in the SQL Editor:
   # Copy contents of supabase/migrations/001_initial_schema.sql
   ```

4. **Install dependencies and run:**
   ```bash
   npm install
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)
