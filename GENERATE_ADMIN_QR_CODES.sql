-- ============================================
-- MNEMOSYNE QR CODE GENERATOR FOR ADMIN ACCOUNTS
-- ============================================
-- This script generates unique QR tokens for all team leader admin accounts
-- that don't already have a QR token assigned.
--
-- IMPORTANT: Run this script in your Supabase SQL Editor
-- Path: Supabase Dashboard → SQL Editor → New Query
-- ============================================

-- Step 1: Check current status of admin QR tokens
SELECT 
  admin_number,
  full_name,
  email,
  team_id,
  role,
  CASE 
    WHEN qr_token IS NULL OR qr_token = '' THEN '❌ Missing'
    ELSE '✅ Exists'
  END as qr_token_status,
  qr_token
FROM admins
ORDER BY admin_number;

-- ============================================
-- Step 2: Generate QR tokens for admins without one
-- ============================================
-- This uses gen_random_uuid() to create unique UUID v4 tokens
-- Each admin gets their own unique QR code identifier

UPDATE admins
SET qr_token = gen_random_uuid()::text
WHERE qr_token IS NULL OR qr_token = '';

-- ============================================
-- Step 3: Verify all admins now have QR tokens
-- ============================================
SELECT 
  admin_number,
  full_name,
  email,
  team_id,
  role,
  qr_token,
  LENGTH(qr_token) as token_length,
  CASE 
    WHEN qr_token IS NULL OR qr_token = '' THEN '❌ Still Missing'
    ELSE '✅ Generated'
  END as status
FROM admins
ORDER BY admin_number;

-- ============================================
-- Step 4: Count results
-- ============================================
SELECT 
  COUNT(*) as total_admins,
  COUNT(qr_token) as admins_with_qr,
  COUNT(*) - COUNT(qr_token) as admins_without_qr
FROM admins;

-- ============================================
-- OPTIONAL: If you want to regenerate ALL QR tokens (reset)
-- ============================================
-- WARNING: This will invalidate all existing admin QR codes!
-- Uncomment the following lines only if you want to reset everything:

-- UPDATE admins
-- SET qr_token = gen_random_uuid()::text;

-- ============================================
-- OPTIONAL: Generate QR token for a specific admin
-- ============================================
-- Replace 'ADM001' with the actual admin_number
-- Uncomment to use:

-- UPDATE admins
-- SET qr_token = gen_random_uuid()::text
-- WHERE admin_number = 'ADM001';

-- ============================================
-- Step 5: Export admin QR data for printing
-- ============================================
-- This query gives you all the information needed to generate
-- actual QR code images (you can use this data with a QR code generator)

SELECT 
  admin_number as "Admin Number",
  full_name as "Full Name",
  email as "Email",
  role as "Role",
  team_id as "Team ID",
  qr_token as "QR Token (Scan This)",
  CONCAT('Admin: ', full_name, ' (', admin_number, ')') as "QR Code Label"
FROM admins
WHERE qr_token IS NOT NULL
ORDER BY admin_number;

-- ============================================
-- NOTES:
-- ============================================
-- 1. Each admin's QR token is stored in the 'qr_token' column
-- 2. The Kiosk Mode scans this token to identify the admin
-- 3. The token is a UUID v4 format (e.g., 'a1b2c3d4-e5f6-7890-abcd-1234567890ab')
-- 4. Admins can view their QR code in Settings → My QR Code
-- 5. To generate printable QR codes, use the admin_number as the QR data
-- ============================================

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to make sure everything is set up correctly:

SELECT 
  '✅ Admin QR Code Setup Complete!' as status,
  COUNT(*) as total_admins,
  COUNT(CASE WHEN qr_token IS NOT NULL THEN 1 END) as with_qr_token,
  COUNT(CASE WHEN qr_token IS NULL THEN 1 END) as without_qr_token,
  ROUND(
    (COUNT(CASE WHEN qr_token IS NOT NULL THEN 1 END)::numeric / COUNT(*)::numeric) * 100, 
    2
  ) || '%' as completion_percentage
FROM admins;
