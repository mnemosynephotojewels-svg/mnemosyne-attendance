-- FIX: Change user_type column from smallint to TEXT
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/sql/new

-- Drop the incorrectly typed column
ALTER TABLE leave_requests DROP COLUMN IF EXISTS user_type;

-- Add it back with the correct TEXT type
ALTER TABLE leave_requests ADD COLUMN user_type TEXT;

-- Update existing records
UPDATE leave_requests
SET user_type = CASE
    WHEN employee_number IS NOT NULL THEN 'employee'
    WHEN admin_number IS NOT NULL THEN 'admin'
    ELSE NULL
END
WHERE user_type IS NULL;

-- Verify it worked
SELECT 'SUCCESS: user_type is now TEXT type!' as status,
       column_name,
       data_type
FROM information_schema.columns
WHERE table_name = 'leave_requests'
  AND column_name = 'user_type';
