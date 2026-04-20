-- ============================================
-- QUICK 3-STEP FIX FOR ADMIN KIOSK MODE
-- ============================================
-- Copy and paste these 3 queries one by one

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 1: Add required columns to schedules table
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS admin_number TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS grace_period INTEGER DEFAULT 30;

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
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- First delete any existing schedules for admins today
DELETE FROM schedules 
WHERE admin_number IS NOT NULL 
AND schedule_date = CURRENT_DATE;

-- Then insert fresh schedules for all admins
INSERT INTO schedules (
  admin_number,
  employee_number,
  schedule_date,
  shift_start,
  shift_end,
  is_day_off,
  is_paid_leave,
  grace_period,
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
  30,
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