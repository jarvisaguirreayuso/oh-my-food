-- Each dish already has a single, crowd-sourced, immutable photo (dishes.photo_url,
-- set once via set_dish_photo). This adds a *personal* photo per review: the photo
-- a specific person took on their own visit, so "what did this person eat" can show
-- their actual picture instead of only the dish's generic one.
--
-- No new RLS policies needed: dish_reviews_select_via_visit already scopes reads to
-- whatever the reviewer's visit.audience allows (the EXISTS subquery is itself
-- filtered by visits' own RLS), and dish_reviews_insert_own/update_own already let
-- the visit's owner write any column on their own reviews -- the new column is
-- covered by those same policies automatically.

alter table public.dish_reviews add column photo_url text;

-- save_visit gains photo_url per dish item in the jsonb payload. Same signature,
-- only the upsert body changes -- unlike dishes' photo (fixed once, never
-- replaced), a review's own photo can be set/changed/cleared on every save, just
-- like idea/execution/comment.
create or replace function public.save_visit(
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

    insert into public.dish_reviews (visit_id, dish_id, idea, execution, would_repeat, comment, photo_url)
    values (
      v_visit_id,
      v_dish_id,
      (v_dish->>'idea')::smallint,
      (v_dish->>'execution')::smallint,
      (v_dish->>'would_repeat')::boolean,
      v_dish->>'comment',
      v_dish->>'photo_url'
    )
    on conflict (visit_id, dish_id)
    do update set
      idea = excluded.idea,
      execution = excluded.execution,
      would_repeat = excluded.would_repeat,
      comment = excluded.comment,
      photo_url = excluded.photo_url,
      updated_at = now();
  end loop;

  return v_visit_id;
end;
$$;

revoke execute on function public.save_visit(uuid, date, smallint, text, jsonb, public.audience) from public, anon;
grant execute on function public.save_visit(uuid, date, smallint, text, jsonb, public.audience) to authenticated;
