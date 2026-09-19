# oh my food

Track where you eat, what you eat there, and how both evolve over time.
Places (restaurants, food stalls, food trucks, market stalls) have dishes;
every visit can rate the place overall and rate any number of dishes eaten
that day across three dimensions (idea / execution / flavor) plus a
would-repeat flag. The whole point of the app is **temporal evolution**, not
just current averages: every place and dish page shows a recent-vs-historical
comparison, an up/down/stable trend, and a chart of the metric over time.

## Stack

- **Next.js 16** (App Router, TypeScript, Server Actions) on **Vercel** (Hobby plan)
- **Supabase**: Postgres + Auth (magic link) + Row Level Security
- `@supabase/ssr` for cookie-based session handling
- **Recharts** for the timeseries charts
- **Leaflet + OpenStreetMap** for the map. Tiles come from the public OSM server: free and keyless, fine for a closed beta, but its usage policy doesn't allow heavy production traffic, so switch to a keyed provider before launching. Nominatim geocoding runs only at place-creation time (1 req/s policy); address autocomplete would break that policy and needs a paid geocoder, so it is not built.
- **zod** for input validation, shared between client forms and Server Actions

All temporal metrics (moving averages, trend direction, recent-vs-historical
stats) are computed in **SQL RPCs**, not in the client, so the logic is
tested once and reused everywhere.

## Project structure

```
src/
  app/                    Routes (App Router). Server Actions live in each
                           route's actions.ts.
  components/             Client components shared across routes (charts,
                           star inputs, dish/place pickers, etc).
  lib/
    supabase/{client,server}.ts   @supabase/ssr wrappers
    database.types.ts             generated from the DB schema — see below
    validation.ts                 zod schemas
    nominatim.ts                  geocoding helper
supabase/
  migrations/             Versioned SQL migrations (schema, RLS, RPCs)
  seed.sql                Local-only dev seed (see below)
  config.toml             Local Supabase CLI stack config
tests/
  rls.test.ts             RLS policy and privilege tests (vitest, hits local stack)
  social.test.ts          Privacy leak battery: audiences, follows, general scores
  lists.test.ts           Saved places and lists are private to their owner
  trends.test.ts          Trend/timeseries RPC tests (vitest, hits local stack)
```

## Data model (high level)

- `profiles` — one row per auth user (`username` chosen by the person,
  `display_name`, `bio`, avatar), created via a trigger on `auth.users` with a
  provisional `user_<12 hex>` username. `profile_settings` holds each user's
  private defaults for new visits (owner-only).
- `follows` — directed follow graph. "Friend" = mutual follow. Private: you
  only ever see the rows you take part in.
- `places` — restaurants/stalls/trucks/market stalls. `name_normalized` is a
  generated column (unaccented, lowercased) used for fuzzy duplicate
  detection (`pg_trgm` + `unaccent`).
- `dishes` — belong to a place; unique per place on `name_normalized`.
- `visits` — the central unit: `(user_id, place_id, visited_on)` unique,
  `visited_on` can't be in the future, `place_rating` is optional (1-5).
  Each visit has an `audience` (`public` / `followers` / `mutuals` /
  `private`) and `pools_publicly` (whether its rating also counts, nameless,
  in the place's general average).
- `saved_places` ("quiero ir", a state) and `place_lists` / `place_list_items`
  (themed collections) — two separate concepts so the map can filter by state
  and by collection independently. Private to their owner (no sharing yet).
- `dish_reviews` — belong to a visit; unique per `(visit_id, dish_id)`;
  `idea`/`execution`/`flavor` (1-5), `would_repeat` (bool), optional comment.
  A trigger enforces that the reviewed dish actually belongs to the visit's
  place.

### Privacy model

One rule: **a review is visible to you if and only if its author allowed you
to see their identity.** If you can't see who wrote it, you can't see its
rating either. It is a single RLS policy on `visits`
(`visits_select_attributed`, migration `20260920100000_social_core.sql`);
`dish_reviews` inherit it through their visit. `private` matches no branch, so
nobody but the author can read it.

- Without an account (`anon`) you can read `places` and `dishes` and their
  **general averages**, never a single visit, its author, date or comment.
  `anon` has no privileges at all on `visits`, `dish_reviews`, `profiles`
  or `follows`.
- The general averages come from `place_general_scores` and
  `dish_general_scores`, the **only `security definer` functions**. They return
  aggregates only, count only visits with `pools_publicly`, and take nothing
  but a bounded list of ids. Read the invariants in the migration before
  touching them.
- Every other RPC (`place_stats`, `place_trend`, timeseries, rankings) is
  `security invoker`, so it aggregates exactly what the caller can already
  read. Don't turn any of them into `definer`.
- A `private` visit can't pool (`visits_private_never_pools`): anonymous
  reviews are deliberately not enabled yet (open question B.9 #2 in
  `docs/plan-fase-2-social.md`).
- Pages whose content depends on the viewer must never be cached (no ISR, no
  `revalidate`, no CDN cache).

Writes are scoped to the owner (`user_id`/`created_by` = `auth.uid()`).
`visits`/`dish_reviews` are editable/deletable only by their author.
`places`/`dishes` can never be deleted by clients and are editable only by
their creator.

Table privileges are a second line of defence, because RLS does not cover
everything (e.g. `TRUNCATE`). `20260919100000_lock_down_grants.sql` revokes
Supabase's default grants and leaves `anon` and `authenticated` with the
minimum. Any new table or RPC needs an explicit `grant`.

## Temporal metrics

- `place_timeseries` / `dish_timeseries(place_or_dish_id, granularity, from, to)`
  — one row per period (month/quarter) with the average, `n`, and a 3-period
  moving average. Periods with no visits are **true gaps** (`avg_rating` is
  `null`, not `0`) — built with `generate_series` + `left join`, not
  zero-filled client-side.
- `place_trend` / `dish_trend(id)` — compares the last 90 days against the
  previous 90 days and returns `delta` and a `status` of `up` / `down` /
  `stable` / `insufficient_data`.
- `place_stats` / `dish_stats(id)` — recent (last 12 months) headline figure
  vs. all-time historical figure, each with its own `n`.

### Changing the trend thresholds

Trend thresholds live in **exactly one place**:
`supabase/migrations/20260918100007_trend_stats_rpcs.sql`, functions
`trend_min_n()` (currently `5` — minimum visits in each 90-day window to
consider the trend meaningful) and `trend_delta_threshold()` (currently
`0.2` — minimum absolute rating delta between windows to call it `up`/`down`
rather than `stable`). To change them, add a new migration that does
`create or replace function` for one or both (don't edit the old migration
file in place) and re-apply.

## Local development

### Prerequisites

- Node.js 20+
- Docker Desktop (for the local Supabase stack)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)

