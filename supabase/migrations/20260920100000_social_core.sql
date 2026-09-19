-- Social core (docs/plan-fase-2-social.md, F1 + F4 + F5).
--
-- Product decisions this implements:
--   * B.9 #3 (a): without an account only *general* data is visible: place and
--     dish names plus their general averages. Never who wrote a visit, never
--     its exact date, never its comment. anon therefore loses direct access to
--     visits / dish_reviews / profiles altogether.
--   * B.9 #1 (a): directed follows. "Friend" = mutual follow.
--   * The single reading rule: a review is visible to you if and only if its
--     author allowed you to see their identity. If you can't see who wrote
--     it, you can't see its rating either. Anything you can read is computed
--     by RLS, so aggregates over what you can see leak nothing extra.
--   * B.9 #2 is still open, so anonymous reviews are NOT enabled: a private
--     visit can't count towards the general average (visits_private_never_pools).
--     Dropping that constraint is all it takes to enable them later.

create type public.audience as enum ('public', 'followers', 'mutuals', 'private');

-- 1) Identity ----------------------------------------------------------------
alter table public.profiles
  add column display_name text check (display_name is null or length(trim(display_name)) between 1 and 60),
  add column bio text check (bio is null or length(bio) <= 280),
  add constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$');

-- Per-user defaults for new visits. A separate owner-only table (not columns on
-- profiles) so other users can read profiles without seeing anyone's privacy
-- preferences.
create table public.profile_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  default_audience public.audience not null default 'followers',
  default_pools_publicly boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint profile_settings_private_never_pools
    check (not (default_audience = 'private' and default_pools_publicly))
);

insert into public.profile_settings (user_id) select id from public.profiles on conflict do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, 'user_' || left(replace(new.id::text, '-', ''), 12))
  on conflict (id) do nothing;

  insert into public.profile_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger profile_settings_set_updated_at
  before update on public.profile_settings
  for each row execute function public.set_updated_at();

-- 2) Follows (directed, private graph) --------------------------------------
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows (followee_id, follower_id);

-- 3) Visit audience ------------------------------------------------------------
alter table public.visits
  add column audience public.audience not null default 'followers',
  add column pools_publicly boolean not null default true,
  add constraint visits_private_never_pools check (not (audience = 'private' and pools_publicly));

create index visits_user_id_created_at_idx on public.visits (user_id, created_at desc);

-- 4) RLS -------------------------------------------------------------------
alter table public.profile_settings enable row level security;
alter table public.follows enable row level security;

-- profiles: readable by signed-in users only.
drop policy "profiles_select_public" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

create policy "profile_settings_select_own" on public.profile_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "profile_settings_insert_own" on public.profile_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "profile_settings_update_own" on public.profile_settings
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- follows: the graph is private. You only see rows you take part in, which is
-- also all the visits policy below needs.
create policy "follows_select_involved" on public.follows
  for select to authenticated
  using (follower_id = (select auth.uid()) or followee_id = (select auth.uid()));
create policy "follows_insert_own" on public.follows
  for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "follows_delete_own" on public.follows
  for delete to authenticated using (follower_id = (select auth.uid()));

-- visits: THE reading rule. `private` matches no branch, so nobody else can
-- read the row.
drop policy "visits_select_public" on public.visits;
create policy "visits_select_attributed" on public.visits
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or audience = 'public'
    or (audience = 'followers' and exists (
          select 1 from public.follows f
          where f.follower_id = (select auth.uid()) and f.followee_id = visits.user_id))
    or (audience = 'mutuals' and exists (
          select 1
          from public.follows a
          join public.follows b
            on b.follower_id = a.followee_id and b.followee_id = a.follower_id
          where a.follower_id = (select auth.uid()) and a.followee_id = visits.user_id))
  );

-- dish_reviews inherit the audience of their visit (the EXISTS is itself
-- filtered by the visits policy above, since this runs as the caller).
drop policy "dish_reviews_select_public" on public.dish_reviews;
create policy "dish_reviews_select_via_visit" on public.dish_reviews
  for select to authenticated
  using (exists (select 1 from public.visits v where v.id = dish_reviews.visit_id));

-- 5) Privileges ------------------------------------------------------------
-- anon keeps places and dishes (business data, not personal data) and loses
-- everything else. General numbers reach it only through the two definer
-- functions below.
revoke all on public.visits, public.dish_reviews, public.profiles from anon;

grant select on public.profile_settings, public.follows to authenticated;
grant insert, update on public.profile_settings to authenticated;
grant insert, delete on public.follows to authenticated;

revoke update on public.profiles from authenticated;
grant update (username, display_name, bio, avatar_url) on public.profiles to authenticated;

