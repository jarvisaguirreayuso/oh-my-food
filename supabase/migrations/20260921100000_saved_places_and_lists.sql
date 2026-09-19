-- Saved places ("quiero ir") and personal place lists (docs/plan-fase-2-social.md, F3).
--
-- Two different concepts on purpose:
--   * saved_places: a *state* ("I want to go"). "Visited" is not stored, it is
--     derived from the user's own visits.
--   * place_lists / place_list_items: membership of a themed collection
--     ("Pasta", "Para llevar a mis padres").
-- Keeping them apart lets the map filter by state and by collection independently.
--
-- Everything here is private to its owner. Sharing lists (with the same audience
-- rule as visits) is a later step, so there is no visibility column yet.

create table public.saved_places (
  user_id uuid not null references public.profiles (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  note text check (note is null or length(note) <= 280),
  saved_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

create table public.place_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.place_list_items (
  list_id uuid not null references public.place_lists (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, place_id)
);
create index place_list_items_place_id_idx on public.place_list_items (place_id);

alter table public.saved_places enable row level security;
alter table public.place_lists enable row level security;
alter table public.place_list_items enable row level security;

create policy "saved_places_select_own" on public.saved_places
  for select to authenticated using (user_id = (select auth.uid()));
create policy "saved_places_insert_own" on public.saved_places
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "saved_places_update_own" on public.saved_places
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "saved_places_delete_own" on public.saved_places
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "place_lists_select_own" on public.place_lists
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "place_lists_insert_own" on public.place_lists
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "place_lists_update_own" on public.place_lists
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "place_lists_delete_own" on public.place_lists
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Items are reachable only through a list you own. The EXISTS runs as the caller,
-- so it is itself filtered by place_lists_select_own.
create policy "place_list_items_select_own" on public.place_list_items
  for select to authenticated
  using (exists (select 1 from public.place_lists l where l.id = place_list_items.list_id));
create policy "place_list_items_insert_own" on public.place_list_items
  for insert to authenticated
  with check (exists (select 1 from public.place_lists l where l.id = place_list_items.list_id));
create policy "place_list_items_delete_own" on public.place_list_items
  for delete to authenticated
  using (exists (select 1 from public.place_lists l where l.id = place_list_items.list_id));

-- Minimum privileges (anon gets nothing). Lists can be renamed, list items can't be updated.
grant select, insert, update, delete on public.saved_places to authenticated;
grant select, insert, delete on public.place_lists to authenticated;
grant update (name) on public.place_lists to authenticated;
grant select, insert, delete on public.place_list_items to authenticated;
