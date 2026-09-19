-- Privilege lock-down.
--
-- Supabase's default privileges grant anon/authenticated ALL on every new
-- table/sequence in `public`, and 20260918100004_rls.sql only *added* grants
-- on top of that, never revoked the defaults. Result: anon held INSERT,
-- UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER on all five tables, with
-- RLS as the only line of defence. RLS does not apply to TRUNCATE at all.
--
-- This migration strips everything and re-grants the minimum each role needs.

-- 1) Strip the inherited defaults, existing and future objects.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

-- 2) anon: read-only, and never the author of a visit. visits.user_id is left
--    out on purpose: linking a review (with its exact date) to a person must
--    not be possible without a session. Consequence: anon clients must list
--    columns explicitly (`select *` on visits is rejected) and cannot embed
--    profiles through visits.
grant usage on schema public to anon, authenticated;

grant select on public.profiles, public.places, public.dishes, public.dish_reviews
  to anon;
grant select (id, place_id, visited_on, place_rating, place_comment, created_at, updated_at)
  on public.visits to anon;

-- 3) authenticated: same reads, plus writes scoped by RLS to the owner.
--    No DELETE on places/dishes/profiles, no INSERT on profiles (created by
--    the handle_new_user trigger), no TRUNCATE/REFERENCES/TRIGGER anywhere.
grant select on public.profiles, public.places, public.dishes, public.visits, public.dish_reviews
  to authenticated;
grant update (username, avatar_url) on public.profiles to authenticated;
grant insert, update on public.places to authenticated;
grant insert, update on public.dishes to authenticated;
grant insert, update, delete on public.visits to authenticated;
grant insert, update, delete on public.dish_reviews to authenticated;

-- 4) save_visit writes on behalf of a signed-in user; anon has no use for it.
revoke execute on function public.save_visit(uuid, date, smallint, text, jsonb) from public, anon;
grant execute on function public.save_visit(uuid, date, smallint, text, jsonb) to authenticated;

-- 5) profiles_update_own was granted to `public` (every role), unlike every
--    other write policy. Harmless in practice, but inconsistent.
alter policy "profiles_update_own" on public.profiles to authenticated;
