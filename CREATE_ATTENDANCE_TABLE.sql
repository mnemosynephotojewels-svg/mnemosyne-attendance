-- ============================================================================
-- MNEMOSYNE QR ATTENDANCE SYSTEM - ATTENDANCE RECORDS TABLE
-- ============================================================================
-- This SQL creates the attendance_records table for storing TIME IN/OUT data
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query
-- ============================================================================

-- STEP 1: Create the attendance_records table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
  -- Primary Key
  id BIGSERIAL PRIMARY KEY,
  
  -- Employee Information
  employee_number TEXT NOT NULL,
  
  -- Date and Time Information
  date DATE NOT NULL,
  time_in TIMESTAMPTZ,  -- Time employee clocked IN
  time_out TIMESTAMPTZ, -- Time employee clocked OUT
  
  -- Attendance Status
  status TEXT, -- ON_TIME, LATE, EARLY_OUT, OVERTIME, PAID_LEAVE, ABSENT
  type TEXT,   -- PRESENT, PAID_LEAVE, ABSENT
  
  -- Hours Calculation
  hours_worked NUMERIC(5, 2) DEFAULT 0, -- e.g., 8.50 hours
  
  -- Additional Information
  notes TEXT,
  leave_request_id BIGINT, -- Links to leave_requests table if applicable
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one record per employee per date (prevents duplicates)
  CONSTRAINT unique_employee_date UNIQUE (employee_number, date)
);

-- ============================================================================
-- STEP 2: Create indexes for better query performance
-- ============================================================================

-- Index for querying by employee number
CREATE INDEX IF NOT EXISTS idx_attendance_employee_number 
ON public.attendance_records(employee_number);

-- Index for querying by date
CREATE INDEX IF NOT EXISTS idx_attendance_date 
ON public.attendance_records(date);

-- Index for querying by employee and date range
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date 
ON public.attendance_records(employee_number, date);

-- Index for querying by status
CREATE INDEX IF NOT EXISTS idx_attendance_status 
ON public.attendance_records(status);

-- ============================================================================
-- STEP 3: Create trigger to auto-update updated_at timestamp
-- ============================================================================

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger that calls the function before each update
DROP TRIGGER IF EXISTS update_attendance_records_updated_at ON public.attendance_records;
CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 4: Enable Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Create RLS Policies
-- ============================================================================

-- Policy 1: Allow authenticated users to read their own attendance records
DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance_records;
CREATE POLICY "Users can view their own attendance"
ON public.attendance_records
FOR SELECT
USING (true); -- Allow all reads for now (you can restrict this later)

-- Policy 2: Allow service role to insert attendance records (for Kiosk Mode)
DROP POLICY IF EXISTS "Service role can insert attendance" ON public.attendance_records;
CREATE POLICY "Service role can insert attendance"
ON public.attendance_records
FOR INSERT
WITH CHECK (true); -- Allow all inserts from service role

-- Policy 3: Allow service role to update attendance records (for TIME OUT)
DROP POLICY IF EXISTS "Service role can update attendance" ON public.attendance_records;
CREATE POLICY "Service role can update attendance"
ON public.attendance_records
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policy 4: Allow service role to delete attendance records (for admin cleanup)
DROP POLICY IF EXISTS "Service role can delete attendance" ON public.attendance_records;
CREATE POLICY "Service role can delete attendance"
ON public.attendance_records
FOR DELETE
USING (true);

-- ============================================================================
-- STEP 6: Grant permissions to service role
-- ============================================================================

GRANT ALL ON public.attendance_records TO service_role;
GRANT ALL ON public.attendance_records TO postgres;
GRANT SELECT, INSERT, UPDATE ON public.attendance_records TO anon;
GRANT SELECT, INSERT, UPDATE ON public.attendance_records TO authenticated;

-- Grant sequence permissions for auto-incrementing ID
GRANT USAGE, SELECT ON SEQUENCE public.attendance_records_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.attendance_records_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.attendance_records_id_seq TO authenticated;

-- ============================================================================
-- STEP 7: Insert sample data for testing (OPTIONAL)
-- ============================================================================

-- Uncomment the lines below to insert sample attendance records for testing

/*
INSERT INTO public.attendance_records 
  (employee_number, date, time_in, time_out, status, type, hours_worked, notes)
VALUES
  -- Sample 1: Employee completed full day (TIME IN and TIME OUT)
  ('EMP-001', '2026-04-15', '2026-04-15 08:00:00+00', '2026-04-15 17:00:00+00', 'ON_TIME', 'PRESENT', 9.0, 'Test record'),
  
  -- Sample 2: Employee clocked in but not out yet
  ('EMP-002', '2026-04-15', '2026-04-15 08:30:00+00', NULL, 'LATE', 'PRESENT', 0, 'Test record - still working'),
  
  -- Sample 3: Paid leave record
  ('EMP-003', '2026-04-15', NULL, NULL, 'PAID_LEAVE', 'PAID_LEAVE', 8.0, 'Approved leave request');
*/

-- ============================================================================
-- STEP 8: Verify the table was created successfully
-- ============================================================================

-- Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'attendance_records'
ORDER BY ordinal_position;

-- Check if policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'attendance_records';

-- ============================================================================
-- ✅ VERIFICATION CHECKLIST
-- ============================================================================
-- After running this SQL, verify:
-- 
-- ✅ Table 'attendance_records' exists
-- ✅ All columns are created (id, employee_number, date, time_in, time_out, etc.)
-- ✅ Indexes are created for performance
-- ✅ Trigger for updated_at is active
-- ✅ RLS is enabled
-- ✅ Policies allow inserts and updates
-- ✅ Permissions are granted to service_role
-- 
-- ============================================================================

-- ============================================================================
-- 🧪 TEST THE TABLE
-- ============================================================================
-- Run this query to test if the table works:

/*
-- Test INSERT (TIME IN)
INSERT INTO public.attendance_records 
  (employee_number, date, time_in, status, type, hours_worked, notes)
VALUES
  ('TEST-001', CURRENT_DATE, NOW(), 'ON_TIME', 'PRESENT', 0, 'Test TIME IN from SQL')
RETURNING *;

-- Test UPDATE (TIME OUT)
UPDATE public.attendance_records
SET 
  time_out = NOW(),
  hours_worked = 8.0,
  notes = notes || ' | Test TIME OUT from SQL'
WHERE employee_number = 'TEST-001' 
  AND date = CURRENT_DATE
RETURNING *;

-- Test SELECT
SELECT * FROM public.attendance_records
WHERE employee_number = 'TEST-001'
  AND date = CURRENT_DATE;

-- Cleanup test data
DELETE FROM public.attendance_records
WHERE employee_number = 'TEST-001';
*/

-- ============================================================================
-- END OF SQL SCRIPT
-- ============================================================================
