# Sutra

**Changing your career is a full time job. Automation allows you to apply more and fail more.**

Researching the market, customizing your applications and targeting the jobs where you actually have a chance is still difficult and energy intensive. Sutra brings the best of both worlds: quality - at scale.

Built at [Grok Bot Serbia Hackathon](https://hackathon.cursorserbia.com/) — 12 September 2026, Belgrade.

## What this is for a job searcher

You already know the grind. Automation lets you apply more and fail more. Sutra is the research, the tailored CV, and the targeting — quality at scale.

- **Roles that fit you.** Listings scored against your stack — Balkan, EU, and US — not a pile of open tabs.
- **Proof you can attach.** Daytona writes a 48-hour project (README + files) mapped to the closest role.
- **A Monday pack.** Seven concrete days and a coach that cuts LinkedIn sludge so you can rehearse out loud.
- **Partners actually run.** Grok writes your summary, Exa searches, Firecrawl turns listings into text, Daytona scores and writes proof. Without API keys, curated adapters still complete the path so you are not stuck on a blank screen.

Try it first as Ana (NestJS, Belgrade, August layoff) → market → sandbox → proof files → pitch coach. Then type your own details.

## Demo script (3 minutes)

How to walk the product as an operator of this repo:

1. Open `/` — “Changing your career is a full time job.” English UI only. A first-run **Tour** with bubbles starts automatically (replay from the header).
2. Click **See it with Ana’s file** to skip setup, or **Use your own details** for the new-user wizard (CV required, then qualifying questions). Studio auto-runs Ana on the sample path.
3. Watch **What ran** (Grok → Exa → Firecrawl → Daytona).
4. Open **Market** (fit scores), **Proof of work** (files), **Monday** (7-day plan).
5. In pitch coach, paste a fluffy LinkedIn answer. Hit **Score it**. Show the rewrite.
6. Optional: switch to Marija (PM) or Luka (student) under **Try a sample person** to show the proof template changes. Returning users skip the wizard; **Start setup again** replays it.

## Run locally

```bash
npm install
npm run dev
```

App: [http://127.0.0.1:43141](http://127.0.0.1:43141)

Optional keys — set in `.env.local` locally, or in Render **Environment** / the Cursor env group:

```
XAI_API_KEY=
EXA_API_KEY=
FIRECRAWL_API_KEY=
DAYTONA_API_KEY=
NEXT_PUBLIC_CONVEX_URL=https://energized-akita-832.eu-west-1.convex.cloud
```

Without keys the full path still runs on curated Balkan adapters. With keys, Grok / Exa / Firecrawl / Daytona go live on the next run. If Daytona is unreachable, Sutra keeps the local scoring executor and logs `[daytona] failed … — local executor`.

## Your file, saved (Convex)

For you as a job searcher: Studio remembers your dossier, last run (roles, proof, pitch, traces), portrait, and which listings you generated a tailored CV for. Refresh `/studio` — the file is still there. You do not log in. This browser keeps an anonymous `sessionId`.

Without Convex, the line in the header says **Saved on this device** (localStorage, plus an in-memory copy if storage is full). With Convex, it says **Saved to your Sutra cloud**. If the cloud URL is set but load/save fails, the header says so in plain language and the device copy is kept — Studio does not crash.

### Operator setup

Sutra’s **working** public Convex URL (`energized-akita-832`, safe to commit as `NEXT_PUBLIC_*`):

`NEXT_PUBLIC_CONVEX_URL=https://energized-akita-832.eu-west-1.convex.cloud`

`next.config.ts` and `convexPublicUrl()` **always bake Akita** when the env var is empty or is the stale civet preview `https://keen-civet-455.eu-west-1.convex.cloud`. Copy the Akita URL into gitignored `.env.local` anyway so local Next matches production. `render.yaml` and `.env.example` already set the same name and value. Never commit Convex admin / `CONVEX_DEPLOY_KEY`. Restart `npm run dev` after changing `NEXT_PUBLIC_*` — Next inlines the URL at compile time. Unset a shell `NEXT_PUBLIC_CONVEX_URL` if it is still civet (it wins over `.env.local`).

1. Put the Akita URL in `.env.local`.
2. Restart `npm run dev` so the **client bundle** contains `energized-akita-832`. Studio header should read **Saved to your Sutra cloud**.
3. Functions on Akita are pushed (`studio:*`). To refresh them: `npx convex deploy` with `CONVEX_DEPLOY_KEY` from `.env.local`.

What is stored, keyed by `sessionId` only:

- Dossier (name, role, skills, situation, US/EU/local target, bio, full CV experience)
- Portrait as a Convex file (size-capped JPEG); data URL stays on-device as fallback
- Last run: jobs (markdown clipped), proof, plan, pitch, summary, traces, sandbox logs
- Tailored-CV metadata (job id, company, title, time) — not the PDF bytes

Partner keys (Grok, Exa, Firecrawl, Daytona) stay in Next.js env. They are not Convex documents.

## Deploy on Render (live partner APIs)

Do **not** put API keys in git. Render reads them from **Environment**.

`render.yaml` already sets `NEXT_PUBLIC_CONVEX_URL` to Akita. If live Studio still says **Saved on this device**, the **client was built** with an empty or civet URL — restarting the process is not enough.

**Three clicks (rebuild required):**

1. [Render](https://dashboard.render.com) → your **sutra** service → **Environment**
2. Set `NEXT_PUBLIC_CONVEX_URL` = `https://energized-akita-832.eu-west-1.convex.cloud` (replace civet if it is still there)
3. **Manual Deploy** → **Clear build cache & deploy**

After this deploy, **add `DAYTONA_API_KEY` on the Render env group** (Environment → the linked group, or the service’s Environment). `render.yaml` declares the key name with `sync: false`; Render will not copy the secret from git or from your laptop. Redeploy after you paste it.

1. Push this repo to Origin/GitHub (already on `main`).
2. In [Render](https://dashboard.render.com): **New → Web Service** → connect `cursor-champ`.
3. Render will pick up `render.yaml`, or set manually:
   - Build: `npm ci && npm run build`
   - Start: `npm run start`
   - Node 22
4. **Environment** → add (same names as local `.env.local`):

| Key | Service |
|---|---|
| `XAI_API_KEY` | x.ai / Grok |
| `EXA_API_KEY` | Exa |
| `FIRECRAWL_API_KEY` | Firecrawl |
| `DAYTONA_API_KEY` | Daytona |
| `NEXT_PUBLIC_CONVEX_URL` | Convex — `https://energized-akita-832.eu-west-1.convex.cloud` (`studio:*`; also in `render.yaml`). |

5. Deploy. After boot, Studio badges should read **live** for each key you set.

The in-app Keys panel was removed. On Render, set secrets in the dashboard Environment (or a linked env group) so they survive deploys.

## Stack

Next.js (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Convex (Akita URL is baked in; device fallback only if persist cannot reach cloud)

## License

MIT — public repo required by the hackathon.
