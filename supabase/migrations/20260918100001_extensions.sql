-- Extensions needed for fuzzy search and text normalization
create extension if not exists pg_trgm with schema public;
create extension if not exists unaccent with schema public;

-- Normalizes text for comparison/search: lowercase, unaccented, trimmed,
-- with internal whitespace collapsed to single spaces.
create or replace function public.normalize_text(input text)
returns text
language sql
immutable
parallel safe
as $$
  select trim(
    regexp_replace(
      lower(unaccent(coalesce(input, ''))),
      '\s+', ' ', 'g'
    )
  );
$$;
