# Jupiter Pro v2.0 — Contractor Lead Scraper & Enrichment Platform

Merged from Jupiter Leads + Analyzer Pro. Built for BroadSpeed AI's contractor lead generation workflow.

## What This Does

1. **Scrapes real contractors** from Google Places API — actual phone numbers, websites, Google ratings, review counts, and addresses
2. **Finds business emails** via Hunter.io domain search
3. **Analyzes company websites** with AI to extract services, specialties, and company details
4. **Manages leads** with full CRUD, filtering, CSV import/export, and pipeline status tracking
5. **Falls back to AI generation** when no API keys are configured (for testing)

## Architecture

```
Frontend:  React + Tailwind + shadcn/ui + Recharts
Backend:   Node/Express + tRPC
Database:  MySQL via Drizzle ORM
AI:        Manus Forge API (Gemini 2.5 Flash) — free via Manus platform
```

## Pages

| Route         | Purpose |
|---------------|---------|
| `/`           | Dashboard — stats, charts, pipeline overview |
| `/leads`      | Lead database — search, filter, CSV import/export |
| `/leads/:id`  | Lead detail — edit, view Google Places data, enrichment status |
| `/scraper`    | Lead scraper — Google Places mode (real) or AI mode (synthetic) |
| `/enrichment` | Enrichment tools — Hunter.io email finder, AI website analysis |
| `/settings`   | API key management — Google Places, Hunter.io |

## API Keys Required

### Priority 1: Google Places API (for real contractor scraping)

This is the high-value key. It gives you actual businesses with:
- Business name, phone number, website
- Google rating, review count
- Full address, Google Place ID

**Setup:**
1. Go to https://console.cloud.google.com
2. Create a project (or use existing)
3. Enable **Places API (New)** in APIs & Services → Library
4. Create an API key in APIs & Services → Credentials
5. Restrict the key to Places API only

**Cost:** 10,000 free Essentials calls/month. Text Search: ~$5/1K calls. Place Details: ~$5-25/1K depending on fields requested. A typical scrape of 20 contractors uses ~21 API calls (1 text search + 20 detail lookups).

### Priority 2: Hunter.io (for email enrichment)

Finds business email addresses from company websites.

**Setup:**
1. Create account at https://hunter.io
2. Go to API Keys in your dashboard
3. Copy your API key

**Cost:** Free: 25 searches/month. Starter ($49/mo): 500 searches. Growth ($149/mo): 5,000 searches.

### No Key Required: AI Website Analysis

Uses the built-in Manus LLM to research company websites and fill in:
- Industry classification
- Company size estimate
- Services offered
- Specialties and target market

## Database Migration

After deploying, run the migration SQL:

```sql
-- File: drizzle/migrations/0003_add_enrichment_and_places.sql
```

This adds:
- Google Places fields to `leads` table (googlePlaceId, googleRating, googleReviewCount, address)
- Enrichment tracking fields (enrichmentStatus, lastEnrichedAt)
- `enrichmentJobs` table
- `apiSettings` table
- `scrapeMode` field to `scrapeJobs` table

## Key Files Changed from Original Jupiter Leads

| File | What Changed |
|------|-------------|
| `drizzle/schema.ts` | Added Google Places fields, enrichmentJobs table, apiSettings table |
| `server/db.ts` | Added enrichment queries, API settings CRUD, leads-for-enrichment queries |
| `server/routers.ts` | Real Google Places scraper, Hunter.io email enrichment, LLM website analysis, CSV import, API settings management |
| `client/src/App.tsx` | Added Enrichment and Settings routes |
| `client/src/components/AppLayout.tsx` | Added Enrichment and Settings nav items |
| `client/src/pages/Dashboard.tsx` | Added source breakdown chart |
| `client/src/pages/LeadScraper.tsx` | Google Places mode with contractor trade presets, Arizona locations |
| `client/src/pages/LeadsDatabase.tsx` | Added CSV import, home service industries in filters |
| `client/src/pages/LeadDetail.tsx` | Added Google Places data card, enrichment status badges |
| `client/src/pages/Enrichment.tsx` | **New** — Email finder and website analysis tools |
| `client/src/pages/Settings.tsx` | **New** — API key management with test buttons |

## Workflow: How to Use

### Step 1: Configure API Keys
Go to Settings → Add your Google Places API key

### Step 2: Scrape Contractors
Go to Lead Scraper → Select trade (Roofing, HVAC, etc.) → Select location → Start Scraping

### Step 3: Review Leads
Go to Lead Database → Browse results with ratings, phone numbers, websites

### Step 4: Enrich Data
- **Email Finder:** Add Hunter.io key in Settings → Go to Enrichment → Run email finder
- **Website Analysis:** Go to Enrichment → Run website analysis (no key needed)

### Step 5: Export
Lead Database → Export CSV → Import into GoHighLevel or other CRM

## What's Real vs. What's Simulated

| Feature | Real / Simulated |
|---------|-----------------|
| Google Places scraping | **REAL** — actual businesses with real data (requires API key) |
| Hunter.io email lookup | **REAL** — actual email search (requires API key) |
| AI website analysis | **REAL** — LLM analyzes the company, but quality varies |
| AI lead generation | **SIMULATED** — generates plausible but fake leads (fallback mode) |
| CSV import/export | **REAL** — standard CSV handling |
| Lead management | **REAL** — full CRUD, filtering, status tracking |

## Cost Estimate for BSAI Use Case

Targeting Arizona contractors, ~200 leads/month:

| Service | Monthly Cost |
|---------|-------------|
| Google Places API | ~$0 (within free tier for 200 leads) |
| Hunter.io (Starter) | $49/month (500 searches) |
| **Total** | **~$49/month** |

For higher volume (1,000+ leads/month), Google Places would cost ~$10-20/month and you'd need Hunter Growth at $149/month.
