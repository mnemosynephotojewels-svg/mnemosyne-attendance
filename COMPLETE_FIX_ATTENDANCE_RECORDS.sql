-- ═══════════════════════════════════════════════════════════
-- COMPLETE FIX FOR ALL ATTENDANCE RECORDS ERRORS
-- ═══════════════════════════════════════════════════════════
--
-- ERRORS TO FIX:
-- 1. PGRST204: Missing 'employee_number' column
-- 2. PGRST204: Missing 'type' column
-- 3. UUID Error: "invalid input syntax for type uuid: '23'"
--
-- ROOT CAUSE:
-- - Missing columns in attendance_records table
-- - Type mismatch: employees.id is INTEGER but attendance_records.employee_id is UUID
--
-- SOLUTION:
-- - Add all missing columns
-- - Drop employee_id column (we use employee_number instead)
-- - Add employee_number as the main identifier
--
-- RUN IN: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/sql/new
--
-- ═══════════════════════════════════════════════════════════

-- STEP 1: Check current schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'attendance_records'
ORDER BY ordinal_position;


-- ═══════════════════════════════════════════════════════════
-- STEP 2: Drop the problematic employee_id column
-- ═══════════════════════════════════════════════════════════
-- This column causes UUID errors because employees.id is INTEGER, not UUID
-- We'll use employee_number instead (which is TEXT like "EMP-001")

ALTER TABLE attendance_records
DROP COLUMN IF EXISTS employee_id CASCADE;


-- ═══════════════════════════════════════════════════════════
-- STEP 3: Add ALL required columns
-- ═══════════════════════════════════════════════════════════

-- Main identifier columns
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS employee_number TEXT;

ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS admin_number TEXT;

-- Type of record (IN, OUT, PAID_LEAVE, ABSENT, etc.)
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS type TEXT;

-- Link to leave request
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS leave_request_id INTEGER;

-- Additional notes
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Time fields (if not already present)
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS time_in TIME;

ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS time_out TIME;

-- Status field
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS status TEXT;


-- ═══════════════════════════════════════════════════════════
-- STEP 4: Add indexes for performance
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_number
ON attendance_records(employee_number);

CREATE INDEX IF NOT EXISTS idx_attendance_records_admin_number
ON attendance_records(admin_number);

CREATE INDEX IF NOT EXISTS idx_attendance_records_type
ON attendance_records(type);

CREATE INDEX IF NOT EXISTS idx_attendance_records_date
ON attendance_records(date);

CREATE INDEX IF NOT EXISTS idx_attendance_records_leave_request_id
ON attendance_records(leave_request_id);


-- ═══════════════════════════════════════════════════════════
-- STEP 5: Verify the fix
-- ═══════════════════════════════════════════════════════════

-- Check all columns exist
SELECT
  column_name,
  data_type,
  is_nullable,
  CASE
    WHEN column_name IN ('employee_number', 'admin_number', 'type', 'leave_request_id', 'notes', 'status', 'time_in', 'time_out', 'date')
    THEN '✅ Required'
    WHEN column_name = 'employee_id'
    THEN '❌ Should be removed'
    ELSE 'ℹ️  Other'
  END as status
FROM information_schema.columns
WHERE table_name = 'attendance_records'
ORDER BY
  CASE
    WHEN column_name IN ('id', 'date', 'employee_number', 'admin_number', 'type', 'status') THEN 1
    WHEN column_name IN ('time_in', 'time_out', 'leave_request_id', 'notes') THEN 2
    ELSE 3
  END,
  column_name;

-- employee_id column should NOT appear in the results


-- ═══════════════════════════════════════════════════════════
-- STEP 6: Test query (should work without errors)
-- ═══════════════════════════════════════════════════════════

SELECT
  id,
  date,
  employee_number,
  admin_number,
  type,
  status,
  time_in,
  time_out,
  leave_request_id,
  notes,
  created_at
FROM attendance_records
ORDER BY created_at DESC
LIMIT 5;


-- ═══════════════════════════════════════════════════════════
-- ✅ DONE!
--
-- CRITICAL NEXT STEPS (DO NOT SKIP):
--
-- 1. Click "RUN" button above
-- 2. Verify output shows employee_id is removed
-- 3. Verify all required columns exist
-- 4. Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/settings/api
-- 5. Click "Reload schema cache" button ⚡⚡⚡
-- 6. Test: Login as team leader admin
-- 7. Test: Approve a leave request
-- 8. Should see: ✅ "Leave request approved successfully!"
-- 9. Should NOT see any PGRST204 or UUID errors
--
-- ═══════════════════════════════════════════════════════════
