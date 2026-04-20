-- 🔧 FIX: Delete existing data and recreate schedules table correctly
-- This will delete all existing schedules in the Supabase table
-- (Your KV store data is safe)

-- Step 1: Drop the entire table
DROP TABLE IF EXISTS schedules CASCADE;

-- Step 2: Create it with the correct structure
CREATE TABLE schedules (
  id TEXT PRIMARY KEY,
  employee_number TEXT,
  admin_number TEXT,
  user_type TEXT CHECK (user_type IN ('employee', 'admin')),
  schedule_date DATE NOT NULL,
  shift_start TIME,
  shift_end TIME,
  grace_period INTEGER DEFAULT 30,
  is_day_off BOOLEAN DEFAULT FALSE,
  is_paid_leave BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Add indexes for performance
CREATE INDEX idx_schedules_employee_number ON schedules(employee_number);
CREATE INDEX idx_schedules_admin_number ON schedules(admin_number);
CREATE INDEX idx_schedules_schedule_date ON schedules(schedule_date);
CREATE INDEX idx_schedules_user_type ON schedules(user_type);

-- Show success message
SELECT 'Table recreated successfully! All columns are now correct.' AS status;
