-- Development seed data. NEVER run against production (this file is only
-- ever executed by `supabase db reset` / `supabase start` against the LOCAL
-- Docker stack, per supabase/config.toml -> [db.seed] sql_paths).
--
-- Creates 4 test users, 4 Madrid places (one improving, one declining, one
-- stable, one filler), a handful of dishes per place, and ~18 months of
-- synthetic visits + dish reviews so the trend/timeseries RPCs have
-- something meaningful to show.

do $$
declare
  v_user_ana uuid := '11111111-1111-1111-1111-111111111111';
  v_user_bruno uuid := '22222222-2222-2222-2222-222222222222';
  v_user_carla uuid := '33333333-3333-3333-3333-333333333333';
  v_user_david uuid := '44444444-4444-4444-4444-444444444444';
  v_users uuid[];

  v_place_improving uuid := 'aaaaaaaa-0001-0001-0001-000000000001';
  v_place_declining uuid := 'aaaaaaaa-0002-0002-0002-000000000002';
  v_place_stable    uuid := 'aaaaaaaa-0003-0003-0003-000000000003';
  v_place_filler    uuid := 'aaaaaaaa-0004-0004-0004-000000000004';

  v_month int;
  v_visit_idx int;
  v_visited_on date;
  v_user uuid;
  v_visit_id uuid;
  v_place_id uuid;
  v_base numeric;
  v_jitter numeric;
  v_rating int;
  v_dish record;
  v_dish_score int;
