-- =============================================================================
-- CLEAR ALL DATA FROM PUBLIC SCHEMA (for fresh testing)
-- =============================================================================
-- Run this in Supabase Dashboard → SQL Editor.
-- This truncates all tables in the "public" schema and resets identity columns.
-- Use only on development/test projects. This cannot be undone.
-- =============================================================================

DO $$
DECLARE
  r RECORD;
  qry text;
BEGIN
  SELECT string_agg(format('%I.%I', table_schema, table_name), ', ')
    INTO qry
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE';

  IF qry IS NULL OR qry = '' THEN
    RAISE NOTICE 'No tables found in public schema.';
    RETURN;
  END IF;

  EXECUTE 'TRUNCATE TABLE ' || qry || ' RESTART IDENTITY CASCADE';
  RAISE NOTICE 'Truncated all public schema tables.';
END
$$;
