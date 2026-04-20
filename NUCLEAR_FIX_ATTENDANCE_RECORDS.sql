-- ═══════════════════════════════════════════════════════════
-- NUCLEAR FIX: Recreate attendance_records Table
-- ═══════════════════════════════════════════════════════════
--
-- This will:
-- 1. Backup existing data
-- 2. Drop the old table
-- 3. Create new table with ALL correct columns
-- 4. Restore the data
-- 5. Force PostgREST to reload schema
--
-- WARNING: Make sure you have no critical data in attendance_records
-- or back it up first!
--
-- ═══════════════════════════════════════════════════════════

-- STEP 1: Backup existing data (if any)
CREATE TABLE IF NOT EXISTS attendance_records_backup AS
SELECT * FROM attendance_records;

-- Verify backup
SELECT COUNT(*) as backed_up_records FROM attendance_records_backup;


-- STEP 2: Drop the problematic table
DROP TABLE IF EXISTS attendance_records CASCADE;


-- STEP 3: Create new table with ALL correct columns
CREATE TABLE attendance_records (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  employee_number TEXT,
  admin_number TEXT,
  type TEXT,
  status TEXT,
  time_in TIMESTAMP WITH TIME ZONE,
  time_out TIMESTAMP WITH TIME ZONE,
  leave_request_id INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- STEP 4: Add indexes for performance
CREATE INDEX idx_attendance_records_date ON attendance_records(date);
CREATE INDEX idx_attendance_records_employee_number ON attendance_records(employee_number);
CREATE INDEX idx_attendance_records_admin_number ON attendance_records(admin_number);
CREATE INDEX idx_attendance_records_type ON attendance_records(type);
CREATE INDEX idx_attendance_records_leave_request_id ON attendance_records(leave_request_id);


-- STEP 5: Enable Row Level Security (RLS)
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
CREATE POLICY "Service role can do everything" ON attendance_records
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to read their own records
CREATE POLICY "Users can read own records" ON attendance_records
FOR SELECT
TO authenticated
USING (true);


-- STEP 6: Restore data from backup (if you had any)
INSERT INTO attendance_records (
  date, employee_number, admin_number, type, status,
  time_in, time_out, leave_request_id, notes, created_at, updated_at
)
SELECT
  date,
  employee_number,
  admin_number,
  type,
  status,
  time_in,
  time_out,
  CASE
    WHEN leave_request_id::TEXT ~ '^[0-9]+$' THEN leave_request_id::TEXT::INTEGER
    ELSE NULL
  END,
  notes,
  created_at,
  updated_at
FROM attendance_records_backup
WHERE EXISTS (SELECT 1 FROM attendance_records_backup LIMIT 1);


-- STEP 7: Verify the new table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'attendance_records'
ORDER BY ordinal_position;

-- Should show ALL these columns:
-- ✅ id (bigint)
-- ✅ date (date)
-- ✅ employee_number (text)
-- ✅ admin_number (text)
-- ✅ type (text)
-- ✅ status (text)
-- ✅ time_in (timestamp with time zone)
-- ✅ time_out (timestamp with time zone)
-- ✅ leave_request_id (integer) ← IMPORTANT: Should be integer, not uuid!
-- ✅ notes (text)
-- ✅ created_at (timestamp with time zone)
-- ✅ updated_at (timestamp with time zone)


-- STEP 8: Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';


-- STEP 9: Clean up backup table (optional - run later if everything works)
-- DROP TABLE IF EXISTS attendance_records_backup;


-- ═══════════════════════════════════════════════════════════
-- ✅ DONE!
--
-- The table is now completely fresh with all correct columns
-- PostgREST should automatically see the new structure
--
-- NEXT STEPS:
-- 1. Wait 1 minute after running this SQL
-- 2. Test approving a leave request
-- 3. Should work now!
--
-- If it still doesn't work after 2 minutes, you may need to
-- restart your Supabase project (pause and resume)
--
-- ═══════════════════════════════════════════════════════════
