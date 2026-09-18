-- Triggers: profile auto-creation, updated_at bookkeeping,
-- dish/place-visit consistency, and immutability of critical fields.

-- 1) Auto-create a profile when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    'user_' || left(replace(new.id::text, '-', ''), 12)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) Generic updated_at bookkeeping.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger visits_set_updated_at
  before update on public.visits
  for each row execute function public.set_updated_at();

create trigger dish_reviews_set_updated_at
  before update on public.dish_reviews
  for each row execute function public.set_updated_at();

-- 3) A dish_review's dish must belong to the same place as its visit.
create or replace function public.check_dish_review_place_match()
returns trigger
language plpgsql
as $$
declare
  v_place_id uuid;
  d_place_id uuid;
begin
  select place_id into v_place_id from public.visits where id = new.visit_id;
  select place_id into d_place_id from public.dishes where id = new.dish_id;

  if v_place_id is null then
    raise exception 'visit % does not exist', new.visit_id;
  end if;

  if d_place_id is null then
    raise exception 'dish % does not exist', new.dish_id;
  end if;

  if v_place_id <> d_place_id then
    raise exception 'dish % does not belong to the same place as visit %', new.dish_id, new.visit_id;
  end if;

  return new;
end;
$$;

create trigger dish_reviews_check_place_match
  before insert or update on public.dish_reviews
  for each row execute function public.check_dish_review_place_match();

-- 4) Prevent editing critical/immutable fields on places and dishes.
create or replace function public.prevent_place_critical_edits()
returns trigger
language plpgsql
as $$
begin
  new.id := old.id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger places_prevent_critical_edits
  before update on public.places
  for each row execute function public.prevent_place_critical_edits();

create or replace function public.prevent_dish_critical_edits()
returns trigger
language plpgsql
as $$
begin
  new.id := old.id;
  new.place_id := old.place_id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger dishes_prevent_critical_edits
  before update on public.dishes
  for each row execute function public.prevent_dish_critical_edits();
