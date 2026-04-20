-- =====================================================
-- VERIFY AND FIX SCHEDULES TABLE
-- =====================================================
-- This script checks if the schedules table has the
-- is_paid_leave column and adds it if missing
-- =====================================================

-- Check current table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'schedules'
ORDER BY ordinal_position;

-- Check if is_paid_leave column exists
DO $$
DECLARE
  v_column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'schedules' 
    AND column_name = 'is_paid_leave'
  ) INTO v_column_exists;

  IF v_column_exists THEN
    RAISE NOTICE '✅ Column is_paid_leave already exists in schedules table';
  ELSE
    RAISE NOTICE '❌ Column is_paid_leave is MISSING from schedules table';
    RAISE NOTICE '   Adding column now...';
    
    -- Add the column
    ALTER TABLE schedules 
    ADD COLUMN IF NOT EXISTS is_paid_leave BOOLEAN NOT NULL DEFAULT false;
    
    RAISE NOTICE '✅ Column is_paid_leave has been added to schedules table';
  END IF;
END $$;

-- Verify the column was added
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'schedules'
AND column_name = 'is_paid_leave';

-- Show summary of schedule data
SELECT 
  COUNT(*) as total_schedules,
  COUNT(*) FILTER (WHERE is_paid_leave = true) as paid_leave_schedules,
  COUNT(*) FILTER (WHERE is_day_off = true) as day_off_schedules,
  COUNT(*) FILTER (WHERE shift_start IS NOT NULL AND shift_end IS NOT NULL) as work_day_schedules
FROM schedules;

-- Show recent paid leave schedules if any
SELECT 
  employee_number,
  schedule_date,
  is_paid_leave,
  is_day_off,
  shift_start,
  shift_end,
  created_at
FROM schedules
WHERE is_paid_leave = true
ORDER BY schedule_date DESC
LIMIT 10;

RAISE NOTICE '';
RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
RAISE NOTICE 'NEXT STEPS:';
RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
RAISE NOTICE '1. Run CREATE_LEAVE_APPROVAL_FUNCTION.sql to create the stored procedure';
RAISE NOTICE '2. Test by approving a leave request in the admin panel';
RAISE NOTICE '3. Check the employee "My Schedule" tab to see paid leave';
RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
