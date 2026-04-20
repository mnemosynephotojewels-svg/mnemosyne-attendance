-- ============================================
-- SIMPLE ADMIN KIOSK FIX (NO GRACE_PERIOD)
-- ============================================
-- Use this if you don't want to add the grace_period column

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 1: Add admin_number column to schedules
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS admin_number TEXT;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 2: Update ALL admins with QR codes
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UPDATE admins
SET qr_code = json_build_object(
  'type', 'admin',
  'id', admin_number,
  'name', full_name,
  'department', department,
  'timestamp', NOW()::text
)::text;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 3: Create TODAY's schedule for ALL admins
-- (Without grace_period column)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- First delete any existing schedules for admins today
DELETE FROM schedules 
WHERE admin_number IS NOT NULL 
AND schedule_date = CURRENT_DATE;

-- Then insert fresh schedules for all admins
-- Only using columns that exist in your table
INSERT INTO schedules (
  admin_number,
  employee_number,
  schedule_date,
  shift_start,
  shift_end,
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
FROM admins;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICATION: Check if everything is ready
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT 
  a.admin_number,
  a.full_name,
  a.department,
  CASE WHEN a.qr_code IS NOT NULL THEN '✅' ELSE '❌' END as has_qr,
  CASE WHEN s.schedule_date IS NOT NULL THEN '✅' ELSE '❌' END as has_schedule,
  s.shift_start,
  s.shift_end
FROM admins a
LEFT JOIN schedules s ON s.admin_number = a.admin_number AND s.schedule_date = CURRENT_DATE;
