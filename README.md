# Albireo

A peer-reviewed student webzine. Four members write in a private studio; an article is certified once two members approve it, and authors can publish before or after review (uncertified pieces are marked).

- Live: https://albireo-orbit.vercel.app
- Team: Yeji C., L, S, H
- Credits: [`CREDITS.md`](./CREDITS.md)

## Stack

| | |
|---|---|
| App | Next.js 15 (App Router) · React 19 · TypeScript · Node 24 |
| DB · Auth | Supabase (PostgreSQL, RLS, Realtime, Storage); email + password, magic link for first sign-in / reset |
| Hosting | Cloudflare Workers (OpenNext) |
| Mail | Nodemailer over Gmail SMTP |
| Monitoring | Sentry · Google Analytics 4 · in-house visit log |
| Test | Vitest · `supabase/tests` (policy checks) |

## Features

| Feature | Implementation |
|---|---|
| Home · webzine | Original orbit hero at the centre of an infinite pannable canvas: field islands, inertia, pinch/wheel zoom, keyboard nav, list fallback |
| About | The Albireo story (KO/EN) with a dithered telescope view built from measured values: separation 35.3″, PA 54°, mag 3.1/5.1, Gaia distances, Aa–Ac inner orbit; drag to see depth, hold to magnify A |
| Sentence annotations | Hashed sentence ids + Range offsets, CSS Highlight API, Realtime sync |
| Debate | Threaded replies (`parent_id` tree), realtime, soft delete |
| Peer review | Approval requires all 6 checklist items; 2 approvals certify via DB trigger; body edits invalidate reviews |
| Writing | Visual or Markdown editor, footnotes `[^n]`, DOI → linked title, APA 7 reference list, optional English version |
| Knowledge canvas | Board with cards · shapes · links, cards nested in cards (collapse), folders, mind-map and time-tree layouts, pen ink (palette, stabiliser), handwriting → text, rectangle/lasso selection → PNG or straight into a manuscript; pins to fix and jump back; auto / centre arrange; first-visit tour; private lock per canvas; CSV → charts; moodboard |
| Links | `[[term]]` bidirectional links between manuscripts (backlinks) |
| Publishing | Draft / publish split; publish after review or before (unstamped); ISR, JSON-LD · sitemap · RSS · OG images |
| Engagement | Views (per visitor/day), likes, latest · oldest · popular sorting, share links |
| Subscriptions | Double opt-in, welcome letter on confirm, one email per new article, one-click unsubscribe (RFC 8058) |
| Analytics | Cookie-free visit log (daily hashed visitor id, Do Not Track respected) → admin-only studio dashboard: visitors, pages, referrers, countries, devices, subscribers |
| Members | 2×2 member grid + mind-map canvas linking each member to their articles |
| Member pages | Self-managed profiles, up to 3 pinned peer-reviewed highlights, contribution stats |
| Trash | Soft delete with confirm, restore, author-only permanent delete |
| Language | KO / EN interface toggle (cookie); clock in sidereal time, Seoul or Sydney |
| Sign-in | Email + password straight to the studio; members set their own password in Settings |
| Typography | Per-piece body font (16 OFL fonts), size, line spacing, indent, justify; personal defaults |
| Layout | Desktop layout from 600 px (foldables unfolded), mobile below |
| Thumbnails | Upload or 8 generated templates × 6 tones (auto-picked when unset) |
| Figures | Tables, bar · line · area · pie charts, flow diagrams (`\`\`\`chart`, `\`\`\`diagram`) |

## Structure

```
supabase/
  migrations/   001 schema · triggers · RPC
                002 RLS · column privileges · Realtime · Storage
                003 4-member cap
                004 input limits · private profiles · review checklist constraint
                005 per-role table · column grants
                006 free-text fields · lenses
                007 trash
                008 publish rule · 2 approvals
                009 views · likes · highlights
                010 English version · typography
                011 personal defaults
                012 subscribers · site visits · stats
                013 member requests (admin approval)
                014 canvas media bucket · SRS card seeding off
                015 trash auto-purge after 30 days
                016 admin flag · login-link throttle · member e-mail check · backlinks scope
                017 canvas lock (owner-only when locked)
  tests/        policies.check.mjs
  seed.sql      member promotion template
src/
  app/(site)/   public: home · webzine · members · about · subscribe · login · credits
  app/studio/   private studio (actions.ts: server actions) · analytics (admin)
  app/api/      og (Edge) · visit · unsubscribe · doi
  components/   orbit · canvas-home · members · glyph · ascii · art · article · studio · canvas · motion · layout
  lib/          board · supabase · text · cite · i18n · csv · seo · data · mail · visit
  content/      team · about · review guidelines · fonts · demo data · credits
public/mail/    email header image
.github/workflows/ci.yml   lint · types · tests · build · policy checks
```

