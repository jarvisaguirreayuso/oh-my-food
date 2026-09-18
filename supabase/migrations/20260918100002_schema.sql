-- Core schema: profiles, places, dishes, visits, dish_reviews

create type public.place_type as enum ('restaurant', 'food_stall', 'food_truck', 'market_stall', 'other');

-- profiles ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  avatar_url text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Public profile for each authenticated user, created automatically on signup.';

-- places ---------------------------------------------------------------
create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  name_normalized text generated always as (public.normalize_text(name)) stored,
  type public.place_type not null default 'restaurant',
  address text,
  lat double precision check (lat is null or (lat >= -90 and lat <= 90)),
  lng double precision check (lng is null or (lng >= -180 and lng <= 180)),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index places_name_trgm_idx on public.places using gin (name_normalized gin_trgm_ops);

-- dishes -----------------------------------------------------------------
create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id),
  name text not null check (length(trim(name)) > 0),
  name_normalized text generated always as (public.normalize_text(name)) stored,
  description text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (place_id, name_normalized)
);

create index dishes_place_id_idx on public.dishes (place_id);
create index dishes_name_trgm_idx on public.dishes using gin (name_normalized gin_trgm_ops);

-- visits -------------------------------------------------------------------
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  place_id uuid not null references public.places (id),
  visited_on date not null default ((now() at time zone 'Europe/Madrid')::date),
  place_rating smallint check (place_rating is null or (place_rating between 1 and 5)),
  place_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, place_id, visited_on),
  constraint visits_not_future check (visited_on <= (now() at time zone 'Europe/Madrid')::date)
);

create index visits_place_id_visited_on_idx on public.visits (place_id, visited_on);
create index visits_user_id_idx on public.visits (user_id);

-- dish_reviews ---------------------------------------------------------------
create table public.dish_reviews (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits (id) on delete cascade,
  dish_id uuid not null references public.dishes (id),
  idea smallint not null check (idea between 1 and 5),
  execution smallint not null check (execution between 1 and 5),
  flavor smallint not null check (flavor between 1 and 5),
  would_repeat boolean not null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (visit_id, dish_id)
);

create index dish_reviews_dish_id_idx on public.dish_reviews (dish_id);
create index dish_reviews_visit_id_idx on public.dish_reviews (visit_id);
