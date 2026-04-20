-- ============================================
-- QUICK TEST: Admin Kiosk Mode
-- Run these queries to verify your admin can use Kiosk Mode
-- ============================================

-- Step 1: Check if admin exists
SELECT 
  'Step 1: Admin Exists' as test_step,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS - Admin found'
    ELSE '❌ FAIL - Admin not found. Create admin first!'
  END as result,
  COUNT(*) as admin_count
FROM admins 
WHERE admin_number = 'ADM-001';  -- Change this to your admin number

-- Step 2: View admin details
SELECT 
  admin_number,
  full_name,
  username,
  department,
  position,
  qr_code,
  CASE 
    WHEN qr_code IS NOT NULL AND qr_code != '' THEN '✅ QR Code Set'
    ELSE '❌ QR Code Missing'
  END as qr_status
FROM admins
WHERE admin_number = 'ADM-001';  -- Change this to your admin number

-- Step 3: Check if schedule exists for today
SELECT 
  'Step 3: Schedule Today' as test_step,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS - Schedule found'
    ELSE '❌ FAIL - No schedule for today. Run insert below!'
  END as result,
  COUNT(*) as schedule_count
FROM schedules 
WHERE admin_number = 'ADM-001'  -- Change this to your admin number
  AND schedule_date = CURRENT_DATE;

-- Step 4: View schedule details
SELECT 
  admin_number,
  employee_number,
  schedule_date,
  time_in,
  time_out,
  is_day_off,
  is_paid_leave,
  CASE 
    WHEN is_day_off THEN '🏖️ Day Off'
    WHEN is_paid_leave THEN '🏝️ Paid Leave'
    ELSE '💼 Work Day'
  END as day_type
FROM schedules
WHERE admin_number = 'ADM-001'  -- Change this to your admin number
  AND schedule_date = CURRENT_DATE;

-- ============================================
-- If Step 3 FAILED, run this to create schedule:
-- ============================================

-- UNCOMMENT and RUN THIS if you don't have a schedule:
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
) VALUES (
  'ADM-001',           -- ⚠️ Change to your admin number
  'ADM-001',           -- ⚠️ Change to your admin number (same as above)
  CURRENT_DATE,        -- Today's date
  '08:00:00',          -- Start time
  '17:00:00',          -- End time
  false,               -- Not a day off
  false,               -- Not paid leave
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;
*/

-- ============================================
-- COMPREHENSIVE HEALTH CHECK
-- ============================================

WITH admin_check AS (
  SELECT COUNT(*) as count FROM admins WHERE admin_number = 'ADM-001'
),
qr_check AS (
  SELECT COUNT(*) as count FROM admins WHERE admin_number = 'ADM-001' AND qr_code IS NOT NULL
),
schedule_check AS (
  SELECT COUNT(*) as count FROM schedules 
  WHERE admin_number = 'ADM-001' 
    AND schedule_date = CURRENT_DATE
    AND is_day_off = false 
    AND is_paid_leave = false
)
SELECT 
  '1. Admin Exists' as check_name,
  CASE WHEN admin_check.count > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status,
  admin_check.count as records_found
FROM admin_check

UNION ALL

SELECT 
  '2. QR Code Set',
  CASE WHEN qr_check.count > 0 THEN '✅ PASS' ELSE '❌ FAIL' END,
  qr_check.count
FROM qr_check

UNION ALL

SELECT 
  '3. Schedule Today (not day off)',
  CASE WHEN schedule_check.count > 0 THEN '✅ PASS' ELSE '❌ FAIL' END,
  schedule_check.count
FROM schedule_check;

-- ============================================
-- EXPECTED OUTPUT:
-- All 3 checks should show "✅ PASS"
-- 
-- If any check fails:
-- 1. Admin Exists FAIL → Run admin registration first
-- 2. QR Code Set FAIL → Run: UPDATE admins SET qr_code = admin_number WHERE admin_number = 'ADM-001';
-- 3. Schedule Today FAIL → Uncomment and run the INSERT statement above
-- ============================================

-- ============================================
-- BONUS: Create 7-day schedule for your admin
-- ============================================

-- UNCOMMENT and RUN THIS to create a full week schedule:
/*
INSERT INTO schedules (admin_number, employee_number, schedule_date, time_in, time_out, is_day_off, is_paid_leave, created_at, updated_at)
SELECT 
  'ADM-001',                          -- ⚠️ Change to your admin number
  'ADM-001',                          -- ⚠️ Change to your admin number
  (CURRENT_DATE + (n || ' days')::interval)::date,
  '08:00:00',
  '17:00:00',
  CASE 
    WHEN EXTRACT(DOW FROM (CURRENT_DATE + (n || ' days')::interval)::date) IN (0, 6) 
    THEN true 
    ELSE false 
  END,
  false,
  NOW(),
  NOW()
FROM generate_series(0, 6) AS n
WHERE NOT EXISTS (
  SELECT 1 FROM schedules s
  WHERE s.admin_number = 'ADM-001'    -- ⚠️ Change to your admin number
    AND s.schedule_date = (CURRENT_DATE + (n || ' days')::interval)::date
);
*/

-- ============================================
-- View all schedules for your admin (next 7 days)
-- ============================================

SELECT 
  schedule_date,
  TO_CHAR(schedule_date, 'Day') as day_name,
  time_in,
  time_out,
  is_day_off,
  is_paid_leave,
  CASE 
    WHEN is_day_off THEN '🏖️ Day Off'
    WHEN is_paid_leave THEN '🏝️ Paid Leave'
    ELSE '💼 Work: ' || time_in || ' - ' || time_out
  END as schedule_info
FROM schedules
WHERE admin_number = 'ADM-001'        -- ⚠️ Change to your admin number
  AND schedule_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 6
ORDER BY schedule_date;
