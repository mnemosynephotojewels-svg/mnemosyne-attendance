-- ============================================
-- MINIMAL FIX - Only uses columns that MUST exist
-- ============================================
-- This only inserts the absolutely required fields

-- Step 1: Add admin_number column
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS admin_number TEXT;

-- Step 2: Create QR codes for admins
UPDATE admins
SET qr_code = json_build_object(
  'type', 'admin',
  'id', admin_number,
  'name', full_name,
  'department', department,
  'timestamp', NOW()::text
)::text;

-- Step 3: Create minimal schedules (only required columns)
-- This inserts ONLY admin_number, employee_number, and schedule_date
DELETE FROM schedules WHERE admin_number IS NOT NULL AND schedule_date = CURRENT_DATE;

INSERT INTO schedules (
  admin_number,
  employee_number,
  schedule_date
)
SELECT 
  admin_number,
  admin_number,
  CURRENT_DATE
FROM admins;

-- Verify
SELECT 
  a.admin_number,
  a.full_name,
  CASE WHEN a.qr_code IS NOT NULL THEN '✅ Has QR' ELSE '❌ No QR' END as qr_status,
  CASE WHEN s.schedule_date IS NOT NULL THEN '✅ Has Schedule' ELSE '❌ No Schedule' END as schedule_status
FROM admins a
LEFT JOIN schedules s ON s.admin_number = a.admin_number AND s.schedule_date = CURRENT_DATE;
