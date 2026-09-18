-- Timeseries RPCs: per-period aggregates with true gaps (no zero-filling)
-- and a 3-period moving average computed only across periods with data.

create or replace function public._period_step(p_granularity text)
returns interval
language sql
immutable
as $$
  select case p_granularity
    when 'month' then interval '1 month'
    when 'quarter' then interval '3 months'
    else null
  end;
$$;

create or replace function public.place_timeseries(p_place_id uuid, p_granularity text, p_from date, p_to date)
returns table (
  period_start date,
  avg_rating numeric,
  n integer,
  moving_avg_3 numeric
)
language sql
stable
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
      avg(v.place_rating)::numeric as avg_rating,
      count(*)::int as n
    from public.visits v
    where v.place_id = p_place_id
      and v.place_rating is not null
      and v.visited_on >= p_from
      and v.visited_on <= p_to
    group by 1
  ),
  joined as (
    select p.period_start, a.avg_rating, coalesce(a.n, 0) as n
    from periods p
    left join agg a using (period_start)
  ),
  with_data as (
    select
      period_start,
      avg_rating,
      avg(avg_rating) over (order by period_start rows between 2 preceding and current row) as moving_avg_3
    from joined
    where avg_rating is not null
  )
  select
    j.period_start,
    round(j.avg_rating, 2) as avg_rating,
    j.n,
    round(w.moving_avg_3, 2) as moving_avg_3
  from joined j
  left join with_data w using (period_start)
  order by j.period_start;
$$;

create or replace function public.dish_timeseries(p_dish_id uuid, p_granularity text, p_from date, p_to date)
returns table (
  period_start date,
  avg_idea numeric,
  avg_execution numeric,
  avg_flavor numeric,
  repeat_pct numeric,
  n integer,
  moving_avg_idea numeric,
  moving_avg_execution numeric,
  moving_avg_flavor numeric,
  moving_avg_repeat_pct numeric
)
language sql
stable
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
      avg(dr.flavor)::numeric as avg_flavor,
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
    select p.period_start, a.avg_idea, a.avg_execution, a.avg_flavor, a.repeat_pct, coalesce(a.n, 0) as n
    from periods p
    left join agg a using (period_start)
  ),
  with_data as (
    select
      period_start,
      avg_idea,
      avg_execution,
      avg_flavor,
      repeat_pct,
      avg(avg_idea) over w as moving_avg_idea,
      avg(avg_execution) over w as moving_avg_execution,
      avg(avg_flavor) over w as moving_avg_flavor,
      avg(repeat_pct) over w as moving_avg_repeat_pct
    from joined
    where n > 0
    window w as (order by period_start rows between 2 preceding and current row)
  )
  select
    j.period_start,
    round(j.avg_idea, 2) as avg_idea,
    round(j.avg_execution, 2) as avg_execution,
    round(j.avg_flavor, 2) as avg_flavor,
    round(j.repeat_pct, 1) as repeat_pct,
    j.n,
    round(w.moving_avg_idea, 2) as moving_avg_idea,
    round(w.moving_avg_execution, 2) as moving_avg_execution,
    round(w.moving_avg_flavor, 2) as moving_avg_flavor,
    round(w.moving_avg_repeat_pct, 1) as moving_avg_repeat_pct
  from joined j
  left join with_data w using (period_start)
  order by j.period_start;
$$;
