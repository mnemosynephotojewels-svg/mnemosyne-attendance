-- ====================================================================
-- MNEMOSYNE QR ATTENDANCE SYSTEM - Schedules Table Creation
-- ====================================================================
-- 
-- INSTRUCTIONS:
-- 1. Copy this entire file
-- 2. Go to https://supabase.com/dashboard
-- 3. Select your project
-- 4. Navigate to SQL Editor (left sidebar)
-- 5. Paste this SQL and click RUN
-- 6. Refresh your Admin/Super Admin portal
-- 7. The yellow setup banner should disappear
--
-- ====================================================================

-- Create schedules table
-- Note: grace_period is NOT included as it's stored in KV store
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  employee_number TEXT,
  admin_number TEXT,
  user_type TEXT NOT NULL,
  schedule_date DATE NOT NULL,
  shift_start TIME,
  is_day_off BOOLEAN DEFAULT FALSE,
  is_paid_leave BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_schedules_employee_number ON schedules(employee_number);
CREATE INDEX IF NOT EXISTS idx_schedules_admin_number ON schedules(admin_number);
CREATE INDEX IF NOT EXISTS idx_schedules_schedule_date ON schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedules_user_type ON schedules(user_type);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_schedules_employee_date ON schedules(employee_number, schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedules_admin_date ON schedules(admin_number, schedule_date);

-- Add helpful comments for documentation
COMMENT ON TABLE schedules IS 'Stores employee and admin work schedules, including day-offs and paid leave';
COMMENT ON COLUMN schedules.id IS 'Unique identifier (format: schedule:{user_number}:{date})';
COMMENT ON COLUMN schedules.employee_number IS 'Employee ID if this is an employee schedule';
COMMENT ON COLUMN schedules.admin_number IS 'Admin ID if this is an admin schedule';
COMMENT ON COLUMN schedules.user_type IS 'Type of user: employee or admin';
COMMENT ON COLUMN schedules.schedule_date IS 'The date of the scheduled shift';
COMMENT ON COLUMN schedules.shift_start IS 'Shift start time (e.g., 09:00:00)';
COMMENT ON COLUMN schedules.is_day_off IS 'True if this is a day-off schedule';
COMMENT ON COLUMN schedules.is_paid_leave IS 'True if this is a paid leave day (auto-created when leave is approved)';

-- ====================================================================
-- VERIFICATION (Optional - run after creating the table)
-- ====================================================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'schedules'
-- ORDER BY ordinal_position;

-- Check row count
-- SELECT COUNT(*) FROM schedules;

-- View recent schedules
-- SELECT * FROM schedules ORDER BY created_at DESC LIMIT 10;

-- ====================================================================
-- SUCCESS!
-- ====================================================================
-- If this ran without errors, you're all set!
-- Go back to your Admin portal and refresh the page.
-- The setup banner should disappear automatically.
-- ====================================================================
