-- Search RPCs: fuzzy dish suggestions within a place, and place search
-- ranked by text similarity and/or proximity.

set extra_float_digits = -3;

-- Suggests existing dishes at a place similar to a free-text query, to avoid
-- creating near-duplicate dishes ("¿te refieres a...?").
create or replace function public.search_similar_dishes(p_place_id uuid, p_query text)
returns table (
  id uuid,
  name text,
  similarity real
)
language sql
stable
as $$
  select d.id, d.name, similarity(d.name_normalized, public.normalize_text(p_query)) as similarity
  from public.dishes d
  where d.place_id = p_place_id
    and similarity(d.name_normalized, public.normalize_text(p_query)) > 0.2
  order by similarity desc
  limit 10;
$$;

-- Searches places by name similarity, optionally boosted/ordered by
-- proximity to a given lat/lng (plain haversine, no PostGIS required).
create or replace function public.search_places(p_query text default null, p_lat double precision default null, p_lng double precision default null)
returns table (
  id uuid,
  name text,
  type public.place_type,
  address text,
  lat double precision,
  lng double precision,
  similarity real,
  distance_km double precision
)
language sql
stable
as $$
  with base as (
    select
      p.id,
      p.name,
      p.type,
      p.address,
      p.lat,
      p.lng,
      case
        when p_query is null or length(trim(p_query)) = 0 then null
        else similarity(p.name_normalized, public.normalize_text(p_query))
      end as similarity,
      case
        when p_lat is null or p_lng is null or p.lat is null or p.lng is null then null
        else (
          6371 * acos(
            least(1.0, greatest(-1.0,
              cos(radians(p_lat)) * cos(radians(p.lat)) * cos(radians(p.lng) - radians(p_lng))
              + sin(radians(p_lat)) * sin(radians(p.lat))
            ))
          )
        )
      end as distance_km
    from public.places p
    where p_query is null or length(trim(p_query)) = 0
      or similarity(p.name_normalized, public.normalize_text(p_query)) > 0.15
  )
  select * from base
  order by
    case when p_query is not null and length(trim(p_query)) > 0 then similarity end desc nulls last,
    case when p_lat is not null and p_lng is not null then distance_km end asc nulls last,
    name asc
  limit 50;
$$;
