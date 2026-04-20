-- Copy this ENTIRE file and run it in Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/sql/new

-- Step 1: Add the user_type column
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS user_type TEXT;

-- Step 2: Update existing records
UPDATE leave_requests
SET user_type = CASE
    WHEN employee_number IS NOT NULL THEN 'employee'
    WHEN admin_number IS NOT NULL THEN 'admin'
    ELSE NULL
END
WHERE user_type IS NULL;

-- Step 3: Verify it worked
SELECT 'SUCCESS: user_type column added!' as status;
