-- ============================================
-- FINAL FIX - Admin Kiosk Mode Setup
-- ============================================
-- This fixes the admin QR code recognition issue

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 1: Add admin_number column to schedules
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS admin_number TEXT;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 2: Generate QR codes for ALL admins
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UPDATE admins
SET qr_code = json_build_object(
  'type', 'admin',
  'id', admin_number,
  'name', full_name,
  'department', department,
  'timestamp', NOW()::text
)::text
WHERE qr_code IS NULL OR qr_code = '';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 3: Create schedules for admins
-- (Uses minimal columns to work with any table structure)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Remove old admin schedules for today
DELETE FROM schedules 
WHERE admin_number IS NOT NULL 
AND schedule_date = CURRENT_DATE;

-- Insert new schedules with only required columns
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

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICATION: Check if everything is ready
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT 
  a.admin_number,
  a.full_name,
  a.department,
  CASE 
    WHEN a.qr_code IS NOT NULL AND a.qr_code != '' THEN '✅ QR Code Ready' 
    ELSE '❌ No QR Code' 
  END as qr_status,
  CASE 
    WHEN s.schedule_date IS NOT NULL THEN '✅ Schedule Ready' 
    ELSE '❌ No Schedule' 
  END as schedule_status,
  s.schedule_date
FROM admins a
LEFT JOIN schedules s 
  ON s.admin_number = a.admin_number 
  AND s.schedule_date = CURRENT_DATE
ORDER BY a.admin_number;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Expected result: All admins should show ✅✅
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
