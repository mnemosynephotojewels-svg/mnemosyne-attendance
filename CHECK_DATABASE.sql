-- ═══════════════════════════════════════════════════════════
-- CHECK YOUR DATABASE COLUMNS
-- ═══════════════════════════════════════════════════════════
--
-- Run this to see what columns you currently have
-- This helps diagnose what's missing
--
-- ═══════════════════════════════════════════════════════════

-- See ALL columns in attendance_records table
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'attendance_records'
ORDER BY ordinal_position;

-- This should show columns like:
-- ✅ id
-- ✅ date
-- ✅ employee_number (if you ran the fix)
-- ✅ type (if you ran the fix)
-- ✅ status (if you ran the fix)
-- etc.

-- If you DON'T see employee_number in the list,
-- that's why you're getting the error!