begin
  -- Deterministic jitter: without a fixed seed, `random()` differs on every
  -- `supabase db reset`, and the 90-day trend windows are thin enough
  -- (n~10) that jitter can occasionally push the improving/declining places'
  -- delta across the trend_delta_threshold() boundary, making
  -- tests/trends.test.ts flaky. Fixing the seed keeps the synthetic data
  -- reproducible while still looking "random".
  perform setseed(0.1);

  -- 1) Test users (minimal columns required by GoTrue's auth.users schema).
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, confirmation_token,
    recovery_token, email_change_token_new, email_change, is_sso_user
  )
  values
    ('00000000-0000-0000-0000-000000000000', v_user_ana, 'authenticated', 'authenticated', 'ana@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '', false),
    ('00000000-0000-0000-0000-000000000000', v_user_bruno, 'authenticated', 'authenticated', 'bruno@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '', false),
    ('00000000-0000-0000-0000-000000000000', v_user_carla, 'authenticated', 'authenticated', 'carla@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '', false),
    ('00000000-0000-0000-0000-000000000000', v_user_david, 'authenticated', 'authenticated', 'david@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '', false)
  on conflict (id) do nothing;

  update public.profiles set username = 'ana' where id = v_user_ana;
  update public.profiles set username = 'bruno' where id = v_user_bruno;
  update public.profiles set username = 'carla' where id = v_user_carla;
  update public.profiles set username = 'david' where id = v_user_david;

  v_users := array[v_user_ana, v_user_bruno, v_user_carla, v_user_david];

  -- 2) Places in Madrid.
  insert into public.places (id, name, type, address, lat, lng, created_by)
  values
    (v_place_improving, 'Casa Manolo', 'restaurant', 'Calle de la Cava Baja 12, Madrid', 40.4106, -3.7100, v_user_ana),
    (v_place_declining, 'Bocatería El Rápido', 'food_stall', 'Calle de Preciados 5, Madrid', 40.4187, -3.7040, v_user_bruno),
    (v_place_stable, 'Taco Volador', 'food_truck', 'Paseo del Prado 20, Madrid', 40.4145, -3.6934, v_user_carla),
    (v_place_filler, 'Mercado de la Paella', 'market_stall', 'Plaza Mayor 1, Madrid', 40.4155, -3.7074, v_user_david)
  on conflict (id) do nothing;

  -- 3) Dishes per place.
  insert into public.dishes (place_id, name, description, created_by) values
    (v_place_improving, 'Cocido madrileño', 'Cocido tradicional en tres vuelcos', v_user_ana),
    (v_place_improving, 'Croquetas de jamón', 'Croquetas caseras', v_user_bruno),
    (v_place_declining, 'Bocadillo de calamares', 'Clásico bocata madrileño', v_user_bruno),
    (v_place_declining, 'Patatas bravas', 'Con salsa brava casera', v_user_carla),
    (v_place_stable, 'Taco al pastor', 'Cerdo marinado con piña', v_user_carla),
    (v_place_stable, 'Quesadilla de birria', 'Con consomé para mojar', v_user_david),
    (v_place_filler, 'Paella mixta', 'Marisco y pollo', v_user_david)
  on conflict (place_id, name_normalized) do nothing;

  -- 4) ~18 months of visits + dish reviews per place, with distinct trends.
  for v_month in 0..17 loop
    for v_visit_idx in 0..2 loop
      v_user := v_users[1 + ((v_month * 3 + v_visit_idx) % 4)];
      v_visited_on := (date_trunc('month', now()) - ((17 - v_month) || ' months')::interval)::date
                       + ((3 + v_visit_idx * 9) || ' days')::interval;
      if v_visited_on > current_date then
        v_visited_on := current_date;
      end if;

      -- Place A: improving over time (3.3 -> 4.7).
      v_place_id := v_place_improving;
      v_base := 3.3 + (v_month / 17.0) * 1.4;
      v_jitter := (random() - 0.5) * 0.8;
      v_rating := greatest(1, least(5, round(v_base + v_jitter)));
      insert into public.visits (user_id, place_id, visited_on, place_rating, place_comment)
      values (v_user, v_place_id, v_visited_on, v_rating, 'Visita de prueba (seed)')
      on conflict (user_id, place_id, visited_on) do nothing
      returning id into v_visit_id;
      if v_visit_id is not null then
        for v_dish in select id from public.dishes where place_id = v_place_id loop
          v_dish_score := greatest(1, least(5, round(v_base + (random() - 0.5) * 0.8)));
          insert into public.dish_reviews (visit_id, dish_id, idea, execution, would_repeat, comment)
          values (v_visit_id, v_dish.id, v_dish_score, v_dish_score, v_dish_score >= 4, null)
          on conflict (visit_id, dish_id) do nothing;
        end loop;
      end if;
      v_visit_id := null;

      -- Place B: declining over time (4.7 -> 3.1).
      v_place_id := v_place_declining;
      v_base := 4.7 - (v_month / 17.0) * 1.6;
      v_jitter := (random() - 0.5) * 0.8;
      v_rating := greatest(1, least(5, round(v_base + v_jitter)));
      insert into public.visits (user_id, place_id, visited_on, place_rating, place_comment)
      values (v_user, v_place_id, v_visited_on, v_rating, 'Visita de prueba (seed)')
      on conflict (user_id, place_id, visited_on) do nothing
      returning id into v_visit_id;
      if v_visit_id is not null then
        for v_dish in select id from public.dishes where place_id = v_place_id loop
          v_dish_score := greatest(1, least(5, round(v_base + (random() - 0.5) * 0.8)));
          insert into public.dish_reviews (visit_id, dish_id, idea, execution, would_repeat, comment)
          values (v_visit_id, v_dish.id, v_dish_score, v_dish_score, v_dish_score >= 4, null)
          on conflict (visit_id, dish_id) do nothing;
        end loop;
      end if;
      v_visit_id := null;

      -- Place C: stable around 4.0.
      v_place_id := v_place_stable;
      v_base := 4.0;
      v_jitter := (random() - 0.5) * 0.6;
      v_rating := greatest(1, least(5, round(v_base + v_jitter)));
      insert into public.visits (user_id, place_id, visited_on, place_rating, place_comment)
      values (v_user, v_place_id, v_visited_on, v_rating, 'Visita de prueba (seed)')
      on conflict (user_id, place_id, visited_on) do nothing
      returning id into v_visit_id;
      if v_visit_id is not null then
        for v_dish in select id from public.dishes where place_id = v_place_id loop
          v_dish_score := greatest(1, least(5, round(v_base + (random() - 0.5) * 0.6)));
          insert into public.dish_reviews (visit_id, dish_id, idea, execution, would_repeat, comment)
          values (v_visit_id, v_dish.id, v_dish_score, v_dish_score, v_dish_score >= 4, null)
          on conflict (visit_id, dish_id) do nothing;
        end loop;
      end if;
      v_visit_id := null;
    end loop;

    -- Place D (filler): only one sparser visit every 3 months, stable-ish.
    if v_month % 3 = 0 then
      v_user := v_users[1 + (v_month % 4)];
      v_visited_on := (date_trunc('month', now()) - ((17 - v_month) || ' months')::interval)::date + interval '10 days';
      if v_visited_on > current_date then
        v_visited_on := current_date;
      end if;
      v_rating := greatest(1, least(5, round(3.8 + (random() - 0.5) * 0.8)));
      insert into public.visits (user_id, place_id, visited_on, place_rating, place_comment)
      values (v_user, v_place_filler, v_visited_on, v_rating, 'Visita de prueba (seed)')
      on conflict (user_id, place_id, visited_on) do nothing
      returning id into v_visit_id;
      if v_visit_id is not null then
        for v_dish in select id from public.dishes where place_id = v_place_filler loop
          v_dish_score := greatest(1, least(5, round(3.8 + (random() - 0.5) * 0.8)));
          insert into public.dish_reviews (visit_id, dish_id, idea, execution, would_repeat, comment)
          values (v_visit_id, v_dish.id, v_dish_score, v_dish_score, v_dish_score >= 4, null)
          on conflict (visit_id, dish_id) do nothing;
        end loop;
      end if;
      v_visit_id := null;
    end if;
  end loop;
end $$;

-- Social seed. Seed visits are public so the trend tests (which read through
-- RLS) keep seeing them, and there is a small follow graph to exercise the
-- audiences: ana <-> bruno are mutual, carla follows ana, ana follows david,
-- and nobody follows carla or bruno-only-ish otherwise.
update public.visits set audience = 'public';

insert into public.follows (follower_id, followee_id) values
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444')
on conflict do nothing;