### Setup

```bash
npm install
supabase start          # starts the local Postgres/Auth/Studio stack in Docker
supabase db reset        # applies all migrations, then supabase/seed.sql
```

`supabase start` prints local URLs and keys — Studio is normally at
`http://127.0.0.1:54323`. Create `.env.local` (see below) pointing at the
local stack for `npm run dev`, or at the remote project if you want to run
the app against production data.

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=<Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon/public key>
```

Get these from `supabase status` (local) or Project Settings → API
(remote/Supabase dashboard). Never put the `service_role` key in anything
prefixed `NEXT_PUBLIC_` or ship it to the client.

### Dev seed

`supabase/seed.sql` is **only ever executed by `supabase db reset` / `supabase start` against the local Docker stack** (wired via `[db.seed] sql_paths` in
`supabase/config.toml`) — it is never run against the remote/production
project. It creates 4 test users (`ana@example.com` / `bruno@...` /
`carla@...` / `david@...`, all password `password123`), 4 Madrid places with
~18 months of synthetic visits shaped to have distinct trends (one
improving, one declining, one stable, one sparse/filler), and their dish
reviews.

### Generating types

After changing the schema (new migration + `supabase db reset`):

```bash
supabase gen types typescript --local > src/lib/database.types.ts
```

(Redirect only stdout — the CLI logs a connection notice to stderr that
must not end up in the file.)

### Tests

```bash
supabase start && supabase db reset   # local stack must be up and seeded
npm test
```

`tests/rls.test.ts`, `tests/social.test.ts`, `tests/lists.test.ts` and `tests/trends.test.ts` are integration tests that
hit the local stack directly (see `tests/README.md`) — they sign in as the
seed users and assert RLS blocks cross-user writes, and assert the trend/
timeseries RPCs correctly classify the seed's known improving/declining/
stable/sparse places.

### Running the app

```bash
npm run dev
```

## Applying migrations to the remote project

```bash
supabase link --project-ref <project-ref>
supabase db push
```

(Never run `supabase db reset` against a linked remote project — it drops
and recreates the database. It's only safe against the local Docker stack.)

## Deployment

The app is deployed on Vercel, connected to the GitHub repo for automatic
deploys on push to `main`. Required environment variables (Project Settings
→ Environment Variables, for all environments):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Design tokens

Colors come from the warm Tailwind `stone` scale plus the `accent` token
(`src/app/globals.css`, `@theme`). Green and red are reserved for trend
semantics and errors. Titles use the `font-display` serif (Fraunces). Don't put
literal colors in components: the (still pending) dark theme only has to remap
the tokens. The app is light-only until then.

## Roadmap

Done: auth (magic link + password sign-in), places/dishes, visits with
audiences, temporal metrics, profiles, directed follows, feed, general
averages for anonymous visitors, saved places, private lists, map, first
recommendations ("popular among people you follow"), warm visual system,
robots.txt. See `docs/plan-fase-2-social.md` for the rationale.

Next, and postponed because it needs a paid service or an open product
decision:

- Paid map tiles and address autocomplete (keyed provider).
- Transactional email on a verified domain, so friends can sign in by magic
  link without Supabase's low built-in email limit.
- Recommendations by proximity ("near you and well rated"), lists shared with
  followers, anonymous reviews (B.9 #2), dark theme (F7), dish photos
  (Supabase Storage), duplicate place/dish merging, PWA.
