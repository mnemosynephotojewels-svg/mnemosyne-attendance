-- ============================================
-- COPY THIS ENTIRE FILE AND RUN IN SUPABASE
-- ============================================
--
-- WHERE TO RUN:
-- 1. Open: https://supabase.com/dashboard
-- 2. Click: Your project
-- 3. Click: "SQL Editor" (left sidebar)
-- 4. Click: "New query"
-- 5. Paste: This entire file
-- 6. Click: RUN button (big green button)
--
-- ============================================

-- Delete old broken table
DROP TABLE IF EXISTS schedules CASCADE;

-- Create new correct table
CREATE TABLE schedules (
  id TEXT PRIMARY KEY,
  employee_number TEXT,
  admin_number TEXT,
  user_type TEXT,
  schedule_date DATE NOT NULL,
  shift_start TIME,
  shift_end TIME,
  grace_period INTEGER DEFAULT 30,
  is_day_off BOOLEAN DEFAULT FALSE,
  is_paid_leave BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_schedules_employee_number ON schedules(employee_number);
CREATE INDEX idx_schedules_admin_number ON schedules(admin_number);
CREATE INDEX idx_schedules_schedule_date ON schedules(schedule_date);

-- ============================================
-- AFTER RUNNING THIS:
-- 1. Refresh your app (Ctrl+Shift+R)
-- 2. Go to Manage Schedule
-- 3. Save a test schedule
-- 4. Refresh page again
-- 5. Schedule should STILL be there
--
-- If schedule persists = FIXED ✅
-- If schedule becomes "day off" = SQL NOT RUN
-- ============================================
