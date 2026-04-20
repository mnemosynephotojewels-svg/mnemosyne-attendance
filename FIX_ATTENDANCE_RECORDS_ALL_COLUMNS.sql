-- ═══════════════════════════════════════════════════════════
-- FIX ALL MISSING COLUMNS IN attendance_records TABLE
-- ═══════════════════════════════════════════════════════════
--
-- ERRORS:
-- 1. "Could not find the 'employee_number' column"
-- 2. "Could not find the 'type' column"
--
-- The backend is trying to insert these fields but they don't exist
--
-- RUN IN: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/sql/new
--
-- ═══════════════════════════════════════════════════════════

-- STEP 1: Check current attendance_records table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'attendance_records'
ORDER BY ordinal_position;


-- ═══════════════════════════════════════════════════════════
-- STEP 2: Add ALL missing columns
-- ═══════════════════════════════════════════════════════════

-- Add employee_number column (for tracking which employee)
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS employee_number TEXT;

-- Add admin_number column (for tracking which admin - team leaders)
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS admin_number TEXT;

-- Add type column (IN, OUT, PAID_LEAVE, ABSENT, etc.)
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS type TEXT;

-- Add leave_request_id column (link to leave request)
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS leave_request_id INTEGER;

-- Add notes column (for additional information)
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS notes TEXT;


-- ═══════════════════════════════════════════════════════════
-- STEP 3: Add indexes for better performance
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_number
ON attendance_records(employee_number);

CREATE INDEX IF NOT EXISTS idx_attendance_records_admin_number
ON attendance_records(admin_number);

CREATE INDEX IF NOT EXISTS idx_attendance_records_type
ON attendance_records(type);

CREATE INDEX IF NOT EXISTS idx_attendance_records_leave_request_id
ON attendance_records(leave_request_id);


-- ═══════════════════════════════════════════════════════════
-- STEP 4: Verify all columns were added
-- ═══════════════════════════════════════════════════════════

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'attendance_records'
  AND column_name IN ('employee_number', 'admin_number', 'type', 'leave_request_id', 'notes')
ORDER BY column_name;

-- Should return 5 rows showing all the new columns


-- ═══════════════════════════════════════════════════════════
-- STEP 5: Show sample of the updated table structure
-- ═══════════════════════════════════════════════════════════

SELECT
  id,
  date,
  employee_number,
  admin_number,
  status,
  type,
  time_in,
  time_out,
  leave_request_id,
  notes,
  created_at
FROM attendance_records
ORDER BY created_at DESC
LIMIT 5;


-- ═══════════════════════════════════════════════════════════
-- DONE!
--
-- CRITICAL NEXT STEPS:
-- 1. After running this SQL, click "RUN" button
-- 2. Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/settings/api
-- 3. Scroll to "Schema Cache" section
-- 4. Click "Reload schema cache" button ⚡ CRITICAL - DON'T SKIP
-- 5. Test: Approve a leave request as team leader admin
-- 6. Should see: "✅ Leave request approved successfully"
--
-- ═══════════════════════════════════════════════════════════
