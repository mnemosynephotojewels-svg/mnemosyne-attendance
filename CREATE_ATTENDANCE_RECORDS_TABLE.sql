-- =====================================================
-- CREATE OR FIX ATTENDANCE_RECORDS TABLE
-- =====================================================
--
-- This script will create the attendance_records table if it doesn't exist,
-- or add missing columns if the table already exists.
--
-- RUN THIS IN SUPABASE SQL EDITOR:
-- https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
--
-- =====================================================

-- STEP 1: Create the table if it doesn't exist
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance_records (
  id BIGSERIAL PRIMARY KEY,
  employee_number TEXT NOT NULL,
  employee_id BIGINT,  -- Optional: reference to employees table
  date DATE NOT NULL,
  time_in TIMESTAMPTZ,
  time_out TIMESTAMPTZ,
  status TEXT,  -- 'ON_TIME', 'LATE', 'PRESENT', 'PAID_LEAVE', etc.
  type TEXT,    -- 'PRESENT', 'PAID_LEAVE', 'ABSENT', etc.
  hours_worked NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  leave_request_id BIGINT,  -- Optional: reference to leave_requests table
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 2: Add missing columns if table already exists
-- =====================================================

-- Add employee_number if missing
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS employee_number TEXT;

-- Add employee_id if missing
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS employee_id BIGINT;

-- Add date if missing
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS date DATE;

-- Add time_in if missing
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS time_in TIMESTAMPTZ;

-- Add time_out if missing
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS time_out TIMESTAMPTZ;

-- Add status if missing
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS status TEXT;

-- Add type if missing
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS type TEXT;

-- Add hours_worked if missing
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS hours_worked NUMERIC(5,2) DEFAULT 0;

-- Add notes if missing
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add leave_request_id if missing
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS leave_request_id BIGINT;

-- Add timestamps if missing
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();


-- =====================================================
-- STEP 3: Create indexes for better performance
-- =====================================================

-- Index on employee_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_number 
ON attendance_records(employee_number);

-- Index on date for filtering by date range
CREATE INDEX IF NOT EXISTS idx_attendance_records_date 
ON attendance_records(date);

-- Composite index for employee + date queries
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_date 
ON attendance_records(employee_number, date);

-- Index on leave_request_id for leave tracking
CREATE INDEX IF NOT EXISTS idx_attendance_records_leave_request 
ON attendance_records(leave_request_id) 
WHERE leave_request_id IS NOT NULL;


-- =====================================================
-- STEP 4: Create trigger to auto-update updated_at
-- =====================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_attendance_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS attendance_records_updated_at_trigger ON attendance_records;
CREATE TRIGGER attendance_records_updated_at_trigger
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_records_updated_at();


-- =====================================================
-- STEP 5: Enable Row Level Security (RLS) - IMPORTANT!
-- =====================================================

-- Enable RLS on the table
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow service role full access" ON attendance_records;
DROP POLICY IF EXISTS "Allow authenticated users to read their own records" ON attendance_records;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own records" ON attendance_records;
DROP POLICY IF EXISTS "Allow authenticated users to update their own records" ON attendance_records;

-- Policy 1: Allow service role (backend) full access
CREATE POLICY "Allow service role full access"
ON attendance_records
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Allow anon key (used by server) full access
CREATE POLICY "Allow anon full access for server"
ON attendance_records
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Policy 3: Allow authenticated users to read their own records
CREATE POLICY "Allow authenticated users to read their own records"
ON attendance_records
FOR SELECT
TO authenticated
USING (
  employee_number = (current_setting('request.jwt.claims', true)::json->>'employee_number')::text
);


-- =====================================================
-- STEP 6: Verify the table structure
-- =====================================================

-- Show all columns
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'attendance_records'
ORDER BY ordinal_position;


-- =====================================================
-- STEP 7: Show existing records count
-- =====================================================

SELECT 
  COUNT(*) as total_records,
  COUNT(employee_number) as with_employee_number,
  COUNT(time_in) as with_time_in,
  COUNT(time_out) as with_time_out,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM attendance_records;


-- =====================================================
-- STEP 8: Show sample records
-- =====================================================

SELECT 
  id,
  employee_number,
  date,
  time_in,
  time_out,
  status,
  type,
  hours_worked,
  created_at
FROM attendance_records
ORDER BY created_at DESC
LIMIT 10;


-- =====================================================
-- DONE!
-- =====================================================
-- After running this script:
-- 1. Check the output to verify all columns exist
-- 2. Go to: Supabase Dashboard > Settings > API
-- 3. Click "Reload schema cache" button
-- 4. Test the kiosk mode attendance again
-- =====================================================
