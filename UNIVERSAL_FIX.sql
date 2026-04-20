-- ============================================
-- UNIVERSAL FIX - Works with ANY schedules table structure
-- ============================================
-- This fix adapts to your table's column names

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PART 1: Add admin_number column (if missing)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS admin_number TEXT;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PART 2: Generate QR codes for all admins
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
-- PART 3: Check what columns your schedules table has
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Run this to see your table structure:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'schedules'
ORDER BY ordinal_position;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PART 4: STOP HERE AND CHECK THE RESULTS ABOVE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Look at the column names. Do you see:
-- - "shift_start" and "shift_end" OR
-- - "start_time" and "end_time" OR  
-- - "time_start" and "time_end" OR
-- - Something else?

-- After checking, run ONE of the options below that matches your columns

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- OPTION A: If you have "start_time" and "end_time" columns
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/*
DELETE FROM schedules WHERE admin_number IS NOT NULL AND schedule_date = CURRENT_DATE;

INSERT INTO schedules (
  admin_number,
  employee_number,
  schedule_date,
  start_time,
  end_time,
  created_at,
  updated_at
)
SELECT 
  admin_number,
  admin_number,
  CURRENT_DATE,
  '08:00:00',
  '17:00:00',
  NOW(),
  NOW()
FROM admins;
*/

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- OPTION B: If you have "shift_start" and "shift_end" columns
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/*
DELETE FROM schedules WHERE admin_number IS NOT NULL AND schedule_date = CURRENT_DATE;

INSERT INTO schedules (
  admin_number,
  employee_number,
  schedule_date,
  shift_start,
  shift_end,
  created_at,
  updated_at
)
SELECT 
  admin_number,
  admin_number,
  CURRENT_DATE,
  '08:00:00',
  '17:00:00',
  NOW(),
  NOW()
FROM admins;
*/

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- OPTION C: If you have "time_in" and "time_out" columns
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/*
DELETE FROM schedules WHERE admin_number IS NOT NULL AND schedule_date = CURRENT_DATE;

INSERT INTO schedules (
  admin_number,
  employee_number,
  schedule_date,
  time_in,
  time_out,
  created_at,
  updated_at
)
SELECT 
  admin_number,
  admin_number,
  CURRENT_DATE,
  '08:00:00',
  '17:00:00',
  NOW(),
  NOW()
FROM admins;
*/

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICATION: Check if it worked
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT 
  a.admin_number,
  a.full_name,
  CASE WHEN a.qr_code IS NOT NULL THEN '✅' ELSE '❌' END as has_qr,
  CASE WHEN s.schedule_date IS NOT NULL THEN '✅' ELSE '❌' END as has_schedule,
  s.*
FROM admins a
LEFT JOIN schedules s ON s.admin_number = a.admin_number AND s.schedule_date = CURRENT_DATE;
