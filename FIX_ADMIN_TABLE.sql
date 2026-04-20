-- ============================================
-- FIX ADMIN TABLE - COMPLETE SOLUTION
-- ============================================

-- STEP 1: Check which table you have
-- Run this first to see your situation
-- ============================================

SELECT 'Checking table names...' as step;

-- Check if you have 'admin' (singular)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin') THEN
    RAISE NOTICE '✅ Table "admin" EXISTS';
  ELSE
    RAISE NOTICE '❌ Table "admin" NOT FOUND';
  END IF;
END $$;

-- Check if you have 'admins' (plural)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins') THEN
    RAISE NOTICE '✅ Table "admins" EXISTS';
  ELSE
    RAISE NOTICE '❌ Table "admins" NOT FOUND';
  END IF;
END $$;

-- ============================================
-- SOLUTION 1: If you have 'admin' (singular)
-- Rename it to 'admins' (plural) for consistency
-- ============================================

-- UNCOMMENT THIS if you have 'admin' table and want to rename it:
/*
ALTER TABLE admin RENAME TO admins;
*/

-- ============================================
-- SOLUTION 2: Keep 'admin' table (singular)
-- The code now supports BOTH names automatically!
-- ============================================

-- If you want to keep the table name as 'admin', you don't need to do anything!
-- The updated code will automatically try both 'admins' and 'admin'

-- ============================================
-- STEP 2: View your admin data
-- ============================================

-- If you have 'admins' table:
SELECT 
  admin_number,
  full_name,
  username,
  department,
  position,
  qr_code,
  CASE 
    WHEN qr_code IS NULL THEN '❌ Missing QR Code'
    WHEN qr_code = admin_number THEN '✅ QR Code OK'
    ELSE '⚠️ QR Code Mismatch'
  END as qr_status
FROM admins
ORDER BY admin_number;

-- If that fails, try 'admin' table:
/*
SELECT 
  admin_number,
  full_name,
  username,
  department,
  position,
  qr_code,
  CASE 
    WHEN qr_code IS NULL THEN '❌ Missing QR Code'
    WHEN qr_code = admin_number THEN '✅ QR Code OK'
    ELSE '⚠️ QR Code Mismatch'
  END as qr_status
FROM admin
ORDER BY admin_number;
*/

-- ============================================
-- STEP 3: Fix QR codes for admins
-- ============================================

-- For 'admins' table (plural):
UPDATE admins 
SET qr_code = admin_number 
WHERE qr_code IS NULL OR qr_code = '';

-- For 'admin' table (singular):
/*
UPDATE admin 
SET qr_code = admin_number 
WHERE qr_code IS NULL OR qr_code = '';
*/

-- ============================================
-- STEP 4: Create schedule for admins
-- ============================================

-- For 'admins' table - Create schedule for ALL admins for today
INSERT INTO schedules (
  admin_number,
  employee_number,
  schedule_date,
  time_in,
  time_out,
  is_day_off,
  is_paid_leave,
  created_at,
  updated_at
)
SELECT 
  admin_number,
  admin_number,  -- IMPORTANT: employee_number = admin_number
  CURRENT_DATE,
  '08:00:00',
  '17:00:00',
  false,
  false,
  NOW(),
  NOW()
FROM admins
WHERE NOT EXISTS (
  SELECT 1 FROM schedules s 
  WHERE s.admin_number = admins.admin_number 
    AND s.schedule_date = CURRENT_DATE
);

-- For 'admin' table (singular):
/*
INSERT INTO schedules (
  admin_number,
  employee_number,
  schedule_date,
  time_in,
  time_out,
  is_day_off,
  is_paid_leave,
  created_at,
  updated_at
)
SELECT 
  admin_number,
  admin_number,
  CURRENT_DATE,
  '08:00:00',
  '17:00:00',
  false,
  false,
  NOW(),
  NOW()
FROM admin
WHERE NOT EXISTS (
  SELECT 1 FROM schedules s 
  WHERE s.admin_number = admin.admin_number 
    AND s.schedule_date = CURRENT_DATE
);
*/

-- ============================================
-- STEP 5: Verify everything is set up
-- ============================================

-- Check admins with QR codes
SELECT 
  'Admin Check' as test,
  COUNT(*) as total_admins,
  COUNT(CASE WHEN qr_code IS NOT NULL THEN 1 END) as admins_with_qr
FROM admins;  -- Change to 'admin' if using singular

-- Check schedules for today
SELECT 
  'Schedule Check' as test,
  COUNT(*) as schedules_today
FROM schedules 
WHERE schedule_date = CURRENT_DATE
  AND admin_number IS NOT NULL;

-- ============================================
-- STEP 6: Test a specific admin
-- ============================================

-- Replace 'ADM-001' with your actual admin number!
DO $$
DECLARE
  admin_exists boolean;
  has_qr boolean;
  has_schedule boolean;
  test_admin_number text := 'ADM-001';  -- ⚠️ CHANGE THIS!
BEGIN
  -- Check admin exists
  SELECT EXISTS(SELECT 1 FROM admins WHERE admin_number = test_admin_number) INTO admin_exists;
  
  -- Check has QR code
  SELECT EXISTS(SELECT 1 FROM admins WHERE admin_number = test_admin_number AND qr_code IS NOT NULL) INTO has_qr;
  
  -- Check has schedule today
  SELECT EXISTS(SELECT 1 FROM schedules WHERE admin_number = test_admin_number AND schedule_date = CURRENT_DATE) INTO has_schedule;
  
  -- Report results
  IF admin_exists THEN
    RAISE NOTICE '✅ Admin % exists', test_admin_number;
  ELSE
    RAISE NOTICE '❌ Admin % NOT FOUND', test_admin_number;
  END IF;
  
  IF has_qr THEN
    RAISE NOTICE '✅ Admin % has QR code', test_admin_number;
  ELSE
    RAISE NOTICE '❌ Admin % missing QR code', test_admin_number;
  END IF;
  
  IF has_schedule THEN
    RAISE NOTICE '✅ Admin % has schedule for today', test_admin_number;
  ELSE
    RAISE NOTICE '❌ Admin % has NO schedule for today', test_admin_number;
  END IF;
END $$;

-- ============================================
-- BONUS: Show full admin details
-- ============================================

-- Replace 'ADM-001' with your admin number
SELECT 
  a.admin_number,
  a.full_name,
  a.username,
  a.department,
  a.qr_code,
  s.schedule_date,
  s.time_in,
  s.time_out,
  s.is_day_off,
  s.is_paid_leave
FROM admins a  -- Change to 'admin' if using singular
LEFT JOIN schedules s ON s.admin_number = a.admin_number AND s.schedule_date = CURRENT_DATE
WHERE a.admin_number = 'ADM-001';  -- ⚠️ CHANGE THIS!

-- ============================================
-- EXPECTED OUTPUT
-- ============================================
-- You should see:
-- ✅ Admin ADM-001 exists
-- ✅ Admin ADM-001 has QR code
-- ✅ Admin ADM-001 has schedule for today
-- 
-- If any say ❌, run the corresponding UPDATE/INSERT above
-- ============================================
