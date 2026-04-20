-- ============================================
-- ADMIN QR CODE SETUP FOR MNEMOSYNE ATTENDANCE SYSTEM
-- ============================================
-- Purpose: Generate QR codes for all Team Leader Admin accounts
-- Date: 2026-04-16
-- Instructions: Run this SQL in Supabase SQL Editor
-- ============================================

-- Step 1: Add qr_code column to admins table if it doesn't exist
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS qr_code TEXT;

-- Step 2: Generate QR codes for all admins using their admin_number
-- The QR code value is simply their admin_number (e.g., 'ADM-001')
UPDATE admins
SET qr_code = admin_number
WHERE qr_code IS NULL OR qr_code = '';

-- Step 3: Verify the update - View all admins with their QR codes
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

-- ============================================
-- EXPECTED RESULT
-- ============================================
-- All admins should now have their admin_number 
-- stored in the qr_code column.
-- 
-- Example Output:
-- admin_number | full_name      | username  | department | qr_code  | qr_status
-- -------------|----------------|-----------|------------|----------|---------------
-- ADM-001      | John Smith     | jsmith    | HR         | ADM-001  | ✅ QR Code Set
-- ADM-002      | Jane Doe       | jdoe      | IT         | ADM-002  | ✅ QR Code Set
-- ADM-003      | Mike Johnson   | mjohnson  | Sales      | ADM-003  | ✅ QR Code Set
--
-- ============================================
-- NEXT STEPS
-- ============================================
-- 1. Each admin can log in to their account
-- 2. Navigate to Settings → My QR Code
-- 3. Download their QR code as PNG image
-- 4. Use it in Kiosk Mode for attendance tracking
--
-- Kiosk Mode validations for admins:
-- ✅ Schedule checking (must have schedule for today)
-- ✅ Paid leave detection (cannot clock in/out if on paid leave)
-- ✅ Day off detection (cannot clock in/out on day off)
-- ✅ Duplicate prevention (can only time in/out once per day)
-- ============================================
