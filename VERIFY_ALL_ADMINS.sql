-- ============================================
-- VERIFY ALL ADMIN ACCOUNTS ARE READY
-- ============================================
--
-- This script checks and fixes ALL team leader admin accounts
-- to ensure their leave balance updates work correctly
--
-- Run this in: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/sql/new
--
-- ============================================

-- STEP 1: Check current state of all admins
-- ============================================
SELECT
  admin_number,
  full_name,
  department,
  CASE
    WHEN paid_leave_balance IS NULL THEN '❌ NULL (needs fix)'
    ELSE '✅ ' || paid_leave_balance::text
  END as balance_status,
  paid_leave_balance
FROM admins
ORDER BY admin_number;

-- You should see something like:
-- admin_number | full_name      | department  | balance_status | paid_leave_balance
-- -------------|----------------|-------------|----------------|-------------------
-- ADM-001      | John Smith     | Engineering | ✅ 12          | 12
-- ADM-002      | Jane Doe       | Sales       | ✅ 12          | 12
-- ADM-003      | Bob Wilson     | Marketing   | ✅ 4           | 4


-- ============================================
-- STEP 2: Fix any NULL balances
-- ============================================
-- This ensures ALL admins have a balance value
UPDATE admins
SET paid_leave_balance = 12
WHERE paid_leave_balance IS NULL;

-- Check how many were updated
SELECT
  COUNT(*) as total_admins_fixed,
  'Updated admins that had NULL balance' as description
FROM admins
WHERE paid_leave_balance = 12;


-- ============================================
-- STEP 3: Verify all admins are ready
-- ============================================
-- This should show NO rows if everything is correct
SELECT
  admin_number,
  full_name,
  '❌ PROBLEM: Balance is NULL' as issue
FROM admins
WHERE paid_leave_balance IS NULL;

-- If this returns zero rows, ALL admins are ready! ✅


-- ============================================
-- STEP 4: View summary of all admin balances
-- ============================================
SELECT
  COUNT(*) as total_admins,
  COUNT(CASE WHEN paid_leave_balance IS NOT NULL THEN 1 END) as admins_with_balance,
  COUNT(CASE WHEN paid_leave_balance IS NULL THEN 1 END) as admins_without_balance,
  MIN(paid_leave_balance) as lowest_balance,
  MAX(paid_leave_balance) as highest_balance,
  ROUND(AVG(paid_leave_balance), 2) as average_balance
FROM admins;

-- Expected result:
-- total_admins | admins_with_balance | admins_without_balance | lowest_balance | highest_balance | average_balance
-- -------------|---------------------|------------------------|----------------|-----------------|----------------
-- 5            | 5                   | 0                      | 4              | 12              | 10.40


-- ============================================
-- STEP 5: Test data - View all admin leave requests
-- ============================================
SELECT
  lr.id,
  lr.admin_number,
  a.full_name,
  lr.leave_type,
  lr.start_date,
  lr.end_date,
  lr.status,
  lr.reviewed_by,
  lr.reviewed_at,
  a.paid_leave_balance as current_balance
FROM leave_requests lr
LEFT JOIN admins a ON lr.admin_number = a.admin_number
WHERE lr.admin_number IS NOT NULL
ORDER BY lr.created_at DESC;

-- This shows:
-- - All leave requests submitted by admins
-- - Current balance for each admin
-- - Approval status


-- ============================================
-- STEP 6: If you need to reset ALL admins to default (12 days)
-- ============================================
-- ONLY RUN THIS IF YOU WANT TO RESET EVERYONE!
-- Uncomment the lines below if needed:

-- UPDATE admins
-- SET paid_leave_balance = 12;
--
-- SELECT admin_number, full_name, paid_leave_balance
-- FROM admins
-- ORDER BY admin_number;


-- ============================================
-- STEP 7: Verify specific admin balances are correct
-- ============================================
-- Check if approved leave days were properly deducted

SELECT
  a.admin_number,
  a.full_name,
  a.paid_leave_balance as current_balance,
  COUNT(lr.id) as total_leave_requests,
  COUNT(CASE WHEN lr.status = 'approved' THEN 1 END) as approved_requests,
  COUNT(CASE WHEN lr.status = 'pending' THEN 1 END) as pending_requests,
  COUNT(CASE WHEN lr.status = 'rejected' THEN 1 END) as rejected_requests
FROM admins a
LEFT JOIN leave_requests lr ON a.admin_number = lr.admin_number
GROUP BY a.admin_number, a.full_name, a.paid_leave_balance
ORDER BY a.admin_number;

-- This shows:
-- - Each admin's current balance
-- - How many leave requests they've submitted
-- - How many were approved/pending/rejected


-- ============================================
-- DONE!
-- ============================================
-- After running this script:
-- ✅ All admins should have paid_leave_balance column set
-- ✅ No NULL values
-- ✅ Ready for leave balance updates
-- ============================================
