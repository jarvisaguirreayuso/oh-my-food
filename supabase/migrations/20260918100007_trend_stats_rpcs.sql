-- Trend & stats RPCs: recent vs. historical figures, and 90-vs-90-day trend
-- direction. Thresholds live in exactly these two functions so they can be
-- tuned from a single place (see README for how to change them).

create or replace function public.trend_min_n()
returns integer
language sql
immutable
as $$ select 5; $$;

create or replace function public.trend_delta_threshold()
returns numeric
language sql
immutable
as $$ select 0.2; $$;

-- place_trend: compares the last 90 days against the previous 90 days.
create or replace function public.place_trend(p_place_id uuid)
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
as $$
  with today as (select (now() at time zone 'Europe/Madrid')::date as d),
  current_window as (
    select avg(place_rating)::numeric as avg_rating, count(*)::int as n
    from public.visits, today
    where place_id = p_place_id and place_rating is not null
      and visited_on > today.d - 90 and visited_on <= today.d
  ),
  previous_window as (
    select avg(place_rating)::numeric as avg_rating, count(*)::int as n
    from public.visits, today
    where place_id = p_place_id and place_rating is not null
      and visited_on > today.d - 180 and visited_on <= today.d - 90
  )
  select
    round(c.avg_rating, 2) as current_avg,
    c.n as current_n,
    round(p.avg_rating, 2) as previous_avg,
    p.n as previous_n,
    round(c.avg_rating - p.avg_rating, 2) as delta,
    case
      when c.n < public.trend_min_n() or p.n < public.trend_min_n() then 'insufficient_data'
      when (c.avg_rating - p.avg_rating) >= public.trend_delta_threshold() then 'up'
      when (c.avg_rating - p.avg_rating) <= -public.trend_delta_threshold() then 'down'
      else 'stable'
    end as status
  from current_window c, previous_window p;
$$;

-- dish_trend: same 90-vs-90 comparison over the combined average of
-- idea/execution/flavor for the dish.
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
as $$
  with today as (select (now() at time zone 'Europe/Madrid')::date as d),
  scored as (
    select v.visited_on, ((dr.idea + dr.execution + dr.flavor) / 3.0) as score
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

-- place_stats: recent (last 12 months) headline figure + all-time historical figure.
create or replace function public.place_stats(p_place_id uuid)
returns table (
  recent_avg numeric,
  recent_n integer,
  historical_avg numeric,
  historical_n integer
)
language sql
stable
as $$
  with today as (select (now() at time zone 'Europe/Madrid')::date as d),
  recent as (
    select avg(place_rating)::numeric as avg_rating, count(*)::int as n
    from public.visits, today
    where place_id = p_place_id and place_rating is not null
      and visited_on > today.d - interval '12 months'
  ),
  historical as (
    select avg(place_rating)::numeric as avg_rating, count(*)::int as n
    from public.visits
    where place_id = p_place_id and place_rating is not null
  )
  select
    round(r.avg_rating, 2) as recent_avg,
    r.n as recent_n,
    round(h.avg_rating, 2) as historical_avg,
    h.n as historical_n
  from recent r, historical h;
$$;

-- dish_stats: recent (last 12 months) + all-time historical, per dimension.
create or replace function public.dish_stats(p_dish_id uuid)
returns table (
  recent_idea numeric,
  recent_execution numeric,
  recent_flavor numeric,
  recent_repeat_pct numeric,
  recent_n integer,
  historical_idea numeric,
  historical_execution numeric,
  historical_flavor numeric,
  historical_repeat_pct numeric,
  historical_n integer
)
language sql
stable
as $$
  with today as (select (now() at time zone 'Europe/Madrid')::date as d),
  recent as (
    select
      avg(dr.idea)::numeric as idea,
      avg(dr.execution)::numeric as execution,
      avg(dr.flavor)::numeric as flavor,
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
      avg(dr.flavor)::numeric as flavor,
      (100.0 * count(*) filter (where dr.would_repeat) / nullif(count(*), 0))::numeric as repeat_pct,
      count(*)::int as n
    from public.dish_reviews dr
    join public.visits v on v.id = dr.visit_id
    where dr.dish_id = p_dish_id
  )
  select
    round(r.idea, 2), round(r.execution, 2), round(r.flavor, 2), round(r.repeat_pct, 1), r.n,
    round(h.idea, 2), round(h.execution, 2), round(h.flavor, 2), round(h.repeat_pct, 1), h.n
  from recent r, historical h;
$$;

-- Ranks the dishes of a place by recent repeat %, recent flavor, or trend delta.
create or replace function public.dish_rankings_for_place(p_place_id uuid, p_order_by text default 'repeat')
returns table (
  dish_id uuid,
  dish_name text,
  recent_repeat_pct numeric,
  recent_flavor numeric,
  recent_n integer,
  trend_status text,
  trend_delta numeric
)
language sql
stable
as $$
  with dishes_in_place as (
    select id, name from public.dishes where place_id = p_place_id
  ),
  stats as (
    select
      d.id as dish_id,
      d.name as dish_name,
      s.recent_repeat_pct,
      s.recent_flavor,
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
    case when p_order_by = 'flavor' then recent_flavor end desc nulls last,
    case when p_order_by = 'trend' then trend_delta end desc nulls last,
    dish_name asc;
$$;

grant execute on function
  public.search_similar_dishes(uuid, text),
  public.search_places(text, double precision, double precision),
  public.place_timeseries(uuid, text, date, date),
  public.dish_timeseries(uuid, text, date, date),
  public.place_trend(uuid),
  public.dish_trend(uuid),
  public.place_stats(uuid),
  public.dish_stats(uuid),
  public.dish_rankings_for_place(uuid, text)
to anon, authenticated;
