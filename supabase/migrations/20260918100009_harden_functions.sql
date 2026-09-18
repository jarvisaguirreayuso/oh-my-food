-- Security hardening flagged by the Supabase linter after the initial
-- migrations were applied:
--
-- 1) All SQL/PLPGSQL functions get a fixed `search_path`, so a malicious
--    search_path set by the calling session/role can't shadow `public`
--    objects the function relies on (unqualified calls to normalize_text,
--    trend_min_n, etc.).
-- 2) handle_new_user() is a trigger function (relies on the implicit `new`
--    trigger record) and was never meant to be called directly; revoke the
--    default PUBLIC execute grant so it's only reachable via the
--    on_auth_user_created trigger, not as a client-callable RPC.

alter function public.normalize_text(text) set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.check_dish_review_place_match() set search_path = public;
alter function public.prevent_place_critical_edits() set search_path = public;
alter function public.prevent_dish_critical_edits() set search_path = public;
alter function public.search_similar_dishes(uuid, text) set search_path = public;
alter function public._period_step(text) set search_path = public;
alter function public.place_timeseries(uuid, text, date, date) set search_path = public;
alter function public.dish_timeseries(uuid, text, date, date) set search_path = public;
alter function public.trend_min_n() set search_path = public;
alter function public.trend_delta_threshold() set search_path = public;
alter function public.search_places(text, double precision, double precision) set search_path = public;
alter function public.place_trend(uuid) set search_path = public;
alter function public.dish_trend(uuid) set search_path = public;
alter function public.place_stats(uuid) set search_path = public;
alter function public.dish_stats(uuid) set search_path = public;
alter function public.dish_rankings_for_place(uuid, text) set search_path = public;
alter function public.save_visit(uuid, date, smallint, text, jsonb) set search_path = public;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
