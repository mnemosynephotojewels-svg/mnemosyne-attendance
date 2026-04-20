-- ============================================
-- CHECK YOUR ACTUAL TABLE NAMES
-- Run this in Supabase SQL Editor
-- ============================================

-- Check if 'admin' table exists (singular)
SELECT 
  'admin (singular)' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin') 
    THEN '✅ EXISTS' 
    ELSE '❌ NOT FOUND' 
  END as status;

-- Check if 'admins' table exists (plural)
SELECT 
  'admins (plural)' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins') 
    THEN '✅ EXISTS' 
    ELSE '❌ NOT FOUND' 
  END as status;

-- Show all your table names
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- If you have 'admin' table (singular), show its columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'admin'
ORDER BY ordinal_position;

-- If you have 'admins' table (plural), show its columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'admins'
ORDER BY ordinal_position;

-- Show data from 'admin' table if it exists
SELECT * FROM admin LIMIT 5;

-- Show data from 'admins' table if it exists
SELECT * FROM admins LIMIT 5;
