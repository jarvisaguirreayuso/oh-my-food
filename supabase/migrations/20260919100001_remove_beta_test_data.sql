-- Removes the test data left in production during Phase 1 verification:
-- the place "Casa Lucio", its dish "Huevos rotos con jamon" and the two
-- visits (with their dish reviews) recorded against it.
--
-- Keyed on the exact production ids so this is a no-op on any other database
-- (local `supabase db reset` never contains these rows). Order matters:
-- dish_reviews cascade from visits, and dish_reviews.dish_id / visits.place_id
-- have no cascade, so visits go first, then dishes, then the place.

delete from public.visits
where place_id = '1d0c41dd-f55e-4cdb-aef4-b5fcc2d482fe';

delete from public.dishes
where place_id = '1d0c41dd-f55e-4cdb-aef4-b5fcc2d482fe';

delete from public.places
where id = '1d0c41dd-f55e-4cdb-aef4-b5fcc2d482fe';
