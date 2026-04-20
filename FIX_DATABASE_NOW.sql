-- ========================================
-- FIX SCHEDULES TABLE - RUN THIS NOW
-- ========================================
-- This fixes: invalid input syntax for type bigint
-- Location: Supabase Dashboard → SQL Editor → New Query
-- ========================================

DROP TABLE IF EXISTS schedules CASCADE;

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

CREATE INDEX idx_schedules_employee_number ON schedules(employee_number);
CREATE INDEX idx_schedules_admin_number ON schedules(admin_number);
CREATE INDEX idx_schedules_schedule_date ON schedules(schedule_date);

-- ========================================
-- After running this:
-- 1. Refresh your app (Ctrl+Shift+R)
-- 2. Re-save the schedules for Moises, Trina, and Aiza
-- 3. The errors will stop
-- ========================================
