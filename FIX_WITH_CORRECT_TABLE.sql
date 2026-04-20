-- ============================================
-- STEP 1: FIND YOUR ACTUAL TABLE NAME
-- ============================================

-- Run this FIRST to see all your tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================
-- STEP 2: Once you know the table name...
-- ============================================

-- If your table is 'admins' (PLURAL), use this:
-- --------------------------------------------
UPDATE admins 
SET qr_code = admin_number 
WHERE qr_code IS NULL;

INSERT INTO schedules (admin_number, employee_number, schedule_date, time_in, time_out, is_day_off, is_paid_leave, created_at, updated_at)
SELECT admin_number, admin_number, CURRENT_DATE, '08:00:00', '17:00:00', false, false, NOW(), NOW()
FROM admins
WHERE NOT EXISTS (SELECT 1 FROM schedules s WHERE s.admin_number = admins.admin_number AND s.schedule_date = CURRENT_DATE);

-- Verify it worked:
SELECT admin_number, full_name, qr_code FROM admins;
SELECT admin_number, schedule_date FROM schedules WHERE schedule_date = CURRENT_DATE;


-- ============================================
-- OR if you DON'T have an admins table...
-- Check what columns are in kv_store_df988758
-- ============================================

-- Maybe you're storing admins in the kv_store?
SELECT key, value 
FROM kv_store_df988758 
WHERE key LIKE '%admin%' 
LIMIT 10;

-- ============================================
-- EMERGENCY: Check if you initialized database
-- ============================================

-- Do you have ANY of these tables?
DO $$
BEGIN
  -- Check for employees
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
    RAISE NOTICE '✅ employees table EXISTS';
  ELSE
    RAISE NOTICE '❌ employees table MISSING';
  END IF;
  
  -- Check for admins
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins') THEN
    RAISE NOTICE '✅ admins table EXISTS';
  ELSE
    RAISE NOTICE '❌ admins table MISSING';
  END IF;
  
  -- Check for super_admin
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'super_admin') THEN
    RAISE NOTICE '✅ super_admin table EXISTS';
  ELSE
    RAISE NOTICE '❌ super_admin table MISSING';
  END IF;
  
  -- Check for schedules
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schedules') THEN
    RAISE NOTICE '✅ schedules table EXISTS';
  ELSE
    RAISE NOTICE '❌ schedules table MISSING';
  END IF;
  
  -- Check for attendance
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance') THEN
    RAISE NOTICE '✅ attendance table EXISTS';
  ELSE
    RAISE NOTICE '❌ attendance table MISSING';
  END IF;
END $$;
