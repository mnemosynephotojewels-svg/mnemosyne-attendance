-- ============================================
-- COMPREHENSIVE FIX FOR ADMIN KIOSK MODE
-- ============================================
-- This script fixes the database so team leader admins can use Kiosk Mode

-- STEP 1: Check current admin data
-- Run this first to see what you have
SELECT 
  admin_number,
  full_name,
  username,
  department,
  qr_code,
  created_at
FROM admins
ORDER BY created_at DESC;

-- STEP 2: Verify schedules table has admin_number column
-- This is required for admin attendance to work
DO $$
BEGIN
  -- Add admin_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'schedules' 
    AND column_name = 'admin_number'
  ) THEN
    ALTER TABLE schedules ADD COLUMN admin_number TEXT;
    RAISE NOTICE 'Added admin_number column to schedules table';
  ELSE
    RAISE NOTICE 'admin_number column already exists in schedules table';
  END IF;
END $$;

-- STEP 3: Create index for faster admin schedule lookups
CREATE INDEX IF NOT EXISTS idx_schedules_admin_number_date 
ON schedules(admin_number, schedule_date);

-- STEP 4: Generate QR codes for ALL admins (if missing)
-- This creates QR code JSON data for each admin
UPDATE admins
SET qr_code = json_build_object(
  'type', 'admin',
  'id', admin_number,
  'name', full_name,
  'department', department,
  'timestamp', NOW()::text
)::text
WHERE qr_code IS NULL OR qr_code = '';

-- STEP 5: Verify QR codes were created
SELECT 
  admin_number,
  full_name,
  department,
  CASE 
    WHEN qr_code IS NOT NULL AND qr_code != '' THEN '✅ Has QR'
    ELSE '❌ Missing QR'
  END as qr_status
FROM admins;

-- STEP 6: Create today's schedule for ALL admins (if missing)
-- Change the time as needed: 08:00:00 to 17:00:00
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
  admin_number as employee_number, -- Duplicate for compatibility
  CURRENT_DATE,
  '08:00:00',
  '17:00:00',
  false,
  false,
  30,
  NOW(),
  NOW()
FROM admins
WHERE NOT EXISTS (
  SELECT 1 
  FROM schedules 
  WHERE schedules.admin_number = admins.admin_number 
  AND schedules.schedule_date = CURRENT_DATE
);

-- STEP 7: Verify schedules were created
SELECT 
  admin_number,
  employee_number,
  schedule_date,
  shift_start,
  shift_end,
  is_day_off,
  CASE 
    WHEN schedule_date = CURRENT_DATE THEN '✅ TODAY'
    ELSE '📅 ' || schedule_date::text
  END as date_status
FROM schedules
WHERE admin_number IS NOT NULL
ORDER BY schedule_date DESC, admin_number;

-- STEP 8: Check attendance_records table structure
-- Verify it can store admin attendance
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'attendance_records'
ORDER BY ordinal_position;

-- STEP 9: Test query - Find admin with schedule
-- This simulates what the kiosk does
SELECT 
  a.admin_number,
  a.full_name,
  a.department,
  s.schedule_date,
  s.shift_start,
  s.shift_end,
  a.qr_code IS NOT NULL as has_qr_code
FROM admins a
LEFT JOIN schedules s 
  ON s.admin_number = a.admin_number 
  AND s.schedule_date = CURRENT_DATE
ORDER BY a.admin_number;

-- ============================================
-- QUICK FIX: If you have a specific admin that's not working
-- ============================================
-- Replace 'ADM-001' with your actual admin_number

-- Update QR code for specific admin
UPDATE admins
SET qr_code = json_build_object(
  'type', 'admin',
  'id', 'ADM-001',
  'name', full_name,
  'department', department,
  'timestamp', NOW()::text
)::text
WHERE admin_number = 'ADM-001';

-- Create schedule for specific admin for today
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
) VALUES (
  'ADM-001',
  'ADM-001',
  CURRENT_DATE,
  '08:00:00',
  '17:00:00',
  false,
  false,
  30,
  NOW(),
  NOW()
)
ON CONFLICT (admin_number, schedule_date) 
DO UPDATE SET
  shift_start = EXCLUDED.shift_start,
  shift_end = EXCLUDED.shift_end,
  is_day_off = EXCLUDED.is_day_off,
  updated_at = NOW();

-- ============================================
-- FINAL VERIFICATION
-- ============================================
-- This shows everything is ready for kiosk mode

SELECT 
  '1. Admins with QR codes' as check_name,
  COUNT(*) as count
FROM admins
WHERE qr_code IS NOT NULL AND qr_code != ''

UNION ALL

SELECT 
  '2. Admins with schedules today' as check_name,
  COUNT(*) as count
FROM schedules
WHERE admin_number IS NOT NULL 
  AND schedule_date = CURRENT_DATE

UNION ALL

SELECT 
  '3. Total admins in system' as check_name,
  COUNT(*) as count
FROM admins;

-- ============================================
-- TROUBLESHOOTING: If admin still not found
-- ============================================
-- Check what admin_number the system is looking for

-- View all admins
SELECT * FROM admins;

-- View all schedules for admins
SELECT * FROM schedules WHERE admin_number IS NOT NULL;

-- Check if attendance_records table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'attendance_records'
) as attendance_table_exists;
