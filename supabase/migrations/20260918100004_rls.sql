-- Row Level Security: public read, authenticated writes scoped to the owner.

alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.dishes enable row level security;
alter table public.visits enable row level security;
alter table public.dish_reviews enable row level security;

-- profiles: public read, users may only update their own profile.
-- Row creation happens exclusively via the handle_new_user trigger (security definer).
create policy "profiles_select_public" on public.profiles
  for select using (true);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- places: public read, authenticated insert, creator-only update, no client delete.
create policy "places_select_public" on public.places
  for select using (true);

create policy "places_insert_authenticated" on public.places
  for insert to authenticated with check (created_by = auth.uid());

create policy "places_update_own" on public.places
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- dishes: public read, authenticated insert, creator-only update, no client delete.
create policy "dishes_select_public" on public.dishes
  for select using (true);

create policy "dishes_insert_authenticated" on public.dishes
  for insert to authenticated with check (created_by = auth.uid());

create policy "dishes_update_own" on public.dishes
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- visits: public read, owner-only write/update/delete.
create policy "visits_select_public" on public.visits
  for select using (true);

create policy "visits_insert_own" on public.visits
  for insert to authenticated with check (user_id = auth.uid());

create policy "visits_update_own" on public.visits
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "visits_delete_own" on public.visits
  for delete to authenticated using (user_id = auth.uid());

-- dish_reviews: public read, write only through the owning visit.
create policy "dish_reviews_select_public" on public.dish_reviews
  for select using (true);

create policy "dish_reviews_insert_own" on public.dish_reviews
  for insert to authenticated with check (
    exists (
      select 1 from public.visits v
      where v.id = visit_id and v.user_id = auth.uid()
    )
  );

create policy "dish_reviews_update_own" on public.dish_reviews
  for update to authenticated
  using (
    exists (
      select 1 from public.visits v
      where v.id = visit_id and v.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.visits v
      where v.id = visit_id and v.user_id = auth.uid()
    )
  );

create policy "dish_reviews_delete_own" on public.dish_reviews
  for delete to authenticated using (
    exists (
      select 1 from public.visits v
      where v.id = visit_id and v.user_id = auth.uid()
    )
  );

-- Explicit grants (RLS still governs row visibility/writability).
grant usage on schema public to anon, authenticated;

grant select on public.profiles, public.places, public.dishes, public.visits, public.dish_reviews
  to anon, authenticated;

grant update (username, avatar_url) on public.profiles to authenticated;
grant insert, update on public.places to authenticated;
grant insert, update on public.dishes to authenticated;
grant insert, update, delete on public.visits to authenticated;
grant insert, update, delete on public.dish_reviews to authenticated;
