-- ============================================
-- FIND ALL YOUR TABLES
-- Run this in Supabase SQL Editor
-- ============================================

-- Show ALL tables in your database
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- This will show you EXACTLY what tables you have!
-- Look for a table with admin-related name