## Run

```bash
npm install
npm run dev            # demo mode without Supabase keys
```

Full mode:

```bash
cp .env.example .env.local
npx supabase start && npx supabase db reset
npm run dev
```

Sign in once with an email link, replace the handles in `supabase/seed.sql` and run it to register members (max 4). Each member then sets a password in Studio → Settings.

## Env

| Key | |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required (full mode) |
| `NEXT_PUBLIC_SITE_URL` | Canonical · sitemap · OG · auth redirect |
| `NEXT_PUBLIC_GA_ID` | Optional |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Subscriptions + analytics |
| `ADMIN_EMAIL` | Optional. Where membership requests are emailed (default `SMTP_USER`) |
| `SMTP_USER` · `SMTP_PASS` | Gmail address + app password for subscription emails (`SMTP_HOST`/`SMTP_PORT`/`MAIL_FROM` optional) |
| `NEXT_PUBLIC_SENTRY_DSN` · `SENTRY_ORG` · `SENTRY_PROJECT` · `SENTRY_AUTH_TOKEN` | Optional |

## Deploy

Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare) (`wrangler.jsonc`, `open-next.config.ts`, `cf-worker.ts`).

1. Cloudflare → Workers & Pages → Create → Import a repository. Build command `npx opennextjs-cloudflare build`, deploy command `npx opennextjs-cloudflare deploy`
2. Add the env vars twice: `NEXT_PUBLIC_*` as **build** variables (they are inlined into the browser bundle) and everything as Worker **runtime** variables/secrets
3. Add `https://<domain>/**` to Supabase Auth redirect URLs and set the Site URL
4. A daily cron (`wrangler.jsonc` → `cf-worker.ts`) pings Supabase so the free project isn't paused
5. Local check: `npm run preview` (Workers runtime) · `npm run deploy` deploys from your machine
6. Submit `/sitemap.xml` to Search Console

## Security

- RLS on every table. Studio data is `is_member()` only; a trigger caps members at 4
- Sign-in: password, or an email link for registered addresses only (no self sign-up). New members send a request from the sign-in page; the admin gets an email, signs in, and approves at `/join/review`
- `is_member`, `is_admin`, `peer_reviewed`, `author_id` etc. are not client-writable (column privileges). The admin (Analytics, member approval) is `profiles.is_admin`, set in SQL
- Publishing is gated by a DB trigger that checks review certification
- Non-member profiles are private; default handles are unrelated to email
- Markdown is rendered to React elements by an in-house parser (raw HTML · `javascript:` blocked)
- Login redirects accept internal paths only; password errors don't reveal whether an account exists
- Subscribers and visit logs are server-only tables (service role); the stats RPC is not callable from the browser
- Subscription confirm links are single-use tokens; unsubscribe needs a button press so mail scanners can't trigger it
- Headers: HSTS · nosniff · X-Frame-Options · frame-ancestors · Referrer/Permissions-Policy; studio is noindex
- Server action validation plus DB constraints

## Scripts

| | |
|---|---|
| `npm run dev` / `build` / `start` | Dev · build · start |
| `npm run typecheck` / `lint` / `test` | Types · lint · unit tests |
| `npm run test:db` | Policy checks (requires `DATABASE_URL`, empty PostgreSQL) |
| `npm run db:types` | Generate Supabase types |

## Generated artwork

The member profile animations, the home page and About animations, the sample covers and the studio preview video were generated with **Claude Code (Anthropic)** through prompt engineering by **Yeji C.**
Files: `src/components/ascii/initials/`, `src/components/orbit/OrbitHero.tsx`, `src/components/art/AlbireoScope.tsx`, `src/components/art/Cover.tsx`, `src/components/art/CoverArt.tsx`, `src/components/promo/StudioPromo.tsx`. Details in [`CREDITS.md`](./CREDITS.md).

## License

All rights reserved.
