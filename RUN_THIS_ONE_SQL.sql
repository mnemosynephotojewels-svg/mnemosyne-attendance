-- ═══════════════════════════════════════════════════════════
-- ⚡ RUN THIS ONE SQL TO FIX ALL ERRORS ⚡
-- ═══════════════════════════════════════════════════════════
--
-- This fixes:
-- ✅ "Could not find the 'employee_id' column"
-- ✅ "Could not find the 'employee_number' column"
-- ✅ "Could not find the 'type' column"
-- ✅ All PGRST204 errors
--
-- COPY EVERYTHING BELOW AND RUN IN SUPABASE
--
-- ═══════════════════════════════════════════════════════════

-- Add ALL missing columns to attendance_records
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS employee_number TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS admin_number TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS leave_request_id INTEGER;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS time_in TIME;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS time_out TIME;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_number ON attendance_records(employee_number);
CREATE INDEX IF NOT EXISTS idx_attendance_records_admin_number ON attendance_records(admin_number);
CREATE INDEX IF NOT EXISTS idx_attendance_records_type ON attendance_records(type);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_leave_request_id ON attendance_records(leave_request_id);

-- Verify all columns exist (should show 8+ rows)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'attendance_records'
AND column_name IN ('employee_number', 'admin_number', 'type', 'leave_request_id', 'notes', 'status', 'time_in', 'time_out', 'date', 'id')
ORDER BY column_name;
