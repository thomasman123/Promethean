-- Verify KPI System Tables Exist
-- Run this in Supabase SQL Editor to check if everything is set up

-- 1. Check if tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('kpi_definitions', 'kpi_progress', 'kpi_history')
ORDER BY table_name;

-- 2. Check kpi_definitions structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'kpi_definitions'
ORDER BY ordinal_position;

-- 3. Check kpi_progress structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'kpi_progress'
ORDER BY ordinal_position;

-- 4. Check kpi_history structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'kpi_history'
ORDER BY ordinal_position;

-- 5. Test queries (should return 0, not errors)
SELECT 'kpi_definitions' as table_name, COUNT(*) as row_count FROM kpi_definitions
UNION ALL
SELECT 'kpi_progress' as table_name, COUNT(*) as row_count FROM kpi_progress
UNION ALL
SELECT 'kpi_history' as table_name, COUNT(*) as row_count FROM kpi_history;

-- 6. Check RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('kpi_definitions', 'kpi_progress', 'kpi_history');

-- 7. Check policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('kpi_definitions', 'kpi_progress', 'kpi_history')
ORDER BY tablename, policyname;

