-- ============================================
-- FIX ATTENDANCE RECORDS SCHEMA ERROR
-- ============================================
--
-- ERROR: "Could not find the 'employee_number' column of 'attendance_records' in the schema cache"
-- CODE: PGRST204
--
-- The backend code is trying to insert employee_number into attendance_records
-- but the column doesn't exist in the database schema.
--
-- Run this in: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/sql/new
--
-- ============================================

-- STEP 1: Check current attendance_records table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'attendance_records'
ORDER BY ordinal_position;

-- This shows what columns currently exist


-- ============================================
-- STEP 2: Add the missing employee_number column
-- ============================================
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS employee_number TEXT;

-- Optional: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_number
ON attendance_records(employee_number);


-- ============================================
-- STEP 3: Verify the column was added
-- ============================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'attendance_records'
  AND column_name = 'employee_number';

-- Should return one row showing the employee_number column


-- ============================================
-- STEP 4: Check if there are existing records without employee_number
-- ============================================
SELECT COUNT(*) as total_records,
       COUNT(employee_number) as records_with_employee_number,
       COUNT(*) - COUNT(employee_number) as records_without_employee_number
FROM attendance_records;


-- ============================================
-- OPTIONAL: Backfill employee_number from employee_id
-- ============================================
-- If you have existing attendance records with employee_id but no employee_number,
-- you can backfill them:

UPDATE attendance_records ar
SET employee_number = e.employee_number
FROM employees e
WHERE ar.employee_id = e.id
  AND ar.employee_number IS NULL;


-- ============================================
-- STEP 5: Verify some sample data
-- ============================================
SELECT id, date, employee_number, employee_id, status, type
FROM attendance_records
ORDER BY created_at DESC
LIMIT 10;


-- ============================================
-- DONE!
-- After running this:
-- 1. Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/settings/api
-- 2. Click "Reload schema cache"
-- 3. Test approving a leave request
-- ============================================
