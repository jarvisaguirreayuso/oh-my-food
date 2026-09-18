-- save_visit: creates/updates a visit and all its dish_reviews atomically.
-- Runs as SECURITY INVOKER (default) so normal RLS policies apply using the
-- caller's auth.uid() -- the whole function body executes in a single
-- transaction, so either everything is saved or nothing is.
--
-- p_dishes shape (jsonb array), one element per dish reviewed in the visit:
--   { "dish_id": "<uuid>" | null, "dish_name": "<text>" (used when dish_id is null),
--     "idea": 1-5, "execution": 1-5, "flavor": 1-5, "would_repeat": bool,
--     "comment": "<text>" | null }
create or replace function public.save_visit(
  p_place_id uuid,
  p_visited_on date,
  p_place_rating smallint,
  p_place_comment text,
  p_dishes jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_visit_id uuid;
  v_dish jsonb;
  v_dish_id uuid;
begin
  if p_visited_on > (now() at time zone 'Europe/Madrid')::date then
    raise exception 'visited_on cannot be in the future';
  end if;

  insert into public.visits (user_id, place_id, visited_on, place_rating, place_comment)
  values (auth.uid(), p_place_id, p_visited_on, p_place_rating, p_place_comment)
  on conflict (user_id, place_id, visited_on)
  do update set
    place_rating = excluded.place_rating,
    place_comment = excluded.place_comment,
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

grant execute on function public.save_visit(uuid, date, smallint, text, jsonb) to authenticated;
