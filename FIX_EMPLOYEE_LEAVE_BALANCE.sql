-- ═══════════════════════════════════════════════════════════
-- FIX EMPLOYEE LEAVE BALANCE SHOWING 0
-- ═══════════════════════════════════════════════════════════
--
-- PROBLEM: Employee dashboard shows 0 days paid leave balance
--          even though no leave has been approved yet
--
-- CAUSE: Either:
--   1. paid_leave_balance column doesn't exist in employees table
--   2. Column exists but all values are NULL or 0
--
-- RUN IN: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/sql/new
--
-- ═══════════════════════════════════════════════════════════

-- STEP 1: Check if paid_leave_balance column exists
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'employees'
  AND column_name = 'paid_leave_balance';

-- Expected: Should return 1 row if column exists
-- If returns 0 rows, column doesn't exist


-- ═══════════════════════════════════════════════════════════
-- STEP 2: Add the column if it doesn't exist
-- ═══════════════════════════════════════════════════════════
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS paid_leave_balance INTEGER DEFAULT 12;


-- ═══════════════════════════════════════════════════════════
-- STEP 3: Update all NULL or 0 values to 12 (default annual leave)
-- ═══════════════════════════════════════════════════════════
UPDATE employees
SET paid_leave_balance = 12
WHERE paid_leave_balance IS NULL OR paid_leave_balance = 0;


-- ═══════════════════════════════════════════════════════════
-- STEP 4: Verify all employees now have 12 days balance
-- ═══════════════════════════════════════════════════════════
SELECT
  employee_number,
  full_name,
  paid_leave_balance,
  CASE
    WHEN paid_leave_balance = 12 THEN '✅ Correct'
    WHEN paid_leave_balance IS NULL THEN '❌ NULL'
    WHEN paid_leave_balance = 0 THEN '❌ Zero'
    ELSE '⚠️ Custom value'
  END as status
FROM employees
ORDER BY employee_number;


-- ═══════════════════════════════════════════════════════════
-- STEP 5: Check if any employees have approved leave that should have reduced balance
-- ═══════════════════════════════════════════════════════════
SELECT
  e.employee_number,
  e.full_name,
  e.paid_leave_balance as current_balance,
  COUNT(CASE WHEN lr.status = 'approved' THEN 1 END) as approved_requests,
  COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.paid_days ELSE 0 END), 0) as total_paid_days_approved,
  12 - COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.paid_days ELSE 0 END), 0) as expected_balance,
  CASE
    WHEN e.paid_leave_balance = (12 - COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.paid_days ELSE 0 END), 0))
    THEN '✅ Correct'
    ELSE '❌ Needs correction'
  END as balance_status
FROM employees e
LEFT JOIN leave_requests lr ON e.employee_number = lr.employee_number
GROUP BY e.employee_number, e.full_name, e.paid_leave_balance
ORDER BY e.employee_number;


-- ═══════════════════════════════════════════════════════════
-- STEP 6 (OPTIONAL): Recalculate balances based on approved leave
-- ═══════════════════════════════════════════════════════════
-- Only run this if STEP 5 shows incorrect balances

WITH approved_days AS (
  SELECT
    employee_number,
    COALESCE(SUM(paid_days), 0) as total_paid_days
  FROM leave_requests
  WHERE status = 'approved'
    AND employee_number IS NOT NULL
  GROUP BY employee_number
)
UPDATE employees e
SET paid_leave_balance = 12 - ad.total_paid_days
FROM approved_days ad
WHERE e.employee_number = ad.employee_number;


-- ═══════════════════════════════════════════════════════════
-- STEP 7: Final verification - Show all employee balances
-- ═══════════════════════════════════════════════════════════
SELECT
  employee_number,
  full_name,
  email,
  paid_leave_balance as balance,
  CASE
    WHEN paid_leave_balance >= 10 THEN '✅ Good (10-12 days)'
    WHEN paid_leave_balance >= 5 THEN '⚠️ Medium (5-9 days)'
    WHEN paid_leave_balance > 0 THEN '⚠️ Low (1-4 days)'
    ELSE '❌ No days left'
  END as balance_status
FROM employees
ORDER BY employee_number;


-- ═══════════════════════════════════════════════════════════
-- AFTER RUNNING THIS SQL:
-- ═══════════════════════════════════════════════════════════
-- 1. Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/settings/api
-- 2. Click "Reload schema cache" (if you added a new column)
-- 3. Login as an employee
-- 4. Go to Dashboard tab
-- 5. Paid leave balance should now show 12 days (or correct value based on approved leave)
-- 6. Click "Refresh Balance" button to reload
-- ═══════════════════════════════════════════════════════════
