-- Run this in Supabase SQL Editor to verify the fix worked

-- Check 1: Verify schedules table exists with correct structure
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'schedules'
ORDER BY ordinal_position;

-- Expected results:
-- id               | text or character varying
-- employee_number  | text or character varying
-- admin_number     | text or character varying
-- user_type        | text or character varying
-- schedule_date    | date
-- shift_start      | time without time zone
-- shift_end        | time without time zone
-- grace_period     | integer
-- is_day_off       | boolean
-- is_paid_leave    | boolean
-- created_at       | timestamp with time zone
-- updated_at       | timestamp with time zone

-- Check 2: Count how many schedules exist
SELECT COUNT(*) as total_schedules FROM schedules;

-- Expected: 0 (table should be empty after running the fix)

-- Check 3: Verify id column is TEXT not BIGINT
SELECT data_type
FROM information_schema.columns
WHERE table_name = 'schedules' AND column_name = 'id';

-- Expected: "text" or "character varying"
-- If you see "bigint", the SQL didn't run or ran in wrong database
