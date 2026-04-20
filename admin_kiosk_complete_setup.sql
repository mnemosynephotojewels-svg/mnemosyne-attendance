-- ============================================
-- COMPLETE ADMIN KIOSK MODE SETUP
-- Run this SQL in Supabase to enable admins to use Kiosk Mode
-- ============================================

-- ============================================
-- PART 1: ADD QR CODE TO ADMINS TABLE
-- ============================================

-- Add qr_code column to admins table
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS qr_code TEXT;

-- Set QR codes for all admins (same as their admin_number)
UPDATE admins
SET qr_code = admin_number
WHERE qr_code IS NULL OR qr_code = '';

-- ============================================
-- PART 2: CREATE SCHEDULES FOR ADMINS
-- ============================================

-- Option A: Create schedule for ONE admin for TODAY ONLY
-- ⚠️ CHANGE 'ADM-001' TO YOUR ADMIN NUMBER
-- ⚠️ CHANGE THE DATE TO TODAY'S DATE (YYYY-MM-DD format)

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
  'ADM-001',                           -- ⚠️ CHANGE THIS to your admin number
  'ADM-001',                           -- ⚠️ CHANGE THIS to match above
  '2026-04-16',                        -- ⚠️ CHANGE THIS to today's date!
  '08:00:00',
  '17:00:00',
  false,
  false,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;  -- Prevents duplicate if already exists

-- ============================================
-- Option B: Create schedules for ONE admin for next 7 days
-- ⚠️ CHANGE 'ADM-001' TO YOUR ADMIN NUMBER
-- ============================================

INSERT INTO schedules (admin_number, employee_number, schedule_date, time_in, time_out, is_day_off, is_paid_leave, created_at, updated_at)
SELECT 
  'ADM-001',                          -- ⚠️ CHANGE THIS to your admin number
  'ADM-001',                          -- ⚠️ CHANGE THIS to match above  
  (CURRENT_DATE + (n || ' days')::interval)::date,
  '08:00:00',
  '17:00:00',
  -- Mark Saturday (6) and Sunday (0) as day off
  CASE WHEN EXTRACT(DOW FROM (CURRENT_DATE + (n || ' days')::interval)::date) IN (0, 6) 
    THEN true 
    ELSE false 
  END,
  false,
  NOW(),
  NOW()
FROM generate_series(0, 6) AS n
WHERE NOT EXISTS (
  SELECT 1 FROM schedules s
  WHERE s.admin_number = 'ADM-001'    -- ⚠️ CHANGE THIS to match above
    AND s.schedule_date = (CURRENT_DATE + (n || ' days')::interval)::date
);

-- ============================================
-- Option C: Create schedules for ALL admins for next 7 days
-- This is the recommended option!
-- ============================================

INSERT INTO schedules (admin_number, employee_number, schedule_date, time_in, time_out, is_day_off, is_paid_leave, created_at, updated_at)
SELECT 
  a.admin_number,
  a.admin_number,  -- Set employee_number same as admin_number for compatibility
  (CURRENT_DATE + (n || ' days')::interval)::date,
  '08:00:00',      -- Default start time
  '17:00:00',      -- Default end time
  -- Mark Saturday (6) and Sunday (0) as day off
  CASE WHEN EXTRACT(DOW FROM (CURRENT_DATE + (n || ' days')::interval)::date) IN (0, 6) 
    THEN true 
    ELSE false 
  END,
  false,
  NOW(),
  NOW()
FROM admins a
CROSS JOIN generate_series(0, 6) AS n
WHERE NOT EXISTS (
  -- Prevent duplicate schedules
  SELECT 1 FROM schedules s
  WHERE s.admin_number = a.admin_number
    AND s.schedule_date = (CURRENT_DATE + (n || ' days')::interval)::date
);

-- ============================================
-- PART 3: VERIFICATION QUERIES
-- ============================================

-- Check 1: View all admins with QR codes
SELECT 
  admin_number,
  full_name,
  username,
  department,
  qr_code,
  CASE 
    WHEN qr_code IS NOT NULL AND qr_code != '' THEN '✅ QR Code Set'
    ELSE '❌ Missing QR Code'
  END as qr_status
FROM admins
ORDER BY admin_number;

-- Check 2: View admin schedules for today
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
WHERE admin_number IS NOT NULL
  AND schedule_date = CURRENT_DATE
ORDER BY admin_number;

-- Check 3: View ALL admin schedules for next 7 days
SELECT 
  admin_number,
  schedule_date,
  TO_CHAR(schedule_date, 'Day') as day_name,
  time_in,
  time_out,
  is_day_off,
  is_paid_leave
FROM schedules
WHERE admin_number IS NOT NULL
  AND schedule_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 6
ORDER BY admin_number, schedule_date;

-- Check 4: Comprehensive health check for ONE admin
-- ⚠️ CHANGE 'ADM-001' TO YOUR ADMIN NUMBER
SELECT 
  'Admin Exists' as check_name,
  CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status,
  COUNT(*) as count
FROM admins WHERE admin_number = 'ADM-001'

UNION ALL

SELECT 
  'QR Code Set' as check_name,
  CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status,
  COUNT(*) as count
FROM admins WHERE admin_number = 'ADM-001' AND qr_code IS NOT NULL

UNION ALL

SELECT 
  'Schedule Today' as check_name,
  CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status,
  COUNT(*) as count
FROM schedules 
WHERE admin_number = 'ADM-001' 
  AND schedule_date = CURRENT_DATE
  AND is_day_off = false 
  AND is_paid_leave = false;

-- ============================================
-- PART 4: MAINTENANCE QUERIES (OPTIONAL)
-- ============================================

-- Delete all admin schedules (use with caution!)
-- Uncomment to use:
-- DELETE FROM schedules WHERE admin_number IS NOT NULL;

-- Reset QR codes for all admins
-- Uncomment to use:
-- UPDATE admins SET qr_code = admin_number;

-- Create monthly schedules for all admins (30 days)
-- Uncomment to use:
/*
INSERT INTO schedules (admin_number, employee_number, schedule_date, time_in, time_out, is_day_off, is_paid_leave, created_at, updated_at)
SELECT 
  a.admin_number,
  a.admin_number,
  (CURRENT_DATE + (n || ' days')::interval)::date,
  '08:00:00',
  '17:00:00',
  CASE WHEN EXTRACT(DOW FROM (CURRENT_DATE + (n || ' days')::interval)::date) IN (0, 6) 
    THEN true 
    ELSE false 
  END,
  false,
  NOW(),
  NOW()
FROM admins a
CROSS JOIN generate_series(0, 29) AS n
WHERE NOT EXISTS (
  SELECT 1 FROM schedules s
  WHERE s.admin_number = a.admin_number
    AND s.schedule_date = (CURRENT_DATE + (n || ' days')::interval)::date
);
*/

-- ============================================
-- EXPECTED RESULTS
-- ============================================
-- After running this SQL, you should have:
-- 
-- 1. All admins with qr_code field set
-- 2. Schedules created for admins
-- 3. Both admin_number AND employee_number set in schedules
-- 4. Admins can now use Kiosk Mode!
-- 
-- To test:
-- 1. Log in as an admin
-- 2. Go to Settings → My QR Code
-- 3. Download/display QR code
-- 4. Open Kiosk Mode (/kiosk)
-- 5. Scan QR code
-- 6. See "TIME IN SUCCESSFUL" message!
-- ============================================
