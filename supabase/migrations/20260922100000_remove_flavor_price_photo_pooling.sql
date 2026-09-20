-- Product changes:
--   * Drop "Sabor" (flavor) as a rating criterion. Dishes are now rated on
--     idea + execution only (the UI replaces the circular 1-5 selector with
--     a "barriguita" icon selector, no DB impact from that part).
--   * Dishes get an optional price and a single photo (set once, never
--     replaced -- see set_dish_photo below).
--   * "Counts in the general average" stops being a user choice: every visit
--     pools publicly unless it is private. pools_publicly becomes a generated
--     column instead of user input, and profile_settings loses the matching
--     default.

-- 1) Drop flavor -------------------------------------------------------------
alter table public.dish_reviews drop column flavor;

drop function public.dish_general_scores(uuid[]);
create function public.dish_general_scores(p_dish_ids uuid[])
returns table (
  dish_id uuid,
  avg_idea numeric,
  avg_execution numeric,
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
         round(100.0 * avg(case when r.would_repeat then 1 else 0 end)::numeric, 1),
         count(*)::int
  from public.dish_reviews r
  join public.visits v on v.id = r.visit_id
  where cardinality(p_dish_ids) <= 200
    and r.dish_id = any(p_dish_ids)
    and v.pools_publicly
  group by r.dish_id
$$;
revoke all on function public.dish_general_scores(uuid[]) from public;
grant execute on function public.dish_general_scores(uuid[]) to anon, authenticated;

drop function public.dish_stats(uuid);
create function public.dish_stats(p_dish_id uuid)
returns table (
  recent_idea numeric,
  recent_execution numeric,
  recent_repeat_pct numeric,
  recent_n integer,
  historical_idea numeric,
  historical_execution numeric,
  historical_repeat_pct numeric,
  historical_n integer
)
language sql
stable
set search_path = public
as $$
  with today as (select (now() at time zone 'Europe/Madrid')::date as d),
  recent as (
    select
      avg(dr.idea)::numeric as idea,
      avg(dr.execution)::numeric as execution,
      (100.0 * count(*) filter (where dr.would_repeat) / nullif(count(*), 0))::numeric as repeat_pct,
      count(*)::int as n
    from public.dish_reviews dr
    join public.visits v on v.id = dr.visit_id
    cross join today
    where dr.dish_id = p_dish_id
      and v.visited_on > today.d - interval '12 months'
  ),
  historical as (
    select
      avg(dr.idea)::numeric as idea,
      avg(dr.execution)::numeric as execution,
      (100.0 * count(*) filter (where dr.would_repeat) / nullif(count(*), 0))::numeric as repeat_pct,
      count(*)::int as n
    from public.dish_reviews dr
    join public.visits v on v.id = dr.visit_id
    where dr.dish_id = p_dish_id
  )
  select
    round(r.idea, 2), round(r.execution, 2), round(r.repeat_pct, 1), r.n,
    round(h.idea, 2), round(h.execution, 2), round(h.repeat_pct, 1), h.n
  from recent r, historical h;
$$;
grant execute on function public.dish_stats(uuid) to anon, authenticated;

-- dish_trend keeps its return shape; only the scoring formula changes.
create or replace function public.dish_trend(p_dish_id uuid)
returns table (
  current_avg numeric,
  current_n integer,
  previous_avg numeric,
  previous_n integer,
  delta numeric,
  status text
)
language sql
stable
set search_path = public
as $$
  with today as (select (now() at time zone 'Europe/Madrid')::date as d),
  scored as (
    select v.visited_on, ((dr.idea + dr.execution) / 2.0) as score
    from public.dish_reviews dr
    join public.visits v on v.id = dr.visit_id
    where dr.dish_id = p_dish_id
  ),
  current_window as (
    select avg(score)::numeric as avg_score, count(*)::int as n
    from scored, today
    where visited_on > today.d - 90 and visited_on <= today.d
  ),
  previous_window as (
    select avg(score)::numeric as avg_score, count(*)::int as n
    from scored, today
    where visited_on > today.d - 180 and visited_on <= today.d - 90
  )
  select
    round(c.avg_score, 2) as current_avg,
    c.n as current_n,
    round(p.avg_score, 2) as previous_avg,
    p.n as previous_n,
    round(c.avg_score - p.avg_score, 2) as delta,
    case
      when c.n < public.trend_min_n() or p.n < public.trend_min_n() then 'insufficient_data'
      when (c.avg_score - p.avg_score) >= public.trend_delta_threshold() then 'up'
      when (c.avg_score - p.avg_score) <= -public.trend_delta_threshold() then 'down'
      else 'stable'
    end as status
  from current_window c, previous_window p;
$$;
grant execute on function public.dish_trend(uuid) to anon, authenticated;

drop function public.dish_timeseries(uuid, text, date, date);
create function public.dish_timeseries(p_dish_id uuid, p_granularity text, p_from date, p_to date)
returns table (
  period_start date,
  avg_idea numeric,
  avg_execution numeric,
  repeat_pct numeric,
  n integer,
  moving_avg_idea numeric,
  moving_avg_execution numeric,
  moving_avg_repeat_pct numeric
)
language sql
stable
set search_path = public
as $$
  with step as (
    select public._period_step(p_granularity) as s
  ),
  periods as (
    select generate_series(
      date_trunc(p_granularity, p_from)::date,
      date_trunc(p_granularity, p_to)::date,
      (select s from step)
    )::date as period_start
  ),
  agg as (
    select
      date_trunc(p_granularity, v.visited_on)::date as period_start,
      avg(dr.idea)::numeric as avg_idea,
      avg(dr.execution)::numeric as avg_execution,
      (100.0 * count(*) filter (where dr.would_repeat) / count(*))::numeric as repeat_pct,
      count(*)::int as n
    from public.dish_reviews dr
    join public.visits v on v.id = dr.visit_id
    where dr.dish_id = p_dish_id
      and v.visited_on >= p_from
      and v.visited_on <= p_to
    group by 1
  ),
  joined as (
    select p.period_start, a.avg_idea, a.avg_execution, a.repeat_pct, coalesce(a.n, 0) as n
    from periods p
    left join agg a using (period_start)
  ),
  with_data as (
    select
      period_start,
      avg_idea,
      avg_execution,
      repeat_pct,
      avg(avg_idea) over w as moving_avg_idea,
      avg(avg_execution) over w as moving_avg_execution,
      avg(repeat_pct) over w as moving_avg_repeat_pct
    from joined
    where n > 0
    window w as (order by period_start rows between 2 preceding and current row)
  )
  select
    j.period_start,
    round(j.avg_idea, 2) as avg_idea,
    round(j.avg_execution, 2) as avg_execution,
    round(j.repeat_pct, 1) as repeat_pct,
    j.n,
    round(w.moving_avg_idea, 2) as moving_avg_idea,
    round(w.moving_avg_execution, 2) as moving_avg_execution,
    round(w.moving_avg_repeat_pct, 1) as moving_avg_repeat_pct
  from joined j
  left join with_data w using (period_start)
  order by j.period_start;
$$;
grant execute on function public.dish_timeseries(uuid, text, date, date) to anon, authenticated;

-- recent_flavor becomes recent_score (avg of idea/execution); 'flavor' order
-- option becomes 'score' ("Barriguitas" in the UI).
drop function public.dish_rankings_for_place(uuid, text);
create function public.dish_rankings_for_place(p_place_id uuid, p_order_by text default 'repeat')
returns table (
  dish_id uuid,
  dish_name text,
  recent_repeat_pct numeric,
  recent_score numeric,
  recent_n integer,
  trend_status text,
  trend_delta numeric
)
language sql
stable
set search_path = public
as $$
  with dishes_in_place as (
    select id, name from public.dishes where place_id = p_place_id
  ),
  stats as (
    select
      d.id as dish_id,
      d.name as dish_name,
      s.recent_repeat_pct,
      round(((s.recent_idea + s.recent_execution) / 2.0)::numeric, 2) as recent_score,
      s.recent_n,
      t.status as trend_status,
      t.delta as trend_delta
    from dishes_in_place d
    cross join lateral public.dish_stats(d.id) s
    cross join lateral public.dish_trend(d.id) t
  )
  select * from stats
  order by
    case when p_order_by = 'repeat' then recent_repeat_pct end desc nulls last,
    case when p_order_by = 'score' then recent_score end desc nulls last,
    case when p_order_by = 'trend' then trend_delta end desc nulls last,
    dish_name asc;
$$;
grant execute on function public.dish_rankings_for_place(uuid, text) to anon, authenticated;

-- 2) pools_publicly stops being user input --------------------------------
-- Every visit counts towards the general average unless it's private.
alter table public.visits drop constraint visits_private_never_pools;
alter table public.visits drop column pools_publicly;
alter table public.visits add column pools_publicly boolean generated always as (audience <> 'private') stored;

