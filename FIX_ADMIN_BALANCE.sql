-- ============================================
-- FIX ADMIN LEAVE BALANCE NOT UPDATING
-- ============================================
--
-- This SQL script fixes the issue where admin leave balance
-- always shows "12 / 12" and doesn't update after leave approval.
--
-- PROBLEM: The paid_leave_balance column doesn't exist in admins table
-- SOLUTION: Add the column and set default values
--
-- HOW TO RUN:
-- 1. Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/sql/new
-- 2. Copy and paste this entire file
-- 3. Click "Run" button
-- 4. Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/settings/api
-- 5. Click "Reload schema cache"
-- 6. Refresh your browser
--
-- ============================================

-- Step 1: Add the paid_leave_balance column to admins table
ALTER TABLE admins
ADD COLUMN IF NOT EXISTS paid_leave_balance INTEGER DEFAULT 12;

-- Step 2: Set default balance for all existing admins
UPDATE admins
SET paid_leave_balance = 12
WHERE paid_leave_balance IS NULL;

-- Step 3: Add a constraint to ensure balance is never negative (optional but recommended)
ALTER TABLE admins
ADD CONSTRAINT IF NOT EXISTS paid_leave_balance_non_negative
CHECK (paid_leave_balance >= 0);

-- Step 4: Verify the migration worked
SELECT
  admin_number,
  full_name,
  department,
  paid_leave_balance,
  'SUCCESS: Column exists!' as status
FROM admins
ORDER BY admin_number;

-- ============================================
-- DONE! Now reload schema cache and test:
-- 1. Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/settings/api
-- 2. Click "Reload schema cache"
-- 3. Login as admin
-- 4. Submit leave request
-- 5. Login as super admin
-- 6. Approve the request
-- 7. Go back to admin account
-- 8. Balance should update within 10 seconds!
-- ============================================
