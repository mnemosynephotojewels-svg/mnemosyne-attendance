-- ============================================
-- ⚡ QUICK FIX - Copy and Paste This Entire Block
-- ============================================
-- This fixes ALL admin kiosk errors in one go
-- Just copy everything below and run in Supabase SQL Editor

-- Step 1: Add required columns
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS admin_number TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS grace_period INTEGER DEFAULT 30;

-- Step 2: Create QR codes for all admins
UPDATE admins
SET qr_code = json_build_object(
  'type', 'admin',
  'id', admin_number,
  'name', full_name,
  'department', department,
  'timestamp', NOW()::text
)::text;

-- Step 3: Create today's schedules for all admins
DELETE FROM schedules WHERE admin_number IS NOT NULL AND schedule_date = CURRENT_DATE;

INSERT INTO schedules (
  admin_number, employee_number, schedule_date,
  shift_start, shift_end, is_day_off, is_paid_leave,
  grace_period, created_at, updated_at
)
SELECT 
  admin_number, admin_number, CURRENT_DATE,
  '08:00:00', '17:00:00', false, false,
  30, NOW(), NOW()
FROM admins;

-- Done! Check results:
SELECT 
  a.admin_number,
  a.full_name,
  CASE WHEN a.qr_code IS NOT NULL THEN '✅ Has QR' ELSE '❌ No QR' END as qr_status,
  CASE WHEN s.schedule_date IS NOT NULL THEN '✅ Has Schedule' ELSE '❌ No Schedule' END as schedule_status
FROM admins a
LEFT JOIN schedules s ON s.admin_number = a.admin_number AND s.schedule_date = CURRENT_DATE;
