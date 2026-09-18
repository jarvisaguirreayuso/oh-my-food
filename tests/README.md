# Integration tests

These tests run against the **local** Supabase stack only — the one started
with `supabase start` and seeded with `supabase db reset` (which applies all
migrations in `supabase/migrations` and then `supabase/seed.sql`). They must
never be pointed at the remote/production project: they authenticate as the
seed users (`ana@example.com` / `bruno@example.com` / ... / `password123`),
which only exist in the local stack, and `rls.test.ts` deliberately mutates
data.

## Running

```bash
supabase start        # if not already running
supabase db reset     # (re)applies migrations + seed.sql
npm test
```

`tests/env.ts` defaults to the standard local Supabase CLI URL
(`http://127.0.0.1:54321`) and the well-known local demo anon key (the same
for every `supabase start` on every machine — not a secret). Override with
`TEST_SUPABASE_URL` / `TEST_SUPABASE_ANON_KEY` env vars if your local stack
uses non-default ports.

## What's covered

- `rls.test.ts` — row-level security: a user cannot update/delete another
  user's visits or dish_reviews, and cannot update a place/dish they didn't
  create; a user CAN edit their own rows; everyone can read.
- `trends.test.ts` — the `place_trend` / `place_timeseries` RPCs against the
  seeded data, which was generated with known shapes: Casa Manolo trends up,
  Bocatería El Rápido trends down, Taco Volador is stable, and Mercado de la
  Paella (sparse, ~1 visit/quarter) reports `insufficient_data`.