-- 6) General scores: the ONLY security definer surface -------------------------
-- These two functions are the whole attack surface of the privacy model. Keep
-- these invariants (and tests/social.test.ts) intact:
--   1. Aggregates only. Never user_id, visit_id, visited_on, comments, min/max
--      or anything that identifies one review.
--   2. Only rows with pools_publicly = true (private visits never count).
--   3. The only parameter is a bounded list of ids. No filters supplied by the
--      caller (user, date, rating): any of those would turn this into an
--      oracle of differences over data the caller can't read.
create or replace function public.place_general_scores(p_place_ids uuid[])
returns table (place_id uuid, avg_rating numeric, n integer)
language sql
stable
security definer
set search_path = public
as $$
  select v.place_id, round(avg(v.place_rating)::numeric, 2), count(*)::int
  from public.visits v
  where cardinality(p_place_ids) <= 200
    and v.place_id = any(p_place_ids)
    and v.pools_publicly
    and v.place_rating is not null
  group by v.place_id
$$;

create or replace function public.dish_general_scores(p_dish_ids uuid[])
returns table (
  dish_id uuid,
  avg_idea numeric,
  avg_execution numeric,
  avg_flavor numeric,
  repeat_pct numeric,
  n integer
)
language sql
stable
security definer
set search_path = public
as $$
  select r.dish_id,
         round(avg(r.idea)::numeric, 2),
         round(avg(r.execution)::numeric, 2),
         round(avg(r.flavor)::numeric, 2),
         round(100.0 * avg(case when r.would_repeat then 1 else 0 end)::numeric, 1),
         count(*)::int
  from public.dish_reviews r
  join public.visits v on v.id = r.visit_id
  where cardinality(p_dish_ids) <= 200
    and r.dish_id = any(p_dish_ids)
    and v.pools_publicly
  group by r.dish_id
$$;

revoke all on function public.place_general_scores(uuid[]) from public;
revoke all on function public.dish_general_scores(uuid[]) from public;
grant execute on function public.place_general_scores(uuid[]) to anon, authenticated;
grant execute on function public.dish_general_scores(uuid[]) to anon, authenticated;

-- 7) save_visit with audience ------------------------------------------------
-- p_audience / p_pools_publicly = null means "use my defaults" on insert and
-- "leave unchanged" on update. `private` always forces pools_publicly = false.
drop function public.save_visit(uuid, date, smallint, text, jsonb);

create or replace function public.save_visit(
  p_place_id uuid,
  p_visited_on date,
  p_place_rating smallint,
  p_place_comment text,
  p_dishes jsonb default '[]'::jsonb,
  p_audience public.audience default null,
  p_pools_publicly boolean default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_visit_id uuid;
  v_dish jsonb;
  v_dish_id uuid;
  v_settings public.profile_settings;
  v_audience public.audience;
  v_pools boolean;
begin
  if p_visited_on > (now() at time zone 'Europe/Madrid')::date then
    raise exception 'visited_on cannot be in the future';
  end if;

  select * into v_settings from public.profile_settings where user_id = auth.uid();
  v_audience := coalesce(p_audience, v_settings.default_audience, 'followers');
  v_pools := case
    when v_audience = 'private' then false
    else coalesce(p_pools_publicly, v_settings.default_pools_publicly, true)
  end;

  insert into public.visits (user_id, place_id, visited_on, place_rating, place_comment, audience, pools_publicly)
  values (auth.uid(), p_place_id, p_visited_on, p_place_rating, p_place_comment, v_audience, v_pools)
  on conflict (user_id, place_id, visited_on)
  do update set
    place_rating = excluded.place_rating,
    place_comment = excluded.place_comment,
    audience = coalesce(p_audience, public.visits.audience),
    pools_publicly = case
      when coalesce(p_audience, public.visits.audience) = 'private' then false
      else coalesce(p_pools_publicly, public.visits.pools_publicly)
    end,
    updated_at = now()
  returning id into v_visit_id;

  for v_dish in select * from jsonb_array_elements(coalesce(p_dishes, '[]'::jsonb))
  loop
    if (v_dish->>'dish_id') is not null then
      v_dish_id := (v_dish->>'dish_id')::uuid;
    else
      insert into public.dishes (place_id, name, created_by)
      values (p_place_id, v_dish->>'dish_name', auth.uid())
      on conflict (place_id, name_normalized)
      do update set name = public.dishes.name
      returning id into v_dish_id;
    end if;

    insert into public.dish_reviews (visit_id, dish_id, idea, execution, flavor, would_repeat, comment)
    values (
      v_visit_id,
      v_dish_id,
      (v_dish->>'idea')::smallint,
      (v_dish->>'execution')::smallint,
      (v_dish->>'flavor')::smallint,
      (v_dish->>'would_repeat')::boolean,
      v_dish->>'comment'
    )
    on conflict (visit_id, dish_id)
    do update set
      idea = excluded.idea,
      execution = excluded.execution,
      flavor = excluded.flavor,
      would_repeat = excluded.would_repeat,
      comment = excluded.comment,
      updated_at = now();
  end loop;

  return v_visit_id;
end;
$$;

revoke execute on function public.save_visit(uuid, date, smallint, text, jsonb, public.audience, boolean) from public, anon;
grant execute on function public.save_visit(uuid, date, smallint, text, jsonb, public.audience, boolean) to authenticated;
