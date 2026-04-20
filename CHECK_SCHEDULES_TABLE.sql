-- ============================================
-- CHECK YOUR SCHEDULES TABLE STRUCTURE
-- ============================================
-- Run this FIRST to see what columns you have

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'schedules'
ORDER BY ordinal_position;