alter table public.profile_settings drop constraint profile_settings_private_never_pools;
alter table public.profile_settings drop column default_pools_publicly;

-- save_visit loses p_pools_publicly (auto-derived now) and flavor, gains an
-- optional price used only when a dish is created for the first time.
drop function public.save_visit(uuid, date, smallint, text, jsonb, public.audience, boolean);

create function public.save_visit(
  p_place_id uuid,
  p_visited_on date,
  p_place_rating smallint,
  p_place_comment text,
  p_dishes jsonb default '[]'::jsonb,
  p_audience public.audience default null
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
begin
  if p_visited_on > (now() at time zone 'Europe/Madrid')::date then
    raise exception 'visited_on cannot be in the future';
  end if;

  select * into v_settings from public.profile_settings where user_id = auth.uid();
  v_audience := coalesce(p_audience, v_settings.default_audience, 'followers');

  insert into public.visits (user_id, place_id, visited_on, place_rating, place_comment, audience)
  values (auth.uid(), p_place_id, p_visited_on, p_place_rating, p_place_comment, v_audience)
  on conflict (user_id, place_id, visited_on)
  do update set
    place_rating = excluded.place_rating,
    place_comment = excluded.place_comment,
    audience = coalesce(p_audience, public.visits.audience),
    updated_at = now()
  returning id into v_visit_id;

  for v_dish in select * from jsonb_array_elements(coalesce(p_dishes, '[]'::jsonb))
  loop
    if (v_dish->>'dish_id') is not null then
      v_dish_id := (v_dish->>'dish_id')::uuid;
    else
      insert into public.dishes (place_id, name, price, created_by)
      values (p_place_id, v_dish->>'dish_name', (v_dish->>'price')::numeric, auth.uid())
      on conflict (place_id, name_normalized)
      do update set name = public.dishes.name
      returning id into v_dish_id;
    end if;

    insert into public.dish_reviews (visit_id, dish_id, idea, execution, would_repeat, comment)
    values (
      v_visit_id,
      v_dish_id,
      (v_dish->>'idea')::smallint,
      (v_dish->>'execution')::smallint,
      (v_dish->>'would_repeat')::boolean,
      v_dish->>'comment'
    )
    on conflict (visit_id, dish_id)
    do update set
      idea = excluded.idea,
      execution = excluded.execution,
      would_repeat = excluded.would_repeat,
      comment = excluded.comment,
      updated_at = now();
  end loop;

  return v_visit_id;
end;
$$;

revoke execute on function public.save_visit(uuid, date, smallint, text, jsonb, public.audience) from public, anon;
grant execute on function public.save_visit(uuid, date, smallint, text, jsonb, public.audience) to authenticated;

-- 3) Dish price + single photo ----------------------------------------------
alter table public.dishes
  add column price numeric(6,2) check (price is null or price >= 0),
  add column photo_url text;

-- Anyone signed in may set a dish's photo, but only once: the WHERE clause
-- means a second call is a silent no-op, never an overwrite. SECURITY
-- DEFINER + a narrow, single-column body keeps this safe without touching
-- dishes' broader update grants (which stay owner-only).
create function public.set_dish_photo(p_dish_id uuid, p_photo_url text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.dishes
  set photo_url = p_photo_url
  where id = p_dish_id
    and photo_url is null
    and p_photo_url is not null
    and length(p_photo_url) <= 500;
$$;

revoke all on function public.set_dish_photo(uuid, text) from public, anon;
grant execute on function public.set_dish_photo(uuid, text) to authenticated;

-- Small public bucket for the one photo per dish. Client-side compression
-- keeps uploads tiny; the bucket limit is just a hard backstop.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dish-photos', 'dish-photos', true, 307200, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "dish_photos_public_read" on storage.objects
  for select using (bucket_id = 'dish-photos');

create policy "dish_photos_authenticated_upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'dish-photos');
